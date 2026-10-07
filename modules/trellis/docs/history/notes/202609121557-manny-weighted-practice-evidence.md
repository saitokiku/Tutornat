<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609121557-manny-weighted-practice-evidence.md -->

---
id: 202609121557
title: Homework is the unscored diagnostic, and practice counts at a lower weight
tags: [manny-said, kaizen, evidence-model]
sources: [iMessage 2026-09-12 15:57 CDT]
project: kaizenai-saas
---
# "Equal to corrections practice"

Manny, 2026-09-12 15:58 CDT, iMessage, answering how the week-1 parent report handles assisted homework help
(A: never scored · B: counts as progress · C: the unscored diagnostic):

> "C yes with homework also counting towards progress but a lower weight in our mastery record, equal to corrections practice, practice you do to correct your mistakes"

**The design he has asked for:** the homework is the diagnostic — it finds the gap and is not scored as
mastery — *and* it still registers as progress, at a lower weight, in the same class as corrections
practice (the work a learner does to fix their own mistakes). So the record has weighted evidence
types, not a single binary.

**The ambiguity that had to be resolved immediately**, and was put to him as its own question: can
weighted practice alone ever reach `mastered`? If yes, a learner helped every night accumulates a
certification they never earned unassisted, and the first independent test that contradicts it
destroys the record — the one asset the product claims to own. The PM's recommendation is **no**:
practice moves the visible progress measure, mastery stays gated on unassisted, delayed, verified
evidence. That keeps what he actually wants — the parent sees movement from night one — without
letting assisted work sign the certificate.

**Consequences for the SPEC** (drafted, pending his answer and Astra's W2):
- `evidence_event` gains a weight/class: assisted-help, corrections-practice, unassisted-attempt,
  delayed-retention. Weight is a property of the evidence, not of the skill.
- Two separate readouts: **progress** (weighted, includes practice) and **mastery** (unweighted gate,
  unassisted + delayed only). The parent report shows both and never conflates them.
- The existing engine bypass matters more under this model, not less: `turn/engine.ts:447-471`
  accepts a tutor-authored check with no item ID that `checks/service.ts` can feed into mastery
  (found in Astra's second opinion). Under weighted practice that path must be closed before beta.

Related: [202609121555-manny-homework-is-the-hook-understanding-is-the-mission](202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md) ·
[202609121548-manny-k1-algebra-readiness-conditional](202609121548-manny-k1-algebra-readiness-conditional.md) · [SPEC](../../product/spec.md)
