# Kaizen — the after-school academic club

**An in-person after-school academic club in Austin for students 13 and up,
paired with an AI study companion that is free.**

The one recurring product is the **standing seat**: a reserved place in the same
small room, twice a week, 1:4, taught by the Program Director, at one price for
every payer. Around it sits an a la carte week — Homework Hall (supervised
study, not tutoring), Subject Clinic (a small group taken through one topic),
and a **free Community Hall** every week. A $59 placement diagnostic is the
seat's on-ramp and is credited in full against the first month.

Every figure above lives in `web/lib/server/clubPricing.js` and nowhere else;
this page deliberately names none of them, because a README is not a price
sheet and the two drift. `SALE_STATUS` in that file is the authority on what is
actually for sale — the Club / Plus / Max memberships are retired from sale, and
their definitions remain only for the Terms and the metering rail.

The same trellis serves a homeschooling parent as the teacher (**Kaizen Home**,
`docs/STRATEGY.md` §4.6): the parent sees everything, assigns anything, and
certifies nothing. A parent's observation never confirms mastery.

**Not sold, and not built:** private 1:1 tutoring, a browsable marketplace of
tutors, and free trials. `/tutors` fails closed on `marketplace_enabled` and
says so; no surface offers a private session.

## Repository map

| Path | What it is |
|---|---|
| [`web/`](web) | **The product.** Next.js 16 App Router in JavaScript — student dashboard, AI companion, gradebook, club schedule and booking, the Director's console, the founder's funnel board, admin — plus every API route. Self-contained. |
| [`supabase/`](supabase) | 38 additive migrations + seed. [`GO_LIVE.sql`](supabase/GO_LIVE.sql) is the one-paste ops bundle. |
| [`docs/`](docs) | Start at [`docs/README.md`](docs/README.md) — it says which document answers which question, and which ones no longer do. |
| [`demo-materials/`](demo-materials) | Two complete courses (Algebra II, AP Biology) used as real intake fixtures. |
| [`evals/`](evals) | Tutor-quality rubric + sample cases. |
| [`legacy/`](legacy) | Archived, non-production stacks. Nothing in the product depends on it. |

## Quick start

```bash
cd web
cp .env.example .env.local   # minimum: ANTHROPIC_API_KEY for AI-only local dev
npm ci
npm run dev                  # http://localhost:3000
```

No environment variable is required to boot. Every integration degrades to an
explicit "not configured" state rather than crashing or faking success, so the
app runs with nothing but a model key. Full mode — accounts, payments, video,
email — needs the migrations plus the keys documented in
[`web/.env.example`](web/.env.example); follow [`docs/GO_LIVE.md`](docs/GO_LIVE.md).

```bash
npm test          # node --test over test/*.test.mjs
npm run lint      # eslint
npm run build     # production build
npm run test:e2e  # Playwright smoke, unauthenticated
```

## Architecture

```
Browser (student · parent · Program Director · founder)
   │  localStorage working copy, debounced sync to Postgres (lib/cloud.js)
   ▼
web/ — Next.js on Vercel  (Root Directory = web)
   ├─ ~60 API routes; every non-public one resolves the caller through
   │  lib/server/context.js and checks an entitlement. Server-side only.
   ├─ Anthropic via the model router (lib/server/models.js: fast/tutor/deep)
   │  — tutoring, intake, grading, reports
   ├─ Stripe (signature-verified webhooks drive profiles.plan)
   └─ Resend (transactional mail) · Daily.co (video) · Sentry
   ▼
Supabase — Postgres with RLS on every user table · Auth · Storage
```

The client is authoritative for nothing that matters. The server decides money,
safety, entitlements and what counts as evidence.

**The engine** in `web/lib/engine/` is the trellis: the lattice is `kc` +
`kc_edge`, the mastery record is `evidence` + `kc_estimate` (immutable by
trigger since migration 0034 — corrections are new rows, never updates), and the
growth tip is the reachable set. Its one law, in `docs/ENGINE.md`: a skill counts
only on unassisted, verified, delayed evidence.

Proprietary software — see [LICENSE](LICENSE). © Kaizen Academy LLC.
