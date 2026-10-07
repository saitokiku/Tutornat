# Integrated Learning Release Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement task-by-task. Checkboxes track verified work, not dispatch.
> Read the linked specifications and the task's dependencies before editing. This plan is proposed;
> no implementation task below was completed by the planning pass.

**Goal:** Make one continuous, visual learning session work from a person's question through useful
teaching, their own action, honest evidence and later continuation, with natural voice and shared input.

**Architecture:** Extend the existing practice/learning/planner domains with a durable session and
versioned work objects. Existing store actions remain the UI boundary; server-issued assessments and
authorization establish trusted evidence. One tutor, one audio owner and semantic attention use the
same current state; models propose bounded actions and deterministic code applies them.

**Tech Stack:** Existing Next.js 16.4, React 19, TypeScript, Tailwind 4, Zod, AI SDK 7, Drizzle with
PGlite/Postgres, Vitest and Playwright. No application rewrite or additional agent framework.

**Spec:** [One learning workspace](../specs/2026-10-07-one-learning-workspace.md) and
[models, voice and Jev](../specs/2026-10-07-models-voice-and-jev.md).
**Evidence:** [System audit](../reviews/2026-10-07-system-audit.md),
[fresh test baseline](../reviews/2026-10-07-baseline.json),
[independent model benchmarks](../reviews/2026-10-07-model-benchmark-evidence.md).

## Global constraints

- Tutornat is the main repository; the on-screen name remains KaizenEDU. Read `PRODUCT.md`,
  `DESIGN.md`, `AGENTS.md`, `docs/DECISIONS.md`; newest owner direction wins over historical plans.
- One fused product across ages. K–9 is the reviewed curriculum focus; a meaningful adult-owned
  task and non-reading journey are acceptance requirements now. No separate child/adult application.
- Preserve the warm paper/ink/rose visual identity. Teaching diagrams, demonstrations, purposeful
  animation, speech and input are core. Decorative website ornamentation comes later.
- No imports from `modules/`. Port reviewed invariants/adapters selectively. Preserve dirty worktrees.
- Keep the existing numerical `learning/engine.ts` `RULES`. Assistance-policy clarification must be
  explicit; draft/open content and legacy client evidence cannot silently become verified mastery.
- Every UI string uses `t()` in EN/ES. 44px minimum targets; young defaults 56px. Support 320px,
  keyboard/tap equivalents, reduced motion, enlarged text and text alternatives to audio.
- One learner-facing tutor. No answer keys/private raw objects in model prompts. No arbitrary model
  JavaScript, DOM selectors or navigation. Code checks answers and authorizes all writes.
- No camera activation in this release. Future avatar/gaze seams are specified, with manual fallback.
- Provider-free demo remains useful and explicitly limited. Mocks are not live-model/voice evidence.
- No live-family claim until identity/consent/persistence/deletion/content/device gates pass. Pushing
  reviewed commits is authorized; switching the production domain is a separate owner decision.

## Review focus

1. **Two devices/tabs race:** neither duplicate responses nor a stale local save can erase help,
   resurrect deleted records or promote a check. Covered by T02–T04 and T12.
2. **Learner changes the object during a reply:** old speech, tools and highlights must stop without
   discarding the new work. Covered by T06–T08.
3. **Permission/provider disappears mid-turn:** revocation stops capture and outgoing calls; outages
   leave usable work and truthful status. Covered by T03, T08, T10 and T12.
4. **Input methods overlap:** touch, keyboard and speech cannot submit two answers or trap focus;
   IME composition and uncertain recognition never become wrong answers. Covered by T01, T06, T08.
5. **A novice adult or advanced child chooses atypical support:** preferences adapt independently
   from grade/account authority, and neither hits a canned shallow workflow. Covered by T05, T09, T13.

## 0. Start here; preserve what already exists

Reviewed base: `d8d81667f5331d087cc9f422ed4de7667e187e52`. At review time remote `main` and `foundation`
both pointed there; local `main` was stale. Check remote state afresh before choosing a base. The
planning branch is `codex/integrated-learning-plan`; changes here are documentation only.

Fresh baseline: verify passed (2,372 tests); Playwright **148 passed / 22 failed / 16 skipped**.
Do not repeat the earlier 138/152 result as current. Read the JSON for failure details and commands.

- [ ] Integrator records `git status --short`, `git worktree list`, remote head and intended base.
- [ ] Preserve dirty Claude worktrees before recovering their work: inspect tracked diffs **and
  untracked files**, get a safe checkpoint from any active writer, and record source SHA/path.
- [ ] Inspect recovery candidates in the audit: `5d6ca5f`, `43d4b71`, the uncommitted numbers-speller
  files, and five content-fix branches. Use `git cherry`/diff to avoid replaying patch-equivalent work.
- [ ] Keep `content-merge` out of the release until selected content passes T11. Its 91 unique commits
  are not a single trustworthy package; union merges hide duplicate/ordering errors.

No second round of broad archaeology is required before fixing the concrete failures below.
Historical live-tutor/1.0 plans remain implementation references where compatible. This order
supersedes their “merge all content first” and “adults last” assumptions.

## 1. Work ownership and order

Paths in task tables are relative to `apps/web/`, except paths explicitly beginning with `docs/` or
`.jev/`. A **new** file is proposed; a listed existing file is a seam, not a request to rewrite it.
New migrations use the repository's migration convention after inspecting `src/lib/server/db/schema.ts`.

