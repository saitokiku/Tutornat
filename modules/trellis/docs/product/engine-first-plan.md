<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/ENGINE-FIRST-PLAN.md -->

---
title: "Kaizen engine-first plan in KaizenEdu"
tags:
  - kaizen
  - plan
project: kaizenai-saas
created: 2026-09-12
status: sequence accepted; build authorized in ADR-0055; detailed design under review
---

# One learning system, built from its engine outward

**Build in KaizenEdu. Preserve both attempts. Verify the engine through one test website, then design the full frontend, then the backend, then build and qualify the product incrementally with Manny. Deploy later.** Written 2026-09-12 20:57 CDT. Detailed choices below are proposals, not implemented or empirically validated behavior.

The product combines homework help, teaching, organization and an honest learning record. A syllabus, marked homework, practice sheets and teacher documents help establish school expectations, prior attempts, corrections and recurring gaps. The canvas is where the learner works and receives explanations.

## 1. Preserve and isolate

Both clean cached repositories have verified private Git bundles with all locally known refs. Manifest with original HEADs, sizes and checksums: `shared/artifacts/kaizen-preservation/20260912T204831-0500/manifest.json`. These preserve existing cached history, not freshly fetched remote state. Historical credentials may remain in the bundles; they stay private and outside the product tree.

Use a worktree of private `gokumann-pm/kaizenedu` from `shared/repos/gokumann-pm-kaizenedu` under [ADR-0059-product-repo-under-the-pm-account](../decisions/ADR-0059-product-repo-under-the-pm-account.md). Both `saitokiku` repositories are read-only graft sources. This supersedes the earlier instruction to build inside `saitokiku/KaizenEdu`. Classify components as keep, adapt, reference or replace. Proposed folder: **`reference-implementations/`**, divided by origin, with source commit, purpose, provenance/licence, dependency and reuse notes. Preserve the runnable tutor's dependency closure. Check imports, routes, type compilation, package discovery, assets and deployment configuration before moving anything; prove reference code is absent from the application build and public routes. Kaizen-AI remains a source repo, not a second running product. Credential rotation remains open; moving a file cannot rotate a key.

Exit evidence: a reproducible isolated build, retained tutoring behavior, excluded old routes, dependency/licence accounting and rollback to the preserved baseline. No file moves or product builds happened in this turn.

## 2. Define the engine and each feedback loop

First deliverable: block map, input/output contracts, event schema, state transitions and an acceptance matrix. A minimal test interface and persistence adapter support engine verification; full frontend/backend architecture follows later in the order Manny chose.

| Block | Inputs | Outputs and authority |
|---|---|---|
| Document intake | Approved syllabus, assignments, practice, marked work, teacher documents | Source-linked extraction, confidence, corrections, due work and skill mapping; ambiguous extraction requires review |
| Learner state | Attempts, observed assistance, source history and approved skill graph | Revisable estimates and misconception hypotheses with uncertainty; estimates cannot certify |
| Teaching policy | Goal, task, learner state, recent interaction | Next question, explanation, hint, difficulty, pace and representation |
| Teaching execution | Validated text, voice and canvas actions | Coherent interactive step, interruption/resume and durable help/exposure events |
| Independent assessment | Eligible server-issued attempt and reviewed item/key/rubric | Qualifying or nonqualifying evidence under versioned rules; tutor cannot award mastery |
| Planning/reporting | Assignments, estimates, evidence and scheduling rules | Homework plan, repairs, delayed checks, learner/parent report with missing evidence visible |
| Human improvement | Reviewed failures, Manny's feedback and evaluations | Proposed content/policy revisions, evaluated before release; no silent rule changes or automatic training on uploads |

Main cycle: **observe → hypothesize a gap → teach → learner acts → evaluate → update the next action → check independently later**. Homework completion, estimated readiness and confirmed evidence remain separate. A wrong answer creates a hypothesis, not a permanent label; learners can correct inferred context.

Specify five loops: within-session teaching; across-session practice/retention; homework planning/completion; parent/teacher corrections to learner context; and human-reviewed improvements across learners. Each needs an objective, observations, allowed actions, timescale, stop conditions and evidence. Latency, cost and attention constrain the loop; engagement alone is not learning.

Manny's “PID” is preserved as feedback-control intent. A literal PID controller is only a candidate where target, observation, response lag and control action can be defined and tested for stability. The inherited moving average, PFA, Elo-style and half-life approaches are candidates, not a validated integrated engine. Research them against primary sources and simple baselines; select on held-out prediction, learning outcomes, robustness and cost. Record versions and tunable thresholds. A final engine means a stable tested contract and qualified version, not an algorithm frozen forever.

## 3. Verify correctness and teaching quality separately

Use `shared/artifacts/kaizen-research/06-evidence-integrity.md` as the starting evidence. It reports seven reproduced false-mastery classes; this turn did not rerun or fix them.

- Reproduce then close generated/null-ID checks, 24-hour versus 48-hour timing, lost assistance across sessions/checks, assisted credit, duplicate credit under concurrency/crash retry, repeated item families and untrusted/wrong keys. These are grouped classes; the report contains additional individual probes and refuted hypotheses.
- Prove assessment-only qualification, tenant isolation, trusted server time, immutable provenance, replayable reports and positive controls using the actual database engine.
- Exercise ambiguous OCR and markings, wrong hypotheses, interruptions, slow providers, session resumption, failures and duplicate/out-of-order events.
- Compare policies on held-out teaching cases across planned age/ability bands. Measure explanation accuracy, appropriate help, independent performance, repair/frustration behavior, latency and actual text/voice cost. The tutor cannot be the sole judge of its own teaching.
- Have Manny react to small replayable teaching episodes. Independently review questions, keys and scoring; blind technical reviewers reproduce the build evidence. The earlier question about who reviews the first item batch is still open.

