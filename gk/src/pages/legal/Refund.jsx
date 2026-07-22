import LegalPage, { Section } from './LegalPage.jsx'
import { BIZ } from './legalContent'

export default function Refund() {
  return (
    <LegalPage title="Refund Policy" updated={BIZ.effectiveDate}>
      <Section>
        The {BIZ.entryFee} quiz access fee pays for competition access and an educational score
        report. Because the match itself is the service, refunds are limited to genuine
        technical failures — not to dissatisfaction with a result, since match outcomes are
        determined purely by player skill.
      </Section>

      <Section heading="1. When you're eligible for a refund">
        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
          <li>You paid the access fee but were never matched with an opponent.</li>
          <li>The match crashed, disconnected, or otherwise failed to complete for reasons on
            our end (not your own connection dropping repeatedly by choice, or intentionally
            leaving a match).</li>
          <li>You were charged more than once for the same match due to a payment-gateway
            error.</li>
        </ul>
      </Section>

      <Section heading="2. When a refund will not be issued">
        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
          <li>You completed the match — regardless of whether you won, lost, or drew.</li>
          <li>You changed your mind after paying but before being matched.</li>
          <li>You were suspended or blocked for violating the Terms & Conditions (e.g. cheating,
            multiple accounts).</li>
        </ul>
      </Section>

      <Section heading="3. How to request one">
        Open <strong>Transaction History</strong> in the App, expand the payment in question, and
        tap <strong>"Report a technical issue"</strong>. Describe what happened. Every request is
        reviewed manually by an admin — nothing is refunded automatically.
      </Section>

      <Section heading="4. Timeline">
        We aim to review refund requests within 3–5 business days. Approved refunds are issued
        back to your original payment method via Razorpay and typically reflect within 5–7
        business days after approval, depending on your bank.
      </Section>

      <Section heading="5. Audit trail">
        Every refund request, approval, and rejection is logged for accountability. If your
        request is rejected, you're welcome to contact {BIZ.email} for the reason.
      </Section>
    </LegalPage>
  )
}
