# KaizenEDU tutor theater: build spec

Date: 2026-10-07. Commit as `docs/plans/2026-10-07-tutor-theater-spec.md`.

**Binding alongside this spec:**
- `docs/plans/2026-10-07-live-tutor-spec.md`, which owns voice, latency and sync. This spec never loosens it. Where the two seem to disagree, the live tutor spec wins and this spec gets fixed.
- `AGENTS.md`.
- The one-workspace spec (`git show origin/codex/integrated-learning-plan:docs/specs/2026-10-07-one-learning-workspace.md`).

**Paths:**
- Ours are relative to `apps/web/src/`. Files outside `src` are written in full, as `apps/web/...`.
- OpenMAIC's are relative to `modules/openmaic-classroom/` and written as `OM/...`.

**Owner direction (verbatim, 2026-10-07):** "id suggest wiring up the tutor before making the lessons, the lessons are just an extension of the tutor itself and it will create more and more, its the live theater and recording or replay able experiences will remain. use openmaic generator its solid"

---

## 0. The shape in one screen

1. **The live tutor directs.** A lesson is a tutor performance that was kept.
2. **One recorded form, the `Beat`.** It is used for:
   - live AI replies;
   - demo-tutor replies;
   - AI scene scripts;
   - code-built scripts that read the lesson's own words.
3. **One player** drives the app `SpeechOut`, the attention scheduler (glow ring and TutorCursor) and the stage, all on the voice clock from live tutor spec §3.
4. **Every tutor session is a `Take`:** an append-only log. A replay runs the same player over the take and writes nothing.
5. **What comes from OpenMAIC** is copied or rewritten here with its MIT notice, never imported:
   - its generator pipeline: outline → content → script, first scene first, scripts written one after another and carrying the previous speech forward;
   - its script prompts, course context and retry helper;
   - its playback rules: generation token, interrupt and resume, silent seek;
   - its runtime record envelope;
   - its cursor and timeline;
   - its captions.
6. **What does not come from OpenMAIC:**
   - the PPT canvas and renderer;
   - model-written HTML widgets;
   - the directors and chat;
   - the audio stack;
   - all model plumbing (the OAuth adapter lives there).
7. **Build order:**
   - T0 gates
   - T1 live tutor
   - T2 record every reply
   - T3 player, replay and the stage playing code scripts
   - T4 the tutor live on the stage
   - T5 director verbs in Talk
   - T6 OpenMAIC's script stage
   - T7 the tutor makes lessons
   - T8 recordings become lessons; lessons multiply
   - T9 catalogue scripts, clips, ship gates

---

## 1. Ground truth (checked on `foundation` 36c47fa, 2026-10-07)

1. **The tutor-branch precondition (live tutor spec §0.4) is met.**
   - `git cherry foundation 5cffe4c` gives 17 identical patches and 2 marked `+`.
   - The two `+` patches landed reworked, under the same subjects: `28e9c87` as `db9a916` and `36ef28b` as `9dd173f`.
   - `3d3d518` and `7bd494c` build on them.
   - So §0.4 and the "blocked on 5cffe4c" notes are stale. T0 fixes both.
2. **Never merge any `worktree-wf_a6840288-*` branch.** 15 refs exist. `git diff --shortstat foundation worktree-wf_a6840288-a70-24` gives 575 files, +5,105 / −147,130.
3. **Unbuilt on HEAD, and these gate the theater:**
   - none of `lib/voice/{audio,player,cues,conversation,numbers,voices,spoken}.ts` exists;
   - `lib/attention.ts` does not exist;
   - `SpotlightLayer` is not mounted;
   - `data-spot` appears only inside the spotlight module and tests;
   - `point_at` is still in `lib/ai/spot-tool.ts` (it is not in `tutorTools`);
   - `components/tutor/useVoice.ts` still exists;
   - there is no `replyText()`.
4. **Two gaps on our side:**
   - `app/api/ai/course/route.ts` never calls `screen()`;
   - `lib/generate.ts:104` posts with plain `fetch`, not `aiFetch`.
5. **Catalogue: 61 course files (42 EN, 19 ES) and 61 registry entries.**
   - Scenes by kind (grep): 668 slide, 244 quiz, 355 interactive, 238 project, so 1,505 in all.
   - The earlier figures of 48, 64, 65 and 1,267 are wrong.
   - Tests derive every denominator from `catalogue/registry.ts` at run time and never hard-code one.
6. **There are 12 widget kinds:** fraction-bar, number-line, states-of-matter, moon-phases, sorter, area-model, place-value, clock, balance, coordinate, sequence and sentence-builder. `CheckRow`, `Slider` and `Stepper` are helpers, not widgets. All 12 keep internal `useState`.
7. **Already present:**
   - `OutlineSchema` lessons have `objective`;
   - `LessonSchema` allows 3–6 scenes;
   - `TeachingPrefs.representation` is `"pictures" | "number-line" | "blocks" | "words"`;
   - `MAX_THREADS = 200`;
   - `SYNC_LIMITS.recordBytes = 512_000`;
   - `KEEP_ON_SERVER = ["attempts", "acts", "threads"]`.
8. **OpenMAIC licence and test status.**
   - OpenMAIC is MIT, © 2026 THU-MAIC (`OM/LICENSE`, `OM/packages/@openmaic/generation/LICENSE`).
   - Its package tests were not run here: there are no `node_modules`.
   - Port its behaviour behind our own tests, not on trust.

---

## 2. Decision record

### 2.1 Winner and grafts

The winner is **"Tutor Theater: the tutor directs and every session is a recording"** (D3), chosen by 2 of the 3 judges. The third judge picked "Our Stage, Their Brain" (D2), and its strongest parts are grafted in.

