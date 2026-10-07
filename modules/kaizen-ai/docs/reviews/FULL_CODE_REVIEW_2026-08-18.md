# Full-repo review — UI, backend, business, IP

**Date:** 2026-08-18 · **Scope:** every page, component, API route, migration
0001–0030, and the docs that govern them · **Method:** 11 independent read-only
review lenses (**117 findings**), then adversarial verification of the 19
deduped high/critical items with two refuters each, instructed to default to
*refuted*.

**Verification result: all 19 survived. None was disproven.** Several were
re-rated, and that re-rating turned out to be the most useful output of the
whole exercise — see the next section.

**Status: remediated across five waves, 2026-08-21.** The findings below are
written in the present tense of 2026-08-18 and have been left that way on
purpose — they are the diagnosis, and rewriting a diagnosis after the fact
loses the reasoning that produced it. What *is* current is the **status ledger
immediately below**, and the status flags on the remediation plan at the end.
Read the ledger first: it is the shipping checklist now, and nearly everything
that follows is closed. What is left is one counsel gate, one engine-owner
decision, one marketing claim, and tracked debt.

---

## Status ledger — 2026-08-21 (wave 5)

Eight commits have landed against this review, in **five remediation waves**.
Each wave was followed by an adversarial verification pass over the fixes
themselves, and every one of those passes found defects — in most rounds,
defects the previous wave had *introduced*. That record is in "New — found in
the fixes" below, and it is now the most instructive part of this document.
The ledger is the authority; the finding text further down is not.

| Commit | What it covered |
|---|---|
| `a36e059` | migration 0031 — cascade → RESTRICT, seat re-arm, double-pay index, check lockout |
| `29a9f96` | **wave 1** (server) — consent gates, money races, pricing truth, cost governor, cron budget |
| `4d73da4` | **wave 2** (UI + docs) — error states, focus, contrast, dead-end flows, governance |
| `a96daec` + `4ebc18a` | the four blockers verification round 1 found **in wave 1's own fixes** |
| `9cc3f02` | **wave 3** — the legacy birth-year lockout the A1 fix created (and the one-time door out of it), H17 (still open after wave 2 claimed it), the three regressions wave 2's own contrast and error-channel passes introduced, over-budget intake reporting itself as a bad paste, and H8's **third** price copy in `docs/GO_LIVE.md` |
| `7a5ccda` | **wave 4** — the A4 minimum fix, the no-JS storefront, plan-switch proration, session self-completion, 0032 (`app_settings` grants), PROVISIONING/HANDOFF prices, the notices CI freshness check, A12 provenance, `/family` discoverability |
| `a227795` | the A4 walk-around wave 4 left open **on the route its own refusal points at** |
| `9f95476` | **wave 5** — the reduced-motion hydration error, the storefront flicker wave 4 introduced, the silently unpaid tutor wave 4 introduced, the free-Hall release copy wave 3 introduced, the proration debit that outlived its increment, the T-15 completion floor |

### Closed — waves 1–2 and the first verification round

