import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Youtube } from "lucide-react";
import { supabase } from "../lib/supabase";
import { hoverLift, revealProps } from "../lib/motion";

// K&P YouTube channel. A channel's "uploads" playlist is its channel ID with
// the leading "UC" swapped for "UU" — a stable YouTube convention that lets us
// pull the latest uploads with a single cheap playlistItems call (1 quota unit)
// instead of the expensive search endpoint (100 units).
const YOUTUBE_CHANNEL_ID = "UCKZqaAXvlPHU6sUEgQ7wfrw";
const UPLOADS_PLAYLIST_ID = `UU${YOUTUBE_CHANNEL_ID.slice(2)}`;
const LATEST_COUNT = 5;

// Read-only, public-data API key. It is HTTP-referrer restricted to our own
// domain in Google Cloud, so although it ships in the client bundle it only
// works when called from this site. Supplied via VITE_YOUTUBE_API_KEY (set in
// Netlify env). When absent, the carousel falls back to curated Supabase rows.
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// Fallback placeholders — shown only if both the YouTube feed and the curated
// `videos` table are unavailable, so the section never renders empty/broken.
const PLACEHOLDER_VIDEOS = [
  { id: "placeholder-1", title: "Live Set — Original Sin", genre: "Club Night", youtube_id: null, published_date: null },
  { id: "placeholder-2", title: "Fiji Tour 2025", genre: "International", youtube_id: null, published_date: null },
  { id: "placeholder-3", title: "Rolling Meadows Festival", genre: "Festival", youtube_id: null, published_date: null },
];

// Newest → oldest by published_date. Undated videos sort last (they fall back to
// sort_order for a stable, hand-orderable position). Works whether the date is
// an ISO datetime (YouTube) or a plain date (Supabase column).
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

// Map a YouTube Data API playlistItem into the card shape used below.
function mapPlaylistItem(item) {
  const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
  if (!videoId) return null;
  const snippet = item.snippet || {};
  const thumbs = snippet.thumbnails || {};
  const thumbnail = (thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || {}).url || null;
  return {
    id: videoId,
    title: snippet.title || "Untitled",
    genre: null, // YouTube gives no genre; the date label carries context instead
    youtube_id: videoId,
    published_date: snippet.publishedAt || null,
    thumbnail,
  };
}

// Latest uploads, live from YouTube. Returns [] when no key is configured so
// the caller can fall through to the curated list.
async function fetchLatestFromYouTube() {
  if (!YOUTUBE_API_KEY) return [];
  const url =
    "https://www.googleapis.com/youtube/v3/playlistItems" +
    "?part=snippet,contentDetails" +
    `&maxResults=${LATEST_COUNT}` +
    `&playlistId=${UPLOADS_PLAYLIST_ID}` +
    `&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API responded ${res.status}`);
  const json = await res.json();
  return (json.items || []).map(mapPlaylistItem).filter(Boolean);
}

function VideoCard({ video, delay, reduceMotion, isActive, onPlay }) {
  const hasVideo = Boolean(video.youtube_id);
  const dateLabel = formatDate(video.published_date);
  const thumb =
    video.thumbnail || (hasVideo ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg` : null);

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
            style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
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
        {video.genre && <p className="section-label" style={{ marginBottom: "0.35rem" }}>{video.genre}</p>}
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
    let cancelled = false;

    const load = async () => {
      // 1) Preferred: the channel's latest uploads, live from YouTube.
      try {
        const latest = await fetchLatestFromYouTube();
        if (!cancelled && latest.length > 0) {
          setVideos(latest);
          return;
        }
      } catch (error) {
        console.warn("YouTube feed unavailable — falling back to curated videos.", error);
      }

      // 2) Fallback: curated rows in the Supabase `videos` table.
      if (supabase) {
        const { data } = await supabase.from("videos").select("*");
        if (!cancelled && data && data.length > 0) {
          setVideos(data);
          return;
        }
      }

      // 3) Otherwise keep the placeholder set already in state.
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Newest first. Sorted here (not relying on API/DB order) so the intended
  // order holds regardless of how the source returns rows.
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
