import { useEffect, useMemo, useState } from 'react'
import { watchUsers, setUserBlocked } from '../lib/admin'

export default function AdminUsers() {
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [busyUid, setBusyUid] = useState(null)

  useEffect(() => {
    const unsub = watchUsers(setUsers)
    return unsub
  }, [])

  const filtered = useMemo(() => {
    if (!users) return []
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) => (u.username || '').toLowerCase().includes(term) || u.id.toLowerCase().includes(term))
  }, [users, search])

  async function toggleBlock(u) {
    setBusyUid(u.id)
    try {
      await setUserBlocked(u.id, !u.blocked)
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username or uid…"
        style={{
          width: '100%',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px',
          color: 'var(--text)',
          fontSize: 13,
          marginBottom: 14,
        }}
      />

      {users === null && <p className="muted">Loading users…</p>}
      {users !== null && filtered.length === 0 && <p className="muted">No users match "{search}".</p>}

      {filtered.map((u) => {
        const accuracy = u.totalQuestions > 0 ? Math.round((u.totalCorrect / u.totalQuestions) * 100) : 0
        return (
          <div key={u.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
                  {u.username} {u.blocked && <span style={{ color: 'var(--danger, #ff5c5c)', fontSize: 11 }}>· BLOCKED</span>}
                </p>
                <p className="muted" style={{ fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{u.id}</p>
              </div>
              <button
                className="btn-secondary"
                style={{
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: 12,
                  color: u.blocked ? 'var(--accent, #2ee6a6)' : 'var(--danger, #ff5c5c)',
                }}
                disabled={busyUid === u.id}
                onClick={() => toggleBlock(u)}
              >
                {busyUid === u.id ? '…' : u.blocked ? 'Unblock' : 'Block'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12 }} className="muted">
              <span>{u.totalMatches || 0} matches</span>
              <span>{u.wins || 0} wins</span>
              <span>{accuracy}% accuracy</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
