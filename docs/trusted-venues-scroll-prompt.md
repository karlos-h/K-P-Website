# Claude Code prompt — Trusted Venues capped scroll (mobile only)

Apply the same capped/scrollable list treatment used on the Events section's
`.events__list--scrollable` to the Trusted Venues grid — but ONLY at the
breakpoint where cards go full-width single-column, not at the 2-column or
5-column layouts.

## Context
- `frontend/src/pages/HomePage.jsx` (~line 397): `<div className="trusted__grid">` maps over `trustedVenues`.
- `frontend/src/styles/global.css`:
  - Line 222: base `.trusted__grid { grid-template-columns: repeat(5, 1fr); ... }`
  - Line 361 (`@media (max-width: 900px)`): `.trusted__grid { grid-template-columns: repeat(2, 1fr); }`
  - Line 374 (`@media (max-width: 640px)`): `.trusted__grid { grid-template-columns: 1fr; }` ← this is the breakpoint where each card spans the full device width.

## Change
This is CSS-only — no JSX/state changes needed (unlike the Events tabs, Trusted Venues has no tab toggle).

Inside the existing `@media (max-width: 640px)` block in `global.css`, extend the `.trusted__grid` rule (or add a new rule scoped to that same media query) to cap the height and enable internal vertical scroll, matching the visual style already used for `.events__list--scrollable`:

```css
@media (max-width: 640px) {
  .trusted__grid {
    grid-template-columns: 1fr;
    max-height: 25rem;
    overflow-y: auto;
    padding-right: .5rem;
    scrollbar-width: thin;
    scrollbar-color: var(--gold) #111;
  }
  .trusted__grid::-webkit-scrollbar { width: 4px; }
  .trusted__grid::-webkit-scrollbar-track { background: #111; }
  .trusted__grid::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 2px; }
}
```

`max-height: 25rem` is sized to show ~2 full trusted-venue cards (`.trusted-card` has `min-height: 190px`) before the rest scrolls — tune against the real rendered height if it feels off.

## Constraints
- Do NOT add `max-height`/`overflow-y` to `.trusted__grid` outside the `max-width: 640px` media query — the 2-column (≤900px) and 5-column (default) layouts must stay unbounded/unscrolled, exactly as they are now.
- Don't touch `.trusted-card:last-child` grid-column overrides already in those media blocks.
- No JS changes required.

## Verify
- At ≥901px: 5-column grid, no scroll, unchanged.
- At 641–900px: 2-column grid, no scroll, unchanged.
- At ≤640px: single-column, full-width cards, capped height, internal scroll for cards beyond the first ~2.
