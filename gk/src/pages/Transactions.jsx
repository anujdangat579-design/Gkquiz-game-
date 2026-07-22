import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  watchTransactions,
  watchRefundRequests,
  requestRefund,
  formatRupees,
  STATUS_LABEL,
  STATUS_COLOR,
} from '../lib/transactions'
import { downloadReceipt } from '../lib/receipt'

const REFUND_STATUS_LABEL = {
  pending: 'Refund review pending',
  approved: 'Refund approved',
  refunded: 'Refund completed',
  rejected: 'Refund request rejected',
}

export default function Transactions({ user }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState(null)
  const [refundRequests, setRefundRequests] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [reasonDrafts, setReasonDrafts] = useState({})
  const [submittingId, setSubmittingId] = useState(null)
  const [refundError, setRefundError] = useState(null)

  useEffect(() => {
    const unsub = watchTransactions(user.uid, setTransactions)
    return unsub
  }, [user.uid])

  useEffect(() => {
    const unsub = watchRefundRequests(user.uid, setRefundRequests)
    return unsub
  }, [user.uid])

  async function submitRefund(tx) {
    const reason = (reasonDrafts[tx.id] || '').trim()
    if (reason.length < 5) {
      setRefundError('Please describe the issue in a few words.')
      return
    }
    setRefundError(null)
    setSubmittingId(tx.id)
    try {
      await requestRefund({ transactionId: tx.id, reason })
    } catch (err) {
      setRefundError(err.message || 'Could not submit refund request.')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="screen">
      <button
        className="btn-secondary"
        style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <p className="eyebrow">PAYMENTS</p>
      <h1 className="display" style={{ fontSize: 24, margin: '4px 0 20px' }}>Transaction history</h1>

      {transactions === null && <p className="muted">Loading transactions…</p>}

      {transactions !== null && transactions.length === 0 && (
        <div className="card">
          <p className="muted" style={{ fontSize: 13 }}>
            No payments yet. Your quiz access fee receipts will show up here.
          </p>
        </div>
      )}

      {transactions?.map((tx) => {
        const expanded = expandedId === tx.id
        const refundReq = refundRequests[tx.id]
        const canRequestRefund = tx.status === 'paid' && !refundReq

        return (
          <div key={tx.id} className="card" style={{ marginBottom: 12 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
              onClick={() => setExpandedId(expanded ? null : tx.id)}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
                  {tx.category} · {tx.difficulty}
                </p>
                <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                  {formatDate(tx.createdAt)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="display" style={{ fontSize: 17, margin: 0 }}>
                  {formatRupees(tx.amount)}
                </p>
                <p style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[tx.status], margin: '4px 0 0' }}>
                  {STATUS_LABEL[tx.status] || tx.status}
                </p>
              </div>
            </div>

            {refundReq && (
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet, #7c5cff)', marginTop: 8 }}>
                {REFUND_STATUS_LABEL[refundReq.status] || refundReq.status}
              </p>
            )}

            {expanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <ReceiptRow label="Transaction ID" value={tx.transactionId} mono />
                <ReceiptRow label="Order ID" value={tx.orderId} mono />
                {tx.paymentId && <ReceiptRow label="Payment ID" value={tx.paymentId} mono />}
                <ReceiptRow label="Purpose" value={tx.purpose} />
                <ReceiptRow label="Questions" value={`${tx.questionCount} questions`} />
                <ReceiptRow label="Amount" value={formatRupees(tx.amount)} />
                <ReceiptRow label="Status" value={STATUS_LABEL[tx.status] || tx.status} />
                <p className="muted" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                  This receipt is for quiz competition access and educational assessment services.
                  No cash prize, wagering, or withdrawable balance is associated with this payment.
                </p>

                <button
                  className="btn-secondary"
                  style={{ marginTop: 10 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadReceipt(tx)
                  }}
                >
                  Download Receipt (PDF)
                </button>

                {canRequestRefund && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Report a technical issue</p>
                    <p className="muted" style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
                      Only for genuine technical failures — e.g. no opponent was ever matched, or the
                      match crashed mid-quiz. An admin reviews every request before any refund is issued.
                    </p>
                    <textarea
                      value={reasonDrafts[tx.id] || ''}
                      onChange={(e) => setReasonDrafts((d) => ({ ...d, [tx.id]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="What went wrong?"
                      rows={2}
                      style={{
                        width: '100%',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        color: 'var(--text)',
                        fontSize: 13,
                        marginBottom: 8,
                        resize: 'vertical',
                      }}
                    />
                    <button
                      className="btn-secondary"
                      style={{ width: '100%' }}
                      disabled={submittingId === tx.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        submitRefund(tx)
                      }}
                    >
                      {submittingId === tx.id ? 'Submitting…' : 'Request Refund'}
                    </button>
                    {refundError && (
                      <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 12, marginTop: 6 }}>{refundError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReceiptRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

function formatDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
