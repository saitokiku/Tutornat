# One education product — verified discovery checkpoint

> **Current direction has advanced beyond this research checkpoint:** the owner chose a parent/student-only K–8 first version, with human tutors deferred; schoolwork companion primary plus structured-learning ambition; math and literacy first; active parent participation; voice/visual plus typed alternative; United States, English and Spanish. A local synthetic-data design prototype is in progress. DIRECTION.md and DESIGN_EXECUTION.md supersede the older open-age, pending-design-approval and tutor-first recommendations below. The source findings remain commit-specific historical evidence.

**Owner decision after this checkpoint:** parents needing homework help and student management are the first customer. The product is a standalone learner AI companion and academic app, with a ledger and optional connected services; existing tutors can use it, but are not required. See [current direction](DIRECTION.md).

The coordinator's original recommendation to start with software for existing tutoring practices was **not adopted**. The evidence below remains relevant, but the tutor-first recommendation and alternatives are retained as research history, not the current brief. Multiple age groups are selected, with distinct age-appropriate experiences; exact age bounds, first subject/assessment coverage and interview access remain unresolved. Design and implementation are still gated.

**The product idea worth preserving:** one shared academic record and workflow connecting what a learner needs to do, AI-supported practice, human help, and what the learner can later do independently. AI should reduce preparation, coordination and follow-up work. This is a testable direction—not demonstrated demand, a learning-efficacy claim or a promise that all four codebases should merge.

## 1. What is complete and what this review cannot establish

Four exact-commit repositories were inspected across architecture, product/learning evidence, UX/accessibility, and reliability/privacy/cost. Three specialist reports were delivered; the architecture agent exhausted its iteration budget without a report. The coordinator completed that missing artifact and independently checked decision-changing source paths, repository identities, test-log totals, current primary sources, newer branch differences and exact GitHub CI targets.

The initial 20–30 minute reviewer estimate was wrong; the slowest reviewer took over three hours. The outcome below is the discovery checkpoint, not an excuse to continue unbounded research.

**Verified:** source presence and selected control-flow defects; exact-commit clean snapshots; bounded branch/history coverage; preserved native-test results; reported CI status checked against the exact target; primary-source wording used below.

**Not verified:** deployed configuration, complete browser journeys, a live multi-tenant database/provider stack, assistive-technology behavior, provider-side retention, user demand, willingness to pay, or learning benefit. Only the owner has used the versions, per the owner brief. No software security or legal certification is implied.

No original checkout or shared source snapshot was changed. No product deployment, migration, real-user write, purchase or paid product-provider session was performed by this discovery work. Design and implementation remain unapproved.

## 2. What each attempt contributes

| Attempt | Work worth keeping | Important limitation | Present disposition |
|---|---|---|---|
| **Kaizen-AI** | Human group-session operations, tutor preparation, structured observations, learner/family context and delayed follow-up concepts | Mounted group flow coexists with legacy private-tutoring code; cross-role follow-up is incomplete | Primary **workflow reference**, not yet the selected build base |
| **KaizenEdu** | AI lesson/session interface, voice/text recovery, transcript/board/wrap patterns, household reports and deterministic grading | Deliberately excluded the human-tutoring business/operations during consolidation | Selectively reuse interaction and tutor capabilities; do not inherit its previous product brief |
| **trellis** | Authority, evidence provenance, independent-assessment and report boundaries | User-facing demo shares a synthetic learner and lacks a production tenant boundary | Preserve its rules and selected modules; do not launch the demo as a service |
| **Tutornat** | No implementation recovered | Every tree in the three fetched commits is README-only | Exclude from implementation reuse unless another artifact is supplied |

Source identities and evidence: [architecture report](reports/architecture.md), [source manifest](source-manifest.json), [parent repository checks](evidence/parent-state.json). The architecture report distinguishes inspected main commits from later or ahead branches.

**Why the attempts diverged:** different repositories optimized different parts of the problem—human operations, AI interaction, or a trustworthy learning record. Treating any one of those as the whole product left the connections incomplete. This is the coordinator's synthesis of the source, not an explanation of the owner's motives.

## 3. Five findings that change the next decision

### 1. The closest implemented human workflow is group tutoring—not a finished private-tutor marketplace

Kaizen-AI's mounted group-room path provides preparation, roster/intake, attendance, exit ratings and follow-up scheduling. Its private 1:1 APIs/components remain substantial, but the learner booking entry is unmounted while tutor-side remnants remain. “The code exists” and “a learner can complete that offer” are different claims.

**Consequence:** choose group, private or asynchronous service deliberately. Do not reactivate a leftover route and assume the rest of the operation exists.

Evidence: `snapshots/Kaizen-AI/web/app/api/tutoring/group/brief/route.js`; `web/app/api/tutoring/group/roster/route.js`; mounted-use traces and exact line references in [UX report](reports/ux-accessibility.md).

### 2. The most important missing feature is a reliable handoff

