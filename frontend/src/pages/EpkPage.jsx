import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Mail, MapPin, Music2, Sparkles, X, FileText } from "lucide-react";
import { BOOKING_FEATURES, GENRES, EDGE_GENRES, RESIDENCIES, SOCIAL_LINKS, TIMELINE, VENUES } from "../data/siteData";
import { supabase } from "../lib/supabase";
import { revealProps } from "../lib/motion";

function EpkDownloadModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", venue: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError("Please fill in your name and email."); return; }
    setLoading(true);

    // Honeypot — skip the DB insert but still deliver the PDF so bots learn nothing.
    if (!form.website) {
      try {
        await supabase.from("epk_downloads").insert([{
          name: form.name,
          email: form.email,
          venue: form.venue || null,
        }]);
      } catch {
        // Non-blocking — log failure silently
      }
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
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                tabIndex="-1"
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />
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
  const reduceMotion = useReducedMotion();

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
            <motion.div style={{ textAlign: "center", padding: "3rem 0 2rem" }} {...revealProps(0, reduceMotion)}>
              <p className="section-label">Electronic Press Kit</p>
              <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", marginBottom: "1rem" }}>
                Kava &amp; Pyramids
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: "36rem", margin: "0 auto 2rem" }}>
                Open format DJ Duo · Christchurch, New Zealand<br />
                {GENRES.join(" · ")}
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="button button--gold" onClick={() => setShowModal(true)}>
                  <Download size={15} /> Download EPK PDF
                </button>
                <a className="button button--outline" href="mailto:kavapyramids@gmail.com">
                  <Mail size={15} /> Email Us
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bio */}
        <section className="section">
          <motion.div className="container container--narrow" {...revealProps(0, reduceMotion)}>
            <p className="section-label">Biography</p>
            <h2>Who We Are</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: "1.2rem" }}>
              Kava &amp; Pyramids are a DJ duo from Christchurch, New Zealand, formed from a friendship that
              started in 2018. They began DJing in 2023 and quickly built a reputation for
              high energy, open format sets that keep dancefloors moving from start to finish.
            </p>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: "1.2rem" }}>
              Their Fijian and Egyptian heritage sits at the core of what they do, <em>Kava</em> represents the
              ceremony, community, and warmth that happens on the dancefloor; <em>Pyramids</em> represents the
              ambition, craft, and endurance that goes into every set. Together they create something that feels
              both celebratory and intentional.
            </p>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
              Now they play out most weekends in Christchurch city as resident of the strip on Friday and Saturdays, 
              alongside festival stages and international performances across New Zealand, Fiji, and Australia. 
              The movement is growing.
            </p>
          </motion.div>
        </section>

        {/* Genres */}
        <section className="section section--dark">
          <motion.div className="container container--narrow" {...revealProps(0, reduceMotion)}>
            <p className="section-label">Sound</p>
            <h2>Genres &amp; Style</h2>
            <div className="genre-list" style={{ marginTop: "1.5rem" }}>
              {[...GENRES, ...EDGE_GENRES].map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <p className="section-label">Weekly Residencies</p>
              {RESIDENCIES.map((r) => (
                <p key={r.venue} style={{ color: "var(--muted)", display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.4rem" }}>
                  <Sparkles size={13} style={{ color: "var(--gold)", flexShrink: 0 }} />
                  <strong style={{ color: "var(--cream)" }}>{r.venue}</strong> — {r.night}
                </p>
              ))}
            </div>
            <div style={{ marginTop: "2rem", display: "grid", gap: "0.75rem" }}>
              {[
                "Crowd reading, open format sets",
                "Seamless mixing and transitions",
                "Peak time and warmup experience",
                "Adaptable to venue size and crowd demographic",
                "Professional setup and sound requirements provided on request",
              ].map((item) => (
                <p key={item} style={{ color: "var(--muted)", display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <Sparkles size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: "0.2rem" }} />
                  {item}
                </p>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Timeline */}
        <section className="section">
          <motion.div className="container container--narrow" {...revealProps(0, reduceMotion)}>
            <p className="section-label">Journey</p>
            <h2>The Story So Far</h2>
            <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
              {TIMELINE.map((entry, index) => (
                <motion.div
                  key={entry.year}
                  style={{ display: "grid", gridTemplateColumns: "3.5rem 1fr", gap: "1rem", alignItems: "start" }}
                  {...revealProps(index * 0.06, reduceMotion)}
                >
                  <strong style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{entry.year}</strong>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{entry.title}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{entry.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Gig History */}
        <section className="section section--dark gig-history">
          <motion.div className="container" {...revealProps(0, reduceMotion)}>
            <p className="section-label">Gig History</p>
            <h2>Every Stage, Every City</h2>
            <div className="gig-history__grid" style={{ marginTop: "2rem" }}>
              {VENUES.map((group, index) => (
                <motion.article key={group.country} {...revealProps(index * 0.1, reduceMotion)}>
                  <p className="section-label" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <MapPin size={12} /> {group.country}
                  </p>
                  {group.cities.map((city) => (
                    <p key={city} style={{ color: "var(--muted)", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                      {city}
                    </p>
                  ))}
                </motion.article>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Booking Features */}
        <section className="section">
          <motion.div className="container container--narrow" {...revealProps(0, reduceMotion)}>
            <p className="section-label">Why Book Us</p>
            <h2>What You Can Expect</h2>
            <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
              {BOOKING_FEATURES.map((f, index) => (
                <motion.div
                  key={f.title}
                  style={{ padding: "1.2rem 1.5rem", background: "var(--panel)", borderRadius: "0.5rem", borderLeft: "3px solid var(--gold)" }}
                  {...revealProps(index * 0.06, reduceMotion)}
                >
                  <p style={{ fontWeight: 600, marginBottom: "0.3rem" }}>{f.title}</p>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{f.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Social + Contact */}
        <section className="section section--dark">
          <motion.div className="container container--narrow" style={{ textAlign: "center" }} {...revealProps(0, reduceMotion)}>
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
          </motion.div>
        </section>
      </main>

      <footer>
        <p className="wordmark">KAVA &amp; PYRAMIDS</p>
        <p>Christchurch, New Zealand · kavapyramids@gmail.com</p>
        <div className="footer__links">
          <a href="/media-hub">Photo Hub</a>
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
        <small>© {new Date().getFullYear()} Kava &amp; Pyramids. All rights reserved.</small>
      </footer>

      {showModal && <EpkDownloadModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
