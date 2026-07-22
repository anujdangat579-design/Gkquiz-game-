import { useEffect, useState } from 'react'
import { watchRefundRequestsAdmin, approveRefund, rejectRefund } from '../lib/admin'
import { formatRupees } from '../lib/transactions'

const STATUS_COLOR = {
  pending: 'var(--violet, #7c5cff)',
  refunded: 'var(--accent, #2ee6a6)',
  rejected: 'var(--danger, #ff5c5c)',
}

export default function AdminRefunds() {
  const [requests, setRequests] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})

  useEffect(() => {
    const unsub = watchRefundRequestsAdmin(setRequests)
    return unsub
  }, [])

  async function handleApprove(id) {
    if (!confirm('Approve this refund? This will actually move money back through Razorpay.')) return
    setError(null)
    setBusyId(id)
    try {
      await approveRefund(id)
    } catch (err) {
      setError(err.message || 'Could not approve refund.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id) {
    setError(null)
    setBusyId(id)
    try {
      await rejectRefund(id, noteDrafts[id] || '')
    } catch (err) {
      setError(err.message || 'Could not reject refund.')
    } finally {
      setBusyId(null)
    }
  }

  if (requests === null) return <p className="muted">Loading refund requests…</p>
  if (requests.length === 0) return <p className="muted">No refund requests yet.</p>

  return (
    <div>
      {error && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {requests.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{formatRupees(r.amount)}</p>
              <p className="muted" style={{ fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>
                {r.transactionId}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[r.status] || 'inherit' }}>
              {r.status}
            </span>
          </div>

          <p style={{ fontSize: 13, marginTop: 10 }}>{r.reason}</p>

          {r.status === 'pending' && (
            <>
              <input
                value={noteDrafts[r.id] || ''}
                onChange={(e) => setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                placeholder="Note if rejecting (optional)"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  color: 'var(--text)',
                  fontSize: 12,
                  margin: '10px 0 8px',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                >
                  {busyId === r.id ? '…' : 'Approve & Refund'}
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, color: 'var(--danger, #ff5c5c)' }}
                  disabled={busyId === r.id}
                  onClick={() => handleReject(r.id)}
                >
                  Reject
                </button>
              </div>
            </>
          )}

          {r.status === 'rejected' && r.reviewNote && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Note: {r.reviewNote}</p>
          )}
        </div>
      ))}
    </div>
  )
}
