import { useEffect, useState } from 'react'
import { watchWinnerMessagesAdmin, replyToWinnerMessage } from '../lib/admin'

export default function AdminWinnerMessages() {
  const [messages, setMessages] = useState(null)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = watchWinnerMessagesAdmin(setMessages)
    return unsub
  }, [])

  async function handleReply(id) {
    setError(null)
    setBusyId(id)
    try {
      await replyToWinnerMessage(id, replyDrafts[id] || '')
      setReplyDrafts((d) => ({ ...d, [id]: '' }))
    } catch (err) {
      setError(err.message || 'Could not send reply.')
    } finally {
      setBusyId(null)
    }
  }

  if (messages === null) return <p className="muted">Loading winner messages…</p>
  if (messages.length === 0) return <p className="muted">No messages from winners yet.</p>

  // Unreplied first so admin sees what still needs attention.
  const sorted = [...messages].sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'unread' ? -1 : 1
  })

  return (
    <div>
      {error && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {sorted.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>🏆 {m.fromUsername}</p>
              {m.opponentUsername && (
                <p className="muted" style={{ fontSize: 11, margin: '2px 0 0' }}>
                  beat {m.opponentUsername} · match {m.matchId}
                </p>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: m.status === 'replied' ? 'var(--accent, #2ee6a6)' : 'var(--violet, #7c5cff)',
              }}
            >
              {m.status === 'replied' ? 'replied' : 'unread'}
            </span>
          </div>

          <p style={{ fontSize: 13, marginTop: 10 }}>{m.message}</p>

          {m.adminReply ? (
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 10, marginTop: 6 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>YOUR REPLY</p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{m.adminReply}</p>
            </div>
          ) : (
            <>
              <textarea
                value={replyDrafts[m.id] || ''}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                placeholder="Write a reply…"
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  color: 'var(--text)',
                  fontSize: 12,
                  resize: 'vertical',
                  margin: '10px 0 8px',
                }}
              />
              <button
                className="btn-primary"
                disabled={busyId === m.id || !(replyDrafts[m.id] || '').trim()}
                onClick={() => handleReply(m.id)}
              >
                {busyId === m.id ? 'Sending…' : 'Send Reply'}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
