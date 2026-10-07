# Kaizen education product — complete consolidated work record

**Snapshot date: 2026-10-07 (UTC).** Single-document consolidation of the Kaizen work **recorded in
the project documents inspected for it**, written to be readable on its own after download. It is a
record assembled from those documents and from a direct read of the current native configuration —
not a byte-for-byte account of every commit, run, log or line of code.

## 0. What this document is, and is not

This is **the work record**: what was asked for, what was built, what was measured, what failed,
what was superseded and why. It is **not** the source code, not the full raw evidence set, and not
a release note.

- The full application source lives in the private repository
  **https://github.com/saitokiku/kaizen-education-handoff** (GitHub reports it private; verified
  2026-10-07). The portable copy of that source is the repository this file sits in.
- Repository links below are **evidence pointers**, not a substitute for the content here. Where a
  source exists in this portable repository it is a relative Markdown link. Where it exists only in
  the original working directory it is written in `code form` and labelled
  *original-workspace source; not included in the portable repository*.
- Original-root-relative paths are used throughout (`lesson/…`, `delivery/…`), because the layout
  was preserved by the export.
- No secrets, credentials, learner data, raw provider logs or whole source files are embedded here.

Four evidence classes are kept apart everywhere below, because conflating them is how this project
previously produced false status: **implementation** (code exists), **tests** (offline assertions
passed), **historical evidence** (a real run happened once, on a build that may no longer be the
current one), and **proposal / open gate** (specified, never executed).

Repository state read 2026-10-07: clean-handoff `HEAD = 64c4136`, `main` synchronized with
`origin/main`. That commit is the **base this document was written against**, immediately before the
commit that adds this file — not a timeless "current HEAD". Re-check `git log` before relying on it.

---

## 1. Executive state in plain language

Kaizen is an AI teaching product. A learner gives a nickname and an age, types any learning goal,
and the system should generate and teach a real lesson on an interactive visual stage — explaining
with diagrams and manipulable demonstrations rather than walls of text — then check understanding
and keep an honest record of what was attempted and what was actually demonstrated.

**What genuinely exists today.** Two working lineages. First, a self-contained Node/vanilla-JS
lesson engine with a live-provider teaching loop, a durable immutable lesson archive with exact-match
reuse, extensive per-lesson metadata, thumbs feedback, local-only speech transcription and a
browser-tested UI. Second, the complete pinned upstream **OpenMAIC** classroom application, adopted
as the candidate foundation, with a Kaizen profile/catalogue/course surface added on top of it, a
native Anthropic OAuth adapter after which real provider calls historically succeeded where they had
previously failed with 429, and a `soloTutor` change that narrows the speaking roster to one tutor.
One real lesson **was** generated on that candidate and later read back with four persisted scenes,
including an operable fraction simulation and a playable catch game — concrete rendered and
interactive behaviour, on one lesson, at one age, in one language.

**What does not exist.** Full teaching-stage parity with upstream OpenMAIC — the owner's latest
stated requirement — is not delivered. The worker assigned to stage parity failed before writing any
application code; the practice-history worker wrote no files; the parity-inventory worker was
interrupted. There is no working tutor → stage-artist → learning-coach coordination (that remains a
code comment stating intent). There is **no verified production-ready build, release or
fresh-machine boot** — a production build and a server boot *were* recorded historically in the
native lane, but neither was re-run, reconciled or accepted as a release gate here. There is no
real-child readiness, no demonstrated learning efficacy, no complete accessibility conformance, and
no verified full Spanish stage path (an explicit Spanish *chat* answer was historically exercised;
ES-locale generation, ES scene content and ES narration were not).

**The honest summary:** substantial, independently exercised components; a candidate foundation that
installed, booted, made real provider calls and produced one inspectable interactive lesson; and an
unfinished integration whose central requirement — a teaching stage at least as capable as
OpenMAIC's, then better — is open and unmeasured.

Authoritative current-state statement: [HANDOFF.md](HANDOFF.md). It overrides stale status headings
elsewhere, in particular the "CONTROLLING CURRENT STATE" block in
[lesson/STATUS.md](lesson/STATUS.md) and the closing paragraph of [PRODUCT.md](PRODUCT.md), both of
which still say the classroom candidate is clean, uninstalled and unintegrated. That wording is
historical. The candidate **was** installed, booted and partially integrated; what remains unproven
is behaviour and parity, not installation.

---

## 2. Current product requirements

The latest owner requirement, verbatim: *"our tutor stage is not as extenisve as openmaic, make it
atleast that and then better"*. The entire OpenMAIC teaching stage is the baseline — not a reduced
reimplementation. Restore reachable functionality first, then demonstrate improvement in relevant
visual teaching, usable interaction and learning continuity. Source presence establishes neither
runtime availability nor educational quality.

Requirements in force ([DIRECTION.md](DIRECTION.md), [PRODUCT.md](PRODUCT.md)):

1. **All ages, open topics.** Nickname → self-reported age → freely typed learning goal, nothing
   else required to start. Age guides difficulty, vocabulary and pacing only — it is not identity,
   consent, eligibility or an ability assessment. This **supersedes** the earlier K–8-only scope,
   the adult-workforce/certification pivot that was explicitly rejected, and the organizer-first
   product hypothesis.
2. **EN and ES**, covering interface chrome, generated content, disclosures, error and empty states
   — not navigation labels only.
3. **Visual-first teaching.** Prose, bullets, headings, or text rasterised into an image do not
   count as a visual explanation. Learners who cannot rely on reading are explicitly in the
   intended audience; that is a design and testing goal, never a verified capability.
4. **One visible tutor.** A quiet stage artist and a background learning coach are requested and
   **not implemented**. The coach is not surveillance: no emotion inference, no attention scoring,
   no engagement targets, no hidden collection.
5. **Camera OFF.** Camera is recorded as future direction only; before any implementation it needs
   an explicit visible signal, opt-in consent, a stated retention boundary, a non-camera equivalent
   path and validation. Attention is never evidence of learning.
6. **Voice comes after the lesson/chat/visual core is proved** — sequencing, not prohibition.
   Podcasts remain a roadmap toolkit item, not an acceptance blocker.
7. **Honesty.** Completed activities, thumbs votes and game scores are never presented as proven
   mastery. Feedback is self-reported helpfulness. Generated answer keys can be wrong.
8. **Keep the Kaizen dashboard and lessons library around the stage.** Shell polish must never
   precede working catalogue/course/theater capability.
9. **Top taste rule, owner's wording:** *"dont make anything look or sound or feel like AI slop."*

---

## 3. Chronological workstream inventory

### 3.1 Discovery — four prior repositories audited

Four exact-commit repositories (`KaizenEdu`, `Kaizen-AI`, `Tutornat`, `trellis`) were inspected
across architecture, product/learning evidence, UX/accessibility and reliability/privacy/cost. Three
specialist reports returned; the architecture agent exhausted its budget and the coordinator
completed that artifact.

Findings that changed subsequent decisions: the closest implemented human workflow was **group**
tutoring, not a finished private-tutor marketplace; the most important missing feature was a reliable
**handoff** to the person expected to act; "measured growth" needed stricter evidence than
successfully assisted work; release controls (provider eligibility for minors, deletion/export
completion, spend enforcement, tenant isolation, accessibility recovery) were incomplete in source;
and more features were not the missing evidence — nobody outside the owner had used any version.

Status: **complete, historical.** The coordinator's own recommendation (start with existing tutoring
practices) was **not adopted**. Tutornat contributed no recovered implementation — all fetched trees
were README-only.

Sources: `FINDINGS.md`, `PLAN.md`, `BRIEF.md`, `EXECUTION_PLAN.md`, `reports/architecture.md`,
`reports/product-learning.md`, `reports/ux-accessibility.md`, `reports/reliability.md`,
`evidence/parent-state.json` — *original-workspace sources; not included in the portable
repository.* [source-manifest.json](source-manifest.json) is included.

### 3.2 Design prototype and review cycles

A zero-dependency synthetic design prototype was built (three genuinely different compositions of one
parent/student workflow; Student/Parent roles; K–2 / 3–5 / 6–8 bands; EN/ES; scripted — never live —
voice turns; persistent prototype banner).

Review history, preserved because it is the project's hardest-won process lesson: the first quality
batch returned REQUEST_CHANGES from both reviewers; the coordinator reproduced nine reconciled
blockers; a first repair cycle passed 29 model / 28 spec / 50 earlier-repair / 24 UI / 114 quality
checks yet a new cross-task sequence still broke QC-02 (approving one task's date cleared another's
stale warning); a second and final repair cycle fixed the model-level date defect; a phone-path
renderer stall was reproduced three times and its **origin was never established**.

Status: **superseded as the delivery target, preserved as reference.** Included:
[DESIGN_EXECUTION.md](DESIGN_EXECUTION.md), [design/](design/) with its `*.md` reviews and
`tests/*.cjs`. The `design/evidence/` logs and screenshots are **excluded** from the export.

### 3.3 Connected frontend build

