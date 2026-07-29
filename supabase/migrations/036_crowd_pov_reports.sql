-- ============================================================
-- MIGRATION 036 — Crowd POV: visitor reports + auto-hide
-- K&P Website · Run this AFTER migration 035
-- ============================================================
-- Lets a visitor report a published Crowd POV photo as offensive or as
-- posted without their permission. A report hides the photo immediately
-- and queues it for admin review.
--
-- Hiding is soft and reversible: nothing is deleted at report time. That
-- is deliberate, and it is what makes it safe to act on a single
-- anonymous report. Someone in a photo they never consented to should
-- not have to wait for a human to wake up, and the cost of being wrong
-- is a photo temporarily missing rather than a photo destroyed. The
-- admin then either restores it or removes it permanently.
--
-- ── How hiding is enforced ───────────────────────────────────
-- By RLS, not by application code. The public read policy becomes
-- `using (hidden = false)`, so a hidden row simply stops being returned
-- to anon — useCombinedGalleries.js needs no change and cannot forget to
-- filter. The admin's own "Admin manages crowd_photos" policy is
-- unaffected and still sees everything, hidden or not, because permissive
-- policies are OR'd together.
--
-- Safe to re-run — every statement below is guarded.


-- ── 1. The hidden flag ────────────────────────────────────────

alter table crowd_photos
  add column if not exists hidden boolean not null default false;

-- Serves the admin's "what is currently hidden" query.
create index if not exists idx_crowd_photos_hidden
  on crowd_photos (hidden) where hidden;

drop policy if exists "Public can read crowd_photos" on crowd_photos;
create policy "Public can read crowd_photos"
  on crowd_photos for select using (hidden = false);


-- ── 2. A fourth submission status: 'removed' ──────────────────
-- 'rejected' means it never went live. 'removed' means it did, and was
-- taken down after a report. Collapsing the two would lose the only
-- record that a photo was ever public. The constraint was created inline
-- in migration 033, so Postgres auto-named it crowd_submissions_status_check
-- (confirmed against pg_constraint); same drop-and-recreate pattern
-- migration 024 used for mailing_list_source_check.

alter table crowd_submissions
  drop constraint if exists crowd_submissions_status_check;

alter table crowd_submissions
  add constraint crowd_submissions_status_check
  check (status in ('pending', 'approved', 'rejected', 'removed'));


-- ── 3. The reports table ──────────────────────────────────────
-- Reports carry no reporter identity at all — no email, no IP. Someone
-- asking to be removed from a photo shouldn't have to identify
-- themselves to do it. The trade is that reports are cheap to forge,
-- which is why a report hides rather than deletes.

create table if not exists crowd_photo_reports (
  id              uuid        primary key default gen_random_uuid(),
  crowd_photo_id  uuid        not null references crowd_photos(id) on delete cascade,
  reason          text        not null check (reason in ('offensive', 'no_consent', 'other')),
  details         text,
  status          text        not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid        references admins(user_id)
);

alter table crowd_photo_reports enable row level security;

-- Drives the admin queue: open reports for a given hidden photo.
create index if not exists idx_crowd_photo_reports_photo_status
  on crowd_photo_reports (crowd_photo_id, status);

-- Same defensive shape as the crowd_submissions insert policy: the
-- public may only ever create a pristine, unresolved report, and has no
-- SELECT policy at all — reports are readable by admin only, since
-- `details` is free text a reporter may put anything into.

drop policy if exists "Public can report crowd photos" on crowd_photo_reports;
create policy "Public can report crowd photos"
  on crowd_photo_reports for insert
  to anon, authenticated
  with check (
    status = 'open'
    and resolved_at is null
    and resolved_by is null
  );

drop policy if exists "Admin manages crowd_photo_reports" on crowd_photo_reports;
create policy "Admin manages crowd_photo_reports"
  on crowd_photo_reports for all using (private.is_admin()) with check (private.is_admin());


-- ── 4. Auto-hide on report ────────────────────────────────────
-- SECURITY DEFINER is load-bearing here, unlike private.flip_past_events()
-- in migration 025 which runs fine without it because pg_cron invokes it
-- as the database owner. This one fires inside an INSERT performed by
-- anon, and anon has no UPDATE privilege on crowd_photos whatsoever — so
-- without SECURITY DEFINER every report would fail on the hide.
--
-- Kept in `private` so it stays off the PostgREST API. Revoking EXECUTE
-- does not stop the trigger: Postgres checks that privilege when the
-- trigger is created, not each time it fires.

create or replace function private.hide_reported_crowd_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update crowd_photos set hidden = true where id = new.crowd_photo_id;
  return null;
end;
$$;

revoke all on function private.hide_reported_crowd_photo() from public, anon, authenticated;

drop trigger if exists trg_hide_reported_crowd_photo on crowd_photo_reports;
create trigger trg_hide_reported_crowd_photo
  after insert on crowd_photo_reports
  for each row execute function private.hide_reported_crowd_photo();


-- ── Verify ────────────────────────────────────────────────────
-- select policyname, cmd, qual, with_check from pg_policies
--   where tablename in ('crowd_photos', 'crowd_photo_reports');
--
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'crowd_submissions_status_check';
--
-- Round-trip as anon (substitute a real, visible crowd_photos id):
--   insert into crowd_photo_reports (crowd_photo_id, reason)
--     values ('<uuid>', 'offensive');
--   select id, hidden from crowd_photos where id = '<uuid>';  -- expect hidden = t
