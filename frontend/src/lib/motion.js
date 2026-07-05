// src/lib/motion.js
// Shared framer-motion presets for the site's "cinematic reveal" language.
// Replaces the old IntersectionObserver + [data-reveal] CSS class pattern
// with real per-element entrance animation, while still respecting
// prefers-reduced-motion.

export const EASE = [0.22, 1, 0.36, 1];

// Standard fade-up used for individual elements and grid items.
// Pass an index-based delay (e.g. index * 0.08) to stagger a group.
export function revealProps(delay = 0, reduceMotion = false) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.7, delay, ease: EASE },
  };
}

// Slightly heavier scale+fade used for section-to-section transitions
// at a few key cinematic beats (hero -> movement, about -> heritage,
// press -> gig history) rather than every section.
export function sceneProps(delay = 0, reduceMotion = false) {
  return {
    initial: { opacity: 0, scale: 0.96 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, amount: 0.25 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.9, delay, ease: EASE },
  };
}

// Subtle hover lift used on interactive cards (gallery, video, feature cards).
export function hoverLift(reduceMotion = false) {
  if (reduceMotion) return {};
  return {
    whileHover: { scale: 1.035 },
    whileTap: { scale: 0.985 },
    transition: { duration: 0.35, ease: EASE },
  };
}