Exit evidence: failing-before/passing-after reproductions, passing positive controls, versioned evaluation reports, independent review and SPEC acceptance. Fake clocks verify timing logic, not human retention. The accepted delay/assistance rules remain in force; day-seven windows, context rubrics and scorer rules must be made precise before implementation claims compliance. A passing engine test cannot establish educational efficacy.

## 4. One test website, then frontend architecture

Start with synthetic learner profiles and one local test website: assignment/source, learner action, board, chosen teaching action and why evidence does or does not qualify. Manny can replay the same scenario and compare versions. A shared private preview is a deliberate later deployment step; a branch push must not replace the live site.

After engine behavior holds, design household setup; age-appropriate learner workspace; document import and extraction review; homework inbox, due dates and progress; study planning; a teaching canvas with writing, equations, diagrams and voice/text; parent reports; and human review. The first complete journey is importing a marked assignment, repairing the underlying gap, completing homework and returning for an independent check. Test touch input, legibility, interruption, undo/resume and accessibility before accepting visual polish.

## 5. Backend architecture follows those flows

Specify household identity for school-age learners (adult learner accounts are a later product, ADR-0055); consent/access; document storage/extraction jobs; curriculum/skill mapping; homework state; tutor events; separately authorized assessment; reporting; scheduling; cost and operations. Engine contracts constrain the design. Define authorization, migrations, retries/idempotency, recovery and observability before broad construction.

Documents retain source, date, uploader, corrections and confidence. Teacher grades inform context; they do not certify mastery. Imported answer-key exposure disqualifies affected independent checks. Users can inspect and correct inferred context. Unsupported formats fail visibly. Embedded document instructions are data, not authority to change the engine or access other records.

Community patterns may reveal a shared prerequisite gap or confusing worksheet. Keep learner records private, scope access by household and permissions, and evaluate aggregate patterns separately. Correlation does not show a school caused a problem. School-level attribution is a later research capability requiring sufficient evidence and human review; raw cross-student sharing is not part of this plan.

## 6. Incremental construction, then deliberate release

Build reviewed vertical slices in the same repo/test website: document → assignment → teaching canvas → practice record → independent check later → report. All school ages including younger siblings are in the product scope now; each released age/ability band needs demonstrated quality. This does not silently expand the prior maths-first decision to every subject. Primary and elementary education lead; independently subscribing adults are a later product (ADR-0055).

Before real learners, close the existing content, age/consent, provider, privacy and evidence-integrity gates. Before promising allowance or charging, measure delivery cost against the recorded $49 direction; this email sets no replacement price. Qualify mobile behavior, recovery and the complete household journey, then deliberately deploy and evaluate learning. Affordability and high efficacy are product goals, not verified claims today.

## Status and next deliverable

Completed: both histories preserved and verified; KaizenEdu chosen in ADR-0053; this plan and memory updates written. No product files moved, defects fixed, real learner tested or deployment performed.

Next visible engineering result: **engine block map and acceptance matrix linked to exact inherited modules and RO-5 reproductions**, followed by a small replayable teaching demonstration. Use the normal context pack, versioned brief and paired blind reviewer for construction.

Adult scope answered 2026-09-12 22:14 CDT: adults later; primary and elementary education lead. Manny accepts this order and authorizes the build. The first-item-reviewer question remains open. [ADR-0055-school-first-engine-build](../decisions/ADR-0055-school-first-engine-build.md).

Record correction: the handoff said SPEC v1.0; the file inspected actually declared v0.1-draft. It now becomes v0.2-direction-update, still a design draft carrying accepted ADR clauses. Today's KaizenEdu choice supersedes creating a new repository.

[ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) · [SPEC](spec.md) · [DIRECTION](direction.md)


## Engine package produced — 2026-09-12 22:22 CDT

[ENGINE-CONTRACT](engine-contract.md) contains the source map, event/state contract, five loops, 16 acceptance rows and E1–E4 package sequence. All 17 RO-5 baseline cases rerun in isolated evidence storage; 36 loaded source files unchanged. Known defects remain. E1 issue/context/implement-feature v9/review-pr v8 briefs are staged under `shared/artifacts/kaizen-engine-start/email-8490a65b/` and `shared/context/KaizenEdu-engine-e1*`. GitHub connection failed; no issue filed, worker launched or fix claimed.

## Execution handoff — 2026-09-13 10:08 CDT

Repository bootstrap is verified; active engine runtime is still empty. [E1 issue #1](https://github.com/gokumann-pm/kaizenedu/issues/1) and `shared/context/gokumann-pm-kaizenedu-1.md`, `.brief.md` and `.review.md` replace the old staged destination packet. Criterion 0 establishes an auditable minimal offline extraction baseline before the existing five containment criteria. Templates remain implement-feature v9 / review-pr v8. The autonomous dispatch gate returns `week usage 70% >= cap 60%`; no worker or active deadline. Direct-request budget remains advisory under ADR-0021. No new scope, product repair or independent pass is claimed.

Prepared launch command, only after the governing dispatch gate permits this start:

```sh
DISPATCH_DEADLINE_S=3600 DISPATCH_CODEX_DEADLINE_S=3600 scripts/dispatch.sh /Users/mann/pm/shared/repos/gokumann-pm-kaizenedu 1 --target codex --model gpt-6-astra
```

The independent reviewer starts on a reviewable PR at its observed head, using the prepared `.review.md`; no review begins from the bootstrap claim alone.
