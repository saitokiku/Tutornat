# Wave 1 product spec — what "up to spec" means

**2026-09-02.** The founder's instruction: get the product finished enough to
hand to the Program Director to sell, and to give the founder a feedback loop
worth improving. This spec says exactly what that means, file by file, with an
acceptance test for every claim. `docs/STRATEGY.md` v0.2 is the why;
`docs/RELEASE_PLAN.md` v2 is the sequence; this is the build.

## Three users, three jobs

| User | What they do | What the software owes them |
|---|---|---|
| **The family** | buys a diagnostic, then a seat | An honest storefront, a real assessment they paid for, and a record of what their child actually learned |
| **The Program Director** | delivers and sells | A console that can create a seat cohort, enrol a family, take attendance and write exit ratings in under two minutes an evening |
| **The founder** | improves the funnel | One board that shows visitor → interest → diagnostic → seat → retention, and whether evidence is being captured |

Anything that serves none of those three is not Wave 1.

## W1 — The director can actually run a seat cohort

Today the seat exists in pricing, in the schema and in the cron, and the one
API that creates a standing seat **refuses it**:
`web/app/api/tutoring/group/route.js` `createStandingSeatAction` rejects any
series whose kind is not `homework_hall` and gates on `club_hall_included`.
A paid seat holder therefore cannot be placed in the cohort they are paying
for. This is the single blocking defect in the product.

**Build**
1. `createStandingSeatAction` accepts `standing_seat` series and gates on the
   allowance the room kind is metered on — the same `STANDING_FEATURE` mapping
   `lib/server/series.js` already uses. Keep the guardian gate exactly as is.
2. `web/app/api/admin/classes/route.js`: `KINDS` admits `standing_seat`;
   accept and persist `venue` (already a column, 0033) on both series and
   materialised instances; allow the seat's 75-minute duration; seat series
   default from `KIND_DEFAULTS.standing_seat` and may not carry a seat price.
3. `web/app/admin/page.js` ClassesSection: `standing_seat` in the kind picker,
   a venue field, and the seat's defaults prefilled. A seat room must never
   offer a price input.
4. New `web/app/api/admin/seats/route.js`: list seat cohorts with their
   holders; enrol a family into a cohort (admin acting for a payer, writing
   `standing_seats`); end an enrolment. Every action audit-logged. The
   director does this at the kitchen table with the parent, not the parent.

**Accept when** an admin can create a Tue/Thu 75-minute `standing_seat` series
at a named venue, enrol a `seat`-plan family into it, and see the cron book
that student into the next room on `club_seat_included` — with a non-seat
caller still refused (`reserved`) and the room still hidden from the public
board.

## W2 — The founder's funnel board

**Build** `web/app/api/admin/funnel/route.js` and `web/app/admin/funnel/page.js`
(a new page, so the 1,100-line admin page is not a merge battleground).

One board, six rows, each a number and a trend against the previous period:

| Row | Source |
|---|---|
| Interest captured | `club_interest` |
| Diagnostics sold / delivered | `diagnostic_order` (W3) |
| Committed seats | `profiles.plan = 'seat'`, cross-checked against active `standing_seats` |
| Seat sessions delivered ÷ scheduled | `group_session` where kind `standing_seat` |
| Average students per seat room | `group_seat` held per room |
| Exit ratings written ÷ sessions delivered | `group_observation` |
| Verified mastery events per student per week | `evidence` where the row is confirming (`isConfirming`) |

Plus the two money lines: monthly recurring revenue from seats, and the
director's cost at the current dial (`directorMonthlyCents`), so the founder
sees contribution without opening a spreadsheet.

`web/app/api/admin/metrics/route.js` counts `seat` as a member plan (today it
counts only the retired three).

**Accept when** the board renders with zero data and no crash, every number
traces to a query in the route, and no number is computed in the browser.

## W3 — The diagnostic, end to end

The diagnostic is the first thing the director sells. Today it exists only as
a price in a doc and a Stripe Payment Link in the runbook.

**Build**
1. `DIAGNOSTIC` in `web/lib/server/clubPricing.js` (one-time, not a plan, not
   an entitlement) and `STRIPE_PRICE_DIAGNOSTIC` in `lib/server/stripe.js` +
   `.env.example`.
