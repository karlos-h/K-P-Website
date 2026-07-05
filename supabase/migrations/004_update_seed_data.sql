-- ============================================================
-- MIGRATION 004 — Update Seed Data
-- K&P Website · Run this AFTER migrations 001, 002, and 003
-- ============================================================
-- Adds facts confirmed via the July 2026 brand voice research
-- (Kava_Pyramids_Brand_Voice_Guide.docx): an attendee stat, and
-- Kong Bar as a second current weekly residency alongside
-- Original Sin. Written as its own migration (rather than
-- editing 003) so 003 stays a clean historical record.
--
-- Safe to re-run — each insert checks for an existing row first.


-- ── Stats: Attendees ─────────────────────────────────────────
-- "10,000+ attendees" — flagged in the brand guide as worth
-- confirming, but included here alongside the verified 50+
-- shows figure per current direction. Update the value later
-- if a more precise count is confirmed.

insert into stats (label, value, suffix, sort_order)
select 'Attendees', 10000, '+', 5
where not exists (select 1 from stats where label = 'Attendees');


-- ── Trusted Venues: Kong Bar ─────────────────────────────────
-- Verified weekly residency (Saturdays), alongside the existing
-- Original Sin residency (Fridays). sort_order 0 places it first,
-- reflecting that both are current, ongoing bookings rather than
-- one-off past shows.

insert into trusted_venues (name, type, initials, sort_order)
select 'Kong Bar', 'Nightclub', 'KB', 0
where not exists (select 1 from trusted_venues where name = 'Kong Bar');
