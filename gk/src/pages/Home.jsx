import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { watchUserProfile } from '../lib/userProfile'
import { getStoredTheme, toggleTheme } from '../lib/theme'
import LegalFooter from '../components/LegalFooter.jsx'

export default function Home({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [theme, setThemeState] = useState(getStoredTheme())

  useEffect(() => {
    const unsub = watchUserProfile(user.uid, setProfile)
    return unsub
  }, [user.uid])

  const accuracy = profile && profile.totalQuestions > 0 ? `${Math.round((profile.totalCorrect / profile.totalQuestions) * 100)}%` : '—'
  const totalMatches = profile?.totalMatches ?? 0
  const wins = profile?.wins ?? 0
  const bestScore = profile && profile.totalMatches > 0 ? profile.bestScore : '—'

  return (
    <div className="screen">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <p className="eyebrow">GK QUIZ GAME</p>
          <h1 className="display" style={{ fontSize: 22, margin: '2px 0 0' }}>Hey, {user.username}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setThemeState(toggleTheme())}
            aria-label="Toggle dark/light mode"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            onClick={() => navigate('/profile')}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: profile?.photoURL ? 'transparent' : 'linear-gradient(135deg, var(--violet), var(--accent))',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              color: '#0B0C1F',
              overflow: 'hidden',
            }}
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.username.slice(-2)
            )}
          </button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>1v1 COMPETITION</p>
        <h2 className="display" style={{ fontSize: 26, margin: '0 0 6px' }}>Challenge Your Knowledge.</h2>
        <p className="muted" style={{ fontSize: 14, margin: '0 0 18px', lineHeight: 1.5 }}>
          Face a real opponent, same questions, same clock. Highest score wins — no cash, no chance, just skill.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/setup')}>Start 1v1 Quiz</button>
          <button
            className="btn-secondary"
            style={{ flex: 1, borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={() => navigate('/setup', { state: { quickMatch: true } })}
          >
            ⚡ Quick Match
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="eyebrow" style={{ marginBottom: 8, color: 'var(--accent, #2ee6a6)' }}>FREE</p>
        <h2 className="display" style={{ fontSize: 18, margin: '0 0 6px' }}>Practice Quiz</h2>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
          Unlimited free practice with instant answers and explanations. No fee, no opponent.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/practice')}>Start Practice</button>
      </div>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <StatCard label="Accuracy" value={accuracy} />
        <StatCard label="Total Quizzes" value={totalMatches} />
        <StatCard label="Wins" value={wins} />
        <StatCard label="Best Score" value={bestScore} />
      </div>

      <div className="grid-2" style={{ marginBottom: 8 }}>
        <button className="btn-secondary" onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
        <button className="btn-secondary" onClick={() => navigate('/profile')}>👤 My Profile</button>
      </div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <button className="btn-secondary" onClick={() => navigate('/history')}>📋 Quiz History</button>
        <button className="btn-secondary" onClick={() => navigate('/transactions')}>🧾 Transactions</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>How scoring works</p>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          +1 per correct answer, 0 for wrong or unanswered. Ties are broken by accuracy, then speed —
          never by chance. Winners get a badge and leaderboard rank, not money.
        </p>
      </div>

      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 'auto', lineHeight: 1.6 }}>
        Quiz access is a paid educational assessment service. No cash prizes, betting, wagering, or
        money withdrawal are offered on this platform.
      </p>
      <p style={{ textAlign: 'center', marginTop: 10 }}>
        <Link to="/admin" className="muted" style={{ fontSize: 11 }}>Admin Panel</Link>
      </p>
      <LegalFooter />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p className="display" style={{ fontSize: 22, margin: 0 }}>{value}</p>
      <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}
