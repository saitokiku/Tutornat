# Engine verification

E1 criteria: [docs/first-build.md](../../docs/first-build.md). The wider matrix is
[docs/engine-acceptance.md](../../docs/engine-acceptance.md).

## What runs here

`run.cjs` executes the closure in `lib/` (transpiled in memory by the pinned
TypeScript, no build output) against a `node:sqlite` adapter that speaks the
closure's PostgreSQL SQL with dialect-only rewrites. Every case runs in two modes:

| Mode | Meaning |
|---|---|
| `--mode baseline` | The inherited behaviour, recorded as an **observed failure baseline** (criterion 0). Adversarial cases assert the vulnerability reproduces. |
| `--mode head` | The containment. Adversarial cases assert certification is refused; positive practice controls assert the same facts as at baseline. |

```sh
sh tests/engine/harness/typecheck.sh                       # criterion 5: tsc --noEmit, offline
node --no-warnings --experimental-sqlite tests/engine/run.cjs --mode baseline
node --no-warnings --experimental-sqlite tests/engine/run.cjs --mode head
sh tests/engine/harness/import-closure.sh verify            # criterion 0: source hashes at the pinned commit
node tests/engine/harness/write-manifest.cjs               # regenerate closure-manifest.json
```

Outputs land in `tests/engine/evidence/results-<mode>.json` with the git HEAD, the
toolchain path, the runtime, and a SHA-256 of every source file loaded.

## E2 part A: the assessment suite (`assessment.cjs`)

`lib/tutor/assessment/` is the restricted service as a **caller of the E2 seam** (ADR-0066,
`db/README.md` "Exact SQL API"): issue → submit → finalize, exposure and practice are each one
`SELECT e2.<fn>(...)` inside one serializable transaction (C's `tests/engine/pg/harness.cjs`
`transaction`, retrying 40001/40P01), under the capability role the contract names. The service
holds no DDL, no roles and no locks: the functions lock (skill-first advisory locks, then guard
rows, then the attempt row). Scoring runs outside the transaction against the frozen item
version's key (`e2.items.answer_key`, readable by `assessment` only); the function stores the
first result and returns it to every retry. Errors carry the SQLSTATE: P0001 → `CONFLICT`,
P0002 → `NOT_FOUND`, 42501 → `FORBIDDEN`. The only write in the repository that does not go
through a function is E1's practice route (`checks/service.ts`), which takes C's
`(household, learner, skill)` advisory key (`assessment/exposure.ts`) before its re-read.

The suite runs on PostgreSQL only (the authority is PostgreSQL; the functions have no sqlite
counterpart) and never starts a server (ADR-0065). It connects to the cluster named by
`KAIZENEDU_PG_URL` or `PGHOST`/`PGPORT`/`PGUSER`/`PGDATABASE`, runs `db/migrate.cjs`
(idempotent), seeds households `h1`/`h2`, rule `e2-draft-1` and a rubric as the migration owner
(the trusted boundary), provisions the `e2_h<n>_<role>` logins with C's owner-only
`provisionPrincipals`, and opens one connection per capability (`SET ROLE`). Data isolation is by
unique ids per run: nothing is reset, nothing is dropped. Records land in
`evidence/results-assessment-pg.json` with the observed server identity and the login/pid of
every capability connection.

```sh
sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/assessment.cjs [case ...]
# or, with the cluster already in the environment:
node --no-warnings tests/engine/assessment.cjs
```

Every refused statement is recorded per statement as `{layer, sqlstate, message}`: `grant` =
42501 "permission denied" (the privilege check, before any function or trigger runs); `function`
= P0001/P0002/42501 raised inside an `e2.*` function (the documented contract); `trigger` = 55000
from `e2.freeze_attempt`/`e2.reject_mutation` (reachable only by the owner, since every
application role is stopped at the grant first).

