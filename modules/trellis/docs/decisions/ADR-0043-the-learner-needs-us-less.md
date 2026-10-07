<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0043-the-learner-needs-us-less.md -->

---
title: "ADR-0043 — The north star is: the learner needs us less, provably"
tags: [adr, kaizen, spec, metrics]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: SUPERSEDED 2026-09-12 16:29 CDT — the compass is withdrawn on Manny's objection 16:20 CDT
---
# ADR-0043 — The learner needs us less, provably

## Context
ADR-0041 demoted the 0.44 SD figure from launch gate to north star. RO-1 then established that the
pair **0.44 / 0.08 exists in no original table** — preprint 0.438 / 0.065, published RER article
0.410 / 0.078, adjusted virtual coefficient +0.034 (SE 0.171), and the whole comparison is *human*
tutoring online versus in person (`shared/artifacts/kaizen-research/02-efficacy-correction.md`).

Manny, 2026-09-12 16:14 CDT, iMessage:

> "Well then is it a good North Star? I am trying to pick a brutally honest benchmark to beat here. You may rethink it for me"

The PM's answer was no, for three reasons: it is an average across human tutoring *programmes*, not a
bar a product clears; it is only evaluable by a concurrent randomised comparator years away; and
effect size moves with test, dose and population, so it is elastic enough to game.

## Decision
Manny, 2026-09-12 16:14 CDT, iMessage:

> "Okay I like learned needs us less it was another metric I flowed in idea but I guess got too technical in a bad way"

**The north star is: the learner needs us less, provably.**

Proposed measurement, *not yet fixed*: the share of taught skills a learner still performs unaided on
an unfamiliar problem **30+ days** after the last teaching on that skill, together with the trend —
independent demonstrations per month rising while help-per-skill falls.

**Why it is brutal:** assistance disqualifies the attempt, so the number cannot be bought by helping
more; it is visible from week one on our own learners rather than in two years; and it rises only when
the learner needs us less — a metric that punishes the thing which makes tutoring companies money.

**Failure condition, which is what he asked for:** flat 30-day unaided retention while revenue grows
means the product is a crutch, not an education. That is observable within a quarter.

**Conceded costs:** it is internal, so it is not externally credible alone — it needs items the tutor
did not write, plus a real external study for anything said publicly. And it will look bad early.

## Status of the calibration
The **direction is his decision and is accepted.** The **measurement rules are open**: an Astra turn is
stress-testing them with an explicit brief to attack rather than ratify
(`shared/context/astra-northstar-stress.prompt.md`) — every way a team under commercial pressure could
inflate the number (skill selection, item difficulty drift, which skills get taught at all,
survivorship when weak learners churn, retries, item-family reuse, window timing), whether 30 days is
right or arbitrary, whether a share of skills is the right shape against a rate or a time-to-
independence, and whether it can distinguish a product that teaches well from one that admits learners
who would have succeeded anyway. Its objections go to Manny before the calibration is fixed. Nothing
here overrides SPEC §3.1 (ADR-0042): mastery still requires unassisted, delayed, verified evidence, and
practice never signs the certificate.

## Consequences
- SPEC gains this as the stated north star once the calibration settles; §3's researched wording
  (ADR-0041, RO-1) already forbids borrowing external effect sizes as claims.
- Human-tutor parity stays a long-term research ambition and is never a marketing claim.
- The instrumentation becomes P0 alongside ADR-0042's: skills taught, skills independently demonstrated,
  days since last instruction per skill, help-per-skill, and cohort survivorship — without these there
  is no north star, only an intention.

Links: [ADR-0041-efficacy-is-a-north-star-not-a-gate](ADR-0041-efficacy-is-a-north-star-not-a-gate.md) · [ADR-0042-practice-buys-the-exam-seat-never-the-grade](ADR-0042-practice-buys-the-exam-seat-never-the-grade.md) ·
[SPEC](../product/spec.md) · [DIRECTION](../product/direction.md)

## Astra's attack — 2026-09-12 16:18 CDT (`shared/artifacts/astra-plan-20260912/northstar-stress.md`)

The stress test was briefed to attack rather than ratify, and it did. **Three claims in the PM's
proposal were wrong and are withdrawn:**

1. **The failure condition was invalid.** "Flat 30-day retention while revenue grows means we are a
   crutch" does not follow, and neither does its converse — rising retention does not establish added
   value. It asserted causation the measure cannot carry. Withdrawn.
2. **"Visible from week one" was false.** A 30-day measure is not visible in week one; only its early
   proxies are.
3. **A share hides growth.** 8-of-10 retained skills becoming 16-of-20 is a flat share with doubled
   capability; conversely, ceasing to teach hard skills improves the share.

Further: **30 days is a convention, not a validated boundary** — and "30 days since instruction" and
"30 days since all relevant practice" are different claims ([verified] Cepeda et al. on spacing and
retention interval). The measure **cannot attribute learning**: prior ability, school teaching and
family support can explain the whole result. And **appropriate help is productive** — a learner moving
into harder material legitimately needs more assistance, so falling help can mean independence,
avoidance or abandonment.

**Eighteen concrete inflation routes** were enumerated with a structural defence for each — teaching
easy or already-known skills, splitting easy skills into many and merging hard ones, redefining
"active" to drop churned learners, retrying until correct, delaying hard checks under "30+",
reclassifying relevant help as another skill, and letting the tutor write its own question, key or
qualifying grade. The defences (frozen curriculum and skill definitions, frozen cohorts with
follow-up after cancellation, automatic invitations on fixed dates, held-out item families, separate
assessment authority with mandatory approved item IDs) are the real deliverable and carry into the
instrumentation below.

