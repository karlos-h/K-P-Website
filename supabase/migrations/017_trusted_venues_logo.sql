-- ============================================================
-- MIGRATION 017 — Add logo_url to trusted_venues
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- When set, the homepage "Trusted By" card renders this image in
-- place of the initials badge. Nullable — falls back to initials.

alter table trusted_venues
  add column if not exists logo_url text;