| From | Taken |
|---|---|
| D3 (winner) | <ul><li>Director verbs `stage_scene` and `go_to_scene`, narrowed (§8.1), plus the Board `scene` card</li><li>`curateSession` in code, with no model call</li><li>"Make another like this"</li><li>Thumbs up/down</li><li>`by` on every beat</li><li>The replay banner</li><li>The never-merge warning</li><li>The ESLint import bans</li><li>Reporting "blocked" separately from "not started"</li><li>The lean file plan</li></ul> |
| D1 (OpenMAIC's engine) | <ul><li>Inline `[[spot:id]]` anchors in generated scripts</li><li>Resume at the sentence that holds `heardUpTo`</li><li>The `said` context</li><li>The faithful pipeline: an outline with `keyPoints` for 2+ lessons, per-scene gates while streaming, scene 1 scripted first, browser-driven requests (≤ 120 s content, ≤ 30 s script)</li><li>The `make_lesson` proposal rules and the 3-per-day cap</li><li>"Another way" variants</li><li>"Keep this explanation"</li><li>The replay lint boundary</li><li>Allocated private clip ids</li><li>Pose rules: before the first touch only, never at or next to the target</li><li>Escalating the content-stage deviation to the owner</li><li>The forbidden-string list</li></ul> |
| D2 (Our Stage, Their Brain) | <ul><li>`publicObservation`</li><li>A demonstration resets to the learner's start and counts as help</li><li>No spend without a tap</li><li>One `speak()` per scene run</li><li>The theater latency table</li><li>Opt-in opus capture of the tutor's output</li><li>Written-out answer numbers caught through `numbers.ts`</li><li>Re-parsing client-sent scenes</li><li>The Caption strip</li><li>The "reviewed" label</li><li>`screen()` on every generated beat</li></ul> |

### 2.2 Disagreements, resolved

| # | Question | Options seen | Decision | Why |
|---|---|---|---|---|
| 1 | How generated scripts bind cues to words | Model-counted word index (D3); `z.enum` spot + `look.on` phrase (D2); inline anchors (D1) | Inline `[[spot:id]]` in `say`, parsed by the same `cueParser` as live replies. Ids are constrained by the prompt's list, by `gateScript` and by fire-time guards. | One syntax and one word space. The model never counts words. One `toBeat()` with a round-trip test per producer. |
| 2 | What `stage_scene` takes | A free `SceneSchema` (D3); a typed command (judge 2) | A typed widget config (our `WidgetSchema`, 8 allowed kinds) plus a prompt. Code builds the scene. `gateScene` includes a check that the task in the prompt matches the target (§8.1). No live quizzes. | Answers stay checked by code against a key that code verified. Failures are rare and cheap. |
| 3 | Where resume starts | The cut beat's word 0 (D2); one action back (OpenMAIC); the sentence holding `heardUpTo` (D1) | The sentence holding `heardUpTo()` | Finest grain that still sounds natural. |
| 4 | When recording starts | After the stage player (D2); right after the tutor (D1, D3) | T2, right after T1 | Recordings pile up from day one ("will remain"). |
| 5 | Spending on `make_lesson` | Nothing gates it (D3); a cap (D1); a tap (D2) | The tutor proposes; a tap starts it; 3 per learner per day; the spend caps still apply. | No spend without consent; lessons still multiply through the shared cache. |
| 6 | Original voice of live sessions | ElevenLabs re-render (D1: paid, and not the original); none (D3: wrong PCM estimate); opt-in opus capture (D2) | D2: opt-in, tutor output bus only, about 16 kbps (~120 KB/min) | It is the real voice and cheap. The microphone is never recorded. |
| 7 | Default replay voice | Silent (D1); spoken again (D3) | Original audio if kept, else spoken again through the current `SpeechOut`, else text | Pre-readers need a voice. |
| 8 | Turning a session into a lesson | Through a model (D2); in code (D3) | In code (`curateSession`). Regenerating from a scrubbed topic is a separate action. | Cheaper, private, deterministic. |
| 9 | "Best take becomes the default" (D2) | — | Dropped | It confuses correlation with cause and would change family content silently. Families choose. |
| 10 | Does a demonstration count as help? | Yes (D2); ask the owner (D1) | Yes by default. The owner may relax it (D-2). | The honest default. |
| 11 | Widget seam | All 12 controlled in one phase (D3); later (D2) | `onState` (report only) for all 12 in T4. A `pose` prop kind by kind: fraction-bar, number-line, clock in T6; the rest in T9. | Avoids a 12-widget refactor before value is visible. |
| 12 | Gaps between beats | Prefetch (D1); one `speak()` per scene run (D2) | One `speak()` iterable per scene run. Gate: gap ≤ the band pause + 100 ms. | No gap by construction. |
| 13 | Which model role writes scripts | `build` (D1); `talk` (D3) | `talk` by default. The T6 eval runs both once; switch to `build` only if `talk` fails the bar and `build` passes it. | Latency and cost; the eval decides. |
| 14 | An outline stage | Skipped (D3); for 2+ lessons (D1) | Outline only for 2+ lessons | Faithful to OpenMAIC with no wasted call. |
| 15 | Touching a control mid-play | Goes live (D2); pauses (D1) | A touch **pauses**; speaking or typing goes **live** | "Show, let them touch it." |
| 16 | Greetings in scripts | Greet on scene 1 (OpenMAIC, D1); never greet (D3) | Never greet. Scene 1 opens with the objective in one sentence; the last scene closes with a one-sentence recap. | The live tutor already greeted. Easy to check in code. |
| 17 | K–2 slides | AI script plus caption (D1); read-along (all) | K–2 slides always play `codeScript` (read-along). AI beats appear in K–2 only as interactive and quiz openings. | Read-along is the teaching. |
| 18 | OpenMAIC's slide-content stage | Port it (code map 4); keep ours (D1–D3) | Keep ours and ask the owner explicitly (D-1). | Evidence in §3. |

---

## 3. Owner decisions (defaults apply until the owner answers)

**D-1. The content stage.**
- "Use the OpenMAIC generator" is honored for its outline stage, its script stage (the best part, and we have nothing like it), its orchestration and its retry.
- Its slide-content stage is not used, because:
  - the 1000×562.5 canvas scales to about 0.29–0.32 at 320 px, so 18 px text shows at about 5–6 px;
  - images get `alt=""`, and nothing supports reduced motion;
  - quiz keys are asserted by the model, and only their structure is checked;
  - interactive scenes are model-written HTML and JS in an iframe with `allow-popups` and no CSP, which one-workspace §6–7 excludes;
  - its own playback renderer is behind a flag that is off upstream (`OM/lib/config/feature-flags.ts:75-81`).
- Our `LessonSchema` and gates produce scenes that render at 320 px with keys checked by code.
- **Default:** ours.
- **If the owner wants literal slides:** port the ~1.2k-line painter subset of `OM/packages/@openmaic/renderer` as a desktop-only tutor board beside the work, never as the lesson surface. That needs a PPTist licence check first.

**D-2. Demonstrations count as help.**
- **Default:** a `pose` beat marks that scene's checks as assisted before it plays.
- Neutral narration of the on-screen words never does.

**D-3. AI narration on people-written catalogue lessons.**
- **Default:** none. The catalogue plays `codeScript`.
- AI drafts go to `/review`. Each course ships its AI narration only on the owner's yes, labelled "Written by people · narration by AI, reviewed".

**D-4. "Keep the tutor's voice with replays"** (opt-in audio capture).
- **Default:** off.
- The consent wording needs owner approval. Under-13 learners need the grown-up's consent.

**D-5. Retention.** Defaults, for the owner and counsel to confirm:
- 200 takes per learner; the oldest takes not marked kept are pruned first;
- audio 30 days unless kept;
- the server keeps text takes until the learner is removed.

**D-6. Daily cap.** `KAIZEN_LESSONS_PER_DAY = 3` per learner.

---

## 4. Types

### 4.1 New: `lib/theater/types.ts`

```ts
// Shape follows OpenMAIC @openmaic/dsl action.ts + runtime.ts (MIT, © 2026 THU-MAIC). Our types.
import type { BoardCard } from "@/lib/tutor";
import type { Grade, InteractiveScene, Locale, Scene } from "@/lib/types";
import type { Representation } from "@/learning/profile";

/** `word` indexes say.split(/\s+/).filter(Boolean): the live-tutor spec §3.1 word space. */
export type Cue = { spot: string; word: number };

/** Values only, never a selector. Valid only for kinds whose widget has the pose seam (poseProblems). */
export type WidgetPose =
  | { kind: "fraction-bar"; parts: number; shaded: number }
  | { kind: "number-line"; at: number }
  | { kind: "clock"; h: number; m: number }
  | { kind: "area-model"; rows: number; cols: number }
  | { kind: "place-value"; hundreds: number; tens: number; ones: number }
  | { kind: "states-of-matter"; c: number }
  | { kind: "moon-phases"; day: number }
  | { kind: "coordinate"; points: [number, number][] }
  | { kind: "balance"; take: number };
// sorter, sequence, sentence-builder: no pose. Their state is the answer.

/** What a widget reports through onState. Never carries a target. */
export type WidgetState = WidgetPose;

export type StageCmd =
  | { op: "board"; card: BoardCard }   // Talk / drawer board, including the "scene" and "make" cards
  | { op: "scene"; sceneId: string }   // lesson stage: a visited scene, never past an open check
  | { op: "pose"; pose: WidgetPose };  // scripts only, before the first touch, reset to the authored start afterwards

export type Beat = {
  id: string;
  say: string;          // display text: markers stripped, names scrubbed
  cues?: Cue[];         // scripts: ≤ 1 per sentence, ≤ 3 per beat
  do?: StageCmd[];      // scripts: fire at the beat's first word; live: after the words
  read?: string;        // narration segment key; then say === that segment's text (read-along)
  wait?: "tap" | "act"; // tap = Continue chip; act = park until the scene's own checker reports
  by: "ai" | "demo" | "code" | "people";
};

export type Script = {
  v: 1;
  by: "code" | "ai" | "live";
  beats: Beat[];        // 1–10 (K–2: ≤ 6); ≤ 3 KB
  spots: string;        // spotsVersion(scene) when written; on mismatch, re-gate
  model?: string;
  rep?: Representation; // "Another way" variant
  from?: { takeId: string; at: number }; // "Keep this explanation"
};

/** Built field by field from what is publicly on screen. Never a target, key or answer index. */
export type StageObservation = { title: string; kind: Scene["kind"]; state?: WidgetState; checked?: "right" | "not-yet"; answered?: boolean };

export type Take = {
  v: 1; id: string; profileId: string;
  surface: "talk" | "drawer" | "lesson";
  source: "live" | "demo" | "script";
  courseId?: string; lessonId?: string; threadId?: string; setId?: string;
  locale: Locale; grade: Grade;
  startedAt: number; endedAt?: number;
  kept?: true;
  look: "ring.v1";      // attention descriptor it was recorded with, so old replays render as recorded
  audio?: { assetId: string; mime: string; bytes: number }; // opt-in tutor output only (D-4)
  records: TakeRecord[];
};

export type TakeRecord = { seq: number; at: number /* ms since startedAt */; op: string /* idempotency id */ } & (
  | { k: "tutor"; beat: Beat; run?: { wordsAt: number[] /* delta ms from run start */; heardUpTo: number; cut?: true; voice: "vendor" | "clip" | "device" | "text"; audioAt?: number } }
  | { k: "learner"; via: "voice" | "text" | "tap"; text: string /* withoutNames at write time */ }
  | { k: "move"; spot: string; state?: WidgetState; verdict?: "right" | "not-yet"; assisted?: boolean } // verdict copied from the code checker
  | { k: "scene"; sceneId: string }
  | { k: "safety"; kind: "crisis" | "abuse" | "offLimits" } // kind only, never text
);

/** ~200 bytes in StoreState; the body lives in IndexedDB. */
export type TakeRef = { id: string; profileId: string; surface: Take["surface"]; source: Take["source"]; title: string; startedAt: number; beats: number; kept?: true; audio?: true };
```

### 4.2 Changed types

- **`lib/types.ts`:**
  - Every scene type gains `script?: Script; scripts?: Script[]`. Add them through a shared `SceneExtras` intersection so the union stays discriminated.
  - `Lesson` gains `objective?: string; keyPoints?: string[]` (at most 5).
  - `Course` gains `from?: { takeId?: string; threadId?: string; courseId?: string }` and `rating?: "up" | "down"`.
- **`planner/types.ts`:** `TutorThread` gains `takeId?: string`.
- **`lib/store.ts`:** `StoreState` gains `takes: TakeRef[]`. Add it to the persisted list order at `:92-93`.
- **`lib/tutor.ts`:** `BoardCard` gains `{ type: "scene"; scene: InteractiveScene }` and `{ type: "make"; goal: string; subject: Subject; grade: Grade }`.
- **`lib/ai/context.ts`:** `TutorContext` gains, beside the live tutor spec's `input` and `spots`:
  - `stage?: StageObservation`;
  - `said?: { heard: string; previous: string }`;
  - `board?: { notShown?: string }`.
  - `scrubContext` covers every new text field.
- **`lib/ai/schemas.ts`:**
  - `OutlineSchema` lessons gain `keyPoints: z.array(s(120)).max(5)`.
  - New: `WidgetPoseSchema(kind)`, `poseProblems(widget, pose)`, `StageSceneInput`, `ScriptOut`.

### 4.3 How OpenMAIC's verbs map onto ours (`OM/packages/@openmaic/dsl/src/action.ts:235-287`)

| OpenMAIC | Ours |
|---|---|
| `speech` | `Beat.say` |
| `spotlight` or `laser` just before a speech | A `[[spot:id]]` anchor before the word that names the thing (word 0 if none) |
| `widget_highlight` | An anchor on a `widget.*` id |
| `widget_setState` | A `pose` command |
| `discussion` | `wait` (the learner's turn, then live) |
| `widget_reveal`, `widget_annotation`, `play_video`, `wb_*` | Dropped for 1.0. `show_visual` board cards cover drawing. |
| FIRE_AND_FORGET | Cues never block |
| SYNC | Only `wait` and `scene` block the next beat |

---

## 5. Port map

### 5.1 Copy or adapt (each file carries the header, and each is listed in `apps/web/THIRD_PARTY_NOTICES.md`)

Header: `// Adapted from OpenMAIC (modules/openmaic-classroom/<path>), MIT License, Copyright (c) 2026 THU-MAIC. See apps/web/THIRD_PARTY_NOTICES.md.`

| Source | Ours | What changes |
|---|---|---|
| `OM/packages/@openmaic/generation/src/generation-retry.ts` (234 lines) | `lib/ai/retry.ts` | <ul><li>Default `maxRetries` goes from 5 to 2.</li><li>Every attempt runs through `model(role, meter(req))`, so it is metered.</li><li>Check `spent()` before each retry.</li><li>`isRetryableGenerationError` as-is.</li></ul> |
| `OM/packages/@openmaic/generation/src/prompt-formatters.ts:9-50` (`buildCourseContext`) | `courseContext()` in `lib/ai/script.ts` | <ul><li>EN and ES strings.</li><li>Keep "same session; never 'last class'".</li><li>Replace greet-on-first / close-on-last with §2.2 #16.</li><li>`previous` = the last 150 chars of the previous scene's script.</li><li>Drop the agent and persona formatters.</li></ul> |
| `OM/packages/@openmaic/generation/templates/slide-actions/system.md`, `quiz-actions/system.md`, `interactive-actions/system.md`, `snippets/speech-tts-readability.md` | `SCRIPT_RULES` constants in `lib/ai/script.ts` | **Keep:**<ul><li>one teacher voice;</li><li>same session;</li><li>point right before the words that name a thing, now written as anchors;</li><li>the slide shows and the voice tells (3–9 slides only);</li><li>the quiz answer-safety block (meta-level only; never preview, compare or hint at choices), word for word apart from terminology;</li><li>interactive: direct them to touch a named part, simple to complex;</li><li>speech written for the voice.</li></ul>**Drop:**<ul><li>the "Great job, everyone!" encouragement example (`slide-actions/system.md:138`);</li><li>discussion and multi-agent rules;</li><li>Chinese examples;</li><li>element-id, spotlight and laser syntax;</li><li>adult pacing (5–10 actions a slide, a quiz every 3–5 slides);</li><li>"verbalize all math": we write normal notation and `speakable` reads it.</li></ul>Golden snapshot test. |
| `OM/lib/kaizen/client/course-request.ts:94-104` (`TEACHING_DIRECTIVE`) | `lib/ai/build.ts` WRITER and `SCRIPT_RULES` | The 8 rules word for word. The language line stays ours (`langLine`). |
| `OM/lib/choreography/cursor.ts` (73 lines) | `lib/theater/cursor.ts` | <ul><li>Action → Beat; their Scene → ours with `script`.</li><li>Keep the empty-scene dwell.</li><li>No `@openmaic` imports.</li></ul> |
| `OM/lib/choreography/timeline.ts` (403 lines) | `lib/theater/timeline.ts` | <ul><li>Beat index → ms from recorded `wordsAt` or clip duration.</li><li>Drop `clampFireAndForgetLifetimes` and the 5 s effect auto-clear (the ring follows spec §3.3).</li><li>Drop video.</li><li>The 240 ms/word estimate is used only as a scrub-bar dwell for text-only beats, never as word timing.</li><li>Do not copy the `timing.ts` constants.</li></ul> |
| `OM/lib/playback/action-navigation.ts` (146 lines) | `lib/theater/seek.ts` | <ul><li>Reconstructable prefix: board and scene commands rebuild silently.</li><li>A pose rebuilds only from a recorded snapshot, and only for kinds with the pose seam.</li><li>A learner change on a kind without the seam disables seek past that point.</li></ul> |
| `OM/lib/video-export/subtitles.ts` (60 lines) | `lib/theater/captions.ts` | As-is (`usableCues`, `toVtt`, `toSrt`). Input is one cue per sentence, built from recorded word times. |

### 5.2 Pattern only (rewritten, no code copied, cited in THIRD_PARTY_NOTICES)

| Source | Ours | The pattern |
|---|---|---|
| `OM/lib/playback/engine.ts:181-220, 442-470, 495-502, 603-608` | `lib/theater/player.ts` | Generation token; snapshot before advancing; interrupt saves the cursor (ours: the sentence holding `heardUpTo`); silent seek. Not its store imports, browser TTS or discussion. |
| `OM/lib/playback/auto-resume.ts` | `player.ts` | Resume only after the learner ends the exchange. Ours: an explicit chip or phrase. |
| `OM/lib/hooks/use-scene-generator.ts:719-997` | `lib/theater/make.ts` | First scene first; scripts one after another, carrying the previous speech; pause on failure; an epoch guard drops stale work. |
| `OM/packages/@openmaic/dsl/src/runtime.ts:203-267` | `Take` / `TakeRecord` | A store-assigned `seq` is the only order; anchors may go stale and are tolerated. |
| `OM/lib/whiteboard/runtime/store.ts:158-300` | `record.ts` | Idempotent append by `op` id. |
| `OM/packages/@openmaic/dsl/src/storage.ts:74-85` | Clip and audio ids | Anything from a session gets an allocated random id. Content hashes are only for public text. |
| `OM/packages/@openmaic/generation/src/outline-types.ts:70-107`, `scene-builder.ts:22-115` | `OutlineSchema`, `writeLesson` | `keyPoints`; stable scene ids on retry. |
| `OM/lib/orchestration/summarizers/state-context.ts:220-238` | `lib/ai/prompts.ts` lesson-surface block | The quiz-restraint wording before submission only. Never `:176-207`, which prints correct answers. |

### 5.3 Never comes over

- **The OAuth adapter and everything that reaches it:**
  - `OM/lib/ai/anthropic-oauth.ts`
  - `OM/lib/ai/providers.ts` (OAuth branch at `:53-57`, `:2648-2700`)
  - `OM/lib/server/anthropic-oauth-refresh.ts`
  - `OM/instrumentation.ts` (`:65-69`, `:135`)
  - `OM/lib/ai/llm.ts`
  - `OM/lib/server/resolve-model.ts`
  - `OM/lib/server/model-config/*`
  - `OM/lib/server/provider-config.ts`
  - `OM/lib/server/model-routes.ts`
  - `OM/lib/config/*`
  - `OM/tests/server/anthropic-oauth-*.test.ts`, `native-opus-*.test.ts`
  - `OM/openmaic.example.yml`, `OM/.env.example`
- **Every route under `OM/app/api/**`**, including `generate/*`, `generate/tts`, `quiz-grade`, `chat`, `chat/pi`. They reach the adapter through model-config, and `quiz-grade` grades with a model and invents 50% when it can't parse the reply.
- **Live chat:**
  - `OM/lib/orchestration/*`, `OM/lib/chat/*`, `OM/lib/agent/*`
  - `OM/components/chat/*`, `OM/components/roundtable/*`
  - `OM/lib/buffer/stream-buffer.ts` (the text is its clock)
- **Execution and audio:**
  - `OM/lib/action/engine.ts`
  - `OM/lib/audio/*`
  - `OM/lib/hooks/use-discussion-tts.ts`, `use-audio-recorder.ts`, `use-browser-asr.ts`
  - `OM/lib/utils/audio-player.ts`
- **Slides and canvases:**
  - `OM/packages/@openmaic/renderer/**` (never `fonts.css`, which calls an outside host)
  - `OM/components/slide-renderer/**`
  - `OM/packages/@openmaic/editor`
  - `OM/components/whiteboard/*`
  - `OM/packages/@openmaic/dsl/src/slides.ts` (PPTist provenance)
- **The generator's content side:**
  - the content branches of `OM/packages/@openmaic/generation/src/scene-generator.ts`
  - `interactive-script-validator.ts`, `interactive-post-processor.ts`
  - `json-repair.ts` (a single-backslash `\frac` parses as a form feed)
  - `action-parser.ts`
  - `prompts/loader.ts` (`node:fs`)
  - `pbl/*`
  - `templates/*-content`
  - the `requirements-to-outlines` prompt text
- **Scene renderers and grading:**
  - `OM/components/scene-renderers/*`, including `InteractiveIframeHost.tsx`
  - `OM/lib/quiz/grading.ts` short-answer grading
- **Everything else:**
  - `OM/packages/mathml2omml` (LGPL)
  - `OM/lib/export/*`, `OM/render-service/`, `OM/lib/video-export/*` (except `subtitles.ts`)
  - `OM/lib/media/*`, `OM/lib/persistence/*`, `OM/packages/@openmaic/storage`
  - `OM/lib/web-search/*`, `OM/lib/pdf/*`
  - `OM/lib/store/user-profile.ts`
  - `OM/lib/kaizen/client/tutor-tools.ts` (a stale direction: "no automatic speech, no mic")
- **Any field named `userNickname`, `userBio` or `userProfile`.**

### 5.4 Guards (T0, before any port lands)

1. **`apps/web/scripts/check-forbidden.mjs`.** Add it to `verify`: `npm run lint && npm run typecheck && node scripts/check-forbidden.mjs && npm run test && npm run build`.
   - It fails on any of these under `apps/web` (excluding `node_modules` and itself; build the strings by concatenation): `sk-ant-oat`, `claude-code-20250219`, `oauth-2025-04-20`, `anthropic-oauth`, `anthropicOAuth`, `startAnthropicOAuthRefresh`, `You are Claude Code`, `OPENMAIC_CLAUDE_CODE_VERSION`, `ANTHROPIC_AUTH_TOKEN`, and `"x-app"` followed by `"cli"`.
   - It also fails on any `from "...modules/` or `@openmaic/` import.
2. **ESLint `no-restricted-imports`:**
   - everywhere: `**/modules/**` and `@openmaic/*`;
   - in `lib/theater/replay.ts` and `components/theater/Replay.tsx`: `@/lib/theater/record`, `@/lib/acts`, `@/lib/activity`, `@/learning/*`, and the value imports from `@/lib/tutor` (`allowTypeImports: true`).
3. **`apps/web/THIRD_PARTY_NOTICES.md`:** the THU-MAIC MIT text plus each source path from §5.1 and §5.2.

---

## 6. Our files

### 6.1 New

| File | Phase | What |
|---|---|---|
| `lib/theater/types.ts` | T2 | §4.1 |
| `lib/theater/beat.ts` | T2 | `toBeat(raw, meta)`, the only conversion, through `cueParser`. Built on it: `liveBeat(message)`, `demoBeat(turn, item?, rung?)`, `scriptBeat(out, scene)`. |
| `lib/theater/record.ts` | T2 | IndexedDB `kaizenedu.takes` (stores `takes` and `audio`), with a memory fallback. `useTakeRecorder()`. |
| `lib/theater/spots.ts` | T3 | `sceneSpots(scene, {answered}) → {pointable: {id,label}[], guarded: string[]}`, computed from data with no DOM, using the same ids `scenes.tsx` renders per live tutor spec §6. Capped at 60; over the cap, block-level ids only. `spotsVersion(scene)`. |
| `lib/theater/code-script.ts` | T3 | `codeScript(scene, young, locale): Script` |
| `lib/theater/player.ts` | T3 | §7.2 |
| `lib/theater/cursor.ts`, `timeline.ts`, `seek.ts`, `captions.ts` | T3 | §5.1 |
| `lib/theater/replay.ts` | T3 | `takeToRun(take)`: pure, writes nothing (lint boundary) |
| `components/theater/TheaterBar.tsx`, `Caption.tsx`, `Replay.tsx` | T3 | Play / Pause / Stop / Keep going / "Say it with me"; the caption strip with the current word highlighted; the replay frame |
| `app/(focus)/replay/[id]/page.tsx` | T3 | The replay page |
| `lib/theater/observe.ts` | T4 | `publicObservation(scene, live)`, ≤ 1600 chars, field by field |
| `lib/ai/stage-scene.ts` | T5 | `StageSceneInput` → `InteractiveScene`; `gateScene` |
| `lib/ai/script.ts` | T6 | `SCRIPT_RULES`, `courseContext`, `writeScript`, `gateScript` |
| `lib/ai/retry.ts` | T6 | §5.1 |
| `app/api/ai/script/route.ts` | T6 | §9.1, §9.3 |
| `app/api/ai/lesson/route.ts` | T7 | §9.2 |
| `lib/theater/make.ts` | T7 | The browser driver for generation |
| `components/theater/MakeCard.tsx` | T7 | The "make" board card with progress |
| `lib/theater/curate.ts` | T8 | `curateSession(take)` |
| `apps/web/scripts/check-forbidden.mjs`, `apps/web/THIRD_PARTY_NOTICES.md` | T0 | §5.4 |
| `apps/web/evals/script.eval.ts`, `lesson.eval.ts`, `catalogue-scripts.ts` | T6, T7, T9 | New `EVAL_SUITE`s |
| `apps/web/e2e/theater.spec.ts` | T3 onwards | §14 |
| `catalogue/scripts/<course-file>.json` | T9 | Review drafts, loaded lazily |

### 6.2 Changed

| File | Phase | Change |
|---|---|---|
| `app/api/ai/course/route.ts` | T0 | `screen(goal, locale)` before `cachedCourse` / `writeCourse` |
| `lib/generate.ts:104` | T0 | `aiFetch` instead of `fetch` |
| `apps/web/package.json`, ESLint config | T0 | §5.4 |
| `docs/STATUS.md`, `docs/plans/2026-10-07-live-tutor-spec.md` §0.4 | T0 | §1.1–1.2 |
| Live tutor spec P1–P4 files | T1 | Exactly as that spec says |
| `components/tutor/TutorChat.tsx` | T2 | After `finish` (beside `saveThread`, ~line 340), call `useTakeRecorder().reply(message, run)`; on submit, `.learner(text, via)`. Never fork the file. |
| `components/spotlight/SpotAgain.tsx` | T2 | Replays a recorded beat's cues |
| `planner/types.ts`, `lib/store.ts`, `lib/export.ts` | T2 | `takeId`; `takes` index; take bodies in export; delete removes the IndexedDB rows |
| `lib/tutor-demo.ts` | T2, T4 | `demoBeat` with `hintSpotAt`; the stage path |
| `components/stage/narration.tsx` | T3 | NarrationBar's play path goes through the player; `Spoken` and "Say it with me" unchanged |
| `components/stage/Stage.tsx` | T3, T4 | TheaterBar; live interrupt; the Board beside the scene replaces `boardNote` / `stage.whiteboardOff` |
| `components/stage/TutorPanel.tsx` | T4 | Sends `stage`, `spots`, `said` instead of `sceneText` |
| `components/stage/scenes.tsx`, `widgets/*` | T4, T6, T9 | `onState` for all 12 (T4); `pose` for fraction-bar, number-line and clock (T6); the rest (T9) |
| `lib/ai/tools.ts` | T5, T7 | `stage_scene`, `go_to_scene`, `make_lesson`, all echo-only and in `BOARD_TOOLS` |
| `lib/ai/prompts.ts`, `lib/ai/context.ts` | T4, T5 | Lesson-surface block; director block; the new context fields |
| `components/tutor/Board.tsx`, `cards.ts` | T5, T7 | `scene` and `make` cards; ids `board.scene.*` |
| `lib/ai/schemas.ts` | T5–T7 | §4.2 |
| `lib/ai/build.ts` | T7 | WRITER gains `TEACHING_DIRECTIVE`; `writeLesson` streams scene by scene |
| `lib/server/budget.ts` | T7 | Per-learner daily lesson counter |
| `learning/profile.ts` | T7 | `stuckSittings(state, profileId, skillId)`: days with attempts on the skill and no correct unassisted attempt |
| `lib/server/db/wire.ts`, `schema.ts`, `apps/web/drizzle/0002_takes.sql` | T8 | Server takes (§10.3) |

---

## 7. The action timeline on the voice clock

### 7.1 Producers (every one ends in `toBeat()`)

1. **Live AI reply** (Talk, drawer, stage live):
   - One `Beat` per assistant message: `say` = `replyText(message)`, `cues` from the message's anchors, `do` = `cardsOf(message)` plus the `stage_scene` / `go_to_scene` parts as board or scene commands.
   - `by: "ai"`.
2. **Demo tutor:** `DemoTurn {text, cards}` plus `hintSpotAt(item, rung)` (spec §3.5). `by: "demo"`.
3. **Code script** (`codeScript`), built from `slideSegments`, `sceneSegments` and `quizSpeech`:
   - **Slide:** one `read` beat per segment, with the automatic cue `v{i}` → `stage.block.<i>.visual.<kind>` at word 0.
   - **Interactive:** title and prompt beats, then `wait: "act"`.
   - **Quiz:** the existing prompt and choices reading, with no cues on choices (they get the word highlight only), then `wait: "act"`.
   - **Project:** brief and step beats, no cues.
   - `by: "code"`.
   - It is the demo script, the AI fallback, and K–2's read-along.
4. **AI script** (`writeScript`, §9.3). `by: "ai"`.

**Round-trip test:** for each producer, `say` contains no `[[`; every `cue.word < words(say).length`; and serializing the beat back to anchored text and re-parsing it gives an equal beat.

### 7.2 Player (`lib/theater/player.ts`, pure, about 200 lines, fake-clock tests)

**Injected:**
- the app `SpeechOut` (spec §3.2);
- `lib/attention.ts`;
- `beginPointing`;
- executors `{board, scene, pose}`;
- a clock;
- `record?` (the stage passes it; replay never does).

**Modes:** `idle | playing | paused | waiting | live | ended`.

**Rules:**
1. **One `speak()` iterable per scene run.**
   - It yields the sentences of every remaining beat, in order.
   - Global word = the words of earlier beats + `cue.word`.
   - Sentences come from `chunk.ts`, which splits only at whitespace, so the word space holds.
   - Band pauses fall between sentences; there is no per-beat request.
2. **Cues:** `onWordScheduled(word, audibleAt, run)` feeds `attention.ts` with each cue's global word.
3. **Script `do` commands** fire at the beat's first word's `audibleAt − 150 ms`. They never delay the first audio.
   - **Before a `pose`:** call `memory.help(checkIds(scene))` (D-2).
   - **After the beat:** reset the widget to the scene's authored start.
   - A `pose` is valid only before the learner's first touch.
4. **`wait: "act"`:**
   - The mode becomes `waiting`; the mic follows the conversation-mode rules.
   - The scene's own checker (`onAnswer` / `onCheck`, both code) reports.
   - The live tutor then reacts (AI), or the demo tutor's code-built `explain` / vetted hint does. Then the next beat plays.
5. **`wait: "tap"`:** a Continue chip (K–2: a 56 px "Keep going").
6. **Interrupt:**
   - **Voice:** duck within 150 ms; cancel on a real word or after 700 ms of voiced frames (spec §2.4).
   - **Typing:** goes `live`.
   - **A touch on any control:** goes `paused`. The run and pending cues are cancelled, and the widget belongs to the learner at its current state.
   - **Saved cursor:** `{scene, beat, sentence containing heardUpTo()}` (with nothing heard, sentence 0). The snapshot is written before advancing.
7. **Generation token:** each run gets one, and callbacks carrying a stale token are ignored.
8. **Resume:**
   - Only on Continue / "Keep going", or the phrases "keep going", "go on", "sigue", "continúa". It starts a new `speak()` at the saved sentence.
   - Nothing auto-resumes.
9. **Auto-advance:** slide → slide only. It never enters a quiz or interactive scene past its `wait`.
10. **Seek:**
    - Seek lands on beat boundaries.
    - Board and scene commands rebuild silently (0 `speak()` calls); poses rebuild only from snapshots (`seek.ts`).
    - Where a seek is blocked, the UI says why.
11. **Swaps:** scripts swap only at a scene boundary.

### 7.3 Binding to live tutor spec §3 (nothing new is invented; these are the theater's additions)

| | Live reply | Played scene | Replay |
|---|---|---|---|
| Epoch | `${pathname}\|${item\|scene\|"talk"}\|${messageId}` | `${pathname}\|${scene.id}\|play:${runId}` | `${pathname}\|replay:${takeId}\|${seq}` |
| Pointing session | One per reply | One per scene run (ring never re-keyed) | One per replayed beat |
| Clock | `onWordScheduled` | `onWordScheduled` | See §10.4 |
| Moves | ≤ 5 per reply | ≤ 5 per scene run; extras dropped (a test lists catalogue scenes that lose a cue) | As recorded |

Everything else follows the live tutor spec:
- the 150 ms lead;
- glide = `clamp(240 + 0.3·px, 280, 560)` with `cubic-bezier(0.2, 0.8, 0.2, 1)`;
- dwell ≥ 900 ms (K–2: 1200 ms);
- late-cue handling;
- no counting along;
- fire-time checks (epoch, `resolveSpot`, `isShown`, not guarded);
- the cancel rules;
- the ring holds through the learner's turn, rests at 6 s, and clears on their next action;
- TutorCursor poses: `[data-tutor-home]` is the Play button while a played beat has no cues;
- voice mode: no dim, no caption;
- reduced motion: no dot, a 150 ms crossfade;
- forced colors: the dashed Highlight ring;
- browser voices: `onBoundary` with a 200 ms glide;
- typed mode: `audibleAt` = render time;
- phones: the sheet peeks to ≤ 35dvh at the first move.

### 7.4 Latency gates (these add to spec §2.3 and never replace it)

| Measure | Target |
|---|---|
| Live turn on any surface, including the stage, 3–9 | p50 ≤ 1.6 s, p90 ≤ 2.5 s |
| Live turn, K–2 | p50 ≤ 2.4 s, p90 ≤ 3.2 s |
| Recording's cost on the turn path | p50 delta ≤ 20 ms (writes happen after `finish`) |
| `stage_scene` card rendered after its tool input completes | ≤ 100 ms; first-sound p50 delta ≤ 50 ms |
| Play tap → visible acknowledgement | ≤ 150 ms |
| Play tap → first sound | p50 ≤ 250 ms (clip); ≤ 400 ms (Tier A); ≤ 700 ms (vendor, socket warm) |
| Gap between beats | ≤ the band's sentence pause + 100 ms |
| Interrupt: duck / stop; touch → paused | ≤ 150 ms / ≤ 800 ms; ≤ 150 ms |
| "Keep going" → first sound | p50 ≤ 700 ms (vendor), ≤ 250 ms (clip) |
| `make_lesson` tap → "Ready" (scene 1 has content and its script) | p50 ≤ 45 s, p90 ≤ 75 s (real model) |
| Script request | p50 ≤ 15 s, p90 ≤ 30 s at `maxOutputTokens` 900 |
| Content request / script request | Never over 120 s / 30 s |

Generation never runs inside a turn.

---

## 8. The surfaces

### 8.1 Talk (`app/(focus)/talk`, TutorChat + Board): the board is the stage

- **One model call per turn** (spec §2.5).
- **The director tools are echo-only `BOARD_TOOLS` written after the words:** `stage_scene`, `go_to_scene`, `make_lesson`, plus `show_visual`, `start_practice`, `add_to_calendar`, `note_for_grownup`.
- **`stopWhen`:** `[isStepCount(5), last step board-only]`.
- **`stage_scene` input:** `{ prompt: string (≤ 140), widget: WidgetSchema restricted to fraction-bar | number-line | clock | area-model | place-value | coordinate | balance | states-of-matter }`.
  - Code builds the `InteractiveScene` (id, title from the prompt).
  - `execute` returns `{ shown: boolean, problems?: string[] }`.
- **`gateScene`, all in code:**
  - `widgetProblems`;
  - the starting state is not already the target;
  - **task–target match:** the prompt states the target (a number, fraction, time, point or state word, EN/ES through `numbers.ts`), or contains one `a op b` expression (+ − × ÷) whose value, computed in code, equals the target. Balance has no target; `widgetProblems` checks that it is solvable;
  - `praiseIn`, `languageOf`, K–2 load, `suitable()`.
- **On `shown: false`:**
  - no card;
  - the card slot shows the code-built i18n line `board.notShown` ("The board couldn't show that one.");
  - the next turn's context carries `board.notShown`, so the tutor says it plainly.
- **A touch on a staged widget:**
  - the widget's own `check()` gives the verdict, recorded as a `move`;
  - the next request carries `stage` (public state only);
  - the tutor may point at `board.scene.widget.*` from the next turn on. Its ids are not in this turn's `spots`; the director prompt says "introduce it in words now; point at its parts next turn".
- **Director prompt block** (`prompts.ts`):
  - picture first for K–2;
  - let them touch it, then ask the check question;
  - never stage a scene that is already solved;
  - stage only to help with the current idea.
- **`spots`:** `visibleSpots()`, including `board.visual.*` (latest card) and `board.scene.*` (latest scene card).
- **`make_lesson`:** §9.2.
- **"Show me again"** replays the recorded cues of a message, without audio.

### 8.2 Drawer beside a problem (TutorDrawer + Runner)

- The same live path. The problem itself is the stage.
- Worked-example board cards are allowed. `stage_scene` over the problem is not, because it would cover the work.
- **Guards:** `answerSpots(item)` plus the spec §5.3 value families.
- A spoken answer is checked in code on the server before the model call (`spoken.ts`).
- **Next** closes the drawer and cancels speech and cues.
- The take references `setId`.

### 8.3 Lesson stage (`Stage.tsx`)

- **Play** runs the scene's script through the player, choosing in this order:
  1. the chosen variant;
  2. `script`;
  3. `codeScript`.
- Key-bound beats highlight words in place through `Spoken`. Beats without `read` show in `Caption.tsx`.
- **The live turn** (interrupt by voice or typing) is `tutorTurn` with `{surface: "lesson"}` and:
  - `lesson`: title plus the scene's words, never a quiz key or explain text;
  - `stage = publicObservation(scene, live)`;
  - `spots = sceneSpots(scene).pointable ∩ visibleSpots()`;
  - `said = { heard: heard prefix of the cut beat + " [interrupted]", previous: the previous beat's last 150 chars }`.

  It is one model call. The tutor can point at `stage.block.<i>.visual.*` and `widget.*`. `stage.choice.*` and `widget.answer` stay guarded until checked. It can `go_to_scene` to a visited scene, never past an unanswered check.
- **The whiteboard button** becomes the Board beside the scene, never over the work. The `stage.whiteboardOff` copy goes away.
- **K–2:** auto-advance between slides only; 56 px Continue and Keep going chips.

### 8.4 Today K–2

BigHear stays a single code-built beat (spec §5.5). It is not a session, so it is not recorded.

---

## 9. Generation (live and offline)

### 9.1 Every generation route runs this order

1. `limited(req, bucket, perMinute)`
2. Zod parse with size caps
3. `screen(text, locale)` on every learner-typed or client-sent text: the goal (`/api/ai/lesson`) and the scene text (`/api/ai/script`). A non-ok result gets the fixed reply and **0 model calls**.
4. The per-learner daily cap (`/api/ai/lesson` only)
5. `spendGate(req, "course", locale)`
6. `model(role, meter(req))` from `lib/ai/config.ts`. A null model returns 503 (demo mode).
7. `withGenerationRetry` (≤ 2 transport retries), with `spent()` checked between steps
8. Output passes its gates and `suitable()` before NDJSON emits it

**Names never reach a model:**
- The browser posts only through `aiFetch`, which scrubs family names from the body (`lib/ai/client.ts:155-192`).
- Prompts are built field by field from plan and scene data.
- No profile field is ever sent: no nickname, note, bio or `userProfile`.
- Spot labels pass through `setSpotScrub`.

### 9.2 Live: the tutor makes a lesson ("it will create more and more")

1. **The tutor proposes `make_lesson {goal ≤ 200, subject, grade}`** only when:
   - the learner asks to learn something, or
   - `stuckSittings(...) ≥ 2` on the open skill.

   It shows a "Make a lesson about X" card. **Nothing is spent until a tap.** The tutor keeps teaching live meanwhile, with no filler speech. The cap is 3 per learner per day, with spend caps on top.
2. **On the tap:** `lib/theater/make.ts` posts `aiFetch POST /api/ai/lesson {goal, subject, grade, locale, length: "one" | "course", basedOn?}`.
3. **`/api/ai/lesson`** runs the §9.1 order, then `cachedCourse` (shareable requests only), then `writeLesson`:
   - **2+ lessons:** the outline goes through `Output.object(OutlineSchema)` with `keyPoints`. The language directive is fixed in code (`langLine`), never inferred by the model.
   - **One lesson:** no outline call.
   - **Content:** `streamText` + `Output.object(LessonSchema)` with a partial output stream. Each scene is emitted as soon as it closes and passes the per-scene gates:
     - `widgetProblems`;
     - the picture range;
     - quiz keys resolve;
     - the hint doesn't name the right choice (`mentions`);
     - `praiseIn`, `languageOf`, K–2 load, `suitable()`.
   - **At the end:** `gateLesson` and `gateWritten` on the whole lesson. Failing scenes get one repair call with the reasons. A scene that still fails is dropped and named in a `problem` event.
   - **NDJSON events:** `scene`, `lesson`, `problem`, `done`. At most 120 s per request.
4. **Scripts:** for each scene the browser posts `/api/ai/script`, scene 1 the moment it arrives, then 2..n one after another with `previous`.
5. **Saving:**
   - The client saves the lesson as a `Course` (`origin: "generated"`, `ai: true`, `from: {threadId}`) as scenes arrive; status is `outlining` until `done`.
   - The card turns to "Ready, play it here" once scene 1 has content and a script (AI, or `codeScript` labelled "This scene is read from the page").
   - Scene 1 plays while scenes 2..n are still being written.
6. **A closed tab:** unscripted scenes keep `codeScript`, and their scripts resume from the first unscripted scene on the next open.

### 9.3 `writeScript` (the port of `generateSceneActions`)

```ts
writeScript(scene: Scene, ctx: {
  lesson: { title: string; objective?: string; keyPoints?: string[] };
  index: number; total: number; titles: string[]; previous?: string;
  grade: Grade; locale: Locale; rep?: Representation;
  spots: { id: string; label: string }[]; // sceneSpots(scene).pointable
}, model: LanguageModel, signal?: AbortSignal): Promise<Script | null>
```

- **The prompt contains:**
  - `SCRIPT_RULES` (§5.1);
  - `TEACHING_DIRECTIVE`;
  - the anchor guide (spec §3.1 text, plus "the slide shows, your voice tells" for 3–9);
  - band rules: K–2 ≤ 6 beats and ≤ 10 words a sentence; 3–9 ≤ 10 beats and ≤ 16 words;
  - `langLine(locale)`;
  - `courseContext(ctx)`;
  - the scene as JSON built field by field: no quiz `answer`, no `explain`, no widget `target`;
  - the spot list with labels;
  - `rep`, when it is an "Another way" variant.
- **Output:** `Output.object(ScriptOut)`, where `ScriptOut = { beats: [{ say ≤ 220, pose?: WidgetPoseSchema(scene.widget.kind), wait?: boolean }] (1..10) }`. Only kinds whose widget has the pose seam get `pose` in the schema. `maxOutputTokens` is 900.
- **Then:** `toBeat()` on each beat (anchors → cues), then `gateScript`.
  - On failure: one retry with the reasons.
  - If it still fails: return null, and the client keeps `codeScript` in the learner's locale, labelled.
- **Not written:** no AI script for K–2 slides (§2.2 #17).
- **`/api/ai/script`:**
  - Catalogue scenes are posted by id `{catalogueId, lessonId, sceneId}` and rebuilt on the server. Their scripts are cached globally by `(sceneId, grade band, locale, rep, prompt version)`.
  - Generated scenes are posted whole, then re-parsed with `SceneSchema`, per-scene `gateLesson` checks and `screen()`. Their scripts are never cached across families.

### 9.4 `gateScript` (all in code)

1. `languageOf(all say) === locale`.
2. Sentence length per band. No raw symbols reach the voice: `speakable` runs over every sentence, and a dev assertion catches raw symbols.
3. `praiseIn()` is empty. No greeting words (`hello|hi|welcome|hola|bienvenid`). Closing words only on the last scene.
4. Every anchor id is in `ctx.spots` and not guarded. No anchor on a deictic word (this, here, esto, aquí). At most 1 anchor per sentence and 3 per beat. No counting along.
5. **Quiz scenes:**
   - at most 2 beats, meta-level only;
   - anchors only on `stage.quiz.prompt`;
   - no beat contains any choice text or the explain text (`mentions()`);
   - no answer value appears as digits or as a written-out number (`numbers.ts`, EN and ES).
6. **Poses:**
   - only for kinds with the seam;
   - in range;
   - never equal to the target or one step from it (`poseProblems`);
   - never on sorter, sequence or sentence-builder.
7. Interactive and quiz scripts end on `wait`. At most one `wait`, and only at the end.
8. `screen(say)` is ok for every beat. A failing beat fails the script.

### 9.5 Offline: catalogue scripts

- **Run:** `EVAL_REAL=1 EVAL_SUITE=catalogue-scripts npm run evals` (`apps/web/evals/catalogue-scripts.ts`).
- It runs `writeScript` + `gateScript` over the 3–9 slide scenes and all interactive and quiz openings of the 61 catalogue files, through the same `lib/ai/config.ts` model, with no learner data.
- It writes drafts to `catalogue/scripts/<course-file>.json` (status `draft`, ≤ 60 KB per course, loaded lazily, never in the initial bundle) and lists them in `/review`.
- **Nothing ships without D-3.**
- **Clips:** for `codeScript` reading and for approved scripts, clips follow spec P5 (`voice/<sha256(text|voice|model|speed)[:16]>.{mp3,json}`). Public text only.

### 9.6 Cost

- At most 2 transport retries and 1 gate retry per stage.
- One script call per scene per variant.
- Variants and clips are cached.
- Every attempt is metered.
- `spent()` stops the job between scenes, and unfinished scenes keep `codeScript`.

---

## 10. Recording and replay ("recording or replay able experiences will remain")

### 10.1 What is recorded

- **Every Talk, drawer and lesson-stage session** becomes a `Take` (§4.1).
- **`useTakeRecorder`** subscribes from outside the views:
  - TutorChat `finish` → a `tutor` record with its `run`: delta-encoded `wordsAt` from `onWordScheduled` for that run id, `heardUpTo`, and `cut`;
  - submit → a `learner` record (text through `withoutNames`);
  - the stage's and the board's `onAnswer` / `onCheck` → `move` with the code verdict and `assisted` copied;
  - `onState` (debounced 300 ms) → `move` with the state only, for seek;
  - scene changes → `scene`;
  - fixed safety replies → `safety` (kind only).
- **Never recorded:** learner audio, pointer traces, names, keys, prompts.
- **Writes** go to IndexedDB after `finish`, never on the turn path.
- **Sizes:**
  - a tutor beat is about 0.5 KB, so a 20-turn Talk take is ≤ 25 KB and a 20-minute session ≤ 64 KB;
  - caps: 2,000 records or 256 KB per take (under `SYNC_LIMITS.recordBytes`);
  - 200 takes per learner, the oldest takes not marked kept pruned first.

### 10.2 Storage: the browser now

- **Bodies:** IndexedDB `kaizenedu.takes`, following the `lib/blobs.ts` pattern.
- **Index:** a `TakeRef` index in `StoreState.takes`.
- **Without IndexedDB:** a memory fallback, and the UI says "Kept for this visit only".
- **Until server sync:** the UI says "Replays are kept on this device". Safari can evict site data that goes unused for a while.
- **Export and delete:**
  - `lib/export.ts` adds take bodies (an async `withTakes`, the same pattern as `withFiles`); audio is included only through the files option.
  - `deleteLearnerData`, `deleteFamily` and `wipeBrowserStorage` remove the IndexedDB rows.
- **`TutorThread.takeId`** links each transcript to its "Watch again".

### 10.3 Storage: the server, with accounts (T8)

- **The index:** `takes` (`TakeRef`) joins `SYNC_LISTS` and `KEEP_ON_SERVER` (`lib/server/db/wire.ts`), with `recordTable("takes")` and the `0002_takes.sql` migration.
- **Bodies:**
  - `POST /api/sync/takes` pushes bodies the server lacks (≤ 4 MB per request, `SYNC_LIMITS`);
  - `GET /api/sync/takes/[id]` pulls a body on demand when a replay opens on another device;
  - table `take_bodies` via `recordTable`.
- **Deletion:** the account cascade deletes everything, and learner removal deletes that learner's rows.
- **Audio:** device-only until D-4 and a Vercel Blob token exist. Then it is uploaded private, under allocated ids, with the same retention.

### 10.4 Replay ("with and without voice")

`replay.ts` walks the records in `seq` order through the player in replay mode:
- no model call, no recorder, no store write;
- learner lines appear as muted bubbles at their recorded times;
- checks show "then: right" or "then: not yet", greyed and never re-asked;
- board cards and scene commands re-apply;
- widget states come from snapshots, through `pose` where a kind has the seam; otherwise a static `VisualView` of the snapshot.

The banner always reads **"Replay · <date> · doesn't count as practice"**.

**Voices, chosen in `Replay.tsx`; the default is the first one available:**
1. **Original voice.** The kept tutor audio (D-4), or clips when every line has one. Cues follow the recorded `wordsAt` against the audio's playback time.
2. **Spoken again.** The current app `SpeechOut`: vendor with consent, else clips where they match, else Tier A ("Using this device's voice"). Cues are word-indexed, so they follow the new voice's clock with no extra work. Under-13 learners without vendor consent get Tier A or clips.
3. **Text.** Captions paced by the recorded `wordsAt` (moves ≥ 900 ms apart when there are no times), with cues on render.

**Other replay features:**
- Captions and transcript come from `captions.ts` (`toVtt`) over the recorded word times.
- Seek works through `timeline.ts` and `seek.ts`.
- "Try it yourself" starts a new live session.

### 10.5 How recordings become lessons

1. **A generated lesson is a scripted take by construction.** Its scenes carry `script {by: "ai"}`. "Watch again" plays it.
2. **"Keep this explanation"** (the stage):
   - The tutor beats between an interrupt and its resume on scene S become a `scripts[]` variant `{by: "live", from: {takeId, at}}`.
   - They must pass `gateScript` plus: no learner line, no tutor line quoting the learner (matched against the scrubbed learner turns), anchors in `sceneSpots(S)`, and not on an unanswered quiz.
   - It is family-private, labelled "Explained live on <date>".
3. **"Keep as a lesson"** (Talk or drawer, one tap by a grown-up or a 3–9 learner): `curateSession(take)` in code, **with no model call**:
   - each `scene` card becomes an interactive scene, and each `show_visual` card a slide `{visual block, alt: description}`;
   - each scene's script is the tutor beats said while it was the latest card, with cues re-anchored to that scene's spots;
   - learner moves become `wait: "act"`;
   - learner turns, verdicts and safety records are dropped, and so are lines quoting the learner;
   - `gateLesson` and `gateScript` run (the 3-scene minimum doesn't apply).
   - **The lesson needs at least one check scene;** otherwise the session can only be kept as notes.
   - It is saved as a `Course` with `origin: "generated"`, `ai` set when any beat is AI, and `from: {takeId}`. Label: "From your session · <date>". It is never written to the shared `courseKey` cache.
4. **"Make it a lesson"** (from a Talk take) runs `make_lesson` with the topic phrase only (names scrubbed). The conversation itself never goes to a model.

### 10.6 How lessons multiply

1. The tutor makes them (`make_lesson`, within the caps).
2. The shared cache: a shareable generated course comes back to the next family with 0 model calls. Lessons from a family's files or from a take are never shared (`shareable()` test).
3. **"Another way":** an `/api/ai/script` variant keyed by `TeachingPrefs.representation`, band and locale. The content is reused; only about 1k tokens of script is new per scene. It is cached globally for catalogue lessons and privately for family lessons.
4. **"Make another like this":** the same objective and `keyPoints` with new numbers and examples through `/api/ai/lesson {basedOn}`, linked by `from.courseId`. The original is kept.
5. **Thumbs:** `Course.rating`. A thumbs-down offers "Make another like this".
6. Every session leaves a replay, always.

---

## 11. The existing stage, widgets and catalogue: seeds, not dead ends

- **Catalogue (61 files):**
  - The courses play in the theater on day one through `codeScript`, with automatic picture cues.
  - They also serve as the source for "Another way" variants (cached globally), for the tutor's existing `lesson` board card, and for the AI script drafts in `/review`.
  - Following STATUS, they get fixed, not extended. Authored cues (spec §3.5) count as fixes.
- **Stage** (`Stage.tsx`, `scenes.tsx`, `VisualView`, `narration.tsx`): stays the only lesson surface. It gains Play, live interrupt and the Board beside the scene. "Say it with me" and `Spoken` are unchanged.
- **Widgets:**
  - They stay typed and checked by code (`check()`), never iframes.
  - They gain `onState` (T4) and `pose` (T6, then T9).
  - A `pose` applies only before the first touch and resets after its beat.
- **`show_visual` Visuals** are the drawing primitive. There is no whiteboard in 1.0.
- **Source-built courses** (`lib/source-course.ts`) get `codeScript` and play the same way.

---

## 12. Demo mode (`KAIZEN_AI=off`, no keys)

- **Plays as normal:**
  - every lesson on `codeScript`, with automatic cues;
  - demo-tutor beats with `hintSpotAt` cues on Talk, the drawer and the stage;
  - recording, and replay in Tier A, clip or text mode;
  - the tutor's live-on-stage path through vetted hints.
- **`/api/ai/script` and `/api/ai/lesson`** return 503, and the client keeps `codeScript`.
- **`make_lesson`** offers the source-built course path (`lib/source-course.ts`), labelled "Built from real sources", with `codeScript`.
- No feature disappears. The theater reads the lesson's words instead of teaching around them.
- The demo tutor says "demo tutor" once, in the opening.

---

## 13. Invariants (each one has a test, §14)

1. Replay writes nothing: no Attempt, ActivityEvent, TeachingAct, review, thread or help (lint boundary plus store-diff test).
2. Recording writes only `takes`, plus `threads` as today.
3. **Help:**
   - neutral `codeScript` narration and AI meta beats on check scenes are not help;
   - a `pose` beat, a live turn while the scene is open, and an open tutor panel are help (D-2). Help is recorded before the teaching is delivered.
   - The mastery law in `learning/engine.ts` is unchanged.
4. Right and wrong come only from widget `check()`, the quiz index, practice `check` and `spoken.ts`. No model grades. No key ever reaches a prompt. `publicObservation` never spreads a Widget, Quiz or Item.
5. `screen()` runs before every model call.
6. Learner names never reach a model, and takes are scrubbed when written.
7. No learner audio is ever recorded. Tutor audio is kept only on opt-in.
8. Content-addressed clips exist only for public text; private audio uses allocated ids.
9. **Labels, always visible:**
   - "Written by AI";
   - "Narration written by AI";
   - "Written by people · narration by AI, reviewed";
   - "This scene is read from the page";
   - "From your session · <date>";
   - "Explained live on <date>";
   - "Built from real sources";
   - "Demo tutor";
   - "Using this device's voice";
   - the replay banner.

   AI is never claimed for a code script.
10. No generated JavaScript, no iframes, no third-party CDNs or fonts.
11. Anchors are the only cue syntax, and `Beat` is the only stored form.

---

## 14. Tests

**Unit** (vitest, fake clocks):
- **`toBeat` round-trip** for each producer:
  - a reply split at every character position yields display text with no markers;
  - cues land at the right word indexes;
  - a marker at the very end binds to the last word.
- **Player:**
  - cue arrivals at `audibleAt − 150 ± 16 ms`;
  - an interrupt at beat 3, word 12 resumes at the start of the sentence that holds word 12;
  - a stale run's callbacks are ignored after a token bump;
  - seek to beat 3 rebuilds board, scene and snapshots with 0 `speak()` calls;
  - seek is disabled past a learner change on a kind without the seam;
  - a touch goes to `paused` in ≤ 150 ms (fake clock);
  - no auto-resume;
  - auto-advance never enters a check scene.
- **`gateScript`:** rejects each failure in §9.4, one case each. The answer-number cases cover digits, "seven" and "siete".
- **`gateScene`:** rejects shaded > parts; rejects a start equal to the target; rejects a prompt that doesn't state or compute its target; accepts "Shade 3/4 of the bar" with `{parts: 4, shaded: 3}`.
- **`poseProblems`:** rejects poses at the target, one step from it, or out of range.
- **`codeScript`:**
  - for every catalogue scene, the code script says exactly its on-screen words, in order;
  - no quiz beat mentions a choice (over all 244 quizzes);
  - the existing narration tests stay green.
- **`curateSession`:** planted learner phrases and names never appear in the lesson; a session with no check scene yields notes only.
- **Takes:** caps and pruning; `op` dedupe; delta encoding; a 20-turn fixture is ≤ 25 KB; with "Ada" planted, "my name is Ada" is stored scrubbed.
- **Store diff:** replaying a fixture take leaves `attempts`, `activity`, `acts`, `threads` and `reviews` unchanged.
- **Routes** (mocked model):
  - a crisis goal on `/api/ai/course` and `/api/ai/lesson` gets the fixed reply with 0 model calls;
  - a 4th lesson in a day is declined in words with 0 calls;
  - an unparseable script returns the fallback in the request's locale;
  - each stage retries at most 2 times and meters every attempt;
  - the model-call spy never sees a family nickname or a profile field.
- **Prompt golden snapshots:** `SCRIPT_RULES`, the director block, the lesson-surface block.

**Component** (RTL + jsdom, fake `SpeechOut` from `lib/voice/fakes.ts`):
- For every catalogue scene, from the registry and in both answered states: rendered `data-spot` ⊇ `sceneSpots(scene).pointable`, and no guarded id is in the pointable list.
- Serializing the `/api/tutor` request for every catalogue quiz and widget contains no answer index, no target and no `choices[answer]` marker.
- The Board `scene` card renders `board.scene.widget.fractionbar.part.0..3`.
- `TheaterBar` states; `Caption`; the `Replay` banner in every state.
- `widgets.test.tsx` and `lesson-stage.test.tsx` stay green through the `onState` and `pose` changes.

**End to end** (`apps/web/e2e/theater.spec.ts`; models mocked with Playwright `page.route` serving recorded streams, as `aiinfra.spec.ts` does; desktop and phone; also `KAIZEN_AI=off`):
1. **K–2 lesson:** Play start to finish; each picture's ring arrives 0–250 ms before its alt text's first word (fake voice with timings); 0 calls to `/api/ai/*` with AI off.
2. **Talk:** two anchored replies and a scene card are recorded; "Watch again" visits the same spot ids in the same order, with no markers in the DOM and an unchanged store.
3. **Stage:** speak mid-beat → live → "Keep going" resumes at the cut sentence; touching a widget during a pose pauses within 150 ms and leaves the widget editable.
4. **Talk:** "teach me about the water cycle" → a `make` card → tap → "Ready" → Play. Scene 1 plays while scenes 2..n arrive. No scene plays without a script, with `codeScript` standing in, labelled. The live turn still meets the P1 latency gate meanwhile.
5. **Replay** in text mode with AI and voice off.
6. **axe** clean in playing, paused, waiting, live and replay at 1440 and 390 px; the reduced-motion equivalent; no horizontal scroll at 320 px.

**Evals** (`apps/web/evals`, `EVAL_SUITE`; mocked by default, `EVAL_REAL=1` for the real model):
- **`script`:** 40 scenes across K–2, 3–5 and 6–9, EN and ES, sampled from the catalogue registry.
  - ≥ 95% pass `gateScript` on the first or second try; 100% end with a valid script (AI or the code fallback); the raw invalid-anchor rate is reported, and 0 invalid anchors ship;
  - 0 quiz leaks; 0 poses at or next to the target; 100% `languageOf` correct; 100% `praiseIn` empty; 0 greetings;
  - script call p50 ≤ 15 s; cost per script logged;
  - runs once on `talk` and once on `build` to settle §2.2 #13.
- **`lesson`:** 10 goals, EN and ES.
  - tap → "Ready" p50 ≤ 45 s, p90 ≤ 75 s; a whole lesson ≤ 4 min p50;
  - every shipped scene passed its gates, or was skipped and named;
  - no request over 120 s.
- **Latency:** spec §7.4 voice-latency eval, extended with lesson-surface live turns and the theater rows of §7.4 (mock voice).

---

## 15. Phases, in build order

Each phase starts when the one before it is merged and `npm run verify` is green. `docs/STATUS.md` keeps four lists (done, in progress, left, blocked), with blocked-on-a-key-or-decision kept separate from not started.

### T0. Gates before anything generates (half a day, no keys)

**Builds:**
- §5.4 guards;
- `screen(goal)` in `app/api/ai/course/route.ts`;
- `aiFetch` in `lib/generate.ts`;
- `THIRD_PARTY_NOTICES.md`;
- STATUS and live tutor spec §0.4: the precondition is met (evidence from §1.1) and the never-merge warning (§1.2).

**Acceptance:**
1. A crisis goal to `/api/ai/course` streams the fixed reply, and the mock model records 0 calls.
2. A goal containing the learner's and a sibling's nicknames leaves the browser with both replaced (spy on the body).
3. A planted `sk-ant-oat` and a planted `modules/` import each fail `verify`.
4. `verify` is green.

*Owner's words: "learner names never to a model"; "safety screen before any model call".*

### T1. The live tutor first (live tutor spec P1–P4, unchanged)

**Builds:** that spec exactly:
- `numbers.ts`, `voices.ts`, `audio.ts`, `player.ts`, VoiceRoot;
- `conversation.ts`, Flux/Nova, barge-in, `spoken.ts`, `stopWhen`;
- `cues.ts`, `attention.ts`, `beginPointing`, the ring and TutorCursor;
- deleting `point_at` and `runSpotFromToolPart`;
- the §6 ids.

Build against fakes where keys are missing.

**Acceptance:** spec §8, including:
- `speechSynthesis` appears only in `lib/voice/browser.ts`;
- 3–9 p50 ≤ 1.6 s and p90 ≤ 2.5 s; K–2 p50 ≤ 2.4 s;
- duck ≤ 150 ms, stop ≤ 800 ms;
- e2e 7.3-1: each arrival 0–250 ms before its word;
- drift ≤ 1 word over 60 words;
- a guarded part is never lit;
- axe clean.

Real-vendor gates are listed as blocked on keys.

*Owner's words: "wiring up the tutor before making the lessons"; "talks and listens naturally… not uncanny… real time"; "moving attention using the glow / tutor cursor".*

### T2. Beats, and recording every live reply

**Builds:**
- `types.ts`, `beat.ts`, `record.ts`, `useTakeRecorder` in TutorChat (Talk and drawer);
- `demoBeat`;
- `TutorThread.takeId`;
- export and delete;
- `SpotAgain` replays recorded cues.

**Acceptance:**
- `toBeat` round-trip tests;
- a 20-turn take ≤ 25 KB;
- names scrubbed; no audio rows;
- the store diff shows only `takes` and `threads`;
- export contains takes, and delete leaves 0 rows;
- with IndexedDB blocked, the memory fallback works and the UI says so;
- turn latency p50 delta ≤ 20 ms against T1.

*Owner's words: "recording or replay able experiences will remain".*

### T3. Player, replay, and the stage performing code scripts (no AI)

**Builds:**
- `spots.ts`, `code-script.ts`, `player.ts`;
- `cursor.ts`, `timeline.ts`, `seek.ts`, `captions.ts`, `replay.ts`;
- `TheaterBar`, `Caption`, `Replay`, `/replay/[id]`;
- "Watch again" on transcripts (Talk history, the grown-up's child page, Family);
- the stage's Play mode on `codeScript`.

**Acceptance:**
- the player unit tests;
- the spots component test over every catalogue scene; `codeScript` says the on-screen words; 0 quiz beats name a choice;
- e2e 1, 2 and 5;
- gap between beats ≤ band pause + 100 ms;
- Play → acknowledgement ≤ 150 ms; Play → first sound p50 ≤ 400 ms (Tier A, fake) and ≤ 250 ms (clip fixture);
- axe clean in every state; reduced motion means no dot.

*Owner's words: "the live theater… will remain"; "same visual world at max craft".*

### T4. The tutor live on the stage

**Builds:**
- `observe.ts`;
- `onState` on all 12 widgets;
- the TutorPanel context (`stage`, `spots`, `said`);
- interrupt by voice and typing → live; touch → paused;
- Keep going by chip and phrase;
- `wait` beats with code verdicts reaching the tutor as text;
- the Board beside the scene;
- the demo tutor on the stage.

**Acceptance:**
- the request-serialization test (no key, target or answer marker);
- the guarded-id property test over all catalogue scenes in both states;
- lesson-surface live turn p50 ≤ 1.6 s (3–9) with one model call;
- "Keep going" → first sound p50 ≤ 700 ms;
- opening the tutor marks the scene's checks assisted, and neutral narration doesn't;
- changing scene mid-reply drops every pending cue and the speech;
- e2e 3 (without the pose part).

*Owner's words: "a clean teacher replacement"; "show, let them touch it, then check".*

### T5. Director verbs in Talk

**Builds:**
- `stage-scene.ts` (`StageSceneInput`, `gateScene`);
- the `stage_scene` and `go_to_scene` tools in `BOARD_TOOLS`;
- the Board `scene` card with `board.scene.*` ids;
- the director prompt block;
- `board.notShown`.

**Acceptance:**
- with a mock model, text then `stage_scene` ends after one step;
- a fraction bar with shaded > parts returns `shown: false` and no card;
- an accepted card renders its part ids;
- learner shading is recorded with the widget's own verdict, and the next body carries `stage.state` with no `target` (asserted on the JSON);
- `go_to_scene` never skips an unanswered check;
- first-sound p50 delta ≤ 50 ms against T1;
- tutor eval over 50 scripted Talk turns: anchors valid ≥ 95%; `stage_scene` passes `gateScene` ≥ 85%; 0 already-solved scenes; 0 cues on guarded ids.

*Owner's words: "the lessons are just an extension of the tutor itself"; "show, let them touch it, then check".*

### T6. OpenMAIC's script stage: `writeScript` and `gateScript`

**Builds:**
- `lib/ai/script.ts` and `lib/ai/retry.ts`;
- `/api/ai/script`;
- `ScriptOut` and `WidgetPoseSchema`;
- the `pose` prop on fraction-bar, number-line and clock;
- scripts swap in at scene boundaries;
- the global cache for catalogue variants.

**Acceptance:**
- the `gateScript` unit tests and prompt golden snapshots;
- `script` eval bars (§14), with the role decided;
- Play never waits: tapping Play while a script request is pending plays `codeScript` within the T3 budget;
- a pose marks help and resets to the start;
- a cached variant comes back with 0 model calls;
- check-forbidden is green with every ported file carrying its notice.

*Owner's words: "use openmaic generator its solid".*

### T7. The tutor makes lessons and plays them while it writes

**Builds:**
- the `make_lesson` tool and `MakeCard`;
- `/api/ai/lesson` with `writeLesson` (outline for 2+ lessons; per-scene streaming gates; repair call);
- `make.ts` (scene 1 first, scripts one after another, resume);
- `KAIZEN_LESSONS_PER_DAY`;
- `stuckSittings`;
- WRITER gains `TEACHING_DIRECTIVE`.

**Acceptance:**
- e2e 4;
- `make_lesson` alone makes 0 course calls (no spend without a tap);
- a crisis goal makes 0 model calls;
- the 4th lesson is declined;
- the `lesson` eval bars;
- after a reload, scripting resumes from the first unscripted scene.

*Owner's words: "it will create more and more".*

### T8. Recordings become lessons; lessons multiply

**Builds:**
- "Keep this explanation";
- `curate.ts` with "Keep as a lesson";
- "Make it a lesson";
- "Another way" (by representation);
- "Make another like this";
- thumbs;
- opt-in tutor-audio capture (after the GainNode on the tutor output bus, `MediaRecorder` opus at about 16 kbps, allocated ids), once D-4 is decided;
- server takes (§10.3).

**Acceptance:**
- a kept variant holds no learner line, name or guarded anchor, and plays from the variant menu;
- curated lessons pass `gateLesson` and `gateScript` and never enter the shared cache;
- variants change at least one quantity and leave the original unchanged;
- replays never change tallies or mastery;
- with captured audio, cue arrivals stay 0–250 ms before their words;
- server round trip: a take recorded on device A replays on device B, and learner delete removes it on the server;
- the ES parent journey (keep, regenerate, play) works fully in Spanish.

*Owner's words: "recording or replay able experiences will remain"; "it will create more and more".*

### T9. Catalogue scripts, clips, the remaining poses, ship gates

**Builds:**
- `catalogue-scripts` drafts into `/review`;
- clips for `codeScript` K–2 narration and approved scripts (spec P5);
- `pose` on the remaining kinds;
- dogfood passes as a K learner, a 9th grader before a test, and a Spanish-speaking parent on a phone;
- update `docs/spotlight.md` and STATUS/DECISIONS.

**Acceptance:**
- 100% of catalogue scenes have a script that passes `gateScript` (code or approved AI);
- every draft is ≤ 60 KB and absent from the initial bundle;
- clip playback: 0 model or TTS calls during catalogue playback (network spy), drift ≤ 1 word over 60;
- `verify` and e2e green; axe clean at 1440 and 390 px;
- the dogfood findings are fixed before release.

*Owner's words: "dont make anything look or sound or feel like AI slop".*

---

## 16. Blocked on the owner (kept separate from "not started")

**Keys and accounts:**
- `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY` (Member role) and `KAIZEN_VOICE=vendor` on Vercel. These block the live tutor spec's P0 vendor checks, the real-vendor latency and drift gates (T1, T7, T9), and replay with the vendor voice.
- `ANTHROPIC_API_KEY` or `AI_GATEWAY_API_KEY`, if not configured. This blocks every `EVAL_REAL=1` run (T5, T6, T7, T9) and live generation outside demo mode. Mocks cover everything else.
- A Vercel Blob token. This blocks clips (T9) and server-side tutor audio (T8).
- Production `DATABASE_URL`, if not set. This blocks server takes (T8).

**Decisions:**
- D-1 to D-6 (§3).
- From the live tutor spec: the voice audition pick; the wording of openings and consent; counsel's view on vendor read-aloud consent for under-13 learners.

**Sessions:**
- Blind listening with children.
- Device soak.
- The reviewer's sign-off on catalogue AI scripts.

---

## 17. Risks

1. **Reading "use openmaic generator" as the whole package.** Answered by D-1, with the evidence. Escalate it; don't decide it silently.
2. **Answer leaks through the theater:** a quiz preview, a pose at the target, a guarded anchor, counting along, written-out numbers. Covered by decode-time and write-time gates, fire-time guards, and the catalogue property tests. A gap in any of these is an honesty bug, not a style issue.
3. **Spot drift between `sceneSpots` (data) and `data-spot` (DOM).** Covered by the full-catalogue component test, `spotsVersion` re-gating, and `resolveSpot` dropping misses silently.
4. **Latency.** Generation is always background and browser-driven. If tap → "Ready" goes over 45 s p50, lower the script effort before cutting any gate.
5. **K–2 read-along against teacher speech.** K–2 slides stay on `codeScript`. AI beats appear only on openings.
6. **The widget seam.** It goes kind by kind, and seek stays honestly disabled until each kind has it. The existing widget tests guard against regressions.
7. **Storage eviction (Safari) and quota.** Bodies live in IndexedDB, never localStorage. The UI says replays are on this device until T8 sync.
8. **Cost stacking.** At most 2 retries plus 1 gate retry; metered; capped; cached; a tap before any lesson spend.
9. **Prompt heritage** (praise, greetings, multi-agent, Chinese examples, adult pacing). Rewritten as constants under golden tests; `praiseIn` and the greeting check enforce the rest.
10. **OAuth contamination by copying.** Only the leaf files in §5.1 come over. Check-forbidden and the ESLint ban land in T0, before any port.
11. **Stale merges.** No `worktree-wf_a6840288-*` branch is ever merged, and nobody forks TutorChat: the recorder hooks in from outside.
12. **Help accounting** (D-2). If it is implemented wrong, help on an answer goes unrecorded. Covered by explicit tests in T4 and T6.
