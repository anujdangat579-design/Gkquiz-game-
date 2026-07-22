const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const Razorpay = require('razorpay')
const crypto = require('crypto')

admin.initializeApp()
const db = admin.firestore()

setGlobalOptions({ region: 'asia-south1', maxInstances: 10 })

// Default access fee for the 1v1 quiz competition, used until an admin
// saves a config/competition doc (see AdminConfig.jsx) and as a safe
// fallback if that doc is ever missing/malformed. The fee actually charged
// always comes from this function reading Firestore server-side (Admin
// SDK) — a tampered client can never request a different amount, since it
// never gets to say what the amount is in the first place.
const DEFAULT_ACCESS_FEE_PAISE = 1000 // ₹10.00
const DEFAULT_QUESTION_COUNT_OPTIONS = [10, 20, 30]
const CURRENCY = 'INR'

async function getLiveCompetitionConfig() {
  try {
    const snap = await db.collection('config').doc('competition').get()
    if (!snap.exists) return { feePaise: DEFAULT_ACCESS_FEE_PAISE, questionCountOptions: DEFAULT_QUESTION_COUNT_OPTIONS }
    const data = snap.data() || {}
    const rupees = Number(data.entryFeeRupees)
    const feePaise = Number.isFinite(rupees) && rupees > 0 ? Math.round(rupees * 100) : DEFAULT_ACCESS_FEE_PAISE
    const questionCountOptions =
      Array.isArray(data.questionCountOptions) && data.questionCountOptions.length > 0
        ? data.questionCountOptions
        : DEFAULT_QUESTION_COUNT_OPTIONS
    return { feePaise, questionCountOptions }
  } catch {
    return { feePaise: DEFAULT_ACCESS_FEE_PAISE, questionCountOptions: DEFAULT_QUESTION_COUNT_OPTIONS }
  }
}

// Set these with:
//   firebase functions:secrets:set RAZORPAY_KEY_ID
//   firebase functions:secrets:set RAZORPAY_KEY_SECRET
const { defineSecret } = require('firebase-functions/params')
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET')