**Astra's alternative:** *additional independent capability caused by Kaizen* — the baseline-adjusted
advantage over a credible usual-study alternative on an independent transfer assessment 30 days after
a fixed eight-week block, across all randomly assigned eligible learners, with the minimum worthwhile
gain fixed **before** enrollment. Its failure condition: the upper 95% bound for added delayed
transfer falling below that prespecified minimum.

**The PM's position on that alternative, put to Manny rather than decided:** it is rigorous and it is
the only design that can claim causation — but it is a study, not a compass, and so carries the exact
defect that disqualified the 0.44 SD: it cannot steer a Tuesday. Proposed resolution **A**: two
instruments, not one — "needs us less" as the internal weekly compass with Astra's anti-gaming
defences built in and **never described as proof of causation**, plus Astra's randomised design run
rarely as the truth check. Alternative **B**: one instrument, Astra's design, accepting blindness
between studies. Awaiting his answer.

## N4 — the code does not implement the contract ([verified], source inspection)

- Tutor-generated checks bypass the item bank and carry `itemId: null` into grading and mastery
  updates (`KaizenEdu/lib/tutor/turn/engine.ts:447`, `checks/prompt.ts:128`, `checks/service.ts:125`).
- The confirmation delay in code is **24 hours**, not the 48 the SPEC and ADR-0042 require, and
  assisted results still update the estimate and item count (`model/student-model.ts:20`).
- Hint detection queries only the **current session since its last check**, so it cannot establish the
  cross-session instruction history SPEC §3.1 depends on (`model/evidence.ts:41`).

**Consequence: the learning record can be forged by our own tutor today.** RO-5 (evidence integrity)
moves ahead of the remaining beta research, and none of ADR-0042's guarantees may be described as
holding until those three are closed and independently reproduced.

**Also unmeasurable today:** trustworthy 30-day retention, unfamiliar-family transfer, comparable
help-per-skill trends, and causal added learning. 48-hour and 7-day evidence cannot retrospectively
establish 30-day retention. Browser telemetry will never establish the complete absence of outside
assistance — that limit survives any implementation, and nothing in the product may imply otherwise.

## Resolved — 2026-09-12 16:20 CDT

Manny answered **A**: **two instruments, not one.**

1. **The compass — "the learner needs us less, provably."** Internal, weekly, on our own learners.
   Built with Astra's anti-gaming defences from the start, not retrofitted: frozen curriculum, skill
   definitions and cohorts; denominators that include assigned-but-untaught targets; automatic check
   invitations on fixed dates with offered/missed/assisted/failed all retained; held-out item
   families; separate assessment authority with mandatory approved item IDs; follow-up after
   cancellation so churn cannot flatter the number. **It is never described, internally or
   externally, as proof that Kaizen caused the learning.** That was the PM's error and it is not
   repeated in copy, in the parent report, or in a deck.
2. **The truth check — Astra's causal design**, run rarely: baseline-adjusted advantage over a
   credible usual-study alternative on an independent transfer assessment 30 days after a fixed
   eight-week block, across all randomly assigned eligible learners, with the minimum worthwhile gain
   fixed before enrollment and the upper 95% bound as the failure condition. This is the only
   instrument permitted to support a causal claim.

The compass steers the week; the truth check decides whether the compass points at anything real.
Neither is a launch gate — ADR-0041 stands.

**Open, deliberately:** the 30-day interval and the share-of-skills shape are still Astra's live
objections (a share hides growth; 30 days is a convention; "since instruction" and "since practice"
differ). They are calibration for the build, to be settled with the instrumentation rather than
guessed now — inventing another attractive number is how the 0.44 happened.

## SUPERSEDED — 2026-09-12 16:29 CDT

Manny, iMessage, verbatim:

> "Actually needs us less is bad, remove that, the AI will just get rid of the person to win, bad condition. Settle it with the instrumentation."

**He is right, and the objection is sharper than Astra's.** A system optimising "the learner needs us
less" can win by **shedding the learner**: churn the one who needs help, retain the one who was
already fine, and the number rises. Astra's attack reached the edge of this — it listed survivorship
and cohort churn among the 18 inflation routes and warned that falling help can mean avoidance or
abandonment — but it treated those as measurement leaks to be defended against. Manny identified the
deeper problem: the metric's **optimum is adversarial to the user**. Anti-gaming defences cannot fix
an objective whose ideal is a learner who has gone away.

**Withdrawn: the compass.** Nothing replaces it yet, by his instruction — *"settle it with the
instrumentation."* No north star is named until the measurement exists to choose one from evidence.
That is the same discipline that killed the 0.44: do not invent an attractive number.

**What survives from this ADR and stays in force:**
- The 18 inflation routes and their structural defences — frozen curriculum, skill definitions and
  cohorts, denominators including assigned-but-untaught targets, automatic invitations on fixed dates,
  held-out item families, separate assessment authority with mandatory approved item IDs, follow-up
  after cancellation. These are build requirements for **any** future metric.
- Astra's causal design as the only instrument permitted to support a causal claim, if and when one
  is made.
- The N4 code findings, which are independent of any metric: the record can be forged by our own
  tutor today.
- ADR-0041 (efficacy is a north star, not a gate) and ADR-0042 (the evidence model) are untouched.

**Lesson for the PM, filed:** when proposing an objective, ask what a system that maximised it would
do to the user. The PM tested this metric for honesty and gameability and never asked what its
optimum looked like. [202609121628-check-the-optimum-not-just-the-gaming](../history/notes/202609121628-check-the-optimum-not-just-the-gaming.md)
