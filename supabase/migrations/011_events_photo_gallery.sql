-- ============================================================
-- MIGRATION 011 — External photographer gallery fields on events
-- K&P Website · Safe to re-run (all guarded with IF NOT EXISTS / defaults)
-- ============================================================
-- Allows each event to link out to an external photo gallery
-- (e.g. Adobe Lightroom shared album) with optional embed support
-- and photographer credit.

alter table events
  add column if not exists photo_gallery_url      text,
  add column if not exists photo_gallery_embeddable boolean not null default false,
  add column if not exists photographer_name      text,
  add column if not exists photographer_url       text;
