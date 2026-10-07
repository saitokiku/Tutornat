# Tutor toolkit, teaching/data boundaries and per-lesson quality gates

Authored 2026-10-03T23:16Z. Specification lane (no application code).
Observation basis: `classroom/` at SHA `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`, read 2026-10-03T23:05–23:16Z.

**Install/boot state (corrected 2026-10-03T23:30Z).** The "uninstalled, unbooted" wording below and in
`lesson/STATUS.md` is a **historical observation, now stale**. `classroom/node_modules` is present (117
entries) and a native runtime has been booted: a loopback listener on `127.0.0.1:51206` (PID 60528) is
live. A second instance on `*:51208` was **stopped at 23:21Z** after `lsof` showed it bound to all
interfaces with `accessCodeConfigured:false`; see
`delivery/fullstack/NATIVE_CORRECTION_DECISION_20261003T2321Z.md`. The 51206 instance remains. **This is
not a live capability pass:** that decision also records an unauthorized `course.content.effort: high`
reasoning reduction and a chat probe with `stage_used: null` returning Chinese — so no contextual EN/ES
tutoring is established. A native corrective worker (`sa-0-c0a4aae1`) is addressing those. Read every
`UPSTREAM-WIRED` row as "installed and bootable, behaviour unproven", not as "no install exists". No
billing or subscription-429 root cause is claimed from `service_tier: standard`.

**Reading rule for this document.** Three status words are used and never blurred:

| Status | Means |
|---|---|
| **UPSTREAM-WIRED** | The code exists in `classroom/` *and* a caller chain to a reachable Next.js route/component was grep-verified. It is **installed and the app boots** (see the install/boot correction above), but **not integrated or behaviourally proven in this delivery**. Wired ≠ proven. |
| **UPSTREAM-ORPHAN** | Code exists; a grep for importers/callers found none. Capability is latent, not available. |
| **MISSING** | No implementation. A term appearing in a prompt template, a doc, an eval fixture or vendor metadata is **not** capability and is recorded as MISSING. |

Nothing in this document closes an `FS-*` row. Two worker lanes (`sa-0-e2439f2e` native integration, `sa-0-31400584` Kaizen UI) were editing `classroom/` concurrently with this read; paths under `classroom/app/kaizen/**`, `classroom/components/kaizen/**`, `classroom/lib/kaizen/**` are **in-flight** and their line numbers are timestamped observations, not frozen facts.

---

## 1. Tutor toolkit — logical responsibilities

The toolkit is defined as **tutor-facing responsibilities**, not as invented callable API names. Where a real upstream symbol/path implements a responsibility it is named exactly. Where the responsibility has no upstream implementation, the row says MISSING and no name is coined for it.

State owner column resolves "who may write this" — the single writer that prevents two agents racing the same state. Cancellation column states what a stale or superseded call must do, per the standing `lessonId`/`turnId`/`revision` rule in `PRODUCT.md`.

### 1.1 Explain and answer (tutor voice — the learner-facing turn)

| Responsibility | In / Out | State owner | Cancellation | When to use | Status + source |
|---|---|---|---|---|---|
| Answer the **actual newest learner question** first, then resume plan | In: full conversation + current scene + interactive evidence. Out: one learner-facing turn | Director loop (sole learner-facing voice) | Superseded turn: drop result, do not paint | Every learner message | **UPSTREAM-WIRED.** `lib/chat/pi/prompts.ts:529-543` `buildUserPrompt()` does `[...messages].reverse().find(m=>m.role==='user')` and emits a literal `Latest user message:` line; consumed at `lib/chat/pi/director-loop.ts:258`. Route `app/api/chat/pi/route.ts` |
| Read what is currently on the stage before answering | In: stage/scene id. Out: scene summary | Read-only | n/a | Before any visual reference | **UPSTREAM-WIRED.** `lib/chat/pi/tools/read-scene.ts`, registered `director-loop.ts:13-20` |
| Delegate one bounded sub-task to a worker agent | In: instruction + last-12 history. Out: worker result | Director | Director abandons worker result on supersede | Visual/search work inside a turn | **UPSTREAM-WIRED.** `lib/chat/pi/tools/call-agent.ts` (child history window 12, `:800`,`:897`) |
| Prompt the learner for a turn / nudge | In: cue text. Out: learner-visible cue | Director | n/a | After an explanation, before the check | **UPSTREAM-WIRED.** `lib/chat/pi/tools/cue-user.ts` |
| End the teaching session cleanly | — | Director | n/a | Lesson complete | **UPSTREAM-WIRED.** `lib/chat/pi/tools/close-session.ts` |