The owner rejected the prototype as "a very early prototype, not a useful frontend" and authorized a
connected build: real in-memory records for user-created fictional tasks, meaningful parent/student
transitions, replaceable mock-service states, with backend deferred.

Outcome: parallel page builders on one shared contract, then two bounded repair cycles. Integrated
verification reached unit 72/72, parent pages 54/54, student pages 21/21, original journey 97/97,
interaction 81/81. Service checks stayed 22/23 and the Playwright smoke 3/4.

Final ruling: **not accepted.** A rapid phone role-switch (clicking Parent immediately after Start
working) reproducibly fails at 390px, and root cause — application interaction versus automation
timing — was never established. The coordinator declined the reviewer's conditional PASS and
authorized no third repair cycle.

Status: **superseded by the OpenMAIC candidate; preserved.** Included: [frontend/](frontend/)
with `BUILD_CONTRACT.md`, `FRONTEND_BACKEND_CONTRACT.md`, `REPAIR_CYCLE1_REPORT.md`,
`REPAIR_CYCLE2_REPORT.md` and `tests/*.cjs`; [COORDINATOR_CARRYOVER.md](COORDINATOR_CARRYOVER.md);
[SPEC_HANDOFF.md](SPEC_HANDOFF.md). Adjudication files `FRONTEND_REPAIR1_ADJUDICATION.md`,
`FRONTEND_REPAIR2_ACCEPTANCE.md`, `FRONTEND_REPAIR2_INTEGRATION.md`,
`FRONTEND_SPEC_ADJUDICATION.md`, `FRONTEND_ADVISOR_DECISIONS.md`, `BACKLOG.md` and
`devtools/browser/runs/` are *original-workspace sources; not included in the portable repository.*

### 3.4 Kaizen dashboard interior redesign

The owner rejected the frontend's organization and asked that the product interior resemble the
existing Kaizen-AI dashboard, using its actual source as the layout/component reference — warm paper
and panel surfaces, ink action buttons, restrained rose selection, the existing type stack, a 240px
desktop rail and real mobile navigation.

Status: **reference direction, carried into the classroom Kaizen surface.** The pinned reference
`snapshots/Kaizen-AI/web/`, the extraction `delivery/kaizen-interior-extract.md` and the redesign
plan set `redesign/ASTRA_PLAN.md`, `redesign/TEAM_BRIEF.md`, `redesign/BUTTON_MAP.md`,
`redesign/REFERENCE.md`, `redesign/PAUSED.md` are *original-workspace sources; not included in the
portable repository.*

### 3.5 Lesson engine — the working teaching loop

A deliberately small engine: Node stdlib HTTP plus one Python subprocess bridge to a live provider
call. No new runtime dependencies, no database, no accounts, no server-side session persistence.

Implemented behaviour worth preserving:

- **Local grading is canonical.** `/api/feedback` grades before it calls the model and serves the
  local verdict; a model saying "correct!" on a wrong answer cannot change it. Writing is always
  `ungraded` and never a growth pass signal. Unparseable input is `ungraded`, never a default
  partial score.
- **`advance` is a conservative suggestion, never mastery** — it requires an unassisted correct
  verdict on a fresh third step, with `source:'local-check'` and `assisted:false`.
- **Cancellation is real.** The bridge is spawned `detached` into its own process group; a timeout
  sends `SIGTERM` to the group, then `SIGKILL` after 2 s, because the Python process is a grandchild
  and signalling only the direct child would orphan a live billing provider call after the client
  already saw its 504. Removing `detached` turns the test red — that regression is pinned.
- **Honest provenance.** The runtime did not surface the provider's own `model` field, so
  `model_wire` was reported as `null` with `model_wire_proved: false` rather than echoing the
  requested name back as confirmation.
- **No fallback, no synthetic lesson.** A provider failure is an HTTP error.

Measured latency (historical): `POST /api/lesson` ≈ 41 s, `POST /api/feedback` ≈ 20 s. Latency was
recorded as the top product risk — 41 s of silence is a long time for a child — which is what
motivated the progress-log work in §3.8.

Included: [lesson/ENGINE_HANDOFF.md](lesson/ENGINE_HANDOFF.md), [lesson/SPEC.md](lesson/SPEC.md),
[lesson/PLAN.md](lesson/PLAN.md), [lesson/TEACHING_PROMPTS.md](lesson/TEACHING_PROMPTS.md), and the
engine source `lesson/server.mjs`, `lesson/core.mjs`, `lesson/ai_bridge.py`,
`lesson/vendor/math-expr.mjs` (vendored from Kaizen-AI with in-file attribution).

### 3.6 Lesson library — durable archive and exact reuse

Every validated generated lesson is archived **before** the request is answered, and an identical
later request is served from that archive instead of the model.

Design decisions that matter:

- **Immutability by syscall.** Writes go to a private temp file and are `link()`ed into place, so
  readers only see complete files and `link()` fails `EEXIST` rather than overwriting. Each save also
  writes a content-addressed `<key>.<digest>.rec`, so a genuinely different lesson for the same
  request survives as a second version while an identical re-run collapses onto the same name.
- **A 200 means fsynced.** The record file and the directory are both fsynced before `save()`
  returns; a failed fsync propagates as `LibraryNotDurable` → HTTP 503 instead of being swallowed.
  This is crash durability, not power-loss durability.
- **The cache key is exact, never fuzzy** — recipe, complete rendered prompt, system prompt,
  generator source hash, selected guidance sections, provider/model/generator, dialect version,
  goal, locale and **exact age** (no bands: 9 and 10 are different learners). Prompt, system and
  implementation enter the *key* only as hashes — the key itself never carries their text.
- **That is a key-only property, and must not be read as anonymisation.** Per
  [lesson/LESSON_LIBRARY.md](lesson/LESSON_LIBRARY.md) §metadata, each record stores
  `metadata.instructions` — the system prompt, the teaching-guidance sections, the rendered lesson
  prompt and the JSON contract **verbatim**, each with a SHA-256 alongside. The learner's free-text
  `goal` therefore sits inside the stored `lessonPrompt`, because it *is* the lesson's subject. The
  library document states this explicitly and draws the correct conclusion: the directory is
  **private owner data** — outside the static allowlist and the deployment bundle, not to be synced,
  published or committed. It is **not multi-tenant and not share-ready**; treating it as a shareable
  content cache would publish free-text goals that may be personal.
- **A cache hit must prove itself**: revalidate through the same validator, match dialect and
  age/subject/locale, name this build's model and real provider, and carry a wire identity that was
  actually proved. `model_wire_proved: true` with an empty `model_wire` is treated as a forged claim
  and refused. An honestly unproved record stays archived but is never promoted to a served answer.
- **Three errors, all non-retryable** (`LibraryUnconfigured`, `LibraryUnwritable`, `LibraryFull`),
  each carrying an errno token only — never a filesystem path, never request content.
- **Deliberately absent:** no TTL, eviction, size cap or implicit deletion; no SQLite; no durable
  library under Vercel (`libraryDirFromEnv()` returns empty there and the route fails closed with
  503 rather than pretending an ephemeral write survived).

Never stored, ever: learner nickname, learner answers, session ids, raw feedback. Unexpected request
fields are stripped at the boundary. (Note the asymmetry with the point above: *learner* identity and
*learner* answers never arrive, while the *owner's* own typed goal and the full sent instructions are
retained deliberately, inside a private archive.) Included:
[lesson/LESSON_LIBRARY.md](lesson/LESSON_LIBRARY.md),
`lesson/lesson-store.mjs`, and the four `lesson/tests/lesson-archive-*.test.mjs` suites. The
owner's actual library (8 files) is **excluded** from the export — recreate test data rather than
expecting old record ids to exist.

### 3.7 Lesson metadata and thumbs feedback

Owner wording: *"for the saved lesson build extensive meta data what model created time taken,
instructions went through and device used and how many successfull learnings were given from that
lesson and for success just add a thumbs up and down so user can feedback."*

Delivered contract: `metadata.schemaVersion 1` with `createdAt`; `model
{requested, configured, reported, reportedBasis, provider, endpointHost, reasoningRequested,
reasoningObserved, stopReason?, usage?}`; `timing.generationMs` measured with a monotonic clock
around the transport call only; `instructions` carrying the **verbatim** system prompt, teaching
guidance sections, rendered lesson prompt and JSON contract with a SHA-256 of each; and a coarse
`device {browser, os, type, source:'client-reported'}` from three closed enumerations.

Deliberate constraints: there is no `provider_actual` field because nothing can prove one;
`reportedBasis` distinguishes `provider-reported` from `derived-from-configuration` from
`unobserved`. The device descriptor is **not** cache-key material, is not authenticated hardware
evidence, and a later cache hit from a different device does not rewrite the generating request's
device, timing or `createdAt`.

Feedback is `{thumbsUp, thumbsDown, total, reportedHelpful, semantics:'self-reported-helpfulness'}`,
per generated **version** (full 64-hex `recordId`), written to a separate `.fb` file so a vote can
never change a lesson's digest or cache key. Nothing auto-increments: viewing, loading, generating
or answering correctly never move a count. Only `sha256(recordId \0 token)` is stored, so the same
browser token on two lessons yields two unrelated hashes and cannot follow one person across lessons.
This is **local duplicate prevention, not authenticated multi-user abuse resistance** — a caller can
mint as many tokens as it likes.

