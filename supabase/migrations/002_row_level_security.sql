-- ============================================================
-- MIGRATION 002 — Row Level Security (RLS)
-- K&P Website · Run this AFTER migration 001
-- ============================================================


-- Enable RLS on every table
alter table events           enable row level security;
alter table stats            enable row level security;
alter table trusted_venues   enable row level security;
alter table mixes            enable row level security;
alter table videos           enable row level security;
alter table media_assets     enable row level security;
alter table media_downloads  enable row level security;
alter table enquiries        enable row level security;


-- ── Drop existing policies (safe to re-run) ──────────────────
drop policy if exists "Public can read events"          on events;
drop policy if exists "Public can read stats"           on stats;
drop policy if exists "Public can read trusted_venues"  on trusted_venues;
drop policy if exists "Public can read mixes"           on mixes;
drop policy if exists "Public can read videos"          on videos;
drop policy if exists "Public can read media_assets"    on media_assets;
drop policy if exists "Public can submit enquiries"     on enquiries;
drop policy if exists "Public can log media downloads"  on media_downloads;
drop policy if exists "Auth users manage events"        on events;
drop policy if exists "Auth users manage stats"         on stats;
drop policy if exists "Auth users manage trusted_venues" on trusted_venues;
drop policy if exists "Auth users manage mixes"         on mixes;
drop policy if exists "Auth users manage videos"        on videos;
drop policy if exists "Auth users manage media_assets"  on media_assets;
drop policy if exists "Auth users manage media_downloads" on media_downloads;
drop policy if exists "Auth users manage enquiries"     on enquiries;
drop policy if exists "Admin manages events"            on events;
drop policy if exists "Admin manages stats"             on stats;
drop policy if exists "Admin manages trusted_venues"    on trusted_venues;
drop policy if exists "Admin manages mixes"             on mixes;
drop policy if exists "Admin manages videos"            on videos;
drop policy if exists "Admin manages media_assets"      on media_assets;
drop policy if exists "Admin manages media_downloads"   on media_downloads;
drop policy if exists "Admin manages enquiries"         on enquiries;


-- ── Public read access ───────────────────────────────────────
create policy "Public can read events"
  on events for select using (true);

create policy "Public can read stats"
  on stats for select using (true);

create policy "Public can read trusted_venues"
  on trusted_venues for select using (true);

create policy "Public can read mixes"
  on mixes for select using (true);

create policy "Public can read videos"
  on videos for select using (true);

create policy "Public can read media_assets"
  on media_assets for select using (true);


-- ── Public insert access ─────────────────────────────────────
create policy "Public can submit enquiries"
  on enquiries for insert with check (true);

create policy "Public can log media downloads"
  on media_downloads for insert with check (true);


-- ── Authenticated admin — full access ────────────────────────
create policy "Admin manages events"
  on events for all using (auth.role() = 'authenticated');

create policy "Admin manages stats"
  on stats for all using (auth.role() = 'authenticated');

create policy "Admin manages trusted_venues"
  on trusted_venues for all using (auth.role() = 'authenticated');

create policy "Admin manages mixes"
  on mixes for all using (auth.role() = 'authenticated');

create policy "Admin manages videos"
  on videos for all using (auth.role() = 'authenticated');

create policy "Admin manages media_assets"
  on media_assets for all using (auth.role() = 'authenticated');

create policy "Admin manages media_downloads"
  on media_downloads for all using (auth.role() = 'authenticated');

create policy "Admin manages enquiries"
  on enquiries for all using (auth.role() = 'authenticated');
