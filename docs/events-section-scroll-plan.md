# Events Section — Capped/Scrollable Upcoming List

## Problem
The Events section (`frontend/src/pages/HomePage.jsx`, `#events`) has two tabs: "Upcoming Events" and "Past Highlights". The **Past** tab already renders inside a capped, internally-scrollable box (`events__list--scrollable`, `max-height: 19rem`). The **Upcoming** tab does not — it renders every upcoming event in an unbounded list, which is what's making the page unnecessarily long, especially as more events get added.

## Fix
Apply the same capped/scrollable treatment to the Upcoming tab that Past already uses, so both tabs behave identically. Applies at all breakpoints (not just mobile).

### 1. `frontend/src/pages/HomePage.jsx` (~line 531)
Currently:
```jsx
<div className={eventTab === "past" ? "events__list events__list--scrollable" : "events__list"}>
```
Change to always include the scrollable class regardless of tab:
```jsx
<div className="events__list events__list--scrollable">
```

### 2. `frontend/src/styles/global.css` (~line 270-274)
Existing rule:
```css
.events__list { display: grid; gap: .75rem; }
.events__list--scrollable { max-height: 19rem; overflow-y: auto; padding-right: .5rem; scrollbar-width: thin; scrollbar-color: var(--gold) #111; }
```
This `max-height: 19rem` works fine on desktop (event cards are a single compact row there, so ~19rem shows roughly 2 full cards). On mobile, `.event-card` switches to a stacked single-column layout (`grid-template-columns: 1fr`, see ~line 379) which makes each card noticeably taller — 19rem would only show about 1–1.5 cards before cutting off, not the intended "2 events visible."

Add a mobile override inside the existing `@media (max-width: 640px)` block so 2 full stacked cards are comfortably visible before the scroll cutoff:
```css
@media (max-width: 640px) {
  .events__list--scrollable { max-height: 27rem; }
}
```
(Tune this number against the real stacked card height once built — the goal is "2 full cards visible, third card peeking/cut off to signal there's more to scroll.")

### 3. Scroll affordance (nice-to-have, optional)
Since users may not immediately notice the list is scrollable, consider adding a subtle bottom fade/gradient overlay on `.events__list--scrollable` (a `::after` with a `linear-gradient` fading to the section background) so it's visually obvious more content exists below the fold of the box. Skip if it adds complexity — the visible partial 3rd card is often signal enough.

## Scope
This pass only touches the Events section. Gallery, Gig History, and Press sections are explicitly out of scope for now.

## Not changing
- Tab switching logic/behavior.
- Event data/sorting logic.
- Past tab behavior (already correct — just confirming Upcoming now matches it).
