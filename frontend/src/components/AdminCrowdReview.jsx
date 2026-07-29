import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PENDING_BUCKET = "crowd-pov-pending";
const PUBLIC_BUCKET = "crowd-pov";

const REASON_LABELS = {
  offensive: "Offensive or inappropriate",
  no_consent: "Posted without permission",
  other: "Other",
};

// Migration 037 caps open reports at 20 per photo, so a card can't grow
// without bound — but 20 report bodies per card, across every hidden photo,
// is still a wall of text to scroll past when the decision is usually
// obvious from the first few. Render a handful and count the rest.
const MAX_VISIBLE_REPORTS = 5;

// Backstop on the fetch itself. With the per-photo cap this only binds once
// there are ~25 hidden photos at once, which would be its own emergency —
// but an unbounded select feeding a render loop is the thing that made this
// worth fixing, so it should not be unbounded here either.
const REPORT_FETCH_LIMIT = 500;

// crowd_photos stores the full public URL; the Storage API wants the path
// within the bucket. Same extraction AdminGalleryManager does for event-photos.
function storagePathFromUrl(url) {
  const marker = `/object/public/${PUBLIC_BUCKET}/`;
  const idx = (url ?? "").indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return url.slice(idx + marker.length);
  }
}

// ── Submission card ───────────────────────────────────────────────────────────

