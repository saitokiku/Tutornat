# openmaic-classroom (parked source)

Source: Hermes export at `Tutornat/kaizen handoff from hermes/classroom/` (not a git repo;
export dated 2026-10-04). It is the complete OpenMAIC **1.1.1** Next.js app at upstream commit
`5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`, plus a small Kaizen delta. Copied on 2026-10-07.
Not imported or built by `apps/web`.

Upstream's English README was renamed to `UPSTREAM_README.md` so this file can describe the
module. `README-zh.md` still links to `./README.md`. `LICENSE`, `CHANGELOG.md`, `SECURITY.md`,
`CONTRIBUTING.md` and every other upstream notice are kept unchanged.

Removed from the copy: `assets/*.gif` and `assets/interactive_mode/` (README demo media, ~80 MB),
`.codegraph/`, nine root `kaizen-*.config.mjs` Playwright configs (machine-specific throwaways),
and the root `AGENTS.md` / `CLAUDE.md` that `next dev` writes automatically.

## What is inside

| Path | Purpose |
|---|---|
| `app/`, `components/`, `lib/` | Upstream OpenMAIC app: generation pipeline, classroom stage, chat/orchestration, playback, whiteboard, export |
| `packages/` | pnpm workspaces: `@openmaic/{dsl,generation,storage,importer,renderer,editor}`, `mathml2omml`, vendored `pptxgenjs` (`packages/docs` is a separate docs app) |
| `render-service/`, `configs/`, `eval/`, `e2e/`, `skills/` | Upstream render service, config presets, eval suites, Playwright e2e, upstream agent skills |
| `openmaic.example.yml`, `.env.example` | Server model/provider config template; env template (providers, TTS/ASR, media, search, flags, Postgres, access control) |
| `docker-compose.db.yml` | Local Postgres for development (project `openmaic-dev-db`, `127.0.0.1:${OPENMAIC_DB_PORT:-5432}`) |
| **Kaizen delta** | |
| `app/kaizen/page.tsx` | Catalogue home with "new course" |
| `app/kaizen/new/page.tsx` | Wraps `NewCourseFlow` |
| `app/kaizen/me/page.tsx` | Learner page (nickname, age band, language); states nothing is scored |
| `app/kaizen/course/[id]/page.tsx` | Mounts the unmodified upstream `ClassroomSurface` (`variant="pane"`, `soloTutor`) inside the Kaizen rail |
| `components/kaizen/KaizenShell.tsx`, `KaizenNav.tsx` | Layout (rail, main column, mobile bar) and en-US/es-MX toggle |
| `components/kaizen/CourseCatalogue.tsx`, `CourseTile.tsx` | Real stored courses via `listStages` / `getFirstSlideByStages` with first-slide thumbnails; honest empty/error states |
| `components/kaizen/NewCourseFlow.tsx` | Age band + topic picture → writes `sessionStorage.generationSession` → `/generation-preview` |
| `components/kaizen/ReadAloudNote.tsx`, `use-kaizen-profile.ts` | Text accessibility hint; localStorage profile hook that syncs language into upstream i18n |
| `lib/kaizen/client/profile.ts` | Profile type and storage key `kaizen.learner.v1`, `AGE_BANDS` (nickname stays on device) |
| `lib/kaizen/client/course-request.ts` | `TOPIC_SEEDS`, `buildGenerationSession` (teaching directive; knowledge / instruction / learner state kept as separate sections; nickname stripped) |
| `lib/kaizen/client/handoff.ts` | Origin marker + `takeGenerationExit` |
| `lib/kaizen/client/stale.ts`, `strings.ts`, `tutor-tools.ts` | Latest-result gate; EN/ES strings; tutor tool inventory (available vs deferred) |
| `soloTutor` prop | `ClassroomSurface` → `lib/classroom/load-classroom.ts` → `restoreAgentSelection` in `lib/orchestration/registry/agent-selection.ts`. Narrows the speaking roster to the single agent with registry role `teacher`. If no teacher exists, the selection stays empty and the request fails instead of promoting a peer. Without the flag, upstream multi-agent behaviour is unchanged |
| Generation-preview exit handoff | `NewCourseFlow` calls `markKaizenOrigin(sessionId)`; the three exits in `app/generation-preview/page.tsx` call `takeGenerationExit`, which routes to `/kaizen/course/{id}` / `/kaizen` when the marker matches, else upstream `/classroom/{id}` / `/`. A Kaizen `languageDirective` overrides the inferred language |
| `lib/ai/anthropic-oauth.ts`, OAuth branch in `lib/ai/providers.ts`, `lib/server/anthropic-oauth-refresh.ts`, timer in `instrumentation.ts` | Native Anthropic path using a subscription OAuth token (see warning below) |

## Tests

Requires Node >= 22.19 and pnpm 10.28.0. `postinstall` builds every workspace package.
These commands come from the export README and were not run during the copy.

