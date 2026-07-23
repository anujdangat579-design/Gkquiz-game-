import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { watchMatch, submitAnswers, reportTabSwitch, reportSuspiciousActivity } from '../lib/matchmaking'

const QUESTION_SECONDS = 20

export default function QuizRoom({ user }) {
  const { matchId } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [started, setStarted] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS)
  const [finished, setFinished] = useState(false)

  const answersRef = useRef({})
  const questionStartRef = useRef(null)
  const submittedRef = useRef(false)
  const tabSwitchCountRef = useRef(0)
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false)
  const devtoolsCountRef = useRef(0)
  const devtoolsOpenRef = useRef(false)

  useEffect(() => {
    const unsub = watchMatch(matchId, setMatch)
    return unsub
  }, [matchId])

  // Anti-cheating: flag (never block) if the player leaves this tab/window
  // during a live quiz. This is telemetry for admin review only — scoring
  // stays entirely server-side regardless of what this reports.
  useEffect(() => {
    if (finished) return
    function handleVisibilityChange() {
      if (document.hidden && started && !finished) {
        tabSwitchCountRef.current += 1
        reportTabSwitch(matchId, user.uid, tabSwitchCountRef.current)
        setTabSwitchWarning(true)
        setTimeout(() => setTabSwitchWarning(false), 4000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user.uid, started, finished])

  // Anti-cheating heuristic: a large gap between outer/inner window size
  // usually means the DevTools panel got opened. Best-effort only — see
  // reportSuspiciousActivity's doc comment for why real screen-recording
  // detection isn't feasible from a web page.
  useEffect(() => {
    if (finished) return
    const THRESHOLD = 160
    const interval = setInterval(() => {
      const widthGap = window.outerWidth - window.innerWidth
      const heightGap = window.outerHeight - window.innerHeight
      const open = widthGap > THRESHOLD || heightGap > THRESHOLD
      if (open && !devtoolsOpenRef.current && started && !finished) {
        devtoolsOpenRef.current = true
        devtoolsCountRef.current += 1
        reportSuspiciousActivity(matchId, user.uid, devtoolsCountRef.current)
      } else if (!open) {
        devtoolsOpenRef.current = false
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [matchId, user.uid, started, finished])

  // Sync countdown to the shared `startAt` timestamp so both players see the
  // same number regardless of when each client's listener fired.
  useEffect(() => {
    if (!match || started || !match.startAt) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((match.startAt - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining <= 0) {
        setStarted(true)
        questionStartRef.current = Date.now()
      }
    }
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [match, started])

  const questionSet = match?.questionSet || []
  const currentQuestion = questionSet[qIndex]
  const opponent = useMemo(() => {
    if (!match) return null
    return match.playerA.uid === user.uid ? match.playerB : match.playerA
  }, [match, user.uid])

  // Per-question timer
  useEffect(() => {
    if (!started || finished || !currentQuestion) return
    setTimeLeft(QUESTION_SECONDS)
    questionStartRef.current = Date.now()
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t)
          handleNext(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, qIndex, currentQuestion])

  function handleSelect(idx) {
    if (selected !== null) return // no changes after submission
    setSelected(idx)
  }

  function handleNext(overrideIdx) {
    const chosen = overrideIdx !== undefined ? overrideIdx : selected
    const timeTakenMs = Date.now() - questionStartRef.current
    answersRef.current[currentQuestion.id] = { selectedIndex: chosen, timeTakenMs }

    if (qIndex + 1 < questionSet.length) {
      setQIndex((i) => i + 1)
      setSelected(null)
    } else {
      finishQuiz()
    }
  }

  async function finishQuiz() {
    if (submittedRef.current) return
    submittedRef.current = true
    setFinished(true)
    // Just hand over what was clicked and how long it took — never a score.
    // The server (evaluateMatch Cloud Function) is the only thing that ever
    // decides who got what right.
    await submitAnswers(matchId, user.uid, answersRef.current)
    navigate(`/result/${matchId}`, { replace: true })
  }

  if (!match) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading match…</p>
      </div>
    )
  }

  if (match.status === 'pending_questions' || !match.questionSet?.length) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="muted">Preparing your quiz room…</p>
      </div>
    )
  }

  if (match.status === 'cancelled') {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="muted">This match was cancelled. Please try again — no charge for this attempt.</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/setup')}>Back to Setup</button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>{match.category} · {match.difficulty}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <PlayerBubble name={user.username} you />
          <span className="display" style={{ fontSize: 18, color: 'var(--text-muted)' }}>VS</span>
          <PlayerBubble name={opponent?.username || '…'} />
        </div>
        <p className="display" style={{ fontSize: 56, margin: 0 }}>{countdown > 0 ? countdown : 'GO!'}</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Quiz starts for both players at once</p>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="screen">
      {tabSwitchWarning && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--wrong, #ff5c5c)', background: 'rgba(255,92,92,0.08)' }}>
          <p style={{ fontSize: 12, margin: 0, color: 'var(--wrong, #ff5c5c)' }}>
            ⚠ Leaving the quiz screen has been logged for fair-play review.
          </p>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p className="eyebrow">Question {qIndex + 1} of {questionSet.length}</p>
        <TimerBadge seconds={timeLeft} />
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
        {currentQuestion.question}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selected === idx
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className="card"
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                background: isSelected ? 'rgba(45,232,201,0.08)' : 'var(--surface)',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ fontSize: 15 }}>{opt}</span>
            </button>
          )
        })}
      </div>

      <button className="btn-primary" disabled={selected === null} onClick={() => handleNext()}>
        {qIndex + 1 < questionSet.length ? 'Next Question' : 'Submit & Finish'}
      </button>
    </div>
  )
}

function PlayerBubble({ name, you }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: you ? 'linear-gradient(135deg, var(--accent), var(--accent-dim))' : 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          margin: '0 auto 6px',
        }}
      >
        {name.slice(-2).toUpperCase()}
      </div>
      <p style={{ fontSize: 12 }} className="muted">{name}{you ? ' (You)' : ''}</p>
    </div>
  )
}

function TimerBadge({ seconds }) {
  const low = seconds <= 5
  return (
    <span
      className="chip"
      style={{
        borderColor: low ? 'var(--wrong)' : 'var(--border)',
        color: low ? 'var(--wrong)' : 'var(--text-muted)',
      }}
    >
      {seconds}s
    </span>
  )
}
