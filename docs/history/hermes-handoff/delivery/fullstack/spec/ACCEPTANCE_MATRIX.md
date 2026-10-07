# Full-stack acceptance matrix — Kaizen live classroom

Authored **2026-10-03T22:35Z–23:05Z, before reading any new implementation** (no native/compat/frontend
lane output existed at authoring time; `delivery/fullstack/` held only the baseline manifest, the
upstream manifest, the Astra continuation plan and the restored-preview readback). Authority:
`delivery/handoffs/20261003T221349Z/HANDOFF.md` and the newest `DIRECTION.md` sections — including the
**newest owner priority: isolated tutor runtime, lessons catalogue, course generation, and a visual /
spoken / direct-manipulation teaching theater as the primary interface with text as backup so the
product can reach learners who cannot rely on reading.** Owner of this file: the independent
specification lane. No application, test, evidence, classroom, upstream or snapshot file is touched
by this lane.

**Two owner constraints govern every row below.** First, *no decorative shell-first implementation*:
Kaizen shell polish that arrives without working catalogue/course/theater capability is a `FAIL`, not
partial credit. Second, *no text-slides-as-visual claim*: rendering prose, bullet lists, captions or
text baked into an image does not satisfy any visual criterion.

## 0. How to read this

Every criterion is **`UNEXECUTED`** until a raw transcript for its own gate exists. A pass in one
gate never implies a pass in another. There is no aggregate score: an unexecuted row is never
counted as a pass, and a harness defect is recorded as a harness defect, not as an application pass
or an application failure.

| Gate | Prefix | What satisfies it | What can never satisfy it |
|---|---|---|---|
| Static / offline | `FS-S` | Source, config, doc and manifest inspection with the app stopped | — |
| Local runtime | `FS-L` | Candidate booted on an isolated loopback port, **zero provider calls** | Any claim about teaching quality or model identity on the wire |
| Live provider | `FS-V` | One real outbound native Anthropic `claude-opus-5` request captured in the same transcript | Mock, stub, fixture, replay, cached hit, or fault injection |
| Browser | `FS-B` | Real Chrome for Testing driving the real DOM | Fixture-intercepted `/api/*` as proof of server or provider behaviour |
| Device | `FS-D` | Real microphone / speaker / assistive technology on real hardware | Synthetic audio files, fake recognizers, stub transcription |
| Cloud | `FS-C` | Access-controlled verified Vercel preview | Any localhost result |

Rows marked **FIXTURE-ONLY** constrain the client layer and are labelled as such in evidence.
Rows marked **NEGATIVE** must be observed failing closed; a missing observation is not a pass.

## 1. Retained criteria — by reference, not renumbered

These existing criteria remain in force exactly as written. Do **not** re-number, re-baseline,
delete, skip-mark or weaken them. They are reused rather than copied so no requirement is lost and
no requirement is duplicated with a drifting second wording.

| Source | IDs | Status entering this cycle |
|---|---|---|
| `delivery/verification/opus-cache-spec-20261003T192837Z/SPEC.md` Group E | **E1–E14** | **OPEN / UNEXECUTED.** Live provider + durable archive gate. Metadata unit tests do not replace it. |
| same, Groups A–D, F | A*, B*, C*, D1–D6, F1–F4 | Carried forward. D6 (old tests unedited) and F2 (originals immutable) are hard blockers for this cycle. |
| `lesson/SPEC.md` (and the identical copy in each checkpoint freeze) | S1–S14, N1, E1–E17, M1–M22, persistence tier | Carried forward for the vanilla `lesson/` surface. `E14` there (`camera=()`, `microphone=()`) is **superseded** for microphone only — see `FS-S31`. Its camera half stands. |
| `delivery/LESSON_METADATA_CONTRACT.md` | §Shared API 1–6, §Acceptance | Carried forward as the metadata/feedback wire contract. |
| Four known stale failures (2× `tests/server.test.mjs`, `tests/lesson-archive-store.test.mjs`, `tests/lesson-archive-partition.test.mjs`) | — | **Adjudicate by written mapping + additive named tests only.** Editing any of them to green is an automatic `FAIL` of `FS-S47`. |

Where a retained ID and a new `FS-*` ID overlap, both must hold; the stricter wording governs.

## 2. New criteria

### 2.1 `FS-S` — static / offline

**Provider identity, routing and credential boundary**

