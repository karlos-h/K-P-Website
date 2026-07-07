-- ============================================================
-- MIGRATION 021 — Client-safe admin check RPC
-- K&P Website · Run this AFTER migration 020
-- ============================================================
-- ProtectedRoute and LoginPage need to verify admin status in the
-- browser. The `private.is_admin()` helper used by RLS policies lives
-- in a non-API schema, so the frontend can't call it directly.
--
-- This RPC is intentionally narrow: authenticated callers only, returns
-- a boolean for auth.uid() and nothing else. It does NOT expose the
-- admins table or any other user's status.
--
-- Safe to re-run.

create or replace function public.am_i_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

revoke all on function public.am_i_admin() from public;
grant execute on function public.am_i_admin() to authenticated;
