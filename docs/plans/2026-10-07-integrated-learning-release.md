# Integrated Learning Release Implementation Plan

> **Proposed by Codex 2026-10-07. Not the plan of record. Mapped into STATUS Queue 4.**
> The plan of record is [STATUS.md](../STATUS.md) Queue 4 (the 1.0 build). This file came from
> `codex/integrated-learning-plan` (0bac96a) and was taken onto `foundation` as an input, with the
> reconciliation edits marked *Reconciled 2026-10-07*. Where it and Queue 4 differ, Queue 4 wins.
> Items marked **OWNER DECISION** keep today's behaviour until the owner answers; the list, with each
> default, is in STATUS "Blocked on the owner → Decisions". Whether to adopt T01–T13 instead of Queue 4
> is itself decision 1 (default: keep Queue 4 with this plan's audit items folded in). The review's
> full fix lists for each Codex commit are in
> [handoff/codex-review-2026-10-07.md](../handoff/codex-review-2026-10-07.md).

## Where each task lives in Queue 4

| Codex task | Queue 4 step ([STATUS](../STATUS.md)) | State |
|---|---|---|
| T01 journeys and answer input | 0a: T01 code (part of #3 polish batch 1) | Committed, **not yet on `foundation`**: `worktree-wf_8bf8e121-43e-1` has c8dc7ab (ec7b776 code without its docs), then its fix list in a493d06..df04156 (dogfood #5 typed-then-hint, AnswerPad dialog/live-region focus, e2e selector fixes, same-route handover guard, DESIGN.md motion line). It lands after a rebase, verify and the full browser suite; STATUS records the SHA and counts |
| T02 durable help and first responses | 1b: evidence pass, once 0a is on `foundation`; merges after #1 | Finish 02b84e3 (`git diff ec7b776 02b84e3 -- apps/web \| git apply --3way`, never checkout) with today's help semantics (decisions 4–6 defaults); the full fix list is in [handoff/codex-review-2026-10-07.md](../handoff/codex-review-2026-10-07.md) |
| T03, T04, T12 authority, server-issued checks, data lifecycle | 4b: M5 accounts and consent (new step, after Live Tutor phase A) | Waits for owner decisions 11–14; port `codex/account-authority` (1b6bca5) selectively, no rebase of the stack |
| T05–T09 session, workspace, attention, voice, continuity | #4 Live Tutor phases A and B, plus #3 polish | Phase A is in progress on `worktree-wf_7704ca2c-e01-1` (d27f31d at 20:37, on top of db7c472; HANDOFF WIP table): continue from its newest commit. Phase B carries the workspace spec items |
| T10, T13 model and voice selection, release evidence | Side track: model/voice evaluation on synthetic data | Ends in a **recommendation to the owner**, never a pin. T13's browser and accessibility gates fold into Queue 4 #7 |
| T11 content by journey | #2 content audits | Decides what counts as reviewed. It is not a merge gate: content-merge merges behind the Draft labels once green (#1) |

### Every logged finding, mapped

The audit rediscovers two dogfood findings: its browser finding 1 is dogfood **#3** (the magic box
sits under the plan for a help-now family) and browser finding 4 is dogfood **#7** (leaving practice
does not return to where it started). Browser finding 5 is dogfood **#5**.

