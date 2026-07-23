import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const createOrderFn = httpsCallable(functions, 'createOrder')
const verifyPaymentFn = httpsCallable(functions, 'verifyPayment')

let scriptPromise = null

function loadCashfreeScript() {
  if (window.Cashfree) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Cashfree Checkout script.'))
    document.body.appendChild(script)
  })
  return scriptPromise
}

// 'sandbox' while testing, switch to 'production' for the live app.
const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox'

/**
 * Runs the full ₹10 quiz-access payment flow:
 * 1. Ask the Cloud Function to create a Cashfree order (server decides amount).
 * 2. Open Cashfree Checkout (drop-in modal) for the user to pay.
 * 3. Ask the Cloud Function to confirm the payment status directly with Cashfree.
 *
 * Resolves with { transactionId } once payment is verified server-side.
 * Rejects (with message 'cancelled' or the failure reason) otherwise.
 */
export async function payQuizAccessFee({ user, category, difficulty, questionCount }) {
  await loadCashfreeScript()

  const { data: order } = await createOrderFn({ category, difficulty, questionCount })

  const cashfree = window.Cashfree({ mode: CASHFREE_MODE })

  const result = await cashfree.checkout({
    paymentSessionId: order.paymentSessionId,
    redirectTarget: '_modal',
  })

  if (result?.error) {
    const reason = result.error.message || result.error.reason || 'cancelled'
    throw new Error(reason)
  }

  const { data } = await verifyPaymentFn({ orderId: order.orderId })
  return { transactionId: data.transactionId }
}
