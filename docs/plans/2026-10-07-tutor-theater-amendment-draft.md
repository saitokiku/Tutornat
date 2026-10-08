> **DRAFT, not yet attacked.** The owner's OpenMAIC picks (HTML interactives, project-based learning, multi-agent classroom behind a button) written into the theater spec. The browser-security, child-safety and teaching reviews were stopped before they ran; run them before building from this (see docs/HANDOFF.md).

# KaizenEDU tutor theater: build spec

Date: 2026-10-07. Commit as `docs/plans/2026-10-07-tutor-theater-spec.md`.

**Amended 2026-10-07** for the owner's OpenMAIC decision: the HTML interactives, project-based learning and the multi-agent classroom. The amendment changes these sections: §0; §1.9–1.10; §2.3; §3 (D-1, D-6, and the new D-7 to D-12); §4 (and the new §4.4); §5; §6; §7; §8.1 and §8.3; the new §8.5–8.7; §9 (and the new §9.7–9.11); §10; §11; §12; §13 (item 9 extended, item 10 rewritten, items 12–18 new); §14; §15 (T0, T7 and T9 changed; T4h, T6h, T7p and T9c new); §16; §17. Everything else is unchanged.

**Binding alongside this spec:**
- `docs/plans/2026-10-07-live-tutor-spec.md`, which owns voice, latency and sync. This spec never loosens it. Where the two seem to disagree, the live tutor spec wins and this spec gets fixed.
- `AGENTS.md`.
- The one-workspace spec (`git show origin/codex/integrated-learning-plan:docs/specs/2026-10-07-one-learning-workspace.md`). Two of its lines conflict with the owner's 2026-10-07 decision: its §6 sentence "The model cannot run JavaScript…" and its §7 non-goal "arbitrary generated interactive code". This spec limits the exception to the explore frame (§8.5, invariant 13.10). D-7 escalates the matching edit to that spec. Until that edit lands, the one-workspace spec wins everywhere outside the explore frame.

**Paths:**
- Ours are relative to `apps/web/src/`. Files outside `src` are written in full, as `apps/web/...`.
- OpenMAIC's are relative to `modules/openmaic-classroom/` and written as `OM/...`.

**Owner direction (verbatim, 2026-10-07):** "id suggest wiring up the tutor before making the lessons, the lessons are just an extension of the tutor itself and it will create more and more, its the live theater and recording or replay able experiences will remain. use openmaic generator its solid"

**Owner decision (verbatim, 2026-10-07):** "Take the html for sure that's the main thing I want from it then incorporate some project based learning and then maybe add the multi agent classroom out it behind a button"

How this spec reads it:
- **"Take the html for sure… the main thing":** OpenMAIC's AI-written HTML interactives come over as *explore* scenes, inside a frame we build and harden ourselves (§8.5). They teach and let learners explore. They never grade.
- **"incorporate some project based learning":** OpenMAIC's project structure comes over as patterns, for K–9 projects done at home across several days with a grown-up (§8.6). Its model grader does not come over.
- **"maybe add the multi agent classroom… behind a button":** classroom mode (§8.7). It is off by default, a grown-up turns it on per learner, and it is built last behind a flag. Because the owner said "maybe", whether it ships is the owner's decision (D-9).

---

## 0. The shape in one screen

1. **The live tutor directs.** A lesson is a tutor performance that was kept.
2. **One recorded form, the `Beat`.** It is used for:
   - live AI replies;
   - demo-tutor replies;
   - AI scene scripts;
   - code-built scripts that read the lesson's own words;
   - classroom peer lines (§8.7).
3. **One player** drives the app `SpeechOut`, the attention scheduler (glow ring and TutorCursor) and the stage, all on the voice clock from live tutor spec §3.
4. **Every tutor session is a `Take`:** an append-only log. A replay runs the same player over the take and writes nothing.
5. **What comes from OpenMAIC** is copied or rewritten here with its MIT notice, never imported:
   - its generator pipeline: outline → content → script, first scene first, scripts written one after another and carrying the previous speech forward;
   - its script prompts, course context and retry helper;
   - its playback rules: generation token, interrupt and resume, silent seek;
   - its runtime record envelope;
   - its cursor and timeline;
   - its captions;
   - **its HTML interactive generator:**
     - the simulation, diagram, procedural-skill and game prompts, rewritten;
     - HTML and config extraction;
     - the syntax gate;
     - the element inventory;
     - the observation contract.

     These run in our own explore frame, never in OpenMAIC's host (§8.5).
   - **its project structure:**
     - stages (OpenMAIC's milestones), each with a briefing and a debrief;
     - a "done" definition for every step;
     - hints that guide and never solve;
     - one planning call with one repair;
     - a two-step Done (§8.6).
   - **its classroom turn rules,** as patterns only, for classroom mode (§8.7).
6. **What does not come from OpenMAIC:**
   - the PPT canvas and renderer;
   - its iframe host, CDN post-processor, 1280×720 viewport, element picker and `url` pages;
   - its code and 3D widgets;
   - anything a model grades: code-widget tests, game scores, the project evaluator and proficiency engine, quiz grading;
   - the director models and the chat runtime. Classroom mode stays at one model call per turn.
   - the audio stack;
   - all model plumbing (the OAuth adapter lives there).
7. **Build order:**
   - T0 gates
   - T1 live tutor
   - T2 record every reply
   - T3 player, replay and the stage playing code scripts
   - T4 the tutor live on the stage
   - **T4h the explore frame (the HTML host, no model)**
   - T5 director verbs in Talk
   - T6 OpenMAIC's script stage
   - **T6h OpenMAIC's HTML generator**
   - T7 the tutor makes lessons
   - **T7p projects at home, across days**
   - T8 recordings become lessons; lessons multiply
   - T9 catalogue scripts, clips, ship gates
   - **T9c classroom mode behind a button (flag off)**
8. **The honesty line holds.** AI-written HTML teaches and lets learners explore. Only code proves a skill:
   - widget `check()`;
   - the quiz index;
   - practice `check`;
   - `spoken.ts`;
   - code-checked project steps.

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
9. **Our side, for the amendment** (checked 2026-10-07):
   - **No CSP.** `apps/web/next.config.ts` sets no headers at all. A `srcdoc` frame inherits its parent's policy, so today it would inherit none. That makes the packed meta CSP (§9.9) the only network wall.
   - **Projects today:**
     - `ProjectScene` (`lib/types.ts:127`) is `{title, brief, steps}`.
     - `ProjectView` (`components/stage/scenes.tsx:280`) keeps its checkboxes in `useState`. Nothing is saved or recorded, and there is no grown-up role.
     - `ProjectSchema` allows 2–5 steps (`lib/ai/schemas.ts:139`).
     - There are 238 catalogue project scenes. The OpenMAIC project map reports some with 6 steps. T7p's lift test counts them from the registry.
   - **Dependencies:** `axe-core` is present only through `@axe-core/playwright` (dev). `parse5`, `acorn` and `katex` are not dependencies.
   - **Budget:**
     - One request is one turn (`lib/server/budget.ts:18`).
     - The caps are 50 turns and $1 per learner per day (`:49-50`).
     - Prices per million tokens: Sonnet 5.5 is $2 in / $10 out, and Opus 5.5 is $4 / $20 (`:62-63`).
   - **The tutor turn:** `tutorTurn` (`lib/ai/tutor.ts:104-131`) is one `streamText` with `stopWhen: isStepCount(5)` and `maxOutputTokens: 700`.
   - **The course cache:** generated courses are cached in an in-process map, used only when `shareable()` (`lib/ai/build.ts:225-255`).
   - **Gate and blobs:** the grown-up gate is `session.unlocked` (`lib/store.ts:40-41`). Device blobs go through `putBlob` (`lib/blobs.ts:96`).
10. **OpenMAIC, for the amendment.** These come from three maps, read but not run. Line references are in §5.
    - **Interactive host:**
      - the sandbox is `allow-scripts allow-forms allow-popups`, and the frame has no CSP;
      - the page is portalled over its slot and scaled down from 1280×720, which is 0.25 at 320 px;
      - a `url` field loads any page;
      - raw errors are shown to the learner;
      - there is no size cap on generated HTML;
      - KaTeX is pulled from jsdelivr with `trust: true`;
      - module scripts are never syntax-checked.
    - **Projects:**
      - a model score of 60 or more unlocks Done;
      - a proficiency engine is fed by model scores;
      - the planner input carries the nickname and bio;
      - a project is one sitting of 15–45 minutes.
    - **Classroom:**
      - a director model call runs, not streamed, before every speaker, so k speakers cost 2k+1 calls;
      - nicknames are sent to the model;
      - discussions and roster writes widen `soloTutor` again;
      - the chat route has no screen, rate limit or spend gate.

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

### 2.3 Resolved by the 2026-10-07 amendment

| # | Question | Options seen | Decision | Why |
|---|---|---|---|---|
| 19 | Where model-written HTML runs | OpenMAIC's host (portal, 1280×720, popups and forms, no CSP); nowhere (old D-1, old invariant 10) | Our `ExploreFrame`: in the page flow, `srcdoc`, `sandbox="allow-scripts"` only, a packed CSP with no network | The owner wants the HTML, and children need the wall. |
| 20 | Can a page grade? | Upstream games keep score, and the code widget runs tests | Never. Pages are for exploring only. Any check inside a page is practice, recorded as state, never as a verdict. | AGENTS.md #8 |
| 21 | Who draws the tutor's ring over a page | The page (upstream's own outline); the shim; the parent | The parent's attention layer, from boxes the frame reports for its declared `data-spot` ids | One ring, one look, and the live tutor spec's timing |
| 22 | When a page is shown | As soon as it parses (upstream) | After the server gate and packing, and after an on-device preflight in a hidden frame. Otherwise the fallback. | Checks before showing |
| 23 | How much of a lesson is HTML | 70% interactive, at least 2 sims and at least 1 game (upstream quota) | At most 1 explore scene per lesson; 3–9 only until D-12 | Latency, cost and honesty. Widgets and checks stay the spine. |
| 24 | 3D and code widgets | Port them | 3D is deferred (about 600 KB of self-hosted Three per page). The code widget is dropped (graded by a model, about 10 MB of CDN runtimes). | The size cap, no network, no model grading |
| 25 | Math inside pages | KaTeX from a CDN with `trust` on | Rendered to MathML on the server at packing time: no script, no fonts, `trust` off | No network, and smaller pages |
| 26 | Who decides a project step is done | The model evaluator's score of 60 or more | Code checks for steps with one right answer; a learner's or grown-up's tap for open ones | AGENTS.md #8; rule 1 (no invented metrics) |
| 27 | Project length | One sitting of 15–45 min | Stages of one sitting each, across days: K–2 ≤ 15 min, 3–5 ≤ 25, 6–9 ≤ 40 per stage | At home, across days |
| 28 | Classroom turn-taking | An LLM director plus one call per speaker | Order fixed in code: the tutor first, at most one peer line, then the learner. One model call: the peer line is an echo-only tool, checked in code. | p50 ≤ 1.6 s, and one turn against the cap |
| 29 | Classroom roster | Written by a model and kept in the browser | Two reviewed peer constants, checked by the server on every request | `soloTutor` didn't hold upstream |
| 30 | Role-play characters (project scenarios) | Upstream's simulator | Not in this build. Later, behind the classroom button, grades 6–9, on D-11. | The highest risk of feeling like AI, and of safety problems |

---

## 3. Owner decisions (defaults apply until the owner answers)

**D-1. The content stage.**
- "Use the OpenMAIC generator" is honored for:
  - its outline stage;
  - its script stage (the best part, and we have nothing like it);
  - its orchestration and its retry;
  - since the owner's 2026-10-07 decision, its HTML interactives (§8.5).
- Its slide-content stage is not used, because:
  - the 1000×562.5 canvas scales to about 0.29–0.32 at 320 px, so 18 px text shows at about 5–6 px;
  - images get `alt=""`, and nothing supports reduced motion;
  - quiz keys are asserted by the model, and only their structure is checked;
  - its own playback renderer is behind a flag that is off upstream (`OM/lib/config/feature-flags.ts:75-81`).
- **Interactive scenes were excluded here too.** They are model-written HTML and JS in an iframe with `allow-popups` and no CSP, which one-workspace §6–7 excludes.
  - **Owner, 2026-10-07:** "Take the html for sure that's the main thing I want from it."
  - **Answered:** the HTML comes over, into our explore frame (§8.5). That frame removes each objection: no network, no popups or forms, real width at 320 px, and no grading.
  - OpenMAIC's host does not come over (§2.3 #19). The one-workspace conflict is D-7.
- Our `LessonSchema` and gates produce scenes that render at 320 px with keys checked by code.
- **Default:** ours, for slides and quizzes.
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

**D-6. Daily caps.**
- `KAIZEN_LESSONS_PER_DAY = 3` per learner.
- `KAIZEN_EXPLORE_PER_DAY = 3` per learner. A page counts once; cache hits don't count.

**D-7. The JavaScript exception.**
- The owner's words reverse:
  - old invariant 13.10;
  - one-workspace §6 ("The model cannot run JavaScript…");
  - one-workspace §7 ("arbitrary generated interactive code" listed as future work).
- **Default:** this spec limits the exception to the explore frame (invariant 13.10). Outside the frame nothing changes: the model still cannot run JavaScript in the app, pick arbitrary DOM, navigate, or write evidence.
- **Needs:**
  - the matching edit to the one-workspace spec on its branch;
  - a `docs/DECISIONS.md` entry with the owner's words (T0). `docs/STATUS.md:126-130` already records the decision.

**D-8. Catalogue explore pages** (the D-3 pattern).
- **Default:** none ship.
- `catalogue-explore` drafts go to `/review`.
- A course gains explore scenes only on the owner's yes. Each one is inserted right after the scene it explores, and the course's existing scenes and checks are unchanged.
- Label: "Written by AI, reviewed by people · for exploring, not counted".
- These approved pages are what demo mode plays.

**D-9. Classroom mode ("maybe").**
- **Default:**
  - built in T9c behind `KAIZEN_CLASSROOM`, which is off;
  - available to a learner only after a grown-up turns it on for them, through the grown-up gate;
  - grades 3–9, never K–2 in 1.0;
  - two peers;
  - peers never voice a deliberate mistake.
- **Peer voices.** Default: text only. Peer lines are labelled bubbles and are never read in the tutor's voice. The reason is that the live tutor spec builds one voice for the whole app (`live-tutor-spec.md:145`), and Turbo registers one voice per connection (`:273`). Spoken peers need:
  - an audition;
  - a vendor check;
  - the owner's exception to the live tutor spec.
- **Needs:**
  - yes or no on shipping at all;
  - the peer names and personas;
  - consent wording for under-13s.

**D-10. Project photos.**
- **Default:** photos stay on the device and in the family's own export. They never reach a model in 1.0.
- AI feedback on photos needs the owner and counsel.

