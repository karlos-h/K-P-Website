import { useEffect, useRef } from "react";
import { Instagram } from "lucide-react";

// HOW TO ACTIVATE THIS COMPONENT:
// 1. Go to https://behold.so and sign up (free tier available)
// 2. Connect your Instagram account @kava_pyramids
// 3. Create a new feed widget — copy the Feed ID shown in the embed code
// 4. Paste the Feed ID into BEHOLD_FEED_ID below
// 5. That's it — the feed will auto-refresh whenever you post on Instagram

const BEHOLD_FEED_ID = null; // <-- paste your Behold feed ID here, e.g. "abc123XYZ"

export default function SocialFeed() {
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!BEHOLD_FEED_ID) return;

    // Dynamically load the Behold widget script once (avoids duplicate loads)
    if (!document.querySelector('script[src*="behold.so"]')) {
      const script = document.createElement("script");
      script.src = "https://w.behold.so/widget.js";
      script.type = "module";
      document.head.appendChild(script);
    }
  }, []);

  if (!BEHOLD_FEED_ID) {
    return (
      <div className="social-feed social-feed--placeholder">
        <div className="social-feed__placeholder-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="social-feed__placeholder-item">
              <Instagram size={20} />
            </div>
          ))}
        </div>
        <p className="social-feed__setup-note">
          <Instagram size={14} />
          Connect <strong>@kava_pyramids</strong> on{" "}
          <a href="https://behold.so" target="_blank" rel="noreferrer">Behold.so</a>{" "}
          and paste your Feed ID into <code>SocialFeed.jsx</code> to activate.
        </p>
      </div>
    );
  }

  return (
    <div className="social-feed" ref={widgetRef}>
      {/* Behold widget renders here once the script loads and finds this element */}
      <behold-widget feed-id={BEHOLD_FEED_ID} />
    </div>
  );
}
