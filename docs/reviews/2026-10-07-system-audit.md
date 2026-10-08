# Tutornat: what exists, what breaks, what to carry forward

> **Codex's audit of 2026-10-07, kept verbatim below this note.** Two reviews checked about 30 of its
> code and count claims against d8d8166 and every one matched. Its sections A–E are Queue 4 repair
> items (the mapping is at the top of the [plan](../plans/2026-10-07-integrated-learning-release.md);
> the steps are in [STATUS](../STATUS.md)). Since it was written: Codex measured T01 (ec7b776) at
> 174 passed / 0 failed / 16 skipped in the browser suite. Our T01 (step 0a) is committed but not yet
> on `foundation`. The numbers-speller worktree is committed as db7c472, and Live Tutor phase A has
> moved on from it (d27f31d at 20:37). `content-merge` is merged into `foundation` (d34f845). All 19
> content strands are audited now: 327 findings, 20 blockers. Its "255 findings, two audits not
> completed" below is the earlier count. The current table is in [HANDOFF](../HANDOFF.md). The plan
> and spec it links to are Codex proposals, not the plan of record.

Reviewed 2026-10-07 at `d8d81667f5331d087cc9f422ed4de7667e187e52`.
This is an engineering and product audit, not a claim that families have validated the product.
Implementation instructions: [next release](../plans/2026-10-07-integrated-learning-release.md).
Product design: [one learning workspace](../specs/2026-10-07-one-learning-workspace.md).

## Finding

Tutornat has a substantial practice engine, a coherent visual identity, a usable set of teaching
objects, and much of the infrastructure for a richer tutor. Its main weakness is the space between
those pieces. A question becomes the wrong workflow; a tutor sees the old problem; a manipulation
never reaches the tutor; a hint can disappear from the record on reload. More content and a more
impressive voice will not fix those handoffs.

The next product milestone should make one learning session work from intention to independent
action to continuation. Preserve the implementation. Finish the connections and strengthen the
authority behind the record.

## Review coverage and limits

- Read current product/design/agent instructions, decisions, status, handoff, current release and
  live-tutor specifications, dogfood reports, content-audit evidence and learning-loop proposals.
- Traced active practice, mastery, planner, intake, tutor, stage, spotlight, voice, auth, sync,
  consent, review, export, budget and outcome contracts. Three independent read-only reviews covered
  learning integrity, interaction integration and predecessor archaeology.
- Inspected predecessors' authority documents and relevant implementations, including an important
  unmerged Kaizen-AI strategy branch absent from the parked copy. This is not an assertion that every
  historical source file, generated asset or dependency was read.
- Ran the current verification suite and the complete configured browser suite. Walked a synthetic
  family through local onboarding, Today, a conceptual question, Talk, and practice in Chrome.
- No real child, parent, native Spanish speaker, live voice vendor or production database was tested.
  Mock behavior and source inspection do not establish educational efficacy or natural conversation.
- No product code was changed during this audit. Claude's existing dirty worktrees were preserved.

## Fresh baseline

| Check | Result |
|---|---|
| `npm run verify` | PASS: lint, types, 132 test files / 2,372 tests, production build |
| Full Playwright run, desktop + phone | 148 passed, 22 failed, 16 skipped; 186 total |
| Remote `main` and `foundation` via `git ls-remote` | Both `d8d8166` at review time |
| Remote `content-merge` | `4a6376b`; not the current product |
| Main checkout | Clean `foundation`; local `main` is stale |
| Active content | 134 skills: 84 computed, 50 draft; committed `REVIEWED` list empty |

Machine-readable commands, counts and failure excerpts: [baseline.json](2026-10-07-baseline.json).
The earlier 138/152 browser result is historical. A passing unit/build gate does not mean the
integrated product is green.

The 22 failures are eleven scenarios on both viewports: budget fallback, family-to-practice handoff,
intake status, first-evening grade selector, landing policy link expectation, widget contrast,
retention-page contrast, review-page contrast, weekly email trigger, and two tutor card selectors.
Some are stale or ambiguous test selectors; others are behavior/accessibility defects. Diagnose
each before editing tests. Sixteen skipped cases must be named with their environment dependencies;
they are not passing coverage.

## Browser findings

Synthetic learner: grade 3, homework/test-help goal; production build on local port 3294.

1. Today still leads with generic daily math/English sets, despite the selected homework-help goal.
   The intake box sits beneath the plan, school information and a suggested course.
2. Entering **“I do not understand why 1/2 equals 2/4”** goes to `/courses/new`, with a prefilled
   question, length selector, subject and language. A request for help becomes course administration.
3. Asking **“Why is 1/2 equal to 2/4?”** in demo Talk produces a worked example about naming **1/6**,
   then offers “Name the fraction.” It detects a broad topic but misses the learner's actual question.
   This is a demo limitation, not evidence of the live model's behavior.
