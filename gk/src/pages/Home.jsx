import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { watchUserProfile } from '../lib/userProfile'
import { getStoredTheme, toggleTheme } from '../lib/theme'
import { watchQuestionBankPdfs, PDF_CATEGORIES } from '../lib/questionBankPdf'
import { fetchMyRank } from '../lib/leaderboard'
import { CATEGORIES } from '../data/questionBank'
import { watchMyMessages } from '../lib/winnerMessages'
import LegalFooter from '../components/LegalFooter.jsx'

// Icon + accent per subject — purely cosmetic, keyed off the same CATEGORIES
// list that drives QuizSetup/admin, so a new category picks up a sensible
// default (🧠) automatically without needing an edit here.
const SUBJECT_META = {
  'General Knowledge': { icon: '🧠', color: 'var(--accent)' },
  'Current Affairs': { icon: '📰', color: 'var(--violet)' },
  History: { icon: '🏛️', color: 'var(--pink)' },
  Geography: { icon: '🌍', color: 'var(--accent)' },
  Science: { icon: '🔬', color: 'var(--violet)' },
  'Indian Polity': { icon: '⚖️', color: 'var(--pink)' },
  Sports: { icon: '🏅', color: 'var(--accent)' },
  Technology: { icon: '💻', color: 'var(--violet)' },
  SSC: { icon: '📘', color: 'var(--pink)' },
  UPSC: { icon: '📗', color: 'var(--accent)' },
  MPSC: { icon: '📙', color: 'var(--violet)' },
  Banking: { icon: '🏦', color: 'var(--pink)' },
  'Mixed GK': { icon: '🎲', color: 'var(--accent)' },
}

// The 6 primary actions shown as the "Dashboard" grid. `to` and `state`
// mirror what real buttons elsewhere in the app already navigate to, so
// this is just a second front door onto the same screens — Score Reports
// and Quiz History both land on /history ("Previous Reports"), and
// Achievements opens Profile, where badges already live.
const DASHBOARD_ITEMS = [
  { label: 'Start 1v1 Quiz', icon: '🎯', to: '/setup', hero: true, desc: '₹10 entry · Real opponent' },
  { label: 'Practice Quiz', icon: '📝', to: '/practice', desc: 'Free · No opponent' },
  { label: 'Leaderboard', icon: '🏆', to: '/leaderboard', desc: 'Top ranked players' },
  { label: 'Quiz History', icon: '🕘', to: '/history', desc: 'Your past matches' },
  { label: 'Score Reports', icon: '📄', to: '/history', desc: 'Detailed breakdowns' },
  { label: 'Achievements', icon: '🎖️', to: '/profile', desc: 'Badges & streaks' },
]

