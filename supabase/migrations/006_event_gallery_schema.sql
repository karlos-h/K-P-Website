-- ============================================================
-- MIGRATION 006 — Event Photo Gallery: schema prep
-- K&P Website · Run this AFTER migrations 001-005
-- ============================================================
-- Small fixes ahead of the event-carousel Media Hub rebuild:
--   1. media_assets.event_date becomes a real `date` (was text) —
--      required to reliably sort "most recent event first".
--   2. media_assets gets a stable `event_slug` grouping key so
--      photos from one event don't silently split into two
--      groups over a typo/variant in event_name.
--   3. media_assets gets `is_cover` so one photo per event can be
--      marked as the carousel's header/thumbnail image.
--   4. The unused `gallery` table (title, category, image_url) is
--      dropped — it duplicated media_assets and nothing in the
--      frontend ever read from it.
--
-- Safe to re-run — every step is guarded and media_assets is
-- currently empty in production, so no data is at risk.

-- ── 1. event_date: text -> date ──────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'media_assets' and column_name = 'event_date' and data_type <> 'date'
  ) then
    alter table media_assets add column event_date_new date;
    update media_assets
      set event_date_new = event_date::date
      where event_date ~ '^\d{4}-\d{2}-\d{2}$';
    alter table media_assets drop column event_date;
    alter table media_assets rename column event_date_new to event_date;
  end if;
end $$;

-- ── 2. event_slug grouping key ───────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'media_assets' and column_name = 'event_slug'
  ) then
    alter table media_assets add column event_slug text;
    update media_assets
      set event_slug = lower(regexp_replace(event_name, '[^a-zA-Z0-9]+', '-', 'g'))
                       || coalesce('-' || to_char(event_date, 'YYYY-MM-DD'), '')
      where event_slug is null;
    create index if not exists media_assets_event_slug_idx on media_assets (event_slug);
  end if;
end $$;

-- ── 3. is_cover flag ──────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'media_assets' and column_name = 'is_cover'
  ) then
    alter table media_assets add column is_cover boolean not null default false;
  end if;
end $$;

-- ── 4. drop unused gallery table ─────────────────────────────
-- Confirmed via repo search: no migration or frontend file
-- references `gallery` — media_assets is the one real photo table.
drop table if exists gallery;
