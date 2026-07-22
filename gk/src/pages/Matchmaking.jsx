import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { joinQueue, leaveQueue, tryFindMatch, watchQueueEntry } from '../lib/matchmaking'

const POLL_MS = 1500

export default function Matchmaking({ user }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('searching') // searching | found
  const [dots, setDots] = useState('')
  const queueIdRef = useRef(null)
  const matchedRef = useRef(false)

  useEffect(() => {
    if (!state) {
      navigate('/setup', { replace: true })
      return
    }

    let unsubQueue = () => {}
    let pollTimer = null
    let cancelled = false

    async function start() {
      const queueId = await joinQueue({
        uid: user.uid,
        username: user.username,
        category: state.category,
        difficulty: state.difficulty,
        questionCount: state.questionCount,
        transactionId: state.transactionId,
      })
      queueIdRef.current = queueId

      unsubQueue = watchQueueEntry(queueId, (data) => {
        if (data.status === 'matched' && data.matchId && !matchedRef.current) {
          matchedRef.current = true
          setPhase('found')
          setTimeout(() => navigate(`/quiz/${data.matchId}`, { replace: true }), 900)
        }
      })

      pollTimer = setInterval(async () => {
        if (cancelled || matchedRef.current) return
        const matchId = await tryFindMatch({
          queueId,
          uid: user.uid,
          category: state.category,
          difficulty: state.difficulty,
          questionCount: state.questionCount,
        })
        if (matchId && !matchedRef.current) {
          matchedRef.current = true
          setPhase('found')
          setTimeout(() => navigate(`/quiz/${matchId}`, { replace: true }), 900)
        }
      }, POLL_MS)
    }

    start()

    return () => {
      cancelled = true
      unsubQueue()
      if (pollTimer) clearInterval(pollTimer)
      if (queueIdRef.current && !matchedRef.current) leaveQueue(queueIdRef.current)
    }
  }, [state])

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 450)
    return () => clearInterval(t)
  }, [])

  if (!state) return null

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: phase === 'searching' ? 'spin 1s linear infinite' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <span className="display" style={{ fontSize: 28 }}>{phase === 'searching' ? 'VS' : '✓'}</span>
      </div>

      <p className="eyebrow" style={{ marginBottom: 6 }}>{state.category} · {state.difficulty}</p>
      <h1 className="display" style={{ fontSize: 22, margin: '0 0 8px' }}>
        {phase === 'searching' ? `Searching for an opponent${dots}` : 'Opponent found!'}
      </h1>
      <p className="muted" style={{ fontSize: 14, maxWidth: 280 }}>
        {phase === 'searching'
          ? `${state.questionCount} questions · ${state.difficulty} difficulty. Hang tight while we pair you.`
          : 'Locking in questions and starting the countdown…'}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
