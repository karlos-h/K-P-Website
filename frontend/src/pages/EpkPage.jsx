import { useState } from "react";
import { Download, Mail, MapPin, Music2, Sparkles, X, FileText } from "lucide-react";
import { SOCIAL_LINKS, TIMELINE, VENUES } from "../data/siteData";
import { supabase } from "../lib/supabase";

function EpkDownloadModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", venue: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError("Please fill in your name and email."); return; }
    setLoading(true);
    try {
      await supabase.from("epk_downloads").insert([{
        name: form.name,
        email: form.email,
        venue: form.venue || null,
      }]);
    } catch (_) {
      // Non-blocking — log failure silently
    }
    setLoading(false);
    setDone(true);
    // Trigger the PDF download
    const link = document.createElement("a");
    link.href = "/epk-download.pdf";
    link.download = "Kava-Pyramids-EPK.pdf";
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="email-gate__icon"><FileText size={28} /></span>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <h3>Download Starting</h3>
            <p style={{ marginBottom: "1.5rem" }}>
              Your EPK is downloading now. Feel free to reach out directly at{" "}
              <a href="mailto:kavapyramids@gmail.com" style={{ color: "var(--gold)" }}>kavapyramids@gmail.com</a>.
            </p>
            <button className="button button--gold" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h3>Download the EPK</h3>
            <p>Enter your details and the PDF will download automatically.</p>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem", marginTop: "0.5rem" }}>
              {[
                { key: "name",  label: "Your Name",       type: "text",  placeholder: "Jane Smith",          required: true  },
                { key: "email", label: "Email Address",    type: "email", placeholder: "jane@venue.com",      required: true  },
                { key: "venue", label: "Company / Venue",  type: "text",  placeholder: "The Venue (optional)", required: false },
              ].map(({ key, label, type, placeholder, required }) => (
                <label key={key} style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)" }}>
                    {label}{required ? "" : " (optional)"}
                  </span>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    required={required}
                    onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setError(""); }}
                  />
                </label>
              ))}
              {error && <p style={{ color: "#e05c5c", fontSize: "0.82rem", margin: 0 }}>{error}</p>}
              <button className="button button--gold" type="submit" disabled={loading} style={{ marginTop: "0.25rem" }}>
                {loading ? "Preparing…" : <><Download size={15} /> Download EPK PDF</>}
              </button>
            </form>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginTop: "0.75rem", marginBottom: 0 }}>
              <Mail size={12} style={{ verticalAlign: "middle", marginRight: "0.3rem" }} />
              Used for booking follow-up only — no spam.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function EpkPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="site-shell epk-page">
      <nav className="nav nav--scrolled">
        <a className="wordmark" href="/">K&amp;P</a>
        <div className="nav__links">
          <a href="/" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Back to Site</a>
          <a className="button button--gold nav__book" href="/#contact">Book Us</a>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>

        {/* Hero / Identity */}
        <section className="section section--dark">
          <div className="container container--narrow">
            <div style={{ textAlign: "center", padding: "3rem 0 2rem" }}>
              <p className="section-label">Electronic Press Kit</p>
              <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", marginBottom: "1rem" }}>
                Kava &amp; Pyramids
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: "36rem", margin: "0 auto 2rem" }}>
                Open-format DJ Duo · Christchurch, New Zealand<br />
                Hip-Hop · R&amp;B · Top 40 · Global Club
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="button button--gold" onClick={() => setShowModal(true)}>
                  <Download size={15} /> Download EPK PDF
                </button>
                <a className="button button--outline" href="mailto:kavapyramids@gmail.com">
                  <Mail size={15} /> Email Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="section">
          <div className="container container--narrow">
            <p className="section-label">Biography</p>
            <h2>Who We Are</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: "1.2rem" }}>
              Kava &amp; Pyramids are a DJ duo from Christchurch, New Zealand, formed from a friendship that
              started in high school in 2018. They began DJing in 2023 and quickly built a reputation for
              high-energy, open-format sets that keep dancefloors moving from start to finish.
            </p>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: "1.2rem" }}>
              Their Fijian and Egyptian heritage sits at the core of what they do — <em>Kava</em> represents the
              ceremony, community, and warmth that happens on the dancefloor; <em>Pyramids</em> represents the
              ambition, craft, and endurance that goes into every set. Together they create something that feels
              both celebratory and intentional.
            </p>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
              From grassroots nights at Christchurch venues to festival stages and international performances
              across New Zealand, Fiji, and Australia — the movement is growing.
            </p>
          </div>
        </section>

        {/* Genres */}
        <section className="section section--dark">
          <div className="container container--narrow">
            <p className="section-label">Sound</p>
            <h2>Genres &amp; Style</h2>
            <div className="genre-list" style={{ marginTop: "1.5rem" }}>
              {["Hip-Hop", "R&B", "Top 40", "Afrobeats", "Global Club", "Open Format"].map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
            <div style={{ marginTop: "2rem", display: "grid", gap: "0.75rem" }}>
              {[
                "Crowd-reading, open-format sets",
                "Seamless mixing and transitions",
                "Peak-time and warmup experience",
                "Adaptable to venue size and crowd demographic",
                "Professional setup and sound requirements provided on request",
              ].map((item) => (
                <p key={item} style={{ color: "var(--muted)", display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <Sparkles size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: "0.2rem" }} />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="section">
          <div className="container container--narrow">
            <p className="section-label">Journey</p>
            <h2>The Story So Far</h2>
            <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
              {TIMELINE.map((entry) => (
                <div key={entry.year} style={{ display: "grid", gridTemplateColumns: "3.5rem 1fr", gap: "1rem", alignItems: "start" }}>
                  <strong style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{entry.year}</strong>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{entry.title}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{entry.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gig History */}
        <section className="section section--dark">
          <div className="container">
            <p className="section-label">Gig History</p>
            <h2>Every Stage, Every City</h2>
            <div className="gig-history__grid" style={{ marginTop: "2rem" }}>
              {VENUES.map((group) => (
                <article key={group.region}>
                  <p className="section-label" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <MapPin size={12} /> {group.region}
                  </p>
                  {group.venues.map((venue) => (
                    <p key={venue} style={{ color: "var(--muted)", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                      {venue}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Features */}
        <section className="section">
          <div className="container container--narrow">
            <p className="section-label">Why Book Us</p>
            <h2>What You Can Expect</h2>
            <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
              {[
                { title: "High-Energy Crowd Engagement", desc: "Sets built around reading the room and keeping the floor moving." },
                { title: "Festival & University Experience", desc: "Proven across large student events, clubs, and festival stages." },
                { title: "International Experience", desc: "Performance history across New Zealand, Fiji, and Australia." },
                { title: "Professional Communication", desc: "Clear, responsive coordination from first enquiry to show day." },
                { title: "Versatile Open Format Sets", desc: "Hip-Hop, R&B, Top 40, and global club sounds shaped to the crowd." },
                { title: "Reliable & Easy To Work With", desc: "Prepared, punctual, adaptable, and focused on delivering the event." },
              ].map((f) => (
                <div key={f.title} style={{ padding: "1.2rem 1.5rem", background: "var(--panel)", borderRadius: "0.5rem", borderLeft: "3px solid var(--gold)" }}>
                  <p style={{ fontWeight: 600, marginBottom: "0.3rem" }}>{f.title}</p>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social + Contact */}
        <section className="section section--dark">
          <div className="container container--narrow" style={{ textAlign: "center" }}>
            <p className="section-label">Connect</p>
            <h2>Get In Touch</h2>
            <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
              For bookings, partnerships, press, and event enquiries:
            </p>
            <a className="button button--gold" href="mailto:kavapyramids@gmail.com" style={{ marginBottom: "2.5rem", display: "inline-flex" }}>
              <Mail size={15} /> kavapyramids@gmail.com
            </a>
            <div className="socials" style={{ justifyContent: "center" }}>
              {SOCIAL_LINKS.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noreferrer">
                  <Music2 size={15} /> {s.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p className="wordmark">KAVA &amp; PYRAMIDS</p>
        <p>Christchurch, New Zealand · kavapyramids@gmail.com</p>
        <small>© 2026 Kava &amp; Pyramids. All rights reserved.</small>
      </footer>

      {showModal && <EpkDownloadModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