| Source | Item | Queue 4 step |
|---|---|---|
| [dogfood/2026-10-07.md](../dogfood/2026-10-07.md) | #5 Enter after a hint takes another hint (blocker) | 0a T01 (fixed in T01; on `foundation` once 0a lands) |
| | #1 skill matching (equations), #2 magic-box label, #4 tab bar on item pages, #9 LangToggle names | #3 polish: intake/calendar/shell/auth (continue 43d4b71) |
| | #3 magic box position, #10 minutes card, #11 K–2 read-aloud noise, #12 DRAFT on K–2 tiles, #13 family card school line | #3 polish: Today/family/growth |
| | #6 hint scrolls out of view, #7 leave returns to origin, #8 Up next ignores a test | #3 polish: practice |
| [handoff/requests/](../handoff/requests/) | trust.json: AppShell calls `useWeeklyEmail()` | Done in T01 (lands with 0a) |
| | family.json: wrap the child page in `HandoverScope` | Done differently in T01 (lands with 0a): AppShell owns HandoverScope; no page-level scope |
| | backend.json (all 12: consent gate, learner headers, SyncStatus, migrations tracing, …) | 4b M5 accounts and consent |
| | aiinfra.json: `aiFetch` transport and learner headers | 4b M5; the cap UI, `next_hint` ladder, CRISIS pattern and evals wiring go to #3 polish (tutor) |
| | voice.json (all 4: TutorChat and Stage onto `useVoiceSession`, env docs, consent copy) | #4 Live Tutor phase B (screens routed through `lib/voice`) |
| | tutor.json (DockContext hints) | #3 polish (tutor); the audit's "DockContext is opening-only, hints read through a cast" |
| | learner.json, practice.json, stage.json, courses.json, today.json, calendar.json, intake.json, the rest of trust.json and family.json | #3 polish, by area (practice · Today/family/growth · learn/stage/catalogue · intake/calendar/shell/auth · tutor) |
| | design.json (critics' findings and fixes), plus T01's instant button and chip colour changes for the design pass to know about (owner decision 17) | #3 polish, all areas |
| [handoff/live-tutor-audits.json](../handoff/live-tutor-audits.json) | audit:realtime, audit:uncanny, audit:child (voice, turn-taking, spoken math, child speech, consent copy) | #4 Live Tutor phase A, per the [live-tutor spec](2026-10-07-live-tutor-spec.md) P1–P2 |
| | audit:attention (glide, sync contract, pointing outlives its problem, phone drawer covers the problem, one audio owner) | #4 Live Tutor phase B (P3–P4); the 80dvh drawer also in #3 polish |
| [System audit](../reviews/2026-10-07-system-audit.md) | A: check provenance, assisted flag, duplicate/easier/future checks, help lost on reload, refresh restoration | 1b evidence pass (client half); 4b M5 (server half: recheck level/duplicate/future/readiness, server-issued check grants) |
| | B: stale tutor context, hints through a cast, static board, ProjectView local state | #3 polish; #4 phase B |
| | C: spotlight never mounted, screens bypass `lib/voice`, 80dvh drawer | #4 Live Tutor phase B |
| | D: consent hash mismatch, no route calls consentGate, budgets in process memory, no account delete; `/api/ai/course` has no safety screen | 4b M5; the course-route screen is 0b (rule-10 fix, now) |
| | E: content revisions, 255 audit findings (then 15 audits; now all 19 strands, 327 findings, 20 blockers), family-local teacher approval, "test goes well" uses `isSecure` | #2 content audits; the outcomes fix goes into 1b |
| | Browser 2 and 3: a question becomes a course form; demo Talk answers 1/2 = 2/4 with a 1/6 lesson | #3 polish |
| | Recover work before duplicating it; union merges can duplicate IDs | HANDOFF WIP table; #1 fix method (de-duplicate, never union) |

## The proposal (Codex's text; reconciliation edits marked)

> **For agentic workers:** Use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement task-by-task. Checkboxes track verified work, not dispatch.
> Read the linked specifications and the task's dependencies before editing. Task state lives in the
> table above and in STATUS, not in these checkboxes.

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
  `DESIGN.md`, `AGENTS.md`, `docs/DECISIONS.md`. *Reconciled:* the owner rules from the Claude 1.0
  session stand alongside the Codex-session quotes; where they seem to conflict, that is an owner
  question in STATUS, and today's behaviour holds until it is answered.
- One fused product across ages. K–9 is the reviewed curriculum focus; a non-reading journey is an
  acceptance requirement now. No separate child/adult application. *Reconciled:* making an
  adult-owned task an acceptance requirement now (dropping "adults last") is **OWNER DECISION 16**;
  default: adults last, adult profiles keep working.
- Preserve the warm paper/ink/rose visual identity. Teaching diagrams, demonstrations, purposeful
  animation, speech and input are core. Decorative website ornamentation comes later.
- No imports from `modules/`. Port reviewed invariants/adapters selectively. Preserve dirty worktrees.
- Keep the existing numerical `learning/engine.ts` `RULES`. Assistance-policy clarification must be
  explicit; draft/open content and legacy client evidence cannot silently become verified mastery.
- Every UI string uses `t()` in EN/ES. 44px minimum targets; young defaults 56px. Support 320px,
  keyboard/tap equivalents, reduced motion, enlarged text and text alternatives to audio.
- One learner-facing tutor. No answer keys/private raw objects in model prompts. No arbitrary model
  JavaScript, DOM selectors or navigation. Code checks answers and authorizes all writes.
  *Reconciled:* the tutor never gives the answer to the learner's live problem or check before a
  try (`evals/checks.ts` no-answer-before-try, `lib/ai/prompts.ts`); conceptual explanation is allowed
  on top of that rule (OWNER DECISION 7, default yes).
- *Reconciled:* model vendors and data processors. Native Anthropic only, server-side, no silent
  fallback, until the owner signs off in writing. Any production role that leaves native Anthropic,
  and any new processor (Jev included), needs that written sign-off plus a child-data/COPPA review
  of that processor. Until then hosted comparisons use synthetic data or consenting adults only, and
  `lib/ai/config.ts` keeps its `anthropic/*` Gateway restriction (OWNER DECISION 2).
- No camera activation in this release. Future avatar/gaze seams are specified, with manual fallback.
- Provider-free demo remains useful and explicitly limited. Mocks are not live-model/voice evidence.
- No live-family claim until identity/consent/persistence/deletion/content/device gates pass. Pushing
  reviewed commits is authorized; switching the production domain is a separate owner decision.
- *Reconciled:* every checkpoint shows working screens. Evaluation protocols gate a production
  vendor switch only; they never hold up visible workspace or voice work (§4).

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
*Reconciled:* the branch is kept as an archive; only this plan, the two specs, the audit, the
baseline and the benchmark review were taken onto `foundation`.

Fresh baseline: verify passed (2,372 tests); Playwright **148 passed / 22 failed / 16 skipped**.
Do not repeat the earlier 138/152 result as current. Read the JSON for failure details and commands.
*Reconciled:* Codex measured T01 (ec7b776) at 174 passed / 0 failed / 16 skipped
([evidence](../reviews/integrated-release-evidence.md)). Step 0a's own counts, on the SHA that lands
on `foundation`, go in STATUS.

- [ ] Integrator records `git status --short`, `git worktree list`, remote head and intended base.
- [ ] Preserve dirty Claude worktrees before recovering their work: inspect tracked diffs **and
  untracked files**, get a safe checkpoint from any active writer, and record source SHA/path.
- [ ] Inspect recovery candidates in the audit: `5d6ca5f`, `43d4b71`, the uncommitted numbers-speller
  files, and five content-fix branches. Use `git cherry`/diff to avoid replaying patch-equivalent work.
  *Reconciled:* the numbers speller is committed (db7c472), and Live Tutor phase A has since moved
  on from it. The five content fixes were replayed onto the content merge (d34f845). The current
  table is in [HANDOFF](../HANDOFF.md).
- [ ] *Reconciled:* `content-merge` is **not** held out. Queue 4 #1 made it green by fixing the 20
  failing tests at the root (de-duplicate skill IDs and prerequisites; never a union merge) and
  merged it behind the existing "Draft questions" labels as d34f845. The audit blockers (20, across
  all 19 strands) lead Queue 4 #2. T11 decides what counts as reviewed, not what merges. Holding it
  until per-journey review was **OWNER DECISION 8**; the default, merge as you go, is what happened.
  (Codex's text: "Keep `content-merge` out of the release until selected content passes
  T11. Its 91 unique commits are not a single trustworthy package; union merges hide duplicate/ordering
  errors." The union-merge warning stands and sets the fix method.)

No second round of broad archaeology is required before fixing the concrete failures below.
The live-tutor spec and the 1.0 plan stay the authority for their areas (Queue 4). *Reconciled:*
Codex's line that this order supersedes "merge all content first" and "adults last" is withdrawn;
both are owner decisions (8 and 16) and today's order holds until the owner answers.

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
  of resetting mount-local hints/tries.
  *Reconciled:* Codex proposed "Opening a tutor is neutral; released content help latches" and
  "Reading/navigation accommodations stay practice-only where the assessment policy is unresolved".
  Both are owner decisions; current semantics stand until the owner answers:
  - **OWNER DECISION 4:** does opening the tutor beside a problem count as help? Default: yes, as today
    (`TutorDrawer` marks the problem helped when opened).
  - **OWNER DECISION 6:** should read-aloud count as help for skills that measure reading itself,
    and can read-aloud-supported checks prove a skill for pre-readers? Default, as today: read-aloud
    is not help for any skill (`Runner.tsx` `helped` and the stage's `QuizView` never count it), and
    read-aloud-supported checks count. Build no new help trigger for reading skills until the owner
    answers.
  - **OWNER DECISION 5:** does an unassisted wrong first answer start the 48-hour help wait? Default:
    no, as today.
  Tutor openings stay as today until STATUS decision b is answered. The live-tutor spec §2.5 wording
  (grades 3–9 "Which part is tricky?") is proposed, not approved. The K–2 mechanism (the first vetted
  hint as a gated help entry, saved before it is shown) can be built behind today's wording. The
  refresh-episode repair changes behaviour, not numbers; record it in DECISIONS when it lands.
- [ ] Derive quiet-period eligibility from recorded exposure, including abandoned work. Do not let
  a local “unassisted” flag undo a prior event. Repair refresh episode matching by chronology.
- [ ] Run `npx vitest run src/learning src/lib/evidence.test.ts src/lib/practice.test.ts src/components/practice/Runner.test.tsx src/components/stage`.
  Expect all regressions and existing law tests to pass. Browser-test reload/resume, then §4;
  commit/push `fix: preserve assistance and first-response evidence across resume`.

### T03 — Authorize every remote capability from the account session

*Reconciled:* Queue 4 step 4b (M5 accounts and consent), after Live Tutor phase A has fixed how
replies stream, and only after the owner answers decisions 11–14. Until then, today's behaviour:
**11** live AI keeps the browser-only owner/dogfood path (allowed when not in server mode; authority
enforced only in server mode); **12** no adult re-prompt is built (Codex proposed retyping the password
every 2 hours); **13** a failed provider call costs no turn and the daily cap follows the learner's local
date; **14** voice keeps today's ceiling (2,000 tokens per kind per server instance per day, plus the
per-minute rate limit). Crisis referrals never sit behind authorization: `screen()` runs on the last
learner message before any authority or budget check.

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
  *Reconciled:* how an adult proves it is them, and how often they re-confirm, is **OWNER DECISION
  12**; whether adults are an early story at all is **OWNER DECISION 16**. Default: today's
  behaviour; adult profiles keep working, and no adult-self authority or re-prompt is built.
- [ ] Store budget reservation/settlement under server account IDs using the existing DB layer.
  Test two concurrent requests on different simulated instances against one remaining allowance;
  exactly one reservation succeeds. Retain no-DB demo mode; protected remote routes fail closed.
  *Reconciled:* failing closed without a database is **OWNER DECISION 11**. Default: the
  browser-only owner/dogfood path keeps live AI working (allowed when not in server mode), and
  authority is enforced only in server mode.
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
  *Reconciled:* adult self authority is **OWNER DECISIONS 12 and 16**. Default: today's behaviour;
  no separate adult-self path is built.
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
  *Reconciled:* that is sequencing only. `data-spot` targets on every screen stay required in this
  same task (owner: the tutor points at anything on screen; live-tutor spec §6).
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
*Reconciled:* that work is committed as db7c472, and Live Tutor phase A has built on it since
(d27f31d on `worktree-wf_7704ca2c-e01-1` at 20:37; HANDOFF WIP table). Continue from the newest
commit there. The [live-tutor spec](2026-10-07-live-tutor-spec.md) gates stay the authority,
including the K–2 band and one model call per spoken turn. The production voice path for minors is
the cascade (recognizer → safety screen → name scrub → model → speech); native speech-to-speech is
evaluation-only (OWNER DECISION 3, default: cascade).

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

*Reconciled:* a side evaluation track on synthetic data. It ends in a **recommendation to the
owner**, never a pin. Gate: any production role that leaves native Anthropic, and any new processor
(Jev included), needs the owner's written sign-off plus a child-data/COPPA review of that processor
(OWNER DECISION 2). Until then hosted comparisons use synthetic data or consenting adults only,
Jev runs on synthetic fixtures only, and `lib/ai/config.ts` keeps its `anthropic/*` restriction.
Hosted runs that spend money wait for OWNER DECISION 9 (Codex wrote that the owner authorized
live-provider spending; claimed by Codex, owner to confirm, with a daily and monthly ceiling).

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
- [ ] Implement Jev server adapter and offline-valid presets. Start intake/relevance in shadow mode
  *(reconciled: on synthetic fixtures only, never live learner traffic, until the owner approves Jev
  as a processor)*.
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
- [ ] Recommend to the owner the best demonstrated production roles, with thresholds from held-out
  results *(reconciled: was "Choose/pin")*. Nothing is pinned or deployed until the owner signs off in
  writing (plus a child-data review for any new processor). If access is missing, commit the tested
  adapters/harness with hosted selection pending; keep existing routes unchanged. §4; commit/push
  `feat: evaluate teaching models and typed Jev decisions`.

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
  *Reconciled:* this is Queue 4 #2 (content audits): continue the five fix WIPs (`git cherry` first;
  replayed onto d34f845). All 19 strands are audited now (327 findings, 20 blockers), so there is no
  missing audit to run. The expansion is not quarantined; it merged behind the Draft labels once
  green (#1, d34f845). This task decides what counts as reviewed, not what merges.
  (Codex's text: "Do not widen the catalogue or audit the quarantined expansion as a prerequisite for
  the five stories.")
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
  *Reconciled:* this applies in server mode. Whether the browser-only path also closes is **OWNER
  DECISION 11** (default: it stays).
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
  *Reconciled:* the adult story is **OWNER DECISION 16**. Default (adults last): it is not a release
  gate. Automate the four child stories; the adult one may run as an informational journey.
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
   *Reconciled:* content-merge merged once green (Queue 4 #1, d34f845), after its duplicate IDs and
   prerequisites were fixed at the root; "not wholesale" means no union-merge shortcut.

*Reconciled:* the full evaluation protocol (120 intake cases, 60 blinded paired conversations, two
reviewers, three repeats) is the bar for a **production vendor switch only**. It does not hold up
visible workspace or voice work, and every checkpoint shows working screens. After each batch, a
hands-on dogfood pass in the browser (owner: "use what you make … as feedback").

**Checkpoint A:** T01–T04; trustworthy local work and server authority.
**Checkpoint B:** T05–T11; the five integrated demo journeys, attention and voice controller, with
real-provider/device gaps explicitly named. **Checkpoint C:** T12–T13 plus all outstanding hosted,
content and human gates; eligible for a real-family pilot, then an explicit production decision.
*Reconciled:* these checkpoints are Codex's; Queue 4's steps and their merge gates are the ones in use.

## 5. Future expansion without another rewrite

After the integrated release, extend tested object/input contracts in this order:

1. **Richer teaching scenes:** restore verified OpenMAIC capabilities as safe adapters; add deeper
   diagrams/simulations, curated assets and useful artifact formats. Preserve upstream capability
   gaps as a visible backlog; this release is a checkpoint, not a redefinition of the final ambition.
   *Reconciled:* the long-term target stays full OpenMAIC parity and then beyond (PRODUCT.md
   Principle 5, the owner's words in DECISIONS); this plan only carries a narrower release scope.
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
*Reconciled:* task state is in the mapping table at the top and in STATUS. T01 is committed for
step 0a but not yet on `foundation`. T02 and T03 exist as Codex branches, one to be finished and
one archived. Parts of T08 are under way in Live Tutor phase A. The rest is not started.
**Blocked on external access/review, not on code planning:** deployment credentials and provider
entitlement; child-data/retention review; teacher/native-Spanish review; real-device participants;
production-domain authorization. Owner's words on cost: "Max quality i will burn cash first need best
proof". Codex read this as authorizing live-provider spending: **claimed by Codex, owner to confirm**
(OWNER DECISION 9, with a daily and monthly ceiling). Until answered, today's spend caps stay and no
hosted run spends money. Use independent role-specific benchmarks to shortlist models, then frozen
blinded Tutornat evaluations to recommend them to the owner; measure spend and use finite run limits
against accidents. Do not impose an invented low session-price ceiling.

The owner-blocked list (credentials, key hygiene, decisions, people) is at the top of
[STATUS](../STATUS.md); rotating the six leaked keys comes first.

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
