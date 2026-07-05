-- ============================================================
-- MIGRATION 005 — Fix events column name (name -> title)
-- K&P Website · Safe to run any time after 001
-- ============================================================
-- Migration 001 defined the `events` table with a `name` column,
-- but migration 003's seed data inserts into `title`, and the
-- frontend (HomePage.jsx event cards, and the new "Next Up"
-- featured-event block) both read `event.title`. That's a real
-- mismatch between the historical migration file and what the
-- app actually needs.
--
-- Rather than editing 001 or 003 in place, this renames the
-- column going forward. It's a no-op if the table was already
-- created with `title` (e.g. set up by hand to match the seed
-- data / frontend instead of the original migration file).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'events' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'events' and column_name = 'title'
  ) then
    alter table events rename column name to title;
  end if;
end $$;
