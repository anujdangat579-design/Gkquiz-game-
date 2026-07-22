// Pure scoring functions. Kept separate from Firestore code so the same
// logic can later be moved server-side (Cloud Function) without a rewrite —
// only the source of `answers` changes, not this math.

export function computeScore(answers, questionSet) {
  let correct = 0
  let wrong = 0
  let unanswered = 0
  let totalTimeMs = 0

  for (const question of questionSet) {
    const a = answers[question.id]
    if (!a || a.selectedIndex === null || a.selectedIndex === undefined) {
      unanswered++
      continue
    }
    totalTimeMs += a.timeTakenMs || 0
    if (a.selectedIndex === question.correctIndex) correct++
    else wrong++
  }

  const total = questionSet.length
  const score = correct // +1 per correct, 0 for wrong/unanswered (spec default)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return { correct, wrong, unanswered, score, accuracy, timeTakenMs: totalTimeMs, total }
}

// Tie-break order, no randomness:
// 1. Higher score  2. Higher accuracy  3. Faster total correct-answer time  4. Draw
export function decideWinner(uidA, scoreA, uidB, scoreB) {
  if (scoreA.score !== scoreB.score) return scoreA.score > scoreB.score ? uidA : uidB
  if (scoreA.accuracy !== scoreB.accuracy) return scoreA.accuracy > scoreB.accuracy ? uidA : uidB
  if (scoreA.timeTakenMs !== scoreB.timeTakenMs) return scoreA.timeTakenMs < scoreB.timeTakenMs ? uidA : uidB
  return 'draw'
}
