# Lesson-first delivery state

## CONTROLLING CURRENT STATE — 2026-10-03T22:46Z

**This section governs. Every section below it is preserved historical evidence, including
statements that now contradict this one.** Older sections record what was true at their own
checkpoint; they are deliberately not deleted or edited. Where they conflict with this section, this
section is current.

### What is actually true right now

| Fact | Evidence | Limit |
|---|---|---|
| **Restored historical preview is live on `http://127.0.0.1:51206/`**, PID 60528, serving the frozen `../delivery/checkpoints/lesson-metadata-candidate-20261003T202130Z/source` via the existing subprocess bridge against the original library. | Coordinator readback `../delivery/fullstack/restored-preview-20261003/readback.json`: health 200, mode `owner-test`, configured model `claude-opus-5`, served `app.mjs`/`core.mjs`/`styles.css` all matching the frozen source, all 8 original library hashes unchanged. | **A restoration of historical frozen source. NO new generation acceptance.** It is not evidence for any current gate and not a candidate for acceptance scoring. 51206 had **no listener at 22:28:52Z**; this is a later deliberate restoration, not continuous uptime. |
| Owner library intact: 8 files — 3 `.json`, 3 `.rec`, 2 `.fb`. | `../delivery/fullstack/baseline-20261003T223400Z/manifest.json`; re-verified 0 changed / 0 missing / 0 added by `../delivery/fullstack/spec/static-gate.mjs` (`FS-S46` PASS). | Local durability only. Multi-instance/serverless persistence, auth, tenancy and retention are unmet. |
| `classroom/` (complete pinned OpenMAIC candidate) is at SHA `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa` with a clean tree. | `git -C classroom rev-parse HEAD`; `git status --porcelain` = 0 lines. | **Nothing in the full-stack candidate is integrated, booted or proven.** `node_modules` is present (2.3 GB) but no build/boot/integration evidence exists. |
| Acceptance criteria for this cycle are authored and executable. | `../delivery/fullstack/spec/ACCEPTANCE_MATRIX.md` + `static-gate.mjs` + `runtime-gate.mjs`. | Authored **before** reading any implementation. Every `FS-*` row is `UNEXECUTED` apart from the static self-check below. |

### Latest checkpoint — 2026-10-04T02:54Z (newest; added above the 23:55Z block per this file's newest-first convention)

Adds facts only; revises nothing above or below. All historical sections preserved.

**One-voice change: SPEC PASS + code-quality PASS (narrow scope). Still NOT a release.**

- Code-quality/security gate — the one the 23:55Z checkpoint recorded as never opened — is now
  **OPEN and PASSED for this ~70-line change only**: `verification/quality-solo-tutor-20261004T025405Z/`
  (`REVIEW.json`, `REVIEW.md`). 9/9 targeted vitest PASS, eslint 0 findings on all 5 paths, static
  secret/injection scan clean. Verified: registry role hydrated before the role lookup, teacher
  picked by validated enum role not position, no-teacher fails closed to an empty roster that the
  server rejects 400 (no peer promotion), multi-agent branch byte-identical, `soloTutor` in the
  effect deps. No application patch applied. Scope was 4 classroom paths + 1 new test — **not** an
  app audit, **not** auth/refresh.
- Spec side (parent): raw SSE confirmed `starts 1`, `errors 0`, `done`, `totalAgents 1`; UI cannot
  re-enable peers; survives reload. 5 hashes unchanged.
- 4 persisted scenes under stage `iXFCaLFiaa`, same content hashes, survive owner reopen.
  Independent simulation 8/8 checks pass with **no provider calls** —
  `coordinator-simulation-20261004T021605Z/checks.json`.
- **Non-blocking, recorded as unverified intent:** code comments claim the stage artist and
  background coach "remain as tools the tutor uses". That wiring is **not implemented** in this
  change; only the speaking roster is narrowed. Reword recommended. Not a new capability.
- **Not accepted / not claimed:** native auth rotation adopts current env every 5 min (parent: 65
  native + 10 fatal-harness checks), but the 5-minute stale window and old-token-on-failure
  residuals are **NOT quality-accepted**. Game claim **NOT proven** — F10 "Missed a 1/2" establishes
  neither a wrong-quarter catch nor a wrong-text bug nor a correct catch; the earlier README
  wrong-text claim stays **UNSUPPORTED** and is rejected; a lost life can be motor error, so no game
  fix was added. ES stage, a11y, game-concept check, growth-coach handoff and per-request model
  identity remain **OPEN**. Original `51206` unchanged; candidate `51208` is next-dev, **not
  release**. No preview promoted.

**Next task, one only, NOT implemented here:** the private learner-attempt slice — attempt evidence
-> tutor/coach -> next practice, built on the existing stores. Not broad research, not voice.

### Latest checkpoint — 2026-10-03T23:55Z (added later than the 22:46Z header above)

Placed here, not at the file's end, because this file's convention is that lower sections are
older. It adds facts; it does not revise the controlling section above.

`../delivery/fullstack/final-checkpoint-20261003T235503Z/` — `CHECKPOINT.md`, `SPEC-RECHECK.md`.

**Decision unchanged: NO-GO. The narrow lesson / chat / visual SPEC is NOT ACCEPTED.**

Four evidence classes, deliberately not pooled:

1. Unit/boundary: **41 files, 270 tests PASS**, parent-rerun against frozen source (`result.json`
   exit 0, `tests.log`); 40 native boundary tests verified separately.
2. Typecheck: **`tsc --noEmit` EXIT 0** (`final-checks.json`, `typecheck.log`).
3. Real browser on fixed source: **3/3 PASS** — catalogue empty state truthful, age/topic controls,
   Spanish **outer surface only** (`browser.log`, `browser-artifacts/`, 3 PNGs).
4. Spec recheck (reads-only): **12/12 frozen hashes match the working tree**; F1 return-route marker
   (session-bound, no open redirect — destinations are literal constants), F3 shared-locale bridge +
   `languageDirective`, and F2 cancellable busy state are all present in source. Independently
   agrees with `frozen_source_changed: []`.

