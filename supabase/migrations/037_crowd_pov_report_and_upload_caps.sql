-- ============================================================
-- MIGRATION 037 — Crowd POV: bound reports per photo, constrain upload paths
-- K&P Website · Run this AFTER migration 036
-- ============================================================
-- Two holes on the anon-writable surface, both found in code review of
-- the v5.23.0 Crowd POV release. Neither is exploitable for data access
-- — they are volume problems, and both are bounded here in the database
-- rather than in the client, because the client is not a place a limit
-- can be enforced.
--
-- ── Why the client-side guards are not enough ─────────────────
-- EventCarousel.jsx keeps a localStorage log capping a browser at 5
-- reports per 24h and one per photo. That was always documented as a
-- speed bump rather than a boundary, and it is: the Supabase anon key
-- ships in the browser bundle by design, so anyone can POST to
-- crowd_photo_reports directly and never load the page at all.
--
-- Safe to re-run — every statement below is guarded.


-- ── 1. Cap open reports per photo ─────────────────────────────
-- The first report already hides the photo (migration 036's trigger), so
-- everything after it is signal about how many people object, not extra
-- protection. Without a bound, an anon actor can insert unlimited rows
-- against a single crowd_photo_id — crowd_photos ids are publicly
-- readable by design, so they are trivially enumerable — and the admin
-- panel renders every open report it fetches. That turns a public form
-- into a way to make the moderation queue unusable.
--
-- Counting OPEN reports only is deliberate, and mirrors how
-- private.crowd_submission_count ignores 'rejected'. Once an admin
-- restores a photo and dismisses its reports, the slate clears and the
-- photo can be reported again — a photo is not permanently
-- un-reportable just because it survived one round.
--
-- Lives in `private` so PostgREST never exposes it as an RPC endpoint
-- (see migration 020). Unlike crowd_submission_count, this one is NOT
-- given a public wrapper: the frontend has no legitimate need to ask
-- "how many people have reported this photo", and answering it would
-- leak moderation state to anyone who asked.

create or replace function private.crowd_photo_report_count(p_crowd_photo_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from crowd_photo_reports
  where crowd_photo_id = p_crowd_photo_id
    and status = 'open';
$$;

revoke all on function private.crowd_photo_report_count(uuid) from public, anon, authenticated;
grant execute on function private.crowd_photo_report_count(uuid) to authenticated, anon;
-- (grant is required for the INSERT policy below to evaluate for these
-- roles — `private` stays off the API regardless.)

drop policy if exists "Public can report crowd photos" on crowd_photo_reports;
create policy "Public can report crowd photos"
  on crowd_photo_reports for insert
  to anon, authenticated
  with check (
    status = 'open'
    and resolved_at is null
    and resolved_by is null
    and private.crowd_photo_report_count(crowd_photo_id) < 20
  );

-- 20 is chosen to be far above any plausible genuine volume for a single
-- photo on a site this size, while keeping the worst case a card the
-- admin can still scroll. The frontend caps what it renders as well, so
-- this bound and that one are independent.


-- ── 2. Constrain the anon upload path ─────────────────────────
-- The policy from migration 033 checked only the bucket, so an anon
-- session could write to any key in crowd-pov-pending. The frontend
-- always writes `{event_id}/{random uuid}.jpg` (CrowdPovModal.jsx), and
-- the hourly sweep from migration 035 removes anything with no matching
-- crowd_submissions row — but that leaves up to an hour for junk to
-- accumulate, at up to the bucket's 15 MB per object.
--
-- Pinning the shape closes it without touching the real flow. Both
-- segments are UUIDs: events.id is `uuid primary key default
-- gen_random_uuid()` (migration 001) and the filename comes from
-- crypto.randomUUID(), both rendered lowercase — verified against the
-- client before writing this, because if events.id were a bigint this
-- pattern would silently reject every genuine submission.
--
-- Admin uploads are unaffected: "Admin upload crowd pov pending" is a
-- separate permissive policy, and permissive policies are OR'd.

drop policy if exists "Public upload crowd pov pending" on storage.objects;
create policy "Public upload crowd pov pending"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'crowd-pov-pending'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );


-- ── Verify ────────────────────────────────────────────────────
-- select policyname, cmd, with_check from pg_policies
--   where tablename = 'crowd_photo_reports' and cmd = 'INSERT';
--
-- select policyname, with_check from pg_policies
--   where tablename = 'objects' and policyname = 'Public upload crowd pov pending';
--
-- Cap behaviour, as anon (substitute a real, visible crowd_photos id):
--   insert into crowd_photo_reports (crowd_photo_id, reason)
--     values ('<uuid>', 'offensive');           -- expect success up to 20
--   select private.crowd_photo_report_count('<uuid>');
--   -- the 21st insert should fail with a row-level security violation (42501)
--
-- Path constraint, as anon against storage.objects:
--   a key like 'not-a-uuid/whatever.png' must be rejected;
--   '<event uuid>/<random uuid>.jpg' must still be accepted.