Default path check: `isPiChatEnabled()` (`lib/config/feature-flags.ts:99`) uses `readDefaultOnBoolean` (`:14`), which returns **true when the env var is unset** — so the Pi director is the default live chat path. The legacy `app/api/chat` path has **no** latest-question prioritization: `lib/orchestration/summarizers/conversation-summary.ts` defaults to `maxMessages = 10` (`:37`) and `maxContentLength = 200` (`:38`) and slices `(-maxMessages)` (`:44`), and `director-graph.ts:162` calls it with no override, so the newest question reaches the router already truncated. **Chat-first work must target the Pi path; the legacy path is rollback only and must not be used as the chat-first evidence surface.**

### 1.2 Show (stage artist — visual/manipulable explanation)

| Responsibility | In / Out | State owner | Cancellation | When to use | Status + source |
|---|---|---|---|---|---|
| Draw structured content on the shared whiteboard | In: typed elements (text, shape, chart, latex, table, line, code). Out: appended op | Whiteboard op log (event-sourced, single writer) | Stale `revision` → reject append | Build-up explanation during a turn | **UPSTREAM-WIRED.** `lib/chat/pi/tools/native-whiteboard.ts` (emits `PPTChartElement` at `:823`); runtime `lib/whiteboard/runtime/{store,fold,validate}.ts`; surface `components/whiteboard/{index,whiteboard-canvas}.tsx` |
| Direct attention to one element | In: element ref. Out: dim-mask cutout | Canvas store | Overlay cleared on scene change | "Look at this part" | **UPSTREAM-WIRED.** `lib/chat/pi/tools/native-spotlight.ts`; `components/slide-renderer/Editor/SpotlightOverlay.tsx` mounted `ScreenCanvas.tsx:106` |
| Run an authored choreography step on the scene | In: action list. Out: timed stage effects | Action engine | Unsafe-nav guard in `lib/playback/action-navigation.ts` | Playing an authored lesson scene | **UPSTREAM-WIRED.** `lib/action/engine.ts` — **22 action kinds** at `:234-283`: `spotlight, laser, play_video, speech, wb_open, wb_draw_{text,shape,chart,latex,table,line,code}, wb_edit_code, wb_clear, wb_delete, wb_close, discussion, widget_{highlight,setState,annotation,reveal}`. Stage toolkit built at `:191` via `createStageAPI` |
| Scene/element/canvas/navigation control surface | In: typed calls. Out: mutated scene | Document store + canvas store | Generation-token guard | All stage mutation | **UPSTREAM-WIRED.** `lib/api/stage-api.ts` + `stage-api-{scene,element,canvas,navigation,whiteboard,mode,defaults,types}.ts` |
| Quantitative chart | In: series data. Out: rendered chart | Element tree | n/a | Data/quantity concepts | **UPSTREAM-WIRED.** `components/slide-renderer/components/element/ChartElement/Chart.tsx` — real echarts (Bar/Line/Pie/Scatter/Radar, SVGRenderer, `echarts.init` `:91`) |
| **Structural/conceptual diagram** (shells, cycles, flows, hierarchies) | In: nodes/edges/reveal order. Out: a *diagram* | Generation output + interactive iframe host | Iframe scene teardown | The owner's named priority | **PIPELINE EXISTS; LIVE QUALITY UNVERIFIED.** `lib/types/widgets.ts:51` `DiagramConfig` (flowchart/mindmap/hierarchy/system, nodes+edges+revealOrder) is routed at `packages/@openmaic/generation/src/scene-generator.ts:1240` (`case 'diagram'` → `PROMPT_IDS.DIAGRAM_CONTENT`, passing `diagramType`, `prescribedNodes`, `nodeCount`). `packages/@openmaic/generation/templates/diagram-content/system.md` explicitly specifies **connected SVG nodes + edges + `revealOrder`**, edge-to-node-boundary maths, no-orphan-node and no-jitter rules, and a **required widget `postMessage` listener** (`:80-82`). Rendering is the shared `components/scene-renderers/InteractiveIframeHost.tsx` path (`interactive-renderer.tsx`, `lib/store/interactive-iframe-pool.ts`), driven by the `widget_{highlight,setState,annotation,reveal}` action kinds. What is genuinely absent is a **dedicated React diagram component and any mermaid/d3 dependency**, and there is no separate `diagram` scene type (`packages/@openmaic/dsl/src/stage.ts:22` = `slide\|quiz\|interactive\|pbl`) — diagrams ship **as** `interactive` scenes. Absence of a dedicated component is **not** absence of diagram support. **Unverified:** sandbox/safety behaviour, factual accuracy of generated diagrams, and actual on-screen visual quality — none has been observed live. Other substrates remain available: echarts charts and whiteboard `wb_draw_{shape,line,chart}` inside a slide. |

