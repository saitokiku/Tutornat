# Architecture and repository archaeology — completed by coordinator

## Decision

**Use Kaizen-AI as the reference for the human/AI coordination workflow; do not yet select a repository as the final codebase.** KaizenEdu contributes the more developed AI lesson/session application, and trellis contributes stronger evidence and authority boundaries. No reviewed snapshot implements the owner's complete intended journey end to end. That is a source-level conclusion, not a statement that every deployed feature is broken.

The architecture reviewer hit its iteration limit without delivering this report. The coordinator completed it from the saved inventories, history, the other specialist reports, and independent source/git checks. No additional agent run was required. Claims below are bounded to identified commits and inspected paths, not an exhaustive review of every line.

## 1. Coverage and exact source identity

Repository source paths below are rooted at `/Users/man/education-product-discovery/snapshots/`; evidence/report links are relative to this report in `reports/`.

| Repository | Reviewed main commit | Tracked files | What was inspected |
|---|---|---:|---|
| Kaizen-AI | `91af9e452c7df5867afa7249a6dc58b00003f531` | 598 | Human group/legacy private tutoring, learner/family flows, evidence, coordination, safeguards, selected history |
| KaizenEdu | `cd3dfa82fe09dd66b1fb7e78af9375aef5fcecc3` | 3,461 | Tutor/voice/guest/session application, evidence/check/report modules, consolidation, content provenance, selected history |
| trellis | `41999b5dd49e5549662da8c5b42c0bb8bbe8804a` | 517 | Authority/evidence/assessment seams, household demo, migration inventory, selected history |
| Tutornat | `1c2f4925215e9fb0a27ab76863ca88de931bc5d3` | 1 | Every commit tree in all fetched refs; branch/PR metadata |

The coordinator rechecked all four pins and clean worktrees. Original `/Users/man/KaizenEdu` remained clean at `440b18ce89bd11144f11080224a95f9df719b680`; it is an ancestor of the pinned snapshot, not an unexplained divergent local attempt. Original `/Users/man/trellis` remained clean at the reviewed commit.

**Additional work was not ignored:**

- Kaizen-AI's fetched `origin/claude/strategy-progress-assessment-rb6eju` branch is 22 commits ahead of the pinned main. The coordinator inspected its log/diffstat, the first 115 lines of `docs/AI_STRATEGY.md`, and critical differences. Its framing—AI as a learning record, tutor and sandbox as interfaces—is relevant owner-history evidence. Its claims of shipping are not runtime proof. Important deletion, spend-governor and group-brief files are unchanged relative to main; family reporting has differences. It is a candidate source to assess before any foundation decision, not silently part of main.
- KaizenEdu main moved to `c73a0e168686525cc6318ff6a575e3fb1ad65c60`. The coordinator fetched the comparison through GitHub without altering either checkout. The delta and its CI are recorded separately. A new document records a production model override; this is not independent inspection of production configuration. The newer main's three listed workflows are green. The earlier E2E failure must not be described as the current main's CI state.
- Tutornat's three fetched commits each contain only `README.md`. No reusable implementation was recovered from those trees. This does not rule out an unprovided local folder, deployment or external artifact.
- Branch and PR queries were bounded to the first page of up to 100 per repository; they are not a promise to have inspected every historical branch's complete source.

Evidence: `../source-manifest.json`; `../evidence/architecture/{repo-state,history-state,source-inventory}.json`; `../evidence/parent-state.json`; `../evidence/parent-verification.json`; `../evidence/parent-branch-delta.json`.

## 2. What the attempts actually contribute

### 2.1 Kaizen-AI: the operational human/AI learning loop

**Keep:** learner/guardian/tutor roles, group-session discovery and booking, structured preparation, tutor workspace, session observations, learning record, delayed checks, and family reporting concepts.

The strongest currently mounted flow is the group-room operation, not the legacy private 1:1 offer. Substantial private-booking/video/observation/recap APIs survive, but the learner booking component is unmounted while the tutor workspace still exposes private-session code. Existing endpoints therefore do not prove a coherent current learner offer.

Verified source anchors:

