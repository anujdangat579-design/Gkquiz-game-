import { useEffect, useState } from 'react'
import { CATEGORIES, DIFFICULTIES } from '../data/questionBank'
import { watchCompetitionConfig, saveCompetitionConfig, DEFAULT_CONFIG } from '../lib/config'

export default function AdminConfig() {
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = watchCompetitionConfig((c) => {
      setConfig(c)
      setForm((f) => f || toFormState(c))
    })
    return unsub
  }, [])

  if (!form) return <p className="muted">Loading competition config…</p>

  function toggleInArray(key, value) {
    setForm((f) => {
      const has = f[key].includes(value)
      return { ...f, [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value] }
    })
  }

  function toggleQuestionCount(n) {
    setForm((f) => {
      const has = f.questionCountOptions.includes(n)
      const next = has ? f.questionCountOptions.filter((v) => v !== n) : [...f.questionCountOptions, n].sort((a, b) => a - b)
      return { ...f, questionCountOptions: next }
    })
  }

  async function save() {
    setError(null)
    setMessage(null)
    const feeByDifficulty = {}
    for (const d of DIFFICULTIES) {
      const n = Number(form.feeByDifficulty[d])
      if (!Number.isFinite(n) || n <= 0) {
        setError(`Entry fee for ${d} must be a positive number.`)
        return
      }
      feeByDifficulty[d] = n
    }
    if (form.questionCountOptions.length === 0) {
      setError('Enable at least one question-count option.')
      return
    }
    if (form.enabledCategories.length === 0) {
      setError('Enable at least one category.')
      return
    }
    if (form.enabledDifficulties.length === 0) {
      setError('Enable at least one difficulty.')
      return
    }
    setSaving(true)
    try {
      await saveCompetitionConfig({
        feeByDifficulty,
        questionCountOptions: form.questionCountOptions,
        enabledCategories: form.enabledCategories,
        enabledDifficulties: form.enabledDifficulties,
      })
      setMessage('saved')
    } catch (err) {
      setError(err.message || 'Could not save config.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Entry fee by difficulty</p>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          Charged server-side by the <code>createOrder</code> Cloud Function based on the
          difficulty the player picks — changing this here takes effect on the very next
          payment, no redeploy needed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DIFFICULTIES.map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 70, fontSize: 13, fontWeight: 600 }}>{d}</span>
              <span style={{ fontWeight: 700 }}>₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.feeByDifficulty[d] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, feeByDifficulty: { ...f.feeByDifficulty, [d]: e.target.value } }))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Question count options</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[10, 20, 30, 40, 50].map((n) => (
            <button
              key={n}
              className={`chip ${form.questionCountOptions.includes(n) ? 'active' : ''}`}
              onClick={() => toggleQuestionCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Enabled categories</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${form.enabledCategories.includes(c) ? 'active' : ''}`}
              onClick={() => toggleInArray('enabledCategories', c)}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Only affects what players see on the setup screen — make sure the Question Bank has
          active questions for any category you enable.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Enabled difficulties</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`chip ${form.enabledDifficulties.includes(d) ? 'active' : ''}`}
              onClick={() => toggleInArray('enabledDifficulties', d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {message && <p style={{ color: 'var(--accent, #2ee6a6)', fontSize: 12, marginBottom: 10 }}>Saved.</p>}

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save competition config'}
      </button>

      {config?.updatedAt && (
        <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          Last saved: {new Date(config.updatedAt).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  )
}

function toFormState(c) {
  return {
    feeByDifficulty: { ...DEFAULT_CONFIG.feeByDifficulty, ...(c.feeByDifficulty || {}) },
    questionCountOptions: c.questionCountOptions ?? DEFAULT_CONFIG.questionCountOptions,
    enabledCategories: c.enabledCategories ?? DEFAULT_CONFIG.enabledCategories,
    enabledDifficulties: c.enabledDifficulties ?? DEFAULT_CONFIG.enabledDifficulties,
  }
}

const inputStyle = {
  flex: 1,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 14,
}
