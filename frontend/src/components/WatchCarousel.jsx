import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Youtube } from "lucide-react";
import { supabase } from "../lib/supabase";
import { hoverLift, revealProps } from "../lib/motion";

// Fallback placeholder videos — shown until the `videos` table has real rows.
// Replace via the DB: insert into videos (title, genre, youtube_id, published_date, sort_order).
// To get a video ID: open the video on YouTube, copy the part after "?v=" in the URL.
const PLACEHOLDER_VIDEOS = [
  { id: "placeholder-1", title: "Live Set — Original Sin", genre: "Club Night", youtube_id: null, published_date: null },
  { id: "placeholder-2", title: "Fiji Tour 2025", genre: "International", youtube_id: null, published_date: null },
  { id: "placeholder-3", title: "Rolling Meadows Festival", genre: "Festival", youtube_id: null, published_date: null },
];

// Newest → oldest by published_date. Undated videos sort last (they fall back to
// sort_order for a stable, hand-orderable position). Works whether or not the
// published_date column exists yet, so it degrades gracefully before the
// migration is applied — missing dates simply become undated.
function sortByNewest(videos) {
  return [...videos].sort((a, b) => {
    const timeA = a.published_date ? new Date(a.published_date).getTime() : NaN;
    const timeB = b.published_date ? new Date(b.published_date).getTime() : NaN;
    const safeA = Number.isNaN(timeA) ? -Infinity : timeA;
    const safeB = Number.isNaN(timeB) ? -Infinity : timeB;
    if (safeB !== safeA) return safeB - safeA;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function VideoCard({ video, delay, reduceMotion, isActive, onPlay }) {
  const hasVideo = Boolean(video.youtube_id);
  const dateLabel = formatDate(video.published_date);

  return (
    <motion.article className="video-card" {...revealProps(delay, reduceMotion)}>
      <motion.div className="video-card__frame" {...(hasVideo ? hoverLift(reduceMotion) : {})}>
        {hasVideo && isActive ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div
            className={`video-card__thumb ${hasVideo ? "video-card__thumb--clickable" : ""}`}
            onClick={() => hasVideo && onPlay()}
            onKeyDown={(event) => {
              if (hasVideo && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onPlay();
              }
            }}
            role={hasVideo ? "button" : undefined}
            tabIndex={hasVideo ? 0 : undefined}
            aria-label={hasVideo ? `Play ${video.title}` : undefined}
            style={
              hasVideo
                ? { backgroundImage: `url(https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg)` }
                : undefined
            }
          >
            {hasVideo ? (
              <span className="play-button"><Play fill="currentColor" size={28} /></span>
            ) : (
              <div className="video-card__placeholder">
                <Youtube size={28} />
                <p>Coming soon</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <div className="video-card__body">
        <p className="section-label" style={{ marginBottom: "0.35rem" }}>{video.genre}</p>
        <h3>{video.title}</h3>
        {dateLabel && <p className="video-card__date">{dateLabel}</p>}
        {hasVideo && (
          <a
            className="text-link"
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            target="_blank"
            rel="noreferrer"
          >
            Watch on YouTube
          </a>
        )}
      </div>
    </motion.article>
  );
}

export default function WatchCarousel() {
  const [videos, setVideos] = useState(PLACEHOLDER_VIDEOS);
  const [activeId, setActiveId] = useState(null);
  const reduceMotion = useReducedMotion();
  const trackRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    const fetchVideos = async () => {
      const { data } = await supabase.from("videos").select("*");
      if (data && data.length > 0) setVideos(data);
    };
    fetchVideos();
  }, []);

  // Newest first. Sorted here (not relying on DB/array order) so re-ordering
  // rows or adding a video later can't silently break the intended order.
  const sortedVideos = useMemo(() => sortByNewest(videos), [videos]);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="watch-carousel">
      <button
        type="button"
        className="watch-carousel__arrow watch-carousel__arrow--prev"
        onClick={() => scrollByPage(-1)}
        aria-label="Previous videos"
      >
        <ChevronLeft />
      </button>
      <div className="watch-carousel__track" ref={trackRef}>
        {sortedVideos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            delay={index * 0.06}
            reduceMotion={reduceMotion}
            isActive={activeId === video.id}
            onPlay={() => setActiveId(video.id)}
          />
        ))}
      </div>
      <button
        type="button"
        className="watch-carousel__arrow watch-carousel__arrow--next"
        onClick={() => scrollByPage(1)}
        aria-label="Next videos"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
