# Code-quality review — Kaizen single tutor (2026-10-04T02:54Z)

**Verdict: PASS** (narrow code-quality/security scope) with 3 non-blocking comments.
No application patch applied. No commit/stash/reset/install/deploy. No provider or live calls.

Scope: 4 classroom paths + 1 new test. NOT an app audit, NOT auth-refresh, NOT spec re-verification.
`education-product-discovery/` is not a git repo; the app repo is `education-product-discovery/classroom`
(diff taken there; the two Kaizen files are untracked and were read in full).

## Checks actually run
- `npx vitest run tests/classroom/kaizen-solo-tutor-selection.test.ts` -> **9/9 PASS** (123ms)
- `npx eslint` on all 5 paths -> **0 findings**
- static added-line scan for secrets / eval / child_process / injection sinks -> **clean**

## Load-bearing verifications
- **Hydration order**: `applyGeneratedAgents` (load-classroom.ts:192) precedes `restoreSelection` (:195);
  `applyGeneratedAgentsToRegistry` spreads `...rest` so `role` is persisted -> `getAgent(id)?.role` resolves.
- **Role match is a validated enum**, not free text (classroom-generation.ts:149/175 asserts exactly one
  `teacher`; roster-tools.ts:165/266 re-validates; defaults use the same literals).
- **Fail-closed is genuinely loud**: empty `agentIds` is rejected 400 at app/api/chat/pi/route.ts:136-144.
  No peer promotion.
- **Lifecycle**: `soloTutor` is in the `useCallback` deps (ClassroomSurface.tsx:170); stale-epoch
  `isCurrent()` guards untouched; narrowing is pure and adds no cancellation window.
- **Multi-agent branch retained byte-identical**; 3 tests pin upstream behavior incl. omitted role lookup.
- **Same owner**: `getAgentRole` reuses the existing `getAgent` closure — no new data source.

## Security
None found. `soloTutor` only NARROWS an already client-chosen roster and grants nothing; server-side
`agentIds` validation is independent and unchanged. This is a UI-voice narrowing, **not** control-plane
hardening, and is not claimed as such.

## Non-blocking comments
1. **Unverified intent, not capability** — the docblock says the stage artist and background coach
   "stay as tools the tutor uses". That tool wiring does **not** exist in this diff; only the speaking
   roster is narrowed. Recommend rewording to intent or dropping the clause.
2. Empty selection surfaces as a generic 400, not a learner-legible "no tutor" message.
3. `role` is typed `string` though a three-value enum is enforced upstream; a shared union would make
   the `'teacher'` comparison compiler-checked. Pre-existing pattern.

## Explicitly not claimed
Game feedback unproven (F10 "Missed a 1/2" establishes neither a wrong-quarter catch nor a wrong-text
bug nor a correct catch; prior wrong-text claim stays UNSUPPORTED; a lost life can be motor error).
No child-readiness claim. ES stage / a11y / game-concept / growth-coach handoff / model-response
identity remain open. Native auth 5-min stale window and old-token residuals not quality-accepted.
No preview promotion.
