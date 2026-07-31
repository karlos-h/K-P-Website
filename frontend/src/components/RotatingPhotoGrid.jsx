import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { trapTab } from "../lib/focusTrap";
import { EASE, revealProps } from "../lib/motion";

// A fixed mosaic of tiles that quietly swaps one photo at a time, cycling the
// whole event archive through a layout that never moves. The stillness of the
// grid is the point — the wall breathes, it doesn't slideshow.

const ROTATE_MS = 2800;
const FADE_S = 0.7;
const ENTRANCE_MS = 1200; // longest tile stagger (8 * 0.06s = 0.48s) plus the 0.7s reveal
// Matches the `amount` in revealProps' viewport config, so the entrance and the
// rotation clock trigger off the same threshold rather than drifting apart.
const IN_VIEW_AMOUNT = 0.2;
const PRELOAD_TIMEOUT_MS = 1500;

// Slot counts per breakpoint. The spans live in CSS (.photo-grid__tile
// nth-child rules); JS only needs to know how many tiles exist to rotate them.
const DESKTOP_SLOTS = 9;
const TABLET_SLOTS = 6;
const MOBILE_SLOTS = 4;

const DESKTOP_QUERY = "(min-width: 1024px)";
const TABLET_QUERY = "(min-width: 640px)";

// Fisher-Yates on a copy — the arrays handed in come from hook state and must
// not be mutated.
function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatEventDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
}

const thumbOf = (photo) => photo.thumb_url ?? photo.photo_url;

// Resolve the src before the crossfade starts, so a slow image can never leave
// a tile blank mid-fade. Errors and the timeout both resolve rather than reject:
// a broken URL should cost one dull swap, not stall the whole wall.
function preload(src) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    image.onload = finish;
    image.onerror = finish;
    image.src = src;
    setTimeout(finish, PRELOAD_TIMEOUT_MS);
  });
}

function readSlotCount() {
  if (typeof window === "undefined") return DESKTOP_SLOTS;
  if (window.matchMedia(DESKTOP_QUERY).matches) return DESKTOP_SLOTS;
  if (window.matchMedia(TABLET_QUERY).matches) return TABLET_SLOTS;
  return MOBILE_SLOTS;
}

