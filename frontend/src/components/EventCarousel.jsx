import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Images, Calendar } from "lucide-react";
import { hoverLift, revealProps, EASE } from "../lib/motion";

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photos, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const move = (dir) => setIndex((i) => (i + dir + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const photo = photos[index];

  return (
    <div
      className="ec-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={photo.event_name}
      onClick={onClose}
    >
      <button className="ec-lightbox__close" onClick={onClose} aria-label="Close"><X /></button>
      <button className="ec-lightbox__prev" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous"><ChevronLeft /></button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.photo_url} alt={photo.event_name} />
        <figcaption>
          <small>{photo.event_name}</small>
          {photo.event_date && new Date(photo.event_date).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}
        </figcaption>
      </figure>
      <button className="ec-lightbox__next" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Next"><ChevronRight /></button>
    </div>
  );
}

// ── Carousel strip ────────────────────────────────────────────────────────────

const SCROLL_SPEED = 0.4; // px per ms — feels like a slow drift

function CarouselStrip({ photos, onPhotoClick, reduceMotion }) {
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const pausedRef = useRef(false);
  const posRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduceMotion || photos.length < 2) return;

    const step = (ts) => {
      if (!pausedRef.current) {
        posRef.current += SCROLL_SPEED;
        // Seamless loop: when we've scrolled half the total width (duplicated list), reset
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current -= half;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [photos, reduceMotion]);

  // Duplicate photos to make the loop seamless
  const items = photos.length >= 2 && !reduceMotion
    ? [...photos, ...photos]
    : photos;

  return (
    <div
      className="carousel__viewport"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={trackRef} className="carousel__track">
        {items.map((photo, i) => (
          <motion.button
            key={`${photo.id}-${i}`}
            className="carousel__thumb"
            onClick={() => onPhotoClick(i % photos.length)}
            {...hoverLift(reduceMotion)}
          >
            <img src={photo.thumb_url ?? photo.photo_url} alt={photo.event_name} loading="lazy" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function CarouselEmpty() {
  return (
    <div className="carousel__empty">
      <Images size={28} />
      <p>Photos coming soon — check back after the next event.</p>
    </div>
  );
}

// ── EventCarousel (public API) ────────────────────────────────────────────────

export default function EventCarousel({ group, delay = 0 }) {
  const reduceMotion = useReducedMotion();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { photos, event_name, event_date, cover } = group;

  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })
    : null;

  return (
    <motion.div className="event-carousel" {...revealProps(delay, reduceMotion)}>
      {/* ── Header — click to open full-screen grid ── */}
      <button
        className="event-carousel__header"
        onClick={() => setExpanded(true)}
        aria-label={`View all photos from ${event_name}`}
      >
        {cover ? (
          <div className="event-carousel__cover">
            <img src={cover.thumb_url ?? cover.photo_url} alt={event_name} />
            <div className="event-carousel__cover-overlay" />
          </div>
        ) : (
          <div className="event-carousel__cover event-carousel__cover--empty">
            <Images size={32} />
          </div>
        )}
        <div className="event-carousel__meta">
          <p className="section-label">{formattedDate ?? "Event"}</p>
          <h3>{event_name}</h3>
          <span className="event-carousel__count">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} — click to browse
          </span>
        </div>
      </button>

      {/* ── Scrolling strip ── */}
      {photos.length > 0 ? (
        <CarouselStrip
          photos={photos}
          onPhotoClick={setLightboxIndex}
          reduceMotion={!!reduceMotion}
        />
      ) : (
        <CarouselEmpty />
      )}

      {/* ── Full-screen grid overlay ── */}
      {expanded && (
        <div
          className="carousel__expanded-overlay"
          onClick={() => setExpanded(false)}
        >
          <button className="ec-lightbox__close" onClick={() => setExpanded(false)} aria-label="Close">
            <X />
          </button>
          <div className="carousel__expanded-grid" onClick={(e) => e.stopPropagation()}>
            <div className="carousel__expanded-heading">
              <p className="section-label">{formattedDate}</p>
              <h2>{event_name}</h2>
            </div>
            {photos.map((photo, i) => (
              <motion.button
                key={photo.id}
                className="carousel__expanded-thumb"
                onClick={() => { setExpanded(false); setLightboxIndex(i); }}
                {...revealProps(i * 0.03, !!reduceMotion)}
                {...hoverLift(!!reduceMotion)}
              >
                <img src={photo.thumb_url ?? photo.photo_url} alt={photo.event_name} loading="lazy" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </motion.div>
  );
}