function getClient(keyId, keySecret) {
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ---------------------------------------------------------------------------
// MATCH LIFECYCLE: server-only question assignment + server-only scoring
//
// The client can never read the `questions` collection (see firestore.rules)
// and can never write `questionSet`, `scores`, `winner`, `status`, or
// `completedAt` on a match doc — only its own key under `rawAnswers`. Both
// halves of the answer-key handling live here, in Cloud Functions, using
// the Admin SDK which bypasses security rules entirely.
// ---------------------------------------------------------------------------

const COUNTDOWN_MS = 5000
const QUESTION_TIME_LIMIT_MS = 20000 // must match QUESTION_SECONDS in QuizRoom.jsx

/**
 * Fires the instant a match doc is created (by the client-side matchmaking
 * transaction, which only sets playerA/playerB/category/difficulty/
 * questionCount/status:'pending_questions' — no questions). Picks the real
 * question set server-side and hands the client only what it needs to
 * render a question: never correctIndex, never explanation.
 */
exports.assignQuestions = onDocumentCreated('matches/{matchId}', async (event) => {
  const snap = event.data
  if (!snap) return
  const match = snap.data()
  if (match.status !== 'pending_questions') return // already handled or a foreign write

  const { category, difficulty, questionCount } = match

  // Same-category pool first, backfilled from the same difficulty across
  // other categories so a thin question bank never leaves a paid match
  // stuck (mirrors the old client-side getQuestionsFor fallback).
  const sameCategory = await db
    .collection('questions')
    .where('category', '==', category)
    .where('difficulty', '==', difficulty)
    .where('status', '==', 'active')
    .get()

  let pool = sameCategory.docs
  if (pool.length < questionCount) {
    const anyCategory = await db
      .collection('questions')
      .where('difficulty', '==', difficulty)
      .where('status', '==', 'active')
      .get()
    const seen = new Set(pool.map((d) => d.id))
    const backfill = anyCategory.docs.filter((d) => !seen.has(d.id))
    pool = pool.concat(backfill)
  }

  if (pool.length < questionCount) {
    // Genuinely not enough questions exist yet for this combo — cancel
    // rather than run a shorter-than-advertised quiz. The player was
    // already charged, so this should be rare in production (keep the
    // question bank stocked) and is surfaced to refund handling.
    await snap.ref.update({ status: 'cancelled', cancelReason: 'insufficient_questions' })
    return
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount)
  const questionSet = shuffled.map((d) => {
    const q = d.data()
    return { id: d.id, category: q.category, difficulty: q.difficulty, question: q.question, options: q.options }
    // Deliberately omits correctIndex and explanation.
  })

  await snap.ref.update({
    questionSet,
    status: 'countdown',
    startAt: Date.now() + COUNTDOWN_MS,
  })
})

function computeScoreForPlayer(rawAnswers, questionDocsById) {
  let correct = 0
  let wrong = 0
  let unanswered = 0
  let totalTimeMs = 0
  const total = questionDocsById.size

  for (const [questionId, qData] of questionDocsById) {
    const a = (rawAnswers || {})[questionId]
    if (!a || a.selectedIndex === null || a.selectedIndex === undefined) {
      unanswered++
      continue
    }
    // Clamp a tampered/absurd client-reported time rather than trust it outright.
    totalTimeMs += Math.min(Math.max(0, a.timeTakenMs || 0), QUESTION_TIME_LIMIT_MS)
    if (a.selectedIndex === qData.correctIndex) correct++
    else wrong++
  }

  const score = correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  return { correct, wrong, unanswered, score, accuracy, timeTakenMs: totalTimeMs, total }
}

// No randomness, ever: score, then accuracy, then speed, then draw.
function decideWinner(uidA, scoreA, uidB, scoreB) {
  if (scoreA.score !== scoreB.score) return scoreA.score > scoreB.score ? uidA : uidB
  if (scoreA.accuracy !== scoreB.accuracy) return scoreA.accuracy > scoreB.accuracy ? uidA : uidB
  if (scoreA.timeTakenMs !== scoreB.timeTakenMs) return scoreA.timeTakenMs < scoreB.timeTakenMs ? uidA : uidB
  return 'draw'
}

// ---------------------------------------------------------------------------
// PERIOD LEADERBOARDS (daily / weekly / monthly)
//
// A player can only read their own matches (see firestore.rules), so a
// leaderboard that spans everyone's matches can't be assembled client-side.
// Instead, the moment a match is graded here, we also bump small
// aggregate docs the client CAN read — one per player per period — kept
// in their own top-level collections so security rules stay simple
// (read: any signed-in user; write: Cloud Functions / Admin SDK only).
// ---------------------------------------------------------------------------

function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function periodKeys(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return {
    daily: { collection: 'leaderboardDaily', key: `${y}-${m}-${d}` },
    weekly: { collection: 'leaderboardWeekly', key: isoWeekKey(date) },
    monthly: { collection: 'leaderboardMonthly', key: `${y}-${m}` },
  }
}

function bumpLeaderboards(tx, now, uid, username, { won, correct, total }) {
  const periods = periodKeys(now)
  for (const { collection, key } of Object.values(periods)) {
    const ref = db.collection(collection).doc(`${key}_${uid}`)
    tx.set(
      ref,
      {
        uid,
        username,
        periodKey: key,
        wins: admin.firestore.FieldValue.increment(won ? 1 : 0),
        totalMatches: admin.firestore.FieldValue.increment(1),
        totalCorrect: admin.firestore.FieldValue.increment(correct),
        totalQuestions: admin.firestore.FieldValue.increment(total),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
}

/**
 * Fires on every update to a match doc. Once both players' `rawAnswers`
 * entries are present, grades both of them against the real `questions`
 * documents (never exposed to the client) and writes the authoritative
 * `scores` / `winner` / `status: 'completed'`. A client literally cannot
 * write those fields itself — see the `matches` rules in firestore.rules.
 */
exports.evaluateMatch = onDocumentUpdated('matches/{matchId}', async (event) => {
  const after = event.data.after.data()
  if (!after || after.status === 'completed' || after.status === 'cancelled') return

  const uidA = after.playerA?.uid
  const uidB = after.playerB?.uid
  const raw = after.rawAnswers || {}
  if (!uidA || !uidB || !raw[uidA] || !raw[uidB]) return // still waiting on one player

  const matchRef = event.data.after.ref

  await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(matchRef)
    const fresh = freshSnap.data()
    // Idempotency guard: two triggers can fire close together (e.g. a
    // retried write) — bail if another invocation already finished this.
    if (!fresh || fresh.status === 'completed' || fresh.status === 'cancelled') return

    const questionIds = (fresh.questionSet || []).map((q) => q.id)
    if (questionIds.length === 0) return

    const questionRefs = questionIds.map((id) => db.collection('questions').doc(id))
    const questionSnaps = await tx.getAll(...questionRefs)
    const questionDocsById = new Map(
      questionSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()])
    )

    const freshRaw = fresh.rawAnswers || {}
    const scoreA = computeScoreForPlayer(freshRaw[uidA], questionDocsById)
    const scoreB = computeScoreForPlayer(freshRaw[uidB], questionDocsById)
    const winner = decideWinner(uidA, scoreA, uidB, scoreB)

    // Safe to reveal the answer key now: the match is over, both players
    // already submitted, and only these two players (+ admin) can ever
    // read this match doc (see firestore.rules). This powers the detailed,
    // question-wise Score Report for both players without ever exposing
    // correctIndex/explanation while the quiz is still live.
    const reviewData = (fresh.questionSet || []).map((q) => {
      const qData = questionDocsById.get(q.id) || {}
      const rawA = (freshRaw[uidA] || {})[q.id]
      const rawB = (freshRaw[uidB] || {})[q.id]
      return {
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctIndex: qData.correctIndex ?? null,
        explanation: qData.explanation || '',
        selectedByA: rawA ? rawA.selectedIndex : null,
        selectedByB: rawB ? rawB.selectedIndex : null,
      }
    })

    tx.update(matchRef, {
      scores: {
        [uidA]: { ...scoreA, finishedAt: admin.firestore.FieldValue.serverTimestamp() },
        [uidB]: { ...scoreB, finishedAt: admin.firestore.FieldValue.serverTimestamp() },
      },
      winner,
      reviewData,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const now = new Date()
    bumpLeaderboards(tx, now, uidA, fresh.playerA.username, { won: winner === uidA, correct: scoreA.correct, total: scoreA.total })
    bumpLeaderboards(tx, now, uidB, fresh.playerB.username, { won: winner === uidB, correct: scoreB.correct, total: scoreB.total })
  })
})

/**
 * One-time (idempotent) admin action to push the bundled starter question
 * bank into the live Firestore `questions` collection, since live matches
 * now only ever draw from there. Safe to call more than once — uses a
 * stable doc ID per seed question so it never duplicates.
 */
exports.bulkSeedQuestionBank = onCall(async (request) => {
  await requireAdmin(request)
  const { QUESTION_BANK } = require('./seedData')

  const batch = db.batch()
  for (const item of QUESTION_BANK) {
    const ref = db.collection('questions').doc(item.seedId)
    const { seedId, ...rest } = item
    batch.set(
      ref,
      { ...rest, status: 'active', createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    )
  }
  await batch.commit()
  await logAudit('question_bank_seeded', request.auth.uid, { count: QUESTION_BANK.length })

  return { seeded: QUESTION_BANK.length }
})

/**
 * Creates a Razorpay order for the ₹10 quiz access fee and records a
 * 'created' transaction doc. Called from the client before opening the
 * Razorpay Checkout widget.
 */
exports.createOrder = onCall(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

    const { category, difficulty, questionCount } = request.data || {}
    const { feePaise, questionCountOptions } = await getLiveCompetitionConfig()
    if (!category || !difficulty || !questionCountOptions.includes(questionCount)) {
      throw new HttpsError('invalid-argument', 'Missing or invalid quiz setup.')
    }

    const razorpay = getClient(RAZORPAY_KEY_ID.value(), RAZORPAY_KEY_SECRET.value())

    const order = await razorpay.orders.create({
      amount: feePaise,
      currency: CURRENCY,
      notes: { uid, category, difficulty, questionCount: String(questionCount), purpose: 'quiz_access_fee' },
    })

    const txRef = db.collection('transactions').doc(order.id)
    await txRef.set({
      transactionId: order.id,
      userId: uid,
      amount: feePaise,
      currency: CURRENCY,
      purpose: 'Quiz Competition Access and Educational Assessment Service Fee',
      category,
      difficulty,
      questionCount,
      status: 'created',
      orderId: order.id,
      paymentId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      orderId: order.id,
      amount: feePaise,
      currency: CURRENCY,
      keyId: RAZORPAY_KEY_ID.value(),
    }
  }
)

/**
 * Verifies the Razorpay payment signature server-side (never trust the
 * client's word that a payment succeeded) and flips the transaction to
 * 'paid'. Firestore rules check this doc before allowing a queue entry.
 */
exports.verifyPayment = onCall(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.data || {}
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new HttpsError('invalid-argument', 'Missing payment fields.')
    }

    const txRef = db.collection('transactions').doc(razorpay_order_id)
    const txSnap = await txRef.get()
    if (!txSnap.exists) throw new HttpsError('not-found', 'Unknown order.')
    const tx = txSnap.data()

    if (tx.userId !== uid) throw new HttpsError('permission-denied', 'Order belongs to another user.')
    if (tx.status === 'paid') return { verified: true, transactionId: razorpay_order_id } // idempotent retry

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET.value())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      await txRef.update({ status: 'failed', paymentId: razorpay_payment_id })
      throw new HttpsError('permission-denied', 'Payment signature mismatch.')
    }

    await txRef.update({
      status: 'paid',
      paymentId: razorpay_payment_id,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { verified: true, transactionId: razorpay_order_id }
  }
)

/**
 * Razorpay webhook fallback — catches payments that succeeded but whose
 * client-side verifyPayment call never fired (app closed, network drop).
 * Configure this URL in the Razorpay Dashboard > Webhooks, event:
 * payment.captured, and set RAZORPAY_WEBHOOK_SECRET to match.
 */
const { onRequest } = require('firebase-functions/v2/https')
const RAZORPAY_WEBHOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET')

exports.razorpayWebhook = onRequest(
  { secrets: [RAZORPAY_WEBHOOK_SECRET] },
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature']
    const body = req.rawBody

    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET.value())
      .update(body)
      .digest('hex')

    if (expected !== signature) {
      res.status(400).send('Invalid signature')
      return
    }

    const event = JSON.parse(body.toString())
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id
      const txRef = db.collection('transactions').doc(orderId)
      const txSnap = await txRef.get()
      if (txSnap.exists && txSnap.data().status !== 'paid') {
        await txRef.update({
          status: 'paid',
          paymentId: payment.id,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          verifiedVia: 'webhook',
        })
      }
    }

    res.status(200).send('ok')
  }
)