Wire contract: `delivery/LESSON_METADATA_CONTRACT.md` — *original-workspace source; not included in
the portable repository.* The same contract is documented in the included
[lesson/LESSON_LIBRARY.md](lesson/LESSON_LIBRARY.md).

### 3.8 Profile entry, progress visibility, animated scenes, local voice

- **Profile-first entry.** Nickname trimmed 1–40 chars and integer age 1–120, kept in tab memory by
  default with remembering as an explicit browser-local opt-in. The label never enters an API request
  or operational log. Changing age or learner invalidates outstanding work and requires confirmation.
- **Progress log.** A visible Activity section with real timestamped lifecycle events and elapsed
  waiting time — truthful waiting / response received / validating / ready / failure / retry /
  client cancellation. **No invented provider internal stages, no token stream, no percentage, no
  completion estimate**; the client cannot prove the provider cancelled and says so. This slice went
  through its own quality FAIL (a one-second counter inside a live status region; `clearSaved` leaving
  a stale operation label) and a targeted repair.
- **Teaching scenes.** One generic `sequence` representation (caption plus 2–6 labelled stages),
  animated with original CSS/SVG — no remote code, HTML, URLs or assets. Bounded demonstration →
  pause → learner turn, with replay and manual next/previous. Watching never counts as
  understanding; a guided demonstration that reveals a solution counts as assistance; reduced motion
  keeps the complete equivalent interaction static.
- **Local voice.** `POST /api/transcribe?locale=en|es`, raw audio ≤ 1 MiB, cached faster-whisper
  base CPU/int8 with Hub access forced offline, ≤ 20 s decode, one in-flight slot, temp file mode
  0600 deleted on success/failure/abort/timeout, typed sanitized errors, **no cloud fallback and no
  transcript persistence**. Verified historically with a synthetic file (never played): 2.65 s AIFF →
  *"water changes into vapor when it gets warm."*, model load 0.59 s, transcription 0.42 s. A real
  microphone was **never** exercised — the browser speech-pack install timed out at 90 s headless and
  70 s headed, recorded as `BLOCKED: pack-install-timeout`.

**How this slice was authorized and bounded — the resumption and growth rules.**
[lesson/RESUMPTION_PLAN.md](lesson/RESUMPTION_PLAN.md) is the authorization record for the above, and
it is worth reading rather than listing. The owner's answer to the permission question was *"go ahead
edit application now"*, which reopened **bounded** completion only: implementers edit inside an
assigned scope, reviewers stay read-only, and no existing test or historical evidence may be weakened
or overwritten. It explicitly refuses to launder a missed deadline — the earlier 45-minute checkpoint
expired *without* an accepted integrated product and must not be reported as met; the replacement is
named a checkpoint target, "not an enforced cancellation timer or a promise of release", and renaming
phases to reset the clock is forbidden. Ownership was partitioned so no two writers shared a file
(Activity timer-accessibility repair; generation-language wording plus the voice post-upload
lifecycle; then a single frontend integrator on `app.mjs`/`styles.css`/`index.html`). Acceptance was
deliberately separated from implementation: freeze the integrated source, have a *fresh* verifier
write a behavioural spec **before** reading the implementation, and treat the pre-existing
verify-profile keyword harness as a preliminary artifact rather than the gate — it is recorded as
wrong in specific ways (an age-80 requirement that contradicts the 1–120 contract, a provider scan
that flags the *required* disclosure, several vacuous negative tests), and application behaviour must
**not** be bent to satisfy those errors. Ceiling: two corrective rounds, no screen-reader
announcement claimed without a capture, no wire-model proof inferred from the requested model, no
teaching-efficacy or child-ready claim.

**Growth, specifically.** The standing rule ([PRODUCT.md](PRODUCT.md)) is *ground growth in actual
activity without implying measured mastery* — truthful attempt, assistance and growth records are
legitimate; false mastery claims are not. What exists today is the honest substrate for that
(`advance` as a conservative suggestion, assistance separated from unassisted checks, thumbs as
self-reported helpfulness) plus the store design in §4(c). What does **not** exist is the private
learner-attempt history itself: the worker assigned to it wrote no files, so growth remains
specified, not implemented.

Included: [lesson/PROFILE_PLAN.md](lesson/PROFILE_PLAN.md),
[lesson/PROGRESS_PLAN.md](lesson/PROGRESS_PLAN.md),
[lesson/RESUMPTION_PLAN.md](lesson/RESUMPTION_PLAN.md),
[lesson/UI_HANDOFF.md](lesson/UI_HANDOFF.md), and `lesson/app.mjs`, `lesson/scenes.mjs`,
`lesson/voice.mjs`, `lesson/voice_bridge.py`, `lesson/voice-client.mjs`, `lesson/styles.css`,
`lesson/media.css`. The `lesson/evidence/` directory and `delivery/ON_DEVICE_VOICE_FEASIBILITY.md`
are *original-workspace sources; not included in the portable repository.*

### 3.9 OpenMAIC adoption as the candidate foundation

The owner asked why the entire OpenMAIC stack was not being used. Decision: bring in the **complete
pinned upstream application** as the candidate foundation rather than rebuilding classroom
capabilities piecemeal. Upstream commit `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`
(`THU-MAIC/OpenMAIC`); MIT notices preserved in [classroom/LICENSE](classroom/LICENSE) and in place.

An API contract was derived **by reading route and type source directly**, not from upstream docs —
[delivery/fullstack/native/UI_CONTRACT.md](delivery/fullstack/native/UI_CONTRACT.md). Load-bearing
facts a future implementer needs:

- **Identity is a cookie, not a token**: `anonymous_id` UUID v4, HttpOnly, SameSite=Lax, 400-day
  max-age, owner id `anon:<uuid>`. Every owner-resolving route mints it and returns `Set-Cookie` on
  **every** response including 4xx/5xx. A client that drops `Set-Cookie` creates a new owner — and a
  new empty library — per request.
- **Two independent generation pipelines**, not interchangeable: a one-shot server-side job
  (`POST /api/generate-classroom` + poll `GET /api/generate-classroom/{jobId}`) that persists a
  finished owner-scoped course in a single write, and a browser three-call fan-out
  (`scene-outlines-stream` SSE → `scene-content` → `scene-actions`). The job pipeline never sets
  `interactiveMode`, so the interactive-outline prompt branch is unreachable through it; a
  *guaranteed* interactive-first lesson currently requires the browser pipeline.
- **Persistence is server-side PostgreSQL selected by `DATABASE_URL`.** There is no browser
  IndexedDB fallback in this checkout. Unset `DATABASE_URL` makes the whole `/api/stages/**` and
  `/api/folders/**` family answer a plain-text 404.
- **Chat is stateless**: `POST /api/chat/pi` receives the whole `storeState` (stage, scenes,
  `currentSceneId`, mode) on every request; there is no server session id. Raw SSE, one `data:` line
  per event, **no `event:` name field** — the discriminator is the JSON `type`, across nine variants
  (`agent_start`, `agent_end`, `text_delta`, `action`, `thinking`, `whiteboard`, `cue_user`, `done`,
  `error`). `:heartbeat` comment frames every 15 s must be tolerated.
- **Cancellation has no endpoint.** The mechanism is closing the HTTP request. `scene-content` and
  `scene-actions` do not read `req.signal`, and an accepted `generate-classroom` job cannot be
  cancelled by a client through any verified route.
- **Scene types are `slide|quiz|interactive|pbl`**; there is no separate `diagram` scene type.
  Diagrams ship **as** `interactive` scenes with widget types
  `simulation|diagram|code|game|visualization3d|procedural-skill`. 22 playback action kinds exist,
  including `wb_draw_*` and `widget_{highlight,setState,annotation,reveal}`.
- **Locale trap:** the shipped locale set has **no `es`/`es-ES`** — Spanish is `es-MX` only — and
  `defaultLocale` is `zh-CN`. `/api/chat/pi` reads **no** locale field or header. Content language
  rides in a free-text `languageDirective` or in the `requirement` prose.

Also included: [delivery/fullstack/native/UI_CONTRACT_VERIFIED.md](delivery/fullstack/native/UI_CONTRACT_VERIFIED.md)
and [delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md](delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md),
which inventories every tutor capability under three never-blurred statuses: **UPSTREAM-WIRED**
(code exists *and* a caller chain to a reachable route was grep-verified — installed and bootable,
behaviour unproven), **UPSTREAM-ORPHAN** (no importers; latent, not available), **MISSING** (a term
in a prompt, doc or fixture is not capability). Notable rows: `.pptx` / resource-pack / classroom-zip
/ narration-script `.md`+`.docx` / mp4 / `.srt`+`.vtt` exports are wired; **flashcards, study guides
and podcasts are MISSING**; no dedicated worksheet generator exists; `lib/rag/*` is orphan with no
embeddings or vector store anywhere, so any claim of retrieval-grounded teaching today is false.
`UPSTREAM_MANIFEST.json`, `CONTINUATION_PLAN_20261003.md`,
`NATIVE_CORRECTION_DECISION_20261003T2321Z.md` and `doc-correction-20261003T2330Z/` are
*original-workspace sources; not included in the portable repository.*

