# Changelog — Kava & Pyramids Website

All notable changes to this project are documented here.
Format: newest version first.

---

## v5.0.1 — Gallery upload fix

### Fixed
- `AdminPhotoUpload.jsx` — the "Add more photos to this gallery" upload button (used from Gallery Manager) stayed permanently disabled for any gallery whose photos were tagged to an event name/date with no matching row in the `events` table (e.g. an event never added there, or later deleted). `upload()` already handled this case correctly via `defaultSlug`; the button's `canUpload` check didn't, so it silently blocked the feature. Fixed by including `defaultSlug` in the enabled check.

---

## v5.0.0 — Admin Dashboard Expansion
*Commit: c994d8a*

### Added
- **Events Manager tab** in Admin Dashboard — full CRUD over the live events table
  - Add / edit / delete events without opening Supabase
  - Form fields: title, free-text display date, sort_date (real date picker), location, type, status
  - Confirmation dialog before delete (table drives live homepage content)
  - Warning badge + red row highlight for any `upcoming` event whose `sort_date` has already passed — prevents the "Wonderland Brisbane sat as upcoming for weeks" problem from recurring
- **Gallery Manager tab** in Admin Dashboard
  - Lists all event photo galleries with cover thumbnail, name, date, photo count
  - Click into a gallery to see every photo in a grid
  - Per-photo delete button — removes both the Storage file and the database row
  - Per-photo ☆ Cover button — sets that photo as the carousel header, clears others in the group
  - Inline "Add more photos" section (AdminPhotoUpload pre-locked to that gallery's slug)
- **AdminEventsManager.jsx** — standalone events CRUD component
- **AdminGalleryManager.jsx** — standalone gallery management component
- **Migration 008** (`008_events_sort_date.sql`) — adds `sort_date date` column to `events` table; best-effort backfill for existing rows

### Changed
- `AdminDashboard.jsx` — now has four tabs: Enquiries, Events, Gallery, Photo Upload
- `AdminPhotoUpload.jsx` — accepts `defaultSlug` prop; hides event picker when locked to a specific gallery
- `useEventGalleries.js` — now exports `refetch()` so gallery manager can reload after mutations
- `HomePage.jsx` `pickNextEvent()` — now prefers `sort_date` when present, falls back to parsing `date` text only when `sort_date` is null

---

## v4.0.0 — Media Hub, Event Photo Gallery System & Instagram Feed
*Commit: c994d8a (earlier staged changes)*

### Added
- **Event photo carousel system** — photos grouped by event, shown as auto-scrolling carousels
  - `EventCarousel.jsx` — RAF-based auto-scroll strip, pauses on hover, seamless loop, click-to-expand full-screen grid, lightbox with keyboard nav
  - `useEventGalleries.js` hook — groups `media_assets` by `event_slug`, sorts newest-first, resolves cover photo
- **AdminPhotoUpload.jsx** — admin photo upload flow
  - Link to existing event or create new one
  - Folder / multi-file picker (`webkitdirectory`)
  - Per-file progress bars, cover photo selector
  - Uploads to `event-photos` Storage bucket under `{event-slug}/`, bulk-inserts `media_assets` rows
- **Behold Instagram feed** activated — `SocialFeed.jsx` wired with feed ID `tctbMGAsCjR25mkXr9OR`
- **Photo Upload tab** added to Admin Dashboard

### Changed
- `HomePage.jsx` gallery section — shows most recent `EventCarousel` when Supabase has data, falls back to static `MediaGallery`
- `MediaHubPage.jsx` — flat photo grid replaced with stacked `EventCarousel` components (one per event, newest first), behind existing email gate
- `global.css` — added `.event-carousel`, `.carousel__*`, `.ec-lightbox` styles

---

## v3.2.0 — Media Hub prep & schema migrations
*Commit: 0b8d6b5*

### Added
- **Migration 006** (`006_event_gallery_schema.sql`) — alters `media_assets.event_date` to real `date` type, adds `event_slug` column with index, adds `is_cover boolean`, drops unused `gallery` table
- **Migration 007** (`007_event_photos_storage.sql`) — creates `event-photos` Storage bucket (public read, authenticated write)

---

## v3.1.1 — Cinematic polish pass
*Commit: 2b35d66*

### Changed
- Brand facts and dynamic events data updated in `siteData.js`
- Framer Motion animations applied across HomePage, EpkPage, YouTubeGrid
- Various visual fixes and refinements

---

## v3.1.0 — Line ending normalisation
*Commit: cf10424*

### Fixed
- Normalised CRLF → LF line endings in `ProtectedRoute.jsx`, `AdminDashboard.jsx`, `HomePage.jsx`, `LoginPage.jsx`

---

## v3.0.0 — Phase 2: Media Hub, EPK, YouTube, Linktree
*Commits: df81b71, 5075828*

### Added
- **Media Hub page** (`/media-hub`) — email-gated photo gallery
  - Soft email capture gate — email stored in `media_downloads` table and `localStorage`
  - Category filter tabs, photo grid, fullscreen lightbox with keyboard navigation
  - Download tracking — inserts `{email, photo_id, event_name, downloaded_at}` to `media_downloads`
- **EPK page** (`/epk`) — full electronic press kit
  - Bio, genres (main + edge), residencies, timeline, gig history, booking features
  - `EpkDownloadModal` — collects name, email, venue → inserts to `epk_downloads` → triggers PDF download
- **YouTube grid** (`YouTubeGrid.jsx`) — 3-column video grid, thumbnail auto-loads from YouTube CDN, click-to-play inline
- **Instagram feed placeholder** (`SocialFeed.jsx`) — Behold.so widget integration (Feed ID configurable)
- **Linktree integration** — `LINKTREE_URL` added to `siteData.js`, linked in footer
- **Navigation** updated — added Media Hub and EPK as external nav links
- **Supabase migrations** 001–005 — all core tables with RLS, seed data, events title column fix
- **Admin Dashboard** — Photo Upload tab, events list fetched for upload picker

### Changed
- `HomePage.jsx` — Videos section, Social Feed section, Media Hub CTA card below gallery, footer social links row
- `global.css` — email gate, lightbox, media hub grid, gallery filter, EPK page, YouTube grid, social feed, modal styles

### Fixed
- Database inconsistencies: duplicate seed data truncated and re-inserted cleanly
- RLS policy conflicts: `002_row_level_security.sql` rewritten with `DROP POLICY IF EXISTS` guards
- Events table column name: `name` → `title` corrected in seed data and frontend
- Hero video/image/EPK PDF double-extension filenames stripped

---

## v2.0.0 — Admin Dashboard & Authentication
*Commit: 81cc2da*

### Added
- **Login page** (`/login`) — Supabase email/password auth
- **Admin Dashboard** (`/admin`) — protected route, enquiries table with status management (new / reviewed / booked)
- **ProtectedRoute** component — redirects unauthenticated users to `/login`

---

## v1.0.0 — Initial Launch
*Commit: 20f83a4*

### Added
- Full dark-luxury landing site for Kava & Pyramids DJ duo
- Hero section with background video and fallback image
- About / bio section with timeline
- Events section — upcoming and past, pulled from Supabase
- Stats bar — animated counters
- Trusted venues / press logos
- Contact / booking enquiry form — inserts to `enquiries` table
- Footer with social links
- Responsive layout, Playfair Display + Inter typography
- CSS custom properties: `--gold`, `--black`, `--panel`, `--cream`, `--muted`, `--line`
- Framer Motion animations throughout (`revealProps`, `sceneProps`, `hoverLift`, `useReducedMotion`)
- Supabase backend — auth, database, storage, RLS policies
