# Kaizen — Cash-Flow & Product-Readiness Hardening

What changed in the product-readiness wave (after the 38-finding diligence
audit). This wave came from a fresh, end-user- and revenue-focused deep dive:
three parallel read-only agents traced the money path, the product loop, and
test/operational reality, and every fix below closes a concrete way the product
lost data, leaked data, dead-ended, or moved money incorrectly.

See [`TEST_PLAN.md`](TEST_PLAN.md) for the red→green checklist that verifies each
of these, and [`GO_LIVE.md`](GO_LIVE.md) for deploy steps (migration 0010,
`CRON_SECRET`, Upstash, Stripe).

## Pricing & the free tier

- **AI Student $19.99/mo**, **Study Circle $59.99/mo** (up to 4). Display + config
  only — Stripe Price IDs stay env-driven (`STRIPE_PRICE_STUDENT/FAMILY`).
- **Free tier: 40 lessons/day** (was 30), reframed as guided lessons.
- **Teach mode** (the core free-tier idea): each tutor reply can be a
  self-contained micro-lesson — explanation + worked example + one
  check-for-understanding — so a limited daily budget actually teaches. "Teach
  me" is the default with a "Socratic" toggle. The tutor is now also told the
  student's real mastery for the concept (from the spaced-repetition record) so
  it pitches to their level.

## Money path (the cash-flow spine)

- **Reconciliation, not just webhooks.** `web/lib/server/billing.js` is the one
  place billing state is applied; `POST /api/billing/reconcile` verifies against
  Stripe on the billing + booking return screens. A slow or missing webhook can
  no longer leave a paying customer un-upgraded or a paid session stuck.
- **No paid-but-lost session.** `releaseAbandoned` checks Stripe before
  cancelling a hold — a paid session is fulfilled (or refunded), never dropped.
- **Fail closed.** With Stripe unconfigured, a paid booking is refused (503)
  instead of booking a real tutor for $0 and accruing payout liability.
- **Trial on conversion.** The 90-day trial is recorded when the subscription
  becomes `trialing`, not at checkout creation — abandoning checkout no longer
  burns the customer's free trial.
- **Funnel reaches checkout.** Pricing CTAs go to checkout (plan carried through
  login/verify); the public-profile "Book a session" deep-link now opens the
  booking modal instead of dead-ending.

## Supply side (tutors get paid, accurately)

- **Auto-complete + accrual.** The cron completes `in_progress` sessions past
  their end and accrues the tutor's 89% (paid sessions only; no-shows left for
  manual handling), so earnings don't sit un-payable when a tutor forgets to
  click Complete.
- **Honest tutor ledger.** `/tutor` reads the real `tutor_earnings` table
  (awaiting-payout vs paid out) via `/api/tutor/earnings`, not a client guess.
- **Abuse gates.** `/api/tutoring/room` refuses unpaid sessions (402); the free
  intro is gated by a hashed-email redemption (migration 0010) so it can't be
  farmed by delete-and-resignup.

## Data safety

- **No shared-device leak.** Logout clears local learning data; a device-owner
  stamp gates the demo→account migration so one person's courses/chats can never
  land in the next account on a shared browser.
- **No lost work.** Pending cloud writes flush on unload/visibility and before
  full-page navigation; exiting a tutor chat by any path (including the mobile
  back gesture) persists the conversation.

## Product quality & honesty

- **Onboarding never dead-ends** on the AI: manual "add a class" + "Skip for now".
- **Internal tools** (Engine Room debug overlay, Reset device) no longer ship to
  end users (dev-gated).
- **Resilient voice:** a flaky request no longer kills the hands-free loop (the
  tutor speaks a recovery line, which re-arms the mic); server-config errors are
  replaced with student-friendly copy; error bubbles aren't replayed as context.
- **Honest copy:** dropped "LMS sync coming soon"; the pricing card describes the
  card being added at checkout, not at account signup.

## Operational durability

- Scheduled work (release / auto-complete / reminders / retention purge) runs on
  the cron, off the request hot path; the retention purge deletes in bounded
  batches and reminder emails are awaited.
- The public tutor directory is IP rate-limited and its queries bounded;
  `admin/stats` is bounded.
- Server-side error monitoring actually fires now (it used to no-op off the
  browser), and subscription start/cancel send a Kaizen email (Stripe still
  handles receipts/dunning).

## Operator checklist (this wave)

1. Run migration `0010_product_hardening.sql` in Supabase (intro anti-farming).
2. Confirm the Stripe webhook is registered AND rely on reconcile as the backstop
   — the two together mean a missed webhook self-heals on the user's next visit.
3. Add the `invoice.payment_failed` event to the webhook subscription if you want
   the past-due banner (the code already handles it).
4. `CRON_SECRET` must be set for auto-complete/reminders/retention to run.