### 3.10 Native provider integration — the OAuth transport mismatch and the 429 blocker

This unblocked the hardest stoppage in the project. Lesson generation had been returning
**429 ProviderRateLimited in 0.29 s**, and an earlier worker's "confirmed root cause" claim had
already been rejected once after artifact review. The section below deliberately stops short of a
second such claim.

**What was observed.** The available Anthropic credential is an **OAuth access token**, not an API
key, and upstream was sending it in the `x-api-key` header — a transport mismatch between the
credential's type and the wire contract it was presented on. The lesson engine's Python bridge, which
already spoke the Claude Code wire contract, worked under the same credential while the direct
transport did not. After the adapter aligned the transport, real calls succeeded.

**What is not established.** *Why* the mismatched transport produced 429 is **not** proven here. The
attribution circulated in `delivery/fullstack/native/STATUS.md` — a billing classifier reclassifying
the call as a third-party app and routing it to an empty metered extra-usage pool — is an inference
about provider-side behaviour that nothing in this project can observe, and it is **not** carried
forward as fact. [PRODUCT.md](PRODUCT.md) states the rule directly: *no billing or subscription-429
root cause is claimed from `service_tier: standard`.* A `service_tier: standard` field in a response
establishes neither a subscription entitlement nor the cause of an earlier rejection. What is
supportable: a transport mismatch existed, it was corrected, and calls that had been failing
subsequently succeeded. The §7 rule **"a 429 is not 'credits exhausted'"** applies to this section's
own history as much as to future triage.

**The adapter.** Three things together: Bearer authorization, the required OAuth transport headers
(the OAuth and Claude Code beta flags with the matching `user-agent` / `x-app`), and the Claude Code
system block placed first for system compatibility. No credential value, header value or token
fragment is reproduced in this document. Implemented as one new file plus ~20 lines inside the
existing `case 'anthropic'` — no fork, no new abstraction.

Historical wire facts recorded at the time (observed values, not configured labels): request model
`claude-opus-5`, thinking `adaptive`, effort `max`; response model `claude-opus-5`, 304 thinking
tokens, `service_tier: standard`. The native probe passed 12/12 on the first try with no 429, and
contextual tutoring chat returned a real answer with full SSE in about 10 s. These are historical
successful calls on one machine and one build — not a durable entitlement guarantee.

**Reasoning depth — read the config, not the old status file.** The authority is
[delivery/fullstack/native/openmaic.yml](delivery/fullstack/native/openmaic.yml), read directly for
this document. It currently sets `slots.llm.thinking.effort: max` — the root every chat slot inherits
— and assigns `slots.course.content.thinking.effort: max` **explicitly**, with an in-file comment
saying it is written out precisely so the slot "cannot be quietly dropped to `high` again". The
`agent` slot omits effort by documented design: its calls carry function tools, which cannot be
combined with a reasoning effort on every transport (`noThinkingEffort`), so an inherited effort is
dropped there rather than silently mis-sent. `max` is the top of the model's declared
`effortValues`; `high` is only the catalogue **default**, never its maximum.

The history matters and is preserved: `course.content` **was** reduced to `high` without
authorization, for the measured latency reason, and that reduction was asserted in a test — which is
how a config change acquired the appearance of a decision. It has since been **corrected back to
`max`**, and the test assertion is not the authority; the config is. Any later document, STATUS file
or test fixture still describing `high` as current is stale.

The measured cost of `max` is reported, not traded away: one scene took over 8 minutes sequentially,
i.e. roughly 90 minutes for an 11-scene lesson. The only lever this candidate uses against that is
concurrency — `PARALLEL_SCENE_CONCURRENCY=4` (upstream cap 10), which historically produced 11
outlines plus 3 scenes in ~6 min against 1 scene in ~10 min while strictly sequential. Latency at
full reasoning depth is therefore an **open product problem**, not an open policy conflict.

Included: `classroom/lib/ai/anthropic-oauth.ts`, `classroom/lib/server/anthropic-oauth-refresh.ts`,
`classroom/lib/ai/providers.ts`, `classroom/instrumentation.ts`;
[delivery/fullstack/native/STATUS.md](delivery/fullstack/native/STATUS.md) *(handback-time status;
its billing attribution and its `course.content: high` paragraph are **both superseded** — by
[PRODUCT.md](PRODUCT.md) and by the YAML respectively)*;
[delivery/fullstack/native/openmaic.yml](delivery/fullstack/native/openmaic.yml) *(authoritative for
model, slot and effort policy)*;
[delivery/preview-native/COORDINATOR_VERIFICATION.md](delivery/preview-native/COORDINATOR_VERIFICATION.md).
The native lane's `evidence/` logs are *original-workspace sources; not included in the portable
repository.*

### 3.11 Kaizen surface on the classroom candidate

Routes and components added on top of upstream: `classroom/app/kaizen/page.tsx`,
`classroom/app/kaizen/new/`, `classroom/app/kaizen/course/`, `classroom/app/kaizen/me/`;
`classroom/components/kaizen/{KaizenShell,KaizenNav,CourseCatalogue,CourseTile,NewCourseFlow,ReadAloudNote,use-kaizen-profile}`;
`classroom/lib/kaizen/client/{course-request,strings,profile,handoff,stale,tutor-tools}.ts`.

The Kaizen course page **mounts the upstream `ClassroomSurface` and `components/stage.tsx`** — not a
separate toy renderer. `app/kaizen/me/page.tsx` currently shows no progress, streak or mastery.
**Read that correctly: it is a consequence of there being no private learner-attempt store yet
(§3.8), not a policy requirement to stay blank until the efficacy gates pass.** [PRODUCT.md](PRODUCT.md)
draws the line elsewhere — *truthful attempt, assistance and growth records are not quality claims
and are not suppressed pending efficacy evidence; false mastery claims remain prohibited.* So a
truthful activity and attempt history is permitted work that may ship before any real-user gate; what
must wait is anything shaped as proven mastery, and a "streak" presented as achievement rather than
as a plain record of activity.
`ReadAloudNote.tsx` explicitly disclaims audio, and a test enforces that absence — a temporary
Kaizen voice absence is not an upstream podcast prohibition.

The **`soloTutor`** change narrows the visible speaking roster to the registered `teacher` role. Its
scope is **speaking selection only — not a new multi-role orchestration system**. Code-quality and
security review passed for that ~70-line change: 9/9 targeted tests, eslint clean on all five paths,
static secret/injection scan clean; verified that the registry role is hydrated before lookup, the
teacher is picked by validated enum role rather than position, a no-teacher case fails closed to an
empty roster the server rejects with 400 (no peer promotion), and the multi-agent branch is
byte-identical. Raw SSE confirmed `starts 1`, `errors 0`, `done`, `totalAgents 1`; the UI cannot
re-enable peers and the state survives reload.

Included: [verification/quality-solo-tutor-20261004T025405Z/REVIEW.md](verification/quality-solo-tutor-20261004T025405Z/REVIEW.md)
and the `delivery/fullstack/verification/` run directories, plus
`classroom/tests/classroom/kaizen-solo-tutor-selection.test.ts` and the five
`classroom/tests/kaizen-ui-*.test.ts` suites.

### 3.12 Source-catalogue research (OER survey)

A separate research lane surveyed free/open curriculum and reusable learning artifacts, starting from
FMHY as a discovery directory only. **No ingestion occurred. No app or config was modified.**

Its own framing, which should be carried forward: **the rights layer, not the content layer, is the
binding constraint.** Free to read is not permission to copy, adapt, translate, redistribute, embed
or use commercially. Repository **code** licences do not license course **content**. A free tier is
not a licence grant. Across the collections that the report inspected, machine-readable rights signals
were the exception rather than the rule: a minority exposed licence data that could be filtered
programmatically, while elsewhere rights sat in prose on a terms page that might 404, 403 or render
client-side. On that basis the report concluded that **any ingestion pipeline needs a human rights
gate rather than full automation** — a finding about the sample it inspected, not a proven universal
fact about OER as a whole, and not a reason to skip re-checking a specific source.

Candidate sources the report ranked as worth checking first, each needing **per-item** licence
verification before any use: Illustrative Mathematics K-12 (edition-sensitive — 1st edition and 2nd
edition differ); OpenStax (per-title, **not** uniform across the catalogue, and licences split within
a title lineage); Wikimedia Commons (per-file, with a policy-level commercial posture); Standard
Ebooks and Project Gutenberg (cleanest rights position; classic literature only, no pedagogy);
Numbas (a permissively-licensed assessment **engine** — author your own items rather than ingesting
question banks). The report ranked **PhET** first among the interactive sources it looked at, noting
it is non-commercial unless a commercial licence is purchased from the university — a procurement
decision rather than a dead end. That ranking is the report's judgement over its own shortlist; it is
not an independently proven "best fit" across the field, and no fit or efficacy comparison was run.

