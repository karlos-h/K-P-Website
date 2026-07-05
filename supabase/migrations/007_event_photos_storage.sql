-- ============================================================
-- MIGRATION 007 — Event Photos Storage Bucket
-- K&P Website · Run this AFTER migration 006
-- ============================================================
-- Creates the Storage bucket the admin upload flow will write
-- real photo files into (media_assets.photo_url/thumb_url will
-- point at public URLs in this bucket). Public read so the site
-- can display photos with no auth; writes restricted to the
-- authenticated admin role only.
--
-- Safe to re-run — bucket insert and each policy are guarded.

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read access for event photos'
  ) then
    create policy "Public read access for event photos"
      on storage.objects for select
      using (bucket_id = 'event-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin upload event photos'
  ) then
    create policy "Admin upload event photos"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'event-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin update event photos'
  ) then
    create policy "Admin update event photos"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'event-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin delete event photos'
  ) then
    create policy "Admin delete event photos"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'event-photos');
  end if;
end $$;
