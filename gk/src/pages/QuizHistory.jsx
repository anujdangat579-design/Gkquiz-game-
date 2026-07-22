import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMatchHistory } from '../lib/matchmaking'

export default function QuizHistory({ user }) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState(null)

  useEffect(() => {
    fetchMatchHistory(user.uid).then(setMatches)
  }, [user.uid])

  return (
    <div className="screen">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <p className="eyebrow">MY QUIZ HISTORY</p>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 20px' }}>Previous Reports</h1>

      {matches === null && <p className="muted">Loading history…</p>}
      {matches !== null && matches.length === 0 && (
        <p className="muted">No completed quizzes yet. Play a 1v1 match to see your score report here.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {matches?.map((m) => {
          const you = m.playerA.uid === user.uid ? m.playerA : m.playerB
          const opponent = m.playerA.uid === user.uid ? m.playerB : m.playerA
          const yourScore = (m.scores || {})[you.uid]
          const isDraw = m.winner === 'draw'
          const youWon = m.winner === you.uid
          const date = m.completedAt?.toDate?.() ? m.completedAt.toDate().toLocaleDateString() : ''
          return (
            <button
              key={m.id}
              className="card"
              style={{ textAlign: 'left', width: '100%', borderColor: youWon ? 'var(--accent)' : 'var(--border)' }}
              onClick={() => navigate(`/report/${m.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{m.category} · {m.difficulty}</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: youWon ? 'var(--accent)' : isDraw ? 'var(--text-muted)' : 'var(--wrong, #ff5c5c)' }}>
                  {isDraw ? 'DRAW' : youWon ? 'WON' : 'LOST'}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                vs {opponent.username} · Score {yourScore?.score}/{yourScore?.total} · {yourScore?.accuracy}% accuracy
              </p>
              <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>{date}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
