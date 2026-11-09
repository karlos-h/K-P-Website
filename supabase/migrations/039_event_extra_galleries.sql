-- Some events have more than one photographer, each with their own album.
-- photo_gallery_url and photographer_* stay as the primary gallery; this holds
-- any others as [{ "url", "photographer_name", "photographer_url" }].
-- Existing events RLS (public SELECT, admin ALL) covers the new column.
alter table public.events
  add column if not exists extra_galleries jsonb not null default '[]'::jsonb;
