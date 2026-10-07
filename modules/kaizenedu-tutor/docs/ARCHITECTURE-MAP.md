# Architecture map — OpenMAIC v1.0.0 as the Natural Tutor engine

Snapshot: upstream `THU-MAIC/OpenMAIC` `main` at commit `6334e9a` (v1.0.0 plus the 2026-09 CVE dependency bumps), merged into this repo on 2026-09-04. Every file path below is relative to the repo root and was read, not inferred. Verdicts: **KEEP** (use as-is), **PATCH** (small edit with a `// KAIZEN:` comment), **STRIP** (delete or flag off under `TUTOR_MODE`). Spec references are to `docs/SPEC.md`.

Baseline on the merged tree in this environment: `npx tsc --noEmit` clean in 76 s; `pnpm test` 7,317 passed, 81 skipped, 1 failed (`tests/media/stage-realm-presence.test.ts`, passes when run alone; CPU-contention flake that upstream's own CI comments mention).

## 0. The findings that shape the plan

1. **There is no voice turn in OpenMAIC.** The microphone is a text-input helper: `components/audio/speech-button.tsx` records with `MediaRecorder`, uploads the whole clip to `/api/transcription`, and pastes the transcript into a textarea; a human presses Send. TTS is one buffered request per agent turn returning base64 JSON (`app/api/generate/tts/route.ts:155`), played through `new Audio(dataUrl)`. There is no VAD, no streaming ASR, no streaming TTS, no Web Audio playback, no AudioWorklet, no echo cancellation constraint (`lib/hooks/use-audio-recorder.ts:223`), and not one `performance.mark` on the audio path. Spec R1/§5.3 is therefore new code that reuses the provider layer and one good playback queue (`lib/hooks/use-discussion-tts.ts`), not a tuning job.
2. **Two chat runtimes exist; the pi one is the right base for a tutor.** `/api/chat` runs a LangGraph graph that does at most one director→agent cycle per HTTP request and asks the model for a JSON array of text and actions (`lib/orchestration/director-graph.ts`, `stateless-generate.ts`). With one agent the director is pure code, so a tutor turn is exactly one streamed LLM call. `/api/chat/pi` (flag `NEXT_PUBLIC_PI_CHAT_ENABLED`) runs the whole turn server-side with provider-native tool calls, explicit `cue_user`/`close_session` terminal tools, and context compaction (`lib/chat/pi/director-loop.ts`, `lib/agent/runtime/*`). One request per utterance and no JSON-array parsing is what a voice loop needs.
3. **Whiteboard actions already stream during a chat turn** (`components/chat/use-chat-sessions.ts:1016-1032` executes `action` SSE events as they arrive), but every `wb_*` executor sleeps for its animation (`lib/action/engine.ts:455-857`, `await delay(WB_*_MS)`), only `play_video` honours `AbortSignal` (`:357-433`), and there is no stroke or highlight primitive. The canvas itself (`components/whiteboard/whiteboard-canvas.tsx`) is prop-driven and accepts new elements mid-animation.
4. **There is no tenancy.** Identity is an anonymous UUID cookie (`lib/server/agent-runtime/owner.ts:52-65`); the persistence route uses a bearer token compiled into the browser bundle (`lib/persistence/server-auth.ts`); document reads are deliberately unscoped (`lib/persistence/owner-bound-document-store.ts:195`, `lib/persistence/document-access.ts:70-74`); classroom audio and media are served with no authentication (`app/api/classroom-media/[classroomId]/[...path]/route.ts`). Spec R6 is a real rewrite of two functions plus schema columns, not a config change.
5. **Provider credentials can come from the client on 17 code paths**, all funnelling through `lib/server/provider-config.ts:603-621` (managed provider → server key wins; unmanaged → client key) and `lib/server/resolve-model.ts:166-171` (`x-model`, `x-api-key`, `x-base-url`, `x-provider-type`). Lock-down (R8) is deleting the unmanaged branch and letting TypeScript list the call sites. Usage accounting exists (`lib/server/usage-storage.ts`) but has no cost field, no session or turn id, and never records ASR seconds (`app/api/transcription/route.ts` has no usage call).
6. **The UI is seven page routes, not fifty screens.** The "screens" are panels inside `app/page.tsx` (1,896 lines), `components/edit/PlaybackChromeRoot.tsx` (1,849 lines) and `components/roundtable/index.tsx` (2,189 lines). A 1:1 session needs roughly 40 files transitively, plus `components/slide-renderer/**` and `components/ui/**`.

## 1. Layers (spec §8.1 → files)

| Spec layer | Where it lives today | What we add |
| --- | --- | --- |
| Parent app | nothing | `app/(parent)/**` (spec R5, R7, R11, R16) |
| Learner app | `app/classroom/[id]/page.tsx` → `components/stage.tsx` → `components/edit/PlaybackChromeRoot.tsx` | `app/(learner)/session/[id]` with `components/tutor/**` (call layout, `AvatarDriver`, dock) embedding `components/whiteboard/**` and `components/chat/**` |
| Tutor orchestrator | split across `lib/orchestration`, `lib/chat/pi`, `lib/buffer/stream-buffer.ts`, `components/chat/use-chat-sessions.ts` | `lib/tutor/**`: session state machine, student model, skill graph, adaptation, recovery ladder, safety, routing, cost accounting |
| OpenMAIC-derived | `lib/playback`, `lib/action`, `lib/audio`, `lib/ai`, `lib/whiteboard`, `components/whiteboard`, `components/chat`, `app/api/chat`, `app/api/quiz-grade`, `app/api/parse-pdf`, `app/api/extract-document`, `app/api/transcription`, `packages/@openmaic/{dsl,storage,renderer}` | patches only, each with a `// KAIZEN:` comment |
| Commodity infra | Postgres via `@openmaic/storage` (`pg`), S3-compatible assets, local disk for classrooms | Clerk, Stripe, PostHog, Sentry, Resend, Neon, R2 |

### Conventions this map fixes

- **Product URL prefixes:** `/session`, `/learn`, `/parent`, `/api/tutor`, `/api/parent` (`kaizen.config.ts` `PRODUCT_ROUTE_PREFIXES`). Route groups do not appear in URLs, so product API routes live at `app/(learner)/api/tutor/**` and `app/(parent)/api/parent/**`; that keeps every product file inside the allowed paths in `CLAUDE.md`.
- **`TUTOR_MODE`** is server-only, read through `kaizen.config.ts` `isTutorMode()`, enforced in `middleware.ts` (product prefixes answer 404 when off) and again in each product layout and route handler. `NEXT_PUBLIC_TUTOR_MODE` only hides upstream affordances in the client bundle.
- **Model stages for the tutor** are added to `LLM_STAGES` (`lib/server/model-routes.ts:131`) as `tutor-live-turn`, `tutor-diagnose`, `tutor-grade`, `tutor-summary`, `tutor-model-update`, `tutor-problem-extract`, so `MODEL_ROUTES` picks the fast model for the live turn and the stronger one for grading (spec §8.4) with no code change.
- **Product persistence** adds tables beside OpenMAIC's in the same schema (spec §8.5), with `account_id` as the hard boundary and Postgres row-level security as the second fence (see §2.4).

## 2. Area by area

### 2.1 Orchestration and chat SSE (`lib/orchestration`, `app/api/chat`, `lib/chat`, `lib/prompts`, `lib/agent`)

**What it does.** `POST /api/chat` (`app/api/chat/route.ts`) validates `messages`, `storeState`, `config.agentIds`, resolves the model for stage `chat-adapter`, opens a `TransformStream`, and pumps `statelessGenerate` into `data: {json}\n\n` SSE with a 15 s heartbeat. Events, in order for a single-agent turn: `thinking` → `agent_start` → interleaved `text_delta` / `action` → `agent_end` → `done`; a second request yields `cue_user` (`lib/orchestration/director-graph.ts:118-132`). The agent system prompt is `lib/prompts/templates/agent-system/system.md` assembled by `lib/orchestration/prompt-builder.ts:126`; the "Responding to the User's Turn" block (`system.md:54-69`) and the 7-line `lib/prompts/snippets/speech-guidelines.md` are the two pieces of prompt worth keeping verbatim. Model precedence is stage route > client `model` > `DEFAULT_MODEL` (`lib/server/resolve-model.ts:56-67`); chat defaults thinking to disabled (`route.ts:127`).

**Entry points.** `app/api/chat/route.ts:44` `POST`; `lib/orchestration/stateless-generate.ts:392` `statelessGenerate`; `lib/orchestration/director-graph.ts:484` `createOrchestrationGraph`; `app/api/chat/pi/route.ts` and `lib/chat/pi/director-loop.ts:29` `runPiDirectorLoop`; client driver `lib/chat/agent-loop.ts:154` and `components/chat/use-chat-sessions.ts`.

**Stores.** None server-side (stateless by design; `directorState` round-trips through the client). Client: `useStageStore`, `useAgentRegistry` (`lib/orchestration/registry/store.ts`, three hard-coded default agents).

**Content logging to fix before beta (spec §8.5, CLAUDE.md logs rule).** `components/chat/use-chat-sessions.ts:1872` logs the first 50 characters of every learner message at `info`; `lib/orchestration/director-graph.ts:185` logs the director's raw completion at `info`. Both become id-only under `TUTOR_MODE`.

| File | Verdict | Note |
| --- | --- | --- |
| `app/api/chat/pi/route.ts`, `lib/chat/pi/director-loop.ts` | PATCH | The tutor loop base. Remove the multi-agent roster checks and the `call_agent` indirection; the tutor speaks directly. Keep abort handling, heartbeat, terminal `done`. |
| `lib/chat/pi/tools/cue-user.ts`, `close-session.ts`, `web-search.ts` | KEEP / PATCH | `cue_user` = "stop talking, open the mic". Retune `endReason` for tutoring. |
| `lib/chat/pi/prompts.ts` | PATCH | Keep `sanitizeVisibleSpeech` (`:427`) and `toHistoryMessages` (`:545`); delete the character hard caps (`:300-322`, `:519-527`). |
| `lib/chat/pi/director-compaction.ts` | KEEP | Long sessions need it. |
| `lib/agent/runtime/*` (`build-agent`, `stream-fn`, `run-native-child`, `allowlist`, `provider-metadata`) | KEEP / PATCH | The clean pi harness seam. `tool-timeout.ts:29` default 10 min → ~10 s for a live turn; `quota.ts` is a stub → wire to the per-learner cap (R9). |
| `app/api/chat/route.ts` | PATCH | Fallback runtime. Make `storeState` optional; drop the `agentIds` requirement. |
| `lib/orchestration/stateless-generate.ts` | PATCH | Keep only if the LangGraph path stays as fallback. |
| `lib/orchestration/director-graph.ts`, `director-prompt.ts`, `summarizers/{conversation-summary,peer-context,whiteboard-ledger,whiteboard-conflicts,code-line-budget}.ts`, `registry/agent-selection.ts`, `lib/chat/agent-loop.ts` | STRIP | Exist to route between agents. |
| `lib/orchestration/prompt-builder.ts`, `tool-schemas.ts`, `registry/{types,store}.ts`, `summarizers/{state-context,message-converter}.ts` | PATCH | One role; `getEffectiveActions` (`tool-schemas.ts:17`) must filter slide-only actions when there is no scene. |
| `lib/prompts/{index,loader,types}.ts`, `snippets/speech-guidelines.md`, `templates/agent-system/system.md` | KEEP / PATCH | Loader is `fs`-based: server only. Rewrite the template for one tutor. |
| `lib/prompts/templates/director/**`, `agent-system-wb-{assistant,student}/**`, `*-outlines/**`, `snippets/{action-types,element-types}.md` | STRIP | Multi-agent and course generation. |
| `lib/chat/pi/tools/{call-agent,classroom-actions,native-spotlight,read-scene}.ts`, `element-reference.ts`, `whiteboard-visibility.ts`, `app/api/chat/pi/whiteboard-visibility/route.ts` | STRIP | Slides and delegation. `native-whiteboard.ts` (1,113 lines) is flagged, not deleted: its idempotent, sequence-checked writes are the model for a durable board if we ever need one. |
| `lib/classroom/{load-classroom,stage-meta-client,stage-ownership-signal,progressive-load-policy}.ts` | KEEP / PATCH | Load pipeline for the session route; strip the agent-roster restore. |
| `lib/classroom/pbl-fallback-hydration.ts`, `lib/live/server-api.ts` | STRIP / KEEP | `lib/live` is a course-rename helper despite its name. |

### 2.2 Playback, action engine, whiteboard (`lib/playback`, `lib/action`, `lib/choreography`, `lib/whiteboard`, `components/whiteboard`, `components/canvas`, `packages/@openmaic/dsl`)

**What it does.** The action vocabulary is `packages/@openmaic/dsl/src/action.ts` (23 types since 0.12.0; 14 `wb_*`: `wb_open`, `wb_draw_text`, `wb_draw_shape`, `wb_draw_chart`, `wb_draw_latex`, `wb_draw_table`, `wb_draw_line`, `wb_stroke`, `wb_highlight`, `wb_draw_code`, `wb_edit_code`, `wb_clear`, `wb_delete`, `wb_close`). `lib/action/engine.ts` turns one action into store mutations (KaTeX is rendered at execution time, `:574-596`; text that looks like math is auto-routed to `wb_draw_latex`, `:97-115`). `lib/playback/engine.ts` walks pre-generated `Scene[]` and is a lecture player; the streaming rail is `lib/buffer/stream-buffer.ts` (incremental push, paced reveal at 30 ms per character, `:208-209`), fed by SSE and draining into `ActionEngine` from `use-chat-sessions.ts:1016-1032`. The canvas is DOM/React with absolutely positioned elements on a 1000 × 562.5 logical sheet (`whiteboard-canvas.tsx:403-408`), fade/scale enter animations, pan and zoom; it takes `whiteboard?: Whiteboard | null` as a prop (`:388-391`).

**Blockers for "draw while talking" (spec R2).** (1) every `wb_*` executor sleeps its animation duration, so five elements cost about four seconds of dead air; (2) `AbortSignal` is ignored by all `wb_*` executors, so barge-in cannot cancel a drawing; (3) there is no freehand stroke or bounding-box highlight action. Resolution (D34, 2026-09-06): the product does not run these executors at all, its board is the synchronous reducer in `components/tutor/board/reducer.ts`, and (3) is closed in the DSL itself.

| File | Verdict | Note |
| --- | --- | --- |
| `components/whiteboard/whiteboard-canvas.tsx` | KEEP | Strongest asset in the tree; inject `whiteboard` by prop. |
| `components/whiteboard/index.tsx` | PATCH | Persistent tile, not a modal overlay; one state source. |
| `components/whiteboard/whiteboard-history.tsx` | STRIP | Manual snapshots. |
| `lib/action/engine.ts` | KEEP (not patched, D34) | The product never executes through it: `components/tutor/board/reducer.ts` applies a `wb_*` action the frame it arrives and has nothing to cancel. The sleeping executors only serve the classroom, which the fence keeps off while the product is on. |
| `packages/@openmaic/dsl/src/action.ts`, `validate.ts` | PATCHED 2026-09-06 | `wb_stroke {points, color, width}` and `wb_highlight {targetId or x, y, width, height; color, opacity}` shipped in 0.12.0 with the version bump `CONTRIBUTING.md` asks for. `discussion` and `widget_*` stay: the product never emits them and a deletion would only cost merges. |
| `lib/buffer/stream-buffer.ts` | KEEP (not patched, D34) | Sentence sealing lives on the server in `lib/tutor/voice/sentence-splitter.ts`, which the turn engine and the client's turn controller both use; the buffer only serves the classroom. |
| `lib/whiteboard/runtime/{types,fold,validate,browser-projection}.ts`, `lib/whiteboard/viewport.ts` | KEEP | Pure, append-only board log; ideal for replay and the parent transcript. |
| `lib/whiteboard/runtime/store.ts` | PATCH | Relax per-write `expectedLastSeq` for a chatty single writer. |
| `lib/whiteboard/runtime/legacy-import.ts` | STRIP | |
| `lib/choreography/timing.ts` | PATCH | Keep `estimateSpeechDurationMs` and the `WB_*_MS` values as animation hints, not blocking durations. |
| `lib/choreography/{cursor,timeline}.ts`, `descriptors/**` | STRIP | Video export and slide effects. |
| `lib/playback/engine.ts` | STRIP after harvesting | Port the generation token (`:493-500`), the "set mode before stopping audio" ordering in `handleUserInterrupt` (`:459-467`), and `splitIntoChunks` (`:757-768`) into `lib/tutor`. |
| `lib/playback/{action-navigation,action-resume,cursor,derived-state,auto-resume}.ts` | STRIP | Lecture scrubbing and resume. |
| `components/canvas/canvas-area.tsx` | PATCH | Keep `StageViewport` (16:9 contain-fit) and the whiteboard layering. |
| `components/canvas/canvas-toolbar.tsx`, `slide-element-pick-overlay.tsx`, `components/stage/**`, `components/stage.tsx`, `lib/interactive/**` | STRIP | Slide transport, deck rail, export menus. |
| `lib/prompts/snippets/whiteboard-reference.md`, `templates/agent-system-wb-teacher/system.md` | KEEP / PATCH | The coordinate and layout reference is reused; the teacher discipline rules are rewritten for one tutor. |

### 2.3 Audio: TTS, ASR, recorder (`lib/audio`, `app/api/transcription`, `app/api/generate/tts`, `components/audio`, `lib/hooks`)

**What it does.** `generateTTS(config, text) → {audio: Uint8Array, format}` (`lib/audio/tts-providers.ts:111-114`) over nine providers, every one buffered with `await response.arrayBuffer()`; `transcribeAudio(config, Buffer | Blob) → {text}` (`lib/audio/asr-providers.ts:157-167`) over six providers, every one a whole-clip upload. No provider returns word timestamps or visemes (`lib/video-export/split-cue.ts:11-13` says so outright). Browser-native ASR does not exist on iOS Safari, and it is the default (`lib/store/settings.ts:499`). The recorder is `MediaRecorder` with no `timeslice` (`use-audio-recorder.ts:254`) and no echo cancellation.

**What to reuse.** `lib/hooks/use-discussion-tts.ts` queue and its `cleanup()` (`:406-421`: abort the in-flight fetch, stop the element, drop the backlog) is a correct barge-in primitive at turn granularity. `lib/audio/tts-utils.ts:21` `splitLongSpeechText` is a usable sentence splitter. `lib/audio/audio-duration.ts` parses WAV/MP3 duration with no DOM. `app/api/transcription/route.ts` never writes the audio anywhere (invariant b holds today on this path); `lib/server/classroom-media-generation.ts:316` does write TTS files to `data/classrooms/<id>/audio/` and is stripped.

| File | Verdict | Note |
| --- | --- | --- |
| `lib/audio/types.ts`, `constants.ts`, `tts-providers.ts`, `asr-providers.ts` | PATCH | Add a streaming sibling contract (`TTSStreamResult {stream, format}`); Doubao (`tts-providers.ts:1058`, frames already chunked) and OpenAI (`:303`) are the cheapest conversions. Trim the roster to the providers spike-05 picks. |
| `app/api/generate/tts/route.ts` | PATCH | Return a `Response(stream)` with `audio/*` instead of base64 JSON (`:155-157`). Keep the managed-provider and SSRF logic (`:71-119`). Remove `ttsApiKey`/`ttsBaseUrl` from the body. |
| `app/api/transcription/route.ts` | PATCH | Keep the no-persistence property. Remove form `apiKey`/`baseUrl`. Add the missing ASR usage record after `:79`. Add a streaming sibling when spike-05 picks a real-time ASR. |
| `lib/hooks/use-audio-recorder.ts` | PATCH | `getUserMedia({audio: {echoCancellation, noiseSuppression, autoGainControl}})`; expose the `MediaStream` for VAD; `start(250)`. |
| `lib/hooks/use-discussion-tts.ts` | PATCH | Port to a Web Audio queue with sentence-sized items in `lib/tutor/voice`. |
| `lib/hooks/use-browser-asr.ts`, `use-browser-tts.ts`, `use-asr-available.ts`, `lib/utils/audio-player.ts` | KEEP / PATCH | Only `use-browser-asr` supports interim results; it has no callers. |
| `lib/buffer/stream-buffer.ts:208-209`, `components/chat/use-chat-sessions.ts:906` | PATCH | Typewriter pacing and the 1.2 s post-text dwell are off in voice mode. |
| `components/audio/speech-button.tsx` | PATCH | Pointer-down push-to-talk and a VAD-driven hands-free mode. |
| `lib/audio/{voice-resolver,voice-catalog,voice-design,voice-registration*,qwen-voice-clone*,unavailable-voice-bindings,regenerate-speech-tts}.ts`, `azure.json`, `app/api/generate/voice/route.ts`, `app/api/azure-voices/route.ts` | STRIP | Per-agent voice rosters and cloning; spec D3 and §11.1 (no cloning). `voxcpm*.ts` stays flagged for R20. |
| `lib/audio/{tts-utils,audio-duration,json-stream,wav-utils,wav-validate,provider-enablement,asr-enablement,provider-display}.ts` | KEEP | |

New under `lib/tutor/voice/`: `sentence-splitter.ts`, `audio-context.ts` (single `AudioContext` created in a user gesture, `unlock()` and `ensureRunning()` for iOS), `playback-queue.ts` (Web Audio, `stop({fadeMs: 20})` is the barge-in), `tts-stream-client.ts`, `vad.ts` (`@ricky0123/vad-web`), `asr-stream-client.ts`, and `turn-controller.ts` (`idle → listening → thinking → speaking`, with `performance.mark` at every transition).

### 2.4 Persistence, storage, auth (`lib/persistence`, `packages/@openmaic/storage`, `app/api/persistence`, `app/api/stages`, `app/api/classroom*`, `lib/server`)

**What it does.** `@openmaic/storage` (0.28.1) provides `DocumentStore`, `RuntimeStore`, `AssetStore`, KV, agent-session, material, and skill stores over any `{query}`-shaped Postgres client, with idempotent `ensure*Schema` DDL run on first request (`lib/persistence/server-provider.ts:43-47`). Tables: `document_folders`, `document_stages` (JSONB `data`, nullable `owner_id`), `document_scenes`, `document_outlines`, revision companions with `pg_notify` triggers, `runtime_sessions` (`learner_key`), `runtime_records`, `asset_blobs` (content-addressed, shared), `asset_entries` (`principal`), plus app-side `stage_meta` (`owner_id`, `is_public`, `deleted_at`) and `owner_material`. Client mode (default) is IndexedDB; `NEXT_PUBLIC_PERSISTENCE=1` swaps documents and runtime to `/api/persistence`. Learner transcripts live in `runtime_sessions` kind `chat` + `runtime_records` JSONB; no learner audio is persisted anywhere; TTS bytes are cached client-side in Dexie `audioFiles.blob` in browser-only mode.

**Identity today.** Two unrelated mechanisms: `resolveRequestOwnerId` mints `anon:<uuid>` in an HttpOnly cookie and accepts any well-formed value back (`lib/server/agent-runtime/owner.ts:52-65`; its unused `authenticatedOwnerId` parameter is the Clerk seam); `server-auth.ts` compares a shared bearer token and maps every caller to the asset partition `'shared'` (`:26`). Reads of `GET /api/stages/[id]`, `/scenes`, `/manifest`, `/freshness`, and `/api/persistence/documents/*` succeed for any caller who knows a stage id; writes and listings are correctly scoped. `POST /api/classroom` and `GET /api/classroom-media/**` have no authentication at all.

**The R6 design.** New `lib/tutor/auth/principal.ts`: `requirePrincipal(req) → {accountId, learnerId, ownerId: 'acct:'+accountId, learnerKey: 'lrn:'+learnerId, assetKey: 'acct:'+accountId}` from the Clerk session; `learnerId` comes from a signed cookie validated against a `learners` row whose `account_id` matches. Then: (1) `owner.ts:52` returns the principal and never mints; (2) `document-access.ts:70-74` `read` compares owner (or `is_public`); (3) `owner-bound-document-store.ts:195` drops `operation.mode !== 'read' &&`; (4) `app/api/persistence/[...path]/route.ts:109-112` uses one hook for documents, runtime, and assets and the `PERSISTENCE_DEV_TOKEN` gate at `:275-281` goes; (5) `stage_meta`, `owner_material`, and every product table gain `account_id TEXT NOT NULL` with row-level security `USING (account_id = current_setting('app.account_id'))` set with `SET LOCAL` inside `nodePostgresTransaction`; (6) `RuntimeStore.mergeLearner` (`runtime/types.ts:171`) migrates an anonymous trial into a signed-in learner. Neon gotcha: the `pg_notify`/`LISTEN` bus (`lib/server/agent-runtime/event-notify-bus.ts`) needs a direct, non-pooled connection; the tutor does not need that bus and it is stripped with the workbench.

| File | Verdict | Note |
| --- | --- | --- |
| `lib/persistence/server-auth.ts` | STRIP | Replaced by `lib/tutor/auth/principal.ts`; three call sites. |
| `lib/server/agent-runtime/{owner,with-owner,owner-scoped-documents}.ts` | PATCH | The seam. |
| `lib/persistence/{owner-bound-document-store,document-access,stage-meta,owner-materials,server-provider,bootstrap,resolve-server-asset}.ts` | PATCH | Per the six steps above; `owner-materials.ts:353,369` also lack an owner predicate. |
| `packages/@openmaic/storage/src/document/pg.ts` | PATCH | Add the owner predicate to `loadStage` (`:528`), `loadRows` (`:555`), `getScene` (`:1043`); `scopePredicate` (`:496`) exists already. Bump the package version. |
| `lib/persistence/{asset-byte-store,asset-collector-schedule,asset-collection-grace,plain-json,resolve-vision-images}.ts`, `lib/document-store/**`, `lib/store/kv-persist.ts`, `packages/@openmaic/storage/**` (rest) | KEEP | S3 mode works for R2 via `ASSET_S3_BUCKET` and endpoint env. |
| `app/api/classroom/route.ts`, `app/api/classroom-media/**`, `lib/server/{classroom-storage,classroom-media-bytes,classroom-media-generation,classroom-job-store}.ts`, `lib/server/materials/bytes.ts` | STRIP | Unauthenticated local-disk artifacts; do not survive serverless. |
| `app/api/stages/**`, `app/api/folders/**`, `app/api/materials/**`, `app/api/stage-meta/**`, `app/api/agent/**` | STRIP or PATCH | Workbench and library. If any survive, they inherit the fix through the seam. |
| `lib/storage/client.ts` | STRIP | Calls `/api/storage/upload`, which does not exist; always returns `null`. |
| `middleware.ts`, `lib/server/access-token.ts`, `components/access-code-*.tsx` | PATCH | `ACCESS_CODE` stays for staging (spec R15); Clerk middleware takes over on prod. |
| `instrumentation.ts` | PATCH | Timer-based collector does not fit serverless; move to a cron route. |

### 2.5 AI providers, routing, usage, logging (`lib/ai`, `lib/config`, `lib/server`, `components/settings`, `lib/usage`)

**What it does.** `PROVIDERS` (`lib/ai/providers.ts:75`, 19 providers, 5 transports) and `getModel`; `parseModelString` (`:2350`) splits on the first colon and defaults a bare id to OpenAI. The only AI SDK call sites are `generateText`/`streamText` in `lib/ai/llm.ts:7`, enforced by ESLint (`eslint.config.mjs:620-628` and `:5-22`); there is no `generateObject`. `MODEL_ROUTES` per-stage routing with composite keys (`lib/server/model-routes.ts:131-152`, `:253-264`) and boot-time validation (`lib/server/config-validation.ts`, warn-only). `server-providers.yml` is loaded from `process.cwd()` with env overriding field by field (`provider-config.ts:207-219`, `:284-289`); `GET /api/server-providers` returns presence and model lists only, never keys. Usage: one JSONL row per LLM call (`lib/ai/llm.ts:295-315` → `data/usage/YYYY-MM.jsonl`), TTS characters recorded, images and video recorded, ASR seconds not recorded; no cost, session, or turn id; `lib/store/settings.ts` has no `partialize`, so user-entered keys persist to the account KV scope.

**Lock-down (R8).** `resolveModel` takes only `{stage}`; `resolveModelFromHeaders` (`resolve-model.ts:166-171`) and the client-credential branches in `provider-config.ts:609-610, 619-620` go; TypeScript then lists the 17 routes in §3 of the provider report (chat, chat/pi, verify-model, probe-models, azure-voices, tts, voice, transcription, image, video, verify-*, parse-pdf, extract-document, web-search). Under `TUTOR_MODE`, `middleware.ts` also strips `x-api-key`, `x-base-url`, `x-provider-type`, `x-model` from every `/api/*` request, and `config-validation.ts:78-88` escalates "routed provider has no server key" from a warning to a boot failure.

**Cost per turn (spec §8.6, build prompt "cost accounting is a feature").** `AsyncLocalStorage<{turnId, sessionId, learnerId, stage}>` beside the existing thinking context (`lib/ai/thinking-context.ts:15-23`); additive `turnId`, `sessionId`, `stage`, `costCents` on `UsageRecord` (`usage-storage.ts:26, 42`); `lib/tutor/cost/pricing.ts` with `llmCostCents`, `ttsCostCents`, `asrCostCents` returning `undefined` for unpriced models; wired at the four existing choke points plus the missing ASR record; the per-session ceiling (R9) reads the running sum for the session and aborts the turn at $3.

| File | Verdict | Note |
| --- | --- | --- |
| `lib/ai/llm.ts`, `lib/server/{resolve-model,provider-config,usage-storage,model-routes,config-validation}.ts`, `lib/usage/normalize.ts` | PATCH / KEEP | As above. |
| `lib/ai/providers.ts` | PATCH | Trim to routed providers (it ships to the browser via `lib/store/settings.ts:396`); drop the client `providerType` parameter of `getModel`. |
| `lib/ai/{thinking-config,thinking-context,model-metadata,model-aliases,reasoning-sse,azure}.ts` | KEEP | |
| `app/api/provider/probe-models`, `app/api/azure-voices`, `app/api/verify-{image,video,pdf}-provider`, `lib/server/model-fetch.ts`, `lib/config/{token-plan-presets,apply-token-plan}.ts` | STRIP | Exist only to serve client credentials. |
| `app/api/server-providers`, `app/api/verify-model` | PATCH | 404 under `TUTOR_MODE`; `verify-model` becomes a stage-only ops smoke test. |
| `components/settings/**` (20 files), `components/server-providers-init.tsx`, `lib/utils/model-config.ts` | STRIP | The provider Settings panel (spec §8.2). `general-settings.tsx` and `usage-dashboard.tsx` survive as an operator page (R21). |
| `lib/store/settings.ts` | PATCH | Delete every `*ProvidersConfig` slice; keep learner preferences (voice preset, speed, ASR language, layout). |
| `lib/logger.ts` | PATCH | `logContent()` helper that no-ops above `debug`; ids only elsewhere. |
| `app/api/usage/route.ts`, `components/settings/usage-dashboard.tsx` | PATCH | Cents and `byTurn`; auth. |

### 2.6 Grading and document parsing (`app/api/quiz-grade`, `lib/quiz`, `app/api/parse-pdf`, `app/api/extract-document`, `lib/document`, `lib/pdf`)

**What it does.** `POST /api/quiz-grade` takes `{question, userAnswer, points, commentPrompt?, language?}`, prompts for JSON, regex-scrapes it, and on any failure silently awards 50 % (`route.ts:88-98`); it routes on stage `quiz-grade`, so `MODEL_ROUTES` already gives it the stronger model. Question types are `single | multiple | short_answer` (`packages/@openmaic/dsl/src/stage.ts:198`); choice grading is local set equality with no partial credit (`lib/quiz/grading.ts:44`); there is no numeric type, no tolerance, no misconception field. `lib/quiz/runtime.ts` is an append-only attempt lifecycle with Web Locks that is worth keeping for check items. Document parsing: `/api/extract-document` is the superset route (multipart or asset id, 50 MB cap, SSRF guard); `/api/parse-pdf` has no size limit and hard-codes the PDF MIME (`route.ts:69`). Providers: unpdf (text only), MinerU self-hosted and cloud (Markdown with inline LaTeX, `mineru-cloud.ts:267`), AliDocMind. Nothing is written to disk on the PDF or image path. Vision input exists: `buildVisionUserContent` (`packages/@openmaic/generation/src/prompt-formatters.ts:109-139`) and `callLLM` accept image parts, gated by `modelInfo.capabilities.vision`; the PBL evaluator uses it (`lib/pbl/v2/agents/evaluator.ts:162-173`). HEIC is unsupported everywhere; the pinned `sharp` build has no libheif.

| File | Verdict | Note |
| --- | --- | --- |
| `app/api/quiz-grade/route.ts`, `lib/quiz/grading.ts` | PATCH | `generateObject`-style schema (or strict Zod parse), `numeric` type with tolerance graded locally, `rationale`, `misconception`, `arithmeticCheck`; delete the 50 % fallback (also in `components/scene-renderers/quiz-view.tsx:138`) and return `ungraded`. Or leave upstream untouched and implement `app/(learner)/api/tutor/check/route.ts` fresh on `callLLM`; decision in tutor-09. |
| `lib/quiz/{runtime,view-state,math-text,persistence}.ts` | KEEP | `math-text.ts:221` renders LaTeX for the R3 confirmation preview. |
| `app/api/extract-document/route.ts`, `lib/document/**` (except below), `lib/pdf/{types,constants,pdf-providers,mineru-parser,mineru-cloud}.ts`, `lib/server/material-extraction/{extract,errors}.ts`, `lib/persistence/resolve-vision-images.ts` | KEEP / PATCH | R3 backbone: `extractorCandidates` (`extract.ts:69-81`) is the provider fallback loop; `isTransientExtractionError` separates retry from "type it instead". Add HEIC → JPEG via `heic-convert` before provider selection and lower the learner-facing cap to 5 MB. |
| `app/api/parse-pdf/route.ts` | STRIP | Retired in favour of the superset route. |
| `lib/document/extractors/local-media.ts`, `lib/document/transforms/**`, `lib/media-parse/**`, `lib/pdf/alidocmind-client.ts`, `lib/rag/**`, `lib/import/use-import-pptx.ts`, `lib/server/material-extraction/runner.ts` | STRIP | ffmpeg media, dead RAG code (no non-test importers), Chinese-market OCR. |

R3 lands as `app/(learner)/api/tutor/problem-extract/route.ts` plus `lib/tutor/problem/vision-ocr.ts` (stage `tutor-problem-extract`, prompt: transcribe verbatim, math in `$…$`, do not solve) and `components/tutor/problem-upload/*` forked from the PBL submission dialog's file handling (`components/scene-renderers/pbl/v2/submission.tsx:997-1130`).

### 2.7 UI: routes, components, stores, design system, i18n, flags

**Routes.** `/` (`app/page.tsx`, upstream home), `/classroom/[id]` (the session), `/workspace` and `/workbench/new` (Pro workbench, already gated), `/generation-preview`, `/eval/whiteboard`. The session tree is `app/classroom/[id]/page.tsx` → `components/stage.tsx` → `components/edit/PlaybackChromeRoot.tsx` → `SceneSidebar` + `Header` + `CanvasArea` (scene renderer, `Whiteboard`, toolbar) + `Roundtable` (seat grid, speech bubble, textarea, `SpeechButton`) + `ChatArea` (`use-chat-sessions.ts`, 2,286 lines).

**Stores (Zustand 5, persisted through `lib/store/kv-persist.ts`).** `useStageStore` (`lib/store/stage.ts:280`: `stage`, `scenes`, `currentSceneId`, `mode`, generation state); `useSettingsStore` (`lib/store/settings.ts:81`: TTS/ASR preferences, layout, agent selection, and the provider configs to strip); `useCanvasStore` (`lib/store/canvas.ts:61`: `whiteboardOpen`, `whiteboardClearing`, `runtimeWhiteboardProjection`, editor viewport); `useWhiteboardHistoryStore`, `useAgentRegistry`, `useUserProfileStore`, `useMediaGenerationStore`, `useWidgetIframeStore`.

**Design system.** Tailwind v4 with `@theme inline` tokens in `app/globals.css:20-61`, values at `:63-135`; brand primary is raw hex `#722ed1` (`:75`), which our design system replaces (build prompt: one brand hue chosen on purpose, no purple-to-blue defaults). Fonts: Geist via `next/font` plus `@fontsource-variable/inter` for non-Latin subsets (`app/layout.tsx:16-29`). Dark mode is a hand-rolled `ThemeProvider` (`lib/hooks/use-theme.tsx`), not next-themes (`next-themes` is imported only by `components/ui/sonner.tsx`). shadcn `radix-vega` style, neutral base, lucide icons (145 files). `motion/react` in 43 files; `animate.css` is imported with zero uses; `prefers-reduced-motion` is handled in one CSS rule and the workbench only, not in the session.

**i18n.** i18next with 12 locales and `defaultLocale = 'zh-CN'` (`lib/i18n/types.ts:5`). `scripts/check-i18n-keys.mjs` runs in CI and fails if any locale lacks a key present in `en-US.json`. Product UI is English only (spec §3): product components use plain strings, and any key we add to `en-US.json` must be added to all 12 files or the locales must be reduced to `en-US` first (infra-03).

**Flags.** `lib/config/feature-flags.ts`: server-only flags never use `NEXT_PUBLIC_`; `isProWorkbenchEnabled` (public) is paired with `isAgentRuntimeConfigured` (server) and a middleware 404 (`middleware.ts:52-58`). `TUTOR_MODE` follows the same pattern from `kaizen.config.ts`.

| Path | Verdict | Note |
| --- | --- | --- |
| `components/whiteboard/**`, `components/chat/{chat-area,chat-session,session-list,use-chat-sessions,use-soft-close-countdown,inline-action-tag,element-reference-receipt}.*`, `components/audio/speech-button.tsx`, `components/ui/**`, `components/slide-renderer/**`, `components/ui/avatar-display.tsx`, `components/agent/agent-avatar.tsx`, `components/roundtable/{audio-indicator,constants}.*`, `lib/hooks/{use-i18n,use-theme,use-audio-recorder,use-browser-asr,use-browser-tts,use-asr-available,use-discussion-tts,use-streaming-text}.*`, `lib/contexts/**`, `lib/store/{stage,settings,canvas,whiteboard-history,media-generation,user-profile,widget-iframe,persist-health,kv-persist}.ts` | KEEP | The 1:1 session set. |
| `components/edit/PlaybackChromeRoot.tsx` | PATCH → `components/tutor/session-root.tsx` | Keep engine init (`:655-961`), TTS/volume sync (`:989-1005`), whiteboard toggle (`:1289`), `ChatArea` wiring (`:1730-1797`), teardown (`:541-556`). Drop presentation mode, scene navigation, element pick, `SceneSidebar`, `Header`, `Roundtable`. |
| `components/roundtable/index.tsx` | PATCH → `components/tutor/dock.tsx` | Lift the input panel (`:1348-1381`) and mic; delete the seat grid (`:999`, `:1176`) and `ProactiveCard` wiring. |
| `components/classroom/ClassroomSurface.tsx`, `app/classroom/[id]/page.tsx` | KEEP as reference | The load pipeline for `app/(learner)/session/[id]/page.tsx`. |
| `app/layout.tsx`, `app/globals.css` | PATCH | Drop `animate.css`, `ProSwapWatcher`, the workbench CSS import, the PBL block (`globals.css:290-509`); add session reduced-motion rules. |
| `app/page.tsx`, `components/discovery/**`, `app/generation-preview/**`, `app/eval/**`, `app/workspace/**`, `app/workbench/**`, `components/workbench/**`, `lib/workbench/**`, `components/edit/**` (rest), `components/generation/**`, `components/agent/{agent-bar,agent-reveal-modal,agent-config-panel}.*`, `components/chat/{proactive-card,lecture-notes-view}.*`, `components/roundtable/presentation-speech-overlay.tsx`, `components/scene-renderers/{pbl-renderer,pbl/**,classroom-complete}.*`, `components/stage/**`, `components/settings/**`, `components/ai-elements/**`, `lib/pbl/**`, `lib/export/**`, `lib/video-export*/**`, `lib/edit/**` (except `stage-mode.ts`), `lib/import/**`, `render-service/**`, `skills/**`, `packages/{mathml2omml,pptxgenjs}`, `packages/@openmaic/{generation,importer,editor}` (flag), `eval/{pbl-v2-planner,outline-language,orchestration}` | STRIP or flag off | Spec §8.2 strip list. `next.config.ts:8-9` traces `skills/**` and `:14` transpiles the PPTX packages; both lines go with them. `package.json` `postinstall` builds every package; trim the chain. |
| `components/scene-renderers/{quiz-view,quiz-renderer,interactive-renderer,InteractiveIframeHost}.*`, `lib/web-search/**`, `lib/i18n/workbench*` | flag | Keep only what a tutor session uses. |
| `lib/brand/**` | PATCH | Rename per spec D13 once the name is decided. |

### 2.8 Tests, CI, evals

See §6 (filled from the test-conventions map). Summary: unit tests in `tests/**/*.test.ts` on Vitest 4 with `tests/setup-env.ts`; route handlers are tested by calling the exported `POST` with a `Request`; Postgres contracts run under PGlite and a real Postgres workflow (`.github/workflows/storage-pg-contract.yml`); e2e is Playwright 1.58 against a built server on port 3002 with a mocked model API (`e2e/fixtures/mock-api.ts`); evals are `eval/*/runner.ts` scripts plus `tests/**/*.eval.test.ts` under `vitest.eval.config.ts`. CI (`.github/workflows/ci.yml`) runs prettier, ESLint, tsc, i18n keys, the package build-drift check, unit tests per package, a generation smoke server, and e2e, in about 15 minutes.

## 3. Trace of one live turn today

Learner speaks → tutor audio, on the LangGraph path with one agent, as the code stands. **Timings measured in this environment: none.** There are no provider keys here, so no ASR, LLM, or TTS hop ran; `scripts/latency-harness.ts` measures hops 3, 5, 8, and 9 and the derived end-of-speech → first-audio figure as soon as `TUTOR_ASR_PROVIDER`, `TUTOR_TTS_PROVIDER`, and a routed model exist (`docs/SPIKE-latency.md`). What the trace does establish is which hops are unbounded by construction.

| # | Hop | Where | Today |
| --- | --- | --- | --- |
| 0 | End of learner speech → recording stops | `components/audio/speech-button.tsx:75-76` | **Unbounded**: click-to-stop, no VAD, no auto-stop. |
| 1 | Blob assembly and upload | `lib/hooks/use-audio-recorder.ts:239-251` | Whole clip; `start()` has no timeslice, so nothing uploads early. |
| 2 | Optional WAV transcode (FunASR/Lemonade only) | `lib/audio/wav-utils.ts:66-73` | Main-thread `decodeAudioData` plus a per-sample loop. |
| 3 | ASR | `app/api/transcription/route.ts:79` → `lib/audio/asr-providers.ts` | One whole-clip round trip; not measured. |
| 4 | Transcript → textarea → Send | `components/scene-renderers/pbl/v2/chat.tsx:715-718` and the roundtable input | **Unbounded**: a human presses Send. |
| 5 | `POST /api/chat` → first `text_delta` | `app/api/chat/route.ts:44` → `statelessGenerate` → `runAgentGeneration` → `streamLLM` | Model time to first token; not measured. |
| 6 | Reveal pacing | `lib/buffer/stream-buffer.ts:208-209` | 30 ms per character: a 100-character sentence takes 3 s to show. |
| 7 | Segment seal → TTS request | `stream-buffer.ts:471-484`, `use-chat-sessions.ts:906` | TTS is requested only at turn end or before the next action, then a deliberate 1,200 ms dwell. |
| 8 | TTS synthesis → base64 → `new Audio(dataUrl).play()` | `app/api/generate/tts/route.ts:155`, `use-discussion-tts.ts:241-302` | Whole utterance, plus 33 % payload inflation; nothing playable until the last byte; no iOS unlock. |
| 9 | Whiteboard action → visible element | `use-chat-sessions.ts:1016-1032` → `lib/action/engine.ts` | Applied on arrival, but each `wb_*` blocks the stream for 800–2,000 ms. |

Hops 0, 4, 6, 7, and the base64 barrier in 8 are each individually fatal to a 1.5 s p50 and are removed by design in `lib/tutor/voice` (voice-16, voice-17, tutor-08). What remains to measure is ASR + model TTFT + first-sentence TTS, which is what the harness reports.

## 4. Order of work implied by this map

1. **Voice loop** (`lib/tutor/voice`, streaming TTS route, VAD, barge-in) on top of the pi runtime — spike-05 picks providers, voice-16/17/18, tutor-07/08.
2. **Face** (`components/tutor/avatar`, `AvatarDriver`) driven by the turn controller's phase — presence-37/38/39.
3. **Accounts and isolation** (`lib/tutor/auth`, R6 patches, RLS, product tables) — auth-21/22.
4. **Billing and caps** (Stripe, minute metering, per-session ceiling, daily cap) — billing-23/24, guard-25.
5. **Landing and onboarding** — growth-28.
6. Strip list in three cuts: (a) flag off under `TUTOR_MODE` (home, settings, workbench, PBL, roundtable, export); (b) delete routes that only serve client credentials and unauthenticated disk artifacts; (c) delete packages and `postinstall` steps once nothing imports them.

## 5. What this map did not verify

- No spoken session was completed here (no keys). The first seat with keys runs the harness and `pnpm dev`, and completes one session on desktop Chrome and a physical iPhone before anything is built on the loop.
- Line numbers were checked by reading the files on 2026-09-04 at upstream `6334e9a`; after the next upstream merge, re-grep before citing.

## 6. Test and CI conventions

See `docs/TESTING.md` (tiers, the rules that bite, how to add an eval). The invariant suite lives in `tests/invariants/` because that is where Vitest looks; `.github/workflows/invariants.yml` runs it, validates the skills, builds with canary secrets, and scans the client bundle.
