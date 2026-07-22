import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, DIFFICULTIES } from '../data/questionBank'
import { watchQuestions, addQuestion, updateQuestion, deleteQuestion, seedQuestionBank, bulkImportQuestions } from '../lib/admin'
import { parseQuestionsCsv, downloadCsvTemplate } from '../lib/csvImport'

const BLANK_FORM = {
  category: CATEGORIES[0],
  difficulty: 'Easy',
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [form, setForm] = useState(BLANK_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState(null)
  const [csvPreview, setCsvPreview] = useState(null) // { valid, errors, fileName }
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResultMsg, setCsvResultMsg] = useState(null)
  const fileInputRef = useRef(null)

  async function handleSeed() {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const result = await seedQuestionBank()
      setSeedMsg(`Seeded ${result.seeded} starter questions into the live bank.`)
    } catch (err) {
      setSeedMsg(err.message || 'Seeding failed.')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    const unsub = watchQuestions(setQuestions, { category: filterCategory, difficulty: filterDifficulty })
    return unsub
  }, [filterCategory, filterDifficulty])

  function startEdit(q) {
    setEditingId(q.id)
    setForm({
      category: q.category,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(BLANK_FORM)
    setError(null)
  }

  async function save() {
    setError(null)
    if (!form.question.trim() || form.options.some((o) => !o.trim())) {
      setError('Question and all 4 options are required.')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateQuestion(editingId, form)
      } else {
        await addQuestion(form)
      }
      resetForm()
    } catch (err) {
      setError(err.message || 'Could not save question.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this question? This cannot be undone.')) return
    await deleteQuestion(id)
    if (editingId === id) resetForm()
  }

  async function toggleStatus(q) {
    await updateQuestion(q.id, { status: q.status === 'active' ? 'disabled' : 'active' })
  }

  function handleCsvFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvResultMsg(null)
    const reader = new FileReader()
    reader.onload = () => {
      const { valid, errors } = parseQuestionsCsv(String(reader.result))
      setCsvPreview({ valid, errors, fileName: file.name })
    }
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting the same file later
  }

  async function confirmCsvImport() {
    if (!csvPreview || csvPreview.valid.length === 0) return
    setCsvImporting(true)
    try {
      const imported = await bulkImportQuestions(csvPreview.valid)
      setCsvResultMsg(`Imported ${imported} question${imported === 1 ? '' : 's'} into the live bank.`)
      setCsvPreview(null)
    } catch (err) {
      setCsvResultMsg(err.message || 'Import failed.')
    } finally {
      setCsvImporting(false)
    }
  }

  function cancelCsvImport() {
    setCsvPreview(null)
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Bulk import from CSV</p>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          Columns: category, difficulty, question, optionA, optionB, optionC, optionD,
          correctAnswer (A–D or 1-4), explanation (optional).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '8px 14px' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose CSV file
          </button>
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '8px 14px' }}
            onClick={downloadCsvTemplate}
          >
            Download template
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: 'none' }} />

        {csvPreview && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>{csvPreview.fileName}</strong> — {csvPreview.valid.length} valid,{' '}
              {csvPreview.errors.length} with errors
            </p>
            {csvPreview.errors.length > 0 && (
              <div style={{ maxHeight: 140, overflowY: 'auto', marginBottom: 10 }}>
                {csvPreview.errors.map((e, i) => (
                  <p key={i} style={{ color: 'var(--danger, #ff5c5c)', fontSize: 11, margin: '2px 0' }}>
                    Row {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                disabled={csvImporting || csvPreview.valid.length === 0}
                onClick={confirmCsvImport}
              >
                {csvImporting ? 'Importing…' : `Import ${csvPreview.valid.length} question${csvPreview.valid.length === 1 ? '' : 's'}`}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', padding: '10px 16px' }} onClick={cancelCsvImport}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {csvResultMsg && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{csvResultMsg}</p>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>{editingId ? 'Edit question' : 'Add a question'}</p>

        <div className="grid-2" style={{ marginBottom: 8 }}>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={selectStyle}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} style={selectStyle}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <textarea
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          placeholder="Question text"
          rows={2}
          style={{ ...inputStyle, marginBottom: 8, resize: 'vertical' }}
        />

        {form.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input
              type="radio"
              checked={form.correctIndex === i}
              onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
              title="Mark as correct answer"
            />
            <input
              value={opt}
              onChange={(e) => {
                const next = [...form.options]
                next[i] = e.target.value
                setForm((f) => ({ ...f, options: next }))
              }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        ))}

        <textarea
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          placeholder="Explanation of the correct answer"
          rows={2}
          style={{ ...inputStyle, marginBottom: 10, resize: 'vertical' }}
        />

        {error && <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 12, marginBottom: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add question'}
          </button>
          {editingId && (
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 16px' }} onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={selectStyle}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} style={selectStyle}>
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {questions === null && <p className="muted">Loading questions…</p>}
      {questions?.length === 0 && (
        <div className="card">
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            No questions in this collection yet. Live matches now read only from here — add one
            above, or seed the ~30 starter GK questions to get going quickly.
          </p>
          <button className="btn-secondary" disabled={seeding} onClick={handleSeed}>
            {seeding ? 'Seeding…' : 'Seed starter questions'}
          </button>
          {seedMsg && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{seedMsg}</p>}
        </div>
      )}

      {questions?.map((q) => (
        <div key={q.id} className="card" style={{ marginBottom: 10, opacity: q.status === 'disabled' ? 0.55 : 1 }}>
          <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{q.category} · {q.difficulty}</p>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{q.question}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {q.options.map((opt, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: i === q.correctIndex ? 'rgba(46,230,166,0.15)' : 'var(--surface-2)',
                  color: i === q.correctIndex ? 'var(--accent, #2ee6a6)' : 'inherit',
                }}
              >
                {opt}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => startEdit(q)}>
              Edit
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => toggleStatus(q)}>
              {q.status === 'active' ? 'Disable' : 'Enable'}
            </button>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--danger, #ff5c5c)' }}
              onClick={() => remove(q.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 13,
}

const selectStyle = { ...inputStyle }
