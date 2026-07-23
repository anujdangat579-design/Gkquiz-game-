import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/setup', label: 'Quiz', icon: '🎯' },
  { path: '/transactions', label: 'Transactions', icon: '🧾' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => { if (!active) navigate(tab.path) }}
          >
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
