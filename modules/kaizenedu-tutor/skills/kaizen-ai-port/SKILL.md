---
name: kaizen-ai-port
description: The rules for carrying code over from the old Kaizen-AI repository (the Austin club) into KaizenEdu (the SaaS that ships) — the file map, what is already built and must not be rebuilt, what was dropped for good, the JavaScript-to-strict-TypeScript and supabase-js-to-pg translation rules, the item-schema converter, and the gotchas that cost Kaizen-AI a review round each. Load it before you read any file under /home/user/kaizen-ai, before any PR whose description says "port", and when a reference row names a Kaizen-AI source file.
---

# Porting from Kaizen-AI

Contract: `docs/MVP-REFERENCE.md` §5 (the funnel ports), §7 (order, and the dropped list), §4 (the record, back list). Map: `docs/KAIZEN-AI-INTEGRATION-PLAN.md` §3 (file by file) and §5 (gotchas). The plan's phasing and its human-loop section are withdrawn; the reference says why.

Two repositories. **KaizenEdu** (this one, working name Natural Tutor) is the SaaS and the only thing that ships. **Kaizen-AI** (`/home/user/kaizen-ai`, `saitokiku/Kaizen-AI`) is the old repository: an after-school club with human tutors, seats, cohorts, a marketplace and video rooms. It is a source archive. Read from it, carry things over, never build it, never make KaizenEdu import from it, never copy a file without translating it.

## Before every port row

1. **Look for it in KaizenEdu first.** The reference's port list says what to carry over, not what is missing. If the job exists in whole or in part, extend it in place. When the existing code is as good or better, drop the row and say so in the PR.
2. **Land inside the module that already owns the job**, never as a parallel module beside it: email under `lib/tutor/email/`, grading in `lib/tutor/checks/grading.ts`, the report lead in `lib/tutor/report/`, safety paging beside `lib/tutor/safety/`, the sitting clock in `lib/tutor/session/`, items in `lib/tutor/content/item-bank.json` through `lib/tutor/graph/items.ts`.
3. **Nothing shipped is deleted to make room.** No passing test, invariant, skill or document is removed for a port. Additive first; a removal needs its own reason in the PR.
4. Read the source file end to end, including its comments: Kaizen-AI's comments record the bug each line fixed. Keep the fix, drop the club.
5. PR under about 400 lines, titled with the step and the item, first section a plan of ten lines or fewer.

## Already built — extend, never rebuild

| Job | Where in KaizenEdu |
| --- | --- |
| Turn engine, session state machine, adaptive diagnostic | `lib/tutor/turn`, `lib/tutor/session` |
| Voice loop (VAD, streaming TTS, barge-in, playback queue) | `lib/tutor/voice` |
| Presence (abstract form, Rive seam behind a flag) | `lib/tutor/presence`, `components/tutor/avatar` |
| Accounts, email + password sign-in, teen sign-in, the sign-up age check | `lib/tutor/accounts`, `lib/tutor/auth` |
| Billing behind `billing_enabled` (Checkout, Portal, signed webhook) | `lib/tutor/billing` |
| Student model on `evidence_events` (EMA, `mastered`, `confirmed`, tags) | `lib/tutor/model`, `lib/tutor/db` |
| Local grading: choice, numeric with tolerance, fraction and percent parsing, short by accept list | `lib/tutor/checks/grading.ts` |
| Coursework from typed text, a photo, a picked skill | `lib/tutor/coursework`, `lib/tutor/extract` |
| Progress view and the parent report with `GENERATED_LABEL` | `lib/tutor/progress`, `lib/tutor/report` |
| Safety pattern screen (crisis, disallowed, off-topic) | `lib/tutor/safety` |
| Cost guards: session ceiling, daily cap, rate limits, staff allowlist | `lib/tutor/cost`, `lib/tutor/guards`, `kaizen.config.ts` |
| Item bank loader and validator (review gate) | `lib/tutor/graph/items.ts`, `tests/tutor/item-bank.test.ts` |
| Health and doctor | `app/(learner)/api/tutor/health`, `scripts/doctor.mjs` |

## The funnel ports (reference §5)