| ID | Criterion |
|---|---|
| FS-S01 | Every reachable generation/chat/tool route resolves its model **server-side** to canonical native Anthropic `claude-opus-5`. Grep shows no route deriving provider, model, base URL, key or auth header from request body, query or header. |
| FS-S02 | Upstream workspace-provider escape is closed: OpenMAIC `allowWorkspaceProviders` is `false` (or the equivalent policy is enforced) in the configuration the candidate actually loads. |
| FS-S03 | No fallback provider or fallback model is configured on any reachable path. An empty list is required, not a commented-out line. |
| FS-S04 | **NEGATIVE.** No OpenRouter generation, summarization, vision, embedding or diagnostic path exists in the candidate. OpenRouter appears only in TypeSafe Jev finite-decision tooling outside the served runtime. |
| FS-S05 | **NEGATIVE.** No Fable model identifier is *called* anywhere in the candidate. Historical Fable names inside preserved documents, fixtures and test assertions are records, not calls, and must remain unedited. |
| FS-S06 | **NEGATIVE.** No DeepSeek or other third-party vendor route is reachable from the candidate. |
| FS-S07 | The credential is read only in server process memory via the existing canonical resolver pattern. No key file, `.env*`, Hermes credential store or auth JSON is inside any client bundle, public dir, build output or deploy manifest. |
| FS-S08 | `grep -rlE 'sk-ant-[A-Za-z0-9]\|eyJ[A-Za-z0-9_-]{12,}\|cc-[A-Za-z0-9]{16,}'` over the frozen candidate returns no match. |
| FS-S09 | Raw provider errors, stack traces and prompt bodies are not written to any log or returned to the client. Errors are typed `code` + `status` with fixed copy. A 429 must not be rendered as "credits exhausted". |
| FS-S10 | Reasoning effort is set to the maximum the resolved model supports, at the request-construction site, not merely in a config comment. |

**Privacy, nickname and library boundaries**

| ID | Criterion |
|---|---|
| FS-S11 | The nickname/profile-name field is never serialized into a provider prompt, system message, tool argument, cache key or log line. Traced from the input binding to every send site, not asserted from a single call site. |
| FS-S12 | Self-reported age is used for difficulty/vocabulary/pacing only. No code treats it as identity, consent, eligibility or an ability assessment. |
| FS-S13 | Learner conversation turns, typed answers and tutor replies are **never** written into the shared lesson library/cache. Library records contain generated lesson content and provenance only. |
| FS-S14 | The coarse `{browser, os, type}` device descriptor is excluded from the pedagogical cache key, and no user-agent string, IP, screen geometry, hardware ID or fingerprint is collected. |
| FS-S15 | **NEGATIVE.** No camera, `getUserMedia` for video, emotion inference, attention scoring, keystroke-cadence profiling or engagement-target metric exists in the candidate. |
| FS-S16 | The coach records only actual attempts, actual assistance and evidenced misconceptions. No covert inference channel and no second conversational output surface. |
| FS-S17 | Any wording that saving is local must not obscure that lesson requests and submitted work go to Anthropic. Both disclosures are present and mutually consistent. |

**Product scope — all-age, open-topic, Kaizen surface**

| ID | Criterion |
|---|---|
| FS-S18 | Entry collects nickname **then** age before a learning goal, and nothing else is required to start. |
| FS-S19 | The learning goal is free-text open-topic. No subject allowlist, no grade enumeration and no K–8 gate blocks a goal. Any residual K–8 or subject enum is confined to legacy/compat paths and is not on the current entry path. |
| FS-S20 | Age-aware teaching is a real parameter of generation (difficulty/vocabulary/pacing in the prompt contract), not a cosmetic label. Breadth of intent is documented as intent, never as proven efficacy. |
| FS-S21 | The dashboard reuses the pinned Kaizen interior — `snapshots/Kaizen-AI/web/` composition, tokens, type, paper/panel/ink/rose selection, 240px desktop rail and mobile navigation per `delivery/kaizen-interior-extract.md`. A generic admin shell is a `FAIL`. |
| FS-S22 | Dashboard, lessons/library, continue-a-lesson, growth and parent/student views all exist as real routed surfaces reading real state, not placeholder panels. |
| FS-S23 | The growth surface distinguishes activity, assistance, self-report and independently demonstrated checks. Thumbs and completion are never presented as mastery. |
| FS-S24 | The parent view is explicitly labelled, shows relevant learning activity, accepts parent observations, and does not relabel parent input as independent mastery evidence. |
| FS-S25 | EN and ES both cover interface chrome, generated-content language, disclosures, error states and empty states — not navigation labels only. |

**OpenMAIC reuse, not rewrite and not vanilla-only**

| ID | Criterion |
|---|---|
| FS-S26 | The candidate **actually reuses** the pinned upstream runtime for generation/orchestration/stage/storage (`resolveModel`, the Pi director loop, the AI SDK provider layer, upstream scene/whiteboard tools). A re-implementation of classroom capability inside `lesson/` while upstream sits unused is a `FAIL` of the owner's "entire stack" instruction. |
| FS-S27 | Conversely, no unbounded rewrite: the diff against `delivery/fullstack/UPSTREAM_MANIFEST.json` is limited to runtime/config/page/component files with a stated reason each. Mass regeneration of upstream source is a `FAIL`. |
| FS-S28 | `upstream/OpenMAIC/` is byte-unchanged and still read-only (0444 / 0555). `classroom` HEAD remains `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa` and every intentional change is an explicit tracked diff, never an untracked silent edit. |
| FS-S29 | All upstream MIT/licence notices and source provenance are preserved in every reused file. |
| FS-S30 | Unreviewed upstream surfaces are disabled in the candidate: file upload, web search, arbitrary tool execution, generated-code execution, other vendors, cloud speech, public/anonymous access. Generated content is never executed in the same-origin DOM. |

