# What we actually sell — and what will go wrong at the register

> **Superseded 2026-09-02.** The canonical business model is now
> `docs/STRATEGY.md` (v0.2). Where this file disagrees with it on model, pricing,
> waves or gates, STRATEGY.md wins; this file is kept for its mechanics and its
> history. Update STRATEGY.md first, then propagate.

An honest commercial teardown of the product as built. Three questions per
service: what is the thing a customer hands over money for, what will go wrong
when we try to sell it, and what do we do about it **from day 1** — split into
what's already built into the product (`BUILT`) and what has to be operating
discipline (`OPS`). Companion to `LAUNCH_RUNBOOK.md` (how to turn it on) and
`LAUNCH_GAPS.md` (what's missing); this is *why any of it makes money*.

---

## Part 1 — The value inventory, ranked by sellability

Not everything in the repo is a product. This is the ranking that should drive
where sales effort goes.

### 1. The Plus membership ($79/mo) — the business
The only SKU whose economics compound. Everything else is either a feeder into
it or a margin top-up around it. $79/mo × a school-year tenure of 4–7 months is
300–550 dollars of LTV per family against a near-zero marginal cost when rooms
are shared. **The company's real product is a recurring relationship with a
family**; the membership is just its billing shape. Sell everything else as a
path to this.

### 2. Homework Hall ($14) — the wedge, not the revenue
At $14 a seat and ~$25/hr tutor cost, a Hall doesn't clear real margin until
3–4 seats fill. That's fine, because its job isn't margin — it's **habit**. It
is the lowest-friction paid unit in the industry ("$14, tonight, homework gets
done") and the natural first purchase after the free session. Treat Hall
economics like a grocery store treats milk.

### 3. Private 1:1 ($35/$60) — the margin and the rescue valve
~50% gross margin at retail ($60 − $25–30 tutor − fees). The market already
understands this product, which makes it easy to sell and hard to defend —
see Part 2 for the disintermediation problem. Its second job matters more
than its margin: it's where the escalation ladder lands when a student
genuinely needs individual help, which is what makes the cheap tiers honest.

### 4. Subject Clinics ($30) — merchandisable moments
The highest perceived value per dollar *when tied to a real moment* ("Algebra
midterm review — Thursday, before your Friday test") and the weakest product
in the lineup when generic. Clinics are not a standing catalog; they are
**merchandising against the school calendar**.

### 5. The evidence ledger — the actual differentiator
Intake ("what are you bringing, where are you stuck, what does done look
like") → the live Hall vote board (asks pile into topic "parties"; the tutor
works the room hottest-first) → exit summary with a concrete next step.
**Parents do not buy tutoring; they buy certainty that something happened.**
No local competitor and none of the big marketplaces hand the payer a
per-session record of what got done, what's left, and what the tutor
recommends. This is the retention engine, the dispute defense, and the thing
to demo in every sales conversation. It costs us nothing incremental — it's
exhaust from running sessions well.

### 6. Parent control — sellable convenience
The payer can create the teen's profile, book on their behalf, and see every
session's outcome without nagging the kid. "You can run this without fighting
your teenager" is a real differentiator against every tutor marketplace that
assumes the student manages their own tutoring.

### 7. The AI ladder ($11.99/$24.99) — the bridge, not the headline
Blunt truth: **we cannot sell AI homework help head-to-head against free
ChatGPT**, and we shouldn't try. What's sellable is what wraps it: guardrails
(it won't write the essay), parent-visible mastery evidence, a homework
calendar that builds itself, and escalation to humans. The ladder (Free → AI
Solo $11.99 → AI + Hall $24.99) is a deliberate decoy structure: Solo is the
honest floor, but AI + Hall adds one real $14 Hall visit a month for roughly
the visit's own price, so it's the tier the pricing pages divert to — the AI
subscription's actual job is to put a human session in the family's month.
Its other commercial jobs: (a) make $79 feel like *daily* value instead of 8
visits, (b) generate the tutor briefs that make group sessions feel personal,
(c) free-tier lead capture. Never the hero of an ad.

### 8. The free Community Hall — a marketing budget, honestly labeled
~$25/week of tutor cost — call it a hundred a month — for a perpetual,
zero-risk trial and the single best answer to "is this legit?" Guard it from
cost-cutting; its KPI is first→second conversion, not revenue.

### 9. Later, not day 1: bulk inventory (B2B2C)
PTAs, homeschool co-ops, and schools buying seat blocks or membership bundles.
The schema supports it (house pricing, series, seats); the sales motion is a
different job. Open these conversations in month 2 with data from months 0–1.

**What is *not* sellable right now — stop pretending:** the AI pitched
head-to-head against free chatbots (the ladder exists, but it sells as the
club's between-sessions layer — AI + Hall's bundled visit is what closes, not
the model); SEO as a near-term channel (domain has no authority; write for
conversion, not volume); anything to under-13s (deliberate scope line, don't
fudge it); direct-to-teen selling (teens don't hold the card — they're the
users, parents are the buyers).

---

## Part 2 — Service by service: failure modes and day-1 mitigations

### Homework Hall

**P1. The value-perception gap.** A parent who hears "tutoring for $14"
and discovers 1:8 shared supervision feels baited. This is the #1 refund and
bad-review generator if mishandled.
- `BUILT` Every surface says it plainly: "shared supervision, priced like
  it"; the pricing page explicitly contrasts it with private tutoring.
- `OPS` Sales language from day 1: sell it as *structured study time with a
  professional on call* — the comparison is a supervised study hall with a
  coach, never "cheap tutoring." Scripts for the founder and every tutor.

**P2. The empty-room cold start.** A Hall with one kid feels like a failed
party; a cancelled Hall burns trust permanently. Empty inventory also
advertises that nobody comes here.
- `BUILT` Halls run at min_seats=1 (only clinics have min-fill); the public
  schedule hides sold-out rooms and shows seats left, not seats empty.
- `OPS` Concentrate inventory: open **fewer time slots than demand suggests**
  (start 4/5/6 PM Mon–Thu, not the full grid) so rooms look busy; seed the
  first two weeks with founder-recruited families; expand slots only when
  seats/tutor-hour ≥ 4 (the admin metric exists for exactly this decision).

**P3. No-shows on cheap/included seats.** $14 stakes → flaky attendance →
demoralized tutors and dead-looking rooms.
- `BUILT` Reminder emails; attendance is recorded per seat; included visits
  are consumed at booking and only returned on timely cancellation (≥12h),
  so a no-show costs the visit; no-show rates surface in admin metrics.
- `OPS` Say the visit-consumption rule out loud at booking and in the
  confirmation email tone; call (not email) any family after their second
  no-show — it's a churn signal, not a discipline problem.

**P4. Homework variance.** A student arrives with nothing to do, or with AP
Latin that the on-duty tutor can't help with.
- `BUILT` Structured intake at booking tells the tutor what's coming before
  the room opens; the AI brief gives per-student weak spots to fall back on.
- `OPS` Day-1 tutor training: the "no homework" playbook (pull up the
  intake goal, review the week's mastery gaps, prep the next test). A Hall
  tutor's job is triage and momentum, not subject mastery of everything.

**P5. Thin economics at low fill.** Two retail seats barely cover the $25–30
tutor cost. Real margin starts at seat 4.
- `BUILT` Seats/tutor-hour and occupancy-by-kind are on the admin dashboard,
  computed live; capacity is capped at 8 per tutor *by policy* so margin is
  never bought with quality.
- `OPS` Weekly schedule review against those two numbers. Kill or merge
  low-fill slots without sentiment. Accept Hall as a loss-leader **only**
  when the same family's membership or 1:1 revenue carries it — that's what
  the first→second conversion metric is for.

### Subject Clinics

**P1. The min-fill failure loop.** A clinic that cancels for low enrollment
refunds cleanly (built) but still teaches the family "this place cancels."
Two or three cancellations and the brand is "the flaky one."
- `BUILT` Min-fill is disclosed up front at booking ("runs once N join"), the
  refund is automatic and full, and confirmation state is visible.
- `OPS` Founder concierge for the first month: when a clinic has 1 seat two
  days out, personally rally the 2nd (call the Hall regulars whose exit
  summaries flagged that topic). If it still doesn't fill, **run it anyway**
  and tell the family they got a private session for $30 — tutor cost is
  sunk and the story is a gift. Cancel-for-low-fill should be a scale-era
  policy, not a launch-era one.

**P2. Topic-market mismatch.** We guess "Essay Writing"; the family needs
"Mrs. Alvarez's AP Bio unit 4 test on Friday."
- `BUILT` The demand signal already flows in: Hall intake names subjects and
  assignments; exit summaries carry "recommend clinic" flags; briefs
  aggregate weak concepts per room.
- `OPS` Schedule clinics **from observed demand only** — every clinic on the
  calendar should trace to intake/exit-summary evidence or a school-calendar
  event (midterms, finals, AP season). Generic evergreen clinics: zero.

**P3. Ladder confusion.** Parents can't tell Hall vs Clinic vs 1:1 at a
glance, and confused people don't buy.
- `BUILT` The storefront is problem-based ("I have a test coming up" → the
  right product), and the Level 0–3 ladder with prices sits on /tutoring.
- `OPS` One sentence, everywhere, verbatim: *Hall is where homework gets
  done, Clinics are where a topic gets fixed, 1:1 is when your kid needs a
  tutor to themselves.* Consistency is the mitigation.

### Private 1:1

**P1. Commodity with a trust deficit.** Wyzant/Varsity have thousands of
reviews; we have zero. Same product, unknown brand, minors on video.
- `BUILT` First session free (redemption-guarded); flat transparent pricing
  (same price for every tutor — removes the comparison-shopping anxiety);
  a reviews system; honest vetting language ("interviewed and approved by
  our team" — never "background-checked" unless true, and the copy test
  enforces that).
- `OPS` Founder watches or debriefs every first-free session in weeks 1–4;
  target: 10 authentic reviews on tutor profiles in the first month. Until
  then, the free session *is* the review.

**P2. Disintermediation — this WILL happen.** Parent pays $60/hr; the tutor
receives $22–30. A $45 Venmo deal beats both sides' math after session two.
House pricing makes our take visible and, at scale, resented.
- `BUILT` Booking, payments, refunds, scheduling, video, and the evidence
  ledger all live on-platform; membership rates ($44–50/hr) narrow the gap a
  side-deal can offer; repeat-pair activity is visible in the data (a pair
  that books twice then goes silent is the leak signature — admin metrics
  make it findable).
- `OPS` Three moves from day 1: (a) a tutor agreement with a plain
  non-circumvention clause signed at activation (needs counsel, cheap);
  (b) make the *tutor's* retention math work — introduce a loyalty rate
  (e.g. $35/hr for a retained recurring pair) so the platform keeps a slimmer
  cut instead of losing the pair entirely; sealing a leak is cheaper than
  acquiring a family; (c) never punish the family — win by being worth it
  (summaries, easy rebooking, refunds), not by policing.

**P3. Quality variance on the free first session.** One meandering session =
one churned family, at our expense.
- `BUILT` Vetting pipeline with explicit activation gates; reviews; admin
  can pause a tutor in one click; session states make no-shows visible.
- `OPS` A 20-minute mock session with the founder is the last activation
  gate for every tutor (it's in the runbook — treat it as unskippable).
  Deactivate fast and kindly on the first bad signal; a small excellent
  roster beats a large mixed one at this stage.

**P4. Availability sparsity.** Tutors post one-off slots (known gap: no
recurring availability). A parent who finds no bookable times doesn't come
back to check.
- `BUILT` Profiles show next open times; the booking sheet degrades
  gracefully ("no open slots right now").
- `OPS` Supply-side rule from day 1: every active tutor keeps ≥6 posted
  slots/week in the 4–8 PM band, or gets a nudge then a pause. Concentrate
  1:1 supply in the same after-school window as the group schedule so the
  brand means "after school, they're there." Recurring availability is the
  first engineering follow-up (already top of LAUNCH_GAPS).

### Memberships

**P1. Gym-membership guilt churn.** Unused visits → guilt → month-2 cancel.
This is THE churn mechanic in every visit-based membership.
- `BUILT` Included visits reset monthly — no banked rollover, so no
  stored-value balance ever exists (counsel item 12); a bad week is absorbed
  by a discretionary grace-visit courtesy (an admin ledger credit, not an
  entitlement — the copy says "ask us", it never promises); the parent
  monthly summary email shows usage and wins; the billing portal cancels in
  two clicks (no retention dark patterns — cheaper reputationally and
  legally).
- `OPS` Watch the member-utilization band in admin (target 60–80%). Under
  50% by mid-month = a personal "want me to book Tuesdays for you?" note —
  concierge the habit, don't discount the price. Grant the grace visit
  person-to-person as a courtesy, never as a promised rollover — the moment
  it's promised it becomes stored value. And keep selling *down* honestly
  (the pricing page already says "if you only need us before the occasional
  test, don't join") — it converts fewer, churns less, and builds the reviews
  that convert the rest.

**P2. Commitment anxiety at $79.** Parents have been burned by tutoring
contracts before.
- `BUILT` Month-to-month, cancel-anytime, à-la-carte-forever is in the copy,
  the terms, and the actual Stripe behavior; "membership wins on math"
  calculators sit on the landing, /tutoring, and pricing pages.
- `OPS` Don't lead with membership. Sequence: free Hall → paid Hall or first
  free 1:1 → *then* the membership pitch, ideally after the math is visible
  in their own usage ("your four Halls last month cost more than Club at
  $45"). Hold the hard membership push until ~20 families have attended
  something.

**P3. The summer cliff.** School-year product; June–August demand collapses
and annualized churn spikes.
- `BUILT` Nothing specific (schedule engine can host any session type).
- `OPS` Decide the summer play in **April**, not June: a pause option
  (Stripe subscription pause — one config change, far cheaper than a
  cancel), plus a summer catalog (SAT/ACT clinics, "stay sharp" halls). Set
  expectations in renewal emails so the pause feels like a feature, not a
  loophole.

**P4. Bundled AI that nobody values.** "Full AI study companion" is a bullet
parents skim past.
- `BUILT` The monthly parent summary makes the AI's work visible (mastery
  movement, homework kept on calendar); the tutor briefs quietly improve the
  human sessions.
- `OPS` Sell the *evidence*, not the AI: "you'll get a note after every
  session and a report every month." The word "AI" appears in our pitch as
  the how, never the what.

### The AI companion (free tier, AI ladder, and bundled)

**P1. "ChatGPT is free."** Correct, and unwinnable on capability.
- `BUILT` The differentiators are structural: it won't do the work
  (integrity guardrails, enforced by prompts and copy tests), it produces
  parent-visible mastery evidence, it escalates to humans, and it's tied to
  the real tutoring layer no chatbot has.
- `OPS` Positioning discipline: never in an ad as "AI tutoring." It's the
  between-sessions layer of an academic club, and the ladder is built to
  steer to AI + Hall, where a real visit closes the loop. The moment we
  market the model itself, we invite the comparison we lose.

**P2. Teens route around it.** Path of least resistance is pasting homework
into a chatbot that just answers.
- `BUILT` The companion owns the logistics teens actually want handled
  (syllabus → calendar, what's-due-now), which answer-machines don't; Hall
  and 1:1 sessions feed follow-ups back into it.
- `OPS` Let tutors assign it ("run the review deck before Thursday") — the
  human relationship is the adoption channel, not app notifications.

**P3. COGS discipline.** Free-tier token costs can quietly eat the margin.
- `BUILT` Per-plan entitlements and daily/monthly caps, live metering,
  expensive-model kill switch, per-feature cost tracking in admin.
- `OPS` Review AI cost per active free user monthly; the free tier's job is
  lead capture, and its budget should be judged as CAC, not COGS.

### Free Community Hall

**P1. The freeloader equilibrium.** Families who come free forever and never
convert. (Mostly fine — they're the referral engine — but capacity isn't
free.)
- `BUILT` First→second-session conversion is computed in admin; capacity 30
  with one tutor is the current shape.
- `OPS` Its KPI is conversion and word-of-mouth, period. When attendance
  passes ~12, schedule a second parallel community room (multi-tutor rooms
  are a known schema gap — two rooms is the workaround). Never let quality
  dilution be the free tier's first impression.

**P2. Safety surface.** A free, low-friction room full of minors and one
adult is the highest-risk surface we operate, and one incident is
existential.
- `BUILT` 13+ floor with birth-year gating, guardian consent gates before
  any live video, vetted-tutor-only visibility, in-session "report a
  concern" wired to the safety queue, sessions not recorded (stated), admin
  triage with pause switches.
- `OPS` Day-1: a written incident runbook (who acts, within what hour), tutor
  moderation training before their first community shift, and general +
  professional liability insurance quoted **before** the first paid week.
  This is also counsel items 10–15 — the one gate I would not soften.

### Parent accounts / the family flow

**P1. The two-audience funnel.** The teen finds us but can't pay; the parent
pays but can't drag the teen. Either half alone stalls.
- `BUILT` Both entries exist: parent-first (/family creates the managed teen,
  books on their behalf, consent recorded at creation) and teen-first
  (self-signup with guardian email + emailed consent approval).
- `OPS` Market to each in their own channel with their own sentence — parents:
  "you can set this up in five minutes without your kid's cooperation";
  teens (via the free hall): "bring your homework, it's free on Fridays."

**P2. The 13+ line.** Grades 2–7 are the biggest homework-help market and we
deliberately don't serve them (COPPA posture).
- `BUILT` The line is enforced at signup and stated on every page.
- `OPS` Do not fudge it for a paying parent, ever — one under-13 exception
  is a federal-exposure decision made by a salesperson. Revisit as a real
  roadmap item (parental-consent architecture) only when revenue funds the
  compliance work.

---

## Part 3 — Cross-cutting commercial risks

**The cold-start chicken-and-egg.** No tutors → no schedule → no families →
no tutor hours. Sequence supply first: 5–8 activated tutors and a *small*
dense schedule before any marketing dollar. The free hall is the demand
magnet; the founder is the first growth channel. `BUILT`: the whole admin
staffing/series console. `OPS`: don't open more inventory than you can make
look busy.

**CAC reality.** Paid acquisition for tutoring runs $50–150 per family against
a $14 first purchase — underwater unless membership conversion is proven.
Day-1 channel plan is deliberately unpaid: school-adjacent flyers, library and
PTA partnerships, teacher referrals (comp them clinic seats), and the free
hall as the standing offer. Turn on paid only when admin shows first→second
≥ 40% and a member LTV that clears that CAC with margin.

**Tutor classification.** We set prices and schedules for contractors — the
classic misclassification pattern. Mitigations from day 1: counsel-reviewed
tutor agreement (session-fee framing, no exclusivity, tutors control teaching
method), don't dictate *how* they teach (the brief is decision support, not a
script), and keep the W-9/1099 hygiene from tutor #1 (it's in LAUNCH_GAPS —
manual is fine, missing is not).

**Chargebacks and disputes.** Parents dispute subscriptions they forgot.
`BUILT`: honest cancel flow, emailed receipts, generous stated refund windows,
and — quietly powerful — attendance records plus exit summaries as dispute
evidence ("here is what your student did in the session you're disputing").
`OPS`: answer every dispute with the ledger; refund fast when we're even
half-wrong; a <5% refund rate is a health metric on the admin dashboard.

**Founder bandwidth is the real constraint.** Every `OPS` line above is
founder hours. The weekly operating review is five numbers, all already on
the dashboard: seats per tutor-hour (≥4), first→second conversion (≥40%),
member utilization (60–80%), no-show rate (<15%), refunds (<5%). If a week is
too busy for anything else, look at those five and do the one thing the worst
number implies.

---

## Part 4 — What to sell first (sequencing, day 1 → month 2)

1. **Weeks 1–2: trust, not revenue.** Free Community Hall + first-free 1:1 +
   à-la-carte Halls. Goal: 20 families attended, 10 reviews, zero incidents.
   No membership push yet — a $79 ask with no social proof burns the list.
2. **Weeks 3–4: the membership pitch, aimed.** Pitch Plus only to families
   with 2+ paid visits, using their own math. Founding-family framing (price
   locked, not discounted). Clinics appear only attached to real test dates
   sourced from intake data.
3. **Month 2: widen.** PTA/co-op seat-block conversations with month-1 data;
   second wave of tutors only when seats/tutor-hour holds ≥4; consider paid
   acquisition only if conversion metrics clear the bar above.

The one-sentence version of this whole document: **sell steady presence to
parents (membership), use the $14 Hall and the free hour to start the habit,
let the evidence ledger do the retaining, keep the AI in the supporting cast,
and spend founder time where the five dashboard numbers say the machine is
leaking.**
