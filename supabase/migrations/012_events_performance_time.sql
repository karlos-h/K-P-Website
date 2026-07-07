-- ============================================================
-- MIGRATION 012 — Add performance_time to events
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- Stores the set time as free text, e.g. "9:00 PM – 11:00 PM"

alter table events
  add column if not exists performance_time text;