**Voice, camera, accessibility defaults**

| ID | Criterion |
|---|---|
| FS-S31 | Camera is OFF by permissions policy. Microphone is **opt-in** (policy permits same-origin, code requests only on explicit user action, with visible state) — this deliberately supersedes the old `microphone=()` assertion. The old assertion stays in the suite as a recorded stale expectation with a written mapping; it is not edited. |
| FS-S32 | Every voice-driven action has a typed/keyboard alternative reachable without the microphone. No automatic playback and no automatic device activation on load. |
| FS-S33 | Local-only transcription never silently falls back to a cloud recognizer; a switch requires explicit user action and visible disclosure. |
| FS-S34 | Reduced-motion is honoured; pause/replay controls exist on teaching scenes; focus is visible and no control is keyboard-unreachable (static audit; `FS-B` proves behaviour). |

**Roles, versioned state and cancellation (static contract)**

| ID | Criterion |
|---|---|
| FS-S35 | Exactly one learner-facing conversational output surface exists. Artist and coach emit structured state/proposals, never prose into the tutor stream. |
| FS-S36 | Shared lesson state carries `lessonId` + `turnId` + `revision` (or equivalent monotonic version), and every role result is tagged with the version it was computed against. |
| FS-S37 | A stale role result — one whose version is older than current — is **rejected and discarded**, with a code path that cannot fall through to rendering. |
| FS-S38 | Cancellation is wired end to end: an aborted turn cancels in-flight role calls and cannot later mutate rendered state. |
| FS-S39 | Role responsibilities are deterministic and non-overlapping in code (one owner per action class). Three labels over one shared canned response is a `FAIL`. |
| FS-S40 | Role calls are bounded (max turns/tokens/tool-iterations per role per turn). No unbounded agent loop and no speculative agent infrastructure beyond the three required roles. |
| FS-S41 | The tutor never claims to be human or to have feelings, and has an explicit uncertainty-acknowledgement path. |

**Archive, caching, feedback and error contract (static)**

| ID | Criterion |
|---|---|
| FS-S42 | **Every** valid generated lesson version is archived durably before the 200 is sent. Failed generations, refusals and malformed responses are not archived as lessons. |
| FS-S43 | Feedback is per lesson **version** (full 64-hex `recordId`), stored in separate atomic records so a vote never invalidates a lesson digest or cache key. |
| FS-S44 | Cache reuse is labelled cached, never live, and preserves the original generation provenance and first-generation timing. |
| FS-S45 | fsync/dirsync failure, corrupt feedback bytes and unreadable records produce **typed errors**, never fabricated zeros, never a false "archived/durable" claim, and never an overwrite of the corrupt bytes. |
| FS-S46 | No arbitrary expiry, deletion or destructive migration of the existing library. All 8 existing files in `.local-data/lesson-library/` (3 `.json`, 3 `.rec`, 2 `.fb`) are byte-identical to `delivery/fullstack/baseline-20261003T223400Z/manifest.json` after the whole cycle, except for legitimately added new records. |
| FS-S47 | **NEGATIVE / blocker.** No historical test assertion, frozen fixture, prior evidence file, checkpoint or snapshot was edited, deleted or skip-marked. Verified by hash equality against the pre-change manifests. |
| FS-S48 | The deliverable explicitly states that a local-filesystem archive does not cover future multi-instance/serverless users, and that public auth, tenant isolation and retention remain a separate unmet gate. |

**Isolated tutor runtime, catalogue and course generation (newest owner priority)**

| ID | Criterion |
|---|---|
| FS-S49 | **Isolation, read conservatively.** Agent/tutor state is scoped to a lesson/session: no cross-session or cross-profile bleed of conversation, plan or stage state. Generated visual content is rendered through a safely isolated path (validated declarative scene data, or a sandboxed frame) and never as same-origin executable code. A *second disconnected tutor product* is a `FAIL` — isolation means scoped state inside the one candidate runtime. |
| FS-S50 | A **lessons catalogue** exists as a real browsable surface backed by real records (existing library + generated courses), not a hard-coded list and not a dashboard tile that links nowhere. |
| FS-S51 | **Course generation** produces a multi-lesson structure — an ordered sequence with its own identity, progress and resumption — distinct from single-lesson generation. One lesson relabelled "course" is a `FAIL`. |
| FS-S52 | Course and catalogue records are archived and versioned under the same durability/provenance rules as lessons (`FS-S42`–`FS-S46`): save before 200, immutable versions, honest cached labelling, no silent expiry. |
| FS-S53 | Course continuation resolves to the correct next lesson from recorded progress, and never silently restarts a course or loses completed position. |
| FS-S54 | **No decorative shell-first.** Catalogue entry, course start and course continue are reachable and functional in the candidate. Kaizen shell/visual polish present while any of those three is non-functional is recorded as a `FAIL` of this row, not as progress on `FS-S21`. |

