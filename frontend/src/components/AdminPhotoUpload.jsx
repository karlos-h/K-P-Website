import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { processAdminPhoto } from "../lib/processImage";
import { useIsMobile } from "../hooks/useIsMobile";

const BUCKET = "event-photos";

function slugify(text, date) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return date ? `${base}-${date}` : base;
}

// Strips path separators, traversal sequences, and anything outside a safe
// filename charset so a crafted file.name (e.g. "../../secrets.jpg") can never
// escape the event's folder or overwrite unrelated objects in the bucket.
function sanitizeFileName(name) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : "";
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "file";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

// processAdminPhoto always returns a JPEG regardless of what was selected, so
// the stored object must be named .jpg — keeping the source extension would
// leave a PNG/HEIC/GIF name on JPEG bytes.
function jpegStorageName(name) {
  const sanitized = sanitizeFileName(name);
  const lastDot = sanitized.lastIndexOf(".");
  const base = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
  return `${base}.jpg`;
}

// ── Individual file row ───────────────────────────────────────────────────────

function FileRow({ file, progress, error, isCover, onSetCover, publicUrl, compressing }) {
  const isMobile = useIsMobile();
  const thumb = publicUrl ?? URL.createObjectURL(file);
  return (
    <div style={{ ...rs.fileRow, borderColor: isCover ? "#c9a84c" : "#1e1e1e" }}>
      <img src={thumb} alt={file.name} style={rs.thumb} />
      <div style={rs.fileInfo}>
        <span style={rs.fileName}>{file.name}</span>
        {/* An error always wins — a failed compression clears `compressing`
            and sets `error`, and that outcome must stay visible. */}
        {error
          ? <span style={rs.errorText}>{error}</span>
          : compressing
            ? <span style={rs.compressingText}>Compressing…</span>
            : progress < 100
              ? <div style={rs.progressBar}><div style={{ ...rs.progressFill, width: `${progress}%` }} /></div>
              : <span style={rs.doneText}>✓ Uploaded</span>
        }
      </div>
      <button
        style={{ ...rs.coverBtn, ...(isCover ? rs.coverBtnActive : {}), ...(isMobile ? rs.coverBtnMobile : {}) }}
        onClick={() => onSetCover(file.name)}
        title="Set as cover photo"
      >
        {isCover ? "★ Cover" : "☆ Cover"}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPhotoUpload({ events, onDone, defaultSlug, defaultEventName, defaultEventDate }) {
  const fileInputRef = useRef(null);
  const isMobile = useIsMobile();

  // When defaultSlug is provided (from gallery detail view), lock to that event.
  const lockedBySlug = !!defaultSlug;

  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [selectedEventId, setSelectedEventId] = useState(() => {
    if (!defaultSlug) return "";
    // Try to find the event whose slugified form (title + sort_date) matches defaultSlug
    return events.find((e) => {
      const base = (e.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = e.sort_date ? `${base}-${e.sort_date}` : base;
      return slug === defaultSlug;
    })?.id ?? "";
  });
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // filename -> 0-100
  const [errors, setErrors] = useState({});     // filename -> error string
  const [compressing, setCompressing] = useState({}); // filename -> boolean
  const [publicUrls, setPublicUrls] = useState({}); // filename -> url
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dbError, setDbError] = useState(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // When locked to an existing gallery, trust the gallery group's own event_name/
  // event_date (passed down directly) rather than relying on selectedEvent, which
  // can fail to resolve if this event's slug isn't found in the events list.
  const resolvedName = lockedBySlug
    ? (defaultEventName || selectedEvent?.title || "")
    : (mode === "existing" ? selectedEvent?.title ?? "" : newEventName);
  const resolvedDate = lockedBySlug
    ? (defaultEventDate || selectedEvent?.sort_date || "")
    : (mode === "existing" ? selectedEvent?.sort_date ?? "" : newEventDate);
  const resolvedSlug = slugify(resolvedName, resolvedDate);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    setFiles(picked);
    setProgress({});
    setErrors({});
    setCompressing({});
    setPublicUrls({});
    setCoverFile(picked[0]?.name ?? null);
    setDone(false);
    setDbError(null);
  };

  const upload = async () => {
    const effectiveSlug = defaultSlug ?? resolvedSlug;
    if ((!resolvedName && !defaultSlug) || files.length === 0) return;
    setUploading(true);
    setDbError(null);

    const rows = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Sanitize the filename before it ever touches the storage path — an
      // unsanitized name (e.g. containing "../") could otherwise write outside
      // this event's folder or overwrite unrelated objects in the bucket.
      const safeName = jpegStorageName(file.name);
      const path = `${effectiveSlug}/${safeName}`;

      // Full-resolution DSLR JPEGs (6000x4000, 7-34 MB) blow straight past the
      // bucket's size cap, so downscale and re-encode before uploading — the
      // same pipeline the public crowd-pov path has always used. Also means
      // visitors are served ~1 MB gallery images instead of the originals.
      setCompressing((c) => ({ ...c, [file.name]: true }));
      let processed;
      try {
        processed = await processAdminPhoto(file);
      } catch (err) {
        setErrors((e) => ({ ...e, [file.name]: err.message }));
        setProgress((p) => ({ ...p, [file.name]: 0 }));
        setCompressing((c) => ({ ...c, [file.name]: false }));
        continue;
      }
      setCompressing((c) => ({ ...c, [file.name]: false }));

      setProgress((p) => ({ ...p, [file.name]: 5 }));

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, processed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        setErrors((e) => ({ ...e, [file.name]: uploadError.message }));
        setProgress((p) => ({ ...p, [file.name]: 0 }));
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = urlData.publicUrl;

      setPublicUrls((u) => ({ ...u, [file.name]: url }));
      setProgress((p) => ({ ...p, [file.name]: 100 }));

      rows.push({
        event_name: resolvedName || defaultSlug,
        event_date: resolvedDate || null,
        event_slug: effectiveSlug,
        photo_url: url,
        thumb_url: url,
        category: selectedEvent?.type ?? "Event",
        is_cover: file.name === coverFile,
        sort_order: i,
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("media_assets").insert(rows);
      if (insertError) {
        console.error("Insert error:", insertError);
        // Files are already in storage at this point, but without a media_assets
        // row they won't show up anywhere on the site — surface this clearly
        // instead of reporting a false "all done" success.
        setDbError(
          `Photos uploaded to storage, but saving the gallery entries failed: ${insertError.message}. Try uploading again — the files themselves are safe and will be overwritten.`
        );
      }
    }

    setUploading(false);
    setDone(true);
    if (onDone) onDone();
  };

  const canUpload = (resolvedName || defaultSlug) && files.length > 0 && !uploading;

  return (
    <div style={rs.panel}>
      <h2 style={rs.heading}>Upload Event Photos</h2>

      {/* ── Event picker (hidden when locked to a specific gallery) ── */}
      {!lockedBySlug && (
        <>
          <div style={rs.toggleRow}>
            {["existing", "new"].map((m) => (
              <button
                key={m}
                style={{ ...rs.toggleBtn, ...(isMobile ? touchTarget : {}), ...(mode === m ? rs.toggleBtnActive : {}) }}
                onClick={() => setMode(m)}
              >
                {m === "existing" ? "Link to existing event" : "New event"}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <select
              style={{ ...rs.select, ...(isMobile ? rs.selectMobile : {}) }}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">— select an event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
              ))}
            </select>
          ) : (
            <div style={{ ...rs.newEventGrid, ...(isMobile ? rs.newEventGridMobile : {}) }}>
              <label style={rs.label}>
                <span style={rs.labelText}>Event name</span>
                <input style={{ ...rs.input, ...(isMobile ? rs.inputMobile : {}) }} value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Original Sin" />
              </label>
              <label style={rs.label}>
                <span style={rs.labelText}>Event date</span>
                <input style={{ ...rs.input, ...(isMobile ? rs.inputMobile : {}) }} type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
              </label>
            </div>
          )}
        </>
      )}

      {(resolvedSlug || defaultSlug) && (
        <p style={rs.slugPreview}>Storage path: <code style={rs.code}>event-photos/{defaultSlug ?? resolvedSlug}/</code></p>
      )}

      {/* ── File picker ── */}
      <div style={rs.dropZone} onClick={() => fileInputRef.current?.click()}>
        {/* No `capture` attribute here on purpose: this tool is mainly for bulk-
            uploading photos an event photographer already shot (transferred from
            a camera or someone's camera roll), not for shooting one at a time.
            `capture` would force straight to the camera and hide the Photo
            Library option that the default picker already offers on mobile. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFiles}
        />
        {files.length === 0 ? (
          <>
            <span style={rs.dropIcon}>📁</span>
            <span style={rs.dropText}>Click to select photos</span>
            <span style={rs.dropHint}>Accepts JPG, PNG, WebP — select multiple files at once (Ctrl/Cmd-click, or Ctrl/Cmd+A for a whole folder)</span>
          </>
        ) : (
          <span style={rs.dropText}>{files.length} photo{files.length !== 1 ? "s" : ""} selected — click to change</span>
        )}
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div style={rs.fileList}>
          <p style={rs.fileListHint}>Click ☆ Cover to set the thumbnail shown on the carousel header</p>
          {files.map((file) => (
            <FileRow
              key={file.name}
              file={file}
              progress={progress[file.name] ?? 0}
              error={errors[file.name]}
              isCover={coverFile === file.name}
              onSetCover={setCoverFile}
              publicUrl={publicUrls[file.name]}
              compressing={compressing[file.name]}
            />
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={rs.actions}>
        <button
          style={{ ...rs.uploadBtn, ...(!canUpload ? rs.uploadBtnDisabled : {}), ...(isMobile ? rs.uploadBtnMobile : {}) }}
          onClick={upload}
          disabled={!canUpload}
        >
          {uploading ? "Uploading…" : `Upload ${files.length > 0 ? files.length + " photo" + (files.length !== 1 ? "s" : "") : ""}`}
        </button>
        {done && dbError && <span style={rs.errorText}>⚠ {dbError}</span>}
        {done && !dbError && Object.keys(errors).length === 0 && (
          <span style={rs.doneText}>✓ All done — photos are live on the site</span>
        )}
        {done && !dbError && Object.keys(errors).length > 0 && (
          <span style={rs.errorText}>
            ⚠ {Object.keys(errors).length} of {files.length} photo{files.length !== 1 ? "s" : ""} failed to upload — see errors above.
            {files.length - Object.keys(errors).length > 0
              ? ` ${files.length - Object.keys(errors).length} succeeded.`
              : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Inline styles (matches AdminDashboard's dark aesthetic) ──────────────────

// Shared floor for tappable controls on mobile (Apple/Material guidance).
const touchTarget = { minHeight: "44px" };

const rs = {
  panel: { background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "1.75rem", marginTop: "2rem" },
  heading: { fontSize: "1rem", fontWeight: 500, marginBottom: "1.5rem", color: "#f0ece3" },
  toggleRow: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  toggleBtn: { background: "transparent", border: "1px solid #222", color: "#555", padding: "0.35rem 0.85rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  toggleBtnActive: { borderColor: "#C9A84C", color: "#C9A84C" },
  select: { width: "100%", background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.6rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit", marginBottom: "0.75rem" },
  // 1rem is the floor below which iOS Safari auto-zooms on input focus.
  selectMobile: { fontSize: "1rem" },
  label: { display: "grid", gap: "0.3rem" },
  labelText: { fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" },
  input: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit" },
  inputMobile: { fontSize: "1rem" },
  newEventGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  newEventGridMobile: { gridTemplateColumns: "1fr" },
  slugPreview: { fontSize: "0.7rem", color: "#444", margin: "0.5rem 0 1rem" },
  code: { color: "#C9A84C", background: "#111", padding: "0.1rem 0.35rem", borderRadius: "2px" },
  dropZone: { border: "1px dashed #2a2a2a", padding: "2rem", textAlign: "center", cursor: "pointer", marginBottom: "1rem", transition: "border-color 0.2s" },
  dropIcon: { display: "block", fontSize: "2rem", marginBottom: "0.5rem" },
  dropText: { display: "block", color: "#aaa", fontSize: "0.85rem" },
  dropHint: { display: "block", color: "#444", fontSize: "0.72rem", marginTop: "0.4rem" },
  fileList: { display: "grid", gap: "0.5rem", marginBottom: "1.25rem" },
  fileListHint: { fontSize: "0.7rem", color: "#444", margin: "0 0 0.5rem" },
  fileRow: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem", background: "#111", border: "1px solid #1e1e1e" },
  thumb: { width: "48px", height: "48px", objectFit: "cover", flexShrink: 0, borderRadius: "2px" },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { display: "block", fontSize: "0.78rem", color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressBar: { height: "3px", background: "#222", marginTop: "0.35rem", borderRadius: "2px" },
  progressFill: { height: "100%", background: "#C9A84C", borderRadius: "2px", transition: "width 0.2s" },
  doneText: { color: "#5ec97a", fontSize: "0.72rem" },
  compressingText: { color: "#C9A84C", fontSize: "0.72rem" },
  errorText: { color: "#e05c5c", fontSize: "0.72rem" },
  coverBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.3rem 0.6rem", fontSize: "0.68rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 },
  coverBtnActive: { borderColor: "#C9A84C", color: "#C9A84C" },
  // Sits right next to the thumbnail — easy to mis-tap at the base size, so
  // bump to the 44px touch-target floor on mobile.
  coverBtnMobile: { ...touchTarget, padding: "0.3rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "center" },
  actions: { display: "flex", alignItems: "center", gap: "1rem" },
  uploadBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.7rem 1.75rem", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  uploadBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  // The single most important action on the screen — give it a real touch target.
  uploadBtnMobile: { ...touchTarget, display: "flex", alignItems: "center", justifyContent: "center" },
};
