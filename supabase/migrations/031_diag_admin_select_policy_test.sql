-- ============================================================
-- MIGRATION 031 — Diagnostic: admin SELECT policy test
-- K&P Website · Run this AFTER migration 030
-- ============================================================
-- ⚠ ALREADY APPLIED to production on 2026-07-28 (ledger version
-- 20260728030224) directly via the Supabase MCP while debugging live;
-- reconstructed after the fact from the schema_migrations ledger.
-- Do NOT re-apply — it documents history.
--
-- ⚠ DIAGNOSTIC STEP, LATER SUPERSEDED: this was the test that found the
-- root cause (see migration 032). The throwaway "diag …" policy it
-- creates is dropped by 032 and replaced with the permanent
-- "Admin can view event photos" policy. Part of the 028 → 032 sequence.
--
-- (The original ledger statement was a bare `create policy`; the
-- drop-if-exists guard below is added only to keep this file re-runnable
-- like every other migration in the repo — same effect either way.)

-- Diagnostic: test whether restoring SELECT visibility (admin-only, not
-- public) for storage.objects resolves upload failures caused by the
-- missing RETURNING-visibility policy (migration 019 dropped ALL select
-- policies, including for authenticated/admin).
drop policy if exists "diag admin select event photos" on storage.objects;
create policy "diag admin select event photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'event-photos' and private.is_admin());