export default function Home({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [theme, setThemeState] = useState(getStoredTheme())
  const [pdfs, setPdfs] = useState({})
  const [rank, setRank] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null) // 'notifications' | 'settings' | null
  const [myMessages, setMyMessages] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const unsub = watchUserProfile(user.uid, setProfile)
    return unsub
  }, [user.uid])

  useEffect(() => {
    const unsub = watchQuestionBankPdfs(setPdfs)
    return unsub
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMyRank(user.uid).then((r) => { if (!cancelled) setRank(r) })
    return () => { cancelled = true }
  }, [user.uid])

  useEffect(() => {
    const unsub = watchMyMessages(user.uid, setMyMessages)
    return unsub
  }, [user.uid])

  // Close either popover on an outside tap.
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const unreadReplies = (myMessages || []).filter((m) => m.status === 'replied' && !m.readByUser)
  const accuracy = profile && profile.totalQuestions > 0 ? `${Math.round((profile.totalCorrect / profile.totalQuestions) * 100)}%` : '—'
  const totalMatches = profile?.totalMatches ?? 0
  const wins = profile?.wins ?? 0
  const bestScore = profile && profile.totalMatches > 0 ? profile.bestScore : '—'
  const streak = profile?.currentStreak ?? 0

  return (
    <div className="screen">
      {/* ---------- TOP SECTION ---------- */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={() => navigate('/profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: profile?.photoURL ? 'transparent' : 'linear-gradient(135deg, var(--violet), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              color: '#0B0C1F',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-glow-accent)',
              flexShrink: 0,
            }}
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.username.slice(-2)
            )}
          </span>
          <span>
            <span className="eyebrow" style={{ display: 'block' }}>GK QUIZ GAME</span>
            <span className="display" style={{ display: 'block', fontSize: 17, marginTop: 2 }}>{user.username}</span>
          </span>
        </button>

        <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {/* Notification icon */}
          <button
            aria-label="Notifications"
            onClick={() => setMenuOpen((m) => (m === 'notifications' ? null : 'notifications'))}
            style={iconBtnStyle}
          >
            🔔
            {unreadReplies.length > 0 && <span style={dotStyle} />}
          </button>

          {/* Settings icon */}
          <button
            aria-label="Settings"
            onClick={() => setMenuOpen((m) => (m === 'settings' ? null : 'settings'))}
            style={iconBtnStyle}
          >
            ⚙️
          </button>

          {menuOpen === 'notifications' && (
            <div className="card-glass" style={popoverStyle}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>Notifications</p>
              {unreadReplies.length > 0 ? (
                <>
                  <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
                    Admin replied to {unreadReplies.length === 1 ? 'your message' : `${unreadReplies.length} of your messages`}.
                  </p>
                  <button
                    className="btn-secondary"
                    style={{ width: '100%', padding: '7px 0', fontSize: 12 }}
                    onClick={() => { setMenuOpen(null); navigate('/inbox') }}
                  >
                    📬 Open Inbox
                  </button>
                </>
              ) : (
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>You're all caught up — no new notifications yet.</p>
              )}
            </div>
          )}

          {menuOpen === 'settings' && (
            <div className="card-glass" style={{ ...popoverStyle, padding: 6 }}>
              <button
                onClick={() => { setThemeState(toggleTheme()); setMenuOpen(null) }}
                style={menuItemStyle}
              >
                {theme === 'light' ? '🌙 Switch to dark mode' : '☀️ Switch to light mode'}
              </button>
              <button onClick={() => { navigate('/profile'); setMenuOpen(null) }} style={menuItemStyle}>
                👤 Edit profile
              </button>
              <button onClick={() => { navigate('/transactions'); setMenuOpen(null) }} style={menuItemStyle}>
                🧾 Transactions
              </button>
              <button onClick={() => { navigate('/inbox'); setMenuOpen(null) }} style={menuItemStyle}>
                📬 Inbox
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---------- DASHBOARD CARDS ---------- */}
      <p className="eyebrow" style={{ marginBottom: 10 }}>DASHBOARD</p>
      <button
        className="card-elevated"
        onClick={() => navigate('/setup')}
        style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', marginBottom: 10, color: 'var(--text)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>1v1 COMPETITION</p>
            <p className="display" style={{ fontSize: 19, margin: 0 }}>🎯 Start 1v1 Quiz</p>
            <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>₹10 entry · Real opponent · Live scoring</p>
          </div>
          <span style={{ fontSize: 22, color: 'var(--accent)' }}>→</span>
        </div>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {DASHBOARD_ITEMS.filter((d) => !d.hero).map((item) => (
          <button
            key={item.label}
            className="card card-interactive"
            onClick={() => navigate(item.to)}
            style={{ textAlign: 'left', padding: 14, border: 'none', cursor: 'pointer', color: 'var(--text)' }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 2px' }}>{item.label}</p>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>{item.desc}</p>
          </button>
        ))}
      </div>

      {/* ---------- STATISTICS CARDS ---------- */}
      <p className="eyebrow" style={{ marginBottom: 10 }}>YOUR STATS</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
        <StatCard label="Total Quizzes" value={totalMatches} icon="📊" />
        <StatCard label="Wins" value={wins} icon="🏆" />
        <StatCard label="Accuracy" value={accuracy} icon="🎯" />
        <StatCard label="Best Score" value={bestScore} icon="⭐" />
        <StatCard label="Current Rank" value={rank ?? '…'} icon="📈" />
        <StatCard label="Streak" value={streak} icon="🔥" />
      </div>

      {/* ---------- SUBJECT GRID ---------- */}
      <div style={{ marginBottom: 22 }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>PLAY BY SUBJECT</p>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
          Pick a subject to jump straight into a 1v1 match in that topic.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CATEGORIES.map((subject) => {
            const meta = SUBJECT_META[subject] || { icon: '🧠', color: 'var(--accent)' }
            return (
              <button
                key={subject}
                className="card-glass card-interactive"
                onClick={() => navigate('/setup', { state: { presetCategory: subject } })}
                style={{
                  textAlign: 'left',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    boxShadow: `0 0 0 1px ${meta.color}40 inset`,
                  }}
                >
                  {meta.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{subject}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>How scoring works</p>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          +1 per correct answer, 0 for wrong or unanswered. Ties are broken by accuracy, then speed —
          never by chance. Winners get a badge and leaderboard rank, not money.
        </p>
      </div>

      <div className="card" style={{ marginTop: 4 }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>📚 Question Bank (PDF)</p>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Free study material by category. Admins refresh these weekly, so check back for updates.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PDF_CATEGORIES.map((c) => {
            const pdf = pdfs[c.id]
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{c.label}</p>
                  {pdf?.updatedAt && (
                    <p className="muted" style={{ fontSize: 10, margin: '2px 0 0' }}>
                      Updated {pdf.updatedAt.toDate().toLocaleDateString()}
                    </p>
                  )}
                </div>
                {pdf?.pdfUrl ? (
                  <a
                    href={pdf.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
                  >
                    ⬇ PDF
                  </a>
                ) : (
                  <span className="muted" style={{ fontSize: 11 }}>Coming soon</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
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

const iconBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'var(--surface-glass)',
  border: '1px solid var(--border-glass)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
  cursor: 'pointer',
  position: 'relative',
}

const dotStyle = {
  position: 'absolute',
  top: 7,
  right: 8,
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: 'var(--wrong)',
  border: '1.5px solid var(--surface)',
}

const popoverStyle = {
  position: 'absolute',
  top: 46,
  right: 0,
  width: 220,
  padding: 12,
  zIndex: 30,
  animation: 'screenIn 0.18s ease both',
}

const menuItemStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  color: 'var(--text)',
  fontSize: 12.5,
  fontWeight: 600,
  padding: '9px 8px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

function StatCard({ label, value, icon }) {
  return (
    <div className="card" style={{ padding: '12px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, margin: '0 0 4px' }}>{icon}</p>
      <p className="display" style={{ fontSize: 16, margin: 0 }}>{value}</p>
      <p className="muted" style={{ fontSize: 9.5, margin: '2px 0 0', lineHeight: 1.2 }}>{label}</p>
    </div>
  )
}
