-- ============================================================
-- MIGRATION 027 — Track the attendee's real Humanitix order date
-- K&P Website · Run this AFTER migration 026
-- ============================================================
-- Problem this fixes: mailing_list.created_at records when the *sync ran*,
-- not when the attendee actually bought their ticket. One sync across
-- several old events therefore stamps every attendee with the same
-- timestamp — all 136 existing humanitix rows sit within a few seconds of
-- 2026-07-07 17:58 — so "most recent members first" is meaningless for
-- them. The Mailing List tab's sort was correct all along; the data was
-- not.
--
-- The Humanitix Public API order object (OpenAPI spec at
-- https://api.humanitix.com/v1/documentation/json) exposes ISO-8601
-- `createdAt`, `completedAt`, `updatedAt` and `incompleteAt`. The edge
-- function now stores completedAt (falling back to createdAt) here.
--
-- Nullable on purpose: manual and media_hub contacts have no order, and
-- existing humanitix rows stay null until the next sync backfills them.
--
-- Safe to re-run — every statement below is guarded.


-- ── 1. The real order timestamp ───────────────────────────────

alter table mailing_list
  add column if not exists order_created_at timestamptz;

comment on column mailing_list.order_created_at is
  'Humanitix order completedAt (fallback createdAt). Null for manual/media_hub contacts.';


-- ── 2. A single sortable column ───────────────────────────────
-- PostgREST's .order() takes column names, not expressions, so
-- `coalesce(order_created_at, created_at)` cannot be expressed in the
-- client query directly. A STORED generated column gives the API (and any
-- index) a real column to sort on, and keeps the fallback logic in one
-- place instead of duplicating it in JS.

alter table mailing_list
  add column if not exists effective_signup_at timestamptz
  generated always as (coalesce(order_created_at, created_at)) stored;

comment on column mailing_list.effective_signup_at is
  'Sort key for the admin Mailing List tab: the real signup date where we '
  'know it (Humanitix order), otherwise the row insertion time.';

create index if not exists mailing_list_effective_signup_at_idx
  on mailing_list (effective_signup_at desc);


-- ── Verify ────────────────────────────────────────────────────
-- select email, source, created_at, order_created_at, effective_signup_at
--   from mailing_list order by effective_signup_at desc limit 10;
