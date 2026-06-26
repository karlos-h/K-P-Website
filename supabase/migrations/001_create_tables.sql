-- ============================================================
-- MIGRATION 001 — Create Tables
-- K&P Website · Run this first in Supabase SQL Editor
-- ============================================================


-- ── Events ──────────────────────────────────────────────────
-- Powers the Upcoming / Past tabs on the homepage Events section.
-- "date" is a display string (e.g. "27 June 2026"), not a date type,
-- so you can format it however looks best on the site.

create table if not exists events (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  date        text        not null,
  location    text        not null,
  type        text        not null,
  status      text        not null default 'upcoming'
                          check (status in ('upcoming', 'past')),
  created_at  timestamptz not null default now()
);


-- ── Stats ────────────────────────────────────────────────────
-- Animated count-up cards on the homepage.
-- "suffix" is appended directly after the number, e.g. value=50 suffix="+" → "50+"

create table if not exists stats (
  id          uuid    primary key default gen_random_uuid(),
  label       text    not null,
  value       integer not null,
  suffix      text    not null default '',
  sort_order  integer not null default 0
);


-- ── Trusted Venues ───────────────────────────────────────────
-- Venue cards in the "Trusted By" section.
-- "initials" is the 2–3 letter badge shown on the card, e.g. "OS" for Original Sin.

create table if not exists trusted_venues (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  type        text    not null,
  initials    text    not null,
  sort_order  integer not null default 0
);


-- ── Mixes ────────────────────────────────────────────────────
-- SoundCloud player embeds in the Listen section.
-- "embed_url" is the full player URL from SoundCloud Share → Embed → src="..."

create table if not exists mixes (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  genre       text        not null,
  embed_url   text        not null,
  created_at  timestamptz not null default now()
);


-- ── Videos ───────────────────────────────────────────────────
-- YouTube video grid in the Watch / Videos section.
-- "youtube_id" is the part after ?v= in a YouTube URL.
-- Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ → youtube_id = 'dQw4w9WgXcQ'

create table if not exists videos (
  id          uuid    primary key default gen_random_uuid(),
  title       text    not null,
  genre       text    not null,
  youtube_id  text    not null,
  sort_order  integer not null default 0
);


-- ── Media Assets ─────────────────────────────────────────────
-- Event photos shown in the /media-hub page.
-- "photo_url" and "thumb_url" are the public URLs from Supabase Storage bucket "event-photos".
-- Upload photos to Storage first, then copy the public URL into these columns.

create table if not exists media_assets (
  id           uuid    primary key default gen_random_uuid(),
  event_name   text    not null,
  event_date   text,
  photo_url    text    not null,
  thumb_url    text    not null,
  category     text    not null,
  sort_order   integer not null default 0
);


-- ── Media Downloads ──────────────────────────────────────────
-- Tracks who accessed and downloaded from the Media Hub.
-- Rows are written automatically by the website — you never need to insert manually.
-- "photo_id" is nullable so the row isn't lost if the photo is later deleted.

create table if not exists media_downloads (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null,
  photo_id      uuid        references media_assets(id) on delete set null,
  event_name    text,
  accessed_at   timestamptz,
  downloaded_at timestamptz
);


-- ── Enquiries ────────────────────────────────────────────────
-- Booking enquiries submitted via the contact form.
-- Status is managed from the Admin Dashboard (/admin).

create table if not exists enquiries (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  company     text,
  event_type  text,
  email       text        not null,
  message     text,
  status      text        not null default 'new'
                          check (status in ('new', 'reviewed', 'booked')),
  created_at  timestamptz not null default now()
);
