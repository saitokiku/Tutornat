# Native-runtime lane — status at handback

Time: 2026-10-03 ~23:20Z. Lane: classroom server/runtime/config, package install,
new tests, `delivery/fullstack/native/`. Not self-certified; parent reruns.

## Run command and URL

```bash
# once: isolated Postgres (own compose project + volume, loopback 51209)
cd /Users/man/education-product-discovery/classroom
OPENMAIC_DB_PORT=51209 docker compose -p kaizen-native-db -f docker-compose.db.yml up -d --wait postgres

cd /Users/man/education-product-discovery
node delivery/fullstack/native/launch.mjs --port 51208 --dev
```

**URL: http://127.0.0.1:51208/** — running at handback (pid 83626,
`proc_3ffde74c4e6a`, handed to parent). Port 51206 untouched and still
listening (pid 60528).

## DONE and verified

| Gate | Status | Evidence |
|---|---|---|
| pnpm 10.28.0 frozen install | PASS, exit 0 | `evidence/install.log` (2534 pkgs, 9 workspace projects, postinstall built all 7 packages) |
| Native Opus on the real wire | **PASS, 12/12 checks, first try, no 429** | `evidence/probe-attempt2.log` |
| Production build | PASS | `evidence/boot.log` |
| Server boot + health | PASS | `evidence/boot3.log`, `/api/health` ok |
| Lesson generation (live) | PASS, in progress at handback | `evidence/gen2-*.json`, 11 outlines + 3/11 scenes |
| Contextual tutoring chat (live) | **PASS**, real answer, full SSE in ~10s | `evidence/chat-probe.json` |
| Catalogue route | PASS, `{"stages":[]}` on isolated DB | — |
| New tests | 34/34 pass | 3 files under `classroom/tests/server/` |
| Upstream tests not weakened | 1554/1580 pass; 3 fails PRE-EXISTING | verified by stashing my diff: identical failures |

### Observed wire facts (NOT configured labels)

```
url            https://api.anthropic.com/v1/messages
auth           Bearer, sk-ant-oat01 (OAuth), x-api-key ABSENT
anthropic-beta effort-2025-11-24, claude-code-20250219, oauth-2025-04-20
user-agent     claude-code/2.1.274 (external, cli)   x-app: cli
system[0]      "You are Claude Code, Anthropic's official CLI for Claude."
request model  claude-opus-5     thinking {type: adaptive}  effort max
response model claude-opus-5     304 thinking tokens   service_tier standard
```

`service_tier: standard` = subscription lane, not metered extra-usage.

## ROOT CAUSE of the old 429 (the gate that was blocking everything)

The Hermes Anthropic credential is an **OAuth access token** (`sk-ant-oat01-`),
not an API key. Upstream sent it as `x-api-key`, so Anthropic's billing
classifier treated the call as a third-party app and routed it to the metered
extra-usage pool — empty by default — which surfaces as 429/400 on a valid
subscription. That is why `lesson/ai_bridge.py` (which uses the Claude Code
wire contract) worked while the direct transport did not.

Fix is three things together, all required: `Authorization: Bearer`, the two
OAuth betas + Claude Code `user-agent`/`x-app`, and the Claude Code system
block first. New file `classroom/lib/ai/anthropic-oauth.ts` + ~20 lines in the
existing `case 'anthropic'` of `providers.ts`. No fork, no new abstraction.

## Files

New: `classroom/lib/ai/anthropic-oauth.ts`, 3 test files in
`classroom/tests/server/`, and in `delivery/fullstack/native/`:
`openmaic.yml`, `launch.mjs`, `probe-native.ts`, `probe-chat.mjs`,
`UI_CONTRACT.md`, `UI_CONTRACT_VERIFIED.md`, `evidence/`.

Changed: `classroom/lib/ai/providers.ts` only.

Untouched: `upstream/`, `snapshots/`, `lesson/`, `.local-data/`,
`classroom/app/page.tsx`, all frontend-lane dirs, port 51206, production.

**`openmaic.yml` lives in `delivery/fullstack/native/`, NOT the classroom root**
— a root one is read by the upstream suite's cwd-relative loads and broke 113
baseline tests. The launcher points `OPENMAIC_CONFIG` at it.

## Server-side lock (openmaic.yml + policy)

- One provider: native `anthropic`, no `baseUrl`/`proxy` override.
- `llm`, `agent`, `course.content` -> `anthropic:claude-opus-5`. Every chat
  slot and all 19 stages resolve through an assigned ancestor. No `fallback`
  anywhere.
- `allowWorkspaceProviders: false` — request-named model/key/endpoint/headers
  ignored on a stage, refused without one. Tested.
- `tts/asr/image/video/webSearch/document: null` = locked OFF (no voice, no
  cloud speech, no web search, no image/video gen). Confirmed on `/api/health`.
- Credential: resolver -> pipe -> child env only. Endpoint validated
  (exact host + https) BEFORE the token is accepted. Never on disk, never in
  the bundle, errors reduced to status+message. `grep -rE 'sk-ant-'` over the
  delivery dir returns no match.

## Reasoning depth — deliberate, measured

`course.outline` and the live tutor keep `effort: max`. `course.content` runs
at `high` (claude-opus-5's own catalogue default) because at `max` a single
scene took >8 min, i.e. ~90 min per 11-scene lesson. `PARALLEL_SCENE_CONCURRENCY=4`
(was unset = strictly sequential). Measured result: 11 outlines + 3 scenes in
~6 min vs 1 scene in ~10 min before. Asserted in
`native-opus-boundaries.test.ts` so it cannot regress silently.

## BLOCKERS / open gates — explicit

1. **Full-lesson completion not yet observed.** 3/11 scenes at handback,
   progressing normally. Parent should poll
   `GET /api/generate-classroom/uFNkiCGjmQ` to completion and then read
   `GET /api/stages` (stages save only on completion — `{"stages":[]}` until then).
2. **Scene relevance / diagram quality UNVERIFIED.** I never saw a finished
   scene payload, so the owner's core requirement — pertinent non-text visuals,
   not a text dump or generic counter dots — is NOT proven. This is the most
   important remaining gate. `UI_CONTRACT.md` §6 lists the DSL visual types;
   whether Opus actually picks them is untested.
3. **LOCALE DEFECT: tutor answered an English-persona prompt in Chinese.**
   Upstream `defaultLocale` is `zh-CN`; `/api/chat/pi` reads NO locale field.
   The only lever is the agent `persona` text. Spanish ships as `es-MX` only
   (no `es`/`es-ES`). EN/ES is a prompt-level contract needing a test per
   language. Frontend lane must know this.
4. **`sceneCount` is a hint, not a cap** — asked 3, got 11. UI must handle a
   variable count.
5. **3 pre-existing upstream test failures** in
   `tests/model-settings/adopt-newer-view.test.ts`: Node 26 needs
   `--localstorage-file`; upstream pins Node 22 (`.nvmrc`). Not mine (verified
   by stash), not fixed — an env mismatch for the coordinator to rule on.
6. **Turbopack dev prints "Ecmascript file had an error"** for `process.cwd()`
   / `import.meta.url` in server-only modules. Pre-existing, non-blocking
   (routes work), noisy. Absent from the production build.
7. **Tutor "clear source/lesson knowledge + private growth state" NOT built.**
   Chat works and accepts `storeState.stage/scenes`, but I never exercised it
   with a real saved lesson attached, and there is no growth-state store.
   Artifacts the owner named (podcasts, flashcards, study guides, worksheets)
   do NOT exist upstream as tutor tools — that is new work, not reuse.
8. **No browser/device/Vercel evidence.** All of the above is API-level.