| Task | Owner lane | Depends on | Independently reviewable result |
|---|---|---|---|
| T01 | Journeys | Base | Existing browser journeys and focus behavior repaired |
| T02 | Evidence | Base | Durable help/first-response record and refresh repair |
| T03 | Server | Base | Real authority at every model/voice/sync boundary |
| T04 | Evidence + server | T02, T03 | Server-issued checks with versioned provenance |
| T05 | Integrator | T02 contracts, T03 authority | Durable session, preferences and adult ownership |
| T06 | Workspace | T04, T05 | Question → shared object → contextual tutor → resume |
| T07 | Workspace | T06 | Reciprocal pointing and synchronized visual transitions |
| T08 | Voice | T03, T05–T07 | One interruptible low-latency voice/input path |
| T09 | Learning continuity | T04–T06 | Create, transfer, continue and truthful receipts |
| T10A | Model/evaluation | T03, T05–T06 | Jev, text/visual/preparation comparison harness |
| T10B | Model/evaluation + voice | T08, T10A | Measured voice and whole-system selection |
| T11 | Content | T04 version contract | Reviewed depth journeys in current subjects/EN/ES |
| T12 | Server | T03–T05, T09 | Production persistence, revocation, export/deletion |
| T13 | Integrator + independent reviewer | T01–T12 | Cross-age/device acceptance and release evidence |

Parallel work is appropriate only after shared contracts merge. The integrator alone edits
`lib/store.ts`, `lib/types.ts`, `learning/types.ts`, sync wire/schema and translation registries while
contracts are changing. Other owners propose additions; do not use union merge as conflict resolution.
T02 and T03 can start in separate worktrees, with their shared-type changes integrated sequentially.
T06–T08 share screen/turn ownership and should not land concurrently without an agreed file split.

Each task follows: reproduce/add the failing regression → observe failure → smallest implementation
→ focused checks → required verification → browser behavior → review → commit/push. Do not mark a
task done because a mock or component passes while its route remains disconnected.

## 2. Contracts to land with their first consumer

These names are proposed integration contracts, not currently exported functions. Use existing domain
types such as `Locale`, `Attempt`, `Profile` and `Slot`; do not fork them into a new framework.

### Session and current work (T05)

New `src/learning/session.ts` owns pure session types/reducer. New `src/lib/session.ts` owns persisted
actions. Session ID is separate from `StoreState.session`, which currently means account selection.

```ts
type WorkRef = {
  id: string;
  kind: "problem" | "scene" | "source" | "artifact";
  revision: number;
  recordId: string;
};
type LearningSession = {
  id: string; profileId: string; goal: string;
  origin: "today" | "question" | "practice" | "course" | "school";
  phase: "explore" | "try" | "explain" | "create" | "independent" | "paused" | "finished";
  active: WorkRef; threadId: string; revision: number;
  refs: { setId?: string; courseId?: string; sceneId?: string; eventId?: string };
  createdAt: number; updatedAt: number;
};
type WorkAnchor = {
  sessionId: string; objectId: string; objectRevision: number; turnEpoch: number;
};
```

`StartSessionInput` contains `profileId`, goal/origin, initial `WorkRef` and optional refs.
`startOrResumeSession(input: StartSessionInput): LearningSession` reuses only an explicitly matching
unfinished work reference for the same learner; a new goal is not silently deduplicated by text.
`dispatchSession(command: SessionCommand): CommandResult` checks ownership, command ID and expected
revision. `CommandResult` is `applied | duplicate | stale | forbidden | invalid`, with resulting session
revision where applicable. An old result never overwrites newer work; UI offers an explicit retry.

`SessionCommand` is a discriminated union for learner selection/input, authorized object mutation,
phase change and pause/resume. Each variant names its payload schema. Server sync uses revision
conflict handling; do not rely on client timestamps to decide whose work wins.

Editable work lives in a new `workspaceObjects` store/sync collection. `WorkspaceObject` is a
discriminated union with ID, profile/session IDs, semantic revision, source/version reference and
only the learner-editable state for its kind. `WorkRef.recordId` points to it; source content and
server-only keys remain in their existing stores. T05 owns schema/storage; T06 supplies the first
problem/scene/source adapters, and T09 adds artifact adapters. Persist current values, selected span
and draft response, not every animation frame.

### Public observation and commands (T06)

Extend `src/lib/ai/context.ts` with a strict `TutorObservation` schema: anchor, locale, independently
chosen guidance/pace/reading support, goal, public work union, selected semantic target, confirmed
learner input and bounded recent meaningful events. `observeSession(sessionId: string): TutorObservation`
is constructed field-by-field from visible state. At most 12 recent meaningful events; earlier
facts come through referenced summaries. Do not dump the store or an entire `Item`, `Scene` or `Widget`.

Adapters expose `getPublicState()`, `listTargets()` and `apply(command)` for their concrete object kind.
Allowed model commands are initially `point`, `explain`, `offerRepresentation`, `proposeExample`,
`offerPractice`. A model cannot submit an answer, change the learner's goal, accept its own suggestion
or write an assessment record. Each command carries a `WorkAnchor`; validate at parse and execution.
Meaningful learner edits increment semantic revision and invalidate the response epoch. Animation
frames, layout and caption delivery do not. An accepted tutor demonstration command advances the
revision atomically and returns the acknowledged anchor for its own continuation. An intervening
learner edit defeats that continuation; it cannot steal control back.

`submitLearnerResponse({commandId, anchor, attemptId, response, inputMode})` is the sole confirmed
answer path for pads, text and voice. `inputMode` is `touch | keyboard | voice`; it does not change
correctness or erase assistance. Speech recognition produces a draft until confirmed by an explicit
action or an already-enabled, tested auto-submit policy for an unambiguous answer.

