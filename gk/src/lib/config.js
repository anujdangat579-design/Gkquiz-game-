import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { CATEGORIES, DIFFICULTIES } from '../data/questionBank'

const CONFIG_DOC = doc(db, 'config', 'competition')

// Fallback used until the admin saves a config doc for the first time, and
// as a safety net if a field is ever missing — the app should never crash
// just because /admin/config hasn't been touched yet.
export const DEFAULT_CONFIG = {
  // ₹10 for Easy, ₹20 for Medium, ₹30 for Hard — the fee scales with
  // difficulty. The old flat `entryFeeRupees` is kept only as a legacy
  // fallback (see getFeeForDifficulty) for configs saved before this change.
  feeByDifficulty: { Easy: 10, Medium: 20, Hard: 30 },
  entryFeeRupees: 10,
  questionCountOptions: [10, 20, 30],
  enabledCategories: CATEGORIES,
  enabledDifficulties: DIFFICULTIES,
  updatedAt: null,
}

// Resolves the ₹ fee to show/charge for a given difficulty: prefers the
// per-difficulty map, falls back to the flat legacy fee, then the default.
export function getFeeForDifficulty(config, difficulty) {
  const fromMap = config?.feeByDifficulty?.[difficulty]
  if (Number.isFinite(fromMap) && fromMap > 0) return fromMap
  if (Number.isFinite(config?.entryFeeRupees) && config.entryFeeRupees > 0) return config.entryFeeRupees
  return DEFAULT_CONFIG.feeByDifficulty[difficulty] ?? DEFAULT_CONFIG.entryFeeRupees
}

export function watchCompetitionConfig(callback) {
  return onSnapshot(CONFIG_DOC, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_CONFIG, ...snap.data() } : DEFAULT_CONFIG)
  })
}

export async function getCompetitionConfig() {
  const snap = await getDoc(CONFIG_DOC)
  return snap.exists() ? { ...DEFAULT_CONFIG, ...snap.data() } : DEFAULT_CONFIG
}

// Admin-only in practice — firestore.rules rejects this write from anyone
// without the `admin` custom claim, regardless of what the client sends.
export async function saveCompetitionConfig(patch) {
  await setDoc(CONFIG_DOC, { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
}
