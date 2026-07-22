import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { onIdTokenChanged, getIdTokenResult } from 'firebase/auth'
import { db, auth, functions } from '../firebase'

// ---------------------------------------------------------------------------
// Admin claim check. Admin status lives in the Firebase Auth ID token
// (custom claim `admin: true`), never in a Firestore field a client could
// edit. See functions/index.js `bootstrapFirstAdmin` for how the first
// admin is granted.
// ---------------------------------------------------------------------------
export function watchIsAdmin(callback) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) return callback(false)
    const result = await getIdTokenResult(user)
    callback(result.claims?.admin === true)
  })
}

export async function refreshAdminClaim() {
  if (!auth.currentUser) return false
  const result = await getIdTokenResult(auth.currentUser, true) // force refresh
  return result.claims?.admin === true
}

// ---------------------------------------------------------------------------
// Dashboard counts
// ---------------------------------------------------------------------------
async function count(q) {
  const snap = await getCountFromServer(q)
  return snap.data().count
}

export async function getDashboardCounts() {
  const usersQ = collection(db, 'users')
  const matchesQ = collection(db, 'matches')
  const completedQ = query(collection(db, 'matches'), where('status', '==', 'completed'))
  const activeQ = query(collection(db, 'matches'), where('status', '==', 'countdown'))
  const paidQ = query(collection(db, 'transactions'), where('status', '==', 'paid'))
  const failedQ = query(collection(db, 'transactions'), where('status', '==', 'failed'))
  const pendingRefundsQ = query(collection(db, 'refundRequests'), where('status', '==', 'pending'))
  const blockedQ = query(collection(db, 'users'), where('blocked', '==', true))

  const [
    totalUsers,
    totalMatches,
    completedMatches,
    activeMatches,
    paidPayments,
    failedPayments,
    pendingRefunds,
    blockedUsers,
  ] = await Promise.all([
    count(usersQ),
    count(matchesQ),
    count(completedQ),
    count(activeQ),
    count(paidQ),
    count(failedQ),
    count(pendingRefundsQ),
    count(blockedQ),
  ])

  return {
    totalUsers,
    activeUsers: totalUsers - blockedUsers,
    blockedUsers,
    totalMatches,
    completedMatches,
    activeMatches,
    paidPayments,
    failedPayments,
    pendingRefunds,
  }
}

// ---------------------------------------------------------------------------
// Question Bank Management (Firestore `questions` collection)
// ---------------------------------------------------------------------------
export function watchQuestions(callback, { category, difficulty } = {}) {
  // Only filters when BOTH category and difficulty are given (matches the
  // Admin UI's dropdowns) so a single composite index covers it — see
  // firestore.indexes.json. An unfiltered call just orders by newest first.
  const q =
    category && difficulty
      ? query(
          collection(db, 'questions'),
          where('category', '==', category),
          where('difficulty', '==', difficulty),
          orderBy('createdAt', 'desc'),
          limit(200)
        )
      : query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function addQuestion(data) {
  await addDoc(collection(db, 'questions'), {
    ...data,
    status: 'active',
    createdAt: serverTimestamp(),
  })
}

export async function updateQuestion(id, data) {
  await updateDoc(doc(db, 'questions', id), data)
}

export async function deleteQuestion(id) {
  await deleteDoc(doc(db, 'questions', id))
}

// Bulk CSV import: Firestore batches cap at 500 writes, so this chunks
// larger imports into multiple batches and commits them sequentially.
export async function bulkImportQuestions(questions) {
  const CHUNK = 450
  let imported = 0
  for (let i = 0; i < questions.length; i += CHUNK) {
    const chunk = questions.slice(i, i + CHUNK)
    const batch = writeBatch(db)
    chunk.forEach((q) => {
      const ref = doc(collection(db, 'questions'))
      batch.set(ref, { ...q, status: 'active', createdAt: serverTimestamp() })
    })
    await batch.commit()
    imported += chunk.length
  }
  return imported
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------
export function watchUsers(callback) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function setUserBlocked(uid, blocked) {
  await updateDoc(doc(db, 'users', uid), { blocked })
}

export async function setUserSuspended(uid, suspendedUntil) {
  await updateDoc(doc(db, 'users', uid), { suspendedUntil })
}

// ---------------------------------------------------------------------------
// Match Monitoring
// ---------------------------------------------------------------------------
export function watchRecentMatches(callback) {
  const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(100))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function cancelMatch(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
  })
}

// ---------------------------------------------------------------------------
// Refund review (backend already lives in Cloud Functions; this just wraps
// the callables plus a live query of pending requests)
// ---------------------------------------------------------------------------
const approveFn = httpsCallable(functions, 'adminApproveRefund')
const rejectFn = httpsCallable(functions, 'adminRejectRefund')
const seedFn = httpsCallable(functions, 'bulkSeedQuestionBank')

export async function seedQuestionBank() {
  const { data } = await seedFn()
  return data
}

export function watchRefundRequestsAdmin(callback) {
  const q = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function approveRefund(requestId) {
  const { data } = await approveFn({ requestId })
  return data
}

export async function rejectRefund(requestId, note) {
  const { data } = await rejectFn({ requestId, note })
  return data
}

// ---------------------------------------------------------------------------
// Devices (multi-account detection — see src/lib/device.js)
// ---------------------------------------------------------------------------
export function watchSuspiciousDevices(callback) {
  const q = query(collection(db, 'devices'), orderBy('lastSeenAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => {
    const devices = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(devices.filter((dev) => (dev.linkedUids || []).length > 1))
  })
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export function watchAuditLog(callback) {
  const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}
