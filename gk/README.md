# GK Quiz Game — v2 (Core 1v1 Flow + Real Payments)

Paid 1v1 GK quiz competition app. This build covers **Razorpay payment → matchmaking → live
synced quiz → scoring → result**, backed by Firebase Firestore + Cloud Functions. The ₹10
access fee is now charged for real through Razorpay Checkout, verified server-side, and
required before a player can enter matchmaking.

## What's in this build

- Real login (Phone OTP, Email+Password, or Google) — see the setup section below. Existing
  anonymous/guest sessions are auto-linked to the new credential so their stats carry over.
- Category / difficulty / question-count picker
- Real-time matchmaking via Firestore — no Cloud Functions needed, matching happens client-side
  inside a Firestore transaction so two players can't be paired twice
- Synced countdown (`startAt` timestamp) so both players' quizzes begin at the same instant
- Per-question timer, single-answer lock, auto-submit on timeout
- Server-recorded scores in the `matches` document (each player can only write their own score key)
- Tie-breaker: score → accuracy → speed → draw (no randomness)
- Result screen with non-monetary Winner recognition copy only
- User profiles: wins/losses/draws, accuracy, best score, win streaks, badges
  (first win, 5/10 wins, 3/5-win streak, sharp shooter) — stored in `users/{uid}`,
  updated idempotently per match so refreshes can't double-count
- Editable display name from the Profile screen
- Leaderboard ranked by wins, tie-broken by accuracy then matches played —
  never by money
- **Real Razorpay payment for the ₹10 access fee**:
  - `functions/index.js` — `createOrder` creates a Razorpay order and a `transactions` doc
    server-side (amount is fixed server-side, never trusts the client)
  - `verifyPayment` verifies the payment signature with HMAC-SHA256 before marking the
    transaction `paid`
  - `razorpayWebhook` catches payments that succeeded but whose client never called back
    (app closed mid-payment, dropped connection)
  - Firestore rules require a matching `transactions/{id}` doc with `status == 'paid'` and
    the same `userId` before a `queue` entry can even be created — so nobody can skip
    payment by calling `joinQueue` directly from devtools
  - Transaction history lives in `transactions/{orderId}` with statuses
    `created` → `paid` / `failed`; no wallet or withdrawable balance is ever created
- **Transaction History screen** (`/transactions`, linked from Home): live list of past
  payments with status, tap-to-expand receipt (transaction/order/payment IDs, amount,
  purpose). Needs the composite index in `firestore.indexes.json` — deploy with
  `firebase deploy --only firestore:indexes`, or just run the app once and click the
  auto-generated index link Firebase prints in the browser console the first time the
  query runs
- **Refund handling for technical failures**:
  - Any paid transaction can be reported from Transaction History → "Report a technical
    issue" — creates a `pending` doc in `refundRequests`, never refunds automatically
  - `adminApproveRefund` (Cloud Function, admin-only) calls Razorpay's Refunds API and
    flips the transaction to `refunded`; `adminRejectRefund` closes it out with a note
  - Every request/approval/rejection is written to `auditLogs` — no refund can happen
    without a paper trail
  - Admin access is a Firebase custom claim (`admin: true`), not a Firestore field, so it
    can't be spoofed from the client. Bootstrap your first admin with `bootstrapFirstAdmin`
    (set the `ADMIN_BOOTSTRAP_KEY` secret, then call it once from the browser console while
    signed into the app — see the comment above that function in `functions/index.js`).
    There's no Admin Panel UI to approve refunds yet — that's next.
- **Admin Panel** (`/admin`, linked quietly at the bottom of Home):
  - Gated by a Firebase Auth custom claim (`admin: true`) — checked client-side by
    `AdminGate.jsx` and enforced server-side by `firestore.rules`, so it can't be bypassed
    by guessing the URL
  - **Dashboard** — total/active/blocked users, total/completed/active matches, successful/
    failed payments, pending refund requests (uses Firestore's `getCountFromServer`
    aggregation queries, no Cloud Function needed)
  - **Question Bank** — add/edit/disable/delete questions in a new Firestore `questions`
    collection, filterable by category + difficulty. **Not yet wired into live matches** —
    see the note below
  - **Users** — search by username/uid, block/unblock. A blocked user's `blocked: true`
    field is enforced in `firestore.rules` so blocking actually stops them from joining
    matchmaking, not just a cosmetic flag
  - **Matches** — recent/live matches with players, category, status; cancel a stuck match
    (sets `status: 'cancelled'`)
  - **Refunds** — approve (calls `adminApproveRefund`, which actually issues the Razorpay
    refund) or reject each pending `refundRequests` doc
  - **Audit Log** — every refund action and admin bootstrap event, admin-read-only