| Case | Criterion | Kind |
|---|---|---|
| `c1_attempt_lifecycle_immutable` | 1 | issue/submit/finalize through the functions; frozen fields; same operation → same row, different arguments → P0001; 8 mutations as `assessment` → grant/42501, 7 as owner → trigger/55000; history byte-identical |
| `c2_duplicate_concurrent` | 2 | two backends finalize the same attempt: one result, one evidence row; two backends issue the same operation: one attempt |
| `c2_partial_failure_retry` | 2 | a throw after the call rolls everything back; retry produces the one result; a retry with a different score gets the first result; a different response → P0001 |
| `c2_conflicting_resubmission_and_ownership` | 2 | identical retry returns the row (also after finalization); changed response → P0001; another learner / another household → P0002 (RLS reads zero rows) |
| `c3_service_role_refusal` | 3 | the capability × function matrix through the service: only the contract's roles execute; `report` has no mutation entry point; the service surfaces `FORBIDDEN` + 42501 |
| `c3_sql_role_refusal` | 3 | every role, direct writes to evidence/attempts/projections/skill_guards, `SET ROLE e2_writer`, `e2.lock_skills` → grant/42501; only `assessment` reads `answer_key`; `e2_writer` is NOLOGIN |
| `c3_practice_route_race_pg` | 3 | **end to end on PostgreSQL**: E1's session tables (C's `e1-schema.sql`) in a private schema, two backends answer one pending check; the second is observed waiting on the advisory lock (`pg_stat_activity`), re-reads `NO_PENDING_CHECK`; one result row; the SQL key equals `JSON.stringify([household, learner, skill])` |
| `c4_trusted_content` | 4 | draft → P0001, missing → P0002, revoked → P0001; item or rubric revoked between issue and finalization → `content_not_approved`; a key edit → trigger/55000, a new key is a new version, the attempt stays at its frozen version |
| `c5_client_clock_and_ungraded` | 5 | `submitted_at` is the server clock inside an observed window, whatever the client claims; ungradable, wrong answer, wrong key, a forged `"true"`/`qualifying` score → `not_correct_or_ungraded` |
| `c5_assistance_latch_barrier` | 2, 5 | help between issue and finalization latches (`assistance_observed`, plus `delay_under_48h` since the last exposure is after issue time); a held `record_exposure` blocks the finalizer on the advisory lock; help after a result leaves it byte-identical and the next attempt sees the delay rule; practice never qualifies |
| `c6_projection_rebuild_and_invalidation` | 6 | `report_projection` = rebuild from `evidence_view`; a familiar item earns nothing; a post-hoc revocation is derived as withdrawn but the stored projection is unchanged — **disclosed**: the seam has no rebuild entry point (Interface ask) |

Not executable on the cluster and stated as such: the 48-hour boundary itself (48h−1ms / 48h).
The functions read `clock_timestamp()` and `e2.rule_versions` requires `delayHours ≥ 48`; there
is no fixture clock in the seam. The suite proves the two sides it can reach: an exposure before
issue → `delay_under_48h`, no exposure → no reason.

## Case map

| Case | Criterion | Kind |
|---|---|---|
| `c1_generated_null_id_chain` | 1 | adversarial: 12 tutor-authored checks, 6 sessions, 7 days |
| `c1_supplied_id_repeats` | 1 | adversarial: a bank id repeated is not authority |
| `c1_wrong_generated_key` | 1 | adversarial: generated key grades the wrong answer right |
| `c1_assisted_streak` | 1 | adversarial: assisted streak then one unaided success |
| `c1_direct_model_confirm_attempt` | 1 | adversarial: bypass the service, force the model layer |
| `c1_qualifying_write_refused` | 1 | invariant with negative test: no qualifying evidence writer exists |
| `c2_legacy_confirmed_consumers` | 2 | every imported consumer of a persisted `confirmed` row; rows intact |
| `c3_practice_positive_control` | 3 | positive control: graded once, misconception, abstention, duplicate refused |
| `c3_concurrent_duplicate_disclosed` | 3 | disclosed inherited race (not fixed in E1) |
| `c0_consumer_inventory` | 0, 2 | excluded consumers absent and unreferenced; no routes; inventory closed over the literal grep and the broad mastery-status grep (r3) |
| `c0_package_inputs` | 0 | `npm pack` for real into a temp dir, unpack, run `typecheck.sh` and `run.cjs --mode head` inside the archive — both must exit 0; packed notices carry the MIT text; packed `npm-shrinkwrap.json` equals `package-lock.json` (r3) |
| `c0_toolchain_resolution` | 0 | eight synthetic toolchain layouts: the gate checks the `undici-types` copy TypeScript resolves (nested under `@types/node` before hoisted); a nested/hoisted conflict exits 5 (r3) |
| `c2_raw_confirmed_label` | 2 | kills M07: the raw legacy status never reads as confirmed |
| `c2_weekly_headline_raw_status` | 2 | kills M08: the weekly headline ignores raw `confirmed` |
| `c3_check_completion_phase` | 3 | kills M10: deadline and open diagnostic honoured after a check |
| `c0_closure_manifest` | 0, 5 | copied files match pinned source hashes except declared changes |

The packed archive is self-verifying: `npm pack`, `tar -xzf`, then the two commands above
inside `package/` (the lock ships as `npm-shrinkwrap.json`; `toolchain.sh` reads either
name). Inside the archive `c0_package_inputs` runs at `KAIZENEDU_PACK_DEPTH=1` and records
that it did not re-pack; the outer run asserts on the inner exit codes. The inner suite runs
in the outer run's mode, so in the differential the off-diagonal cells (head mode on the
baseline closure and vice versa) also fail `c0_package_inputs`: the packed archive of that
closure fails its own checks for the same behavioural reasons the outer run does.

