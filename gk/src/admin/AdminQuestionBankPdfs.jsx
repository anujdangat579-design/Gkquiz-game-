import { useEffect, useState } from 'react'
import { watchQuestionBankPdfs, uploadQuestionBankPdf, PDF_CATEGORIES } from '../lib/questionBankPdf'

export default function AdminQuestionBankPdfs() {
  const [pdfs, setPdfs] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [errorId, setErrorId] = useState(null)

  useEffect(() => {
    const unsub = watchQuestionBankPdfs(setPdfs)
    return unsub
  }, [])

  async function handleUpload(categoryId, file) {
    if (!file) return
    setErrorId(null)
    setBusyId(categoryId)
    try {
      await uploadQuestionBankPdf(categoryId, file)
    } catch (err) {
      setErrorId({ id: categoryId, message: err.message || 'Upload failed.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Question Bank PDFs</p>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Upload a PDF for each category. Uploading a new file replaces the old one for that
          category immediately on the Home page — this is how you refresh "Current Affairs"
          weekly, for example.
        </p>
      </div>

      {PDF_CATEGORIES.map((c) => {
        const pdf = pdfs[c.id]
        const busy = busyId === c.id
        const error = errorId?.id === c.id ? errorId.message : null
        return (
          <div key={c.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</p>
              {pdf?.updatedAt && (
                <p className="muted" style={{ fontSize: 11 }}>
                  Updated {pdf.updatedAt.toDate().toLocaleDateString()}
                </p>
              )}
            </div>

            {pdf?.pdfUrl && (
              <a href={pdf.pdfUrl} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12 }}>
                View current PDF ({pdf.fileName})
              </a>
            )}

            {error && <p style={{ color: 'var(--wrong, #ff5c5c)', fontSize: 12, marginTop: 6 }}>{error}</p>}

            <label className="btn-secondary" style={{ display: 'inline-block', width: 'auto', padding: '8px 16px', fontSize: 12, marginTop: 8, cursor: 'pointer' }}>
              {busy ? 'Uploading…' : pdf?.pdfUrl ? 'Replace PDF' : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleUpload(c.id, f) }}
              />
            </label>
          </div>
        )
      })}
    </div>
  )
}
