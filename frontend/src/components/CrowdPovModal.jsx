import { useEffect, useState } from "react";
import { Camera, Mail, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { processSubmissionPhoto } from "../lib/processImage";

const PENDING_BUCKET = "crowd-pov-pending";

// Mirrors the cap baked into the crowd_submissions insert policy
// (migration 033). The database is the real enforcement; checking it here
// just stops us uploading a file we already know will be rejected.
const MAX_PER_EVENT = 5;
const CAP_MESSAGE = "You've already submitted the maximum number of photos for this event.";

const CONSENT_COPY =
  "I confirm this photo is mine to share, and I'm happy for Kava & Pyramids to publish it " +
  "on this website. I understand it'll be reviewed before it goes live, and won't be added " +
  "automatically.";

export default function CrowdPovModal({ onClose }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  // idle → processing → uploading → done
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState("");
  const [capReached, setCapReached] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    // Only past events — you can't have crowd photos of a gig that hasn't
    // happened yet. Most recent first, same ordering as the admin dropdowns.
    supabase
      .from("events")
      .select("id, title, sort_date")
      .eq("status", "past")
      .order("sort_date", { ascending: false, nullsFirst: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setEvents(data ?? []);
        setEventsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Warn as soon as we know the email and event, so a capped visitor finds
  // out before choosing a photo rather than after uploading one. Debounced
  // because `email` changes on every keystroke.
  useEffect(() => {
    if (!email.includes("@") || !eventId) { setCapReached(false); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc("crowd_submission_count", {
        p_email: email,
        p_event_id: eventId,
      });
      // On a network hiccup, say nothing and let the submit-time check (and
      // ultimately the insert policy) decide.
      if (cancelled || rpcError) return;
      setCapReached(data >= MAX_PER_EVENT);
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [email, eventId]);

  // Email is deliberately kept — a repeat submitter shouldn't have to retype
  // it. The honeypot is cleared: if it ever gets populated (browser autofill
  // does sometimes fill hidden fields named "website"), leaving it set would
  // silently no-op every later submission with no way for the visitor to tell.
  const resetForm = () => {
    setEventId("");
    setFile(null);
    setConsent(false);
    setWebsite("");
    setError("");
    setCapReached(false);
    setStage("idle");
  };

  const busy = stage === "processing" || stage === "uploading";
  const ready = email.includes("@") && eventId && file && consent && !busy && !capReached;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready) return;

    // Honeypot — bots fill hidden fields; real visitors never see this one.
    // Show the same confirmation a person gets, but write nothing anywhere.
    if (website) { setStage("done"); return; }

    setError("");

    // Authoritative pre-upload check. The debounced effect above usually has
    // this answer already, but re-asking here closes the window where it
    // hasn't returned yet — and this is the call that actually prevents a
    // stranded file, since everything past this point writes to storage.
    const { data: existingCount, error: countError } = await supabase.rpc("crowd_submission_count", {
      p_email: email,
      p_event_id: eventId,
    });
    if (!countError && existingCount >= MAX_PER_EVENT) {
      setCapReached(true);
      setError(CAP_MESSAGE);
      return;
    }

    setStage("processing");

    let blob;
    try {
      // Strips EXIF (including GPS) and normalises HEIC to JPEG.
      blob = await processSubmissionPhoto(file);
    } catch (err) {
      setError(err.message);
      setStage("idle");
      return;
    }

    setStage("uploading");
    const storagePath = `${eventId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(PENDING_BUCKET)
      .upload(storagePath, blob, { contentType: "image/jpeg" });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setStage("idle");
      return;
    }

    // No .select() chained — anon has INSERT but no SELECT policy on this
    // table, so asking for the row back would fail RLS (migration 033).
    const { error: insertError } = await supabase.from("crowd_submissions").insert([{
      event_id: eventId,
      email,
      storage_path: storagePath,
      consent_accepted: true,
    }]);

    if (insertError) {
      // The per-email-per-event cap lives in the insert policy's WITH CHECK,
      // so exceeding it surfaces as a bare RLS violation rather than
      // anything a visitor could make sense of.
      if (insertError.code === "42501") setCapReached(true);
      setError(
        insertError.code === "42501"
          ? CAP_MESSAGE
          : `Submission failed: ${insertError.message}`
      );
      setStage("idle");
      return;
    }

    // Mailing-list signup mirrors EmailGate: anon has INSERT only, so no
    // .upsert() — a repeat subscriber trips the unique index on lower(email),
    // which just means they're already on the list. Never block the photo
    // submission on this.
    try {
      const { error: listError } = await supabase.from("mailing_list").insert([{
        email,
        source: "crowd_pov",
        subscribed: true,
        first_name: null,
        last_name: null,
        event_title: null,
      }]);
      if (listError && listError.code !== "23505") throw listError;
    } catch (err) {
      console.error("crowd_pov mailing_list signup failed:", err);
    }

    setStage("done");
  };

  const submitLabel =
    stage === "processing" ? "Processing photo…" :
    stage === "uploading" ? "Uploading…" :
    "Submit Photo";

  return (
    <div className="crowd-modal-overlay" onClick={onClose}>
      <div
        className="crowd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Submit your photo"
      >
        <button className="crowd-modal__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {stage === "done" ? (
          <div className="crowd-modal__done">
            <span className="crowd-modal__icon"><Camera size={32} /></span>
            <h2>Thanks — your photo's been submitted for review!</h2>
            <p>We'll take a look before it goes live on the site.</p>
            <button type="button" className="button button--gold" onClick={resetForm}>
              Submit another photo
            </button>
          </div>
        ) : (
          <>
            <span className="crowd-modal__icon"><Camera size={32} /></span>
            <h2>Crowd POV</h2>
            <p>
              Got a photo from one of our events? Share it here and we'll feature
              the best ones on the site.
            </p>

            <form onSubmit={handleSubmit} className="crowd-modal__form">
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

              <label className="crowd-modal__label" htmlFor="crowd-email">Your email</label>
              <div className="crowd-modal__field">
                <Mail size={18} className="crowd-modal__field-icon" aria-hidden="true" />
                <input
                  id="crowd-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  required
                />
              </div>

              <label className="crowd-modal__label" htmlFor="crowd-event">Which event?</label>
              <select
                id="crowd-event"
                className="crowd-modal__select"
                value={eventId}
                onChange={(e) => { setEventId(e.target.value); setError(""); }}
                required
                disabled={eventsLoading}
              >
                <option value="">
                  {eventsLoading ? "Loading events…" : "— choose an event —"}
                </option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                    {ev.sort_date
                      ? ` — ${new Date(ev.sort_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}`
                      : ""}
                  </option>
                ))}
              </select>

              <label className="crowd-modal__label" htmlFor="crowd-photo">Your photo</label>
              <input
                id="crowd-photo"
                className="crowd-modal__file"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }}
                required
              />

              <label className="crowd-modal__consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{CONSENT_COPY}</span>
              </label>

              {(error || capReached) && (
                <p className="crowd-modal__error">{error || CAP_MESSAGE}</p>
              )}

              <button className="button button--gold" type="submit" disabled={!ready}>
                {submitLabel}
              </button>
            </form>

            <p className="crowd-modal__disclaimer">
              <Mail size={12} /> Submitting adds you to our mailing list for occasional gig
              announcements. Every photo is reviewed before it's published — nothing goes
              live automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
