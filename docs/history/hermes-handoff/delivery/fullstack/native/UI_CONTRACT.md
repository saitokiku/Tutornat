# OpenMAIC UI_CONTRACT

Source of truth: pinned checkout at `education-product-discovery/classroom`, commit `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`. All `file:line` refs are relative to that repo root. Nothing below is inferred from docs — only from route/type source read directly.

---

## Transport basics

| Item | Value | Source |
|---|---|---|
| Base URL | `{BASE}` = Next.js origin, e.g. `http://localhost:3000`. All paths below are `{BASE}/api/...` | — |
| Content type | `Content-Type: application/json` on every POST body route | `lib/hooks/use-scene-generator.ts:79-81` (the shipped client sends only this header) |
| Credentials | `credentials: 'same-origin'` — cookies are the only credential | `lib/persistence/bootstrap.ts:32` |
| Optional: per-stage model override | `x-model-routes: <JSON {stage: route}>`, ≤ a byte cap | `lib/server/model-routes.ts:234-246`; consumed `app/api/chat/pi/route.ts:160` |
| Optional: UI locale | `x-user-locale: <BCP-47>` — read by **only two** server sites | `app/api/generate/scene-content/route.ts:325`, `lib/pbl/v2/api/locale.ts:18` |
| Response header (Pi chat only) | `X-OpenMAIC-Element-Reference-Accepted: 1` when an `elementReference` was accepted | `lib/chat/pi/element-reference.ts:115`; set `app/api/chat/pi/route.ts:351` |

### Identity / cookies

Owner identity is a **cookie, not a token**. Cookie name `anonymous_id`, value a UUID v4, `Path=/; HttpOnly; SameSite=Lax; Max-Age=34560000` (400 d), `Secure` only when `NODE_ENV=production` and `COOKIE_SECURE !== '0'` — `lib/server/identity/anonymous-cookie.ts:27,35,71,74-80`. Owner id is `anon:<uuid>` (`:141`).

- A brand-new browser does **not** need a prior call. The Edge middleware mints the cookie on the first **document navigation** (GET, non-`/api`, `Sec-Fetch-Dest: document`) and attaches it to both the forwarded request and the page response — `middleware.ts:41-45`, `lib/server/identity/navigation.ts:61-71,120-124`.
- A pure-API client that never loads a page is still fine: every owner-resolving route mints on first use and returns `Set-Cookie` on **every** response including 4xx/5xx — `lib/server/identity/anonymous-cookie.ts:160-174`, `lib/server/identity/with-owner.ts:42-47,181-195`. A client must therefore use a persistent cookie jar; dropping `Set-Cookie` creates a new owner (new empty library) per request.
- `resolveRequestOwner` is memoized per request object and asks registered methods in order, falling back to the anonymous cookie — `lib/server/identity/resolve.ts:134-170,180-190`. A refused credential → `401 {"error":{"code":"INVALID_CREDENTIAL","message":"invalid owner credential"}}` — `lib/server/identity/with-owner.ts:22-27`.
- `attachOwnerCookies(response, setCookies)` is how the streaming routes attach cookies before the body starts — `lib/server/identity/with-owner.ts:160-174`; used at `app/api/chat/pi/route.ts:71`.
- Optional headers that change owner resolution: `x-openmaic-legacy-import` (fenced, 409 unless bound) — `lib/persistence/legacy-import-bindings.ts:24`, `lib/server/identity/with-owner.ts:62-96`. Do not send it.

### Access-code gate

Enabled iff env `ACCESS_CODE` is non-empty; **unset ⇒ gate off entirely** — `middleware.ts:47-50`. When on:
- Whitelist: `/api/access-code/*`, `/api/health` — `middleware.ts:53-55`.
- Cookie `openmaic_access` must carry a valid HMAC — `middleware.ts:58-61`; minted by `POST /api/access-code/verify` with body `{ code }` → `{ success:true, valid:true }`; wrong code → `401 INVALID_REQUEST`; rate-limited → `429 RATE_LIMITED` + `Retry-After` (`app/api/access-code/verify/route.ts:20-79`).
- Other `/api/*` without the cookie → `401 {"success":false,"errorCode":"INVALID_REQUEST","error":"Access code required"}` — `middleware.ts:64-69`.
- `GET /api/access-code/status` → `{ success:true, enabled, authenticated }` — `app/api/access-code/status/route.ts:5-16`.

### Response envelope

`lib/server/api-response.ts:46-75`:

```ts
apiSuccess(data, status=200) -> { success: true, ...data }          // :73-75
apiError(code, status, error, details?, reason?) ->
  { success: false, errorCode: ApiErrorCode, error: string, details?: string, reason?: string }  // :46-71
```

`ApiErrorCode` is the closed set at `lib/server/api-response.ts:3-42` (`MISSING_REQUIRED_FIELD`, `INVALID_REQUEST`, `MISSING_API_KEY`, `GENERATION_FAILED`, `INTERNAL_ERROR`, …). HTTP code is the caller-chosen `status`, not derived from `errorCode`.

**Three envelopes coexist — do not assume one:**
1. `apiSuccess`/`apiError` as above (generation, chat, health, materials).
2. Reference envelope `{ error: { code, message } }` — identity/claim, persistence, folders: `lib/server/identity/with-owner.ts:23-26`, `app/api/folders/route.ts:49-51`.
3. snake_case bare errors `{ error: 'not_found' | 'forbidden' | 'internal_error' | 'login_required' }` — stage status/meta/publish/generation-complete: `app/api/stages/[id]/status/route.ts:32,43`, `app/api/stage-meta/[stageId]/route.ts:56,83`, `app/api/stages/[id]/publish/route.ts:34-38`.

Owner-scoped stage routes answer a **plain-text** `404 "Not found"` for both missing and foreign ids (no existence oracle) — `lib/server/agent-runtime/route-response.ts:41-43`. Same plain 404 when `DATABASE_URL` is unset, for the entire `/api/stages/**` + `/api/folders/**` family — `app/api/stages/route.ts:48`, `lib/config/feature-flags.ts:47-49`.

---

## 1. Generate a lesson

Two independent pipelines exist. They are **not** interchangeable.

### 1a. One-shot browserless job pipeline (recommended)

