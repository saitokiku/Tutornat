# kaizenedu-tutor (parked source)

Source: private repo `saitokiku/KaizenEdu` (local `/Users/man/Documents/GitHub/KaizenEdu`) at commit
`c73a0e168686525cc6318ff6a575e3fb1ad65c60` (last commit 2026-09-30). Copied on 2026-10-07.
Not imported or built by `apps/web`.

KaizenEdu is OpenMAIC **1.0.0** (`package.json` name `openmaic`) with the owner's "Natural
Tutor" product layered on top: a voice-first fractions-to-pre-algebra tutor ("Sol") with
learner and parent apps. This folder holds **only the owner-written product code**, at the same
relative paths as in KaizenEdu. The upstream OpenMAIC code is not here, so the code **does not
build or run on its own**.

## What is inside

| Path | Purpose |
|---|---|
| `lib/tutor/turn/` | Turn engine: LLM call, SSE frames, whiteboard action tags, warm-up |
| `lib/tutor/session/`, `wrap/` | Session rows, state machine, coach, sitting clock, topic; session wrap + summary |
| `lib/tutor/model/`, `checks/`, `graph/`, `content/item-bank.json` | Student model (sole writer of mastery/misconceptions); symbolic/math-expression/LLM grading → `check_result` evidence; fractions skill graph + next skill; packaged 118-item bank (unreviewed) |
| `lib/tutor/prompts/` | Per-band, safety, coach, grade and wrap prompt `.md` files + `build.ts` system-prompt assembly |
| `lib/tutor/safety/`, `guards/`, `cost/` | Pattern screen, crisis responses, paging; gates, rate limit, spend alarm; per-session ceiling, daily cap, usage ledger |
| `lib/tutor/voice/`, `presence/` | Client VAD, recorder, ASR/TTS clients, playback queue, sentence splitter; presence ladder (camera sensing is gated off) |
| `lib/tutor/accounts/`, `auth/`, `guest/` | Adult accounts, learners, consents, parent invites, reset, export/deletion; scrypt + sessions; guest mode |
| `lib/tutor/report/`, `progress/`, `email/`, `metrics/` | Parent report, weekly lead, transcripts; learner progress; Resend templates + weekly email; weekly metrics board |
| `lib/tutor/planner/`, `coursework/`, `extract/` | Assignments/tests with due dates; current coursework; homework photo/PDF → problem |
| `lib/tutor/billing/`, `support/`, `errors/`, `preview/` | Stripe checkout/portal/webhook; support inbox; scrubbed error reporting (+Sentry); fixture mode without a DB |
| `lib/tutor/db/` | `pg` pool on `DATABASE_URL` (Neon) and schema; tests inject PGlite |
| `lib/tutor/{contracts,wire,settings,config-status,app-url}.ts` | Route paths + shared types; JSON body contracts; fail-closed `app_settings` gates; env presence for health; public origin |
| `components/tutor/` | `session/` (session screen, dock, transcript, check card, wrap, `use-tutor-session`), `board/` (whiteboard), `avatar/` (Rive/SVG presence), `learn/`, `parent/`, `marketing/` (+`legal/`), `shell/`, `ui/`, `brand/`, `analytics/` (PostHog) |
| `app/(learner)/` | Pages `learn`, `session/[id]`, `welcome`, sign-in/up, password reset, `parent-invite`, `support`, `legal/*`, `eval/avatar`; API `api/tutor/*` (`turn`, `session`, `check`, `wrap`, `asr`, `tts`, `attention`, `coursework`, `planner`, `progress`, `problem-extract`, `guest`, `flag`, `support`, `health`, `auth/*`, `cron/weekly-email`, …) |
| `app/(parent)/` | Pages `parent/{,learners,reports,reports/[learnerId],transcripts,consent,data,billing,settings}`; API `api/parent/*` |
| `kaizen.config.ts` | Server-only product config keyed to `docs/SPEC.md`: per-age-band defaults, cost ceilings, latency budgets, student-model/attention parameters, plans, `TUTOR_MODELS` routing, guest limits, `TUTOR_MODE` route fence. Only `publicConfig` may reach the client |
| `tests/tutor/` (51 files), `tests/invariants/` (11 files) | Vitest suites; `tests/tutor/_db.ts` gives each file a PGlite DB. Invariants include the upstream route fence |
| `eval/` | `red-team` (50 safety prompts), `coach-mode` (15 answer-withholding sequences), `persona` (20 prompts), `item-bank` (generate → solve → validate → package pipeline), `shared/`; see `eval/README.md` |
| `compliance/` | Drafts pending counsel review: privacy policy, terms, AI disclosure, COPPA parent notice, retention, vendor data flow, under-13 launch gate, open questions |
| `docs/` | `SPEC.md` (v1.1), `PLAN`/`REPLAN`, `DECISIONS`, `LOG`, `ARCHITECTURE-MAP` (keep/patch/strip of upstream), `HANDOFF-2026-09-30`, `DO-THIS-NEXT`, `SETUP`, `TESTING`, `CLAIMS`, `CONSOLIDATION`, `SAFETY-RUNBOOK`, `KAIZEN-AI-INTEGRATION-PLAN`, `research/` (9 notes), `metrics/` |
| `skills/` | Copied from `.claude/skills/` (dot removed so it is not auto-loaded): `tutor-loop`, `voice-pipeline`, `pedagogy-fractions` (skill graph, item schema), `minors-privacy`, `presence-layer`, `parent-comms`, `design-system`, `claims-discipline`, `openmaic-internals`, `release-checklist`, `kaizen-ai-port`, `neon`, `neon-postgres` |
| `scripts/` | Owner-added (`git log --diff-filter=A`, authors saitokiku/Claude): `doctor.mjs` (env check, never prints values), `dev-db.mjs` (local PGlite server), `generate-runtime-config.mjs`, `audit-client-bundle.mjs` (scan build for keys), `validate-skills.mjs`, `latency-harness.ts`, `metrics-report.ts`, `tutor-turn-smoke.ts`, `item-bank-review-sheet.mjs`, `screenshot.mjs`, `copy-vad-assets.mjs` |
| `ci/invariants.yml` | Original `.github/workflows/invariants.yml` (inert here) |
| `upstream-patches/` | Every file outside the product dirs that carries a `// KAIZEN:` patch comment, at its original path (24 files; see below) |

