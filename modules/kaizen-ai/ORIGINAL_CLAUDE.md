# Kaizen AI

After-school academic club + AI study companion for students 13+, live at
https://kaizenedu.net. Owner: **Kaizen Academy LLC** (never "Kaizen Tutors LLC";
a CI test fails the build on the wrong entity).

## Layout

- `web/` — the entire product: Next.js 16 App Router (**JavaScript**, not TS),
  React 19, Tailwind 3. All API routes live here. Self-contained.
- `supabase/` — additive SQL migrations (`migrations/0001..`) + `seed.sql`, all
  applied to production. `GO_LIVE.sql` is the one-paste ops bundle.
- `docs/` — specs, runbooks, legal. **Start at `docs/README.md`**: it maps
  question → document and states the precedence. In short: the code decides
  prices and entitlements; `STRATEGY.md` (v0.2) decides the business;
  `RELEASE_PLAN.md` (v2) decides the sequence; `CLAIMS_MATRIX.md` is the truth
  ledger for public copy. `docs/archive/` holds 25 superseded documents —
  readable for history, never a reason to do anything. The frozen
  `TECHNICAL_SOURCE_OF_TRUTH` / `ERRATA` / `HANDOFF` chain went there on
  2026-09-03; it described a product two waves out of date.
- `evals/`, `demo-materials/` — tutor-quality rubric, demo package.
- `legacy/` — archived stacks, zero product dependencies. Don't touch; it is a
  deletion candidate (see `docs/superpowers/specs/2026-09-03-wave3-frontend.md`).

## Commands (run from `web/`)

```bash
npm run dev          # http://localhost:3000 (min env for AI dev: ANTHROPIC_API_KEY)
npm run build        # must stay clean
npm test             # node --test over test/*.test.mjs
npm run test:e2e     # Playwright smoke (unauthenticated)
npm run lint         # eslint (lint:fix to autofix)
npm run typecheck    # tsc --noEmit over jsdoc/check config
```

## Hard rules

1. **No public claim without a `docs/CLAIMS_MATRIX.md` row.** Marketing/legal
   copy is CI-guarded: `web/test/claims.test.mjs` bans phrases (affirmative
   "background-checked" — tutors are "interviewed and approved by our team";
   guaranteed results/grades; FERPA/HIPAA postures; wrong entity name;
   click-to-cancel/negative-option citations). `web/test/legalMarkers.test.mjs`
   fails on un-cleared `[ATTORNEY REVIEW]` / `[FOUNDER INPUT REQUIRED]` markers.
2. **Pricing figures come only from `web/lib/server/clubPricing.js`** (pinned by
   `test/clubPricing.test.mjs`). Never retype a price in a page. What is FOR SALE
   is `SALE_STATUS` there; pages filter on `forSale()` and never decide it.
3. **Entitlements/auth are server-side only.** Every non-public route resolves
   the caller via `lib/server/context.js` (`getCaller`) and checks
   `checkEntitlement`. Service-role + AI keys exist only under `lib/server/*`
   and API routes.
4. **Selling is fail-closed.** `app_settings.club_enabled` gates the schedule,
   tutor directory, and booking (returns 503/`notYetOpen` until counsel clears
   `docs/legal/REVIEW_QUEUE.md` items 10–15). Don't flip it in code or seed.
5. **Mastery law** (`docs/ENGINE.md`): a skill counts only on unassisted,
   verified, delayed evidence. Never write copy or code that scores assisted
   work as mastery.
6. **Missing env degrades gracefully** — every integration (Stripe, OpenAI,
   Resend, Sentry, Daily) must produce an explicit "not configured" state,
   never a crash or fake success. `web/.env.example` is authoritative.
7. **Migrations are additive.** Next number = max + 1 (currently 0039). RLS on
   every user table; default privileges start closed (0019). `evidence` rows may
   never be updated (0034 trigger) — corrections are new rows.

## Architecture in one breath

Client-first: localStorage working copy (`lib/appState.js`) syncs to
Supabase/Postgres via debounced pushes (`lib/cloud.js`); the server is
authoritative for money, safety, entitlements. Anthropic runs tutoring, intake,
grading, reports via the model router (`lib/server/models.js`: fast/tutor/deep);
OpenAI runs voice only. Stripe webhooks (signature-verified, raw body) drive
`profiles.plan`; `plan_entitlements` + `usage_ledger` meter everything.

**Known trap:** `lib/cloud.js` sync has no conflict guard (row-level
last-write-wins; a stale device can clobber newer data). Deliberate; do not
"fix" casually.

## Deploy

Vercel, **Root Directory = `web`**, framework Next.js, production branch `main`,
domain kaizenedu.net. `APP_URL` must be set in production (payment redirects
refuse header fallback). Hourly cron requires `CRON_SECRET`.

## One product, one record

**Canonical strategy: `docs/STRATEGY.md` (v0.2).** Anything that contradicts it
is out of date. The sequence is `docs/RELEASE_PLAN.md` (v2).

The same trellis serves a homeschooling parent as the gardener (**Kaizen Home**,
STRATEGY §4.6, 13+): the parent sees everything, assigns anything, certifies
nothing — a parent's observation never confirms mastery. Kaizen Local sells one
recurring product, the **standing seat** (`SEAT_PLAN` in
`clubPricing.js`: $550/mo, 2 × 75 min a week, 1:4, in person, one price for
every payer), around a la carte drop-ins and the free Community Hall. The AI is
free with one upgrade (`ai_solo`, "Max AI"). Club/Plus/Max memberships are
**retired from sale** (`SALE_STATUS`); their definitions stay for `/terms` and
the metering rail. Seat rooms (kind `standing_seat`) are reserved inventory:
`groupSeatQuote` answers `reserved`, the claim route refuses it, the public
board hides the kind — reserved is a rule about *purchasability*, not about
visibility, so a family may see that a cohort exists. A **cohort** (0038) is the
seat as one object: a subject, a venue, a lead tutor, a capacity and the two
weekly series that make it up, read through `lib/server/cohorts.js`
(`publicCohorts`, `mySeat`). A room's time is rendered in the ROOM's timezone
via `lib/roomTime.js` and never in the reader's; `lib/roomKinds.js` owns the one
kind→label map and the supervision-versus-tutoring answer. The engine in `web/lib/engine/` IS the trellis
(lattice = `kc` + `kc_edge`; mastery record = `evidence` + `kc_estimate`,
immutable by trigger since 0034; growth tip = the reachable set). Marketing
surface design spec + plan live in `docs/superpowers/specs/` and
`docs/superpowers/plans/`.
