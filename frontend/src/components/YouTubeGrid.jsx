import { useEffect, useState } from "react";
import { Play, Youtube } from "lucide-react";
import { supabase } from "../lib/supabase";

// Fallback placeholder videos — replace youtube_id values with real ones from YouTube Studio.
// To get a video ID: open the video on YouTube, copy the part after "?v=" in the URL.
// e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ  →  youtube_id: "dQw4w9WgXcQ"
const PLACEHOLDER_VIDEOS = [
  { id: 1, title: "Live Set — Original Sin", genre: "Club Night", youtube_id: null },
  { id: 2, title: "Fiji Tour 2025", genre: "International", youtube_id: null },
  { id: 3, title: "Rolling Meadows Festival", genre: "Festival", youtube_id: null },
];

function VideoCard({ video }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(video.youtube_id);

  return (
    <article className="video-card" data-reveal>
      <div className="video-card__frame">
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
      </div>
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
    </article>
  );
}

export default function YouTubeGrid() {
  const [videos, setVideos] = useState(PLACEHOLDER_VIDEOS);

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
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
