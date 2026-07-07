-- ============================================================
-- MIGRATION 018 — Real admin access control
-- K&P Website · Run this AFTER migration 017
-- ============================================================
-- Problem this fixes: every "Admin manages X" policy added in migrations
-- 002 and 013, plus the event-photos storage policies in 007, use
-- `auth.role() = 'authenticated'`. That grants full read/write/delete on
-- every table (including `enquiries` and `mailing_list`, which hold real
-- customer PII) to ANY signed-in Supabase Auth user — not just you. If
-- public sign-up is ever left enabled on this project, any site visitor
-- could self-register and get full admin access.
--
-- Fix: a dedicated `admins` allowlist table, checked through a
-- SECURITY DEFINER helper function (`is_admin()`) so the check works
-- correctly under RLS. Every policy that used to say
-- `auth.role() = 'authenticated'` now says `is_admin()` instead.
--
-- Safe to re-run — every statement below is guarded.


-- ── Admins allowlist ─────────────────────────────────────────
-- No one (not even authenticated users) can read/write this table directly
-- through the API — it enable RLS with zero policies, which defaults to
-- deny-all for anon/authenticated. Only the SECURITY DEFINER function below
-- (and the Supabase Dashboard / service-role key) can read it.

create table if not exists admins (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now()
);

alter table admins enable row level security;


-- ── is_admin() helper ────────────────────────────────────────
-- SECURITY DEFINER so it can read the `admins` table (which has no public
-- policies of its own) regardless of the calling user's own RLS visibility.
-- `set search_path = public` avoids search-path hijacking in SECURITY
-- DEFINER functions per Postgres/Supabase guidance.

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated, anon;


-- ── Replace every "any authenticated user" policy with is_admin() ────────

drop policy if exists "Admin manages events"           on events;
create policy "Admin manages events"
  on events for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages stats"             on stats;
create policy "Admin manages stats"
  on stats for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages trusted_venues"    on trusted_venues;
create policy "Admin manages trusted_venues"
  on trusted_venues for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages mixes"             on mixes;
create policy "Admin manages mixes"
  on mixes for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages videos"            on videos;
create policy "Admin manages videos"
  on videos for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages media_assets"      on media_assets;
create policy "Admin manages media_assets"
  on media_assets for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages media_downloads"   on media_downloads;
create policy "Admin manages media_downloads"
  on media_downloads for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages enquiries"         on enquiries;
create policy "Admin manages enquiries"
  on enquiries for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin manages mailing_list" on mailing_list;
create policy "Admin manages mailing_list"
  on mailing_list for all using (is_admin()) with check (is_admin());


-- ── Storage: event-photos bucket writes now require is_admin() too ───────

drop policy if exists "Admin upload event photos" on storage.objects;
create policy "Admin upload event photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-photos' and is_admin());

drop policy if exists "Admin update event photos" on storage.objects;
create policy "Admin update event photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-photos' and is_admin());

drop policy if exists "Admin delete event photos" on storage.objects;
create policy "Admin delete event photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-photos' and is_admin());

-- Belt-and-braces hardening on the bucket itself: cap file size and only
-- accept real image types, so the upload UI's client-side check (which is
-- trivially spoofable) isn't the only thing enforcing this.
update storage.buckets
set file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'event-photos';


-- ── ACTION REQUIRED — grant yourself admin access ─────────────
-- Nothing above makes anyone an admin. Sign up / log in once via /login
-- with your real admin email (Supabase Dashboard → Authentication → Users
-- if you need to create the account first), then run the statement below
-- in the SQL Editor with your real email substituted in:
--
-- insert into admins (user_id, note)
-- select id, 'primary admin'
-- from auth.users
-- where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do nothing;
