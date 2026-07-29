import { useState } from "react";
import { Image, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import EventCarousel from "../components/EventCarousel";
import CrowdPovModal from "../components/CrowdPovModal";
import { useCombinedGalleries } from "../hooks/useCombinedGalleries";

const STORAGE_KEY = "kp_media_hub_email";
// Set when a returning visitor skips the gate. No email means nothing to log,
// so a skip never touches Supabase — it only needs to persist the unlock.
const SKIP_KEY = "kp_media_hub_skipped";

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
    } catch {
      // Non-blocking — proceed even if Supabase isn't set up yet
    }

    // Also add them to the mailing list so the signup is visible in the
    // admin dashboard (migration 024 allows source = 'media_hub' and makes
    // the name columns nullable). Anon has INSERT only — no UPDATE — so
    // .upsert() isn't available; a repeat visitor trips the unique index on
    // lower(email), which just means they're already subscribed.
    try {
      const { error } = await supabase.from("mailing_list").insert([{
        email,
        source: "media_hub",
        subscribed: true,
        first_name: null,
        last_name: null,
        event_title: null,
      }]);
      if (error && error.code !== "23505") throw error;
    } catch (err) {
      // Never block gallery access on a mailing-list write.
      console.error("media_hub mailing_list signup failed:", err);
    }

    localStorage.setItem(STORAGE_KEY, email);
    setLoading(false);
    onUnlock(email);
  };

  const handleSkip = () => {
    localStorage.setItem(SKIP_KEY, "true");
    onUnlock("skipped");
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
          <div className="email-gate__field">
            <Mail size={21} className="email-gate__field-icon" aria-hidden="true" />
            <input
              type="email"
              aria-label="Your email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
            />
            <button className="button button--gold email-gate__submit" type="submit" disabled={loading}>
              {loading ? "Unlocking…" : "Unlock Gallery"}
            </button>
          </div>
          {error && <p className="email-gate__error">{error}</p>}
        </form>
        <p className="email-gate__disclaimer">
          <Mail size={12} /> We'll add you to our mailing list for occasional gig
          announcements, and use this to track download activity. Unsubscribe any time.
        </p>
        <button type="button" className="email-gate__skip" onClick={handleSkip}>
          Already signed up? Skip →
        </button>
      </div>
    </div>
  );
}

export default function MediaHubPage() {
  const [unlockedEmail, setUnlockedEmail] = useState(
    () => localStorage.getItem(STORAGE_KEY) || (localStorage.getItem(SKIP_KEY) ? "skipped" : null)
  );
  // Lives outside the gate conditional below, so the submission flow works
  // whether or not the visitor has unlocked the gallery.
  const [crowdPovOpen, setCrowdPovOpen] = useState(false);
  const { galleries, loading } = useCombinedGalleries();

  return (
    <div className="site-shell">
      <nav className="nav nav--scrolled">
        <a className="wordmark" href="/">K&amp;P</a>
        <div className="nav__links">
          <a href="/" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Back to Site</a>
          <button type="button" onClick={() => setCrowdPovOpen(true)}>Crowd POV</button>
          <a className="button button--gold nav__book" href="/#contact">Book Us</a>
        </div>
      </nav>

      {crowdPovOpen && <CrowdPovModal onClose={() => setCrowdPovOpen(false)} />}

      {!unlockedEmail ? (
        <EmailGate onUnlock={setUnlockedEmail} />
      ) : (
        <main style={{ paddingTop: "5rem" }}>
          <section className="section">
            <div className="container">
              <div className="section-heading section-heading--left">
                <p className="section-label">Media Hub</p>
                <h2>Event Photo Gallery</h2>
                <p>Browse and download photos from our events. Click any photo to view fullscreen.</p>
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