| | |
|---|---|
| Submit | `POST /api/generate-classroom` — `app/api/generate-classroom/route.ts:71` |
| Poll | `GET /api/generate-classroom/{jobId}` — `app/api/generate-classroom/[jobId]/route.ts:16` |
| Probe | `GET /api/generate-classroom/capabilities` — `app/api/generate-classroom/capabilities/route.ts:32` |

Request body — the real type, `lib/server/classroom-generation.ts:58-62`:

```ts
interface GenerateClassroomInput {
  requirement: string;            // required, non-empty
  materialIds?: string[];         // ids from POST /api/materials, max MAX_CLASSROOM_MATERIALS
}
```
Parsing/validation: `app/api/generate-classroom/route.ts:39-69`. Unknown fields are **ignored**; `pdfContent` is actively refused with `400 INVALID_REQUEST` (`:41-43`). Capabilities (web search, image/video gen, TTS) are **not** request fields — they follow server provider config (`lib/server/classroom-generation.ts:53-57`).

`202` response (`app/api/generate-classroom/route.ts:110-123`):
```json
{ "success": true, "jobId": "...", "status": "queued", "step": "queued",
  "message": "...", "pollUrl": "{BASE}/api/generate-classroom/{jobId}", "pollIntervalMs": 5000 }
```

Poll response (`app/api/generate-classroom/[jobId]/route.ts:43-56`):
```json
{ "success": true, "jobId", "status", "step", "progress", "message",
  "pollUrl", "pollIntervalMs": 5000, "scenesGenerated", "totalScenes",
  "result": { "classroomId", "url", "scenesCount", "ttsCoverage?", "warning?" },
  "error": "...", "done": true }
```
`status ∈ queued|running|succeeded|failed` (`lib/server/classroom-job-store.ts:12`); `step ∈ initializing|researching|generating_outlines|generating_scenes|generating_media|generating_tts|persisting|completed` plus `queued|failed` (`lib/server/classroom-generation.ts:64-72`, `lib/server/classroom-job-store.ts:17`). `done` is `status==='succeeded'||'failed'`. `result.classroomId` is the stage id to open in §3. Only the creating owner may poll; anyone else gets the same `404` (`[jobId]/route.ts:26-38`). Jobs live in PostgreSQL, so **this family needs `DATABASE_URL`**; a `running` job with no progress for 30 min is reported failed (`lib/server/classroom-job-store.ts:40-45,64-71`).

LlmStage labels used per phase — all resolved through capability slots, same as the browser UI (`lib/server/classroom-generation.ts:303-305,324-326`, mapping `lib/config/model-slots.ts:87-107`):

| Phase | LlmStage | Slot |
|---|---|---|
| outlines | `scene-outlines-stream` | `course.outline` |
| scene content | `scene-content` / `scene-content:{slide,quiz,interactive,pbl}` | `course.content[.kind]` |
| scene actions | `scene-actions` | `course.actions` |
| agent profiles | `agent-profiles` | `course.agents` |
| job root | `generate-classroom` | `llm` |

### 1b. Browser multi-step pipeline

Three sequential calls per lesson, orchestrated client-side:

1. `POST /api/generate/scene-outlines-stream` — `app/api/generate/scene-outlines-stream/route.ts:295`. Body (`:315-322`):
```ts
{ requirements: UserRequirements;   // required; 400 MISSING_REQUIRED_FIELD otherwise (:311-313)
  pdfText?: string; pdfImages?: PdfImage[]; imageMapping?: Record<string,string>;
  researchContext?: string; agents?: AgentInfo[] }
```
`UserRequirements` — `lib/types/generation.ts:96-103`: `{ requirement: string; userNickname?; userBio?; webSearch?; interactiveMode?; taskEngineMode? }`. `interactiveMode: true` switches the outline prompt to `INTERACTIVE_OUTLINES` (`route.ts:430,447-463`; ids `lib/prompts/index.ts:27-28`) — this is the flag that biases generation toward interactive widget scenes. `taskEngineMode` is additionally gated server-side by `OPENMAIC_ENABLE_VOCATIONAL` (`lib/config/feature-flags.ts:132-140`).

   Response: SSE, `Content-Type: text/event-stream` (`route.ts:823-829`). Frames are `data: <json>\n\n`, heartbeats are the bare comment `:heartbeat\n\n` (`:485`). Event union (header `:9-13`, emitters `:636-650,675-678,801,811,818,559-568`):

   | `type` | Fields | Meaning |
   |---|---|---|
   | `languageDirective` | `data: string` | inferred teaching-language directive |
   | `courseTitle` | `data: string` | course title |
   | `outline` | `data: SceneOutline`, `index: number` | one outline, incremental |
   | `retry` | `attempt`, `maxAttempts`, `fallback?` | retry/model-fallback notice |
   | `done` | `outlines: SceneOutline[]`, `languageDirective`, `courseTitle?`, `taskEngineMode` | terminal success |
   | `error` | `error: string` | terminal failure (note: `error`, **not** `data`) |

   `SceneOutline` — `lib/types/generation.ts:150-193`: `{ id, type: 'slide'|'quiz'|'interactive'|'pbl', title, description, keyPoints[], teachingObjective?, estimatedDuration?, order, languageNote?, suggestedImageIds?, mediaGenerations?, quizConfig?, pblConfig?, widgetType?, widgetOutline? }`. LlmStage `scene-outlines-stream` (`route.ts:308`).

2. `POST /api/generate/scene-content` — `app/api/generate/scene-content/route.ts:59`. Body (`:64-88`):
```ts
{ outline: SceneOutline;            // required (:91-93)
  allOutlines: SceneOutline[];      // required non-empty (:94-100)
  stageId: string;                  // required (:101-103)
  pdfImages?: PdfImage[]; imageMapping?: ImageMapping;
  stageInfo: { name: string; description?: string; style?: string };
  agents?: AgentInfo[]; languageDirective?: string; requirements?: UserRequirements }
```
   Response `apiSuccess({ content, effectiveOutline })` (`:358`). LlmStage is per scene type: `scene-content:{outline.type}` falling back to `scene-content` (`:110,117`). JSON, not streamed.