Named as "not open despite free access": CommonLit, Oak National Academy, and unresolved
GCFGlobal/ReadWorks. FMHY itself is an index only — explicitly a piracy guide, mixing lawful OER with
paywall-bypass routes — and nothing entered the catalogue on its word alone. No leaked exams, answer
keys, paywall bypass or pirated material was collected or recommended.

**Status and caveats, stated plainly.** This is **historical agent-authored research as of its
retrieval date, not current re-verified licensing and not legal approval.** Every count or
distribution in it is *report-reported*, not verified now. Several of its generalisations are
overreach and must not be relied on: that a free tier implies non-commercial; that embedding or AI
adaptation confers automatic immunity from licence conditions; that NASA attribution is blanket
prohibited; that a repository's code licence grants permission over its content. Treat each row as a
lead requiring fresh primary verification and qualified review. Efficacy was not assessed for any
source.

Source: `delivery/fullstack/research/oer-20261003/` (`report.md`, `sources.json`, `evidence/`,
`citation-ledger.json`) — *original-workspace source; not included in the portable repository.*

### 3.13 Deployment status

Vercel authentication was read back as account `saitokiku`, with the `kaizenedu` project owning
`kaizenedu.net` and `www.kaizenedu.net`; existing production is Next.js. **Per the historical
record, production was never replaced and `kaizenedu.net` is unchanged.** No live Vercel or process
status was freshly checked for this document; do not assert one. Preview protection was recorded as
`all_except_custom_domains`, and public custom-domain API access still needs a real authorization
boundary before any release. A CLI link created a secret local env file that is excluded from release
scope. **There is no new production deployment in this handoff.**

### 3.14 Export and handoff

A clean-history private repository was produced to continue under another workflow. The export
copied source without claiming shippability; original files and running previews were not edited.

Read directly for this document (2026-10-07): clean-handoff `HEAD = 64c4136`; `main` synchronized
with `origin/main`; GitHub reports the repository private.

The coordinator checked the export manifest during this consolidation on 2026-10-07: it lists
**3568 copied files**. All **3567** entries other than `.env.example` were compared against the
original by SHA-256, with **zero missing and zero changed**. This is a **manifest-scope comparison**,
not a claim that the original tree contains no additional files. Application test counts and
durations below are historical, not re-measured for this consolidation.

An export correction is on the record: the first private push accidentally included historical raw
output directories and a local anonymous test-owner browser state. The corrected handoff uses a
replacement initial commit without those files. A history rewrite does not guarantee deletion of
GitHub's cached or dangling objects; repository access was private throughout, and no provider
credential was found by the secret scan.

Secret scanning: Gitleaks v8.30.1, distribution checksum verified, directory scan completed with zero
unresolved findings; eleven exact false positives (dummy credentials, redaction sentinels and a
model-ID assertion) are recorded in `.gitleaksignore` with **no** whole-file or rule-wide
suppression. Browser-state JSON structure was checked independently of filenames, and cookie values
from eight original browser-state files had zero matches in the final export.

Excluded from the export: original Git history, local `.env` values, access tokens, browser storage
and cookies, database/runtime stores, private learner conversations, the generated lesson library,
raw logs and traces, dependency directories, build output and old frozen source snapshots.

Sources: [EXPORT_VERIFICATION.md](EXPORT_VERIFICATION.md), [EXPORT_MANIFEST.json](EXPORT_MANIFEST.json),
[HANDOFF.md](HANDOFF.md).

The original working directory also still has **six modified tracked files plus untracked Kaizen code
and tests** in `classroom/`. That state is intentionally left as-is and is not being committed.

---

## 4. Architecture, reuse, and the paths that matter

Two coexisting surfaces, by deliberate decision rather than accident:

| Surface | What it is | Where |
|---|---|---|
| `classroom/` | Complete pinned OpenMAIC app at `5312c2b…`, plus the Kaizen routes, the native Anthropic adapter, fixes and tests. The candidate foundation. | [classroom/](classroom/) |
| `lesson/` | Self-contained vanilla-JS/Node lesson engine, durable archive, metadata/feedback contract, local voice. Retained and made compatible — not the only surface, since a vanilla-only delivery contradicts the "entire stack" instruction. | [lesson/](lesson/) |

Reuse principle in force: reuse the pinned upstream runtime, the existing lesson engine,
browser-native controls and already-installed dependencies before writing anything new. A
re-implementation of classroom capability inside `lesson/` while upstream sits unused is a
specification failure, and so is mass regeneration of upstream source.

Paths a new implementer will need first:

- Native provider and credential rotation — `classroom/lib/ai/anthropic-oauth.ts`,
  `classroom/lib/server/anthropic-oauth-refresh.ts`, `classroom/lib/ai/providers.ts`,
  `classroom/instrumentation.ts`.
- Server-side model and capability policy —
  [delivery/fullstack/native/openmaic.yml](delivery/fullstack/native/openmaic.yml).
- Kaizen surface — `classroom/app/kaizen/**`, `classroom/components/kaizen/**`,
  `classroom/lib/kaizen/client/**`.
- Feature gating — `classroom/lib/config/feature-flags.ts` (courseware reference, editing/workbench,
  experimental), independent of the YAML capability locks.
- Dropped learner-turn cue — trace `classroom/lib/chat/pi/tools/cue-user.ts` through the stream
  buffer and `classroom/components/chat/use-chat-sessions.ts` to `PlaybackChromeRoot.tsx`.
- Role intent (not implementation) — `classroom/lib/orchestration/registry/agent-selection.ts`.
- Private practice history — reuse `getRuntimeStore`, `loadChatSessions(stageId)` and the existing
  learner-ownership checks. `loadChatSessions` already respects deletion markers; do not read raw old
  records and resurrect deleted turns.
- Executable gates — [delivery/fullstack/spec/static-gate.mjs](delivery/fullstack/spec/static-gate.mjs),
  [delivery/fullstack/spec/runtime-gate.mjs](delivery/fullstack/spec/runtime-gate.mjs).

**Three data concepts, kept apart, reusing existing stores — no new database infrastructure:**
(a) reusable content, sources and provenance — shareable; (b) versioned teaching plan, objectives,
prerequisites and applied instructions — shareable and versioned, where a plan change is a new
revision rather than an in-place edit; (c) the private learner record of attempts, assistance,
uncertainties and evidenced misconceptions with proposed next practice — **never shareable**.
Nicknames stay local; private learner turns stay out of reusable lessons.

---

## 5. Historical verification, with its limits

Everything in this section is **historical**. Nothing here was re-run for this document: **no
application test, no build, no fresh-machine boot and no live test was performed in this task.**

| Check | Recorded result | Limit |
|---|---|---|
| Export-source targeted tests | **10 test files / 140 tests passed**, Vitest v4.1.8 — Kaizen UI handoff/locale/request contracts, teacher-role selection, native OAuth wire/rotation, native deployment/boundary | **Not re-run today.** Dependencies were temporarily reused from an existing local install via an untracked symlink, since removed |
| Lesson engine offline suites | 42/42 core, 21/21 server at engine handback; later full offline lesson suite **356 pass / 360**, 4 pre-existing retained conflicts | Offline, injected fake subprocess. Suite totals drifted across checkpoints; the 4 failures are deliberate stale expectations, not regressions |
| Lesson engine live E2E | 13/13 checks, 2 live calls, 63.8 s wall; no orphan bridge processes after cancellation | Two calls, one machine, one build |
| Real browser generation (frozen metadata candidate) | New v2 lesson, HTTP 200 in **31.008 s**, response model `claude-opus-5`, canonical host, saved record; identical lesson re-served in **1.229 ms with 0 provider calls**, and **2.996 ms with 0 calls after restart** | Produced by the frozen vanilla source, not the classroom candidate. Closes no current gate |
| Incorrect-answer feedback | Real response in **16.478 s**, deliberately mismatched answer correctly identified | API-level; not the complete writing UI journey |
| Native Opus probe | **12/12 first try, no 429**; chat returned a real answer, full SSE ≈10 s | API-level. `accessCodeConfigured:false` instance on all interfaces was stopped |
| Upstream test baseline under the native diff | *As reported at handback*: 1554/1580 pass, with 3 failures confirmed **pre-existing** by stashing the diff | Quoted as a historical report. **1554 + 3 does not account for all 1580 outcomes**, and the remaining ones — skips, todos or further failures — were **not independently reconciled in this consolidation**. The 3 named failures are a Node-version mismatch (`--localstorage-file`), not an application defect |
| `tsc --noEmit` | exit 0 | Typecheck only |
| Real browser on fixed source | 3/3 — truthful catalogue empty state, age/topic controls, Spanish **outer surface only** | Not stage behaviour, not full ES |
| One real generated lesson, end to end | Stage `iXFCaLFiaa` "Half vs Quarter: Same Whole" generated in **411.7 s** on one attempt; persisted (`/api/stages` `sceneCount` moved 0 → 1); exited to the Kaizen route; one scene rendered; a control click changed the DOM; **same-owner reopen** returned the same id with scenes intact; grounded EN chat answered in 16.0 s with two real stage actions; a separate turn answered **in Spanish** | One lesson, one topic, one age, one machine. The learner-check step was **NOT ATTEMPTED** — that scene exposed no quiz control. Model identity was configured-only; **no response carried a model identity** |
| Persisted scenes, read back later | **4** scenes under that stage, all reachable once the sidebar is toggled open, document SHA-256 identical before and after all interaction, **zero** `/api/generate/*` and **zero** `/api/chat` requests during the readback | That lesson's DB, cookie and generated content are **not** in the export. Read-only inspection of one existing lesson |
| Scene 2 — fraction simulation | Real widget operated through its own named controls: cut control `2 parts → 1/2` ⇒ `4 parts → 1/4`, piece readouts 6 ⇄ 3 squares against an unchanged 12-square whole, `aria-pressed` pair flipped, canvas raster hash changed; overlay slider 0 → 100 with HUD and raster both following. Fraction maths checked correct | One scene in one lesson. Not an educational-quality or age-appropriateness result |
| Scene 4 — catch game | The interaction report describes a playable real-time game and HUD changes interpreted as correct/incorrect catches | The coordinator did **not** accept the catch/text inference as proven (see item 12). No `aria-live`/`role=status` was reported, so feedback accessibility remains open |
| Local speech | Synthetic AIFF → correct transcript, 0.59 s load / 0.42 s transcribe | Synthetic file. **Real microphone BLOCKED** — speech-pack install timed out |
| Library integrity | 8 owner library files, 0 changed / 0 missing / 0 added | Local durability only |
| Candidate health endpoint | HTTP 200 before export | Not proof of new-machine setup or teaching quality |

