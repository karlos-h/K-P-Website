// Supabase Edge Function: crowd-pov-cleanup
//
// Sweeps unreferenced files out of the private `crowd-pov-pending` bucket.
//
// Why this exists: CrowdPovModal uploads a visitor's photo BEFORE inserting
// the crowd_submissions row (the reverse order would leave the admin review
// queue full of submissions whose file never arrived). Anything that fails
// between those two steps — most often the per-email-per-event cap in the
// insert policy from migration 033 — strands a file that nothing references
// and that anon has no DELETE right to remove.
//
// Why an Edge Function rather than a plain pg_cron job: Supabase installs a
// `storage.protect_delete()` trigger that blocks `delete from storage.objects`
// outright. Its escape hatch (`set storage.allow_delete_query = 'true'`) is
// not a way around this — it removes only the metadata row and leaves the
// actual bytes orphaned in the backing store, which is worse than the problem.
// Deletion has to go through the Storage API, and that needs the service-role
// key. Edge Functions get SUPABASE_SERVICE_ROLE_KEY from the runtime, so the
// key never has to be written down anywhere.
//
// Auth: verify_jwt is off, because the caller is pg_cron via pg_net and there
// is no user session to present. Instead the function requires a shared token
// in the `x-cleanup-token` header, matched against a secret generated inside
// the database and stored in Supabase Vault (migration 035). The plaintext
// exists only in Vault — not in this repo, not in an env var, not in the cron
// job body.
//
// Deliberately narrow: it only ever touches `crowd-pov-pending`, never the
// public `crowd-pov` bucket where approved photos live.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "crowd-pov-pending";
const DEFAULT_AGE_MINUTES = 60;
const DELETE_CHUNK = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Length-independent comparison so a wrong token can't be narrowed down by
// timing. Both values are short, so the cost is irrelevant.
function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed — POST only." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: expectedToken, error: tokenError } = await db.rpc("crowd_pov_cleanup_token");
    if (tokenError || !expectedToken) {
      console.error("crowd-pov-cleanup: could not read the cleanup token:", tokenError?.message);
      return json({ error: "Cleanup token is not configured — see migration 035." }, 500);
    }

    const presented = req.headers.get("x-cleanup-token") ?? "";
    if (!tokensMatch(presented, expectedToken)) {
      console.warn("crowd-pov-cleanup: rejected a request with a missing or invalid token.");
      return json({ error: "Unauthorized." }, 401);
    }

    // Age threshold is overridable so the sweep can be tested without waiting
    // an hour. The default protects the gap between a legitimate upload and
    // its crowd_submissions insert a moment later.
    let ageMinutes = DEFAULT_AGE_MINUTES;
    try {
      const body = await req.json();
      const requested = body?.older_than_minutes;
      if (typeof requested === "number" && Number.isFinite(requested) && requested >= 0) {
        ageMinutes = Math.floor(requested);
      }
    } catch {
      // No body, or not JSON — the hourly cron sends none. Use the default.
    }

    const { data: orphans, error: orphanError } = await db.rpc("crowd_pov_orphans", {
      p_older_than_minutes: ageMinutes,
    });
    if (orphanError) {
      console.error("crowd-pov-cleanup: orphan lookup failed:", orphanError.message);
      return json({ error: `Orphan lookup failed: ${orphanError.message}` }, 500);
    }

    const paths: string[] = (orphans ?? []).map((row: { path: string }) => row.path);
    if (paths.length === 0) {
      return json({ bucket: BUCKET, older_than_minutes: ageMinutes, orphans_found: 0, deleted: 0, paths: [] });
    }

    const deleted: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < paths.length; i += DELETE_CHUNK) {
      const chunk = paths.slice(i, i + DELETE_CHUNK);
      const { data, error } = await db.storage.from(BUCKET).remove(chunk);
      if (error) {
        errors.push(error.message);
        continue;
      }
      for (const obj of data ?? []) deleted.push(obj.name);
    }

    console.log(`crowd-pov-cleanup: removed ${deleted.length} orphan(s) older than ${ageMinutes}m.`);
    return json({
      bucket: BUCKET,
      older_than_minutes: ageMinutes,
      orphans_found: paths.length,
      deleted: deleted.length,
      paths: deleted,
      ...(errors.length ? { errors } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("crowd-pov-cleanup failed:", message);
    return json({ error: message }, 500);
  }
});
