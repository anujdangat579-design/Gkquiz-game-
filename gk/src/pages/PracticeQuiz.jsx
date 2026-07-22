import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getQuestionsFor } from '../data/questionBank'

// Practice mode is free and entirely client-side: no payment, no opponent,
// no server grading. Feedback (correct/wrong + explanation) is shown the
// instant a player answers, which is the whole point of practice — unlike
// the paid 1v1 competition where scoring only happens server-side.
export default function PracticeQuiz() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const questionSet = useMemo(
    () => getQuestionsFor({ category: state?.category, difficulty: state?.difficulty, count: state?.questionCount || 10 }),
    [state]
  )

  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [done, setDone] = useState(false)

  if (!state) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="muted">Start a practice quiz from the setup screen first.</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/practice')}>Go to Practice Setup</button>
      </div>
    )
  }

  const current = questionSet[qIndex]

  function handleSelect(idx) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
    setStats((s) => (idx === current.correctIndex ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }))
  }

  function handleNext() {
    if (qIndex + 1 < questionSet.length) {
      setQIndex((i) => i + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    const total = questionSet.length
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="eyebrow">PRACTICE COMPLETE</p>
        <p className="display" style={{ fontSize: 40, margin: '8px 0' }}>{stats.correct}/{total}</p>
        <p className="muted" style={{ marginBottom: 24 }}>Accuracy: {accuracy}% · {state.category} · {state.difficulty}</p>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/practice')}>New Practice</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p className="eyebrow">Practice · Question {qIndex + 1} of {questionSet.length}</p>
        <span className="chip">✓ {stats.correct} · ✕ {stats.wrong}</span>
      </div>

      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${((qIndex + 1) / questionSet.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--violet))',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <h2 className="display" style={{ fontSize: 21, lineHeight: 1.4, marginBottom: 22 }}>
        {current.question}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {current.options.map((opt, idx) => {
          const isSelected = selected === idx
          const isCorrect = idx === current.correctIndex
          let borderColor = 'var(--border)'
          let bg = 'var(--surface)'
          if (revealed && isCorrect) {
            borderColor = 'var(--accent)'
            bg = 'rgba(45,232,201,0.10)'
          } else if (revealed && isSelected && !isCorrect) {
            borderColor = 'var(--wrong, #ff5c5c)'
            bg = 'rgba(255,92,92,0.08)'
          } else if (isSelected) {
            borderColor = 'var(--accent)'
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className="card"
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderColor,
                background: bg,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                cursor: revealed ? 'default' : 'pointer',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: `1.5px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ fontSize: 15 }}>{opt}</span>
              {revealed && isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
              {revealed && isSelected && !isCorrect && <span style={{ marginLeft: 'auto' }}>✕</span>}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="card" style={{ marginBottom: 18, background: 'var(--surface-2)' }}>
          <p className="eyebrow" style={{ color: selected === current.correctIndex ? 'var(--accent)' : 'var(--wrong, #ff5c5c)' }}>
            {selected === current.correctIndex ? 'CORRECT' : 'INCORRECT'}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: '4px 0 0' }}>{current.explanation}</p>
        </div>
      )}

      <button className="btn-primary" disabled={!revealed} onClick={handleNext}>
        {qIndex + 1 < questionSet.length ? 'Next Question' : 'Finish Practice'}
      </button>
    </div>
  )
}