**Teaching theater — visual / spoken / direct manipulation primary, text as backup**

| ID | Criterion |
|---|---|
| FS-S55 | The teaching stage is the **primary** interface region of the lesson surface, with the tutor transcript as a supporting panel — not a chat log with a thumbnail beside it. |
| FS-S56 | **NEGATIVE / no text-slides-as-visual.** No stage output consists of prose paragraphs, bullet lists, headings or text rasterised into an image presented as the visual explanation. Text inside a visual is permitted only as a label/axis/caption on an actual diagram, animation or manipulable. |
| FS-S57 | Stage capability includes at least: topic-appropriate **diagram**, **animation/stepped motion**, and **direct manipulation / selection** (point, choose, drag-or-equivalent, arrange). All three are real code paths the tutor can invoke, not one renderer with three labels. |
| FS-S58 | **Spoken guidance** is a first-class output channel for the tutor turn: synthesized or recorded speech for the explanation, gated by explicit consent, with visible state and a stop control. No automatic playback on load. |
| FS-S59 | **NEGATIVE.** More visuals must mean more explanatory value: no generic repeated counter dots as a universal visual, no decorative density, no arbitrary animation unrelated to the current explanation, no filler motion to occupy space. |
| FS-S60 | **Non-reading entry path.** Catalogue entry, course goal selection, course start and course continue are each operable without fluent reading: icon/image/spoken-label affordances, audio prompts, or demonstration — in addition to the text label, never only the text label. Traced control-by-control, not asserted globally. |
| FS-S61 | **Text/caption/transcript backup is always available.** Every spoken output has a caption or transcript; every visual has an accessible text description; readable text remains reachable for learners and for assistive technology. Backup presence must not be achieved by demoting the visual channel. |
| FS-S62 | **Non-drag and non-voice alternatives.** Every direct-manipulation interaction has a keyboard-operable and pointer-click-only equivalent reaching the same state. Every voice-driven action has a typed/clicked equivalent. No interaction is drag-only or speech-only. |
| FS-S63 | Age is used for difficulty/pacing only and is **never** used to infer reading ability. Literacy support is unconditional, not switched on by a low age. |
| FS-S64 | **Honest-claim gate.** No document, UI copy or evidence file claims verified low-literacy efficacy, verified accessibility, or verified spoken-interaction usability. These are stated as design-and-testing goals requiring real-user validation (`FS-D05`–`FS-D07`). A few words of owner direction is not validation. |

### 2.2 `FS-L` — local runtime, isolated loopback, zero provider calls

