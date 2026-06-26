-- ============================================================
-- MIGRATION 003 — Seed Data
-- K&P Website · Run this AFTER migrations 001 and 002
-- ============================================================
-- This populates the tables with your real data so the site
-- has content to display straight away.
--
-- BEFORE RUNNING:
-- · Update the stats numbers to match your actual counts
-- · Add or remove events to match your real gig history
-- · Leave the mixes and videos sections commented out until
--   you have the real SoundCloud / YouTube IDs ready


-- ── Stats ────────────────────────────────────────────────────
-- Update "value" to match your real numbers before running.

insert into stats (label, value, suffix, sort_order) values
  ('Shows Played',    50,  '+',  1),
  ('Cities',           8,  '',   2),
  ('Countries',        3,  '',   3),
  ('Years Together',   3,  '',   4);


-- ── Trusted Venues ───────────────────────────────────────────
-- Add or remove venues to match where you have actually played.

insert into trusted_venues (name, type, initials, sort_order) values
  ('Original Sin',        'Nightclub',   'OS',  1),
  ('Bar 185',             'Nightclub',   'B1',  2),
  ('Rolling Meadows',     'Festival',    'RM',  3),
  ('UCSA',                'University',  'UC',  4),
  ('Lincoln University',  'University',  'LU',  5),
  ('Wonderland Brisbane', 'Festival',    'WL',  6);


-- ── Events ───────────────────────────────────────────────────
-- Add all your upcoming and past shows here.
-- status must be either 'upcoming' or 'past'.

insert into events (title, date, location, type, status) values
  ('Wonderland Brisbane',  '27 June 2026',     'Brisbane, Australia',  'Festival',      'upcoming'),
  ('Original Sin',         '15 March 2025',    'Christchurch, NZ',     'Club Night',    'past'),
  ('Rolling Meadows',      '20 January 2025',  'Christchurch, NZ',     'Festival',      'past'),
  ('Fiji Tour',            'June 2025',        'Nadi, Fiji',           'International', 'past'),
  ('UCSA Fresher 5',       'February 2025',    'Christchurch, NZ',     'University',    'past'),
  ('Bar 185',              'October 2024',     'Christchurch, NZ',     'Club Night',    'past');


-- ── Mixes ────────────────────────────────────────────────────
-- HOW TO GET YOUR SOUNDCLOUD EMBED URL:
-- 1. Go to soundcloud.com and open one of your tracks or sets
-- 2. Click the Share button (below the waveform)
-- 3. Click the "Embed" tab
-- 4. Copy the URL inside src="..." from the iframe code
-- 5. Paste it as the embed_url value below, then uncomment the line

-- insert into mixes (title, genre, embed_url) values
--   ('Mix Vol. 1', 'Hip-Hop / R&B', 'https://w.soundcloud.com/player/?url=PASTE_HERE'),
--   ('Mix Vol. 2', 'Top 40 / Club', 'https://w.soundcloud.com/player/?url=PASTE_HERE'),
--   ('Mix Vol. 3', 'Open Format',   'https://w.soundcloud.com/player/?url=PASTE_HERE');


-- ── Videos ───────────────────────────────────────────────────
-- HOW TO GET YOUR YOUTUBE VIDEO ID:
-- 1. Open any video on your YouTube channel
-- 2. Look at the URL: https://www.youtube.com/watch?v=XXXXXXXXXX
-- 3. The part after ?v= is the youtube_id — copy it
-- 4. Paste it below and uncomment the line

-- insert into videos (title, genre, youtube_id, sort_order) values
--   ('Live Set — Original Sin',  'Club Night',    'PASTE_VIDEO_ID',  1),
--   ('Fiji Tour 2025',           'International', 'PASTE_VIDEO_ID',  2),
--   ('Rolling Meadows Festival', 'Festival',      'PASTE_VIDEO_ID',  3);


-- ── Media Assets ─────────────────────────────────────────────
-- HOW TO ADD PHOTOS TO THE MEDIA HUB:
-- 1. Go to Supabase Dashboard → Storage → event-photos bucket
-- 2. Upload your photos (organised into folders by event name if you like)
-- 3. Click a photo → Copy URL → paste it as photo_url and thumb_url below
-- 4. Uncomment and run

-- insert into media_assets (event_name, event_date, photo_url, thumb_url, category, sort_order) values
--   ('Original Sin',   'March 2025',    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-photos/original-sin/photo1.jpg',
--                                       'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-photos/original-sin/photo1.jpg',
--                                       'Club Night', 1),
--   ('Fiji Tour',      'June 2025',     'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-photos/fiji/photo1.jpg',
--                                       'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-photos/fiji/photo1.jpg',
--                                       'International', 2);
