import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const BUCKET = "event-photos";

function slugify(text, date) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return date ? `${base}-${date}` : base;
}

// ── Individual file row ───────────────────────────────────────────────────────

function FileRow({ file, progress, error, isCover, onSetCover, publicUrl }) {
  const thumb = publicUrl ?? URL.createObjectURL(file);
  return (
    <div style={{ ...rs.fileRow, borderColor: isCover ? "#c9a84c" : "#1e1e1e" }}>
      <img src={thumb} alt={file.name} style={rs.thumb} />
      <div style={rs.fileInfo}>
        <span style={rs.fileName}>{file.name}</span>
        {error
          ? <span style={rs.errorText}>{error}</span>
          : progress < 100
            ? <div style={rs.progressBar}><div style={{ ...rs.progressFill, width: `${progress}%` }} /></div>
            : <span style={rs.doneText}>✓ Uploaded</span>
        }
      </div>
      <button
        style={{ ...rs.coverBtn, ...(isCover ? rs.coverBtnActive : {}) }}
        onClick={() => onSetCover(file.name)}
        title="Set as cover photo"
      >
        {isCover ? "★ Cover" : "☆ Cover"}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPhotoUpload({ events, onDone, defaultSlug }) {
  const fileInputRef = useRef(null);

  // When defaultSlug is provided (from gallery detail view), lock to that event.
  const lockedBySlug = !!defaultSlug;

  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [selectedEventId, setSelectedEventId] = useState(() => {
    if (!defaultSlug) return "";
    // Try to find the event whose slugified form matches defaultSlug
    return events.find((e) => {
      const base = (e.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = e.date ? `${base}-${e.date}` : base;
      return slug === defaultSlug;
    })?.id ?? "";
  });
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // filename -> 0-100
  const [errors, setErrors] = useState({});     // filename -> error string
  const [publicUrls, setPublicUrls] = useState({}); // filename -> url
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const resolvedName = mode === "existing" ? selectedEvent?.title ?? "" : newEventName;
  const resolvedDate = mode === "existing" ? selectedEvent?.date ?? "" : newEventDate;
  const resolvedSlug = slugify(resolvedName, resolvedDate);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    setFiles(picked);
    setProgress({});
    setErrors({});
    setPublicUrls({});
    setCoverFile(picked[0]?.name ?? null);
    setDone(false);
  };

  const upload = async () => {
    const effectiveSlug = defaultSlug ?? resolvedSlug;
    if ((!resolvedName && !defaultSlug) || files.length === 0) return;
    setUploading(true);

    const rows = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${effectiveSlug}/${file.name}`;

      setProgress((p) => ({ ...p, [file.name]: 5 }));

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

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
                style={{ ...rs.toggleBtn, ...(mode === m ? rs.toggleBtnActive : {}) }}
                onClick={() => setMode(m)}
              >
                {m === "existing" ? "Link to existing event" : "New event"}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <select
              style={rs.select}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">— select an event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
              ))}
            </select>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label style={rs.label}>
                <span style={rs.labelText}>Event name</span>
                <input style={rs.input} value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Original Sin" />
              </label>
              <label style={rs.label}>
                <span style={rs.labelText}>Event date</span>
                <input style={rs.input} type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          // webkitdirectory allows folder selection in Chrome/Edge
          webkitdirectory=""
          style={{ display: "none" }}
          onChange={handleFiles}
        />
        {files.length === 0 ? (
          <>
            <span style={rs.dropIcon}>📁</span>
            <span style={rs.dropText}>Click to select a folder or multiple photos</span>
            <span style={rs.dropHint}>Accepts JPG, PNG, WebP — folder selection works in Chrome/Edge</span>
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
            />
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={rs.actions}>
        <button
          style={{ ...rs.uploadBtn, ...(!canUpload ? rs.uploadBtnDisabled : {}) }}
          onClick={upload}
          disabled={!canUpload}
        >
          {uploading ? "Uploading…" : `Upload ${files.length > 0 ? files.length + " photo" + (files.length !== 1 ? "s" : "") : ""}`}
        </button>
        {done && <span style={rs.doneText}>✓ All done — photos are live on the site</span>}
      </div>
    </div>
  );
}

// ── Inline styles (matches AdminDashboard's dark aesthetic) ──────────────────

const rs = {
  panel: { background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "1.75rem", marginTop: "2rem" },
  heading: { fontSize: "1rem", fontWeight: 500, marginBottom: "1.5rem", color: "#f0ece3" },
  toggleRow: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  toggleBtn: { background: "transparent", border: "1px solid #222", color: "#555", padding: "0.35rem 0.85rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  toggleBtnActive: { borderColor: "#C9A84C", color: "#C9A84C" },
  select: { width: "100%", background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.6rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit", marginBottom: "0.75rem" },
  label: { display: "grid", gap: "0.3rem" },
  labelText: { fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" },
  input: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit" },
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
  errorText: { color: "#e05c5c", fontSize: "0.72rem" },
  coverBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.3rem 0.6rem", fontSize: "0.68rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 },
  coverBtnActive: { borderColor: "#C9A84C", color: "#C9A84C" },
  actions: { display: "flex", alignItems: "center", gap: "1rem" },
  uploadBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.7rem 1.75rem", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  uploadBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
};