The group tutor can record what was accomplished and the next step, but the UX review found no mounted learner/family consumer for that structured exit object; the coordinator checked the family summary and roster paths. The asynchronous handoff route records a message but explicitly assigns nobody. The legacy recap route sends generated prose without a tutor draft-approval step.

**Consequence:** the first complete workflow must deliver an owned, visible, correctable next step to the person expected to act—not merely generate a report or write a database row.

Evidence: `snapshots/Kaizen-AI/web/lib/server/familySummary.js`; `web/app/api/tutoring/group/roster/route.js`; `web/app/api/handoff/route.js`; `web/app/api/tutoring/recap/route.js:28-89`.

### 3. “Measured growth” needs stricter evidence than successful assisted work

Kaizen-AI's tutor-observation path marks ratings unassisted/human-verified without enforcing an independent no-help probe. That can admit the rating into a confirming evidence class; it does **not** mean one rating automatically passes all mastery thresholds. Trellis's distinction between teaching and qualifying assessment is worth preserving.

The Bastani study distinguishes better assisted practice from subsequent unaided performance; its unrestricted AI condition performed worse on the later unaided exam. That is evidence against assuming assistance equals learning, not proof this product will harm learners.[2] Tutor CoPilot is a relevant human-plus-AI precedent because its tool supports tutors and preserves their agency; it does not establish durable learning for this product or this delivery model.[3]

**Consequence:** label help honestly; preserve provenance; assess later independent performance on appropriate reviewed items. Treat tutor observations as useful context and scheduling input unless an explicit independent protocol was followed. Assessment timing and success thresholds in the research report are proposed pilot choices, not universal scientific constants.

Evidence: `snapshots/Kaizen-AI/web/app/api/tutoring/observe/route.js:143-235`; `web/lib/engine/types.js`; `snapshots/trellis/lib/tutor/assessment/service.ts`; [product/learning report](reports/product-learning.md).

### 4. There is useful infrastructure, but release controls are incomplete

Five priority categories for whichever foundation is selected:

1. **Privacy and provider eligibility:** the pinned KaizenEdu defaults use Gemini for tutor roles while the guest surface admits young age bands. Google's checked API terms disallow clients directed toward or likely to be accessed by under-18s.[1] A later repository document claims production was overridden to OpenAI; this review did **not** inspect that live configuration. Therefore the confirmed finding is unsafe source defaults/eligibility controls—not proof Gemini is serving children in production now. Paying for the Google tier does not remove the cited age restriction.
2. **Deletion and export completion:** KaizenEdu's deletion job has no production caller in the reviewed source; Kaizen-AI can swallow storage/subscription-cleanup errors and return a success-looking outcome. The full reliability report also identifies export errors becoming empty categories.
3. **Real spending limits:** KaizenEdu's global-spend check has no production caller; ASR accounting trusts client duration. Kaizen-AI's downgrade changes accounting tier without changing the outgoing model. These source findings need atomic enforcement and adversarial tests, not just tighter prompt wording.
4. **Safe tenant isolation:** trellis's shared-learner demo is not an authenticated multi-user service. Preserve its evidence rules without importing the demo's identity shortcuts.
5. **Accessible, recoverable interactions:** keyboard/dialog/focus behavior, voice failure/reconnect and equivalent nonvisual lesson content require actual browser and assistive-technology testing. Source review is not WCAG conformance.

Evidence: `snapshots/KaizenEdu/lib/tutor/accounts/deletion.ts:192-197`; `lib/tutor/guards/spend-alarm.ts`; `app/(learner)/api/tutor/asr/route.ts:81-165`; `snapshots/Kaizen-AI/web/app/api/account/delete/route.js:18-42,109-151`; `web/lib/server/aiCall.js:58-156`; `snapshots/trellis/web/app/api/turn/route.ts`; [reliability report](reports/reliability.md).

These are pre-pilot requirements for the chosen scope, not an instruction to fix every repository. Legal applicability, consent arrangements and vendor contracts still require qualified review.

### 5. More features are not the evidence we are missing

Scheduling, notes, homework and parent/student sharing are already available together in alternatives such as TutorBird.[4] This does not prove customers are satisfied with existing products, but it means those component features alone are not a demonstrated differentiator.

The candidate differentiator is **less repeated coordination plus a trustworthy account of what happened and what to do next**. No outside user has yet validated that this is valuable enough to switch tools or pay. Interviewing reachable operators and learners is now more decision-relevant than adding another framework or reading another hundred repository files.

## 4. Runtime and CI evidence—without inflated totals

