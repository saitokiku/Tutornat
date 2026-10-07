# Gap-Report Fixes — Execution Plan (2026-08-13)

Source: full-repo read & gap report (external review, 2026-08-13), executed on
branch `claude/workflows-superpowers-fixes-nf36pc`. Every item below was
re-verified against HEAD before inclusion — the repo moved after the report
(0028 hall board retired rollover; FINANCIAL_SCENARIOS landed; interior
redesign shipped attendance UI), so this plan fixes what is still true, not
what the report snapshot said.

## Verified already addressed at HEAD (no work needed)

- [x] `clubAllowances` `.maybeSingle()`-on-`subscriptions` bug — the query was
  removed entirely when rollover was retired (grace visits; 0028 era).
- [x] Attendance UI — `TutorClasses.js` has Here / No-show marking + exit
  summary form against the existing roster PATCH.
- [x] Rollover-targeting occupancy item — obsolete; rollover no longer exists
  (discretionary grace visits are admin ledger credits).

## Out of scope for the repo (external critical path — tracked, not coded)

These stay the real bottleneck and no code below pretends otherwise:
counsel engagement on REVIEW_QUEUE 1–15 (item 12's numbers are corrected
below so counsel clears the *right* terms), insurance broker
(abuse-&-molestation rider), Supabase PAT + Stripe key rotation from the
Jul-30 session, DMARC record, Stripe price/env creation, tutor recruitment,
venue/GTM outreach. Owner: founder. The docs updated below carry these with
owner lines so they stop being invisible.

## Batch 1 — Docs truth sweep (the guarded-culture catch-up) ✅ `20c7b9d` `7a33308`

- [x] README.md: Next 14→16, 21→28 migrations, route count → actual (60), prices →
  none (points at `clubPricing.js` instead of retyping); other stale claims fixed.
- [x] docs/PRODUCT_SPEC.md: replaced $12/$18/$30/$55 + $39/$69/$99 commercial
  layer with current `clubPricing.js` truth; grace-visit model (no rollover).
- [x] docs/legal/REVIEW_QUEUE.md item 12 — **already corrected at HEAD** by the
  0028-era rollover retirement; re-verified against `terms/page.js`.
- [x] docs/legal/REVIEW_QUEUE.md: added supervision-ratio item and
  domain-namespace / prior-owner + trademark item.
- [x] docs/compliance/USA_LAUNCH.md: background-check framing → ERRATA truth;
  vacated FTC click-to-cancel citation → ROSCA + state ARL; retired 3-month
  trial removed; plus 6 more drifted rows (house pricing, refund windows,
  parent-managed consent, 1099 threshold).
- [x] docs/CLAIMS_MATRIX.md: counts recomputed from actual rows (38 rows).
- [x] docs/LAUNCH_GAPS.md: waitlist + multi-tutor re-ranked PRE-FLIP and marked
  shipped; first-pick email owner/SLA/DMARC; SMS deferred (TCPA/minors);
  monitored-mailbox item; honest cross-month standing-seat gap.
- [x] docs/API.md: regenerated — all 60 routes indexed with auth level.
- [x] Deleted docs/RESUME_NOTES.md.

## Batch 2 — Brand unification ✅ `064cf09`

- [x] `web/package.json` name `kaizen-tutors` → `kaizen` (+ lockfile).
- [x] Replaced remaining "Kaizen Tutors" strings (email subjects, ProgressView
  handoff copy) with "Kaizen"; hiring docs were already clean.
- [x] **Beyond scope, found en route:** `hello@kaizentutors.com` — a domain the
  company does not control — was the contact on /safety, /privacy, the in-call
  report fallback and the under-13 notice. Repointed to `hello@kaizenedu.net`
  (mailbox provisioning tracked in LAUNCH_GAPS).

## Batch 3 — Terms single-source + price-drift guard ✅ `b85f6cc`

- [x] `web/app/terms/page.js` interpolates every price/count from
  `lib/server/clubPricing.js` + refund windows from `sessionStates.js`.
- [x] `web/test/priceTruth.test.mjs`: zero dollar literals allowed in Terms;
  living-doc figures (README/PRODUCT_SPEC/WHAT_WE_SELL/REVIEW_QUEUE) must be
  members of the current clubPricing set; 1099 thresholds allowlisted with a
  reason; historical audit docs excluded by design.

## Batch 4 — Occupancy core (migration 0029 + mechanisms) ✅ `4d12e2b` `88d849c`

Schema (`supabase/migrations/0029_occupancy_core.sql`, additive, RLS-on
service-role-only like 0027/0028):

- [x] `group_waitlist` (session, user, student, status waiting/notified/
  converted/expired/cancelled, unique per user+session).
- [x] `standing_seats` (series, payer user, student, active, unique per
  student+series).
- [x] `group_seat.confirmed_at timestamptz`.
- [x] `group_session_staff` (session, tutor, co_tutor role) +
  `group_session_series.co_tutor_id`. Stale series defaults fixed in the same
  pass ($18 → $20 seat price; Eastern → America/Chicago).

Mechanisms:

