-- ============================================================
-- MIGRATION 032 — Fix: storage upload RETURNING visibility
-- K&P Website · Run this AFTER migration 031
-- ============================================================
-- ⚠ ALREADY APPLIED to production on 2026-07-28 (ledger version
-- 20260728030252) directly via the Supabase MCP while debugging live;
-- reconstructed after the fact from the schema_migrations ledger.
-- Do NOT re-apply — it documents history.
--
-- Final step of the 028 → 032 diagnostic sequence: contains the real
-- fix AND cleans up every temporary object migrations 029–031 created,
-- so the sequence as a whole ends in a correct, secure state.
--
-- Safe to re-run — every statement below is guarded.

-- ROOT CAUSE (confirmed via direct reproduction): migration 019 removed
-- every SELECT policy on storage.objects, including for the authenticated/
-- admin role, in order to stop anon from enumerating bucket contents via
-- storage.list(). That was the right call for anon, but it also broke
-- INSERT ... RETURNING for admin uploads — Postgres requires an applicable
-- SELECT policy to let the inserting role "see" the row it just inserted
-- via RETURNING, even though the INSERT's own WITH CHECK already passed.
-- Supabase Storage's upload endpoint relies on that RETURNING visibility
-- to confirm success, so every upload since migration 019 has failed with
-- a generic "new row violates row-level security policy" error — which
-- was never actually about admin status or the storage upload policy
-- itself, both of which were correct all along.
--
-- Fix: restore SELECT for the admin role only (bucket_id + is_admin()),
-- which is safe — it does NOT reopen the anon-enumeration issue migration
-- 019 fixed, since this policy is scoped to `authenticated` + `is_admin()`,
-- not `anon`/public.
--
-- This migration also cleans up temporary diagnostic objects created while
-- isolating the root cause: an insecure hardcoded-`true` upload policy and
-- a throwaway helper function, neither of which should remain live.

-- Clean up diagnostic objects
drop policy if exists "diag admin select event photos" on storage.objects;
drop function if exists private.is_admin_diag_v2();

-- Restore the upload policy to the correct, secure admin-only check
-- (it was temporarily hardcoded to `true` during bisection testing).
drop policy if exists "Admin upload event photos" on storage.objects;
create policy "Admin upload event photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-photos' and private.is_admin());

-- The actual fix: permanent, admin-only SELECT policy.
drop policy if exists "Admin can view event photos" on storage.objects;
create policy "Admin can view event photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'event-photos' and private.is_admin());