### Assistance and evidence (T02/T04)

Extend `learning/types.ts` with immutable `HelpExposure` and `ResponseEvent` records. Both identify
learner, active attempt, item/version, skill and source session, plus local capture and server receipt
times. Before T05, source may be an existing set/scene reference without a session ID; T05 attaches
new events to the real session rather than inventing a temporary parallel session system.
`AttemptSource` contains profile ID, skill ID, item fingerprint, content version (`legacy` until
versioned), optional session/grant IDs, and either `{kind: "set-slot", setId, slotId}` or
`{kind: "scene-question", courseId, sceneId, questionId}`. These source identities exist before T05.
`openOrResumeAttempt(source: AttemptSource): AttemptContext` persists identity when a question is presented,
before help or a response exists. It returns attempt ID, item/version and existing response/help state.
Reload and concurrent tabs use that identity; a fresh question receives a new one. T04 binds check
attempts to grant/slot identity. An attempt context is not itself a scored `Attempt` evidence row.
Help additionally records kind and delivery status; first response is distinct from final
successful correction. `recordHelpExposure(input): HelpExposure` must durably latch before revealing
instructional help. For synced checks it must be acknowledged server-side before help is released;
offline help exits check mode to practice. An interrupted reveal stays conservatively assisted.

Add `EvidenceProvenance` to attempts: `legacy-local | local-recorded | server-practice | server-check`,
plus content version, item fingerprint, receipt time and optional assessment grant/slot IDs. Validation
is a server function, not a trusted client enum. The client may display its provisional practice
history; only a validated server grant can contribute to the synced verified-check tier.

Do not retroactively delete old work. Migrate existing rows to `legacy-local`; show their historical
activity, with provenance wording. Never relabel previously unverified evidence as verified on sync.

### Attention/input extension (T07/T08)

`AttentionCue` = work anchor + semantic target ID + utterance ID + audio-run ID + optional phrase
range. One cancellation epoch covers tools, speech and cues. `InteractionSignal` includes explicit
target selection, input/speech state and reserved synthetic gaze/presence variants with capture time,
quality and consent epoch. Sensor data is transient; only accepted learner/teaching actions persist.
The manual implementation lands now; no camera request or face-tracking dependency does.

## 3. Tasks

### T01 — Restore existing journeys and reliable answer input

**Files:** existing `e2e/{aiinfra,family,intake,journey,landing,stage,trust,tutor,practice}.spec.ts`;
`src/components/practice/{Runner,AnswerPad,FractionBarPad}.tsx`; concrete components named by failures.
Recover applicable portions of `43d4b71`/`5d6ca5f` after inspecting their diffs.

**Interfaces:** preserve current routes and action APIs. Produces a trustworthy browser baseline.

- [ ] Write regression `hint_then_keyboard_fraction_submits_once`: hint → numerator/denominator entry
  → Enter; assert one intended response, no extra hint and no tutor opened by accidental focus.
  Add touch equivalent and IME-composition Enter case in `Runner.test.tsx`/`practice.spec.ts`.
- [ ] Run that test first and record the actual failure; distinguish the audit's focus reproduction
  from the older “Enter takes another hint” report.
- [ ] Diagnose all 11 failing scenarios in baseline JSON. Repair behavior/contrast; where a selector
  is ambiguous, scope it to the intended role/card and retain the substantive assertion.
- [ ] Inventory all 16 skips in `docs/reviews/integrated-release-evidence.md` (new): reason, environment,
  owner, activation test. Move required local coverage out of skips; do not lower axe thresholds.
- [ ] Run `npx playwright test --workers=4` with a dedicated `E2E_PORT`; expect zero unexplained failures.
  Commit/push `fix: restore current learning journeys and answer focus` after the merge gate in §4.

### T02 — Make assistance and first responses durable

**Files:** modify `src/learning/{types,engine}.ts`, `src/lib/{practice,activity,acts,store}.ts`,
`src/components/practice/Runner.tsx`, `src/components/stage/{Stage,scenes}.tsx`;
new `src/learning/evidence.ts`, `src/lib/evidence.ts`; extend corresponding tests.

**Interfaces:** produces `recordHelpExposure`, `recordFirstResponse`,
`assistanceFor(attemptId): AssistanceState` (`assisted`, exposure IDs, last help time).
Use §2 records, with pure reducers in `learning/evidence.ts` and storage in `lib/evidence.ts`.
Also produces `openOrResumeAttempt` and `AttemptSource` from §2; T05 subsequently links sessions.

- [ ] Add failing `help_survives_reload_and_abandon`: hint → reload → right answer remains assisted;
  hint → abandon → another check sees the help clock. Add `miss_survives_reload`, scene resume,
  two-tab ordering and repeat-record ID idempotency cases. Assert the evidence, not just a badge.
- [ ] Add `second_refresh_failure_requires_new_restoration` in `engine.test.ts`: restore once, fail
  a later review, expect refresh again. Freeze time; preserve existing numerical constants.
- [ ] Open/persist attempt identity when the question appears. Persist help before revealing it and
  first responses before feedback. Hydrate state instead
  of resetting mount-local hints/tries. Opening a tutor is neutral; released content help latches.
  Reading/navigation accommodations stay practice-only where the assessment policy is unresolved.
- [ ] Derive quiet-period eligibility from recorded exposure, including abandoned work. Do not let
  a local “unassisted” flag undo a prior event. Repair refresh episode matching by chronology.
