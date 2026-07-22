import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const createOrderFn = httpsCallable(functions, 'createOrder')
const verifyPaymentFn = httpsCallable(functions, 'verifyPayment')

let scriptPromise = null

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout script.'))
    document.body.appendChild(script)
  })
  return scriptPromise
}

/**
 * Runs the full ₹10 quiz-access payment flow:
 * 1. Ask the Cloud Function to create a Razorpay order (server decides amount).
 * 2. Open Razorpay Checkout for the user to pay.
 * 3. Send the payment result back to the Cloud Function for signature verification.
 *
 * Resolves with { transactionId } once payment is verified server-side.
 * Rejects (or the returned promise never resolves) if the user cancels/fails.
 */
export async function payQuizAccessFee({ user, category, difficulty, questionCount }) {
  await loadRazorpayScript()

  const { data: order } = await createOrderFn({ category, difficulty, questionCount })

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'GK Quiz Game',
      description: 'Quiz Competition Access & Educational Assessment Fee',
      prefill: { name: user.username },
      theme: { color: '#7c5cff' },
      handler: async (response) => {
        try {
          const { data } = await verifyPaymentFn({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          resolve({ transactionId: data.transactionId })
        } catch (err) {
          reject(err)
        }
      },
      modal: {
        ondismiss: () => reject(new Error('cancelled')),
      },
    })
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'Payment failed'))
    })
    rzp.open()
  })
}
