// Supabase Edge Function: humanitix-sync
//
// Manually-triggered (not a webhook) pull sync: for every event with a
// humanitix_event_id set, fetch its orders from the Humanitix Public API
// and upsert each buyer into mailing_list.
//
// Auth: requires a valid authenticated Supabase user — this touches a
// third-party API key and real PII, so anonymous invocation is rejected.
//
// Secrets required: HUMANITIX_API_KEY (set via `supabase secrets set`),
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// by the Supabase Edge Functions runtime.

import { createClient } from "npm:@supabase/supabase-js@2";

const HUMANITIX_BASE_URL = "https://api.humanitix.com/v1";
const PAGE_SIZE = 100;

// This function is only ever called from the admin dashboard, never from a
// third-party site, so CORS is locked down to known site origins instead of
// "*". Set the SITE_URL secret (your Netlify or custom domain, no trailing
// slash) and/or ALLOWED_ORIGINS (comma-separated) on the Edge Function to
// add production URLs without redeploying code.
function buildAllowedOrigins(): Set<string> {
  const origins = new Set([
    // Live site. The apex/www custom domain is not currently registered
    // (kavapyramids.com is NXDOMAIN as of 2026-07-28) — the site is served
    // from the Netlify subdomain. Both are listed so that attaching the
    // custom domain later doesn't break this function.
    "https://kavapyramids.netlify.app",
    "https://kavapyramids.com",
    "https://www.kavapyramids.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  const siteUrl = Deno.env.get("SITE_URL");
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ""));

  const extra = Deno.env.get("ALLOWED_ORIGINS");
  if (extra) {
    for (const origin of extra.split(",")) {
      const trimmed = origin.trim().replace(/\/$/, "");
      if (trimmed) origins.add(trimmed);
    }
  }

  return origins;
}

// Netlify branch deploys and deploy previews get generated subdomains
// (deploy-preview-12--kavapyramids.netlify.app, develop--kavapyramids…).
// Match those too, so testing the admin dashboard on a preview build
// doesn't silently fail CORS the way the production origin just did.
const NETLIFY_PREVIEW_RE = /^https:\/\/[a-z0-9][a-z0-9-]*--kavapyramids\.netlify\.app$/;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return buildAllowedOrigins().has(origin) || NETLIFY_PREVIEW_RE.test(origin);
}

