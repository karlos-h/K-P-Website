# Changelog — Kava & Pyramids Website

All notable changes to this project are documented here.
Format: newest version first.

---

## v5.14.0 — Privacy Policy, social preview meta tags, favicon

### Added
- **Privacy Policy page** (`/privacy-policy`, `PrivacyPolicyPage.jsx`) — covers what's collected (booking enquiries, EPK requests, Media Hub gate, Humanitix ticket purchases), why, mailing list consent (Unsolicited Electronic Messages Act 2007), a named list of third parties in use (Supabase, Humanitix, Behold.so, SociableKit, YouTube, SoundCloud) with cookie caveat, Privacy Act 2020 access/correction rights, security, and an explicit "no analytics or ad-tracking scripts" statement. Linked from the footer on Home, EPK, and Media Hub
- **Open Graph / Twitter Card meta tags** in `index.html` — `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`. `og:image`/`twitter:image` point at `/og-image.jpg`, which doesn't exist yet — drop a real 1200×630px image at `frontend/public/og-image.jpg` before social link previews will show an image (until then, previews just show no image, not a broken one)
- **Favicon** (`frontend/public/favicon.svg`) — a simple gold-on-black "K&P" wordmark SVG, referenced via `<link rel="icon">`

### Notes
- `og:url` is currently a placeholder (`https://kavapyramids.com/`) — no production domain is referenced anywhere else in this repo, so this needs updating once the real live domain is confirmed (flagged with a `TODO` comment in `index.html`)

---

## v5.13.0 — Gallery link bug fixes, carousel overhang, editable event linking

### Fixed
- **Uploading photos to an existing gallery wiped the event name/date** — `AdminPhotoUpload.jsx`'s locked-gallery flow tried to re-derive the linked event by slugifying `title + date` (the free-text display date) and comparing it against `defaultSlug`, which is built from `title + sort_date` (the real ISO date) everywhere else. The two never matched, so the upload silently fell back to using the raw slug string as `event_name` and left `event_date` null. Fixed by passing the gallery's real `event_name`/`event_date` down directly from `AdminGalleryManager.jsx` instead of re-guessing it — repaired the 6 existing "North vs South" photos that had already been affected
- **Media Hub carousel overhung the page and wasn't centered** — a genuine CSS min-width bug: `.carousel__viewport` and `.event-carousel` didn't set `min-width: 0`, so their default `min-width: auto` let the auto-scroll strip's intrinsic `width: max-content` (~2000px, from the duplicated-thumbnail loop) push the whole card wider than its container instead of clipping. Added `min-width: 0` to both — cards now measured exactly matching their container width and are properly centered, confirmed at both mobile and desktop widths
- **"View Full Gallery" was a giant broken box** — when a gallery has both native photos and an external link, the button was rendering as a 200–260px tall image-preview box with a generic placeholder icon (a leftover cover-photo prop was never actually being passed). Redesigned: when native photos already exist, it's now a slim, full-width outlined button — the tall preview treatment is only used for external-only galleries with no native photos yet (as a 6-tile placeholder grid, unchanged from the previous update)

### Added
- **Editable "Linked Event" in the Gallery tab** — each gallery's detail view (when it has native photos) now shows a dropdown to reassign it to a different event; saving updates `event_slug`/`event_name`/`event_date` on every photo in that gallery to match. This only touches `media_assets` — the Events tab's own data is unaffected, but since both tabs read from the same underlying tables, a correct link keeps the two consistent

---

## v5.12.0 — Admin UX fixes: photo upload, dates, time picker, themed dropdowns

