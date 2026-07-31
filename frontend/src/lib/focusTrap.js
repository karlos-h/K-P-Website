// src/lib/focusTrap.js
// Keyboard containment for the site's full-screen overlays. Without it Tab
// walks straight out of an open lightbox and into the page behind it, where
// every link and button is still reachable but no longer visible.

// Deliberately excludes tabindex="-1", which both lightboxes rely on for their
// honeypot inputs — those must stay unreachable.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Call from a keydown handler. Re-reads the container on every press rather
// than caching, because the overlays mount and unmount controls while open
// (the report form, its inputs, the submit button).
export function trapTab(event, container) {
  if (event.key !== "Tab" || !container) return;

  const focusable = [...container.querySelectorAll(FOCUSABLE)];
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  // Clicking the image itself leaves focus on <body>, which is outside the
  // dialog — the next Tab has to pull it back in rather than resume the page.
  const outside = !container.contains(active);

  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}
