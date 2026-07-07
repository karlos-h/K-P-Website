import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const BLANK = { first_name: "", last_name: "", email: "", event_title: "", subscribed: true, notes: "" };

function toCsv(rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "first_name,last_name,email";
  const lines = rows.map(r => [r.first_name, r.last_name, r.email].map(escape).join(","));
  return [header, ...lines].join("\n");
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ContactRow({ contact, isEditing, isDeleting, onEdit, onDeleteClick, onCancelEdit, onCancelDelete, onSave, onConfirmDelete, saving }) {
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
        {/* Order ID column — not currently useful, commented out for now. May revisit later.
        <td style={t.td}>{contact.order_id || "—"}</td>
        */}
        <td style={{ ...t.td, color: "#f0ece3", fontWeight: 500 }}>{contact.first_name}</td>
        <td style={{ ...t.td, color: "#f0ece3", fontWeight: 500 }}>{contact.last_name}</td>
        <td style={t.td}>
          <a href={`mailto:${contact.email}`} style={t.emailLink}>{contact.email}</a>
        </td>
        <td style={t.td}>{contact.event_title || "—"}</td>
        <td style={t.td}>
          <span style={{ color: contact.subscribed ? "#5ec97a" : "#555" }}>
            {contact.subscribed ? "Yes" : "No"}
          </span>
        </td>
        <td style={t.td}>{contact.source}</td>
        <td style={{ ...t.td, whiteSpace: "nowrap" }}>
          {!isEditing && !isDeleting && (
            <>
              <button style={t.actionBtn} onClick={() => onEdit(contact)}>Edit</button>
              <button style={{ ...t.actionBtn, ...t.deleteBtn }} onClick={() => onDeleteClick(contact.id)}>Delete</button>
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
            <ContactForm initial={contact} onSave={onSave} onCancel={onCancelEdit} saving={saving} />
          </td>
        </tr>
      )}

      {/* Inline delete confirm */}
      {isDeleting && (
        <tr>
          <td colSpan={7} style={{ padding: "1rem 1.25rem", background: "#0d0808", borderBottom: "2px solid rgba(224,92,92,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#e07070" }}>
                Delete <strong style={{ color: "#f0ece3" }}>{contact.first_name} {contact.last_name}</strong>?
                Consider unsubscribing instead (edit → uncheck Subscribed) to keep the record — deleting removes it permanently.
              </span>
              <button style={{ ...t.saveBtn, background: "#8b1a1a" }} onClick={() => onConfirmDelete(contact)}>
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

function ContactForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setError("First name, last name, and email are required.");
      return;
    }
    setError("");
    onSave(form);
  };

  return (
    <div style={t.formCard}>
      <h3 style={t.formTitle}>{initial?.id ? "Edit Contact" : "Add Contact"}</h3>
      {error && <div style={t.errorBanner}>{error}</div>}
      <div style={t.formGrid}>
        <label style={t.label}>
          <span style={t.labelText}>First Name *</span>
          <input style={t.input} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Jane" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Last Name *</span>
          <input style={t.input} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Smith" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Email *</span>
          <input style={t.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" />
        </label>
        <label style={t.label}>
          <span style={t.labelText}>Event (optional)</span>
          <input style={t.input} value={form.event_title || ""} onChange={e => set("event_title", e.target.value)} placeholder="Wonderland Brisbane" />
        </label>
        <label style={{ ...t.label, flexDirection: "row", alignItems: "center", gap: "0.6rem", display: "flex" }}>
          <input
            type="checkbox"
            checked={!!form.subscribed}
            onChange={e => set("subscribed", e.target.checked)}
            style={{ accentColor: "#C9A84C", width: "1rem", height: "1rem" }}
          />
          <span style={t.labelText}>Subscribed</span>
        </label>
        <label style={{ ...t.label, gridColumn: "1 / -1" }}>
          <span style={t.labelText}>Notes (optional)</span>
          <textarea style={t.textarea} rows={3} value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Any context worth keeping…" />
        </label>
      </div>

      <div style={t.formActions}>
        <button
          style={{ ...t.saveBtn, ...(saving ? t.saveBtnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Contact"}
        </button>
        <button style={t.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminMailingList({ contacts, setContacts }) {
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [subscribedOnly, setSubscribedOnly] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSummary, setSyncSummary] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncSummary(null);

    const { data, error } = await supabase.functions.invoke("humanitix-sync");

    if (error) {
      // supabase-js doesn't parse the function's JSON body into error.message on
      // non-2xx responses — the real reason is on error.context (a Response).
      let detail = error.message || "Sync failed.";
      try {
        const body = await error.context?.json?.();
        if (body?.error) detail = body.error;
      } catch {
        // response body wasn't JSON — fall back to the generic message
      }
      setSyncError(detail);
      setSyncing(false);
      return;
    }
    if (data?.error) {
      setSyncError(data.error);
      setSyncing(false);
      return;
    }

    setSyncSummary(data);

    const { data: refreshed, error: refreshError } = await supabase
      .from("mailing_list")
      .select("*")
      .order("created_at", { ascending: false });
    if (!refreshError && refreshed) setContacts(refreshed);

    setSyncing(false);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      event_title: form.event_title || null,
      subscribed: !!form.subscribed,
      notes: form.notes || null,
      source: "manual",
    };

    if (editingId && editingId !== "new") {
      const { data, error } = await supabase
        .from("mailing_list")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setContacts(prev => prev.map(c => c.id === editingId ? data : c));
    } else {
      const { data, error } = await supabase
        .from("mailing_list")
        .insert(payload)
        .select()
        .single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setContacts(prev => [data, ...prev]);
    }
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = async (contact) => {
    const { error } = await supabase.from("mailing_list").delete().eq("id", contact.id);
    if (!error) setContacts(prev => prev.filter(c => c.id !== contact.id));
    setDeletingId(null);
  };

  const filtered = useMemo(() => {
    let list = contacts;
    if (subscribedOnly) list = list.filter(c => c.subscribed);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [contacts, search, subscribedOnly]);

  const handleExport = () => {
    const csv = toCsv(filtered);
    downloadCsv(csv, `mailing-list-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <div style={t.toolbar}>
        <input
          style={{ ...t.input, maxWidth: "280px" }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={subscribedOnly}
            onChange={e => setSubscribedOnly(e.target.checked)}
            style={{ accentColor: "#C9A84C", width: "1rem", height: "1rem" }}
          />
          <span style={{ fontSize: 14, color: "#888" }}>Subscribed only</span>
        </label>
        <div style={{ flex: 1 }} />
        <button style={t.cancelBtn} onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync Now (Humanitix)"}
        </button>
        <button style={t.cancelBtn} onClick={handleExport} disabled={filtered.length === 0}>
          Export CSV
        </button>
        <button style={t.addBtn} onClick={() => { setEditingId("new"); setDeletingId(null); }}>+ Add Contact</button>
      </div>

      {syncError && <div style={t.errorBanner}>{syncError}</div>}
      {syncSummary && (
        <div style={t.summaryBanner}>
          Sync complete — checked {syncSummary.events_checked} event{syncSummary.events_checked !== 1 ? "s" : ""},
          fetched {syncSummary.attendees_fetched} attendee{syncSummary.attendees_fetched !== 1 ? "s" : ""}:{" "}
          <strong>{syncSummary.inserted}</strong> inserted, <strong>{syncSummary.updated}</strong> updated,{" "}
          <strong>{syncSummary.skipped_unsubscribed}</strong> skipped (unsubscribed)
          {syncSummary.errors?.length > 0 && (
            <span style={{ color: "#e07070" }}> — {syncSummary.errors.length} error{syncSummary.errors.length !== 1 ? "s" : ""}: {syncSummary.errors.join("; ")}</span>
          )}
        </div>
      )}

      {saveError && <div style={t.errorBanner}>{saveError}</div>}

      {editingId === "new" && (
        <ContactForm
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
                {/* "Order ID" column commented out — not currently useful, may revisit later */}
                {["First Name", "Last Name", "Email", "Event", "Subscribed", "Source", ""].map(h => (
                  <th key={h} style={t.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...t.td, textAlign: "center", color: "#333", padding: "3rem" }}>
                  {contacts.length === 0 ? "No contacts yet." : "No contacts match your search."}
                </td></tr>
              ) : filtered.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  isEditing={editingId === c.id}
                  isDeleting={deletingId === c.id}
                  onEdit={c => { setEditingId(c.id); setDeletingId(null); }}
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
  toolbar: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  addBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.55rem 1.25rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  formCard: { background: "#0b0b0b", border: "1px solid #1a1a1a", borderTop: "2px solid rgba(201,168,76,0.25)", padding: "1.5rem", marginBottom: "1.5rem" },
  formTitle: { fontSize: 18, fontWeight: 500, color: "#f0ece3", marginBottom: "1.25rem", marginTop: 0 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" },
  label: { display: "grid", gap: "0.35rem" },
  labelText: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" },
  input: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: 14, fontFamily: "inherit", outline: "none" },
  textarea: { background: "#111", border: "1px solid #222", color: "#f0ece3", padding: "0.55rem 0.75rem", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" },
  formActions: { display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" },
  saveBtn: { background: "#C9A84C", border: "none", color: "#090909", padding: "0.6rem 1.5rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  saveBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  cancelBtn: { background: "transparent", border: "1px solid #333", color: "#666", padding: "0.6rem 1.25rem", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  cancelInlineBtn: { background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "0.25rem 0.7rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  errorBanner: { background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", color: "#e07070", padding: "0.65rem 1rem", fontSize: 13, marginBottom: "1rem" },
  summaryBanner: { background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C", padding: "0.65rem 1rem", fontSize: 13, marginBottom: "1rem" },
  tableCard: { background: "#0d0d0d", border: "1px solid #1a1a1a" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "0.75rem 1rem", color: "#444", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #111", transition: "background 0.15s" },
  td: { padding: "0.85rem 1rem", color: "#888", verticalAlign: "middle" },
  emailLink: { color: "#C9A84C", textDecoration: "none" },
  actionBtn: { background: "transparent", border: "1px solid #222", color: "#666", padding: "0.3rem 0.75rem", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginRight: "0.4rem" },
  deleteBtn: { borderColor: "#3a1a1a", color: "#7a3a3a" },
};
