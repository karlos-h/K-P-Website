# Changelog — Kava & Pyramids Website

All notable changes to this project are documented here.
Format: newest version first.

---

## v5.30.1 — Public contact form: iOS zoom fix

### Fixed
- **Tapping any field in the public contact/booking form zoomed the page on iOS Safari.** Same root cause as the login page in v5.29.0: `.contact input, .contact textarea` was `.9rem` (14.4px), under the 16px threshold at which Safari zooms to fit a focused field. The base rule is now `1rem`, which fixes all five visible fields (name, company, event type, email, message) plus the honeypot in one line
- Not gated behind a mobile breakpoint, for the same reason as the login fix: the zoom trigger isn't width-gated, so a landscape phone or tablet sits above any sensible breakpoint and would still zoom

### Removed
- `.login-card .contact input { font-size: 1rem; }` — the scoped override added in v5.29.0. The base rule now produces the same 16px, so the override was dead weight. Verified `/login` still renders both inputs at 16px from the base rule alone before deleting it

### Notes
- **Correction to the v5.30.0 and v5.29.0 entries.** Both said the Media Hub email gate shared this bug. It does not, and this was checked rather than assumed: `.email-gate__field input` has been `font-size: 1rem` all along, and the gate does not use the `.contact` class at all, so neither the old rule nor the new one has ever applied to it. Confirmed in the browser at `/media-hub` — the live input computes to 16px and nothing about that component changed here
- Desktop appearance of the contact form changes slightly, as accepted: fields go 14.4px → 16px, which makes the contact section 14px taller (868px → 882px at 1280px). The two-column `.form-grid` is unaffected and still collapses to one column at ≤900px
- `/login` is unchanged — card still 343×500 at 375px with the same `2.25rem 1.5rem` padding

---

## v5.30.0 — Admin dashboard: mobile optimisation across all 7 tabs

### Added
- **`frontend/src/hooks/useIsMobile.js`** — a `matchMedia` hook at the site's existing 640px breakpoint. None of the eight admin files use a single CSS `className`; every style is a local inline `style={{}}` object (`s.*`, `t.*`, `g.*`, `rs.*`, `c.*`), which no `@media` rule in `global.css` can reach. The hook is how a breakpoint gets into those objects at all. The one pre-existing exception, `.admin-tab-btn`, stays in CSS
- **Stacked mobile cards replace all four admin tables** (Enquiries, Events, Mailing List, Trusted Venues) below 640px. Each was already inside an `overflowX: auto` wrapper, so nothing *broke* — but every one of them put its only controls (a status `<select>`, or Edit/Delete) in the last of 7–8 columns, so using them meant scrolling the full table width sideways first. Cards carry labelled field/value pairs with the actions at the bottom. The `<table>` markup is untouched and still renders above the breakpoint
- Inline edit and delete-confirm work inside the cards on all three tables that have them. Editing is parent state with the row as a pure view, so the card is a second layout over the same state — no persistence logic moved

### Fixed
- **The tab row could strand four of the seven tabs.** `s.tabRow` was a plain `display: flex` with no wrap and no scroll: the seven tabs measure 861px against a 375px viewport, so Crowd POV, Mailing List and Venues had no way to be reached. It is now a horizontally scrollable strip (`.admin-tab-row` carries only the scrollbar-hiding pseudo-element; the layout stays inline)
- `.admin-tab-btn` gains `min-height: 44px` and `white-space: nowrap` at all widths — it was ~29px tall, and the labels would otherwise break mid-phrase inside the scrolling strip
- **Every interactive control in the admin area now has a ≥44px touch target on mobile** and **no text-entry field renders under 16px**, the threshold below which iOS Safari zooms the page on focus. Both were swept by measuring the live DOM, not by reading selectors — see Notes
- Topbar drops to `1rem` padding and hides the user email (the only item there identifying nothing actionable); "View Site" and "Log Out" both reach 44px
- Stats row becomes 2×2 instead of a squeezed 4-across
- Gallery: photo grid is a fixed 2 columns; Cover/Delete tiles reach 44px and are spaced apart (Delete sat immediately beside Cover at ~20px tall — a real mis-tap risk); tile label font goes 0.62rem → 0.75rem **at all widths**, since 9.9px was near-unreadable on desktop too
- Gallery relink row stacks vertically on mobile. `minWidth: 0` on the select is load-bearing there: a `<select>`'s min-content width is its longest option, and the event titles pushed the whole column 24px past the card edge
- Crowd POV: Approve/Reject and both destructive-confirm dialogs reach 44px with wider separation between the confirm and cancel actions
- Photo Upload: new-event fields stack to one column; Upload, Cover and the two mode toggles all reach 44px

### Notes
- Verified by mounting the real dashboard behind a temporary harness route with the Supabase singleton stubbed, then measuring the live DOM at 375px across all 7 tabs plus every add form, edit state, delete confirmation and the gallery detail view. The harness and its route were removed afterwards; `App.jsx` is unchanged
- That sweep caught six touch targets the per-file specs had not listed: "View Site", "+ Add Event", the Events form's own Save/Cancel, Photo Upload's two mode toggles, and Gallery's "Save Link". All fixed
- **Desktop is provably unchanged.** Every mobile value is a separate `*Mobile` sibling entry spread conditionally (`...(isMobile ? t.xMobile : {})`), so with `isMobile === false` each spread is `{}`. Confirmed by loading at 1280px: table present, 4-column stats, `0 32px` topbar padding, `minHeight: auto`, 11.52px status select. The two deliberate exceptions are the gallery tile font above and `.admin-tab-btn`'s 44px floor
- **Not verified: reflow on live rotation.** The preview pane's viewport emulation dispatches neither `resize` nor `matchMedia` `change` events (both counters stayed at 0 across a resize), so no listener-based approach is exercisable there. Each width was verified by fresh load instead. Real browsers fire both, so rotation should reflow — but it is worth a spin on an actual phone
- `AdminPhotoUpload`'s file input deliberately has no `capture` attribute, now recorded in a code comment: this screen is for bulk-uploading a photographer's existing shots, and `capture` would drop the photo-library option and force the camera
- Venue sort-order arrows were considered and skipped: `sort_order` only reaches the DB through the full-row save, so arrows would mean touching the persistence path — a feature change, not a responsiveness fix. Sort order is still editable via the (now non-zooming) number input
- Left as-is, flagged: `mailto:` and venue-website links inside cards are 16–38px tall. They are field *values* rather than action buttons, and padding them to 44px would put visible gaps through the card rows. Easy to change if the smaller target proves annoying in practice
- Out of scope, for later: `CrowdPovModal.jsx` — the public-facing photo-submission form — has its own mobile issues (a sub-32px close button, sub-16px inputs, no scroll-into-view when the keyboard opens). Public-facing, so not touched here

---

## v5.29.0 — Admin login page: mobile fixes

### Fixed
- **Tapping the email or password field zoomed the whole page on iOS Safari.** This was the root cause of the "page is zoomed in, scrolling feels unnatural" report — not a viewport or scroll bug. Safari zooms the page to fit any focused input rendering under 16px, and both fields inherited `.contact input`'s `.9rem` (14.4px). A `.login-card .contact input { font-size: 1rem }` override lifts them to exactly the threshold. Scoped to the card rather than changing `.contact input`, because that class is shared with the public contact/booking form on the home page
- **`min-height: 100vh` didn't track the visible viewport.** `100vh` is the height with mobile browser chrome *expanded*, so the centred card sat slightly low and shifted as the address bar collapsed on scroll. `100dvh` now follows the real visible area, declared after the `100vh` so browsers without `dvh` keep the old value

