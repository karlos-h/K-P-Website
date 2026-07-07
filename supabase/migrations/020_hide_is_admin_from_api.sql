-- ============================================================
-- MIGRATION 020 — Hide is_admin() from the public API
-- K&P Website · Run this AFTER migration 019
-- ============================================================
-- The Supabase security advisor flagged that is_admin() (added in
-- migration 018) was callable directly over the API by anyone —
-- /rest/v1/rpc/is_admin — because PostgREST auto-exposes every function
-- in the `public` schema as an RPC endpoint, and RLS policies need
-- EXECUTE granted to `anon`/`authenticated` to actually work.
--
-- Fix: move the function into a `private` schema. Postgres itself can
-- still call it from RLS policies (schema visibility doesn't matter to
-- the query planner), but PostgREST only exposes schemas explicitly
-- configured as "exposed schemas" (just `public` here), so it disappears
-- from the API entirely. This does not change behavior for admins/anon —
-- only removes the direct-callable RPC endpoint.
--
-- Safe to re-run — every statement below is guarded.

create schema if not exists private;

create or replace function private.is_admin()
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

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, anon;
-- (grant is still required for RLS policies below to evaluate for these
-- roles — it just no longer matters because `private` isn't API-exposed.)

-- Point every policy at the relocated function.
drop policy if exists "Admin manages events"          on events;
create policy "Admin manages events"
  on events for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages stats"           on stats;
create policy "Admin manages stats"
  on stats for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages trusted_venues"  on trusted_venues;
create policy "Admin manages trusted_venues"
  on trusted_venues for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages mixes"           on mixes;
create policy "Admin manages mixes"
  on mixes for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages videos"          on videos;
create policy "Admin manages videos"
  on videos for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages media_assets"    on media_assets;
create policy "Admin manages media_assets"
  on media_assets for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages media_downloads" on media_downloads;
create policy "Admin manages media_downloads"
  on media_downloads for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages enquiries"       on enquiries;
create policy "Admin manages enquiries"
  on enquiries for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages mailing_list"    on mailing_list;
create policy "Admin manages mailing_list"
  on mailing_list for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admin manages epk_downloads"   on epk_downloads;
create policy "Admin manages epk_downloads"
  on epk_downloads for all using (private.is_admin()) with check (private.is_admin());

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

-- The old public.is_admin() is no longer referenced by any policy; drop it.
drop function if exists public.is_admin();