## E2 part B — exposure ledger, eligibility clock, latch, scheduler (issue #4, round 3)

Round 3 (ADR-0066, one write path in SQL): `lib/tutor/exposure/` is a caller of part C's
`e2.*` functions. Every write is `e2.record_exposure` (help, every modality, before delivery),
`e2.append_practice` (practice rows) or, for the scheduler, `e2.offer_transition` (round 4:
migration 0003 is C's; the scheduler is a pure caller with deterministic operation IDs). The
attempt latch is read from `e2.attempts` and sealed by `e2.finalize_attempt`. No barrier, no
DDL, no `FOR UPDATE` and no advisory lock protocol of this part's own remain; the scheduler
takes the seam's skill lock key inside its one transaction.

The cases therefore run on PostgreSQL only (`node:sqlite` cannot host the functions); the
SQLite suite keeps E1's 16 cases and a read-only mirror of `e2.skill_guards` so the practice
route's eligibility read answers "no exposure" there.

### PostgreSQL

`tests/engine/exposure-pg/run-pg.cjs` runs on part C's harness (`tests/engine/pg/harness.cjs`:
`pg` 8.23.0, capability logins `e2_h1_<role>`, `SET ROLE`, serializable transactions with
retries) against the PM's cluster. It migrates forward, seeds a run-scoped synthetic learner
in `h1`, and leaves its append-only rows in place.

```sh
set -a; . /Users/mann/pm/run/pg17.env; set +a
sh tests/engine/exposure-pg/run-pg.sh [case ...]        # results: tests/engine/evidence/results-pg.json
```

| Case | Reviewer finding / criterion | What it proves |
|---|---|---|
| `b1_atomic_multi_skill_and_issue_order` | finding 1 (crit. 1, 4, 6) | one function writes the event and every affected skill; a replay returns the stored row and repairs nothing because nothing is partial; a delivery that throws is not redelivered on replay; an issue during an uncommitted exposure blocks on the skill lock (observed via `pg_blocking_pids`), then freezes the exposure's sequence and is refused at the seal (`delay_under_48h`) |
| `b2_seal_vs_delivery` | finding 2 (crit. 1, 4) | the seal blocks on the exposure writer; nothing is delivered before the commit; the seal reports `assistance_observed`; seal-first leaves the stored result intact while later help resets the clock |
| `b3_replay_never_redelivers` | finding 3 (crit. 1, 4, 6) | 36 combinations (3 modalities × 4 kinds × 48 h / 49 h / 7 d aged on the server): the resume returns the stored row and delivers nothing; a retry with different skills is `P0001` and delivers nothing |
| `b4_scheduler_concurrency_and_revalidation` | finding 4 (crit. 5) | two-connection offer race and take race serialize on the skill lock (one offer, one take); a take after help is revalidated by sequence, restarted and refused; callers cannot write the offer ledger directly (`42501`); the seam refuses a second open offer and a second take (`P0001`); nine clean reps is a practice estimate and the seam refuses an offer at nine (`practice_priority_not_reached`); 13 d waits, 14 d (the threshold) and 15 d escalate |
| `b5_boundary_server_time` | crit. 2 | 48 h −1 ms / −1 µs / exact / +1 µs / +1 ms against the server's `now()` in one transaction, matched to a SQL oracle |
| `b6_cross_session_help` | crit. 3 (RO-5) | help in session A is seen by a check in session B and refused at the seal; an unrelated skill qualifies |
| `b7_duplicate_operation_two_connections` | crit. 6 | the same operation from two connections collapses onto one row; conflicting arguments are `P0001` |
| `b8_all_skills_fallback_records_every_skill` | issue #14 (r3 mutant M03) | with no explicit and no session skills, the all-skills fallback records every skill it was given (C order) in the one row and resets each clock; a skill outside the list is untouched |
| `b9_practice_check_reads_cross_session_exposure` | issue #14 (r3 mutant M10) | E1's tables in a private schema: help on F1 in session A makes a practice check on F1 in session B `assisted` with zero in-session hint rows; a check on F2 is not |

The reviewer's literal scripts (`independent-pg.cjs`, `replay-pg.cjs`) target the round-2
design (schema `e2b`, `schema.sql`, `pg-client.cjs`, `markAttemptIssued`); pointed at this
head they stop before any observation because those files no longer exist. Their findings
are re-expressed as `b1`–`b4` above.

## What this is not

`node:sqlite` is not PostgreSQL. Nothing here proves row locking, roles, RLS,
grants or trigger behaviour on a real database. There is no CI workflow in this
repository; a green run here is a local result and is reported as such.