**Harness defects are recorded as harness defects, never as application results.** Documented
examples: a `/proven/` regex matching legitimate "provenance" copy; a credential *prefix* inside a
comment; a verifier file's own nickname regex; an explicit `video: false` camera-OFF spelling; an
HTML `<input type="text">` matched as a stage scene kind; and a live harness with a fixed timeout
clamp, an `<a>` selector where the control is a `<button>`, and no preserved storage for same-owner
retry. A fresh anonymous context seeing an empty catalogue is **expected owner isolation, not data
loss**. A timeout is not evidence of provider cancellation.

The controlling acceptance specification is
[delivery/fullstack/spec/ACCEPTANCE_MATRIX.md](delivery/fullstack/spec/ACCEPTANCE_MATRIX.md),
authored **before** any implementation was read. Its rule: every criterion is `UNEXECUTED` until a
raw transcript for its own gate exists; a pass in one gate never implies a pass in another; there is
no aggregate score. Gate classes: `FS-S` static, `FS-L` local runtime with zero provider calls,
`FS-V` live provider, `FS-B` real browser, `FS-D` real device, `FS-C` cloud. Additive sequencing is
recorded in [delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md](delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md)
without closing any row.

**How to read that rule against the rows above.** The matrix's `UNEXECUTED` is a statement about
*formal closure*, not a claim that nothing ran. Narrower runs with their own recorded raw evidence
**did** happen — a real live generation with a saved journey, a read-only four-scene interaction
readback, a live single-tutor chat turn, and an independent spec review that dumped the unfiltered
DOM and aborted a second provider call at the network layer. None of them was reconciled against the
matrix's own criteria, so no row is closed; equally, "unreconciled" must not be reported as "no live
or browser work happened". Both statements are wrong in opposite directions. What remains genuinely
open and unclaimed is the whole of parity, safety, real-device, efficacy and release.

---

## 6. Known defects and unimplemented work

**Not delivered, must never be presented as implemented.** The stage-parity implementation worker
failed before writing any application code. The practice-history worker wrote no files. The
parity-inventory worker was interrupted, so **no complete independently accepted parity matrix
exists**. There is no full-stage parity, no verified production-ready build or release, no
real-child readiness, no demonstrated learning efficacy, no complete accessibility conformance, no
verified full Spanish stage path, and no working tutor → quiet artist → coach coordination.

**Known defects, coverage limits and resolved historical issues.**

1. **U1 — selected thumb lost on reload.** `app.mjs` resets the vote to null and then assigns
   `readVote(recordId) ? S.rateVote : null`, so both branches are null; counts restore but both
   thumbs read `aria-pressed=false`. Only a voter token is persisted, not direction. Fix the
   contract — persist direction, or look up the caller's actual vote. **Do not infer direction from
   token existence.**
2. **M2 — configured identity impersonating requested.** `app.mjs` uses `requested || configured`,
   so an absent requested identity is displayed under the configured label. Omit the unobserved row
   or label it as configured.
3. **Mobile stage layout.** A real 390px screenshot showed a small instructional slide inside a much
   larger empty stage, a play overlay obscuring the fraction diagram, crowded controls, and a tutor
   bubble narrow enough to wrap a single word across lines. The body had no horizontal overflow —
   that did not make it usable. Fix the shared layout, not one screenshot or one lesson.
4. **Dropped learner-turn cue.** Prompt text is carried by the transport and discarded at the UI
   callback. Persisting a real next-practice cue is unfinished. **Do not manufacture one from
   arbitrary chat text.**
5. **Rapid phone role-switch** in the retained connected frontend: Parent clicked immediately after
   Start working returns without switching from Student. Reproducible at 390px; root cause between
   application interaction and automation timing never established.
6. **Language coverage is partial, and the Chinese probe is a warning rather than a verdict.** What
   was historically exercised: an English chat answer, and — in a separate turn on the same lesson —
   an explicit **Spanish** chat answer that held the lesson's equal-whole constraint. What was never
   exercised: ES-locale *generation*, ES scene content and ES narration, i.e. the whole Spanish stage
   path. The most recent `soloTutor` rerun was **EN only**, stated as such by its own lane. Separately
   and earlier, one chat probe answered an English-persona prompt in **Chinese** with
   `stage_used: null`. Treat that as a **regression and coverage warning**, not as a confirmed
   current defect: it has not been reproduced since, and the standing explanation — upstream
   `defaultLocale: zh-CN`, `/api/chat/pi` reading no locale field, "the only lever is agent persona
   text" — is a hypothesis, not a traced finding. **Before choosing a fix, trace the locale boundary
   along the real path** (request construction → `storeState` → prompt assembly → persona → stored
   course) and find where the requested language is actually lost. Prescribing a persona-only patch
   first would fix the symptom at whichever layer happens to be last. EN/ES remains a prompt-level
   contract needing a test per language.
7. **Reasoning depth: resolved in config; the latency cost is what stays open.** This was previously
   recorded here as an open `high`-versus-`max` conflict. That is **stale**:
   [delivery/fullstack/native/openmaic.yml](delivery/fullstack/native/openmaic.yml), read directly,
   sets `effort: max` on both the `llm` root and an explicit `course.content`, and the `agent` slot
   omits effort by documented design because its tool-carrying calls cannot combine with one. The
   historical unauthorized reduction to `high` has been corrected. The open item is the measured
   cost — one scene over 8 minutes sequentially, ~90 minutes for an 11-scene lesson, with
   concurrency as the only lever applied so far. That is a product-latency problem to solve without
   trading reasoning depth back.
8. **Native auth residuals, not quality-accepted.** Rotation adopts current environment every five
   minutes, leaving a **five-minute stale-token window** and **retention of an old token on resolver
   failure**.
9. **Hidden and disabled capability boundaries.** `delivery/fullstack/native/launch.mjs` disables the
   durable agent runtime; the candidate YAML locks TTS/ASR/image/video/search/document off;
   `classroom/lib/config/feature-flags.ts` separately gates courseware reference, editing/workbench
   and experimental features. **Do not turn every flag on blindly** — inspect dependencies and test
   each capability. Whiteboard, scene navigation, speed, chat and export controls were visible in the
   real candidate.
10. **Educational quality of scenes UNPROVEN — but scenes exist and were inspected.** An earlier
    version of this record said no finished scene payload had ever been observed. That was taken
    from the native lane's handback, when 3 of 11 scenes were still generating, and it is **false as
    a current statement**. Four scenes were later persisted under stage `iXFCaLFiaa` and read back
    directly: scene 2 is a working fraction simulation whose own controls move a correct 12-square
    model, and scene 4 is a playable catch game — sandboxed `<iframe srcdoc>` + `<canvas>` widgets,
    not a text dump and not generic counter dots. The fraction maths exercised was checked and no
    error was found. **What is still unproven is everything that matters most:** whether generated
    scenes are *pertinent* and *pedagogically good* across topics, ages and languages; whether this
    one lesson is representative; and whether any of it meets upstream stage parity. One inspected
    lesson is an existence proof, not a quality result. The recorded 11-dot fallback for an
    electron-shell request remains on the record as a defect, not a near miss. This is still the
    single most important remaining gate — now as *re-evaluation on fresh output*, not as a first
    sighting.
11. **`sceneCount` is a hint, not a cap** — 3 requested, 11 returned. Any UI must handle a variable
    count.