### 1.3 Let the learner act (interaction)

| Responsibility | In / Out | State owner | Cancellation | When to use | Status + source |
|---|---|---|---|---|---|
| Host a sandboxed interactive demonstration | In: scene HTML. Out: live iframe over the scene rect | Iframe pool (`lib/store/interactive-iframe-pool.ts`) | Visibility token; never evicted (zero-reload return) | Manipulable explanation | **UPSTREAM-WIRED.** `components/scene-renderers/InteractiveIframeHost.tsx` (sole channel `postMessage` `:316`,`:379`; validates picked selector `:79`; caps `outerHTML`/selector length `:108`) + `interactive-renderer.tsx` |
| Read learner-visible interactive state as evidence | In: scope. Out: frozen observation or an explicit unavailable reason | Observation bridge | 8 named unavailable reasons incl. `timeout`, `cancelled`, `scope-changed`, `document-changed` | Before adapting to what the learner did | **UPSTREAM-WIRED.** `lib/interactive/{observation,observation-bridge,chat-observation}.ts` (32KB cap; protocol `maic:observation:read:v1`) |
| Pick / point at an element | In: click. Out: validated element ref | Element-ref store | Policy exclusion list | "Which one?" interactions | **UPSTREAM-WIRED.** `components/canvas/slide-element-pick-overlay.tsx`, `lib/interactive/element-reference-policy.ts` |
| Pause / replay / resume / speed | In: control events. Out: playback state | `lib/playback/engine.ts` (`idle\|playing\|paused\|live`) | `saveCursor`/`loadCursor` resume point | Learner pacing control | **UPSTREAM-WIRED.** `lib/playback/{engine,action-navigation,action-resume,auto-resume,cursor,derived-state}.ts`; controls `components/canvas/canvas-toolbar.tsx` (Play/Pause `:348`, speed `:280`) |
| Drag / scale / rotate / multi-select | In: pointer. Out: element geometry | Canvas store | — | Author-side and direct manipulation | **UPSTREAM-WIRED.** `components/slide-renderer/Editor/Canvas/hooks/` (`useDragElement`, `useScaleElement`, `useRotateElement`, `useMouseSelection`, `useDrop`, …) |

### 1.4 Check understanding

| Responsibility | In / Out | State owner | Cancellation | When to use | Status + source |
|---|---|---|---|---|---|
| Present a check and collect an answer | In: question. Out: learner answer | `quiz-view.tsx` 5-phase machine (`not_started→answering→submitting→grading→reviewing`, `:47`) | Generation token in `lib/quiz/view-state.ts` stops a stale async resolve painting | After explanation + learner action | **UPSTREAM-WIRED.** `components/scene-renderers/quiz-view.tsx`. Question types are **only** `single\|multiple\|short_answer` (`packages/@openmaic/dsl/src/stage.ts:196-214`) |
| Grade deterministically | In: answer + key. Out: correct/incorrect | Local, no model | n/a | Choice questions | **UPSTREAM-WIRED.** `lib/quiz/grading.ts` — order-insensitive `arraysEqual`; **exact/unique match only, no case folding or normalization** |
| Grade an open short answer | In: text + rubric. Out: `{score, comment}` | Server route | — | Short answer only | **UPSTREAM-WIRED.** `app/api/quiz-grade/route.ts` (strict JSON, validates positive finite `points`) |
| Record the attempt privately | In: attempt. Out: appended runtime record | RuntimeStore, partitioned by `getLearnerKey()` | `RuntimeAppendConflictError` handling | Every submission | **UPSTREAM-WIRED.** `lib/quiz/runtime.ts`, `lib/quiz/persistence.ts` (one-time legacy localStorage migration, then keys deleted) |
| End-of-lesson scorecard | In: scenes + choice results. Out: counts/pct | — | Snapshot-guarded | Lesson end | **UPSTREAM-WIRED.** `lib/classroom/complete-summary.ts` → `components/scene-renderers/classroom-complete.tsx`. **Counts are activity, never mastery.** |

`components/scene-renderers/quiz-renderer.tsx` is **UPSTREAM-ORPHAN** (zero importers; superseded by `quiz-view.tsx`) — do not build on it.

### 1.5 Learning artifacts