- [ ] Run `npx vitest run src/learning src/lib/evidence.test.ts src/lib/practice.test.ts src/components/practice/Runner.test.tsx src/components/stage`.
  Expect all regressions and existing law tests to pass. Browser-test reload/resume, then §4;
  commit/push `fix: preserve assistance and first-response evidence across resume`.

### T03 — Authorize every remote capability from the account session

**Files:** modify `src/lib/server/db/{auth,consent,policy,wire,sync}.ts`, `src/lib/server/budget.ts`,
`src/lib/ai/client.ts`, every `src/app/api/{tutor,ai,voice,sync}` route; new
`src/lib/server/authorize.ts`, `authorize.test.ts`; route regression tests.

**Interfaces:** `authorizeLearningRequest(request, capability): Promise<LearningPrincipal>`;
principal contains server account/learner IDs, adult-self or authorized-guardian authority,
applicable consent receipt/version and allowed processors. Capabilities enumerate tutor, generation,
recognition, speech, sync and check. Never infer authority from grade or client-selected `parent`.

- [ ] Write table-driven unauthorized-route tests: forged IDs, other family's learner, missing/revoked
  consent, raw/hash-ID mismatch, client `parent`, expired session. Assert zero provider calls/tokens.
- [ ] Implement server principal resolution before budgets, model calls and voice token issuance.
  Repair opaque-client-ID mapping explicitly; scrubbing names is not authorization.
- [ ] Add server-authorized adult self ownership, separate from child/guardian grants. Existing
  signed-in selection UI does not itself grant permission. Consent revocation invalidates issued
  app capability grants and triggers active-session cancellation.
- [ ] Store budget reservation/settlement under server account IDs using the existing DB layer.
  Test two concurrent requests on different simulated instances against one remaining allowance;
  exactly one reservation succeeds. Retain no-DB demo mode; protected remote routes fail closed.
- [ ] Apply input safety to all remote generation/extraction paths before model calls; validate output
  shape/source/tool actions before release. Untrusted uploaded instructions cannot change permissions.
  Native voice has the same admission order: authorize → screen committed turn → latch applicable
  help → release output. Test provider termination/credential lease separately from client cancellation.
- [ ] Run `npx vitest run src/lib/server src/app/api src/lib/ai/client.test.ts`; include token revoke,
  cancellation and budget tests. §4; commit/push `fix: enforce account authority for AI voice and sync`.

### T04 — Issue checks the server can actually verify

**Files:** modify `src/learning/{types,engine}.ts`, `src/practice/types.ts`, `src/lib/{practice,sync}.ts`,
`src/lib/server/db/{schema,wire,sync,recheck}.ts`; new `src/lib/server/db/assessment.ts`, tests;
new `src/app/api/checks/{issue,submit}/route.ts`, route tests; migration with rollback/read compatibility.

**Interfaces:** `issueCheck(principal, {skillId}): Promise<AssessmentGrant>` and
`submitCheck(principal, {grantId, slotId, response, commandId}): Promise<AssessmentReceipt>`.
Grant stores learner, fixed item/version/fingerprint/difficulty, eligible policy version, issue time,
expiry, slot identities and consumption state. Responses do not supply correctness/help/time authority.

- [ ] Add regressions for the audit's level-1-for-level-2 substitution, duplicate slot with different
  client IDs, forged readiness, future timestamps, wrong learner, reused grant and two-device submit.
  Assert no invalid case contributes to `checked`/`proved`; atomic duplicate returns prior receipt.
- [ ] Issue only when server evidence satisfies existing readiness and quiet-period rules. Count
  distinct questions/slots and check days using server time; preserve 9/10, 4/5, six days and 48 hours.
  Persist review/content policy versions; reject expired or changed-version grants conservatively.
- [ ] Define item fingerprint from normalized meaningful question content, not seed alone. Store the
  frozen versioned item/key server-side; serialize only public question to clients/models. Generator
  edits cannot rewrite the question being checked or historical interpretation silently.
- [ ] Remove sync's forced `assisted=false` for check mode. Imported/offline/client-authored checks
  retain activity provenance and cannot create verified grants. Keep provisional local work usable.
- [ ] Run `npx vitest run src/learning src/lib/server/db/assessment.test.ts src/lib/server/db/recheck.test.ts src/lib/server/db/sync.test.ts src/app/api/checks`.
  Include clean-DB and legacy-data migration tests. §4; commit/push `feat: verify delayed checks from server-issued evidence`.

### T05 — Add one resumable session and independent presentation preferences

**Files:** new `src/learning/session.ts`, `session.test.ts`, `src/lib/session.ts`, `session.test.ts`;
modify `src/lib/{store,types,sync}.ts`, DB wire/schema/sync, `src/components/profiles/LearnerForm.tsx`,
`src/components/shell/{AppShell,Switcher}.tsx`, EN/ES strings.

**Interfaces:** §2 `LearningSession`, `WorkRef`, `WorkAnchor`, `SessionCommand`, `CommandResult`,
`startOrResumeSession` and `dispatchSession`. Add profile preferences from spec §4, independently
from grade and permissions. Store collection name `learningSessions` avoids the existing `session`.

- [ ] Add reducer/store tests for same work resumed after reload, new goal explicit, learner switch
  isolation, stale revision rejected, duplicate command no-op, legacy store migration lossless and
  conflicted device update preserving both work versions until resolved.
- [ ] Implement durable session actions and sync validation. Derive session references rather than
  duplicate attempts/transcripts. Preserve phase, object revision, input draft and return position.
- [ ] Add `adult_self_can_manage_own_record` and `advanced_child_can_choose_concise_support` tests.
  Adult self settings/export are authorized without a guardian loop; support settings remain reversible.
