-- ============================================================
-- MIGRATION 033 — Crowd POV foundation (tables, buckets, RLS)
-- K&P Website · Run this AFTER migration 032
-- (Applied to production 2026-07-28 as ledger version 20260728075630,
-- before migrations 028–032 were reconstructed as files; renumbered
-- from 028 to 033 to match the ledger's chronological order.)
-- ============================================================
-- Phase 1 of "Crowd POV": event attendees will be able to submit their
-- own photos, which an admin reviews before anything becomes public.
-- This migration lays only the database/storage foundation — no frontend
-- touches these objects yet.
--
-- Two tables with very different exposure:
--   • crowd_submissions — the moderation record. Holds PII (uploader
--     email), so it is NEVER publicly readable: anon/authenticated get
--     INSERT only, with a WITH CHECK that pins every admin-owned column
--     to its untouched state and caps submissions per email+event.
--   • crowd_photos — the public-facing record, populated only when an
--     admin approves a submission. Holds nothing sensitive; public read.
--
-- Two storage buckets mirroring that split:
--   • crowd-pov-pending (private) — where visitor uploads land. Public
--     can INSERT only; admin gets full access (SELECT is needed to
--     preview via signed URL in the future review UI).
--   • crowd-pov (public) — where approved files live. Files only arrive
--     via an admin's cross-bucket move() from the pending bucket, which
--     per Supabase docs needs SELECT + UPDATE on the source object and
--     INSERT on the destination — all covered by the admin policies here.
--   Both buckets allowlist jpeg/png/webp only: no SVG (stored-XSS risk)
--   and no GIF, deliberately stricter than event-photos.
--
-- The submission cap needs a SECURITY DEFINER helper
-- (private.crowd_submission_count): anon has no SELECT policy on
-- crowd_submissions, so a plain subquery inside the INSERT policy's
-- WITH CHECK would always see zero rows and the cap would never trigger.
-- Same shape and grant pattern as private.is_admin() (migration 020).
--
-- Finally, mailing_list gains a 'crowd_pov' source plus its own scoped
-- anon INSERT policy, extending (not touching) migration 024's
-- media_hub logic.
--
-- Safe to re-run — every statement below is guarded.


-- ── 1. Tables ─────────────────────────────────────────────────

create table if not exists crowd_submissions (
  id                uuid        primary key default gen_random_uuid(),
  event_id          uuid        not null references events(id) on delete cascade,
  email             text        not null,
  storage_path      text        not null,  -- path within the crowd-pov-pending bucket
  status            text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  consent_accepted  boolean     not null default false,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid        references admins(user_id),
  rejection_reason  text
);

create table if not exists crowd_photos (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references events(id) on delete cascade,
  submission_id uuid        unique references crowd_submissions(id) on delete set null,
  photo_url     text        not null,  -- public URL in the crowd-pov bucket
  approved_at   timestamptz not null default now(),
  sort_order    integer     not null default 0
);

alter table crowd_submissions enable row level security;
alter table crowd_photos      enable row level security;

-- Serves both the submission-cap lookup (event_id + lower(email)) and
-- the future admin review queue filtered by event.
create index if not exists idx_crowd_submissions_event_email
  on crowd_submissions (event_id, lower(email));

create index if not exists idx_crowd_photos_event_sort
  on crowd_photos (event_id, sort_order);


-- ── 2. Submission-cap helper ──────────────────────────────────
-- Counts a visitor's non-rejected submissions for one event. SECURITY
-- DEFINER so the count sees real rows even though the calling role has
-- no SELECT policy on crowd_submissions. Rejected rows don't count, so
-- an admin rejecting a photo frees the slot back up. Lives in `private`
-- so PostgREST never exposes it as an RPC endpoint (see migration 020).

create or replace function private.crowd_submission_count(p_email text, p_event_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from crowd_submissions
  where lower(email) = lower(p_email)
    and event_id = p_event_id
    and status <> 'rejected';
$$;

revoke all on function private.crowd_submission_count(text, uuid) from public, anon, authenticated;
grant execute on function private.crowd_submission_count(text, uuid) to authenticated, anon;
-- (grant is required for the INSERT policy below to evaluate for these
-- roles — `private` stays off the API regardless.)


-- ── 3. crowd_submissions policies ─────────────────────────────
-- INSERT only for the public: no SELECT/UPDATE/DELETE policy exists for
-- non-admins, so submitted emails can never be read back or altered.
-- The WITH CHECK pins every moderation column to its pristine state
-- (no self-approving, no forged review trail), requires explicit
-- consent, and enforces the 5-per-email-per-event cap.
--
-- Note: with no SELECT policy, the client must insert with
-- `returning=minimal` (supabase-js default when .select() is NOT
-- chained) — chaining .select() onto the insert would fail RLS.

drop policy if exists "Public can submit crowd photos" on crowd_submissions;
create policy "Public can submit crowd photos"
  on crowd_submissions for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and consent_accepted = true
    and reviewed_at is null
    and reviewed_by is null
    and rejection_reason is null
    and private.crowd_submission_count(email, event_id) < 5
  );

drop policy if exists "Admin manages crowd_submissions" on crowd_submissions;
create policy "Admin manages crowd_submissions"
  on crowd_submissions for all using (private.is_admin()) with check (private.is_admin());


-- ── 4. crowd_photos policies ──────────────────────────────────
-- Same pattern as media_assets: world-readable, admin-writable.

drop policy if exists "Public can read crowd_photos" on crowd_photos;
create policy "Public can read crowd_photos"
  on crowd_photos for select using (true);

drop policy if exists "Admin manages crowd_photos" on crowd_photos;
create policy "Admin manages crowd_photos"
  on crowd_photos for all using (private.is_admin()) with check (private.is_admin());


-- ── 5. Storage buckets ────────────────────────────────────────
-- on conflict DO UPDATE (not DO NOTHING) so a re-run also converges the
-- size/mime config if it ever drifts in the dashboard.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crowd-pov-pending', 'crowd-pov-pending', false,
        15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crowd-pov', 'crowd-pov', true,
        15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ── 6. Storage policies: crowd-pov-pending (private) ──────────
-- Visitors can put files in, and that's all — no listing, reading,
-- overwriting, or deleting. Admin gets all four verbs: SELECT for
-- signed-URL previews in the review UI, UPDATE + SELECT on the source
-- and INSERT on the destination for the cross-bucket move() on
-- approval, DELETE for cleanup on rejection.

drop policy if exists "Public upload crowd pov pending" on storage.objects;
create policy "Public upload crowd pov pending"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'crowd-pov-pending');

