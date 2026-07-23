import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'

const TRANSACTIONS = 'transactions'

const requestRefundFn = httpsCallable(functions, 'requestRefund')

// Submits a refund request for a paid transaction (e.g. opponent never
// matched, match crashed mid-quiz). This never refunds automatically —
// an admin has to review and approve it, see functions/index.js.
export async function requestRefund({ transactionId, matchId, reason }) {
  const { data } = await requestRefundFn({ transactionId, matchId, reason })
  return data
}

// Live-updates so a payment that's still 'created' flips to 'paid' on screen
// the moment the Cloud Function verifies it, with no manual refresh.
export function watchTransactions(uid, callback) {
  const q = query(
    collection(db, TRANSACTIONS),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Keyed by transactionId so the Transactions screen can look up
// "is there already a pending/approved refund request for this payment?"
export function watchRefundRequests(uid, callback) {
  const q = query(collection(db, 'refundRequests'), where('userId', '==', uid))
  return onSnapshot(q, (snap) => {
    const byTransactionId = {}
    snap.docs.forEach((d) => {
      const data = d.data()
      byTransactionId[data.transactionId] = { id: d.id, ...data }
    })
    callback(byTransactionId)
  })
}

export function formatRupees(amountPaise) {
  return `₹${(amountPaise / 100).toFixed(2)}`
}

export const STATUS_LABEL = {
  created: 'Pending',
  paid: 'Successful',
  failed: 'Failed',
  refunded: 'Refunded',
}

export const STATUS_COLOR = {
  created: 'var(--muted, #9aa0b4)',
  paid: 'var(--accent, #2ee6a6)',
  failed: 'var(--danger, #ff5c5c)',
  refunded: 'var(--violet, #7c5cff)',
}
