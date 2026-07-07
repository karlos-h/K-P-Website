-- ============================================================
-- MIGRATION 009 — Add city column to events
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- city stores a resolved "City, Country" label (e.g. "Auckland, New Zealand").
-- location is repurposed going forward to hold the venue name only
-- (e.g. "Bar 185", "Kong Bar"). Existing rows keep their current
-- location values unchanged.

alter table events
  add column if not exists city text;
