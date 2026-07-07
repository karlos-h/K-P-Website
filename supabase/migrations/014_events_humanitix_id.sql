-- ============================================================
-- MIGRATION 014 — Add humanitix_event_id to events
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- Only events with this set are eligible for the manual
-- Humanitix → mailing_list sync (Mailing List Phase 2).

alter table events
  add column if not exists humanitix_event_id text;