### Added
- **A `@media (max-width: 480px)` block for the login card** — the only page-level card pattern in `global.css` that had none, so a 375px phone was rendering the full desktop `3rem 2.5rem` inset. Page padding drops to `1rem` and card padding to `2.25rem 1.5rem`, matching the breakpoint the Media Hub email gate already uses
- **Autofill and mobile-keyboard attributes on both inputs** (`LoginPage.jsx`). Email gets `autoComplete="username"` — `"email"` reads as a newsletter signup to most password managers; `"username"` paired with the password field's `current-password` is what makes iOS Keychain, Chrome, and 1Password offer a saved login. Email also gets `autoCapitalize="none"`, `autoCorrect="off"`, and `spellCheck="false"`, so a mobile keyboard stops capitalising the first character of an address

### Notes
- Verified in the preview browser at 320 / 375 / 768 / 1280: no horizontal overflow at any width, card stays vertically centred, and the ≥481px rendering is byte-identical to before
- **One intentional desktop delta:** the login inputs now render at 16px instead of 14.4px, which makes the card 6px taller (3px per field). The iOS zoom trigger is not width-gated — a landscape phone or an iPad in split view is well over 480px and still zooms — so gating the override behind a breakpoint would have left the bug live on tablets. The 6px was the cheaper trade
- Confirmed in-browser that the public contact form is untouched: all six of its fields still compute to 14.4px
- Out of scope, worth a follow-up: that public contact form and the Media Hub email gate have the same sub-16px inputs and will zoom on iOS the same way. Also untouched is any mobile work on `AdminDashboard.jsx` — the tab row and enquiries table are a separate, larger piece
- No "forgot password" flow was added; that decision hasn't been made yet

---

## v5.28.0 — Listen: working SoundCloud players and a carousel

### Fixed
- **Every SoundCloud embed on the home page was blank.** The `mixes.embed_url` column holds plain `soundcloud.com` track links — the thing you get from the browser address bar — and a track page answers with `x-frame-options: SAMEORIGIN`, so pointing an `<iframe src>` at one can never render regardless of which track it names. `toSoundCloudEmbedSrc()` in `MusicCarousel.jsx` now wraps whatever is in the column into SoundCloud's real player endpoint (`w.soundcloud.com/player/?url=…`, which sends no framing headers), carrying the site gold as the player colour. Fixed in code rather than by reformatting the rows, because address-bar links will keep being pasted into that column
- A row with an empty `embed_url` renders a small "Player coming soon" block instead of an iframe that cannot load

### Changed
- **The Listen section is a carousel instead of a 3-up grid.** With four mixes in the table the fourth wrapped onto a second row on its own. It is now the same horizontally scrolling strip as Watch — arrow buttons paging by 80% of the visible width, scroll-snap, and a peek of the next card at the edge. About three cards at the 1120px container width, one at a time on mobile with the arrows hidden at ≤640px
- `MusicCarousel` fetches its own `mixes` rows on mount, the way `WatchCarousel` already does. The `mixes` query is out of `HomePage.jsx`'s `Promise.all`, and it falls back to three placeholder cards if the table is empty or unreachable, so the section never renders blank

### Notes
- `.music-card` and its child styles are unchanged — the cards are sized by `.music-carousel__track > .music-card` now instead of `.music__grid`, which is deleted along with its two responsive rules
- The arrow buttons could not be exercised in the preview browser: it does not composite frames, which freezes `scrollBy({behavior: "smooth"})` at its start position. The code path is `WatchCarousel`'s, and `behavior: "auto"` moves the track through its full range, but the smooth paging itself is unverified
- The two 403s in the console on localhost are the YouTube Data API key being HTTP-referrer-restricted to the production domain. Pre-existing, unrelated, and expected off-domain

---

## v5.27.0 — Admin events: search bar and clickable rows

### Added
- **Search bar above the events table** (`AdminEventsManager.jsx`). Case-insensitive substring match across title, venue, city, and type — a row matches if any one of those fields contains the query. Filtering runs after the existing sort, so the status-then-date-then-title ordering is preserved within the results. The empty state now distinguishes "No events yet." from `No events match "…".`

### Changed
- **Whole event rows are clickable to edit.** Previously only the small "Edit" text button opened the inline form. The row is only clickable while idle — in the editing and deleting states it stays inert so it can't fight with the inline form's own controls, which also means the "✕ Cancel" button is unaffected
- **Both action buttons stop click propagation.** For "Delete" this is load-bearing: without it the row's handler fires too, and because the two handlers set `editingId`/`deletingId` in opposite orders the row would land in edit mode instead of showing the delete confirmation. For "Edit" the bubble is currently harmless — the row calls the same `onEdit` — but letting it through runs the handler twice on every click, which becomes a silent duplicate the moment `onEdit` grows a side effect
- **The row being edited or deleted is never filtered out.** Typing a query that excluded it would otherwise unmount its inline form mid-edit and discard whatever had been typed. The predicate still filters the sorted list, so a preserved row stays in its normal position rather than being pinned anywhere
- Shortened several `EventForm` field labels (Humanitix ID, gallery URL, embedding checkbox, photographer URL) for readability

### Notes
- Scoped to the events admin tab only — `VenueRow` / `AdminTrustedVenues.jsx` are untouched
- A consequence of preserving the in-progress row: searching for a term with no real matches *while* editing shows that one row rather than the "No events match" message. That is the intended trade-off — the open form staying put matters more than a pristine empty state
- Originally drafted as v5.26.0, which collided with the already-released rotating-mosaic version. Renumbered to v5.27.0 and moved above v5.26.1 to restore ordering

---

## v5.26.1 — RotatingPhotoGrid review fixes: viewport-gated rotation, focus trap, dead CSS
*Follow-up pass on v5.26.0. No visual or behavioural change to the design itself.*

### Fixed
- **Rotation armed before the grid had ever been on screen.** The `ENTRANCE_MS` timer started on mount, but the tiles reveal via `whileInView`. The gallery is the seventh of ten sections on the home page, so the timer always expired during initial page load — by the time a visitor scrolled down and the entrance began, rotation was already running and swapping tiles mid-fade. Exactly the interleaving the delay existed to prevent. `started` is now gated on `useInView(gridRef, { once: true, amount: 0.2 })`, with the entrance delay running from that moment; a visitor who never scrolls to the gallery never starts it at all
  - The `amount` matches the `viewport` config in `revealProps` so the entrance and the rotation clock key off the same threshold
  - `ENTRANCE_MS` corrected 1000 → 1200. The longest tile stagger is `8 × 0.06s = 0.48s` plus the `0.7s` reveal = 1180ms, which the old value did not cover
  - `slots` is now seeded during the first render instead of in an effect. `useInView` only ever observes what its ref points at when its effect runs, and the previous empty-first-render path returned `null`, leaving it with no element to watch and rotation permanently unarmed
- **A pause landing mid-preload silently burned a slot's turn.** Both cursors advanced before `preload()` was awaited, but the effect cleanup discards the pending `setSlots`. A pointer entering the grid — or the lightbox opening, or the tab hiding — while an image was in flight spent that slot's place in the round-robin and consumed a photo from the pool without either ever reaching the screen, quietly making the "every slot gets its turn" guarantee untrue. Candidate and target slot are now worked out as locals and the cursors commit inside the `.then()`, only when not cancelled. The `swapping` re-entrancy guard is unchanged
- **`Tab` walked out of an open lightbox** into the page behind it, where every link and button was still reachable but no longer visible. Focus now starts on the close button and `Tab`/`Shift+Tab` cycle within the dialog

