import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useCombinedGalleries } from "../hooks/useCombinedGalleries";
import AdminPhotoUpload from "./AdminPhotoUpload";

const BUCKET = "event-photos";

function slugify(text, date) {
  const base = (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return date ? `${base}-${date}` : base;
}

// Extract the storage path from a public URL.
// URLs look like: https://<project>.supabase.co/storage/v1/object/public/event-photos/slug/file.jpg
function storagePath(url) {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  } catch {
    return null;
  }
}

// ── Photo tile ────────────────────────────────────────────────────────────────

function PhotoTile({ photo, onSetCover, onDelete, deleting }) {
  return (
    <div style={{ ...g.tile, borderColor: photo.is_cover ? "#C9A84C" : "#1a1a1a" }}>
      <img
        src={photo.thumb_url ?? photo.photo_url}
        alt={photo.event_name}
        style={g.tileImg}
        loading="lazy"
      />
      <div style={g.tileActions}>
        <button
          style={{ ...g.tileBtn, ...(photo.is_cover ? g.tileBtnActive : {}) }}
          onClick={() => onSetCover(photo)}
          title={photo.is_cover ? "Current cover" : "Set as cover"}
        >
          {photo.is_cover ? "★ Cover" : "☆ Cover"}
        </button>
        <button
          style={{ ...g.tileBtn, ...g.tileBtnDelete }}
          onClick={() => onDelete(photo)}
          disabled={deleting === photo.id}
        >
          {deleting === photo.id ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ── Gallery detail view ───────────────────────────────────────────────────────

function GalleryDetail({ group, events, onBack, onRefresh }) {
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");
  const [relinking, setRelinking] = useState(false);

  // Best-effort match of this gallery's photos to a real event, so the
  // "Linked Event" dropdown starts on the right value when there is one.
  const matchedEventId = events.find(
    (e) => slugify(e.title, e.sort_date) === group.slug
  )?.id ?? "";
  const [linkedEventId, setLinkedEventId] = useState(matchedEventId);

  const handleRelink = async () => {
    const newEvent = events.find((e) => e.id === linkedEventId);
    if (!newEvent || group.photos.length === 0) return;
    setRelinking(true);
    setError("");

    const newSlug = slugify(newEvent.title, newEvent.sort_date);
    const ids = group.photos.map((p) => p.id);
    const { error: relinkError } = await supabase
      .from("media_assets")
      .update({
        event_slug: newSlug,
        event_name: newEvent.title,
        event_date: newEvent.sort_date || null,
      })
      .in("id", ids);

    if (relinkError) { setError(relinkError.message); setRelinking(false); return; }

    setRelinking(false);
    onRefresh();
  };

  const handleSetCover = async (photo) => {
    setError("");
    // Unset all covers in this group, then set the chosen one
    const ids = group.photos.map(p => p.id);
    const { error: e1 } = await supabase
      .from("media_assets")
      .update({ is_cover: false })
      .in("id", ids);
    if (e1) { setError(e1.message); return; }

    const { error: e2 } = await supabase
      .from("media_assets")
      .update({ is_cover: true })
      .eq("id", photo.id);
    if (e2) { setError(e2.message); return; }

    onRefresh();
  };

  const handleDelete = async (photo) => {
    setDeleting(photo.id);
    setError("");

    // 1. Remove from Storage
    const path = storagePath(photo.photo_url);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(BUCKET).remove([path]);
      if (storageErr) {
        setError(`Storage: ${storageErr.message}`);
        setDeleting(null);
        setConfirmDelete(null);
        return;
      }
    }

    // 2. Remove the DB row
    const { error: dbErr } = await supabase.from("media_assets").delete().eq("id", photo.id);
    if (dbErr) { setError(`DB: ${dbErr.message}`); }

    setDeleting(null);
    setConfirmDelete(null);
    onRefresh();
  };

  const formattedDate = group.event_date
    ? new Date(group.event_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div>
      <button style={g.backBtn} onClick={onBack}>← All galleries</button>

      <div style={g.detailHeader}>
        <div>
          <p style={g.detailLabel}>{formattedDate ?? "Event Gallery"}</p>
          <h2 style={g.detailTitle}>{group.event_name}</h2>
          <p style={g.detailCount}>{group.photos.length} photo{group.photos.length !== 1 ? "s" : ""}</p>
          {group.photo_gallery_url && (
            <p style={g.externalLinkRow}>
              External gallery:{" "}
              <a href={group.photo_gallery_url} target="_blank" rel="noopener noreferrer" style={g.externalLink}>
                {group.photo_gallery_url}
              </a>
              {group.photographer_name && <span> — Photography by {group.photographer_name}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Linked event — editable so photos can be reassigned to the correct event */}
      {group.photos.length > 0 && (
        <div style={g.relinkRow}>
          <span style={g.relinkLabel}>Linked Event</span>
          <select
            style={g.relinkSelect}
            value={linkedEventId}
            onChange={(e) => setLinkedEventId(e.target.value)}
          >
            <option value="">— not linked to an event —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
            ))}
          </select>
          <button
            style={{ ...g.relinkBtn, ...((!linkedEventId || linkedEventId === matchedEventId || relinking) ? g.relinkBtnDisabled : {}) }}
            onClick={handleRelink}
            disabled={!linkedEventId || linkedEventId === matchedEventId || relinking}
          >
            {relinking ? "Saving…" : "Save Link"}
          </button>
        </div>
      )}

      {error && <div style={g.errorBanner}>{error}</div>}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={g.confirmBox}>
          <p style={{ margin: "0 0 1rem", color: "#f0ece3", fontSize: "0.85rem" }}>
            Permanently delete this photo? This removes the file from Storage and the database.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              style={g.deleteSolidBtn}
              onClick={() => handleDelete(confirmDelete)}
              disabled={deleting === confirmDelete.id}
            >
              {deleting === confirmDelete.id ? "Deleting…" : "Yes, delete"}
            </button>
            <button style={g.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div style={g.photoGrid}>
        {group.photos.map(photo => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            onSetCover={handleSetCover}
            onDelete={setConfirmDelete}
            deleting={deleting}
          />
        ))}
      </div>

      {/* Add more photos to this gallery */}
      <div style={{ marginTop: "2rem", borderTop: "1px solid #1a1a1a", paddingTop: "1.5rem" }}>
        <p style={g.detailLabel}>Add more photos to this gallery</p>
        <AdminPhotoUpload
          events={events}
          defaultSlug={group.slug}
          defaultEventName={group.event_name}
          defaultEventDate={group.event_date}
          onDone={onRefresh}
        />
      </div>
    </div>
  );
}

// ── Gallery list ──────────────────────────────────────────────────────────────

function GalleryList({ galleries, onSelect }) {
  if (galleries.length === 0) {
    return (
      <p style={{ color: "#444", padding: "3rem 0", textAlign: "center", fontSize: "0.85rem" }}>
        No event galleries yet — upload photos via the Photo Upload tab first.
      </p>
    );
  }

  return (
    <div style={g.galleryList}>
      {galleries.map(group => {
        const formattedDate = group.event_date
          ? new Date(group.event_date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
          : null;

        return (
          <button
            key={group.slug}
            style={g.galleryRow}
            onClick={() => onSelect(group)}
            onMouseEnter={e => e.currentTarget.style.background = "#111"}
            onMouseLeave={e => e.currentTarget.style.background = "#0d0d0d"}
          >
            {group.cover ? (
              <img
                src={group.cover.thumb_url ?? group.cover.photo_url}
                alt={group.event_name}
                style={g.rowThumb}
              />
            ) : (
              <div style={{ ...g.rowThumb, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "0.7rem" }}>
                {group.photo_gallery_url ? "External" : "No cover"}
              </div>
            )}
            <div style={g.rowMeta}>
              <span style={g.rowTitle}>{group.event_name}</span>
              <span style={g.rowSub}>
                {formattedDate ?? "No date"} · {group.photos.length} photo{group.photos.length !== 1 ? "s" : ""}
                {group.photo_gallery_url && " · Lightroom link"}
              </span>
            </div>
            <span style={g.rowArrow}>→</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminGalleryManager({ events }) {
  const { galleries, loading, refetch } = useCombinedGalleries();
  const [selected, setSelected] = useState(null);

  // When data refreshes, update the selected group from the new data
  const handleRefresh = () => {
    refetch();
    // selected will be re-synced after refetch via the effect below
  };

  // Keep the detail view in sync after a refetch
  const currentGroup = selected
    ? galleries.find(g => g.slug === selected.slug) ?? selected
    : null;

  if (loading) {
    return <p style={{ color: "#444", padding: "2rem 0", fontSize: "0.85rem" }}>Loading galleries…</p>;
  }

  if (currentGroup) {
    return (
      <GalleryDetail
        group={currentGroup}
        events={events}
        onBack={() => setSelected(null)}
        onRefresh={handleRefresh}
      />
    );
  }

  return <GalleryList galleries={galleries} onSelect={setSelected} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const g = {
  backBtn: { background: "transparent", border: "none", color: "#C9A84C", fontSize: "0.78rem", cursor: "pointer", padding: "0 0 1.5rem", fontFamily: "inherit" },
  detailHeader: { marginBottom: "1.5rem" },
  detailLabel: { fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 0.25rem" },
  detailTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", margin: "0 0 0.25rem", color: "#f0ece3" },
  detailCount: { color: "#555", fontSize: "0.78rem", margin: 0 },
  externalLinkRow: { color: "#666", fontSize: "0.78rem", margin: "0.5rem 0 0" },
  externalLink: { color: "#C9A84C", wordBreak: "break-all" },
  relinkRow: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", padding: "0.85rem 1rem", background: "#0d0d0d", border: "1px solid #1a1a1a" },
  relinkLabel: { fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", flexShrink: 0 },
  relinkSelect: { flex: 1, minWidth: "220px", background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.5rem 0.65rem", fontSize: "0.8rem", fontFamily: "inherit" },
  relinkBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.5rem 1.1rem", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  relinkBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  errorBanner: { background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", color: "#e07070", padding: "0.65rem 1rem", fontSize: "0.78rem", marginBottom: "1rem" },
  confirmBox: { background: "#0d0d0d", border: "1px solid rgba(224,92,92,0.3)", padding: "1.25rem 1.5rem", marginBottom: "1.25rem" },
  deleteSolidBtn: { background: "#8b1a1a", border: "none", color: "#f0ece3", padding: "0.6rem 1.25rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" },
  tile: { border: "1px solid #1a1a1a", background: "#0d0d0d", display: "flex", flexDirection: "column" },
  tileImg: { width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" },
  tileActions: { display: "flex", gap: "0.25rem", padding: "0.4rem" },
  tileBtn: { flex: 1, background: "transparent", border: "1px solid #222", color: "#555", fontSize: "0.62rem", padding: "0.3rem 0.25rem", cursor: "pointer", fontFamily: "inherit" },
  tileBtnActive: { borderColor: "#C9A84C", color: "#C9A84C" },
  tileBtnDelete: { borderColor: "#3a1a1a", color: "#7a3a3a", flex: "none", padding: "0.3rem 0.6rem" },
  galleryList: { display: "grid", gap: "0.5rem" },
  galleryRow: { display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", background: "#0d0d0d", border: "1px solid #1a1a1a", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.15s", width: "100%" },
  rowThumb: { width: "64px", height: "44px", objectFit: "cover", flexShrink: 0 },
  rowMeta: { flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" },
  rowTitle: { color: "#f0ece3", fontSize: "0.88rem", fontWeight: 500 },
  rowSub: { color: "#555", fontSize: "0.72rem" },
  rowArrow: { color: "#333", fontSize: "0.85rem", flexShrink: 0 },
};
