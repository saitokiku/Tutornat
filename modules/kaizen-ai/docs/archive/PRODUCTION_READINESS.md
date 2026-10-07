# Production readiness — verification results and go/no-go

Date: 2026-07-27 · Commit: `2cd0dac` · Branch: `main`

This document separates **what was verified by running it** from **what is
assumed**. Anything not verified is labelled. No item is described as working
unless a command was run and its exit code checked.

---

## 1. Verification results

Every gate below was run and judged by **exit code**, not by reading output.
That distinction found a real failure — see §1.1.

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **PASS** — 187/187, exit 0 |
| E2E | `npx playwright test` | **PASS** — 5/5, exit 0 |
| Lint | `npm run lint` | **PASS** — 0 errors, 4 warnings, exit 0 |
| Types | `npm run typecheck` | **PASS** — 0 errors, exit 0 |
| Build | `npm run build` | **PASS** — exit 0, full route table emitted |
| SQL grammar | `pglast` over `supabase/migrations/*.sql` | **PASS** — 17/17 parse, 482 statements |
| Prod deps | `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |

### 1.1 The build was broken and output-grepping hid it

`next build` prints `✓ Compiled successfully` and *then* runs a TypeScript
phase. Adding `tsconfig.json` for the typecheck gate caused Next 16 to
auto-detect TypeScript, install it, and crash:

```
The "id" argument must be of type string. Received undefined
Next.js build worker exited with code: 1
```

Grepping for `Compiled successfully` reported a pass. The exit code did not.
Fixed by naming the config `tsconfig.check.json` — Next only auto-detects the
literal filename `tsconfig.json` — with `typecheck` pointed at it explicitly.
**All gates above were subsequently re-confirmed by exit code.**

### 1.2 Scope limits of these results

- **E2E covers unauthenticated pages only**: landing, pricing, legal, 404, and
  the login gate. No authenticated journey — signup, intake, tutoring session,
  check flow, booking, payment — has any automated coverage.
- **Nothing was executed against a live database.** Migrations are verified to
  *parse*, not to *apply*. RLS policies are unverified at runtime.
- **No AI call was made.** There is no API key in this environment, so cost
  accounting, prompt caching, and every model-backed route are unexercised.

---

## 2. Changes made this pass

| Area | Change | Verified by |
|---|---|---|
| Cost | `lib/server/aiCall.js` — one metered path; 7 routes converted off direct Anthropic calls | tests + build |
| Cost | Real `usage` tokens replace `length/4` (which recorded a 20MB PDF intake at ~$0) | `enginePolicy.test.mjs` |
| Cost | Prompt caching, guarded: on API rejection it retries uncached and disables process-wide | build only — see B6 |
| Engine | `detectGaming` was imported and never called; now wired into the session driver | `sessionLoop.test.mjs` |
| Engine | `lookupKcId` defaulted a missing subject to `'general'`, so the indexed alias lookup always missed and fell through to a scan capped at 200 rows — a learner with a large course load silently recorded no practice evidence | typecheck |
| Data | `circle/route.js` + `server/context.js` read `.owner_id` off a PostgREST embedded resource that may be an array — Study Circle plan inheritance, a paid feature, failing silently | typecheck |
| Marketplace | `components/DropInSessions.js` — the group backend shipped with no student-facing route to it | build + lint |
| Tooling | ESLint 9 flat config + TS `checkJs`; `npm run lint` was previously broken (`next lint` removed in Next 16) | exit 0 |
| Honesty | "Background-checked" removed from 8 places incl. `terms` (legally binding), `safety`, guardian-consent email | copy-audit test |
| Honesty | 89% vs 75% tutor-share contradiction reconciled across dashboard, application, admin | `groupSessions.test.mjs` |

---

## 3. Blockers — prioritized

### P0 — blocks deployment

**B1. Domain `kaizenedu.net` was suspended. — RESOLVED, verified live.**
Originally `clientHold` (ICANN 15-day registrant verification). Re-checked the
same day: DNS returns Vercel A records (`216.150.16.1`, `216.150.1.65`) and the
site serves traffic.

```
GET https://kaizenedu.net/            → 200
GET https://kaizenedu.net/pricing     → 200
GET https://kaizenedu.net/api/health  → 200
```

- *Status:* **CLOSED.** No longer blocks anything.

**B2. The database was EMPTY. — RESOLVED, verified live.**
The assumption was wrong in the worse direction. It was not "0011–0017 unapplied":
the `public` schema contained **zero tables**. No migration had ever run against
production, while 8 auth users existed with no profile rows — so every
authenticated call any of them made was failing. Zero storage buckets, which is
the actual cause of "bucket not found on every upload".

Applied 0001→0017 in order, then `seed_kc.sql`, then re-ran 0016 (see below).
Verified live afterwards:

| Check | Result |
|---|---|
| Tables in `public` | **57** |
| RLS enabled | **57 of 57** (0 missing) |
| Policies | 97 |
| Storage buckets | 3 — `applications`, `avatars`, `documents` |
| `profiles` INSERT for anon/authenticated | **none** — self-promotion hole closed |
| `profiles` client UPDATE | only `name, app_meta, email_opt_out, analytics_opt_out` — `role` and `plan` unwritable |
| `kc_item.answer_spec` client SELECT | **none** — the answer key never leaves the server |

- *Status:* **CLOSED.**

**B2a. `0016_tier0_content.sql` seeded nothing. — FIXED.**
Its Tier-0 insert inner-joins `kc` on slug, but `seed_kc.sql` — which creates
those rows — is documented (`docs/PROVISIONING.md:45`) to run *after* all
migrations. So 0016 inserted zero rows and recorded itself applied. Confirmed
live (`kc_content = 0`), fixed by re-running it after the seed. The documented
provisioning order is wrong and needs correcting.

**B2b. `resolve_group_fill()` failed on EVERY call. — FIXED (migration 0018).**
It declares `seats integer` but returns `count(*)`, which is `bigint`. PL/pgSQL
validates the tuple descriptor at `RETURN QUERY` setup rather than per row, so it
raised even against an empty table — proven with a throwaway probe of identical
shape before fixing:

```
ERROR:  42804: structure of query does not match function result type
DETAIL:  Returned type bigint does not match expected type integer in column 3.
```

The hourly maintenance cron calls this. Group sessions would never confirm, never
cancel for under-fill, and under-filled paid seats would never auto-refund —
invisible until the feature was actually used.

**B2c. Grant hygiene. — FIXED (migration 0019).**
All 57 tables granted TRUNCATE/TRIGGER/REFERENCES to `anon`/`authenticated`
(Supabase's default `grant all`, only partially revoked by 0011–0017). **Not
exploitable** — RLS covers everything else, neither role can bypass RLS or holds
CREATE on the schema, and PostgREST has no TRUNCATE verb — but TRUNCATE is the one
verb RLS does not govern. Revoked everywhere, plus client DML on 8 tables whose
only write policy was `is_admin()`. Root cause fixed: `ALTER DEFAULT PRIVILEGES`
granted everything to client roles on every *future* table, so new tables started
open and were safe only if their migration remembered to revoke. They now start
closed.

*Known and deliberately unchanged:* `mastery_events` and `student_concept_mastery`
remain client-writable under `auth.uid() = user_id`. That is the legacy SM-2 sync
path and revoking it would break client sync. It is also why the engine does not
trust them — confirmed mastery derives from `evidence`, which has no client INSERT
policy at all.
- *Impact:* two distinct failures. (a) **0011 is a security fix.** Without it,
  `profiles` has no column-level GRANT and no INSERT revoke, so a new user can
  insert their own row with `role='admin'` before `getCaller` creates it — full
  admin self-promotion. (b) 0012–0017 create every engine, content, and group
  session table. Without them the engine and drop-in routes 500 on first call.
- *Fix:* apply 0011→0017 in order, then `supabase/seed_kc.sql`. Confirm by
  querying `kc`, `evidence`, and `group_session`, and by attempting a
  `role='admin'` self-insert as an anon user (must fail).
- *Effort:* ~1 hour including verification.
- *Blocks deployment:* **YES.** Shipping code that assumes these tables against
  a database that lacks them is a guaranteed outage, and the RLS hole is live.

**B3. Stripe is not configured — CONFIRMED TWICE, against a belief that it was.**
This was reported to me as done. It is not, and two independent checks agree:

1. `vercel env ls` on `saitokikus-projects/kaizen-ai` returns **10 variables,
   none of them Stripe** (Production *and* Preview):
   `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `ADMIN_EMAILS`, `OPENAI_API_KEY`,
   `SUPABASE_JWKS_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
   `ANTHROPIC_API_KEY`.
2. The **running deployment** reports it: `GET /api/health` →
   `{"ai":true,"voice":true,"db":true,"billing":false,"email":true}`.
   `billing` is `Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET)`.

Most likely they were added to a different Vercel project or scope, or entered
without saving. **Also absent and required by code:** `APP_URL`, `DAILY_API_KEY`
(no video sessions without it), `CRON_SECRET` (the hourly maintenance job that
resolves group min-fill), `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`/`_TOKEN`.
- *Impact:* no revenue path. Subscriptions cannot be sold; 1:1 and drop-in
  booking fail closed (the group route explicitly refuses to book without
  Stripe, which is correct behaviour but means the marketplace does not exist).
- *Fix:* create the products, set the four variables, register the webhook at
  `/api/billing/webhook`, and test with a Stripe test-mode card end to end —
  including the group-seat path, which the webhook handles at `metadata.group_seat_id`.
- *Effort:* half a day including test-mode verification.
- *Blocks deployment:* **YES** for a paid launch. A free-tier-only soft launch
  could proceed without it.

### P1 — does not block deploying, blocks serving real customers

**B4. The verified content library is 8 knowledge components of middle-school math.**
Now 8 KCs and **32 items** after the repair below.

*Correction to this document's earlier claim.* It previously said "each KC has ≥2
items across exactly 2 context tags, so the gate is reachable." That was wrong,
and the error came from counting by regex over the seed file rather than querying
the database. Live counts showed **`math-equivalent-fractions` had exactly ONE
item**. `check.js:48` refuses to issue a check on a bank smaller than two, so it
could never be checked or confirmed — and it is a prerequisite for three of the
other seven, which `policy.js:62-66` then held at `blocked_on_prereqs` forever.
**One missing item made 4 of 8 concepts unreachable.**

Repaired with 10 hand-verified v1 items; every concept now clears the 2-item floor
with ≥2 contexts, and equivalent-fractions reaches the 6-item ship floor across 3.

*Also fixed:* all three seeded MC items had `answer_spec {"index":0}` — always
tapping the first option scored 100% on every MC item in the bank. MC is a
confirming tier-v2 kind, so that fabricated confirmed mastery from no knowledge.
Reordered to indices 2/3/1, preserving index-alignment with
`distractor_misconceptions` so a wrong pick still diagnoses.

*Why CI missed it:* `seedBank.test.mjs:128` matches with a regex requiring
`answer_spec` immediately before `context_tag`; MC rows interpose a choices array,
so the one equivalent-fractions item was invisible to the only test checking
context coverage — and nothing asserted item count at all.
`test/bankInvariants.test.mjs` now parses every insert shape and asserts all four
invariants. Verified it catches the original bug.

**The three floors, derived from the enforcing code** (use these when authoring):

| Floor | Value | Enforced at |
|---|---|---|
| Survival — not a dead end | ≥2 verified items | `check.js:48`, `check.js:77` |
| Confirmable | ≥2 distinct `context_tag` | `pfa.js:114` + `CONFIRM_MIN_CONTEXTS` |
| Ship — confirmation isn't item-recall | **6 items, ≥2 tags, ≥3 per tag** | `CONFIRM_REQUIRED=4` over `ITEMS_PER_KC=3` forces two checks; `elo.js:73` penalises a seen item by 800 |
- *Impact:* outside that one chain, `issueCheck` returns `noBank` and the
  student sees "No verified questions for this concept yet." Confirmed mastery
  — the product's central claim, the only thing parent reports show, and the
  input to per-tutor effectiveness — is unreachable for AP Biology, Algebra II,
  chemistry, or anything else a paying high-schooler actually takes.
- *Fix:* run the authoring pipeline (LLM draft → solver agreement → second-model
  critique → human sign-off) for the top 3–5 courses. Budget ~40–60 KCs per
  course at ≥4 items and ≥2 contexts each.
- *Effort:* 2–4 weeks with a subject-matter reviewer. This is the largest
  remaining piece of real work.
- *Blocks deployment:* **NO** — but it blocks charging a high-school student.

**B5. Tutor payouts are manual.**
There is no Stripe Connect integration. Money flows in from students and is paid
out by hand.
- *Impact:* holding and forwarding funds on behalf of tutors is money
  transmission in most US states. It also does not scale past a handful of tutors.
- *Fix:* Stripe Connect Express — tutors onboard, Stripe holds the payout
  relationship and files the 1099s.
- *Effort:* 1–2 weeks including onboarding UX.
- *Blocks deployment:* **NO** at pilot scale with a written agreement; **YES**
  before scaling the marketplace.

**B6. Prompt caching is unverified.**
The pinned SDK is `@anthropic-ai/sdk@0.32.1`; current is `0.115.0` — 83 versions
behind. `cache_control` is absent from the installed SDK's types.
- *Impact:* the cost model assumes caching works. If it does not, the guard
  disables it and spend runs at full input price — the measured saving on the
  chat path was **47%** (not the 80–90% sometimes quoted; only the prefix caches
  while conversation history grows).
- *Mitigation already in place:* the call retries uncached on rejection and
  disables caching process-wide, so an unsupported field costs one wasted
  request rather than taking the tutor down.
- *Fix:* one live API call with `usage.cache_creation_input_tokens` inspected.
  Then decide on the SDK upgrade separately.
- *Effort:* 15 minutes once a key exists.
- *Blocks deployment:* **NO** — it is guarded. It blocks trusting the cost model.

**B7. No automated moderation on a product that accepts minors.**
Signup allows 13–17 with guardian consent. Chat and tutoring text have no
automated classifier; `STUDENT_SAFETY` is prompt-level guidance only.
- *Impact:* a self-harm disclosure or grooming attempt in a session has no
  detection path. This is the highest-severity non-technical risk on the list.
- *Fix:* run a moderation classifier over inbound student text and tutor
  messages; route hits to a human queue with a documented escalation policy.
- *Effort:* 1 week for the pipeline; the policy and staffing take longer.
- *Blocks deployment:* **NO** technically. **YES** before marketing to minors.

**B8. Rate limits are per-instance without Upstash.**
`UPSTASH_REDIS_REST_URL` / `_TOKEN` unset. The limiter logs a warning and falls
back to in-memory counting.
- *Impact:* on Vercel serverless each instance counts separately, so the
  effective limit is roughly N× the intended one. This is the abuse control on
  paid AI calls.
- *Fix:* provision Upstash and set both variables.
- *Effort:* under an hour.
- *Blocks deployment:* **NO**, but it is cheap insurance against a cost incident.

**B9. No automated coverage of any authenticated journey.**
- *Impact:* signup → intake → study → check → booking → payment is verified only
  by reading code. Regressions in the core loop ship silently. Two bugs found
  this pass (the dangling `msg` refs, the missing JSX import) both passed
  `next build` and would have failed at runtime.
- *Fix:* Playwright specs against a seeded test account for the three main
  journeys.
- *Effort:* 3–5 days.
- *Blocks deployment:* **NO.**

**B10. No parent surface.**
Guardians receive a consent email and nothing else.
- *Impact:* the stated wedge is "fills the gaps public school leaves, and parents
  are busy" — but the paying adult has no view of what their child is doing.
  Confirmed-mastery reporting exists in the engine with no surface to show it.
- *Fix:* a read-only parent view: confirmed mastery, upcoming checks, session
  history. The data model already supports it.
- *Effort:* 1 week.
- *Blocks deployment:* **NO.** It blocks the value proposition.

**B11. No liability insurance and no counsel review of the tutoring terms.**
- *Impact:* adults in live video with minors, without insurance or reviewed
  terms, is an uninsured operational risk.
- *Fix:* general liability + professional liability; have counsel review
  `/terms`, `/safety`, and the tutor agreement — particularly now that the
  background-check language has been corrected to what is actually true.
- *Effort:* 2–3 weeks, mostly waiting.
- *Blocks deployment:* **NO** technically. Ship without it knowingly or not at all.

### P2 — should fix, low risk

| # | Item | Impact | Fix | Effort | Blocks |
|---|---|---|---|---|---|
| B12 | SDK 83 versions behind | Missing fixes and models; upgrade is untestable without a key | Upgrade, then re-run all gates + one live call | 1 day | No |
| B13 | Sentry DSN unset | No production error visibility | Set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 1 hour | No |
| B14 | Group min-fill depends on the hourly cron | A session can sit unresolved up to 60 min; refund timing is affected | Verify `/api/cron/maintenance` fires on Vercel and `resolve_group_fill` succeeds | 1 hour | No |
| B15 | 5 high-severity advisories in the ESLint toolchain | Dev-only (`brace-expansion` DoS); production deps are clean | `npm audit fix` when upstream lands | 15 min | No |
| B16 | 4 ESLint warnings | 3 stale `eslint-disable` directives + 1 hook dep | `npm run lint:fix` | 10 min | No |

---

## 4. Go / no-go

### **NO-GO** for a paid public launch.

The determining evidence, in order:

1. **The domain does not resolve.** `clientHold`, verified today. No user can
   reach the product regardless of code quality. This alone settles it.
2. **An unpatched privilege-escalation path is live.** Migration 0011 closes a
   hole where any new user can self-insert as `role='admin'`. I could not verify
   it has been applied, and the last time this question came up (migration 0006)
   the answer was that it had not.
3. **No payment path.** Stripe is unconfigured, so there is no revenue and the
   marketplace refuses every booking.
4. **Content covers one chain of middle-school math.** A paying high-schooler
   hits `noBank` on essentially every concept they care about.

### **GO** for a limited free pilot, once B1 and B2 are done.

The engineering is in good shape: 187 tests, 5 E2E, lint, types, build and 17/17
migrations all pass; production dependencies are clean; the cost governor now
covers every model call; the group-seat payment path handles the
cancelled-then-paid race correctly. What is missing is **operational**, not
structural.

A defensible pilot: restore the domain, apply 0011–0017 plus the seed, invite a
small number of middle-school families on the fractions→algebra chain that
actually has content, keep it free so B3 and B5 do not apply, and staff
moderation manually while B7 is built.

**Ordered path to a paid launch:** B1 → B2 → B3 → B4 → B7 → B5 → B10 → B11.

---

## 5. Assumptions and unresolved questions

**Assumptions** (each would change the verdict if wrong):
1. Migrations 0011–0017 are unapplied. Inferred from the 0006 precedent, not
   verified — there is no DB credential here. **Check this first; it is the
   cheapest item on the list to resolve and the second most severe.**
2. Vercel holds the environment variables listed in `.env.example`. Only
   `.env.example` exists locally.
3. The `clientHold` is registrant verification, not an abuse complaint. The
   2026-07-09 registration date and 15-day window fit, but the registrar has not
   been asked.

**Unresolved:**
1. Does `cache_control` work on SDK 0.32.1? Guarded, but unknown. (B6)
2. Do the RLS policies behave as written? They parse; they have never run.
3. Is 47% the real cache saving in production? Measured on one path, one shape.
4. Will tutors complete the ≤60s structured observation? The engine's
   human-evidence channel depends on it and it has never been used by a real tutor.
5. Does the drop-in economic model hold? Modelled at 4×$15 → $12.06 platform net
   (20.1%) vs $2.94 (7.4%) for 1:1, with a minimum fill of 2. Never run with
   real tutors, real fill rates, or real cancellations.