### Added
- **`frontend/src/lib/focusTrap.js`** — a single `trapTab(event, container)` helper rather than the same twenty lines in two files. It re-reads the container on each keypress instead of caching, because the overlays mount and unmount controls while open, and its selector excludes `tabindex="-1"` so both lightboxes' honeypot inputs stay unreachable

### Changed
- **`EventCarousel`'s lightbox got the same focus trap.** The brief left this optional depending on whether it could be done without restructuring — it could: two refs, one call in the existing `onKey`, and a mount-time focus effect, with no change to the crowd-photo reporting flow. The `trapTab` call sits ahead of that handler's INPUT/TEXTAREA/SELECT guard so `Tab` stays contained while someone is typing a report

### Removed
- **The dead `.lightbox` block in `global.css`** (`.lightbox-overlay`, `.lightbox`, `.lightbox__info`, `.lightbox__close/__prev/__next`). v5.26.0 assumed it belonged to the Media Hub and left it alone; it doesn't. `MediaHubPage` renders `EventCarousel`, which uses `.ec-lightbox` throughout, and no component anywhere renders those class names — verified by grep before deleting. `.email-gate__card`, referenced by a neighbouring comment, is still live and in use by `MediaHubPage`
  - The `.crowd-modal-overlay` comment that pointed at `.lightbox-overlay` has been reworded. It was describing visual parity, not cascade — that rule declares its own `position`/`inset`/`background`/`z-index` and never inherited anything
- **The `ResizeObserver` backstop in `useSlotCount`.** It was added in v5.26.0 against a preview-pane artifact, not real browser behaviour, and as written fired on every root box change — lazy images landing, the scroll-lock toggling, mobile browser chrome collapsing. No reproducible real-browser case was found where the `matchMedia` listeners miss a breakpoint change, so it's gone. The two `change` listeners plus the initial `update()` (which corrects a stale first-render read) remain

### Notes
- Verified against the running dev server in real Chrome, driven through the extension. Parked above the gallery with the tab-hidden gate neutralised, **41 seconds produced zero swaps** — roughly fourteen rotation intervals, where the old build would have armed one second after mount. Scrolled into view, rotation started and ran cleanly: across **126 seconds and 32 swaps, every completed cycle covered all nine slots exactly once** — `2,8,0,5,3,4,6,7,1` / `8,1,0,4,5,3,6,2,7` / `0,1,3,2,8,6,7,5,4` — including the cycle straddling a 26-second hover interruption, which is the regression Fix 2 targets. Hover held produced 1 swap where ~7 were due
- Focus trap verified in both lightboxes: focus lands on Close at open, `Tab` from the last control wraps to Close, `Shift+Tab` from Close wraps to Next, focus parked outside is pulled back in, and Escape still closes with scroll unlocked and focus restored to the triggering tile
- Media Hub lightbox re-checked after the CSS deletion — still `position: fixed`, inset 0, `z-index: 250`, 78vh `contain`, gold caption, all three controls
- Two things could not be exercised and are worth a glance: **dragging a real window across the 1024px and 640px breakpoints**, and **DevTools → Rendering → emulate `prefers-reduced-motion`**. Browser access is granted read-only, so the window can't be resized or DevTools opened from here. Fresh mounts at 1280/800/500 still give 9/6/4 tiles with exact tiling and no holes, and the reduced-motion path is a single guard in `canRotate`, but neither live transition was observed
- One known edge, not worth code: `revealProps` observes each tile while `useInView` observes the container, so scrolling to just the top of the grid can arm rotation while the bottom row has yet to reveal. A swap into an unrevealed tile is invisible and shows a photo when it does reveal

---

## v5.26.0 — Rotating mosaic photo grid on the home page gallery

### Added
- **`frontend/src/components/RotatingPhotoGrid.jsx`** — the home page gallery is now a fixed editorial mosaic that slowly cycles the entire event photo archive through it. Nine slots on desktop, six on tablet, four on mobile. The layout never moves; only the photo inside a slot changes, one slot every 2.8s, crossfading over 700ms
  - **Round-robin slot order, not random.** Picking a slot at random lets one tile sit untouched for minutes while another flickers. Every slot takes its turn, then the order is reshuffled so the pattern never becomes readable
  - **Preload before swap.** The next `thumb_url` is resolved through `new Image()` and the crossfade only starts on load, with a 1.5s timeout fallback and `onerror` treated as loaded. Without it a slow image leaves a tile blank mid-fade; a broken URL costs one dull swap rather than stalling the wall
  - **A visible-ID `Set` gates candidates**, so the same photo can never occupy two slots at once — it reads as a bug when it happens
  - Rotation pauses on pointer-over, while the lightbox is open, and on `document.hidden`, and is disabled outright under `prefers-reduced-motion` or when the pool can't outnumber the slots. It also waits out the ~1s entrance stagger so tiles aren't swapping while still fading in
  - Tiles are `<button>`s with an `aria-label`; clicking opens a lightbox over the whole shuffled pool with arrow-button, `←`/`→` and `Escape` navigation, click-backdrop-to-close, body scroll lock, and focus returned to the triggering tile
- **`.photo-grid` styles in `global.css`**, carrying over the card treatment from the `.gallery-card` rules they replace — `#191919` border, `#111` backing, scrim gradient, gold uppercase micro-label, Playfair event name, hover `saturate(1.2)` + `scale(1.045)`

### Changed
- **`HomePage.jsx` renders `<RotatingPhotoGrid>` instead of `<EventCarousel group={galleries[0]}>`.** The old gallery section only ever showed the single newest event; the grid draws from every event at once. It reuses the existing `useEventGalleries()` result flattened into one pool — no second Supabase query was added. When the pool is empty the section now renders nothing rather than falling back to placeholder art. `MediaHubPage` still renders `EventCarousel` per event, unchanged

### Removed
- **`MediaGallery.jsx`, `GALLERY_ITEMS`, and the six `public/gallery/*.svg` placeholders.** These were the pre-Supabase stand-in gallery, reachable only when no photos had been uploaded — a state that no longer has a fallback. The `.gallery__grid` / `.gallery-card` CSS and their two responsive blocks went with them
- The `.lightbox` rules that shipped alongside `.gallery-card` were removed as part of the same block. They had been dead in practice for a while: `.lightbox` is declared a second time further down `global.css` for the Media Hub, and that later block overrides `position: fixed` with `position: relative`, so the original full-screen version no longer resolved. The Media Hub block itself is untouched

### Notes
- The new lightbox deliberately reuses EventCarousel's `.ec-lightbox` classes rather than `.lightbox`, for the override reason above — `.lightbox__previous` was also referenced by `MediaGallery` but never defined (the rule is `.lightbox__prev`)
- The shuffled pool is held in a ref keyed on the source array, not `useMemo`. A shuffle isn't idempotent, so StrictMode's double render produced two different orders, and the second one landing mid-mount left every tile crossfading out of a photo it had never shown
- The grid's breakpoints (1024/640) don't line up with the page's (900/640), so its media queries live with the component rather than in the shared blocks. `:nth-child(n)` keeps the overrides level with the desktop spans — a media query alone wouldn't outrank them
- Six half-width tablet slots with a double-height first one leave half of the last row empty, so the closing tile spans full width to seal it. Desktop and mobile tile their grids exactly with no such gap
- Slot count is driven by `matchMedia` with a `ResizeObserver` on the document element as a backstop, since a stale count against live CSS spans would tile the mosaic with holes in it
- Verified in the running app: 9/6/4 tiles with exact tiling at each breakpoint, one-slot-at-a-time rotation with zero duplicate photos across 12 samples, pause held for 5 ticks under hover, tab-hidden pause, lightbox open/arrow-nav/Escape/backdrop-close with scroll lock and focus restore, and no React key warnings or console errors. Live breakpoint *switching* could not be exercised — the preview pane swaps the viewport without running rendering steps, so no `resize`, matchMedia `change`, or ResizeObserver callback is delivered; each breakpoint was checked via a fresh mount instead. `prefers-reduced-motion` is likewise not togglable there and was verified by code path only

