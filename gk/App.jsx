import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { watchAuthState, setDisplayName } from './firebase'
import { ensureUserDoc } from './lib/userProfile'
import { registerDevice } from './lib/device'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import QuizSetup from './pages/QuizSetup.jsx'
import PracticeSetup from './pages/PracticeSetup.jsx'
import PracticeQuiz from './pages/PracticeQuiz.jsx'
import Matchmaking from './pages/Matchmaking.jsx'
import QuizRoom from './pages/QuizRoom.jsx'
import Result from './pages/Result.jsx'
import ScoreReport from './pages/ScoreReport.jsx'
import Profile from './pages/Profile.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Transactions from './pages/Transactions.jsx'
import QuizHistory from './pages/QuizHistory.jsx'
import AdminGate from './admin/AdminGate.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import AdminQuestions from './admin/AdminQuestions.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminMatches from './admin/AdminMatches.jsx'
import AdminRefunds from './admin/AdminRefunds.jsx'
import AdminAudit from './admin/AdminAudit.jsx'
import AdminConfig from './admin/AdminConfig.jsx'
import AdminDevices from './admin/AdminDevices.jsx'
import Terms from './pages/legal/Terms.jsx'
import Privacy from './pages/legal/Privacy.jsx'
import Refund from './pages/legal/Refund.jsx'
import UserAgreement from './pages/legal/UserAgreement.jsx'

export default function App() {
  // 'loading' | 'login' | 'ready'
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [guestFbUser, setGuestFbUser] = useState(null) // anonymous session, if any, offered an upgrade path

  // Finalizes a REAL (non-anonymous) Firebase Auth user into the app's own
  // `user` shape and flips the app into 'ready'. Passed directly to
  // <Login/> too, since linking an anonymous account doesn't reliably
  // re-fire onAuthStateChanged — this way both the listener below and a
  // just-completed login/link call the same finishing logic.
  async function finalizeUser(fbUser) {
    let name = fbUser.displayName || localStorage.getItem('gk_username')
    if (!name) {
      name = `Player${fbUser.uid.slice(0, 4).toUpperCase()}`
      localStorage.setItem('gk_username', name)
    }
    if (fbUser.displayName !== name) await setDisplayName(name)
    await ensureUserDoc(fbUser.uid, name)
    registerDevice(fbUser.uid) // best-effort, not awaited — never blocks login
    setUser({ uid: fbUser.uid, username: name })
    setStatus('ready')
  }

  useEffect(() => {
    const unsub = watchAuthState((fbUser) => {
      if (!fbUser) {
        setGuestFbUser(null)
        setStatus('login')
        return
      }
      if (fbUser.isAnonymous) {
        // Old v1 sessions, or someone who bailed out of login mid-way —
        // keep the reference so Login can offer to upgrade this account
        // (preserving uid, and therefore stats) instead of starting fresh.
        setGuestFbUser(fbUser)
        setStatus('login')
        return
      }
      finalizeUser(fbUser)
    })
    return unsub
  }, [])

  if (status === 'loading') {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading GK Quiz Game…</p>
      </div>
    )
  }

  if (status === 'login') {
    return <Login isGuestUpgrade={!!guestFbUser} onAuthResult={finalizeUser} />
  }

  return (
    <Routes>
      <Route path="/" element={<Home user={user} />} />
      <Route path="/setup" element={<QuizSetup user={user} />} />
      <Route path="/practice" element={<PracticeSetup />} />
      <Route path="/practice/quiz" element={<PracticeQuiz />} />
      <Route path="/matchmaking" element={<Matchmaking user={user} />} />
      <Route path="/quiz/:matchId" element={<QuizRoom user={user} />} />
      <Route path="/result/:matchId" element={<Result user={user} />} />
      <Route path="/report/:matchId" element={<ScoreReport user={user} />} />
      <Route path="/profile" element={<Profile user={user} />} />
      <Route path="/leaderboard" element={<Leaderboard user={user} />} />
      <Route path="/transactions" element={<Transactions user={user} />} />
      <Route path="/history" element={<QuizHistory user={user} />} />

      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route path="/legal/refund-policy" element={<Refund />} />
      <Route path="/legal/user-agreement" element={<UserAgreement />} />

      <Route path="/admin" element={<AdminGate />}>
        <Route index element={<AdminDashboard />} />
        <Route path="questions" element={<AdminQuestions />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="matches" element={<AdminMatches />} />
        <Route path="refunds" element={<AdminRefunds />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="config" element={<AdminConfig />} />
        <Route path="devices" element={<AdminDevices />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
