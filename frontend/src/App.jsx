// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import MediaHubPage from './pages/MediaHubPage'
import EpkPage from './pages/EpkPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import ProtectedRoute from './components/ProtectedRoute'
import { isSupabaseConfigured } from './lib/supabase'

function ConfigError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#080808', color: '#f0ece3', fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ maxWidth: '480px' }}>
        <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Site is misconfigured</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>
          VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are missing from this build's
          environment variables, so the site cannot load any data. If you are the site owner,
          check your hosting provider's environment variable settings and redeploy.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigError />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/media-hub" element={<MediaHubPage />} />
        <Route path="/epk" element={<EpkPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}