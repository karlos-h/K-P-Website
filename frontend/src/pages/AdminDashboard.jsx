// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      setUser(session.user)
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setEnquiries(data)
      setLoading(false)
    }
    init()
  }, [navigate])

  const updateStatus = async (id, status) => {
    await supabase.from('enquiries').update({ status }).eq('id', id)
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const counts = {
    all: enquiries.length,
    new: enquiries.filter(e => e.status === 'new' || !e.status).length,
    reviewed: enquiries.filter(e => e.status === 'reviewed').length,
    booked: enquiries.filter(e => e.status === 'booked').length,
  }

  const filtered = filter === 'all'
    ? enquiries
    : enquiries.filter(e => (filter === 'new' ? (!e.status || e.status === 'new') : e.status === filter))

  if (loading) return (
    <div style={s.page}>
      <div style={{ padding: '4rem', textAlign: 'center', color: '#555' }}>Loading…</div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <span style={s.logo}>K&amp;P</span>
          <span style={s.topbarTitle}>Admin</span>
        </div>
        <div style={s.topbarRight}>
          <span style={s.userEmail}>{user?.email}</span>
          <a href="/" style={s.siteLink}>← View Site</a>
          <button onClick={handleLogout} style={s.logoutBtn}>Log Out</button>
        </div>
      </div>

      <div style={s.content}>
        <div style={s.statsRow}>
          {[
            { label: 'Total', value: counts.all, color: '#C9A84C' },
            { label: 'New', value: counts.new, color: '#5b9cf6' },
            { label: 'Reviewed', value: counts.reviewed, color: '#888' },
            { label: 'Booked', value: counts.booked, color: '#5ec97a' },
          ].map(stat => (
            <div key={stat.label} style={s.statCard}>
              <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={s.tableCard}>
          <div style={s.tableHeader}>
            <h2 style={s.tableTitle}>Enquiries</h2>
            <div style={s.filters}>
              {['all', 'new', 'reviewed', 'booked'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  ...s.filterBtn,
                  ...(filter === f ? s.filterBtnActive : {})
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? enquiries.length})
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p style={s.empty}>No enquiries yet.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Date', 'Name', 'Company', 'Event', 'Email', 'Message', 'Status'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} style={s.tr}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#111'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={s.td}>
                        {new Date(e.created_at).toLocaleDateString('en-NZ', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td style={{ ...s.td, color: '#f0ece3', fontWeight: 500 }}>{e.name}</td>
                      <td style={s.td}>{e.company || '—'}</td>
                      <td style={s.td}>{e.event_type || '—'}</td>
                      <td style={s.td}>
                        <a href={`mailto:${e.email}`} style={s.emailLink}>{e.email}</a>
                      </td>
                      <td style={{ ...s.td, maxWidth: '200px' }}>
                        <span title={e.message} style={s.msgClamp}>{e.message}</span>
                      </td>
                      <td style={s.td}>
                        <select
                          value={e.status || 'new'}
                          onChange={ev => updateStatus(e.id, ev.target.value)}
                          style={{
                            ...s.statusSelect,
                            color: e.status === 'booked' ? '#5ec97a'
                              : e.status === 'reviewed' ? '#aaa'
                              : '#5b9cf6'
                          }}
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="booked">Booked</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#080808', color: '#f0ece3', fontFamily: "'Inter', 'Helvetica Neue', sans-serif" },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '60px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 100 },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { fontFamily: "'Playfair Display', serif", color: '#C9A84C', fontSize: '1.1rem', letterSpacing: '0.1em' },
  topbarTitle: { color: '#555', fontSize: '0.75rem', letterSpacing: '0.1em' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '1.25rem' },
  userEmail: { color: '#444', fontSize: '0.75rem' },
  siteLink: { color: '#666', fontSize: '0.72rem', textDecoration: 'none' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', color: '#888', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' },
  content: { padding: '2rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1.5rem', textAlign: 'center' },
  statValue: { fontSize: '2.5rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 },
  statLabel: { color: '#555', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.5rem' },
  tableCard: { background: '#0d0d0d', border: '1px solid #1a1a1a' },
  tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 1.5rem 1rem', flexWrap: 'wrap', gap: '1rem' },
  tableTitle: { fontSize: '1rem', fontWeight: 500 },
  filters: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  filterBtn: { background: 'transparent', border: '1px solid #222', color: '#555', padding: '0.35rem 0.85rem', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' },
  filterBtnActive: { borderColor: '#C9A84C', color: '#C9A84C' },
  empty: { color: '#444', padding: '3rem', textAlign: 'center', fontSize: '0.85rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th: { textAlign: 'left', padding: '0.75rem 1rem', color: '#444', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #111', transition: 'background 0.15s' },
  td: { padding: '0.85rem 1rem', color: '#777', verticalAlign: 'top' },
  emailLink: { color: '#C9A84C', textDecoration: 'none' },
  msgClamp: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, color: '#555' },
  statusSelect: { background: '#111', border: '1px solid #222', padding: '0.3rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' },
}