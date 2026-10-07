# Launch gap analysis — what a customer/tutor still can't do

Honest inventory after the go-live round (v2 plan integration). Everything a
paying family or working tutor needs on day one EXISTS; this file is the list
of what's deliberately thin, so nobody discovers it as a surprise. Ordered by
how soon it will hurt.

## Closed in this round (for the record)

- Standalone booking: `/schedule`, `/tutors/<slug>`, and `/family` book
  without ever entering the AI dashboard or its onboarding; sign-in returns
  the visitor to where they started.
- `/tutoring` marketplace front door (problem-based, v2 §8).
- v2 repricing: 1:1 $30/$55 retail, $45/$42/$39 member. *(Superseded by the
  2026-08-12 repricing — current prices live only in
  `web/lib/server/clubPricing.js`; this line records what that round shipped.)*
- Hall operations: structured intake at booking, live 🔴🟡🟢 help queue,
  tutor roster with 10s polling, attendance, exit summary + recommendation
  (the enforced escalation ladder). This is v1 of the evidence ledger (§7).
- Group-seat confirmation emails (student + linked parents).
- Student cancel button for upcoming 1:1s.
- Admin Business metrics (§6): seats/tutor-hour, occupancy, first→second
  conversion, member utilization, refunds/no-shows, revenue vs tutor pay.

## Shipped 2026-08-13 (occupancy round)

Branch `claude/workflows-superpowers-fixes-nf36pc`, commit `4d12e2b`. Under
the occupancy model, waitlists and multi-tutor Community staffing turned out
to be **pre-flip requirements**, not "within weeks" items — both now exist,
plus mechanisms this file never listed:

- **Waitlists** (item 2): full rooms stay on the storefront as "Full — join
  the list"; `group_waitlist` is notify-only (no holds), fed by every
  seat-free path (cancel, abandoned-hold release, confirm-or-release).
- **Standing member seats** (un-listed): "same Hall every week" as a real
  object the cron books month-by-month from included visits — guardian gate
  re-checked every run, never an auto-charge. Cross-month edge tracked as
  item 11 below.
- **Confirm-or-release** (un-listed): T-24h group reminder asks for a
  confirm; T-4h releases UNCONFIRMED *included* seats only (visit restored,
  waitlist notified). Paid/free seats are exempt; bookings inside 24h
  auto-confirm.
- **Fullest-first storefront sort** (un-listed): browse orders each day's
  bookable rooms fullest-first (herding); full rooms sort after bookable
  ones; cancellations suggest emptiest-first alternatives.
- **Community staffing cap** (item 5): capacity derives from staffing — 8
  students per cleared staff member, default 16 with a co-tutor
  (`group_session_staff` + series `co_tutor_id`), pending the supervision
  review in REVIEW_QUEUE. Co-tutors get roster access.
- **.ics attachments** (item 6, partial): T-24h reminders (1:1 and group)
  attach calendar files (`web/lib/server/ics.js`); confirmations still don't.

## Closed 2026-08-20 (audit remediation round)

From `docs/reviews/FULL_CODE_REVIEW_2026-08-18.md`. This entry covers the
disclosure/provisioning half of the plan — the half that was invisible from
inside the app, so nothing but a ledger would have caught it:

- **`GO_LIVE.sql` shipped a schema two migrations behind the code** (H14). The
  one-paste bundle stopped at 0029, so a database provisioned the documented
  way had no `independent_block` and no `check_floor_at` — every practice-item
  insert threw and all of 0030's anti-gaming hardening was silently absent.
  0030 and 0031 are now spliced in verbatim, in order, and the header states
  the real range (0022 → 0031).
- **The occupancy claims had no `CLAIMS_MATRIX.md` rows** — a hard-rule-1
  violation. The waitlist promise, confirm-or-release, and standing weekly
  seats now each have a row sourced to the code that implements them.
- **Confirm-or-release was undisclosed.** A forfeiture rule enforced by a cron
  sweep now appears in `/terms` (memberships & billing), with both windows
  interpolated from `lib/server/occupancy.js` — the same constants the sweep
  uses, so the disclosure cannot drift from the enforcement.
- **`/privacy` omitted Sentry** from the processor list although
  `lib/monitoring.js` ships error envelopes (URL, plan, context) to it.