- [ ] Run `npx vitest run src/learning/session.test.ts src/lib/session.test.ts src/lib/store.test.ts src/lib/sync.test.ts src/components/profiles src/lib/server/db`.
  Browser reload/profile-switch scenario; §4; commit/push `feat: preserve one learning session across entry points`.

### T06 — Make the workspace and tutor share the same live object

**Files:** new `src/components/workspace/{LearningWorkspace,TutorStrip}.tsx`, tests;
new `src/lib/workspace.ts`, tests; modify `src/lib/{intake,tutor-demo}.ts`, `src/lib/ai/{context,tools,tutor}.ts`,
`src/components/{magic-box/IntakeBox,tutor/TutorChat,tutor/Board,tutor/TutorDrawer,practice/Runner,practice/tutor-dock,stage/Stage,stage/TutorPanel,stage/scenes}.tsx`;
relevant route pages and widget components; new `e2e/workspace.spec.ts`.

**Interfaces:** §2 `TutorObservation`, `observeSession`, adapter methods and `submitLearnerResponse`.
Consume T05 actions; use T02 help and T04 assessment commands. Internal widgets get explicit controlled
state/change adapters without moving answer keys into public state.

- [ ] Add browser regression `fraction_question_stays_a_question`: enter “Why is 1/2 equal to 2/4?”,
  expect relevant shared work with preserved goal, no course setup, and return/resume to that work.
  Add an explicit “make a course about fractions” case that still opens course authoring.
- [ ] Add observation negative tests with sentinel keys/targets/private records in each raw object.
  Assert serialized model payload contains none. Add current widget/quiz/selected-span updates.
- [ ] Implement a compact tutor beside/below the primary work. Existing routes become entrances to
  this component; do not create a second product shell. Keep existing deep links and course navigation.
- [ ] Replace opening-only tutor snapshots with current observation subscription. On meaningful learner
  edits, invalidate the old response epoch; tutor-controlled changes continue from the acknowledged
  anchor under §2 rules. History may retain cancelled text but no stale action, speech or cue executes. Tool
  check result and pad answer use one confirmed response command and one record.
- [ ] Implement a relevant deterministic fractions demo and truthful unsupported-query fallback.
  Never substitute a related naming-fraction lesson as if it answers equivalence.
- [ ] Run `npx vitest run src/lib/workspace.test.ts src/lib/ai/context.test.ts src/lib/ai/tools.test.ts src/components/workspace src/components/tutor src/components/practice`;
  `npx playwright test e2e/workspace.spec.ts`. Expect changed work state to be observed and stale reply
  to be inert. §4; commit/push `feat: teach from a shared live workspace`.

### T07 — Reciprocal attention and visual teaching

**Files:** modify `src/lib/{spotlight,spot-hints}.ts`, `src/lib/ai/spot-tool.ts`,
`src/components/spotlight/SpotlightLayer.tsx`, `src/components/spotlight/hooks.ts`,
workspace components, `src/components/stage/widgets/{FractionBar,NumberLine,Balance}.tsx`, app layout;
new `src/lib/interaction-signals.ts`, tests; new `e2e/shared-attention.spec.ts`.

**Interfaces:** §2 `AttentionCue`, `InteractionSignal`; `selectTarget(anchor, targetId)`;
`scheduleCue(cue): "scheduled" | "rejected"`; `cancelAttention(epoch): void`.
Registry exposes public semantic target labels/state and distinct `learnerSelectable`/`tutorPointable`
capabilities. Hidden keys/private state are excluded. Visible options remain selectable; instructional
pointing follows the assistance gate and cannot reveal a check solution while calling it independent.

- [ ] Test learner tap/keyboard selection → correct observation → tutor points back; resizing and
  scrolling preserve semantic identity. A removed target, stale object, old epoch or guarded target
  produces no cue. Focus and input remain with the learner.
- [ ] Mount one spotlight layer. Register meaningful targets in active work first; don't annotate
  every dashboard element before the teaching journey works. Keep static mark for reduced motion.
- [ ] Build fraction **Split each part** and linked bar/number-line state. Preserve the whole and
  shaded amount; record learner prediction and actual revision. Pause/replay explains the change.
  Test mathematical equality independently from the rendered labels.
  Add `demonstration_continues_from_acknowledged_revision` and
  `conflicting_learner_edit_interrupts_demonstration`; animation frames alone never cancel the teaching.
- [ ] Implement manual/voice-state signal adapters and synthetic future gaze fixtures. Reject unknown
  source, stale capture, low quality and revoked consent epoch. Assert no camera API is called.
- [ ] Run `npx vitest run src/lib/spotlight.test.ts src/lib/interaction-signals.test.ts src/components/spotlight src/components/stage/widgets`;
  `npx playwright test e2e/shared-attention.spec.ts` at desktop/phone, keyboard and reduced motion.
  §4; commit/push `feat: connect shared attention to visual teaching`.

### T08 — One natural voice and unified input owner

**Files:** modify `src/lib/voice/{session,converse,turn,select,browser,speakable,deepgram,elevenlabs,types}.ts`,
`src/components/tutor/useVoice.ts`, stage narration/useSpeech, workspace tutor strip, app layout;
new `src/lib/voice/latency.ts`, tests; new `e2e/voice-session.spec.ts`. Recover the existing dirty
`numbers.ts`/golden tests into this task after review; do not start a competing numbers implementation.

**Interfaces:** existing voice APIs converge on one app-level owner with `startListening`, `stop`,
`interrupt`, `speak`, delivery events and current `WorkAnchor`. T06's confirmed submission is the only
answer writer; T07 receives delivered-timing cues. Export `VoiceTiming` timestamps for the model spec.

