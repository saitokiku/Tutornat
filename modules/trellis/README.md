# trellis (parked source)

Source: `saitokiku/trellis` (local `/Users/man/Documents/GitHub/trellis`) at commit `41999b5dd49e5549662da8c5b42c0bb8bbe8804a`
(last commit 2026-09-19). Copied on 2026-10-07. Not imported or built by `apps/web`.

Trellis is a tutor engine for a household learning product. Its core rule is that practice
never counts toward mastery. A skill is certified only by unassisted evidence collected at
least 48 h after help, on a separate day. PostgreSQL enforces this through SQL functions in an
`e2` schema with capability roles and row-level security; application code does not enforce
it. The only lesson is a synthetic one on adding fractions with unlike denominators. The
original README is kept as `ORIGINAL_README.md`.

## What is inside

| Path | Purpose |
|---|---|
| `lib/tutor/checks/` | Local answer grading: safe expression compiler (`math-expr.ts`), symbolic equivalence (`symbolic.ts`), `grading.ts`, pending-check service |
| `lib/tutor/model/` | Pure student model v0 (practice estimate), evidence writer, mastery/misconception service |
| `lib/tutor/assessment/` | Restricted issue → submit → finalize assessment service on the `e2` seam; content gate; mastery projection |
| `lib/tutor/exposure/` | Help/exposure ledger, 48 h eligibility clock, attempt-assistance latch, quiet-window scheduler |
| `lib/tutor/session/` | Session state machine, coach heuristics, sitting clock, session rows |
| `lib/tutor/graph/` | Skill graph F1–F12 (`skill-graph.json`), next-skill selection, item-bank loader (no items ship) |
| `lib/tutor/report/`, `lib/tutor/progress/` | Parent report and weekly lead; learner progress view |
| `lib/tutor/{config,contracts,wire,ids}.ts`, `db/index.ts` | Constants, types, wire contracts, opaque ids, `Queryable` interface |
| `db/migrations/0001…0014` | PostgreSQL 17 schema `e2`: households, learners, attempts, append-only evidence/exposure events, projections, roles, RLS, SECURITY DEFINER functions |
| `db/migrate.cjs` | Forward-only, transactional, advisory-locked migrator with SHA-256 records (`--reapply` supported, `--down` refused) |
| `web/` | Next.js 15.5 / React 19 app: `/`, `/learn` (chat + record panel), `/parent` (household view), `POST /api/turn` (the single write path, calling `e2.append_practice` / `e2.record_exposure`). `web/lib/*` does not import root `lib/` |
| `tests/engine/run.cjs` | Transpiles `lib/` in memory and runs 16 cases on `node:sqlite`, in `baseline` (inherited mastery-forgery bugs reproduce) and `head` (fix refuses certification) modes |
| `tests/engine/{assessment,replay,content-parity}.cjs`, `tests/engine/pg/`, `tests/engine/exposure-pg/` | Suites against a real PostgreSQL 17 (they never start one) |
| `docs/decisions/` | 21 ADRs (0033–0067): product definition, practice vs certification, COPPA, naming, single SQL write path, Postgres ownership |
| `docs/product/`, `docs/research/`, `docs/history/` | Direction, spec v0.3, engine contract, drift log; market/efficacy/minors-legal/evidence-integrity research; dated founder notes and PR review rounds |
| `docs/{architecture,requirements,first-build,engine-acceptance}.md` | Intended boundaries, 2026-09-13 requirements snapshot, E1 brief, acceptance matrix |

Not copied: `legacy/` (archived earlier stack), `docs/vault/` (near-duplicate mirror of docs),
`tests/engine/evidence/` and `tests/engine/pg/evidence/` (run output).

## Tests

Requires Node >= 22.12 (uses `node:sqlite`). These commands are derived from `package.json`;
they were not run during the copy.

```sh
cd modules/trellis
npm ci                                   # typescript 6.0.3 + @types/node only
KAIZENEDU_TOOLCHAIN=$PWD/node_modules npm run typecheck
KAIZENEDU_TOOLCHAIN=$PWD/node_modules npm run test:engine          # offline, SQLite
KAIZENEDU_TOOLCHAIN=$PWD/node_modules npm run test:engine:baseline # shows the inherited bugs
```

PostgreSQL suites need your own PostgreSQL 17 and the `pg` module from `web/`:

```sh
npm --prefix web ci
E2_PG_MODULES=$PWD/web/node_modules KAIZENEDU_PG_ENV=/path/to/your-pg17.env npm run test:assessment:pg17
E2_PG_MODULES=$PWD/web/node_modules KAIZENEDU_PG_ENV=/path/to/your-pg17.env npm run test:replay:pg17
```

Web app: `cd web && npm ci && npm run dev`. Without `KAIZENEDU_PG_URL`,
`KAIZENEDU_PG_TUTOR_URL` and `KAIZENEDU_PG_REPORT_URL` (see `web/.env.example`,
`web/pg25.env.example`) it runs in demo mode. Migrations: `node db/migrate.cjs` or
`npm --prefix web run migrate`.

## Known issues

- Hard-coded fallbacks to another machine (`/Users/mann/...`) are in
  `tests/engine/harness/with-pg17.sh:7`, `tests/engine/pg/resolve-pg.cjs:10`,
  `tests/engine/harness/toolchain.sh:28`, `tests/engine/harness/import-closure.sh:7` and
  `tests/engine/exposure-pg/run-pg.sh:14-16`. Set the env vars above. `closure:hashes`
  cannot run here because it needs a KaizenEdu checkout at a fixed path.
- `ORIGINAL_README.md`, `THIRD_PARTY_NOTICES.md` and `docs/README.md` link to `legacy/` and
  `docs/vault/`, which were not copied.
- Both names, "Trellis" and "Kaizen", were blocked pending trademark clearance (`docs/README.md`).
- Status claims in the docs predate later work. The 118 inherited assessment items are
  unreviewed and no item bank ships, so certification is always `none`. One inherited
  concurrency race (`c3_concurrent_duplicate_disclosed`) is disclosed but not fixed. There
  is no CI.
- `web/` shows the 14-day escalation and quiet-window offer, but nothing drives them. It has no
  accounts, payments or COPPA flows.
- License: proprietary (Kaizen Academy LLC). `lib/tutor/` is adapted from MIT-licensed
  OpenMAIC-based KaizenEdu code, as recorded in `THIRD_PARTY_NOTICES.md`.

## Reuse plan

- Backend: use `db/migrations/` and `db/migrate.cjs` as the starting evidence schema
  (append-only events, projections, roles, RLS). Port the migrations deliberately; do not
  run them blind.
- Backend: use the SQL function API (`e2.issue_attempt`, `submit_attempt`, `finalize_attempt`,
  `record_exposure`, `append_practice`) and its idempotency and lock contract (`db/README.md`)
  as the mastery write path.
- Backend: `web/lib/db.ts` and `web/lib/practice.ts` show the pattern of a pg pool per role,
  `SET ROLE`, and serializable retries on 40001/40P01.
- Tutor: `lib/tutor/checks/` grades answers with no dependencies.
  `lib/tutor/exposure/` and `lib/tutor/model/student-model.ts` hold the eligibility clock
  and practice-estimate logic.
- Reference: `docs/decisions/` and `docs/research/` hold the reasoning behind
  practice ≠ mastery and the minors/legal gates.