function useSlotCount() {
  const [count, setCount] = useState(readSlotCount);

  useEffect(() => {
    const update = () => setCount(readSlotCount());
    const queries = [window.matchMedia(DESKTOP_QUERY), window.matchMedia(TABLET_QUERY)];
    queries.forEach((query) => query.addEventListener("change", update));

    update(); // the value read during the first render may already be stale
    return () => queries.forEach((query) => query.removeEventListener("change", update));
  }, []);

  return count;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
// Shares EventCarousel's `.ec-lightbox` styling — the site's one full-screen
// photo overlay treatment. This is the simpler half of it: no report flow, so
// the only focusable controls are close/prev/next.

function Lightbox({ photos, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const move = (dir) => setIndex((i) => (i + dir + photos.length) % photos.length);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      trapTab(e, dialogRef.current);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus starts inside the dialog so the trap has somewhere to hold it, and so
  // the first Tab doesn't jump to whatever followed the grid in the document.
  useEffect(() => { closeRef.current?.focus(); }, []);

  // Without this the page scrolls behind the overlay on wheel/touch.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const photo = photos[index];
  const formatted = formatEventDate(photo.event_date);

  return (
    <div
      ref={dialogRef}
      className="ec-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={photo.event_name}
      onClick={onClose}
    >
      <button ref={closeRef} className="ec-lightbox__close" onClick={onClose} aria-label="Close"><X /></button>
      <button
        className="ec-lightbox__prev"
        onClick={(e) => { e.stopPropagation(); move(-1); }}
        aria-label="Previous"
      >
        <ChevronLeft />
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.photo_url} alt={photo.event_name} />
        <figcaption>
          <small>{photo.event_name}</small>
          {formatted}
        </figcaption>
      </figure>
      <button
        className="ec-lightbox__next"
        onClick={(e) => { e.stopPropagation(); move(1); }}
        aria-label="Next"
      >
        <ChevronRight />
      </button>
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────

export default function RotatingPhotoGrid({ photos }) {
  const reduceMotion = useReducedMotion();
  const slotCount = useSlotCount();

  // Shuffled once per source array rather than per render: the wall should look
  // different on every visit but must never reshuffle while it's on screen.
  // A ref rather than useMemo because the shuffle isn't idempotent — StrictMode's
  // double render would produce two different orders, and the second one landing
  // mid-mount leaves every tile crossfading out of a photo it never showed.
  const shuffleRef = useRef({ source: null, list: [] });
  if (shuffleRef.current.source !== photos) {
    shuffleRef.current = { source: photos, list: shuffle(photos) };
  }
  const pool = shuffleRef.current.list;
  const visibleCount = Math.min(slotCount, pool.length);

  // Seeded during the first render rather than in an effect: useInView below
  // only ever observes what its ref points at when its effect runs, and an
  // empty first render (returning null) would leave it with nothing to watch
  // and rotation permanently unarmed.
  const [slots, setSlots] = useState(() => pool.slice(0, visibleCount));
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [started, setStarted] = useState(false);

  const gridRef = useRef(null);
  const slotsRef = useRef([]);
  const slotOrderRef = useRef([]);
  const slotCursorRef = useRef(0);
  const poolCursorRef = useRef(visibleCount);
  const triggerRef = useRef(null);

  const inView = useInView(gridRef, { once: true, amount: IN_VIEW_AMOUNT });

  useEffect(() => { slotsRef.current = slots; }, [slots]);

  useEffect(() => {
    setSlots(pool.slice(0, visibleCount));
    slotOrderRef.current = [];
    slotCursorRef.current = 0;
    // Start hunting for candidates just past the photos already on the wall.
    poolCursorRef.current = visibleCount;
  }, [pool, visibleCount]);

  // Rotation waits out the entrance stagger so tiles aren't swapping while
  // they're still fading in. The clock starts when the grid scrolls into view,
  // not on mount: the tiles reveal on `whileInView`, and the gallery sits far
  // enough down the page that a mount-time timer would expire during initial
  // load — arming rotation before anyone has seen the entrance it was meant to
  // wait for. A visitor who never scrolls this far never starts it at all.
  useEffect(() => {
    if (!inView) return undefined;
    const timer = setTimeout(() => setStarted(true), ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [inView]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Nothing to rotate to when the pool can't outnumber the slots, and reduced
  // motion means the wall stays exactly as it first rendered.
  const canRotate = !reduceMotion && visibleCount > 0 && pool.length > visibleCount;
  const paused = !started || hovered || tabHidden || lightboxIndex !== null;

  useEffect(() => {
    if (!canRotate || paused) return undefined;

    let cancelled = false;
    let swapping = false;

    const tick = () => {
      // A preload that outruns the interval must not stack a second swap on
      // top of the first — the slot order would skip a turn.
      if (swapping) return;

      // Everything below is worked out as locals and committed only once the
      // swap actually lands. A pause landing mid-preload cancels the swap, and
      // cursors advanced up front would have spent the slot's turn and consumed
      // the photo without either ever reaching the screen — quietly breaking
      // the round-robin's promise that every slot gets its turn.

      // The same photo showing in two slots at once reads as a bug, so
      // candidates are checked against what's currently on the wall.
      const onScreen = new Set(slotsRef.current.map((photo) => photo.id));
      let candidate = null;
      let poolCursor = poolCursorRef.current;
      for (let step = 0; step < pool.length; step += 1) {
        const guess = pool[(poolCursorRef.current + step) % pool.length];
        if (!onScreen.has(guess.id)) {
          poolCursor = (poolCursorRef.current + step + 1) % pool.length;
          candidate = guess;
          break;
        }
      }
      if (!candidate) return;

      // Round-robin, not random: picking a slot at random lets one tile sit
      // untouched for minutes while another flickers. Every slot gets its turn,
      // then the order is reshuffled so the pattern never becomes readable.
      let slotOrder = slotOrderRef.current;
      let slotCursor = slotCursorRef.current;
      if (slotCursor >= slotOrder.length) {
        slotOrder = shuffle(Array.from({ length: visibleCount }, (_, i) => i));
        slotCursor = 0;
      }
      const slot = slotOrder[slotCursor];

      swapping = true;
      preload(thumbOf(candidate)).then(() => {
        swapping = false;
        if (cancelled) return;
        slotOrderRef.current = slotOrder;
        slotCursorRef.current = slotCursor + 1;
        poolCursorRef.current = poolCursor;
        setSlots((previous) => {
          const next = previous.slice();
          next[slot] = candidate;
          return next;
        });
      });
    };

    const interval = setInterval(tick, ROTATE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canRotate, paused, pool, visibleCount]);

  const openLightbox = (photo, trigger) => {
    const index = pool.findIndex((item) => item.id === photo.id);
    if (index === -1) return;
    triggerRef.current = trigger;
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    triggerRef.current?.focus();
  }, []);

  if (slots.length === 0) return null;

  return (
    <>
      <div
        ref={gridRef}
        className="photo-grid"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {slots.map((photo, slotIndex) => (
          <motion.button
            // Keyed by slot, not photo: the tile is a fixed frame that outlives
            // whatever is currently inside it.
            key={slotIndex}
            className="photo-grid__tile"
            onClick={(event) => openLightbox(photo, event.currentTarget)}
            aria-label={`${photo.event_name} — open gallery`}
            {...revealProps(slotIndex * 0.06, reduceMotion)}
            // hoverLift() carries its timing in a top-level `transition`, which
            // would clobber the entrance delay above. Same values, nested into
            // the variants so both animations keep their own timing.
            {...(reduceMotion ? {} : {
              whileHover: { scale: 1.035, transition: { duration: 0.35, ease: EASE } },
              whileTap: { scale: 0.985, transition: { duration: 0.35, ease: EASE } },
            })}
          >
            <AnimatePresence mode="sync" initial={false}>
              <motion.img
                key={photo.id}
                className="photo-grid__img"
                src={thumbOf(photo)}
                alt=""
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: FADE_S, ease: EASE }}
              />
            </AnimatePresence>
            <span className="photo-grid__scrim" aria-hidden="true" />
            <span className="photo-grid__label" aria-hidden="true">
              <small>{formatEventDate(photo.event_date) ?? "Kava & Pyramids"}</small>
              <strong>{photo.event_name}</strong>
            </span>
          </motion.button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox photos={pool} startIndex={lightboxIndex} onClose={closeLightbox} />
      )}
    </>
  );
}
