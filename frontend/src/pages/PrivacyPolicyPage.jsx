import { motion, useReducedMotion } from "framer-motion";
import { Mail, Shield, Database, Users, ShieldCheck, BarChart3, ScrollText } from "lucide-react";
import { revealProps } from "../lib/motion";

// Set manually — only update this string when the policy content actually changes.
const LAST_UPDATED = "8 July 2026";

const THIRD_PARTIES = [
  { name: "Supabase", role: "Hosting, database, and file storage for this website." },
  { name: "Humanitix", role: "Ticketing for our shows, and the source of ticket-purchaser opt-ins synced to our mailing list." },
  { name: "Behold.so", role: "Powers the Instagram feed embedded on this site." },
  { name: "SociableKit", role: "Powers the TikTok feed embedded on this site." },
  { name: "YouTube", role: "Powers embedded video players." },
  { name: "SoundCloud", role: "Powers embedded audio players." },
];

function Section({ icon: Icon, label, title, children, dark }) {
  const reduceMotion = useReducedMotion();
  return (
    <section className={`section${dark ? " section--dark" : ""}`}>
      <motion.div className="container container--narrow" {...revealProps(0, reduceMotion)}>
        <p className="section-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Icon size={13} /> {label}
        </p>
        <h2>{title}</h2>
        <div style={{ color: "var(--muted)", lineHeight: 1.8 }}>{children}</div>
      </motion.div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="site-shell">
      <nav className="nav nav--scrolled">
        <a className="wordmark" href="/">K&amp;P</a>
        <div className="nav__links">
          <a href="/" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Back to Site</a>
          <a className="button button--gold nav__book" href="/#contact">Book Us</a>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>
        {/* Hero */}
        <section className="section section--dark">
          <div className="container container--narrow">
            <motion.div style={{ textAlign: "center", padding: "3rem 0 2rem" }} {...revealProps(0, reduceMotion)}>
              <p className="section-label">Legal</p>
              <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 3.5rem)", marginBottom: "1rem" }}>
                Privacy Policy
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto" }}>
                Kava &amp; Pyramids ("we", "us") respects your privacy. This policy explains what
                personal information we collect through this website, why, and your rights
                regarding it, under the New Zealand Privacy Act 2020.
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "1.25rem" }}>
                Last updated: {LAST_UPDATED}
              </p>
            </motion.div>
          </div>
        </section>

        {/* What we collect */}
        <Section icon={Database} label="Information" title="What We Collect">
          <p style={{ marginBottom: "1rem" }}>
            We collect your name, email, and related details you provide when you:
          </p>
          <ul style={{ display: "grid", gap: "0.6rem", paddingLeft: "1.2rem" }}>
            <li>Submit a booking enquiry through this site</li>
            <li>Request our EPK (Electronic Press Kit)</li>
            <li>Unlock the Media Hub photo gallery</li>
            <li>Purchase a ticket to one of our shows through Humanitix</li>
          </ul>
        </Section>

        {/* Why we collect it */}
        <Section icon={Shield} label="Purpose" title="Why We Collect It" dark>
          <p>
            We use this information to respond to enquiries and bookings, and to deliver the
            content you requested (such as the EPK or event photos). Only with your consent do we
            use it to send occasional updates about upcoming shows via our mailing list.
          </p>
        </Section>

        {/* Mailing list & marketing */}
        <Section icon={Mail} label="Marketing" title="Mailing List &amp; Marketing">
          <p style={{ marginBottom: "1rem" }}>
            We only add people to our mailing list with consent — either through direct sign-up,
            or, for ticket purchasers, an opt-in captured at checkout through Humanitix. You can
            ask to be removed at any time by emailing{" "}
            <a href="mailto:kavapyramids@gmail.com" style={{ color: "var(--gold)" }}>kavapyramids@gmail.com</a>.
          </p>
          <p>
            Any future marketing emails will identify us clearly and include an easy way to
            unsubscribe, per the Unsolicited Electronic Messages Act 2007.
          </p>
        </Section>

        {/* Third parties */}
        <Section icon={Users} label="Third Parties" title="Services We Use" dark>
          <p style={{ marginBottom: "1.25rem" }}>
            We rely on the following third-party services to run this site:
          </p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {THIRD_PARTIES.map((tp) => (
              <p key={tp.name} style={{ margin: 0 }}>
                <strong style={{ color: "var(--cream)" }}>{tp.name}</strong> — {tp.role}
              </p>
            ))}
          </div>
          <p style={{ marginTop: "1.25rem" }}>
            The embedded feeds and players above may set cookies from their own domains that this
            site doesn't control.
          </p>
        </Section>

        {/* Your rights */}
        <Section icon={ScrollText} label="Your Rights" title="Access &amp; Correction">
          <p>
            Under the Privacy Act 2020, you can ask what personal information we hold about you
            and request a correction — contact{" "}
            <a href="mailto:kavapyramids@gmail.com" style={{ color: "var(--gold)" }}>kavapyramids@gmail.com</a>.
          </p>
        </Section>

        {/* Security */}
        <Section icon={ShieldCheck} label="Security" title="How We Protect It" dark>
          <p>
            We take reasonable steps to protect your information, which is stored using
            Supabase's infrastructure.
          </p>
        </Section>

        {/* Analytics */}
        <Section icon={BarChart3} label="Analytics" title="No Tracking Scripts">
          <p>
            This site does not currently use analytics or advertising tracking scripts. This
            policy will be updated if that changes.
          </p>
        </Section>

        {/* Contact */}
        <section className="section section--dark">
          <motion.div className="container container--narrow" style={{ textAlign: "center" }} {...revealProps(0, reduceMotion)}>
            <p className="section-label">Privacy Officer</p>
            <h2>Questions About This Policy?</h2>
            <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
              For any privacy-related questions or requests, contact us directly:
            </p>
            <a className="button button--gold" href="mailto:kavapyramids@gmail.com" style={{ display: "inline-flex" }}>
              <Mail size={15} /> kavapyramids@gmail.com
            </a>
          </motion.div>
        </section>
      </main>

      <footer>
        <p className="wordmark">KAVA &amp; PYRAMIDS</p>
        <p>Christchurch, New Zealand · kavapyramids@gmail.com</p>
        <div className="footer__links">
          <a href="/media-hub">Photo Hub</a>
          <a href="/epk">Press Kit</a>
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
        <small>© {new Date().getFullYear()} Kava &amp; Pyramids. All rights reserved.</small>
      </footer>
    </div>
  );
}
