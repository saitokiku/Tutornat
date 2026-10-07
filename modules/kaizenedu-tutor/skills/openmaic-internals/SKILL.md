---
name: openmaic-internals
description: How the OpenMAIC engine under Natural Tutor is built and which of its files we keep, patch, or strip. Load it when you read or edit anything upstream owns under lib/, app/api/, components/, packages/@openmaic, when you decide whether to reuse or replace an upstream module, when you merge upstream weekly, or when a change touches the chat SSE route, the action engine, the whiteboard, persistence, provider config, or the settings surface.
---

# OpenMAIC internals

Upstream is `THU-MAIC/OpenMAIC` v1.0.0 (`main` at `6334e9a`, merged 2026-09-04). Full map with line numbers: `docs/ARCHITECTURE-MAP.md`. Re-grep a line number before citing it after any upstream merge.

## Rules

1. Edit an upstream file only with a small patch that carries a `// KAIZEN:` comment saying why. Run `node .claude/skills/openmaic-internals/scripts/check-upstream-patches.mjs` before opening a PR; it lists every upstream file that differs from `upstream/main` without such a comment.
2. Product code lives in `app/(parent)/`, `app/(learner)/`, `lib/tutor/`, `components/tutor/`, `kaizen.config.ts`, `compliance/`, `eval/`. Product API routes go under `app/(learner)/api/tutor/**` and `app/(parent)/api/parent/**`; URLs stay `/api/tutor/*` and `/api/parent/*`.
3. Call the model only through `callLLM` / `streamLLM` from `@/lib/ai/llm` with a `source` from `@/lib/tutor/cost/sources`. ESLint blocks direct AI SDK use and the invariant suite checks the source label.
4. Before reusing an upstream module, read its keep/patch/strip verdict in the map. "STRIP" modules must not be imported by product code.
5. Never write learner audio anywhere, never log message content at `info`, never accept a provider key or base URL from the client.

## The engine in one screen

- **Chat turn.** `POST /api/chat` (`app/api/chat/route.ts`) → `statelessGenerate` → LangGraph director (code-only with one agent) → agent prompt from `lib/prompts/templates/agent-system/system.md` → `streamLLM` at stage `chat-adapter` → JSON-array parser → SSE events `thinking`, `agent_start`, `text_delta`, `action`, `agent_end`, `done`. The pi runtime (`app/api/chat/pi`, `lib/chat/pi/director-loop.ts`, flag `NEXT_PUBLIC_PI_CHAT_ENABLED`) runs a whole turn server-side with native tool calls and `cue_user` / `close_session`; it is the base for `lib/tutor`.
- **Actions.** Vocabulary in `packages/@openmaic/dsl/src/action.ts` (12 `wb_*`). `lib/action/engine.ts` applies one action to the stage store and renders KaTeX at execution time. Every `wb_*` executor sleeps its animation and ignores `AbortSignal` (fix in tutor-08). `lib/buffer/stream-buffer.ts` is the streaming rail: incremental push, 30 ms per character reveal, TTS hold.
- **Whiteboard.** `components/whiteboard/whiteboard-canvas.tsx` takes `whiteboard` as a prop; 1000 × 562.5 logical sheet; DOM elements with enter animations; `lib/whiteboard/runtime/{types,fold,validate}.ts` is the pure append-only board log.
- **Audio.** `generateTTS` and `transcribeAudio` in `lib/audio/*-providers.ts` are buffered whole-clip calls; `lib/hooks/use-discussion-tts.ts` is the cancellable playback queue. Details: `voice-pipeline` skill.
- **Persistence.** `@openmaic/storage` over Postgres; `lib/persistence/server-provider.ts` provisions tables on first request; identity is an anonymous cookie (`lib/server/agent-runtime/owner.ts`) and a shared dev token (`lib/persistence/server-auth.ts`); reads are unscoped. Tenancy design: map §2.4.
- **Providers.** `lib/server/provider-config.ts` (env and `server-providers.yml`), `lib/server/resolve-model.ts` (stage route > client model > `DEFAULT_MODEL`), `lib/server/model-routes.ts` (`LLM_STAGES`), usage in `lib/server/usage-storage.ts` (no cost, no session id, no ASR seconds).
- **Flags.** `lib/config/feature-flags.ts`; server flags never use `NEXT_PUBLIC_`. `TUTOR_MODE` is read from `kaizen.config.ts`.
- **UI.** Session tree `app/classroom/[id]/page.tsx` → `components/stage.tsx` → `components/edit/PlaybackChromeRoot.tsx` (1,849 lines) → `CanvasArea`, `Whiteboard`, `Roundtable` (2,189 lines), `ChatArea` (`use-chat-sessions.ts`, 2,286 lines). Stores: `useStageStore`, `useSettingsStore`, `useCanvasStore`, `useAgentRegistry`.