- **`THIRD_PARTY_NOTICES.md` was a month stale** (Anthropic SDK 0.32.1 against
  0.116.0 installed; `motion` missing entirely). Regenerated via
  `npm run notices`. `/licenses` no longer claims the file auto-regenerates,
  and credits the fonts the app actually ships (Bricolage Grotesque,
  Instrument Sans, Spline Sans Mono) instead of two it dropped.
- **College Board marks with no disclaimer.** The landing marquee names SAT and
  AP; the non-affiliation line now sits directly under it.

The code-level items from the same review (the money races, the guardian-gate
bypasses, the price literals) are tracked in that review, not duplicated here.
**Read its status ledger, not its findings** — the findings are written in the
present tense of 2026-08-18 and left that way deliberately; the ledger at the
top says what actually closed, in which commit, and what did not. Four things
belong on this file's radar out of it:

- **A4 is still open and it is a child-safety item.** The remediation froze the
  guardian email once consent is recorded, capped changes and audit-logged
  them — all of which govern *changing* an address. The **first** address, set
  from browser auth metadata at signup, is governed only by a client-side
  check, so a teen with a second inbox (or their own address) can still
  self-consent. That is now **REVIEW_QUEUE item 16** — see "Not code" below.
- **The marketing pages ship blank below the fold if JS fails.** `Reveal.js`
  renders `opacity: 0` in the server HTML and restores it with `whileInView`;
  nine public pages including `/pricing` and `/schedule` wrap their content in
  it. Fails silently with a 200 and a full DOM — no error, nothing in Sentry.
- **The fix pass introduced four blockers of its own**, caught by adversarial
  verification and closed (`a96daec`, `4ebc18a`). One would have made the H3
  rebooking fix impossible to run at all; one would have let a stale Checkout
  link double-charge a re-armed seat.
- **H8 had a third copy.** `docs/GO_LIVE.md` §5 still told operators to create
  Stripe Prices at the retired figures after H8 was called closed. Corrected,
  and the file is now inside `web/test/priceTruth.test.mjs`'s `LIVING_DOCS`.
  Two more docs still quote the retired pre-club lineup in the present tense —
  `docs/PROVISIONING.md` (an operator instruction) and `docs/archive/HANDOFF.md` (as a
  founder-confirmed fact) — and neither is under the guard yet.

## Will hurt within weeks

1. **Recurring 1:1 availability.** Tutors post one-off slots; a weekly
   standing 1:1 means re-posting every week and families can't "book every
   Tuesday". Series exist for group rooms only (and standing *member* seats
   now cover the group side — see above).
2. **Waitlists.** SHIPPED 2026-08-13, branch
   `claude/workflows-superpowers-fixes-nf36pc` — see "Shipped 2026-08-13"
   above. Original gap, kept for the record: a full Hall turned interest
   away with no capture; at 8 seats/room this would have bitten the first
   good week. Re-ranked in hindsight: under the occupancy model this was a
   pre-flip requirement, not a week-two nice-to-have.
3. **Tutor payouts are manual** (accrued ledger → CSV → whatever you pay
   with). Fine at 5–8 tutors; Stripe Connect (or Gusto contractor payroll)
   before ~15. W-9 collection is also manual — needed before any tutor
   crosses $600/yr (1099-NEC).
4. **No SMS reminders — DEFERRED deliberately.** Email-only; teen no-show
   rates will show it. Texting minors implicates TCPA consent: counsel
   sign-off plus consent capture must land before any SMS vendor is wired
   (Twilio/A2P registration is the easy part). Reminder emails attach .ics
   files instead (shipped 2026-08-13).

## Will hurt at scale, not at launch

5. **Multi-tutor rooms.** SHIPPED 2026-08-13 — and re-ranked in hindsight:
   under the occupancy model this was a pre-flip requirement, not a scale
   item. Capacity now derives from staffing (8 students per cleared staff
   member, default 16 with a co-tutor), pending the supervision review in
   REVIEW_QUEUE. Original gap, kept for the record: the free Community Hall
   was capped at one tutor (capacity 30, one host) on a single-`tutor_id`
   schema.
6. **Calendar files.** PARTLY shipped 2026-08-13: T-24h reminder emails (1:1
   and group) attach .ics (`web/lib/server/ics.js`). Confirmation emails
   still don't — the original gap ("families live in Google Calendar")
   remains half-open there.
7. **Attendance-based pay guard.** Tutor pay accrues if ≥1 seat settles; a
   tutor who no-shows their own room needs manual clawback (admin can mark
   the room cancelled, which blocks accrual, but nothing automates it).