| ID | Criterion |
|---|---|
| FS-L01 | The candidate boots on an **isolated** loopback port that is not 51206 and not any port held by the unrelated LobeHub/Postgres stack. That stack is untouched and still running afterwards. |
| FS-L02 | `GET /api/health` (or upstream equivalent) reports the server-side configured provider/model without exposing credentials or raw config. Mode/config only — explicitly **not** live proof. |
| FS-L03 | **NEGATIVE.** A request carrying `model`, `provider`, `apiKey`, `baseURL`, `baseUrl`, `Authorization`, `x-api-key` or a provider header override is **refused** (4xx) or the override is dropped; the observed resolution is still canonical Opus. One case per override vector. |
| FS-L04 | **NEGATIVE.** `Host: evil.example` and `Origin: http://evil.example` on every state-changing route are rejected 4xx with no body. `Host`/`X-Forwarded-*` are authoritative for nothing. |
| FS-L05 | **NEGATIVE.** Wrong `Content-Type`, absent body, oversized body (≥256 KB), over-long goal/answer and out-of-range numeric fields all return 400/413/415 before any provider dispatch. |
| FS-L06 | **NEGATIVE.** Unknown `/api/*` ⇒ 404; wrong method ⇒ 405; archive/library filesystem paths are not directly fetchable (404), and there is no directory listing. |
| FS-L07 | **NEGATIVE.** Static-allowlist probes (`/.env`, `/.env.local`, `/server.mjs`, `/SPEC.md`, `/package.json`, `/.git/config`, encoded traversal variants) return 403/404 with no body leak, and the bodies contain no credential-shaped material. The body is never printed, logged or stored. |
| FS-L08 | Document response headers: CSP present with `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, no `unsafe-eval`, no `*` in `script-src`/`connect-src`; `X-Content-Type-Options: nosniff`; no `Access-Control-Allow-Origin: *`. |
| FS-L09 | `Permissions-Policy` disables `camera`; microphone is same-origin opt-in per `FS-S31`. |
| FS-L10 | Concurrency bound holds: two concurrent valid generation requests ⇒ exactly one proceeds, the other gets a stated-reason 409/429 and produces no lesson. (Counted provider dispatches, not responses.) |
| FS-L11 | **NEGATIVE.** A forced archive-write failure yields an honest typed error and no false cached/archived claim. Executed against an **isolated copy** of the store, never the owner library, then state restored. Labelled offline fault injection — error-handling evidence only. |
| FS-L12 | **NEGATIVE.** A corrupted archive record is quarantined, not served as a lesson. Isolated copy only. |
| FS-L13 | The existing `.local-data/lesson-library` records remain readable by the new candidate's reader (compat read path), with provenance and feedback intact and no rewrite on read. |
| FS-L14 | Node test suites run and their raw output is retained: the 27 metadata-correction tests, the current aggregate suite, and every new additive test. Raw failures are preserved verbatim; the four known stale expectations are reported as known stale records with a written mapping, not as passes and not as edits. |
| FS-L15 | Catalogue and course routes exist and respond on the candidate: list catalogue, create course, read course, continue course. Each validates its body and rejects unknown IDs **before** any write or provider dispatch. |
| FS-L16 | **NEGATIVE.** Course/catalogue routes are same-origin-checked, not publicly reachable, and expose no raw filesystem path, no directory listing and no voter-token hash. |
| FS-L17 | **NEGATIVE / session isolation.** Two concurrent sessions do not see each other's conversation, plan, stage or progress state. Asserted by driving two isolated clients against the same candidate. |
| FS-L18 | Stage scene payloads are **schema-validated server-side** before reaching a client, and a payload carrying markup, `javascript:`, `on*=` handlers or an unknown scene kind is rejected rather than escaped-and-forwarded. |
| FS-L19 | **NEGATIVE.** No stage path evaluates model-produced code: no `eval`, no `new Function`, no `innerHTML` of generated content, no unsandboxed dynamic `<script>`/`<iframe srcdoc>` on the stage render path. |

### 2.3 `FS-V` — live provider (real native Opus call)

> Preconditions: candidate running, adult owner present, real credentials in server memory.
> **Mock / synthetic / replayed / cached runs cannot satisfy any `FS-V` row.**
> Budget discipline: at most one corrected retry per row; two equivalent failures stop the route.

| ID | Criterion |
|---|---|
| FS-V01 | A real lesson is generated through the **candidate's own** runtime: HTTP 200, schema-valid non-empty lesson, with the outbound Anthropic request captured in the same transcript. |
| FS-V02 | The captured outbound request independently re-confirms canonical native Anthropic host, no OpenRouter, model `claude-opus-5`, and maximum reasoning **on the wire** — observed, never inferred from a label. |
| FS-V03 | The provider-**reported** response model is captured and recorded separately from requested and configured identity. If it cannot be observed (streaming path), it is recorded `null`/unproved, never backfilled from the configured value. |
| FS-V04 | An incorrect answer returns real, non-crashing feedback that identifies the answer as wrong and is specific to the submitted answer. |
| FS-V05 | The next-lesson / adaptation path works after `FS-V04` and reflects the adaptation context rather than regenerating a blank goal. |
| FS-V06 | **Latest-question-first contextual follow-up:** after a lesson exists, a follow-up question that is *not* the lesson's next scripted step is answered **as asked**, using active lesson + stage + history context, before any scripted continuation. Evidence quotes the question and the answer. |
| FS-V07 | A mid-explanation interruption (new question while the tutor is producing output) is honoured: the superseded output is cancelled or clearly closed out, and the new question is answered. |
| FS-V08 | A goal change mid-session switches the active lesson/plan without leaking the previous lesson's content into the new answer. |
| FS-V09 | **Pertinent stage, electron-shell case.** Request an atom's electron-shell structure. The stage must render shell/orbit structure appropriate to the explanation. A generic grid of N counter dots (the recorded 11-dot fallback) is a `FAIL`, not a near-miss. |
| FS-V10 | Stage output is validated before render and is coordinated with the tutor's current turn (same `lessonId`/`turnId`). No decorative repeated counters as a universal visual. |
| FS-V11 | **Role handoff is observed, not asserted:** the transcript shows a versioned artist request/result and a versioned coach proposal for the same turn, with their versions matching the tutor turn that produced them. |
| FS-V12 | **Stale rejection under live timing:** a slow role result arriving after the turn advanced is discarded and never rendered. Captured with real latency, not only in a unit test. |
| FS-V13 | The coach's proposed next practice is traceable to recorded attempts/assistance/misconceptions in the transcript, not to completion count or elapsed time. |
| FS-V14 | Pause, replay and skip work on a live teaching scene without losing lesson state. |
| FS-V15 | **Cached repeat:** the identical request returns the same lesson with **zero** new provider dispatches, proven by an unchanged dispatch counter/log across the repeat, and is labelled cached. |
| FS-V16 | **Restart persistence:** stop the process, start it, repeat the request ⇒ still a hit, and the served lesson hash equals the hash recorded at `FS-V01`. |
| FS-V17 | **Measured timing:** miss and hit durations both appear as raw numbers in the transcript; hit < miss. Prose-only timing is a `FAIL`. |
| FS-V18 | **Spanish live generation:** the same open goal in ES returns learner-facing content in Spanish, with the interface in Spanish, and does not silently fall back to English. Native Spanish *quality* remains a separate unmet human-validation gate. |
| FS-V19 | **NEGATIVE.** The nickname appears nowhere in the captured outbound request bodies, headers or server logs for the whole live run. Asserted over the captured transcript. |
| FS-V20 | **NEGATIVE.** No learner conversation turn or typed answer is present in any library/cache record written during the live run. |
| FS-V21 | A refusal/invalid generation, **if it occurs naturally**, is not archived as a lesson. If it does not occur: record `UNEXECUTED — not naturally reproduced`. Do not fabricate one. |
| FS-V22 | **NEGATIVE / blocker.** The real owner archive is unpolluted: hash `.local-data/lesson-library/` before and after the whole live run; the only delta is the legitimately generated lessons from this run. |
| FS-V23 | **Live course generation:** one open goal produces a real multi-lesson course — ordered lessons with distinct content, persisted course identity and progress. A single lesson wrapped in course framing is a `FAIL`. |
| FS-V24 | The generated course appears in the catalogue, and starting it opens its first lesson through the live runtime. |
| FS-V25 | **Course continuation, live:** after completing a lesson, continue resolves to the next lesson, preserves earlier position after a reload, and does not regenerate completed lessons. |
| FS-V26 | **Theater primacy, live:** for a non-trivial live explanation the stage carries the explanatory load — the lesson is comprehensible from the visual/animated/manipulable output plus spoken guidance with the transcript panel collapsed. Recorded as an owner/reviewer judgement against captured artifacts, not a computed score. |
| FS-V27 | **NEGATIVE, live:** no live stage output is prose/bullets/headings or text rasterised into an image presented as the visual. Checked against the actual captured scene payloads and screenshots, not against the renderer's capability. |
| FS-V28 | At least one live turn exercises each of diagram, animation/stepped motion and direct manipulation, with each selected because the topic called for it. |
| FS-V29 | **Live spoken guidance** plays for a tutor turn after explicit consent, with a working stop, and a caption/transcript matching the spoken content. |
| FS-V30 | **Non-reading live path:** a complete catalogue-entry → course-start → first-lesson → learner-response run is performed using only non-text affordances plus spoken output. Every control used is recorded. This proves the *path exists*; it is **not** low-literacy efficacy evidence (`FS-D05`). |

**Group E (E1–E14) remains separately open** and is satisfied only by its own transcript per
`delivery/verification/opus-cache-spec-20261003T192837Z/SPEC.md`. `FS-V` rows overlap it
deliberately; neither set discharges the other.

### 2.4 `FS-B` — real browser

| ID | Criterion |
|---|---|
| FS-B01 | Real Chrome, real DOM: nickname + age entry, then an open-topic goal, reaches a rendered lesson. |
| FS-B02 | Dashboard → lessons/library → open a saved lesson → continue it → growth → parent view are all reachable and render real state, verified by navigation, not by route existence. |
| FS-B03 | A previously saved lesson reopens with its content, metadata and feedback counts intact after a full page reload. |
| FS-B04 | **U1 regression — vote restores.** Vote 👍, reload: the same thumb reads `aria-pressed="true"` and the counts match. Direction must come from persisted/returned state, **not** inferred from the existence of a voter token. Both-thumbs-false after reload is a `FAIL`. |
| FS-B05 | Vote change 👍→👎, removal, and repeat-vote idempotence all behave correctly and survive reload and process restart. Test votes are removed afterwards. |
| FS-B06 | **M2 regression — truthful attribution.** When requested model identity is absent, the UI must **omit** the unobserved row or label the configured value as configured. Rendering `configured` in the `requested` position is a `FAIL`. Requested / actual-request / configured / provider-reported stay visually distinct. |
| FS-B07 | Lesson details render model identity, creation time, generation time, device descriptor and application instructions as **text nodes**; no untrusted HTML is parsed. |
| FS-B08 | XSS: goal, nickname and typed answers containing `<img src=x onerror=...>`, `<script>`, `"><svg onload=...>` render as literal text; zero matching elements created; no dialog; no `innerHTML` sink hit. |
| FS-B09 | A lesson payload carrying markup in authored fields is **rejected**, not escaped-and-shown. |
| FS-B10 | Error / network-failure / timeout / malformed-response states show an honest error, preserve the previously rendered lesson and the typed answer, and never increment a feedback count on failure. (FIXTURE-ONLY for the injected-failure half.) |
| FS-B11 | Out-of-order and duplicate responses: the later-completing request's lesson remains displayed; a late response after a confirmed clear or a profile/lesson change restores nothing. (FIXTURE-ONLY.) |
| FS-B12 | Locale switch after a lesson exists leaves authored lesson text byte-identical and does not clear the lesson; locale affects only the next generation. |
| FS-B13 | Responsive: screenshots at desktop 1440×1000, 390×844 and **320×568**. At each width `scrollWidth <= clientWidth + 1`, every primary action is in-viewport, hit-testable at its own centre and ≥24 px in its smaller dimension. |
| FS-B14 | Keyboard-only: the whole entry → goal → lesson → answer → vote path is operable with Tab/Shift-Tab/Arrow/Enter/Space alone, with visible focus throughout. |
| FS-B15 | **NEGATIVE.** `getUserMedia`, `enumerateDevices` and `Permissions.query` are instrumented at init; no video request ever fires, and audio fires **only** after an explicit microphone opt-in click. |
| FS-B16 | **NEGATIVE.** Same-origin only: every observed request host is the candidate's own loopback origin. Zero remote assets, fonts, analytics or beacons (`navigator.sendBeacon` instrumented and uncalled). |
| FS-B17 | EN and ES both render without clipping or untranslated fallback at all three widths, including error and empty states. |
| FS-B18 | **Taste gate (owner judgement, recorded not computed).** Screenshots are inspected against the Kaizen interior; filler copy, invented progress metrics, canned praise and decorative noise are called out. Passing `FS-B01`–`FS-B17` does not establish design quality. |
| FS-B19 | Catalogue renders real records in the browser; opening an entry loads that course/lesson; continuing resumes at the recorded position across a full reload. |
| FS-B20 | **Theater layout:** at 1440, 390 and 320 px the stage occupies the primary region and remains usable; the transcript is a supporting panel. A layout where the stage is a thumbnail beside a chat log is a `FAIL`. |
| FS-B21 | **NEGATIVE.** DOM audit of the rendered stage: no stage region whose entire content is `<p>`/`<ul>`/`<h*>` text nodes or a single text-bearing image presented as the visual explanation. |
| FS-B22 | **Non-drag alternative, in-browser:** every manipulable reaches the same state via keyboard alone and via click-only, verified per interaction with before/after state captured. |
| FS-B23 | Captions/transcript are present and togglable for spoken output; every stage visual exposes an accessible description (`aria-label`/`aria-describedby`/`<figcaption>` equivalent). |
| FS-B24 | **NEGATIVE.** No audio plays and no microphone opens on load or on navigation; both require an explicit click, with visible state and a working stop. |
| FS-B25 | **Non-reading affordance audit:** for catalogue entry, course goal selection, start and continue, each control carries a non-text affordance (icon/image/spoken label) alongside its text label. Enumerated control-by-control with evidence, not asserted in aggregate. |

