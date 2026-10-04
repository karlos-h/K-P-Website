# Kava & Pyramids website

Official site for **Kava & Pyramids**, a DJ duo based in Christchurch, New Zealand. It's a React single-page app on a Supabase backend, deployed on Netlify.

**Live:** https://kavapyramids.com · **Current release:** v5.23.0 (see [CHANGELOG.md](CHANGELOG.md))

## What's on the site

| Route | What it is |
|---|---|
| `/` | Home page: hero reel, bio, upcoming and past events, mixes, watch carousel, social feeds, booking form |
| `/media-hub` | Event photo galleries behind a soft email gate, plus Crowd POV photo submissions from attendees |
| `/epk` | Electronic press kit: bio, genres, venues, press photos and a downloadable PDF |
| `/privacy-policy` | Privacy policy, including how photo submissions are handled |
| `/login` | Admin sign-in (Supabase Auth) |
| `/admin` | Admin dashboard for events, galleries, photo uploads, trusted venues, the mailing list and Crowd POV review |

`ProtectedRoute` guards everything under `/admin`. It checks for an active Supabase session and also calls the `am_i_admin()` RPC, so an account has to be on the admin allowlist as well as signed in.

## Crowd POV

Attendees can submit their own photos from an event, and a photo only appears on the site after an admin approves it. The browser re-encodes each submission before upload, which strips EXIF data (phone photos carry GPS coordinates), converts HEIC to JPEG and caps the longest edge at 2000px. Pending submissions go to a private bucket, and only approved photos move to the public one. Any visitor can report a published photo. Reporting hides it straight away until an admin reviews it, and the hide can be reversed.

## Stack

- **Frontend:** React 19, Vite 8, React Router 7, Framer Motion and Lucide icons. There's no CSS framework; the CSS is hand-written in `frontend/src/styles/`.
- **Backend:** Supabase (Postgres with Row Level Security, Auth, Storage, Edge Functions, pg_cron).
- **Hosting:** Netlify, configured entirely by the root `netlify.toml`.

There's no custom server. Every write from the browser goes straight to Supabase and is authorised by RLS policies, not application code. That makes the migrations in `supabase/migrations/` the real security boundary, so read them before changing anything data-related.

## Layout

```
frontend/          Vite + React SPA (the whole site)
  src/
    pages/         One file per route
    components/    Shared UI + the Admin* dashboard panels
    hooks/         useCombinedGalleries, useEventGalleries
    lib/           Supabase client, admin check, image processing, motion presets
    data/          siteData.js (static copy: genres, venues, socials, timeline)
    styles/        Hand-written CSS
  public/          Favicon, EPK PDF, hero video, gallery placeholders, robots/sitemap
supabase/
  migrations/      Numbered SQL migrations: schema, RLS, storage policies, cron
  functions/       Edge Functions (humanitix-sync, crowd-pov-cleanup)
docs/              Design and behaviour notes for specific sections
netlify.toml       Build config, SPA fallback, security headers
CHANGELOG.md       Release history, newest first
LICENSES.md        Third-party licence attribution (heic-to, LGPL-3.0)
```

## Local development

From `frontend/`:

```bash
npm install
npm run dev
```

If PowerShell's execution policy blocks `npm.ps1` on Windows, use `npm.cmd` instead.

Other scripts:

```bash
npm run lint
npm run build
npm run preview
```

## Environment variables

The Supabase URL and anon key have committed fallbacks in `frontend/src/lib/supabase.js`, so the app runs without a `.env` file. This is deliberate. The anon key is a publishable key that ships in the browser bundle anyway, and RLS is what protects the data. Env vars still take precedence when they're set, so a deployment can point at a different project.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `VITE_YOUTUBE_API_KEY` | Read-only, HTTP-referrer-restricted, for the Watch carousel |

Server-side secrets (`HUMANITIX_API_KEY`, `SITE_URL` and the Crowd POV cleanup token) are kept in Supabase Edge Function secrets and Vault. None of them belong in this repo or in a `VITE_` variable, because anything prefixed `VITE_` is inlined into the public bundle.

## Database

Migrations are numbered and applied in order. They're the source of truth for the schema, RLS policies, storage bucket rules and scheduled jobs.

**Main tables:** `events`, `media_assets`, `mixes`, `stats`, `trusted_venues`, `enquiries`, `mailing_list`, `media_downloads`, `crowd_submissions`, `crowd_photos`, `crowd_photo_reports`.

**Storage buckets:** `event-photos` and `crowd-pov` are public. `crowd-pov-pending` is private and holds submissions waiting for review.

There are two Edge Functions:

- **humanitix-sync** pulls ticketed events from Humanitix. CORS is restricted by `SITE_URL` / `ALLOWED_ORIGINS`.
- **crowd-pov-cleanup** is an hourly pg_cron job that deletes orphaned files from `crowd-pov-pending`. It authenticates with a shared token generated inside Postgres and stored in Vault.

## Deploying

Netlify builds from `main`. The root `netlify.toml` sets the base directory (`frontend`), build command (`npm run build`), publish directory (`dist`), the SPA fallback and security headers, so the Netlify dashboard needs no manual overrides.

Release flow:

1. Work on `develop` using conventional commits.
2. Add a `CHANGELOG.md` entry (newest first).
3. Tag `vX.Y.Z`.
4. Run `git merge --no-ff develop` into `main` and push `main`. Netlify deploys on push.

## Custom domain

The site is served at [kavapyramids.com](https://kavapyramids.com), and `kavapyramids.netlify.app` 301-redirects there so search engines don't index a duplicate copy.

## Media

- Small, optimised launch assets go in `frontend/public/media/`.
- Event photo galleries and short clips go in Supabase Storage.
- Full DJ sets are embedded from YouTube or SoundCloud.
- Camera originals stay in a private archive and are never committed.

See [docs/media-workflow.md](docs/media-workflow.md) for the full process.

## Licence

This isn't open source. All rights reserved. Third-party attribution is in [LICENSES.md](LICENSES.md).
