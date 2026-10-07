<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/ENGINE-CONTRACT.md -->

---
title: "Kaizen engine contract and acceptance matrix"
tags:
  - kaizen
  - engine
  - acceptance
project: kaizenai-saas
created: 2026-09-12
status: PM design; baseline reproduced; implementation and independent review pending
---

# Engine contract and acceptance matrix — revision 1

Status: PM design and staged build package; implementation and independent review pending.
Authority: Manny's assigned email `email-8490a65b62ccab3520ab1cc0cf9ca5cf715c2ebe986367bae396f16f776603e2`, ADR-0053 and ADR-0055. Primary and elementary education lead the current product. Other school ages remain supported scope; independently subscribing adults are a later product. Maths stays first. Build in KaizenEdu, deploy later.

Source baseline: KaizenEdu `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`; Kaizen-AI reference `91af9e452c7df5867afa7249a6dc58b00003f531`. Both have existing preserved Git bundles. Cached commits are not proof of current remote HEAD.

## Blocks, contracts and authority

Paths below are relative to KaizenEdu. A listed source is an integration point, not proof that it meets the target contract. New blocks are explicitly marked proposed.

| Block | Existing source / disposition | Input → output | Failure and authority boundary |
|---|---|---|---|
| Document and assignment intake | Proposed adapter around learner intake; full import flow not verified | Source document + household + learner + corrections → reviewed extraction, skill hypotheses, assignment and due date | Keep source/confidence; ambiguous marks require correction. Imported grades cannot certify. Isolate households. |
| Session execution | `lib/tutor/session/state-machine.ts`, `session/service.ts`, `turn/engine.ts`; adapt | Learner action + session + allowed teaching action → rendered response, durable session and exposure events | Resume after interruption without duplicate progress. Deliver instructional text/audio/canvas only after exposure persistence succeeds. |
| Learner estimate | `lib/tutor/model/student-model.ts`, `model/service.ts`; retain as estimate, remove certification authority | Practice and observed responses → revisable readiness/misconception estimates | Wrong or incomplete observations remain uncertain. Practice weight never crosses into certification. |
| Teaching policy | `lib/tutor/turn/engine.ts`, `turn/actions.ts`, `checks/prompt.ts`; adapt | Goal + learner estimate + recent attempts → one teaching step and representation | Generated checks and keys stay practice. Model text and tags cannot grant trusted assessment status. |
| Exposure ledger | `lib/tutor/model/evidence.ts`; replace session-only hint query with cross-session skill history | Instruction/hint/answer exposure + affected skills + server order → durable eligibility reset and attempt assistance latch | Uncertain skill mapping is conservative; same-skill help resets, unrelated help does not. Every delivery modality covered. |
| Assessment authority | `lib/tutor/checks/service.ts`, `checks/grading.ts`, `checks/llm-grade.ts`; introduce restricted path | Authorized server-issued attempt + immutable reviewed item/key/rubric + fixed response → qualifying or nonqualifying evidence with reasons | Tutor, learner and reporter cannot mint qualifying evidence, select a certifying key or write the claim. Missing provenance and ambiguous grades abstain. |
| Quiet-window scheduler | Proposed | Clean practice reps + per-skill exposure history + homework demands → assessment offer, reschedule or parent explanation | Versioned initial values: 10 clean reps for priority, 48-hour eligibility, 14-day no-window escalation. No silent permanent ineligibility. |
| Claim and report projection | `lib/tutor/report/parent-report.ts`, `report/lead.ts`, `report/rows.ts`; adapt | Immutable evidence + exact rule version → practice progress, independent success, retention pending or supported mastery | Legacy `mastered`/`confirmed` estimates cannot appear as certified learning. Rebuild yields identical contributing IDs. Corrections append provenance. |
| Human improvement | Proposed review/evaluation adapter | Synthetic teaching replays + error review + Manny feedback → versioned candidate policy/content revisions | No self-approval or automatic cross-learner training. Compare with held-out cases before promotion. |