---

## v5.25.0 — Compress admin event photo uploads

### Fixed
- **Oversized event photos were rejected outright by the admin uploader.** `AdminPhotoUpload.jsx` sent the raw `File` straight to Storage, and the `event-photos` bucket caps files at 15 MB (migration 018). Real event photography is full-resolution DSLR JPEGs — 6000×4000, 7–34 MB — so uploads failed with a "file too large" error from Supabase. Even the ones that squeaked under the cap were served to every gallery visitor at full resolution
- The public Crowd POV path has had a working client-side pipeline for this since migration 033; the admin path simply never got wired into it. That was the whole root cause — no new technique was needed, just the missing connection

### Changed
- **`frontend/src/lib/processImage.js` now serves both upload paths.** The shared core (HEIC→JPEG → decode with EXIF orientation baked in → downscale to a 2000px longest edge → re-encode at 0.85 JPEG quality → size check) is extracted into `processImageFile(file, { maxEdge, quality, maxBytes })`. `processSubmissionPhoto` and the new `processAdminPhoto` are thin wrappers over it
  - `processSubmissionPhoto` is behaviourally unchanged — same defaults, same error messages, same control flow. `CrowdPovModal.jsx` shows those messages to visitors verbatim, so they were preserved exactly and that file was not touched
  - The two wrappers are deliberately separate named exports with identical settings rather than one aliasing the other, so admin and crowd-pov can diverge later without a rename
  - The HEIC intermediate conversion stays pinned to the module-level quality rather than a caller-supplied one, so an aggressive final quality could never compound into two lossy passes
- **`AdminPhotoUpload.jsx` compresses before uploading.** Files run through `processAdminPhoto` inside a try/catch; a processing failure surfaces per-file through the existing error state and skips that file rather than attempting the upload. A "Compressing…" label shows while it runs, with errors still taking priority. Since the output is always JPEG, storage paths are now forced to `.jpg` and the upload passes `contentType: "image/jpeg"`
- Realistic output is now a few hundred KB to ~1–2 MB, so galleries load dramatically faster for visitors as a side effect

### Added
- **Migration 038** — raises the `event-photos` bucket limit from 15 MB to 20 MB. This is a safety margin behind the client-side compression, not a return to accepting raw originals. `allowed_mime_types` is unchanged (it already includes `image/jpeg`, all this path can now produce), and the `crowd-pov`/`crowd-pov-pending` buckets keep their 15 MB limits

### Notes
- Animated GIFs are flattened to their first frame, since canvas re-encoding only ever captures one. Acceptable for event photography and noted in the code
- Forcing `.jpg` means `IMG_1234.png` and `IMG_1234.jpg` now resolve to the same storage object, where before they were distinct. With `upsert: true` the second silently overwrites the first. This mirrors a pre-existing limitation — `FileRow` already keys on `file.name`, so identically-named files were already broken — and neither was changed here
- `thumb_url` still equals `photo_url`; no separate thumbnail size was introduced. Out of scope, still worth doing later
- Canvas-based resizing needs a real DOM, so this is not covered by automated tests. Verified via lint, production build, and a line-by-line review of the `processSubmissionPhoto` diff for regressions

---

## v5.24.1 — Fix unreadable dropdown options across the site

### Fixed
- **Every `<select>` on the site rendered its open dropdown list unreadable — cream text on a white system background.** `<option>` elements had no background colour of their own (computed `rgba(0, 0, 0, 0)`), so while the closed control picked up the dark theme, the OS-painted open popup fell back to its default — white on Windows — against text still inherited from `--cream`. `color-scheme: dark` on `:root` doesn't prevent this once a control carries an author background. Reported against the Crowd POV event picker, but the same bug was live on all six `<select>` elements site-wide (the report-reason picker, and four in the admin dashboard). Fixed with one rule — `option { background-color: var(--panel); color: var(--cream); }` — rather than patching each instance
- **The two visitor-facing selects (Crowd POV event picker, report-reason picker) also looked out of place even before opening** — the native OS arrow widget doesn't take styling. Both now use `appearance: none` with a hand-drawn gold chevron matching the rest of the site's iconography

### Notes
- The report-photo flag button was also queried in the same bug report as "not visible" — it is wired up and working, just easy to miss: it lives inside the lightbox next to the close button (shown only on Crowd POV photos, never official ones), and there were zero approved Crowd POV photos in the database at the time to click through to it. No code change needed there

## v5.24.0 — Crowd POV moderation hardening, code-review fixes, lint config repair
*Migration 037 applied live via Supabase MCP. Findings from a local review plus Greptile's first PR review on [#1](https://github.com/kavapyramids/K-P-Website/pull/1)*

### Fixed
- **A failed approval could leave a visitor's photo publicly reachable, permanently.** `handleApprove` moved the file into the public bucket before inserting the `crowd_photos` row, and bailed out on insert failure with the file left where it was — published, with nothing in the database recording an approval. Worse, it wedged every retry: the move looks in the pending bucket, and the file was no longer there. The move is now rolled back on insert failure, restoring the exact pre-click state. If the rollback itself fails, the error names the bucket and path so it can be cleaned up by hand
- **The step-4 failure message in approval was actively misleading.** By that point the photo is genuinely live and only its review status failed to save, but the message read like the approval hadn't happened — inviting a second click that would publish a duplicate. It now says so explicitly
- **"Remove Permanently" could report success while deleting nothing.** When `storagePathFromUrl` couldn't parse a photo's URL it skipped the storage delete entirely and carried on to drop the database record — leaving the file served from storage with the only record pointing at it now gone. This is the takedown path for a no-consent report, so it now aborts before touching the database and leaves the photo hidden
- **Crowd-only event cards contradicted themselves.** An event with crowd photos but no native photos and no external gallery — the synthetic group `useCombinedGalleries` creates — rendered "Photos coming soon" directly above a full Crowd POV grid. The empty state now only shows when there is genuinely nothing to display
- **`npm run lint` reported 13 errors, 6 of them false.** `motion` and `Icon` are used, but only inside JSX, and base `no-unused-vars` doesn't track JSX identifiers — deleting those imports would have broken the build. The `varsIgnorePattern: "^[A-Z_]"` had been masking this by accident, hiding every capitalised component import so that only lowercase JSX identifiers ever surfaced. Added `eslint-plugin-react` and enabled `react/jsx-uses-vars`, which fixes the cause and makes the remaining reports trustworthy. The genuine errors are gone too, including a dead cluster in `MediaHubPage` — an orphaned `Lightbox`, `MOCK_ASSETS`, and a `media_assets` query that ran on every page load and rendered nowhere

