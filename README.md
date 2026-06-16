# Kava & Pyramids Website

Official website project for Kava & Pyramids.

## Architecture

- `frontend/`: Vite and React website deployed to Vercel
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

## Media

- Small optimized launch assets: `frontend/public/media/`
- Growing photo galleries and short clips: Supabase Storage
- Full DJ sets: YouTube or Vimeo embeds
- Camera originals: private OneDrive archive, never Git

See `docs/media-workflow.md` for the recommended process.