Observed baseline call path: `turn/engine.ts` accepts generated checks → `checks/prompt.ts` constructs null-ID keys → `checks/service.ts` calls `recordCheckOutcome` → `model/student-model.ts` confirms after 24 hours → report functions display mastery. `model/evidence.ts` scopes hints to the current session and the last check. This entire chain needs an authority change, not just a label or timer change.

## Event and state contract (proposed logical schema)

Each event carries server-issued event ID, household/learner ID, relevant skill IDs/version, source/attempt/session references, server receipt time, causal sequence, class, immutable payload/provenance and rule version. Client timestamps/latency remain telemetry. Uniqueness is anchored to the originating operation; a rule upgrade cannot count an old attempt again.

Evidence classes remain those accepted in SPEC §3.1: `assisted-help`, `corrections-practice`, `unassisted-attempt`, `delayed-retention`. Eligibility is derived by the assessment authority; callers do not submit a trusted `qualifies: true`. An attempt freezes item/key/rubric versions, content family, context, scorer/version, learner ownership and response. Lifecycle: issued → submitted → finalized, or expired/cancelled. Assistance observed from issue through finalization permanently disqualifies that attempt. Subsequent assistance affects future eligibility; it does not rewrite completed history.

Scoring may run outside a database transaction. Finalization must revalidate ownership, fixed response, item approval, assistance latch, exposure sequence and trusted timing under one concurrency protocol, then atomically finalize, append evidence and update the projection. Retries return the first result; conflicting resubmissions fail. Assistance writers share the same skill ordering. Rebuildable projections never become a second source of truth.

User-visible states: practice estimate → eligible for independent check → independent success / retention pending → supported mastery only after all requirements. An abstention or missing assessment is visible. Legacy certifications remain preserved in history and displayed as unverified estimates until independently supported.

## The five feedback loops

| Loop | Objective / observation | Action / timescale | Stop or review condition |
|---|---|---|---|
| Teaching | Accurate understanding; learner work, errors, help and frustration | Change question, representation or step size within the session | Repeated failure, interruption or uncertainty → smaller repair or pause; never infer efficacy from engagement |
| Practice and retention | Later unaided performance; practice vs independent evidence separately | Prioritize quiet window and unfamiliar assessment over days | Relevant help restarts eligibility; no window within 14 days → parent explanation and plan |
| Homework | Complete today's work while repairing gaps; source/due date and corrections | Order assignments and insert a brief repair | Ambiguous assignment/marking → ask for source correction; completion cannot certify |
| Household correction | Accurate learner context; parent/teacher feedback with source | Append correction and recompute estimates/reports | Disputed context remains visible; never relabel assisted work as unassisted |
| Product improvement | Better teaching and reliable records; reviewed replays and independent evaluations | Compare versioned policy/content candidates on held-out cases | Regression → retain prior version; no autonomous promotion or efficacy claim |

## Acceptance matrix

RO-5 probes in this directory run real source with deterministic providers and a SQLite adapter. Their success means the observed vulnerability/control reproduced. They do not establish PostgreSQL roles, RLS, locking, production behavior or learning efficacy.