### 2.5 `FS-D` — device (real hardware)

| ID | Criterion |
|---|---|
| FS-D01 | Real microphone capture → transcription → tutor turn, on real hardware. Synthetic audio files and fake recognizers are explicitly **not** evidence. Currently blocked by the recorded `pack-install-timeout`. |
| FS-D02 | Real speaker playback of tutor output, with visible state and a working mute/stop. |
| FS-D03 | Real screen-reader / assistive-technology pass on the entry, lesson and vote flows. |
| FS-D04 | Real mobile device at 320–390 px, not an emulated viewport. |
| FS-D05 | **Real low-literacy user validation.** Observed sessions with real learners who cannot rely on reading, completing catalogue entry, course start and a lesson. This is the only evidence that can close the literacy-reach claim. Owner direction, agent judgement and a non-reading *path* check (`FS-V30`) do not substitute. |
| FS-D06 | Real spoken-interaction usability on real hardware: speech output intelligible and speech input (if used) usable by the above learners. |
| FS-D07 | Real assistive-technology validation of the theater: stage descriptions, captions, transcripts and non-drag alternatives verified with an actual screen reader and actual keyboard-only operation by a user of those tools. |

### 2.6 `FS-C` — cloud / Vercel

| ID | Criterion |
|---|---|
| FS-C01 | An access-controlled Vercel **preview** deploys and serves the candidate; the manifested source/build is read back and matches the frozen candidate. |
| FS-C02 | Secrets are server-side only in the cloud runtime. No Hermes credential store, `.env.local` or key file is in the deployment. |
| FS-C03 | **Fail closed in cloud:** with no durable store configured the system refuses rather than writing to ephemeral disk and reporting success. |
| FS-C04 | kaizenedu.net, www, the existing production deployment and the original repositories are **unchanged** throughout. |
| FS-C05 | Public auth, tenant isolation, retention/consent and educational validation are recorded as **separate unmet gates**. A working preview does not close them. |

