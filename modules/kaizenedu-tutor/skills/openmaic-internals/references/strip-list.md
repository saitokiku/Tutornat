# Strip list (spec §8.2, consolidated from docs/ARCHITECTURE-MAP.md)

Cut in three passes. Each pass is its own PR under infra-03 with `pnpm test`, `pnpm test:invariants`, `npx tsc --noEmit`, and `pnpm build` green.

**Status 2026-09-06 (D34).** Passes 1 and 2 landed as one fence rather than as flags and deletions: `isServedInTutorMode` in `kaizen.config.ts`, applied in `middleware.ts`, answers 404 for every upstream page and `/api/*` route below while `TUTOR_MODE` is on, keeping only `/api/health` and `/api/access-code/*`; `app/layout.tsx` mounts upstream's `ServerProvidersInit`, `ProSwapWatcher` and `StorageHealthNotice` only with the product off. `tests/invariants/upstream-fence.test.ts` pins the list. Nothing below is deleted, so the weekly merge has nothing to re-resolve; the deletions in pass 2 move to pass 3, which is where the build time is.

## Pass 1 — flag off under TUTOR_MODE (no deletions)

- Upstream home `app/page.tsx`, `components/discovery/**`, `app/generation-preview/**`, `app/eval/**`.
- Provider Settings dialog `components/settings/**` (keep `general-settings.tsx`, `usage-dashboard.tsx` for the operator page), `components/server-providers-init.tsx`.
- Workbench: `app/workspace/**`, `app/workbench/**`, `components/workbench/**`, `lib/workbench/**`, `app/api/agent/**`.
- PBL: `lib/pbl/**`, `components/scene-renderers/pbl*`, `app/api/pbl/**`, `globals.css` PBL block (lines 290–509).
- Roundtable seat grid and AI classmates: `components/roundtable/index.tsx` seats, `components/chat/proactive-card.tsx`, `components/agent/{agent-bar,agent-reveal-modal,agent-config-panel}.tsx`, `default-2`/`default-3` in `lib/orchestration/registry/store.ts`.
- Export and import: `lib/export/**`, `lib/import/**`, `components/stage/header-controls.tsx`, `components/stage/video-export-dialog.tsx`, `app/api/export-video/**`.

## Pass 2 — delete routes that only serve client credentials or unauthenticated disk artifacts

- `app/api/provider/probe-models`, `app/api/azure-voices`, `app/api/verify-{image,video,pdf}-provider`, `lib/server/model-fetch.ts`, `lib/config/{token-plan-presets,apply-token-plan}.ts`.
- `app/api/classroom/route.ts`, `app/api/classroom-media/**`, `lib/server/{classroom-storage,classroom-media-bytes,classroom-media-generation,classroom-job-store}.ts`.
- `app/api/parse-pdf/route.ts` (superseded by `extract-document`), `lib/storage/client.ts` (calls a route that does not exist).
- Voice cloning: `lib/audio/{voice-registration*,qwen-voice-clone*,voice-design,voice-catalog,voice-resolver,unavailable-voice-bindings,regenerate-speech-tts}.ts`, `app/api/generate/voice`.
- `lib/rag/**`, `lib/document/transforms/**`, `lib/document/extractors/local-media.ts`, `lib/media-parse/**`.

## Pass 3 — packages and build chain once nothing imports them

- `render-service/**`, `lib/video-export*/**`, `gsap`, `hyperframes`.
- `skills/openmaic/**`, `skills/agent-runtime/**`, `app/api/skills/**`, and the `outputFileTracingIncludes` lines in `next.config.ts`.
- `packages/{mathml2omml,pptxgenjs}` (LGPL `mathml2omml` leaves with pptx export, spec §11.1), `transpilePackages` in `next.config.ts`, and the `postinstall` chain in `package.json`.
- `packages/@openmaic/{generation,importer,editor}` if course authoring is not kept.
- `animate.css` import in `app/layout.tsx` (zero uses).