| Artifact | Status + source |
|---|---|
| `.pptx` deck | **UPSTREAM-WIRED.** `lib/export/use-export-pptx.ts` (vendored `packages/pptxgenjs`, `saveAs` `:1365`) |
| Resource-pack `.zip` (pptx + assets) | **UPSTREAM-WIRED.** same file, `buildResourcePackZip` `:1251` |
| Self-contained classroom `.zip` | **UPSTREAM-WIRED.** `lib/export/use-export-classroom.ts` (inlines interactive assets, bundles media + index) |
| Narration script `.md` | **UPSTREAM-WIRED.** `lib/export/use-export-script.ts:229,:256` |
| Narration script `.docx` | **UPSTREAM-WIRED.** same file `:173-177`, real OOXML via `docx` `Packer.toBlob` |
| Hyperframes project `.zip` → `.mp4` | **UPSTREAM-WIRED.** `lib/video-export-app/use-export-video.ts`; render service `render-service/src/main.ts` — **mp4 only** (`:223` rejects other formats) |
| Subtitles `.srt` / `.vtt` | **UPSTREAM-WIRED.** `lib/video-export/subtitles.ts:42,52` |
| **Flashcards** | **MISSING.** Exactly one occurrence repo-wide: `packages/@openmaic/generation/templates/game-content/system.md:36` — one brainstorm bullet ("Flashcard flip to reveal answers") inside an LLM prompt whose output is an interactive HTML scene. No card/deck model, no component, no scheduling. |
| **Worksheets** | **NO DEDICATED GENERATOR FOUND** (the narrow, accurate claim). `Worksheet` in `packages/pptxgenjs` is OOXML chart spreadsheet XML, not a handout. **Correction — the guardrail was previously overgeneralized.** `tests/pbl/v2/planner-prompt.test.ts:47-51` asserts only that the *PBL single-call planner prompt* hardens against **worksheet fragmentation** (splitting trivial mechanics into microtasks) and **answer leakage**; `packages/@openmaic/generation/prompts-pbl/planner-single-call-system.md:1-11` scopes itself to "a Project-Based Learning (PBL) course module" and lists worksheet fragmentation as mistake 2 *within a project design*. It does **not** prohibit separate worksheet artifacts elsewhere in the product. Keep the guardrail and its tests **unchanged**; building owner-requested worksheets as their own artifact needs **no permission decision or reconciliation** against this test. |
| **Study guides** | **MISSING.** One requirement string in an eval fixture (`eval/outline-language/scenarios/language-test-cases.json:301`). No generator/template/type/export. |
| **Podcasts** | **MISSING.** Per-scene TTS exists (`app/api/generate/tts`), a podcast artifact does not. `components/kaizen/ReadAloudNote.tsx:4-9` explicitly disclaims audio ("no `speechSynthesis`, no microphone and no audio of any kind… voice and podcasts come later") and `tests/kaizen-ui-course-request.test.ts:150-154` *enforces* that absence. The ~30 other `podcast` hits are Microsoft voice-catalog metadata in `lib/audio/azure.json` (`TailoredScenarios`), i.e. vendor suitability tags. |
| PDF output | **NO DEDICATED PEDAGOGICAL PDF EXPORT FOUND** (the narrow, accurate claim). `lib/pdf` is ingest-oriented (`README.md` titled "PDF 解析系统"; unpdf/MinerU/AliDocMind feeding `app/api/parse-pdf`). **Correction:** the earlier "no pdf-lib anywhere" claim is **false** — `classroom/package.json:128` declares `"pdf-lib": "^1.17.1"` and it is imported at `lib/server/agent-runtime/fetch-url.ts:358` (and `tests/agent-runtime/fetch-url.test.ts:16`). The dependency is present; only a learner-facing worksheet/study-guide PDF export is absent. |
| User-facing SVG download | **MISSING.** echarts `SVGRenderer` is on-screen only; `svg2base64`/`svg-path-parser` exist solely to embed into PPTX. |

**Closest shipping study artifacts today** are the narration script (`.md`/`.docx`) and the end-of-lesson scorecard. Neither is a flashcard deck, worksheet, study guide or podcast, and neither may be relabelled as one.

### 1.6 Voice and audio — later gate, inventoried now

