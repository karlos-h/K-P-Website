-- ============================================================
-- MIGRATION 023 — Add published_date to videos
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- The homepage "Watch" carousel sorts videos newest → oldest by
-- this date. Nullable, so existing rows keep working; undated
-- videos fall back to sort_order and appear after dated ones.
--
-- Set it to the video's publish or event date, e.g.:
--   update videos set published_date = '2026-06-27' where title = 'Wonderland Brisbane Recap';

alter table videos
  add column if not exists published_date date;
