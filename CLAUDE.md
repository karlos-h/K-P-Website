# Kava & Pyramids Portfolio Site

React SPA + Supabase backend for kavapyramids.com, a DJ duo's site (booking, EPK, media hub, admin dashboard).

## Stack

- Frontend: React 19, Vite 8, React Router 7, Framer Motion, Lucide icons, hand-written CSS (no framework)
- Backend: Supabase (Postgres + RLS, Auth, Storage, Edge Functions, pg_cron)
- Hosting: Netlify, driven entirely by root `netlify.toml`

## Commands (run from `frontend/`; use `npm.cmd` on Windows — PowerShell blocks `npm.ps1`)

```bash
npm install
npm run dev       # vite dev server
npm run build     # vite build
npm run preview   # preview production build
npm run lint      # eslint .
```

## Layout

- `frontend/src/pages/` — one file per route
- `frontend/src/components/` — shared UI + Admin* dashboard panels
- `frontend/src/hooks/`, `frontend/src/lib/` — data hooks, Supabase client/admin check/image processing
- `frontend/src/data/siteData.js` — static copy (genres, venues, socials, timeline)
- `supabase/migrations/` — numbered SQL migrations (schema, RLS, storage, cron) — the real security boundary
- `supabase/functions/` — Edge Functions
- `docs/` — design/behaviour notes for specific sections

## Data / backend

Key tables: `events`, `media_assets`, `mixes`, `stats`, `trusted_venues`, `enquiries`,
`mailing_list`, `media_downloads`, `crowd_submissions`, `crowd_photos`, `crowd_photo_reports`.
Storage buckets: `event-photos`, `crowd-pov` (public), `crowd-pov-pending` (private).
Edge functions: `humanitix-sync`, `crowd-pov-cleanup`, `enquiry-notify`.
All browser writes go straight to Supabase, authorised by RLS — not app code.

Env vars (see `frontend/.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_YOUTUBE_API_KEY`.
Supabase URL/anon key have committed fallbacks in `lib/supabase.js`; env vars only override.
Server-side secrets (Humanitix key, cleanup token) live in Supabase Edge Function secrets/Vault, never here.

Events on the site are rows in `events`, so adding one needs no code change or deploy; pg_cron flips `upcoming` to `past` after `sort_date`.
Listing rules: a set that starts after midnight uses the after-midnight date. Don't list private gigs or Bar 185 nights, and don't backfill 2025 gigs.

## Deploy

Netlify builds from `main`: base `frontend`, `npm run build`, publish `dist`, SPA fallback + security headers.
Release flow: work on `develop` (conventional commits) → CHANGELOG.md entry (newest first) → tag `vX.Y.Z`
→ `git merge --no-ff develop` into `main` → push `main` (Netlify deploys on push).

## Conventions

- ESLint (`eslint.config.js`, React + react-hooks + react-refresh rules) — run `npm run lint` before committing.
- A CHANGELOG.md entry is expected per release.

## Don't

- Never commit `.env` / `.env.local`.
- Never run Supabase migrations or deploys against production without Karlos's OK.
- Never put server-side secrets in a `VITE_`-prefixed env var — it ships in the public bundle.
- Keep this file short — expand `docs/` instead of growing this file.