## What's new: server-side scoring, live question bank, secure delivery

These three were built together because they're one security fix:

- **Live matches now read only from the Firestore `questions` collection** (the Admin Panel's
  bank), not the old bundled `src/data/questionBank.js`. Use **Admin → Question Bank → "Seed
  starter questions"** to push in the ~30 built-in GK questions, or add your own — either way,
  keep enough active questions per category+difficulty to cover your question-count options
  (10/20/30), or a match will get auto-cancelled for "insufficient_questions".
- **`questions` is now admin-only readable.** No signed-in player can read `correctIndex` or
  `explanation` off that collection anymore — that was a real hole before (any client could
  read the whole doc straight out of Firestore).
- **Question assignment moved server-side**: a new `assignQuestions` Cloud Function (Firestore
  trigger on match creation) picks the real question set the instant a match is created, and
  writes only `{id, category, difficulty, question, options}` into the match doc — never
  `correctIndex`/`explanation`. Matches sit in a brief `pending_questions` status until this
  fires (usually instant).
- **Score verification moved server-side**: `QuizRoom` now submits only raw answers
  (`selectedIndex` + `timeTakenMs` per question, nothing graded) to `rawAnswers.{uid}`. A new
  `evaluateMatch` Cloud Function fires once both players' raw answers are in, grades both
  against the real `questions` docs (Admin SDK, never exposed to any client), applies the same
  no-randomness tie-break (score → accuracy → speed → draw), and writes the authoritative
  `scores` / `winner` / `status: 'completed'` itself, inside a transaction so it can't double-run.
  A player literally cannot write `scores`, `winner`, `status`, or `questionSet` from the
  client anymore — `firestore.rules` only allows a client to add its own `rawAnswers` key, once,
  without touching the opponent's entry.

## What's NOT in this build yet (next passes)

- Practice mode, score report download/share, question-wise answer review
- Anti-cheat (device/session monitoring, screen-recording detection) beyond tab-switch counts
- Dark/light mode toggle

## Setup

1. **Create a Firebase project** at https://console.firebase.google.com
2. Enable **Firestore Database** (production mode) and **Authentication → Anonymous** sign-in
3. In Project Settings → General → "Your apps", add a Web app and copy the config
4. Paste that config into `src/firebase.js`, replacing the `YOUR_...` placeholders
5. Deploy the rules in `firestore.rules` via the Firebase Console → Firestore → Rules tab
   (paste and publish — no CLI needed)

## What's new in this build: receipts, legal pages, competition config, certificates, CSV import, real login

- **PDF payment receipts** — Transaction History → expand a payment → "Download Receipt (PDF)"
  (`src/lib/receipt.js`, client-side via `jspdf`). Edit `BUSINESS_INFO` in that file with your
  real registered business details before launch.
- **Legal pages** — Terms & Conditions, Privacy Policy, Refund Policy, User Agreement at
  `/legal/terms`, `/legal/privacy`, `/legal/refund-policy`, `/legal/user-agreement`
  (`src/pages/legal/`). Linked from the Home footer and required (checkbox) before paying on
  the quiz setup screen. **Every `[bracketed placeholder]` in `src/pages/legal/legalContent.js`
  and `receipt.js`'s `BUSINESS_INFO` needs your real details, and the pages should be reviewed
  by a qualified Indian lawyer before commercial launch** — same note as below.
