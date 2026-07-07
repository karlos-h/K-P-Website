# Kava & Pyramids Website

Official website project for Kava & Pyramids.

## Architecture

- `frontend/`: Vite and React website (deploy to Netlify or Vercel)
- `supabase/`: future database migrations and storage configuration
- `docs/`: project and content workflows
- `update 0.rtf`: original project brief
- `indexV1.html`: archived Claude output; despite its name, it contains JSX

Supabase is the backend service for booking submissions, gallery metadata, and
managed media. A separate custom backend is unnecessary at this stage.

## Local Development

From `frontend/`:

```powershell
npm.cmd install
npm.cmd run dev
```

On this Windows machine, use `npm.cmd` because PowerShell currently blocks the
`npm.ps1` script.

Copy `.env.example` to `.env.local` when Supabase is connected.

## Deploy to Netlify

This repo includes a root `netlify.toml` that points Netlify at the `frontend/`
folder, sets SPA redirects, and applies security headers.

1. Connect the Git repo in the [Netlify dashboard](https://app.netlify.com/).
2. Netlify should auto-detect the settings from `netlify.toml` (base: `frontend`,
   build: `npm run build`, publish: `dist`). No manual overrides needed.
3. Under **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
4. Deploy. After the first deploy, note your live URL (e.g.
   `https://your-site.netlify.app`).
5. In **Supabase Dashboard → Edge Functions → Secrets**, set:
   - `SITE_URL` = your Netlify URL (no trailing slash), so Humanitix sync CORS
     works from production
   - `HUMANITIX_API_KEY` — if not already set
6. When you add a custom domain later, update `SITE_URL` (or set
   `ALLOWED_ORIGINS` as a comma-separated list) and update the placeholder URLs
   in `frontend/public/robots.txt`, `frontend/public/sitemap.xml`, and
   `frontend/index.html`.

**Netlify vs Vercel:** both work well for this stack (static Vite SPA + Supabase).
Netlify is a solid choice — the main requirement is setting the env vars above
and keeping `SITE_URL` in sync with wherever the site is actually hosted.

## Media

- Small optimized launch assets: `frontend/public/media/`
- Growing photo galleries and short clips: Supabase Storage
- Full DJ sets: YouTube or Vimeo embeds
- Camera originals: private OneDrive archive, never Git

See `docs/media-workflow.md` for the recommended process.