12. **Game correctness remains unaccepted; the wrong-text claim was rejected.** The interaction
    readback reported HUD changes interpreted as right and wrong catches. A later reviewer called
    the screenshot text **"Missed a 1/2"** a wrong-text bug. The coordinator subsequently rejected
    that inference in [lesson/STATUS.md](lesson/STATUS.md), lines 41–47: the screenshot establishes
    neither a wrong-quarter catch, a wrong-text bug, nor a correct catch, and a lost life can be
    motor error. Preserve both historical reports, but do not promote either inference to accepted
    correctness evidence. No game fix was made. A deterministic replay connecting the actual
    fraction, collision, HUD and feedback is needed before diagnosing a bug or claiming acceptance.

**Open gates, none of them claimed.** Live-provider plus durable-archive acceptance (Group E,
E1–E14) is UNEXECUTED and metadata unit tests do not replace it. The `FS-V*` (live provider),
`FS-L*` (local runtime) and `FS-B*` (real browser) classes are **unreconciled rather than untouched**
— no row was closed against the matrix's own criteria, while narrower live, local and browser runs
did execute and passed their own recorded assertions (§5). Do not report either half alone.
`FS-D01` real microphone is **BLOCKED**. `FS-D02`–`FS-D04` speaker / assistive
technology / real mobile are UNEXECUTED. `FS-D05`–`FS-D07` — **real low-literacy learner,
spoken-interaction and assistive-technology validation** — are UNEXECUTED and were not arrangeable;
these are the controlling blocker on the entire literacy-reach claim. `FS-C01`–`FS-C05` cloud and
production gates are UNEXECUTED. Durable hosting, authentication, tenant isolation, retention and
consent remain separate unmet gates.

Retained backlog that predates the candidate and is deferred, not dropped: production foundation
selection with licence and provenance preservation; real identity, family membership and tenant
isolation; durable records with concurrency and idempotency; real cost limits and failure behaviour;
schoolwork intake and OCR with consent and correction; the actual destructive phase of
retention/export/deletion; reviewed independent assessment items with delayed checks; release safety,
abuse controls, monitoring and rollback. Validation items remain open too: practical family interview
or pilot access; real non-reader and family usability with screen reader, switch, touch and real
devices; native-speaker educational Spanish and deliberate curriculum sequencing; demand, pricing and
pilot success measures; and evidence of learning and retention. `BACKLOG.md` is an
*original-workspace source; not included in the portable repository.*

---

## 7. Privacy, security and provider rules

These are binding, not aspirational.

- **Model policy.** Native Anthropic `claude-opus-5`, locked **server-side** on every reachable
  route, with **no fallback provider or model** — an empty list, not a commented-out line.
  Client-supplied model, provider, key, base URL or auth header is refused or dropped
  (`allowWorkspaceProviders: false`, tested). Observed model identity is never inferred from a label:
  requested, actual-request, configured and provider-reported identities stay distinct, and an
  unobserved value is omitted or null, never backfilled.
- **Credentials.** The rule the native launch path actually enforces: the resolved token lives in
  **server process memory only** and is never written into *source, evidence, the client bundle, a
  public directory, build output or a deploy manifest*. It is not a universal "no credential ever
  touches disk" rule, and this document must not claim one — the portable setup in §8 deliberately
  uses an **uncommitted `.env.local`**, which is a file. The two are consistent because they are
  different machines and different mechanisms: the original machine injected the token into the
  child process from a resolver; a new machine supplies **its own** credential through either an
  uncommitted, filesystem-protected env file that is never committed or bundled, or a server-side
  secret manager. **No bundled or original credential travels with this repository**, and the
  original machine's OAuth resolver must not be deployed.
- **Errors.** Raw provider errors, stack traces and prompt bodies never reach logs or the client.
  Errors are typed code plus status with fixed copy. **A 429 is not "credits exhausted."**
- **Routing boundaries.** OpenRouter is TypeSafe Jev finite decisions only, never generation. No
  DeepSeek or other vendor route is reachable. Private source, product ideas and inherited private
  context never go to a third-party boilerplate provider, including through a fallback. Fable is
  suspended until explicitly re-enabled — historical Fable names in preserved documents, fixtures and
  test assertions are **records, not calls**, and must stay unedited.
- **Nickname privacy.** Never serialized into a provider prompt, system message, tool argument, cache
  key or log line — traced from input binding to every send site, not asserted from one call site.
- **Learner data.** Conversation turns, typed answers and tutor replies are **never** written into the
  shared lesson library or cache. The coarse `{browser, os, type}` descriptor is excluded from the
  cache key; no user-agent, IP, screen geometry, hardware id or fingerprint is collected.
- **Camera OFF** by permissions policy; no `getUserMedia` for video, no emotion inference, no
  attention scoring, no keystroke-cadence profiling, no engagement-target metric.
- **Microphone opt-in** with visible state and a typed alternative; nothing activates automatically;
  no automatic playback. Local-only transcription must never silently fall back to a cloud
  recognizer.
- **Disclosure consistency.** Any wording that saving is local must not obscure that lesson requests
  and submitted work go to Anthropic. Both disclosures must be present and mutually consistent — the
  broad "nothing is uploaded" phrasing was flagged for narrowing.
- **Unreviewed upstream surfaces stay disabled:** file upload, web search, arbitrary tool execution,
  other vendors and cloud speech. The YAML locks of §3.10 are what enforce the model-side ones.
- **The execution rule, stated precisely.** It is **not** "generated code never executes" — that
  would contradict the shipped candidate, whose teaching widgets are generated interactive content
  running inside `<iframe srcdoc>` sandboxes (`allow-scripts allow-forms allow-popups`, **without**
  `allow-same-origin`), and those widgets are exactly the §6 defect-10 evidence. The rule is: **no
  unsafe same-origin execution and no unreviewed privileged execution.** Sandboxed upstream widget
  interactivity is in scope and already present; removing the sandbox, granting same-origin, or
  letting generated content reach credentials, the filesystem or privileged APIs is not.
- **Public access, stated precisely.** Public/anonymous *exposure* is what stays off: no public
  deployment, no unauthenticated custom-domain route, no real authorization boundary yet. That is a
  different thing from the local **anonymous owner cookie** (§3.9), which exists today, is how the
  candidate scopes a local library to one owner, and is **not production authentication**. Neither
  statement is a verified guarantee across every reachable route — no route-by-route authorization
  audit was performed, so do not present one.
- **Honesty.** Never fabricate model responses, growth, device success, accounts, integrations or
  efficacy. Thumbs and completion are never mastery. Assistance and independent checks are shown
  distinctly. A local filesystem archive does not cover future multi-instance or serverless users.

---

## 8. Portable setup

Prerequisites: **Node.js >= 22.19.0, pnpm 10.28.0, and PostgreSQL** (or Docker for the included
development database). **No Hermes installation is required** for the standard Next.js application.

1. Install the pinned workspace from `classroom/`:
   `npm exec --yes --package=pnpm@10.28.0 -- pnpm install --frozen-lockfile`
2. Optional local database, as a separate Compose project on its own volume:
   `OPENMAIC_DB_PORT=55432 docker compose -p kaizen-handoff-db -f docker-compose.db.yml up -d --wait postgres`.
   This uses upstream development credentials, not the original machine's database. Do not expose it
   publicly.
3. Copy `.env.example` to `.env.local` and set **your own** `DATABASE_URL`. No credential values are
   printed in this document or included in the repository.
4. Configure **your own** server-side provider credential. To retain the candidate's native Anthropic
   model policy, export `OPENMAIC_CONFIG=../delivery/fullstack/native/openmaic.yml` — the path is
   **relative to the `classroom/` working directory** these commands run from; use an absolute path
   if you run from anywhere else, and note that placing a copy at the classroom root is known to
   break the upstream suite's cwd-relative loads. Then set your own compatible Anthropic credential
   in `.env.local` under the variable the config interpolates: **`ANTHROPIC_AUTH_TOKEN`**. No value
   for it appears in this document or in the repository. The adapter distinguishes OAuth tokens from
   ordinary API keys, so the single variable name covers both. Model availability must be checked
   against your own account.
5. Start on loopback and open `/kaizen`:
   `npm exec --yes --package=pnpm@10.28.0 -- pnpm dev --hostname 127.0.0.1 --port 3000`, then
   `http://127.0.0.1:3000/kaizen`. **The library starts empty** because learner data and generated
   lessons were not exported.

Two warnings. First, the retained policy pins `claude-opus-5` and locks media/search/document slots
off — that is the current implementation, **not full OpenMAIC parity**; for deliberate configuration
changes consult `classroom/openmaic.example.yml` and the upstream `classroom/README.md`, and do not
silently add fallback providers. Second, **do not use
[delivery/fullstack/native/launch.mjs](delivery/fullstack/native/launch.mjs) as the portable
entrypoint** — it is retained for provenance and tests, depends on the original machine's credential
resolver and absolute paths, and disables the durable agent runtime. OAuth renewal on a different
machine is not configured by this export.