function corsHeaders(origin: string | null) {
  const allowOrigin = isOriginAllowed(origin) ? origin! : "";
  if (origin && !allowOrigin) {
    // Previously this failed completely silently: the browser blocked the
    // response for want of an Access-Control-Allow-Origin header, the POST
    // was never sent, and the only trace was a lone OPTIONS 200 in the logs.
    // Leave a breadcrumb so the next origin mismatch is one log line away.
    console.warn(
      `humanitix-sync: rejected disallowed Origin "${origin}". ` +
      `Add it via the SITE_URL or ALLOWED_ORIGINS secret.`,
    );
  }
  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

// The Humanitix order object carries ISO-8601 `completedAt`, `createdAt`,
// `updatedAt` and `incompleteAt` (OpenAPI spec at
// https://api.humanitix.com/v1/documentation/json). We want the moment the
// attendee actually bought their ticket, so prefer completedAt and fall
// back to createdAt — completedAt is null on abandoned/incomplete orders.
// Anything unparseable yields null rather than a bogus date.
function orderTimestamp(order: any): string | null {
  for (const value of [order?.completedAt, order?.createdAt]) {
    if (typeof value !== "string" || !value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

async function fetchAllOrders(eventId: string, apiKey: string) {
  const orders: any[] = [];
  let page = 1;

  while (true) {
    const url = `${HUMANITIX_BASE_URL}/events/${encodeURIComponent(eventId)}/orders?page=${page}&pageSize=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Humanitix API error (${res.status}) for event ${eventId}: ${text || res.statusText}`);
    }

    const data = await res.json();
    const pageOrders = Array.isArray(data.orders) ? data.orders : [];
    orders.push(...pageOrders);

    const total = typeof data.total === "number" ? data.total : orders.length;
    if (orders.length >= total || pageOrders.length === 0) break;
    page += 1;
  }

  return orders;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const respond = (body: unknown, status = 200) => jsonResponse(body, status, origin);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return respond({ error: "Missing Authorization header — this function requires an authenticated caller." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("HUMANITIX_API_KEY");

    if (!apiKey) {
      return respond({ error: "HUMANITIX_API_KEY secret is not set on this function." }, 500);
    }

    // Client scoped to the caller's JWT — used only to verify they're a real authenticated user.
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return respond({ error: "Unauthorized — a valid authenticated session is required to run this sync." }, 401);
    }

    // Service-role client for the actual reads/writes against events and mailing_list.
    const db = createClient(supabaseUrl, serviceRoleKey);

    // Being *authenticated* is not enough — this touches a third-party API key
    // and real PII, so only users on the `admins` allowlist (see migration
    // 018_admin_access_control.sql) may run it. The service-role client
    // bypasses RLS, which is exactly what's needed to check this table since
    // it has no public policies of its own.
    const { data: adminRow, error: adminError } = await db
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminError) {
      return respond({ error: `Failed to verify admin access: ${adminError.message}` }, 500);
    }
    if (!adminRow) {
      return respond({ error: "Forbidden — this account is not on the admin allowlist." }, 403);
    }

    const { data: events, error: eventsError } = await db
      .from("events")
      .select("id, title, humanitix_event_id")
      .not("humanitix_event_id", "is", null);

    if (eventsError) {
      return respond({ error: `Failed to load events: ${eventsError.message}` }, 500);
    }

    const summary = {
      events_checked: events?.length ?? 0,
      attendees_fetched: 0,
      inserted: 0,
      updated: 0,
      skipped_unsubscribed: 0,
      order_dates_captured: 0,
      errors: [] as string[],
    };

    // One-time, non-PII shape check. The order timestamp field names are
    // taken from Humanitix's published OpenAPI spec; this logs the actual
    // keys of the first order seen (names only — never values, which are
    // attendee PII) plus the parsed timestamp, so the live response can be
    // confirmed against the spec from the edge logs after a real sync.
    let shapeLogged = false;

    for (const event of events ?? []) {
      let orders: any[] = [];
      try {
        orders = await fetchAllOrders(event.humanitix_event_id, apiKey);
      } catch (err) {
        summary.errors.push(err instanceof Error ? err.message : String(err));
        continue;
      }

      summary.attendees_fetched += orders.length;

      for (const order of orders) {
        if (!shapeLogged) {
          shapeLogged = true;
          console.log(
            "humanitix-sync: order field names =",
            JSON.stringify(Object.keys(order ?? {})),
            "| parsed order timestamp =",
            orderTimestamp(order),
          );
        }

        const email = (order.email ?? "").trim().toLowerCase();
        const firstName = (order.firstName ?? "").trim();
        const lastName = (order.lastName ?? "").trim();
        const orderId = order._id ?? null;
        const orderCreatedAt = orderTimestamp(order);
        if (orderCreatedAt) summary.order_dates_captured += 1;

        if (!email || !firstName || !lastName) {
          summary.errors.push(`Order ${order._id ?? "unknown"} on event ${event.title} is missing name/email — skipped.`);
          continue;
        }

        // Respect the buyer's own opt-in choice at checkout, when Humanitix reports it.
        const wantsList = order.organiserMailListOptIn !== false;

        const { data: existing, error: lookupError } = await db
          .from("mailing_list")
          .select("id, subscribed")
          .ilike("email", email)
          .maybeSingle();

        if (lookupError) {
          summary.errors.push(`Lookup failed for ${email}: ${lookupError.message}`);
          continue;
        }

        if (!existing) {
          const { error: insertError } = await db.from("mailing_list").insert({
            first_name: firstName,
            last_name: lastName,
            email,
            source: "humanitix",
            event_title: event.title,
            subscribed: wantsList,
            order_id: orderId,
            order_created_at: orderCreatedAt,
          });
          if (insertError) {
            summary.errors.push(`Insert failed for ${email}: ${insertError.message}`);
            continue;
          }
          summary.inserted += 1;
          continue;
        }

        // Existing contact: never resubscribe or overwrite someone who has unsubscribed.
        if (!existing.subscribed) {
          summary.skipped_unsubscribed += 1;
          continue;
        }

        const { error: updateError } = await db
          .from("mailing_list")
          .update({
            first_name: firstName,
            last_name: lastName,
            source: "humanitix",
            event_title: event.title,
            order_id: orderId,
            // Only write when we actually parsed one, so a re-sync can
            // backfill existing rows but never clobbers a known date with
            // null (e.g. if a later order for the same email lacks one).
            ...(orderCreatedAt ? { order_created_at: orderCreatedAt } : {}),
          })
          .eq("id", existing.id);

        if (updateError) {
          summary.errors.push(`Update failed for ${email}: ${updateError.message}`);
          continue;
        }
        summary.updated += 1;
      }
    }

    return respond(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("humanitix-sync failed:", message);
    return respond({ error: message }, 500);
  }
});
