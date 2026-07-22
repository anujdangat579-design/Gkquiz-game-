import { jsPDF } from 'jspdf'
import { formatRupees } from './transactions'

// TODO: replace with your real registered business details before launch —
// these appear on every receipt and are referenced by the legal pages too.
export const BUSINESS_INFO = {
  legalName: '[Your Business / Company Legal Name]',
  address: '[Registered Address, City, State, PIN]',
  gstin: '[GSTIN, if registered]',
  supportEmail: '[email protected]',
  supportPhone: '[+91 XXXXXXXXXX]',
}

function statusLabel(status) {
  return { created: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }[status] || status
}

function formatDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Generates a one-page PDF receipt for a single transaction and triggers a
 * browser download. Pure client-side rendering from data already present in
 * the `transactions/{id}` doc — no new Cloud Function needed. Deliberately
 * echoes the "no cash prize / no withdrawable balance" language used
 * elsewhere in the app so the receipt can't be read as a betting slip.
 */
export function downloadReceipt(tx) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  let y = 56

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Payment Receipt', marginX, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('GK Quiz Game', 547 - marginX, y, { align: 'right' })
  y += 8
  doc.setDrawColor(200)
  doc.line(marginX, y, 547, y)
  y += 28

  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text('Issued by', marginX, y)
  doc.setTextColor(20)
  doc.setFont('helvetica', 'bold')
  doc.text(BUSINESS_INFO.legalName, marginX, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(BUSINESS_INFO.address, marginX, y + 28)
  if (BUSINESS_INFO.gstin) doc.text(`GSTIN: ${BUSINESS_INFO.gstin}`, marginX, y + 42)
  doc.text(`Support: ${BUSINESS_INFO.supportEmail} · ${BUSINESS_INFO.supportPhone}`, marginX, y + 56)
  y += 84

  doc.setDrawColor(230)
  doc.line(marginX, y, 547, y)
  y += 26

  const rows = [
    ['Receipt / Transaction ID', tx.transactionId || tx.id],
    ['Razorpay Order ID', tx.orderId || '—'],
    ['Razorpay Payment ID', tx.paymentId || '—'],
    ['Date & Time', formatDate(tx.createdAt)],
    ['Purpose', tx.purpose || 'Quiz Competition Access and Educational Assessment Service Fee'],
    ['Category', tx.category || '—'],
    ['Difficulty', tx.difficulty || '—'],
    ['Questions', tx.questionCount ? `${tx.questionCount} questions` : '—'],
    ['Status', statusLabel(tx.status)],
  ]

  doc.setFontSize(10)
  rows.forEach(([label, value]) => {
    doc.setTextColor(110)
    doc.text(label, marginX, y)
    doc.setTextColor(20)
    doc.text(String(value), 547 - marginX, y, { align: 'right' })
    y += 20
  })

  y += 10
  doc.setDrawColor(200)
  doc.line(marginX, y, 547, y)
  y += 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Amount Paid', marginX, y)
  doc.text(formatRupees(tx.amount), 547 - marginX, y, { align: 'right' })
  y += 34

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  const disclaimer =
    'This receipt is for quiz competition access and an educational assessment service only. ' +
    'No cash prize, wagering, or withdrawable balance is associated with this payment or this platform.'
  const wrapped = doc.splitTextToSize(disclaimer, 547 - marginX * 2)
  doc.text(wrapped, marginX, y)
  y += wrapped.length * 12 + 14

  doc.setFontSize(8)
  doc.setTextColor(160)
  doc.text('This is a system-generated receipt and does not require a signature.', marginX, y)

  doc.save(`receipt-${tx.transactionId || tx.id}.pdf`)
}