**D-11. Project role-play** (OpenMAIC's scenarios and Simulator).
- **Default:** not built.
- If wanted later: behind the classroom button, grades 6–9, with a grown-up's consent, one character, and never graded.

**D-12. Explore pages for K–2.**
- **Default:** off.
- It turns on after the T9 dogfood, and then only with:
  - tap-only controls (at most 3);
  - 56 px targets;
  - a text equivalent read aloud.

---

## 4. Types

### 4.1 New: `lib/theater/types.ts`

```ts
// Shape follows OpenMAIC @openmaic/dsl action.ts + runtime.ts (MIT, © 2026 THU-MAIC). Our types.
import type { BoardCard } from "@/lib/tutor";
import type { Grade, InteractiveScene, Locale, Scene } from "@/lib/types";
import type { Representation } from "@/learning/profile";
import type { PeerId } from "@/lib/classroom/roster";

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

/** What an explore page reports (§8.5), after parseObservation → withoutNames → screen(). Declared vars and a short summary; never a verdict. */
export type ExploreState = {
  kind: "explore";
  vars: Record<string, number | boolean | string /* ≤ 40 chars */>;
  summary?: string; // ≤ 160 chars, in the lesson's language
};

/** Anything a stage reports, for recording, seek and the tutor. */
export type StageState = WidgetState | ExploreState;

export type StageCmd =
  | { op: "board"; card: BoardCard }   // Talk / drawer board, including the "scene" and "make" cards
  | { op: "scene"; sceneId: string }   // lesson stage: a visited scene, never past an open check
  | { op: "pose"; pose: WidgetPose }   // scripts only, before the first touch, reset to the authored start afterwards
  | { op: "explore"; set?: Record<string, number>; reveal?: string; reset?: true };
  // scripts only: declared vars, in range and on a step; declared reveal ids; before the first touch; reset afterwards

export type Beat = {
  id: string;
  say: string;          // display text: markers stripped, names scrubbed
  cues?: Cue[];         // scripts: ≤ 1 per sentence, ≤ 3 per beat
  do?: StageCmd[];      // scripts: fire at the beat's first word; live: after the words
  read?: string;        // narration segment key; then say === that segment's text (read-along)
  wait?: "tap" | "act"; // tap = Continue chip; act = park until the scene's own checker (or exploration) reports
  by: "ai" | "demo" | "code" | "people";
  who?: "tutor" | PeerId; // classroom mode only (§8.7); absent means the tutor
};

export type Script = {
  v: 1;
  by: "code" | "ai" | "live";
  beats: Beat[];        // 1–10 (K–2: ≤ 6); ≤ 3 KB
  spots: string;        // spotsVersion(scene) when written (an explore scene: its page hash); on mismatch, re-gate
  model?: string;
  rep?: Representation; // "Another way" variant
  from?: { takeId: string; at: number }; // "Keep this explanation"
};

/** Built field by field from what is publicly on screen. Never a target, key or answer index. */
export type StageObservation = {
  title: string; kind: Scene["kind"]; state?: StageState;
  checked?: "right" | "not-yet"; answered?: boolean;
  project?: { stage: number; of: number; step?: string }; // the step's done-definition, never a check answer
};

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
  | { k: "move"; spot: string; state?: StageState; verdict?: "right" | "not-yet"; assisted?: boolean; by?: "learner" | "grown-up" }
    // verdict copied from a code checker only; explore moves never carry one
  | { k: "scene"; sceneId: string; fallback?: true }
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
  - **`ExploreScene` joins the `Scene` union (T4h).** The page body lives outside StoreState (§10.2).
    ```ts
    export type ExploreScene = {
      id: string; kind: "explore"; title: string;
      prompt: string;            // what to try, ≤ 200; shown above the frame, read by codeScript
      idea: string;              // what to notice, ≤ 300; part of the text equivalent
      form: "sim" | "diagram" | "steps" | "challenge";
      page?: ExplorePage;        // absent until generated; the fallback plays meanwhile
      fallback: Widget | null;   // our own typed widget, else a slide built from prompt + idea
    };
    export type ExplorePage = {
      hash: string;              // sha256 of the packed document: its identity, its spotsVersion, its replay key
      bytes: number;             // ≤ 400 KB packed
      locale: Locale; band: "k2" | "35" | "69";
      config: ExploreConfig;
      by: "ai"; reviewed?: true; model?: string; v: number; // prompt version
    };
    export type ExploreConfig = {
      vars: { name: string; label: string; min: number; max: number; step: number; start: number; unit?: string }[]; // ≤ 6 (K–2 ≤ 3)
      spots: { id: string; label: string }[]; // ≤ 20, each a data-spot in the page
      reveal?: string[];                      // ≤ 10 data-reveal ids; diagram and steps only
      describe: string;                       // ≤ 600: what the page shows and how to use it, in the lesson's language
    };
    ```
  - **`ProjectScene` gains `gains?: string[]` (3–5) and `stages?: ProjectStage[]` (T7p).**
    - Flat scenes stay valid. `projectStages(scene)` lifts a flat scene into one stage in code: `{ title, why: brief, doneWhen: t("project.doneWhen.steps"), steps: steps.map(text => ({ text })), minutes: band default }`.
    ```ts
    export type ProjectStage = {          // OpenMAIC's milestone = one sitting
      title: string;
      why: string;                         // briefing, read aloud
      doneWhen: string;                    // shown to the learner and the grown-up
      wrap?: string;                       // debrief, read aloud when the stage is finished
      steps: ProjectStep[];                // 2–4
      minutes: number;                     // K–2 ≤ 15, 3–5 ≤ 25, 6–9 ≤ 40
      materials?: string[];
      safety?: string[];
      grownUp?: { help: string /* ≤ 3 sentences */; minutes: number /* ≤ 5 */ };
      strong?: string[];                   // 2–4 "strong work usually…" lines for open steps; no score
    };
    export type ProjectStep = {
      text: string;                        // the done-definition
      hints?: string[];                    // ≤ 2; guide, never solve
      make?: "photo" | "words" | "tell" | "none";
      check?:
        | { kind: "number"; prompt: string; answer: number; tolerance?: number }
        | { kind: "own-data"; prompt: string; count: number; op: "sum" | "mean" | "difference" | "max" | "min" } // code checks the learner's arithmetic on their own entries
        | { kind: "widget"; widget: Widget };
      see?: string;                        // id of an explore scene in the same lesson: the investigate step
    };
    ```
  - **`ProjectRun` (T7p)** lives in `StoreState.projectRuns` and syncs like attempts.
    ```ts
    export type ProjectRun = {
      id: string; profileId: string; courseId: string; lessonId: string; sceneId: string;
      stage: number;
      done: Record<string /* "<stage>.<step>" */, {
        at: number; by: "learner" | "grown-up";
        blobId?: string;                   // photo, device only (D-10)
        words?: string;                    // withoutNames, screen()
        verdict?: "right" | "not-yet";     // code checks only
        assisted?: true;
      }>;
      nextOn?: string;                     // YYYY-MM-DD: the planner day for the next stage
      finishedAt?: number;
    };
    ```
  - **`ActivityEvent.type` gains `"project_stage_done"` (T7p).**
    - A code-checked project step writes the same `quiz_answered` event lesson checks write today, with `attemptId` `project:<sceneId>:<stage>.<step>`. The mastery law therefore sees it exactly as it sees a lesson check.
    - Open steps write nothing beyond the run and the take.
  - **`Profile` gains `classroom?: { at: number }` (T9c).** It is set only through the grown-up gate.
- **`planner/types.ts`:** `TutorThread` gains `takeId?: string`.
- **`lib/store.ts`:** `StoreState` gains `takes: TakeRef[]` (T2) and `projectRuns: ProjectRun[]` (T7p). Add both to the persisted list order at `:92-93`.
- **`lib/tutor.ts`:** `BoardCard` gains `{ type: "scene"; scene: InteractiveScene }` and `{ type: "make"; goal: string; subject: Subject; grade: Grade; shape?: "lesson" | "project" }`.
- **`lib/ai/context.ts`:** `TutorContext` gains, beside the live tutor spec's `input` and `spots`:
  - `stage?: StageObservation`;
  - `said?: { heard: string; previous: string }`;
  - `board?: { notShown?: string }`;
  - `project?: { title: string; stage: { title: string; why: string; doneWhen: string }; step?: { text: string; make?: string; hintsShown: number }; of: number }` (T7p). It never carries a check's answer.
  - `classroom?: { peers: PeerId[] }` (T9c). The server checks it (§8.7).
  - `scrubContext` covers every new text field.
- **`lib/ai/schemas.ts`:**
  - `OutlineSchema` lessons gain `keyPoints: z.array(s(120)).max(5)`.
  - New: `WidgetPoseSchema(kind)`, `poseProblems(widget, pose)`, `StageSceneInput`, `ScriptOut`.
  - New (T6h, T7): `ExploreConfigSchema`; `ExploreStubSchema`, which is the lesson writer's explore scene before it has a page; `ExploreScriptOut(config)`, with a per-beat `set` built from `config.vars` and a `reveal` from `config.reveal`.
  - Changed (T7p): the project scene schema gains `stages` (1–4, each with 2–4 steps).
  - New (T9c): `PeerSaysInput = { peer: PeerId; say: s(140) }`.

### 4.3 How OpenMAIC's verbs map onto ours (`OM/packages/@openmaic/dsl/src/action.ts:235-287`)

| OpenMAIC | Ours |
|---|---|
| `speech` | `Beat.say` |
| `spotlight` or `laser` just before a speech | A `[[spot:id]]` anchor before the word that names the thing (word 0 if none) |
| `widget_highlight` | An anchor on a `widget.*` id, or on `html.<id>` for a declared spot in an explore page |
| `widget_setState` | A `pose` command. In an explore page: `{op: "explore", set}` on declared vars. |
| `widget_reveal` | `{op: "explore", reveal}` for declared ids (diagram and steps only) |
| `widget_annotation`, `play_video`, `wb_*` | Dropped for 1.0. Captions are ours, and `show_visual` board cards cover drawing. |
| `discussion` | `wait` (the learner's turn, then live). Classroom mode runs no discussion either: a peer line rides inside the tutor's turn (§8.7). |
| FIRE_AND_FORGET | Cues never block |
| SYNC | Only `wait` and `scene` block the next beat |

### 4.4 New: `lib/explore/bridge.ts` (the frozen bridge, T4h)

```ts
// All messages are JSON, ≤ 4 KB, shaped { v: 1, doc: string /* a uuid per mount */ } & one of these.
// Zod-validated on both sides. The host checks event.source === iframe.contentWindow; the shim checks event.source === parent.
export type HostMsg =
  | { k: "hello" }                              // first message after load; the shim adopts `doc` and drops anything before it
  | { k: "watch"; spots: string[] }             // report boxes for these declared spots
  | { k: "pose"; set: Record<string, number> }  // keys ∈ config.vars, in range, on a step (the host re-checks)
  | { k: "reset" }                              // back to the authored start
  | { k: "reveal"; id: string }                 // id ∈ config.reveal
  | { k: "read" };                              // publish the observation now (800 ms timeout)

export type FrameMsg =
  | { k: "ready" }
  | { k: "size"; h: number }                    // the host clamps it to 240–1600
  | { k: "touch" }                              // the first trusted pointer or key event inside #experiment, then at most once every 2 s
  | { k: "state"; obs: unknown }                // debounced 300 ms; the host runs parseObservation
  | { k: "boxes"; at: Record<string, [x: number, y: number, w: number, h: number] | null> } // frame CSS px; null = not shown
  | { k: "done" }                               // the page's own "explored" signal (activity only)
  | { k: "error"; kind: "script" | "promise" | "csp"; msg: string /* ≤ 300 */ };
```

- The page sees only `window.kaizen`: `publish(state, summary)`, `onPose(fn)`, `onReset(fn)`, `onReveal(fn)` and `done()`. It is frozen and defined non-writable and non-configurable before the page's own scripts run.
- The page never calls `postMessage` itself; `gateHtml` bans the token.
- The host sends with targetOrigin `'*'`, which a null origin requires. No payload in either direction carries anything private.

---

## 5. Port map

### 5.1 Copy or adapt (each file carries the header, and each is listed in `apps/web/THIRD_PARTY_NOTICES.md`)

Header: `// Adapted from OpenMAIC (modules/openmaic-classroom/<path>), MIT License, Copyright (c) 2026 THU-MAIC. See apps/web/THIRD_PARTY_NOTICES.md.`

| Source | Ours | What changes |
|---|---|---|
| `OM/packages/@openmaic/generation/src/generation-retry.ts` (234 lines) | `lib/ai/retry.ts` | <ul><li>Default `maxRetries` goes from 5 to 2.</li><li>Every attempt runs through `model(role, meter(req))`, so it is metered.</li><li>Check `spent()` before each retry.</li><li>`isRetryableGenerationError` as-is.</li></ul> |
| `OM/packages/@openmaic/generation/src/prompt-formatters.ts:9-50` (`buildCourseContext`) | `courseContext()` in `lib/ai/script.ts` | <ul><li>EN and ES strings.</li><li>Keep "same session; never 'last class'".</li><li>Replace greet-on-first / close-on-last with §2.2 #16.</li><li>`previous` = the last 150 chars of the previous scene's script.</li><li>Drop the agent and persona formatters.</li></ul> |
| `OM/packages/@openmaic/generation/templates/slide-actions/system.md`, `quiz-actions/system.md`, `interactive-actions/system.md`, `pbl-actions/system.md:23-31`, `snippets/speech-tts-readability.md` | `SCRIPT_RULES` constants in `lib/ai/script.ts` | **Keep:**<ul><li>one teacher voice;</li><li>same session;</li><li>point right before the words that name a thing, now written as anchors;</li><li>the slide shows and the voice tells (3–9 slides only);</li><li>the quiz answer-safety block (meta-level only; never preview, compare or hint at choices), word for word apart from terminology;</li><li>interactive and explore: direct them to touch a named part, simple to complex; guide, then let them explore (`interactive-actions/system.md:105-112`); point only at inventory ids (`:88`);</li><li>project: introduce the goal, preview the stages, invite them in;</li><li>speech written for the voice.</li></ul>**Drop:**<ul><li>the "Great job, everyone!" encouragement example (`slide-actions/system.md:138`);</li><li>the greetings (`interactive-actions/system.md:98`, `pbl-actions/system.md:20`);</li><li>annotation;</li><li>discussion and multi-agent rules;</li><li>Chinese examples;</li><li>element-id, spotlight and laser syntax;</li><li>adult pacing (5–10 actions a slide, a quiz every 3–5 slides);</li><li>"verbalize all math": we write normal notation and `speakable` reads it.</li></ul>Golden snapshot test. |
| `OM/lib/kaizen/client/course-request.ts:94-104` (`TEACHING_DIRECTIVE`) | `lib/ai/build.ts` WRITER and `SCRIPT_RULES` | The 8 rules word for word. The language line stays ours (`langLine`). |
| `OM/lib/choreography/cursor.ts` (73 lines) | `lib/theater/cursor.ts` | <ul><li>Action → Beat; their Scene → ours with `script`.</li><li>Keep the empty-scene dwell.</li><li>No `@openmaic` imports.</li></ul> |
| `OM/lib/choreography/timeline.ts` (403 lines) | `lib/theater/timeline.ts` | <ul><li>Beat index → ms from recorded `wordsAt` or clip duration.</li><li>Drop `clampFireAndForgetLifetimes` and the 5 s effect auto-clear (the ring follows spec §3.3).</li><li>Drop video.</li><li>The 240 ms/word estimate is used only as a scrub-bar dwell for text-only beats, never as word timing.</li><li>Do not copy the `timing.ts` constants.</li></ul> |
| `OM/lib/playback/action-navigation.ts` (146 lines) | `lib/theater/seek.ts` | <ul><li>Reconstructable prefix: board and scene commands rebuild silently.</li><li>A pose rebuilds only from a recorded snapshot, and only for kinds with the pose seam (and for explore pages that pass the pose round trip, §10.4).</li><li>A learner change on a kind without the seam disables seek past that point.</li></ul> |
| `OM/lib/video-export/subtitles.ts` (60 lines) | `lib/theater/captions.ts` | As-is (`usableCues`, `toVtt`, `toSrt`). Input is one cue per sentence, built from recorded word times. Peer lines carry their speaker's name. |
| `OM/packages/@openmaic/generation/src/interactive-script-validator.ts` (156 lines) | the syntax gate in `lib/explore/gate.ts` | <ul><li>Keep parse5 plus the compile-only `node:vm` check of classic scripts.</li><li>Module scripts are parsed with acorn (`sourceType: "module"`) instead of skipped (`:117-120`).</li><li>Any `<script src>` fails.</li></ul> |
| `OM/packages/@openmaic/generation/src/scene-generator.ts:1163-1197` (`extractHtml`), `:1361-1379` (`extractWidgetConfig`), `:1386-1661` (`extractInteractiveElements`, with `cleanAttrValue` at `:1496-1502`) | `lib/explore/gate.ts`, `lib/ai/explore.ts` | <ul><li>`extractHtml` gains a truncation check: the document must close.</li><li>The config is read from `#explore-config`.</li><li>The inventory keeps only `data-spot`, `data-var` and `data-reveal` ids, capped at 20, 6 and 10. Labels are ≤ 60 chars and cleaned so a label can't forge prompt lines.</li></ul> |
| `OM/packages/@openmaic/generation/templates/simulation-content/system.md`, `diagram-content/system.md`, `procedural-skill-content/system.md`, `game-content/system.md`, `snippets/interactive-observation.md` | `EXPLORE_RULES` constants in `lib/ai/explore.ts` | **Keep:**<ul><li>reset returns to the exact start;</li><li>an explicit running / paused / ended state;</li><li>a fair start;</li><li>controls never cover the canvas;</li><li>presets;</li><li>diagrams: reveal order, separate position and animation groups, stable node ids;</li><li>steps: Done is never the only interaction, a wrong choice shows its consequence, retry without a full reset, stable step ids;</li><li>play to learn, not to answer;</li><li>the observation contract.</li></ul>**Change:**<ul><li>the host injects the bridge, so pages never write a listener or call `postMessage`;</li><li>native controls only;</li><li>44 px targets (56 px K–2);</li><li>`prefers-reduced-motion`;</li><li>EN/ES by `langLine`;</li><li>band rules;</li><li>our design tokens;</li><li>observation values are numbers, booleans and short enums, ≤ 4 KB, with a summary ≤ 160 chars.</li></ul>**Drop:**<ul><li>the listener template (`simulation-content/system.md:32-101`);</li><li>Tailwind and every CDN;</li><li>Chinese button text;</li><li>"OBVIOUS" animation and the infinite pulse;</li><li>scores, timers, achievements, high scores and emoji;</li><li>inline `onclick`.</li></ul>The game prompt is rewritten as `challenge`: the outcome shows as a consequence, never a verdict. Golden snapshot test. |
| `OM/lib/interactive/observation.ts` (95 lines) | `lib/explore/observation.ts` | Copied: `parseObservation`, the iterative depth check, `freezeEvidence`. The cap is lowered from 32 KB to 4 KB. |
| `OM/lib/interactive/observation-bridge.ts:35-243` | the shim and the host in `lib/explore/bridge.ts` | Identity per mount (`doc`); invalidation on pagehide; `<` escaped when serializing; the 800 ms read timeout. |
| `OM/lib/utils/iframe.ts:66-110` | the shim's error capture | Buffered (≤ 20) and replayed to the host; never shown raw to the learner. The storage shim, picker and `patchHtmlForIframe` are dropped. |
| `OM/lib/export/html-asset-inventory.ts` (329 lines) | the URL scan in `lib/explore/gate.ts` | Any `http(s):`, protocol-relative or `url()` reference to a host fails. Only `data:` and `blob:` are allowed. |
| `OM/packages/@openmaic/generation/prompts-pbl/planner-single-call-system.md:5-104`, `OM/lib/pbl/v2/prompts/instructor-base-rules.md:51-87, 111-234` | `PROJECT_RULES` in `lib/ai/project.ts`; the project block in `lib/ai/prompts.ts` | **Keep:**<ul><li>the five failure modes: answer leak, worksheet fragmentation, fake deliverable, no judgeable done, invisible resource;</li><li>guide, don't solve;</li><li>learner agency;</li><li>right-sized steps;</li><li>a closing step that pulls the project together;</li><li>build phases, not chapters;</li><li>"done" by task nature (one right answer, open with stated criteria, open-reflective) and by delivery form;</li><li>stay on the active step;</li><li>bind first, ask second;</li><li>don't do the work;</li><li>no false either/or;</li><li>at most one closing question;</li><li>the platform marks completion, chat never does.</li></ul>**Change:** K–9 at home over days, a grown-up's role, home safety, band sizes, EN/ES.<br>**Drop:**<ul><li>one sitting of 15–45 min (`:58`);</li><li>external IDEs and the workspace layout;</li><li>Chinese and coding examples;</li><li>warm exclamatory openers (`instructor-base-rules.md:89-109`);</li><li>the markdown and identity blocks.</li></ul>Golden snapshot test. |
| `OM/lib/pbl/v2/agents/tier-guidance.ts:40-90` | the hint rungs in `lib/ai/project.ts` | The L0 why → L1 how → L2 analogous example ladder, keyed to grade band, never to a proficiency tier. L3 (the literal answer) is never sent on a code-checked step. |

### 5.2 Pattern only (rewritten, no code copied, cited in THIRD_PARTY_NOTICES)

| Source | Ours | The pattern |
|---|---|---|
| `OM/lib/playback/engine.ts:181-220, 442-470, 495-502, 603-608` | `lib/theater/player.ts` | Generation token; snapshot before advancing; interrupt saves the cursor (ours: the sentence holding `heardUpTo`); silent seek. Not its store imports, browser TTS or discussion. |
| `OM/lib/playback/auto-resume.ts` | `player.ts` | Resume only after the learner ends the exchange. Ours: an explicit chip or phrase. |
| `OM/lib/hooks/use-scene-generator.ts:719-997` | `lib/theater/make.ts` | First scene first; scripts one after another, carrying the previous speech; pause on failure; an epoch guard drops stale work. |
| `OM/packages/@openmaic/dsl/src/runtime.ts:203-267` | `Take` / `TakeRecord` | A store-assigned `seq` is the only order; anchors may go stale and are tolerated. |
| `OM/lib/whiteboard/runtime/store.ts:158-300` | `record.ts` | Idempotent append by `op` id. |
| `OM/packages/@openmaic/dsl/src/storage.ts:74-85` | Clip and audio ids | Anything from a session gets an allocated random id. Content hashes are only for public text, and for explore pages, which carry no learner data (§10.2). |
| `OM/packages/@openmaic/generation/src/outline-types.ts:70-107`, `scene-builder.ts:22-115` | `OutlineSchema`, `writeLesson` | `keyPoints`; stable scene ids on retry. |
| `OM/lib/orchestration/summarizers/state-context.ts:220-238` | `lib/ai/prompts.ts` lesson-surface block | The quiz-restraint wording before submission only. Never `:176-207`, which prints correct answers. |
| `OM/components/scene-renderers/InteractiveIframeHost.tsx:215-225, 314-381`; `OM/lib/store/widget-iframe.ts:114-148`; `OM/tests/security/iframe-sandbox.test.ts:28-60` | `components/stage/ExploreFrame.tsx` and its test | The null-origin rationale; matching `event.source`; a queue flushed on load; a source-scan sandbox test (ours bans more, §5.4). Not the portal, the scale, the pool, `url` or the raw error banner. |
| `OM/lib/video-export-app/prepare-interactive-html.ts:18-35, 211-285` | `packHtml()` in `lib/explore/pack.ts` | The CSP meta first in `<head>`; inline everything and reject what can't be inlined; a size cap; a sha256. Ours adds `form-action 'none'` and drops `unsafe-eval`. |
| `OM/lib/chat/pi/interactive-state-evidence.ts:162, 200-243` | `publicObservation` for explore scenes | Page state reaches the tutor framed as untrusted evidence, never as instructions; size and freshness checks. |
| `OM/lib/prompts/templates/interactive-outlines/system.md:57-170` | the explore line of WRITER in `lib/ai/build.ts` | Which ideas suit a sim, a diagram, steps or a challenge. Not the quotas (`user.md:42-55`), the `userProfile` slot or the Interactive Mode toggle. |
| `OM/packages/@openmaic/dsl/src/pbl.ts:3-149`; `OM/skills/agent-runtime/stage-dsl/references/pbl.md:61-200` | `ProjectStage`, `ProjectStep` (§4.2) | Milestone → stage; briefing, completion criteria and debrief; microtask → step; hints. Not roles, tiers, scenario fields or link submissions. |
| `OM/packages/@openmaic/generation/src/pbl/planner-single-call.ts:173-578`, `planner-core.ts:323-394` | `gateProject` among the writer's per-scene gates | One structured call → validation in code → one repair listing the gaps → ids, status and order assigned in code. Completion gaps become gate reasons. Not the tool-loop fallback or the proficiency seeding. |
| `OM/packages/@openmaic/generation/src/pbl/operations/kernel/progress.ts:53-812`, `task-completion.ts:53-84` | `lib/projects.ts` | A small pure state machine: current stage, mark a step, finish a stage (an explicit tap), next time. Two explicit steps: ready, then the learner taps Done. Never the score gate (`task-completion.ts:18-26`). |
| `OM/lib/pbl/v2/runtime/learner-state.ts:84-178` | `ProjectRun` beside the scene | The design and the learner's progress are kept apart. Not `@openmaic/storage`, fold, drain or hydration. |
| `OM/lib/pbl/v2/operations/runtime/completion-stats.ts:28-52` | the code-built recap | Stages done, things made, checks right or not yet. Not `independenceRate` or "toughest milestone". |
| `OM/tests/pbl/v2/progress.test.ts:84-210`, `planner-single-call.test.ts:154-317`, `instructor-question-integrity.test.ts:27-64` | `lib/projects.test.ts`, `lib/ai/project.test.ts` | Behaviours re-specified as our own cases; no code copied. |
| `OM/lib/prompts/templates/director/system.md:25-40`; `OM/lib/orchestration/summarizers/peer-context.ts:9-33`; `OM/lib/orchestration/prompt-builder.ts:181-204` | `lib/ai/classroom.ts` | Rule 13 (the teacher answers an unanswered learner turn first) becomes code. "Greet once" and "add something new" become `gatePeer` checks. The role length targets become band limits. |
| `OM/lib/orchestration/registry/types.ts:9-29`, `registry/agent-selection.ts:59-72`; `OM/lib/chat/pi/config.ts:5-8`; `OM/lib/chat/agent-loop.ts:246-264` | `lib/classroom/roster.ts` | Choose by role, never by position. The roster is a constant the server checks on every request. Hard caps live in code. Always end on the learner's turn. |
| `OM/components/roundtable/index.tsx:927, 1624, 2190` | `components/tutor/PeerBubble.tsx` | A speaker label on every bubble and a "your turn" cue. Nothing else from the 2,201-line file. |

### 5.3 Never comes over

No code and no prompt text from these comes over. §5.2's patterns are rewritten, never copied.

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
- **Every route under `OM/app/api/**`.**
  - This includes `generate/*` (among them `scene-content` and `agent-profiles`), `generate/tts`, `quiz-grade`, `chat`, `chat/pi`, and `pbl/v2/*` (`instructor`, `open-task`, `evaluate`, `simulator`, `task/update`).
  - They reach the adapter through model-config.
  - `quiz-grade` grades with a model and invents 50% when it can't parse the reply.
- **Live chat and the classroom runtime:**
  - `OM/lib/orchestration/*`: the LangGraph director, `director-graph.ts`, `director-prompt.ts` (it sends the nickname and bio), `stateless-generate.ts`, `ai-sdk-adapter.ts` (it imports `lib/ai/llm.ts`), `registry/store.ts` and its personas, and the whiteboard summarizers
  - `OM/lib/chat/*`, including `pi/director-loop.ts` and `pi/prompts.ts`
  - `OM/lib/agent/*`
  - `OM/components/chat/*`, including `use-chat-sessions.ts` and `proactive-card.tsx` (a timed auto-dismiss)
  - `OM/components/roundtable/*`
  - `OM/lib/buffer/stream-buffer.ts` (the text is its clock)
  - `OM/lib/classroom/load-classroom.ts`, `OM/components/classroom/ClassroomSurface.tsx`, `OM/app/kaizen/*`
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
  - the content branches of `OM/packages/@openmaic/generation/src/scene-generator.ts`, except `extractHtml`, `extractWidgetConfig` and the inventory (§5.1)
  - `interactive-post-processor.ts` (KaTeX from a CDN, with `trust` on)
  - `json-repair.ts` (a single-backslash `\frac` parses as a form feed)
  - `action-parser.ts` (its spread of the model's params can override an action's `type`, `:113-117`)
  - `prompts/loader.ts` (`node:fs`)
  - `templates/*-content`, except simulation, diagram, procedural-skill and game (§5.1). In particular `code-content`, `visualization3d-content` (deferred, §2.3 #24), and the slide and quiz content prompts.
  - the `interactive-outlines` quotas, the Interactive Mode toggle (`OM/app/page.tsx:598-602`, `OM/components/generation/interactive-mode-button.tsx`) and the `requirements-to-outlines` prompt text
- **The project runtime:**
  - `OM/lib/pbl/v2/agents/*`: the instructor's turn loop, the planner's tool loop, the evaluator and the simulator
  - `OM/lib/pbl/v2/prompts/evaluator-*.md`, `simulator-*.md`
  - `proficiency.ts`, `dynamic-signals.ts`, the model-written tags in `engagement.ts`, `instructor-memory.ts`
  - fold, drain, hydration and record payloads
  - `OM/components/scene-renderers/pbl-renderer.tsx` and `pbl/v2/*`
- **Scene renderers and grading:**
  - `OM/components/scene-renderers/*`, including `interactive-renderer.tsx`; `InteractiveIframeHost.tsx` is pattern only (§5.2)
  - `OM/lib/store/interactive-iframe-pool.ts`, `OM/lib/interactive/logical-viewport.ts`
  - thumbnails that run live JavaScript (`ThumbnailInteractive/*`)
  - the element picker (`OM/lib/utils/iframe.ts:113-372`)
  - `OM/lib/quiz/grading.ts` short-answer grading
- **Everything else:**
  - `OM/packages/mathml2omml` (LGPL)
  - `OM/lib/export/*` (except `html-asset-inventory.ts`, §5.1), `OM/render-service/`, `OM/lib/video-export/*` (except `subtitles.ts`), `OM/lib/video-export-app/*` (`prepare-interactive-html.ts` is pattern only)
  - `OM/lib/media/*`, `OM/lib/persistence/*`, `OM/packages/@openmaic/storage`
  - `OM/lib/web-search/*`, `OM/lib/pdf/*`
  - `OM/lib/store/user-profile.ts`
  - `OM/lib/kaizen/client/tutor-tools.ts` (a stale direction: "no automatic speech, no mic")
- **Any field named `userNickname`, `userBio`, `userProfile`, `nickname` or `bio`.**
- **Any `url` or `src` field on an interactive or explore scene.**

### 5.4 Guards (T0, before any port lands)

1. **`apps/web/scripts/check-forbidden.mjs`.** Add it to `verify`: `npm run lint && npm run typecheck && node scripts/check-forbidden.mjs && npm run test && npm run build`.
   - It fails on any of these under `apps/web` (excluding `node_modules` and itself; build the strings by concatenation): `sk-ant-oat`, `claude-code-20250219`, `oauth-2025-04-20`, `anthropic-oauth`, `anthropicOAuth`, `startAnthropicOAuthRefresh`, `You are Claude Code`, `OPENMAIC_CLAUDE_CODE_VERSION`, `ANTHROPIC_AUTH_TOKEN`, and `"x-app"` followed by `"cli"`.
   - It also fails on any `from "...modules/` or `@openmaic/` import.
   - **Added by the amendment:**
     - Under `apps/web/src`, it fails on any of the sandbox tokens `allow-same-origin`, `allow-popups`, `allow-forms`, `allow-modals`, `allow-top-navigation`, `allow-downloads`, `allow-pointer-lock` or `allow-presentation`.
     - It fails on `<iframe` or `srcdoc` anywhere except `components/stage/ExploreFrame.tsx`, `lib/explore/preflight.ts` and their tests.
     - It fails on the CDN and font hosts `cdn.tailwindcss.com`, `unpkg.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `pyodide`, `fonts.googleapis.com` and `fonts.gstatic.com` anywhere under `apps/web/src`, including catalogue pages.
     - It fails on any `.html` file under `apps/web/public`. Pages are data, never documents served from our origin.
2. **ESLint `no-restricted-imports`:**
   - everywhere: `**/modules/**` and `@openmaic/*`;
   - in `lib/theater/replay.ts` and `components/theater/Replay.tsx`: `@/lib/theater/record`, `@/lib/acts`, `@/lib/activity`, `@/learning/*`, the value imports from `@/lib/tutor` (`allowTypeImports: true`), and the write functions of `@/lib/projects`;
   - `lib/explore/pack.ts`, `lib/explore/gate.ts` and `lib/ai/explore.ts` are server-only (`import "server-only"`).
3. **`apps/web/THIRD_PARTY_NOTICES.md`:**
   - the THU-MAIC MIT text plus each source path from §5.1 and §5.2;
   - from T4h and T6h: `axe-core` (MPL-2.0, unmodified, loaded lazily for the preflight), `parse5`, `acorn` and KaTeX (MIT).

---

## 6. Our files

### 6.1 New

| File | Phase | What |
|---|---|---|
| `lib/theater/types.ts` | T2 | §4.1 |
| `lib/theater/beat.ts` | T2 | `toBeat(raw, meta)`, the only conversion, through `cueParser`. Built on it: `liveBeat(message)`, `demoBeat(turn, item?, rung?)`, `scriptBeat(out, scene)`, and (T9c) `peerBeat(part)`. |
| `lib/theater/record.ts` | T2 | IndexedDB `kaizenedu.takes` (stores `takes` and `audio`), with a memory fallback. `useTakeRecorder()`. |
| `lib/theater/spots.ts` | T3 | `sceneSpots(scene, {answered}) → {pointable: {id,label}[], guarded: string[]}`, computed from data with no DOM, using the same ids `scenes.tsx` renders per live tutor spec §6. Capped at 60; over the cap, block-level ids only. `spotsVersion(scene)`. |
| `lib/theater/code-script.ts` | T3 | `codeScript(scene, young, locale): Script` |
| `lib/theater/player.ts` | T3 | §7.2 |
| `lib/theater/cursor.ts`, `timeline.ts`, `seek.ts`, `captions.ts` | T3 | §5.1 |
| `lib/theater/replay.ts` | T3 | `takeToRun(take)`: pure, writes nothing (lint boundary) |
| `components/theater/TheaterBar.tsx`, `Caption.tsx`, `Replay.tsx` | T3 | Play / Pause / Stop / Keep going / "Say it with me"; the caption strip with the current word highlighted; the replay frame |
| `app/(focus)/replay/[id]/page.tsx` | T3 | The replay page |
| `lib/theater/observe.ts` | T4 | `publicObservation(scene, live)`, ≤ 1600 chars, field by field |
| `lib/explore/bridge.ts` | T4h | §4.4: message schemas, the shim source, the host-side checks |
| `lib/explore/observation.ts` | T4h | §5.1 copy, with a 4 KB cap |
| `lib/explore/pack.ts` | T4h (MathML in T6h) | §9.9 `packHtml`, server-only |
| `lib/explore/gate.ts` | T4h | §9.8 `gateHtml`, server-only |
| `lib/explore/preflight.ts` | T4h | The on-device preflight in a hidden frame (§8.5), with `axe-core`'s `source` inlined |
| `lib/explore/store.ts` | T4h | IndexedDB `kaizenedu.explore` keyed by hash; fetch from the catalogue or `/api/explore/[hash]` |
| `lib/explore/scene.ts` | T4h | `fallbackScene(scene)`, `exploreSpots(scene)`, `describeControls(config, state)` (the code-built part of the text equivalent) |
| `components/stage/ExploreFrame.tsx` | T4h | The frame (§8.5); the only `srcdoc` in the app |
| `components/stage/ExploreView.tsx` | T4h | Prompt, frame, text equivalent, "Done exploring", "Skip this activity", labels, fallback |
| `apps/web/e2e/explore.spec.ts`, `apps/web/e2e/fixtures/explore/*.html` | T4h | §14 e2e 7–9. The fixtures are three people-written pages (sim, diagram, steps) plus deliberately misbehaving pages; test-only, never under `public/`. |
| `lib/ai/stage-scene.ts` | T5 | `StageSceneInput` → `InteractiveScene`; `gateScene` |
| `lib/ai/script.ts` | T6 | `SCRIPT_RULES`, `courseContext`, `writeScript`, `gateScript` |
| `lib/ai/retry.ts` | T6 | §5.1 |
| `app/api/ai/script/route.ts` | T6 | §9.1, §9.3 |
| `lib/ai/explore.ts` | T6h | `EXPLORE_RULES`, `writeExplore` (§9.7) |
| `app/api/ai/explore/route.ts` | T6h | §9.7 |
| `app/api/explore/[hash]/route.ts` | T6h | Page JSON (`application/json`, `nosniff`); private pages only to their own account |
| `app/api/ai/lesson/route.ts` | T7 | §9.2 |
| `lib/theater/make.ts` | T7 | The browser driver for generation |
| `components/theater/MakeCard.tsx` | T7 | The "make" board card with progress |
| `lib/projects.ts` | T7p | The pure state machine, `projectStages`, the recap |
| `lib/ai/project.ts` | T7p | `PROJECT_RULES`, the hint rungs, `gateProject` (§9.11) |
| `components/stage/ProjectView.tsx`, `GrownUpCard.tsx` | T7p | Moved out of `scenes.tsx` and grown (§8.6) |
| `lib/theater/curate.ts` | T8 | `curateSession(take)` |
| `lib/classroom/roster.ts` | T9c | `PEERS`, `pickPeerNames(familyNames, locale)` |
| `lib/ai/classroom.ts` | T9c | The classroom prompt block, `peer_says`, `gatePeer` (§9.10) |
| `components/tutor/PeerBubble.tsx`, `ClassroomToggle.tsx` | T9c | §8.7 |
| `apps/web/scripts/check-forbidden.mjs`, `apps/web/THIRD_PARTY_NOTICES.md` | T0 | §5.4 |
| `apps/web/evals/script.eval.ts`, `lesson.eval.ts`, `catalogue-scripts.ts` | T6, T7, T9 | New `EVAL_SUITE`s |
| `apps/web/evals/explore.eval.ts`, `catalogue-explore.ts`, `project.eval.ts`, `classroom.eval.ts` | T6h, T9, T7p, T9c | New `EVAL_SUITE`s (§14) |
| `apps/web/e2e/theater.spec.ts` | T3 onwards | §14 |
| `catalogue/scripts/<course-file>.json` | T9 | Review drafts, loaded lazily |
| `catalogue/explore/<course-file>.json` | T9 | Approved catalogue explore scenes and their packed pages (D-8), loaded lazily |

### 6.2 Changed

| File | Phase | Change |
|---|---|---|
| `app/api/ai/course/route.ts` | T0 | `screen(goal, locale)` before `cachedCourse` / `writeCourse` |
| `lib/generate.ts:104` | T0 | `aiFetch` instead of `fetch` |
| `apps/web/package.json`, ESLint config | T0, T4h, T6h | §5.4; the `parse5`, `acorn` and `axe-core` dependencies (T4h); `katex` (T6h) |
| `docs/STATUS.md`, `docs/plans/2026-10-07-live-tutor-spec.md` §0.4, `docs/DECISIONS.md` | T0 | §1.1–1.2; the owner's 2026-10-07 words (D-7) |
| Live tutor spec P1–P4 files | T1 | Exactly as that spec says |
| `components/tutor/TutorChat.tsx` | T2 | After `finish` (beside `saveThread`, ~line 340), call `useTakeRecorder().reply(message, run)`; on submit, `.learner(text, via)`. Never fork the file. |
| `components/spotlight/SpotAgain.tsx` | T2 | Replays a recorded beat's cues |
| `planner/types.ts`, `lib/store.ts`, `lib/export.ts` | T2, T7p | `takeId`; the `takes` index; take bodies in export; delete removes the IndexedDB rows. T7p: `projectRuns`; photos through the files option. |
| `lib/tutor-demo.ts` | T2, T4, T4h, T9c | `demoBeat` with `hintSpotAt`; the stage path; the demo explore line built from `config.vars`; vetted peer lines keyed by misconception tag |
| `components/stage/narration.tsx` | T3 | NarrationBar's play path goes through the player; `Spoken` and "Say it with me" unchanged |
| `components/stage/Stage.tsx` | T3, T4, T4h | TheaterBar; live interrupt; the Board beside the scene replaces `boardNote` / `stage.whiteboardOff`; explore scenes route to `ExploreView` |
| `components/stage/TutorPanel.tsx` | T4, T9c | Sends `stage`, `spots`, `said` instead of `sceneText`; the classroom toggle and peer bubbles |
| `components/stage/scenes.tsx`, `widgets/*` | T4, T6, T9, T4h, T7p | `onState` for all 12 (T4); `pose` for fraction-bar, number-line and clock (T6); the rest (T9); `explore` → `ExploreView` (T4h); `ProjectView` moves out (T7p) |
| `lib/attention.ts` | T4h | `html.*` spots resolve through the frame's reported boxes (§7.3) |
| `lib/theater/player.ts`, `spots.ts`, `code-script.ts`, `observe.ts`, `seek.ts`, `replay.ts` | T4h, T7p | The explore executor and `wait` on exploration; explore spots (`spotsVersion` = page hash); `codeScript` for explore and for stages; the explore observation; replay by hash |
| `lib/ai/tools.ts` | T5, T7, T7p, T9c | `stage_scene`, `go_to_scene`, `make_lesson` (gains `shape` in T7p), all echo-only and in `BOARD_TOOLS`; `peer_says` (T9c, only when `ctx.classroom` is set) |
| `lib/ai/prompts.ts`, `lib/ai/context.ts`, `lib/ai/tutor.ts` | T4, T5, T7p, T9c | Lesson-surface block; director block; the new context fields; the project block; the classroom block and the server check on `ctx.classroom` |
| `components/tutor/Board.tsx`, `cards.ts` | T5, T7, T9c | `scene` and `make` cards; ids `board.scene.*`; `tool-peer_says` renders as `PeerBubble`, not a board card |
| `lib/ai/schemas.ts` | T5–T7, T6h, T7p, T9c | §4.2 |
| `lib/ai/script.ts` | T6h, T7p | The explore and project cases |
| `lib/ai/build.ts` | T7, T7p | WRITER gains `TEACHING_DIRECTIVE` and the explore line; `writeLesson` streams scene by scene; `PROJECT_RULES`; `gateProject` among the per-scene gates |
| `lib/theater/make.ts` | T7 | Page requests after "Ready", alongside the script chain |
| `lib/server/budget.ts` | T7, T6h | Per-learner daily counters for lessons and for explore pages |
| `learning/profile.ts` | T7 | `stuckSittings(state, profileId, skillId)`: days with attempts on the skill and no correct unassisted attempt |
| `planner/plan.ts` | T7p | The "next part of <project>" item on `nextOn` |
| The Family child page | T7p, T9c | The active project and its grown-up card; the classroom opt-in (behind the grown-up gate) |
| `lib/server/db/wire.ts`, `schema.ts`, new migrations under `apps/web/drizzle/` | T6h, T7p, T8 | `explore_pages` (T6h); `projectRuns` in `SYNC_LISTS` and `KEEP_ON_SERVER` (T7p); server takes (T8, §10.3) |
| `src/i18n/en.ts`, `es.ts` | every phase | Every new string |

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
   - **Project:** brief and step beats, no cues. A staged project reads the current stage instead: its `why`, materials and safety, then its steps. The stage's `wrap` is read when the stage is finished.
   - **Explore:** title, `prompt` and `idea` beats, then `wait: "act"`. No cues.
   - `by: "code"`.
   - It is the demo script, the AI fallback, and K–2's read-along.
4. **AI script** (`writeScript`, §9.3). `by: "ai"`.
5. **Classroom peer line** (live only, §8.7): a `peer_says` tool part becomes its own Beat, after the tutor's beat. It has `who` set to the peer and `by: "ai"`, or `"demo"` in demo mode.

**Round-trip test:** for each producer, `say` contains no `[[`; every `cue.word < words(say).length`; and serializing the beat back to anchored text and re-parsing it gives an equal beat.

### 7.2 Player (`lib/theater/player.ts`, pure, about 200 lines, fake-clock tests)

**Injected:**
- the app `SpeechOut` (spec §3.2);
- `lib/attention.ts`;
- `beginPointing`;
- executors `{board, scene, pose, explore}`;
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
   - **Explore commands** go to the frame through the host, which checks them again against `config`. They are valid only before the frame's first `touch`, and a `reset` follows the beat. An explore `set` marks no help, because explore scenes have no checks; `gateScript` keeps its values away from the next check's key (§9.4).
4. **`wait: "act"`:**
   - The mode becomes `waiting`; the mic follows the conversation-mode rules.
   - The scene's own checker (`onAnswer` / `onCheck`, both code) reports.
   - **Explore scenes** have no checker. Their wait resolves on the frame's `done`, the "Done exploring" chip, or "Keep going".
   - **Project steps:** a step with a check resolves on its code check; an open step resolves on its tap.
   - The live tutor then reacts (AI), or the demo tutor's code-built `explain` / vetted hint does. On an explore scene, the demo tutor's line is built from `config.vars`: "What changed when you moved <label>?". Then the next beat plays.
5. **`wait: "tap"`:** a Continue chip (K–2: a 56 px "Keep going").
6. **Interrupt:**
   - **Voice:** duck within 150 ms; cancel on a real word or after 700 ms of voiced frames (spec §2.4).
   - **Typing:** goes `live`.
   - **A touch on any control,** or a frame `touch` message: goes `paused`. The run and pending cues are cancelled, and the widget or page belongs to the learner at its current state.
   - **Saved cursor:** `{scene, beat, sentence containing heardUpTo()}` (with nothing heard, sentence 0). The snapshot is written before advancing.
7. **Generation token:** each run gets one, and callbacks carrying a stale token are ignored.
8. **Resume:**
   - Only on Continue / "Keep going", or the phrases "keep going", "go on", "sigue", "continúa". It starts a new `speak()` at the saved sentence.
   - Nothing auto-resumes.
9. **Auto-advance:** slide → slide only. It never enters a quiz, interactive, explore or project scene past its `wait`.
10. **Seek:**
    - Seek lands on beat boundaries.
    - Board and scene commands rebuild silently (0 `speak()` calls); poses rebuild only from snapshots (`seek.ts`).
    - Where a seek is blocked, the UI says why.
11. **Swaps:** scripts swap only at a scene boundary. So does an explore page that arrives while its fallback is showing.

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

**Explore spots (`html.<id>`):**
- `resolveSpot` returns the frame's last reported box, offset by the frame element's own rect.
- `isShown` means the box is not null and is on screen.
- At run start the host sends `watch` for the run's cue ids, so boxes are ready before the first cue. A cue whose box is missing or stale at fire time is dropped as late.
- The parent draws the ring and the TutorCursor over the frame, with `pointer-events: none`. They are never drawn inside the page, so they keep the same look, timing, reduced-motion and forced-colors handling as everywhere else.

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
| Interrupt: duck / stop; touch → paused (including a touch inside an explore frame) | ≤ 150 ms / ≤ 800 ms; ≤ 150 ms |
| "Keep going" → first sound | p50 ≤ 700 ms (vendor), ≤ 250 ms (clip) |
| `make_lesson` tap → "Ready" (scene 1 has content and its script) | p50 ≤ 45 s, p90 ≤ 75 s (real model). Explore pages are never on this path. |
| Script request | p50 ≤ 15 s, p90 ≤ 30 s at `maxOutputTokens` 900 |
| Explore frame mount → `ready` (packed page, mid-range phone) | ≤ 1.5 s; no `ready` in 3 s shows the fallback |
| On-device preflight per new page | ≤ 2.5 s, run when the page arrives, never on the play path |
| Frame failure detected → fallback shown | ≤ 300 ms |
| Explore page request | p50 ≤ 90 s, p90 ≤ 150 s (estimates; the T6h eval sets the bar) |
| Classroom turn: tutor first sound against solo | p50 delta ≤ 50 ms |
| Peer bubble rendered after its tool input completes | ≤ 100 ms |
| Classroom turn output tokens over a solo turn | p50 ≤ +150 |
| Content request / script request / explore request | Never over 120 s / 30 s / 180 s |

Generation never runs inside a turn.

---

## 8. The surfaces

### 8.1 Talk (`app/(focus)/talk`, TutorChat + Board): the board is the stage

- **One model call per turn** (spec §2.5).
- **The director tools are echo-only `BOARD_TOOLS` written after the words:** `stage_scene`, `go_to_scene`, `make_lesson`, plus `show_visual`, `start_practice`, `add_to_calendar`, `note_for_grownup`. In classroom mode they also include `peer_says` (§8.7).
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
- **Explore pages appear only in lessons in this build.** The Board never asks for one inside a turn. `go_to_scene` may return to a visited explore scene.

### 8.2 Drawer beside a problem (TutorDrawer + Runner)

- The same live path. The problem itself is the stage.
- Worked-example board cards are allowed. `stage_scene` over the problem is not, because it would cover the work.
- **Guards:** `answerSpots(item)` plus the spec §5.3 value families.
- A spoken answer is checked in code on the server before the model call (`spoken.ts`).
- **Next** closes the drawer and cancels speech and cues.
- The take references `setId`.
- Classroom mode never applies here: a practice problem is a check.

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
  - `said = { heard: heard prefix of the cut beat + " [interrupted]", previous: the previous beat's last 150 chars }`;
  - on an explore scene, `stage.state` is the page's reported state (§8.5) and `spots` includes its declared `html.*` spots;
  - on a project scene, `project` is the current stage and step (§8.6).

  It is one model call. The tutor can point at `stage.block.<i>.visual.*`, `widget.*` and `html.*`. `stage.choice.*` and `widget.answer` stay guarded until checked. It can `go_to_scene` to a visited scene, never past an unanswered check.
- **The whiteboard button** becomes the Board beside the scene, never over the work. The `stage.whiteboardOff` copy goes away.
- **K–2:** auto-advance between slides only; 56 px Continue and Keep going chips.

### 8.4 Today K–2

BigHear stays a single code-built beat (spec §5.5). It is not a session, so it is not recorded.

### 8.5 Explore scenes: the HTML ("Take the html")

**What it is.**
- An explore scene is a scene whose middle is an AI-written HTML page: a simulation, a diagram, a set of steps, or a challenge.
- It teaches and lets learners explore. It never grades.
- Its label is always visible above the frame, in our own DOM: "Written by AI · for exploring, not counted". Reviewed catalogue pages say "Written by AI, reviewed by people · for exploring, not counted".

**Layout.** It sits in the scene's flow, never portalled, and works at 320 px:
1. The title and `prompt`: ours, read by the theater.
2. The frame:
   - at the slot's real CSS width;
   - height from `size`, clamped to 240–1600 px; above that, the page scrolls inside the frame.
3. The text equivalent, visible on the page, not a hidden alt. It is made of:
   - `idea`;
   - `config.describe`;
   - the controls list, built in code from `config.vars` (for example "Gravity: 1 to 20 m/s², now 9.8");
   - the latest observation summary.

   It must carry the idea on its own.
4. "Done exploring" and "Skip this activity": 44 px (56 px K–2), through `t()`.

**The frame** (`components/stage/ExploreFrame.tsx`):

```html
<iframe srcdoc={packed} sandbox="allow-scripts" allow="" referrerpolicy="no-referrer"
        loading="lazy" title={t("stage.explore.frame", { title })}>
```

- **No `src`, ever.** No other sandbox token (§5.4).
- **A null origin:** no cookies, no storage, no access to the app, no popups, no forms, no modals, no top navigation, no downloads.
- **The packed document starts with the CSP meta** (§9.9): no network, no frames, no workers.
- **The frame is unmounted and the fallback shown** on any of:
  - a second `load` event (the page navigated itself);
  - a CSP violation reported by the shim;
  - an `error` before `ready`;
  - no `ready` within 3 s;
  - 3 errors after `ready`.
- **Messages:**
  - Host messages wait in a queue of about 30 lines until `ready`.
  - Every frame message is checked: `event.source === iframe.contentWindow`, the mount's `doc`, the Zod schema, ≤ 4 KB. Anything else is dropped and counted.
- **Lifecycle:**
  - The frame mounts on scene entry and unmounts when the learner leaves. There is no keep-alive pool: re-entry reloads the page and re-applies the last recorded state (§10.4 rules).
  - Thumbnails and lists never run a page. They show the title and a static icon.
  - In replay the frame is `inert`.

**Before a page is shown.** These run in order. Any failure shows the fallback and logs a `problem` with no learner data.
1. **Server:** `gateHtml` (§9.8), then `packHtml` (§9.9). Only server-packed pages exist (invariant 13.13).
2. **Device, the preflight.**
   - When it runs: once per page hash per device, when the page arrives, never on the play path.
   - What runs: the packed page plus our check runner and `axe-core` (its `source`, inlined) in a hidden frame with the same sandbox and CSP, laid out at 320 px, `inert` and `aria-hidden`.
   - Within 2.5 s it checks:
     - `ready` arrives and one observation is published, with 0 errors and 0 CSP violations;
     - no horizontal overflow at 320 px;
     - axe finds 0 violations of a fixed rule set: names, labels, alt, ARIA, contrast;
     - **the keyboard path:**
       - every `config.vars` entry and every step action has a native control (`input`, `button`, `select`) with an accessible name;
       - each is reachable by Tab, in DOM order, inside `#experiment`, and has a visible focus style;
       - nothing works only by drag or only on a canvas;
     - targets are ≥ 44 px (56 px K–2);
     - every `config.spots` id is rendered;
     - the visible text's language matches the lesson (`languageOf` on `innerText`).
   - The result is cached by hash on the device.
   - T4h proves that the preflight agrees with the CI headless pass on the fixture pages in Chromium, WebKit and Firefox. If a browser throttles the hidden frame, the runner waits for `ready` instead of a timer.
3. **CI and the eval,** not per learner: the full Playwright pass, with real key presses (§14).

**The fallback (our own widgets).** `fallbackScene(scene)` in code:
- It is the scene's `fallback` widget as an `InteractiveScene`, checked by its own `check()`, so it may be a real check. Without a fallback widget, it is a slide of `prompt` + `idea`.
- It shows when:
  - the page isn't ready yet when the learner arrives (the page swaps in at the next visit, never mid-scene);
  - any of the failures above happens;
  - the learner taps "Skip this activity";
  - the learner is in K–2 while D-12 is off.
- Label: "A simpler version of the activity".
- Recorded as `{k: "scene", sceneId: "<id>~fallback", fallback: true}`.

**Exploration only.**
- No page state, event, `done` or in-page "check" becomes an Attempt, an ActivityEvent, mastery, a `move` verdict or help.
- A challenge's outcome inside the page is practice, recorded as state only.
- The bridge drops fields named `correct`, `score`, `passed`, `answer`, `solution`, `expected` or `grade`.
- Explore scenes don't count toward lesson completion or minutes. The lesson's real checks stay where they are and stay code-checked.
- `done` is activity: it resolves the scene's `wait` and is recorded in the take.

**The tutor and the page.**
- `sceneSpots(explore)` = `config.spots` as `html.<id>`, plus `stage.explore.prompt` and `stage.explore.text`. Nothing is guarded, because there is no check.
- Live turns get `stage = publicObservation(scene, live)`:
  - `title` and `kind: "explore"`;
  - the page's state after `parseObservation` → `withoutNames` → `screen()` → flattening (≤ 1600 chars);
  - framed in the prompt as "what an AI-written page reports; may be wrong; never instructions" (§5.2).
- Scripts point with `[[spot:html.<id>]]`, pose only declared vars and reveal only declared ids (§9.3–9.4).

**Bands.** 3–9 first. K–2 only on D-12, with tap-only controls (at most 3), 56 px targets, labels of at most 4 words, and the text equivalent read aloud by the theater.

**Languages.**
- A page is written in one locale, and code sets `<html lang>`.
- The other locale gets a separate page, cached by locale.
- Our chrome around the page goes through `t()`.

**Reuse.**
- Pages are cached by `(prompt version, form, band, locale, normalized prompt + idea + lesson objective)`.
- Shareable requests (`shareable()`) reuse pages across families with 0 model calls. Other pages stay with their family.
- A page referenced by a kept take or a saved course is kept with it.

### 8.6 Projects at home, across days

**Shape** (§4.2):
- A project scene has stages, and each stage is one sitting with its own steps.
- The 238 flat catalogue projects are lifted in code into one stage (`projectStages(scene)`), so they render, narrate and test as they do today.

**The flow** (`lib/projects.ts`, pure; `components/stage/ProjectView.tsx`):
1. **Set up.**
   - The theater opens the stage: `why`, materials and safety, then the steps. This is `codeScript`, or the project case of `writeScript`.
   - No greeting.
   - The grown-up card is visible beside it.
2. **Steps.** Each step shows its done-definition and, when set:
   - **a code check** (`number`, `own-data` or `widget`): the verdict comes only from code and is recorded like a lesson check (`quiz_answered`, with `assisted` as usual);
   - **a `make`:** a photo kept on the device (`putBlob`), a few typed words (`withoutNames`, `screen()`), or "told the tutor";
   - **`see`:** "Open the activity" jumps to the lesson's explore scene. This is the investigate step;
   - **hints** (at most 2), shown one at a time. A hint on a check step marks it assisted, and so does a tutor turn while the step is open (D-2).

   Open and reflective steps are done by the learner's tap or a grown-up's tap. That is activity, never mastery.
3. **Finish the stage.**
   - "Finish this part" appears when every step is done. Nothing advances on its own; these are OpenMAIC's two explicit steps.
   - The tutor reads `wrap`.
   - ActivityEvent `project_stage_done`.
4. **Next time.**
   - The learner or grown-up picks a day. `nextOn` puts "Next part of <project> · about N min" on Today's plan (`planner/plan.ts`).
   - On return, the stage opens where it was left. The live tutor's context carries the `project` block, so it picks up the thread: "Last time you set up the cups. Today you measure them."
5. **Teach it back.**
   - The last stage ends with a `make: "tell"` step: the learner explains what they found, to the grown-up or to the tutor.
   - With the tutor it is a live turn: labelled, never scored.
6. **Recap.**
   - Built in code from the run: stages done with dates, things made, checks "right" or "not yet".
   - No stars, scores or invented metrics.
   - Shown to the learner and on the grown-up's child page.

**The grown-up's role, under 5 minutes a stage.**
- **A card per stage** (`grownUp`): what to have ready, the safety note, and how to help. At most 3 sentences and 5 minutes; `gateProject` checks both.
- **The Family child page** shows the active project, its next stage and day, and that card.
- **Sign-off:**
  - "They showed me", on a stage or on the teach-back, needs the grown-up gate (`session.unlocked`).
  - Without the gate, the step is labelled "Done by you".
  - A grown-up's tap is labelled "Signed off by a grown-up".
- **Safety:** steps involving heat, sharp tools, chemicals, going out alone, online accounts or buying things carry a `safety` line and need the grown-up (`gateProject`, EN/ES word list).

**The tutor's role.**
- It is the one live tutor: it sets the project up, follows it across days and helps on the active step.
- It binds first and asks second, never does the work, and never marks a step. Only code and taps do that.
- Its feedback on a learner's words is an ordinary live turn, labelled "Written by AI", with no effect on progress.
- Photos never go to it (D-10).

**Recording.**
- A project sitting is a take (`surface: "lesson"`).
- Each step mark is a `move` record: `spot: "project.<stage>.<step>"`, `by`, a verdict only from a code check, and `assisted`.
- Photos and typed words stay in the run, not in the take.

**Labels:** "Written by AI" on AI projects; "Done by you"; "Signed off by a grown-up".

### 8.7 Classroom mode (behind a button)

**Off by default, twice:**
- The deploy flag `KAIZEN_CLASSROOM` is off.
- A grown-up must opt in per learner: Family → the learner → "Classroom mode", through the grown-up gate (`Profile.classroom`).
- Only then does the learner see a "Classmates" toggle in Talk and in the stage's tutor panel: `aria-pressed`, 44 px, keyboard-operable, and off at the start of each session.
- Grades 3–9 only (D-9). Never in the drawer.

**Who is there:**
- The tutor and up to two AI classmates from `PEERS` (`lib/classroom/roster.ts`):
  - `asks`: asks the question a classmate might ask;
  - `tries`: thinks an idea through out loud.
- Personas are reviewed EN/ES constants under a golden snapshot.
- Names come from a reviewed list per locale and are picked in code so they never match a family name.
- Every peer bubble shows its name and "AI classmate" as text.
- No faces: an initial in our palette.

**The teacher remains the one authority:**
- Turn order is code: the learner, then the tutor's words (always first), then at most one peer line, then the learner's turn again.
- Peers never talk to each other and never speak first.
- Peers never give a verdict, never correct the tutor, never explain an answer, and never give a hint on an open check. They ask or think aloud, then hand the floor back to the learner: their line ends with a question.
- Played scripts stay one teacher voice. Peers speak only in live turns.

**One model call per turn:**
- The peer line is an echo-only board tool, `peer_says {peer, say}`. It is offered only when `ctx.classroom` is set and is written after the tutor's words.
- `stopWhen` stays `[isStepCount(5), last step board-only]`.
- These parts are dropped silently, and the turn ends on the tutor:
  - a `peer_says` that comes before any text;
  - a second `peer_says`;
  - one that fails `gatePeer` (§9.10).
- The server accepts `ctx.classroom` only with the flag on and with peers from `PEERS`. With an account, it also checks the synced opt-in.
- Without an account the opt-in is a browser setting, but the server still checks the flag, the roster and every peer line.

**Same rules as the tutor:**
- `screen()` before the call;
- names never reach the model;
- no praise;
- no greetings after the first turn;
- the language matches the lesson;
- the labels.

While a check is open, a classroom turn counts as help, the same as any live turn.

**Voices:**
- **Default (D-9): text only.** A peer line is a labelled bubble, announced through `aria-live="polite"` with the speaker's name, and never read in the tutor's voice.
- **Spoken peers** wait for D-9: an audition, a second pre-opened vendor socket, and the live tutor spec exception. Then the gate is tutor last word → peer first sound ≤ the band's sentence pause + 100 ms.

**Caps:**
- A classroom turn is one request and one turn against the existing caps (`budget.ts`).
- Peer output is at most 140 chars, and output tokens rise by at most 150 per turn at p50.
- The roster block is at most 300 tokens, cached.
- If the T9c eval misses a latency or cost gate, the flag stays off.

**Recording:**
- Each peer line is its own `tutor` record with `beat.who`.
- Replays show the same speakers and labels.
- "Keep as a lesson" and "Keep this explanation" drop peer beats, because a lesson has one teacher voice.

**Demo mode:** vetted, code-written peer lines in `lib/tutor-demo.ts`, keyed by the demo tutor's misconception tags (`by: "demo"`).

**Accessibility:**
- speaker names as text;
- `aria-live` polite;
- no speaking animation under reduced motion;
- a single-column transcript at 320 px;
- a 44 px toggle.

---

## 9. Generation (live and offline)

### 9.1 Every generation route runs this order

1. `limited(req, bucket, perMinute)`
2. Zod parse with size caps
3. `screen(text, locale)` on every learner-typed or client-sent text: the goal (`/api/ai/lesson`), the scene text (`/api/ai/script`, `/api/ai/explore`). A non-ok result gets the fixed reply and **0 model calls**.
4. The per-learner daily cap (`/api/ai/lesson`, `/api/ai/explore`)
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

1. **The tutor proposes `make_lesson {goal ≤ 200, subject, grade, shape?: "lesson" | "project"}`** only when:
   - the learner asks to learn something, or asks to make or build something (`shape: "project"`), or
   - `stuckSittings(...) ≥ 2` on the open skill.

   It shows a "Make a lesson about X" card ("Make a project about X" for a project). **Nothing is spent until a tap.** The tutor keeps teaching live meanwhile, with no filler speech. The cap is 3 per learner per day, with spend caps on top.
2. **On the tap:** `lib/theater/make.ts` posts `aiFetch POST /api/ai/lesson {goal, subject, grade, locale, length: "one" | "course", shape?, basedOn?}`. A project is one lesson that ends in a staged project scene.
3. **`/api/ai/lesson`** runs the §9.1 order, then `cachedCourse` (shareable requests only), then `writeLesson`:
   - **2+ lessons:** the outline goes through `Output.object(OutlineSchema)` with `keyPoints`. The language directive is fixed in code (`langLine`), never inferred by the model.
   - **One lesson:** no outline call.
   - **Content:** `streamText` + `Output.object(LessonSchema)` with a partial output stream.
     - WRITER gains:
       - the explore line: at most 1 explore scene per lesson, 3–9 only, and only where an idea is best understood by changing something and watching; never in place of a check;
       - `PROJECT_RULES`, when the shape is project or a project scene closes the lesson.
     - Each scene is emitted as soon as it closes and passes the per-scene gates:
       - `widgetProblems`;
       - the picture range;
       - quiz keys resolve;
       - the hint doesn't name the right choice (`mentions`);
       - explore stubs: `ExploreStubSchema`, and the fallback widget passes `widgetProblems`;
       - project scenes: `gateProject` (§9.11);
       - `praiseIn`, `languageOf`, K–2 load, `suitable()`.
   - **At the end:** `gateLesson` and `gateWritten` on the whole lesson. Failing scenes get one repair call with the reasons. A scene that still fails is dropped and named in a `problem` event.
   - **NDJSON events:** `scene`, `lesson`, `problem`, `done`. At most 120 s per request.
4. **Scripts and pages:**
   - For each scene the browser posts `/api/ai/script`: scene 1 the moment it arrives, then 2..n one after another with `previous`.
   - After "Ready", the browser also posts `/api/ai/explore` for the lesson's explore scene, alongside the script chain. At most 2 requests are in flight.
   - The explore scene's script is requested when its page arrives, because it needs `config`. Until then the scene plays its fallback.
5. **Saving:**
   - The client saves the lesson as a `Course` (`origin: "generated"`, `ai: true`, `from: {threadId}`) as scenes arrive; status is `outlining` until `done`.
   - The card turns to "Ready, play it here" once scene 1 has content and a script (AI, or `codeScript` labelled "This scene is read from the page"). "Ready" never waits for an explore page.
   - Scene 1 plays while scenes 2..n are still being written.
6. **A closed tab:** unscripted scenes keep `codeScript`, and their scripts resume from the first unscripted scene on the next open. An explore scene with no page asks for it again on the next open.

### 9.3 `writeScript` (the port of `generateSceneActions`)

```ts
writeScript(scene: Scene, ctx: {
  lesson: { title: string; objective?: string; keyPoints?: string[] };
  index: number; total: number; titles: string[]; previous?: string;
  grade: Grade; locale: Locale; rep?: Representation;
  spots: { id: string; label: string }[]; // sceneSpots(scene).pointable
  explore?: ExploreConfig;                 // explore scenes: spots become html.<id>; set and reveal come from it
  project?: { stage: ProjectStage; index: number; of: number }; // project scenes: the current stage, check answers removed
}, model: LanguageModel, signal?: AbortSignal): Promise<Script | null>
```

- **The prompt contains:**
  - `SCRIPT_RULES` (§5.1);
  - `TEACHING_DIRECTIVE`;
  - the anchor guide (spec §3.1 text, plus "the slide shows, your voice tells" for 3–9);
  - band rules: K–2 ≤ 6 beats and ≤ 10 words a sentence; 3–9 ≤ 10 beats and ≤ 16 words;
  - `langLine(locale)`;
  - `courseContext(ctx)`;
  - the scene as JSON built field by field: no quiz `answer`, no `explain`, no widget `target`, no project check `answer`;
  - the spot list with labels;
  - `rep`, when it is an "Another way" variant.
- **Output:** `Output.object(ScriptOut)`, where `ScriptOut = { beats: [{ say ≤ 220, pose?: WidgetPoseSchema(scene.widget.kind), wait?: boolean }] (1..10) }`.
  - Only kinds whose widget has the pose seam get `pose` in the schema.
  - Explore scenes use `ExploreScriptOut(config)`. Each beat may carry `set` (each declared var optional, `min`..`max`) and `reveal` (an enum of `config.reveal`).
  - `maxOutputTokens` is 900.
- **Then:** `toBeat()` on each beat (anchors → cues), then `gateScript`.
  - On failure: one retry with the reasons.
  - If it still fails: return null, and the client keeps `codeScript` in the learner's locale, labelled.
- **Not written:** no AI script for K–2 slides (§2.2 #17).
- **`/api/ai/script`:**
  - Catalogue scenes are posted by id `{catalogueId, lessonId, sceneId}` and rebuilt on the server. Their scripts are cached globally by `(sceneId, grade band, locale, rep, prompt version)`.
  - Generated scenes are posted whole, then re-parsed with `SceneSchema`, per-scene `gateLesson` checks and `screen()`. Their scripts are never cached across families.
  - An explore scene is posted with its page hash only. The server reads `config` from its own page store (§10.3) and never accepts a `config` or any HTML from the client.

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
7. Interactive, explore and quiz scripts end on `wait`. At most one `wait`, and only at the end.
8. `screen(say)` is ok for every beat. A failing beat fails the script.
9. **Explore scenes:**
   - anchors only on `config.spots` (as `html.<id>`) or `stage.explore.*`;
   - `set` keys only in `config.vars`, in range and on a step;
   - `reveal` ids only in `config.reveal`;
   - no `set` value equal to, or one step from, any value in the next check scene's key: quiz answer values through `numbers.ts`, or widget targets.
10. **Project scenes:**
    - the briefing, the step reading and the debrief only;
    - no beat contains any step check's `answer`, in digits or words;
    - a script never marks a step.

### 9.5 Offline: catalogue scripts and catalogue explore pages

- **Run:** `EVAL_REAL=1 EVAL_SUITE=catalogue-scripts npm run evals` (`apps/web/evals/catalogue-scripts.ts`).
- It runs `writeScript` + `gateScript` over the 3–9 slide scenes and all interactive and quiz openings of the 61 catalogue files, through the same `lib/ai/config.ts` model, with no learner data.
- It writes drafts to `catalogue/scripts/<course-file>.json` (status `draft`, ≤ 60 KB per course, loaded lazily, never in the initial bundle) and lists them in `/review`.
- **Nothing ships without D-3.**
- **Clips:** for `codeScript` reading and for approved scripts, clips follow spec P5 (`voice/<sha256(text|voice|model|speed)[:16]>.{mp3,json}`). Public text only.
- **Catalogue explore pages** (T9, D-8):
  - **Run:** `EVAL_REAL=1 EVAL_SUITE=catalogue-explore npm run evals`.
  - **Input:** a reviewed list of catalogue scene ids, chosen by a person, never by the model. Each is an idea that suits an explore page.
  - It runs `writeExplore` → `gateHtml` → `packHtml` → the CI headless pass.
  - It writes drafts to `catalogue/explore/<course-file>.json` as `{afterSceneId, scene, page}`: status `draft`, at most 400 KB a page, lazy, never in the initial bundle. The drafts are listed in `/review`.
  - **Nothing ships without D-8.** Approved pages are what demo mode plays.

### 9.6 Cost

- At most 2 transport retries and 1 gate retry per stage.
- One script call per scene per variant.
- Variants and clips are cached.
- Every attempt is metered.
- `spent()` stops the job between scenes, and unfinished scenes keep `codeScript`.
- **Explore pages:**
  - one call per page plus at most one repair;
  - about 8–12k output tokens, roughly $0.10–0.25 a page on Sonnet 5.5 at $10 per million output tokens, and double that on Opus 5.5. These are estimates from the price table, not measurements; the T6h eval logs the real cost.
  - `KAIZEN_EXPLORE_PER_DAY = 3`, and cache hits are free.
- **Projects** ride in the lesson call, with no extra call.
- **Classroom:** no extra call. When a peer speaks, a turn costs about 60–150 more output tokens (about $0.001–0.002), plus a cached roster block of about 300 tokens. These are estimates.

### 9.7 `writeExplore` (the port of `generateWidgetContent`) and `/api/ai/explore`

```ts
writeExplore(scene: ExploreScene, ctx: {
  lesson: { title: string; objective?: string; keyPoints?: string[] };
  grade: Grade; locale: Locale;
}, model: LanguageModel, signal?: AbortSignal): Promise<{ html: string; config: ExploreConfig } | null>
```

- **One free-text call.** The page is HTML, not JSON. The prompt contains:
  - `EXPLORE_RULES` for the form;
  - the band rules;
  - `langLine`;
  - the design tokens;
  - the structure contract;
  - the scene as fields: title, prompt, idea, form, and the lesson's objective and keyPoints.

  Never another scene's key, and never a profile field.
- **The structure contract:**
  - one `<!doctype html>` document;
  - one `<style>`;
  - at most 3 inline `<script>`s, classic or module, with no `src`;
  - a `<script type="application/json" id="explore-config">` holding the `ExploreConfig`;
  - the whole interactive area inside `#experiment`;
  - `data-spot`, `data-var` and `data-reveal` on the declared parts;
  - native controls only;
  - `kaizen.publish(state, summary)` after every meaningful change;
  - a `prefers-reduced-motion: reduce` block if anything moves;
  - system fonts and our tokens (`var(--k-*)`);
  - images as inline SVG or `data:` only.
- **Caps:**
  - target ≤ 40 KB authored (stated in the prompt);
  - hard caps of 150 KB authored, 8 KB of config and 400 KB packed;
  - `maxOutputTokens` 12,000;
  - timeout 180 s.
- **Model role:** `build` by default. The T6h eval runs `talk` once; switch only if `talk` passes the same bars.
- **Then:**
  1. `extractHtml` (the document must close);
  2. `gateHtml`;
  3. on failure, one repair call with the gate's reasons (codes and failing ids only, never the page's text);
  4. `gateHtml` again;
  5. `packHtml`.

  If it still fails, it returns null. The scene keeps its fallback, and a `problem` event is sent.

**`/api/ai/explore`** runs the §9.1 order:
1. `limited`;
2. Zod: `{catalogue ref or ExploreStub, lesson fields, grade, locale}`, ≤ 4 KB;
3. `screen()` on the scene text;
4. `KAIZEN_EXPLORE_PER_DAY`;
5. `spendGate`;
6. `model("build", meter(req))`;
7. `withGenerationRetry` (≤ 2 transport retries);
8. `writeExplore`;
9. store the packed page (§10.3);
10. respond `{page: ExplorePage, html}`.

- A cache hit makes 0 model calls and doesn't count against the cap.
- Demo mode returns 503.
- Generated scenes are posted as stubs and re-parsed (`ExploreStubSchema`, `screen()`).
- A request that carries any `html` field is rejected.

### 9.8 `gateHtml` (all in code, on the server)

1. **Size:** ≤ 150 KB; one document; parse5 parses it; the doctype and the closing `</html>` exist.
2. **Scripts:** every script parses (classic through `node:vm` compile-only, module through acorn); none has `src`; at most 3.
3. **Banned tags and attributes:**
   - `base`, `meta[http-equiv]`, `iframe`, `frame`, `object`, `embed`, `form`, `link`;
   - `a[href]`, `[target]`, `[srcset]`;
   - `input[type=text|search|email|tel|url|password|file]`, `textarea`, `[contenteditable]`;
   - inline event attributes (`on*=`).
4. **Token scan over the scripts.** The CSP is the real wall; this is the second layer. Banned:
   - network: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`;
   - navigation and other windows: `window.open`, `location`, `top.`, `parent.`, `opener`, `postMessage`;
   - storage: `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `caches`;
   - dynamic code: `import(`, `eval`, `Function(`, `Worker`, `serviceWorker`;
   - devices and prompts: `navigator.mediaDevices`, `geolocation`, `getUserMedia`, `Notification`, `alert(`, `confirm(`, `prompt(`.
5. **References:** no `http(s):` or protocol-relative URL anywhere, including CSS `url()` and `@import` (the asset inventory, §5.1).
6. **Structure:**
   - `#experiment` exists;
   - the config parses (`ExploreConfigSchema`, ≤ 8 KB) and has no key named `solution`, `answer`, `expected`, `correct`, `testCases` or `score`;
   - every `config.spots` id is a `data-spot`;
   - every `config.vars` name is a native control with `data-var`;
   - every `config.reveal` id is a `data-reveal`;
   - the vars stay within the band's limits.
7. **Accessibility (static):**
   - every control has an accessible name;
   - every `img` and `svg[role=img]` has `alt` or `<title>`;
   - if there is any CSS animation, transition or `requestAnimationFrame`, a `prefers-reduced-motion` block exists;
   - no `animation-iteration-count: infinite`, and no `infinite` in an animation shorthand;
   - no `background-clip: text`.
8. **Text:** the visible text and `config.describe` pass `languageOf === locale`, `praiseIn` (empty), no greeting words, no emoji, `screen()` and `suitable()`.

It returns `{ok}` or `{problems: string[]}`.

### 9.9 `packHtml` (server; the pattern of OpenMAIC's offline packager)

1. Set `<html lang>` from the locale, and remove any existing CSP meta.
2. Insert this as the first node in `<head>`:

   `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'">`

   There is no `'unsafe-eval'`.
3. Then, in order:
   - our token stylesheet: light and dark, ≤ 4 KB, from DESIGN.md;
   - the shim: error capture, the frozen `window.kaizen`, the bridge, `size` and `boxes` reporting, and `touch` detection; ≤ 8 KB;
   - the authored document.
4. **Math:** TeX delimiters are rendered to MathML on the server by KaTeX (`output: "mathml"`, `trust: false`). No script, no fonts.
5. **Cap and hash:** 400 KB. The sha256 of the result is `ExplorePage.hash`.

`packHtml` is the only producer of a document a frame can show. A test asserts that every stored page has the meta as the first node of its `<head>`.

### 9.10 `gatePeer` (classroom mode, all in code)

It rejects a peer line that:
1. names a peer not in `ctx.classroom`, or is the second peer line in the turn, or comes before the tutor's text;
2. fails `languageOf === locale`, breaks the band's sentence limit, or is over 140 chars;
3. contains praise (`praiseIn`), a greeting word, or emoji;
4. fails `screen(say)`;
5. contains a learner name (`withoutNames` changes it);
6. while any check is open, contains choice text or explain text (`mentions()`), any answer value in digits or words (`numbers.ts`, EN and ES), or a hint;
7. gives a verdict on the learner's answer (right, wrong, correct, incorrect, bien, mal, correcto, incorrecto and the like), or corrects the tutor;
8. doesn't end with a question to the learner.

A rejected line is dropped silently, and the turn ends on the tutor. The rejection rate is logged without the text.

### 9.11 Projects in the writer: `gateProject`

- `PROJECT_RULES` join WRITER when the lesson's shape is project, or when a project scene closes a lesson. The project scene schema allows 1–4 stages of 2–4 steps.
- **`gateProject` rejects:**
  - stage or step counts outside the band (K–2 ≤ 2 stages, 3–5 ≤ 3, 6–9 ≤ 4), or minutes over the band;
  - no final `make: "tell"` teach-back step;
  - a `number` check whose answer isn't stated in its prompt or computable from it in code (the `gateScene` task–target rule);
  - an `own-data` check without `count` and `op`;
  - hints that contain a check's answer (`mentions`, `numbers.ts`);
  - an unsafe step without a `safety` line and a `grownUp` card (EN/ES list: heat, stove, oven, knife, scissors, glue gun, chemicals, bleach, matches, fire, going out alone, online accounts, signing up, buying, money);
  - a grown-up card over 3 sentences or 5 minutes;
  - failures of `praiseIn`, `languageOf`, `suitable()` or `screen()`.
- **Repair:** one repair call with the reasons. If the project still fails, it falls back to its flat form when that form passes `ProjectSchema`. Otherwise it is dropped and named in a `problem` event.
- Ids, status and order are assigned in code.

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
  - **Explore:**
    - the frame's `state` → `move {spot: "explore", state: ExploreState}`, at most one a second while the learner drags and one on release, and at most 300 per scene run;
    - `done` → `move {spot: "explore.done"}`;
    - the fallback → `scene {fallback: true}`;
    - never a verdict.
  - **Projects:**
    - a step mark → `move {spot: "project.<stage>.<step>", by, verdict?, assisted?}`;
    - a finished stage → `move {spot: "project.<stage>.done"}`.
  - **Classroom:** peer lines → `tutor` records with `beat.who`.
- **Never recorded:** learner audio, pointer traces, names, keys, prompts, page HTML (the take holds the hash), photos and typed project words (these stay in the `ProjectRun`).
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
- **Explore pages:**
  - stored in IndexedDB `kaizenedu.explore`, keyed by hash;
  - pages referenced by a kept take or a saved course are kept, and the rest are pruned least-recently-used beyond 50 MB;
  - pages carry no learner data (`gateHtml`), so they may be content-addressed.
- **Project photos:** `lib/blobs.ts`, as today. Device only (D-10).
- **Export and delete:**
  - `lib/export.ts` adds take bodies (an async `withTakes`, the same pattern as `withFiles`); audio is included only through the files option. It also adds `projectRuns`; photos go only through the files option. Pages are not exported, only their hashes.
  - `deleteLearnerData`, `deleteFamily` and `wipeBrowserStorage` remove the IndexedDB rows, the runs and the photos.
- **`TutorThread.takeId`** links each transcript to its "Watch again".

### 10.3 Storage: the server, with accounts (T8; pages from T6h; runs from T7p)

- **The index:** `takes` (`TakeRef`) joins `SYNC_LISTS` and `KEEP_ON_SERVER` (`lib/server/db/wire.ts`), with `recordTable("takes")` and its migration.
- **Bodies:**
  - `POST /api/sync/takes` pushes bodies the server lacks (≤ 4 MB per request, `SYNC_LIMITS`);
  - `GET /api/sync/takes/[id]` pulls a body on demand when a replay opens on another device;
  - table `take_bodies` via `recordTable`.
- **Explore pages (T6h):**
  - table `explore_pages {hash, json, bytes, shareKey?, accountId?}`;
  - shareable pages have a `shareKey` and no account; private pages belong to one account and are served only to it;
  - `GET /api/explore/[hash]` returns `application/json` with `X-Content-Type-Options: nosniff`, never `text/html`;
  - only the server writes rows: every row came from its own `packHtml`;
  - without a database, pages live in the in-process cache and on the device that made them.
- **Project runs (T7p):** `projectRuns` joins `SYNC_LISTS` and `KEEP_ON_SERVER`. Photos stay device-only until D-10 and a Blob token.
- **Deletion:** the account cascade deletes everything, and learner removal deletes that learner's rows.
- **Audio:** device-only until D-4 and a Vercel Blob token exist. Then it is uploaded private, under allocated ids, with the same retention.

### 10.4 Replay ("with and without voice")

`replay.ts` walks the records in `seq` order through the player in replay mode:
- no model call, no recorder, no store write;
- learner lines appear as muted bubbles at their recorded times;
- checks show "then: right" or "then: not yet", greyed and never re-asked;
- board cards and scene commands re-apply;
- widget states come from snapshots, through `pose` where a kind has the seam; otherwise a static `VisualView` of the snapshot;
- **explore:**
  - The same page loads by hash, `inert`. Recorded states re-apply through `set` (numeric vars only) after a `reset`.
  - If the next observation doesn't match the recorded vars (the pose round trip fails), the frame stays at its start and the recorded summaries show as text. Seek past a learner change is disabled, and the UI says why.
  - If the page is gone from both the device and the server, the text equivalent and the recorded summaries show: "The activity isn't on this device any more."
- **projects:** step marks show "then: done by you", "then: signed off by a grown-up", or "then: right / not yet", greyed. Photos show only on the device that holds them;
- **classroom:** peer lines show with their names and "AI classmate".

The banner always reads **"Replay · <date> · doesn't count as practice"**.

**Voices, chosen in `Replay.tsx`; the default is the first one available:**
1. **Original voice.** The kept tutor audio (D-4), or clips when every line has one. Cues follow the recorded `wordsAt` against the audio's playback time.
2. **Spoken again.** The current app `SpeechOut`: vendor with consent, else clips where they match, else Tier A ("Using this device's voice"). Cues are word-indexed, so they follow the new voice's clock with no extra work. Under-13 learners without vendor consent get Tier A or clips. Peer lines stay text unless D-9 has given peers voices.
3. **Text.** Captions paced by the recorded `wordsAt` (moves ≥ 900 ms apart when there are no times), with cues on render.

**Other replay features:**
- Captions and transcript come from `captions.ts` (`toVtt`) over the recorded word times.
- Seek works through `timeline.ts` and `seek.ts`.
- "Try it yourself" starts a new live session.

### 10.5 How recordings become lessons

1. **A generated lesson is a scripted take by construction.** Its scenes carry `script {by: "ai"}`. "Watch again" plays it.
2. **"Keep this explanation"** (the stage):
   - The tutor beats between an interrupt and its resume on scene S become a `scripts[]` variant `{by: "live", from: {takeId, at}}`.
   - They must pass `gateScript`, and also:
     - no learner line;
     - no tutor line quoting the learner (matched against the scrubbed learner turns);
     - no peer beat;
     - anchors in `sceneSpots(S)`;
     - not on an unanswered quiz.
   - It is family-private, labelled "Explained live on <date>".
3. **"Keep as a lesson"** (Talk or drawer, one tap by a grown-up or a 3–9 learner): `curateSession(take)` in code, **with no model call**:
   - each `scene` card becomes an interactive scene, and each `show_visual` card a slide `{visual block, alt: description}`;
   - each scene's script is the tutor beats said while it was the latest card, with cues re-anchored to that scene's spots;
   - learner moves become `wait: "act"`;
   - learner turns, verdicts, safety records and peer beats are dropped, and so are lines quoting the learner;
   - `gateLesson` and `gateScript` run (the 3-scene minimum doesn't apply).
   - **The lesson needs at least one check scene;** otherwise the session can only be kept as notes.
   - It is saved as a `Course` with `origin: "generated"`, `ai` set when any beat is AI, and `from: {takeId}`. Label: "From your session · <date>". It is never written to the shared `courseKey` cache.
4. **"Make it a lesson"** (from a Talk take) runs `make_lesson` with the topic phrase only (names scrubbed). The conversation itself never goes to a model.

Sessions never create explore or project scenes.

### 10.6 How lessons multiply

1. The tutor makes them (`make_lesson`, within the caps).
2. The shared cache: a shareable generated course comes back to the next family with 0 model calls, and so do its shareable explore pages. Lessons from a family's files or from a take are never shared (`shareable()` test).
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
  - **Catalogue explore pages** are added only as reviewed drafts, on D-8. Each is inserted after the scene it explores, and the course's existing scenes and checks are unchanged.
- **Stage** (`Stage.tsx`, `scenes.tsx`, `VisualView`, `narration.tsx`): stays the only lesson surface. It gains Play, live interrupt, the Board beside the scene, explore scenes and staged projects. "Say it with me" and `Spoken` are unchanged.
- **Widgets:**
  - They stay typed and checked by code (`check()`), never iframes.
  - AI-written HTML lives only in explore scenes beside them (§8.5). It never replaces a check, and an explore scene's fallback is one of these widgets.
  - They gain `onState` (T4) and `pose` (T6, then T9).
  - A `pose` applies only before the first touch and resets after its beat.
- **Projects:** the 238 catalogue project scenes are lifted in code into one stage each. They gain saved progress, the grown-up card and "Next time", with no content change. Staged projects come from the writer (T7p).
- **`show_visual` Visuals** are the drawing primitive. There is no whiteboard in 1.0.
- **Source-built courses** (`lib/source-course.ts`) get `codeScript` and play the same way.

---

## 12. Demo mode (`KAIZEN_AI=off`, no keys)

- **Plays as normal:**
  - every lesson on `codeScript`, with automatic cues;
  - demo-tutor beats with `hintSpotAt` cues on Talk, the drawer and the stage;
  - recording, and replay in Tier A, clip or text mode;
  - the tutor's live-on-stage path through vetted hints;
  - **explore:** reviewed catalogue explore scenes (D-8), with the demo tutor's code-built explore line. Generated explore scenes have no page, so they play their fallback;
  - **projects:** catalogue projects on `codeScript`, lifted to one stage, with saved runs, the grown-up card, "Next time", the teach-back and the recap;
  - **classroom:** with the flag on and a grown-up's opt-in, vetted peer lines from `tutor-demo.ts`.
- **`/api/ai/script`, `/api/ai/lesson` and `/api/ai/explore`** return 503. The client keeps `codeScript` and the fallbacks.
- **`make_lesson`** offers the source-built course path (`lib/source-course.ts`), labelled "Built from real sources", with `codeScript`.
- No feature disappears. The theater reads the lesson's words instead of teaching around them.
- The demo tutor says "demo tutor" once, in the opening.

---

## 13. Invariants (each one has a test, §14)

1. Replay writes nothing: no Attempt, ActivityEvent, TeachingAct, review, thread, help or project run (lint boundary plus store-diff test).
2. Recording writes only `takes`, plus `threads` as today.
3. **Help:**
   - neutral `codeScript` narration and AI meta beats on check scenes are not help;
   - a `pose` beat, a live turn while the scene is open (including a classroom turn), an open tutor panel, and a hint or tutor turn on an open project check step are help (D-2). Help is recorded before the teaching is delivered.
   - The mastery law in `learning/engine.ts` is unchanged.
4. Right and wrong come only from widget `check()`, the quiz index, practice `check`, `spoken.ts` and code-checked project steps. No model grades. No key ever reaches a prompt. `publicObservation` never spreads a Widget, Quiz, Item or ProjectStep check.
5. `screen()` runs before every model call.
6. Learner names never reach a model, and takes are scrubbed when written.
7. No learner audio is ever recorded. Tutor audio is kept only on opt-in.
8. Content-addressed clips exist only for public text; private audio uses allocated ids. Explore pages are content-addressed and carry no learner data.
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
   - "Written by AI · for exploring, not counted";
   - "Written by AI, reviewed by people · for exploring, not counted";
   - "A simpler version of the activity";
   - "Done by you";
   - "Signed off by a grown-up";
   - "AI classmate";
   - the replay banner.

   AI is never claimed for a code script.
10. **Generated JavaScript runs only inside the explore frame.**
    - The frame takes its `srcdoc` from `packHtml`, has `sandbox="allow-scripts"` and no other token, `allow=""` and `referrerpolicy="no-referrer"`, puts the CSP meta first in `<head>`, and has no network.
    - There is no other iframe in the app.
    - There are no third-party CDNs or fonts anywhere.
    - Explore HTML is never served as a document from our origin.

    (Rewritten 2026-10-07 by the owner's decision; see D-7.)
11. Anchors are the only cue syntax, and `Beat` is the only stored form.
12. **Explore pages never prove anything.** No page state, event, `done` or in-page check becomes an Attempt, an ActivityEvent, mastery, a verdict or help. The bridge drops verdict-named fields. Explore scenes never count toward completion.
13. **Only the server makes explore pages,** through `gateHtml` and then `packHtml`.
    - HTML from a client is never stored, served or rendered.
    - A page is shown only after the device preflight passes.
    - Any failure, before or during display, shows the fallback.
14. **The model never gives a page a selector or a URL.** It names declared spots, sets declared vars in range and on a step, and reveals declared ids. The bridge accepts only schema-valid messages from the frame's own window, carrying the mount's `doc`.
15. **No model output changes `ProjectRun.done` or a verdict.** Project checks are code, and open steps are taps. A grown-up sign-off needs the grown-up gate; otherwise the step is labelled "Done by you".
16. **Project photos stay on the device and never reach a model** (D-10).
17. **Classroom mode is off** unless the flag and a grown-up's opt-in are both on.
    - The roster is a code constant, checked on every request.
    - The tutor's words come first, there is at most one peer line per turn, and there is one model call per turn.
    - Peers never give a verdict, an answer value, choice text, a hint on an open check, or a name.
18. **Every played script has one teacher voice.** Peer beats appear only in live turns and are dropped when a session becomes a lesson.

---

## 14. Tests

**Unit** (vitest, fake clocks):
- **`toBeat` round-trip** for each producer, including peer beats:
  - a reply split at every character position yields display text with no markers;
  - cues land at the right word indexes;
  - a marker at the very end binds to the last word.
- **Player:**
  - cue arrivals at `audibleAt − 150 ± 16 ms`;
  - an interrupt at beat 3, word 12 resumes at the start of the sentence that holds word 12;
  - a stale run's callbacks are ignored after a token bump;
  - seek to beat 3 rebuilds board, scene and snapshots with 0 `speak()` calls;
  - seek is disabled past a learner change on a kind without the seam;
  - a touch (including a frame `touch`) goes to `paused` in ≤ 150 ms (fake clock);
  - an explore `wait` resolves on `done`, "Done exploring" or "Keep going", and on nothing else;
  - no auto-resume;
  - auto-advance never enters a check, explore or project scene.
- **`gateScript`:**
  - rejects each failure in §9.4, one case each, including the explore and project rules;
  - the answer-number cases cover digits, "seven" and "siete";
  - an explore `set` equal to, or one step from, the next quiz's answer value is rejected.
- **`gateScene`:** rejects shaded > parts; rejects a start equal to the target; rejects a prompt that doesn't state or compute its target; accepts "Shade 3/4 of the bar" with `{parts: 4, shaded: 3}`.
- **`poseProblems`:** rejects poses at the target, one step from it, or out of range.
- **`codeScript`:**
  - for every catalogue scene, the code script says exactly its on-screen words, in order;
  - no quiz beat mentions a choice (over all 244 quizzes);
  - the existing narration tests stay green.
- **`curateSession`:** planted learner phrases and names never appear in the lesson; peer beats are dropped; a session with no check scene yields notes only.
- **Takes:** caps and pruning; `op` dedupe; delta encoding; a 20-turn fixture is ≤ 25 KB; with "Ada" planted, "my name is Ada" is stored scrubbed; explore moves coalesce and stop at 300 per scene run.
- **`gateHtml`:**
  - one rejecting fixture per rule in §9.8: a `fetch`; a `<script src>`; a module script that doesn't parse; an `a[href]`; a CSS `url(https://…)`; a text input; a missing `data-spot`; a config with `solution`; an infinite animation; Spanish text on an EN lesson; "Great job!"; an emoji;
  - it accepts the three people-written fixture pages.
- **`extractHtml`:** a truncated document fails.
- **`packHtml`:** the CSP meta is the first `<head>` node; `lang` is set; there is no `unsafe-eval`; `\frac{3}{4}` becomes MathML; the result is ≤ 400 KB; the hash is stable.
- **Bridge:**
  - these messages are dropped: one from another window, one with a stale `doc`, one over 4 KB, one off the schema;
  - a `pose` with an undeclared var, out of range or off a step is refused by the host;
  - verdict-named fields are dropped;
  - an observation over 4 KB or deeper than 64 is refused.
- **`lib/projects.ts`:**
  - lifting every catalogue project (from the registry) gives one stage with its steps in order;
  - the manual Done gate: nothing advances without the tap;
  - reopening resumes the stage;
  - `nextOn` puts the stage on that day's plan;
  - re-specified OpenMAIC behaviours: current lookups, runtime repair.
- **`gateProject`:** rejects each failure in §9.11, one case each; the unsafe-word list in EN and ES.
- **`gatePeer`:** rejects each failure in §9.10, one case each; answer values in digits, "seven" and "siete".
- **Classroom routing:**
  - a `peer_says` before any text is dropped, and so is a second one;
  - a forged peer id, or `ctx.classroom` with the flag off, is rejected by the server;
  - with classroom off, the tool isn't offered.
- **Store diff:**
  - replaying a fixture take leaves `attempts`, `activity`, `acts`, `threads`, `reviews` and `projectRuns` unchanged;
  - a fixture explore session (state changes, a challenge outcome inside the page, `done`) writes no Attempt, verdict or help.
- **Routes** (mocked model):
  - a crisis goal on `/api/ai/course` and `/api/ai/lesson`, and a crisis scene text on `/api/ai/explore`, get the fixed reply with 0 model calls;
  - a 4th lesson, or a 4th explore page, in a day is declined in words with 0 calls;
  - a request to `/api/ai/explore` or `/api/ai/script` that carries `html` or `config` is rejected;
  - a cached page comes back with 0 calls;
  - an unparseable script returns the fallback in the request's locale;
  - each stage retries at most 2 times and meters every attempt;
  - the model-call spy never sees a family nickname, a profile field, a photo, client-sent HTML or a key.
- **Stored pages:** every page in the server store and in `catalogue/explore` starts with the CSP meta as its first `<head>` node.
- **Prompt golden snapshots:** `SCRIPT_RULES`, the director block, the lesson-surface block, `EXPLORE_RULES`, `PROJECT_RULES`, the project block, the classroom block and `PEERS`.

**Component** (RTL + jsdom, fake `SpeechOut` from `lib/voice/fakes.ts`):
- For every catalogue scene, from the registry and in both answered states: rendered `data-spot` ⊇ `sceneSpots(scene).pointable`, and no guarded id is in the pointable list.
- Serializing the `/api/tutor` request for every catalogue quiz, widget and project check contains no answer index, no target, no check answer and no `choices[answer]` marker.
- The Board `scene` card renders `board.scene.widget.fractionbar.part.0..3`.
- `TheaterBar` states; `Caption`; the `Replay` banner in every state.
- **`ExploreFrame`:**
  - `sandbox` is exactly `allow-scripts`; there is no `src`; `allow=""` and `referrerpolicy="no-referrer"` are set; the title is localized;
  - a second `load` unmounts the frame and shows the fallback, and so does no `ready` in 3 s;
  - the label, the text equivalent and both controls always render.
- **`ProjectView`:** every catalogue project renders in both states; a grown-up sign-off without the gate is labelled "Done by you"; K–2 targets are 56 px.
- **`PeerBubble`:** the name and "AI classmate" as text; `aria-live`; no animation under reduced motion.
- `widgets.test.tsx` and `lesson-stage.test.tsx` stay green through the `onState` and `pose` changes.

**End to end** (`apps/web/e2e/theater.spec.ts`, `explore.spec.ts`; models mocked with Playwright `page.route` serving recorded streams, as `aiinfra.spec.ts` does; desktop and phone; also `KAIZEN_AI=off`):
1. **K–2 lesson:** Play start to finish; each picture's ring arrives 0–250 ms before its alt text's first word (fake voice with timings); 0 calls to `/api/ai/*` with AI off.
2. **Talk:** two anchored replies and a scene card are recorded; "Watch again" visits the same spot ids in the same order, with no markers in the DOM and an unchanged store.
3. **Stage:** speak mid-beat → live → "Keep going" resumes at the cut sentence; touching a widget during a pose pauses within 150 ms and leaves the widget editable.
4. **Talk:** "teach me about the water cycle" → a `make` card → tap → "Ready" → Play. Scene 1 plays while scenes 2..n arrive. No scene plays without a script, with `codeScript` standing in, labelled. The live turn still meets the P1 latency gate meanwhile.
5. **Replay** in text mode with AI and voice off.
6. **axe** clean in playing, paused, waiting, live and replay at 1440 and 390 px; the reduced-motion equivalent; no horizontal scroll at 320 px.
7. **The wall.** Fixture pages misbehave on purpose, in Chromium, WebKit and Firefox:
   - `fetch`, an `<img src=https://…>`, `window.open`, a form submit and `top.location` each produce 0 requests to any other host (Playwright request spy);
   - `localStorage` throws inside the frame;
   - `location = "https://example.com"` is detected, and the frame is unmounted with the fallback shown within 300 ms. The request count to the other host is reported, because a navigation request can leave before the unmount; this is why `gateHtml` bans `location` and pages have no text inputs.
8. **Explore in a lesson:**
   - the ring on `html.<id>` arrives 0–250 ms before its word;
   - a touch inside the frame pauses within 150 ms;
   - "Done exploring" resolves the wait;
   - the take records state moves without verdicts;
   - "Watch again" re-applies the states;
   - a page that fails preflight shows the labelled fallback.
9. **Explore accessibility:**
   - Tab reaches every control in the fixture pages, in DOM order, after the prompt and before the text equivalent;
   - axe is clean on the host at 1440, 390 and 320 px, and inside the frame;
   - with reduced motion emulated, the idle page is still after 2 s (two screenshots are equal).
10. **A project across two days,** in EN and ES:
    - start the project and finish stage 1 with a code check and a photo, then pick tomorrow;
    - with the clock moved a day, Today shows the next part, and the tutor's context carries the stage;
    - a grown-up sign-off needs the gate;
    - the teach-back and the recap list what was made;
    - no photo is in any request body.
11. **Classroom mode:**
    - absent with the flag off;
    - absent with the flag on until a grown-up turns it on;
    - when on, a turn shows the tutor's words, then one labelled peer line, from one `/api/tutor` request;
    - replay shows both speakers;
    - it works with `KAIZEN_AI=off`, from the demo lines.
12. **axe and 320 px** for the project view and classroom mode.

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
- **`explore`:** 30 explore stubs across sim, diagram, steps and challenge, in 3–5 and 6–9, EN and ES.
  - **Pass rates:**
    - ≥ 85% pass `gateHtml` on the first or second try, and ≥ 90% of those pass the headless pass;
    - 100% of scenes end with a page or their fallback;
    - the raw failure reasons are reported.
  - **On every shipped page:**
    - 0 network requests and 0 console errors in 2 s;
    - an observation is published;
    - 0 horizontal overflow at 320 px;
    - axe clean;
    - the keyboard path complete with real key presses;
    - still when idle under reduced motion.
  - **Content:** 0 verdict-named fields; 100% `languageOf`; 0 praise; 0 greetings; 0 emoji.
  - **Speed and cost:** page request p50 ≤ 90 s and p90 ≤ 150 s, none over 180 s; size and cost per page are logged.
  - **Reviewer rubric on 10 pages:** the text equivalent alone carries the idea; no slop; the same visual world.
  - Runs once on `build` and once on `talk` to pick the role.
- **`project`:** 10 project goals across K–2, 3–5 and 6–9, EN and ES.
  - 100% pass `gateProject` within 2 tries, or fall back to a flat project that passes;
  - 0 unsafe steps without a safety line and a grown-up card;
  - 0 hints containing a check's answer;
  - grown-up time ≤ 5 min a stage.
- **`classroom`:** 50 scripted turns with classroom on, across 3–5 and 6–9, EN and ES, with and without an open check.
  - 0 leaks, 0 verdicts, 0 names and 0 praise in the peer lines shown;
  - the peer rejection rate is reported;
  - tutor first-sound p50 delta ≤ 50 ms;
  - output tokens p50 ≤ +150;
  - 1 request per turn.
- **Latency:** spec §7.4 voice-latency eval, extended with lesson-surface live turns and the theater rows of §7.4 (mock voice).

---

## 15. Phases, in build order

Order: **T0 → T1 → T2 → T3 → T4 → T4h → T5 → T6 → T6h → T7 → T7p → T8 → T9 → T9c.**

Each phase starts when the one before it is merged and `npm run verify` is green. `docs/STATUS.md` keeps four lists (done, in progress, left, blocked), with blocked-on-a-key-or-decision kept separate from not started.

### T0. Gates before anything generates (half a day, no keys)

**Builds:**
- §5.4 guards, including the amendment's sandbox, iframe, CDN and `public/*.html` rules;
- `screen(goal)` in `app/api/ai/course/route.ts`;
- `aiFetch` in `lib/generate.ts`;
- `THIRD_PARTY_NOTICES.md`;
- STATUS and live tutor spec §0.4: the precondition is met (evidence from §1.1) and the never-merge warning (§1.2);
- a `docs/DECISIONS.md` entry with the owner's 2026-10-07 words, and the D-7 escalation note for the one-workspace spec.

**Acceptance:**
1. A crisis goal to `/api/ai/course` streams the fixed reply, and the mock model records 0 calls.
2. A goal containing the learner's and a sibling's nicknames leaves the browser with both replaced (spy on the body).
3. A planted `sk-ant-oat` and a planted `modules/` import each fail `verify`.
4. A planted `allow-same-origin`, a planted `cdn.jsdelivr.net` and a planted `public/x.html` each fail `verify`.
5. `verify` is green.

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

### T4h. The explore frame: the HTML host, before the generator (no model)

**Builds:**
- the `ExploreScene`, `ExplorePage` and `ExploreConfig` types; `ExploreState`, `StageState` and the `explore` command;
- `lib/explore/bridge.ts`, `observation.ts`, `pack.ts` (without MathML), `gate.ts`, `preflight.ts`, `store.ts` and `scene.ts`;
- `components/stage/ExploreFrame.tsx` and `ExploreView.tsx`: prompt, frame, text equivalent, "Done exploring", "Skip this activity", labels, `fallbackScene`;
- `attention.ts` resolving `html.*` spots through frame boxes; the player's explore executor and its `wait`; `codeScript` for explore; the demo tutor's explore line;
- recording and replay of explore sessions (§10.1, §10.4); IndexedDB `kaizenedu.explore`;
- the people-written and misbehaving fixture pages, test-only;
- the `parse5`, `acorn` and `axe-core` dependencies and their THIRD_PARTY_NOTICES rows.

**Acceptance:**
- the §14 explore unit and component tests, and e2e 7–9, green in Chromium, WebKit and Firefox;
- the preflight's verdict equals the CI headless pass's on every fixture;
- frame mount → `ready` ≤ 1.5 s on the fixtures (mid-range phone profile); failure → fallback ≤ 300 ms;
- the store diff shows explore writes no Attempt, verdict or help;
- `verify` green, with `ExploreFrame` and the preflight the only `srcdoc` users.

*Owner's words: "Take the html for sure that's the main thing I want from it"; "dont make anything look or sound or feel like AI slop".*

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

### T6h. OpenMAIC's HTML generator

**Builds:**
- `lib/ai/explore.ts`: `EXPLORE_RULES` for sim, diagram, steps and challenge; `writeExplore`; the repair call;
- `/api/ai/explore`; `KAIZEN_EXPLORE_PER_DAY`;
- the page store: the in-process cache, the `explore_pages` table when a database exists, and `GET /api/explore/[hash]`;
- KaTeX MathML in `packHtml`;
- the explore case of `writeScript` and `gateScript` (`ExploreScriptOut`);
- `apps/web/evals/explore.eval.ts` with the Playwright headless pass.

**Acceptance:**
- the `explore` eval bars (§14), with the role decided;
- route tests:
  - a crisis scene text makes 0 model calls;
  - a 4th page in a day is declined with 0 calls;
  - a request carrying `html` is rejected;
  - a cache hit makes 0 calls;
  - demo mode returns 503;
  - every attempt is metered, with at most 2 transport retries and 1 repair;
- the stored-page test: every page starts with the CSP meta;
- explore scripts pass `gateScript`, light only declared spots, and never set a var at or next to the next check's key value.

*Owner's words: "Take the html for sure that's the main thing I want from it"; "use openmaic generator its solid".*

### T7. The tutor makes lessons and plays them while it writes

**Builds:**
- the `make_lesson` tool and `MakeCard`;
- `/api/ai/lesson` with `writeLesson` (outline for 2+ lessons; per-scene streaming gates; repair call);
- `make.ts` (scene 1 first, scripts one after another, resume);
- `KAIZEN_LESSONS_PER_DAY`;
- `stuckSittings`;
- WRITER gains `TEACHING_DIRECTIVE`;
- the WRITER explore line and `ExploreStubSchema` (at most 1 per lesson, 3–9). `make.ts` asks for the page after "Ready", alongside the script chain.

**Acceptance:**
- e2e 4;
- `make_lesson` alone makes 0 course calls (no spend without a tap);
- a crisis goal makes 0 model calls;
- the 4th lesson is declined;
- the `lesson` eval bars;
- after a reload, scripting resumes from the first unscripted scene;
- tap → "Ready" p50 is unchanged with an explore scene in the lesson; a lesson whose page fails plays its fallback, labelled; the explore scene's script arrives after its page and swaps in at the next scene boundary.

*Owner's words: "it will create more and more".*

### T7p. Projects at home, across days

**Builds:**
- the project types and `ProjectRun`; `lib/projects.ts`; the `projectStages` lift;
- `components/stage/ProjectView.tsx` and `GrownUpCard.tsx`: stages, checks, `make`, hints, `see`, sign-off, "Next time", the teach-back, the recap; the Family child-page card;
- `planner/plan.ts` next-stage items; `projectRuns` in the store and the sync lists;
- `PROJECT_RULES`, project stages in the schema, `gateProject`, `make_lesson {shape: "project"}`;
- the project case of `SCRIPT_RULES` and of `codeScript`; the tutor's `project` context block;
- `apps/web/evals/project.eval.ts`.

**Acceptance:**
- through the lift, every catalogue project renders, narrates (`narration.tsx` tests) and passes the existing tests;
- the `lib/projects.ts` and `gateProject` unit tests; e2e 10, in EN and ES;
- a spy shows no model call changes a run, and no photo leaves the device;
- the `project` eval bars;
- a hint, or a tutor turn, on an open check step marks it assisted.

*Owner's words: "then incorporate some project based learning".*

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
- replays never change tallies, mastery or project runs;
- with captured audio, cue arrivals stay 0–250 ms before their words;
- server round trip: a take recorded on device A replays on device B (with its explore page, when the server holds it), and learner delete removes it on the server;
- the ES parent journey (keep, regenerate, play) works fully in Spanish.

*Owner's words: "recording or replay able experiences will remain"; "it will create more and more".*

### T9. Catalogue scripts, clips, the remaining poses, ship gates

**Builds:**
- `catalogue-scripts` drafts into `/review`;
- `catalogue-explore` drafts into `/review` (D-8), for the reviewed list of scene ids;
- clips for `codeScript` K–2 narration, project stage readings and approved scripts (spec P5);
- `pose` on the remaining kinds;
- dogfood passes as:
  - a K learner;
  - a 9th grader before a test;
  - a Spanish-speaking parent on a phone;
  - a screen-reader user on an explore scene;
  - a family doing a two-day project with a grown-up;
- update `docs/spotlight.md` and STATUS/DECISIONS.

**Acceptance:**
- 100% of catalogue scenes have a script that passes `gateScript` (code or approved AI);
- every draft is ≤ 60 KB (scripts) or ≤ 400 KB a page (explore) and absent from the initial bundle;
- every approved catalogue explore page passes the CI headless pass, and demo mode plays approved explore scenes with 0 `/api/ai/*` calls;
- clip playback: 0 model or TTS calls during catalogue playback (network spy), drift ≤ 1 word over 60;
- `verify` and e2e green; axe clean at 1440 and 390 px;
- the dogfood findings are fixed before release; D-12 is decided after this pass.

*Owner's words: "dont make anything look or sound or feel like AI slop".*

### T9c. Classroom mode behind a button (flag off; after the ship gates, so 1.0 never waits on a "maybe")

**Builds:**
- `lib/classroom/roster.ts`; `peer_says` and `gatePeer` in `lib/ai/classroom.ts`; the classroom prompt block;
- the server check on `ctx.classroom`;
- `Beat.who`, `peerBeat`, and the records;
- `PeerBubble` in TutorChat (through `cards.ts`, never forking the file) and in the stage panel;
- the Family opt-in (grown-up gate) and the learner's `ClassroomToggle`;
- the demo peer lines;
- `curateSession` and "Keep this explanation" drop peer beats;
- `apps/web/evals/classroom.eval.ts`.

**Acceptance:**
- e2e 11; the §14 classroom unit tests; the `classroom` eval bars;
- the classroom rows of §7.4;
- axe, `aria-live` and 320 px;
- the flag turns on in production only on D-9's yes, after a dogfood pass with the button on.

*Owner's words: "maybe add the multi agent classroom out it behind a button".*

---

## 16. Blocked on the owner (kept separate from "not started")

**Keys and accounts:**
- `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY` (Member role) and `KAIZEN_VOICE=vendor` on Vercel. These block:
  - the live tutor spec's P0 vendor checks;
  - the real-vendor latency and drift gates (T1, T7, T9);
  - replay with the vendor voice;
  - spoken peers (D-9).
- `ANTHROPIC_API_KEY` or `AI_GATEWAY_API_KEY`, if not configured. This blocks every `EVAL_REAL=1` run (T5, T6, T6h, T7, T7p, T9, T9c) and live generation outside demo mode. Mocks cover everything else.
- A Vercel Blob token. This blocks clips (T9), server-side tutor audio (T8) and any server copy of project photos (D-10).
- Production `DATABASE_URL`, if not set. This blocks server takes (T8), the durable explore page store (T6h) and server project runs (T7p).

**Decisions:**
- D-1 to D-12 (§3).
- The one-workspace spec edit that matches D-7, on its own branch.
- From the live tutor spec: the voice audition pick; the wording of openings and consent; counsel's view on vendor read-aloud consent for under-13 learners.
- Counsel's view on AI classmates and on project photos for under-13 learners (D-9, D-10).

**Sessions:**
- Blind listening with children.
- Device soak.
- The reviewer's sign-off on catalogue AI scripts.
- The reviewer's sign-off on catalogue explore pages (D-8).
- A screen-reader user's pass over explore scenes.
- A grown-up's pass over a two-day project.

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
9. **Prompt heritage.** Each source carries its own problems:
   - the script prompts: praise, greetings, multi-agent rules, Chinese examples, adult pacing;
   - the HTML prompts: CDNs, Tailwind, Chinese buttons, "OBVIOUS" animation, achievements, emoji;
   - the project prompts: exclamatory openers, one-sitting pacing.

   All are rewritten as constants under golden tests. `praiseIn`, `languageOf` and the greeting check enforce the rest, on the pages' visible text as well as on narration.
10. **OAuth contamination by copying.** Only the leaf files in §5.1 come over. Check-forbidden and the ESLint ban land in T0, before any port.
11. **Stale merges.** No `worktree-wf_a6840288-*` branch is ever merged, and nobody forks TutorChat: the recorder hooks in from outside.
12. **Help accounting** (D-2). If it is implemented wrong, help on an answer goes unrecorded. Covered by explicit tests in T4, T6 and T7p.
13. **Reading "take the html" as taking their host.**
    - The HTML comes over. OpenMAIC's iframe host, CDN post-processor and 1280×720 page do not (§2.3 #19).
    - The reversal of old invariant 10 and of one-workspace §6–7 is recorded with the owner's words and escalated as D-7, not decided silently.
14. **The network wall is one meta tag.**
    - The app sets no CSP, and a `srcdoc` frame inherits the parent's.
    - If the meta is missing, comes after a script, or is stripped by a later rewrite, page code can reach any host. That would send a child's IP and user agent to third parties (COPPA), and could load arbitrary code.
    - Covered by:
      - `packHtml` as the only producer;
      - the test on every stored page;
      - server-side packing only;
      - the CSP-violation fallback;
      - check-forbidden.
    - A later hardening step is an app-level CSP with `frame-src` on the stage routes. It needs testing in three engines before anything relies on it.
15. **CSP does not govern navigation.**
    - A page can set its own `location`, and that request leaves the browser before the second `load` unmounts the frame.
    - Defences:
      - the gate's token scan;
      - no links;
      - no text inputs, so there is nothing typed to leak;
      - the unmount;
      - server-only packing.
    - What remains is one request's IP. It is documented and tested (e2e 7).
16. **Model-written grading leaking into proof:** game scores, step completion, challenge outcomes. Covered by invariant 12, the bridge's field drop, the always-visible label, and the store-diff test.
17. **Answer leaks through pages, poses and narration.**
    - Upstream sent a widget config with its solution into the script prompt.
    - Covered by:
      - solution-like config keys rejected at the gate;
      - a generator that never sees another scene's key;
      - the pose-versus-next-check rule;
      - `gateScript`.
18. **Accessibility of generated pages** is unreliable, even with prompt rules. Covered by:
    - the static gate;
    - the device preflight;
    - the CI headless pass;
    - a visible text equivalent that carries the idea on its own;
    - the fallback;
    - "Skip this activity".
19. **Latency and cost of pages.**
    - One HTML call for a 10–40 KB page is slow and often fails the gates, and a repair doubles the cost.
    - Mitigations:
      - pages never sit on the "Ready" path;
      - a fallback is always ready;
      - at most one page per lesson;
      - pages are cached, capped and metered;
      - the eval sets the bar.
    - A third lesson in one day may meet the $1 cap.
20. **Privacy through the page.** Mitigations:
    - pages have no text inputs;
    - observation values are numbers, booleans and short enums;
    - `withoutNames` and `screen()` run on the summary;
    - the tutor prompt frames page state as untrusted evidence.
21. **Untrusted HTML at rest.** Mitigations:
    - the client never sends HTML;
    - pages are data from our server (`application/json`, `nosniff`), never documents at our origin;
    - there is no `url` field.
22. **OpenMAIC's project loop is model-graded at its core.** A score of 60 or more unlocks Done, and a hidden proficiency engine runs beside it. Replaced, not adapted (§2.3 #26). No proficiency engine comes over, and no second learner model.
23. **At-home physical safety and photos.**
    - Covered by `gateProject`'s EN/ES list, the grown-up card and the sign-off.
    - Photos stay on the device (D-10). OpenMAIC sent image submissions to a vision model; we never do in 1.0.
24. **Catalogue projects** (238, some with 6 steps) must keep rendering and narrating. The lift is done in code and tested over the registry.
25. **Classroom: a faithful port breaks the latency and cost gates.**
    - Upstream makes 2k+1 calls and runs a director, not streamed, before every speaker. `soloTutor` didn't hold upstream either.
    - Ours:
      - one model call;
      - turn order fixed in code;
      - a roster the server checks on every request;
      - behind a flag and a grown-up's opt-in.
26. **AI classmates and children.**
    - The risks: a parasocial pull, the feel of AI slop, and AI peers presenting as children.
    - Mitigations:
      - a label on every line;
      - reviewed personas;
      - no praise;
      - grades 3–9 only;
      - a grown-up's opt-in;
      - text-only peers by default;
      - the owner's yes before the flag turns on (D-9).
27. **A "maybe" built anyway.** T9c comes after the ship gates, so 1.0 never waits on it, and the flag keeps it dark until D-9.