- [ ] Add fake-device tests for one admitted utterance → one authoritative teaching chain → one active
  delivery stream and one confirmed answer. Internal tool rounds share turn ID; duplicate admission
  or submission is rejected. Test stop,
  barge-in, route change, learner switch, tab hiding and revoke cancel all old speech/cues and tracks.
  Assert later context reports only the heard prefix; queued unheard help remains conservatively
  assisted if its release was latched, never promoted to independent.
  Separate displayed-text and played-audio events; native-audio help cannot bypass admission/latching.
- [ ] Wire tap-to-talk, visible listening/working/speaking, captions, replay and typed fallback.
  Uncertain “one half/no two fourths” stays a correctable draft. Touch/key/voice race submits once.
- [ ] Normalize spoken EN/ES math with tests for fractions, negatives, decimals, exponents, units and
  dates; visual notation remains unchanged. Remove competing direct speech-synthesis owners.
- [ ] Instrument the end-to-end boundaries in the model spec. Add cancellable streaming clauses and
  sentence/word cue timing where supported. Do not report synthesis API time as total turn latency.
- [ ] Add opt-in hands-free on the same controller once tap-to-talk passes; test false cutoff,
  self-correction, noise and prolonged thinking. No passive microphone on page load.
- [ ] Run `npx vitest run src/lib/voice src/components/stage/narration.test.tsx src/components/tutor/useVoice.test.ts`;
  `npx playwright test e2e/voice-session.spec.ts`. §4; commit/push controller/wiring as a reviewed section.
  Record real-device and provider audition as **pending** until T10/T13; no “natural voice verified”
  claim from mocked events. Provider choice can land separately without a second controller.

### T09 — Save creations, test transfer and make continuation useful

**Files:** new `src/learning/artifact.ts`, `src/lib/artifacts.ts`, tests;
new `src/components/workspace/{ArtifactView,DataTablePlot}.tsx`, tests;
modify `src/lib/{continue,growth,family,export}.ts`, `src/planner/plan.ts`,
`src/learning/{outcomes,profile}.ts`, `src/components/{stage/Finish,family/Handover,today/TodayPlan}.tsx`,
store/sync/export registries; new `e2e/continuity.spec.ts`.

**Interfaces:** `saveArtifactRevision({sessionId, expectedRevision, content, provenance}): CommandResult`;
`sessionReceipt(sessionId): SessionReceipt`; `nextEncounter(profileId, now): PlannedEncounter[]`.
Artifact union: fraction/model construction, claim/evidence response, numeric table/plot. Reuse source
and attempt references. No free-form executable cells: maximum 50 rows, four numeric columns, units.
Saved artifact revisions are canonical; `workspaceObjects` holds the current artifact reference and
editable draft, not a second history. Accept/save atomically advances the reference and revision.

- [ ] Test create → revise → reload → explicit acceptance of tutor suggestion; learner work remains
  recoverable. Validate numeric/row/column limits and source/sample-data labels. A chart is a view of
  the same table, not another generated answer. Keyboard edits update the plot and tutor observation.
- [ ] Add **Make one** and **Let me try** using fresh T04-compatible item identity. Keep the helped
  demonstration in history; independent work doesn't inherit visible solution hints or erase exposure.
  Open writing/rubric feedback stays practice, with evidence spans and attribution.
- [ ] Repair `prepFocus()` integration, readiness-aware level and overdue task visibility. A question
  requested now outranks a generic daily plan; existing obligations remain available. Do not invent dates.
- [ ] Derive learner/self/family receipts from the same session and evidence IDs: what changed, help
  used, fresh performance, delayed check pending and actual next action. Fix “test goes well” so it
  doesn't imply school success from practice statuses; label reported school results separately.
- [ ] Run `npx vitest run src/learning src/planner/plan.test.ts src/lib/artifacts.test.ts src/lib/continue.test.ts src/lib/growth.test.ts src/components/family/Handover.test.tsx`;
  `npx playwright test e2e/continuity.spec.ts`. §4; commit/push `feat: connect learner creations evidence and next encounters`.

### T10 — Add Jev and choose models with measured teaching results

T10A builds the typed decision/text/visual/preparation evaluation after T03/T05/T06. T10B runs voice
and whole-system comparison only after T08. They are separate mergeable sections with separate evidence.

**Files:** new `src/lib/ai/judgment.ts`, `src/lib/server/jev.ts`, tests;
new `.jev/presets/{intake-route,tutor-relevance}.json` at repo root;
modify `src/lib/ai/{config,prompts,context}.ts`, `src/lib/server/budget.ts`, `evals/{models,run,judge,checks,report}.ts`;
new `evals/fixtures/judgments/`, provider/voice adapters only for candidates actually exercised;
new `docs/reviews/model-selection.md`.

**Interfaces:** model spec's `JudgmentRequest`/`JudgmentResult<T>`; purpose-specific typed output
schemas, transport `judge(request, signal): Promise<JudgmentResult<T>>`. `unavailable` and `abstain`
are explicit. Server models consume T06 public observations and T03 authorization/metering.

- [ ] Build 120 labelled synthetic intake cases (balanced EN/ES, ambiguous/mixed intent, no-match,
  adversarial source text) split 60 development/60 held-out before tuning. Build at least 40 paired
  relevant/irrelevant response fixtures, including the 1/2→1/6 mismatch. Human-review labels.
- [ ] Write transport/decision tests for timeout, malformed response, alias/version change, partial
  batch, low confidence and stale result. A failed judgment never becomes a positive authorization.
