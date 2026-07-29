-- ============================================================
-- MIGRATION 030 — Diagnostic: hardcoded-true upload policy
-- K&P Website · Run this AFTER migration 029
-- ============================================================
-- ⚠ ALREADY APPLIED to production on 2026-07-28 (ledger version
-- 20260728030100) directly via the Supabase MCP while debugging live;
-- reconstructed after the fact from the schema_migrations ledger.
-- Do NOT re-apply — it documents history.
--
-- ⚠ DIAGNOSTIC STEP, DELIBERATELY INSECURE, LATER REVERTED: this
-- temporarily replaced the admin check with a bare `true` as a bisection
-- test. Migration 032 restores the correct admin-only policy. It only
-- makes sense as part of the 028 → 032 sequence — running it in
-- isolation would leave ANY authenticated user able to upload into the
-- event-photos bucket.

-- Bisection test: remove the function call entirely from the check to see
-- whether the problem is specific to calling a function inside the policy,
-- or something else entirely about this table/row.
drop policy if exists "Admin upload event photos" on storage.objects;
create policy "Admin upload event photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-photos' and true);