### Changed
- **Reports are now capped at 20 open per photo, in the database.** **Migration 037** adds `private.crowd_photo_report_count()` to the insert policy's `WITH CHECK`. The client-side guard in `EventCarousel` was always documented as a speed bump rather than a boundary, and it is one: the anon key ships in the bundle by design, so anyone can POST to `crowd_photo_reports` directly and never load the page. `crowd_photos` ids are publicly readable, so they are trivially enumerable — an unbounded insert path plus an admin panel that rendered every report it fetched meant a public form could be used to make the moderation queue unusable. The count is of **open** reports only, mirroring how `crowd_submission_count` ignores `'rejected'`: once an admin dismisses a round the slate clears, so a photo is not permanently un-reportable for having survived one. Deliberately given no public wrapper — the frontend has no need to ask how many people reported a photo, and answering would leak moderation state
- **Anon uploads to `crowd-pov-pending` must now match `{uuid}/{uuid}.jpg`.** The policy from migration 033 checked only the bucket, so any key was writable. The hourly sweep removed unreferenced files, but that left an hour for junk to accumulate at up to 15 MB per object. Verified before writing: `events.id` is a `uuid`, so the pattern matches genuine submissions — had it been a `bigint` this would have silently rejected every upload
- **Hitting the report cap no longer shows a visitor raw Postgres.** A capped insert surfaces as a bare RLS violation, so `EventCarousel` now treats `42501` as success — honest, because 20 open reports means the photo was hidden on the first one and is already in the review queue. Same handling `CrowdPovModal` does for the submission cap
- **The admin report list is bounded** — 5 rendered per card with a "+N more" note, and a 500-row backstop on the fetch

### Added
- **`greptile.json`** — review config so PR reviews start from the right assumptions. Without it the reviewer flags all five public forms for missing authorisation, not knowing there is no server and that `supabase/migrations/` is the security boundary. Six scoped rules cover the rest of the false-positive surface; one points the other way, flagging any genuinely private value that acquires a `VITE_` prefix and would be inlined into the public bundle

### Notes
- Both READMEs were rewritten. The root one described a project that no longer exists — Supabase as "future database migrations", and references to `update 0.rtf` and `indexV1.html`, both long deleted. `supabase/README.md` claimed the directory "will hold database migrations" when there were 36, and listed four bucket names that were never created
- Greptile's first review ran against the pre-fix commit and so predates all of the above. Its four findings were verified independently before being acted on: the two adopted here were real, and two were declined — `stable` vs `volatile` on `crowd_pov_cleanup_token()` (defensible but near-zero payoff; the supporting reasoning about plan caching was also wrong), and the hardcoded project URL in the cron body (correct, but only worth fixing alongside a staging environment that does not exist yet)
- Neither review caught what the other did. The three approval/removal bugs were found locally; the two policy gaps came from Greptile
- The frontend changes and migration 037 are independent — either can ship without the other without breaking anything

---

## v5.23.0 — Crowd POV: attendee photo submissions, admin review, public display, and reporting
*Migrations 033–036 applied live via Supabase MCP; migrations 028–032 reconstructed as files*

