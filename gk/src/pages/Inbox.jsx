import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchMyMessages, markRepliesRead } from '../lib/winnerMessages'

export default function Inbox({ user }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState(null)

  useEffect(() => {
    const unsub = watchMyMessages(user.uid, setMessages)
    return unsub
  }, [user.uid])

  // Opening the Inbox is the "read" action — clears the notification dot
  // on Home by flipping readByUser on any replied-but-unseen messages.
  useEffect(() => {
    if (messages && messages.length > 0) markRepliesRead(messages)
  }, [messages])

  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate('/')} aria-label="Back" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text)' }}>
          ←
        </button>
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>INBOX</p>
          <h1 className="display" style={{ fontSize: 19, margin: 0 }}>Messages to Admin</h1>
        </div>
      </header>

      {messages === null && <p className="muted">Loading…</p>}

      {messages !== null && messages.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
          <p className="muted" style={{ fontSize: 13 }}>
            Nothing here yet. Win a 1v1 match and you'll get the chance to send the admin a message
            from the result screen.
          </p>
        </div>
      )}

      {messages && messages.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              {m.opponentUsername ? `VS ${m.opponentUsername}` : 'MATCH'}
            </p>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: m.status === 'replied' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {m.status === 'replied' ? 'Replied' : 'Waiting'}
            </span>
          </div>
          <p style={{ fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{m.message}</p>
          {m.adminReply && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>ADMIN</p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{m.adminReply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
