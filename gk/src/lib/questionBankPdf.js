import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'

const COLLECTION = 'questionBankPdfs'

// The 10 category PDFs shown on the Home page. `id` is used as the Firestore
// doc id / Storage filename — keep it stable even if `label` wording changes.
export const PDF_CATEGORIES = [
  { id: 'general-knowledge', label: 'General Knowledge' },
  { id: 'current-affairs', label: 'Current Affairs' },
  { id: 'history', label: 'History' },
  { id: 'geography', label: 'Geography' },
  { id: 'science', label: 'Science' },
  { id: 'indian-polity', label: 'Indian Polity' },
  { id: 'technology', label: 'Technology' },
  { id: 'ssc-gk', label: 'SSC GK' },
  { id: 'mpsc-upsc-gk', label: 'MPSC & UPSC GK' },
  { id: 'banking-mixed-gk', label: 'Banking & Mixed GK' },
]

// Live list of whatever PDFs admins have uploaded so far, keyed by category id.
export function watchQuestionBankPdfs(callback) {
  return onSnapshot(collection(db, COLLECTION), (snap) => {
    const byId = {}
    snap.docs.forEach((d) => { byId[d.id] = d.data() })
    callback(byId)
  })
}

// Admin-only in practice (Storage + Firestore rules reject non-admins) —
// swap out a category's PDF, e.g. updating "Current Affairs" weekly.
export async function uploadQuestionBankPdf(categoryId, file) {
  if (file.type !== 'application/pdf') throw new Error('Please choose a PDF file.')
  const path = `question-bank-pdfs/${categoryId}.pdf`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' })
  const url = await getDownloadURL(storageRef)
  await setDoc(doc(db, COLLECTION, categoryId), {
    pdfUrl: url,
    fileName: file.name,
    sizeBytes: file.size,
    updatedAt: serverTimestamp(),
  })
  return url
}