### Fixed
- **Photo upload file picker showed no selectable files** — the file input had `webkitdirectory=""` set unconditionally, which forces the OS dialog into folder-only selection mode (individual files appear greyed out/unselectable in that mode, and it's unsupported outside Chrome/Edge entirely). Removed it; the picker is now a standard multi-file image picker (select multiple files with Ctrl/Cmd-click, or Ctrl/Cmd+A for a whole folder)
- **Gallery tab dates showed only month/year** — both the gallery list and gallery detail header in `AdminGalleryManager.jsx` now show the full date (day, month, year)

### Changed
- **Performance Time is now a real time picker** — replaced the free-text "Performance Time" field with native "Start Time" / "End Time" `<input type="time">` pickers, matching the UX of the date picker. On save they're combined back into the same display string format used everywhere else (e.g. "9:00 PM – 11:00 PM"); editing an existing event parses that string back into the two time fields
- **Venue / City / Type dropdowns now match the site's theme** — native `<datalist>` autocomplete dropdowns are rendered by the OS/browser and can't be restyled with CSS. Replaced with a custom `Autocomplete` component (dark background, gold top border, gold hover highlight) that keeps the same "suggest values already used on other events, but still freely editable" behavior

### Removed
- Dead `useEffect` import in `AdminPhotoUpload.jsx` (pre-existing, unused)

---

## v5.11.0 — Media Hub placeholder grid, events sort fix, content cleanup

### Added
- **6-tile placeholder grid for external-only galleries** — events with only a Lightroom/external link (no native photos uploaded yet) now show a minimum 6-tile placeholder grid in the Media Hub, matching the look of a real photo grid instead of a single icon. Clicking any tile (or the CTA below) opens the external gallery
- **Date subtitle on every gallery card** — both native and external-only event cards now show the full date (e.g. "10 July 2026") as a subtitle beneath the title, instead of a small label above it
- **"Follow on SoundCloud" button** in the Listen section, matching the existing "Subscribe on YouTube" button in Watch
- **"Global Sounds"** added as a genre — appears everywhere `GENRES` is used (homepage Press section, EPK hero subtitle, EPK genre grid) plus the two places genres were hardcoded in copy (homepage Press paragraph, "Versatile Open Format Sets" booking feature)

### Fixed
- **Homepage upcoming events were sorted backwards** — `filteredEvents` inherited the shared events fetch's descending order, so the Upcoming tab showed the furthest-future event first instead of the soonest. Now explicitly sorts ascending (soonest first) for Upcoming and descending (most recent first) for Past

### Changed
- **Admin Mailing List** — the "Order ID" column is commented out (not deleted) in `AdminMailingList.jsx`, since it wasn't proving useful; easy to re-enable later. Table sort (most recent first) was already correct and required no change
- **Our Story section** — removed the "Kong Bar / Original Sin" residency boxes; the "The Beginning" (2018) timeline card no longer shows its dialogue-style description when clicked, while all other timeline entries are unaffected
- Removed unused dead code: a leftover `soundCloudEmbed`/`soundCloudProfile` placeholder in `siteData.js` from before mixes were wired to Supabase

### Notes (no code change — confirmed working as designed)
- **"Next Up"** is genuinely live-linked to Supabase — `pickNextEvent()` filters `events` where `status = "upcoming"` and picks the soonest by `sort_date`, so it updates automatically as events are added/edited in the admin dashboard
- **Homepage Gallery section** shows the most recently uploaded native photo gallery (`useEventGalleries`, native uploads only — not external links) when one exists, and falls back to the static placeholder images otherwise. It's editable via Admin Dashboard → Gallery/Photo Upload and updates automatically as photos are added

---

## v5.10.0 — Follow the Journey redesign, TikTok grid restyle

### Changed
- **"Follow the Journey" section restructured** — dropped the `@kava_pyramids` page title; each platform (Instagram, TikTok) now gets its own compact header row (icon + handle + "Follow on X" button) directly above its grid, replacing the old centered buttons below each feed. Section title simplified to "The Feed"
- **TikTok grid now matches the site's visual language** — the SociableKit widget ships its own header and a mismatched blue "Follow" button; that native header is now hidden (`.sk-posts-header { display: none }`) in favor of the shared custom header used by both platforms
- **TikTok post tiles restyled** — forced into a proper 6-column square grid (3 on mobile) matching the Instagram feed's layout, with the site's `--line` border, `.35rem` radius, and gold hover lift (`border-color` + `translateY`) instead of the widget's default look. Required overriding the widget's own `min-height: 300px` (which was fighting `aspect-ratio: 1` and stretching tiles) and its `.sk-post-image` sizing with `!important`, since the widget's stylesheet loads after ours with higher-specificity selectors
- `global.css` — added `.button--small`, `.platform-feed`, `.platform-feed__header`, `.platform-feed__handle`, and the `.tiktok-feed-frame .sk-*` override block

---

## v5.9.0 — TikTok feed & Trusted By venue logos
*Migration 017 applied via Supabase MCP*

### Fixed (post-release)
- `TikTokFeed.jsx` — corrected the widget container class from the guessed `sk-ww-tiktok-feed` to SociableKit's actual `sk-tiktok-feed`, and activated it with the real Embed ID (`25695197`) for `@kavaxpyramids`. Verified live: the widget renders real TikTok video content on the homepage.

### Added
- **`TikTokFeed.jsx`** — new component mirroring `SocialFeed.jsx`'s structure, using SociableKit's free TikTok feed widget (`sk-ww-tiktok-feed` div + `widgets.sociablekit.com/tiktok-feed/widget.js`) instead of Behold (Behold doesn't support TikTok). Shows the same placeholder-grid + setup-note pattern until a real Embed ID is added
- **"Follow the Journey" section** — now shows the TikTok feed and a "Follow on TikTok" button (linking to `@kavaxpyramids`) below the existing Instagram feed/button, same section
- **`logo_url` column** on `trusted_venues` (migration 017, nullable) — when set, the homepage "Trusted By" card renders this image in place of the initials badge; falls back to initials exactly as before when unset
- **Venues tab** in Admin Dashboard (`AdminTrustedVenues.jsx`) — full CRUD over `trusted_venues` (name, type, initials, website URL, logo URL, sort order), following the same inline add/edit/delete pattern as Events

### Changed
- `global.css` — added `.trusted-card__logo` (54px circular image, same footprint as the initials badge)

---

## v5.8.0 — Mailing List: Order ID column
*Migration 016 applied via Supabase MCP · humanitix-sync redeployed*

### Added
- **`order_id` column** on `mailing_list` (migration 016, nullable) — stores the source order/transaction ID for a contact
- **"Order ID" column** in the Mailing List admin tab — now the first column in the table, showing "—" for contacts without one (all manually-added contacts)
- `humanitix-sync` Edge Function now captures Humanitix's `order._id` and writes it to `order_id` on both insert and update, so every contact synced from Humanitix carries a traceable reference back to its original order

---

## v5.7.0 — Venue links, mix cleanup, EPK gig history fix
*Migration 015 applied via Supabase MCP*

### Added
- **`website_url` column** on `trusted_venues` (migration 015, nullable) — populated for all 7 current venues with their real official sites (Bar 185 links to its Facebook page, since it has no dedicated website)
- **Trusted By logos now link out** — each card in the homepage "Trusted By" section is a real link to the venue's website when set, opening in a new tab; unlinked venues still render as plain cards

### Changed
- **SoundCloud mixes** — removed 3 placeholder rows from `mixes` that all pointed at the same generic profile URL instead of a real track; the Listen section now shows exactly 3 real, distinct mixes (Sins Pyramix, Club Mix — Hip-Hop, Hip-Hop x R&B Set)
- **EPK page fix** — the Gig History section on `/epk` was missing the `gig-history` CSS class present on the homepage's equivalent section, so its grid/border/color rules never applied; the section rendered unstyled and misaligned. Added the class so it now matches the homepage's dark/gold layout exactly

---

## v5.6.0 — Mailing List Phase 2: manual Humanitix sync
*Migration 014 applied via Supabase MCP · first Edge Function deployed*

### Added
- **`humanitix_event_id` column** on `events` (migration 014, nullable) — only events with this set are eligible for syncing
- **"Humanitix Event ID" field** in the Admin Events form (`AdminEventsManager.jsx`), next to Ticket URL
- **`humanitix-sync` Edge Function** (`supabase/functions/humanitix-sync/index.ts`) — the project's first Edge Function
  - Manually triggered only — no webhook receiver, by design
  - Rejects anonymous invocation: verifies the caller's JWT via `auth.getUser()` before doing anything, since this touches a third-party API key and real PII
  - For every event with `humanitix_event_id` set, pages through `GET /v1/events/{eventId}/orders` on the real Humanitix Public API (`x-api-key` header, confirmed against their live OpenAPI spec) and upserts each order's buyer into `mailing_list`
  - **Unsubscribe safety**: if a matching email already exists and is unsubscribed, the row is left untouched and counted separately (`skipped_unsubscribed`) — a resync can never silently resubscribe or overwrite someone who opted out
  - New contacts also respect Humanitix's own `organiserMailListOptIn` flag from checkout, when present
  - Returns `{ events_checked, attendees_fetched, inserted, updated, skipped_unsubscribed, errors }`
  - Requires the `HUMANITIX_API_KEY` secret to be set on the project (`supabase secrets set HUMANITIX_API_KEY=...` or via the dashboard) — the function reads it at runtime and never has it hardcoded
- **"Sync Now" button** in `AdminMailingList.jsx` — invokes the function, shows a loading state, displays the returned summary (or a clear error), and refreshes the visible table on success

### Changed
- `AdminDashboard.jsx` — events fetch switched from a partial column list to `select('*')`, fixing a pre-existing gap where the edit form couldn't see `ticket_url`/gallery fields on existing events, and now also picking up `humanitix_event_id`

### Notes
- **This completes Phase 2 as a manual pull sync, not a webhook.** Nothing runs automatically — an admin must click "Sync Now". Before it will do anything, `HUMANITIX_API_KEY` must be set as an Edge Function secret; without it the function returns a clear 500 error rather than failing silently.

---

## v5.5.0 — Mailing List tab (Phase 1: manual entry)
*Migration 013 applied via Supabase MCP*

### Added
- **`mailing_list` table** (migration 013) — `first_name`, `last_name`, `email`, `source` (`'manual'` | `'humanitix'`, defaults to `'manual'`), `event_title` (nullable), `subscribed` (bool, default true), `notes`, `created_at`. Unique index on `lower(email)` to prevent duplicate contacts. RLS enabled with a single authenticated-admin-only policy — no public read/write path, unlike enquiries or media_downloads
- **Mailing List tab** in Admin Dashboard (`AdminMailingList.jsx`) — table + inline add/edit form + delete confirmation, matching the `AdminEventsManager.jsx` structural pattern
  - Search box filters by name or email (client-side)
  - "Subscribed only" toggle
  - "Export CSV" button downloads the currently-filtered rows (first_name, last_name, email) — plain client-side generation, no new dependency
  - Delete confirmation copy nudges toward unsubscribing (toggle Subscribed off) instead of deleting, since it preserves the record, but still permits a real delete

### Notes
- **This is Phase 1 — manual entry only.** Phase 2 (syncing attendee sign-ups in automatically from Humanitix via a server-side integration) is planned separately and out of scope for this pass. The schema already accounts for it: `source` accepts `'humanitix'` and `event_title` is nullable, so Phase 2 can insert rows without any migration.

---

## v5.4.0 — Admin UX overhaul, performance time, gig history rework
*Migration 012 applied via Supabase MCP*

### Added
- **`performance_time` column** on `events` (migration 012) — free-text set time, e.g. "9:00 PM – 11:00 PM"
- **Performance Time field** in Admin Events form, shown as a new "Time" column in the admin table and on the public event cards
- **City column** now visible in the admin Events table alongside Venue (previously only shown in the edit form)
- **Autocomplete dropdowns** (native `<datalist>`, still freely editable) for Venue, City, Performance Time, and Type fields in the Admin Events form — populated from distinct values already used across existing events, so repeat entries (e.g. "Christchurch, New Zealand", "Mud Bar", "Festival") are one click instead of retyping
- **Gig History section rewritten** — now three country columns (New Zealand, Australia, Fiji) each listing the cities played, replacing the old inaccurate region/venue list. Data lives in `VENUES` in `siteData.js`

### Changed
- **Admin Events tab — inline edit/delete** — clicking Edit or Delete no longer jumps to a form at the top of the page; the row expands in place with the edit form (or delete confirmation) directly beneath it, so no scrolling is needed
- **"Sort Date" field removed** — replaced by a single "Performance Date" field. Status (upcoming/past) is now automatically derived from whether that date is in the past, rather than requiring a manual status dropdown + separate sort date
- **Admin dashboard typography** — base text bumped to 14px (from ~13px), section/form headings to 16–18px, for readability
- `AdminGalleryManager.jsx` now uses `useCombinedGalleries` instead of `useEventGalleries` — events with only an external (Lightroom) gallery link now appear in the Gallery tab, showing the link and photographer credit even with zero uploaded photos
- `EventCarousel.jsx` external gallery preview — since Lightroom blocks iframe embedding, the "full grid" embed was replaced with a single cover photo (or placeholder) with a "View Full Gallery" overlay button linking out

---

## v5.3.0 — External photographer gallery support
*Migration 011 applied via Supabase MCP*

### Added
- **External gallery per event** — four new columns on `events` (migration 011): `photo_gallery_url`, `photo_gallery_embeddable`, `photographer_name`, `photographer_url`
- **Admin Events form** — collapsible "Photographer / External Gallery" section (collapsed by default; auto-opens when fields are set on edit). Fields: Gallery URL, embed checkbox (with warning that most platforms block iframes), Photographer name, Photographer portfolio URL
- **`useCombinedGalleries.js`** hook — merges native `media_assets` groups with events rows that have a `photo_gallery_url`; events with both get their native group enriched; events with only an external gallery produce a synthetic group
- **`EventCarousel.jsx`** updated — three render paths:
  1. Native photos only — unchanged behaviour
  2. Native photos + external gallery URL — carousel as normal, plus "Photography by [Name]" credit + optional iframe embed (only when `photo_gallery_embeddable = true`) + always-visible "View Full Gallery →" link-out button
  3. External gallery only (no native photos) — compact card with placeholder cover, event name/date, photographer credit, and "View Full Gallery →" link-out

### Changed
- `AdminEventsManager.jsx` — `BLANK` constant + `handleSave` payload include all four new gallery fields
- `global.css` — added `.carousel__external`, `.carousel__photographer-credit`, `.carousel__external-embed`, `.carousel__external-link`, `.event-carousel--external-only` styles

---

## v5.2.0 — Ticket links, events sort fix, scrollable past highlights
*Migration 010 applied via Supabase MCP*

### Added
- **Ticket URL per event** — `ticket_url` column added to `events` (migration 010)
  - Admin Events form has a full-width "Ticket URL" field at the bottom of add/edit form
  - When set, a gold "Buy Tickets" button appears inline next to the type pill on the event card, opening in a new tab
  - Events without a ticket URL show no button — no visual change for free/unlinked events

### Changed
- **Past Highlights** — fixed-height scrollable box (max ~3 cards visible), thin gold scrollbar; page height no longer grows with 45+ past events
- **Events sort order** — homepage and admin dashboard both now sort most-recent first (sort_date descending, nulls last); upcoming events always float to the top in admin
- **Migration 010** (`010_events_ticket_url.sql`) — adds `ticket_url text` (nullable) to `events`

---

## v5.1.0 — Performance history import & city column
*Database: migration 009 applied directly via Supabase MCP*

### Added
- **Migration 009** (`009_events_city_column.sql`) — adds `city text` column to `events`; `location` repurposed going forward to hold venue name only
- **40 performance history rows** imported into `events` from `KP_Performance_List.xlsx`
  - Filter: 2026 rows (all cities) + 2025 rows outside Christchurch
  - Excluded: 2 "Unknown (cash deposit)" rows, 39 Christchurch 2025 rows
  - Skipped as duplicate: Wonderland Brisbane (already in DB)
  - Crown Club/Empire 2025-09-26 (blank city in spreadsheet) — confirmed Auckland by user, imported as `Auckland, New Zealand`

### Changed
- `events` table: `location` now holds venue name; `city` holds resolved "City, Country" label
- All imported rows have proper `sort_date` (real date), `city`, and `location` values

### Removed
- "Auckland Shows" (2025) legacy row — superseded by specific Auckland performances (Flairhouse, Paroa Bar, Crown Club/Empire ×2, Thursday Bar)
- "Dunedin Shows" (2025) legacy row — superseded by specific Brew Bar (Dunedin) row

### Final DB state
- **46 total events** (was 8 before import)
- **1 upcoming** — Takeover Volume 1 at Mud Bar, 10 July 2026
- **45 past**

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
