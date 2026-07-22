import { useEffect, useState } from 'react'
import { watchRecentMatches, cancelMatch } from '../lib/admin'

const STATUS_COLOR = {
  pending_questions: 'var(--text-muted, #999)',
  countdown: 'var(--violet, #7c5cff)',
  completed: 'var(--accent, #2ee6a6)',
  cancelled: 'var(--danger, #ff5c5c)',
}

export default function AdminMatches() {
  const [matches, setMatches] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const unsub = watchRecentMatches(setMatches)
    return unsub
  }, [])

  async function handleCancel(matchId) {
    if (!confirm('Cancel this match? Players will see it as ended without a result. Consider processing a refund separately if a payment was involved.')) return
    setBusyId(matchId)
    try {
      await cancelMatch(matchId)
    } finally {
      setBusyId(null)
    }
  }

  if (matches === null) return <p className="muted">Loading matches…</p>
  if (matches.length === 0) return <p className="muted">No matches yet.</p>

  return (
    <div>
      {matches.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{m.category} · {m.difficulty}</p>
              <p className="muted" style={{ fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{m.id}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[m.status] || 'inherit' }}>
              {m.status}
            </span>
          </div>

          <div style={{ fontSize: 12, marginTop: 8 }} className="muted">
            {m.playerA?.username} vs {m.playerB?.username} · {m.questionCount} questions
          </div>

          {m.status === 'completed' && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Winner: {m.winner ? (m.winner === m.playerA?.uid ? m.playerA?.username : m.playerB?.username) : 'Draw'}
            </div>
          )}

          {m.flags && Object.keys(m.flags).length > 0 && (
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--wrong, #ff5c5c)' }}>
              {Object.entries(m.flags).map(([uid, f]) => {
                const name = uid === m.playerA?.uid ? m.playerA?.username : m.playerB?.username
                const bits = []
                if (f.tabSwitches) bits.push(`${f.tabSwitches} tab switch${f.tabSwitches > 1 ? 'es' : ''}`)
                if (f.devtoolsOpenCount) bits.push(`devtools opened ${f.devtoolsOpenCount}x`)
                if (bits.length === 0) return null
                return <div key={uid}>⚠ {name}: {bits.join(', ')}</div>
              })}
            </div>
          )}

          {m.status === 'countdown' && (
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12, marginTop: 10, color: 'var(--danger, #ff5c5c)' }}
              disabled={busyId === m.id}
              onClick={() => handleCancel(m.id)}
            >
              {busyId === m.id ? '…' : 'Cancel match'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