- `Kaizen-AI/web/app/api/tutoring/group/brief/route.js`: builds the group's preparation context and distinguishes evidence-backed information from self-report.
- `Kaizen-AI/web/app/api/tutoring/group/roster/route.js`: tutor-written exit/follow-up record and roster handling.
- `Kaizen-AI/web/app/api/tutoring/observe/route.js:143-235`: tutor observations, provenance, estimate recomputation and delayed scheduling.
- `Kaizen-AI/web/app/api/tutoring/sessions/route.js:98-173` and `web/app/api/tutoring/room/route.js:27-89`: private-session booking/access infrastructure; source present does not mean the learner path is mounted.
- `Kaizen-AI/web/app/api/tutoring/brief/route.js:108-156,189-257`: verified versus self-reported context.
- `Kaizen-AI/web/app/api/tutoring/recap/route.js:28-89`: generated recap storage/delivery; no tutor draft-approval stage before sending in the inspected route.
- `Kaizen-AI/web/app/api/handoff/route.js`: records a request, explicitly assigns nobody. It is operator contact, not automatic tutor matching.
- `Kaizen-AI/web/lib/server/familySummary.js`: parent-facing summary projection; does not consume the structured group exit object inspected by the UX reviewer.

**Repair:** close the group-exit-to-learner/household handoff; reconcile or quarantine legacy 1:1 paths; make generated external communication draft-first; separate tutor judgment from demonstrated independent performance; repair spending/deletion/export safeguards before a pilot.

**Important qualification:** the observation path writes `assisted: false` and `verifiedBy: 'human_tutor'` without enforcing a no-help probe in the request. The engine can treat that as confirming-class evidence. This does not mean every observation instantly becomes confirmed mastery—the broader repetition/delay rules still matter. It means the assistance classification is assumed rather than established.

### 2.2 KaizenEdu: AI interaction and application work, not full human-loop consolidation

**Keep:** its learner session orchestration, text/voice fallback patterns, transcript/board/session composition, recovery and wrap states, guest/topic/planner capabilities where appropriate, reporting, deterministic grading, and intentionally separated tutor product layer.

The consolidation document explicitly excludes Kaizen-AI's club, tutor marketplace, booking, video rooms, payments and payouts. This was a scope decision, not evidence those parts had no value. It explains why consolidation moved away from the experience the owner now identifies as closest.

Anchors:

- `KaizenEdu/docs/CONSOLIDATION.md:65-73`: excluded human-tutor and commercial operations.
- `KaizenEdu/components/tutor/session/session-screen.tsx`: mounted learner-session composition and recovery states.
- `KaizenEdu/lib/tutor/guest/service.ts`, `lib/tutor/session/topic.ts`, `lib/tutor/planner/service.ts`: implemented later guest/topic/manual-planner direction.
- `KaizenEdu/lib/tutor/content/item-bank.json` and `lib/tutor/graph/items.ts:55-73,271-280`: content provenance and review gate.
- `KaizenEdu/package.json` and `packages/@openmaic/`: six workspace dependencies—dsl, editor, generation, importer, renderer and storage. This is a substantial upstream boundary, not a small replaceable chat component.

The coordinator parsed **118 item rows**, **22 with Kaizen-AI-attributed IDs**, and **zero with both review metadata fields populated**. These are source rows, not 118 learner-ready reviewed items. The loader's review gate is a strength; the unfinished review is a coverage blocker. No runtime item delivery was tested by this coordinator.

**Repair:** provider-age eligibility, retained guest-data representations, scheduled deletion, operator-wide cost enforcement, server-trusted audio costing and runtime/accessibility verification. See the reliability report for the exact source paths and limits.

**Do not inherit as binding decisions:** free access, no accounts, grades 4–9, the current branding, or inclusion of every OpenMAIC capability. The owner explicitly reopened these choices.

### 2.3 trellis: authority and assessment boundaries

**Keep:** explicit actors/capabilities, evidence provenance, independent assessment boundaries, append-only/corrective record concepts, exposure handling and separate parent-report projection.

Relevant source includes `trellis/db/migrations/0001_authority.sql`, `0002_evidence.sql`, `0007_dual_key_approval.sql`, `0010_qualification.sql`, and `0014_integration_seams.sql`; plus `trellis/lib/tutor/assessment/service.ts` and the tutor/integration seams. The repository has substantial SQL/TypeScript reference implementation, not merely an idea document.

