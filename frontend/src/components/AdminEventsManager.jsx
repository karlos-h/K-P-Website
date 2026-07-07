import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Performance time helpers ─────────────────────────────────────────────────
// performance_time is stored as a display string, e.g. "9:00 PM – 11:00 PM".
// The form edits it as two native <input type="time"> (24h HH:MM) fields and
// combines/parses to and from that display string.

function to12Hour(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function combineTimeRange(start, end) {
  if (start && end) return `${to12Hour(start)} – ${to12Hour(end)}`;
  if (start) return to12Hour(start);
  if (end) return to12Hour(end);
  return "";
}

function parseTimeToken(token) {
  if (!token) return "";
  const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return "";
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const period = m[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function splitTimeRange(str) {
  if (!str) return { start: "", end: "" };
  const [startToken, endToken] = str.split(/[–-]/).map(s => s.trim());
  return { start: parseTimeToken(startToken), end: parseTimeToken(endToken) };
}

// ── Autocomplete input (custom-styled, replaces native <datalist>) ──────────
// Native <datalist> dropdowns are rendered by the OS/browser and can't be
// restyled with CSS — this reimplements the same "common values" affordance
// as a fully themeable dropdown.

function Autocomplete({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = value
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()) && o !== value)
    : options;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        style={t.input}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={t.acDropdown}>
          {filtered.map(opt => (
            <div
              key={opt}
              style={t.acOption}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.color = "#C9A84C"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccc"; }}
              onMouseDown={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BLANK = {
  title: "", sort_date: "", performance_time: "", location: "", city: "",
  type: "", status: "upcoming", ticket_url: "", humanitix_event_id: "",
  photo_gallery_url: "", photo_gallery_embeddable: false,
  photographer_name: "", photographer_url: "",
};

// ── Row ───────────────────────────────────────────────────────────────────────

function EventRow({ event, isEditing, isDeleting, onEdit, onDeleteClick, onCancelEdit, onCancelDelete, onSave, onConfirmDelete, saving, allEvents }) {
  return (
    <>
      <tr
        style={{
          ...t.tr,
          background: isEditing ? "rgba(201,168,76,0.06)" : isDeleting ? "rgba(224,92,92,0.05)" : "transparent",
        }}
        onMouseEnter={e => { if (!isEditing && !isDeleting) e.currentTarget.style.background = "#111"; }}
        onMouseLeave={e => { e.currentTarget.style.background = isEditing ? "rgba(201,168,76,0.06)" : isDeleting ? "rgba(224,92,92,0.05)" : "transparent"; }}
      >
        <td style={{ ...t.td, color: "#f0ece3", fontWeight: 500 }}>{event.title}</td>
        <td style={t.td}>{formatDate(event.sort_date)}</td>
        <td style={t.td}>{event.performance_time || "—"}</td>
        <td style={t.td}>{event.location || "—"}</td>
        <td style={t.td}>{event.city || "—"}</td>
        <td style={t.td}>{event.type || "—"}</td>
        <td style={t.td}>
          <span style={{ color: event.status === "upcoming" ? "#5b9cf6" : "#555" }}>
            {event.status || "—"}
          </span>
        </td>
        <td style={{ ...t.td, whiteSpace: "nowrap" }}>
          {!isEditing && !isDeleting && (
            <>
              <button style={t.actionBtn} onClick={() => onEdit(event)}>Edit</button>
              <button style={{ ...t.actionBtn, ...t.deleteBtn }} onClick={() => onDeleteClick(event.id)}>Delete</button>
            </>
          )}
          {(isEditing || isDeleting) && (
            <button style={t.cancelInlineBtn} onClick={isEditing ? onCancelEdit : onCancelDelete}>✕ Cancel</button>
          )}
        </td>
      </tr>

      {/* Inline edit form */}
      {isEditing && (
        <tr>
          <td colSpan={8} style={{ padding: 0, borderBottom: "2px solid rgba(201,168,76,0.25)" }}>
            <EventForm initial={event} onSave={onSave} onCancel={onCancelEdit} saving={saving} allEvents={allEvents} />
          </td>
        </tr>
      )}

      {/* Inline delete confirm */}
      {isDeleting && (
        <tr>
          <td colSpan={8} style={{ padding: "1rem 1.25rem", background: "#0d0808", borderBottom: "2px solid rgba(224,92,92,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#e07070" }}>
                Delete <strong style={{ color: "#f0ece3" }}>{event.title}</strong>? This removes it from the live homepage.
              </span>
              <button style={{ ...t.saveBtn, background: "#8b1a1a" }} onClick={() => onConfirmDelete(event)}>
                Yes, delete
              </button>
              <button style={t.cancelBtn} onClick={onCancelDelete}>Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function uniqueValues(events, key) {
  return [...new Set(events.map(e => e[key]).filter(Boolean))].sort();
}

function EventForm({ initial, onSave, onCancel, saving, allEvents = [] }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [galleryOpen, setGalleryOpen] = useState(
    !!(initial?.photo_gallery_url || initial?.photographer_name)
  );
  const [timeRange, setTimeRange] = useState(() => splitTimeRange(initial?.performance_time));

  const cityOptions = uniqueValues(allEvents, "city");
  const locationOptions = uniqueValues(allEvents, "location");
  const typeOptions = uniqueValues(allEvents, "type");

  const handleDateChange = (val) => {
    setForm(f => ({
      ...f,
      sort_date: val,
      status: val ? (val < today() ? "past" : "upcoming") : f.status,
    }));
  };

  const handleSubmit = () => {
    onSave({ ...form, performance_time: combineTimeRange(timeRange.start, timeRange.end) });
  };

  return (
    <div style={t.formCard}>
      <h3 style={t.formTitle}>{initial?.id ? "Edit Event" : "Add Event"}</h3>
      <div style={t.formGrid}>
        <label style={t.label}>
          <span style={t.labelText}>Title *</span>
          <input style={t.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Wonderland Brisbane" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Performance Date</span>
          <input style={t.input} type="date" value={form.sort_date || ""} onChange={e => handleDateChange(e.target.value)} />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Start Time</span>
          <input style={t.input} type="time" value={timeRange.start} onChange={e => setTimeRange(r => ({ ...r, start: e.target.value }))} />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>End Time</span>
          <input style={t.input} type="time" value={timeRange.end} onChange={e => setTimeRange(r => ({ ...r, end: e.target.value }))} />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Venue</span>
          <Autocomplete value={form.location || ""} onChange={v => set("location", v)} options={locationOptions} placeholder="Mud Bar" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>City</span>
          <Autocomplete value={form.city || ""} onChange={v => set("city", v)} options={cityOptions} placeholder="Christchurch, New Zealand" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Type</span>
          <Autocomplete value={form.type || ""} onChange={v => set("type", v)} options={typeOptions} placeholder="Festival" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Status (auto-set from date)</span>
          <select style={t.select} value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </label>
        <label style={{ ...t.label, gridColumn: "1 / -1" }}>
          <span style={t.labelText}>Ticket URL</span>
          <input
            style={t.input}
            type="url"
            value={form.ticket_url || ""}
            onChange={e => set("ticket_url", e.target.value)}
            placeholder="https://www.eventfinda.co.nz/..."
          />
        </label>
        <label style={{ ...t.label, gridColumn: "1 / -1" }}>
          <span style={t.labelText}>Humanitix Event ID (optional — enables mailing list sync)</span>
          <input
            style={t.input}
            value={form.humanitix_event_id || ""}
            onChange={e => set("humanitix_event_id", e.target.value)}
            placeholder="e.g. 64f3c2a1b9d4e2..."
          />
        </label>
      </div>

      {/* Collapsible photographer / external gallery section */}
      <div style={t.collapseToggle} onClick={() => setGalleryOpen(o => !o)}>
        <span style={t.collapseArrow}>{galleryOpen ? "▾" : "▸"}</span>
        <span style={t.labelText}>Photographer / External Gallery</span>
        {(form.photo_gallery_url || form.photographer_name) && (
          <span style={t.collapseSet}>set</span>
        )}
      </div>

      {galleryOpen && (
        <div style={{ ...t.formGrid, marginTop: "0.75rem", marginBottom: "1.25rem" }}>
          <label style={{ ...t.label, gridColumn: "1 / -1" }}>
            <span style={t.labelText}>Gallery URL (Adobe Lightroom, Google Photos, etc.)</span>
            <input
              style={t.input}
              type="url"
              value={form.photo_gallery_url || ""}
              onChange={e => set("photo_gallery_url", e.target.value)}
              placeholder="https://lightroom.adobe.com/shares/..."
            />
          </label>
          <label style={{ ...t.label, gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: "0.6rem", display: "flex" }}>
            <input
              type="checkbox"
              checked={!!form.photo_gallery_embeddable}
              onChange={e => set("photo_gallery_embeddable", e.target.checked)}
              style={{ accentColor: "#C9A84C", width: "1rem", height: "1rem" }}
            />
            <span style={{ fontSize: 13, color: "#888" }}>
              This link supports embedding on the site (most platforms block this — leave unchecked if unsure)
            </span>
          </label>
          <label style={t.label}>
            <span style={t.labelText}>Photographer name</span>
            <input
              style={t.input}
              value={form.photographer_name || ""}
              onChange={e => set("photographer_name", e.target.value)}
              placeholder="Jane Smith"
            />
          </label>
          <label style={t.label}>
            <span style={t.labelText}>Photographer website / portfolio URL</span>
            <input
              style={t.input}
              type="url"
              value={form.photographer_url || ""}
              onChange={e => set("photographer_url", e.target.value)}
              placeholder="https://janesmith.photography"
            />
          </label>
        </div>
      )}

      <div style={t.formActions}>
        <button
          style={{ ...t.saveBtn, ...(saving ? t.saveBtnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={saving || !form.title}
        >
          {saving ? "Saving…" : "Save Event"}
        </button>
        <button style={t.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminEventsManager({ events, setEvents }) {
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (form) => {
    setSaving(true);
    const displayDate = form.sort_date
      ? new Date(form.sort_date + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
      : null;
    const autoStatus = form.sort_date
      ? (form.sort_date < today() ? "past" : "upcoming")
      : form.status;

    const payload = {
      title: form.title,
      date: displayDate,
      sort_date: form.sort_date || null,
      performance_time: form.performance_time || null,
      location: form.location || null,
      city: form.city || null,
      type: form.type || null,
      status: autoStatus,
      ticket_url: form.ticket_url || null,
      humanitix_event_id: form.humanitix_event_id || null,
      photo_gallery_url: form.photo_gallery_url || null,
      photo_gallery_embeddable: !!form.photo_gallery_embeddable,
      photographer_name: form.photographer_name || null,
      photographer_url: form.photographer_url || null,
    };

    if (editingId && editingId !== "new") {
      const { data, error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (!error) setEvents(prev => prev.map(e => e.id === editingId ? data : e));
    } else {
      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select()
        .single();
      if (!error) setEvents(prev => [data, ...prev]);
    }
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = async (event) => {
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (!error) setEvents(prev => prev.filter(e => e.id !== event.id));
    setDeletingId(null);
  };

  const sorted = [...events].sort((a, b) => {
    if (a.status !== b.status) return a.status === "upcoming" ? -1 : 1;
    if (a.sort_date && b.sort_date) return b.sort_date.localeCompare(a.sort_date);
    if (a.sort_date) return -1;
    if (b.sort_date) return 1;
    return a.title.localeCompare(b.title);
  });

  const cols = ["Title", "Performance Date", "Time", "Venue", "City", "Type", "Status", ""];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button style={t.addBtn} onClick={() => { setEditingId("new"); setDeletingId(null); }}>+ Add Event</button>
      </div>

      {editingId === "new" && (
        <EventForm
          initial={BLANK}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
          saving={saving}
          allEvents={events}
        />
      )}

      <div style={t.tableCard}>
        <div style={t.tableWrap}>
          <table style={t.table}>
            <thead>
              <tr>
                {cols.map(h => <th key={h} style={t.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={8} style={{ ...t.td, textAlign: "center", color: "#333", padding: "3rem" }}>No events yet.</td></tr>
              ) : sorted.map(ev => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  isEditing={editingId === ev.id}
                  isDeleting={deletingId === ev.id}
                  onEdit={ev => { setEditingId(ev.id); setDeletingId(null); }}
                  onDeleteClick={id => { setDeletingId(id); setEditingId(null); }}
                  onCancelEdit={() => setEditingId(null)}
                  onCancelDelete={() => setDeletingId(null)}
                  onSave={handleSave}
                  onConfirmDelete={handleDelete}
                  saving={saving}
                  allEvents={events}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const t = {
  addBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.55rem 1.25rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  formCard: { background: "#0b0b0b", border: "1px solid #1a1a1a", borderTop: "2px solid rgba(201,168,76,0.25)", padding: "1.5rem" },
  formTitle: { fontSize: 18, fontWeight: 500, color: "#f0ece3", marginBottom: "1.25rem", marginTop: 0 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" },
  label: { display: "grid", gap: "0.35rem" },
  labelText: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" },
  input: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: 14, fontFamily: "inherit", outline: "none" },
  select: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: 14, fontFamily: "inherit", outline: "none" },
  formActions: { display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" },
  saveBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.6rem 1.5rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  saveBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  cancelInlineBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.25rem 0.7rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  tableCard: { background: "#0d0d0d", border: "1px solid #1a1a1a" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "0.75rem 1rem", color: "#444", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #111", transition: "background 0.15s" },
  td: { padding: "0.85rem 1rem", color: "#888", verticalAlign: "middle" },
  actionBtn: { background: "transparent", border: "1px solid #222", color: "#666", padding: "0.3rem 0.75rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginRight: "0.4rem" },
  deleteBtn: { borderColor: "#3a1a1a", color: "#7a3a3a" },
  collapseToggle: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: "0.25rem", userSelect: "none", padding: "0.5rem 0" },
  collapseArrow: { color: "#C9A84C", fontSize: 13, lineHeight: 1 },
  collapseSet: { background: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 11, padding: "0.1rem 0.4rem", letterSpacing: "0.1em", textTransform: "uppercase" },
  acDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#111", border: "1px solid #2a2a2a", borderTop: "2px solid rgba(201,168,76,0.4)", maxHeight: "200px", overflowY: "auto", zIndex: 30, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
  acOption: { padding: "0.55rem 0.75rem", fontSize: 14, color: "#ccc", cursor: "pointer", transition: "background 0.12s, color 0.12s" },
};