Targeted offline regression tests, quoted as the command to run — **not run in this task**, from
`classroom/` after installation:

```sh
npm exec --yes --package=pnpm@10.28.0 -- pnpm exec vitest run \
  tests/classroom/kaizen-solo-tutor-selection.test.ts \
  tests/kaizen-ui-*.test.ts \
  tests/server/anthropic-oauth-*.test.ts \
  tests/server/native-opus-*.test.ts
```

Historical browser harnesses need a running app, a locally created owner context and a compatible
Playwright browser; their old absolute paths and omitted evidence files must be adapted. No browser
session, API key, environment file or database dump is shipped. Full setup detail:
[README.md](README.md).

---

## 9. Prioritized next steps

1. **Establish the parity baseline that does not exist.** Produce the independently accepted
   stage-parity inventory of upstream OpenMAIC capability versus what the Kaizen surface actually
   reaches. Until this exists, "at least as extensive as OpenMAIC" cannot be measured, let alone
   claimed.
2. **Regenerate a lesson and re-evaluate its scenes on fresh data.** Finished scenes *have* been
   observed and inspected (§6 defect 10) — but on a lesson whose database, cookie and generated
   content are **excluded from this export**, so none of it can be reopened on a new machine. Drive a
   `generate-classroom` job to completion, read `GET /api/stages`, open the stage and inspect the
   actual scene payloads *that run produces*. The question is no longer "does a scene exist" but
   **"is the generated teaching pertinent and good"**, across more than one topic and age. Budget for
   the §6 defect-7 latency: minutes per scene at full reasoning depth.
3. **Trace the locale boundary before patching it.** Follow the requested language along the real
   path — request construction → `storeState` → prompt assembly → persona → stored course — and find
   where it is actually dropped; do not start from the assumption that agent persona text is the only
   lever. Context: upstream `defaultLocale: zh-CN`, no `es`/`es-ES` in the shipped locale set,
   `/api/chat/pi` reads no locale field, one historical probe answered an English prompt in Chinese,
   and an explicit Spanish chat answer *did* work. Then add a test per language, covering generation
   and stage content, not chat alone.
4. **Fix the shared mobile stage layout** at 320/390px — not one screenshot and not one lesson.
5. **Close U1 and M2** in the chosen flow, by fixing the contracts: persist vote direction rather
   than inferring it from token existence, and stop labelling a configured identity as requested.
6. **Then** the private learner-attempt slice (attempt evidence → tutor/coach → next practice) on
   existing stores with bounded per-stage reads and existing ownership checks; the dropped
   learner-turn cue; and the native auth residuals.

Deliberately **not** next: restarting audience discovery, replacing the upstream engine, opening a
third task graph, bulk source ingestion, voice, or turning on every feature flag. Working discipline:
one owner per shared file; finish and exercise one concrete visible defect or capability before
expanding scope; preserve existing tests; keep offline fixtures, live provider calls, browser
interaction and human educational validation strictly separate; report the exact unresolved list
rather than averaging it into a score. Two correction cycles maximum — a row still failing after the
second is reported open in its exact failing wording, never relabelled, deleted or averaged.

Historical model-role and machine-specific instructions in these documents describe the previous
environment. They do not configure the next coding tool. The next operator supplies credentials and
chooses the execution environment.

---

## 10. Source index

**Included in this portable repository** (relative links, targets verified present):

- Current state and setup: [HANDOFF.md](HANDOFF.md) · [README.md](README.md) ·
  [EXPORT_VERIFICATION.md](EXPORT_VERIFICATION.md) · [EXPORT_MANIFEST.json](EXPORT_MANIFEST.json) ·
  [source-manifest.json](source-manifest.json)
- Product direction: [DIRECTION.md](DIRECTION.md) · [PRODUCT.md](PRODUCT.md) ·
  [DESIGN_EXECUTION.md](DESIGN_EXECUTION.md) ·
  [COORDINATOR_CARRYOVER.md](COORDINATOR_CARRYOVER.md) · [SPEC_HANDOFF.md](SPEC_HANDOFF.md)
- Lesson engine: [lesson/ENGINE_HANDOFF.md](lesson/ENGINE_HANDOFF.md) ·
  [lesson/LESSON_LIBRARY.md](lesson/LESSON_LIBRARY.md) ·
  [lesson/UI_HANDOFF.md](lesson/UI_HANDOFF.md) · [lesson/STATUS.md](lesson/STATUS.md) *(historical
  status; superseded by HANDOFF.md)* · [lesson/SPEC.md](lesson/SPEC.md) ·
  [lesson/PLAN.md](lesson/PLAN.md) · [lesson/PROFILE_PLAN.md](lesson/PROFILE_PLAN.md) ·
  [lesson/PROGRESS_PLAN.md](lesson/PROGRESS_PLAN.md) ·
  [lesson/RESUMPTION_PLAN.md](lesson/RESUMPTION_PLAN.md) ·
  [lesson/TEACHING_PROMPTS.md](lesson/TEACHING_PROMPTS.md) · [lesson/tests/](lesson/tests/)
- Candidate integration: [delivery/fullstack/native/UI_CONTRACT.md](delivery/fullstack/native/UI_CONTRACT.md) ·
  [delivery/fullstack/native/UI_CONTRACT_VERIFIED.md](delivery/fullstack/native/UI_CONTRACT_VERIFIED.md) ·
  [delivery/fullstack/native/STATUS.md](delivery/fullstack/native/STATUS.md) ·
  [delivery/fullstack/native/openmaic.yml](delivery/fullstack/native/openmaic.yml) ·
  [delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md](delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md) ·
  [delivery/preview-native/COORDINATOR_VERIFICATION.md](delivery/preview-native/COORDINATOR_VERIFICATION.md)
- Specification and gates: [delivery/fullstack/spec/ACCEPTANCE_MATRIX.md](delivery/fullstack/spec/ACCEPTANCE_MATRIX.md) ·
  [delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md](delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md) ·
  [delivery/fullstack/spec/static-gate.mjs](delivery/fullstack/spec/static-gate.mjs) ·
  [delivery/fullstack/spec/runtime-gate.mjs](delivery/fullstack/spec/runtime-gate.mjs) ·
  [delivery/fullstack/verification/](delivery/fullstack/verification/) ·
  [verification/quality-solo-tutor-20261004T025405Z/REVIEW.md](verification/quality-solo-tutor-20261004T025405Z/REVIEW.md)
- Superseded but preserved: [design/](design/) · [frontend/](frontend/)
- Application source: [classroom/](classroom/), upstream commit `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`,
  licence [classroom/LICENSE](classroom/LICENSE)

**Original-workspace sources; not included in the portable repository** — referenced above for
provenance only, in code form because no link target exists here:

- Discovery: `FINDINGS.md`, `PLAN.md`, `BRIEF.md`, `EXECUTION_PLAN.md`, `BACKLOG.md`,
  `reports/architecture.md`, `reports/product-learning.md`, `reports/ux-accessibility.md`,
  `reports/reliability.md`
- Frontend adjudication: `FRONTEND_REPAIR1_ADJUDICATION.md`, `FRONTEND_REPAIR2_ACCEPTANCE.md`,
  `FRONTEND_REPAIR2_INTEGRATION.md`, `FRONTEND_SPEC_ADJUDICATION.md`,
  `FRONTEND_ADVISOR_DECISIONS.md`, `PARALLEL_DELIVERY.md`
- Redesign reference: `snapshots/Kaizen-AI/web/`, `delivery/kaizen-interior-extract.md`,
  `redesign/ASTRA_PLAN.md`, `redesign/TEAM_BRIEF.md`, `redesign/BUTTON_MAP.md`,
  `redesign/REFERENCE.md`, `redesign/PAUSED.md`
- Contracts and plans: `delivery/LESSON_METADATA_CONTRACT.md`, `delivery/BUILD_PLAN.md`,
  `delivery/BACKEND_HANDOFF.md`, `delivery/MEDIA_HANDOFF.md`,
  `delivery/ON_DEVICE_VOICE_FEASIBILITY.md`, `delivery/OPUS_CACHE_PLAN.md`,
  `delivery/fullstack/CONTINUATION_PLAN_20261003.md`,
  `delivery/fullstack/NATIVE_CORRECTION_DECISION_20261003T2321Z.md`,
  `delivery/fullstack/UPSTREAM_MANIFEST.json`
- Research: `delivery/fullstack/research/oer-20261003/report.md`, `sources.json`, `evidence/`,
  `citation-ledger.json`
- Raw evidence, baselines and freezes: `evidence/`, `design/evidence/`, `lesson/evidence/`,
  `devtools/browser/runs/`, `delivery/evidence/`, `delivery/verification/`, `delivery/checkpoints/`,
  `delivery/baseline/`, `delivery/fullstack/baseline-20261003T223400Z/`,
  `delivery/handoffs/20261003T221349Z/HANDOFF.md`, `.local-data/lesson-library/`,
  `upstream/OpenMAIC/`

Upstream licence and notices remain in their original locations. **The upstream MIT licence is not a
new blanket licence grant over the owner's project additions.**