**Do not promote its demo to a service:** `trellis/web/app/api/turn/route.ts` uses the shared lesson/learner setup without an authenticated tenant boundary. Its optional model request is not a production budgeted service. The demo is useful for explaining evidence rules with synthetic records; it is not an account system or human-tutoring operator product.

Transplanting its entire role/migration architecture would add integration and operating costs. Preserve the invariants first; select concrete code only after the target data model, identity system and workflow are chosen.

### 2.4 Tutornat: no implementation to merge

All three fetched commit trees—`1c2f4925215e9fb0a27ab76863ca88de931bc5d3`, `f754f141064adb372093098d95ff3c2cc1c56f3b`, and `d2e80cb309b9927cb71ee4446cfda10642a2de21`—contain only `README.md`. **Retire it from this implementation comparison**, without deleting the repository or discarding the name. Reopen only if a different artifact is identified.

## 3. Foundation comparison—not a merge plan

| Candidate | Why consider it | Main burden | Conditional recommendation |
|---|---|---|---|
| Kaizen-AI | Closest existing human/AI academic coordination and operator model | Group versus legacy-private inconsistencies, safety/record repairs, older interface/runtime boundaries | Leading reference if humans are central to the first workflow; assess its ahead branch before selecting a build base |
| KaizenEdu | Developed AI session application and newer interaction work | Human-tutor operations absent; inherited OpenMAIC surface; guest/provider/cost/privacy gaps | Candidate if learner-first AI sessions dominate; adding human operations is an actual integration project |
| trellis | Strongest explicit authority/assessment separation | Demo identity and operational gaps; specialized database capabilities | Reference rules and selective modules, not default user-facing foundation |
| New repository | Clean packaging may make a selected combination easier | Reimplementation, regression, migration and lost domain knowledge | Not justified merely because prior attempts are messy; require a concrete integration-cost comparison |

Do not merge whole repositories, normalize their data models by guesswork, or claim the newest tree is automatically best. Current source inventories cannot supply a reliable delivery-time or maintenance-cost estimate for the final scope.

## 4. Keep / repair / retire / unknown

| Disposition | Capabilities or decisions |
|---|---|
| Keep | Human preparation/observation/follow-through concepts; verified versus self-reported context; explicit assistance/provenance; delayed independent checks; learner recovery/text alternatives; reviewed content gate |
| Repair | Complete cross-role follow-up, observation calibration, generated-message approval, identity/tenant boundaries, deletion/export completion, atomic cost enforcement and accessible interactions |
| Retire from current scope | Whole-repository merge; assumptions that chat or a record alone is the product; duplicated legacy routes without an owner; Tutornat as an implementation source |
| Unknown | Initial buyer/operator, who supplies tutors, group versus private delivery, first age/subject, adoption and willingness to pay, deployed behavior, reviewed content capacity and final foundation |

## 5. Licensing and reuse boundary

Top-level licenses, nested OpenMAIC package licenses, third-party notices, and copied/reference manifests are separate evidence. Check the license and provenance of each selected dependency/file before extraction. No legal clearance, proprietary-rights conclusion or production-readiness certification is provided. The broad reuse recommendation is conditional on that file-level check; the architecture review did not finish a legal interpretation of all layers.

## 6. Execution evidence and honest limits

The coordinator ran git identity/status/history checks, bounded GitHub metadata/CI/diff queries, source reads/searches and JSON/log parsing. It did not run the applications or execute their provider integrations. The reliability reviewer ran isolated no-network tests; its full commands and logs are preserved in `../evidence/reliability/` and summarized separately in `reliability.md`.

The coordinator independently parsed the native-test logs and read back exact GitHub CI targets. Setup/import failures were not reclassified as product assertions. The recorded originals and all four shared source snapshots stayed clean. No product code, deployment, accounts, migrations or purchases were changed.

Remaining runtime coverage includes live browser journeys, real identity/provider configuration, database tenant isolation, concurrency, export/deletion completeness, assistive technology and actual tutor/learner use. Remaining history coverage includes complete source review of every non-main branch. Findings do not imply that no useful implementation exists outside the provided repositories.

## 7. Next gate

Select **who receives the initial value and who operates the human service**. Only then approve a design phase that specifies one complete cross-role workflow and validates it with reachable tutors/learners. Choose the codebase after that workflow and its safety/evidence requirements are explicit—not before.