- [ ] Implement Jev server adapter and offline-valid presets. Start intake/relevance in shadow mode.
  Explicit selected intent and deterministic safety/code checks bypass semantic routing. Apply the
  300 ms intake deadline; no extra serial Jev call before each speech chunk.
- [ ] Recheck the [independent benchmark shortlist](../reviews/2026-10-07-model-benchmark-evidence.md)
  and preserve exact model/effort/harness labels, uncertainty, retrieval date and missing comparisons.
  Include tutoring leaders outside Anthropic/OpenAI when exact API access and data policy permit it.
  Public scores shortlist; they do not select production or transfer to a newer variant automatically.
- [ ] Compare text/visual/preparation candidates through actual routes, after deterministic mock
  tests pass. Verify exact native endpoint, requested/reported model and billing. Use server secrets;
  credentials/hosted results are separate gates, not blockers for the harness.
- [ ] Run `jev presets validate` at repo root, `npx vitest run src/lib/server/jev.test.ts src/lib/ai/judgment.test.ts`
  and `npm run evals` in `apps/web`. Implement an explicit opt-in hosted runner with a fixed case count
  and spend limit; keep default CI offline. Save model choice, quality, latency and cost with limits.
- [ ] In T10B, compare voice configurations from the model spec on the same T08 controller and scenarios.
  Follow the three-repeat and 60 blinded paired-conversation finalist protocol; report per-role and
  per-locale results with uncertainty. Preserve held-out cases across repeats; tuning uses development
  cases, not inspection of held-out failures. Assess Jev against deterministic and structured-model controls.
- [ ] Choose/pin the best demonstrated production roles and record thresholds from held-out results. If access is
  missing, commit the tested adapters/harness with hosted selection pending; keep existing routes
  unchanged. §4; commit/push `feat: evaluate teaching models and typed Jev decisions`.

### T11 — Promote content by complete teaching journey

**Files:** selected `src/practice/{math,english,science}` banks/tests, `src/practice/{types,reviewed}.ts`,
`src/lib/review.ts`, selected `src/catalogue/` and `src/resources/` data,
stage widget adapters, EN/ES; `docs/handoff/content-audits.json` is input evidence, not a blanket approval.

**Interfaces:** T04's version/fingerprint contract; review decision = reviewer identity, role,
content version/hash, locale coverage, decision/time and supersession. A family checkbox may record
family feedback but cannot confer global teacher-reviewed status. A later flag must block promotion.

- [ ] Recover and inspect relevant content-fix patches. Resolve every existing finding affecting the
  five selected stories and their dependencies. Keep the other findings and two missing expansion
  audits in a named backlog; run an audit now only if the selected slice depends on that content.
  Do not widen the catalogue or audit the quarantined expansion as a prerequisite for the five stories.
- [ ] For each story, verify objective → representation → manipulation/input → diagnostic feedback
  → hint → fresh item → saved record. Independently verify keys; examples include impossible pads,
  answer-position bias, letter-name/phoneme confusion and equivalence representations.
- [ ] Make changed content invalidate only its prior version review and outstanding incompatible
  grants; keep historical records readable. Teacher and Spanish review are named external work.
- [ ] Author each acceptance fixture/journey with its first consumer in T06–T09 or this task, then run
  relevant strand/curriculum tests and those journeys. T13 collects the final gate; it is not a
  prerequisite for this task. Promote a reviewed slice per commit with
  provenance; §4. Leave unrelated draft content visibly draft and out of verified checks.

### T12 — Complete persistence and the whole data lifecycle

**Files:** modify `src/lib/server/db/{client,policy,auth,consent,schema,sync}.ts`, `src/lib/{export,sync}.ts`,
existing settings/privacy/consent components; new `src/app/api/account/{export,delete}/route.ts`, tests;
extend `e2e/accounts.spec.ts`, `e2e/trust.spec.ts` and migration tests.

**Interfaces:** authenticated account export covers all server-owned learner data and media references;
delete/revoke returns an idempotent receipt and invalidates sessions/capabilities. Existing local
export/device-forget are clearly distinguished from account deletion. Reuse learner tombstone purge.

- [ ] Test sign-in on a second device, session/artifact/evidence sync, off-device records in export,
  attachment inclusion/reference manifest, and deletion followed by stale-device reconnect.
  Deleted records must not resurrect; retained backup policy is documented truthfully.
- [ ] Complete persistence feature gate with a configuration check that fails closed if production
  authority/consent is incomplete. Test PGlite and an isolated Postgres database before enabling it.
- [ ] Implement export/deletion across existing and new collections, object storage, cached private
  content and active grants. No private learner content in shared lesson cache or public eval output.
- [ ] Exercise retention jobs, consent revocation during a live turn and token lifetime. Review
  deployed provider/voice data handling and child-use terms with qualified reviewers.
- [ ] Run DB/route/sync/export tests and `npx playwright test e2e/accounts.spec.ts e2e/trust.spec.ts` with
  required environment enabled. §4; commit/push `feat: complete account persistence and deletion lifecycle`.

### T13 — Prove the integrated release on human-sized journeys

**Files:** new `e2e/integrated-learning.spec.ts`, extend accessibility cases;
`docs/reviews/integrated-release-evidence.md`, `docs/STATUS.md`, `docs/HANDOFF.md`.

**Interfaces:** consumes only published action/UI contracts from T01–T12; no direct state injection
to skip the behavior under test. Test setup may seed known fixtures/accounts, clearly labelled.