| # | Fix | Commit |
|---|---|---|
| C1 | `/api/account/delete` refuses while the caller is a tutor or holds settled seats; 0031 turns the money-table CASCADEs into RESTRICT, and the route translates the FK violation into that same message instead of a 500 | `29a9f96` + `a36e059` |
| A1 / H9 | `agePosture()` returns `adult｜minor｜unknown`; an absent or unusable `birth_year` now provisions as a **minor with no guardian email**, so the gate fails closed instead of open | `29a9f96` |
| A2 | `guardianGateSatisfied` takes an explicit relationship and accepts only `managed`. It keys on `profiles.managed_by` (service-role-only) rather than the review's suggested `parent_student_relationships.created_via`, because 0011's client INSERT policy lets a browser insert a link claiming `created_via='managed'` — the suggested fix would have been bypassable. The 1:1 route's inlined copy of the gate was deleted in favour of the shared one | `29a9f96` |
| A3 | creating a managed teen requires the creator to be a verified adult; the posture is recorded in the audit trail | `29a9f96` |
| A6 | email dev-fallback redacted to the domain — no recipient addresses, no body, no live consent/unsubscribe tokens in logs | `4d73da4` |
| H1 | group-seat DELETE claims the row atomically before any refund or allowance restore | `29a9f96` |
| H2 | 1:1 PATCH transitions conditionally; partial unique index on `tutor_earnings(tutoring_session_id)`; the index violation is a no-op, not a 500 | `29a9f96` + `a36e059` |
| H3 | 0031 re-arms a cancelled seat row instead of 409-ing forever | `a36e059` |
| H4 | Realtime voice metered against a budget it actually consumes, and duration-capped | `29a9f96` |
| H5 | PDF/image intake runs through `meteredCall` | `29a9f96` |
| H6 · H7 | both hardcoded prices deleted, rendered from `clubPricing`; `priceTruth.test.mjs` extended to scan `web/components/**` and `web/app/**` | `29a9f96` |
| H8 | **the two runbooks the finding named** were corrected — the third, fourth and fifth copies came later; see below | `29a9f96` |
| H10 | `/billing` and `/api/billing/checkout` gate club plans and `ai_hall` on `club_enabled` | `29a9f96` |
| H11 | contact form returns an explicit failure plus a `mailto` fallback when unconfigured; interest capture no longer swallows its write error | `4d73da4` |
| H12 | deadline-aware cron: money-critical jobs first, bounded Stripe concurrency, reports what it deferred | `29a9f96` |
| H13 | `/api/tutoring/hall` learned about `group_session_staff` | `4d73da4` |
| H14 | 0030 and 0031 spliced into `GO_LIVE.sql` | `4d73da4` |
| H15 · H16 | confirm link survives being signed out; `returnTo` on the parent and applicant funnels | `4d73da4` |
| H17 | group-seat release now confirms, with the forfeiture consequence computed for **that** seat from the real window. *(Attribution corrected: wave 2's commit message claimed this; the one-tap release survived it and was actually closed in wave 3 — and the dialog wave 3 wrote then had to be corrected again in wave 5. See below.)* | `9cc3f02` |
| H18 | `issueCheck` expires a stale attempt via 0031's function before inserting | `29a9f96` |
| UI | error-vs-success channels split on all three occupancy surfaces (`role=status` vs `role=alert`); `.k-input` swept in (focus rings restored); `.k-badge` primitives replace the ~2.7–3.5:1 pills; dark inversions use `ember` (~5.1:1); AI-companion nav reachable below 640px | `4d73da4` |
| Governance | CLAIMS_MATRIX rows + Terms disclosure for waitlist / confirm-or-release / standing seats (windows interpolated from `occupancy.js`); Sentry added to the privacy processor list; `THIRD_PARTY_NOTICES` regenerated; College Board non-affiliation line added | `4d73da4` |

### Closed — waves 3, 4 and 5

| # | Fix | Commit |
|---|---|---|
| A1 lockout | `POST /api/account/birth-year` lets an account with no year on file state one **once** — rate-limited, audit-logged, `.is('birth_year', null)` in the WHERE so concurrent posts cannot race a second declaration, under-13 refused without being stored, a stored year never overwritable. `/settings` grew the affordance; `BookModal` renders the refusal from the caller's own profile, so "guardian on file", "none on file" and "unreadable teen row" each say what is actually true | `9cc3f02` |
| **A4, minimum fix** | the "guardian email must differ from your own" rule now runs **server-side at the write** (`decideSignupGuardianEmail` / `guardianEmailIsSelf`, `lib/server/context.js`), folding plus-tags in both directions. A self-named or unusable address stores **nothing**, so the account must go through `/settings`, where the address is shape-validated, frozen once consent exists, capped at 3 per 30 days and audit-logged. Signup is not refused — the attempt is audited so a human can see it. The browser check remains, marked as UX. **This raises the floor and settles nothing about whether email confirmation is adequate consent — see *Still open*** | `7a5ccda` |
| A4, the walk-around | `POST /api/family/guardian-consent` — the exact route the signup refusal points at — compared the two addresses **literally**, so `sam+mom@x.com` was refused at signup and accepted at `/settings` one keystroke later, then frozen in that state by the same wave's consent lock. All three implementations (server signup, this route, the browser pre-check) now share `guardianEmailIsSelf` | `a227795` |
| A12 | the tutor's pre-session brief is built in two halves that are never blended: **verified** (`kc_estimate` + the `evidence` ledger, both client-write-revoked by 0013) and **selfReported** (courses, assignments, the app-side tracker). Nothing is dropped — a tutor needs to know what the student *says* they are working on — but the label is carried in the JSON, in the model's rules, and in a provenance line the route writes itself so a paraphrase cannot lose it | `7a5ccda` |
| `app_settings` back door | 0032 revokes client INSERT/UPDATE/DELETE and re-grants SELECT explicitly (the signup kill switch reads it pre-session). RLS denied the writes already; this is defence in depth on the fail-closed selling law. Spliced into `GO_LIVE.sql` with the stated range updated. **It is a migration: it closes when it is actually run** — the 0019 audit view (`admin_client_writable_tables`) returning zero rows for `app_settings` is the check | `7a5ccda` |
| No-JS storefront | `dn/Reveal.js` no longer emits `initial={{opacity:0}}` into server HTML, so nine public pages are readable with a blocked bundle or a failed hydration. Wave 4 achieved that by swapping div → Motion at hydration and thereby re-hid painted content on every load; wave 5 makes the decision **per element, once**: a wrapper provably below the fold gets the Motion element and its entrance, anything already on screen keeps the div it was painted with. The honest consequence is now written in the file — a normal visitor no longer sees the hero animate. `amount: 0.3` replaced with `amount: 'some'` (a block taller than the viewport could never show 30% of itself, so it never revealed at all) | `7a5ccda` + `9f95476` |
| Reduced-motion hydration error | `dn/GlowLine.js` — the one motion primitive wave 4's sweep missed — branched on `useReducedMotion()` in the render body, which is false during SSR and reads the media query synchronously on the first client render. A visitor with "reduce motion" set loaded `/`, `/ai` and `/tutoring` with a hydration error React declines to repair. It now emits identical markup under both preferences and imports `Reveal`'s entrance rule, so the two can only disagree by being edited apart | `9f95476` |
| Plan-switch proration | in-place switches meter the **incremental** allowance against the days remaining (`meterPlanSwitch`), written before Stripe is touched and reversed if the switch fails. Wave 5 adds the other half: a later downgrade **releases** the outstanding debit instead of leaving it biting the smaller plan — the wave-4 fix was deleting visits the member had paid for. Invariant now stated and enforced: proration rows alone can never leave a member below the plan they are standing on | `7a5ccda` + `9f95476` |
| Tutor self-completion | `completed` / `in_progress` on a 1:1 are floored at the moment the **room opens** (T-15, the same instant the join gate uses — wave 4's T+0 floor made the product refuse a status for a room it had already let both parties into, with an error naming a future time). A group room no longer auto-completes on a student joining: `groupRoomPayout` requires evidence the tutor was there | `7a5ccda` + `9f95476` |
| Tutor payout hold | wave 4's evidence test held an unverified room for seven days and then closed it unpaid — but the tutor's workspace dropped rooms after 24 hours, and the "an admin can accrue by hand" fallback its comment promised **did not exist in any route**. So a tutor who taught a Hall and never closed the roster was simply never paid. Both human paths are now real: held rooms stay in the tutor's own list for the whole hold (their own bounded query, so a week of past rooms cannot crowd out upcoming ones), and `POST /api/admin/earnings` settles one room by hand — `accrue` or `no_pay`, amount recomputed from the room by the sweep's own function, never taken from the request body, both audited. The hold could also starve the sweep (held rooms sorted to the front of a fixed 200-row window); it now reads them newest-first with a reserved slice for rooms that must close | `9f95476` |
| Free-Hall release copy | wave 3's new confirmation told a student releasing a **free** Community Hall seat that their payment was forfeited — the opposite of the truth, on the one club product that is live and free today (a free seat settles with `paid=true`, meaning "settled, nothing owed"). The copy now branches on what the seat actually cost | `9f95476` |
| H8, third / fourth / fifth copies | `docs/GO_LIVE.md` §5, `docs/PROVISIONING.md` §4 and `docs/archive/HANDOFF.md`'s "founder-confirmed facts" each carried the retired Stripe lineup in the present tense — the last inside a document CLAUDE.md calls verified-against-live. All three corrected **and all three added to `LIVING_DOCS` in `priceTruth.test.mjs`**, which is the only thing that makes "fixed" mean fixed here | `9cc3f02` + `7a5ccda` |
| `THIRD_PARTY_NOTICES` guard | `scripts/checkNotices.mjs` + `test/notices.test.mjs` compare the file against `package.json` and the installed tree, say so explicitly when `node_modules` is absent rather than passing quietly, and deliberately ignore the lockfile so version-neutral churn fails nothing. A second test builds a rotten fixture and asserts the audit catches it — the class, not the instance | `7a5ccda` |
| `/family` discoverability | now linked from the footer's long-tail column (`dn/Shell.js`), the dashboard account chrome, `/settings` and `/billing` | `7a5ccda` |
| Wave-2 regressions | the contact form's failure headline (pushed to 3.8:1 by wave 2's own contrast pass), `/billing`'s club-held 503 rendered in the success-green banner, and the one Undo toast the audit named that the ember sweep claimed but missed. Also: over-budget intake reported itself as a bad paste rather than an exhausted AI budget, on the free tier that is live today | `9cc3f02` |

### New — found in the fixes, round by round

This is the part of the document worth reading twice. Five remediation waves,
five adversarial verification passes, and **not one pass came back empty**.
Round 1 found four blockers, **three of them made by the fix**. Round 2 found
a lockout the A1 fix had created, one accessibility regression wave 2's own
contrast pass had introduced, and two items wave 2's commit message said it had
closed and had not. Round 4 found six defects, **all six made by waves 3 and
4**, four of them high. The original audit's own fifth theme —
"four of these findings are regressions I introduced during this session's
occupancy work" — turned out to describe the remediation as accurately as it
described the work being remediated.

| Round | Verified | What it found |
|---|---|---|
| 1 | wave 1 + 0031 | **0031's seat re-arm set `booked_via = null`** against a `NOT NULL DEFAULT 'checkout'` column — the H3 fix could never have run, and would have turned the clean 409 it existed to remove into a 500 leaking a raw Postgres message. Two independent verifiers found it. **A re-armed seat reuses its row id**, which is what the old Stripe Checkout session carries in its metadata — cancel, rebook, pay the stale link, and the new hold settles against the old payment. **The `refund_status` stamp was unconditional**, so a rebooked-and-paid seat could be stamped `refunded`. **The C1 delete guard only refused a tutor with work**, so a never-activated applicant passed it, had storage purged and subscription cancelled, then hit the FK wall with their files already gone. Three of the four were introduced by the fix |
| 2 | wave 2 | **The A1 fail-closed fix locked out every account created before this week** — 0007 left `birth_year` NULL on all of them — at every live-booking entry point and at managed-child creation, including the operator's own, with a refusal that said "we emailed them a link" when no address existed and no email had been sent, and no way for anyone to state a year. Plus wave 2's contact-form failure headline, pushed to 3.8:1 by wave 2's own contrast pass — a regression in the same commit that was fixing contrast. And two things wave 2's commit message claimed and had not done: H17's confirm dialog, and the one Undo toast the audit named by hand, which the ember sweep reported as swept. Plus two original misses — `/billing`'s 503 in the green banner, over-budget intake reported as a bad paste — and H8's third price copy |
| 3 | wave 3 | Mostly **original** still-open items rather than fix-induced ones — A4 at the signup write, the `opacity:0` storefront, the proration mint, tutor self-completion, the `app_settings` grants, the fourth and fifth price copies, A12, `/family`. Wave 4 is the wave that worked this ledger's own open list |
| 4 | wave 4 (and what wave 3 left) | Six, all fix-induced, four of them high: **the A4 walk-around**; **the storefront flicker** wave 4's own div → Motion swap created (Motion applies `initial` at mount, so painted content was re-hidden and faded back in on every load of nine pages — `RevealGroup` was worse, using `animate`, which fires regardless of scroll position); **the silently unpaid tutor**; **the free-Hall release lie** wave 3 wrote; the **proration debit that outlived its increment**; and the **T+0 completion floor** contradicting the T-15 room gate. Plus `GlowLine`, the one motion primitive wave 4's sweep did not reach — and the default-preference browser sweep was clean, which is exactly why it was missed |
| 5 | wave 5 | This pass. See *Still open* |

**The shape that recurred, twice: a fix closes one door and routes people to a
second door it never hardened.**

- **A4.** The signup write refused a self-named guardian address and told the
  account to supply one at `/settings`. That route compared the two strings
  literally — so the address refused as `sam@x.com` was accepted as
  `sam+mom@x.com` a keystroke later, and then **frozen** in that state by the
  same wave's consent lock. The remediation path *was* the walk-around, and
  the freeze made it durable.
- **The group payout.** Completion stopped paying out on student-only evidence
  and routed the money to two human paths: the tutor closing the roster, or an
  admin accruing by hand. The first was unreachable after 24 hours of a 7-day
  hold; the second existed only in the comment describing it. The fix
  converted "a no-show tutor gets paid" into "a tutor who taught gets
  nothing" — the worse of the two failures, and silent.

Both were found by reading the fix's *downstream* path rather than the code it
changed. That is the check this remediation kept failing, and it is the one
worth institutionalising: **when a fix refuses something, walk the road it
sends the user down, and confirm the door at the end of it is both open and
locked to the right people.**

A second, quieter pattern: three separate times a wave broke something the
wave before had just built (0031's re-arm, wave 2's contrast pass undoing its
own accessibility work, wave 4's Reveal swap). Fixes cluster in the code the
last fix touched, so that is where the next verification should start.

### Still open

Ordered by what has to clear before `club_enabled` flips.

**Pre-flip — counsel, not code**

- **REVIEW_QUEUE item 16 · whether email confirmation is an adequate consent
  method at all.** `[ATTORNEY REVIEW]`, and the one counsel item that is not a
  disclosure question. What the code proves is that somebody with access to the
  address on file opened our email and clicked a link — not that they are an
  adult, a parent, or a different human being from the student. A teen with a
  second free mailbox satisfies the gate end to end, from their own keyboard,
  in about a minute. **A4's server-side fix (above) does not touch this**: it
  removes the trivial case (naming yourself, plus-tags folded) and leaves the
  mechanism's limit exactly where it was. The freeze, the 3-per-30-days cap and
  the audit log are detection and friction, not verification. This is the gate
  standing between a 13–17 year old and live one-to-one video with an adult.

**Ships today, no flag protecting it**

- **The landing marquee promises ten subjects** — Algebra, Geometry,
  Chemistry, Essays, AP Bio, World History, SAT Prep, Calculus, Physics,
  Spanish (`app/page.js:87`) — against **eight seeded middle-school math
  concepts**. `seed_kc_algebra1.sql` would carry the chain through Algebra I
  (15 components, 90 items) but every item in it is still `status 'draft'` /
  `verified_by 'draft:llm-authored'`, and `check.js` serves only `'verified'`,
  so not one can reach a student until a human promotes it. Everything else
  returns `noBank`. `CLAIMS_MATRIX` line 75 already carries this row marked
  **Open** — "do not market subject breadth until the item bank covers it".
- **Failures are costless to the mastery gate** — needs the engine owner's
  decision, not a patch. `gateMet` reads the five most recent *confirming*
  rows and the freshness term counts success mass only (`lib/engine/pfa.js`
  ~125), so a failing outcome contributes nothing that holds the number down:
  12 failing rows followed by 6 passing ones returns `confirmed: 0.95,
  gateMet: true` — confirmed mastery at a 33% lifetime hit rate, reachable by
  simply retrying. 0030 made probing expensive (one live attempt per KC,
  rotating items, a durable delay floor) but changed none of that arithmetic.
  Unchanged through all five waves — `pfa.js` has not been touched since before
  this review. The three options (count failure mass in freshness, require a
  lifetime success-rate floor, require the k-of-n passes to span distinct days)
  are laid out in `docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`; also
  `LAUNCH_GAPS` item 13. Until one is chosen, `docs/ENGINE.md` states a mastery
  law stronger than the estimator enforces.
- **The tutor-facing half of the payout hold is not rendered.** Wave 5's
  `?tutorView=1` computes `needsRoster` and `holdExpiresAt` per room and the
  comment gives the intended copy ("mark who was here to get paid for this
  one"), but `components/TutorClasses.js` reads neither field — grep finds no
  consumer outside `app/admin/page.js`. The money defect *is* closed: the room
  is back in the tutor's list for the full seven days and an admin can settle
  it by hand. What is missing is the sentence telling the tutor that the hour
  is sitting unpaid and that closing the roster is what pays it. Small, and
  exactly the kind of half-landed fix this ledger exists to stop overstating.

**Product coherence and debt — tracked, not blocking**

The "Business logic and product coherence" section below stands as written,
and all four of its items were re-verified against the code on 2026-08-21:

- **The confirm-or-release incentive is still inverted.** Ignoring the T-24h
  email releases the seat at T-4h and calls `restoreAllowance` — the visit
  comes back. Cancelling honestly inside that window forfeits it. Disclosure
  was the hard-rule-1 violation and is closed (Terms + CLAIMS_MATRIX); the
  incentive is a product decision still open.
- **Standing seats book a month at a time** (`LAUNCH_GAPS` item 11) — a
  deliberate tradeoff, with the reserve-ahead variant filed in `series.js`.
- **The free session still has several names** — "Community Hall", "Community
  Homework Hall", "a free Community Hall every week" across `/` and
  `/tutoring`. Plan item 18, with the `k-btn-ink` / `k-btn-primary` inversion.
- **Weekly reports are still student-triggered**: `POST /api/reports/weekly`
  generates from a stats snapshot **the client sends**, so the parent-facing
  artifact is produced on the student's action from the student's numbers.
- **Rate limiting (plan item 19) is still absent where it was named.**
  `rateLimitResponse` is now on ~20 routes, but not on `api/billing/checkout`,
  `api/billing/portal`, or either room-minting route (`tutoring/room`,
  `tutoring/group/room`) — the two classes the item actually called out, the
  second of which has minors in a live room as its caller set.
- **Design-system consolidation — deliberately deferred, still deferred.**
  `LAUNCH_GAPS` item 12: the fourth ad-hoc system (hand-rolled utility strings
  re-deriving the blessed primitives minus a detail each time), the eyebrow
  role in nine letterspacing variants, `k-btn-ink` as the rose pill, the
  pre-redesign palette still signing every transactional email. Real debt that
  changes no behaviour; it belongs in one focused pass now that the money and
  consent work has landed. The accessibility subset (focus rings,
  error-vs-success channel, `ember` on dark inversions) is closed and was
  always ranked ahead of it.

---

## The most important thing this review produced

The refuters kept reaching the same conclusion from different directions:
**most of the alarming findings are latent, held shut by `club_enabled=false`.**
The club — bookings, seats, memberships, tutors, refunds — is not sellable
today, so most money and child-safety defects are not currently reachable.

That is genuinely reassuring, and it is also the trap. The containment is
**incidental, not designed**: one admin click in Settings turns roughly a dozen
verified defects live simultaneously, including two independent ways for a
minor to reach live video with an adult without a guardian ever being involved.

So the right way to read this report is not by severity. It is by this split:

### Broken right now (the free AI product is live)

*(As of 2026-08-21 every row in this table is closed — A12, the last of them,
in wave 4. The split below is still the right way to read the report: it is why
the pre-flip list in the status ledger is now a single counsel question rather
than a page of code.)*

| # | Issue | Why it bites today |
|---|---|---|
| **H18** | One abandoned check permanently locks a learner out of that concept | Ordinary behaviour — close the tab. Breaks the core mastery loop, per concept, forever. *(Mine.)* |
| **H5** | PDF/image intake bypasses the cost governor | Free-tier AI is live; a heavy user burns far past their cap while the ledger shows ~$0 |
| **H7** | Dashboard says "Homework Hall from $12" (it's $14) | Rendered unconditionally on every student's default view |
| **H10** | `/billing` sells memberships with no `club_enabled` gate | Live page; becomes chargeable the moment Stripe prices exist — which the runbook says to do *first* |
| **A6** | Email dev-fallback logs full recipient addresses + 400 chars of body | Any deployment without `RESEND_API_KEY` — a state rule 6 designs for — writes minors' addresses and live consent/unsubscribe tokens to logs |
| **A12** | The tutor's pre-session brief reads self-writable legacy tables | A student can shape what their tutor reads 90 seconds before a session |

### Breaks the instant `club_enabled` flips

C1 (cascade deletion), H1 (seat-cancel race), H2 (double tutor pay), H3
(rebooking lockout), H6 (BookModal misquote), H12 (cron starvation), **A1 and
A2 (both guardian-gate bypasses)**. None of these needs new code to become
dangerous — only the switch.

*(All eight are closed as of 2026-08-21, and so is everything that replaced
them: A4's signup write is now server-side (waves 4 and 5), A12 is labelled by
provenance, and 0032 revokes the `app_settings` grants. What remains on the
pre-flip gate is **not code** — REVIEW_QUEUE item 16, whether email
confirmation is an adequate consent method at all. See the status ledger.)*

**The practical recommendation: treat the pre-flip checklist as a hard gate.**
The items in that second list are not "launch polish"; several are the reason
the flag exists.

---

## The short version

The codebase is in better shape than this list makes it look. All 337 tests
pass, the build is clean, typecheck is at zero errors, and a live browser sweep
of all 13 public routes at phone and desktop widths found **no visual breakage
at all** — no overlapping text, no clipped grids, no horizontal scroll, no
hydration errors, consistent nav and footer across both design worlds. The
storefront degrades gracefully with no backend configured, which is exactly
what it was built to do.

The problems are not where you would look for them. They cluster in four
places:

1. **Money paths that are check-then-act.** Several places read a row, decide,
   then write — with no conditional update. Under a double-click or two tabs,
   they mint included visits, double-pay tutors, or zero a tutor's pay for a
   session that actually ran.
2. **Prices typed by hand on live purchase surfaces.** The single-source
   pricing law is enforced in `/terms` and the docs, and violated in the two
   places a customer actually reads a price before paying.
3. **A CASCADE chain that makes account deletion a money-record shredder** —
   the one finding rated critical, and the only one I would call an emergency.
4. **The age and consent gate is enforced in the browser, not the server.**

A fifth theme deserves separate mention: **four of these findings are
regressions I introduced during this session's occupancy work.** They are
called out explicitly below rather than buried, because the pattern matters
more than the individual bugs.

---

## Access control — the re-run lens, and where the real gap is

The first attempt at this lens tripped a safeguards filter on its threat-model
phrasing; re-run as a defensive audit of your own code, it produced the single
most important pair of findings in the review.

Its verdict on the API layer is worth quoting: *"genuinely strong — noticeably
stronger than typical for a codebase this size."* Every admin route resolves
through `isAdminCaller` (which fails closed on demo callers); the Stripe webhook
verifies its signature against the raw body; the cron route refuses to run
without `CRON_SECRET` and compares with `timingSafeEqual`; ownership
re-derivation on `seatId`, `standingId`, `attemptId` and `sessionId` is
consistently correct, including on the occupancy actions I added.

**The gap is not in the API layer. It is in where age and guardianship get
established, which happens outside it.**

### A1 · The 13+ rule and the minor flag are browser-side only · high

`isMinor = birthYear ? … : false` (`lib/server/context.js:62`). The value comes
from `user_metadata.birth_year`, written by the browser during
`supabase.auth.signUp` with the anon key. Omit the field and `is_minor` is
false; `guardianGateSatisfied` then returns true on its first line, so a 13–17
year old books live video with no guardian ever contacted. Falsify it and an
under-13 signs up. No API route ever re-derives it — grep shows the value is
only ever read.

### A2 · A self-created parent link satisfies the guardian gate · high

Independent of A1, and it does not even require lying about age.

```js
export function guardianGateSatisfied({ studentProfile, onBehalf }) {
  if (!studentProfile?.is_minor) return true;
  if (studentProfile.guardian_consent_at) return true;
  return Boolean(onBehalf);            // ← "booked on behalf of" counts as consent
}
```

But `onBehalf` is set by *two* very different relationships
(`lib/server/family.js:27–36`). The managed-child path is defensible — the
parent created the account. The `parent_student_relationships` path is not: that
link is created by whoever knows the student's email and activated by whoever
controls the student account. Nothing verifies the "parent" is an adult;
`profiles` carries no adult attestation at all (only `tutors` does).

So: a 15-year-old registers a second email, invites their own account as
"parent", accepts from the student account, and books live 1:1 video with
`childId` set. The server records `guardian_consent: true` and the tutor sees a
consented minor. Two accounts, three API calls.

`parent_student_relationships.created_via` already distinguishes `'managed'`
from the rest — the fix is to make the gate accept only that.

Three medium findings compound these: `/api/family/children` mints accounts on
self-asserted age and consent with no check on the creator; a minor can rewrite
their own `guardian_email` to a second address they control and self-serve the
consent link; and `app_settings` — which holds `club_enabled` itself — still
carries client INSERT/UPDATE grants under a rationale that does not apply to it
(RLS denies the writes today, so nothing is exploitable now).

---

## Highest single consequence

### C1 · Account deletion destroys other people's payment records

`auth.users → tutors → group_session → group_seat`, every hop `ON DELETE
CASCADE` (`0003_tutors.sql:12`, `0017_group_sessions.sql:35,82,83`), and
`/api/account/delete` (`route.js:63`) calls `svc.auth.admin.deleteUser(userId)`
with no guard for tutor status or held seats.

A tutor who deletes their own account erases every room they ever taught and,
with it, **every other student's seat row — including `stripe_payment_intent_id`
and `refund_status`**. A student self-deleting removes their seat rows, which
are what `completeGroupSessions` counts to decide whether the tutor gets paid.

Kaizen is the merchant of record. Those rows are the refund and dispute ledger.
This is available today through a public endpoint, and it is silent.

*Verification note: both refuters confirmed the chain, the missing guard and the
payout consequence exactly as described, and found no compensating control —
but re-rated it **high rather than critical**, because no paid seats can exist
until selling opens. I have kept it at the top of the report anyway: it is the
highest-consequence single defect, and unlike the others it destroys evidence
rather than money, which cannot be reconstructed after the fact.*

---

## High — all verified, none refuted

Grouped by what they cost you.

### Money and revenue integrity

| # | Issue | Where |
|---|---|---|
| H1 | **Seat cancel is unconditional.** A student can flip an `attended` seat to `cancelled` *after* the session ran, zeroing the tutor's flat-hourly pay; parallel cancels double-restore the included visit, minting free Hall visits (real tutor-hours). `releaseUnconfirmedSeats` does this correctly with an atomic claim — the DELETE path does not. | `api/tutoring/group/route.js:779` |
| H2 | **Double-clicked "Complete" pays a tutor twice.** 1:1 PATCH is check-then-act and `tutor_earnings` has no unique index on `tutoring_session_id`. (Group rooms are safe — 0017 has that index.) | `api/tutoring/sessions/route.js:366` |
| H3 | **Cancelled seats permanently block rebooking that room.** `unique(group_session_id, student_id)` is unconditional and `claim_group_seat` does ON CONFLICT DO NOTHING, so any cancel, abandoned checkout, or T-4h release makes that room un-rebookable forever, returning "You already have a seat." The waitlist and release emails invite people into a guaranteed 409. | `0017_group_sessions.sql:101` |
| H4 | **Voice is metered against a budget it never consumes.** Realtime tokens are gated on a `tts_chars` proxy that sessions never spend, recorded under an uncapped key. Open-ended OpenAI spend, invisible in the ledger. | `api/voice/realtime-token/route.js:44` |
| H5 | **PDF/image intake bypasses `meteredCall`** — no budget guard, no caching, cost booked with a `length/4` estimate blind to media blocks. The most expensive call class in the product is the one the governor cannot see. | `lib/server/intakeCore.js:56` |

### Pricing truth — violated exactly where it matters

| # | Issue | Where |
|---|---|---|
| H6 | **The 1:1 booking sheet quotes `$30/30 min · $55/hr`** — a price that has never existed in `clubPricing.js`. Retail is `$35/$60`. The tutor profile one click earlier renders the correct figure from the source of truth; the sheet that takes the money does not. The tutors API even returns a `pricing` object for this purpose and the modal ignores it. | `components/BookModal.js:102` |
| H7 | **The student dashboard advertises "Homework Hall from $12."** It is $14. Highest-traffic in-app surface. | `components/ChecksDueCard.js:137` |
| H8 | **Both launch runbooks tell the operator to create Stripe Prices at the retired $39/$69/$99** against the live $45/$79/$109 — a $6–10/member/month recurring leak baked into the launch checklist, and a charged-vs-disclosed mismatch either way. | `docs/archive/LAUNCH_RUNBOOK.md:54` |

`priceTruth.test.mjs` — which I added this session — scans `/terms` and the
living docs. It does not scan components or ops runbooks, which is precisely
where all three of these survived.

### Safety, consent, and the selling gate

| # | Issue | Where |
|---|---|---|
| H9 | **The age gate is client-side.** `isMinor = birthYear ? … : false` — a signup that omits `birth_year` from client-supplied auth metadata is created as an **adult**. No guardian email, no consent lock on live video. The anon key ships to every browser. | `lib/server/context.js:63` |
| H10 | **`/billing` sells Club/Plus/Max with no `club_enabled` gate**, and neither does the checkout route — it only checks that a Stripe price exists. Since the runbook says create prices *before* flipping the switch, memberships become purchasable while the club is legally held. `/pricing` gets this right. | `app/billing/page.js:320`, `api/billing/checkout/route.js` |
| H11 | **The contact form says "Got it. We'll get back to you." while discarding the message** when the backend is unconfigured — and the privacy policy routes CCPA deletion requests through that form. Violates the repo's own rule 6 (missing env must degrade explicitly, never fake success). | `api/support/route.js:49` |

### Operational

| # | Issue | Where |
|---|---|---|
| H12 | **The hourly cron runs 14 sequential jobs in one 60s budget.** The first job makes two serial Stripe calls per stale hold; at ~85 abandoned checkouts it eats the whole tick, and a timeout bypasses the per-job try/catch entirely — so refunds for under-filled clinics, the release sweep, and waitlist notifications silently never run, and the next tick re-attempts the same backlog first. | `api/cron/maintenance/route.js:54` |
| H13 | **The hall board 403s co-tutors.** Every other 0029 surface learned about `group_session_staff`; `/api/tutoring/hall` did not. A co-tutor is admitted to the video and the roster, then their Room board polls a 403 every 5 seconds for the whole session. | `api/tutoring/hall/route.js:31` |
| H14 | **`GO_LIVE.sql` stops at 0029.** A database provisioned by the documented one-paste path runs current code against a schema with no `independent_block` or `check_floor_at` — every practice item throws, and all of 0030's anti-gaming hardening is silently absent. | `supabase/GO_LIVE.sql:4` |

### Flows that dead-end

| # | Issue | Where |
|---|---|---|
| H15 | **The confirm-or-release email link fails silently when signed out** — the token is consumed and stripped, no message renders, and the seat is released at T-4h anyway. The family did what was asked and still lost the seat. | `app/family/page.js:77` |
| H16 | **Parent and tutor-applicant sign-in detours strand new users in student onboarding.** Both funnels — the payer's and the hiring one — send people to signup without the `returnTo` breadcrumb other surfaces set. | `app/family/page.js:117` |
| H17 | **Group-seat cancel is one tap, no confirmation, no refund warning**, inside a 12-hour forfeiture window. The 1:1 flow already models the correct confirm dialog. | `components/DropInSessions.js:612` |

### The one I broke this session

| # | Issue | Where |
|---|---|---|
| H18 | **One abandoned check locks a learner out of that concept forever.** My 0030 index is `where submitted_at is null` with no expiry predicate (partial indexes cannot call `now()`), but `issueCheck` only resumes attempts where `expires_at > now`. After the 1-hour TTL the resume query finds nothing, the insert hits the unique violation, and the route 500s — permanently, with nothing anywhere clearing stale rows. The migration comment claims "a learner is never blocked by an abandoned attempt beyond its TTL." That is exactly what happens. | `lib/engine/check.js:112`, `0030:52` |

---

## Where the UI doesn't line up

You asked this specifically, so it gets its own section. **The rendered pages
are fine** — the live sweep found zero layout defects. The misalignment is in
the system, not the pixels.

**There are now four design systems, not three.** The marketing world (`dn/*`,
coal/paper/ember) and the interior "bone" system (`k-card`, `k-btn-*`,
`k-label`) are each internally disciplined. The fourth is unplanned: **hand-rolled
utility strings that re-derive the blessed primitives, minus a detail each time.**

- `.k-input` carries `focus:ring-2 focus:ring-accent/25`. It is used in **2
  files**. About **40 other inputs re-type the recipe with `focus:outline-none`
  and no replacement** — which also defeats the global `:focus-visible` rule by
  specificity. Keyboard focus is invisible across the whole parent onboarding
  form, admin scheduling, tutor tools, and grade entry. That is a WCAG 2.4.7
  failure on a product for students.
- `k-btn-primary` is the ink pill; **`k-btn-ink` is actually the rose pill** —
  the name means the opposite of what it does, and both appear as the primary
  CTA within a single view (`TodayView.js:247` vs `:402`). Rose means "upgrade"
  on billing and "explore" on Today.
- The eyebrow/label role ships in **nine letterspacing variants**, three of them
  inside the flagship marketing pages alone.
- A `k-btn-secondary` clone sits directly beside a real `k-btn-primary` in the
  new occupancy UI — missing its hover and active states.
- A **third, pre-redesign palette** still signs every transactional email, the
  global error page, and the logo defaults.

**Two rendering-level issues worth fixing regardless:**

- **Errors render in success green on all three new occupancy surfaces.** A
  failed seat-confirm reads as success, and then the seat quietly releases at
  T-4h. The billing page already keeps separate notice and error channels — the
  correct pattern exists in-repo. *(Mine, from this session.)*
- **Dark inversions use the day `accent`** (3.5:1, AA fail) where the palette
  already defines `ember` at 5.1:1 for exactly that ground. The lowest-contrast
  text on screen is the Undo button in the destructive-action toast.

Plus: the "AI companion" nav link is `hidden sm:block` with **no mobile menu**,
so half the product is unreachable from the header on a phone; load-bearing
fine print (the "illustrative week" disclaimer, the AI+Hall visit terms) fails
AA contrast; and all marketing content below the hero ships as `opacity:0` in
the server HTML, so a JS failure leaves the pages blank below the fold.

---

## Business logic and product coherence

- **The confirm-or-release incentive is inverted.** Cancelling an included seat
  4–12h out *forfeits* the visit; silently ignoring the confirm email *returns*
  it at T-4h — and the release email advertises that. The rule rewards silence
  over honesty. *(Mine.)*
- **It is never disclosed at booking.** The Hall booking sheet's fine print
  omits the release rule entirely; the free Community Hall gets refund warnings
  that do not apply to it. *(Mine.)*
- **Standing seats book a whole month in one cron tick** — up to ~16 emails to a
  Plus family in a single day, then a weekly confirm-or-lose-it chore, under a
  feature sold as "make this a weekly thing." *(Mine.)*
- **The free weekly session has six different names** across surfaces, and
  "Hall" refers to two different products.
- **The landing marquee promises ten subjects**; verified mastery is reachable
  in eight middle-school math concepts. (The draft Algebra I bank fixes this
  once promoted.)
- **"Weekly reports" are promised to parents** but are student-triggered, LLM-
  generated from a client-sent snapshot.
- **`/family` — the payer's home — is linked from almost nowhere**: not the
  dashboard chrome, not the footer, not settings, not billing.
- **In-place plan switches use `create_prorations`** against calendar-month
  allowances: upgrade-for-a-day mints a full month's incremental visits.
- **A tutor can self-complete a 1:1 that never ran** and accrue flat-hourly pay;
  in a group room, any student joining flips it to `in_progress`, so a tutor
  no-show still auto-completes and pays out.

---

## IP, licensing, and legal surface

- **`THIRD_PARTY_NOTICES.md` is stale** — generated 2026-07-22, still documents
  `@anthropic-ai/sdk 0.32.1` (installed: 0.116.0), and omits the direct
  dependency `motion` entirely. No CI guard. The public `/licenses` page claims
  auto-regeneration and attributes fonts the app no longer ships. *(The SDK half
  is mine — I bumped the dep and never ran `npm run notices`.)*
- **The privacy policy's processor list omits Sentry**, which receives error
  envelopes including URL, plan, and context.
- **The new occupancy claims have no CLAIMS_MATRIX rows** — the waitlist promise
  and the T-4h forfeiture ship with hardcoded window numbers and no mention in
  Terms. That is a direct violation of hard rule 1. *(Mine.)*
- **College Board marks (SAT, AP) appear on the landing marquee** with no
  non-affiliation disclaimer anywhere in the repo.
- **Clean:** the root LICENSE is correctly proprietary and consistent with
  `"license": "UNLICENSED"`; no GPL-only code in the tree (LGPL libvips is
  properly analyzed).

---

## What is genuinely good

Worth stating, because a list of 102 findings distorts the picture:

- **Every route's column set resolves against migrations 0001–0030.** No schema
  drift in code. Status/plan CHECK lists match their JS mirrors. `seed.sql`,
  the GO_LIVE entitlements, `DEFAULT_LIMITS`, and the test pins all agree.
- **The `ai_hall` included-visit promise works end to end** — verified through
  entitlement seeding, quoting, synchronous consumption, and refund.
- **Group tutor pay is double-pay-safe** via 0017's unique index.
- **A cancelled member's standing seat degrades correctly** — plan re-read each
  run, zero allowance means skip, never a charge and never an error.
- **Client bundle discipline is real**: katex, mermaid, the syntax highlighter,
  and daily-js are all verified dynamically imported; the public schedule is 5
  queries behind a 60s edge cache.
- **The occupancy build's pure logic** (`occupancy.js`, the release sweep's
  atomic claim, the RPC) is careful. The glue around it is where the bugs are.
- **The engine still refuses to leak answer keys** under the previous review's
  attack, and grading remains fully deterministic.

---

## Remediation plan

Ordered by consequence, not by effort.

**Now — things that are broken today (about a day)** — ✅ all four landed
(`29a9f96`, `4d73da4`).

1. **H18** — clear stale check attempts before insert, or retry once on 23505.
   My bug, and the only one on this list actively breaking a live product loop.
2. **H7 + H6** — delete both hardcoded prices, render from `clubPricing`, and
   **extend `priceTruth.test.mjs` to scan `web/components/**` and `web/app/**`**
   so the class cannot recur. Add the runbooks (**H8**) to the same guard.
3. **H5** — route intake through `meteredCall`; it is real money on the free
   tier right now.
4. **A6** — stop logging recipient addresses and message bodies in the email
   dev fallback.

**Before `club_enabled` is ever flipped — treat as a hard gate (two to three days)**
⚠️ items 5–9 landed, and so did everything that was still open behind them: A4's
signup write is server-side (`7a5ccda`) and its walk-around on `/settings` is
closed (`a227795`), A12 is labelled by provenance, and 0032 revokes the
`app_settings` grants. **The remaining gate is not code.** `REVIEW_QUEUE.md`
item 16 asks counsel whether email-only consent is an adequate method at all,
and nothing in five waves of remediation moves that question.

5. **A1 + A2** — the two guardian-gate bypasses. Make `guardianGateSatisfied`
   accept only a `managed` relationship as implicit consent (the `created_via`
   column already distinguishes it), and treat a missing/invalid `birth_year` as
   unverified server-side rather than adult. These are the reason the flag
   exists; do not flip it with them open.
6. **C1** — make money tables deletion-proof (`ON DELETE RESTRICT`, or nullable
   `SET NULL` with snapshot columns) and have `/api/account/delete` refuse when
   the caller is a tutor or holds settled seats.
7. **H1, H2** — atomic conditional claims on both cancel and complete paths;
   add the partial unique index on `tutor_earnings(tutoring_session_id)`.
8. **H3** — make seat uniqueness partial (`where status <> 'cancelled'`) or have
   the RPC re-arm a cancelled row. This silently sabotages the entire 0029
   waitlist/release design.
9. **H10** — gate club and `ai_hall` checkout on `club_enabled` server-side.

**Then (two to three days)** — ✅ 10–16 landed (`4d73da4`, `29a9f96`). H8 needed
three more passes after that: the third copy (`docs/GO_LIVE.md`) in wave 3
(`9cc3f02`), the fourth and fifth (`docs/PROVISIONING.md`, `docs/archive/HANDOFF.md`)
in wave 4 (`7a5ccda`). All five are now inside `priceTruth.test.mjs`'s
`LIVING_DOCS`, which is the only reason to believe the sixth cannot appear.

10. **H14** — splice 0030 into `GO_LIVE.sql`; fix the runbook's stated range.
11. **H11** — explicit 503 plus a `mailto` fallback when support is unconfigured.
12. **H13** — six lines of `group_session_staff` lookup in the hall authorizer.
13. **H15, H16, H17** — confirm-link auth handling, `returnTo` on both funnels,
    confirm dialog on destructive cancels.
14. **Error-vs-success channel** split across the three occupancy surfaces, then
    `.k-input` adoption (or a codemod) to restore focus rings, then `ember` on
    dark inversions.
15. **H12** — deadline-aware cron with money-critical jobs first, bounded Stripe
    concurrency, raised `maxDuration`.
16. **H4** — meter voice properly (and cap session duration) before any Realtime
    client ships; the verifiers rated this medium today, high the day it does.

**Then — governance, so the same classes stop recurring** — ✅ 17 landed in
full: the `THIRD_PARTY_NOTICES` **CI freshness check** it was missing is
`scripts/checkNotices.mjs` + `test/notices.test.mjs` (`7a5ccda`), with a rotten
fixture proving the guard fires. 18 and 19 are still open — `k-btn-ink` is
still the rose pill, the free session still answers to several names, and
`rateLimitResponse` still does not cover `api/billing/checkout`,
`api/billing/portal`, or either room-minting route.

17. CLAIMS_MATRIX rows for the occupancy claims plus Terms language for the T-4h
    rule; regenerate `THIRD_PARTY_NOTICES` and add a CI freshness check; add
    Sentry to the privacy processor list; add a College Board non-affiliation
    line.
18. Name the free session once and rename `k-btn-ink`. Both are cheap and both
    stop a recurring source of confusion.
19. Rate-limit the three Stripe-touching routes and the video-room minting
    routes; both are cost-amplification rather than access, but the caller set
    on the second is minors in a live room.

**Deliberately deferred, and still deferred as of 2026-08-21:** the
design-system consolidation (nine label variants, the fourth ad-hoc system, the
legacy email palette) is real debt but changes no behavior. It belongs in one
focused pass after the money and consent work lands — not interleaved with it.
That work has now landed, so this is the pass that comes next
(`LAUNCH_GAPS.md` item 12).

---

## Method note

10 lenses produced 102 findings; the 19 deduped high/critical items then went to
two independent refuters each, instructed to default to refuted and to treat
"unreachable because `club_enabled` is false" as a valid refutation while still
flagging anything that breaks the moment it flips. Convergence was the strongest
signal in the exercise: **four separate lenses independently found the BookModal
price bug**, and three independently found the rebooking lockout. I personally
re-verified C1, H9, H10, and H18 by reading the code paths end to end.