| Responsibility | Status + source |
|---|---|
| Per-scene narration TTS | **UPSTREAM-WIRED.** `app/api/generate/tts/route.ts`; callers `components/agent/agent-bar.tsx:157,433`, `lib/hooks/use-discussion-tts.ts:254`, `lib/hooks/use-scene-generator.ts:342` (narration baked at generation time) |
| Narration playback + reading-time fallback | **UPSTREAM-WIRED.** `lib/playback/engine.ts` (`ttsSelection` `:51`, `detectSpeechLang` `:52`, timer when TTS off `:82`) |
| Learner speech → text | **UPSTREAM-WIRED.** `app/api/transcription/route.ts` ← `lib/hooks/use-audio-recorder.ts:73` ← `components/audio/speech-button.tsx:53` |
| Voice registration/clone | **UPSTREAM-WIRED but reachable only via the VoxCPM path** (`lib/audio/voxcpm-voices.ts:22`) |
| `app/api/azure-voices`, `lib/hooks/use-browser-asr.ts` | **UPSTREAM-ORPHAN** (no callers; only CHANGELOG/tests/an error string) |
| Realtime/streaming voice | **MISSING.** All voice is request/response POST. |
| Voice on the Kaizen surface | **MISSING by deliberate design right now** (`ReadAloudNote.tsx`). |

Voice stays a **later, separate gate**. It is not a blocker on the initial chat-first slice, and its absence must not be described as a defect in that slice.

---

## 2. Content-source posture (brief — research is a separate lane)

Owner direction: build on a **human-authored / human-curated reliable source base**; the model **selects and adapts** from it, with provenance, rights and quality recorded. **No bulk ingestion is authorized yet.**

Consequences for this lane only (the OER survey itself is owned by `sa-0-30a14caa` under `delivery/fullstack/research/oer-20261003/` — not duplicated here):

