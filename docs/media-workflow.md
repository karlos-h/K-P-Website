# Media Workflow

## Photos

1. Keep full-resolution originals in OneDrive or another private archive.
2. Select and edit the strongest images.
3. Upload event photos through the photo upload panel in the admin dashboard. The browser resizes each one to 2000 pixels on the long edge, re-encodes it as JPEG and stores it in the Supabase `event-photos` bucket.
4. Link the full album on the event in the admin dashboard, under Events > Photographer / External Gallery. If more than one photographer shot the event, use "Add Another Gallery" so each album gets its own credit.
5. Use `frontend/public/media/images` only for small static site assets, such as the logo and hero fallback.

## Videos

1. Keep original footage in the private archive.
2. Export a short muted hero loop for the homepage.
3. Host full DJ sets on YouTube or SoundCloud.
4. Full-length YouTube uploads appear in the Watch carousel automatically. The feed only reaches the channel's latest 50 uploads, so add a row to the Supabase `videos` table, with its `published_date`, for any set that should stay listed after that.

## Naming

Use lowercase names with the event and year:

`rolling-meadows-2025-crowd-01.webp`

Avoid spaces, camera filenames, and duplicate names.
