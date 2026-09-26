# Kava & Pyramids — Official Website

Official site for **Kava & Pyramids**, a DJ duo based in Christchurch, New Zealand.
A React SPA on a Supabase backend, deployed on Netlify.

**Live:** https://kavapyramids.com
**Current release:** v5.23.0 — see [CHANGELOG.md](CHANGELOG.md)

---

## What's on the site

| Route | What it is |
| --- | --- |
| `/` | Home — hero reel, bio, events (upcoming/past), mixes, watch carousel, social feeds, booking form |
| `/media-hub` | Event photo galleries behind a soft email gate, plus **Crowd POV** attendee photo submissions |
| `/epk` | Electronic press kit — bio, genres, venues, press photos, downloadable PDF |
| `/privacy-policy` | Privacy policy, including how photo submissions are handled |
| `/login` | Admin sign-in (Supabase Auth) |
| `/admin` | Admin dashboard — events, galleries, photo uploads, trusted venues, mailing list, Crowd POV review |

Everything under `/admin` is gated by `ProtectedRoute`, which checks for an
active Supabase session *and* calls the `am_i_admin()` RPC. Being signed in is
not enough — the account has to be on the admins allowlist.

### Crowd POV

Event attendees can submit their own photos, which appear on the site only after
an admin approves them. Submissions are re-encoded in the browser before upload:
that strips EXIF (phone photos carry GPS coordinates), converts HEIC to JPEG, and
caps the longest edge at 2000px. Pending submissions land in a private bucket;
only approved photos move to the public one. Any visitor can report a published
photo, which hides it immediately — reversibly — pending admin review.

---

## Stack

- **Frontend** — React 19, Vite 8, React Router 7, Framer Motion, Lucide icons. No CSS framework; hand-written CSS in `frontend/src/styles/`.
- **Backend** — Supabase: Postgres with Row Level Security, Auth, Storage, Edge Functions, `pg_cron`.
- **Hosting** — Netlify, configured entirely by the root `netlify.toml`.

There is no custom server. Every write from the browser goes straight to Supabase
and is authorised by RLS policies rather than by application code — so the
migrations in `supabase/migrations/` are the real security boundary, and are
worth reading before changing anything data-related.

---

## Layout

```
frontend/          Vite + React SPA — the whole site
  src/
    pages/         One file per route
    components/    Shared UI + the Admin* dashboard panels
    hooks/         useCombinedGalleries, useEventGalleries
    lib/           Supabase client, admin check, image processing, motion presets
    data/          siteData.js — static copy (genres, venues, socials, timeline)
    styles/        Hand-written CSS
  public/          Favicon, EPK PDF, hero video, gallery placeholders, robots/sitemap
supabase/
  migrations/      Numbered SQL migrations — schema, RLS, storage policies, cron
  functions/       Edge Functions (humanitix-sync, crowd-pov-cleanup)
docs/              Design and behaviour notes for specific sections
netlify.toml       Build config, SPA fallback, security headers
CHANGELOG.md       Release history, newest first
LICENSES.md        Third-party licence attribution (heic-to, LGPL-3.0)
```

---

## Local development

From `frontend/`:

```bash
npm install
npm run dev
```

On Windows/PowerShell use `npm.cmd` — the execution policy on this machine
blocks `npm.ps1`.

Other scripts:

```bash
npm run lint
npm run build
npm run preview
```

### Environment variables

The Supabase URL and anon key have committed fallbacks in
`frontend/src/lib/supabase.js`, so the app runs without a `.env` file. That is
deliberate: the anon key is a *publishable* key that ships in the browser bundle
either way, and RLS is what actually protects the data. Env vars still take
precedence when set, so a deployment can point at a different project.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `VITE_YOUTUBE_API_KEY` | Read-only, HTTP-referrer-restricted, for the Watch carousel |

Server-side secrets (`HUMANITIX_API_KEY`, `SITE_URL`, the Crowd POV cleanup
token) live in Supabase Edge Function secrets and Vault. None of them belong in
this repo or in a `VITE_` variable — anything prefixed `VITE_` is inlined into
the public bundle.

---

## Database

Migrations are numbered and applied in order. They are the source of truth for
schema, RLS policies, storage bucket rules, and scheduled jobs.

Key tables: `events`, `media_assets`, `mixes`, `stats`, `trusted_venues`,
`enquiries`, `mailing_list`, `media_downloads`, `crowd_submissions`,
`crowd_photos`, `crowd_photo_reports`.

Storage buckets: `event-photos` and `crowd-pov` (public), `crowd-pov-pending`
(private — submissions awaiting review).

Two Edge Functions:

- **`humanitix-sync`** — pulls ticketed events from Humanitix. CORS is restricted by `SITE_URL` / `ALLOWED_ORIGINS`.
- **`crowd-pov-cleanup`** — hourly `pg_cron` sweep that deletes orphaned files from `crowd-pov-pending`. Authenticated with a shared token generated inside Postgres and held in Vault.

---

## Deploying

Netlify builds from `main`. The root `netlify.toml` sets base `frontend`, build
`npm run build`, publish `dist`, plus SPA fallback and security headers — no
manual dashboard overrides needed.

Release flow:

1. Work on `develop`, using conventional commits.
2. Add a `CHANGELOG.md` entry (newest first).
3. Tag `vX.Y.Z`.
4. `git merge --no-ff develop` into `main`, then push `main` — Netlify deploys on push.

### Custom domain

`kavapyramids.com` appears in `frontend/index.html` (`og:url`),
`frontend/public/robots.txt`, and `frontend/public/sitemap.xml`, but is **not
registered yet** — those URLs currently point at a domain that does not resolve.
The `humanitix-sync` CORS allowlist already includes it so attaching it later
works without a code change. When the domain goes live, update those three files
and set `SITE_URL` in the Supabase Edge Function secrets.

---

## Media

- Small optimised launch assets → `frontend/public/media/`
- Event photo galleries and short clips → Supabase Storage
- Full DJ sets → YouTube / SoundCloud embeds
- Camera originals → private archive, never committed

See [docs/media-workflow.md](docs/media-workflow.md) for the full process.

---

## Licence

Not open source — all rights reserved. Third-party attribution is in
[LICENSES.md](LICENSES.md).
