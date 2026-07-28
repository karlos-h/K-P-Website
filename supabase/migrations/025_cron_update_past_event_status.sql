-- ============================================================
-- MIGRATION 025 — Auto-flip event status upcoming → past
-- K&P Website · Run this AFTER migration 024
-- ============================================================
-- Problem this fixes: events.status is only ever recalculated when an
-- admin opens an event and re-saves it (handleDateChange / handleSave in
-- AdminEventsManager.jsx). There is no background process, so once a
-- gig's date passes the row silently stays 'upcoming' forever — the
-- homepage keeps advertising it — until somebody happens to edit it.
--
-- Fix: a pg_cron job that runs hourly and flips stale rows.
--
-- ── Timezone note ────────────────────────────────────────────
-- sort_date is a plain `date` with no timezone, and the business is in
-- Christchurch, NZ. The cutoff below is *midday NZ on the day after the
-- event*:
--
--   ((sort_date + 1)::timestamp AT TIME ZONE 'Pacific/Auckland')
--     + interval '12 hours'
--
-- `X::timestamp AT TIME ZONE 'Pacific/Auckland'` reads a naive timestamp
-- as NZ wall-clock time and returns a timestamptz, so this is correct
-- across NZDT/NZST transitions.
--
-- Why not anchor to midnight *starting* the event day + 24h? That lands
-- on midnight at the END of the event day — i.e. it would mark a gig
-- 'past' while the set is still running. Anchoring to the following day
-- and adding a half-day of grace means an event never flips mid-gig, and
-- still clears within about a day of finishing.
--
-- Safe to re-run — the job is unscheduled before being re-created.


-- ── 1. Extension ──────────────────────────────────────────────
-- On Supabase, pg_cron installs into the `cron` schema. If this CREATE
-- fails with a permissions error, enable pg_cron first via
-- Dashboard → Database → Extensions, then re-run this migration.

create extension if not exists pg_cron;


-- ── 2. The update, as a function ──────────────────────────────
-- Wrapped so the cron job body stays a single trivial call, and so the
-- same logic can be invoked by hand for testing without copy-pasting SQL.

create or replace function private.flip_past_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  flipped integer;
begin
  update events
  set status = 'past'
  where status = 'upcoming'
    and sort_date is not null
    and ((sort_date + 1)::timestamp at time zone 'Pacific/Auckland')
          + interval '12 hours' <= now();

  get diagnostics flipped = row_count;
  return flipped;
end;
$$;

revoke all on function private.flip_past_events() from public, anon, authenticated;


-- ── 3. Schedule it hourly (idempotent) ────────────────────────
-- cron.unschedule() throws if the job doesn't exist, so guard on the
-- catalog rather than calling it unconditionally.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'update-past-event-status') then
    perform cron.unschedule('update-past-event-status');
  end if;
end;
$$;

select cron.schedule(
  'update-past-event-status',
  '7 * * * *',                       -- hourly, at :07 past the hour
  $$select private.flip_past_events();$$
);


-- ── 4. Backfill once, now ─────────────────────────────────────
-- Correct any already-stale events immediately instead of leaving them
-- wrong until the first scheduled run.

select private.flip_past_events() as rows_flipped_on_install;


-- ── Verify ────────────────────────────────────────────────────
-- select jobid, jobname, schedule, active, command
--   from cron.job where jobname = 'update-past-event-status';
--
-- select status, count(*) from events group by status;
--
-- Most recent runs (after the first hour has elapsed):
-- select status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job
--                  where jobname = 'update-past-event-status')
--   order by start_time desc limit 5;
