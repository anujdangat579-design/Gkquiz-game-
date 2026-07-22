import { useState } from 'react'
import {
  requestPhoneOtp,
  confirmPhoneOtp,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signInWithGoogle,
} from '../firebase'

const TABS = [
  { id: 'phone', label: 'Phone OTP' },
  { id: 'email', label: 'Email' },
  { id: 'google', label: 'Google' },
]

function friendlyError(err) {
  const code = err?.code || ''
  const map = {
    'auth/invalid-phone-number': 'That phone number doesn\u2019t look right. Use the format +91XXXXXXXXXX.',
    'auth/invalid-verification-code': 'That OTP is incorrect. Please check and try again.',
    'auth/code-expired': 'That OTP has expired. Request a new one.',
    'auth/too-many-requests': 'Too many attempts. Please wait a bit and try again.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found with that email. Try "Create account" instead.',
    'auth/email-already-in-use': 'An account already exists with that email — try logging in instead.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before completing.',
    'auth/invalid-email': 'That email address doesn\u2019t look right.',
  }
  return map[code] || err?.message || 'Something went wrong. Please try again.'
}

export default function Login({ isGuestUpgrade, onAuthResult }) {
  const [tab, setTab] = useState('phone')
  const [ageConfirmed, setAgeConfirmed] = useState(false)

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <p className="eyebrow">GK QUIZ GAME</p>
        <h1 className="display" style={{ fontSize: 24, margin: '4px 0 8px' }}>Sign in to continue</h1>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {isGuestUpgrade
            ? 'Sign in to save your current progress permanently to this account.'
            : 'Real login keeps your stats, matches, and payment history tied to your account across devices.'}
        </p>
      </div>

      <label
        className="card"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          marginBottom: 18,
          cursor: 'pointer',
          borderColor: ageConfirmed ? 'var(--accent)' : 'var(--border)',
        }}
      >
        <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
        <span style={{ fontSize: 12, lineHeight: 1.5 }}>
          I confirm I am 18 years of age or older, as required to create an account and access
          paid quiz competitions on this platform.
        </span>
      </label>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {!ageConfirmed && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
          Please confirm your age above to continue.
        </p>
      )}

      {tab === 'phone' && <PhoneLogin onAuthResult={onAuthResult} disabled={!ageConfirmed} />}
      {tab === 'email' && <EmailLogin onAuthResult={onAuthResult} disabled={!ageConfirmed} />}
      {tab === 'google' && <GoogleLogin onAuthResult={onAuthResult} disabled={!ageConfirmed} />}

      {/* Invisible reCAPTCHA anchor for Phone Auth — must exist in the DOM
          before requestPhoneOtp() is called. */}
      <div id="recaptcha-container" />

      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>
        By continuing you agree to our{' '}
        <a href="/legal/terms" style={{ color: 'var(--violet, #7c5cff)' }}>Terms</a> and{' '}
        <a href="/legal/privacy" style={{ color: 'var(--violet, #7c5cff)' }}>Privacy Policy</a>.
      </p>
    </div>
  )
}

function PhoneLogin({ onAuthResult, disabled }) {
  const [phone, setPhone] = useState('+91')
  const [otp, setOtp] = useState('')
  const [verificationId, setVerificationId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function sendOtp() {
    setError(null)
    if (!/^\+\d{10,15}$/.test(phone)) {
      setError('Enter your number with country code, e.g. +919876543210.')
      return
    }
    setBusy(true)
    try {
      const result = await requestPhoneOtp(phone, 'recaptcha-container')
      setVerificationId(result.verificationId)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp() {
    setError(null)
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit code sent to your phone.')
      return
    }
    setBusy(true)
    try {
      const result = await confirmPhoneOtp(verificationId, otp.trim())
      onAuthResult(result.user)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      {!verificationId ? (
        <>
          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Enter your phone number</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" style={inputStyle} />
          {error && <p style={errStyle}>{error}</p>}
          <button className="btn-primary" style={{ marginTop: 10 }} onClick={sendOtp} disabled={busy || disabled}>
            {busy ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Enter the 6-digit code sent to {phone}</p>
          <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="123456" style={inputStyle} />
          {error && <p style={errStyle}>{error}</p>}
          <button className="btn-primary" style={{ marginTop: 10 }} onClick={verifyOtp} disabled={busy || disabled}>
            {busy ? 'Verifying…' : 'Verify & Continue'}
          </button>
          <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => { setVerificationId(null); setOtp(''); setError(null) }}>
            Use a different number
          </button>
        </>
      )}
    </div>
  )
}

function EmailLogin({ onAuthResult, disabled }) {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [resetMsg, setResetMsg] = useState(null)

  async function submit() {
    setError(null)
    setResetMsg(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      const result = mode === 'login' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password)
      onAuthResult(result.user)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function forgotPassword() {
    setError(null)
    setResetMsg(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter your email above first, then tap "Forgot password?".')
      return
    }
    try {
      await resetPassword(email)
      setResetMsg('Password reset email sent — check your inbox.')
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`chip ${mode === 'login' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('login')}>
          Log in
        </button>
        <button className={`chip ${mode === 'signup' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('signup')}>
          Create account
        </button>
      </div>

      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle, marginBottom: 8 }} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />

      {error && <p style={errStyle}>{error}</p>}
      {resetMsg && <p style={{ color: 'var(--accent, #2ee6a6)', fontSize: 12, marginTop: 8 }}>{resetMsg}</p>}

      <button className="btn-primary" style={{ marginTop: 10 }} onClick={submit} disabled={busy || disabled}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account & continue'}
      </button>

      {mode === 'login' && (
        <button className="btn-secondary" style={{ marginTop: 8 }} onClick={forgotPassword}>
          Forgot password?
        </button>
      )}
    </div>
  )
}

function GoogleLogin({ onAuthResult, disabled }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function go() {
    setError(null)
    setBusy(true)
    try {
      const result = await signInWithGoogle()
      onAuthResult(result.user)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Continue with your Google account.</p>
      {error && <p style={errStyle}>{error}</p>}
      <button className="btn-primary" onClick={go} disabled={busy || disabled}>
        {busy ? 'Opening Google sign-in…' : 'Continue with Google'}
      </button>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: 14,
}

const errStyle = { color: 'var(--danger, #ff5c5c)', fontSize: 12, marginTop: 8 }
