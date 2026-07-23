import { useEffect, useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { watchIsAdmin } from '../lib/admin'

export default function AdminGate() {
  const [status, setStatus] = useState('checking') // checking | allowed | denied
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsub = watchIsAdmin((isAdmin) => setStatus(isAdmin ? 'allowed' : 'denied'))
    return unsub
  }, [])

  if (status === 'checking') {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Checking admin access…</p>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>ADMIN PANEL</p>
        <h1 className="display" style={{ fontSize: 20, margin: '0 0 10px' }}>Access restricted</h1>
        <p className="muted" style={{ fontSize: 13, maxWidth: 280, marginBottom: 20 }}>
          This account doesn't have admin access. If you're setting this up for the first time,
          see "Setting up the Admin Panel" in the README.
        </p>
        <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/')}>
          Back to app
        </button>
      </div>
    )
  }

  const tabs = [
    { path: '/admin', label: 'Dashboard', exact: true },
    { path: '/admin/questions', label: 'Questions' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/matches', label: 'Matches' },
    { path: '/admin/refunds', label: 'Refunds' },
    { path: '/admin/audit', label: 'Audit Log' },
    { path: '/admin/config', label: 'Competition Config' },
    { path: '/admin/devices', label: 'Devices' },
    { path: '/admin/question-bank-pdfs', label: 'Question Bank PDFs' },
    { path: '/admin/winner-messages', label: 'Winner Messages' },
  ]

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <p className="eyebrow">ADMIN PANEL</p>
          <h1 className="display" style={{ fontSize: 20, margin: '2px 0 0' }}>GK Quiz Game</h1>
        </div>
        <Link to="/" style={{ fontSize: 12 }} className="muted">← Exit to app</Link>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18, paddingBottom: 4 }}>
        {tabs.map((tab) => {
          const active = tab.exact ? location.pathname === tab.path : location.pathname.startsWith(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`chip ${active ? 'active' : ''}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
