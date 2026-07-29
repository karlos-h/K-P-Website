# Supabase

Backend for the Kava & Pyramids site: Postgres with Row Level Security, Auth,
Storage, and Edge Functions. There is no custom server — the browser talks to
Supabase directly, so **the policies in `migrations/` are the security boundary**,
not application code.

## `migrations/`

Numbered SQL files, applied in order. Source of truth for schema, RLS policies,
storage bucket rules, and scheduled jobs. Never edit an applied migration —
add a new one.

Roughly:

- **001–017** — core schema and its incremental columns: `events`, `media_assets`, `mixes`, `stats`, `trusted_venues`, `enquiries`, `media_downloads`, `mailing_list`, plus the `event-photos` bucket
- **018–022** — the RLS pass: public read, anon-insert-only on submission tables, admin allowlist, `am_i_admin()` locked to authenticated
- **023–027** — mailing-list sources, past-event status cron, private-schema grants
- **028–032** — storage policy repair (see the note below)
- **033–036** — Crowd POV: submissions, moderation, public display, reporting

Migrations **029** and **030** are diagnostic-only and carry explicit warnings in
their headers. They leave storage policies in a deliberately broken interim state
and only make sense as part of the sequence that **032** closes. Do not apply
either one on its own.

## `functions/`

- **`humanitix-sync`** — pulls ticketed events from Humanitix into `events`. CORS is restricted to `SITE_URL` / `ALLOWED_ORIGINS`.
- **`crowd-pov-cleanup`** — hourly `pg_cron` sweep removing orphaned files from `crowd-pov-pending`. Runs as an Edge Function because Supabase's `storage.protect_delete()` trigger blocks `delete from storage.objects`, and its documented escape hatch orphans the underlying bytes. Authenticated by a shared token generated inside Postgres and stored in Vault.

## Storage buckets

| Bucket | Access | Contents |
| --- | --- | --- |
| `event-photos` | public | Admin-uploaded event gallery photos |
| `crowd-pov` | public | Approved visitor photo submissions |
| `crowd-pov-pending` | **private** | Submissions awaiting review; served to admins via signed URLs only |

The Crowd POV buckets allowlist `jpeg`/`png`/`webp` only — no SVG (stored-XSS
risk) and no GIF.

## Secrets

Never commit a service-role key. The frontend uses only the publishable/anon key,
which is safe in the bundle precisely because RLS is enforced.

Server-side values (`HUMANITIX_API_KEY`, `SITE_URL`, the Crowd POV cleanup token)
belong in Edge Function secrets and Vault — never in a `VITE_` variable, which
Vite inlines into the public bundle.
