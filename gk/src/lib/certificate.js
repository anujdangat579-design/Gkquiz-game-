import { jsPDF } from 'jspdf'

function formatDate(ts) {
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-IN', { dateStyle: 'long' })
  return new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })
}

/**
 * Renders a landscape A4 certificate as a PDF and triggers a download.
 * `kind` is 'winner' or 'participant' — only the headline copy and accent
 * color change; both explicitly avoid any cash/prize language, consistent
 * with the "no cash prize, recognition only" model used throughout the app.
 */
export function downloadCertificate({ kind, username, opponentUsername, match, matchId }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const accent = kind === 'winner' ? [124, 92, 255] : [46, 230, 166]

  // Border
  doc.setDrawColor(...accent)
  doc.setLineWidth(3)
  doc.rect(24, 24, W - 48, H - 48)
  doc.setLineWidth(0.75)
  doc.rect(34, 34, W - 68, H - 68)

  doc.setTextColor(...accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('GK QUIZ GAME', W / 2, 78, { align: 'center' })

  doc.setTextColor(30)
  doc.setFontSize(28)
  doc.text(kind === 'winner' ? 'Certificate of Achievement' : 'Certificate of Participation', W / 2, 112, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(90)
  doc.text('This certificate is proudly presented to', W / 2, 150, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(20)
  doc.text(username, W / 2, 190, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(90)
  const body =
    kind === 'winner'
      ? `for winning a 1v1 GK Quiz Game competition against ${opponentUsername} on ${match.category} (${match.difficulty})`
      : `for participating in a 1v1 GK Quiz Game competition against ${opponentUsername} on ${match.category} (${match.difficulty})`
  const wrapped = doc.splitTextToSize(body, W - 220)
  doc.text(wrapped, W / 2, 218, { align: 'center' })

  doc.setFontSize(11)
  doc.setTextColor(120)
  doc.text(`Date: ${formatDate(match.completedAt)}`, W / 2, 250, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(150)
  doc.text(
    'This is a non-monetary recognition of educational achievement. No cash prize or wagering is associated with it.',
    W / 2,
    H - 60,
    { align: 'center' }
  )
  doc.text(`Certificate ID: ${matchId}`, W / 2, H - 46, { align: 'center' })

  doc.save(`certificate-${kind}-${matchId}.pdf`)
}
