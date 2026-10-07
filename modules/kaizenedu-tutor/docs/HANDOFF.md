# Handoff — Natural Tutor build state (2026-09-04, lead seat)

> Superseded on 2026-09-30 by `docs/HANDOFF-2026-09-30.md`, which is the current
> handoff. This file is kept as the record of the September 4 state.

Read this first in a new session, then `CLAUDE.md`, `docs/PLAN.md`, `docs/DECISIONS.md` (D17–D21), `docs/STRATEGY-INTEGRATION.md`, `docs/SETUP.md`. This file is the state of the build at the moment the lead seat paused for a model change. Everything below is fact as of the last commit on `claude/build-prompt-spec-6qeqcn`.

## 1. Branches and commits

- Working branch: `claude/build-prompt-spec-6qeqcn` (pushed; every push builds a Vercel preview). Base: `main` at `8a6e46e` (Manny's merge of PR #48 plus his `.env.local` commit).
- Foundation commits on the branch, in order: `377d0f6` contracts/schema/auth/strategy; `594d8d4` root → `/welcome` rewrite and product prefixes; `45b5c39` usage ledger + pricing; `303944a` wire contracts + settings reader + entitlement; `53ea6c4` middleware webhook whitelist + provider-header strip; `bbeece0` trace `.env` into function bundles + startup loader + public-flag gate; `b43160a` docs (D21, SETUP); `0677f6a` latency harness product mode.
- `main` still serves upstream OpenMAIC's home on `kaizenedu.net`; the product front page arrives when this branch merges. Manny merges PRs himself.

## 2. The six builders (background agents in git worktrees)

All six were launched from `303944a` with `isolation: "worktree"`; their worktrees live under `.claude/worktrees/agent-<id>/` inside this container and their branches are `worktree-agent-<id>` (local only, never pushed). At the pause, none had committed yet; each was asked to commit a checkpoint and report (see §3). If the container is gone, their work is gone unless it was merged into the working branch and pushed.

| Builder | Worktree branch | Scope (files owned) |
| --- | --- | --- |
| A shell | `worktree-agent-a3ad950b0211141b3` | `app/(learner)/{layout,welcome,sign-in,sign-up,learn,legal,error,not-found}`, `app/(parent)/{layout,parent/**}`, `components/tutor/{shell,brand,ui,dashboard,parent,marketing}`, `lib/tutor/client/**`, root `app/layout.tsx` metadata patch, tests `tests/tutor/{client,shell-helpers}.test.ts` |
| B accounts | `worktree-agent-a9fc82629452a0000` | `app/(learner)/api/tutor/auth/*`, `app/(parent)/api/parent/{learners,report,transcripts,consent,settings,data}`, `lib/tutor/accounts/**`, `lib/tutor/report/**`, additive `parent_settings` table in `lib/tutor/db/schema.ts`, tests incl. route-level cross-tenant suite; may patch `lib/persistence/owner-bound-document-store.ts` read path and remove the `it.fails` |
| C tutor loop | `worktree-agent-a01b4fd183d714c3c` | `lib/tutor/{graph,prompts,safety,session,turn,checks,model,wrap,coursework,extract,progress}/**`, `app/(learner)/api/tutor/{session,turn,check,wrap,problem-extract,coursework,progress}`, `eval/{persona,red-team,coach}`, KAIZEN patch adding the six `tutor-*` stages to `LLM_STAGES` in `lib/server/model-routes.ts`, `lib/tutor/turn/README.md` (SSE + inline tag grammar) |
| D session screen | `worktree-agent-a6404175120e94c7a` | `app/(learner)/session/[id]/**`, `components/tutor/{session,avatar,board,presence,dock}`, `lib/tutor/voice/**`, `lib/tutor/presence/**`, `app/(learner)/api/tutor/{tts,asr,attention}`, possible KAIZEN patches to `lib/action/engine.ts` (skip sleeps, honour AbortSignal) and `next.config.ts` (VAD assets) |
| E billing/guards | `worktree-agent-aed6ab59cc8674239` | `lib/tutor/billing/{stripe,checkout,webhook,status}.ts`, `app/(parent)/api/parent/billing/{route,webhook/route}.ts`, `lib/tutor/guards/**`, `lib/tutor/analytics/**` (+ `components/tutor/analytics`), `lib/tutor/errors/**` (+ `components/tutor/errors`, `app/(learner)/api/tutor/error-report`), `app/(learner)/api/tutor/flag`, `scripts/tutor-settings.mjs`, `docs/OPS-RUNBOOK.md`, additive `stripe_events` table, README env rows |
| F item bank | `worktree-agent-ad3ae6286888e074f` (branched from `main` `8a6e46e`, merges fine: its files are new) | `eval/item-bank/**`, `lib/tutor/content/item-bank.json` + README, `docs/ITEM-BANK-REVIEW.md`, `tests/tutor/item-bank.test.ts`, `docs/metrics/item-bank-*.json`, `.gitignore` cache line |

Frozen for builders (lead-owned): `package.json`, `pnpm-lock.yaml`, `kaizen.config.ts`, `middleware.ts`, `next.config.ts` (D excepted), `lib/tutor/contracts.ts`, `lib/tutor/wire.ts`, `lib/tutor/db/{client,index}.ts`, `lib/tutor/auth/*`, `lib/tutor/cost/*`, `lib/tutor/settings.ts`, `lib/tutor/billing/{entitlement,index}.ts`, `.env`, `.env.local`, `CLAUDE.md`, `docs/SPEC.md`, `docs/DECISIONS.md`, `.github/*`, `compliance/*`.

Every builder was told: symlink `node_modules` from the main checkout (never `pnpm install`), implement `lib/tutor/wire.ts` exactly, import `requirePrincipal` from `@/lib/tutor/auth/principal` in every product route (the invariant test scans for that import string), never print or commit `.env.local`, verify with prettier + eslint + `npx tsc --noEmit` + `npx vitest run tests/tutor tests/invariants`, commit small present-tense commits with the two trailer lines, never push, and end with a ≤ 60-line report (branch, commits, files, what works, deferred, numbers, frozen-file changes needed, integration notes).

## 3. Integration result (task #13, done)

All six worktree branches were merged into `claude/build-prompt-spec-6qeqcn` at commit `44433bb` and pushed. **181 files, about 19,900 lines of product code.** Two merge conflicts were resolved by keeping both sides: `lib/server/api-response.ts` (both product error-code sets) and `lib/tutor/db/schema.ts` (both new tables `parent_settings` and `stripe_events`, both added to `TUTOR_TABLES`). Two type errors introduced by the merge were fixed in `lib/tutor/voice/`: `turn-controller.ts` imported `VAD_SAMPLE_RATE` from `./wav` instead of `./vad`, and `audio-context.ts` needed `AudioContext` declared on the widened `Window` type.

**Verification of the merged tree, all run:** `npx tsc --noEmit` clean (0 errors); `npx vitest run tests` = 7,402 passed, 1 expected fail, 2 failed; both failures (`tests/media/stage-realm-presence.test.ts`, `tests/workbench/workspace-rail-session-rename.test.ts`) are upstream CPU-contention flakes and **pass when rerun alone** (11/11 in 4.9 s); `npx vitest run tests/invariants tests/tutor` = 86 passed, 1 expected fail, 13 files; `npx prettier . --check` clean; `npx eslint` = 0 errors, 19 pre-existing upstream warnings.

**Why the builders stopped:** four of the six (A shell, B accounts, E billing, F item bank) were terminated mid-task by the account's Fable rate limit (HTTP 429), not by an error in their work. C (tutor loop) and D (voice) completed their checkpoints normally. Everything each builder had on disk was committed by the lead before merging, so no work was lost, but the unfinished halves are **unverified beyond the type and lint checks above**: no builder-authored route tests exist for the product routes, and the pieces listed as missing below were never written.

### What landed (verified compiling and linting; behaviour largely untested)

- **Auth and accounts (B, mostly complete):** all six auth routes (`sign-up`, `sign-in`, `sign-out`, `me`, `learner`, `teen-sign-in`) and six parent routes (`learners`, `report`, `transcripts`, `consent`, `settings`, `data`), plus `lib/tutor/accounts/**` and `lib/tutor/report/**`. Missing: the route-level cross-tenant test suite, the `owner-bound-document-store` read-path patch (so the documented `it.fails` hole is still open), and `runDeletionJob` wiring.
- **Tutor loop (C, about 60 %):** `lib/tutor/{graph,prompts,safety,model,session,checks}` complete, including 17 prompt files that pass the prompt linter, the student model with the confirmed tier, the state machine with the adaptive diagnostic, grading, and the metered `callLLM` wrapper. **Missing entirely: the `turn/` streaming engine, `wrap/`, `coursework/`, `extract/`, `progress/`, all seven tutor route files, the `LLM_STAGES` patch, and the three evals.** No tutor route is reachable yet.
- **Voice (D, client half complete):** `lib/tutor/voice/**` (splitter, SSE client, Web Audio playback queue, TTS/ASR clients, recorder, dual-engine VAD, turn controller) with 17 green unit tests. Missing: the session screen itself, board reducer, avatar, presence rules, and the `tts`/`asr`/`attention`/`vad` routes.
- **Billing, guards, analytics (E, partial):** `lib/tutor/billing/{stripe,checkout,webhook,status}.ts`, both billing routes including the signature-verified webhook, `lib/tutor/{guards,analytics,errors}`, the flag and error-report routes, `components/tutor/{analytics,errors}`. Missing: its tests, the ops runbook, the settings script, README env rows.
- **Shell (A, early):** `components/tutor/{brand,shell,ui,marketing}`, `lib/tutor/client/**`, and the pages `/welcome`, `/sign-in`, `/sign-up`, `/legal/{terms,privacy,ai}`. **Missing: `/learn` and the entire `/parent` dashboard**, the two route-group layouts, and error/loading states.
- **Item bank (F, pipeline only):** `eval/item-bank/**` (2,600 lines, 14 green parse tests). **The pipeline was never run**, so `lib/tutor/content/item-bank.json` does not exist and there are zero items. Two provider blockers found: the Anthropic key has no credit balance, and `gemini-3.1-pro-preview` is quota-exceeded; the runner falls back to `google:gemini-3.6-flash` for generation with `gemini-3.5-flash` as the independent solver.

### Build verification of the merged tree

`pnpm build` succeeds (exit 0, "Compiled successfully in 4.4min") with every product route in the manifest: the six auth routes, the eight parent routes, the flag and error-report routes, and the pages `/welcome`, `/sign-in`, `/sign-up`, `/legal/{terms,privacy,ai}`. `node scripts/audit-client-bundle.mjs` scanned 1,759 client files for 8 canary secret values and reported clean, so invariant (e) holds on the merged tree. Vercel built the same commits green (about 3.5 minutes each). The build prints Edge-runtime warnings for `instrumentation.ts`; they are pre-existing (the file's `process.once` handlers predate this work) and harmless because the whole body is behind a `NEXT_RUNTIME !== 'nodejs'` early return that the static analyzer cannot see.

### Next session, in order

1. **Builder C's `turn/` engine and the seven tutor routes** are the critical path: without them no session can start and the voice client has nothing to talk to. C's `lib/tutor/turn/README.md` was never written, so the grammar lives in `lib/tutor/prompts/whiteboard.md` and in D's parser assumptions (§4 below).
2. Builder A's `/learn` and `/parent` dashboards, which the owner explicitly asked for ("plans include a dashboard to see and manage your coursework").
3. Builder D's session screen, avatar, presence, and the three media routes.
4. Run Builder F's pipeline once a funded Anthropic key or a working Gemini generator exists.
5. Tests for everything merged unverified, then the PR to `main`.

**Known drift to reconcile:** D's SSE client accepts `text_delta` payloads under `text` with aliases `content`/`delta`, tolerates unknown frame types, retries once with the same `clientTurnId`, and treats an empty-text voice turn as both the GREET request and the silence check-in. C planned the frame order `phase, text_delta…, sentence, action, check, reaction, usage, done|error` and the inline tags `[[wb {json}]]`, `[[check {json}]]`, `[[hint]]`, `[[reaction smile|not_quite]]` on a 1000 × 562.5 sheet. These agree on paper but have never been run against each other.

**Frozen-file changes the builders asked for:** `next.config.ts` must add `lib/tutor/prompts/**/*.md` to `outputFileTracingIncludes` (prompts are read from the filesystem at runtime) and the VAD assets under `public/`; `kaizen.config.ts` should gain a per-learner daily cap constant; `lib/tutor/cost/ledger.ts` rounds cents to integers, so cheap Gemini calls under-count and C rounds up before recording.

## 4. Contracts a successor must not break

- `lib/tutor/contracts.ts`: types, `TurnEvent` union, route constants `AUTH_API`, `TUTOR_API`, `PARENT_API`, `PRODUCT_ROUTES`. `lib/tutor/wire.ts`: request/response body of every route (success = `{ success: true, ...payload }` via `apiSuccess`; failure = `{ success: false, errorCode, error }`; the turn route streams `text/event-stream`, `data: <TurnEvent JSON>\n\n`).
- Identity: `requirePrincipal(request, { learner?, role? })` → 404 (TUTOR_MODE off) / 503 (no DATABASE_URL) / 401 / 403; never a client-supplied account or learner id.
- Database: `getTutorDb()`; schema in `lib/tutor/db/schema.ts` provisioned on first use; `evidence_events` is append-only by trigger; `app_settings` gates are fail-closed (`getAppSetting`); tests use `testDb()` (PGlite) from `tests/tutor/_db.ts`.
- Cost: `recordUsageLine`, `SessionBudget`, `DailyCap`, `llmCost/ttsCost/asrCost`, `TUTOR_LLM_SOURCES` (`tutor-live-turn`, `tutor-diagnose`, `tutor-grade`, `tutor-summary`, `tutor-model-update`, `tutor-problem-extract`); LLM calls only via `callLLM`/`streamLLM` with `resolveModel({ stage })`.
- Entitlement: `getEntitlement`, `addUsedMinutes` (trial 30 min no card; paid = pooled 480 min per month; warn at 80 %).
- Middleware: product prefixes 404 unless `TUTOR_MODE` (or the build-inlined `NEXT_PUBLIC_TUTOR_MODE`); `/` rewrites to `/welcome`; `x-api-key`, `x-base-url`, `x-provider-type`, `x-model` are stripped under the product; `/api/parent/billing/webhook` bypasses the `ACCESS_CODE` gate.

## 5. Vercel and runtime facts

- Team `saitokiku's projects` `team_CvJDSmAdrN30O0qrB3UGfsKu`; project `kaizenedu` `prj_DcEf9srl2gr6THuCONEOhHqKXCpH`, linked to `saitokiku/KaizenEdu`; Node 24.x; domains `kaizenedu.net`, `www.kaizenedu.net` (production = `main`), `kaizenedu-git-main-…`, previews `kaizenedu-git-<branch>-saitokikus-projects.vercel.app`.
- Deployment protection: SSO for everything except custom domains. A seat cannot open preview URLs (share links bounce through `vercel.com/sso-api`); build logs are readable via the Vercel MCP `get_deployment_build_logs`; runtime checks happen on production after a merge.
- Runtime env (D21): `www.kaizenedu.net/api/server-providers` returned an empty provider map, so repo dotfiles are invisible to functions. `.env` (non-secret) is now traced and loaded at startup; provider keys must be pasted into the Vercel project env (Production and Preview) by Manny, or he adds `'.env.local'` to `outputFileTracingIncludes` himself (the sandbox classifier blocks a seat from committing that line).
- No `DATABASE_URL` exists anywhere yet (Neon claimable and the Vercel marketplace are unreachable from this sandbox). Until Manny creates a Neon project and sets the variable, every product page renders the "database not configured" state (D19).
- The Vercel MCP has no environment-variable tool; `gh` is absent (use the GitHub MCP tools).

## 6. Environment gotchas (this sandbox)

- Egress proxy: `api.anthropic.com` and `generativelanguage.googleapis.com` reachable; `api.openai.com`, ElevenLabs, `*.vercel.app`, `vercel.com`, `claimable.neon.tech`, Stripe, PostHog, Sentry, most doc sites blocked (403 or connection reset). Never disable TLS or unset `HTTPS_PROXY`.
- Safety classifier blocks: any git command that (re)commits `.env.local` or ships it into deploy artifacts; `git revert`/`git add -f` on that file. Do not reword around it; split the commit and record the choice.
- `pkill -f "next start"` kills the shell itself; use `pgrep -f '^next-server'`. `pnpm add` needs `-w` at the workspace root. `node_modules` is 2.8 GB: worktrees symlink it. `.next` per worktree.
- Vitest: `tests/**/*.test.ts` only (no tsx, no DOM). `TEST_LOAD_LOCAL_ENV=1` loads `.env.local` for a test. Eval runners: `node --env-file=.env.local --import tsx eval/<name>/runner.ts`.
- Dev server for the harness: `pnpm dev -p 3000`; the upstream chat route works with Gemini (`DEFAULT_MODEL=google:gemini-3.5-flash` in `.env`).

## 7. Manny's open items (say them in every final report)

1. `DATABASE_URL`: create a Neon project (or run `neon claim create` from his machine) and set it in Vercel + `.env.local`.
2. Provider keys into the Vercel project env (Production + Preview), ideally while rotating them.
3. Product name (D13; candidates in `docs/DECISIONS.md`); `kaizenedu.net` carries "Kaizen".
4. Full spike rows from his machine (`pnpm latency --product` against a server with keys; OpenAI/ElevenLabs are blocked here).
5. Counsel for `compliance/` (human-only), the under-13 gate, and vendor terms.
6. Cloudflare tracing only if hosting moves to Workers (D20).
7. Human review of the generated item bank (`docs/ITEM-BANK-REVIEW.md` once Builder F lands).
8. Whether to preserve unfinished builder branches on origin (`wip/builder-*`), which the seat may not push without permission.

## 8. Task list at the pause

#12 builders dispatched (done); #13 integrate (pending, next); #14 preview verification + PR (pending); #16 latency row (in progress: upstream LLM-only sample recorded; product-path row needs a database).
