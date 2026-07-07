-- ============================================================
-- MIGRATION 016 — Add order_id to mailing_list
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- Stores the source order/transaction ID for a contact — populated by
-- the humanitix-sync Edge Function (Humanitix's order._id) for synced
-- contacts. Nullable, since manually-added contacts have no order.

alter table mailing_list
  add column if not exists order_id text;
