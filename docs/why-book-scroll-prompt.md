# Claude Code prompt — For Promoters (why-book) capped scroll (mobile only)

Apply the same capped/scrollable treatment used on `.trusted__grid` (see
`docs/trusted-venues-scroll-prompt.md`) to the "For Promoters" feature-card
grid — ONLY at the breakpoint where cards go full-width single-column.

## Context
- `frontend/src/pages/HomePage.jsx` (~line 723): `<div className="why-book__grid">` maps over `BOOKING_FEATURES` (6 `.feature-card` items).
- `frontend/src/styles/global.css`:
  - Line 312: base `.why-book__grid { grid-template-columns: repeat(3, 1fr); ... }`
  - Line 363 (`@media (max-width: 900px)`): `.why-book__grid { grid-template-columns: repeat(2, 1fr); }` (shared rule with `.music__grid`)
  - Line 374 (`@media (max-width: 640px)`): `.why-book__grid { grid-template-columns: 1fr; }` (shared rule with `.trusted__grid`, `.music__grid`, `.heritage__grid`) ← breakpoint where each card spans full device width.

## Change
CSS-only, no JSX/state changes. `.feature-card` has `min-height: 245px` (taller than `.trusted-card`'s 190px), so use a larger cap sized for ~2 full cards.

Inside the existing `@media (max-width: 640px)` block in `global.css`, add a scoped rule for `.why-book__grid` (don't touch the shared `grid-template-columns: 1fr` line used by other grids — add a separate rule right after it):

```css
@media (max-width: 640px) {
  .why-book__grid {
    max-height: 34rem;
    overflow-y: auto;
    padding-right: .5rem;
    scrollbar-width: thin;
    scrollbar-color: var(--gold) #111;
  }
  .why-book__grid::-webkit-scrollbar { width: 4px; }
  .why-book__grid::-webkit-scrollbar-track { background: #111; }
  .why-book__grid::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 2px; }
}
```

`max-height: 34rem` targets ~2 full feature cards before the rest scrolls — tune against real rendered height if it feels off (card text can wrap to different heights depending on content length).

## Constraints
- Do NOT add `max-height`/`overflow-y` to `.why-book__grid` outside the `max-width: 640px` media query — the 2-column (≤900px) and 3-column (default) layouts must stay unbounded/unscrolled.
- Don't change the shared `grid-template-columns: 1fr` rule at line 374 (it's shared with `.trusted__grid`, `.music__grid`, `.heritage__grid`) — add the scroll rule as its own separate block.
- No JS changes required.

## Verify
- At ≥901px: 3-column grid, no scroll, unchanged.
- At 641–900px: 2-column grid, no scroll, unchanged.
- At ≤640px: single-column, full-width cards, capped height (~2 cards visible), internal scroll for the rest.