| Target | Real evidence | Limit |
|---|---|---|
| Kaizen-AI local native run | 435 runner results: 416 passed, 19 failed at import/setup; parent parsed the log | 16 failures missing Supabase package, 3 missing Stripe; not 19 reproduced product assertion bugs |
| Kaizen-AI focused runs | Reliability subset 60/60; engine-policy 31/31 | These overlap other coverage; do not add them into a new unique-test total |
| Kaizen-AI pinned CI | Matching GitHub run reports success | Does not establish production configuration or complete real-user flow |
| trellis local | Bindings 4/4; helpers 2/4, with two blocked on unavailable offline `pg@8.23.0` | No live database or full engine integration run |
| KaizenEdu local / CI | Local discovery blocked by absent Vitest; original pinned E2E run failed, but later main `c73a0e…` has green CI, invariants and storage-contract workflows | Old failure was a navigation/test-context failure, not a proven thumbnail defect; green later CI does not fix the source controls above by implication |

Tutornat has no executable product suite. Tests ran in the reliability review's disposable no-network workspace, without dependency installs, live services or production credentials. The coordinator parsed logs and read back GitHub targets; it did not rerun the application tests. Exact commands and full logs: [reliability evidence](evidence/reliability/commands.md), [parent checks](evidence/parent-verification.json), [newer-main delta and CI](evidence/parent-branch-delta.json).

## 5. Recommended direction and alternatives

### Recommended hypothesis: support an existing tutoring relationship

Start with tutors/operators who already have recurring learners. Help them prepare, maintain context, record what happened, coordinate the next action and verify later independent progress. This tests the owner's human/AI academic-coordination idea without simultaneously inventing tutor supply, a marketplace and an AI-only learning business.

Secondary-school math is the research review's proposed initial domain because it can support bounded assessment; it is **not selected**, and should change if the owner can reach a better-defined cohort. The proposed participant counts, evaluation windows and thresholds in that report are planning hypotheses, not a validated power analysis or an approved commitment.

### Two credible alternatives

- **Operate a human-plus-AI tutoring service:** closer control of delivery and evidence collection; requires actual tutor staffing, scheduling, safeguarding and service recovery.
- **Learner/family academic hub with optional human help:** closer to an independent learner's daily organization; must prove sustained use and a workable human-help connection rather than quietly reducing the product to chat.

Choose based on who can actually use the first product and what the owner wants to operate—not by counting existing routes. The repository foundation follows that choice.

## 6. Proposed design phase—requires approval

1. **Choose one initial user, operator and job.** Document who pays, who provides human help, the age/subject boundary and the current workaround. Interview reachable people about an actual recent session rather than pitching feature lists.
2. **Specify one complete cross-role journey.** Preparation → learner work/help → human session where relevant → reviewed next step → follow-through → independent check. Include consent, ownership, missing data, failed delivery and correction, not only the successful screen sequence.
3. **Prototype and test the difficult handoffs.** Use synthetic data. Validate whether users can find the next action, understand evidence labels, recover from failure and control what gets shared. No production integration is needed for this question.
4. **Compare implementation foundations against that journey.** Assess Kaizen-AI main and its ahead strategy branch, then cost selective KaizenEdu/trellis reuse. Check every extracted file/package's license and provenance. Write migration and test boundaries before copying code.
5. **Build one safe vertical slice only after approval.** Require identity/tenant tests, reliable deletion/export, provider eligibility, spending enforcement, reviewed assessment content and accessibility/recovery checks. Run an observed pilot before broadening scope.

A fixed implementation estimate would be invented before the operator model and runtime setup are known. The next owner decision is a two-minute choice; interview scheduling and safe environment setup determine the next phase's calendar time.

## 7. Skip list and unresolved question

Do not merge all repositories, rewrite everything by default, build a new tutor marketplace first, treat an avatar/multi-agent interface as learning evidence, or fix every historical route. Do not turn earlier free/no-account/grades 4–9 decisions into requirements without renewed owner agreement.

**The unresolved question:** can this product improve the coordination and learning record enough that real people repeatedly use it? Source code and papers cannot answer that. The next design phase needs reachable users and a concrete service promise.

## 8. Full evidence packet

- [Architecture and bounded history](reports/architecture.md), including parent-completed report and branch caveats.
- [Product, alternatives and learning evidence](reports/product-learning.md), including its 16-source ledger.
- [UX, workflow and accessibility](reports/ux-accessibility.md), source/static-artifact review—not browser QA.
- [Reliability, privacy, security and cost](reports/reliability.md), including executed checks, blockers and parent update.
- [Approved owner brief](BRIEF.md), [execution instructions](EXECUTION_PLAN.md), [source manifest](source-manifest.json), [parent state](evidence/parent-state.json), [parent branch/CI delta](evidence/parent-branch-delta.json).

External sources below were read by the coordinator; literal supporting excerpts are attached in `evidence/synthesis-ledger.json`. Proposed decisions are distinguished from observed implementation and research findings.

## Sources

[1] https://ai.google.dev/gemini-api/terms — Gemini API Additional Terms
[2] https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635 — Generative AI without guardrails can harm learning
[3] https://edworkingpapers.com/sites/default/files/ai24_1054_v2.pdf — Tutor CoPilot — November 2025 working paper
[4] https://www.tutorbird.com — TutorBird product page