| Port | Kaizen-AI source | Lands in | Carry over |
| --- | --- | --- | --- |
| Email wrapper | `web/lib/server/email.js` | `lib/tutor/email/send.ts` | `esc`, `essential` vs `promotional`, opt-out suppression, `List-Unsubscribe` headers, domain-only logging, explicit not-configured result, 15 s timeout |
| Password reset, parent invitation | token pattern in `web/lib/server/context.js` (`guardian_consent_token`, `?t=` link) | `lib/tutor/accounts/` + `lib/tutor/auth/` | The shape only; our tokens are hashed at rest, single use, expiring — `parent-comms` skill |
| Weekly parent email | `web/lib/server/familySummary.js` (`masteryLead`, `notTracked`), `parentSummary.js` (idempotent, skipped when empty, promotional kind) | `lib/tutor/report/lead.ts`, `lib/tutor/email/weekly.ts`, `email_log`, the Monday cron (done) | The lead is confirmed-only; "moved this week" is a `mastery_change` to confirmed inside the window that still holds; nothing sent when nothing happened; the opt-out link needs no sign-in |
| Verified items | `supabase/seed_kc.sql` | `lib/tutor/content/item-bank.json` (done: `F*-ka-*`) | 22 of its 32 items are in the fractions slice — F3 ×3, F4 ×5, F5 ×3 (its "simplify" items are our F5), F8 ×4, F9 ×3 (one near-duplicate dropped), F12 ×4. The other 9 (one-step, two-step, distributive) are R22. Take the corrected MC order at the bottom of the file, not the original index-0 rows |
| Grading answer types | `web/lib/engine/verify/symbolic.js`, `web/lib/mathExpr.js` | `gradeLocally` in `lib/tutor/checks/grading.ts` | Symbolic with implicit multiplication and sample-point equivalence, `order`, `cloze`, short by required keywords, named wrong values with feedback. Keep our choice, numeric and accept-list paths |
| Claims scanner | `web/test/claims.test.mjs`, `legalMarkers.test.mjs`, `priceTruth.test.mjs` | `tests/invariants/claims.test.ts` | `claims-discipline` skill |
| Safety paging and runbook | `web/lib/server/moderation.js` (`screenAndRecord`), `docs/legal/SAFETY_RUNBOOK.md` | `lib/tutor/safety/paging.ts`, `docs/SAFETY-RUNBOOK.md` (done) | Recording exists (`flags`); the paging on critical and on an unsafe report, the account holder's notice, and the response times are ported. The pattern lists and the safety prompts do not change without asking |
| Sitting clock | `web/lib/prompts.js` `sittingClock`, `MINOR_BREAK_REMINDER` | `lib/tutor/session/sitting.ts` (pure, done); `sessions.state.sitting`, `lib/tutor/prompts/break.md` | Three hours of continuing interaction across sessions for a known minor, reconstructed from turn times at session creation; the reminder fires once per boundary |
| Support inbox | `web/app/api/support/route.js` | `lib/tutor/support/inbox.ts`, `app/(learner)/api/tutor/support/route.ts`, `/support` (done) | Rate-limited, honest `delivered` flag, mails `SUPPORT_EMAIL` with the visitor as reply-to, stores the row. Not a tutor handoff |
| Metrics script | `web/app/api/admin/funnel/route.js` (`buildBoard`) | `scripts/metrics-report.ts` → `docs/metrics/YYYY-WW.md` | Denominators in words, zero states designed, missing tables reported as not provisioned |
| Prompt caching check | `web/lib/server/aiCall.js` (`cache_control`) | `lib/tutor/turn/llm-call.ts` | Verify first whether the AI SDK path caches the system prefix; port only if it does not |

## Dropped, permanently

Human tutor handoff and briefs, the observation route and the `tutor` role, seats, cohorts, rooms, the marketplace, video rooms, tutor payouts, the club consoles and the Program Director, the localStorage working copy and its sync (`lib/appState.js`, `lib/cloud.js`), the planner UI (`TodayView`, `CalendarView`, `GradesView`), booking and billing mail, `pullTutorFromMarket`. If a source file's job is one of these, stop reading it.

## Translation rules

**JavaScript to strict TypeScript.** No `any`. Type every input and output from `lib/tutor/contracts.ts` once and let `npx tsc --noEmit` list the call sites. Plain shapes in, plain shapes out; pure functions stay pure and get a unit test in `tests/tutor/`.

