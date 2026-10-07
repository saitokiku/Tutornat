# KaizenEdu web (E4) — Trellis on the E2 seam

Next.js 15 App Router, TypeScript. `/learn` is Trellis tutoring one synthetic 4th-grade lesson
(adding fractions with unlike denominators) with the honest record beside the chat; `/parent` is the
household view with the audit line and the no-silent-trap notice. Synthetic content and names only.

## What writes what
- `app/api/turn/route.ts` → `lib/practice.ts` is the only write path. A correct answer calls
  `e2.append_practice` (class `corrections-practice`, `qualifying=false` whatever the payload says); a
  wrong answer with a hint calls `e2.record_exposure` (assisted-help; restarts that skill's 48 h clock).
  Operation ids are `<session>:<item>:<attempt>`, so a retried request returns the stored row.
- `lib/record.ts` reads the record through the **report** role: practised, clean reps, helped, proven,
  certification (always `none` from the seam today), last help, eligible-at, open offer.
- `web/` never inserts into `e2.evidence_events`; the tutor role cannot (`42501`, proved by `scripts/smoke.cjs`).
- Callers take no locks (ADR-0066). One seam call per serializable transaction, `40001/40P01` retried.
- Trellis' words: scripted by default (`lib/tutor.ts`); with `OPENAI_API_KEY` the reply is phrased by
  OpenAI over plain `fetch`, but correct/helped is always decided by the scripted grader, so the record
  never depends on the model. No Gemini routes (ADR-0049).

## Vercel — exact settings
| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | `web` |
| "Include source files outside of the Root Directory in the Build Step" | **on** (the build runs `../db/migrate.cjs` and `../tests/engine/pg/resolve-pg.cjs`) |
| Build command | `npm run vercel-build` (also in `web/vercel.json`) — with a database, `migrate` → `seed` → `next build`; without one, a demo build |
| Install command | `npm install` |
| Node | 24.x |
| Deployment protection | on, Vercel Authentication (the site is a test surface, no login of its own) |
| Domain | Generated Vercel URL while the Trellis site is being developed |

Environment variables (Production + Preview):

Without database variables, the tutor runs in demo mode and practice history is not saved.
Set the four `KAIZENEDU_*` database values together before using the record.

| Name | Used by | Value |
| --- | --- | --- |
| `KAIZENEDU_PG_URL` | build: migrate + seed | Neon **owner** connection string (`postgresql://…/neondb?sslmode=require`) |
| `KAIZENEDU_PG_TUTOR_URL` | runtime `/api/turn` | same host/db, user `kz_home_tutor`, password = `KAIZENEDU_APP_PASSWORD` |
| `KAIZENEDU_PG_REPORT_URL` | runtime `/learn`, `/parent` | same host/db, user `kz_home_report`, same password |
| `KAIZENEDU_APP_PASSWORD` | build: seed sets it on both app roles | any strong secret (Neon requires passwords) |
| `OPENAI_API_KEY` | runtime, optional | absent → scripted Trellis, still fully testable |
| `OPENAI_MODEL` | runtime, optional | default `gpt-4o-mini` |

Migrations are forward-only, transactional, advisory-lock serialized and checksum recorded
(`db/README.md`); repeat builds skip applied files. The seed is idempotent (`ON CONFLICT DO NOTHING`).

## Local
```sh
# branch-local database on the PM cluster; never the shared kaizenedu_e2
$PGBIN/psql -h 127.0.0.1 -p 5433 -U kaizen_owner -d postgres -c "create database kaizenedu_25"
sh web/scripts/with-pg25.sh node db/migrate.cjs
sh web/scripts/with-pg25.sh node web/scripts/seed.cjs
sh web/scripts/with-pg25.sh node web/scripts/smoke.cjs   # the route's SQL, as tutor + report roles
cd web && npm install && cp .env.example .env.local && npm run dev
```
`scripts/smoke.cjs` exists because the PM box has no network for `npm install` and `next` is not in the
offline cache: it drives the exact `RECORD_SQL` from `lib/record.ts` and the same two seam calls
`lib/practice.ts` makes, then asserts nothing qualifying or certified came out of them.

## Not in this round
Accounts/login, payments, real learners, COPPA flows, any certification claim. The 14-day escalation
(`offer_transition 'escalate'`) and the quiet-window offer button are read, not yet driven, from the UI.
