import LegalPage, { Section } from './LegalPage.jsx'
import { BIZ } from './legalContent'

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={BIZ.effectiveDate}>
      <Section>
        This Privacy Policy explains what data {BIZ.appName}, operated by {BIZ.legalName}
        ("we", "us"), collects and how we use it.
      </Section>

      <Section heading="1. What we collect">
        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
          <li>Account data: a display username, and — once login is enabled — your phone
            number, email address, or Google account identifier used to sign in.</li>
          <li>Gameplay data: quiz answers, timing, scores, match history, win/loss record,
            leaderboard stats, and anti-cheat signals (e.g. tab-switch counts during a match).</li>
          <li>Payment data: transaction and order IDs, amount, and status. We do not receive or
            store your card, UPI ID, or bank details — these are handled entirely by our
            payment processor, Cashfree.</li>
          <li>Device/technical data: standard app-usage logs (timestamps, error logs) needed to
            operate and debug the App.</li>
        </ul>
      </Section>

      <Section heading="2. How we use it">
        To operate matchmaking and scoring, verify payments, prevent fraud and cheating, respond
        to support and refund requests, show your stats/leaderboard position, and improve the
        question bank and app quality. We do not sell your personal data.
      </Section>

      <Section heading="3. Who we share it with">
        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
          <li><strong>Cashfree</strong> — processes payments and refunds; receives what's needed
            to complete your transaction.</li>
          <li><strong>Firebase (Google Cloud)</strong> — hosts our database, authentication, and
            server-side functions.</li>
        </ul>
        We may also disclose data if required by law or to investigate suspected fraud or
        platform abuse.
      </Section>

      <Section heading="4. Data retention">
        We retain account and match data for as long as your account is active, plus a
        reasonable period afterward for accounting, dispute, and fraud-prevention purposes.
        Transaction records are retained as required by applicable tax and payment-processor
        regulations.
      </Section>

      <Section heading="5. Your rights">
        You can request a copy of your data, ask us to correct it, or request account deletion
        by contacting {BIZ.email}. We'll action requests within a reasonable time, subject to
        any records we're legally required to keep (e.g. completed payment records).
      </Section>

      <Section heading="6. Children">
        The App is not directed at, and paid features are not available to, anyone under 18.
      </Section>

      <Section heading="7. Changes to this policy">
        We may update this policy from time to time; the "Last updated" date above will reflect
        the most recent change.
      </Section>

      <Section heading="8. Contact">
        {BIZ.email} · {BIZ.phone} · {BIZ.address}
      </Section>

      <Section>
        <em>Template only — review with a qualified professional before launch, particularly
        for DPDP Act (India) compliance once real login/PII collection is enabled.</em>
      </Section>
    </LegalPage>
  )
}
