import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Images, Calendar, ExternalLink } from "lucide-react";
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
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current -= half;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [photos, reduceMotion]);

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

// ── External gallery footer ───────────────────────────────────────────────────

const MIN_EXTERNAL_PLACEHOLDERS = 6;

function ExternalGallerySection({ galleryUrl, photographerName, photographerUrl, placeholderGrid }) {
  const credit = photographerName
    ? (photographerUrl
        ? <a href={photographerUrl} target="_blank" rel="noopener noreferrer" className="carousel__photographer-link">{photographerName}</a>
        : <span>{photographerName}</span>)
    : null;

  return (
    <div className="carousel__external">
      {credit && (
        <p className="carousel__photographer-credit">Photography by {credit}</p>
      )}
      {placeholderGrid ? (
        <a
          href={galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="carousel__external-grid-link"
          aria-label="View full gallery"
        >
          <div className="carousel__external-grid">
            {Array.from({ length: MIN_EXTERNAL_PLACEHOLDERS }).map((_, i) => (
              <div key={i} className="carousel__external-grid-item">
                <Images size={20} />
              </div>
            ))}
          </div>
          <div className="carousel__external-grid-cta">
            View Full Gallery <ExternalLink size={13} />
          </div>
        </a>
      ) : (
        // Native photos already show real thumbnails above — this is just a
        // slim, full-width link out to the rest of the gallery, not a preview.
        <a
          href={galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="carousel__external-button"
        >
          View Full Gallery <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

// ── External-only card (no native photos) ────────────────────────────────────

function ExternalOnlyCard({ group, delay, reduceMotion }) {
  const { event_name, event_date, photo_gallery_url, photographer_name, photographer_url } = group;
  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <motion.div className="event-carousel event-carousel--external-only" {...revealProps(delay, reduceMotion)}>
      <div className="event-carousel__header event-carousel__header--static">
        <div className="event-carousel__cover event-carousel__cover--empty">
          <Images size={32} />
        </div>
        <div className="event-carousel__meta">
          <h3>{event_name}</h3>
          <p className="event-carousel__subtitle">{formattedDate ?? "Date TBC"}</p>
        </div>
      </div>
      <ExternalGallerySection
        galleryUrl={photo_gallery_url}
        photographerName={photographer_name}
        photographerUrl={photographer_url}
        coverPhoto={null}
        placeholderGrid
      />
    </motion.div>
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

  const {
    photos,
    event_name,
    event_date,
    cover,
    photo_gallery_url,
    photographer_name,
    photographer_url,
  } = group;

  const hasNative = photos && photos.length > 0;
  const hasExternal = !!photo_gallery_url;

  // External-only: no native photos but has a gallery URL
  if (!hasNative && hasExternal) {
    return (
      <ExternalOnlyCard
        group={group}
        delay={delay}
        reduceMotion={!!reduceMotion}
      />
    );
  }

  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
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
          <h3>{event_name}</h3>
          <p className="event-carousel__subtitle">{formattedDate ?? "Date TBC"}</p>
          <span className="event-carousel__count">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} — click to browse
          </span>
        </div>
      </button>

      {/* ── Scrolling strip ── */}
      {hasNative ? (
        <CarouselStrip
          photos={photos}
          onPhotoClick={setLightboxIndex}
          reduceMotion={!!reduceMotion}
        />
      ) : (
        <CarouselEmpty />
      )}

      {/* ── External gallery section (when native photos also exist) ── */}
      {hasExternal && (
        <ExternalGallerySection
          galleryUrl={photo_gallery_url}
          photographerName={photographer_name}
          photographerUrl={photographer_url}
        />
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