4. Starting that practice leaves Talk. The runner's exit points to the practice hub, not the original
   question. The context was never made into one durable work item.
5. Keyboard entry after a hint did not form the intended fraction: number keys continued editing
   the numerator, and Enter after Tab activated the tutor. The older documented “Enter takes another
   hint” issue needs its own exact replay; this pass confirms a broader focus/input mismatch.

The appearance is restrained and consistent. The fundamental UX opportunity is to make the visible
learning object the center of the interaction. In Talk, the transcript currently dominates while
the board behaves like a feed of cards.

## Evidence that changes the release order

Paths below are relative to `apps/web/src/` unless stated otherwise. Line references describe the
reviewed commit; use symbol names after edits.

### A. The progress record needs stronger evidence boundaries

| Finding | Evidence | Required behavior |
|---|---|---|
| Server rechecking verifies a value, not an authorized independent check | `lib/server/db/recheck.ts:32–46`; `db/sync.ts:277–327` | Server-issued, learner-bound, versioned check instances; one response per slot; server receipt time and help history |
| Client check time and assistance are trusted | `db/sync.ts:310,319`; `lib/practice.ts` `recordAnswer` | Client fields cannot advance readiness/delay or erase help |
| Duplicate/easier/future answers can produce “proved” | `learning/engine.ts` `checkResults` / `skillStatus` | Count distinct eligible questions at issued difficulty; reject future evidence and forged check sessions |
| Hint/miss state can be lost on reload or abandonment | `components/practice/Runner.tsx:89,169,182`; `learning/engine.ts:115` | Persist exposure and first response immediately; hydrate a monotonic help latch |
| Lesson assistance is per mount | `components/stage/Stage.tsx:67`; `lib/activity.ts` `checkMemory` | Scene/question identity retains attempts and help across resume |
| An earlier restoration can hide later review failures | `learning/engine.ts:140–146` | Each restoration closes only its preceding refresh episode |

The learning reviewer reproduced three cases with temporary in-memory probes: a level-1 answer
accepted for a level-2 check slot; duplicated questions in two checks, one dated in the future,
producing “proved” without readiness evidence; and a second refresh failure remaining “proved”
after an earlier restoration. The focused existing tests still passed. Add durable regressions
before changing implementation; do not present the whole endpoint chain as penetration-tested.

Even after repair, “independent” means no help recorded by this product under its check protocol.
It cannot certify that nobody helped offscreen. The existing six-day/48-hour/4-of-5 policy is a
product criterion, not a scientific certificate of permanent mastery.

### B. The tutor cannot yet share the learner's working state

- `components/practice/tutor-dock.tsx:9` accepts an opening snapshot, without hint count or updates.
  `Runner.tsx:225` omits hints, while `TutorDrawer.tsx:75` tries to read them through a cast.
- The drawer can retain the prior item when the runner advances. A later reply can describe the wrong
  problem. Stage tutor context similarly uses static `sceneText`; widget state and current quiz
  question are private component state. `TutorPanel.tsx:26` remounts chat per scene.
- `Board.tsx:132` renders static visuals; `:169` navigates away to practice. The existing widgets are
  capable of much more than the tutor's current card protocol exposes.
- `TutorDrawer.tsx:21` records help when opened; Stage marks work helped when the tutor is visible.
  An always-present tutor requires explicit help events. Presence is not itself a teaching action.
- `ProjectView` in `components/stage/scenes.tsx` is local checkbox state. There is no durable learner
  construction, explanation or revision to revisit.

### C. Voice and attention are implemented infrastructure, not an integrated experience

- `lib/spotlight.ts` and `components/spotlight/*` contain useful guards, geometry and movement tracking.
  No production layer mount or screen target wiring was found.
- `lib/voice/session.ts` and `converse.ts` contain the newer conversation infrastructure. Screens
  still use `components/tutor/useVoice.ts`, stage speech and direct `speechSynthesis` separately.
- Use the existing live-tutor spec's cancellation and alignment work. Reverify its vendor API/model
  assumptions. It replaces the old `point_at` timing approach with speech-aligned cue anchors;
  do not wire the obsolete tool simply because it exists.
- Keep the working object visible on phones. The current 80dvh drawer/backdrop can cover the thing
  being explained. Highlighting an obscured object is not joint attention.

### D. Family deployment remains gated on real integration

- `lib/server/db/policy.ts` has `CONSENT_ENFORCED=false`; production `DATABASE_URL` is deliberately
  ignored by `db/client.ts`. Backend scaffolding exists, contrary to stale “no backend” prose.
- Learner model routes lack the consent gate. `ai/client.ts` hashes the learner ID while
  `db/consent.ts` expects raw profile identity. Inserting one function call is insufficient.
- Profile selection, including client-supplied `parent`, is not server authorization. Budgets rely
  on asserted IDs and process memory. These need authenticated, durable contracts before enabling
  external families and paid providers.
