import { useEffect } from "react";
import { Music2 } from "lucide-react";

// HOW TO ACTIVATE THIS COMPONENT:
// 1. Go to https://www.sociablekit.com/tiktok-feed-widget/ and sign up (free tier, no credit card)
// 2. Connect/enter your TikTok profile @kavaxpyramids to create a new TikTok feed widget
// 3. Click "Embed on website" and copy the Embed ID shown in the generated snippet
// 4. Paste the Embed ID into SOCIABLEKIT_EMBED_ID below
// 5. That's it — the feed will auto-refresh whenever you post on TikTok

const SOCIABLEKIT_EMBED_ID = "25695197";

export default function TikTokFeed() {
  useEffect(() => {
    if (!SOCIABLEKIT_EMBED_ID) return;

    // Dynamically load the SociableKit widget script once (avoids duplicate loads)
    if (!document.querySelector('script[src*="sociablekit.com"]')) {
      const script = document.createElement("script");
      script.src = "https://widgets.sociablekit.com/tiktok-feed/widget.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  if (!SOCIABLEKIT_EMBED_ID) {
    return (
      <div className="social-feed social-feed--placeholder">
        <div className="social-feed__placeholder-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="social-feed__placeholder-item">
              <Music2 size={20} />
            </div>
          ))}
        </div>
        <p className="social-feed__setup-note">
          <Music2 size={14} />
          Connect <strong>@kavaxpyramids</strong> on{" "}
          <a href="https://www.sociablekit.com/tiktok-feed-widget/" target="_blank" rel="noreferrer">SociableKit</a>{" "}
          and paste your Embed ID into <code>TikTokFeed.jsx</code> to activate.
        </p>
      </div>
    );
  }

  return (
    <div className="social-feed">
      {/* SociableKit widget renders here once the script loads and finds this element */}
      <div className="sk-tiktok-feed" data-embed-id={SOCIABLEKIT_EMBED_ID} />
    </div>
  );
}
