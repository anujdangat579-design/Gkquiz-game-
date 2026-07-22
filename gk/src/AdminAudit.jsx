import { useEffect, useState } from 'react'
import { watchAuditLog } from '../lib/admin'

export default function AdminAudit() {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    const unsub = watchAuditLog(setLogs)
    return unsub
  }, [])

  if (logs === null) return <p className="muted">Loading audit log…</p>
  if (logs.length === 0) return <p className="muted">No admin actions logged yet.</p>

  return (
    <div>
      {logs.map((log) => (
        <div key={log.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{log.action}</p>
            <p className="muted" style={{ fontSize: 11 }}>{formatDate(log.createdAt)}</p>
          </div>
          <p className="muted" style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
            actor: {log.actorUid}
          </p>
          {log.details && Object.keys(log.details).length > 0 && (
            <pre
              style={{
                fontSize: 11,
                marginTop: 6,
                background: 'var(--surface-2)',
                padding: 8,
                borderRadius: 8,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
}

function formatDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