- Existing ingestion surfaces are `app/api/materials` (owner-scoped, sha256-metered, quota'd; sole caller `lib/workbench/session-store.ts:2188`), `app/api/extract-document` (called by `app/generation-preview/page.tsx:336`) and `app/api/web-search` (called `:439`). These are **per-request, owner-scoped** paths — not a corpus pipeline, and they must not be turned into one without explicit authorization.
- `lib/rag/*` (chunking, ingest, `InMemoryLexicalIndex`) is **UPSTREAM-ORPHAN** — importers are `tests/rag/*` only. There are **no embeddings and no vector store** anywhere in `lib/`, `app/` or `packages/@openmaic`; retrieval is lexical-only. Any claim of retrieval-grounded teaching today is false.
- A curated source entry carries, as content-level data (§3.1): origin, author/curator, licence/rights, retrieved-at, and an adaptation record when the tutor rewrites it. **AI selection and adaptation never overwrite the human-authored original, and an adapted derivative is never attributed to the original author.**
- Reusable worksheets/questions/flashcards/exams sourced this way are **content** (§3.1), while the *teaching decision* to use one is plan data (§3.2) and any learner's attempt at one is private (§3.3).

---

## 3. Teaching/data boundaries — three concepts, existing stores, no new infrastructure

Postgres via `@openmaic/storage` behind the single HTTP seam `app/api/persistence/[...path]/route.ts`, owner-scoped by `lib/server/identity/with-owner.ts` + `lib/persistence/owner-bound-document-store.ts`. **No new database, table family or service is introduced by this specification.**

### 3.1 Reusable content, sources and provenance — SHAREABLE

| Store | Holds |
|---|---|
`document_folders`, `document_stages`, `document_scenes`, `document_outlines` (`packages/@openmaic/storage/src/document/pg.ts`) | Courses, scenes, outlines |
`asset_blobs`, `asset_entries`, `document_asset_refs`, `asset_reference_tracking`, `document_asset_withdrawals` (`asset/pg.ts`) | Media bytes + reference/withdrawal tracking |
`agent_session_materials` (`material/pg.ts`) | Uploaded source material |
`lib/persistence/library.ts`, `lib/persistence/stage-meta.ts` (`STAGE_META_SCHEMA`, `claimStageMeta`, `markStageGenerationComplete`, `setStagePublished`, `tombstoneStageMeta`) | Library listing, publish state, generation-complete marker |
`delivery/LESSON_METADATA_CONTRACT.md` | Model provenance, measured timing, applied instructions, coarse `{browser, os, type}` |

Admitted here: lesson/course content, curated source references with licence and retrieval provenance, generation provenance, publish state.
**Excluded here, without exception:** nickname, learner conversation text, learner typed answers, learner attempt outcomes.

### 3.2 Versioned teaching plan — objectives, prerequisites, instructions — SHAREABLE, VERSIONED

| Store | Holds |
|---|---|
`document_outlines` | The ordered plan |
`document_stage_revision`, `document_scene_revision` | The version spine (`revision` in the `lessonId`/`turnId`/`revision` triple) |
`stage-meta` (`STAGE_META_SCHEMA`) | Applied teaching instructions and generation lifecycle |
`lib/kaizen/client/course-request.ts` | Topic + teaching directive + age/language at request time (`TOPIC_SEEDS` there are 12 prompt seeds, **not** a catalogue) |

Objective ids declared here are what §4 `QG-S6` matches checks against. A plan change is a **new revision**, never an in-place edit, so that an attempt recorded in §3.3 stays attributable to the plan version the learner actually saw.

### 3.3 Private learner record — attempts, assistance, misconceptions, next practice — NEVER SHAREABLE

| Store | Holds |
|---|---|
RuntimeStore via `lib/quiz/runtime.ts`, partitioned by `getLearnerKey()` (issued at `GET /api/persistence/learner-key`, `route.ts:63-70`) | `QuizAttemptPayload` v1 attempt records |
`agent_sessions`, `agent_session_events`, `agent_session_entries` (`agent-session/pg.ts`) | Session/turn event history |
`components/kaizen/use-kaizen-profile.ts` | **Nickname — one `localStorage` key, device-local, never sent to a provider, never a cache key** |
`lib/device-storage/database.ts` (Dexie `maic-device-cache`) | Device-local **cache only** (narration/media copies, PDF page images, editor undo, voice profiles) |

Rules:
- Evidenced misconceptions are derived **only** from recorded attempts and assistance, with the evidence retained. No emotion inference, no attention inference, no engagement targets, no hidden collection.
- Assistance received and independent correct answers are stored and displayed **distinctly**. An answer reached after a hint is never recorded as an independent one.
- "Next practice" is a **proposal attached to the private record**, never a mastery claim and never promoted into §3.1 or §3.2.
- Generated answer keys can be wrong; a disagreement between learner and key is evidence to review, not automatic learner error.
- `app/kaizen/me/page.tsx` currently refuses to show progress/streak/mastery because nothing backs them. **Keep that refusal** until §4 real-user gates pass.

### 3.4 Camera and future input — direction only

Camera is **OFF now** and no attention/affect signal is collected, scored or inferred. The owner has recorded camera input as **future direction only**. When it is designed it requires, as explicit prerequisites: a visible signal, opt-in consent, a stated retention boundary, a non-camera equivalent path, and validation — and **attention is never treated as evidence of learning**. Nothing in the current slice may activate, request or prepare camera access.

---

## 4. Per-lesson quality workflow and gates

### 4.1 The workflow a lesson must pass

```
declared objective + prerequisite
  → one small coherent lesson (not a topic dump)
    → an accurate, genuinely explanatory visual
      → a real learner action
        → a check that tests THAT objective
          → adapt from the recorded result
```

Each arrow is a gate. A lesson that fails any arrow is **rejected and not published** — see §4.5.

### 4.2 Tier S — structural, machine-checkable

| Gate | Check | Source of the contract |
|---|---|---|
`QG-S1` schema validity | Scene type ∈ `slide\|quiz\|interactive\|pbl`; required fields present; no placeholder/TODO/lorem/empty-string content | `packages/@openmaic/dsl/src/stage.ts:22` |
`QG-S2` visual presence | Every teaching scene carries ≥1 non-text explanatory element (chart, whiteboard draw op, interactive). **Prose, bullets, headings, and text rasterised into an image do not count** | `PRODUCT.md` "Theater over text"; `lib/action/engine.ts:234-283` |
`QG-S3` anti-generic-visual | Reject N repeated identical primitives standing in for a structured concept. Where the concept states per-group counts, the rendered groups must match them | The recorded 11-dot electron-shell fallback is a **defect**, not a near-miss |
`QG-S4` language integrity | Explanations, instructions and UI chrome in the requested locale (EN/ES); no accidental mixed-language scene. **Explicit exception:** for a language-learning subject, the **target language being taught** is legitimate learner-visible content — vocabulary, example sentences, dialogue and exercise prompts in that language must **not** fail this gate as long as the surrounding explanation/UI is in the requested locale. Do not fail all bilingual subject content. | EN/ES requirement |
`QG-S5` learner action present | ≥1 quiz / interactive / PBL turn per lesson | §1.3, §1.4 |
`QG-S6` check maps to objective | Every question tests the lesson's stated objective rather than an incidental skill. **Correction:** the current stage schema carries **no objective-id field**, so this gate must be checked against the objective as the lesson states it (title/description/keyPoints), not against invented mandatory objective IDs. Do not require a schema field that does not exist. | §3.2 |
`QG-S7` answer key resolvable | Each choice key resolves to exactly one option **under the real grader's exact/unique-match contract** — no case folding, no normalization. An unresolvable key is an invalid lesson, not a UI bug | `lib/quiz/grading.ts` |
`QG-S8` accessible backup present | Caption/transcript for spoken output; accessible description for every visual; keyboard + click-only equivalent for every manipulation | `PRODUCT.md` Accessibility |

### 4.3 Tier E — educational judgment

**Scope correction.** Tier E gates a **public / catalogue-published / quality-claimed** lesson. They are **not** a mandatory human sign-off on every privately generated draft — that requirement was never the owner's instruction and is withdrawn here. The owner asked for *quality* and prefers a human-authored / human-curated source base; that is satisfied by keeping these checks robust, not by blocking a learner's or owner's private draft from being saved and opened. An **automated** educational review may stand in for triage on the private path, but its output is an **uncertain signal, not proof of quality**; an invalid generation is still rejected (§4.5).

| Gate | Judgment |
|---|---|
`QG-E1` correctness | Content **and** answer key are factually correct |
`QG-E2` coherence | Prerequisite → one objective → explanation → action → check, in a sequence a learner can follow; small, not a dump |
`QG-E3` visual relevance | The visual explains **this** concept. Decorative, generic or merely-present visuals fail, including ones that pass `QG-S2`/`QG-S3` |
`QG-E4` age/vocabulary suitability | Appropriate for the self-reported age without being condescending at any age |
`QG-E5` latest-question responsiveness | The tutor answered the actual newest question before resuming the plan |

A Tier-S pass is **never** reported as lesson quality. Tier S only establishes that the artifact is well-formed enough to be worth a human reading.

### 4.4 Tier R — real-user evidence (deferred; NOT blockers on the chat-first slice)

`QG-R1` low-literacy navigation and comprehension with real learners (`FS-D05`–`FS-D07`) · `QG-R2` real-device spoken interaction · `QG-R3` educational efficacy.

Standing rule: **no mastery claim from completion, from a thumbs-up, or from a Tier-S/Tier-E pass.** Thumbs are *reported helpfulness*. These three gates remain open and are not weakened by any chat-first progress.

### 4.5 Reject, do not badge

A generation that fails Tier S, or that an educational review fails on Tier E, is **discarded or held as failed**. It is never published to the catalogue, never marked ready, and never shown with a quality badge. A failed or malformed generation is not a lesson (`DIRECTION.md`). Absence of a check is reported as absence — never as a pass.

**Private draft vs public lesson (correction).** These are different states and must not be collapsed:

- **Private saved draft / `generated_complete`.** `markStageGenerationComplete` (`lib/persistence/stage-meta.ts`) records only that *generation finished*. It is **not** a human sign-off and must not be redefined as one. A learner's or owner's own draft may be saved and reopened without a human reviewer in the loop; structural (Tier S) rejection of invalid output still applies.
- **Publicly published / quality-claimed.** `setStagePublished` plus any public quality claim or ready badge **does** require the appropriate human evidence recorded against Tier E. Keep that bar.

Truthful learner-facing records — attempts made, assistance used, growth over time — are **not** quality claims and must **not** be suppressed pending real-user efficacy evidence (Tier R). What stays prohibited is a **false mastery claim** (§4.4).

### 4.6 Initial finite quality test set (12 cases)

Fixed set, deliberately small, spanning math / non-math × EN / ES × age 7 / adult, and pinning the two named defects.

| id | Lang | Age | Domain | Request | What must be true |
|---|---|---|---|---|---|
`QT-01` | EN | 7 | math | Count by 5s to 30 | Structured grouping (5-groups / number line), **not** 30 undifferentiated dots — `QG-S3` |
`QT-02` | ES | 7 | math | Sumar 7 + 5 llevando | Regrouping shown structurally (ten-frame / número recta); all strings ES — `QG-S3`,`QG-S4` |
`QT-03` | EN | adult | science | Why does the first shell hold 2 electrons and the second 8? | **The pinned defect case.** Distinct shells, visibly separated, with per-shell counts that match whatever model the lesson states. **11 generic undifferentiated dots is an automatic FAIL** — `QG-S3`,`QG-E3`. **Wording caveat (corrected):** "shells hold 2, then 8, then 8" is **not** a general rule and must not be the golden assertion. Maximum shell capacity is `2n²` → **2, 8, 18, 32**; the "2, 8, 8" sequence describes only the *filling order* of the first 20 elements (Ar→Ca), where 4s fills before 3d. A test may validate the simplified first-20-element filling pattern **only if the lesson scopes it that way**, and must carry that caveat. A golden test must never encode a factual misconception. |
`QT-04` | ES | adult | science | ¿Por qué la Luna tiene fases? | Positional/geometric relationship, not a labelled picture of phases — `QG-E3` |
`QT-05` | EN | 7 | non-math | What does a plant need to grow? | Operable and understandable **without fluent reading**; non-text affordance alongside text — `QG-S8` |
`QT-06` | EN | adult | math | What is a derivative, intuitively? | Slope-of-a-curve visual; prose explanation alone FAILS — `QG-S2`,`QG-E3` |
`QT-07` | EN | 7→any | adaptation | Mid-lesson: "wait, why isn't 0 positive?" | Next turn answers **that** question first, then resumes — `QG-E5` (`lib/chat/pi/prompts.ts:533`) |
`QT-08` | ES | adult | adaptation | Mid-lesson: "espera, no entendí el paso 2" | Response targets **step 2 specifically**, in ES — `QG-E5`,`QG-S4` |
`QT-09` | EN | adult | non-math | How does a bill become law? | Ordered sequence/flow with visible order — exercises the §1.2 **diagram pipeline** (generation → `diagram-content` → interactive iframe host). A text-only slide substitution is still a FAIL; a pass requires actual connected nodes/edges with visible ordering. |
`QT-10` | ES | 7 | math | Word problem with a stated objective | The check tests the stated objective, not an incidental skill — `QG-S6` |
`QT-11` | EN | 7 | negative | Deliberately invalid generation (empty scene / unresolvable answer key) | **Rejected, not published, no ready badge** — `QG-S1`,`QG-S7`,§4.5 |
`QT-12` | ES | adult | negative | Locale integrity under an ES request | No mixed-language learner-visible string anywhere in the lesson — `QG-S4` |

`QT-09` is the acceptance pressure on the **existing** diagram pipeline (§1.2), not evidence of a missing renderer. The pipeline (generation `case 'diagram'` → `diagram-content` prompt → shared `InteractiveIframeHost`) exists; what is unverified is live visual quality, safety and factual accuracy. A pass must not be claimed by substituting a text slide, and a failure here is a **quality** finding against that pipeline — it is not evidence that a new diagram engine is required.

### 4.7 What this set does not cover

Voice output/input quality, real-device microphone behaviour, low-literacy efficacy, long-run retention, non-EN/ES languages, ages other than 7 and adult, and PBL project quality. Those remain uncovered and are reported as uncovered.

---

## 5. Immediate sequencing consequences

1. **Lesson quality first.** Generation (`app/generation-preview/page.tsx` → `scene-outlines-stream` → `scene-content` → `scene-actions`) with §4 Tier S + Tier E applied before any lesson reaches the catalogue (`GET /api/stages`, which 404s without `DATABASE_URL`).
2. **Contextual chat second**, on the Pi path only (`app/api/chat/pi`), proving `QG-E5` / `QT-07` / `QT-08`.
3. **Diagrams third**, against the **existing** pipeline: `case 'diagram'` → `diagram-content` prompt (connected SVG nodes/edges/`revealOrder`, required widget `postMessage`) → shared `InteractiveIframeHost`, plus echarts charts and whiteboard ops as alternatives. `QT-03`/`QT-09` are quality acceptance pressure on that pipeline. No new diagram engine is called for, and no test is expected to fail merely because there is no dedicated React diagram component.
4. **Voice later**, as its own gate (§1.6). Not a blocker now.
5. **Podcasts, flashcards, worksheets, study guides stay roadmap** (§1.5) — no dedicated generator found for any of them. Worksheets carry **no** blocking guardrail conflict (see §1.5 correction): the PBL planner test is scoped to project-task fragmentation, so owner-requested worksheets can be built as separate artifacts without a permission decision. The `ReadAloudNote` audio disclaimer belongs to the **new Kaizen** surface, not upstream OpenMAIC; a temporary absence of Kaizen voice does not establish an upstream prohibition on podcasts.
6. Nothing above is integrated or behaviourally proven. `classroom/` is **installed and bootable** (loopback `127.0.0.1:51206` live; the `*:51208` instance was stopped at 23:21Z — `delivery/fullstack/NATIVE_CORRECTION_DECISION_20261003T2321Z.md`); the earlier "uninstalled, unbooted" wording is historical. A boot is **not** a live capability pass: unauthorized effort reduction and a `stage_used: null` / Chinese chat probe are open against it. No `FS-*` row is closed by this document.
