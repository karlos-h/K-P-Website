-- ============================================================
-- MIGRATION 019 — Fix live policy drift + track epk_downloads
-- K&P Website · Run this AFTER migration 018
-- ============================================================
-- While auditing the live project with the Supabase MCP, we found the
-- deployed database has several policies that were created directly in
-- the Dashboard and were never captured as migration files here, so the
-- repo and the live database had drifted apart. Two problems fell out of
-- that drift:
--
-- 1. `public.epk_downloads` (used by EpkPage.jsx's download-gate form)
--    exists live but has no migration in this repo at all.
-- 2. Several tables ended up with a genuinely dangerous *duplicate*
--    "admin" policy that grants full access with a bare `true` (not even
--    `auth.role() = 'authenticated'`) to any authenticated user, sitting
--    ALONGSIDE the properly-named policy from migrations 002/013. Because
--    Postgres RLS policies are OR'd together, migration 018 switching the
--    *named* policy over to `is_admin()` would NOT have removed access —
--    these leftover duplicates would have kept the door wide open:
--      - events            "Admin full access events"
--      - mixes             "Admin full access mixes"
--      - stats             "Admin full access stats"
--      - trusted_venues    "Admin full access trusted_venues"
--      - epk_downloads     "Admin full access epk_downloads"
--      - enquiries         "Authenticated users can read enquiries"
--                          "Authenticated users can update enquiries"
--                          "public can create enquiries" (redundant anon insert)
--
-- This migration removes every one of those and leaves exactly one clean,
-- `is_admin()`-gated policy per table (see migration 018 for `is_admin()`).
--
-- Safe to re-run — every statement below is guarded.


-- ── Formally track epk_downloads in migrations ────────────────
create table if not exists epk_downloads (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  venue       text,
  created_at  timestamptz not null default now()
);

alter table epk_downloads enable row level security;

drop policy if exists "Admin full access epk_downloads" on epk_downloads;
drop policy if exists "Admin manages epk_downloads"      on epk_downloads;
create policy "Admin manages epk_downloads"
  on epk_downloads for all using (is_admin()) with check (is_admin());

drop policy if exists "Public can log epk downloads" on epk_downloads;
create policy "Public can log epk downloads"
  on epk_downloads for insert with check (true);


-- ── Remove dangerous leftover duplicate policies ──────────────

drop policy if exists "Admin full access events"         on events;
drop policy if exists "Admin full access mixes"           on mixes;
drop policy if exists "Admin full access stats"           on stats;
drop policy if exists "Admin full access trusted_venues"  on trusted_venues;

drop policy if exists "Authenticated users can read enquiries"   on enquiries;
drop policy if exists "Authenticated users can update enquiries" on enquiries;
drop policy if exists "public can create enquiries"              on enquiries; -- redundant with "Public can submit enquiries"


-- ── Storage: public buckets don't need a SELECT policy to serve
--    getPublicUrl() downloads, and this app never calls storage.list(),
--    so drop it to stop clients from being able to enumerate every file
--    in the bucket via the API (flagged by Supabase's security advisor).
drop policy if exists "Public read access for event photos" on storage.objects;


-- ── Sanity check ───────────────────────────────────────────────
-- After running this + 018, re-run the Supabase security advisor
-- (`get_advisors` / Dashboard → Advisors) and confirm every
-- "RLS Policy Always True" warning for these tables is gone.
