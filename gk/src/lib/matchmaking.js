import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  limit,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const QUEUE = 'queue'
const MATCHES = 'matches'

export async function joinQueue({ uid, username, category, difficulty, questionCount, transactionId }) {
  if (!transactionId) throw new Error('A verified payment is required to join matchmaking.')
  const ref = await addDoc(collection(db, QUEUE), {
    uid,
    username,
    category,
    difficulty,
    questionCount,
    transactionId,
    status: 'waiting',
    matchId: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function leaveQueue(queueId) {
  try {
    await deleteDoc(doc(db, QUEUE, queueId))
  } catch {
    // already matched/removed — fine to ignore
  }
}

// Called on an interval by the waiting client: look for another 'waiting'
// entry with the same quiz params and try to claim it. Firestore
// transactions make sure two clients can't pair with the same opponent
// twice, since both re-read fresh state before writing.
export async function tryFindMatch({ queueId, uid, category, difficulty, questionCount }) {
  const q = query(
    collection(db, QUEUE),
    where('status', '==', 'waiting'),
    where('category', '==', category),
    where('difficulty', '==', difficulty),
    where('questionCount', '==', questionCount),
    limit(10)
  )
  const snap = await getDocs(q)
  const candidate = snap.docs.find((d) => d.id !== queueId && d.data().uid !== uid)
  if (!candidate) return null

  const opponentQueueId = candidate.id
  const opponentData = candidate.data()

  try {
    const matchId = await runTransaction(db, async (tx) => {
      const selfRef = doc(db, QUEUE, queueId)
      const oppRef = doc(db, QUEUE, opponentQueueId)
      const selfSnap = await tx.get(selfRef)
      const oppSnap = await tx.get(oppRef)

      if (!selfSnap.exists() || !oppSnap.exists()) throw new Error('stale')
      if (selfSnap.data().status !== 'waiting' || oppSnap.data().status !== 'waiting') throw new Error('stale')

      // The client no longer picks questions or ever sees correctIndex /
      // explanation — that would leak the answer key into the browser
      // before the quiz starts. This just opens the match shell; the
      // `assignQuestions` Cloud Function (Admin SDK, invisible to any
      // client) picks the real question set moments later and flips
      // status to 'countdown' once it's done.
      const matchRef = doc(collection(db, MATCHES))

      tx.set(matchRef, {
        playerA: { uid, username: selfSnap.data().username },
        playerB: { uid: opponentData.uid, username: opponentData.username },
        category,
        difficulty,
        questionCount,
        questionSet: [],
        status: 'pending_questions',
        startAt: null,
        createdAt: serverTimestamp(),
        rawAnswers: {},
        scores: {},
        winner: null,
        completedAt: null,
        flags: {},
      })

      tx.update(selfRef, { status: 'matched', matchId: matchRef.id })
      tx.update(oppRef, { status: 'matched', matchId: matchRef.id })

      return matchRef.id
    })
    return matchId
  } catch {
    return null // lost the race — caller keeps polling
  }
}

export function watchQueueEntry(queueId, callback) {
  return onSnapshot(doc(db, QUEUE, queueId), (snap) => {
    if (snap.exists()) callback(snap.data())
  })
}

export function watchMatch(matchId, callback) {
  return onSnapshot(doc(db, MATCHES, matchId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

// Each player writes only their own key in `rawAnswers` — never a score,
// never the opponent's key. This is just "what did I click and how long did
// it take", nothing this client says here is trusted as a result. The
// `evaluateMatch` Cloud Function watches for both keys to show up, then
// grades both players itself against the real answer key and writes
// `scores` / `winner` / `status: completed`. Firestore rules enforce that a
// client literally cannot write those fields directly — see firestore.rules.
export async function submitAnswers(matchId, uid, rawAnswers) {
  await updateDoc(doc(db, MATCHES, matchId), {
    [`rawAnswers.${uid}`]: rawAnswers,
  })
}

// Anti-cheat telemetry only — never affects server-side scoring. Reports how
// many times this player left the quiz tab/window during a live match, so
// admins can review suspicious activity (see AdminMatches / spec section 16).
export async function reportTabSwitch(matchId, uid, count) {
  try {
    await updateDoc(doc(db, MATCHES, matchId), { [`flags.${uid}.tabSwitches`]: count })
  } catch {
    // best-effort — never block the quiz on a telemetry write failing
  }
}

// Best-effort browser heuristics only (a large gap between outerWidth and
// innerWidth usually means the DevTools panel is open). There is no
// reliable, privacy-respecting way for a web page to detect OS-level
// screen recording — that would need an OS/device-level agent, which is
// out of scope here. This is telemetry for admin review, same as
// tabSwitches — it never affects server-side scoring.
export async function reportSuspiciousActivity(matchId, uid, count) {
  try {
    await updateDoc(doc(db, MATCHES, matchId), { [`flags.${uid}.devtoolsOpenCount`]: count })
  } catch {
    // best-effort
  }
}

// Powers "My Quiz History" / "View Previous Reports". Firestore rules only
// let a player read matches where they're playerA or playerB, so this runs
// two owner-scoped queries (one per side) and merges rather than a single
// OR query across nested fields.
export async function fetchMatchHistory(uid, take = 30) {
  const asA = query(collection(db, MATCHES), where('playerA.uid', '==', uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'), limit(take))
  const asB = query(collection(db, MATCHES), where('playerB.uid', '==', uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'), limit(take))
  const [snapA, snapB] = await Promise.all([getDocs(asA), getDocs(asB)])
  const all = [...snapA.docs, ...snapB.docs].map((d) => ({ id: d.id, ...d.data() }))
  all.sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0))
  return all.slice(0, take)
}
