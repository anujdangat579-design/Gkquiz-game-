import LegalPage, { Section } from './LegalPage.jsx'
import { BIZ } from './legalContent'

export default function UserAgreement() {
  return (
    <LegalPage title="User Agreement" updated={BIZ.effectiveDate}>
      <Section>
        This User Agreement supplements our <a href="/legal/terms">Terms & Conditions</a> with
        the specific rules of conduct for playing {BIZ.appName} matches. By joining a match, you
        agree to the following.
      </Section>

      <Section heading="1. One person, one account">
        Each account must belong to a single real person. Creating or using multiple accounts to
        gain a matchmaking or scoring advantage is a violation and may result in a permanent
        block of all associated accounts.
      </Section>

      <Section heading="2. Play fairly">
        Answer questions using only your own knowledge, within the time given. Do not use search
        engines, other apps, another person, or any automated tool during a live match. We
        monitor tab-switch / window-blur events during matches as an anti-cheat signal and may
        review flagged matches manually.
      </Section>

      <Section heading="3. Respectful conduct">
        Usernames, and any future chat or messaging features, must not contain hate speech,
        harassment, impersonation, or content that violates applicable law.
      </Section>

      <Section heading="4. Consequences of violations">
        Depending on severity, we may: void the match result, withhold leaderboard credit,
        temporarily suspend, or permanently block the account(s) involved. Entry fees for a
        voided match are handled per our <a href="/legal/refund-policy">Refund Policy</a>.
      </Section>

      <Section heading="5. No cash prize acknowledgement">
        You acknowledge that winning a match earns non-monetary recognition only (badges,
        leaderboard position, score report) — never a cash prize, wager payout, or withdrawable
        balance.
      </Section>

      <Section heading="6. Changes">
        We may update this Agreement as the App's features evolve (e.g. when new game modes are
        added); continued use after an update means you accept the revised terms.
      </Section>

      <Section heading="7. Contact">
        {BIZ.email} · {BIZ.phone}
      </Section>
    </LegalPage>
  )
}