Still unproven, and the reason for the no-go: generation never completed (outline "Half or
Quarter?", stage `DC23dkB3Og`, `sceneCount: 0`); **chat was never called — 0 chat requests**, so the
earlier Chinese-language defect is **UNEXECUTED**, neither reproduced nor refuted; no diagram was
ever rendered. The live harness itself was faulty (fixed `clamp(200_000)` ignoring `KZ_BUDGET_MS`,
`<a>` selector where the control is a `button`, no preserved storage for same-owner retry); a fresh
anonymous context's empty catalogue is **expected owner isolation, not data loss** — no
owner-persistence bug is inferred. A timeout is not evidence of provider cancellation.
`claude-opus-5` is **configured**, not proven reported per request; the agent slot omits
`ThinkingEffort`, so no "maximum effort on all calls" claim. The **>8 min single scene** is one
observation, not a benchmark, and cannot support a 90-minute course forecast. Server
`proc_070dd480590c` is **Next dev/Turbopack, not production**; `51206`/pid `60528` untouched,
production unchanged. Source research is **26 rows, not 26 verified reusable licenses**; no
ingestion. The **separate code-quality/security review gate was never opened** — distinct from spec
conformance. Two repair cycles are exhausted; no new defect was repaired here. No preview promoted,
no badges or mastery claims. Overruns recorded: UI 8 min → **9m47s**; native 12 min → **16m48s**.

Next task, one only: **correct the live harness and make one bounded run** — honour `KZ_BUDGET_MS`
on the real await, target the actual `button`, save/reuse the same browser storage under restrictive
permissions, wait for real completion, then reload as the same owner and exercise chat and diagram
rendering. New evidence only; separately authorized; not a source-repair loop.

### Four categories that must not be collapsed

The historical sections below mix these freely. Keep them apart.

1. **Prior confirmed real generation (historical, on frozen source).** On 2026-10-03 a real Chromium
   Generate click against the frozen metadata candidate returned a new v2 lesson, HTTP 200, in
   31.008 s, provider response model `claude-opus-5`, canonical host, saved record
   `9c2f4e6c…ece46c54`; evidence `../delivery/evidence/preview-switched-20261003T211401Z/`. Earlier
   same-candidate HTTP checks: generation 31.023 s, incorrect-answer feedback 16.478 s, identical
   lesson served in 1.229 ms with 0 provider calls, and 2.996 ms with 0 calls after restart.
   **Real, and historical.** It was produced by the frozen source, not by the full-stack candidate,
   and it does not close Group E or any `FS-V` row.
2. **Backend worker logs — recorded, not independently re-run in full.** 27 new metadata-correction
   tests / 27 pass; aggregate 332 tests / 328 pass / 4 fail
   (`../delivery/evidence/metadata-correction-20261003T212050Z/`). The coordinator read the log
   summaries; the full suite was not independently re-run. The four retained failures need
   contract adjudication by **written mapping plus additive named tests** — editing any of them to
   green is an automatic `FS-S47` FAIL:
   - `tests/server.test.mjs` — stale expected `claude-fable-5-1` vs configured Opus.
   - `tests/server.test.mjs` — stale `microphone=()` vs the opt-in native microphone policy.
   - `tests/lesson-archive-store.test.mjs` — old deep-equal reply disallows added record metadata/feedback.
   - `tests/lesson-archive-partition.test.mjs` — fixture wire identity `w1` incompatible with the strict contract.
3. **Open UI defects, independently reproduced (offline synthetic DOM/API, not browser/provider).**
   Report `../delivery/verification/metadata-independent-20261003T211500Z/REPORT.md`; raw rerun
   `../delivery/verification/metadata-return-coordinator-20261003T221130Z/frozen-probe.log`.
   - **U1 — selected thumb lost on reload.** `app.mjs:1024` resets `S.rateVote` to null; line 1037
     then assigns `readVote(recordId) ? S.rateVote : null`, so both branches are null. Counts
     restore; both thumbs read `aria-pressed=false`. Only a voter token is persisted, not direction.
     Fix the contract (persist direction, or look up the caller's actual vote) — do **not** infer
     direction from token existence. Gate: `FS-B04`.
   - **M2 — configured-as-requested attribution.** `app.mjs:559` uses `requested || configured`, so
     an absent requested identity is impersonated by the configured label. Omit the unobserved row or
     label configured separately. Gate: `FS-B06`.
   - **P7b is NOT a third defect.** It is the reviewer's own invalid `/proven/` regex matching
     legitimate "provenance" copy — a **harness defect**. Do not tally it as an application bug.
     (Two harness defects of the same class were found and fixed in this cycle's own static gate; see
     "Gate self-check" below.)
4. **Unintegrated candidate (updated 2026-10-03T23:30Z).** The complete pinned OpenMAIC application in
   `classroom/` is a *candidate foundation*. The earlier "no install, build, boot" wording is a
   **stale historical observation**: `classroom/node_modules` is present (117 entries) and a native
   runtime is **booted** on loopback `127.0.0.1:51206` (PID 60528). A second instance on `*:51208` was
   **stopped at 23:21Z** because `lsof` showed it bound to all interfaces with
   `accessCodeConfigured:false` — decision in
   `../delivery/fullstack/NATIVE_CORRECTION_DECISION_20261003T2321Z.md`; no access or data leak is
   claimed. **Installed and booted is not a live capability pass.** Still open against that runtime:
   unauthorized `course.content.effort: high` reasoning reduction (user requires maximum supported
   reasoning), and a chat probe recording `stage_used: null` with a Chinese answer — so contextual EN/ES
   tutoring is **unproven**. Native corrective worker `sa-0-c0a4aae1` is addressing these. Catalogue,
   course generation and theater remain unproven; any claim of full-stack capability is still false. No
   billing or subscription-429 root cause is claimed from `service_tier: standard`.

### Newest owner direction now in force

Top of `../DIRECTION.md`: **isolated tutor runtime, lessons catalogue and course generation, with a
visual / spoken / direct-manipulation teaching theater as the primary interface and text as the
backup, so the product can reach learners who cannot rely on reading.**

- Decorative shell polish must **not** precede or substitute for working catalogue/course/theater
  capability (`FS-S54`).
- Text slides, prose, bullets or text rasterised into an image do **not** count as a visual
  explanation (`FS-S56`, `FS-V27`, `FS-B21`).
- Catalogue entry, course goal selection, start and continue must each be operable without fluent
  reading, with non-text affordances **alongside** text labels (`FS-S60`, `FS-B25`).
- Captions/transcripts/accessible descriptions and non-drag/non-voice alternatives are mandatory
  backups, not a demotion of the visual channel (`FS-S61`, `FS-S62`, `FS-B22`, `FS-B23`).
- "Isolated" is read conservatively: lesson/session-scoped agent state and safely isolated generated
  visual content inside the one candidate runtime — **not** a second disconnected tutor product
  (`FS-S49`, `FS-L17`).
- **Low-literacy efficacy, accessibility and spoken-interaction usability are UNVERIFIED** and
  require real-user validation (`FS-D05`–`FS-D07`). They cannot be inferred from age, from a
  non-reading path check (`FS-V30`), or from a few words of direction.
- Unchanged and still binding: all-age/open-topic, nickname+age first, EN/ES, local nickname privacy,
  conversations out of the shared library, camera OFF, opt-in microphone with typed alternatives,
  native Opus locked server-side with no fallback, Fable suspended, OpenRouter Jev-only, honest
  provenance and feedback-as-reported-helpfulness.

### Spec-writer lane record and doc correction (2026-10-03T23:30Z)

**Original spec writer: 16 minutes elapsed against a 12-minute checkpoint — exceeded, not "within
time".** Any on-time claim in the handback is not credited.

**Independently verified test state** (`../delivery/fullstack/coordinator-compat-full-20261003T2324Z/result.json`):
legacy targeted run **55 pass**; full offline lesson suite **356 pass / 360 tests, 4 fail, 0 skipped**
(the 4 are retained pre-existing conflicts: v1/v2 cache-dialect sharing, `createServer`
`library.saved` persistence, `/api/health` mode+model, same-origin CSP camera/microphone). **30**
protected baseline test files with **zero** changes; library count **8**, unchanged.

**Doc-correction pass.** Four classes of unsupported deduction were corrected in
`../delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md`,
`../delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md`, `../PRODUCT.md` and this file: (1) the
"no conceptual-diagram renderer / main gap" claim → an **existing** generation + shared-renderer
pipeline with unverified live quality; (2) the overgeneralized PBL worksheet guardrail → a
PBL-scoped fragmentation/answer-leak check that blocks nothing; (3) stale "uninstalled, unbooted"
state → installed and booted with behaviour unproven; (4) mandatory human review of **every** private
AI-generated lesson → a public-publication/quality-claim bar only. Also: the "no pdf-lib anywhere"
claim was false (`classroom/package.json:128`), and the `QT-03` "shells 2, 8, 8" wording was a factual
misconception. Pre-correction copies and SHA-256 hashes:
`../delivery/fullstack/doc-correction-20261003T2330Z/`. **No gate is closed and no `FS-*` row moves.**

### Newest owner sequencing — lessons quality, then chat, then diagrams; voice later (2026-10-03T23:18Z)

**Additive to the section above; it supersedes no gate and closes no `FS-*` row.** Order to prove:
**(1) actual generated lessons, each quality-checked → (2) contextual text chat answering the real
latest question and adapting → (3) useful diagrams/interactive demonstrations through the existing
OpenMAIC stage.** Voice follows as its own gate. Podcasts stay a roadmap toolkit item, not an
immediate audio implementation and not an acceptance blocker. **Sequence, not reversal** — visual-first
teaching, text-as-backup and the low-literacy reach goal remain in force, and a chatbot-only product
is still rejected. Specs: `../delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md` (toolkit status with
source paths, data boundaries, `QG-*` gates, `QT-01`–`QT-12`) and
`../delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md` (additive sequencing).

**Not blockers on the chat-first slice, still open and required:** `FS-D05`–`FS-D07` low-literacy and
accessibility validation, real-device spoken interaction, educational efficacy, Group E (E1–E14,
UNEXECUTED), durable hosting/auth/tenancy/retention/consent. Deferred ≠ dropped.

**Capability caveats observed in `classroom/` at SHA `5312c2b4b4bc`, read 2026-10-03T23:05–23:16Z.**
Wired means a caller chain to a route was grep-verified; it does **not** mean integrated or
behaviourally proven. Install/boot status is corrected in category 4 above (installed, booted on
loopback 51206, behaviour unproven).

- **Latest-question prioritization exists on one path only.** `lib/chat/pi/prompts.ts:529-543` extracts
  the newest user message and foregrounds it (`director-loop.ts:258`); the Pi path is default-on when
  unset (`lib/config/feature-flags.ts:99`,`:14`). The legacy `app/api/chat` path has none —
  `lib/orchestration/summarizers/conversation-summary.ts` defaults `maxMessages = 10` (`:37`) /
  `maxContentLength = 200` (`:38`), sliced `:44`, no override at `director-graph.ts:162`.
  Chat-first evidence must come from the Pi path.
- **A diagram pipeline exists; live quality is unverified** (corrected — the earlier "no
  conceptual-diagram renderer" wording wrongly implied missing capability).
  `packages/@openmaic/generation/src/scene-generator.ts:1240` routes `widgetType === 'diagram'` to
  `PROMPT_IDS.DIAGRAM_CONTENT`; `packages/@openmaic/generation/templates/diagram-content/system.md`
  explicitly generates **connected SVG nodes + edges + `revealOrder`** and a **required widget
  `postMessage` listener** (`:80-82`); the shared
  `components/scene-renderers/InteractiveIframeHost.tsx` renders it. Absent: a dedicated React diagram
  component and any mermaid/d3 dependency; and there is no separate `diagram` scene type (`SceneType`
  is `slide|quiz|interactive|pbl`, `packages/@openmaic/dsl/src/stage.ts:22`) — diagrams ship **as**
  `interactive` scenes. That is **not** absence of diagram support and does not justify a new diagram
  engine. Unverified: safety, factual accuracy, live visual behaviour. Alternative substrates: echarts
  `ChartElement` and whiteboard `wb_draw_*` ops (`lib/action/engine.ts:234-283`, 22 action kinds).
- **No dedicated generator found for flashcards / worksheets / study guides / podcasts** (narrow,
  accurate claim). **Corrections:** the worksheet guardrail was overgeneralized —
  `tests/pbl/v2/planner-prompt.test.ts:47-51` checks only *PBL* worksheet **fragmentation** and
  **answer leakage**, and `prompts-pbl/planner-single-call-system.md:1-11` scopes itself to
  Project-Based Learning; it does **not** prohibit separate worksheet artifacts. Keep the guardrail and
  tests unchanged; owner-requested worksheets need **no permission decision**. And
  `components/kaizen/ReadAloudNote.tsx` + `tests/kaizen-ui-course-request.test.ts:150-154` belong to the
  **new Kaizen** surface, not upstream OpenMAIC — a temporary Kaizen voice absence does not establish an
  upstream podcast prohibition.
- **Retrieval is lexical-only and unwired** — `lib/rag/*` importers are `tests/rag/*` only; no
  embeddings or vector store anywhere.
- **Quiz types are `single|multiple|short_answer` only**; `lib/quiz/grading.ts` resolves keys by
  exact/unique match with no case folding — an unresolvable key is an invalid lesson (`QG-S7`).
- **Catalogue is `GET /api/stages`** and 404s without `DATABASE_URL`; `app/api/generate-classroom` has
  no in-tree UI caller and uses a different outline prompt from the browser flow.
- `components/scene-renderers/quiz-renderer.tsx` is an orphan; the live quiz is `quiz-view.tsx`.

**Source base:** human-authored/curated material, AI-selected and adapted with provenance, rights and
quality recorded; **no bulk ingestion yet.** Survey lane `../delivery/fullstack/research/oer-20261003/`
(owner `sa-0-30a14caa`), no app edits.

**Camera:** OFF now; no attention/affect collection, scoring or inference. Camera is **future direction
only** and would require explicit signal, opt-in consent, retention boundary, a non-camera equivalent
path and validation; attention is never evidence of learning.

**In-flight, not frozen and not asserted passing:** `classroom/app/kaizen/**`,
`classroom/components/kaizen/**`, `classroom/lib/kaizen/**` and `../delivery/fullstack/native/**`
(lanes `sa-0-e2439f2e`, `sa-0-31400584`). `../delivery/fullstack/native/UI_CONTRACT.md` is an
**in-progress contract, not final proof.**

### Lane ownership this cycle

| Lane | Owns |
|---|---|
| Native integration | `classroom` server/runtime/config, `../delivery/fullstack/native/` |
| Lesson compatibility | `lesson/app.mjs` + narrow store/server helpers, additive tests |
| Frontend `sa-0-31400584` | **only** `classroom/app/kaizen/**`, `classroom/components/kaizen/**`, `classroom/lib/kaizen/client/**`, consuming upstream APIs |
| Specification (this document's owner) | `../PRODUCT.md`, this file, `../delivery/fullstack/spec/**` — no application code |

Plan of record: `../delivery/fullstack/CONTINUATION_PLAN_20261003.md`.

### Gate self-check — the only `FS-*` rows executed so far

`node ../delivery/fullstack/spec/static-gate.mjs --target lesson` against the current `lesson/`
tree: **17 PASS / 1 UNEXECUTED / 1 REVIEW**, output
`../delivery/fullstack/spec/evidence/static-gate-selfcheck.json`.

- `FS-S02` UNEXECUTED — `allowWorkspaceProviders` is not in `lesson/`; it belongs to the classroom
  config and must be confirmed there.
- `FS-S47` REVIEW — `lesson-store.mjs` and `server.mjs` differ from the 22:34Z baseline
  (expected: the compatibility lane owns them). **No test, fixture or evidence path differs.**
- Its first run produced four FAILs that were all **harness defects**, now fixed and re-run: a
  documented `sk-ant-api…` credential *prefix* in a comment, a verifier file's own nickname regex, an
  explicit `video: false` camera-OFF spelling, and HTML `<input type="text">` matched as a stage
  scene kind. Recorded here so they are not later re-reported as application defects.

`runtime-gate.mjs` hard-refuses 51206 and returns all-`UNEXECUTED` against an unreachable base, so no
acceptance run can be scored against the restored historical preview or against a dead port.

### Open gates — nothing below is claimed

| Gate | Status |
|---|---|
| Group E `E1`–`E14` (live provider + durable archive) | **OPEN / UNEXECUTED.** Metadata unit tests do not replace it. |
| `FS-V01`–`FS-V30` (live native Opus, course generation, theater primacy, live stale rejection) | **UNEXECUTED.** No candidate runtime exists. |
| `FS-L01`–`FS-L19` (local runtime, override refusal, session isolation) | **UNEXECUTED.** No candidate URL. |
| `FS-B01`–`FS-B25` (real browser, U1/M2 regressions, 320/390/desktop, non-drag, captions) | **UNEXECUTED.** |
| `FS-D01` (real microphone) | **BLOCKED** — speech-pack install timed out (90 s headless, 70 s headed); no transcription obtained. |
| `FS-D02`–`FS-D04` (speaker, AT, real mobile) | **UNEXECUTED.** |
| `FS-D05`–`FS-D07` (real low-literacy learner, spoken-interaction, AT validation) | **UNEXECUTED and not arrangeable in this cycle.** Controlling blocker on the entire literacy-reach claim. |
| `FS-C01`–`FS-C05` (Vercel preview, cloud fail-closed, production untouched) | **UNEXECUTED.** No deployment performed; kaizenedu.net unchanged. |
| `FS-S26`, `FS-S49`–`FS-S64` (upstream reuse, catalogue/course/theater) | **UNEXECUTED.** Nothing implemented to assess. |
| U1, M2 | **OPEN.** Reproduced offline; repair must land in the chosen flow, not a parallel abandoned one. |

Two correction cycles maximum. A row still failing after the second correction is reported open with
its exact failing wording — never relabelled, deleted, or averaged into a score. No production
deployment, no public or real-child launch, no destructive migration, no paid service.

---

*Sections below are historical checkpoints, preserved unedited. They contain statements superseded by
the section above — including an earlier claim that the preview represented current acceptance, older
K–8-only and vanilla-only scope, and worker self-reports whose counts the coordinator later corrected.
They are retained as evidence, not as current status.*

## Historical sections (preserved, unedited)

## Current local preview — real Opus teaching works; metadata review open

**Use http://127.0.0.1:51206/**. On2026-10-03 the coordinator stopped the old native429preview and selected the independently exercised frozen52-filecandidate `../delivery/checkpoints/lesson-metadata-candidate-20261003T202130Z/source` on the supported local bridge. Running process `proc_767db33f0b54`, PID25817, loopback only. Actual Chromium Generate click returned a NEW v2lesson HTTP200 in31.00828s, with provider response model `claude-opus-5`, canonical host and outbound adaptive/max facts. Saved record `9c2f4e6cc5b2da434697cf6220d786c7ad845009b3c2dea6cd5c7952ece46c54`. Evidence: `../delivery/evidence/preview-switched-20261003T211401Z/`. This is a known-limits adult-owner preview, not full-product/production acceptance.

Earlier same-candidate HTTP check generated a lesson in31.023s and actual incorrect-answer feedback in16.478s. Identical saved lesson served in1.229ms with0newprovidercalls; after process restart,2.996ms with0calls and identical lesson/metadata. Real browser thumbs up→down→remove, saved-work reload, and separate duplicate-vote/restart durability passed. All test votes were removed. Evidence: `../delivery/evidence/tutor-http-20261003T210716Z/`. Parent AST comparison confirms the archived application SYSTEM exactly matches bridge SYSTEM; an earlier suspected mismatch was incorrect.

Library: `/Users/man/education-product-discovery/.local-data/lesson-library`. Pending bounded correction/review: same-key new-version return attribution, feedback corruption/error truthfulness, metadata field alignment and safe bridge HTTP error propagation. Headless Chromium was labelled Safari by coarse device detection; not yet adjudicated. Coordinator reran305Node tests:301PASS/4FAIL, preserving25prior test files. Two failures are known stale model/microphone expectations; two conflict with expanded metadata response and strict model-wire fixture. Original tests and raw failures retained. Production/domain unchanged. Verification-only51207 has been stopped to avoid two writers. The earlier20-minute target was exceeded.

## Active full-app build — owner authorized

### Coordinator checkpoint: components verified, full app NOT READY

Frozen candidate: `../delivery/checkpoints/coordinator-20261003T181343Z/` — 34 source/test files; all 12 incumbent test files match the baseline. Coordinator reruns: lifecycle **26 PASS / 0 FAIL**; backend **161 PASS / 2 FAIL of 163**; media **55 PASS / 0 FAIL**, with fake recognizer/speech and stub transcription explicitly not real voice evidence. Preserved backend failures require the obsolete Fable model and a microphone-denial policy that conflicts with the requested same-origin opt-in voice policy; neither old assertion was edited.

Original independent profile checks: main run 18 PASS; follow-up 1 PASS / 1 FAIL; deduplicated latest-per-ID result **17 PASS / 1 FAIL across 18 IDs**. The remaining C3b computes failure from retained bytes despite deliberately making deletion throw; its own `uiClaimedReset:false` and the separate visible-error assertions show why that result needs specification-based adjudication, not deletion. The new full acceptance harness still reports **28 PASS / 34 FAIL / 23 UNEXECUTED across 85 IDs**; some failures arise from its fixture/setup/DOM-shim defects, while missing dashboard/media integration is real. A fresh read-only Gate 1 verifier reconciled all 14 profile clauses, and the coordinator independently reran the exact harness: **14 PASS / 0 FAIL**, four self-checks passed, all 34 frozen hashes unchanged. Evidence: `../delivery/checkpoints/coordinator-20261003T181343Z/verification/g1-parent/`. The specification stage and separate fresh CTO-quality/security review now pass for this repair slice only. Coordinator readback reverified all 34 hashes and reran the review's five intended age-gate checks (5 PASS / 0 FAIL; three tampering observations excluded). Three non-blocking follow-ups remain: storage-alert accessibility parity, compound-failure notice collision, and defensive age-gate validation. Evidence: `../delivery/verification/g1-cto-20261003T183034Z/COORDINATOR_READBACK.md`. This is not full-app acceptance.

The repaired-profile preview at **http://127.0.0.1:51206/** now uses the saved local credential through a memory-only native Opus launcher. The corrected launcher is running as `proc_2e1efe46c97f`/PID22364 after coordinator checks (23 refusal cases, six offline groups, plus two real process-tree cleanup cases). GET-only readback confirmed native configuration, loopback-only binding and the unchanged frozen app hash; no new inference was attempted. Evidence: `../delivery/preview-native/COORDINATOR_VERIFICATION.md`. Coordinator verified `providerConfigured:true`, native transport and the same frozen served-app hash. The owner-reported **503 ProviderUnconfigured was caused by the coordinator's empty-credential launch and is repaired**. A subsequent real lesson request returned **429 ProviderRateLimited in 0.29 seconds**, with no lesson: `../delivery/evidence/preview-live-20261003T183047Z/result.json`. Do not ask the owner to retry repeatedly or present generation as working. Dashboard/growth/parent integration has not started; voice/scenes remain built modules, not connected UI. Existing production and older previews remain unchanged.

Live Jev consultation `../delivery/jev-decision-20261003T181802Z.json`: HTTP 200, TypeSafe / `typesafe/jev-1.13-20260917`; strict native-boundary correction accepted at confidence 0.99, honest NOT READY checkpoint at 1.0. One bounded Opus correction is active for native endpoint/model/host/request boundaries. Separate real browser-local speech-pack verification returned **BLOCKED: pack-install-timeout**: installation did not finish within 90 seconds headless or 70 seconds headed; no transcription was attempted or obtained. Two prerequisite checks passed, not the voice requirement. Evidence: `../delivery/verification/native-voice-20261003T181739Z/result.json`. No third identical attempt; real microphone remains untested. Neither consultation nor component test counts accept the full product.

**Latest bounded Opus diagnosis:** two same-credential native controls both returned HTTP429, including the installed current-client headers. Read-only usage reported overall weekly57% and session0%; the only exhausted scoped pool is labelled **Fable**, with a null model ID and no Opus-specific meter. **Opus quota exhaustion is not established.** Extra usage is disabled in the snapshot; this is not proof about other account/Console credits. The worker's confirmed-root-cause claim was rejected after coordinator artifact/hash/source review: `../delivery/verification/opus429-20261003T184920Z/COORDINATOR_VERDICT.md`. No alternate tutor, OpenRouter generation or further inference retry. Earlier Fable timeouts remain undiagnosed; native Opus lesson/feedback and maximum-reasoning success are still unverified.


The owner confirmed working-app edits with originals/tests/evidence preserved and a verified Vercel preview before changing kaizenedu.net. Older no-edit/await-authorization statements below are historical, not current blockers. This is a new full-app scope, not a claim the earlier failed profile build was accepted.

Vercel authentication read back as `saitokiku`; `kaizenedu` project owns the apex and www domains. Existing production is unchanged: `dpl_AsJExiKkXfM71xy3CXig2UAAG2dm`. The working `lesson/` directory is linked locally to that project. Existing preview protection is `all_except_custom_domains`; public custom-domain API access still needs a real authorization boundary before release. CLI link created a secret `.env.local`; it is excluded from release scope and must never be printed or uploaded.

Live Jev consultation passed five finite judgments, HTTP200 TypeSafe / `typesafe/jev-1.13-20260917`, evidence `../delivery/jev-decision-20261003T172102Z.json`. This proves that consultation, NOT automatic runtime activation. Opus coding worker configuration is Anthropic / `claude-opus-5` / maximum reasoning / no fallback. Requested tutor migration to Opus is in progress, not yet live-verified.

Four separate Opus workers dispatched as `deleg_94c177d4`: UI/profile/dashboard `sa-0-b2975485`; backend/Opus/Vercel adapter `sa-1-d85acd60`; voice/scenes `sa-2-5eeadba4`; independent spec/harness `sa-3-1c1c3e54`. Disjoint file ownership and exact media contracts are in `../delivery/BUILD_PLAN.md`. Baseline source and all twelve incumbent test files are frozen in `../delivery/baseline/` (30 manifested files). No existing assertion may be weakened.

The full-build checkpoint is 13:38 CDT, counted from 12:08 current discovery, including verification; it is not a promised release time. Builder handoffs targeted by 12:56; at most two corrective integration rounds. The current production domain and old localhost51202 preview still show older builds. No new Vercel deployment or full-app acceptance has occurred. Real microphone/speaker, child readiness, and cloud local-only transcription remain unverified.


## Historical controlling result before repair — profile SPEC FAIL

Independent reviewer `deleg_e8bb6f38` returned FAIL. Coordinator reran both scripts against the30file freeze, preserving all source/tests/reviewer artifacts. Latest-per-ID reconciliation is **12PASS/6FAIL across18unique rows**, not the review summary's13/5; two reused IDs came from a follow-up. Four storage/profile defects reproduced: saved lesson disappears from view after re-entering an unremembered profile; a discarded age9 lesson returns beneath age11 after reload; deletion failures reset the UI without an error; profile-save failures leave remembering checked without persistence. Saved bytes remained on disk in the first case, so irrecoverable data loss is not claimed.

The existing literal-null footer is also still visibly present; reviewer footer assertions missed `null`. Legacy-v1 browser restoration was not actually exercised. Controlling details and corrected counts: `evidence/profile-spec-coordinator-20261003T145221Z/COORDINATOR_DECISION.md`. **No quality gate, new repair budget or owner rollout.** Application remains unmodified by this verification; fresh authorization is needed for further application edits. All workers have returned. Live-generation timeouts and broader requested features remain unresolved.

## Previous profile UI closeout — NOT ACCEPTED

The frontend implementer has returned; no application writer remains assigned. Coordinator froze30files at `evidence/profile-ui-coordinator-20261003T142925Z/` and independently reran **40/40 unique real-Chrome fixture checks** plus **130/130 core/UI/engine/voice/boundary tests**. Legacy server suite remains **13/21, eight failures**. Old browser harnesses were not modified; their pre-profile setup no longer reaches the goal. Name/age gate, open-topic v2 request and static sequence are built, but this is not a clean all-regression or live-teaching acceptance.

The existing09:21:12CDT checkpoint was exceeded: worker evidence is timestamped09:28:04.902CDT, 412.902seconds late. The handback's on-time claim is not credited. This is verification closeout, not a new build budget. Independent read-only spec review `deleg_e8bb6f38/sa-0-28c0bedb` checks saved-work/profile transition boundaries; no code-quality PASS or application repair is implied. The literal-null footer claim remains unverified against an empty-provenance state. See `COORDINATOR_CHECKPOINT.md` in the freeze for exact coverage and caveats.

**Live teaching remains blocked** by the two previously recorded180.01s HTTP504 generation timeouts. No additional provider requests were made. The owner's51202 preview has not been replaced. Dashboard, two-way browser voice and original animated teaching remain pending. No real microphone, camera or speaker test; all new browser lessons are synthetic fixtures. Older sections below are historical checkpoints, not current acceptance or writer status.

## New authorized scope — profile-first teaching

Latest owner direction is now in `../DIRECTION.md`: name/nickname and age first, then open learning topics; restore the prior Kaizen dashboard style; add opt-in two-way voice and original animated teaching scenes. The owner explicitly selected **camera off**. Names are local profile labels, not authentication, and are excluded from provider prompts/logs. This is requested work, not implemented capability yet.

The progress implementer and voice-feasibility worker have returned. Coordinator froze the progress build at `evidence/progress-freeze-20261003T053426Z/` (21 files): **77/77 offline**, **34/34 targeted browser**, **89/89 existing synthetic-browser** checks passed in coordinator reruns. Desktop and 320px loading screenshots inspected; the old literal-null footer and broad save disclosure remain pre-existing, not fixed in this slice. Independent spec review `deleg_450fd007` returned a PASS recommendation, but its raw latest harness logs still contain a D1 operation-boundary failure and its counts were overstated. Coordinator independently reran the final D1 harness (5 pass / 1 fail), verified the four newest Spanish-hint lifecycle entries were all Spanish, and traced the extra English lines to a stale prior-operation baseline. Controlling narrow SPEC PASS and exact caveats are recorded in `evidence/progress-freeze-20261003T053426Z/COORDINATOR_SPEC_DECISION.md`; no clean aggregate independent run is claimed. The separate Opus quality review `deleg_6d86ac9b` returned **FAIL**: the one-second elapsed counter is inside a live status region, and clearSaved leaves the old operation label/elapsed reading behind. Source/caller inspection confirms both structural defects; no actual screen-reader announcement count was measured. Repair worker `sa-0-10204353` in `deleg_205fd916` owns only these app changes and a new red/green browser check. The four-minute review checkpoint was exceeded; original evidence remains unchanged. Quality recheck and final served-hash verification still block rollout. One actual provider-backed lesson completed through browser controls on the separate candidate server: HTTP200, Activity moved from waiting at 2 seconds to received/local check/Ready at 143 seconds; lesson work rendered. Evidence `live-progress-response.json`, `live-progress-events.json`, `live-progress-waiting.png`, `live-progress-ready.png`. No page-error event captured. All 21 frozen hashes rechecked unchanged. This candidate test did not yet replace the owner URL.

Local-only speech was independently rerun using the worker's existing synthetic file (never played): 2.65s of AIFF transcribed to “water changes into vapor when it gets warm.”; model load 0.59s, transcription 0.42s. Evidence: progress freeze `coordinator-voice-probe.json`. This is not a real-microphone or Spanish accuracy claim. Browser Use could not launch because the default browser is non-Chromium; the already-installed project-local Playwright/Chrome path is being used instead, with no setting changes.

New integration contract: `PROFILE_PLAN.md`. Batch `deleg_37a7569d` has separate Opus engine (`sa-0-a09b7138`), local voice-module (`sa-1-5749ebc4`) and independent spec-author (`sa-2-fe901693`) lanes; maximum reasoning, no fallbacks. Overall checkpoint target is 45 minutes from that dispatch, including verification, max two corrective rounds. UI implementation waits until the narrow progress gate is reconciled; no concurrent UI writers. The complete `deleg_37a7569d` handback has now arrived: engine, voice module and acceptance author have finished. Coordinator froze 23 files at `evidence/profile-backend-freeze-20261003T055913Z/` and independently reran new engine **47/47**, voice **20/20**, and incumbent regressions **69/77 (8 failures)**. Actual frozen HTTP transcription returned200 with the expected synthetic phrase; the unchanged browser's old generation payload returned400 for missing age. The new backend is therefore **not integrated or accepted**. Both existing preview URLs remain healthy and serve their prior frozen app hashes. See that freeze's `COORDINATOR_REPORT.md` for evidence, the acceptance harness's false/vacuous checks, remaining Spanish-generation prompt conflict and unproved post-upload abort cleanup. No generative-provider call or sensor activation occurred in this coordinator checkpoint. Owner clarified **“go ahead edit application now”**, lifting the application-edit pause for assigned implementers while reviewers remain read-only and old tests remain protected. `RESUMPTION_PLAN.md` records the expired original checkpoint and the newly authorized bounded resumption, target09:21:12 CDT. `deleg_205fd916` has disjoint Activity repair (`sa-0-10204353`) and final backend-boundary repair (`sa-1-bfbf8fb1`) lanes. No profile UI writer starts until the Activity repair is accepted. No microphone, camera or real user audio captured. Existing acceptance findings below remain open until specifically repaired and reverified; the old K–8-only restriction is superseded, not carried into the new product contract.

## Current repair checkpoint — 2026-10-03 09:03 CDT

Repair workers returned; coordinator froze **25 files** at `evidence/boundary-coordinator-20261003T135802Z/` and independently reran **74/74 backend**, **13/13 targeted Activity browser**, **34/34 incumbent Activity browser**, **56/56 core/UI logic**. All frozen hashes and protected incumbent tests unchanged. The worker's 14-check count was incorrect; actual13. Both worker checkpoint targets were exceeded; backend's claim to finish inside8minutes is false from dispatch (634.97seconds). `COORDINATOR_SPEC.md` records narrow spec PASS and evidence limits. Separate Opus quality review `deleg_07632b8c` returned **PASS**, evidence `evidence/boundary-quality-20261003T140413Z/`; coordinator rechecked25/25 frozen hashes and working snapshot with no drift. Narrow Activity/backend repair is accepted. New coordinator health/live evidence files were deliberately added beside the immutable source after freeze; no manifested source or prior evidence file was overwritten. Sole frontend implementer `deleg_c2b60061/sa-0-9f2e5a7e` now owns the minimal nickname+age→open-topic request integration, retaining the09:21:12CDT checkpoint. Dashboard, browser voice and full animated engagement remain pending, not hidden scope cuts.

A separate frozen backend candidate is healthy at127.0.0.1:54035 with served app hash matched; its UI is still pre-profile and not the owner's preview. `proc_0c2edf85acba` is executing the reserved same-goal age7/age35 plus Spanish English-practice live calls, with actual synthetic-file transcription first. Live run finished: actual synthetic-file HTTP transcription **200**, expected phrase in **1.59s**; age7 and age35 water-cycle generation each returned **504 Timeout at180.01s**. Neither produced a lesson. Stopped after two same-route failures; Spanish and remaining feedback call not attempted. This is a live-teaching blocker, not proof of a credential fault, age adaptation or provider-side cancellation. Exact request/response evidence in the freeze's `live/` directory. Microphone/camera/speakers remain unused. Owner51202 and progress54034 remain unchanged.

## Prior owner-test checkpoint: NOT ACCEPTED

Open http://127.0.0.1:51202/ for an adult-owner preview using invented work only. A healthy loopback server is running from the frozen source below. It is not a release for children. No further repair cycle was started after the original approximate checkpoint budget was reached; verification ran through 2026-10-02 23:00 CDT. No lesson workers remain active.

### Independently exercised

- Integrated freeze: `evidence/integrated-freeze-20261003T034214Z/`. Nineteen files copied and hashed; all frozen hashes still matched after verification. The independent harness lives at project-root `../verify/`, not `lesson/verify/`; its original spec handoff is `../SPEC_HANDOFF.md`.
- Coordinator reran engine/core/UI logic against frozen source: **77/77 passed**, `coordinator-unit.log`.
- Coordinator reran the builder's real-Chrome fixture harness against frozen source: **89/89 passed**, **31 screenshots**, `coordinator-browser-fixtures.log` and `source/evidence/ui/`. These are synthetic-API controls/storage/race/layout checks, not live-provider teaching evidence. No worker evidence was overwritten.
- Actual browser controls generated one English-language math lesson and one English reading/writing lesson using the real provider: both `/api/lesson` responses **200**. Full responses: `live-browser-response-1.json` and `live-browser-response-2.json`. No page-error event was observed in that run. Math screenshots at 1440/390/320px and English at 320px were saved; the desktop math and 320px English images were visually inspected. Document widths matched the configured 390/320px widths.
- Actual English writing feedback API request against the new generated lesson: **200 in 19.8s**, response-specific, **ungraded**. Deliberately answered the Lena/plant passage with a dog/newspaper answer; feedback identified that mismatch. `coordinator-live-feedback.json`. This API check does not establish the complete live writing UI journey.
- Health checked again at 23:00 CDT. Confirmed launch command in source and engine handoff: `node lesson/server.mjs` from `/Users/man/education-product-discovery`. Do not start a duplicate while port 51202 is occupied.

### Controlling acceptance decision and open findings

**NOT READY for acceptance.** Preserve all red evidence; no repair or assertion weakening in this coordinator pass.

1. **Growth evidence guard (S14):** independently reproduced `chooseNext` advancing for an `ai-feedback`-tagged correct record. Adjudication: require actual local-check evidence before advancing, rather than weakening S14. The ordinary UI recomputes local correctness and sends locally correct submissions through its local path; this finding is at the shared evidence/helper boundary, not proof that a live model overrode a verdict in the tested UI. `core.mjs:201–212` also accepts absent assistance as not-true; the conservative contract calls for explicit evidence.
2. **Teaching prompt integration:** `server.mjs:234,247` includes whole/truncated teaching-copy sections rather than selecting generation/feedback guidance. Line237 requires every learner-facing string in the requested language, contradicting the English-subject rule for Spanish interfaces. Feedback prompt lines244–268 do not include the actual passage/visual or explicit subject/locale. The tested response happened to be grounded in a passage summary in `step.explanation`; this does not prove reliable passage-aware feedback.
3. **Independent harness reconciliation:** raw PURE/ENGINE result is 21 passed / 2 failed / 1 skipped Node test cases; recorded criterion rows are 28 PASS and 2 FAIL, not a full 76-criterion acceptance run. The second failure (E2) incorrectly treats browser-required `/core.mjs` as a forbidden server-only file. Record this as a harness/spec classification defect, not a credential leak; keep the raw failure. Other independent browser/LIVE criteria remain unexecuted. Do not aggregate missing rows as passes.
4. **Remaining gates:** full independent browser acceptance, integrated live next-goal/assisted-check/save/reload journey and the subsequent independent code-quality review are incomplete. Fractional-number-line behavior, provider-wire model identity, native-Spanish quality, curriculum breadth and AT/real-device usability are not certified. The bounded checkpoint does not authorize an automatic new repair/review budget.

### Scope and provenance

K–8 mathematics and English reading/writing remain the first product target; grade controls are not validated K–8 curriculum coverage. Organizer work is preserved and superseded, not revived: `../release/evidence/coordinator-checkpoint-20261003T025938Z/`.

Build batch `deleg_bab513de` returned all three workers. Opus delegation was rechecked: Anthropic / `claude-opus-5` / max / empty fallbacks. Astra coordinated; Fable authored teaching prompts with documented coordinator corrections. Live product responses report requested/bound Anthropic / `claude-fable-5-1`; `model_wire_proved:false` remains explicit. The unfinished automatic router was untouched and is not certified active.

The prior finite Jev consultation remains in `evidence/jev-scope-20261003T030852Z.json` (actual System One HTTP200, TypeSafe response identity, separate advice only). It is not shared-runtime activation or product acceptance.

No camera, microphone, biometrics, accounts, cloud storage, deployment, purchases or real-child data. No efficacy, mastery, compliance or child-readiness claims. Generated answer keys can be wrong. Saving is browser-local and opt-in, but lesson requests and submitted work still go to Anthropic. The UI's broad “Nothing is uploaded” save wording should be narrowed before acceptance; it must not obscure that provider disclosure.
