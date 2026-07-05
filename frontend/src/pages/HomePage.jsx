import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Globe2,
  Headphones,
  Instagram,
  Menu,
  Music2,
  Play,
  Radio,
  Sparkles,
  Ticket,
  Users,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import MediaGallery from "../components/MediaGallery";
import YouTubeGrid from "../components/YouTubeGrid";
import SocialFeed from "../components/SocialFeed";
import {
  BOOKING_FEATURES,
  GALLERY_ITEMS,
  GENRES,
  HIGHLIGHT_REEL_EMBED,
  LINKTREE_URL,
  RESIDENCIES,
  SOCIAL_LINKS,
  TIMELINE,
  VENUES,
} from "../data/siteData";
import { supabase } from "../lib/supabase";
import { revealProps, sceneProps } from "../lib/motion";

const NAV_LINKS = ["Home", "About", "Events", "Videos", "Gallery", "Press Kit", "Contact"];
const NAV_EXTERNAL = [
  { label: "Media Hub", href: "/media-hub" },
  { label: "EPK", href: "/epk" },
];

function useCountUp(target, duration = 1800, active = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, active]);

  return count;
}

function Container({ children, narrow = false }) {
  return <div className={`container${narrow ? " container--narrow" : ""}`}>{children}</div>;
}

function SectionLabel({ children, style }) {
  return <p className="section-label" style={style}>{children}</p>;
}

function SectionHeading({ label, title, copy, align = "left" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`section-heading section-heading--${align}`}
      {...revealProps(0, reduceMotion)}
    >
      <SectionLabel>{label}</SectionLabel>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </motion.div>
  );
}

function StatCard({ stat, active }) {
  const count = useCountUp(stat.value, 1800, active);
  return (
    <div className={`stat-card${active ? " stat-card--active" : ""}`}>
      <span className="stat-card__glow" aria-hidden="true" />
      <strong>{count.toLocaleString()}{stat.suffix}</strong>
      <span>{stat.label}</span>
    </div>
  );
}

function SocialIcon({ name }) {
  const icons = {
    Instagram,
    TikTok: Music2,
    SoundCloud: Radio,
    YouTube: Youtube,
  };
  const Icon = icons[name] || Music2;
  return <Icon size={17} aria-hidden="true" />;
}

// Picks the earliest upcoming event to feature in the "Next Up" block.
// Event dates are stored as free-text (e.g. "27 June 2026"), so a failed
// Date parse is pushed to the end rather than crashing the sort.
function pickNextEvent(events) {
  const upcoming = events.filter((event) => event.status === "upcoming");
  return upcoming
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      const safeA = Number.isNaN(timeA) ? Infinity : timeA;
      const safeB = Number.isNaN(timeB) ? Infinity : timeB;
      return safeA - safeB;
    })[0];
}