## 3. What is executable now, and what is not

| Group | Automation | Harness |
|---|---|---|
| `FS-S01`–`FS-S17`, `FS-S26`–`FS-S31`, `FS-S42`–`FS-S48`, `FS-S49`/`FS-S56`/`FS-S59`/`FS-S64` (the greppable half) | **Automated, fixture-free** | `delivery/fullstack/spec/static-gate.mjs` (Node stdlib only, no server, no browser, no provider) |
| `FS-S18`–`FS-S25`, `FS-S32`–`FS-S41`, `FS-S50`–`FS-S55`, `FS-S57`–`FS-S58`, `FS-S60`–`FS-S63` | Manual source read + reviewer sign-off | — |
| `FS-L01`–`FS-L19` | Automated once a candidate URL exists | `delivery/fullstack/spec/runtime-gate.mjs` (Node stdlib HTTP; refuses to run against 51206) |
| `FS-B01`–`FS-B25` | Existing Playwright | `verify/playwright.lesson.cjs` + `verify/harness.cjs` locator adapter; `devtools/browser/node_modules/playwright`; Chrome at `~/.agent-browser/browsers/chrome-153.0.8010.52`. Edit the locator adapter, never an assertion. |
| `FS-V01`–`FS-V30`, `E1`–`E14` | **Manual, owner-consented, one bounded run** | Raw transcript capture only. No harness may issue a live call automatically. |
| `FS-D01`–`FS-D07` | Not automatable | Real hardware / real users |
| `FS-C01`–`FS-C05` | Not automatable here | Vercel |

