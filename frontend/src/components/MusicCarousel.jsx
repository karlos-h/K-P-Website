import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { supabase } from "../lib/supabase";
import { revealProps } from "../lib/motion";

// Fallback placeholders — shown only if the `mixes` table is unavailable or
// empty, so the section never renders blank.
const PLACEHOLDER_MIXES = [
  { id: "placeholder-1", title: "Club Set", genre: "Open Format", embed_url: null },
  { id: "placeholder-2", title: "Festival Set", genre: "Global Sounds", embed_url: null },
  { id: "placeholder-3", title: "Late Night", genre: "House", embed_url: null },
];

// Turns a plain soundcloud.com track link into SoundCloud's actual player
// embed URL. A bare soundcloud.com link can't be framed directly (SoundCloud
// sends frame-blocking headers on the track page itself), so this always
// wraps it — unless it's already a w.soundcloud.com/player URL, in which case
// it's used as-is. Done in code because `embed_url` gets plain track links
// pasted straight from the browser address bar.
export function toSoundCloudEmbedSrc(trackUrl) {
  if (!trackUrl) return null;
  if (trackUrl.includes("w.soundcloud.com/player")) return trackUrl;

  const params = new URLSearchParams({
    url: trackUrl,
    color: "#c9a84c", // site gold, matches --gold in global.css
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "false",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

export default function MusicCarousel() {
  const [mixes, setMixes] = useState(PLACEHOLDER_MIXES);
  const reduceMotion = useReducedMotion();
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase.from("mixes").select("*").order("created_at");
      if (!cancelled && data && data.length > 0) setMixes(data);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="music-carousel">
      <button
        type="button"
        className="music-carousel__arrow music-carousel__arrow--prev"
        onClick={() => scrollByPage(-1)}
        aria-label="Previous mixes"
      >
        <ChevronLeft />
      </button>
      <div className="music-carousel__track" ref={trackRef}>
        {mixes.map((mix, index) => {
          const embedSrc = toSoundCloudEmbedSrc(mix.embed_url);
          return (
            <motion.article
              className="music-card"
              key={mix.id || mix.title}
              {...revealProps(index * 0.08, reduceMotion)}
            >
              <div className="music-card__art">
                <Headphones size={34} />
                <span>Mix 0{index + 1}</span>
              </div>
              <div className="music-card__body">
                <p>{mix.genre}</p>
                <h3>{mix.title}</h3>
                {embedSrc ? (
                  <iframe
                    title={`${mix.title} SoundCloud player`}
                    width="100%"
                    height="120"
                    scrolling="no"
                    frameBorder="no"
                    allow="autoplay"
                    loading="lazy"
                    src={embedSrc}
                  />
                ) : (
                  <p className="music-card__pending">Player coming soon</p>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
      <button
        type="button"
        className="music-carousel__arrow music-carousel__arrow--next"
        onClick={() => scrollByPage(1)}
        aria-label="Next mixes"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