## Reuse map for the tutor

| Need | Reuse | Do not reuse |
| --- | --- | --- |
| Turn runner | `lib/chat/pi/director-loop.ts`, `lib/agent/runtime/*`, `cue-user.ts`, `close-session.ts`, `director-compaction.ts` | `lib/orchestration/director-*`, `lib/chat/agent-loop.ts`, `call-agent.ts` |
| Prompt pieces | `lib/prompts/snippets/speech-guidelines.md`, `agent-system/system.md` "Responding to the User's Turn", `whiteboard-reference.md` | director and classmate templates |
| Board | `whiteboard-canvas.tsx`, `lib/action/engine.ts` (de-delayed), `lib/whiteboard/runtime/*`, `lib/choreography/timing.ts` | `lib/playback/*`, `components/canvas/canvas-toolbar.tsx`, `components/stage/*` |
| Audio | `lib/audio/{tts,asr}-providers.ts`, `tts-utils.ts`, `audio-duration.ts`, `use-discussion-tts.ts` | voice cloning, catalog, roster resolution |
| Checks | `lib/quiz/{runtime,view-state,math-text}.ts` | the 50 % fallback in `app/api/quiz-grade/route.ts` |
| Upload | `app/api/extract-document/route.ts`, `lib/document/*`, `lib/pdf/mineru-cloud.ts`, `buildVisionUserContent` | `app/api/parse-pdf`, `lib/rag`, media extractors |
| Data | `@openmaic/storage`, `lib/persistence/server-provider.ts`, `owner-bound-document-store.ts` (patched) | `server-auth.ts`, classroom disk storage, `/api/classroom*` |
| Config | `provider-config.ts`, `model-routes.ts`, `usage-storage.ts` | `resolveModelFromHeaders`, settings panels, token plans |

## Weekly upstream merge

```bash
git fetch upstream main
git checkout -b chore/upstream-$(date +%F) main
git merge upstream/main
pnpm install && npx tsc --noEmit && pnpm test && pnpm test:invariants
node .claude/skills/openmaic-internals/scripts/check-upstream-patches.mjs
```

Resolve conflicts in favour of upstream inside their files and ours inside ours. If upstream changed a file we patched, reapply the patch and keep the `// KAIZEN:` comment. Bump `packages/@openmaic/*` versions when we touch publishable files (`scripts/check-package-version-bumps.mjs` enforces it).

## Gotchas found in Phase 0

- `apiSuccess` spreads its payload: response bodies are `{ success: true, ...data }`.
- `tests/setup-env.ts` does not load `.env.local`; stub env in tests.
- `scripts/check-i18n-keys.mjs` fails CI on any key missing from one of 12 locales; the default locale is `zh-CN`. Product UI uses plain English strings, not i18n keys, until infra-03 trims the locales.
- `lib/ai/providers.ts` (2,400 lines) ships to the browser through `lib/store/settings.ts`; trimming `PROVIDERS` shrinks the bundle.
- `next.config.ts` traces `skills/**` and transpiles the PPTX packages; both go with the strip list.
- The `pg_notify` bus needs a direct Postgres connection; Neon's pooled endpoint cannot `LISTEN`. The tutor does not need the bus.
- Upstream `ci.yml` steps are pinned by `tests/workflows/ci-video-export-contract.test.ts`; our CI lives in `.github/workflows/invariants.yml`.