No synthetic, mocked or fixture-backed result may be recorded against any `FS-V`, `FS-D`, `FS-C` or
`E` row. The two pre-existing mock tests are explicitly not live evidence.

`FS-V26` and `FS-B18` are **recorded judgements**, not computed scores: the reviewer states a verdict
against named captured artifacts. `FS-V30` proves a non-reading path exists and must never be reported
as `FS-D05` low-literacy validation.

## 4. Exact commands

```sh
cd /Users/man/education-product-discovery

# FS-S static gate — needs nothing running
node delivery/fullstack/spec/static-gate.mjs \
  --target classroom --target lesson \
  --baseline delivery/fullstack/baseline-20261003T223400Z/manifest.json \
  --out delivery/fullstack/spec/evidence/static-gate-$(date -u +%Y%m%dT%H%M%SZ).json

# FS-L runtime gate — only against the NEW isolated candidate port
node delivery/fullstack/spec/runtime-gate.mjs \
  --base http://127.0.0.1:<candidate-port> \
  --out delivery/fullstack/spec/evidence/runtime-gate-$(date -u +%Y%m%dT%H%M%SZ).json

# FS-B browser — existing harness, existing Chrome, installs nothing
cd devtools/browser && LESSON_BASE=http://127.0.0.1:<candidate-port> \
  npx playwright test -c ../../verify/playwright.lesson.cjs

# FS-L14 node suites — raw output retained, never filtered
cd /Users/man/education-product-discovery/lesson && node --test tests/ 2>&1 \
  | tee ../delivery/fullstack/spec/evidence/node-suite-$(date -u +%Y%m%dT%H%M%SZ).txt
```

`runtime-gate.mjs` hard-refuses `51206` so an acceptance run can never be scored against the old
frozen preview.

## 5. Unexecuted gate ledger — status at authoring time

Every row in §2 is `UNEXECUTED`. Nothing in this document is evidence of a pass. The gates known to
be *blocked* rather than merely not-yet-run:

| Gate | Blocker |
|---|---|
| `FS-V*`, `E1`–`E14` | No candidate runtime exists yet; native Opus through the upstream runtime is unproven. |
| `FS-D01` | Browser speech-pack install timed out (90 s headless / 70 s headed); no transcription obtained. |
| `FS-D02`–`FS-D04` | No real-hardware session has been run. |
| `FS-D05`–`FS-D07` | No real low-literacy learner, spoken-interaction or assistive-technology session has been arranged. **This is the controlling blocker on the entire literacy-reach claim** and cannot be closed inside this delivery cycle. |
| `FS-C01`–`FS-C05` | No deployment performed; production deliberately untouched. |
| `FS-S26`, `FS-S49`–`FS-S64` | `classroom/` is at the pinned SHA with a clean tree; no catalogue/course/theater implementation exists yet, so neither reuse nor theater primacy can be assessed. |

Two correction cycles maximum. A row that still fails after the second correction is reported open
with its exact failing wording, not relabelled, not deleted, and not averaged away.

## 6. Lane ownership during this cycle

The matrix is scored against work produced by lanes with disjoint file ownership. A row must be
scored against the lane that owns its files; a lane's self-report is not evidence.

| Lane | Owns | Rows it is scored on |
|---|---|---|
| Native integration | `classroom` server/runtime/config, `delivery/fullstack/native/` | `FS-S01`–`FS-S10`, `FS-S26`–`FS-S30`, `FS-S49`, `FS-L*`, `FS-V01`–`FS-V05`, `FS-V15`–`FS-V17`, `FS-V23` |
| Lesson compatibility | `lesson/app.mjs` + narrow store/server helpers, additive tests | `FS-S42`–`FS-S47`, `FS-L13`–`FS-L14`, `FS-B04`–`FS-B06` |
| Frontend (`sa-0-31400584`) | **only** `classroom/app/kaizen/**`, `classroom/components/kaizen/**`, `classroom/lib/kaizen/client/**`, consuming upstream APIs | `FS-S18`–`FS-S25`, `FS-S50`–`FS-S64`, `FS-B01`–`FS-B03`, `FS-B07`–`FS-B25` |
| Specification (this lane) | `PRODUCT.md`, `lesson/STATUS.md`, `delivery/fullstack/spec/**` | Authors and scores the matrix; writes no application code |

This lane did not read any lane's implementation before authoring §1–§5.