### Added
- **Crowd POV — event attendees can submit their own photos, which appear on the site only after review.** **Migration 033** lays the foundation: `crowd_submissions` (the moderation record, holding the uploader's email — never publicly readable, anon gets INSERT only with no SELECT policy at all) and `crowd_photos` (the public-facing record, populated only on approval), plus two storage buckets mirroring that split — private `crowd-pov-pending` for submissions awaiting review, public `crowd-pov` for approved photos. Both allowlist `jpeg/png/webp` only: no SVG (stored-XSS risk) and no GIF, deliberately stricter than `event-photos`. `mailing_list` gains a `crowd_pov` source with its own scoped anon INSERT policy, separate from the existing `media_hub` one
- **Visitor submission flow** (`CrowdPovModal.jsx`, opened from a new "Crowd POV" button in the Media Hub nav — placed outside the email-gate conditional so it works whether or not the gallery has been unlocked). Mandatory email, a past-events-only picker, file input, and a required consent checkbox; the submit button stays disabled until every field is filled. Same honeypot pattern as the other public forms
- **Every submitted photo is stripped of metadata and normalised before it leaves the browser** (`lib/processImage.js`). Phone cameras embed GPS coordinates, so a photo taken at an afterparty can carry someone's home address — re-encoding through a canvas drops all EXIF, since canvas has no way to carry it through. The same pass converts HEIC (which iPhones shoot by default, and which the bucket's MIME allowlist rejects) via `heic-to`, and caps the longest edge at 2000px. EXIF orientation is baked into the pixels first, so stripping the metadata doesn't leave portrait photos lying on their side. Verified byte-for-byte: a 3000×2000 test JPEG carrying real GPS coordinates came out at 2000×1333 with the APP1 segment gone, and the uploaded object matched that output exactly
- **Admin review queue** — a new "Crowd POV" tab in the dashboard listing pending submissions oldest-first, each with a signed-URL preview (the pending bucket is private, so a public URL won't work). Approve moves the file across to the public bucket, creates the `crowd_photos` row, and marks the submission approved; Reject deletes the file immediately and records an admin-only reason. Both order their steps so the file is dealt with *before* the database, so a half-failed action can never leave a record pointing at a file that isn't there
- **Approved photos now appear publicly** in a distinct "Crowd POV" sub-section under each event's official carousel strip — a still grid rather than a second drifting strip, so the difference from the hired photographer's set reads at a glance. Clicking opens the existing lightbox, with its own index so arrow-keying through crowd photos never wanders into the official set
- **Visitors can report a published crowd photo** as offensive or posted without their permission. **Migration 036** adds `crowd_photos.hidden`, switches the public read policy to `using (hidden = false)`, and adds `crowd_photo_reports` with an `after insert` trigger that hides the photo immediately. Hiding is soft and reversible, which is what makes it safe to act on a single anonymous report — someone in a photo they never consented to shouldn't have to wait for a human, and the cost of being wrong is a photo temporarily missing rather than destroyed. The admin tab gained a second section listing hidden photos with all their reports grouped onto one card, offering Restore (photo reappears, reports dismissed) or Remove Permanently (file deleted, record dropped, original submission marked `removed` — distinct from `rejected`, which would wrongly imply it never went live)
- **`LICENSES.md`** — attribution for `heic-to` (LGPL-3.0), the one dependency whose licence carries obligations the permissive ones don't. It's used unmodified, loaded as a separate chunk via dynamic `import()`, and not statically linked

### Changed
- **`useCombinedGalleries` now fetches every event, not just those with `photo_gallery_url` set.** The old filter would have silently dropped any event whose only photos were crowd submissions, leaving them invisible on the page forever. Groups now also carry the event's real `event_id`, and a synthetic group is created for events that have crowd photos but no native photos and no external gallery — the case that previously never produced a card at all. The guard is deliberate (`external || crowdPhotos.length`): without it, fetching all events would spawn an empty card for every gig ever played
- **Privacy policy covers Crowd POV** — a new "Photo Submissions" section explaining what's collected, that photos are reviewed before publishing, that location data is stripped, and how to ask for a photo you appear in to be taken down. The mailing-list consent sentence now also names Media Hub unlock, which had been adding people since v5.20.0 without being listed

### Fixed
- **Migrations 028–032 existed only in the live database and were never saved as files.** They were applied by hand on 2026-07-28 while debugging, so the repo ended at 027 while production had five more. Reconstructed verbatim from `supabase_migrations.schema_migrations` (not inferred from live state) and committed. They document a diagnostic sequence chasing why admin photo uploads failed: the root cause, found in **032**, was that migration 019 dropped *every* SELECT policy on `storage.objects` including the admin's — and Postgres needs an applicable SELECT policy for `INSERT ... RETURNING` to return the inserted row, which Supabase Storage relies on to confirm an upload. Two of the five (**029**, **030**) are diagnostic-only and carry explicit warnings: they leave the upload policy pointing at a throwaway function and hardcoded to `true` respectively, and only make sense as part of the sequence that **032** closes
- **Orphaned uploads no longer accumulate in `crowd-pov-pending`.** The modal uploads before inserting the submission row (the reverse would leave the review queue full of submissions whose file never arrived), so anything failing in between — most often the 5-per-email-per-event cap — stranded a file nothing referenced. **Migration 034** adds a public RPC wrapper over the cap check so the frontend can stop *before* uploading, and **migration 035** schedules an hourly sweep for whatever still slips through: `pg_cron` → `pg_net` → a new `crowd-pov-cleanup` Edge Function. It has to be an Edge Function because Supabase's `storage.protect_delete()` trigger blocks `delete from storage.objects` outright, and its escape hatch is a trap — it removes the metadata row while leaving the bytes orphaned in the backing store, turning a visible orphan into an invisible one. Real deletion needs the Storage API and the service-role key, which the Edge runtime supplies without it ever being written down

### Notes
- The cron→function hop authenticates with a random token generated *inside* the database into Supabase Vault, rather than the service-role key the docs suggest — it's scoped to this one operation, and its plaintext never appears in this repo, in an environment variable, or in the cron job body
- `public.crowd_submission_count` is deliberately callable by `anon` and shows up as two new security-advisor warnings. It's a narrow, intentional hole in an otherwise unreadable table: someone who already knows an email address can learn whether it submitted to a given event. It's a confirmation oracle, not an enumeration one — it can't list addresses or read any other column
- `pg_net` must be installed into the `extensions` schema; creating it without an explicit schema lands it in `public` and trips the `extension_in_public` lint, and it doesn't support `ALTER EXTENSION ... SET SCHEMA`, so fixing that means a drop and recreate
- The per-browser report limits (5 per 24h, and one report per photo) are `localStorage`-backed and trivially bypassed by clearing storage or switching browser. That's expected — they're a speed bump against casual abuse, not a security boundary. What actually makes single-click hiding safe is that it's reversible
- Supabase security advisors otherwise report the same pre-existing findings as before this release
- Admin-side actions in this release were verified as data sequences rather than UI clicks (no admin session is available to this tooling); the storage-delete step of "Remove Permanently" in particular still wants a manual click-through

---

## v5.22.0 — Mobile capped scroll for Trusted Venues + For Promoters, hero/Photo Hub copy polish

### Changed
- **Trusted Venues and For Promoters now scroll inside their own box on mobile** instead of running the page long. Below 640px — the breakpoint where both grids collapse to a single column — `.trusted__grid` caps at `25rem` and `.why-book__grid` at `34rem`, each with `overflow-y: auto` and a thin gold scrollbar styled for both WebKit (`::-webkit-scrollbar`, 4px) and Firefox (`scrollbar-width` / `scrollbar-color`). Both rules live inside the existing `max-width: 640px` block, so the two- and multi-column layouts above that breakpoint are untouched
- **Hero tagline trimmed to "to the World"** (previously "CHCH to the World")
- **Homepage Photo Hub blurb** now reads "Browse and download photos from our latest events"

### Added
- `docs/trusted-venues-scroll-prompt.md` and `docs/why-book-scroll-prompt.md` — the working briefs behind the two scroll changes, kept in the repo alongside the code they produced

---

## v5.21.1 — Media Hub source label, EPK copy polish, drop stale residency

### Fixed
- **The Mailing List tab showed the raw `media_hub` database value** in its Source column, leaking a schema detail into the admin UI. It now renders as "Media Hub"; every other source (`manual`, `humanitix`) still displays verbatim

### Changed
- **EPK copy de-hyphenated throughout** — "Open-format" → "Open format", "high-energy" → "high energy", "Crowd-reading" → "Crowd reading", "Peak-time" → "Peak time". The em dash introducing the heritage explanation became a comma, and "started in high school in 2018" is now simply "started in 2018"
- **The EPK bio no longer names specific weekly residencies.** "Kong Bar on Saturdays, Original Sin on Fridays" became "resident of the strip on Friday and Saturdays", so the page doesn't go stale each time a residency changes hands

### Removed
- **The "Original Sin — Fridays" residency** from `siteData.js`, leaving Kong Bar on Saturdays as the only live entry — the same staleness the EPK rewrite above addresses, at the data layer

---

## v5.21.0 — Media Hub gate skip + pill redesign, nav typography, honest photo counts

### Added
- **"Already signed up? Skip →" link on the Media Hub email gate.** Returning visitors who already handed over their email (or just don't want to) can bypass the gate without creating a duplicate signup. A skip writes nothing to Supabase — there's no email to log — and persists via a new `kp_media_hub_skipped` localStorage key with the same durability as a real submission, so the gate stays gone on future visits. Download tracking now only includes the `email` column when a real address exists, so skipped visitors log downloads with a null email instead of a placeholder string

### Changed
- **Email gate redesigned as a single-row pill bar.** The separate "Your Email" label is gone; a larger 21px mail icon, a bigger 1rem input, and the "Unlock Gallery" button now share one rounded bar with a gold focus ring. Honeypot, validation, loading state, and error handling are unchanged (errors render below the bar). Under 480px the button wraps to its own full-width row. The already-live mailing-list signup logic was not touched
- **"MEDIA HUB" and "EPK" nav links now match the other nav items.** `.nav__external-link` previously used `0.82rem` muted text with no letter-spacing or uppercase transform, so the two external links looked visibly different from their siblings. They now use the exact properties of the scroll-to nav buttons (`.67rem`, `.14em` letter-spacing, uppercase, `#aaa7a0`, gold hover), on desktop and in the ≤900px dropdown (which now applies its `1rem` padding / left alignment to them too)

### Removed
- **"N photos — click to browse" line on Media Hub event cards.** The count only reflected photos hosted natively on the site, not the full external gallery it implicitly described, so it was misleading. The card header remains clickable and still opens the full-screen grid; the orphaned `.event-carousel__count` rule went with it

### Fixed
- **Admin photo upload no longer reports "✓ All done — photos are live" when some uploads failed.** The done-state now cross-checks the per-file error map: full success keeps the old message, partial failure shows "N of M photos failed to upload — see errors above" with the success count, and a database error still takes priority

---

## v5.20.1 — Backfill order dates for unsubscribed contacts

### Fixed
- **The v5.20.0 order-date fix only reached 45% of Humanitix contacts.** The first real sync on v13 captured a genuine purchase date for 86 of 192 rows — the remaining 106 were *all* `subscribed = false`. The sync's "never resubscribe or overwrite someone who has unsubscribed" guard returned early before the update ran, so unsubscribed contacts never received `order_created_at` (or `order_id`) and kept sorting by the sync timestamp, which is exactly the bug v5.20.0 set out to fix. That guard exists to protect consent, but an order's historical timestamp is neutral metadata, not a consent field. The branch now backfills `order_created_at`/`order_id` only, and still never touches `subscribed`, `first_name`, `last_name`, `source`, or `event_title`

### Notes
- The 106 affected rows correct themselves on the next sync — no manual data fix needed
- Confirmed against the live API: the Humanitix order object does expose `completedAt`/`createdAt` as documented, yielding real purchase dates spanning 2026-06-12 → 2026-07-10 rather than the sync timestamp
- The Netlify MCP connector now authenticates against the correct team ("KP Enterprise" / `kavapyramids`). Production site is `kavapyramids` deploying from `main`; `kavapyramids.com` remains unregistered by design (free tier, domain planned later)

---

## v5.20.0 — Repair admin writes (RLS), fix Humanitix sync, capture Media Hub signups, auto-age events

### Fixed
- **Every admin write was failing with "new row violates row-level security policy"** — photo upload, gallery, events, mixes, videos, mailing list, enquiries. Root cause was not the `admins` allowlist (which was correctly populated all along) but a missing grant: migration 020 moved `is_admin()` into a `private` schema and granted `EXECUTE` on the function, but never granted `USAGE` on the schema itself. In Postgres, EXECUTE is not sufficient — the calling role also needs USAGE on the containing schema just to resolve the name, so `private.is_admin()` raised `42501: permission denied for schema private` instead of returning a boolean. Every policy from migrations 018/020 calls it, so every policy threw, and both PostgREST and the Storage API surface that as a generic RLS violation. The dashboard still *loaded* because `ProtectedRoute` calls `public.am_i_admin()` (migration 021), which lives in a schema `authenticated` can reach — so admin auth appeared to work perfectly while every write behind it failed. **Migration 026** grants the missing USAGE
- **"Sync Now (Humanitix)" failed silently from the deployed site.** Not the API key (which was set) and not stale code — a CORS mismatch. The function's allowlist contained `kavapyramids.com`, which is **NXDOMAIN**; the site actually serves from `kavapyramids.netlify.app`, which was not allowed. `corsHeaders()` omits `Access-Control-Allow-Origin` entirely for unknown origins, so the browser blocked the response and never sent the POST — the only trace was a lone `OPTIONS 200` in the edge logs with no request after it. The sync's 136 existing contacts were all written on 2026-07-07 from `localhost:5173`, which *was* allowlisted, which is why it had worked before. Added the Netlify origin plus a pattern for branch/preview subdomains, added `Access-Control-Allow-Methods`, and added a `console.warn` on rejected origins so this can never fail silently again
- **Mailing list "most recent first" looked wrong, but the sort code was correct and already deployed.** The cause was the data: contacts inserted by the Humanitix sync took `created_at` from whenever the sync ran, so all 136 landed within seconds of each other and their relative order was arbitrary. See "Added" below

### Added
- **Media Hub gallery-unlock emails now reach the Mailing List tab.** Previously the email entered on `/media-hub` was written only to `media_downloads`, a table with no admin UI, so those signups were invisible. **Migration 024** extends the `source` check to allow `media_hub`, makes `first_name`/`last_name` nullable (the gate collects only an email — no fake placeholder names), and adds a tightly-scoped anonymous INSERT policy: `with check (source = 'media_hub' and subscribed = true)`, with no anon SELECT/UPDATE/DELETE, so a visitor can create their own signup row and nothing else. Duplicate emails hit the existing unique index on `lower(email)` and are treated as a harmless no-op rather than a user-facing error
- **Admin Mailing List handles nameless contacts.** `media_hub` rows legitimately have null names, so the table renders an em dash instead of blank cells and the delete prompt falls back to the email's local part. Also fixed a latent bug in the search filter, which would have matched the literal string `"null null"` once nullable names existed
- **Events age out on their own.** `events.status` was only ever recalculated when an admin opened an event and re-saved it, so a gig silently stayed `upcoming` forever once its date passed. **Migration 025** enables `pg_cron` and schedules `update-past-event-status` hourly. The cutoff is midday NZ on the day after the event — anchoring to midnight *starting* the event day would mark a gig `past` while the set was still running, and `sort_date` is a plain `date` with no timezone, so the expression reads it as `Pacific/Auckland` wall-clock time to stay correct across NZDT/NZST
- **Humanitix contacts now carry their real ticket-purchase date.** **Migration 027** adds nullable `order_created_at`, populated by the sync from the order's `completedAt` (falling back to `createdAt`) — both ISO-8601 fields on the Humanitix order object per its published OpenAPI spec. A generated `effective_signup_at = coalesce(order_created_at, created_at)` column (indexed) gives the sort a real column to order on, since PostgREST's `.order()` takes column names rather than expressions. Manual and media_hub contacts have no order and keep sorting by `created_at`. On update the sync only writes the timestamp when it parsed one, so a re-sync backfills existing rows without clobbering a known date with null. The function also logs the first order's field *names* (never values — attendee PII) so the live response shape can be confirmed against the spec from the edge logs

### Changed
- **Event dropdowns sort by the event's actual date, newest first.** The "Link to existing event" picker in the Photo Upload tab and the "Linked Event" relink picker in the Gallery tab both render the `events` prop verbatim, and that prop was ordered by `created_at` (row insertion order). The fetch in `AdminDashboard.jsx` now orders by `sort_date` descending with undated events last. `AdminEventsManager` recomputes its own display order locally (status → sort_date → title) and is unaffected
- **Media Hub email-gate disclaimer now describes what actually happens.** It read "We only use this to track download activity — no spam", which stopped being true the moment those addresses started flowing into a marketing list. It now discloses the mailing-list signup and mentions unsubscribing
- **Photo Hub blurb on the homepage** trimmed to "Browse and download photos from our events."

### Notes
- `kavapyramids.com` does not resolve (NXDOMAIN). The site's `og:url`/canonical tags, `robots.txt`, and `sitemap.xml` all still point at it, and the Humanitix CORS allowlist keeps it listed so that registering the domain later "just works"
- Supabase security advisors report the same six findings as before this release — all pre-existing and intentional (the deliberate `admins` deny-all, three public-insert log tables, `am_i_admin()` by design, and leaked-password protection, which is worth enabling). The new anon INSERT policy on `mailing_list` is *not* flagged, because it is scoped rather than `WITH CHECK (true)`
- The live migration ledger is incomplete — 001–008, 012–017, 022 and 023 were applied by hand and never recorded — so a migration missing from `list_migrations` is not evidence it was never applied. Migrations 024–027 in this release were applied via `apply_migration` and *are* recorded

---

## v5.19.0 — TikTok feed styling fix, live YouTube Watch feed, events scroll, Netlify build fix

### Fixed
- **TikTok feed (SociableKit widget) restyled to match the site.** The widget was rendering in Carousel mode inside a hardcoded white card (`#fff` background, `2px #e5e5e5` border, `12px` radius, `24px` padding) — clashing with the black/gold theme and showing a single scrolling row instead of a grid. Switched the widget to **Grid mode** on the SociableKit dashboard (embed `25695197`), which restored the `.sk-posts-grid` / `.sk-post-item` DOM the existing overrides target, then in `frontend/src/styles/global.css` stripped the outer `.sk-tiktok-feed` card to transparent/borderless/flush so the feed sits on the dark section and matches the borderless Instagram (Behold) grid above it
- **Worked around the widget forcing a near-white tile border.** The widget's own JS applies `border-color: #f5f5f5` to each `.sk-post-item` in a way no author CSS can override — verified against the live DOM that not even an inline `!important` wins (border-width, radius, background, and outline all yield to our CSS, but `border-color` does not). Zeroed the widget border out (`border: 0`) and now draw our own thin gold line with `box-shadow: inset 0 0 0 1px var(--line)`, which the widget doesn't touch; hover shifts the inset shadow to gold and keeps the `translateY` lift
- **Netlify build failure from secret scanning** (`netlify.toml`). Netlify's secret scanner fails the build when an env-var value appears in build output, and `VITE_` vars are inlined into the client bundle by design. Opted just the two intentionally-public keys out via `SECRETS_SCAN_OMIT_KEYS` (the YouTube key is read-only + HTTP-referrer restricted; the Supabase anon key is a publishable key guarded by RLS) — scanning stays on for everything else

### Added
- **Watch carousel now feeds from the channel's latest YouTube uploads live** via the YouTube Data API (`playlistItems` on the uploads playlist), with a resilient fallback chain so the section is never empty or broken: (1) latest uploads from YouTube when `VITE_YOUTUBE_API_KEY` is set, (2) curated rows in the Supabase `videos` table, (3) built-in placeholders. The key is read-only and HTTP-referrer-restricted, supplied via env and never committed; documented in `frontend/.env.example`

### Changed
- **Shorts excluded from the Watch feed — full sets only.** Pull a wider recent window from the uploads playlist, look up each video's duration via `videos.list`, and keep only items longer than 3 minutes before taking the newest 5 (two quota units per load)
- **Events list is now an always-on scrollable container.** Previously only the "past" tab scrolled; both tabs now use `.events__list--scrollable`, with a `27rem` max-height cap on mobile (`HomePage.jsx`, `global.css`)
- **Copy polish** on the Events and Watch section headings (`HomePage.jsx`) and the Event Photo Hub email-gate blurb (`MediaHubPage.jsx`)

---

## v5.18.0 — Watch section becomes a newest-first video carousel

### Changed
- **Replaced the static Watch / "See the Sets" grid with a horizontally scrollable, multi-card video carousel** (`WatchCarousel`), retiring `YouTubeGrid.jsx` and its dead CSS. Cards play inline via YouTube embed with only one video active at a time. Videos sort newest → oldest by `published_date` (with `sort_order` as a stable tiebreak; undated videos sort last), reading the existing Supabase `videos` table with a placeholder fallback. Desktop gets prev/next arrows anchored on the 16:9 frame; mobile uses native touch-swipe/scroll with the arrows hidden. Thumbnails are keyboard-accessible (Enter/Space to play). The "Watch the Movement" highlight reel is unchanged

### Added
- **Migration 023** — nullable `videos.published_date` to drive the carousel sort

---

## v5.17.0 — Netlify launch: fallback Supabase config, deployed live

### Added
- **Fallback Supabase URL/anon key** in `frontend/src/lib/supabase.js` — the current hosting plan gates environment variables, so the site now falls back to hardcoded values when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` aren't set at build time. This is safe: the Supabase anon key is a public, publishable key by design — it ships in the bundled JS either way and is meaningless without Row Level Security, which is what actually protects the data (see migrations 018–022). Env vars still take precedence when they are set, so a proper deployment can override these later
- Verified live in preview: every Supabase-backed section (events, stats, trusted venues, mixes, videos, uploaded event photos) loads real data with zero environment variables configured

### Notes
- Site is now live at **kavapyramids.netlify.app** (renamed from the auto-generated `eclectic-unicorn-d97c00`)
- Attempted to set env vars via the Netlify MCP connector first — the API calls reported success but never actually persisted, and the hosting plan separately turned out to gate this feature entirely. The fallback above sidesteps both problems
- When a custom domain is purchased, remember to also update: `og:url`/`twitter` tags and the `SITE_URL`/`ALLOWED_ORIGINS` values referenced in `humanitix-sync`, plus the placeholder URLs in `robots.txt`, `sitemap.xml`, and `index.html`

---

## v5.16.0 — Security hardening pass: real admin allowlist, RLS fixes, honeypots
*Migrations 018–022 applied live via Supabase MCP*

### Fixed — critical
- **Every "admin" RLS policy actually granted access to any signed-in Supabase Auth user, not just the site owner.** All "Admin manages X" policies (events, stats, trusted_venues, mixes, videos, media_assets, media_downloads, enquiries, mailing_list) used `auth.role() = 'authenticated'`, which is true for *any* logged-in account — if public sign-up were ever enabled, any visitor could self-register and get full read/write/delete on every table, including `enquiries` and `mailing_list` (real customer PII). Fixed with a dedicated `admins` allowlist table (migration 018) gated behind a `SECURITY DEFINER` `is_admin()` helper, with every policy switched over to check it instead
- **Live database had drifted from the migrations in this repo** (migration 019) — several tables had a second, undocumented "admin" policy created directly in the Supabase Dashboard that granted full access with a bare `USING (true)` (not even an auth check), sitting *alongside* the properly-scoped policy. Since Postgres RLS policies are OR'd together, migration 018 alone would not have closed this — these duplicates would have kept the door wide open. All removed; also formally tracked `epk_downloads` in a migration for the first time (it existed live but had no migration file)
- **`is_admin()` was directly callable over the public API** (`/rest/v1/rpc/is_admin`) since PostgREST auto-exposes every function in the `public` schema. Moved into a non-exposed `private` schema (migration 020) — Postgres can still call it from RLS policies, but it's no longer reachable as an endpoint
- **`humanitix-sync` Edge Function accepted requests from any origin** (`Access-Control-Allow-Origin: *`) and only checked that the caller was *any* authenticated user, not an admin — since it uses the service-role client (bypassing RLS entirely) to touch a third-party API key and real PII, this was a real gap. CORS is now locked to a known origin allowlist (configurable via `SITE_URL`/`ALLOWED_ORIGINS` secrets), and the function now explicitly checks the caller against the `admins` table before running
- **Path traversal in the photo upload storage path** — an unsanitized `file.name` (e.g. containing `../`) could have written outside an event's folder or overwritten unrelated objects in the `event-photos` bucket. Filenames are now sanitized before being used in the storage path. Also hardened the bucket itself: 15MB file size cap and an image-only MIME allowlist, so the (trivially-spoofable) client-side check isn't the only thing enforcing this
- **`anon` had a live EXECUTE grant on `am_i_admin()`** that was never intended (migration 021 only grants to `authenticated`) — not actively exploitable (anonymous calls just return `false`), but flagged by Supabase's security advisor and didn't match documented intent. Revoked (migration 022)

### Added
- **Honeypot anti-spam field** on all three public forms (booking enquiry, EPK download, Media Hub email gate) — a hidden `website` field real visitors never see or fill in; submissions that fill it are silently discarded while still showing a normal success state, so bots don't learn to skip it
- **`ConfigError` screen** in `App.jsx` — if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing at build time, the site now fails loudly with a clear message instead of a cryptic null-reference crash deep in some component
- **`ProtectedRoute` now verifies real admin status**, not just "is logged in" — calls the new `am_i_admin()` RPC (via `frontend/src/lib/admin.js`) and shows a dedicated "Access denied" screen for authenticated-but-non-admin accounts. `LoginPage` does the same check and signs out any non-admin account that successfully authenticates rather than leaving it in a live session
- **`netlify.toml`** — deploy config (base/build/publish, SPA redirect, security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`). README updated with Netlify deploy steps
- **`robots.txt`** (disallows `/admin`, `/login`) and **`sitemap.xml`** — both use a placeholder domain pending the real production domain
- **`AdminPhotoUpload`** now surfaces a clear error if photos land in Storage but the `media_assets` insert fails, instead of silently reporting false success

### Removed
- Unused `xlsx` dependency (only ever used by a one-off import script, not any runtime code) — confirmed via a full search of `frontend/src` before removal

### Notes
- **Action required in Supabase Dashboard**: enable "Leaked Password Protection" (Authentication → Policies) — flagged by the security advisor, not something a SQL migration controls
- Re-ran the Supabase security advisor after applying migrations 018–022: the only remaining findings are either by design (public insert-only policies on contact/log tables, `admins` having RLS with zero direct policies, `am_i_admin()` being callable by authenticated users — that's its entire purpose) or the leaked-password toggle above

---

## v5.15.0 — Highlight reel activated with scroll-triggered autoplay

### Added
- **Highlight reel embedded** in the "Watch the Movement" section — `HIGHLIGHT_REEL_EMBED` in `siteData.js` now points at a real YouTube video (`TyerdB20EUQ`) instead of the placeholder, replacing the "coming soon" state
- **Scroll-triggered autoplay** — the reel plays (muted) automatically as it scrolls into view, whether scrolling down or back up, and pauses when it scrolls out, via an `IntersectionObserver` posting `playVideo`/`pauseVideo` commands to the YouTube iframe. Muted playback is required by every browser's autoplay policy when there's been no prior user interaction — visitors can unmute via the player's own controls. Skips entirely for users with reduced-motion preference set

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