3. `POST /api/generate/scene-actions` — `app/api/generate/scene-actions/route.ts:37`. Body (`:42-65`): `{ outline, allOutlines, content, stageId, agents?, previousSpeeches?, userProfile?, languageDirective? }` — all four of `outline`/`allOutlines`/`content`/`stageId` required (`:68-83`). Response `apiSuccess({ scene, previousSpeeches })` (`:190`) — `scene` is the assembled `Scene`. LlmStage `scene-actions` (`:92`).

Optional 4th: `POST /api/generate/agent-profiles` — `app/api/generate/agent-profiles/route.ts:130`; requires `stageInfo.name`, `languageDirective`, non-empty `availableAvatars` (`:147-158`). LlmStage `agent-profiles`.

### Recommendation

**Use `POST /api/generate-classroom` + `GET /api/generate-classroom/{jobId}`** — it is the one-shot server-side pipeline that persists a finished, owner-scoped course (stage + scenes + outlines + media + TTS) in a single write (`lib/server/classroom-generation.ts:697-707`), so a new frontend needs two endpoints and a poll loop instead of reimplementing outline→content→actions fan-out, media orchestration, retry and persistence client-side.

Caveat to accept with that choice: `generate-classroom` builds its `UserRequirements` as `{ requirement }` only (`lib/server/classroom-generation.ts:329-331`) — it never sets `interactiveMode`, so the interactive-outline prompt branch is unreachable through it. Interactive scenes can still appear (the standard outline prompt emits `type: 'interactive'` with `widgetType`/`widgetOutline`, `packages/@openmaic/generation/templates/requirements-to-outlines/system.md:138-199,301-317`), but they are explicitly rationed ("max 1-2 per course", `:148,383`). If a *guaranteed* interactive-first lesson is the product requirement, pipeline 1b with `requirements.interactiveMode: true` is the only verified lever.

---

## 2. Lesson catalogue (list)

`GET /api/stages` — `app/api/stages/route.ts:47`. Owner-scoped; returns `{ stages: DocumentSummary[] }` at `:54,62`.

Record fields — `packages/@openmaic/storage/src/document/types.ts:154-166`:

| Field | Type | Note |
|---|---|---|
| `id` | string | stage id, e.g. `stage-<base64url>` (`app/api/stages/route.ts:40-42`) |
| `name` | string | course title (there is no separate `title` field) |
| `description` | string? | |
| `interactiveMode` | boolean? | |
| `taskEngineMode` | boolean? | |
| `createdAt` | number | epoch ms |
| `updatedAt` | number | epoch ms |
| `sceneCount` | number | |
| `folderId` | string? | omitted when unfiled |

**No pagination and no filter parameters on the HTTP route** — `GET /api/stages` reads no query string (`app/api/stages/route.ts:47-63`) and is documented as unpaginated (`lib/persistence/library.ts:19-25`, hard ceiling `MAX_LIBRARY_STAGE_IDS = 5000` at `:25`). The underlying store method takes an optional `folderId` (`packages/@openmaic/storage/src/document/types.ts:229`) but the route never passes one — folder filtering is not reachable over HTTP here. There is no `locale` field on the summary.

Folders list: `GET /api/folders` → `{ folders: [{ id, name, order, createdAt, …, userKey }] }` — `app/api/folders/route.ts:54-71`, shape `:44-46` + `packages/@openmaic/storage/src/document/types.ts:168-174`.

Create a shell course: `POST /api/stages` body `{ name, description? }` → `201 { stage: { id, name, description?, createdAt, updatedAt, sceneCount: 0 } }` — `app/api/stages/route.ts:71,133-146`.

---

## 3. Open / reopen a saved lesson

| Call | Returns | Source |
|---|---|---|
| `GET /api/stages/{id}` | the whole document: `{ stage, scenes, outline?, dslVersion? }` (`MaicDocument`) | `app/api/stages/[id]/route.ts:68-78`; type `packages/@openmaic/storage/src/document/types.ts:143-148` |
| `GET /api/stages/{id}/scenes?ids=a,b,c` | `{ scenes: Scene[] }` — only the named ids, in document order | `app/api/stages/[id]/scenes/route.ts:48,79` |
| `GET /api/stage-meta/{stageId}` | `{ isOwner, isPublic, publishedAt, generationComplete, source }` | `app/api/stage-meta/[stageId]/route.ts:38,65-76` |
| `PUT /api/stages/{id}` | save whole document `{ stage, scenes, outline? }`; server overwrites `stage.updatedAt` | `app/api/stages/[id]/route.ts:121,171-178` |
| `PATCH /api/stages/{id}` | rename, body `{ name }` | `app/api/stages/[id]/route.ts:81,116` |
| `DELETE /api/stages/{id}` | `{ ok: true }` | `app/api/stages/[id]/route.ts:183,196` |

`GET /api/stages/{id}/scenes` constraints: `ids` required and non-empty → else `400 INVALID_REQUEST "empty_scene_ids"`; > 200 ids → `400 "too_many_scene_ids"` (`:33,60-70`). Requested-but-absent ids are silently omitted from the array (`:14`).

### Persistence backend

**Server-side PostgreSQL, selected by `DATABASE_URL`.** There is no browser-IndexedDB/Dexie default in this checkout:

- The browser bootstrap configures **only** HTTP stores pointed at `/api/persistence`, with an explicit comment that there is no browser-storage fallback — `lib/persistence/bootstrap.ts:60-85` ("Every durable read and write in the browser goes through these seams… There is no browser-storage backend to fall back to").
- Server stores are `pg`-backed (`Pool` from `pg`) — `lib/persistence/server-provider.ts:1-13,37-48`.
- The selector is `DATABASE_URL`: `isServerPersistenceConfigured() = Boolean(process.env.DATABASE_URL?.trim())` — `lib/config/feature-flags.ts:47-49`. Unset ⇒ the whole stage/folder family 404s (`app/api/stages/route.ts:48`).

Consequence for the product question: a lesson is stored **server-side and keyed by owner id**, so it is visible from *any* browser that presents the same `anonymous_id` cookie, and invisible to a different browser (different anonymous owner) — `app/api/stages/route.ts:6-11`. Cross-device visibility therefore requires either carrying the cookie, a host auth method producing a stable non-anonymous owner, or `PERSISTENCE_SHARED_OWNER_ID`/`OWNER_SINGLE_USER` (`lib/server/identity/navigation.ts:20-28`). The learner key the runtime uses is the same owner id, readable at `GET /api/persistence/learner-key` → `{ learnerKey }` — `app/api/persistence/[...path]/route.ts:70-76,514-516`.