- `lib/export.ts` deletes local family state; no authoritative account-deletion route was found.
  Two-device deletion and full server export are release requirements, not copy changes.
- Tutor/practice safety screening is not uniformly applied to course/extract routes. Generated
  lesson schema gates do not establish factual accuracy. Every provider entry must share the same
  authorization/safety/budget path, with explicit output treatment.

### E. Content and outcomes require semantic review

- Content currently lacks the revisions and rendered-question identities needed to reproduce old
  evidence after generator edits. Different seeds can produce the same finite-bank question.
- The historical expansion audit contains **255 findings: 16 blockers, 63 major, 176 minor**, across
  15 audits. Two audits were not completed. Those counts are historical, not a fresh defect total.
- Findings include a partition task passing without partitioning, correct answers unavailable on
  the input pad, biased answer positions, repeated reading questions, defensible distractors
  scored wrong, and phonics speech giving letter names instead of sounds.
- Teacher approval is currently family-local and not bound to content revision/locale. A teacher
  checkbox is not centrally reviewed publication. Global approvals need auditable provenance.
- `learning/outcomes.ts` treats “test goes well” as linked skills being secure; actual school scores
  are separate, and `isSecure` includes refresh. Rename this proxy or compute the intended measure.
- Representation preference compares different tasks. It is a tentative observation, not proof
  that this person is a “visual learner.” No parent-time-saved measure exists yet.

## Recover work before duplicating it

The following local work existed at review time. Inspect it and preserve dirty changes before any
cleanup. Never reset or force-checkout a worktree that another agent may still own.

| Saved work | Where | Action |
|---|---|---|
| Family handover fix | `5d6ca5f`, `.claude/worktrees/wf_d6bbc655-5ba-2` | Review and replay the needed patch |
| Intake/calendar/shell polish | `43d4b71`, `wf_d6bbc655-5ba-4` | Review and replay the needed patch |
| Voice number normalization | `wf_70ee4360-55e-1` | Dirty `speakable.ts`/test plus untracked `numbers.ts`, `speakable.golden.test.ts`; not “unstarted” |
| Content fixes | `00f7234`, `966198b`, `7348ac9`, `3ab4533`, `c5267c6` | None in content-merge ancestry; some worktrees also have dirty edits |
| Content source expansion | `content-merge@4a6376b` | Integrate reviewed units; preserve current legal-route repair and evidence docs |

`merge=union` covers several registries and translations. Conflict-free merges can still duplicate
IDs or scramble prerequisites. Use `git cherry` for patch equivalence; older intake/practice WIP
branches include work already integrated under different SHAs.

## Useful material from earlier attempts

| Source | Keep | Leave behind |
|---|---|---|
| Kaizen-AI | Family/work organization, server-computed summaries, explicit practice-versus-proof distinction | Superseded physical-club pricing and role model |
| Kaizen-AI `origin/claude/strategy-progress-assessment-rb6eju@40a6d4d` | `docs/AI_STRATEGY.md`: workspace where learner acts, tutor where learner asks, record underneath; intake-to-skill bridge failure | Claims that the old business strategy is current |
| `modules/trellis/db/migrations/0014_integration_seams.sql` and `lib/tutor/exposure/ledger.ts` | Locked/idempotent finalization, exposure-before-delivery, novelty and content provenance | Old schema and migrations wholesale; old confirmed rows as trusted new evidence |
| `modules/kaizenedu-tutor/lib/tutor/voice/turn-controller.ts` | Turn cancellation, shared audio clock, measurement concepts | A second voice controller layered over the newer current one |
| `modules/openmaic-classroom/lib/playback/{engine,action-resume}.ts` | Typed teaching actions and resumable scene playback | A second app mounted inside Tutornat |
| `modules/lesson-engine` | Specific useful visual/manipulation behaviors | DOM app, machine-local Hermes bridge, local-file persistence |

The omitted Kaizen-AI branch is inspectable with:
`git -C ../Kaizen-AI show origin/claude/strategy-progress-assessment-rb6eju:docs/AI_STRATEGY.md`.
Its documented failure was especially relevant: visible grading appeared to work while the mapping
that fed evidence and future checks had no caller. The new acceptance tests must trace the whole loop.

## Product direction carried into the new design

The owner explicitly clarified that the system must be fused: a child-intuitive interaction with
enough learning space for adults. Age is not a product split. Shared representations, tools,
continuation and evidence come first; guidance, reading load and permissions adapt independently.

The unfinished learning-loop panel synthesis is input, not approved policy. Its categorical
engagement bans, new assessment rules and claimed effect sizes must not silently become requirements.
Keep useful prediction, practice, retrieval, creation and teach-back ideas; test whether they help.
The next design chooses observable work and independent transfer as its center, with engagement in
service of that work.