```sh
cd modules/openmaic-classroom
npm exec --yes --package=pnpm@10.28.0 -- pnpm install --frozen-lockfile
# Kaizen delta, offline:
npm exec --yes --package=pnpm@10.28.0 -- pnpm exec vitest run \
  tests/classroom/kaizen-solo-tutor-selection.test.ts tests/kaizen-ui-*.test.ts \
  tests/server/anthropic-oauth-*.test.ts
# Full upstream unit suite (882 test files): pnpm test
```

| Test | Asserts |
|---|---|
| `tests/kaizen-ui-course-request.test.ts` | Nickname never sent; three labelled request sections; age is an unverified hint; stale gate |
| `tests/kaizen-ui-handoff-regression.test.ts`, `kaizen-ui-handoff-wiring.test.ts` | Kaizen-started generations exit to Kaizen routes; stale markers cannot hijack; no open redirect; every preview exit uses `takeGenerationExit` |
| `tests/kaizen-ui-payload-locale.test.ts` | Outbound request carries exactly the chosen locale, with no zh-CN leak |
| `tests/kaizen-ui-tutor-tools.test.ts` | Tool inventory evidence files exist; voice/podcast/flashcards/worksheets stay deferred |
| `tests/classroom/kaizen-solo-tutor-selection.test.ts` | With `soloTutor`, the selection is exactly the teacher; without it, upstream behaviour is unchanged |
| `tests/server/anthropic-oauth-{wire,rotation}.test.ts` | OAuth headers/system prefix, canonical endpoint only, token rotation without restart |
| `tests/server/native-opus-{deployment,boundaries}.test.ts` | Pinned single-provider policy. **These fail from this folder.** They read `../delivery/fullstack/native/openmaic.yml` relative to cwd. That file now lives at `docs/history/hermes-handoff/delivery/fullstack/native/openmaic.yml`. Adjust the path (or `OPENMAIC_CONFIG`) before running |

Running the app needs `DATABASE_URL`. `pnpm db:up` (or `docker compose -f docker-compose.db.yml`)
starts a local Postgres. Copy `.env.example` → `.env.local` and run `pnpm dev`, then open
`/kaizen`. The library starts empty because no lessons were exported.

## Known issues and warnings

- **Do not ship the OAuth path.** `lib/ai/anthropic-oauth.ts`, the OAuth branch in
  `lib/ai/providers.ts` (taken when the key starts with `sk-ant-oat`),
  `lib/server/anthropic-oauth-refresh.ts` and the refresh timer in `instrumentation.ts` present
  the app to Anthropic as Claude Code so it can use a personal subscription token. They send a
  `Bearer` token, `anthropic-beta: claude-code-…,oauth-…`, a `claude-code/<ver>` user-agent and
  `x-app: cli`, and prepend a "You are Claude Code…" system block. The refresh timer spawns an
  external resolver command named by `OPENMAIC_ANTHROPIC_REFRESH_ARGV`; nothing in this repo
  supplies it. Treat all of this as reference only. Production should use a normal
  `ANTHROPIC_API_KEY` through the standard provider path. The OAuth env vars
  (`ANTHROPIC_AUTH_TOKEN`, `OPENMAIC_CLAUDE_CODE_VERSION`, `OPENMAIC_ANTHROPIC_REFRESH_*`) are not
  documented in `.env.example`.
- The upstream default locale is **zh-CN** (`lib/i18n/types.ts`, i18next `fallbackLng`).
  Spanish exists only as **es-MX**; `es-*` browser languages map to it. The Kaizen pages
  offer en-US and es-MX only.
- Persistence requires `DATABASE_URL` (Postgres). `lib/server/database-requirement.ts` throws at
  boot without it, and there is no browser-storage fallback. Tables are created in code; there
  is no migrations folder.
- The historical candidate policy (`openmaic.yml` in docs/history) pins one model and locks
  TTS/ASR/image/video/search/document off. That is not full OpenMAIC parity.
- Open gaps listed in `docs/history/hermes-handoff/HANDOFF.md`: the mobile stage layout, the
  dropped learner-turn cue (`lib/chat/pi/tools/cue-user.ts` → `PlaybackChromeRoot.tsx`), the
  unimplemented artist/coach roles, and private practice history.
- Some comments reference files outside this module (`delivery/kaizen-interior-extract.md`,
  `delivery/preview-native/resolve-runtime.py`). Those are historical.

## Reuse plan

- OpenMAIC stage: use this tree as the reference for embedding the classroom.
  `ClassroomSurface` + `components/stage.tsx` is the stage. Generation runs through
  `/generation-preview` and `@openmaic/generation`; persistence uses `@openmaic/storage`.
- Port the Kaizen delta deliberately: the `soloTutor` roster narrowing, `takeGenerationExit`
  handoff, `buildGenerationSession` privacy shaping, and the stale-result gate are small and
  covered by tests.
- Tutor & voice: keep the single-teacher selection and the tool inventory in
  `lib/kaizen/client/tutor-tools.ts` as the starting contract.
- Replace the OAuth adapter with a standard API-key provider before any deployment.
