-- ============================================================
-- MIGRATION 034 — Client-safe crowd submission count RPC
-- K&P Website · Run this AFTER migration 033
-- ============================================================
-- The Crowd POV modal uploads the visitor's photo to storage BEFORE
-- inserting the crowd_submissions row, because the reverse order would
-- leave the admin review queue showing submissions whose file never
-- arrived. The cost of that ordering: when the insert is rejected by the
-- per-email-per-event cap in the policy's WITH CHECK (migration 033),
-- the already-uploaded file is stranded in crowd-pov-pending with
-- nothing referencing it, and anon has no DELETE right to clean it up.
--
-- This RPC lets the frontend ask "is this email already at the cap for
-- this event?" and stop before it ever uploads, which removes the
-- common source of those orphans. It is a UX guard, not a security
-- boundary — a client can always skip the check, so the RLS policy
-- remains the real enforcement, and migration 035 sweeps up whatever
-- still slips through.
--
-- Same shape as public.am_i_admin() (migration 021): a thin public
-- wrapper over a helper that lives in the non-API `private` schema.
--
-- ── Disclosure note ──────────────────────────────────────────
-- crowd_submissions is deliberately unreadable by anon (it holds
-- uploader emails), and this function is a narrow, deliberate hole in
-- that: someone who already knows an email address can learn whether it
-- submitted photos to a given event. It is a confirmation oracle, not an
-- enumeration one — it returns a small integer for an email you supply
-- and cannot be used to list addresses, read any other column, or find
-- out anything about an email you haven't already guessed. That was
-- judged an acceptable trade for not stranding a file on every capped
-- submission.
--
-- Safe to re-run.

create or replace function public.crowd_submission_count(p_email text, p_event_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select private.crowd_submission_count(p_email, p_event_id);
$$;

revoke all on function public.crowd_submission_count(text, uuid) from public;
grant execute on function public.crowd_submission_count(text, uuid) to anon, authenticated;


-- ── Verify ────────────────────────────────────────────────────
-- select public.crowd_submission_count('nobody@example.com',
--   (select id from events where status = 'past' limit 1));  -- expect 0
