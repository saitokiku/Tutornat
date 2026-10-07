# Testing conventions

Distilled from the upstream suite on 2026-09-04 so new seats do not relearn it. Upstream: 665 test files, 7,317 tests, about 4 minutes.

## Tiers

| Tier | Where | Command | Runs in CI |
| --- | --- | --- | --- |
| Unit and route tests | `tests/**/*.test.ts` | `pnpm test` | `ci.yml` (upstream) |
| Invariants | `tests/invariants/*.test.ts` | `pnpm test:invariants` | `invariants.yml` (ours), plus `pnpm test` |
| Postgres contract | `*.pg.test.ts`, gated on `PG_CONTRACT_URL` | `pnpm test` (self-skips) | `storage-pg-contract.yml` |
| Evals (cost tokens) | `eval/<name>/runner.ts` | `pnpm eval:<name>` | never; run by hand and paste results in the PR |
| Deterministic eval scorers | `tests/**/*.eval.test.ts` | `vitest run -c vitest.eval.config.ts` | opt-in |
| E2E | `e2e/tests/*.spec.ts` | `pnpm test:e2e` | `ci.yml` e2e job |
| Latency | `scripts/latency-harness.ts` | `pnpm latency` | never; needs keys |

## Rules that bite

- `tests/setup-env.ts` does not load `.env.local`. Stub env with `vi.stubEnv` and clean with `vi.unstubAllEnvs()`.
- Route handlers are tested by importing the route dynamically after `vi.resetModules()` and calling the exported `GET`/`POST` with a `Request` (see `tests/invariants/_helpers.ts` `buildRequest`). `apiSuccess` spreads its payload: the body is `{ success: true, ...data }`, not `{ data }`.
- Mock the model, never call it: `vi.mock('@/lib/ai/llm')`. ESLint forbids importing `generateText`/`streamText` from `ai` anywhere except `lib/ai/llm.ts`, `eval/**`, and `tests/**`; `lib/tutor/**` and `scripts/**` are covered by the guard.
- Postgres tests use PGlite through the `PGlitePool` shape in `tests/invariants/_helpers.ts`; provision tables with `getServerPersistenceProvider(url, () => pool as never)`.
- Source-scanning invariants must first prove the scanned thing still exists (`tests/security/iframe-sandbox.test.ts` pattern), otherwise a rename turns the test vacuous.
- Prettier (`pnpm check`) and ESLint (`pnpm lint`) cover `tests/`, `scripts/`, and `eval/`; `*.md` and `*.yml` are prettier-ignored. `npx tsc --noEmit` typechecks `tests/` and `scripts/` but not `e2e/`.
- `scripts/check-i18n-keys.mjs` fails CI when a key exists in `en-US.json` and not in the other 11 locales. Product UI is English only; do not add keys to `en-US.json` until infra-03 reduces the locale set.
- `tests/workflows/ci-video-export-contract.test.ts` pins the exact steps of upstream's `ci.yml`. Do not edit that workflow; ours is `.github/workflows/invariants.yml`, pinned by `tests/invariants/workflow-contract.test.ts`.
- Running the whole suite with another heavy process on 4 cores makes 5-second-timeout tests flake (`tests/media/stage-realm-presence.test.ts` did so here and passed alone). Run a failing file alone before calling it a regression.

## Adding an eval

Copy the shape of `eval/orchestration/runner.ts`: `types.ts` importing production types, `scenarios/*.json` with a `case_id` per case, a deterministic `judge.ts` where possible (LLM judge only for open-ended text, with the rubric in a `.md` next to the runner), `reporter.ts` using `eval/shared/markdown-report.ts`, and a runner with a docblock stating required env, usage, output, and exit code. Keep runs cheap with `EVAL_SAMPLES`, `EVAL_SCENARIO`, a first-N cap, a `JUDGE=false` mode, and `--rescore <dir>`. Unit-test the pure parts under `tests/eval/<name>/`.
