import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchUserProfile, updateUsername, updateProfilePhoto, BADGE_INFO } from '../lib/userProfile'
import { setDisplayName, signOutUser, auth } from '../firebase'

// Resize/compress to a small square JPEG before it ever touches Firestore
// (see updateProfilePhoto's doc comment for why: no Storage bucket, so this
// has to fit comfortably inside a Firestore document).
function resizeImageFile(file, size = 160) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Profile({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(user.username)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)

  const contact = auth.currentUser?.phoneNumber || auth.currentUser?.email || null

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const dataUrl = await resizeImageFile(file)
      await updateProfilePhoto(user.uid, dataUrl)
    } catch {
      setPhotoError('Could not update photo. Please try a different image.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSignOut() {
    if (!confirm('Sign out of this account?')) return
    setSigningOut(true)
    try {
      await signOutUser()
    } finally {
      setSigningOut(false)
    }
  }

  useEffect(() => {
    const unsub = watchUserProfile(user.uid, setProfile)
    return unsub
  }, [user.uid])

  async function saveName() {
    const trimmed = draftName.trim().slice(0, 20)
    if (!trimmed) return
    setSaving(true)
    await updateUsername(user.uid, trimmed)
    await setDisplayName(trimmed)
    localStorage.setItem('gk_username', trimmed)
    setSaving(false)
    setEditing(false)
    window.location.reload() // keeps App's user state in sync with the new name
  }

  if (!profile) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted">Loading profile…</p>
      </div>
    )
  }

  const accuracy = profile.totalQuestions > 0 ? Math.round((profile.totalCorrect / profile.totalQuestions) * 100) : 0
  const badges = profile.badges || []

  return (
    <div className="screen">
      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <label
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: profile.photoURL ? 'transparent' : 'linear-gradient(135deg, var(--violet), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 22,
            margin: '0 auto 6px',
            position: 'relative',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.username.slice(-2).toUpperCase()
          )}
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}
          >
            {uploadingPhoto ? '…' : '📷'}
          </span>
          <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} style={{ display: 'none' }} />
        </label>
        {photoError && <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 11, marginBottom: 6 }}>{photoError}</p>}

        {editing ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={20}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: 15,
                textAlign: 'center',
              }}
            />
            <button className="chip active" onClick={saveName} disabled={saving}>{saving ? '…' : 'Save'}</button>
          </div>
        ) : (
          <h1 className="display" style={{ fontSize: 22, margin: 0 }} onClick={() => setEditing(true)}>
            {profile.username} <span style={{ fontSize: 13 }} className="muted">✏️</span>
          </h1>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <StatCard label="Total Competitions" value={profile.totalMatches} />
        <StatCard label="Wins" value={profile.wins} />
        <StatCard label="Losses" value={profile.losses} />
        <StatCard label="Draws" value={profile.draws} />
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Best Score" value={profile.bestScore} />
        <StatCard label="Current Streak" value={profile.currentStreak} />
        <StatCard label="Longest Streak" value={profile.longestStreak} />
      </div>

      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Badges</p>
      {badges.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ fontSize: 13 }}>No badges yet — win your first match to earn one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {badges.map((id) => (
            <div key={id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 18 }}>{BADGE_INFO[id]?.icon || '🏆'}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{BADGE_INFO[id]?.label || id}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        {contact && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Signed in as {contact}</p>
        )}
        <button className="btn-secondary" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p className="display" style={{ fontSize: 20, margin: 0 }}>{value}</p>
      <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}
