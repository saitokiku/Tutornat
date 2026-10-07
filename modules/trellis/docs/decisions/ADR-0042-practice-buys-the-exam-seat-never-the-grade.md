<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md -->

---
title: "ADR-0042 — Practice buys the exam seat, never the grade"
tags: [adr, kaizen, spec, evidence-model]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: accepted (confirmed by Manny 2026-09-12 16:07 CDT)
---
# ADR-0042 — Practice buys the exam seat, never the grade

## Context
Manny's wedge is homework help ([202609121555-manny-homework-is-the-hook-understanding-is-the-mission](../history/notes/202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md)),
which is assisted work, while the mastery law counts only unassisted, delayed, verified evidence.
He first ruled that weighted practice **could** certify a skill if the asymmetry were brutal
([202609121600-manny-asymmetric-mastery-credit](../history/notes/202609121600-manny-asymmetric-mastery-credit.md)). Astra's re-plan argued the opposite:
practice must never earn mastery credit at any weight, because commercial pressure always favours a
fuller-looking report, and a certifiable assisted path destroys the audit trail
(`shared/artifacts/astra-plan-20260912/wedge-replan.md` W2).

Astra's own design carried a defect it did not connect: a **daily-homework trap** — every teaching
event restarts that skill's 48 h eligibility clock, so a learner helped every night never becomes
eligible for an independent check and can never certify anything. Those learners are precisely the
ones the wedge recruits. Both positions were put to Manny with that asymmetry made explicit.

## Decision
Manny, 2026-09-12 16:04 CDT, iMessage, verbatim:

> "Yeah fine B) take astras line I understand, but implement what I'm trying to do too in a safe way no trap"

**Practice never earns mastery credit.** Mastery requires unassisted, delayed, verified evidence and
nothing else. **And practice earns access to the assessment**, which is how his intent is honoured:

1. **Scoped clock.** Only instruction on *that* skill restarts *that* skill's 48 h eligibility clock.
   Help on any other skill never touches it.
2. **Practice earns a quiet window.** 10 clean, hint-free practice reps on a skill (homework-derived or
   corrections practice) give it priority for a *quiet window* — a scheduled interval in which we
   deliberately do not teach that one skill, while helping freely with everything else.
3. **The check is offered the moment it is eligible**, not when convenient. Practice is what places it
   in the queue and keeps it there.
4. **No silent trap.** If homework keeps landing on that skill and no quiet window can be taken within
   14 days, the parent is told plainly — "we cannot certify this while we are helping with it nightly,
   here is the plan." A learner never sits permanently ineligible without anyone saying so.
5. **Practice is visible progress.** It appears in the parent report with its own weight and is kept in
   the record with its provenance. It never contributes to the mastery threshold.

The 10-rep and 14-day figures were chosen by the PM and flagged to him as the PM's own numbers.

## Consequences
- Supersedes the calibration in [202609121600-manny-asymmetric-mastery-credit](../history/notes/202609121600-manny-asymmetric-mastery-credit.md): the 0.02
  credit, the 3.00-credit practice path and the 10 %/week decay are withdrawn. That note stands as the
  record of the reasoning, not as the design.
- The delay rule is **>=48 h** since relevant instruction, with repeated evidence across at least two
  contexts, per the inherited engine specification (`shared/repos/Kaizen-AI/docs/ENGINE.md:44`) — not
  the 24 h the PM first drafted.
- SPEC gains an evidence-model section under this ADR. `evidence_event` carries a class
  (assisted-help, corrections-practice, unassisted-attempt, delayed-retention) and only a restricted
  assessment service may append qualifying evidence; tutoring and report generation cannot.
- **Beta blocker:** the tutor-authored-check bypass (`turn/engine.ts:447-471` -> `checks/prompt.ts:124-139`
  -> `checks/service.ts`, no item ID) would let the model mint qualifying evidence. It must be closed and
  its closure reproduced before a learner sees the product. RO-5 covers it.

Links: [ADR-0041-efficacy-is-a-north-star-not-a-gate](ADR-0041-efficacy-is-a-north-star-not-a-gate.md) · [202609121557-manny-weighted-practice-evidence](../history/notes/202609121557-manny-weighted-practice-evidence.md) ·
[SPEC](../product/spec.md) · [DIRECTION](../product/direction.md)

## Confirmed — 2026-09-12 16:07 CDT

Manny, iMessage, verbatim:

> "Okay I like practice buys the exam seat that allows you to master. I understand your point now. Yes I like here 10 is fine for now we can adjust based on data later"

He accepted the design and the PM-chosen **10 clean reps**, explicitly as a starting value to be tuned
from data. That makes the threshold a **versioned parameter, not a constant**: the rep count, the
quiet-window length and the 14-day escalation each carry a rule version, and every mastery claim
already audits back to the rule version in force (SPEC 3.1). The instrumentation needed to revisit
them — reps to first eligible check, checks offered vs taken, pass rate by rep count, and how often
the 14-day escalation fires — is therefore a P0 measurement requirement, not analytics polish. Without
it there is no data to adjust on, and the number silently becomes permanent.
