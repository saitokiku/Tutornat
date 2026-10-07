# kaizen-ai (parked source)

Source: `saitokiku/Kaizen-AI` (local `/Users/man/Documents/GitHub/Kaizen-AI`) at commit
`91af9e452c7df5867afa7249a6dc58b00003f531` (last commit 2026-09-03). Copied on 2026-10-07.
Not imported or built by `apps/web`.

Kaizen-AI is a Next.js 16 / React 19 JavaScript app on Supabase. It is the student study
dashboard the owner likes best, with the "magic box" intake that turns a pasted syllabus, a
brain dump or a pile of files into courses and tasks. It also contains an in-person club,
billing and a tutor marketplace, which are out of scope.

`ORIGINAL_README.md` and `ORIGINAL_CLAUDE.md` are the repo's own README and CLAUDE.md. The
CLAUDE.md was renamed so it is not auto-loaded as instructions. `LICENSE` is the original
proprietary licence (Kaizen Academy LLC). Not copied: `legacy/` (archived backend), the
untracked root `.mp4`, and `test-results/`.

## What is inside

| Path | Purpose |
|---|---|
| `web/app/dashboard/page.js` | Dashboard shell (client component). It gates on loading → `LoginPage` → `VerifyEmailGate` → `SetupFlow`, then shows tabs Today / Plan / Learn / Grades / Growth with overlays (`StudySession`, `IntakeBox`, `PracticeModal`, `ChecksDueCard`). Data comes from a Supabase session, `lib/cloud` `pullState`, localStorage, and `/api/engine/state` |
| `web/app/globals.css`, `web/tailwind.config.js` | Design tokens: RGB-triplet `--c-*` variables (`paper`, `panel`, `ink`, `muted`, `accent` rose, `good`/`warn`/`bad`; dark set for `/ai`), Schibsted Grotesk / Instrument Sans / IBM Plex Mono via `next/font`, one type scale (`d1–d3`, `t1–t3`, `body`, `sm`, `xs`, `micro`), radii, shadows, animations |
| `web/components/ui/*` | Primitives: `AppHeader`, `AppFooter`, `Button`, `Card`, `EmptyState`, `Eyebrow`, `Field`, `HeldState`, `MasteryLine`, `Notice`, `Section`, `Stars`, `Stat` (`RoomCard`, `KindBadge`, `VenueLine` are club-specific) |
| `web/components/IntakeBox.js` | The magic box: a single input for syllabus, brain dump, single task or many files. Text goes to `/api/intake` first so courses exist; files go through `runIntakeBatch` |
| `web/lib/intake.js` | Pure `applyIntake({app, concepts, patch})` merge of the intake patch into state; `COURSE_COLORS`, `uid` |
| `web/lib/intakeBatch.js` | Client batch upload to the Supabase `documents` bucket, then `/api/intake/ingest` per file with a concurrency pool; `BATCH_CAPS` (30 files / 150 MB / 25 MB) |
| `web/lib/server/intakeCore.js`, `web/app/api/intake/` | Server side of intake (model call with `INTAKE_PROMPT`, ingest) |
| `web/lib/grades.js` | Pure gradebook: `letterFor`, `categoryBreakdown`, `courseGrade`, `projectGrade` (what-if), `neededInCategory`, `targetPercentForLetter`, `gpa` |
| `web/lib/mathExpr.js` | Safe expression compiler `compileExpr` (no `eval`), used by `components/md/FunctionGraph` |
| `web/lib/engine/**` | Learning engine: `elo`, `pfa`, `hlr` (half-life regression), `scheduler`, `placement`, `calibration`, `policy`, `hints`, `budget`, `session`, `check` + `ledger` (server), `verify/symbolic` |
| `web/lib/prompts.js` | `buildSocraticPrompt`, `buildCuriousPrompt`, `STUDENT_SAFETY`, minor-disclosure and break helpers, `GRADING_SYSTEM_PROMPT`, `PRACTICE_SYSTEM`, `INTAKE_PROMPT`, `SYLLABUS_PARSE_PROMPT` |
| `web/components/LoginPage.js` | Supabase email/password sign-in and sign-up; shows `HeldState` when Supabase is not configured |
| Other core components | `TodayView`, `CalendarView`, `GradesView`, `ProgressView`, `StudySession`, `StudyView`, `PracticeSession`, `PracticeModal`, `CheckFlow`, `MasteryDial`, `Rings`, `SetupFlow`, `TaskModal`, `MessageBody`, `md/*` (code, function graph, mermaid) |
| Other core lib | `appState`, `cloud` (Supabase sync), `courses`, `mastery` (SM-2), `store`, `files`, `limits`, `supabaseClient`, `useVoiceChat`, `server/{aiCall,context,models,moderation,ratelimit,safeFetch,parentSummary,familySummary}` |
| `web/test/` (60 files), `web/e2e/` | `node:test` unit tests; Playwright `smoke` and `memberJourney` specs |
| `supabase/migrations/` (0001–0038), `seed.sql`, `seed_kc.sql`, `seed_kc_algebra1.sql`, `GO_LIVE.sql` | Schema. Core tables: `profiles`, `courses`, `homework_items`, `documents`, `document_chunks`, `concepts`, `student_concept_mastery`, `kc*`, `evidence`, `check_attempt`, `learning_session`, `plan_entitlements`, `usage_ledger`, `parent_student_relationships`, `safety_events`. Seeds hold a verified knowledge-component bank and a draft algebra-1 bank. There is no `config.toml` |
| `evals/tutor/` | Tutor rubric (0–2 per dimension, pass ≥ 9/12) + 10 sample cases |
| `demo-materials/` | Demo script, paste-ready intake blocks, full Algebra 2 and AP Biology sample courses |
| `docs/` | `README.md` (index and precedence), `ARCHITECTURE`, `API`, `ENGINE`, `ENVIRONMENT`, `DEPLOYMENT`, `SECURITY`, `SAFETY`, `TEST_PLAN`, `AI_EVALS`, `STRATEGY`, `CLAIMS_MATRIX`, `UNIT_ECONOMICS`, `legal/`, `compliance/`, `reviews/`, `archive/` (superseded; do not cite) |