`upstream-patches/` contents: `middleware.ts` (`TUTOR_MODE` route fence; strips
client-supplied model/key/base-URL headers), `app/layout.tsx` (skip upstream chrome),
`next.config.ts`, `instrumentation.ts` (bake non-secret runtime config),
`lib/server/{api-response,model-routes,provider-config}.ts` (typed refusals, six tutor LLM
stages, build defaults), `lib/persistence/owner-bound-document-store.ts` (owner-only reads),
`lib/types/action.ts` + `packages/@openmaic/dsl/src/{action,validate}.ts` (`wb_stroke` /
`wb_highlight` verbs), `lib/i18n/types.ts` (English default), `types/heic-convert.d.ts`, test and
CI timeout/cleanup patches, `.gitignore`, `.prettierignore`, the product `README.md`, and
`ORIGINAL_CLAUDE.md` (the repo's `CLAUDE.md` working agreement, renamed so it is not auto-loaded).

## Tests

These tests cannot run from this folder. They import upstream OpenMAIC 1.0.0 internals, mainly
`@/lib/server/api-response`, `@/lib/logger`, `@/lib/utils`, `@/lib/ai/llm`,
`@/lib/ai/providers`, `@/lib/server/{resolve-model,provider-config,model-routes,runtime-config.generated}`,
`@/lib/audio/*`, `@/lib/persistence/*`, `@/middleware` and `@/components/whiteboard/*`. They also
import `@/.claude/skills/pedagogy-fractions/references/skill-graph.json`, which is now
`skills/pedagogy-fractions/references/skill-graph.json`.

To run them, use the original repo (read-only here; use a separate clone):

```sh
git clone https://github.com/saitokiku/KaizenEdu.git kaizenedu && cd kaizenedu && git checkout c73a0e1
pnpm install
pnpm test               # vitest run: tests/tutor + tests/invariants (+ upstream tests)
pnpm test:invariants    # vitest run tests/invariants
pnpm skills:validate
pnpm eval               # red-team + coach-mode + persona (deterministic half; model half needs EVAL_MODEL)
```

The handoff records the last green run on 2026-09-30 as 55 files and 611 tests. It was not
re-run during this copy. Tests are hermetic by default (`tests/setup-env.ts`;
`TEST_LOAD_LOCAL_ENV=1` opts in to local env).

## Known issues and warnings

- Built against **OpenMAIC 1.0.0**, which is older than `modules/openmaic-classroom` (1.1.1).
  The upstream internals listed above and the 24 files in `upstream-patches/` must be re-checked
  against 1.1.1 before porting.
- **Secrets were deliberately not copied.** KaizenEdu tracks `.env` (non-secret defaults) and
  `.env.local`, which holds real provider keys committed to git history. Neither file was
  opened or copied. **The owner should rotate every key that was ever committed to the
  KaizenEdu repo** and purge them from history if the repo is ever shared.
- Not copied: `docs/evidence/` (screenshots and run output, ~10 MB),
  `lib/server/runtime-config.generated.ts` (build output of
  `scripts/generate-runtime-config.mjs`), `skills-lock.json`.
- Status recorded on 2026-09-30 (`docs/HANDOFF-2026-09-30.md`, `docs/DO-THIS-NEXT.md`):
  - Production tutoring stopped on Gemini free-tier limits, and stages were moved to an
    interim OpenAI route.
  - Without `TUTOR_PRICING_JSON`, the cost ledger over-charges and can trip the caps.
  - Gemini terms for users under 18 were unresolved.
  - The whiteboard `[[wb]]` output was unproven live, and its layout is poor.
  - Two safety-pattern misses were awaiting approval.
  - The 118-item bank is unreviewed.
- `compliance/` is all draft and not in force. The `kaizen.config.ts` header says invariants
  live in `lib/tutor/invariants`; they are in `tests/invariants/`.
- Env var names the code reads include `DATABASE_URL`, `TUTOR_MODE`, `MODEL_ROUTES`,
  `TUTOR_BAND_MODEL_ROUTES`, `TUTOR_PRICING_JSON` and provider keys (OpenAI/Anthropic/Google,
  ElevenLabs, Azure ASR). They also include `RESEND_*`, `STRIPE_*`, `POSTHOG_*`, `SENTRY_*`,
  `CRON_SECRET` and `APP_URL`. Run `scripts/doctor.mjs` for the full list. It prints names,
  not values.

## Reuse plan

- Tutor & voice: port `lib/tutor/turn/`, `session/`, `prompts/`, `checks/`, `model/`,
  `safety/` and `voice/` as the tutor core. Replace upstream imports with Tutornat equivalents
  as you go.
- Tutor & voice: `components/tutor/session/` and `board/` are the session UI and whiteboard;
  `use-tutor-session` is the client state hook.
- Backend: `lib/tutor/accounts/`, `auth/`, `guards/`, `cost/` and `db/` show the parent/learner
  account, consent and spend-control shapes. Compare them with `modules/trellis/db` before
  choosing a schema.
- Reference: use `kaizen.config.ts` (age bands, budgets), `compliance/`, `skills/minors-privacy`,
  `skills/pedagogy-fractions` and `docs/SPEC.md` as design inputs.
- Reference: `tests/invariants/` and `eval/` are worth re-targeting at the new app once the
  equivalent code exists.
