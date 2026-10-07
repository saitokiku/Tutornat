# KaizenEdu

KaizenEdu is a household learning product for primary and elementary students. A child gets
homework help from **Trellis**, the tutor, and the family gets an **honest record** of what the
child can actually do on their own. Maths comes first; the shipped lesson is adding fractions with
unlike denominators, on synthetic content and synthetic names only.

## What the honest record guarantees

- **Practice never certifies.** Homework help and corrections practice are recorded and shown as
  progress. They never count toward mastery, at any weight.
- **Only unassisted, delayed evidence certifies.** A skill is proven only by an unassisted attempt
  on an unfamiliar item, at least 48 hours after the last instruction on that skill, repeated on a
  separate day. Any hint or answer exposure restarts that skill's clock; help during a check
  disqualifies the attempt.
- **Practice earns the check, not the credit.** Ten clean, hint-free reps make a skill eligible for
  a quiet window in which it is deliberately not taught, so the independent check can be offered.
- **No silent trap.** If help keeps landing on a skill and no quiet window can be taken within
  14 days, the parent is told plainly, with the plan.
- **Every claim audits to its evidence.** Each displayed mastery claim links back to the qualifying
  evidence event and the rule version in force. Only the restricted assessment role can append
  qualifying evidence; tutoring and reporting cannot. Corrections append, never relabel.
- **"Unassisted" means no assistance observed under the stated protocol.** A home browser cannot
  prove another person or device was absent, and nothing here claims otherwise.

The rules are enforced in PostgreSQL (`db/`), not in application code: one write path through
SQL functions, evidence classes on every event, a server-derived projection for reports.

## Layout

| Path | What it is |
|---|---|
| `web/` | The Next.js app: Trellis on `/learn`, the household view on `/parent`. Vercel settings in `web/README.md`. |
| `lib/` | The engine: checks, student model, assessment content gate, reports. |
| `db/` | The seam: schema `e2`, roles, migrations `0001`–`0014`, `db/migrate.cjs`. Contract in `db/README.md`. |
| `tests/` | The offline engine suite, the PostgreSQL suites (assessment, exposure, replay, qualification, content parity) and their evidence. |
| `docs/` | The product record: specification, decisions (ADRs), research, reviews. PM-owned. |
| `legacy/` | Bootstrap-era material kept for provenance, not used at runtime. See `legacy/README.md`. |

## Run it

Prerequisites: Node 22.12+, PostgreSQL 17 reachable through `PGHOST`/`PGPORT`/`PGUSER`/`PGDATABASE`
or `KAIZENEDU_PG_URL`. Nothing here starts a database server.

```sh
node db/migrate.cjs                                   # idempotent; applies 0001–0014
npm run -s typecheck                                  # engine typecheck, offline toolchain
npm run -s test:engine                                # offline engine suite (16 cases)
npm run -s test:assessment:pg17                       # E2 assessment suite on PostgreSQL
npm run -s test:replay:pg17                           # E3 replay suite
sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/content-parity.cjs
sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/pg/qualification.cjs

npm --prefix web install
npm --prefix web run typecheck
npm --prefix web run dev                              # http://localhost:3000/learn
```

`tests/engine/harness/with-pg17.sh` exports the cluster named by `KAIZENEDU_PG_ENV`
(default: the PM's `pg17.env`). Full suite documentation: `tests/engine/README.md`.

## Ownership

Product work now lives in [saitokiku/trellis](https://github.com/saitokiku/trellis), copied with
Git history from [gokumann-pm/kaizenedu](https://github.com/gokumann-pm/kaizenedu). The earlier
`saitokiku/KaizenEdu` and `saitokiku/Kaizen-AI` repositories are read-only sources; the files taken
from them, and their terms, are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
New work is under the proprietary [LICENSE](LICENSE).
