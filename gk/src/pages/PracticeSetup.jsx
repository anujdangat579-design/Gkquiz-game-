import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, DIFFICULTIES } from '../data/questionBank'

export default function PracticeSetup() {
  const navigate = useNavigate()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [difficulty, setDifficulty] = useState('Easy')
  const [questionCount, setQuestionCount] = useState(10)

  const start = () => {
    navigate('/practice/quiz', { state: { category, difficulty, questionCount } })
  }

  return (
    <div className="screen">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <p className="eyebrow">FREE · NO PAYMENT NEEDED</p>
      <h1 className="display" style={{ fontSize: 24, margin: '4px 0 20px' }}>Practice Quiz</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
        Sharpen your knowledge with unlimited free practice. Get instant answers and explanations
        after every question — no access fee, no opponent, no score report cost.
      </p>

      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Category</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Difficulty</p>
      <div className="grid-3" style={{ marginBottom: 22 }}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={`chip ${difficulty === d ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => setDifficulty(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Number of questions</p>
      <div className="grid-3" style={{ marginBottom: 26 }}>
        {[10, 20, 30].map((n) => (
          <button
            key={n}
            className={`chip ${questionCount === n ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => setQuestionCount(n)}
          >
            {n} Qs
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20, background: 'var(--surface-2)' }}>
        <p className="eyebrow" style={{ color: 'var(--accent, #2ee6a6)' }}>PRACTICE MODE</p>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          This is a free educational feature — there is no 1v1 opponent, no access fee, and no
          winner recognition. It's purely for learning and self-assessment.
        </p>
      </div>

      <button className="btn-primary" onClick={start}>
        Start Practice
      </button>
    </div>
  )
}