2. Migration `0036`: `diagnostic_order` (id, payer_id, student_id, status
   `paid|scheduled|delivered|refunded`, amount_cents, stripe_session_id,
   placement_session_id, delivered_at, report_md), RLS closed, admin-writable.
3. `web/app/api/diagnostic/route.js`: POST creates a one-time Stripe Checkout
   (`mode:'payment'`, metadata `diagnostic_order_id`) following the pattern
   already in `app/api/tutoring/group/route.js`; GET lists the caller's orders.
   Missing Stripe env returns an explicit not-configured state, never a fake
   success (Hard Rule 6).
4. `web/app/api/billing/webhook/route.js`: `checkout.session.completed` with
   `diagnostic_order_id` marks the order paid. Same signature discipline.
5. `web/app/api/engine/placement/route.js`: the adaptive placement the engine
   already implements in `lib/engine/placement.js` but never exposed — GET
   serves the next item, POST records a response, and completion writes
   `placementEvidence` through `appendEvidence` and recomputes estimates.
6. `web/app/diagnostic/page.js`: buy → take → "your report is coming from a
   person". The report itself is written by the director in the console; the
   software's job is the measurement and the record.

**Accept when** a family can pay $59, sit the adaptive placement, and have
baseline evidence in the ledger — and when, with no Stripe key set, the page
says so plainly.

## W4 — The record that makes the seat worth $550

**Build**
1. `web/app/api/engine/state/route.js` returns `growthTip`: the reachable
   set (3–5 KCs whose prerequisites are confirmed), from the same `eligible`
   logic `lib/engine/policy.js` already computes — exported, not duplicated.
2. `web/app/api/engine/session/route.js` accepts `focusKcId`, and a **parent**
   may set it for a managed student (0025 relationship). A parent assigns
   anything and certifies nothing: setting focus writes no evidence.
3. `web/app/api/account/export/route.js` gains a `kaizen-mastery-record/v1`
   section: `evidence` rows, confirmed `kc_estimate`, and `kc_standard` codes,
   shaped so it reads as a transcript rather than a table dump.
4. `web/lib/server/familySummary.js` leads on `kc_estimate` (confirmed of
   total, what moved this week) with attendance demoted to a supporting line.
   Only `confirmed` leaves the product — never `working`.
5. `web/app/api/tutoring/group/brief/route.js` writes `check_floor_at`
   alongside `next_check_at`, as `app/api/tutoring/observe/route.js:232`
   already does. Without the floor a same-evening check can confirm mastery
   the mastery law says is not yet confirmable.

**Accept when** a parent's summary can say "4 of 11 concepts confirmed, 2 moved
this week" from the ledger, and the export round-trips those same numbers.

## W5 — The 13+ duties, shipped

`web/lib/prompts.js:105` discloses AI only "if asked". A stated 13–17 birth
year makes the minor known, and California SB 243 (review-queue item 21)
attaches duties we should meet regardless of whether they are owed today.

**Build**, in `web/lib/prompts.js` and the chat route:
unprompted AI disclosure at the start of a session with a known minor; a
break reminder at three hours; no unprompted emotional check-ins; transcripts
visible to a linked parent. Persona stays — warmth is not a claim to be human.

**Accept when** a test asserts the disclosure sentence is present in the
system prompt for a known-minor session and absent for an adult, and that the
prompt never invites an emotional check-in unprompted.

## W6 — The storefront tells the truth about the new price sheet

Runs last, because it depends on the price. `web/app/page.js`,
`app/tutoring/page.js`, `app/about/page.js` still carry retired-membership
copy. Every claim gets a `docs/CLAIMS_MATRIX.md` row; `web/e2e/smoke.spec.js`
asserts the live figures and the absence of the retired ones.

## The rules that do not bend

Hard rules 1–7 in `CLAUDE.md`, and specifically: prices only from
`clubPricing.js`; entitlements resolved server-side through `getCaller` and
`checkEntitlement`; selling stays fail-closed behind `club_enabled`; a parent's
observation never confirms mastery; missing env degrades to an explicit
not-configured state; migrations additive from 0036; `evidence` rows are never
updated.
