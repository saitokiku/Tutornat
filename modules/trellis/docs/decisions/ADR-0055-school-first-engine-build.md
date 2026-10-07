<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0055-school-first-engine-build.md -->

---
id: ADR-0055
title: "School-first scope and engine build authorized"
tags:
  - adr
  - kaizen
  - direction
project: kaizenai-saas
created: 2026-09-12
decided_by: manny
status: accepted; baseline and package prepared; implementation dispatch blocked
sources:
  - "email-8490a65b62ccab3520ab1cc0cf9ca5cf715c2ebe986367bae396f16f776603e2"
---

# Proceed with the engine-first build

Manny's 22:14 CDT email accepts the order in ENGINE-FIRST-PLAN and says “go ahead build.” Full words: [202609130322-manny-school-first-go-build](../history/notes/202609130322-manny-school-first-go-build.md). Adults with independent accounts are a later product. Primary and elementary learning lead the current school-age product. Maths remains first; older school ages are not excluded. This resolves ADR-0053's adult question and supersedes treating algebra-readiness's older age group as the current lead segment.

Authorized: engine-first implementation in KaizenEdu, necessary private engineering issue/PR preparation and paired builder/reviewer work, then frontend architecture, backend architecture and incremental slices. Deployment remains later. No further permission is needed to start this accepted work. Existing release/content/provider/key gates still govern real-learner use. No purchase, credential entry, deletion/history rewrite or unrelated external communication is authorized. This assigned email authorizes one direct reply, durably saved before sending.

PM execution choice: first separate practice from unsupported certification (E1); then trusted assessment/exposure and database enforcement (E2); quiet windows and replay (E3); a local synthetic elementary-fractions teaching demonstration (E4). Day-seven mechanical definitions and the context rubric remain design decisions before full certification; do not invent them as accepted facts in code. K7 content-review owner is still open and is not a gate for synthetic engineering fixtures.

Executed 2026-09-12 22:22 CDT: new source map, event/state contract, five feedback loops, 16 acceptance rows and a staged issue/context/build/review package. Reran the preserved RO-5 harness in a new artifact directory: 17 isolated cases matched their expected findings/controls, 36 loaded source files, zero source changes. Vulnerability reproduction is not an engine pass, PostgreSQL verification or independent review. Evidence: `shared/artifacts/kaizen-engine-start/email-8490a65b/`.

GitHub API access failed and pre-edit vault pull failed DNS. No real issue number, worktree builder, PR, code fix or deployment exists from this turn. The required GitHub-backed dispatch must be performed by an authorized context with access using the staged package; do not substitute queue/guard mutation or invent a running worker. Scope and package are captured locally; remote publication remains the leased supervisor's responsibility.

[ENGINE-CONTRACT](../product/engine-contract.md) · [SPEC](../product/spec.md) · [DRIFT](../product/drift.md).