- [x] Storefront stops vaporizing demand: `publicSchedule` + group GET return
  full rooms with `isFull`; ScheduleBrowser + DropInSessions render
  "Full — join the list"; waitlist join/leave actions; notify-on-seat-free
  from cancel, abandoned-hold release, and the confirm-or-release sweep —
  notification only, never a hold.
- [x] Herding sort (`lib/server/occupancy.js`): browse orders local day →
  bookable-before-full → fullest-first → time; cancellations return
  emptiest-first alternatives.
- [x] Standing member seats: `bookStandingSeats` books the current calendar
  month's rooms from included visits — guardian gate re-checked each run,
  synchronous ledger write, never an auto-charge; family page manages them.
- [x] Confirm-or-release: T-24h group reminder carries the confirm ask + .ics;
  `releaseUnconfirmedSeats` releases UNCONFIRMED **included** seats at T-4h
  (visit restored, waitlist notified); paid/free seats structurally exempt;
  bookings inside 24h auto-confirm.

## Batch 5 — Community hall supervision + economics guard ✅ `4d12e2b` `88d849c`

- [x] `KIND_DEFAULTS.community_free.capacity` 30 → 16 and `communityCapacity()`
  caps community rooms at 8 × cleared staff at both series creation and
  materialization; admin classes accepts `coTutorId`; co-tutors reach the
  roster, the video room (re-vetted at join), the AI brief, and their rooms in
  the tutor workspace.

## Batch 6 — Hygiene ✅ `5e1eefd` `4d12e2b`

- [x] Untracked `web/tsconfig*.tsbuildinfo`; `*.tsbuildinfo` ignored.
- [x] Timezone default `America/New_York` → `America/Chicago` (series fallback,
  0029 column default, admin form + placeholder).
- [x] Study Circle: "Legacy plan" badge, invite affordance removed, join-by-code
  returns 410 — the retired product can no longer grow.
- [x] `.ics` on reminders **and** booking/group-seat confirmations
  (`lib/server/ics.js`, Resend attachments). SMS deferred with the TCPA reason.

## Batch 7 — AI SDK + cost truth ✅ `518cf87`

- [x] `@anthropic-ai/sdk` ^0.32.1 → ^0.116.0; the `any` cast is gone
  (`cache_control` is typed), runtime fallback guard kept.
- [x] `costOf` returns the cache read/write split + `cacheSavedUsd`, persisted
  into `usage_ledger` metadata — the ~47% assumption (B6/B12) is now
  measurable from production rows.
- [x] Fallout caught: stale tsbuildinfo had masked real typecheck errors;
  `npm run typecheck` is genuinely clean at 0.

## Batch 8 — Item bank (the honest version) ✅ `e64f8fc`

- [x] **Report correction first:** there were never "69 KC skeletons awaiting
  items" — there were **8 concepts total**, all with items. The 69 was a count
  of every tuple line in `seed_kc.sql` (items and edges included).
- [x] `supabase/seed_kc_algebra1.sql`: 15 new concepts, 90 items, each at the
  ship floor (6 items / ≥2 context tags / ≥3 per tag), wired into the existing
  chain with prerequisite and confusable edges.
- [x] **Every item `status='draft'`** — `check.js` serves only `'verified'`, so
  nothing reaches a student. Solver agreement + second-model critique done
  (independent re-solve of all 90 before seeing the key; zero wrong answer
  keys; 11 other defects fixed). Human sign-off pending:
  `docs/reviews/ALGEBRA1_ITEM_BANK.md` carries the item table and the promotion
  SQL, deliberately kept out of the seed.
- [x] `web/test/draftBank.test.mjs` fails the build if a promotion statement or
  stray `'verified'` lands in the draft seed, and asserts the ship floor now.
- [x] Known limitation documented for the reviewer: a symbolic verifier compares
  values, not form, so an unfactored equivalent answer passes a factoring item
  (`math-factor-gcf`, `math-factor-trinomial`).

## Batch 9 — Verification artifacts

- [x] Seeded-account Playwright journey (env-gated, skips cleanly):
  login → dashboard → book included Hall visit → cancel → visit restored.
- [x] Adversarial review of "the mastery law is unbypassable" — 4 attack lenses,
  each finding independently refuted by 2 more agents; write-up in
  `docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`. 18 candidates → 9 survived.
  **The hard parts held** (keys never reach the browser; no client-writable path
  into the evidence tables; prompt injection cannot confirm). Three client-trust
  holes fixed in `0030` (unlimited check issuance, client-supplied
  `independentBlock`, erasable post-session delay floor); one filed for a product
  decision (failures are costless to the mastery gate: 12 fails then 6 passes
  measures as confirmed). ENGINE.md's "confirmed only" sentence narrowed to what
  the code does.

## Acceptance

- [x] `npm test` (337), `npm run lint` (0 errors), `npm run typecheck` (0
  errors), `npm run build` — all clean from `web/`.
- [x] No new public claim without a CLAIMS_MATRIX row; no price retyped outside
  `clubPricing.js`; migrations additive; selling stays fail-closed
  (`club_enabled` untouched).
- [x] Logical commits per batch; pushed to
  `claude/workflows-superpowers-fixes-nf36pc`.