- [ ] Automate the five spec stories: pre-reader counters, Spanish equivalence, teen equation/graph,
  English claim/evidence, adult practical data inquiry. Each preserves goal, observes a manipulation,
  responds contextually, saves learner work, records help and resumes correctly.
- [ ] Run 390px and desktop journeys, plus 320px layout, keyboard/switch-style navigation, reduced
  motion, enlarged text, denied mic, offline/reconnect, lost permission and provider timeout checks.
  The soft keyboard never hides the active answer and the tutor never covers the object it explains.
- [ ] Run `npm run verify`, full Playwright and offline evals on the final merged SHA. Run hosted
  eval/device audio gates if credentials are available. Record exact tested/deployed SHA and URL.
- [ ] Independently review evidence integrity, model payloads, authorization and actual UI recordings.
  Confirm no raw key, private profile, stale action or duplicated response reaches the wrong boundary.
- [ ] Conduct supervised mixed-age usability only after applicable data gates: observe task completion,
  prompts needed, mistaken interruptions and parent intervention minutes. Collect later comparable
  unaided tasks and delayed checks; report missing follow-ups and small-sample limits.
- [ ] Publish the release evidence and remaining external gates. Preview may be ready while real-family
  launch is not. No production-domain switch follows automatically from a successful preview.

## 4. Merge, verify and push policy

Each section ships as a reviewable PR/commit with its own behavior change and evidence. Agent commit
messages above are suggestions; split a task if its migrations and UI each form coherent tested units.

1. Before editing, rebase/reconcile against the integrator's current base without touching another
   agent's dirty checkout. Pin dependencies by merged SHA, not “latest on that worktree.”
2. Run task regressions, then repository-required `npm run verify`. Run affected browser journeys;
   full browser suite after each integrated checkpoint and before preview. Keep credentials/mock
   tests separate. Once relevant checks pass, do not repeatedly rerun them without a new reason.
3. Early repairs may coexist with unrelated inherited E2E failures only if exact IDs match the recorded
   baseline and none regressed. T01 closes that baseline; no integrated release accepts those failures.
4. Review the diff against spec and actual behavior. Describe trigger/before/after, tests, inherited
   failures and remaining external gates. Stage only owned paths; commit and push the section.
5. Integrator merges reviewed sections in dependency order and tests combined behavior. Do not merge
   `content-merge` wholesale, auto-resolve registry unions, force-push shared work or deploy production.

**Checkpoint A:** T01–T04; trustworthy local work and server authority.
**Checkpoint B:** T05–T11; the five integrated demo journeys, attention and voice controller, with
real-provider/device gaps explicitly named. **Checkpoint C:** T12–T13 plus all outstanding hosted,
content and human gates; eligible for a real-family pilot, then an explicit production decision.

## 5. Future expansion without another rewrite

After the integrated release, extend tested object/input contracts in this order:

1. **Richer teaching scenes:** restore verified OpenMAIC capabilities as safe adapters; add deeper
   diagrams/simulations, curated assets and useful artifact formats. Preserve upstream capability
   gaps as a visible backlog; this release is a checkpoint, not a redefinition of the final ambition.
2. **Optional visible tutor face:** consumes the same speech/attention/turn state, camera off. Test
   comfort and comprehension against the compact mark before adding expressive complexity.
3. **Optional gaze/presence assistance:** adult feasibility study, then permissioned child usability;
   on-device coarse signals, quality/expiry controls, no attention score in academic evidence.
4. **Pen and additional HID:** adapters translate explicit input to the same semantic commands.
   Start with keyboard, pointer, touch, stylus-as-pointer and assistive technology today; no WebHID
   device permission or handwriting model is needed until a specific device/task justifies it.
5. **Broader curriculum and real-world projects:** validated source/rights/review pipeline, deeper
   tools and read-only school connections. Price from observed cost and real benefit.
6. **Website ornamentation:** after the teaching interaction is strong; purposeful craft within the
   existing identity, with performance/accessibility budgets. It is not a dependency for T01–T13.

## 6. Current work status and external dependencies

**Done by this planning pass:** source/interaction/predecessor reviews, fresh verify/browser baseline,
hands-on synthetic journey, product design, model research, explicit interfaces and task order.
**Not started:** implementation T01–T13, hosted model comparison, device audio audition and human pilot.
**Blocked on external access/review, not on code planning:** deployment credentials and provider
entitlement; child-data/retention review; teacher/native-Spanish review; real-device participants;
production-domain authorization. Owner's cost decision: **maximum quality first; spend to establish
the best proof**. Use independent role-specific benchmarks to shortlist models, then frozen blinded
Tutornat evaluations to select them; measure spend
and use finite run limits against accidents. Do not impose an invented low session-price ceiling.

## 7. Plan self-review

- Spec coverage: shared session T05–T06; visual/HID T06–T07/T09; voice T08/T10; learning evidence
  T02/T04/T09; sources/review T11; account lifecycle T03/T12; real acceptance T13; future sensing §5.
- Contracts have a first consumer. Existing domain/store boundaries remain; no alternate mastery,
  parent-reporting or memory engine. Bounded table/plot is the only new general teaching object.
- Five review-focus failures map to explicit regressions. Cross-age/EN/ES journeys are release gates.
- Proposed performance targets are labelled; fresh observed test counts are linked separately.
- No camera, provider activation, model-quality claim or real-family launch is implied by this plan.
- Independent review corrections applied: stable pre-answer identity; durable editable object storage;
  semantic versus presentation revision; selectable versus pointable targets; native voice admission;
  one teaching chain with internal tool rounds; explicit T10A/B dependencies and scoped content review.
