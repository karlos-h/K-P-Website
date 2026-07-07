-- ============================================================
-- MIGRATION 010 — Add ticket_url to events
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- ticket_url stores a link to the ticketing page for an event.
-- When present, a "Buy Tickets" button is shown on the event card.
-- Null = no tickets / free entry.

alter table events
  add column if not exists ticket_url text;
