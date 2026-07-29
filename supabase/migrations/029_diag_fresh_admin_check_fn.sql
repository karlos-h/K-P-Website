-- ============================================================
-- MIGRATION 029 — Diagnostic: fresh admin-check function
-- K&P Website · Run this AFTER migration 028
-- ============================================================
-- ⚠ ALREADY APPLIED to production on 2026-07-28 (ledger version
-- 20260728030011) directly via the Supabase MCP while debugging live;
-- reconstructed after the fact from the schema_migrations ledger.
-- Do NOT re-apply — it documents history.
--
-- ⚠ DIAGNOSTIC STEP, LATER REVERTED: everything this migration creates
-- (private.is_admin_diag_v2 and the temporary policy rewiring) is
-- dropped/restored by migration 032. It only makes sense as part of the
-- 028 → 032 sequence — never run it in isolation against production,
-- or the upload policy will be left pointing at a throwaway function.

-- Diagnostic only: brand-new function name/OID, zero chance of any stale
-- reference anywhere, temporarily wired to the upload policy only, to test
-- whether the failure is tied to the specific private.is_admin object.
create or replace function private.is_admin_diag_v2()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant execute on function private.is_admin_diag_v2() to authenticated, anon;

drop policy if exists "Admin upload event photos" on storage.objects;
create policy "Admin upload event photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-photos' and private.is_admin_diag_v2());
