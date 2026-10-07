# Kaizen — Bug Test Plan

The plan for finding bugs in the live `web/` app, in three layers: **unit**
(runs anywhere, no infra), **E2E smoke** (runs against a build, no infra), and
**integration + full E2E + manual QA** (needs a test Supabase + Stripe test mode).
It also lists the setup you must do **before** a full pass is possible.

> Verification is **local-first** (no reliance on GitHub Actions): `npm test`,
> `npm run build`, and `npm run test:e2e` all run on your machine. Vercel's
> per-deploy build is the second gate.

## Layer 1 — Unit tests (no infra) ✅ runnable now

`cd web && npm test` → `node:test` over the pure logic. **55 tests today:**

| Area | File | What it locks down |
|---|---|---|
| Grade engine | `test/grades.test.mjs` | weighted grades, GPA, projections |
| Session lifecycle | `test/sessionStates.test.mjs` | transitions, refund rule, 89/11 earnings split |
| Teach mode + mastery | `test/prompts.test.mjs` | lesson vs Socratic prompt, mastery injection |
| Intake merge | `test/intake.test.mjs` | course/assignment dedupe, dates, grades |
| Math renderer | `test/mathExpr.test.mjs` | expression compiler + injection rejection |
| Speech | `test/speech.test.mjs` | markdown/LaTeX → speakable |
| Email escaping | `test/emailEsc.test.mjs` | HTML-injection safety |
| Formatters | `test/format.test.mjs` | money/date |
| Anti-farming hash | `test/trial.test.mjs` | trial/intro email hash determinism + normalization |
| Billing helpers | `test/billing.test.mjs` | `periodEndOf`, `priceIdOf` |

## Layer 2 — E2E smoke (no infra) ✅ runnable now

`cd web && npm run build && npm run test:e2e` → Playwright (`e2e/smoke.spec.js`),
using the pre-installed Chromium. **5 specs:** landing renders, pricing shows
**$19.99 / $59.99 / 40 lessons** and paid CTAs point at checkout, legal + `/licenses`
render, 404 works, dashboard gates to login. These catch build/route/copy
regressions without any secrets.

## Layer 3 — Integration + full E2E + manual QA (needs a test env)

### Setup required BEFORE this pass (the pre-req)

1. **Supabase test project** — run migrations `0001` → `0010` in order, then
   `seed.sql`. (They need Supabase-managed `auth.users` + `storage.*`, so a bare
   Postgres won't do — use `supabase start` or a throwaway project.)
2. **Fixtures** (no seeded users exist by design). Create by SQL or admin UI:
   - a tutor row with **both** `status='active'` AND `vetting_status='cleared'`,
     plus open `tutor_availability` slots;
   - a guardian-linked minor (13–17) and a normal adult account;
   - one paying account, one free account.
3. **Env — full, NON-DEMO.** Set `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` +
   `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_STUDENT/FAMILY` (Stripe **test mode**),
   `CRON_SECRET`, `ADMIN_EMAILS`. **Never test in demo mode** — with Supabase
   unset, `getCaller` returns `{demo:true}`, which disables metering and makes
   **every caller an admin** (`context.js` `isAdminCaller`). That path does not
   represent production.
4. **Stripe CLI** to forward webhooks: `stripe listen --forward-to
   localhost:3000/api/billing/webhook`. Also run tests **with the webhook OFF**
   to prove reconciliation (below).

### Money-path bugs to target (the ones this wave fixed — verify red→green)

| # | Scenario | Expected (post-fix) |
|---|---|---|
| M1 | Subscribe, **webhook never fires** | `/billing?status=success` calls `/api/billing/reconcile`, plan is granted, UI shows "upgraded", not stuck on free |
| M2 | Pay for a session, **webhook delayed >30 min** | `releaseAbandoned` checks Stripe, **fulfills** the paid session (or refunds) — never cancels a paid hold silently |
| M3 | Deploy with **`STRIPE_*` unset**, book a paid session | 503 "paid tutoring isn't available" — **no** free booking, **no** earnings accrued |
| M4 | Start checkout, **abandon it**, retry | Trial still offered (recorded only on `trialing` conversion, not checkout creation) |
| M5 | Pricing "Start" CTA (logged out) | Lands in checkout after login (plan carried via sessionStorage), not `/dashboard` |
| M6 | Tutor completes an `in_progress` session (or cron auto-completes past end) | `tutor_earnings` accrues 89%; `/tutor` shows awaiting-payout vs paid from the **ledger** |
| M7 | Open `/api/tutoring/room` for a `pending_payment` session | 402, room refused |
| M8 | Free intro, delete account, re-signup, book again | Second intro is **charged** (hashed-email guard, migration 0010) |

### Data-safety bugs to target

| # | Scenario | Expected |
|---|---|---|
| D1 | User A signs in on a browser, signs out, User B signs up | B sees an **empty** dashboard; none of A's courses/chats migrate to B |
| D2 | Mark a task done, **refresh within ~1.5s** | Stays done (pending push flushes on unload/visibility) |
| D3 | Open a tutor chat on mobile, exit with the **back gesture**, reopen | The conversation is still there (persisted on every exit path) |
| D4 | Onboarding while `ANTHROPIC_API_KEY` is unset/AI errors | "Add a class" + "Skip for now" let you reach the dashboard anyway |

### Integration tests (mocked Supabase + Stripe — no live infra)

Recommended follow-up once a mock harness exists: assert the M1–M8 behaviors at
the route layer by injecting a fake service client + Stripe SDK. These are
**not written yet** (they need a module-mock harness compatible with the `@/`
loader); tracked as the next testing increment. Until then, M1–M8 are covered by
the manual pass above.

### Full E2E (Playwright, needs the test env)

Extend `e2e/` with authenticated journeys once fixtures exist: signup→verify→
onboarding (incl. the escape hatch), subscribe→reconcile→entitled, and
book→pay(Stripe test card `4242…`)→room→complete→tutor-ledger. These need the
non-demo env from setup; the smoke specs are the infra-free subset that runs today.

## What is NOT yet automated (honest gaps)

- Route-level integration tests (mocked infra) — designed above, not built.
- Authenticated E2E journeys — need the test Supabase/Stripe env.
- Real Stripe 3DS, Daily.co video join, and actual email receipt — manual only.
