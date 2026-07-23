import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

// Replace with your Firebase project config (Project Settings -> General -> Your apps)
const firebaseConfig = {
  apiKey: 'AIzaSyCq80nKg7-lbEP_L2NYTiJMkY9WOfEOtc8',
  authDomain: 'gkquiz-game-e48bb.firebaseapp.com',
  projectId: 'gkquiz-game-e48bb',
  storageBucket: 'gkquiz-game-e48bb.firebasestorage.app',
  messagingSenderId: '584683947316',
  appId: '1:584683947316:web:3eb83578ee701316f3d161',
  measurementId: 'G-YJJ3313RX4',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
// Region must match setGlobalOptions in functions/index.js
export const functions = getFunctions(app, 'asia-south1')
export const storage = getStorage(app)

// ---------------------------------------------------------------------------
// Real auth (Phone OTP / Email+Password / Google) replaces the old
// "anonymous auth for everyone" v1 flow. App.jsx now gates on this:
// unauthenticated (or still-anonymous) users see <Login/>; a real sign-in
// unlocks the app.
//
// UPGRADE PATH: if this browser already has an anonymous session from the
// old flow (or a returning guest), we link the new credential onto that
// same anonymous user instead of creating a brand-new one, so uid — and
// therefore match history, stats, and badges in users/{uid} — carries
// over. If the credential turns out to already belong to another real
// account (auth/credential-already-in-use / auth/email-already-in-use), we
// fall back to signing into that existing account instead.
// ---------------------------------------------------------------------------

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback)
}

export function currentUserIsAnonymous() {
  return !!auth.currentUser?.isAnonymous
}

async function linkOrSignInWithCredential(credential) {
  const current = auth.currentUser
  if (current && current.isAnonymous) {
    try {
      return await linkWithCredential(current, credential)
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        // This phone/email/Google account already exists for real —
        // sign into it instead of losing the guest session's fresh data.
        return await signInWithCredential(auth, err.credential || credential)
      }
      throw err
    }
  }
  return await signInWithCredential(auth, credential)
}

// --- Phone OTP -------------------------------------------------------------

let recaptchaVerifier = null

// Call once, right before requesting an OTP, with the id of a container
// div that's mounted in the DOM (see Login.jsx). Reused across attempts in
// the same page load; Firebase resets it internally after each solve.
export function getRecaptchaVerifier(containerId) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
  }
  return recaptchaVerifier
}

// Returns a verificationId; pass it + the OTP the user typed into
// confirmPhoneOtp() below. Kept as two steps (rather than
// signInWithPhoneNumber's built-in confirm()) so the same verificationId
// can drive either a fresh sign-in or an anonymous-account link.
export async function requestPhoneOtp(phoneNumberE164, containerId) {
  const verifier = getRecaptchaVerifier(containerId)
  const provider = new PhoneAuthProvider(auth)
  return await provider.verifyPhoneNumber(phoneNumberE164, verifier)
}

export async function confirmPhoneOtp(verificationId, code) {
  const credential = PhoneAuthProvider.credential(verificationId, code)
  return await linkOrSignInWithCredential(credential)
}

// --- Email + Password --------------------------------------------------

export async function signUpWithEmail(email, password) {
  const current = auth.currentUser
  if (current && current.isAnonymous) {
    const credential = EmailAuthProvider.credential(email, password)
    return await linkOrSignInWithCredential(credential)
  }
  return await createUserWithEmailAndPassword(auth, email, password)
}

export async function signInWithEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email, password)
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

// --- Google --------------------------------------------------------------

const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const current = auth.currentUser
  if (current && current.isAnonymous) {
    try {
      return await linkWithPopup(current, googleProvider)
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use') {
        return await signInWithPopup(auth, googleProvider)
      }
      throw err
    }
  }
  return await signInWithPopup(auth, googleProvider)
}

// --- Shared ----------------------------------------------------------------

export async function setDisplayName(name) {
  if (!auth.currentUser) return
  await updateProfile(auth.currentUser, { displayName: name })
}

export async function signOutUser() {
  await signOut(auth)
}
