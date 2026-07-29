import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Images, Calendar, ExternalLink, Users, Flag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { hoverLift, revealProps, EASE } from "../lib/motion";

// ── Report throttling ─────────────────────────────────────────────────────────
// A report hides a photo on the first click with no identifying information
// asked for, so nothing stops someone walking the whole Crowd POV section and
// reporting every photo to take it dark. These two guards are a speed bump for
// that, not a security boundary — clearing storage or opening another browser
// defeats them, and that's accepted. What actually makes single-click hiding
// safe is that it's reversible: an admin restores with one click.

const REPORT_LOG_KEY = "kp_crowd_pov_reports";
const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
const REPORT_LIMIT = 5;
// Entries are kept well past the 24h rate window: the rolling count expires,
// but "you already reported this one" shouldn't come back tomorrow.
const REPORT_LOG_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function readReportLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_LOG_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - REPORT_LOG_TTL_MS;
    return parsed.filter(
      (entry) => entry && typeof entry.id === "string" && typeof entry.at === "number" && entry.at > cutoff
    );
  } catch {
    // Private-mode browsers and corrupted values both land here. Losing the
    // log just means the guards don't apply, which is the safe direction.
    return [];
  }
}

function writeReportLog(entries) {
  try {
    localStorage.setItem(REPORT_LOG_KEY, JSON.stringify(entries));
  } catch { /* storage full or blocked — the report itself still went through */ }
}

