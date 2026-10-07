# Independent quality review — execution instructions

Planner: current Astra coordinator. Scope: the local synthetic K–8 parent/student concept explorer, not a production system. Coordinator spec re-review is PASS; final quality approval remains pending. Reviewers are fresh Fable contexts, with requested max effort and approved Astra → Opus → Sol backups; DeepSeek excluded. No application edits during the parallel review.

## Shared invariants

- Root `/Users/man/education-product-discovery/design`; source `index.html`, `styles.css`, `app.js`, `model.js`. Review full files: this new artifact is outside a git repository. Do not initialize git, stage, stash, reset or commit. Do not touch original repositories, snapshots, routing/config, credentials or production systems.
- Parent-first academic organization plus standalone student learning/organization/accountability; K–2, 3–5, 6–8; English/Spanish; three real interaction concepts A/B/C; human tutors deferred. Math/literacy examples, other subjects organized only. No complete curriculum, efficacy, mastery or compliance claims.
- No network calls, packages, remote research, real data, school accounts, microphone/audio/AI, storage, analytics, deployments or purchases. Everything remains local synthetic demo state. Role switch is not authentication. Planned 48–72h/day-7 checks are not actual assessments.
- Source hashes: `evidence/coordinator-rereview-manifest.json`. Test green results do not override independently reproducible issues. Report facts separately from hypotheses and future production requirements.
- Preserve all implementation and existing tests/reports. Write only assigned new report/evidence paths. No subdelegation. Budget each: 30 tool calls or 20 minutes; save a useful report early and return explicit coverage gaps.
- Browser: use existing installed Chrome and zero-dependency CDP pattern in `tests/spec.e2e.cjs` or `tests/repair.e2e.cjs`. Use `--remote-debugging-port=0` and your own TMPDIR profile; do not use the original harness's shared port 9333. Do not retry the known default-browser failure or change browser settings. Clean up only your own process/profile.

## Role 1 — code, state correctness and privacy

1. Read application/model/HTML plus tests as needed. Trace all user-supplied data into rendering, state updates and DOM. Check escaping, dynamic execution, network/storage, CSP and the in-memory-only promise. Limited static scan found `innerHTML` sinks at app.js lines 665, 669, 677, 679; these are investigation targets, not asserted vulnerabilities.
2. Verify state invariants using independently chosen sequences and actual controls when UI matters: task isolation, locale changes, reset/replay, repeated assistance/completion, dates/proposals/plans and evidence attribution. Run focused pure-model probes and an isolated browser probe for any high-impact candidate. Do not flag debug-only impossible states as end-user defects without explaining reachability.
3. Save reproductions and logs only under `evidence/quality-code/`; write `QUALITY_CODE_REVIEW.md` with severity, file/line, exact reproduction, expected/actual, scope and known gaps. Fail closed on concrete security or logic errors. Suggestions and missing production capabilities are separate.
4. Return structured JSON with verdict, report_path, blocking_findings, suggestions, checks_run, evidence_paths, limitations. No application edits or task closure.

## Role 2 — accessibility, child/parent experience and truthful learning copy

1. Read HTML/CSS and relevant app templates/copy, inspect real rendered desktop/mobile states. Review K–2 scaffolding/readability, older-child planning/disclosure, EN/ES generated vs user-authored content, scripted voice limits and assisted-vs-independent evidence. Native-speaker certification or user study is not available; label those gaps.
2. Test focus after state changes with real keyboard events, labels/roles/live regions, reduced motion, mobile hit reachability including parent forms, and important enabled text/control contrast with calculations where possible. Match the approved 1440px desktop / 390px phone scope; extra sizes are suggestions unless they reveal a core defect. Capture settled screenshots. Do not mistake disabled text for an enabled contrast violation.
3. Exercise a parent-to-student sequence independently rather than relying only on debug dispatch. Check that meaningful steps and help visibility are reachable in A/B/C without switching concepts. Distinguish behavioral defect from aesthetic preference; no redesign assignment.
4. Save probes/screenshots/logs only under `evidence/quality-ux/`; write `QUALITY_UX_REVIEW.md` with severity, source locations, exact repro, evidence, checked dimensions and limits. Return structured JSON with verdict, report_path, blocking_findings, suggestions, checks_run, evidence_paths, limitations. No application edits or task closure.

## Coordinator closeout gate

Read both exact reports, verify any blocker and source hashes, then commission only targeted repairs if necessary. Re-run affected regressions and retain evidence. At most two quality repair/re-review cycles before explicitly reporting remaining unresolved issues. Do not weaken coordinator tests. Only after both bounded gates pass may the local prototype be delivered and the owner asked to choose an interaction direction; no production stack, deployment or real integrations are implied.
