import { useState } from "react";
import { supabase } from "../lib/supabase";

const today = () => new Date().toISOString().slice(0, 10);

function isPastDue(event) {
  return (
    event.status === "upcoming" &&
    event.sort_date &&
    event.sort_date < today()
  );
}

const BLANK = { title: "", date: "", sort_date: "", location: "", type: "", status: "upcoming" };

// ── Row ───────────────────────────────────────────────────────────────────────

function EventRow({ event, onEdit, onDelete }) {
  const pastDue = isPastDue(event);
  return (
    <tr
      style={{ ...t.tr, background: pastDue ? "rgba(224,92,92,0.05)" : "transparent" }}
      onMouseEnter={e => { if (!pastDue) e.currentTarget.style.background = "#111"; }}
      onMouseLeave={e => { e.currentTarget.style.background = pastDue ? "rgba(224,92,92,0.05)" : "transparent"; }}
    >
      <td style={{ ...t.td, color: "#f0ece3", fontWeight: 500 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {event.title}
          {pastDue && (
            <span style={t.warningBadge} title="This event's sort date has passed — update its status to Past">
              ⚠ Date passed
            </span>
          )}
        </div>
      </td>
      <td style={t.td}>{event.date || "—"}</td>
      <td style={t.td}>{event.sort_date || "—"}</td>
      <td style={t.td}>{event.location || "—"}</td>
      <td style={t.td}>{event.type || "—"}</td>
      <td style={t.td}>
        <span style={{ color: event.status === "upcoming" ? "#5b9cf6" : "#555" }}>
          {event.status || "—"}
        </span>
      </td>
      <td style={{ ...t.td, whiteSpace: "nowrap" }}>
        <button style={t.actionBtn} onClick={() => onEdit(event)}>Edit</button>
        <button style={{ ...t.actionBtn, ...t.deleteBtn }} onClick={() => onDelete(event)}>Delete</button>
      </td>
    </tr>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function EventForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={t.formCard}>
      <h3 style={t.formTitle}>{initial?.id ? "Edit Event" : "Add Event"}</h3>
      <div style={t.formGrid}>
        <label style={t.label}>
          <span style={t.labelText}>Title *</span>
          <input style={t.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Wonderland Brisbane" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Display date (free text)</span>
          <input style={t.input} value={form.date} onChange={e => set("date", e.target.value)} placeholder="27 June 2026" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Sort date (for "has it passed?" logic)</span>
          <input style={t.input} type="date" value={form.sort_date} onChange={e => set("sort_date", e.target.value)} />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Location</span>
          <input style={t.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Brisbane, Australia" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Type</span>
          <input style={t.input} value={form.type} onChange={e => set("type", e.target.value)} placeholder="Festival" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Status</span>
          <select style={t.select} value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </label>
      </div>
      <div style={t.formActions}>
        <button
          style={{ ...t.saveBtn, ...(saving ? t.saveBtnDisabled : {}) }}
          onClick={() => onSave(form)}
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
  const [editing, setEditing] = useState(null);  // null | event object | "new"
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const pastDueCount = events.filter(isPastDue).length;

  const handleSave = async (form) => {
    setSaving(true);
    const payload = {
      title: form.title,
      date: form.date || null,
      sort_date: form.sort_date || null,
      location: form.location || null,
      type: form.type || null,
      status: form.status,
    };

    if (editing?.id) {
      const { data, error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error) setEvents(prev => prev.map(e => e.id === editing.id ? data : e));
    } else {
      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select()
        .single();
      if (!error) setEvents(prev => [data, ...prev]);
    }
    setSaving(false);
    setEditing(null);
  };

  const handleDelete = async (event) => {
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (!error) setEvents(prev => prev.filter(e => e.id !== event.id));
    setConfirmDelete(null);
  };

  // Sort: upcoming first, then by sort_date asc (nulls last), then title
  const sorted = [...events].sort((a, b) => {
    if (a.status !== b.status) return a.status === "upcoming" ? -1 : 1;
    if (a.sort_date && b.sort_date) return a.sort_date.localeCompare(b.sort_date);
    if (a.sort_date) return -1;
    if (b.sort_date) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div>
      {/* Warning banner */}
      {pastDueCount > 0 && (
        <div style={t.warningBanner}>
          ⚠ {pastDueCount} upcoming event{pastDueCount !== 1 ? "s have" : " has"} a sort date in the past — mark {pastDueCount !== 1 ? "them" : "it"} as Past
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button style={t.addBtn} onClick={() => setEditing("new")}>+ Add Event</button>
      </div>

      {(editing === "new" || editing?.id) && (
        <EventForm
          initial={editing === "new" ? BLANK : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={t.confirmBox}>
          <p style={{ margin: "0 0 1rem", color: "#f0ece3", fontSize: "0.85rem" }}>
            Delete <strong>{confirmDelete.title}</strong>? This removes it from the live homepage.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={{ ...t.saveBtn, background: "#8b1a1a", borderColor: "#8b1a1a" }} onClick={() => handleDelete(confirmDelete)}>
              Yes, delete
            </button>
            <button style={t.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={t.tableCard}>
        <div style={t.tableWrap}>
          <table style={t.table}>
            <thead>
              <tr>
                {["Title", "Display Date", "Sort Date", "Location", "Type", "Status", ""].map(h => (
                  <th key={h} style={t.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={7} style={{ ...t.td, textAlign: "center", color: "#333", padding: "3rem" }}>No events yet.</td></tr>
              ) : sorted.map(ev => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  onEdit={setEditing}
                  onDelete={setConfirmDelete}
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
  warningBanner: { background: "rgba(224,92,92,0.12)", border: "1px solid rgba(224,92,92,0.3)", color: "#e07070", padding: "0.75rem 1rem", fontSize: "0.8rem", marginBottom: "1.25rem" },
  warningBadge: { background: "rgba(224,92,92,0.15)", border: "1px solid rgba(224,92,92,0.35)", color: "#e07070", fontSize: "0.62rem", padding: "0.15rem 0.45rem", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  addBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.55rem 1.25rem", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  formCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "1.5rem", marginBottom: "1.5rem" },
  formTitle: { fontSize: "0.85rem", fontWeight: 500, color: "#f0ece3", marginBottom: "1.25rem" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" },
  label: { display: "grid", gap: "0.3rem" },
  labelText: { fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" },
  input: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit", outline: "none" },
  select: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: "0.82rem", fontFamily: "inherit", outline: "none" },
  formActions: { display: "flex", gap: "0.75rem", alignItems: "center" },
  saveBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.6rem 1.5rem", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  saveBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit" },
  confirmBox: { background: "#0d0d0d", border: "1px solid rgba(224,92,92,0.3)", padding: "1.25rem 1.5rem", marginBottom: "1.25rem" },
  tableCard: { background: "#0d0d0d", border: "1px solid #1a1a1a" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th: { textAlign: "left", padding: "0.75rem 1rem", color: "#444", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #111", transition: "background 0.15s" },
  td: { padding: "0.85rem 1rem", color: "#777", verticalAlign: "middle" },
  actionBtn: { background: "transparent", border: "1px solid #222", color: "#666", padding: "0.25rem 0.65rem", fontSize: "0.68rem", cursor: "pointer", fontFamily: "inherit", marginRight: "0.4rem" },
  deleteBtn: { borderColor: "#3a1a1a", color: "#7a3a3a" },
};
