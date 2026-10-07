# lesson-engine (parked source)

Source: Hermes export at `Tutornat/kaizen handoff from hermes/lesson/` (not a git repo; files
dated 2026-10-02 to 2026-10-03, export 2026-10-04). Copied in full on 2026-10-07. Not imported or
built by `apps/web`.

A dependency-free vanilla Node + browser lesson engine. It generates a short lesson through a
model and grades answers locally. Lessons are archived by request fingerprint with
helpfulness votes. It also has animated teaching scenes and an opt-in local voice
(faster-whisper). The EN/ES UI is in `app.mjs`. The `*.md` files are the original spec, plans
and delivery log. `STATUS.md` has a stale "CONTROLLING CURRENT STATE" heading; see
`docs/history/hermes-handoff/HANDOFF.md`.

## What is inside

| File | Purpose |
|---|---|
| `core.mjs` | Pure lesson contract shared by server and browser: `validateLesson`, `gradeAnswer`, `parseNumeric`, `describeVisual`, `chooseNext`, `LessonError` |
| `vendor/math-expr.mjs` | `compileExpr`: safe expression compiler, vendored verbatim from Kaizen-AI `web/lib/mathExpr.js` |
| `scenes.mjs` | `createTeachingScene`: animated scenes (`fraction`, `numberline`, `sequence`, `tokens`, `passage`); reports that a turn happened, never correctness |
| `app.mjs` (2089 lines) | Browser workspace. **Lines 1–742 are pure** (`STRINGS`/`t`, visual-state reducers, library/provenance display helpers, vote and feedback normalisers, `makeEvidence`, profile and record read/save with an injected storage object, `lessonFitsProfile`, `freshGuard`). DOM wiring starts at line 743 (`// ── DOM ──`); `defaultApi` uses `fetch` |
| `lesson-store.mjs` | Durable archive: one JSON file per lesson keyed by request fingerprint, plus votes and feedback (`LESSON_LIBRARY_DIR`, default `.local-data/lesson-library`) |
| `server.mjs` | Node stdlib HTTP server on `127.0.0.1:51202` (on Vercel: `PORT`/3000). Serves allowlisted static files and `GET /api/health`, `GET /api/capabilities`, `POST /api/lesson`, `POST /api/lesson-rating`, `GET /api/lesson-library/:id`, `POST /api/feedback`, `POST /api/transcribe` |
| `anthropic.mjs` | Streaming Anthropic Messages client over plain `fetch` (API key or OAuth token) |
| `ai_bridge.py` | One model call through the installed Hermes agent, returned as JSON with provenance |
| `voice.mjs`, `voice_bridge.py` | Server-side transcription by spawning local faster-whisper (EN/ES, 20 s cap, offline) |
| `voice-client.mjs`, `media.css` | Browser opt-in microphone controls (open only on Record; camera never) |
| `index.html`, `styles.css` | Shell with strict CSP; workspace tokens and layout |
| `vercel.json` | `server.mjs` as a function (300 s, 1024 MB) |
| `SPEC.md`, `PLAN.md`, `PROFILE_PLAN.md`, `PROGRESS_PLAN.md`, `RESUMPTION_PLAN.md`, `ENGINE_HANDOFF.md`, `UI_HANDOFF.md`, `LESSON_LIBRARY.md`, `TEACHING_PROMPTS.md`, `STATUS.md` | Frozen acceptance spec, plans, handoffs, archive design, prompt document, delivery log |

`server.mjs` serves `scenes.mjs`, `voice-client.mjs` and `media.css`, but nothing in this
snapshot imports them from `app.mjs` or `index.html`.

## Tests

There is no `package.json` and nothing to install. Results of a run on 2026-10-07 (Node 26.9,
scratch copy, `HOME` pointed at an empty directory) are given below.

```sh
cd modules/lesson-engine
# Pure, no server:
node --test tests/core.test.mjs tests/ui-logic.mjs tests/library-ui.test.mjs \
  tests/lesson-metadata-ui.test.mjs tests/lesson-vote-attribution.test.mjs
# All node unit tests (each spins up its own loopback server / fake child processes, temp dirs):
node --test tests/*.test.mjs
# Python bridge checks (python3 only):
python3 tests/newprovider_bridge_trust_boundary_test.py
python3 tests/newprovider_bridge_wire_provenance_test.py
python3 tests/newprovider_bridge_model_parity_test.py
```

Observed: all 17 `*.test.mjs` files ran, 14 of them fully green, and `ui-logic.mjs` passed
(14/14). Four failures are already recorded in `STATUS.md` as known stale expectations:
- `server.test.mjs` ×2: an old model name, and a `microphone=()` policy expectation.
- `lesson-archive-store.test.mjs` ×1.
- `lesson-archive-partition.test.mjs` ×1.

The three Python bridge tests passed.

These do not run here: `ui-browser.mjs`, `ui-progress*.mjs`, `profile-ui.mjs`, `delivery-ui-*.mjs`
and `delivery-media-browser.mjs` (Playwright and Chrome for Testing at absolute paths, and
`../../devtools/browser/node_modules`); `live-e2e.mjs` (Hermes runtime and real provider);
`newprovider_bridge_boundary_offline_check.py` (absolute `sys.path`).

## Known issues and warnings

- **Hardcoded machine paths and a Hermes dependency.** `server.mjs:288,290` and
  `voice.mjs:26,28` default to `python3 /Users/man/hermes-router-integration/scripts/run_runtime.py`.
  `ai_bridge.py:53` hardcodes `/Users/man/.hermes/hermes-agent` and imports `hermes_cli`, and
  `voice_bridge.py` sets Hermes env. Override with `LESSON_AI_CMD` / `LESSON_STT_CMD`, or use
  the direct `ANTHROPIC_API_KEY` path. `ANTHROPIC_MODELS` must be `claude-opus-5` or unset.
- Browser tests, `tests/voice.test.mjs:13-14` and some docs reference `/Users/man/...` and
  `/Users/man/education-product-discovery/lesson`.
- Live generation was blocked by 504 timeouts and later 429s. The large direct-API
  configuration is unproven. Storage is local files only, with no auth, tenancy or
  multi-instance support. The Vercel preview was never run. Open UI defects: the vote is lost
  on reload (`app.mjs:1024`), and the configured model is shown as the requested model
  (`app.mjs:559`).
- No teaching-efficacy or child-readiness claims are established.

## Reuse plan

- Tutor & voice: port `core.mjs` (validate, grade locally, `chooseNext` on fresh evidence) and
  `vendor/math-expr.mjs` directly. They are pure and covered by `tests/core.test.mjs`.
- OpenMAIC stage: `scenes.mjs` is a small, self-contained animated-scene renderer. Use it for
  number-line and fraction visuals in the stage.
- Tutor & voice: the pure first 742 lines of `app.mjs` (EN/ES strings, visual-state reducers,
  evidence and profile records with injected storage) can be lifted without the DOM half.
- Backend reference: `lesson-store.mjs` shows fingerprint-keyed lesson caching and vote
  attribution. Re-implement it on the real database rather than local JSON files.
- Do not reuse `ai_bridge.py`, `voice_bridge.py` or the Hermes command defaults.
