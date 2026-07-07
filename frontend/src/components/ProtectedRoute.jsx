// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { checkIsAdmin } from '../lib/admin'

export default function ProtectedRoute({ children }) {
  // checking → still verifying session + admin status
  // authed   → admin session confirmed
  // guest    → no session, send to login
  // forbidden → signed in but not on the admins allowlist
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatus('guest')
        return
      }
      const isAdmin = await checkIsAdmin()
      setStatus(isAdmin ? 'authed' : 'forbidden')
    }

    verify()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setStatus('guest')
        return
      }
      const isAdmin = await checkIsAdmin()
      setStatus(isAdmin ? 'authed' : 'forbidden')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'checking') return null

  if (status === 'guest') return <Navigate to="/login" replace />

  if (status === 'forbidden') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#080808', color: '#f0ece3', fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        padding: '2rem', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '420px' }}>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Access denied</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            You are signed in, but this account is not on the admin allowlist.
            If you believe this is a mistake, contact the site owner.
          </p>
          <a href="/" style={{ color: '#C9A84C', fontSize: '0.85rem' }}>← Back to website</a>
        </div>
      </div>
    )
  }

  return children
}
