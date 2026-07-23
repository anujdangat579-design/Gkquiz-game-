import { doc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const KEY = 'gk_device_id'

// This is a per-browser identifier, not a hardware fingerprint — clearing
// site data resets it. It's good enough to catch casual multi-accounting
// (same phone/browser, several accounts) without any invasive tracking;
// treat `devices` docs with more than a couple of linkedUids as a signal
// for admin review, not proof on its own.
export function getDeviceId() {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
    localStorage.setItem(KEY, id)
  }
  return id
}

// Called once per sign-in (see App.jsx finalizeUser). Best-effort: never
// blocks the app if the write fails.
export async function registerDevice(uid) {
  try {
    const deviceId = getDeviceId()
    await setDoc(
      doc(db, 'devices', deviceId),
      {
        linkedUids: arrayUnion(uid),
        lastSeenAt: serverTimestamp(),
        userAgent: navigator.userAgent?.slice(0, 200) || null,
      },
      { merge: true }
    )
  } catch {
    // telemetry only
  }
}
