<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609121610-manny-repair-friction-and-the-parent.md -->

---
id: 202609121610
title: Two-minute repair inside the homework, escalate to the parent, keep the kid in flow
tags: [manny-said, kaizen, product]
sources: [iMessage 2026-09-12 16:10 CDT]
project: kaizenai-saas
---
# "Then we are at the mercy of the kid lol"

Manny, 2026-09-12 16:10 CDT, iMessage, answering grill Q2 — the learner takes the homework help and skips
every repair step; what friction may we add (A: a ~2-minute learner step inside the homework ·
B: a separate weekly repair session · C: none):

> "I like A do that, and nudge to B when it gets “out of hand” and suggest parent we need to spend real time on learning and attention is needed, the parent is the only responsible person we have for the lids attention, but try to make it fun or interactive and not boring and simulating for their intellect so flow state is being maintained most of the time, parent for liability and we use them as a resource as well, and yes then we are at the mercy of the kid lol"

## What this sets
- **A is the default:** a short repair step lives *inside* the homework session, not beside it.
- **B is an escalation, not a tier:** when skipping gets "out of hand" we propose the separate
  repair session **to the parent**, framed as real learning time that needs their attention.
- **The parent is the accountable party for the learner's attention** — for liability and as a
  resource we can actually use. That is a design input, not just a billing fact.
- **The repair step must not feel like homework twice.** Fun, interactive, intellectually
  stimulating, flow maintained most of the time. A boring repair step is a failed repair step.
- **He accepts the residual risk plainly:** "then we are at the mercy of the kid." Nothing in the
  design pretends we control a teenager's willingness.

## What has to be built or measured because of it
- A trigger for "out of hand" that is defined before launch, not improvised: repairs offered vs
  attempted vs completed per learner per week, with the escalation firing on a stated threshold.
- Parent escalation copy that asks for attention without blaming the learner or promising grades.
- Flow as an observable: session abandonment, time-to-disengage, and whether the repair step gets
  completed once started — not a self-reported enjoyment score.
- This is the behavioural half of [ADR-0042-practice-buys-the-exam-seat-never-the-grade](../../decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md):
  the repair step is where practice reps come from, and practice is what earns the exam seat. A
  learner who never repairs never certifies, so repair participation is a leading indicator for
  the whole evidence model.

Related: [202609121555-manny-homework-is-the-hook-understanding-is-the-mission](202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md) ·
[DIRECTION](../../product/direction.md)