// ---------------------------------------------------------------------------
// REFUND HANDLING
//
// Refunds are never automatic. A player reports a technical failure, an
// admin reviews it, and only an admin approval actually moves money back
// through Razorpay. Every step is written to `auditLogs` so there's a
// complete paper trail per the product brief's "no manual score/refund
// changes without a complete audit log" requirement.
// ---------------------------------------------------------------------------

async function requireAdmin(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  if (request.auth.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin access required.')
  }
  return request.auth.uid
}

async function logAudit(action, actorUid, details) {
  await db.collection('auditLogs').add({
    action,
    actorUid,
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

/**
 * A player reports a technical failure (e.g. paid but opponent never
 * matched, match crashed mid-quiz) and asks for a refund. This only ever
 * creates a 'pending' request — it never moves money by itself.
 */
exports.requestRefund = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

  const { transactionId, matchId, reason } = request.data || {}
  if (!transactionId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'A transaction ID and a brief reason are required.')
  }

  const txRef = db.collection('transactions').doc(transactionId)
  const txSnap = await txRef.get()
  if (!txSnap.exists) throw new HttpsError('not-found', 'Unknown transaction.')
  const tx = txSnap.data()

  if (tx.userId !== uid) throw new HttpsError('permission-denied', 'This transaction belongs to another user.')
  if (tx.status !== 'paid') throw new HttpsError('failed-precondition', 'Only a successfully paid transaction can be refunded.')

  const existing = await db
    .collection('refundRequests')
    .where('transactionId', '==', transactionId)
    .where('status', 'in', ['pending', 'approved'])
    .limit(1)
    .get()
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'A refund request for this payment is already in progress.')
  }

  const reqRef = await db.collection('refundRequests').add({
    transactionId,
    matchId: matchId || null,
    userId: uid,
    amount: tx.amount,
    reason: reason.trim().slice(0, 500),
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
  })

  await logAudit('refund_requested', uid, { requestId: reqRef.id, transactionId })

  return { requestId: reqRef.id }
})

