-- ============================================================
-- MIGRATION 015 — Add website_url to trusted_venues
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- Lets each "Trusted By" logo/card on the homepage link out to the
-- venue's own website. Nullable — cards without one render unlinked.

alter table trusted_venues
  add column if not exists website_url text;