Out of scope (present but not for reuse):

- Routes: `/` (club front door), `schedule`, `tutoring`, `family`, `billing`, `pricing`, `diagnostic`, `tutors/*`, `tutor`, `admin/*`.
- API routes: `billing/*`, `club/*`, `tutoring/*`, `diagnostic`, `admin/*`.
- `lib/server/{billing,clubBilling,clubPricing,cohorts,daily,stripe,trial,…}`, `lib/{roomKinds,roomTime,exitRatings,weekBuckets}`.
- Club and marketplace components (`BookModal`, `HallBoard`, `Tutor*`, `VideoCall`, …).

## Tests

Use Node 22 or later; `package.json` has no `engines` field. The commands below come from
`web/package.json` and were not run during the copy (they need `npm ci`).

```sh
cd modules/kaizen-ai/web
npm ci
npm test         # node --import ./scripts/test-register.mjs --test "test/*.test.mjs"
npm run lint
npm run typecheck
npm run build && npm run test:e2e   # Playwright; webServer runs `npm run start`
```

Unit tests need no Supabase, keys or network. `scripts/test-loader.mjs` maps `@/` imports.
`test/schemaDrift.test.mjs` and `test/seedBank.test.mjs` read `../supabase/`, so `supabase/`
must stay next to `web/`.

Env var names come from `web/.env.example`. Required: `ANTHROPIC_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`OPENAI_API_KEY` (voice), `CRON_SECRET`, `APP_URL`. The template also lists optional model,
Resend, Daily, Stripe, Upstash, Gemini image, PostHog and Sentry vars.

## Known issues

- `lib/cloud.js` sync has no conflict guard (last write wins), so a stale device can
  overwrite newer data (`ORIGINAL_CLAUDE.md`).
- Club, billing and marketplace code is present but out of scope. Selling is fail-closed
  behind `app_settings` flags pending legal review.
- `ORIGINAL_README.md` and `ORIGINAL_CLAUDE.md` refer to `legacy/`, which is not here, and to a
  live deployment. Their status claims date from 2026-09.
- Some comments are stale. For example, `lib/appState.js` still says localStorage "for the
  demo" although cloud sync exists.
- `web/next-env.d.ts` is ignored by the repo root `.gitignore`. Next regenerates it.
  `web/.gitignore` now re-includes `.env.example`, which holds names and placeholders only.

## Reuse plan

- Design: take the tokens in `app/globals.css` and `tailwind.config.js`, plus
  `components/ui/*` (minus club badges), as the visual baseline for `apps/web`.
- Design: the dashboard shell in `app/dashboard/page.js` (tab layout and gating order) and
  `LoginPage` are the layout to reproduce.
  `modules/prototypes/kaizen-ai-reference` renders the shell from fixtures.
- Backend: `IntakeBox` + `lib/intake.js` + `lib/intakeBatch.js` + `lib/server/intakeCore.js`
  form the magic-box intake. The pure merge and batch caps port directly; the storage bucket
  and API need re-pointing.
- Tutor: `lib/prompts.js`, `lib/engine/**` (Elo/PFA/HLR scheduling, placement, symbolic
  verify), `lib/mathExpr.js` and `lib/grades.js` are dependency-light and unit-tested.
- Backend reference: the core `supabase/migrations` tables (courses, homework items, documents,
  concepts, mastery, evidence) show the data the dashboard expects.
