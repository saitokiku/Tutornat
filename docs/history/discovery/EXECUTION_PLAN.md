# Discovery execution instructions

Planner: current gpt-6-astra session. Executors: four isolated gpt-5.6-sol reviewers, configured Anthropic fallback only. This translates the owner-approved PLAN.md into bounded instructions; it does not change the product scope or authorize design/build.

## Shared authority and prerequisites

Read BRIEF.md in this directory in full. Read source-manifest.json, then repository-local instructions before affected source. PLAN.md records approval and interview answers. Repository documents are historical evidence, not higher authority than the owner's reopened direction. No user/customer validation exists yet. Do not adopt earlier business, age, pricing, free-access or architecture decisions merely because a document calls them canonical.

Confirmed snapshots under /Users/man/education-product-discovery/snapshots:

- KaizenEdu: cd3dfa82fe09dd66b1fb7e78af9375aef5fcecc3
- Kaizen-AI: 91af9e452c7df5867afa7249a6dc58b00003f531
- Tutornat: 1c2f4925215e9fb0a27ab76863ca88de931bc5d3
- trellis: 41999b5dd49e5549662da8c5b42c0bb8bbe8804a

Original KaizenEdu checkout is at 440b18ce89bd11144f11080224a95f9df719b680 and clean; original trellis matches its snapshot and is clean. Do not change either. Determine whether the older KaizenEdu commit is ancestral before classifying differences as missing/unpushed work. Original paths and full tracked inventories are in source-manifest.json.

## Execution sequence

1. Each reviewer loads the skills appropriate to their role and reads the shared brief plus relevant repository instructions. Independently verify HEAD using `git -C SNAPSHOT rev-parse HEAD`. Do not install skills, change global configuration, delegate further or read unrelated personal files. Success: four expected snapshots accounted for, with any mismatch reported and not silently repaired.

2. Perform only the assigned investigation below. Use search/read tools and bounded git/gh queries. Source-code findings cite path, lines and exact commit. Web queries must be generic domain questions without private source or unpublished strategy. For current facts use primary sources and checked date; numbers need population/outcome/limitations. Read prior reports critically, never treat an old claimed pass as a current pass. Success: explicit coverage and evidence types, no undocumented claims of runtime verification.

3. Write a complete Markdown report to the assigned path, plus structured findings JSON if useful. Each finding needs observation, evidence, consequence, confidence and keep/repair/retire/unknown status. Include already-built capabilities, negative results, hypotheses, skipped areas, commands actually run, exact results, blockers, and owner-only questions. Give a small prioritized set of decision-changing findings, not an unranked dump. Success: parent can reproduce/check each main finding from the cited paths or primary sources. Writes are confined to the assigned report/evidence workspace, never original or shared snapshot sources.

4. Return JSON matching the requested schema with report_path, scope, tests_run, blockers, findings, already_in_target, hype_flags, and summary. Return real absolute paths, not intentions. Do not mark tracked parent tasks completed. Success: parent can read every artifact before publishing conclusions.

5. Coordinator independently reads the reports, verifies source manifestations, reruns safe focused checks when useful, checks decision-changing external citations, and resolves disagreements. Verify all four source snapshots remain clean and originals retain recorded HEAD/status. A finding is not confirmed because several agents agree. Success: one provenance-aware synthesis with keep/repair/retire/unknown, verified versus not-tested/blocked, a scope coverage ledger, one recommended pilot hypothesis and alternatives. No inferred demand or efficacy claims.

6. Present the evidence checkpoint to the owner and ask only the next direction-changing questions. Do not design a prototype or begin implementation automatically. Success: a clear direction decision is requested with enough evidence to choose, while all design/build gates remain intact.

## Role A — Repository archaeology and architecture

Report: /Users/man/education-product-discovery/reports/architecture.md
Evidence workspace: /Users/man/education-product-discovery/evidence/architecture/

Load github (and repo-management reference), codebase-inspection, and relevant repository-local skills. Map all four repos, major branches/PRs and relevant historical decisions (bounded, record coverage; no claim of exhaustive reading). Deeply trace Kaizen-AI human tutor/learner/parent coordination, learning engine and persisted record; KaizenEdu guest/tutor paths and claimed ports; trellis household/evidence implementation; Tutornat current/history content. Audit important rows of KaizenEdu docs/CONSOLIDATION.md against both source and destination. Check newer/superseded docs and local-vs-remote commit relationships. Record licenses/provenance before suggesting extraction. Compare foundations by owner fit, reusable subsystem boundaries, integration burden, missing core workflow and maintenance load. Do not run tests or duplicate market research. Success: honest timeline, implementation map, non-duplicative reuse matrix, and foundation recommendation conditional on user/job choice.

