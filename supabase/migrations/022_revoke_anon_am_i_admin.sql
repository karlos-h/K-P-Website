-- ============================================================
-- MIGRATION 022 — Revoke anon's EXECUTE on am_i_admin()
-- K&P Website · Run this AFTER migration 021
-- ============================================================
-- The Supabase security advisor flagged that `anon` could call
-- public.am_i_admin() directly (/rest/v1/rpc/am_i_admin), even though
-- migration 021 only intended to grant it to `authenticated`. This grant
-- was live on the database but never matched the migration file's stated
-- intent — likely a leftover from an earlier draft of the function.
--
-- Not actively exploitable: for an anonymous caller auth.uid() is null,
-- so the function just returns false and reveals nothing. But there's no
-- reason for anon to be able to call it at all, and the advisor is right
-- to flag the drift between intent and reality — tighten it to match.
--
-- Safe to re-run.

revoke execute on function public.am_i_admin() from anon;
