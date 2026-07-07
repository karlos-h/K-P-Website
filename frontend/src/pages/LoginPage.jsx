// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { checkIsAdmin } from '../lib/admin'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && await checkIsAdmin()) {
        navigate('/admin', { replace: true })
      }
    }
    checkExistingSession()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      await supabase.auth.signOut()
      setError('This account does not have admin access.')
      setLoading(false)
      return
    }

    navigate('/admin')
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <p className="wordmark" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
          K&amp;P
        </p>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>Admin Access</h2>
        <p className="section-label" style={{ marginBottom: '2.5rem' }}>
          Kava &amp; Pyramids Dashboard
        </p>

        <form onSubmit={handleLogin}>
          <div className="contact" style={{ marginBottom: '1px' }}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </label>
          </div>
          <div className="contact">
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </label>
          </div>

          {error && (
            <p style={{
              color: '#e05a5a',
              fontSize: '0.8rem',
              margin: '1rem 0',
              padding: '0.75rem',
              background: '#1a0a0a',
              border: '1px solid #3a1515',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button button--gold form-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <a href="/" className="text-link" style={{ marginTop: '2rem', justifyContent: 'center' }}>
          ← Back to website
        </a>
      </div>
    </div>
  )
}