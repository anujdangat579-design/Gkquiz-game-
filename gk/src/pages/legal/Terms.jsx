import LegalPage, { Section } from './LegalPage.jsx'
import { BIZ } from './legalContent'

export default function Terms() {
  return (
    <LegalPage title="Terms & Conditions" updated={BIZ.effectiveDate}>
      <Section>
        These Terms & Conditions ("Terms") govern your use of {BIZ.appName} (the "App"),
        operated by {BIZ.legalName} ({BIZ.entityType}), {BIZ.address} ("we", "us", "our").
        By creating an account or paying the quiz access fee, you agree to these Terms.
      </Section>

      <Section heading="1. Eligibility">
        You must be at least 18 years old, and legally permitted to participate in skill-based
        online contests in your state of residence, to use the paid features of the App. We may
        ask for age confirmation at signup and may suspend accounts we reasonably believe belong
        to a minor.
      </Section>

      <Section heading="2. Nature of the App — a game of skill">
        {BIZ.appName} is a general-knowledge quiz competition. Outcomes are determined entirely
        by a player's knowledge, accuracy, and speed in answering questions — never by chance,
        randomised results, or house-determined odds. There is no cash prize, wagering, betting,
        or withdrawable balance anywhere in this App. The {BIZ.entryFee} fee covers competition
        access and an educational score report only; winning a match earns non-monetary
        recognition (badges, leaderboard position) and nothing else.
      </Section>

      <Section heading="3. Account & fair play">
        You are responsible for keeping your account credentials and device secure. You agree
        not to: use bots, scripts, multiple simultaneous accounts, or any automated means to
        answer questions; collude with an opponent; exploit bugs; or attempt to access the
        question bank or answer key outside of normal gameplay. We use anti-cheat signals
        (e.g. tab-switch detection) for review purposes and may suspend or permanently block
        accounts found to have violated this section, with or without a refund of any pending
        entry fee, at our reasonable discretion.
      </Section>

      <Section heading="4. Payments">
        Entry fees are processed by our payment partner (Cashfree) and are generally
        non-refundable once a match has started, except as described in our{' '}
        <a href="/legal/refund-policy">Refund Policy</a>. We set and may change the entry fee,
        question counts, categories, and other competition parameters at any time; the fee and
        format in effect at the moment you pay is the one that applies to that match.
      </Section>

      <Section heading="5. Content & intellectual property">
        Questions, explanations, branding, and app design are owned by us or our licensors. You
        may not copy, scrape, or redistribute the question bank. Your own gameplay data (answers,
        scores, timing) may be used by us in aggregate or anonymised form to improve the App.
      </Section>

      <Section heading="6. Suspension & termination">
        We may suspend or terminate your account for violating these Terms, suspected fraud,
        chargebacks, or abusive behaviour toward other players or support staff.
      </Section>

      <Section heading="7. Disclaimers & limitation of liability">
        The App is provided "as is". We do not guarantee uninterrupted service, an available
        opponent at all times, or error-free question content. To the maximum extent permitted
        by law, our liability for any claim relating to the App is limited to the amount you
        paid for the specific match giving rise to the claim.
      </Section>

      <Section heading="8. Governing law">
        These Terms are governed by the laws of India, and courts in {BIZ.state} shall have
        exclusive jurisdiction over any dispute, subject to applicable consumer-protection law.
      </Section>

      <Section heading="9. Contact">
        Questions about these Terms: {BIZ.email} · {BIZ.phone}
      </Section>

      <Section>
        <em>
          This page is a starting-point template, not legal advice. Have it reviewed by a
          qualified Indian lawyer — especially the skill-vs-chance and state-eligibility
          sections — before commercial launch.
        </em>
      </Section>
    </LegalPage>
  )
}