drop policy if exists "Admin read crowd pov pending" on storage.objects;
create policy "Admin read crowd pov pending"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'crowd-pov-pending' and private.is_admin());

drop policy if exists "Admin upload crowd pov pending" on storage.objects;
create policy "Admin upload crowd pov pending"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'crowd-pov-pending' and private.is_admin());

drop policy if exists "Admin update crowd pov pending" on storage.objects;
create policy "Admin update crowd pov pending"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'crowd-pov-pending' and private.is_admin());

drop policy if exists "Admin delete crowd pov pending" on storage.objects;
create policy "Admin delete crowd pov pending"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'crowd-pov-pending' and private.is_admin());


-- ── 7. Storage policies: crowd-pov (public) ───────────────────
-- No public SELECT policy, deliberately: the bucket's `public = true`
-- flag is what serves object URLs to the site, and a migration-007-style
-- broad `using (bucket_id = 'crowd-pov')` policy would additionally let
-- anyone LIST the bucket via the storage API — flagged by the security
-- advisor, and the live event-photos bucket was already reworked the
-- same way. The site will read approved photos from crowd_photos rows,
-- never by listing. Admin keeps a scoped SELECT for the review UI; only
-- admin can ever write here, and even that normally happens via move()
-- from the pending bucket rather than a direct upload.

drop policy if exists "Public read access for crowd pov photos" on storage.objects;

drop policy if exists "Admin can view crowd pov photos" on storage.objects;
create policy "Admin can view crowd pov photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'crowd-pov' and private.is_admin());

drop policy if exists "Admin upload crowd pov photos" on storage.objects;
create policy "Admin upload crowd pov photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'crowd-pov' and private.is_admin());

drop policy if exists "Admin update crowd pov photos" on storage.objects;
create policy "Admin update crowd pov photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'crowd-pov' and private.is_admin());

drop policy if exists "Admin delete crowd pov photos" on storage.objects;
create policy "Admin delete crowd pov photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'crowd-pov' and private.is_admin());


-- ── 8. mailing_list: new 'crowd_pov' source ───────────────────
-- Same shape as migration 024's media_hub addition. The constraint was
-- created inline in migration 013, so Postgres auto-named it
-- `mailing_list_source_check`; drop and recreate with the new value.

alter table mailing_list
  drop constraint if exists mailing_list_source_check;

alter table mailing_list
  add constraint mailing_list_source_check
  check (source in ('manual', 'humanitix', 'media_hub', 'crowd_pov'));

-- Scoped anon INSERT, separate from the media_hub policy (which is
-- hardcoded to source = 'media_hub'). Same forge-proofing rationale as
-- migration 024: no SELECT/UPDATE/DELETE for non-admins, and a repeat
-- signup fails the unique index on lower(email) with SQLSTATE 23505,
-- which the frontend will treat as "already subscribed".

drop policy if exists "Public can join mailing list from crowd pov" on mailing_list;
create policy "Public can join mailing list from crowd pov"
  on mailing_list for insert
  to anon, authenticated
  with check (source = 'crowd_pov' and subscribed = true);


-- ── Verify ────────────────────────────────────────────────────
-- select tablename, policyname, cmd, roles from pg_policies
--   where tablename in ('crowd_submissions', 'crowd_photos');
-- select policyname, cmd from pg_policies
--   where schemaname = 'storage' and policyname ilike '%crowd pov%';
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id like 'crowd-pov%';
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'mailing_list_source_check';
-- select private.crowd_submission_count('test@example.com',
--   (select id from events limit 1));  -- expect 0