Legacy browser data is one-way imported on idle (`lib/persistence/bootstrap.ts:102-106`), which confirms IndexedDB is historical, not the default.

---

## 4. Contextual tutoring chat

`POST /api/chat/pi` — `app/api/chat/pi/route.ts:53`. Gated by `isPiChatEnabled()` (`NEXT_PUBLIC_PI_CHAT_ENABLED`, **default ON**) → `404 INVALID_REQUEST "Pi chat runtime is disabled"` when off (`:54-56`; flag `lib/config/feature-flags.ts:99-101`). `maxDuration = 300` (`:51`).

Legacy alternative `POST /api/chat` (`app/api/chat/route.ts:46`) takes the same body type and emits the same `StatelessEvent` union; it is single-pass, `maxDuration = 60` (`:28`), no director loop. Prefer `/api/chat/pi`.

Request body is `StatelessChatRequest` — `lib/types/chat.ts:340-440`:

```ts
interface StatelessChatRequest {
  messages: UIMessage<ChatMessageMetadata>[];     // required :342  (400 MISSING_REQUIRED_FIELD, route :84-86)
  storeState: {                                   // required :344  (route :88-90)
    stage: Stage | null;                          // :345  — the OPEN LESSON
    scenes: Scene[];                              // :346  — its scenes
    outlines?: SceneOutline[];                    // :348  — thin course map
    currentSceneId: string | null;                // :349  — the OPEN SCENE
    mode: StageMode;                              // :350  'autonomous'|'playback'|'edit'
    whiteboardOpen: boolean;                      // :351
    whiteboardManualVisibilityRevision?: number;  // :353
    quizResults?: { sceneId; answers; results[] }; // :362-372
  };
  elementReference?: ElementReference;            // :375  slide_element | interactive_component | whiteboard_element (:311-334)
  interactiveState?: InteractiveStateEvidence;    // :377
  config: {                                       // required, config.agentIds required :379, route :92-94
    agentIds: string[];                           // non-empty, unique, trimmed — else 400 (route :135-146)
    sessionType?: 'qa' | 'discussion';
    discussionTopic?; discussionPrompt?; triggerAgentId?;
    agentConfigs?: Array<{ id; name; role; persona; avatar; color; allowedActions: string[]; priority; isGenerated?; boundStageId? }>;  // :389-400
    piMaxAgentTurns?: number;                     // :402 clamped 1..6 (lib/chat/pi/config.ts:5-6,27-33)
    piMaxActionsPerAgent?: number;                // :404 clamped 1..8 (lib/chat/pi/config.ts:7-8,35-41)
    piEnableWhiteboardTools?: boolean;            // :406 default off
  };
  directorState?: DirectorState;                  // :409  echo back from the previous turn's done event
  piSessionBoundary?: PiSessionBoundaryContext;   // :411
  userProfile?: { nickname?; bio? };              // :413-416
  apiKey: string;                                 // :418  REQUIRED BY TYPE (see note)
  baseUrl?; model?; providerType?;                // :419-421
  thinking?; thinkingConfig?;                     // :427-429
  webSearchProviderId?; webSearchApiKey?; webSearchBaseUrl?; webSearchModelId?; baiduSubSources?;  // :431-439
}
```

Lesson/stage/scene context attachment: **it is the `storeState` object, sent in full on every request** — the server is stateless. `storeState.stage`, `storeState.scenes`, `storeState.currentSceneId` are the field names; the director reads the current scene out of them at `lib/chat/pi/director-loop.ts:76-93` and the `read_scene` tool answers only from this "request-start snapshot" (`lib/chat/pi/tools/read-scene.ts:163,181`). There is no server-side session id.

Credentials: `apiKey` is non-optional in the type (`lib/types/chat.ts:418`) but the server arbitrates — `resolveModel` may supply a server-managed key, and only `isProviderKeyRequired(providerId) && !resolved` yields `401 MISSING_API_KEY` (`app/api/chat/pi/route.ts:148-171`). Send `apiKey: ''` when the server manages credentials. Also gated: `elementReference`/`interactiveState` require `NEXT_PUBLIC_COURSEWARE_REFERENCE_ENABLED` else `400 "Courseware references are disabled"` (`:96-101`; flag `lib/config/feature-flags.ts:107-109`).

### Stream framing