8. **KC-observation UI for group rooms.** The brief POST (per-student
   observations feeding the learning engine) exists API-side; the tutor UI
   ships the exit summary only. Wire it when the AI-side integration round
   happens — the exit summary already captures the human-readable version.
9. **Background checks.** Policy is interviews + references (honestly
   disclosed everywhere); third-party checks (Checkr) are recorded in admin
   when run but not required by the flow. Counsel/insurance may force this
   earlier than scale does.
10. **Session recording policy is "not recorded".** Great for privacy,
    thin for dispute resolution — revisit if a safety incident forces it.
11. **Standing seats book month-by-month.** Allowances are calendar-month
    windows, so the cron only books a standing seat into rooms inside the
    current month; rooms materialize up to two weeks ahead, so in the ≤2
    cross-month weeks a standing seat competes with retail buyers until the
    1st. Deliberate tradeoff (booking September rooms in August would spend
    August's visits); the reserve-ahead variant is future work — see the
    `bookStandingSeats` comment in `web/lib/server/series.js`.
12. **Design-system consolidation — DEFERRED deliberately.** The 2026-08-18
    review found a fourth, unplanned system: hand-rolled utility strings that
    re-derive the blessed primitives minus a detail each time. `.k-input` is
    used in 2 files while ~40 inputs re-type its recipe with
    `focus:outline-none` and no replacement (a WCAG 2.4.7 failure by
    specificity), the eyebrow/label role ships in nine letterspacing variants,
    `k-btn-ink` is the rose pill and `k-btn-primary` the ink one, and a
    pre-redesign palette still signs every transactional email. Real debt, but
    it changes no behavior — it belongs in one focused pass after the money and
    consent work lands, not interleaved with it. (The accessibility subset —
    focus rings, error-vs-success channel, `ember` on dark inversions — is
    ranked ahead of it in the review's plan.)
13. **Failures are costless to the mastery gate — needs the engine owner's
    decision, not a patch.** `gateMet` reads the 5 most recent confirming rows
    and freshness counts success mass only, so a failing outcome contributes
    nothing that holds the number down: 12 failing check rows followed by 6
    passing ones returns `confirmed: 0.95, gateMet: true` — confirmed mastery
    at a 33% lifetime hit rate. 0030 made probing expensive (one live attempt
    per KC, rotating items, a durable delay floor) but did not change that
    arithmetic. The three options — count failure mass in freshness, require a
    lifetime success-rate floor, or require the k-of-n passes to span distinct
    days — are laid out in `docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`
    ("Filed, not fixed"). Until one is chosen, the mastery law as
    `docs/ENGINE.md` states it is stronger than the estimator enforces.

## Not code

- Counsel gates (REVIEW_QUEUE items 10–16) before `club_enabled` in prod.
- **REVIEW_QUEUE item 16 — email-only guardian consent — is a pre-flip
  blocker, added 2026-08-20.** It is the one counsel item that is not a
  disclosure question: confirming an email address proves somebody opened our
  mail, not that they are an adult, a parent, or a different person from the
  student. A teen with a second mailbox satisfies it end to end. The freeze,
  the change cap and the audit log are friction and a paper trail, not
  verification, and the address supplied at signup does not even go through
  them (A4, above). The question for counsel is whether a stronger method — a
  card-on-file micro-charge on the paying parent's instrument, a signed form,
  an ID vendor, a phone callback — is required before live video with minors
  opens, and whether it applies to self-signed-up teens only or to
  parent-managed accounts too. Do not flip `club_enabled` on the strength of
  the mitigations alone.
- Insurance (general liability + professional for minors-facing live video).
- The §4/§9 GTM work: school-adjacent flyers, library partnerships, the two
  anchor testimonial families.
- **First-pick email.** Owner: founder. Precondition: DMARC on kaizenedu.net.
  SLA: send to the `club_interest` list within 48h of `club_enabled` flipping
  true. Content: link to the live schedule. Send is manual via Resend today —
  no automation exists for it.
- **`hello@kaizenedu.net` must be a real, monitored mailbox.** Owner: founder,
  before any traffic. The 2026-08-13 brand pass repointed /safety, /privacy,
  the in-call report fallback and the under-13 notice at this address — they
  previously pointed at `kaizentutors.com`, a domain the company does not
  control, so a child-safety report could have gone nowhere. `/safety`
  promises it is "monitored with priority", and the moderation SLA in
  `docs/SAFETY.md` is only real once a staffed window exists.