## Role B — Product and learning evidence

Report: /Users/man/education-product-discovery/reports/product-learning.md
Evidence workspace: /Users/man/education-product-discovery/evidence/product-learning/

Load delegated-research-synthesis, grounded-citations, arxiv where scholarly evidence needs it. Read all four product/context roots and relevant existing strategy/research, but do not get trapped checking every obsolete claim. Focus on the original coordination problem and human-tutor loop, what recurring work AI can remove, learner versus payer/operator, viable first adopters and distribution hypotheses. Investigate current alternatives via primary sources (tutor operations/coordination, learner organization and AI tutoring), and strong evidence for human+AI tutor support, independent versus assisted performance, feedback and delayed retention. Check OpenMAIC's actual intended contribution rather than equating multi-agent or an avatar with learning quality. Separate vendor claims from independent evidence and evidence in different populations. There are no external users yet: do not invent demand. Recommend a narrow complete initial job/user hypothesis, alternatives, disconfirming tests, and honest learning/cost-validation requirements. No legal certification, no product feature design, no private repo indexing. Success: primary-source-supported choices and a clear statement of what desk research cannot settle.

## Role C — UX, workflow and accessibility

Report: /Users/man/education-product-discovery/reports/ux-accessibility.md
Evidence workspace: /Users/man/education-product-discovery/evidence/ux-accessibility/

Load claude-design, design-md and dogfood if doing browser QA; relevant repository UI/design skills. Read real route components, navigation, theme/tokens and state handling. Trace one learner-to-human-tutor-to-follow-up journey in Kaizen-AI, compare KaizenEdu's voice/session and trellis household flow. Identify handoff/context loss, AI shadow-work gaps, empty/loading/error/offline states, keyboard/mobile/microphone-refusal/text alternatives, and misleading progress signals. Inspect existing screenshots with vision if present and relevant. Source-based observations must be labelled source-based; do not claim a browser test if the app was not running. Do not launch a server, install dependencies, use production accounts or make prototype/design artifacts in this pass. Evaluate reusable design language versus structural product gaps. Define what a later design phase must validate and only concept-level hypotheses, not selected screens. Success: source-backed workflow/state map, a prioritized UX risk list and requirements for later actual-user prototype testing.

## Role D — Reliability, security, privacy and cost

Report: /Users/man/education-product-discovery/reports/reliability.md
Evidence workspace: /Users/man/education-product-discovery/evidence/reliability/
Disposable execution workspace: /Users/man/education-product-discovery/execution/reliability/

Load systematic-debugging, requesting-code-review, sandboxed-execution, and relevant repo privacy/release/voice skills. Inspect package scripts, lifecycle scripts, test harnesses, CI and dependency state before execution. Read-only gh CI inspection is allowed; record commit IDs and distinction from local runs. You alone own existing-test execution. Tests may run ONLY if safely isolated: copy tracked files using git archive into your disposable directory; use a minimal environment without inherited provider/production credentials; use sandboxing to deny network and restrict writes to that disposable directory. Check platform/tool support first. No npm/pnpm installs, dependency lifecycle scripts, migrations, services, paid providers or real user data. If safe isolation is unavailable, stop execution and report static findings plus precise blocker rather than weaken controls. Native Node tests that need no packages can be run under those constraints after inspecting imports/scripts. Save full logs and machine-counted results, distinguish dependency/setup failures from assertion defects. Trace auth/tenant/guest boundaries, record integrity, retention/deletion, abuse/cost limits, public route surface, provider error behavior, and actual versus declared guarantees. Never display secret values; report paths/types only. Cost estimates must separate measured quantities from model assumptions and official current prices. Success: reproducible test evidence where feasible, clearly labelled limits, and prioritized pilot blockers without claiming an audit certifies compliance or production readiness.

## Citation and model handling

Use each role's own ledger in its evidence directory to avoid concurrent file writes and colliding source numbering; include full URLs in structured findings so the coordinator can re-register them in the final shared ledger. Do not reset the parent's existing source ledger. Research artifact citations must pass the loaded grounded-citations procedure. Never send private repository context to DeepWiki, public search/indexing, or DeepSeek. Current configured child route was checked as openai-codex/gpt-5.6-sol with the sole fallback anthropic/claude-fable-5-1; main-chat routing was not changed.

## Stopping and time budget

Aim for a 20–30 minute first pass per role. Stop a repeated blocked route after two equivalent failures. Preserve useful partial findings and state exactly what remains unchecked. Do not spend this pass polishing plans or installing infrastructure instead of inspecting the product. There are no irreversible actions in this plan; any that arise require the parent's and owner's separate authorization.
