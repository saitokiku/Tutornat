# E1 — Establish the engine baseline and separate practice from certification

Status: [issue #1](https://github.com/gokumann-pm/kaizenedu/issues/1) is open; no builder or reviewer has started. Repository bootstrap only.

The inherited generated-check → student-model → parent-report chain can claim
mastery from tutor-authored keys and practice. Establish a runnable, offline baseline
in this new private repository, then contain that unsupported certification while
preserving useful practice. This is E1 containment, not full assessment qualification.

## Authority and inputs

[SPEC v0.3 §3.1 and §9](https://github.com/gokumann-pm/pm/blob/main/vault/40-projects/kaizenai-saas/SPEC.md)
and ADR-0055 govern behavior. ADR-0059 supersedes the earlier `saitokiku/KaizenEdu`
destination. The old E1 packet's instruction to repair that source checkout is stale.
[Requirements](requirements.md) and [engine matrix](engine-acceptance.md) supply context.

Read-only sources:
- `/Users/mann/pm/shared/repos/KaizenEdu` at `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`.
- `/Users/mann/pm/shared/repos/Kaizen-AI` at `91af9e452c7df5867afa7249a6dc58b00003f531`.
- RO-5 harness and prior evidence: `/Users/mann/pm/shared/artifacts/kaizen-engine-start/email-8490a65b/`.
- Extraction map: `/Users/mann/pm/shared/artifacts/kaizen-research/07-extraction-boundary.md`;
  candidate manifest `ro6-retained-files.txt`, import edges `ro6-source-trace.json` beside it.

## Baseline prerequisite — criterion 0

The target starts without runtime code or dependencies. Create an auditable baseline
commit with only the engine/check/report source closure needed for E1, exact source
hashes, licenses, a pinned minimal manifest/lockfile and an offline synthetic harness.
Use the shared caches. Keep reference snapshots out of compiler/test/package inputs.
Treat existing generated/practice behavior as an observed failure baseline, never as
approved behavior. Establish positive session/practice controls before the containment
commit so the reviewer can distinguish import drift from the fix. Every source consumer
must be inventoried as imported-and-tested or excluded-and-unreachable. A helper-only
label change cannot establish a report/API boundary. Use thin local adapters where needed.

Do not import source Git history, secrets, live configs, general provider registries,
Gemini routes, the full OpenMAIC workspace or the unresolved renderer group. Production
providers, real learners and deployment remain outside this work. Avoid broad UI/backend
implementation. If the minimum source closure cannot be demonstrated, return that precise
block and the reviewable extraction result; do not claim E1 repaired.

## Acceptance criteria

1. Tutor-authored/generated checks, assisted work and ordinary practice update practice estimates without creating qualifying evidence or promoting a certified mastery claim. Cover long streaks and repeated sessions, null and supplied item IDs, correct and wrong generated keys. A non-null ID alone is not independent authority.
2. Every learner and parent API/view/report consuming existing `mastered`/`confirmed` state treats unsupported legacy state as an estimate or unverified history. Persisted rows remain intact. No report emits a false certified label or counts it as independently confirmed. Enumerate all consumers and verify their actual boundary behavior.
3. Practice remains functional: valid graded practice records its result, estimate, misconception and normal session progress exactly once for the existing sequential flow. Abstentions remain ungraded. Compare unaffected behavior against the baseline; disclose existing concurrency failures rather than marking them fixed.
4. Add meaningful tests showing failure at baseline and success at the change. Record source SHA, literal commands and output. Distinguish negative tests from positive practice controls. The original RO-5 probes deliberately assert vulnerable behavior: convert applicable expectations rather than treating their exit zero as a repair pass.
5. Preserve both source repositories and their histories; import only the audited dependency closure into the new product. No vault/SPEC/DIRECTION/instruction-file edits, credentials or deployment. Typecheck, relevant invariant tests and configured CI pass, or name the precise environmental block; no empty CI rollup counted as green.


## Evidence and review

Criterion → command → baseline/head result; source/dependency and consumer inventories;
retained-history fixture; positive practice and adversarial certification cases; typecheck
and relevant engine invariants. Original RO-5 scripts assert known vulnerabilities, so
exit zero from them does not establish repaired integrity. Convert applicable expectations.
A successful SQLite harness is not PostgreSQL permission or concurrency evidence.

There is no CI workflow in the bootstrap. The builder supplies reproducible local checks
and states CI status accurately; an independent reviewer reproduces every criterion and
reviews the exact PR head. Template implement-feature v9; independent review-pr v8.
No full mastery implementation or claim of all seven classes closed in E1.

## Dispatch preparation

Owner: Astra PM. Planned builder and independent reviewer: codex / gpt-6-astra.
Prepared files: `/Users/mann/pm/shared/context/gokumann-pm-kaizenedu-1.md`,
`gokumann-pm-kaizenedu-1.brief.md` and `gokumann-pm-kaizenedu-1.review.md` beside it. No active timeout until launch; staged time
box is 60 minutes per builder/reviewer turn, with a precise partial result if needed.

Skills: read `tutor-loop` and `claims-discipline` from the read-only KaizenEdu
`.claude/skills/` paths; `pedagogy-fractions` only if changing item assumptions.
Current accepted SPEC overrides historical 24-hour/EMA certification or cohort rules
inside those skills. Invoke installed `verification-before-completion`; if unavailable,
execute and disclose the same checks. The reviewer additionally uses the installed
code-review skill if available and reads no builder narrative.

Write only to the dispatched product worktree, `shared/artifacts/` and `run/worker-inbox/`.
Both source repositories are read-only. Workers never edit the vault, STATE.md,
SPEC.md, DIRECTION.md or instruction files, and never access employer material.
