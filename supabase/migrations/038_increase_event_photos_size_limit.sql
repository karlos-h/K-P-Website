-- ============================================================
-- MIGRATION 038 — Raise the event-photos size limit (safety margin)
-- K&P Website · Run this AFTER migration 037
-- ============================================================
-- Client-side compression (see frontend/src/lib/processImage.js,
-- processAdminPhoto) now resizes admin-uploaded event photos to a 2000px
-- longest edge at 0.85 JPEG quality before they ever reach Storage, so
-- realistic output is in the low hundreds of KB to ~1-2MB. This bump is a
-- safety margin, not a return to accepting raw multi-megapixel originals.
--
-- allowed_mime_types is deliberately left alone: it already includes
-- image/jpeg, which is all this path can now produce.
--
-- Scoped to event-photos only — the crowd-pov and crowd-pov-pending
-- buckets keep their 15 MB limits from migration 033.
--
-- Safe to re-run.

update storage.buckets
set file_size_limit = 20971520 -- 20 MB
where id = 'event-photos';


-- ── Verify ────────────────────────────────────────────────────
-- select id, file_size_limit, allowed_mime_types
--   from storage.buckets order by id;
-- expect: event-photos 20971520, crowd-pov* unchanged at 15728640
