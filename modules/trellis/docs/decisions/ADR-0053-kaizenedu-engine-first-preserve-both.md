<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md -->

---
title: "KaizenEdu is the build home; preserve both and verify the engine first"
tags:
  - adr
  - kaizen
  - direction
id: ADR-0053
decided_by: manny
sources:
  - "email-299806d97d2c0ba25de76e31fd3aba516ba32609d7dc598b30b57bf42937c3f2"
project: kaizenai-saas
created: 2026-09-12
status: accepted direction; implementation plan proposed
---

# KaizenEdu, engine first, plans before implementation

Manny's assigned email chooses the KaizenEdu repository, preservation of both earlier attempts, one test website, deployment later, and engine verification → frontend architecture → backend architecture → incremental construction. His words: [202609122057-manny-engine-first-whole-learner](../history/notes/202609122057-manny-engine-first-whole-learner.md). This supersedes the new-repository destination proposed in RO-6 and the handoff. ADR-0049's isolation and dependency-accounting requirements still apply inside KaizenEdu.

The product includes syllabus, corrected homework, practice and teacher-document imports; a source-linked learner history; AI homework management; an interactive teaching canvas; and human feedback. All school ages, including younger siblings, are already accepted in ADR-0045; adult accounts remain open. The prior maths-first direction stands unless Manny expands subject scope.

PM implementation choices: use a KaizenEdu worktree branch and `reference-implementations/` for sanitized reusable old code, with origin revisions, provenance and a disposition manifest. Verify import/build closure before moving code. Full history bundles stay private outside the website. No deletion, history rewrite, public deployment or credential use is inferred from “scrub everything out.”

Preservation executed: both clean cached repos archived with all locally known refs; `git bundle verify` passed; HEADs unchanged. KaizenEdu `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`; Kaizen-AI `91af9e452c7df5867afa7249a6dc58b00003f531`. Manifest: `shared/artifacts/kaizen-preservation/20260912T204831-0500/manifest.json`. No product files changed, no remote fetch, no deployment.

Independent evidence remains mandatory before mastery; no PID formulation or algorithm is presumed optimal. Community analysis is a later aggregate learning-quality function, not an authorization for raw cross-student disclosure or causal school rankings.

The assigned email authorizes one direct answer in this conversation, using the deterministic reply saved before sending. It authorizes no unrelated communication, purchase or queue mutation.

[ENGINE-FIRST-PLAN](../product/engine-first-plan.md) · [SPEC](../product/spec.md) · [DRIFT](../product/drift.md).
