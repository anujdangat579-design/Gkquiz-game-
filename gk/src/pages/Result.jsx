import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { watchMatch } from '../lib/matchmaking'
import { recordMatchResult } from '../lib/userProfile'
import { downloadCertificate } from '../lib/certificate'
import { sendWinnerMessage, watchMyMessages } from '../lib/winnerMessages'

export default function Result({ user }) {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [myMessages, setMyMessages] = useState(null)
  const statsRecordedRef = useRef(false)

  useEffect(() => {
    const unsub = watchMatch(matchId, setMatch)
    return unsub
  }, [matchId])

  useEffect(() => {
    const unsub = watchMyMessages(user.uid, setMyMessages)
    return unsub
  }, [user.uid])

  // Nothing to compute here anymore — the `evaluateMatch` Cloud Function
  // grades both players against the real answer key and writes
  // `scores` / `winner` / `status: 'completed'` itself once both players'
  // raw answers are in. This screen just watches and displays that.

  // Once the match has a winner, each client records only its own stats —
  // recordMatchResult is idempotent per matchId, so this is safe even if
  // this effect fires more than once (refresh, re-render, etc).
  useEffect(() => {
    if (!match || !match.winner || statsRecordedRef.current) return
    const myScore = (match.scores || {})[user.uid]
    if (!myScore) return
    statsRecordedRef.current = true
    const result = match.winner === 'draw' ? 'draw' : match.winner === user.uid ? 'win' : 'loss'
    recordMatchResult(user.uid, matchId, {
      result,
      correct: myScore.correct,
      total: myScore.total,
      score: myScore.score,
      accuracy: myScore.accuracy,
    })
  }, [match, matchId, user.uid])

  if (!match) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading result…</p>
      </div>
    )
  }

  const you = match.playerA.uid === user.uid ? match.playerA : match.playerB
  const opponent = match.playerA.uid === user.uid ? match.playerB : match.playerA
  const scores = match.scores || {}
  const yourScore = scores[you.uid]
  const oppScore = scores[opponent.uid]
  const youAnswered = !!(match.rawAnswers || {})[you.uid]
  const oppAnswered = !!(match.rawAnswers || {})[opponent.uid]

  if (match.status !== 'completed') {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>{youAnswered ? 'YOU FINISHED' : 'SUBMITTING…'}</p>
        <p className="muted" style={{ fontSize: 14 }}>
          {!oppAnswered
            ? `Waiting for ${opponent.username} to finish…`
            : 'Grading both players and deciding the result…'}
        </p>
      </div>
    )
  }

  const isDraw = match.winner === 'draw'
  const youWon = match.winner === you.uid

  return (
    <div className="screen">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="eyebrow" style={{ color: isDraw ? 'var(--text-muted)' : 'var(--accent)' }}>
          {isDraw ? 'DRAW' : youWon ? '🏆 YOU WON' : 'MATCH COMPLETE'}
        </p>
        <h1 className="display" style={{ fontSize: 24, margin: '4px 0' }}>
          {isDraw ? "It's a tie!" : youWon ? 'Great performance!' : `${opponent.username} won this one`}
        </h1>
      </div>

      <ScoreCard label="You" name={you.username} score={yourScore} highlight={youWon} />
      <div style={{ height: 12 }} />
      <ScoreCard label="Opponent" name={opponent.username} score={oppScore} highlight={!isDraw && !youWon} />

      <div className="card" style={{ marginTop: 20, marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Recognition</p>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {youWon
            ? 'You earned a Winner Badge and leaderboard points. No cash prize is paid — recognition is educational and achievement-based.'
            : isDraw
            ? 'Both players receive Participant status for this tie.'
            : 'You receive Participant status and a full score report to review your weak areas.'}
        </p>
      </div>

      {youWon && (
        <WinnerMessageBox
          user={user}
          matchId={matchId}
          opponentUsername={opponent.username}
          loaded={myMessages !== null}
          existing={myMessages ? myMessages.find((m) => m.matchId === matchId) : null}
        />
      )}

      <button
        className="btn-secondary"
        style={{ marginBottom: 10 }}
        onClick={() =>
          downloadCertificate({
            kind: youWon ? 'winner' : 'participant',
            username: you.username,
            opponentUsername: opponent.username,
            match,
            matchId,
          })
        }
      >
        {youWon ? '🏅 Download Certificate of Achievement' : '📄 Download Certificate of Participation'}
      </button>

      <button className="btn-primary" onClick={() => navigate(`/report/${matchId}`)}>View Detailed Score Report</button>
      <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate('/setup')}>Play Another Match</button>
      <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate('/leaderboard')}>
        View Leaderboard
      </button>
      <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate('/')}>
        Back to Home
      </button>
    </div>
  )
}

function ScoreCard({ label, name, score, highlight }) {
  return (
    <div className="card" style={{ borderColor: highlight ? 'var(--accent)' : 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p className="eyebrow">{label} · {name}</p>
        {highlight && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>WINNER</span>}
      </div>
      <div className="grid-3">
        <Stat label="Score" value={score.score} />
        <Stat label="Correct" value={score.correct} />
        <Stat label="Accuracy" value={`${score.accuracy}%`} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="display" style={{ fontSize: 20, margin: 0 }}>{value}</p>
      <p className="muted" style={{ fontSize: 11, margin: 0 }}>{label}</p>
    </div>
  )
}

function WinnerMessageBox({ user, matchId, opponentUsername, loaded, existing }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  // Still loading myMessages on first render — avoid a flash of the
  // compose form before we know a message already exists for this match.
  if (!loaded) return null

  if (existing) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🏆 Your message to admin</p>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: existing.adminReply ? 10 : 0 }}>
          {existing.message}
        </p>
        {existing.adminReply ? (
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>ADMIN REPLIED</p>
            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{existing.adminReply}</p>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>Sent — waiting for admin to reply.</p>
        )}
      </div>
    )
  }

  async function handleSend() {
    setError(null)
    setSending(true)
    try {
      await sendWinnerMessage({ uid: user.uid, username: user.username, matchId, opponentUsername, message: text })
      setText('')
    } catch (err) {
      setError(err.message || 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🏆 Send a message to admin</p>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Shout-out, a question, anything — the admin will see it and can reply here.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your message…"
        rows={3}
        maxLength={1000}
        style={{
          width: '100%',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '8px 10px',
          color: 'var(--text)',
          fontSize: 13,
          resize: 'vertical',
          marginBottom: 8,
        }}
      />
      {error && <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <button className="btn-primary" onClick={handleSend} disabled={sending || !text.trim()}>
        {sending ? 'Sending…' : 'Send to Admin'}
      </button>
    </div>
  )
}