| ID | Property to establish | Required evidence / current baseline |
|---|---|---|
| E01 | Generated/null-ID checks cannot qualify | `generated_chain`, `generated_wrong_key`; baseline vulnerability; retain successful practice as positive control |
| E02 | Same-skill 48-hour server eligibility | 48h−1ms, exactly 48h, 48h+1ms with other criteria met; `delay_boundary` currently demonstrates 24h |
| E03 | Help persists across sessions and checks | `cross_session_help`, `same_session_help_reset`, `untagged_instruction`; baseline vulnerabilities; unrelated skill positive control |
| E04 | Practice contributes zero certification credit | `assisted_practice`, arbitrarily long assisted and clean-practice streaks; practice estimates and scheduling still work |
| E05 | One base result despite retries/concurrency | `duplicate_concurrent`, `partial_failure_retry`; preserve `duplicate_sequential` rejection; PostgreSQL barrier tests, conflicting answers and different attempts |
| E06 | Familiar items/families cannot fake independent contexts | `repeated_item`, `repeated_family`; approved unfamiliar/context-diverse positive controls |
| E07 | Trusted content and scorer provenance | Wrong/unreviewed key, altered version, missing approval, empty approved bank all abstain; independently reviewed fixture grades correctly; never treat review metadata as proof the key is mathematically correct |
| E08 | Assistance cannot race finalization | `help_during_grading`; PostgreSQL barriers before issue, submit and finalize; equal timestamps and provider latency |
| E09 | Restricted identities and household isolation | Actual PostgreSQL: learner/tutor/report denied qualifying writes and finalization; assessment role accepts authorized attempt; cross-household reads/writes denied, including views/inherited grants |
| E10 | Client clocks and ungradable responses cannot qualify | Preserve `client_clock`, `client_clock_route`, `ungraded_control`; actual route boundary plus valid independent positive case |
| E11 | Replay and corrections preserve honest claims | Rebuild test projection from retained evidence and exact rule version; identical contributing IDs; authorized key invalidation withdraws unsupported claim without editing evidence |
| E12 | Practice creates assessment access | Versioned 10-rep priority; offer at eligibility; restarts and offers/taken measured; 14-day escalation tested at boundary and beyond |
| E13 | Retention and context requirements are explicit | Two contexts and separate days; missing/early retention remains pending. Day-seven anchor/window, day timezone and context rubric need recorded definitions before full certification implementation |
| E14 | Import and homework errors stay recoverable | Synthetic ambiguous OCR/marks, corrections, duplicate import, missed due date; source and uncertainty visible; no mastery contribution |
| E15 | Teaching survives provider/UI failure | Synthetic timeout, interrupted audio/canvas, resume, duplicate/out-of-order events; correct exposure order and one learner action, no false qualification |
| E16 | Teaching quality is evaluated separately | Replay an elementary fractions example with concrete/number-line/symbolic variants, plus younger and older school-age cases; reviewed math and pedagogy, held-out learner actions, latency and measured cost when live providers are later qualified |

Full certification remains blocked until E01–E13 have independent evidence. E14–E16 qualify the wider engine experience. Simulated clocks do not demonstrate human retention. No current product test pass, independent sign-off, deployment or real-learner acceptance is claimed.

## Ordered build packages

1. **E1: separate practice from certification.** Preserve tutoring/practice behavior and existing history; stop every current generated/practice/legacy path from issuing or displaying certified mastery. Stage tests and explicit unverified/assessment-pending states. This is containment, not closure of all seven defect classes.
2. **E2: trusted assessment and exposure.** Immutable attempts/items/rubrics, cross-session exposure, transactional finalization and database roles; prove E01–E10 on PostgreSQL. Set the unresolved E13 definitions through a recorded PM decision before implementing full qualification.
3. **E3: scheduling and replay.** Quiet windows, no-trap escalation, delayed evidence, claim rebuild/correction; E11–E13. Validate with trusted positive and adversarial cases.
4. **E4: one synthetic teaching website.** Thin local persistence/test adapters and replayable elementary maths episode; E14–E16. Manny reacts before full frontend architecture; backend architecture follows that, then broader vertical slices.

Keep repository restructuring separate until dependency closure is verified. No product code moves, live credentials, provider calls, real learners, public routes or deployment in this package. Build/review briefs are staged alongside this document; the GitHub issue is not yet filed and no worker is running.

[ADR-0055-school-first-engine-build](../decisions/ADR-0055-school-first-engine-build.md) · [ENGINE-FIRST-PLAN](engine-first-plan.md).
