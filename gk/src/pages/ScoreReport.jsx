import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { watchMatch } from '../lib/matchmaking'
import { downloadScoreReportPdf } from '../lib/scoreReportPdf'

export default function ScoreReport({ user }) {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)

  useEffect(() => {
    const unsub = watchMatch(matchId, setMatch)
    return unsub
  }, [matchId])

  if (!match) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading score report…</p>
      </div>
    )
  }

  if (match.status !== 'completed' || !match.reviewData) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="muted">The score report will be available once this match is complete.</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>Back</button>
      </div>
    )
  }

  const you = match.playerA.uid === user.uid ? match.playerA : match.playerB
  const opponent = match.playerA.uid === user.uid ? match.playerB : match.playerA
  const isPlayerA = match.playerA.uid === user.uid
  const yourScore = (match.scores || {})[you.uid]
  const oppScore = (match.scores || {})[opponent.uid]
  const isDraw = match.winner === 'draw'
  const youWon = match.winner === you.uid

  // Per-category breakdown of your own answers, computed from reviewData.
  const categoryMap = new Map()
  for (const q of match.reviewData) {
    const mySelected = isPlayerA ? q.selectedByA : q.selectedByB
    const isCorrect = mySelected !== null && mySelected === q.correctIndex
    const entry = categoryMap.get(q.category) || { correct: 0, total: 0 }
    entry.total += 1
    if (isCorrect) entry.correct += 1
    categoryMap.set(q.category, entry)
  }
  const categoryStats = Array.from(categoryMap.entries()).map(([category, s]) => ({
    category,
    correct: s.correct,
    total: s.total,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }))
  const strengths = categoryStats.filter((c) => c.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy)
  const weakAreas = categoryStats.filter((c) => c.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy)

  const suggestions = []
  if (weakAreas.length > 0) {
    suggestions.push(`Revise ${weakAreas.map((w) => w.category).join(', ')} — your accuracy there was below 70%.`)
  }
  if (yourScore.unanswered > 0) {
    suggestions.push(`You left ${yourScore.unanswered} question(s) unanswered — practicing under the time limit can help.`)
  }
  if (yourScore.accuracy >= 90) {
    suggestions.push('Excellent accuracy — try a Hard difficulty quiz next to keep challenging yourself.')
  }
  if (suggestions.length === 0) {
    suggestions.push('Solid, balanced performance across categories. Keep practicing to build consistency.')
  }

  function handleShare() {
    const text = `GK Quiz Game — Score Report\n${you.username}: ${yourScore.correct}/${yourScore.total} (${yourScore.accuracy}%)\n${opponent.username}: ${oppScore.correct}/${oppScore.total} (${oppScore.accuracy}%)\nResult: ${isDraw ? 'Draw' : youWon ? 'You won' : `${opponent.username} won`}`
    if (navigator.share) {
      navigator.share({ title: 'GK Quiz Game Score Report', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      alert('Score report copied to clipboard.')
    }
  }

  function handleDownload() {
    const lines = [
      'GK QUIZ GAME — DETAILED SCORE REPORT',
      `Match ID: ${match.matchId || matchId}`,
      `Category: ${match.category} | Difficulty: ${match.difficulty}`,
      `Result: ${isDraw ? 'Draw' : youWon ? `${you.username} won` : `${opponent.username} won`}`,
      '',
      `${you.username} (You): ${yourScore.correct} correct, ${yourScore.wrong} wrong, ${yourScore.unanswered} unanswered — Score ${yourScore.score}, Accuracy ${yourScore.accuracy}%`,
      `${opponent.username}: ${oppScore.correct} correct, ${oppScore.wrong} wrong, ${oppScore.unanswered} unanswered — Score ${oppScore.score}, Accuracy ${oppScore.accuracy}%`,
      '',
      'CATEGORY-WISE PERFORMANCE',
      ...categoryStats.map((c) => `  ${c.category}: ${c.correct}/${c.total} (${c.accuracy}%)`),
      '',
      'IMPROVEMENT SUGGESTIONS',
      ...suggestions.map((s) => `  - ${s}`),
      '',
      'QUESTION-WISE REVIEW',
      ...match.reviewData.map((q, i) => {
        const mySelected = isPlayerA ? q.selectedByA : q.selectedByB
        const yourAnswer = mySelected === null ? 'Not answered' : q.options[mySelected]
        const correctAnswer = q.correctIndex !== null ? q.options[q.correctIndex] : '—'
        return `  Q${i + 1}. ${q.question}\n     Your answer: ${yourAnswer}\n     Correct answer: ${correctAnswer}\n     Explanation: ${q.explanation}`
      }),
      '',
      'No cash prize was paid. Recognition is educational and achievement-based only.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `score-report-${matchId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePdfDownload() {
    downloadScoreReportPdf({
      match, matchId, you, opponent, yourScore, oppScore, categoryStats, suggestions, isDraw, youWon, isPlayerA,
    })
  }

  return (
    <div className="screen">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <p className="eyebrow">DETAILED SCORE REPORT</p>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 4px' }}>{match.category} · {match.difficulty}</h1>
      <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
        {isDraw ? 'Draw' : youWon ? `${you.username} won — Participant: ${opponent.username}` : `${opponent.username} won — Participant: ${you.username}`}
      </p>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <Stat label="Score" value={`${yourScore.score}/${yourScore.total}`} />
        <Stat label="Accuracy" value={`${yourScore.accuracy}%`} />
        <Stat label="Unanswered" value={yourScore.unanswered} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Category-wise Performance</p>
        {categoryStats.map((c) => (
          <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{c.category}</span>
            <span className="muted">{c.correct}/{c.total} · {c.accuracy}%</span>
          </div>
        ))}
      </div>

      {strengths.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--accent)' }}>Strengths</p>
          <p className="muted" style={{ fontSize: 13 }}>{strengths.map((s) => s.category).join(', ')}</p>
        </div>
      )}

      {weakAreas.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--wrong, #ff5c5c)' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--wrong, #ff5c5c)' }}>Weak Areas</p>
          <p className="muted" style={{ fontSize: 13 }}>{weakAreas.map((s) => s.category).join(', ')}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, background: 'var(--surface-2)' }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Improvement Suggestions</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {suggestions.map((s, i) => (
            <li key={i} className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{s}</li>
          ))}
        </ul>
      </div>

      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Question-wise Review</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {match.reviewData.map((q, i) => {
          const mySelected = isPlayerA ? q.selectedByA : q.selectedByB
          const correct = mySelected !== null && mySelected === q.correctIndex
          return (
            <div key={q.id} className="card" style={{ borderColor: correct ? 'var(--accent)' : 'var(--wrong, #ff5c5c)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Q{i + 1}. {q.question}</p>
              <p className="muted" style={{ fontSize: 12, margin: '2px 0' }}>
                Your answer: {mySelected === null ? 'Not answered' : q.options[mySelected]}
              </p>
              {!correct && (
                <p className="muted" style={{ fontSize: 12, margin: '2px 0', color: 'var(--accent)' }}>
                  Correct answer: {q.correctIndex !== null ? q.options[q.correctIndex] : '—'}
                </p>
              )}
              <p className="muted" style={{ fontSize: 12, margin: '6px 0 0', lineHeight: 1.5 }}>{q.explanation}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={handleDownload}>⬇ Text</button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={handlePdfDownload}>📄 PDF</button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={handleShare}>↗ Share</button>
      </div>
      <button className="btn-primary" onClick={() => navigate('/')}>Back to Home</button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="display" style={{ fontSize: 20, margin: 0 }}>{value}</p>
      <p className="muted" style={{ fontSize: 11, margin: 0 }}>{label}</p>
    </div>
  )
}
