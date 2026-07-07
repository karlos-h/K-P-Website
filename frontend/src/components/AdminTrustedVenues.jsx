import { useState } from "react";
import { supabase } from "../lib/supabase";

const BLANK = { name: "", type: "", initials: "", website_url: "", logo_url: "", sort_order: "" };

// ── Row ───────────────────────────────────────────────────────────────────────

function VenueRow({ venue, isEditing, isDeleting, onEdit, onDeleteClick, onCancelEdit, onCancelDelete, onSave, onConfirmDelete, saving }) {
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
        <td style={{ ...t.td, color: "#f0ece3", fontWeight: 500 }}>{venue.name}</td>
        <td style={t.td}>{venue.type || "—"}</td>
        <td style={t.td}>{venue.initials || "—"}</td>
        <td style={t.td}>
          {venue.website_url ? (
            <a href={venue.website_url} target="_blank" rel="noopener noreferrer" style={t.link}>{venue.website_url}</a>
          ) : "—"}
        </td>
        <td style={t.td}>
          {venue.logo_url ? (
            <a href={venue.logo_url} target="_blank" rel="noopener noreferrer" style={t.link}>Logo set</a>
          ) : "—"}
        </td>
        <td style={t.td}>{venue.sort_order ?? "—"}</td>
        <td style={{ ...t.td, whiteSpace: "nowrap" }}>
          {!isEditing && !isDeleting && (
            <>
              <button style={t.actionBtn} onClick={() => onEdit(venue)}>Edit</button>
              <button style={{ ...t.actionBtn, ...t.deleteBtn }} onClick={() => onDeleteClick(venue.id)}>Delete</button>
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
          <td colSpan={7} style={{ padding: 0, borderBottom: "2px solid rgba(201,168,76,0.25)" }}>
            <VenueForm initial={venue} onSave={onSave} onCancel={onCancelEdit} saving={saving} />
          </td>
        </tr>
      )}

      {/* Inline delete confirm */}
      {isDeleting && (
        <tr>
          <td colSpan={7} style={{ padding: "1rem 1.25rem", background: "#0d0808", borderBottom: "2px solid rgba(224,92,92,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#e07070" }}>
                Delete <strong style={{ color: "#f0ece3" }}>{venue.name}</strong>? This removes it from the live homepage.
              </span>
              <button style={{ ...t.saveBtn, background: "#8b1a1a" }} onClick={() => onConfirmDelete(venue)}>
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

function VenueForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name) {
      setError("Venue name is required.");
      return;
    }
    setError("");
    onSave(form);
  };

  return (
    <div style={t.formCard}>
      <h3 style={t.formTitle}>{initial?.id ? "Edit Venue" : "Add Venue"}</h3>
      {error && <div style={t.errorBanner}>{error}</div>}
      <div style={t.formGrid}>
        <label style={t.label}>
          <span style={t.labelText}>Name *</span>
          <input style={t.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Kong Bar" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Type</span>
          <input style={t.input} value={form.type || ""} onChange={e => set("type", e.target.value)} placeholder="Bar" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Initials (fallback badge)</span>
          <input style={t.input} value={form.initials || ""} onChange={e => set("initials", e.target.value)} placeholder="KB" maxLength={4} />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Sort Order</span>
          <input style={t.input} type="number" value={form.sort_order ?? ""} onChange={e => set("sort_order", e.target.value)} placeholder="1" />
        </label>
        <label style={{ ...t.label, gridColumn: "1 / -1" }}>
          <span style={t.labelText}>Website URL</span>
          <input
            style={t.input}
            type="url"
            value={form.website_url || ""}
            onChange={e => set("website_url", e.target.value)}
            placeholder="https://kongbar.co.nz/"
          />
        </label>
        <label style={{ ...t.label, gridColumn: "1 / -1" }}>
          <span style={t.labelText}>Logo URL (optional — replaces the initials badge when set)</span>
          <input
            style={t.input}
            type="url"
            value={form.logo_url || ""}
            onChange={e => set("logo_url", e.target.value)}
            placeholder="https://.../logo.png"
          />
        </label>
      </div>

      <div style={t.formActions}>
        <button
          style={{ ...t.saveBtn, ...(saving ? t.saveBtnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Venue"}
        </button>
        <button style={t.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminTrustedVenues({ venues, setVenues }) {
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    const payload = {
      name: form.name.trim(),
      type: form.type || null,
      initials: form.initials || null,
      website_url: form.website_url || null,
      logo_url: form.logo_url || null,
      sort_order: form.sort_order === "" || form.sort_order === null ? null : Number(form.sort_order),
    };

    if (editingId && editingId !== "new") {
      const { data, error } = await supabase
        .from("trusted_venues")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setVenues(prev => prev.map(v => v.id === editingId ? data : v));
    } else {
      const { data, error } = await supabase
        .from("trusted_venues")
        .insert(payload)
        .select()
        .single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setVenues(prev => [...prev, data]);
    }
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = async (venue) => {
    const { error } = await supabase.from("trusted_venues").delete().eq("id", venue.id);
    if (!error) setVenues(prev => prev.filter(v => v.id !== venue.id));
    setDeletingId(null);
  };

  const sorted = [...venues].sort((a, b) => {
    if (a.sort_order == null && b.sort_order == null) return a.name.localeCompare(b.name);
    if (a.sort_order == null) return 1;
    if (b.sort_order == null) return -1;
    return a.sort_order - b.sort_order;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button style={t.addBtn} onClick={() => { setEditingId("new"); setDeletingId(null); }}>+ Add Venue</button>
      </div>

      {saveError && <div style={t.errorBanner}>{saveError}</div>}

      {editingId === "new" && (
        <VenueForm
          initial={BLANK}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
          saving={saving}
        />
      )}

      <div style={t.tableCard}>
        <div style={t.tableWrap}>
          <table style={t.table}>
            <thead>
              <tr>
                {["Name", "Type", "Initials", "Website", "Logo", "Sort", ""].map(h => (
                  <th key={h} style={t.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={7} style={{ ...t.td, textAlign: "center", color: "#333", padding: "3rem" }}>No venues yet.</td></tr>
              ) : sorted.map(v => (
                <VenueRow
                  key={v.id}
                  venue={v}
                  isEditing={editingId === v.id}
                  isDeleting={deletingId === v.id}
                  onEdit={v => { setEditingId(v.id); setDeletingId(null); }}
                  onDeleteClick={id => { setDeletingId(id); setEditingId(null); }}
                  onCancelEdit={() => setEditingId(null)}
                  onCancelDelete={() => setDeletingId(null)}
                  onSave={handleSave}
                  onConfirmDelete={handleDelete}
                  saving={saving}
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
  formActions: { display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" },
  saveBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.6rem 1.5rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  saveBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  cancelInlineBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.25rem 0.7rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  errorBanner: { background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", color: "#e07070", padding: "0.65rem 1rem", fontSize: 13, marginBottom: "1rem" },
  tableCard: { background: "#0d0d0d", border: "1px solid #1a1a1a" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "0.75rem 1rem", color: "#444", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #111", transition: "background 0.15s" },
  td: { padding: "0.85rem 1rem", color: "#888", verticalAlign: "middle", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" },
  link: { color: "#C9A84C", textDecoration: "none" },
  actionBtn: { background: "transparent", border: "1px solid #222", color: "#666", padding: "0.3rem 0.75rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginRight: "0.4rem" },
  deleteBtn: { borderColor: "#3a1a1a", color: "#7a3a3a" },
};
