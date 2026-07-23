import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore'
import { db } from '../firebase'

const COLLECTION = 'winnerMessages'

// Winner (post-match) sends a message to the admin. One message per match
// per winner — Result.jsx checks watchMyMessages first and only shows the
// compose form if nothing exists yet for that matchId, so this never
// silently creates duplicates from a resubmit/refresh.
export async function sendWinnerMessage({ uid, username, matchId, opponentUsername, message }) {
  const text = (message || '').trim()
  if (!text) throw new Error('Write a message before sending.')
  if (text.length > 1000) throw new Error('Message is too long (max 1000 characters).')
  await addDoc(collection(db, COLLECTION), {
    matchId,
    fromUid: uid,
    fromUsername: username,
    opponentUsername: opponentUsername || null,
    message: text,
    createdAt: serverTimestamp(),
    status: 'unread', // 'unread' | 'replied'
    adminReply: null,
    repliedAt: null,
    readByUser: true, // nothing to read yet — flipped false once admin replies
  })
}

// Every message this user has ever sent, newest first — powers both the
// Inbox page and (filtered to one matchId) the Result screen's "already
// sent" state.
export function watchMyMessages(uid, callback) {
  const q = query(
    collection(db, COLLECTION),
    where('fromUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// Called when the user opens the Inbox — clears the notification badge by
// marking every replied-but-unseen message as read. Rule-enforced: a
// non-admin can only ever touch their own `readByUser` field, never
// `adminReply`/`status`.
export async function markRepliesRead(messages) {
  const toMark = messages.filter((m) => m.status === 'replied' && !m.readByUser)
  await Promise.all(toMark.map((m) => updateDoc(doc(db, COLLECTION, m.id), { readByUser: true })))
}
