# Release Plan — Kaizen Local

**v2 · 2026-09-02.** The ordered sequence from here to the Wave 1 exit gate in
`docs/STRATEGY.md` §6. Written to be followed in order without re-deciding
anything: each stage has one exit condition, and you do not start the next stage
until it is met. Where this file and STRATEGY.md disagree, STRATEGY.md wins.

**No dates.** Stages gate on evidence, not on a calendar. The seasons (Sep
enrolment, Oct PSAT, Dec finals, Jan surge, Apr–May STAAR) tell you which *offer*
to lead with, never whether you may advance.

Companion documents: `docs/legal/REVIEW_QUEUE.md` is stage 2;
`web/lib/server/clubPricing.js` is the only price truth and overrides any figure
printed anywhere else, this file included. (`docs/archive/LAUNCH_RUNBOOK.md` was
the mechanical checklist for stages 0 and 3; it describes the marketplace
go-live, which is a cut product, and is archived — use `docs/GO_LIVE.md`.)

**Engineering work is not a stage here, on purpose.** The Wave 1 build (PR #29)
and the Wave 2 geometry (PR #30) both shipped without moving a stage, because
what gates this plan is a signed venue, cleared legal terms and a paying family
— not code. `docs/superpowers/specs/2026-09-03-wave3-frontend.md` is the
frontend rebuild and is deliberately sequenced *behind* the founder actions in
PR #30: a smaller, cleaner storefront selling nothing is worth less than the
current one selling one seat.

---

## Part 1 — What is decided

### 1.1 The product

**One recurring product: the standing seat.** In `clubPricing.js` as `SEAT_PLAN`
since 2026-09-02 (founder decision — the strategy had it landing after the first
seats sold; it is in code now so everything downstream builds against one
definition).

| | |
|---|---|
| Price | $550/mo, one price for every payer (cash, 529, TEFA) |
| Shape | 2 sessions a week × 75 minutes · 1:4 · in person · one subject · named tutor |
| Metered as | 9 sessions per calendar month on `club_seat_included`; no rollover; no stored value |
| Includes | Max-level AI limits; member (Plus-level) rates on Hall, Clinic, 1:1 |
| Rooms | kind `standing_seat`, capacity 4, reserved — never sold as drop-ins |

Around it, a la carte for everyone: Homework Hall $14 (supervised study hall,
up to 8), Subject Clinic $30 (up to 6, min 2), the free weekly Community Hall,
the $59 diagnostic — **credited in full against the first month for a family
that takes a seat within 30 days** — and the free AI with one upgrade (Max AI
$11.99, led on "track your whole schedule, not two classes").

The clinic price rose and the seat held at $550 on 2026-09-02, both on the
Austin market read in `docs/PRICING_EVIDENCE.md`. Read its warning before you
repeat a single competitor figure from it: the research ran behind a blocked
egress proxy and the verification pass could confirm none of them.

**Retired from sale** (`SALE_STATUS`; definitions kept for `/terms`, metering
and legacy resolution; zero customers to migrate): Club $45 / Plus $79 / Max $109.
AI + Hall $24.99 stays built and disclosed; its Stripe env stays unset.

**Naming that now carries legal weight.** The seat is *tutoring* — every payment
rail pays for academic tutoring. The Homework Hall is *supervision* and the
Terms say so. The storefront never blurs them.

### 1.2 What is cut, and why

| Cut | Mechanism | Why |
|---|---|---|
| **Memberships** | `SALE_STATUS = retired`; `/pricing` and `/billing` filter on `forSale()` | 6–8× below the seat; the $45 tier is margin-negative at 2 students and cannibalises the seat |
| **The $699 sprint** | never built | A self-terminating seat that churns the longitudinal record; prepaid stored value |
| **Private 1:1** | don't publish tutor availability | $35/tutor-hour against $87 for a full Hall; most schedule-complex product |
| **Voice tutoring** | `voice_enabled = false` | OpenAI spend and a live-audio surface with minors |
| **Expensive models** | `expensive_models_enabled = false` | Cost cap |
| **Online marketplace** | gated; Wave 2 | Stripe Connect dark; counsel items 1–9 open; different labour model |
| **Kids, Certified, Gov** | not started | Waves 3–4 |
| **Free trials** | dormant (`TRIAL_PLANS = []`) | Real tutor cost per session |
| **A lease** | rule: 16 committed seats | The only line that fails the gate on its own |

### 1.3 What the repo is ready to build (already in place)

- Plan key `seat`, room kind `standing_seat`, `venue` on rooms, seat entitlements,
  `reserved` quote mode + claim refusal, public board hides seat rooms, the
  standing-seat cron books seat rooms on the seat allowance — migration 0033.
- `tutors.credential_kind / credential_state / credential_ref /
  credential_verified_at / fingerprinted_at`; pay band widened to $22–50
  (certified default $40; ceiling raised for the Program Director by 0035) —
  migrations 0033 and 0035.
- `evidence` immutable by trigger (corrections as new rows via
  `adjusts_evidence_id`); `kc_standard` crosswalk (TEKS/CCSS, CASE URI) —
  migration 0034.
- The Wave 1 build, shipped 2026-09-02 against
  `docs/superpowers/specs/2026-09-02-wave1-product.md`: the seat cohort console
  and the enrolment defect that made the seat unsellable (W1); the founder's
  funnel board at `/admin/funnel` (W2); the diagnostic end to end, with the
  adaptive placement the engine had implemented and never exposed, and the
  director's report panel (W3, migration 0036); the growth tip, parent-set
  focus, the `kaizen-mastery-record/v1` transcript and a family summary that
  leads on confirmed mastery (W4, migration 0037); and the 13+ duties in the
  tutor prompt (W5).
- `GO_LIVE.sql` bundles 0022 → 0037 and the seat rows; idempotent.

---

## Part 2 — The sequence

### Stage 0 — Make the storefront honest

**Exit condition: `/pricing` shows the seat in capture state, the AI upgrade buyable, and no membership.**

Software:
1. Create the seat's Stripe Price — **$550 USD, monthly, recurring**, product
   "Kaizen Standing Seat", lookup key `kaizen_seat_monthly_live` — and paste its
   id into `STRIPE_PRICE_SEAT`. Check the amount against `SEAT_PLAN.seat.priceCents`
   before you click Create; Prices are immutable.
2. Paste `STRIPE_PRICE_AI_SOLO`. Leave `STRIPE_PRICE_AI_HALL` unset. The three
   membership envs may stay set (their Prices exist) — nothing sells them.
3. Run `supabase/GO_LIVE.sql` (idempotent; now carries 0033–0037). **Then set
   `club_enabled` back to `false`** in Admin — the bundle's last statement opens
   it, and it must stay closed until stage 2 clears. `diagnostic_enabled` seeds
   closed and is flipped in stage 1, on its own.
4. Set `voice_enabled = false`, `expensive_models_enabled = false`. Redeploy.
5. Verify: seat card renders "Get first pick"; Max AI has a buy action; no
   Club/Plus/Max anywhere; `/terms` discloses the seat.

Real world: none.

**Money: none yet.** _If this stalls:_ it can't.

---

### Stage 1 — Prove demand before building the machine

**Exit condition: 10 paid diagnostics sold at $59.**

Software: the diagnostic now exists in the product — `/diagnostic`, an adaptive
placement, an order row per purchase, and the director's write-up panel in Admin
(`docs/superpowers/specs/2026-09-02-wave1-product.md` W3). Two things to set:
paste `STRIPE_PRICE_DIAGNOSTIC` (a **one-time** Price at the figure in
`clubPricing.DIAGNOSTIC`, not a subscription), and flip **`diagnostic_enabled`**
in Admin → Settings. That switch is deliberately separate from `club_enabled`:
the diagnostic gates nothing the club switch exists to gate, so this stage does
not wait on stage 2. A Stripe Payment Link outside the app still works and needs
neither.

Real world: **first, one afternoon of phone calls** — ring seven Austin
providers as a parent and write their real prices into
`docs/PRICING_EVIDENCE.md` with dates (review-queue item 26). Every competitor
figure we hold is unverified, and the pricing page should not ship before that
is fixed. Then five conversations — three school counsellors or PTAs, **two
homeschool co-ops** (Kaizen Home, STRATEGY §4.6; the diagnostic is the natural
first purchase for a homeschool family); sell 10 diagnostics;
deliver them yourself (an assessment is *selling*, one of your three jobs);
write every result into the ledger as baseline evidence.

**Money: ~$590 one-time — the first dollar.** A Payment Link outside the app:
no env, no `club_enabled`, no counsel gate.

_If this stalls, stop._ If ten Austin families won't pay $59 after five school
conversations, the funnel is the problem; no hiring or software fixes it.

---

### Stage 2 — Legal clearance and founder facts

Runs in parallel with stage 1; gates stage 4.

**Exit condition: counsel has cleared review-queue items 10–17 and 19–20 in writing; items 1, 9, 15, 22 answered.**

Real world:
1. Send `docs/legal/REVIEW_QUEUE.md` items 10–23 to an attorney. Item 12 is now
   the seat's terms (item 17); items 18–23 are the rail, credential, SB 243 and
   franchise questions the strategy research surfaced.
2. Answer yourself: item 1 (organising state), item 9 (insurance), item 15 (pay
   band — the code allows $22–50, certified default $40), item 22 (SOS good
   standing; the Odyssey questions).

**Money: none. Longest pole; start on day one.**

---

### Stage 3 — Staff the room

**Exit condition: two credentialed, fingerprinted tutors on the roster and a seat series on the calendar at a named venue.**

Real world:
1. **Done, 2026-09-02:** the **Program Director** is hired — $50/hour, 15
   hours a week, no profit share (`docs/hiring/PROGRAM_DIRECTOR.md`). They are
   the credentialed tutor who delivers the room, the operator who runs it, and
   the person who sells. The founder teaches zero sessions, always. Set their
   `tutors` row up before anything else: credential fields, `fingerprinted_at`,
   `pay_rate_cents = 5000`. Open items are review-queue item 24 (W-2 or 1099 —
   do not put a classification in writing until counsel answers) and a timesheet
   from day one.
2. Recruit a **second credentialed tutor** — a retired Texas teacher satisfies
   TEFA (~) and 529 (✓). Two credentialed, fingerprinted tutors on the roster is
   what opens the Odyssey vendor application in stage 6, so recruit before you
   need the capacity. Record `credential_kind`, `credential_state`,
   `credential_ref`; fingerprint them; set `pay_rate_cents` (certified default
   4000). The director's own dial does not need them until 16 seats
   (`docs/UNIT_ECONOMICS.md`); the rail does.
3. Name the venue (borrowed space; a library, church or microschool room).

Software (Admin, no deploys):
4. Create the seat series: kind `standing_seat`, 75 min, capacity 4, `venue`
   set, two evenings a week. The cron materialises rooms two weeks out.
5. Do **not** publish 1:1 availability for anyone.

**Money: none — the gate is still closed.** _If this stalls:_ you cannot hire
credentialed tutors. That is the real constraint on every rail; solve it before
anything else.

---

### Stage 4 — Open the seat

**Exit condition: 14 seats held for one full month.**

Software: flip `club_enabled = true`. That is the entire deploy.

Real world: convert the diagnostic buyers first; one price for everyone; ask
every enrolling family for one referral, by name.

**Money: recurring revenue starts.** The full curve is
`docs/UNIT_ECONOMICS.md`; the three numbers that matter are **8 seats to break
even, 14 to pass the cash-cow gate, 16 the director's ceiling** at 15 hours a
week. The first cohort loses money on purpose — labour is fixed and capacity
comes in steps of four — and the founder has accepted that burn. The dial is the
release valve: fewer director hours costs less, and every figure rescales with
`STAFFING.directorHoursPerWeek`.

_If this stalls:_ diagnostics sell but seats don't. The gap is usually between
"here is what your child needs" and "here is the room, on these two evenings,
where we fix it."

---

### Stage 5 — Silent capture (engineering, in hours)

Runs from stage 3 onward; must be complete before stage 6.

**Exit condition: every in-person session writes standards-tagged, exportable, immutable evidence.**

In order:
1. Per-KC Homework Hall / seat-room exit ratings through `appendEvidence` as
   `tutor_observation`; `check_floor_at` on the group path.
2. Populate `kc_standard` with TEKS + CCSS codes for the 23 math KCs; sign off
   the Algebra I bank (`seed_kc_algebra1.sql`, 15 KCs / 90 items, all `draft`).
3. `kaizen-mastery-record/v1` section in the account export (evidence, confirmed
   `kc_estimate`, standards codes).
4. `growthTip` (the reachable set, 3–5) from `/api/engine/state`; accept
   `focusKcId` on `/api/engine/session` — and let a **parent** set it for a
   managed student (0025): this is the homeschool parent's "today's lesson."
4b. The parent view shows the lattice (confirmed / working / reachable per
   KC) and the export reads as a transcript. A parent sees everything, assigns
   anything, certifies nothing (STRATEGY §4.6).
5. `familySummary` rebuilt on `kc_estimate`, attendance demoted; weekly report
   generated server-side from the ledger.
6. Admin panel: **verified mastery events per student per week** from
   `evidence` where `isConfirming`.
7. The 13+ compliance subset (STRATEGY §7.3): unprompted AI disclosure at session
   start; 3-hour break reminder; no unprompted emotional check-ins;
   parent-visible transcripts.
8. Seed released NAEP/TIMSS anchors for the live KCs.

---

### Stage 6 — The rails

**Exit condition: the seat is listed on Odyssey and a 529-compliant invoice template is in use.**

Real world:
1. Odyssey TEFA vendor application in Kaizen Academy LLC's name — it goes live
   the day two credentialed, fingerprinted tutors are on the roster (stage 3).
   Express the seat as sessions × duration; same price as cash.
2. 529 invoices carry the tutor's credential (§529(c)(7)(E)).
3. Aim for the 2027-02-01 TEFA tranche. Model receipts as Net-30 plus slippage.

**Money: partial subsidy and upside, never the plan.** Direct pay stays ≥40%.

---

### Stage 7 — The gate

**Exit condition: all four cash-cow conditions held for one month, and stage 5 complete.**

- Covers its own costs including part-time help
- Owner profit ≥ $3,000/month
- Net margin ≥ 25%
- Founder ≤ 15 hours/week

At **14 seats** in borrowed space all three measurable conditions pass —
`docs/UNIT_ECONOMICS.md` has the arithmetic and the inputs it derives from.
Sixteen seats is where two separate decisions land together: the director's
dial runs out (raise the hours or hire tutor #2) and the **lease question opens
— not before 16 committed seats**. Wave 2 (`docs/STRATEGY.md` §6) begins here.

---

## Part 3 — The scoreboard

Reviewed weekly, no exceptions.

| Metric | Target |
|---|---|
| Committed seats | 8 breaks even · **14 passes the gate** · 16 is the director's ceiling |
| Seat sessions delivered / scheduled | ≥ 90% |
| New families this week | 3–4 |
| **Average students per seat room** | 4 (it is the ratio; below 3 loses money) |
| Retention / churn | < 5%/month |
| Verified mastery events per student per week | > 0 from stage 5 |
| Ledger sessions logged | = sessions delivered |
| Your hours in the business | ≤ 15/week |
| Director hours billed vs the dial | 15/week, reviewed monthly |
| **Sessions you personally taught** | **0, always** |

---

## Part 4 — Decisions only you can make

1. The state Kaizen Academy LLC is organised in — item 1, blocks stage 2 and 6.
2. The credentialed pay rate within $22–50 — item 15. The director is at the
   $50 ceiling; tutor #2 defaults to $40.
3. `club_enabled` — re-close now (stage 0, step 3), or record a written risk
   acceptance. Not silently on.
4. Online-only or borrowed space — the arithmetic says borrowed space until 16
   committed seats.