**supabase-js to `pg`.** Kaizen-AI checks `{ data, error }` on every call because supabase-js resolves instead of rejecting. KaizenEdu's `db.query<Row>(sql, params)` (`lib/tutor/db/client.ts`, `Queryable`) **throws**, returns `{ rows }`, and takes `$1` placeholders. Keep that: a dropped `error` check turns a failed read into a confident zero, which is the bug Kaizen-AI's `family/summary` route documents. `getTutorDb()` in routes; a `Queryable` parameter in library code; `testDb()` from `tests/tutor/_db.ts` (PGlite) in tests. Every learner-scoped row carries `account_id`; identity comes from `requirePrincipal`, never from the request body.

**Schema.** Additive statements in `lib/tutor/db/schema.ts` only; `evidence_events` stays append-only; ask before dropping a column.

**Environment.** Server-side only. A new variable is added to `scripts/doctor.mjs`, to `tutorConfigStatus` in `lib/tutor/config-status.ts` (so `/api/tutor/health` reports it without printing it), to the README environment table and to `docs/DO-THIS-NEXT.md` with the day it unblocks. Never to `.env.local`, never printed.

**Dependencies.** Kaizen-AI's `email.js` calls Resend with `fetch`; do the same. A new package needs a one-line justification in the PR; prefer what the repo has.

**Logging.** Ids and domains, never a name, an address, a transcript or a token. `to=@example.com` is the most a log line may say about a recipient.

**Model calls.** Only through `callLLM` / `streamLLM` with a `TUTOR_LLM_SOURCES` stage, a `MODEL_ROUTES` entry in the tracked `.env`, and the model role from `tutorModelDefault`. Nothing on the speech path uses the reasoning model.

**HTML in email.** Every user-controlled value passes through `esc` before it lands in a body. Styles inline; no Tailwind in mail.

**Cron.** A route under `app/(learner)/api/tutor/cron/` checked against `CRON_SECRET`, idempotent through a ledger row, batch-limited, safe to fire hourly.

## The item converter (`kc_item` → `check_items`)

Kaizen-AI kinds `mc`, `numeric`, `symbolic`, `short`, `order`, `cloze` with an `answer_spec`; KaizenEdu types `single`, `multiple`, `numeric`, `short` with `options` and `answer` (`lib/tutor/graph/items.ts`, `RawItem`). Rules when converting the seed:

- `mc` → `single`; `numeric` → `numeric` with `answer.value`, `accept` from `acceptedForms`, `misconceptionValues` become tagged distractor text in `rationale` until the grading port lands.
- `context_tag` is kept on every item (bare-computation, word-problem, compare, generate, simplify …); the two-contexts gate needs it and a null tag manufactures fake diversity.
- `source: "kaizen-ai/seed_kc.sql (hand-verified)"`; `band` from the stem; `representation` from the stem (`symbolic`, `word`, `bar`, `number_line`, `set`).
- **Never set `reviewed_by` or `reviewed_at`.** Kaizen-AI's `verified_by: seed:hand-verified` is their record, not ours; a person stamps items here, and `tests/tutor/item-bank.test.ts` fails if anything in the repository does.
- Check for duplicates against the 96 authored items by stem before adding.

## Gotchas that each cost Kaizen-AI a round (plan §5)

- Store the evidence weight at write time; recomputing on read squares the assisted discount.
- `context_tag NOT NULL` on new items.
- One live check attempt per concept (partial unique index); issuing resumes rather than mints.
- Never read `independentBlock` — or anything that decides "assisted" — from the request.
- `check_floor_at` is a floor, not a value; a recompute honours it as a lower bound.
- The k-of-n gate ignores failures; when it lands, passes must span distinct days (Manny's decision).
- Generated prose and confirmed numbers live in separate fields on every wire shape.
- A cached estimate is a cache; "moved this week" compares like with like.
- Placement evidence is assisted by construction.
- Prompt caching: check before porting.

## Verify before the PR

`npx tsc --noEmit` · `pnpm lint` · `pnpm check` · `npx vitest run tests/tutor tests/invariants` · `pnpm test:invariants` · `node .claude/skills/design-system/scripts/check-copy.mjs` when copy changed · `pnpm latency` when the turn path changed. The PR body names the Kaizen-AI source file for every ported function and the KaizenEdu function it extended.
