import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// Ranked by wins first (spec: rank by score/accuracy/completions/consistency,
// never by money). Ties broken client-side by accuracy, then total matches
// played, so a player can't top the board by playing (and losing) a lot.
export async function fetchLeaderboard(topN = 50) {
  const q = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(topN))
  const snap = await getDocs(q)
  const rows = snap.docs.map((d) => {
    const data = d.data()
    const accuracy = data.totalQuestions > 0 ? Math.round((data.totalCorrect / data.totalQuestions) * 100) : 0
    return { uid: d.id, username: data.username || 'Player', wins: data.wins || 0, totalMatches: data.totalMatches || 0, accuracy }
  })
  rows.sort((a, b) => b.wins - a.wins || b.accuracy - a.accuracy || b.totalMatches - a.totalMatches)
  return rows
}

// Cheap "what's my rank" lookup for the Home screen — reuses the same
// top-50 all-time query as the Leaderboard screen (no extra index needed).
// A player outside the top 50 shows "50+" rather than running an unbounded
// query just for a home-screen stat card.
export async function fetchMyRank(uid, topN = 50) {
  const rows = await fetchLeaderboard(topN)
  const idx = rows.findIndex((r) => r.uid === uid)
  if (idx === -1) return rows.length >= topN ? `${topN}+` : '—'
  return idx + 1
}

function currentPeriodKey(period) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  if (period === 'daily') return `${y}-${m}-${d}`
  if (period === 'monthly') return `${y}-${m}`
  // weekly: ISO week, matches functions/index.js isoWeekKey
  const date = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const PERIOD_COLLECTION = {
  daily: 'leaderboardDaily',
  weekly: 'leaderboardWeekly',
  monthly: 'leaderboardMonthly',
}

// Daily/Weekly/Monthly leaderboards read from small aggregate docs bumped
// by the evaluateMatch Cloud Function (see functions/index.js) — a client
// can't query across everyone's matches directly (firestore.rules only lets
// a player read matches they're part of).
export async function fetchPeriodLeaderboard(period, topN = 50) {
  if (period === 'all') return fetchLeaderboard(topN)
  const key = currentPeriodKey(period)
  const q = query(collection(db, PERIOD_COLLECTION[period]), where('periodKey', '==', key), orderBy('wins', 'desc'), limit(topN))
  const snap = await getDocs(q)
  const rows = snap.docs.map((d) => {
    const data = d.data()
    const accuracy = data.totalQuestions > 0 ? Math.round((data.totalCorrect / data.totalQuestions) * 100) : 0
    return { uid: data.uid, username: data.username || 'Player', wins: data.wins || 0, totalMatches: data.totalMatches || 0, accuracy }
  })
  rows.sort((a, b) => b.wins - a.wins || b.accuracy - a.accuracy || b.totalMatches - a.totalMatches)
  return rows
}
