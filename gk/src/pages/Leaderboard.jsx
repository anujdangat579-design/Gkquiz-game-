import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPeriodLeaderboard } from '../lib/leaderboard'

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all', label: 'All-Time' },
]

export default function Leaderboard({ user }) {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('all')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    setRows(null)
    fetchPeriodLeaderboard(period, 50).then(setRows)
  }, [period])

  return (
    <div className="screen">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <p className="eyebrow">RANKED BY WINS · ACCURACY · CONSISTENCY</p>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 16px' }}>Leaderboard</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`chip ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ fontSize: 13 }}>No matches played yet. Be the first to set a score.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, idx) => {
            const isYou = row.uid === user.uid
            return (
              <div
                key={row.uid}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderColor: isYou ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <span
                  className="display"
                  style={{ width: 26, fontSize: 15, color: idx < 3 ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {idx + 1}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {row.username.slice(-2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                    {row.username}{isYou ? ' (You)' : ''}
                  </p>
                  <p className="muted" style={{ fontSize: 11, margin: 0 }}>
                    {row.totalMatches} matches · {row.accuracy}% accuracy
                  </p>
                </div>
                <p className="display" style={{ fontSize: 16, margin: 0 }}>{row.wins}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