function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeTimeline, setActiveTimeline] = useState(0);
  const [eventTab, setEventTab] = useState("upcoming");
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    company: "",
    event: "",
    email: "",
    message: "",
  });
  const [formSent, setFormSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statsRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Supabase data
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState([]);
  const [trustedVenues, setTrustedVenues] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all dynamic data on mount
  useEffect(() => {
    const fetchData = async () => {
      const [eventsRes, statsRes, venuesRes, mixesRes] = await Promise.all([
        supabase.from("events").select("*").order("created_at", { ascending: false }),
        supabase.from("stats").select("*").order("sort_order"),
        supabase.from("trusted_venues").select("*").order("sort_order"),
        supabase.from("mixes").select("*").order("created_at"),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (venuesRes.data) setTrustedVenues(venuesRes.data);
      if (mixesRes.data) setMixes(mixesRes.data);
      setDataLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStatsVisible(true),
      { threshold: 0.35 },
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id.toLowerCase().replaceAll(" ", "-"))?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("enquiries")
        .insert([{
          name: contactForm.name,
          company: contactForm.company,
          event_type: contactForm.event,
          email: contactForm.email,
          message: contactForm.message,
        }]);

      if (!error) {
        setFormSent(true);
        setContactForm({ name: "", company: "", event: "", email: "", message: "" });
      } else {
        console.error("SUPABASE ERROR:", error);
        alert(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((event) => event.status === eventTab);
  const nextEvent = pickNextEvent(events);

  return (
    <div className="site-shell">
      <nav className={`nav ${scrollY > 60 ? "nav--scrolled" : ""}`}>
        <button className="wordmark" onClick={() => scrollTo("Home")} aria-label="Go to home">
          K&amp;P
        </button>
        <div className={`nav__links ${menuOpen ? "nav__links--open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <button key={link} onClick={() => scrollTo(link)}>
              {link}
            </button>
          ))}
          {NAV_EXTERNAL.map((item) => (
            <a key={item.label} href={item.href} className="nav__external-link">
              {item.label}
            </a>
          ))}
          <button className="button button--gold nav__book" onClick={() => scrollTo("Contact")}>
            Book Us
          </button>
        </div>
        <button
          className="nav__toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      <header id="home" className={`hero ${heroVideoFailed ? "hero--fallback" : ""}`}>
        {!heroVideoFailed && (
          <video
            className="hero__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/media/images/hero-fallback.jpg"
            onError={() => setHeroVideoFailed(true)}
          >
            <source src="/media/hero-video.mp4" type="video/mp4" />
          </video>
        )}
        <div className="hero__overlay" />
        <div className="hero__sweep" aria-hidden="true" />
        <div className="hero__grain" />
        <div
          className="hero__content"
          style={{
            opacity: Math.max(0, 1 - scrollY / 600),
            transform: `translateY(${scrollY * 0.25}px)`,
          }}
        >
          <p className="eyebrow">Christchurch · New Zealand</p>
          <h1>
            Kava <span>&amp; Pyramids</span>
          </h1>
          <p className="hero__tagline">CHCH to the World</p>
          <div className="hero__actions">
            <button className="button button--outline" onClick={() => scrollTo("Events")}>
              View Events
            </button>
            <button className="button button--gold" onClick={() => scrollTo("Contact")}>
              Book Us
            </button>
          </div>
        </div>
        <div className="hero__scroll">
          <span />
          Scroll
        </div>
      </header>

      <main>
        <motion.section className="movement section" {...sceneProps(0, prefersReducedMotion)}>
          <Container>
            <div className="movement__grid">
              <motion.div className="video-frame" {...revealProps(0, prefersReducedMotion)}>
                {HIGHLIGHT_REEL_EMBED.includes("VIDEO_ID") ? (
                  <div className="video-frame__placeholder">
                    <span className="play-button"><Play fill="currentColor" /></span>
                    <p>Highlight reel coming soon</p>
                    <small>Add a YouTube or Vimeo embed URL in siteData.js</small>
                  </div>
                ) : (
                  <iframe
                    src={HIGHLIGHT_REEL_EMBED}
                    title="Kava & Pyramids highlight reel"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                )}
              </motion.div>
              <motion.div {...revealProps(0.12, prefersReducedMotion)}>
                <SectionLabel>Watch the Movement</SectionLabel>
                <h2>See Why Crowds Keep Coming Back</h2>
                <div className="movement__beats">
                  <span>High-energy crowds.</span>
                  <span>Packed dancefloors.</span>
                  <span>Festival appearances.</span>
                  <span>International performances.</span>
                </div>
                <p>
                  From Christchurch clubs to stages across New Zealand, Fiji and Australia,
                  Kava &amp; Pyramids have built a reputation for unforgettable nights.
                </p>
                <a className="text-link" href="https://www.youtube.com/@KavaPyramids" target="_blank" rel="noreferrer">
                  Watch Full Sets <ArrowRight size={16} />
                </a>
              </motion.div>
            </div>
          </Container>
        </motion.section>

        <section className="stats" ref={statsRef}>
          <Container>
            <div className="stats__grid">
              {dataLoading
                ? null
                : stats.map((stat) => (
                    <StatCard stat={stat} active={statsVisible} key={stat.label} />
                ))
            }
            </div>
          </Container>
        </section>

        <section className="trusted section section--compact">
          <Container>
            <SectionHeading label="Trusted By" title="Stages That Know Our Energy" align="center" />
            <div className="trusted__grid">
              {trustedVenues.map((venue, index) => (
                <motion.article
                  className="trusted-card"
                  key={venue.name}
                  {...revealProps(index * 0.06, prefersReducedMotion)}
                >
                    <div className="trusted-card__mark">{venue.initials}</div>
                    <h3>{venue.name}</h3>
                    <p>{venue.type}</p>
                </motion.article>
                ))}
            </div>
          </Container>
        </section>

        {nextEvent && (
          <section className="featured-event">
            <Container>
              <motion.div className="featured-event__content" {...revealProps(0, prefersReducedMotion)}>
                <div>
                  <SectionLabel>Next Up</SectionLabel>
                  <h2>{nextEvent.title}</h2>
                  <p>{nextEvent.date} · {nextEvent.location}</p>
                </div>
                <div className="date-block">
                  <span><strong>{nextEvent.date}</strong>{nextEvent.type}</span>
                  <span>
                    <strong>{nextEvent.location.split(",").pop().trim()}</strong>
                    {nextEvent.location.split(",")[0].trim()}
                  </span>
                </div>
              </motion.div>
            </Container>
          </section>
        )}

        <section id="about" className="section about">
          <Container>
            <div className="about__grid">
              <motion.div {...revealProps(0, prefersReducedMotion)}>
                <SectionLabel>Our Story</SectionLabel>
                <h2>Two friends.<br /><span>One movement.</span></h2>
                <p>
                  They met in high school in 2018. Five years later, they found themselves in
                  Christchurch, both studying, both restless. DJing started as something to do.
                  It became something to build.
                </p>
                <p>
                  Fijian and Egyptian roots collide in a city at the bottom of the world,
                  creating a sound and presence that never fits neatly into one box.
                </p>
                <p>
                  That start in Christchurch high school hallways now plays out most weekends —
                  Kong Bar on Saturdays, Original Sin on Fridays, peak-time slots either way. In
                  2025 that reach grew to Fiji. In 2026, Australia.
                </p>
                <div className="residencies" aria-label="Current weekly residencies">
                  {RESIDENCIES.map((residency) => (
                    <span key={residency.venue}>
                      <strong>{residency.venue}</strong>
                      {residency.night}
                    </span>
                  ))}
                </div>
                <button className="button button--outline" onClick={() => scrollTo("Contact")}>
                  Book a Show
                </button>
              </motion.div>
              <motion.div className="timeline" {...revealProps(0.12, prefersReducedMotion)}>
                {TIMELINE.map((item, index) => (
                  <motion.button
                    className={`timeline__item ${activeTimeline === index ? "timeline__item--active" : ""}`}
                    key={item.year}
                    onClick={() => setActiveTimeline(index)}
                    {...revealProps(index * 0.06, prefersReducedMotion)}
                  >
                    <span>{item.year}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {activeTimeline === index && <p>{item.desc}</p>}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </Container>
        </section>

        <motion.section className="heritage section section--dark" {...sceneProps(0, prefersReducedMotion)}>
          <Container>
            <div className="heritage__grid">
              <motion.article {...revealProps(0, prefersReducedMotion)}>
                <SectionLabel>Fijian Heritage</SectionLabel>
                <h3>Kava</h3>
                <p>
                  Ceremony, community, and the spirit of the Pacific. Kava represents warmth,
                  connection, and bringing people together, exactly what happens on every dancefloor.
                </p>
              </motion.article>
              <motion.article {...revealProps(0.12, prefersReducedMotion)}>
                <SectionLabel>Egyptian Heritage</SectionLabel>
                <h3>Pyramids</h3>
                <p>
                  Monuments to ambition and craft. The name carries the belief that when something
                  is built with intention, it endures. That is the energy behind every set.
                </p>
              </motion.article>
            </div>
          </Container>
        </motion.section>

        <section id="events" className="section events">
          <Container>
            <SectionHeading
              label="Events"
              title="Upcoming & Past Highlights"
              copy="From home-city club nights to international festival stages."
            />
            <div className="tabs" role="tablist" aria-label="Event filters">
              {["upcoming", "past"].map((tab) => (
                <button
                  key={tab}
                  className={eventTab === tab ? "is-active" : ""}
                  onClick={() => setEventTab(tab)}
                  role="tab"
                  aria-selected={eventTab === tab}
                >
                  {tab === "upcoming" ? "Upcoming Events" : "Past Highlights"}
                </button>
              ))}
            </div>
            <div className="events__list">
              {filteredEvents.map((event, index) => (
                <motion.article
                  className="event-card"
                  key={event.title}
                  {...revealProps(index * 0.06, prefersReducedMotion)}
                >
                  <div className="event-card__date">
                    <CalendarDays size={18} />
                    <span>{event.date}</span>
                  </div>
                  <div>
                    <h3>{event.title}</h3>
                    <p>{event.location}</p>
                  </div>
                  <span className="pill">{event.type}</span>
                </motion.article>
              ))}
            </div>
          </Container>
        </section>

        <section id="listen" className="section section--dark music">
          <Container>
            <SectionHeading
              label="Listen"
              title="The Sound of Kava & Pyramids"
              copy="Open-format sets built for club rooms, festival fields, and everything between."
              align="center"
            />
            <div className="music__grid">
              {mixes.map((mix, index) => (
                <motion.article
                  className="music-card"
                  key={mix.title}
                  {...revealProps(index * 0.08, prefersReducedMotion)}
                >
                    <div className="music-card__art">
                    <Headphones size={34} />
                    <span>Mix 0{index + 1}</span>
                    </div>
                    <div className="music-card__body">
                    <p>{mix.genre}</p>
                    <h3>{mix.title}</h3>
                    <iframe
                        title={`${mix.title} SoundCloud player`}
                        width="100%"
                        height="120"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        loading="lazy"
                        src={mix.embed_url}
                    />
                    </div>
                </motion.article>
                ))}
            </div>
          </Container>
        </section>

        <section id="videos" className="section videos">
          <Container>
            <SectionHeading
              label="Watch"
              title="See the Sets"
              copy="Full sets, event recaps, and behind-the-scenes from Kava & Pyramids."
            />
            <YouTubeGrid />
            <motion.div
              style={{ textAlign: "center", marginTop: "3rem" }}
              {...revealProps(0, prefersReducedMotion)}
            >
              <a
                className="button button--outline"
                href="https://www.youtube.com/@KavaPyramids"
                target="_blank"
                rel="noreferrer"
              >
                <Youtube size={17} /> Subscribe on YouTube
              </a>
            </motion.div>
          </Container>
        </section>

        <section id="gallery" className="section gallery">
          <Container>
            <SectionHeading
              label="Gallery"
              title="On the Road"
              copy="Crowds, travel, festivals, and the moments between sets."
            />
            <MediaGallery items={GALLERY_ITEMS} />
            <motion.div className="media-hub-cta" {...revealProps(0, prefersReducedMotion)}>
              <div>
                <p className="section-label">Photo Hub</p>
                <h3>Download Event Photos</h3>
                <p>Promoters and media — browse and download high-res photos from our events.</p>
              </div>
              <a className="button button--gold" href="/media-hub">
                Open Photo Hub <ArrowRight size={16} />
              </a>
            </motion.div>
          </Container>
        </section>

        <section className="section section--dark social-feed-section">
          <Container>
            <SectionHeading
              label="Follow the Journey"
              title="@kava_pyramids"
              copy="Behind the decks, on the road, and every moment between. Follow us on Instagram."
              align="center"
            />
            <SocialFeed />
            <motion.div
              style={{ textAlign: "center", marginTop: "2.5rem" }}
              {...revealProps(0, prefersReducedMotion)}
            >
              <a
                className="button button--outline"
                href="https://www.instagram.com/kava_pyramids/"
                target="_blank"
                rel="noreferrer"
              >
                <Instagram size={17} /> Follow on Instagram
              </a>
            </motion.div>
          </Container>
        </section>

        <section className="section why-book">
          <Container>
            <SectionHeading
              label="For Promoters"
              title="Why Promoters Book Kava & Pyramids"
              copy="Big-stage energy backed by reliable, professional delivery."
              align="center"
            />
            <div className="why-book__grid">
              {BOOKING_FEATURES.map((feature, index) => {
                const icons = [Zap, Users, Globe2, Radio, Music2, Ticket];
                const Icon = icons[index];
                return (
                  <motion.article
                    className="feature-card"
                    key={feature.title}
                    {...revealProps(index * 0.06, prefersReducedMotion)}
                  >
                    <Icon size={25} />
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </Container>
        </section>

        <section id="press-kit" className="section section--dark press">
          <Container>
            <div className="press__grid">
              <motion.div {...revealProps(0, prefersReducedMotion)}>
                <SectionLabel>Press Kit</SectionLabel>
                <h2>For Promoters &amp; Media</h2>
                <p>
                  Kava &amp; Pyramids formed in 2023, building on a friendship that started in
                  Christchurch high school in 2018. They stepped onto the Christchurch scene in
                  2024, and by 2025 were holding weekly residencies at Original Sin and Kong Bar
                  alongside international shows in Fiji.
                </p>
                <p>
                  Known for high-energy, open-format sets across Hip-Hop, R&amp;B, Pop, and
                  Afrobeats — with an ear on current club sounds like Baile Funk, Miami Bass, and
                  Jersey Club — they read the room and keep it moving.
                </p>
                <div className="button-row">
                  <a className="button button--gold" href="/epk">
                    View Full EPK
                  </a>
                  <a className="button button--outline" href="mailto:kavapyramids@gmail.com">
                    Email Us
                  </a>
                </div>
              </motion.div>
              <motion.div className="press__details" {...revealProps(0.12, prefersReducedMotion)}>
                <SectionLabel>Known For</SectionLabel>
                {[
                  "High-energy crowd engagement",
                  "Seamless mixing and transitions",
                  "Peak-time set experience",
                  "University and festival shows",
                  "International performance history",
                ].map((item) => <p key={item}><Sparkles size={14} />{item}</p>)}
                <SectionLabel>Genres</SectionLabel>
                <div className="genre-list">
                  {GENRES.map((genre) => <span key={genre}>{genre}</span>)}
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        <motion.section id="gig-history" className="section gig-history" {...sceneProps(0, prefersReducedMotion)}>
          <Container>
            <SectionHeading label="Gig History" title="Every Stage, Every City" />
            <div className="gig-history__grid">
              {VENUES.map((group, index) => (
                <motion.article key={group.region} {...revealProps(index * 0.1, prefersReducedMotion)}>
                  <SectionLabel>{group.region}</SectionLabel>
                  {group.venues.map((venue) => <p key={venue}>{venue}</p>)}
                </motion.article>
              ))}
            </div>
          </Container>
        </motion.section>

        <section id="contact" className="section section--dark contact">
          <Container narrow>
            <SectionHeading
              label="Contact"
              title="Book Kava & Pyramids"
              copy="For bookings, event enquiries, and press, send the details below."
            />
            {formSent ? (
              <div className="form-success">
                <Sparkles />
                <h3>Enquiry Received</h3>
                <p>Thanks for reaching out. Your enquiry has been sent successfully and we'll get back to you as soon as possible.
                  You can also contact us directly via email if you have any urgent questions or additional information to share.
                </p>
                <a className="button button--gold" href="mailto:kavapyramids@gmail.com">Open Email</a>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {[
                    ["name", "Your Name", "text"],
                    ["company", "Company / Venue", "text"],
                    ["event", "Event Type", "text"],
                    ["email", "Email Address", "email"],
                  ].map(([name, label, type]) => (
                    <label key={name}>
                      <span>{label}</span>
                      <input
                        name={name}
                        type={type}
                        required
                        value={contactForm[name]}
                        onChange={(event) => setContactForm({ ...contactForm, [name]: event.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <label className="form-message">
                  <span>Message</span>
                  <textarea
                    name="message"
                    rows="5"
                    required
                    value={contactForm.message}
                    onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })}
                  />
                </label>
                <button
                  className="button button--gold form-submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Enquiry"}
                </button>
              </form>
            )}
            <div className="socials">
              {SOCIAL_LINKS.map((social) => (
                <a key={social.name} href={social.url} target="_blank" rel="noreferrer">
                  <SocialIcon name={social.name} />
                  {social.name}
                </a>
              ))}
            </div>
          </Container>
        </section>
      </main>

      <footer>
        <p className="wordmark">KAVA &amp; PYRAMIDS</p>
        <p>Christchurch, New Zealand · kavapyramids@gmail.com</p>
        <div className="footer__links">
          <a href="/media-hub">Photo Hub</a>
          <a href="/epk">Press Kit</a>
          <a href={LINKTREE_URL} target="_blank" rel="noreferrer">Linktree</a>
          {SOCIAL_LINKS.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
          ))}
        </div>
        <small>© 2026 Kava &amp; Pyramids. All rights reserved.</small>
        <a href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#2a2a2a', fontSize: '0.6rem' }}>·</a>
      </footer>
    </div>
  );
}

export default HomePage;
