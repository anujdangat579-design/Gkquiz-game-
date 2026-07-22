import { jsPDF } from 'jspdf'

/**
 * Renders the same data shown on the ScoreReport screen as a multi-page
 * A4 PDF and triggers a download. Kept separate from the plain-text
 * download already on that screen — this is the polished, shareable
 * version for players who want a proper document.
 */
export function downloadScoreReportPdf({ match, matchId, you, opponent, yourScore, oppScore, categoryStats, suggestions, isDraw, youWon, isPlayerA }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = 50

  function ensureRoom(needed) {
    if (y + needed > H - 40) {
      doc.addPage()
      y = 50
    }
  }

  doc.setTextColor(124, 92, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GK QUIZ GAME', margin, y)
  y += 22

  doc.setTextColor(20)
  doc.setFontSize(18)
  doc.text('Detailed Score Report', margin, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`Match ID: ${matchId}`, margin, y); y += 14
  doc.text(`Category: ${match.category}  |  Difficulty: ${match.difficulty}`, margin, y); y += 14
  const resultLine = isDraw ? 'Result: Draw' : youWon ? `Result: ${you.username} won` : `Result: ${opponent.username} won`
  doc.text(`${resultLine} (non-monetary recognition only — no cash prize)`, margin, y); y += 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Scores', margin, y); y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60)
  doc.text(`${you.username} (You): ${yourScore.correct} correct, ${yourScore.wrong} wrong, ${yourScore.unanswered} unanswered — Score ${yourScore.score}, Accuracy ${yourScore.accuracy}%`, margin, y); y += 14
  doc.text(`${opponent.username}: ${oppScore.correct} correct, ${oppScore.wrong} wrong, ${oppScore.unanswered} unanswered — Score ${oppScore.score}, Accuracy ${oppScore.accuracy}%`, margin, y); y += 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Category-wise Performance', margin, y); y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60)
  for (const c of categoryStats) {
    ensureRoom(14)
    doc.text(`${c.category}: ${c.correct}/${c.total} (${c.accuracy}%)`, margin, y)
    y += 14
  }
  y += 8

  ensureRoom(40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Improvement Suggestions', margin, y); y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60)
  for (const s of suggestions) {
    ensureRoom(28)
    const wrapped = doc.splitTextToSize(`• ${s}`, W - margin * 2)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 13 + 3
  }
  y += 8

  ensureRoom(30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Question-wise Review', margin, y); y += 18

  match.reviewData.forEach((q, i) => {
    const mySelected = isPlayerA ? q.selectedByA : q.selectedByB
    const yourAnswer = mySelected === null ? 'Not answered' : q.options[mySelected]
    const correctAnswer = q.correctIndex !== null ? q.options[q.correctIndex] : '—'

    ensureRoom(70)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(20)
    const qLines = doc.splitTextToSize(`Q${i + 1}. ${q.question}`, W - margin * 2)
    doc.text(qLines, margin, y)
    y += qLines.length * 13 + 2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(`Your answer: ${yourAnswer}`, margin, y); y += 12
    doc.text(`Correct answer: ${correctAnswer}`, margin, y); y += 12
    if (q.explanation) {
      const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, W - margin * 2)
      ensureRoom(expLines.length * 12)
      doc.text(expLines, margin, y)
      y += expLines.length * 12
    }
    y += 10
  })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(140)
  ensureRoom(20)
  doc.text('No cash prize was paid. Recognition is educational and achievement-based only.', margin, H - 30)

  doc.save(`score-report-${matchId}.pdf`)
}
