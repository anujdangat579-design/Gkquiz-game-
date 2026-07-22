import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { payQuizAccessFee } from '../lib/payments'
import { watchCompetitionConfig } from '../lib/config'

export default function QuizSetup({ user }) {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [category, setCategory] = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [questionCount, setQuestionCount] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = watchCompetitionConfig((c) => {
      setConfig(c)
      setCategory((cur) => cur ?? c.enabledCategories[0])
      setDifficulty((cur) => cur ?? c.enabledDifficulties[0])
      setQuestionCount((cur) => cur ?? c.questionCountOptions[0])
    })
    return unsub
  }, [])

  const startMatchmaking = async () => {
    setError(null)
    if (!agreed) {
      setError('Please accept the Terms & Conditions and User Agreement to continue.')
      return
    }
    setPaying(true)
    try {
      const { transactionId } = await payQuizAccessFee({ user, category, difficulty, questionCount })
      navigate('/matchmaking', { state: { category, difficulty, questionCount, transactionId } })
    } catch (err) {
      if (err.message !== 'cancelled') {
        setError('Payment could not be completed. Please try again.')
      }
    } finally {
      setPaying(false)
    }
  }

  if (!config || !category || !difficulty || !questionCount) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading quiz setup…</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <p className="eyebrow">SET UP YOUR MATCH</p>
      <h1 className="display" style={{ fontSize: 24, margin: '4px 0 20px' }}>Choose your quiz</h1>

      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Category</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {config.enabledCategories.map((c) => (
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
        {config.enabledDifficulties.map((d) => (
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
        {config.questionCountOptions.map((n) => (
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
        <p className="eyebrow" style={{ color: 'var(--violet)' }}>ACCESS FEE</p>
        <p className="display" style={{ fontSize: 28, margin: '4px 0' }}>₹{config.entryFeeRupees}</p>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Covers quiz competition access and your educational score report. No cash prize is paid
          to the winner and no money can be withdrawn on this platform.
        </p>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 18, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          I confirm I'm 18+ and agree to the{' '}
          <Link to="/legal/terms" style={{ color: 'var(--violet, #7c5cff)' }}>Terms & Conditions</Link>,{' '}
          <Link to="/legal/user-agreement" style={{ color: 'var(--violet, #7c5cff)' }}>User Agreement</Link>, and{' '}
          <Link to="/legal/refund-policy" style={{ color: 'var(--violet, #7c5cff)' }}>Refund Policy</Link>.
        </span>
      </label>

      {error && (
        <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
          {error}
        </p>
      )}

      <button className="btn-primary" onClick={startMatchmaking} disabled={paying}>
        {paying ? 'Processing payment…' : `Pay ₹${config.entryFeeRupees} & Find Opponent`}
      </button>
      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
        Secure payment via Razorpay. No cash prize is paid to the winner and no money can be
        withdrawn on this platform.
      </p>
    </div>
  )
}
