<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609121600-manny-asymmetric-mastery-credit.md -->

---
id: 202609121600
title: Practice can reach mastery, but the asymmetry must make it irrational
tags: [manny-said, kaizen, evidence-model]
sources: [iMessage 2026-09-12 16:00 CDT]
project: kaizenai-saas
---
# "Make it so asymmetrical that it's always better to go the other ways"

Manny, 2026-09-12 16:00 CDT, iMessage, answering whether weighted practice alone can ever reach `mastered`
(A: never · B: yes):

> "B, but bar is sooo high that it takes crazy time, but I do believe if you practice basics long and all the time like crazy hours it will help master, but make it so asymmetrical that it's always better to go the other ways that produce better results"

He rejected the PM's recommendation of A, and for a reason worth keeping: he believes sustained
deliberate practice **does** produce mastery, and a record that denies that is lying in the other
direction. What he wants is an incentive gradient, not a locked door.

## The calibration drafted against it (sent to him 2026-09-12 16:00 CDT for a check on the numbers)
Mastery = **3.00 credits** on a skill.

| Route | Credit | Conditions | Fastest honest path |
|---|---|---|---|
| Independent demonstration | 1.00 | unassisted, unfamiliar item, **≥48 h** since the last relevant instruction on that skill; ≥2 separate sessions on different days; ≥2 contexts; second check around day seven | ~8-9 days |
| Practice (homework help + corrections practice) | 0.02 | correct and hint-free within the attempt; capped 3/day/skill; practice-only credit decays 10%/week until an independent demonstration confirms it | ~12 weeks of maximum clean practice, ~250 reps |

Arithmetic behind the practice path: 0.06/day = 0.42/week against 10%/week decay gives a ceiling of
4.2 credits, and `3.0 = 4.2(1 − 0.9^n)` → **n ≈ 11.9 weeks** of *daily* maximum clean practice. The
door is open and costs roughly 250 reps over three months against 3 demonstrations over eight days.

**Provenance is stored with the credit:** the record distinguishes *proven independently* from
*earned through sustained practice*. Same mastery, different label. That keeps the claim externally
defensible — we never have to misdescribe how a skill was certified — and keeps the asymmetry honest
rather than hidden, which matters because the whole product rests on the record meaning something.

**What still has to be built before this is real:** the tutor-authored-check bypass
(`turn/engine.ts:447–471` → `checks/prompt.ts:124–139` → `checks/service.ts`, no item ID) would let
the model mint credits of either kind. Under a weighted model it is a beta blocker.

Related: [202609121557-manny-weighted-practice-evidence](202609121557-manny-weighted-practice-evidence.md) ·
[202609121555-manny-homework-is-the-hook-understanding-is-the-mission](202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md) ·
[SPEC](../../product/spec.md)

## Correction and open conflict — 2026-09-12 16:02 CDT

**Correction:** the delay was drafted as >=24 h. The inherited engine specification already requires
**>=48 h** since relevant instruction, plus repeated evidence across multiple contexts
(`shared/repos/Kaizen-AI/docs/ENGINE.md:44`, verified by Astra). The table above is corrected, and Manny
was told directly, since he had already been given the 24 h figure.

**Open conflict, put to him rather than smoothed over.** Astra's wedge re-plan (W2,
`shared/artifacts/astra-plan-20260912/wedge-replan.md`) recommends the opposite of his ruling:
homework is the unscored diagnostic **and practice never earns mastery credit at any weight**, because
commercial pressure always favours a fuller-looking report and a certifiable assisted path destroys the
audit trail. Its instruction to the PM: *"If B means mastery credit, identify an explicit conflict with
the law; do not resolve it through softer dashboard wording."*

**What Astra did not connect, and what supports Manny:** its own design has a *daily-homework trap* --
every teaching event restarts the 48 h eligibility clock, so a learner helped every night may never
become eligible for an independent check. Under Astra's rule that learner can never certify anything.
Under Manny's weighted practice they can, slowly. Those learners are precisely the ones his wedge
recruits. The conflict is real but not one-sided, and it was presented to him that way.