- **Admin Competition Config** (`/admin/config`) — set the entry fee, question-count options,
  and enabled categories/difficulties from the Admin Panel, no redeploy needed. The
  `createOrder` Cloud Function reads `config/competition` server-side for the fee actually
  charged (falls back to ₹10 / 10-20-30 if that doc doesn't exist yet).
- **Digital certificates** — on the Result screen, "Download Certificate" generates a
  landscape PDF (Achievement for winners, Participation otherwise) via `src/lib/certificate.js`.
  Explicitly non-monetary — same "no cash prize" language as the rest of the app.
- **Bulk question CSV import** — Admin → Questions → "Bulk import from CSV". Columns:
  `category,difficulty,question,optionA,optionB,optionC,optionD,correctAnswer,explanation`
  (`correctAnswer` is A–D or 1–4). Download the template button for a starter file. Bad rows
  are listed with the specific error instead of failing the whole file.
- **Real login (Phone OTP / Email+Password / Google)** replaces the old "everyone is anonymous"
  v1 flow — see the dedicated setup section below.

### Setting up real login (Phone / Email / Google)

1. In the Firebase Console → **Authentication → Sign-in method**, enable **Phone**,
   **Email/Password**, and **Google** (leave **Anonymous** enabled too, at least at first — see
   the migration note below).
2. **Phone**: add any test phone numbers you want for development under "Phone numbers for
   testing" (skips real SMS/reCAPTCHA while you're building). For production, Phone Auth needs
   the **Blaze plan** once you're past the free SMS quota, and your app's domain added under
   **Authentication → Settings → Authorized domains**.
3. **Google**: under **Authentication → Sign-in method → Google**, set a support email. Add
   every domain you'll serve the app from (including `localhost` for local dev, which Firebase
   adds by default) to **Authorized domains**.
4. **Email/Password**: no extra config needed. Consider enabling "Email enumeration protection"
   in the same settings page once you're live.
5. Nothing in `firestore.rules` needs to change for this — every rule already keys off
   `request.auth.uid`, which stays the same before/after a real login (see the migration note).

**Migration note — existing anonymous (guest) sessions:** `src/firebase.js` links a real
credential onto the *existing* anonymous user instead of creating a new one whenever possible,
so uid — and therefore `users/{uid}` stats, match history, and badges — carries over instead of
resetting to zero the first time someone actually logs in. If the phone/email/Google account
they're linking already belongs to a different real account, it signs into that one instead.
Once you're confident all your real users have migrated, you can disable the Anonymous provider.



Cloud Functions require the **Blaze (pay-as-you-go) plan** (still free at this scale — you
only pay for what you use beyond a generous free tier) and the Firebase CLI, so this part
needs a computer, not just the console.

1. Create a Razorpay account at https://dashboard.razorpay.com and get your **Key ID** and
   **Key Secret** (Settings → API Keys). Start in **Test Mode** first.
2. Install the Firebase CLI (`npm install -g firebase-tools`), then `firebase login` and
   `firebase init functions` inside this project (choose the existing `functions/` folder,
   JavaScript, don't overwrite `index.js`)
3. Set your secrets so they're never committed to git:
   ```
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
   ```
4. `cd functions && npm install`
5. `firebase deploy --only functions`
6. In the Razorpay Dashboard → Webhooks, add a webhook pointing at the deployed
   `razorpayWebhook` function URL, subscribe to the `payment.captured` event, and set the
   webhook secret to the same value you stored above
7. Re-deploy `firestore.rules` (it now also protects `transactions` and requires a paid
   transaction before `queue` writes)
8. Switch Razorpay from Test Mode to Live Mode (and swap the live keys into the same
   secrets) once you're ready to accept real payments — and see the compliance note below
   first

## Deploying from mobile (GitHub → Vercel)

1. Push this folder to a new GitHub repo (upload via the GitHub mobile app or github.com's
   "Add file → Upload files" in a browser)
2. On vercel.com, import the repo — it auto-detects Vite, no config needed
3. Every push to `main` auto-deploys

## Testing the 1v1 flow solo

Open the deployed URL in two different browser profiles/incognito windows (or one browser + one
phone) and log into two *different* accounts (e.g. two Phone Auth test numbers, or two Google
accounts) — each gets its own uid, so they'll match each other in the queue if you pick the same
category, difficulty, and question count on both.

## Where to go next

- Wire matchmaking to pull from the Firestore `questions` collection instead of the static
  bundle, so questions added in the Admin Panel actually show up in live matches
- Add a Practice Mode screen reusing `QuizRoom`'s question/timer UI in single-player mode
- Move score computation server-side (Cloud Function triggered on `answers` write) once real
  money is involved — client-computed scores are fine for a free MVP, not for a paid one
- Have this reviewed by a qualified Indian lawyer before commercial launch, per the original
  product brief's compliance section
