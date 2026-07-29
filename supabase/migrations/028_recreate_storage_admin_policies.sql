-- ============================================================
-- MIGRATION 028 — Recreate storage admin policies (diagnostic)
-- K&P Website · Run this AFTER migration 027
-- ============================================================
-- ⚠ ALREADY APPLIED to production on 2026-07-28 (ledger version
-- 20260728025856) directly via the Supabase MCP while debugging live;
-- this file was reconstructed after the fact from the
-- supabase_migrations.schema_migrations ledger so the repo matches
-- reality. Do NOT re-apply — it documents history.
--
-- First step of a diagnostic sequence (028 → 032) chasing why every
-- admin photo upload failed with "new row violates row-level security
-- policy" even though the admin allowlist and policies were correct.
-- The real root cause was only found in migration 032; steps 028–031
-- are the bisection that got there.
--
-- Safe to re-run — every statement below is guarded.

-- Diagnostic finding: a hand-constructed INSERT into storage.objects using
-- the real admin's identity (role=authenticated, auth.uid() resolving to
-- the admin's user_id, private.is_admin() independently verified true)
-- still fails "new row violates row-level security policy" against the
-- live "Admin upload event photos" policy, even though the policy's own
-- with_check expression is exactly (bucket_id = 'event-photos' AND
-- private.is_admin()) and both halves individually evaluate true. This
-- points to a stale cached policy/plan rather than a logic error. Drop and
-- recreate the three storage.objects admin policies (same definitions) to
-- force Postgres/the connection pooler to invalidate whatever is cached.
drop policy if exists "Admin upload event photos" on storage.objects;
create policy "Admin upload event photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-photos' and private.is_admin());

drop policy if exists "Admin update event photos" on storage.objects;
create policy "Admin update event photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-photos' and private.is_admin());

drop policy if exists "Admin delete event photos" on storage.objects;
create policy "Admin delete event photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-photos' and private.is_admin());
