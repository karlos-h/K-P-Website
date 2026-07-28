import { useEffect, useRef, useState } from "react";
import { Download, Filter, Image, X, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import EventCarousel from "../components/EventCarousel";
import { useCombinedGalleries } from "../hooks/useCombinedGalleries";

const STORAGE_KEY = "kp_media_hub_email";

const MOCK_ASSETS = [
  { id: 1, event_name: "Original Sin", event_date: "2025-03-15", category: "Club Night", photo_url: "/gallery/crowd-energy.svg", thumb_url: "/gallery/crowd-energy.svg" },
  { id: 2, event_name: "Rolling Meadows Festival", event_date: "2025-01-20", category: "Festival", photo_url: "/gallery/festival.svg", thumb_url: "/gallery/festival.svg" },
  { id: 3, event_name: "Fiji Tour", event_date: "2025-06-10", category: "International", photo_url: "/gallery/travel.svg", thumb_url: "/gallery/travel.svg" },
  { id: 4, event_name: "Behind the Decks", event_date: "2025-04-05", category: "DJ Life", photo_url: "/gallery/dj-life.svg", thumb_url: "/gallery/dj-life.svg" },
  { id: 5, event_name: "Freshers Week", event_date: "2025-02-28", category: "University", photo_url: "/gallery/freshers.svg", thumb_url: "/gallery/freshers.svg" },
  { id: 6, event_name: "Wonderland Brisbane", event_date: "2026-06-27", category: "International", photo_url: "/gallery/brisbane.svg", thumb_url: "/gallery/brisbane.svg" },
];

function EmailGate({ onUnlock }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }

    // Honeypot — bots fill hidden fields; real users never see this one.
    if (website) {
      localStorage.setItem(STORAGE_KEY, email);
      onUnlock(email);
      return;
    }

    setLoading(true);
    try {
      await supabase.from("media_downloads").insert([{ email, accessed_at: new Date().toISOString() }]);
    } catch (_) {
      // Non-blocking — proceed even if Supabase isn't set up yet
    }
    localStorage.setItem(STORAGE_KEY, email);
    setLoading(false);
    onUnlock(email);
  };

  return (
    <div className="email-gate">
      <div className="email-gate__card">
        <span className="email-gate__icon"><Image size={32} /></span>
        <h2>Event Photo Hub</h2>
        <p>Browse and download photos from Kava &amp; Pyramids events. 
          Enter your email to unlock the gallery, no password needed.</p>
        <form onSubmit={handleSubmit}>
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
          <label>
            <span>Your Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
            />
          </label>
          {error && <p className="email-gate__error">{error}</p>}
          <button className="button button--gold" type="submit" disabled={loading}>
            {loading ? "Unlocking…" : "Unlock Gallery"}
          </button>
        </form>
        <p className="email-gate__disclaimer">
          <Mail size={12} /> We only use this to track download activity — no spam.
        </p>
      </div>
    </div>
  );
}

function Lightbox({ assets, index, onClose, onPrev, onNext }) {
  const asset = assets[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const handleDownload = async () => {
    const email = localStorage.getItem(STORAGE_KEY);
    try {
      await supabase.from("media_downloads").insert([{ email, photo_id: asset.id, event_name: asset.event_name, downloaded_at: new Date().toISOString() }]);
    } catch (_) {}

    const link = document.createElement("a");
    link.href = asset.photo_url;
    link.download = `kp-${asset.event_name.toLowerCase().replaceAll(" ", "-")}.jpg`;
    link.click();
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox__close" onClick={onClose}><X size={20} /></button>
        <button className="lightbox__prev" onClick={onPrev}><ChevronLeft size={24} /></button>
        <img src={asset.photo_url} alt={asset.event_name} />
        <button className="lightbox__next" onClick={onNext}><ChevronRight size={24} /></button>
        <div className="lightbox__info">
          <div>
            <strong>{asset.event_name}</strong>
            <span>{asset.event_date}</span>
          </div>
          <button className="button button--gold" onClick={handleDownload}>
            <Download size={15} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaHubPage() {
  const [unlockedEmail, setUnlockedEmail] = useState(() => localStorage.getItem(STORAGE_KEY));
  const { galleries, loading } = useCombinedGalleries();

  // Flat fallback when Supabase has no grouped data yet
  const [flatAssets, setFlatAssets] = useState(MOCK_ASSETS);
  useEffect(() => {
    supabase.from("media_assets").select("*").order("sort_order").then(({ data }) => {
      if (data && data.length > 0) setFlatAssets(data);
    });
  }, []);

  return (
    <div className="site-shell">
      <nav className="nav nav--scrolled">
        <a className="wordmark" href="/">K&amp;P</a>
        <div className="nav__links">
          <a href="/" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Back to Site</a>
          <a className="button button--gold nav__book" href="/#contact">Book Us</a>
        </div>
      </nav>

      {!unlockedEmail ? (
        <EmailGate onUnlock={setUnlockedEmail} />
      ) : (
        <main style={{ paddingTop: "5rem" }}>
          <section className="section">
            <div className="container">
              <div className="section-heading section-heading--left">
                <p className="section-label">Media Hub</p>
                <h2>Event Photo Gallery</h2>
                <p>Browse and download high-res photos from our events. Click any photo to view fullscreen.</p>
              </div>

              {loading ? (
                <p style={{ color: "var(--muted)", padding: "4rem 0" }}>Loading galleries…</p>
              ) : galleries.length > 0 ? (
                <div style={{ display: "grid", gap: "3rem" }}>
                  {galleries.map((group, i) => (
                    <EventCarousel key={group.slug} group={group} delay={i * 0.08} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", textAlign: "center", padding: "4rem 0" }}>
                  No event galleries yet — check back after our next event.
                </p>
              )}
            </div>
          </section>
        </main>
      )}

      <footer>
        <p className="wordmark">KAVA &amp; PYRAMIDS</p>
        <p>Christchurch, New Zealand · kavapyramids@gmail.com</p>
        <div className="footer__links">
          <a href="/epk">Press Kit</a>
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
        <small>© {new Date().getFullYear()} Kava &amp; Pyramids. All rights reserved.</small>
      </footer>
    </div>
  );
}
