import { doc, setDoc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const USERS = 'users'

const DEFAULT_PROFILE = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  totalScore: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  bestScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  badges: [],
  processedMatches: {},
}

// Badge thresholds — pure function of the stats object so it's easy to
// extend later without touching the transaction logic below.
function computeBadges(stats) {
  const badges = new Set(stats.badges || [])
  if (stats.wins >= 1) badges.add('first_win')
  if (stats.wins >= 5) badges.add('five_wins')
  if (stats.wins >= 10) badges.add('ten_wins')
  if (stats.currentStreak >= 3) badges.add('streak_3')
  if (stats.currentStreak >= 5) badges.add('streak_5')
  const accuracy = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0
  if (stats.totalMatches >= 5 && accuracy >= 80) badges.add('sharp_shooter')
  return Array.from(badges)
}

export const BADGE_INFO = {
  first_win: { label: 'First Win', icon: '🥇' },
  five_wins: { label: '5 Wins', icon: '🏅' },
  ten_wins: { label: '10 Wins', icon: '🎖️' },
  streak_3: { label: '3-Win Streak', icon: '🔥' },
  streak_5: { label: '5-Win Streak', icon: '⚡' },
  sharp_shooter: { label: 'Sharp Shooter', icon: '🎯' },
}

export async function ensureUserDoc(uid, username) {
  const ref = doc(db, USERS, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { username, createdAt: serverTimestamp(), ...DEFAULT_PROFILE })
  }
}

export async function updateUsername(uid, username) {
  await setDoc(doc(db, USERS, uid), { username }, { merge: true })
}

// `dataUrl` is a small (resized client-side, see Profile.jsx) base64 JPEG —
// there's no Firebase Storage bucket wired up in this project, and a
// thumbnail-sized data URL comfortably fits Firestore's 1MB document limit.
export async function updateProfilePhoto(uid, dataUrl) {
  await setDoc(doc(db, USERS, uid), { photoURL: dataUrl }, { merge: true })
}

export function watchUserProfile(uid, callback) {
  return onSnapshot(doc(db, USERS, uid), (snap) => {
    if (snap.exists()) callback(snap.data())
  })
}

// Called once per player after a match completes. Idempotent per matchId —
// safe even if the Result screen re-renders or the tab is refreshed.
export async function recordMatchResult(uid, matchId, { result, correct, total, score, accuracy }) {
  const ref = doc(db, USERS, uid)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists() ? snap.data() : { ...DEFAULT_PROFILE, username: 'Player' }
    if (current.processedMatches && current.processedMatches[matchId]) return // already counted

    const next = {
      ...current,
      totalMatches: (current.totalMatches || 0) + 1,
      wins: (current.wins || 0) + (result === 'win' ? 1 : 0),
      losses: (current.losses || 0) + (result === 'loss' ? 1 : 0),
      draws: (current.draws || 0) + (result === 'draw' ? 1 : 0),
      totalScore: (current.totalScore || 0) + score,
      totalCorrect: (current.totalCorrect || 0) + correct,
      totalQuestions: (current.totalQuestions || 0) + total,
      bestScore: Math.max(current.bestScore || 0, score),
      currentStreak: result === 'win' ? (current.currentStreak || 0) + 1 : result === 'loss' ? 0 : current.currentStreak || 0,
    }
    next.longestStreak = Math.max(current.longestStreak || 0, next.currentStreak)
    next.badges = computeBadges(next)
    next.processedMatches = { ...(current.processedMatches || {}), [matchId]: true }
    next.updatedAt = serverTimestamp()
    void accuracy // accuracy is derived (totalCorrect/totalQuestions), not stored directly

    tx.set(ref, next, { merge: true })
  })
}