function SubmissionCard({ submission, signedUrl, event, busy, onApprove, onRejectClick }) {
  const eventDate = event?.sort_date
    ? new Date(event.sort_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const submittedDate = new Date(submission.submitted_at).toLocaleDateString("en-NZ", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={c.card}>
      {signedUrl ? (
        <img src={signedUrl} alt="Pending submission" style={c.cardImg} loading="lazy" />
      ) : (
        <div style={{ ...c.cardImg, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "0.7rem" }}>
          No preview
        </div>
      )}
      <div style={c.cardBody}>
        <p style={c.cardEvent}>{event ? event.title : "Unknown event"}</p>
        <p style={c.cardSub}>{eventDate ?? "No event date"}</p>
        <p style={c.cardSub}>Submitted {submittedDate}</p>
        <p style={c.cardEmail}>{submission.email}</p>
      </div>
      <div style={c.cardActions}>
        <button
          style={{ ...c.approveBtn, ...(busy ? c.btnDisabled : {}) }}
          onClick={() => onApprove(submission)}
          disabled={busy}
        >
          {busy ? "…" : "Approve"}
        </button>
        <button
          style={{ ...c.rejectBtn, ...(busy ? c.btnDisabled : {}) }}
          onClick={() => onRejectClick(submission)}
          disabled={busy}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Reported (hidden) photo card ──────────────────────────────────────────────

function ReportedCard({ card, event, busy, onRestore, onRemoveClick }) {
  const eventDate = event?.sort_date
    ? new Date(event.sort_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ ...c.card, borderColor: "rgba(224,92,92,0.3)" }}>
      {/* crowd-pov is a public bucket, so no signed URL needed here — unlike
          the pending queue above, which reads from the private bucket. */}
      <img src={card.photo.photo_url} alt="Reported crowd photo" style={c.cardImg} loading="lazy" />
      <div style={c.cardBody}>
        <p style={c.cardEvent}>{event ? event.title : "Unknown event"}</p>
        <p style={c.cardSub}>{eventDate ?? "No event date"}</p>
        <p style={c.reportCount}>
          {card.reports.length} open report{card.reports.length !== 1 ? "s" : ""}
        </p>
        <div style={c.reportList}>
          {card.reports.slice(0, MAX_VISIBLE_REPORTS).map((report) => (
            <div key={report.id} style={c.reportItem}>
              <span style={c.reportReason}>{REASON_LABELS[report.reason] ?? report.reason}</span>
              <span style={c.reportDate}>
                {new Date(report.created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {report.details && <p style={c.reportDetails}>“{report.details}”</p>}
            </div>
          ))}
          {card.reports.length > MAX_VISIBLE_REPORTS && (
            <p style={c.reportOverflow}>
              + {card.reports.length - MAX_VISIBLE_REPORTS} more report
              {card.reports.length - MAX_VISIBLE_REPORTS !== 1 ? "s" : ""} not shown
            </p>
          )}
        </div>
      </div>
      <div style={c.cardActions}>
        <button
          style={{ ...c.approveBtn, ...(busy ? c.btnDisabled : {}) }}
          onClick={() => onRestore(card)}
          disabled={busy}
        >
          {busy ? "…" : "Restore"}
        </button>
        <button
          style={{ ...c.rejectBtn, ...(busy ? c.btnDisabled : {}) }}
          onClick={() => onRemoveClick(card)}
          disabled={busy}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminCrowdReview({ events, adminUserId }) {
  const [submissions, setSubmissions] = useState([]);
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [reported, setReported] = useState([]);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Hidden photos plus their open reports, grouped one card per photo —
    // three reports on the same photo is one decision, not three.
    const fetchReported = async () => {
      const { data: photos, error: photosError } = await supabase
        .from("crowd_photos")
        .select("*")
        .eq("hidden", true)
        .order("approved_at", { ascending: true });

      if (cancelled) return;
      if (photosError) { setError(`Reported photos: ${photosError.message}`); return; }
      if (!photos || photos.length === 0) { setReported([]); return; }

      const { data: reports, error: reportsError } = await supabase
        .from("crowd_photo_reports")
        .select("*")
        .eq("status", "open")
        .in("crowd_photo_id", photos.map((photo) => photo.id))
        .order("created_at", { ascending: true })
        .limit(REPORT_FETCH_LIMIT);

      if (cancelled) return;
      if (reportsError) { setError(`Reports: ${reportsError.message}`); return; }

      const byPhoto = new Map();
      for (const report of reports ?? []) {
        if (!byPhoto.has(report.crowd_photo_id)) byPhoto.set(report.crowd_photo_id, []);
        byPhoto.get(report.crowd_photo_id).push(report);
      }
      setReported(photos.map((photo) => ({ photo, reports: byPhoto.get(photo.id) ?? [] })));
    };

    const fetchPending = async () => {
      // Oldest first so the queue is reviewed fairly.
      const { data, error: fetchError } = await supabase
        .from("crowd_submissions")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });

      if (cancelled) return;
      if (fetchError) { setError(fetchError.message); setLoading(false); return; }
      setSubmissions(data);

      // The pending bucket is private, so previews need signed URLs.
      // 15 minutes is plenty for a review session.
      if (data.length > 0) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from(PENDING_BUCKET)
          .createSignedUrls(data.map((sub) => sub.storage_path), 900);
        if (cancelled) return;
        if (urlError) {
          setError(`Storage: ${urlError.message}`);
        } else {
          const byPath = {};
          for (const entry of urlData) {
            if (entry.signedUrl) byPath[entry.path] = entry.signedUrl;
          }
          setSignedUrls(byPath);
        }
      }
      setLoading(false);
    };

    fetchPending();
    fetchReported();
    return () => { cancelled = true; };
  }, []);

  const removeFromQueue = (id) =>
    setSubmissions((prev) => prev.filter((sub) => sub.id !== id));

  // Fail-safe ordering: never touch the database until the file has
  // actually moved/been deleted, so a half-failed action can't leave an
  // approved row pointing at a file that never went public.
  //
  // The file moving first has its own failure mode, though: between the move
  // and the insert, the photo is sitting in a PUBLIC bucket with nothing in the
  // database saying it was approved. Failing there without undoing the move
  // would leave a visitor's photo publicly reachable, and would also wedge
  // every retry — the move below looks in the pending bucket, and the file is
  // no longer there. So the move is rolled back on failure.
  const handleApprove = async (submission) => {
    setBusy(submission.id);
    setError("");

    // 1. Move the file to the public bucket (same path, new bucket).
    const { error: moveError } = await supabase.storage
      .from(PENDING_BUCKET)
      .move(submission.storage_path, submission.storage_path, { destinationBucket: PUBLIC_BUCKET });
    if (moveError) { setError(`Storage: ${moveError.message}`); setBusy(null); return; }

    // Put the file back where it came from, so the submission is exactly as it
    // was before Approve was clicked and the next attempt starts clean.
    const rollbackMove = async () => {
      const { error: rollbackError } = await supabase.storage
        .from(PUBLIC_BUCKET)
        .move(submission.storage_path, submission.storage_path, { destinationBucket: PENDING_BUCKET });
      return rollbackError;
    };

    // 2. Public URL of the moved file.
    const { data: { publicUrl } } = supabase.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(submission.storage_path);

    // 3. Create the public-facing record.
    const { error: insertError } = await supabase.from("crowd_photos").insert({
      event_id: submission.event_id,
      submission_id: submission.id,
      photo_url: publicUrl,
    });
    if (insertError) {
      const rollbackError = await rollbackMove();
      setError(
        rollbackError
          ? `DB (crowd_photos): ${insertError.message}. The photo could NOT be moved back to the private bucket (${rollbackError.message}) — it is currently public at ${PUBLIC_BUCKET}/${submission.storage_path} and needs removing by hand.`
          : `DB (crowd_photos): ${insertError.message}. The photo was moved back to the private bucket, so nothing was published — safe to try again.`
      );
      setBusy(null);
      return;
    }

    // 4. Mark the submission approved. By this point the photo is genuinely
    //    live, so this failing is a stale-status problem, not a publishing one
    //    — say so plainly rather than implying the approval didn't happen.
    const { error: updateError } = await supabase
      .from("crowd_submissions")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUserId })
      .eq("id", submission.id);
    if (updateError) {
      setError(
        `DB (crowd_submissions): ${updateError.message}. The photo IS published and live on the site — only its review status failed to save, so it will reappear in this queue. Do not approve it again (that would publish a duplicate); fix the status directly instead.`
      );
      setBusy(null);
      return;
    }

    removeFromQueue(submission.id);
    setBusy(null);
  };

  const handleReject = async (submission) => {
    setBusy(submission.id);
    setError("");

    // 1. Delete the file immediately — rejected photos are not retained.
    const { error: removeError } = await supabase.storage
      .from(PENDING_BUCKET)
      .remove([submission.storage_path]);
    if (removeError) { setError(`Storage: ${removeError.message}`); setBusy(null); return; }

    // 2. Record the rejection (reason is admin-only, never shown to the uploader).
    const { error: updateError } = await supabase
      .from("crowd_submissions")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        rejection_reason: reasonText.trim() || null,
      })
      .eq("id", submission.id);
    if (updateError) { setError(`DB (crowd_submissions): ${updateError.message}`); setBusy(null); return; }

    removeFromQueue(submission.id);
    setBusy(null);
    setConfirmReject(null);
    setReasonText("");
  };

  const openRejectConfirm = (submission) => {
    setConfirmReject(submission);
    setReasonText("");
  };

  const dropReportedCard = (photoId) =>
    setReported((prev) => prev.filter((card) => card.photo.id !== photoId));

  // Restore: the photo goes back to being publicly visible the moment `hidden`
  // flips, because the public read policy is what enforces hiding (migration
  // 036). Nothing in storage or crowd_submissions changes — it was never
  // untrue that this photo was approved.
  const handleRestore = async (card) => {
    setBusy(card.photo.id);
    setError("");
    const now = new Date().toISOString();

    const { error: unhideError } = await supabase
      .from("crowd_photos")
      .update({ hidden: false })
      .eq("id", card.photo.id);
    if (unhideError) { setError(`DB (crowd_photos): ${unhideError.message}`); setBusy(null); return; }

    const { error: reportsError } = await supabase
      .from("crowd_photo_reports")
      .update({ status: "dismissed", resolved_at: now, resolved_by: adminUserId })
      .eq("crowd_photo_id", card.photo.id)
      .eq("status", "open");
    if (reportsError) { setError(`DB (crowd_photo_reports): ${reportsError.message}`); setBusy(null); return; }

    dropReportedCard(card.photo.id);
    setBusy(null);
  };

  // Remove permanently. Same fail-safe ordering as approve/reject: the file
  // goes first, so a failure part-way can never leave a publicly-reachable
  // photo whose record has already been torn down.
  const handleRemove = async (card) => {
    setBusy(card.photo.id);
    setError("");
    const now = new Date().toISOString();

    // 1. Delete the file from the public bucket. If the path can't be worked
    //    out from the stored URL, stop — this is the takedown path for a
    //    no-consent report, so quietly skipping the delete and carrying on
    //    would report success while leaving the photo served from storage,
    //    with the record that points at it now gone.
    const path = storagePathFromUrl(card.photo.photo_url);
    if (!path) {
      setError(
        `Couldn't derive a storage path from this photo's URL (${card.photo.photo_url}), so the file was not deleted. Nothing has been changed — the photo is still hidden. Remove the file from the ${PUBLIC_BUCKET} bucket by hand, then try again.`
      );
      setBusy(null);
      return;
    }

    const { error: storageError } = await supabase.storage.from(PUBLIC_BUCKET).remove([path]);
    if (storageError) { setError(`Storage: ${storageError.message}`); setBusy(null); return; }

    // 2. Resolve the reports before the photo row goes — deleting it cascades
    //    them away (migration 036), so this has to happen first to mean anything.
    const { error: reportsError } = await supabase
      .from("crowd_photo_reports")
      .update({ status: "resolved", resolved_at: now, resolved_by: adminUserId })
      .eq("crowd_photo_id", card.photo.id)
      .eq("status", "open");
    if (reportsError) { setError(`DB (crowd_photo_reports): ${reportsError.message}`); setBusy(null); return; }

    // 3. Drop the public record.
    const { error: photoError } = await supabase
      .from("crowd_photos")
      .delete()
      .eq("id", card.photo.id);
    if (photoError) { setError(`DB (crowd_photos): ${photoError.message}`); setBusy(null); return; }

    // 4. Mark the original submission 'removed' — distinct from 'rejected',
    //    which would wrongly imply it never went live. submission_id is
    //    nullable (on delete set null), so an orphaned photo just skips this.
    if (card.photo.submission_id) {
      const { error: submissionError } = await supabase
        .from("crowd_submissions")
        .update({ status: "removed", reviewed_at: now, reviewed_by: adminUserId })
        .eq("id", card.photo.submission_id);
      if (submissionError) { setError(`DB (crowd_submissions): ${submissionError.message}`); setBusy(null); return; }
    }

    dropReportedCard(card.photo.id);
    setBusy(null);
    setConfirmRemove(null);
  };

  if (loading) {
    return <p style={{ color: "#444", padding: "2rem 0", fontSize: "0.85rem" }}>Loading submissions…</p>;
  }

  const confirmEvent = confirmReject
    ? events.find((ev) => ev.id === confirmReject.event_id)
    : null;

  return (
    <div>
      <p style={c.queueLabel}>
        {submissions.length} pending submission{submissions.length !== 1 ? "s" : ""}
      </p>

      {error && <div style={c.errorBanner}>{error}</div>}

      {/* Confirm reject dialog */}
      {confirmReject && (
        <div style={c.confirmBox}>
          <p style={{ margin: "0 0 0.75rem", color: "#f0ece3", fontSize: "0.85rem" }}>
            Reject this submission from {confirmReject.email}
            {confirmEvent ? ` (${confirmEvent.title})` : ""}? The file is deleted immediately.
          </p>
          <textarea
            style={c.reasonInput}
            placeholder="Optional reason — for your own record only, never shown to the uploader"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              style={c.deleteSolidBtn}
              onClick={() => handleReject(confirmReject)}
              disabled={busy === confirmReject.id}
            >
              {busy === confirmReject.id ? "Rejecting…" : "Yes, reject"}
            </button>
            <button style={c.cancelBtn} onClick={() => { setConfirmReject(null); setReasonText(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <p style={{ color: "#444", padding: "3rem 0", textAlign: "center", fontSize: "0.85rem" }}>
          No submissions waiting for review.
        </p>
      ) : (
        <div style={c.cardGrid}>
          {submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              signedUrl={signedUrls[submission.storage_path]}
              event={events.find((ev) => ev.id === submission.event_id)}
              busy={busy === submission.id}
              onApprove={handleApprove}
              onRejectClick={openRejectConfirm}
            />
          ))}
        </div>
      )}

      {/* ── Reported photos ── */}
      <div style={c.sectionDivider}>
        <p style={c.queueLabel}>
          {reported.length} reported photo{reported.length !== 1 ? "s" : ""} — hidden from the site
        </p>

        {confirmRemove && (
          <div style={c.confirmBox}>
            <p style={{ margin: "0 0 1rem", color: "#f0ece3", fontSize: "0.85rem" }}>
              Permanently remove this photo? The file is deleted from storage and the
              public record is dropped. The original submission stays on record, marked
              “removed”. This can't be undone — use Restore instead if the report
              doesn't hold up.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                style={c.deleteSolidBtn}
                onClick={() => handleRemove(confirmRemove)}
                disabled={busy === confirmRemove.photo.id}
              >
                {busy === confirmRemove.photo.id ? "Removing…" : "Yes, remove permanently"}
              </button>
              <button style={c.cancelBtn} onClick={() => setConfirmRemove(null)}>Cancel</button>
            </div>
          </div>
        )}

        {reported.length === 0 ? (
          <p style={{ color: "#444", padding: "2rem 0", textAlign: "center", fontSize: "0.85rem" }}>
            No reported photos.
          </p>
        ) : (
          <div style={c.cardGrid}>
            {reported.map((card) => (
              <ReportedCard
                key={card.photo.id}
                card={card}
                event={events.find((ev) => ev.id === card.photo.event_id)}
                busy={busy === card.photo.id}
                onRestore={handleRestore}
                onRemoveClick={setConfirmRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const c = {
  queueLabel: { fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 1.25rem" },
  errorBanner: { background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", color: "#e07070", padding: "0.65rem 1rem", fontSize: "0.78rem", marginBottom: "1rem" },
  confirmBox: { background: "#0d0d0d", border: "1px solid rgba(224,92,92,0.3)", padding: "1.25rem 1.5rem", marginBottom: "1.25rem" },
  reasonInput: { width: "100%", boxSizing: "border-box", background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.5rem 0.65rem", fontSize: "0.8rem", fontFamily: "inherit", resize: "vertical", marginBottom: "0.85rem" },
  deleteSolidBtn: { background: "#8b1a1a", border: "none", color: "#f0ece3", padding: "0.6rem 1.25rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" },
  card: { border: "1px solid #1a1a1a", background: "#0d0d0d", display: "flex", flexDirection: "column" },
  cardImg: { width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" },
  cardBody: { padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 },
  cardEvent: { color: "#f0ece3", fontSize: "0.88rem", fontWeight: 500, margin: 0 },
  cardSub: { color: "#555", fontSize: "0.72rem", margin: 0 },
  cardEmail: { color: "#666", fontSize: "0.72rem", margin: "0.25rem 0 0", wordBreak: "break-all" },
  cardActions: { display: "flex", gap: "0.5rem", padding: "0 0.85rem 0.85rem" },
  approveBtn: { flex: 1, background: "#C9A84C", border: "none", color: "#090909", padding: "0.5rem 0.75rem", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  rejectBtn: { background: "transparent", border: "1px solid #3a1a1a", color: "#7a3a3a", padding: "0.5rem 0.75rem", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  sectionDivider: { marginTop: "2.5rem", paddingTop: "1.75rem", borderTop: "1px solid #1a1a1a" },
  reportCount: { color: "#e07070", fontSize: "0.72rem", margin: "0.35rem 0 0", fontWeight: 500 },
  reportList: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" },
  reportItem: { borderLeft: "2px solid rgba(224,92,92,0.35)", paddingLeft: "0.6rem" },
  reportReason: { color: "#f0ece3", fontSize: "0.75rem", display: "block" },
  reportDate: { color: "#555", fontSize: "0.68rem" },
  reportDetails: { color: "#777", fontSize: "0.72rem", margin: "0.25rem 0 0", lineHeight: 1.5, fontStyle: "italic" },
  reportOverflow: { color: "#555", fontSize: "0.68rem", margin: "0.25rem 0 0", fontStyle: "italic" },
};