const REPORT_REASONS = [
  { value: "offensive", label: "Offensive or inappropriate" },
  { value: "no_consent", label: "I don't have permission for this photo" },
  { value: "other", label: "Other" },
];

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photos, startIndex, onClose, reportable = false }) {
  const [index, setIndex] = useState(startIndex);
  const move = (dir) => setIndex((i) => (i + dir + photos.length) % photos.length);

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("offensive");
  const [details, setDetails] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportError, setReportError] = useState("");
  const [log, setLog] = useState(readReportLog);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      // Don't let arrow keys flip photos while someone is typing their report.
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Moving to another photo should never carry a half-typed report with it.
  useEffect(() => {
    setReportOpen(false);
    setSubmitted(false);
    setReportError("");
    setDetails("");
    setReason("offensive");
  }, [index]);

  const photo = photos[index];
  const alreadyReported = log.some((entry) => entry.id === photo.id);
  const recentCount = log.filter((entry) => entry.at > Date.now() - REPORT_WINDOW_MS).length;
  const atLimit = recentCount >= REPORT_LIMIT;
  const blocked = alreadyReported || atLimit;

  // The photo is hidden the moment the report lands, so there's nothing left
  // to look at — close shortly after acknowledging it.
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [submitted, onClose]);

  const submitReport = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Honeypot — a bot fills the hidden field; show it the same thanks and
    // write nothing.
    if (website) { setSubmitted(true); return; }

    setSubmitting(true);
    setReportError("");

    // No .select() chained: anon may INSERT here but has no SELECT policy,
    // so asking for the row back would fail RLS (migration 036).
    const { error } = await supabase.from("crowd_photo_reports").insert([{
      crowd_photo_id: photo.id,
      reason,
      details: details.trim() || null,
    }]);

    if (error) {
      setReportError(`Couldn't send that report: ${error.message}`);
      setSubmitting(false);
      return;
    }

    const next = [...log, { id: photo.id, at: Date.now() }];
    writeReportLog(next);
    setLog(next);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div
      className="ec-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={photo.event_name}
      onClick={onClose}
    >
      <button className="ec-lightbox__close" onClick={onClose} aria-label="Close"><X /></button>
      {reportable && (
        <button
          className={`ec-lightbox__report${blocked ? " ec-lightbox__report--blocked" : ""}`}
          onClick={(e) => { e.stopPropagation(); setReportOpen((open) => !open); }}
          aria-label="Report this photo"
          aria-expanded={reportOpen}
          title={alreadyReported ? "You've already reported this photo" : "Report this photo"}
        >
          <Flag size={18} />
        </button>
      )}
      <button className="ec-lightbox__prev" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous"><ChevronLeft /></button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.photo_url} alt={photo.event_name} />
        <figcaption>
          <small>{photo.event_name}</small>
          {photo.event_date && new Date(photo.event_date).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}
        </figcaption>

        {reportable && reportOpen && (
          <div className="ec-report">
            {submitted ? (
              <p className="ec-report__done">Thanks — we'll take a look.</p>
            ) : alreadyReported ? (
              <p className="ec-report__note">You've already reported this photo.</p>
            ) : atLimit ? (
              <p className="ec-report__note">You've reported the maximum number of photos for now.</p>
            ) : (
              <form onSubmit={submitReport}>
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                />
                <label className="ec-report__label" htmlFor="ec-report-reason">
                  Report this photo
                </label>
                <select
                  id="ec-report-reason"
                  className="ec-report__select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REPORT_REASONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  className="ec-report__details"
                  placeholder="Anything else we should know? (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                />
                {reportError && <p className="ec-report__error">{reportError}</p>}
                <button className="ec-report__submit" type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send report"}
                </button>
                <p className="ec-report__fineprint">
                  Reported photos are hidden straight away while we take a look.
                </p>
              </form>
            )}
          </div>
        )}
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

    const step = () => {
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

// ── Crowd POV (approved visitor submissions) ─────────────────────────────────

// crowd_photos rows carry no event name or date of their own — they only point
// at an event_id. Reshape them into what Lightbox already expects rather than
// teaching Lightbox about a second row shape.
function toLightboxShape(crowdPhotos, eventName, eventDate) {
  return (crowdPhotos ?? []).map((photo) => ({
    id: photo.id,
    photo_url: photo.photo_url,
    event_name: eventName,
    event_date: eventDate,
  }));
}

// A still grid rather than another drifting strip: the stillness is the cue
// that these came from the crowd rather than from the hired photographer.
function CrowdPovSection({ photos, onPhotoClick, reduceMotion }) {
  return (
    <div className="carousel__crowd">
      <div className="carousel__crowd-header">
        <Users size={14} aria-hidden="true" />
        <span className="carousel__crowd-label">Crowd POV</span>
        <span className="carousel__crowd-note">Shot by people who were there</span>
      </div>
      <div className="carousel__crowd-grid">
        {photos.map((photo, i) => (
          <motion.button
            key={photo.id}
            className="carousel__expanded-thumb"
            onClick={() => onPhotoClick(i)}
            aria-label={`View crowd photo ${i + 1} of ${photos.length}`}
            {...revealProps(i * 0.03, reduceMotion)}
            {...hoverLift(reduceMotion)}
          >
            <img src={photo.photo_url} alt={photo.event_name} loading="lazy" />
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
  const [crowdIndex, setCrowdIndex] = useState(null);
  const crowdPhotos = toLightboxShape(group.crowdPhotos, event_name, event_date);
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

      {crowdPhotos.length > 0 && (
        <CrowdPovSection
          photos={crowdPhotos}
          onPhotoClick={setCrowdIndex}
          reduceMotion={reduceMotion}
        />
      )}

      {crowdIndex !== null && (
        <Lightbox
          photos={crowdPhotos}
          startIndex={crowdIndex}
          onClose={() => setCrowdIndex(null)}
          reportable
        />
      )}
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
  const [crowdIndex, setCrowdIndex] = useState(null);
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

  const crowdPhotos = toLightboxShape(group.crowdPhotos, event_name, event_date);

  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // The expanded overlay only ever shows native photos, so with none to show
  // the header would open an empty sheet. That was unreachable until crowd-only
  // groups existed; now it needs the same static treatment ExternalOnlyCard uses.
  const headerInner = (
    <>
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
      </div>
    </>
  );

  return (
    <motion.div className="event-carousel" {...revealProps(delay, reduceMotion)}>
      {/* ── Header — click to open full-screen grid ── */}
      {hasNative ? (
        <button
          className="event-carousel__header"
          onClick={() => setExpanded(true)}
          aria-label={`View all photos from ${event_name}`}
        >
          {headerInner}
        </button>
      ) : (
        <div className="event-carousel__header event-carousel__header--static">
          {headerInner}
        </div>
      )}

      {/* ── Scrolling strip ──
          "Photos coming soon" is only true when there is genuinely nothing to
          show. A crowd-only group (no native photos, no external gallery — the
          synthetic group useCombinedGalleries creates) renders its Crowd POV
          grid below, so the empty state would sit directly above a wall of
          photos and contradict it. */}
      {hasNative ? (
        <CarouselStrip
          photos={photos}
          onPhotoClick={setLightboxIndex}
          reduceMotion={!!reduceMotion}
        />
      ) : crowdPhotos.length === 0 ? (
        <CarouselEmpty />
      ) : null}

      {/* ── External gallery section (when native photos also exist) ── */}
      {hasExternal && (
        <ExternalGallerySection
          galleryUrl={photo_gallery_url}
          photographerName={photographer_name}
          photographerUrl={photographer_url}
        />
      )}

      {/* ── Crowd POV — approved visitor submissions ── */}
      {crowdPhotos.length > 0 && (
        <CrowdPovSection
          photos={crowdPhotos}
          onPhotoClick={setCrowdIndex}
          reduceMotion={!!reduceMotion}
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

      {/* Separate index so arrow-keying through crowd photos never wanders
          into the official set, and vice versa. Only this lightbox and the
          one in ExternalOnlyCard are reportable — the official photos are
          ours, so there is nothing for a visitor to report there. */}
      {crowdIndex !== null && (
        <Lightbox
          photos={crowdPhotos}
          startIndex={crowdIndex}
          onClose={() => setCrowdIndex(null)}
          reportable
        />
      )}
    </motion.div>
  );
}
