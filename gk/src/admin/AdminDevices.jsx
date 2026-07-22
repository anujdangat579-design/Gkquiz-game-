import { useEffect, useState } from 'react'
import { watchSuspiciousDevices } from '../lib/admin'

export default function AdminDevices() {
  const [devices, setDevices] = useState(null)

  useEffect(() => {
    const unsub = watchSuspiciousDevices(setDevices)
    return unsub
  }, [])

  if (devices === null) return <p className="muted">Loading devices…</p>

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Multi-account devices</p>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Devices below have signed into more than one account. This is a best-effort,
          per-browser signal (not a hardware fingerprint) — treat it as a lead for review,
          not automatic proof of abuse. See <code>src/lib/device.js</code>.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className="muted">No devices linked to multiple accounts yet.</p>
      ) : (
        devices.map((dev) => (
          <div key={dev.id} className="card" style={{ marginBottom: 10 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }} className="muted">{dev.id}</p>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '6px 0 4px' }}>
              {(dev.linkedUids || []).length} linked accounts
            </p>
            <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {(dev.linkedUids || []).join(', ')}
            </p>
            {dev.userAgent && (
              <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>{dev.userAgent}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