Raw SSE. Headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` (`app/api/chat/pi/route.ts:346-353`). The exact encoder:

```ts
// app/api/chat/pi/route.ts:198-200
const send: SendEvent = async (event) => {
  await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
};
```
So: one `data:` line per event, blank-line terminated, **no `event:` name field** — the discriminator is the JSON `type`. Keep-alive comment frames `:heartbeat\n\n` every 15 s (`:270-273`) must be tolerated and ignored. Stream closes without a sentinel on abort (`:313-317`). `/api/chat` frames identically (`app/api/chat/route.ts:154-155`, heartbeat `:115`).

### Complete SSE event table

`SendEvent = (event: StatelessEvent) => Promise<void>` — `lib/chat/pi/types.ts:3`; the vocabulary is `StatelessEvent`, `lib/types/chat.ts:457-510`. **All nine variants:**

| `type` | `data` fields | Meaning | Text | Mutation | Terminal |
|---|---|---|---|---|---|
| `agent_start` :459 | `messageId`, `agentId`, `agentName`, `agentAvatar?`, `agentColor?` | a child agent begins a message | | | |
| `agent_end` :468 | `messageId`, `agentId` | that agent's message is complete | | | |
| `text_delta` :469 | `content`, `messageId?` | **assistant text chunk** — the only text carrier | ✅ | | |
| `action` :471 | `actionId`, `actionName`, `params`, `agentId`, `messageId?` | a classroom/whiteboard action to execute (spotlight, speech, wb_draw_*, widget_*) | | ✅ | |
| `thinking` :481 | `stage: 'director'\|'agent_loading'`, `agentId?` | progress/spinner hint | | | |
| `whiteboard` :485 | one of: `{kind:'visibility_query', queryId, stageId}` / `{kind:'open'\|'close', stageId, manualVisibilityRevision}` / `{kind:'projection', stageId, lastSeq}` | **stage/whiteboard mutation + a client round-trip** | | ✅ | |
| `cue_user` :495 | `fromAgentId?`, `prompt?` | the turn hands control back to the learner | | | soft |
| `done` :497 | `totalActions`, `totalAgents`, `agentHadContent?`, `cueUserReceived?`, `sessionClosed?`, `endReason?`, `directorCompaction?`, `directorToolTrace?`, `directorState?` | **turn end** — echo `data.directorState` into the next request's `directorState` | | | ✅ |
| `error` :510 | `message` | **turn failed** | | | ✅ |

Emission sites: `done` and the final auto-`cue_user` at `lib/chat/pi/director-loop.ts:270-296`; `error` at `app/api/chat/pi/route.ts:335-338`.

A `whiteboard` event with `kind:'visibility_query'` requires a client answer: `POST /api/chat/pi/whiteboard-visibility` body exactly `{ queryId, stageId, visibility: 'open'|'closed' }` → `204`, or `400`/`404 INVALID_REQUEST` — `app/api/chat/pi/whiteboard-visibility/route.ts:35,54-66`.

---

## 5. Stage + scene state

| Route | Returns | Auth | Source |
|---|---|---|---|
| `GET /api/stages/{id}/manifest` | `StageFreshnessManifest` = `{ rev: number, scenes: [{ id, order, rev }] }` | owner-scoped | `app/api/stages/[id]/manifest/route.ts:28-37`; type `packages/@openmaic/storage/src/document/types.ts:322-326` |
| `GET /api/stages/{id}/freshness` | SSE push of rev changes | owner-scoped | `app/api/stages/[id]/freshness/route.ts:46` |
| `GET /api/stages/{id}/status` | `{ isPublic, publishedAt }` | **unauthenticated** | `app/api/stages/[id]/status/route.ts:21,37` |
| `GET /api/stage-meta/{stageId}` | `{ isOwner, isPublic, publishedAt, generationComplete, source }` | owner-aware | `app/api/stage-meta/[stageId]/route.ts:38,65-76` |
| `POST /api/stages/{id}/publish` | `{ success: true, publishedAt, name }`; needs `course:publish` role — anonymous owner → `401 login_required` | owner+role | `app/api/stages/[id]/publish/route.ts:23,30-38,49-63` |
| `POST /api/stages/{id}/generation-complete` | `{ ok: true }`, monotonic | owner-only (403 otherwise) | `app/api/stages/[id]/generation-complete/route.ts:20,36-48` |

Freshness SSE, unlike Pi chat, **does** use named events:
```
retry: 3000\n\n
event: stage_freshness\ndata: {"type":"stage_freshness","stageId":"...","rev":N}\n\n
: ping\n\n                      // 25s heartbeat
```
`app/api/stages/[id]/freshness/route.ts:110-116,133,138`. Poll interval 5 s, heartbeat 25 s, retry hint 3 s (`:38-42`). It is a **pure optimization** and never authoritative — the documented contract is "pull the manifest on every frame" and keep a low-frequency fallback poll; a first frame is sent on connect and a read failure sends `rev: 0` (`:16-23,94-109`). The stream never closes on a terminal state (`:19-23`).

A scene object (`Scene`) = `SceneCore` ∧ `{ type, content }`:
- `SceneCore` — `packages/@openmaic/dsl/src/stage.ts:228-246`: `id`, `stageId`, `title`, `order`, `actions?: Action[]`, `whiteboards?: Slide[]`, `multiAgent?: MultiAgentConfig`, `createdAt?`, `updatedAt?`.
- `type` is bound to `content.type` at the type level — `packages/@openmaic/dsl/src/stage.ts:278-283`.
- App-level addition `outlineId?` — `lib/types/stage.ts:99-110`.

### Versioning / revision fields a frontend must echo

1. **`rev` (per-stage) and per-scene `rev`** — the only trustworthy staleness signal. DB-trigger maintained on `document_stages`/`document_scenes`, so every write seam moves them without app cooperation (`app/api/stages/[id]/manifest/route.ts:5-11`, `packages/@openmaic/storage/src/document/types.ts:317-326`). Workflow: render with a manifest, diff on each freshness frame, re-fetch only changed scene ids via `GET /api/stages/{id}/scenes?ids=…`. These are **read-only** — there is no HTTP parameter to send a `rev` back, so a stale write is *not* rejected by rev.
2. **`stage.updatedAt`** — the conflict clock. `PUT`/`PATCH` **overwrite** it server-side (`app/api/stages/[id]/route.ts:111,167-174`), so client-supplied values are ignored; the server is authoritative for "last modified".
3. **`dslVersion`** on the document (`packages/@openmaic/storage/src/document/types.ts:147`; current `DSL_VERSION = '0.3.0'`, `packages/@openmaic/dsl/src/version.ts:61`). A document written by a newer client cannot be saved by an older one: `DocumentVersionError` → `400 INVALID_REQUEST "document was written by a newer client; reload before saving"` (`app/api/stages/[id]/route.ts:51-60`; error class `packages/@openmaic/storage/src/document/types.ts:45-56`). **Echo `dslVersion` back unchanged on `PUT`.**
4. `PUT` is existence-gated and id-pinned: `stage.id` must equal the path id (`400`), and a missing document `404`s rather than being created (`app/api/stages/[id]/route.ts:151-165`).
5. Pi chat `read_scene` reports a `revision` derived from `scene.updatedAt ?? stage.updatedAt ?? 'request-start'`, source `request_start_snapshot` — diagnostic only (`lib/chat/pi/tools/read-scene.ts:171-181`).
6. `whiteboardManualVisibilityRevision` is the browser-owned revision echoed into chat requests (`lib/types/chat.ts:353`, consumed `app/api/chat/pi/route.ts:306-310`).

---

## 6. Non-text scene content

Two orthogonal axes: **scene type** (4 values) and, for `interactive` scenes, **widget type** (6 values).

`SceneType = 'slide' | 'quiz' | 'interactive' | 'pbl'` — `packages/@openmaic/dsl/src/stage.ts:22`, frozen tuple `:25-30`.

| Scene type | Content shape | Visual character | Source |
|---|---|---|---|
| `slide` | `SlideContent { type:'slide', schemaVersion?, canvas: Slide }` | PPTist canvas; rich but authored — see element list below | `packages/@openmaic/dsl/src/stage.ts:184-189` |
| `quiz` | `QuizContent { type:'quiz', questions: QuizQuestion[] }` | assessment, `single`/`multiple`/`short_answer` | `packages/@openmaic/dsl/src/stage.ts:196-214` |
| **`interactive`** | `InteractiveContent { type:'interactive', url?, html?, widgetType?, widgetConfig? }` — `html` is a complete document rendered via iframe `srcDoc` | **the genuinely interactive/animated kind** | `packages/@openmaic/dsl/src/interactive.ts:51-57` |
| `pbl` | `PBLContent { type:'pbl', projectV2?, projectConfig? }` — milestones/microtasks/roles | project-based, role-play capable | `packages/@openmaic/dsl/src/pbl.ts:148-162`; app widening `lib/types/stage.ts:72-75` |

### Widget types — the diagram/animation/manipulation layer

`WidgetType = 'simulation' | 'diagram' | 'code' | 'game' | 'visualization3d' | 'procedural-skill'` — `packages/@openmaic/dsl/src/interactive.ts:4-10`, frozen tuple `:13-20`, guard `:29-31`.

| Widget | Render character | Config fields | Source |
|---|---|---|---|
| **`simulation`** | **parameter-driven live simulation** — named variables with `min/max/default/unit/step`, optional presets | `SimulationConfig` | `lib/types/widgets.ts:13-32` |
| **`diagram`** | **node/edge diagram**, `flowchart \| mindmap \| hierarchy \| system`, with `revealOrder` for **progressive animated reveal** | `DiagramConfig` | `lib/types/widgets.ts:36-58` |
| **`visualization3d`** | **animated 3D scene** — `molecular \| solar \| anatomy \| geometry \| physics \| custom`; per-object `animation: orbit\|rotate\|bounce\|pulse`, interactions `orbit\|zoom\|pan\|slider\|button\|toggle`, camera + lighting | `Visualization3DConfig` | `lib/types/widgets.ts:114-179` |
| **`game`** | **interactive manipulation/scoring** — `quiz \| puzzle \| strategy \| card`, scoring + achievements | `GameConfig` | `lib/types/widgets.ts:82-110` |
| `code` | runnable editor with test cases/hints/solution; `python\|javascript\|typescript\|java\|cpp` | `CodeConfig` | `lib/types/widgets.ts:62-78` |
| `procedural-skill` | step-by-step practical procedure with tools and success criteria | `ProceduralSkillConfig` | `lib/types/widgets.ts:183-198` |

`procedural-skill` is **gated**: generation refuses it unless vocational mode is active — `packages/@openmaic/generation/src/scene-generator.ts:1296-1300` (`allowProceduralSkill`), fed by `resolveVocationalActive` ⇒ `OPENMAIC_ENABLE_VOCATIONAL` (`lib/config/feature-flags.ts:132-140`; routes `app/api/generate/scene-content/route.ts:181-184`). Widget dispatch for the other five: `packages/@openmaic/generation/src/scene-generator.ts:1204,1228-1295`. An interactive outline with no `widgetType` falls back to `simulation` (`:258-271`).

**To get a visual scene you must drive the outline**, because widget selection happens at outline time: `widgetType` + `widgetOutline` are required fields on an interactive outline (`lib/types/generation.ts:191-193`; prompt contract `packages/@openmaic/generation/templates/requirements-to-outlines/system.md:155,199,316-317`). `WidgetOutline` carries the per-widget hints — `keyVariables`, `diagramType`, `nodes[{id,label,parentId,icon,details}]`, `nodeCount`, `visualizationType`, `objects[]`, `interactions[]`, `gameType`, `language` — `lib/types/generation.ts:109-144`.

### Within a slide scene, the non-text elements

`PPTElement` union — `packages/@openmaic/dsl/src/slides.ts:862-872`: `text`, `image`, `shape`, `line`, **`chart`** (`bar|column|line|pie|ring|area|radar|scatter`, `:497`), **`table`**, **`latex`** (rendered formula), **`video`**, **`audio`**, **`code`**. Slide-level `animations?: PPTAnimation[]` with `in|out|attention` and `click|meantime|auto` triggers (`:874-875,995-1011`).

### Playback actions (the "animated teaching" layer)

`Action` union, 22 members — `packages/@openmaic/dsl/src/action.ts:235-257`: `spotlight`, `laser`, `play_video`, `speech`, `wb_open`, `wb_draw_text`, `wb_draw_shape`, `wb_draw_chart`, `wb_draw_latex`, `wb_draw_table`, `wb_draw_line`, `wb_draw_code`, `wb_edit_code`, `wb_clear`, `wb_delete`, `wb_close`, `discussion`, `widget_highlight`, `widget_setState`, `widget_annotation`, `widget_reveal`. `spotlight`/`laser` are fire-and-forget and **slide-only** (`:261-264`); everything else is a sync action that must complete before the next (`:267-287`). The `widget_*` four are how the tutor manipulates a live interactive widget mid-lesson (`:206-233`).

---

## 7. Locale (EN/ES)

**`'es'` is not in the shipped locale set, and `'en'` is not the default.** The registry is `supportedLocales` — `lib/i18n/locales.ts:16-29`, exactly 12 codes:

`zh-CN`, `zh-TW`, `en-US`, `ja-JP`, `ru-RU`, `ar-SA`, `pt-BR`, `ko-KR`, **`es-MX`**, `fr-FR`, `vi-VN`, `de-DE`.

- There is **no `es` and no `es-ES`** locale. `es-MX` ("Español (México)", `lib/i18n/locales.ts:25`) is the shipped Spanish: `lib/i18n/locales/es-MX.json` exists (confirmed on disk, and imported by the key tests `tests/i18n/edit-chrome-keys.test.ts:8,59`), plus `lib/i18n/workbench-locales/es-MX.json`. `"lang_es-ES"` appearing inside locale JSONs (e.g. `lib/i18n/locales/zh-CN.json:1549`) is a **TTS voice-language label string**, not a UI locale.
- `defaultLocale = 'zh-CN'` — `lib/i18n/types.ts:5`; i18next is initialised with it as both `lng` and `fallbackLng` (`lib/i18n/config.ts:37-39`). A frontend wanting English must select `en-US` explicitly.
- Key parity is enforced against `en-US.json` as the source locale — `scripts/check-i18n-keys.mjs:4-5`. So `en-US` is the canonical key set and `es-MX` is validated against it; per-key translation completeness was not separately verified.

### How language is requested per call

| Surface | Mechanism | Source |
|---|---|---|
| Generation (content language) | `languageDirective: string` body field — a free natural-language directive (e.g. "Teach in Spanish"), **the single source of truth for content language**; there is no locale code field | `app/api/generate/scene-content/route.ts:72,334`, `app/api/generate/scene-actions/route.ts:64,167`; rationale `packages/@openmaic/generation/src/pbl/planner-core.ts:85-96` |
| Outlines | **inferred by the model**, returned as the `languageDirective` SSE event; default `'Teach in the language that matches the user requirement.'` | `packages/@openmaic/generation/src/outline-generator.ts:20-21`; event `app/api/generate/scene-outlines-stream/route.ts:636-638` |
| Scene content, secondary | `x-user-locale` **header** → `targetLanguage` | `app/api/generate/scene-content/route.ts:325,335` |
| PBL runtime | `x-user-locale` header, validated against `supportedLocales`; an unsupported code is silently ignored; it sets only `project.language` (platform strings) and **never** overrides `languageDirective` | `lib/pbl/v2/api/locale.ts:3-21` |
| Quiz grading | body `language?: string`, compared literally to `'zh-CN'` only — any other value, `es-MX` included, takes the English prompt | `app/api/quiz-grade/route.ts:20,52-60` |
| `/api/chat/pi` | **no locale field and no locale header is read** | `app/api/chat/pi/route.ts` (grep: `x-user-locale` absent) |
| `/api/generate-classroom` | **no locale field**; body is `{ requirement, materialIds? }` only — language rides in the `requirement` prose | `lib/server/classroom-generation.ts:58-62,329-331` |

Practical rule for EN/ES: put the language in the `requirement` text for `generate-classroom`; for pipeline 1b pass an explicit `languageDirective` to scene-content/scene-actions and additionally send `x-user-locale: es-MX` (or `en-US`).

---

## 8. Cancellation

**There is no cancel endpoint for generation or chat. The mechanism is closing the HTTP request** — `AbortController.abort()` on the client `fetch`, which the server observes as `req.signal`.

| Surface | Client action | Server-side observer | Source |
|---|---|---|---|
| `POST /api/chat/pi` | abort the fetch | `req.signal` is mirrored into an `AbortController` handed to the director loop; on abort the writer is closed with no `error` event, and the post-loop return is suppressed | `app/api/chat/pi/route.ts:191-193,295-296,313-317,324-331`; loop guard `lib/chat/pi/director-loop.ts:264` |
| `POST /api/chat` | abort the fetch | documented contract: "interruption is handled by the client aborting the fetch request, which triggers `req.signal`"; the generator loop breaks and the writer closes silently | `app/api/chat/route.ts:11-12,99,148-156,164-171` |
| `POST /api/generate/scene-outlines-stream` | abort the fetch | `abortSignal: req.signal` is passed to the LLM call (tears down upstream), the chunk loop returns on `req.signal.aborted`, and the catch path stops instead of burning retries | `app/api/generate/scene-outlines-stream/route.ts:517-526,605-608,756-762` |
| `POST /api/generate/scene-content`, `/scene-actions` | abort the fetch | **the routes do not read `req.signal`** (grep: no `req.signal`/`abort` in either file). The client-side helpers do accept and forward a `signal` to `fetch` (`lib/hooks/use-scene-generator.ts:131,157,197,206`), so the connection drops, but the in-flight LLM call is not torn down server-side. |
| `POST /api/generate-classroom` | **no client-side abort path.** The job is dispatched via `after(() => runClassroomGenerationJob(...))` — it survives the HTTP response. `generateClassroom` accepts `options.signal?: AbortSignal` and threads it into TTS (`lib/server/classroom-generation.ts:217,635`), but the job runner never supplies one (`lib/server/classroom-job-runner.ts:28-34`). | `app/api/generate-classroom/route.ts:108` | 
| Freshness SSE | close the `EventSource` | `cancel()` clears poll + heartbeat timers; a broken socket is also detected on `enqueue` failure | `app/api/stages/[id]/freshness/route.ts:76-90,142-145` |

**`POST /api/agent/sessions/{id}/cancel` does NOT apply here.** It is the agent-runtime (workbench) control plane: it requires `isAgentRuntimeConfigured()` (`OPENMAIC_AGENT_RUNTIME_ENABLED` + `DATABASE_URL`) or it 404s, it operates on an agent *session* id from `/api/agent/sessions`, and it writes a durable cancel request that the lease holder observes — `app/api/agent/sessions/[id]/cancel/route.ts:1-6,17-19,39-43`; flag `lib/config/feature-flags.ts:22-29`. It has no relationship to `generate-classroom` jobs or to `/api/chat/pi`. Returns `202 { id, cancelRequested: true }`, or `409 SESSION_ALREADY_TERMINAL` (`:28-37`).

Net: a classroom-generation job already accepted cannot be cancelled by a client through any verified route.

---

## Minimal frontend call sequence

1. `GET /api/health` → `{ success, status, version, accessCodeConfigured, capabilities, generation.parallelSceneConcurrency }` — `app/api/health/route.ts:7-15`. Branch on `accessCodeConfigured`.
2. If gated: `POST /api/access-code/verify` `{ code }`; store the `openmaic_access` cookie — `app/api/access-code/verify/route.ts:20,69-79`.
3. `GET /` (any page) **or** any API call, with a persistent cookie jar, to establish `anonymous_id` — `middleware.ts:41-45` / `lib/server/identity/anonymous-cookie.ts:160-174`. Every subsequent call must send it.
4. `GET /api/generate-classroom/capabilities` → `{ capabilities, materials{formats,maxCount,maxTotalBytes,…} }` — `app/api/generate-classroom/capabilities/route.ts:32,48-57`. Confirms image/video/TTS availability before promising visuals.
5. *(optional)* `POST /api/materials` per source file (binary body, `x-material-filename` header) → `{ materialId, … }`; collect ids — `app/api/materials/route.ts:179`, headers `:115-117`, response `:390`.
6. `POST /api/generate-classroom` `{ requirement: "<learner goal, state the language here>", materialIds? }` → `202 { jobId, pollUrl, pollIntervalMs }` — `app/api/generate-classroom/route.ts:71,110-123`.
7. Poll `GET /api/generate-classroom/{jobId}` every `pollIntervalMs` until `done === true`; on `status==='succeeded'` read `result.classroomId` — `app/api/generate-classroom/[jobId]/route.ts:16,43-56`.
8. `GET /api/stages/{classroomId}` → `{ stage, scenes, outline?, dslVersion? }`. Render; the visual scenes are `scene.type === 'interactive'` with `content.widgetType ∈ {simulation, diagram, visualization3d, game, code}` (`packages/@openmaic/dsl/src/interactive.ts:4-10`) and `content.html` into an iframe `srcDoc` (`:43-49`) — `app/api/stages/[id]/route.ts:68-78`.
9. `GET /api/stages/{classroomId}/manifest` → keep `{rev, scenes[{id,order,rev}]}`; open `GET /api/stages/{classroomId}/freshness` (SSE); on each `stage_freshness` frame re-pull the manifest and re-fetch changed scenes with `GET /api/stages/{classroomId}/scenes?ids=…` — `app/api/stages/[id]/manifest/route.ts:28-37`, `[id]/freshness/route.ts:46,110-116`, `[id]/scenes/route.ts:48,79`.
10. Tutoring question: `POST /api/chat/pi` with `{ messages, storeState:{stage, scenes, currentSceneId, mode:'playback', whiteboardOpen:false}, config:{agentIds:[…]}, apiKey:'' }`; consume SSE `data:` lines, ignore `:heartbeat`, append `text_delta.data.content`, apply `action` and `whiteboard` events, stop on `done` or `error` — `app/api/chat/pi/route.ts:53,198-200`, events `lib/types/chat.ts:457-510`.
11. Follow-up turn: resend the full `storeState` plus `directorState` copied from the previous `done` event's `data.directorState` — `lib/types/chat.ts:409,507`; produced `lib/chat/pi/director-loop.ts:285-294`. Abort the fetch to cancel a turn (`app/api/chat/pi/route.ts:191-193,313-317`).
12. Reopen later (same cookie jar): `GET /api/stages` → pick `{id, name, updatedAt, sceneCount}` (`app/api/stages/route.ts:47,62`; fields `packages/@openmaic/storage/src/document/types.ts:154-166`), then repeat steps 8–9. `GET /api/stage-meta/{id}` gives `isOwner` for read-only vs editable (`app/api/stage-meta/[stageId]/route.ts:65-76`).

---

## UNVERIFIED / open questions

1. **`agentIds` values.** `/api/chat/pi` requires a non-empty `config.agentIds` and 400s on ids the registry cannot resolve (`app/api/chat/pi/route.ts:135-146,173-189`), but the resolver reads a client-side Zustand store (`useAgentRegistry`, `lib/chat/pi/config.ts:21-24`). The concrete default agent id strings, and whether a server-side registry exists for a non-browser client, were not traced. A new frontend most likely must send `config.agentConfigs` (full configs, `lib/types/chat.ts:389-400`) or hydrate from `stage.generatedAgentConfigs` (`packages/@openmaic/dsl/src/stage.ts:160`). **Resolve before building chat.**
2. **`POST /api/materials` exact wire format.** Confirmed: owner-scoped, `x-material-filename` header required, flat `{ materialId, originalName, bytes, mime, extraction }` 201 view (`app/api/materials/route.ts:5-6,15,249`). The request body encoding (raw stream vs multipart) and the full response shape were not read line-by-line.
3. **`result.url` reachability.** The job result carries `url = {baseUrl}/classroom/{classroomId}` (`lib/server/classroom-generation.ts:699`). Whether that page route exists/renders in this checkout was not checked — treat it as a hint, use `classroomId` with `/api/stages/{id}`.
4. **`UIMessage` shape.** `messages` is `UIMessage<ChatMessageMetadata>[]` imported from the `ai` SDK (`lib/types/chat.ts:9,342`). The required `role`/`parts` structure for the pinned `ai` version was not read out of `node_modules`.
5. **Per-key Spanish coverage.** `es-MX.json` exists and is key-parity-checked against `en-US.json` (`scripts/check-i18n-keys.mjs:4-5`), but whether generation *prompts* produce good Spanish was not testable statically. Prompt templates are English-authored with a free `languageDirective` (`packages/@openmaic/generation/templates/requirements-to-outlines/system.md`), so Spanish output depends on the model, not on a shipped Spanish prompt set.
6. **`interactive` widget renderers.** `components/scene-renderers/` has `interactive-renderer.tsx` / `InteractiveIframeHost.tsx` but no per-widget component directory; whether all six widget types have a working renderer (vs. relying entirely on generated `content.html`) was not verified.
7. **Whether `/api/chat` (legacy) is flag-gated.** `/api/chat/pi` checks `isPiChatEnabled()`; `app/api/chat/route.ts` has no equivalent gate in its source, but whether it is reachable in a default build was not confirmed.
8. **`outline` field of `MaicDocument`.** Typed `unknown` (`packages/@openmaic/storage/src/document/types.ts:146`); the app shape is `AppDocumentOutline` (`app/api/stages/route.ts:103-109` shows `{ outlines, requirement, generationComplete, createdAt, updatedAt }`) but the full interface was not read.
9. **Stale-write rejection.** No HTTP parameter carries a `rev` or an `If-Match` back to the server; `PUT` overwrites `updatedAt` unconditionally (`app/api/stages/[id]/route.ts:171-174`). Last-write-wins appears to be the actual behaviour except for the `dslVersion` check. Not confirmed whether the store applies an additional internal optimistic check.