/**
 * Admin approves a pending refund request: calls Razorpay's Refunds API,
 * marks the transaction 'refunded', and closes out the request. Requires
 * the caller's ID token to carry the custom claim { admin: true }.
 */
exports.adminApproveRefund = onCall(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (request) => {
    const adminUid = await requireAdmin(request)
    const { requestId } = request.data || {}
    if (!requestId) throw new HttpsError('invalid-argument', 'requestId is required.')

    const reqRef = db.collection('refundRequests').doc(requestId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Unknown refund request.')
    const refundReq = reqSnap.data()
    if (refundReq.status !== 'pending') {
      throw new HttpsError('failed-precondition', `Request is already ${refundReq.status}.`)
    }

    const txRef = db.collection('transactions').doc(refundReq.transactionId)
    const txSnap = await txRef.get()
    if (!txSnap.exists) throw new HttpsError('not-found', 'Unknown transaction.')
    const tx = txSnap.data()
    if (tx.status !== 'paid') {
      throw new HttpsError('failed-precondition', 'Transaction is not in a refundable state.')
    }

    const razorpay = getClient(RAZORPAY_KEY_ID.value(), RAZORPAY_KEY_SECRET.value())
    const refund = await razorpay.payments.refund(tx.paymentId, { amount: tx.amount })

    const batch = db.batch()
    batch.update(txRef, {
      status: 'refunded',
      refundId: refund.id,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    batch.update(reqRef, {
      status: 'refunded',
      reviewedBy: adminUid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    await batch.commit()

    await logAudit('refund_approved', adminUid, {
      requestId,
      transactionId: refundReq.transactionId,
      razorpayRefundId: refund.id,
    })

    return { refunded: true, refundId: refund.id }
  }
)

/**
 * Admin rejects a refund request (e.g. no technical failure found).
 */
exports.adminRejectRefund = onCall(async (request) => {
  const adminUid = await requireAdmin(request)
  const { requestId, note } = request.data || {}
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId is required.')

  const reqRef = db.collection('refundRequests').doc(requestId)
  const reqSnap = await reqRef.get()
  if (!reqSnap.exists) throw new HttpsError('not-found', 'Unknown refund request.')
  if (reqSnap.data().status !== 'pending') {
    throw new HttpsError('failed-precondition', `Request is already ${reqSnap.data().status}.`)
  }

  await reqRef.update({
    status: 'rejected',
    reviewedBy: adminUid,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewNote: (note || '').slice(0, 500),
  })

  await logAudit('refund_rejected', adminUid, { requestId, note })

  return { rejected: true }
})

/**
 * One-time bootstrap for the very first admin account. Guarded by a secret
 * (not by an existing admin claim, since there isn't one yet) AND by a
 * Firestore marker doc so it can only ever succeed once. After running
 * this for yourself, grant further admins from the Admin Panel instead.
 *
 *   firebase functions:secrets:set ADMIN_BOOTSTRAP_KEY
 *
 * Call once from the browser console while signed into the app:
 *   const fn = httpsCallable(functions, 'bootstrapFirstAdmin')
 *   await fn({ bootstrapKey: 'the-secret-you-set' })
 * Then sign out/in (or refresh the ID token) so the new claim takes effect.
 */
const ADMIN_BOOTSTRAP_KEY = defineSecret('ADMIN_BOOTSTRAP_KEY')

exports.bootstrapFirstAdmin = onCall(
  { secrets: [ADMIN_BOOTSTRAP_KEY] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

    const { bootstrapKey } = request.data || {}
    if (bootstrapKey !== ADMIN_BOOTSTRAP_KEY.value()) {
      throw new HttpsError('permission-denied', 'Invalid bootstrap key.')
    }

    const markerRef = db.collection('config').doc('adminBootstrap')
    await db.runTransaction(async (tx) => {
      const marker = await tx.get(markerRef)
      if (marker.exists) throw new HttpsError('already-exists', 'An admin has already been bootstrapped.')
      tx.set(markerRef, { usedBy: uid, usedAt: admin.firestore.FieldValue.serverTimestamp() })
    })

    await admin.auth().setCustomUserClaims(uid, { admin: true })
    await logAudit('admin_bootstrapped', uid, {})

    return { granted: true }
  }
)
