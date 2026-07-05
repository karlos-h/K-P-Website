import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Youtube } from "lucide-react";
import { supabase } from "../lib/supabase";
import { hoverLift, revealProps } from "../lib/motion";

// Fallback placeholder videos — replace youtube_id values with real ones from YouTube Studio.
// To get a video ID: open the video on YouTube, copy the part after "?v=" in the URL.
// e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ  →  youtube_id: "dQw4w9WgXcQ"
const PLACEHOLDER_VIDEOS = [
  { id: 1, title: "Live Set — Original Sin", genre: "Club Night", youtube_id: null },
  { id: 2, title: "Fiji Tour 2025", genre: "International", youtube_id: null },
  { id: 3, title: "Rolling Meadows Festival", genre: "Festival", youtube_id: null },
];

function VideoCard({ video, delay, reduceMotion }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(video.youtube_id);

  return (
    <motion.article
      className="video-card"
      {...revealProps(delay, reduceMotion)}
    >
      <motion.div className="video-card__frame" {...(hasVideo ? hoverLift(reduceMotion) : {})}>
        {hasVideo && playing ? (
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
            onClick={() => hasVideo && setPlaying(true)}
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

export default function YouTubeGrid() {
  const [videos, setVideos] = useState(PLACEHOLDER_VIDEOS);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .order("sort_order");
      if (data && data.length > 0) setVideos(data);
    };
    fetchVideos();
  }, []);

  return (
    <div className="youtube-grid">
      {videos.map((video, index) => (
        <VideoCard key={video.id} video={video} delay={index * 0.08} reduceMotion={reduceMotion} />
      ))}
    </div>
  );
}
