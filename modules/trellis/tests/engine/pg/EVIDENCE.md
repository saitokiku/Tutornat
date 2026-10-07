# E2-C evidence — native PostgreSQL passed (builder rounds 2–4)

This worker executed the shared-cluster reproduction itself. It returned:

```json
{"pgProven":true,"failed":[]}
```

Observed run: **2026-09-17 02:43:36 CDT** through **2026-09-17 02:44:05 CDT**. Actual server:
`PostgreSQL 17.11 (Homebrew)`, `server_version_num=170011`, target
`127.0.0.1:5433/kaizenedu_e2`, owner login `kaizen_owner`.
[Server observation](evidence/pg-version.log),
[full command/exit manifest](evidence/reproduction.json),
[collector output](evidence/reproduce.log). This supersedes the round-1 sandbox
blocker; the PM's earlier unsandboxed evidence remains in commit `70b6e6d`.

```sh
set -a
. /Users/mann/pm/run/pg17.env
set +a
node tests/engine/pg/reproduce.cjs --base=ff65a54
```

Every command returned its expected exit. The migration down refusal deliberately
returned **1**; the other commands returned **0**. The base archive is
`ff65a54abe83da9c0ab9b93dcc2c30afc17c2185`. The manifest records literal argv,
working directories and base/head source hashes. Source checkouts were preserved.

## Criterion 0 — PASS, native PostgreSQL

```json
{"case":"c0","status":"PASS"}
```

Four independent connections observed the exact server version and household
`h1`. Their backend PIDs were **53239, 53241, 53243, 53244** (learner, tutor, report, assessment).
Own-learner count was 1; privilege switching returned SQLSTATE `42501`;
requesting fewer than four connections was rejected.
[Full c0 output](evidence/pg-c0.log).

[External lifecycle controls](evidence/pg-external-lifecycle.log) passed with
`E2_PG_BIN=/nonexistent/no-server-tools-allowed`: repeated up retained the same
receipt, repeated down was a no-op, a mismatched target was refused, all recorded
objects disappeared and pre-existing schema/role OIDs remained identical.
The postmaster start timestamp remained unchanged. The same native controls
[also passed with KAIZENEDU_PG_URL](evidence/pg-url-lifecycle.log) overriding an
intentionally invalid PGHOST. [Up](evidence/pg-up.log) and
[down](evidence/pg-down.log) used the external connection, never server tools.
[Post-cleanup inventory](evidence/pg-post-cleanup.log) connected successfully and
found zero remaining fixture schemas or roles.

## Criterion 1 — PASS, migrations and immutable authority

```json
{"case":"c1","status":"PASS"}
```

[Full c1 output](evidence/pg-c1.log) records unchanged migration replay, explicit
reapply, checksum-mismatch rejection, approved/unapproved controls, identical
issue/result retries and conflicting operation/response refusals. All 18
UPDATE/DELETE/TRUNCATE history attempts returned `55000`; frozen and terminal
attempt changes were refused. A forged supported-certification projection failed
its check. The 48-hour boundary results were false at −1 ms and true at exact,
+1 ms and +12 hours. Skill revision retained exposure history, unrelated exposure
preserved eligibility, revocation prevented credit, and UUID collision preserved
the first result. The burst stored **1,105 practice rows, zero qualifying**.
[Migration output](evidence/pg-migrate.log),
[expected down refusal](evidence/migration-down-refusal.log).

## Criterion 2 — PASS, capability authority

```json
{"case":"c2","status":"PASS"}
```

Learner/tutor/report raw and view writes, direct finalization, role escalation and
login impersonation were refused with `42501`. Each had its own-household read
control; assessment finalized one qualifying result. An injected indirect writer
membership first permitted escalation, then migration reapply removed it and
restored denial. [Full c2 output](evidence/pg-c2.log).

## Criterion 3 — PASS, household isolation

```json
{"case":"c3","status":"PASS"}
```

The 128-entry capability/table/view matrix and 48 RLS probes passed.
Foreign-household reads were empty and writes refused, alongside own-household
positive controls. Temporary grants isolated WITH CHECK behavior from ordinary
grant denial and were rolled back. Private principal/migration metadata and
household-GUC spoofing were denied. Every tenant table had enabled and forced
RLS. [Full c3 output](evidence/pg-c3.log).

## Criterion 4 — PASS, barriers and recovery

```json
{"case":"c4","status":"PASS"}
```

Every database-lock barrier observed `wait_event_type='Lock'` and the expected
blocker inside `pg_blocking_pids(waiter)`. The two JavaScript gates hold the
caller before SQL finalization or after the serializable read, respectively;
they are identified separately below and do not claim a PostgreSQL lock wait.
For PG rows, PID A is waiter and B is blocker; for JS gates, A is held caller and
B is competitor. [Full c4 observations and results](evidence/pg-c4.log).

| Barrier assertion | PID A | PID B | Observed boundary |
| --- | --- | --- | --- |
| `same_attempt_finalization/blocked` | 53319 | 53318 | PG advisory |
| `attempt_row_boundary/attemptRowBlocked` | 53318 | 53321 | PG transactionid |
| `attempt_row_boundary/rowSecondBlocked` | 53319 | 53318 | PG advisory |
| `concurrent_rollback_recovery/blocked` | 53319 | 53318 | PG advisory |
| `different_attempts_projection/blocked` | 53319 | 53318 | PG advisory |
| `issue_submit_boundaries/issueBlocked` | 53319 | 53320 | PG advisory |
| `issue_submit_boundaries/submitBlocked` | 53319 | 53320 | PG advisory |
| `approval_revocation_boundary/blocked` | 53319 | 53322 | PG advisory |
| `provider_boundary_equal_timestamps` | 53318 | 53320 | javascript_gate_before_finalize |
| `assistance_lock_boundary/blocked` | 53319 | 53320 | PG advisory |
| `later_assistance_preserves_completed_result/blocked` | 53320 | 53318 | PG advisory |
| `serializable_retry` | 53323 | 53324 | javascript_gate_after_serializable_read |

Same-attempt contenders returned one stored result/evidence row. Different
attempts retained both projection contributions. Rollback let the contender
commit once; issue/submit/finalize respected assistance order. Held scoring with
equal receipt timestamps still detected assistance by causal sequence. Content
revocation forced a serializable retry and disqualified the result. Later help
preserved finalized history. Injected projection failure rolled back evidence and
attempt state; a simulated lost acknowledgment recovered the single committed
result. The counter fixture observed SQLSTATE `40001`, callback runs `[0,1]`,
value 2, and a later recovery to 3.

## Criterion 5 — PASS, unchanged E1 on PostgreSQL

```json
{"summary":{"mode":"head","cases":16,"failures":0,"loadedSourceFiles":23}}
```

[Native E1 adapter controls](evidence/pg-e1-adapter.log) passed native JSON,
aggregate and cast behavior, named/missing binding controls, immutable-write
negatives, same-time ordering, namespace collision, closed-adapter rejection and
schema cleanup on close/normal exit. [Native E1 head](evidence/pg-e1-head.log)
passed **16/16**, including its packed archive child on PG. The literal legacy
SQLite header is unchanged; emitted database metadata identifies the PG adapter.
[Base SQLite](evidence/e1-base-sqlite.log) and
[head SQLite](evidence/e1-head-sqlite.log) also passed **16/16**; suite and SQLite
adapter hashes match base. The issue's **15** cases was stale; **16** is correct.

[Syntax and diff checks](evidence/final-local-controls.log),
[typecheck](evidence/typecheck.log) and all nine
[local helper/binding/scope controls](evidence/local-controls.log) passed.
[CI inspection](evidence/ci-workflows.log) returned zero configured workflows;
these are local native reproductions, not a CI or blind-review sign-off.

## Published seam and execution limits

[db/README.md](../../../db/README.md) is A/B's ADR-0066 caller contract: exact
signatures, execution roles, return/retry behavior, skill-first locking and test
principal provisioning. Its exact **20-line JavaScript example** and provisioning
SQL were extracted and executed on this cluster: one finalized attempt, one
qualifying evidence row, one subsequent exposure. The five observed catalog
signatures all return jsonb. [Literal sample result](evidence/pg-seam-example.log).
The extraction/seed runner is archived at
`/Users/mann/pm/shared/artifacts/kaizenedu-5-r2/seam-check.cjs`.

No server was started or stopped in this round. **The self-managed fallback's
startup/stop was not executed**; it requires an unsandboxed operator with
`LC_ALL=en_US.UTF-8`. No A/B product route or full E13 certification/rebuild was
executed or claimed. The new shared SQL seam passed; A/B still need their rebases
and integration tests. The scorer and migration owner remain trusted. No
`docs/`, SPEC, DIRECTION, source checkout or A/B file was edited.

## Round 3 — assessment offers seam, c5 PASS

The final full reproduction returned `pgProven:true`, `failed:[]` on the same
shared PostgreSQL 17.11 server (`127.0.0.1:5433`). The observed final run was
**2026-09-17 03:33:58 CDT–03:34:29 CDT**. Its isolated synthetic database was
`e2_c_r3_4dad7d76715641709e0e37a680b1ca4e`; all c0–c5 proofs, native E1 adapter,
typecheck and local controls passed. The unchanged native E1 suite remains
**16/16**; both head/base SQLite controls also passed. The migration down refusal
returned its expected exit 1. [Manifest](evidence/r3/reproduction.json),
[collector](evidence/r3/reproduce.log), [native E1](evidence/r3/pg-e1-head.log).

Exact commands (the local artifact env selects the isolated database in **both**
PGDATABASE and KAIZENEDU_PG_URL; the URI takes precedence):

```sh
set -a
. /Users/mann/pm/run/pg17.env
. /Users/mann/pm/shared/artifacts/kaizenedu-5-r3/database.env
set +a
node tests/engine/pg/reproduce.cjs --base=469a70d --evidence-subdir=r3
```

No PostgreSQL server was started. A fresh database was created on the existing
server; the harness performed its external lifecycle checks there. Existing
round-2 evidence is retained. Base `469a70d` E1 source/adapter hashes are unchanged
in the manifest. All fixtures are synthetic and offline.

The new [c5 proof](evidence/r3/pg-c5.log) records actual lock observations, with
both backend PIDs at every barrier:

| Case | Held PID | Competitor PID | Observed outcome |
| --- | --- | --- | --- |
| Same operation offer race | 44232 | 44233 | Advisory block; both get same row; one open offer |
| Same operation take race | 44232 | 44233 | Advisory block; both get same take; offer closed |
| Distinct operation offer race | 44232 | 44233 | Advisory block; second gets P0001; one offer |
| Stale repeatable-read snapshot | 44232 | 44233 | Snapshot/read barrier; new offer committed first; stale caller gets 40001 |
| Help then take | 44234 | 44233 | Advisory block; help commits first; take gets P0001 with JSON reason help_after_offer |

The same-transaction offer/help test forces exactly equal timestamps, observes
exposure sequence growth, refuses the take and commits an explicit restart.
An old offer remains invalid even after the new exposure's 48-hour window has
elapsed. Exact take retries after later help return the stored take; changed
requests fail. A closed offer retry returns that current stored row.

48-hour checks at −1 µs / exact / +1 µs return refusal / offer / offer. A rule
with a 72-hour delay refuses after 60 hours. Escalation checks at 14 days −1 µs /
exact / +1 µs / +1 day return refusal / escalation / escalation / escalation.
Reason and plan are computed from stored rules/priority, with no certification.
A taken check with a deliberately earlier transaction timestamp still suppresses
escalation through causal sequence. Ready windows and already-taken checks also
refuse escalation. Malformed string booleans do not earn practice priority.

Direct owner insert attempts independently exercise all three partial unique
indexes (`23505`). Owner UPDATE/DELETE/TRUNCATE controls exercise full-row
immutability (`55000`), including household, rule, offer reference, identity
sequence, operation/request/reason/provenance. Reopening is refused; closing is
allowed. Injecting a failure at close rolls back the transition insert and
retains the open offer; retry then succeeds. Report EXECUTE, every capability's
direct writes/internal lock call, and cross-household access are refused, with
positive reads/offer rows in both households. Missing resources give `P0002`.

### Existing B fixture adoption and initial failed candidate

The initial red test failed because the function was absent:
[red c5](evidence/r3/red-c5.log). The first candidate migration run accidentally
used the canonical `kaizenedu_e2` database because its URI overrode PGDATABASE.
Its `CREATE TABLE IF NOT EXISTS` encountered B's provisional table; the new
function then failed on missing `operation_id`:
[initial failure](evidence/r3/initial-target-failure.log).

The finalized migration explicitly adopts that provisional table. Its adoption
was executed on `kaizenedu_e2` under the migration advisory lock and exclusive
table lock. All **18** pre-existing rows retained every original column; only
new operation/request/causal/provenance metadata was filled. The uncommitted,
round-3 development candidate's checksum receipt was repaired in that same
transaction, with old/new checksums captured; migrations 0001/0002 and their
receipts were untouched. This was a development-fixture repair, not a change to
a published historical migration. An ordinary migration replay then reported
all three files unchanged, and tutor's interim UPDATE(open) was denied:
[adoption and receipt record](evidence/r3/adoption.log).

Final c5 also passed directly on `kaizenedu_e2` after adoption:
[canonical shared-database proof](evidence/r3/shared-c5.log). Its barrier PID
pairs are recorded there. Future fresh/adoption runs use the regular migration
runner; no receipt repair is needed.

The [caller contract](../../../db/README.md#assessment-offers--sixth-signature-round-3)
records the differences from B's proposal and the required stable operation ID.
Native rows have full causal provenance; legacy provisional rows explicitly
retain timestamp-based priority accounting because their original causal
sequence was never stored. B's scheduler integration and the designated external
Fable blind review were **not executed** in this round. An additional read-only
Astra review found no blocking defects after the causal-order correction.

The isolated database was removed after the run; the canonical shared database
and all 18 adopted rows remain. The server was still reachable and the function
owner/security/search-path were observed afterward:
[final cluster check](evidence/r3/final-cluster.log). To reproduce now, use the
canonical environment without the deleted isolated target:

```sh
set -a
. /Users/mann/pm/run/pg17.env
set +a
node tests/engine/pg/reproduce.cjs --base=469a70d --evidence-subdir=r3-review
```


## Round 4 — A's six interface asks (native PASS)

Implementation commit: `95d37cb76edd4ad27dc91bf23c3395b51a466dc3`.
Builder observed startup: **2026-09-17 03:55:48 CDT**. Final collector ran
**2026-09-17 04:14:56 CDT** through **2026-09-17 04:15:37 CDT** on the existing shared
PostgreSQL **17.11**, `127.0.0.1:5433/kaizenedu_e2`, owner `kaizen_owner`.
No server was started. The [command manifest](evidence/r4/reproduction.json)
records commands, explicit cross-head environment, exit codes and source hashes;
[collector output](evidence/r4/reproduce.log) ends with the literal:

```json
{"pgProven":true,"failed":[],"artifact":"tests/engine/pg/evidence/r4/reproduction.json"}
```

Reproduce with the shared environment:

```sh
set -a
. /Users/mann/pm/run/pg17.env
set +a
node tests/engine/pg/reproduce.cjs --base=ec49bbd --evidence-subdir=r4-review
```

All existing native cases **c0–c5** and new **c6** pass. Each is independently
selectable using `node tests/engine/pg/prove.cjs --case=c6`.
[New c6 literal output](evidence/r4/pg-c6.log),
[existing c0](evidence/r4/pg-c0.log), [c1](evidence/r4/pg-c1.log),
[c2](evidence/r4/pg-c2.log), [c3](evidence/r4/pg-c3.log),
[c4](evidence/r4/pg-c4.log), [c5](evidence/r4/pg-c5.log).
The local controls pass **9/9** and typecheck exits 0.

### 1. Queued FixtureDb.transaction — E1 16/16 at both heads

The missing-method regression was executed before implementation:
[adapter red](evidence/r4/adapter-red.log), literal
`TypeError: db.transaction is not a function`. The native adapter test now forces
a PostgreSQL division-by-zero failure, verifies rollback, then commits the next
queued callback. Only `tx-committed` remains; `tx-rolled-back` does not.
[Adapter controls](evidence/r4/pg-e1-adapter.log).

C's head through PostgreSQL:

```json
{"summary":{"mode":"head","cases":16,"failures":0,"loadedSourceFiles":23}}
```

A's **b176c81** through C's adapter:

```json
{"summary":{"mode":"head","cases":16,"failures":0,"loadedSourceFiles":24}}
```

C's native SQLite control:

```json
{"summary":{"mode":"head","cases":16,"failures":0,"loadedSourceFiles":23}}
```

[Full C PostgreSQL log](evidence/r4/pg-e1-head.log),
[full A PostgreSQL log](evidence/r4/pg-e1-a-head.log),
[native SQLite log](evidence/r4/e1-head-sqlite.log). The unchanged E1 header
still prints its literal SQLite label; the preceding adapter header records the
actual PostgreSQL connection. Both package-nested suites also pass 16/16.
The collector uses `git worktree add --detach` at
`b176c81e6b3a9e625849e12fd779539c9ab4fec8`, reads A's source through the current preload, redirects only
result JSON, verifies `aScratchStatus=""` plus `git diff --exit-code`, and removes
its own scratch worktree. It does not patch A's adapter or any A source.

### 2. E11 projection rebuilding and retained rule versions

The explicit `rebuild_projection(learner, skill DEFAULT NULL)` is preferable to
a revocation trigger because a trigger would take skill locks after content
locks. Commit the owner-side revocation, then call rebuild as assessment in a
new transaction. Rebuild uses each retained row's immutable qualifying decision
and rule/skill version, excludes item or rubric revocations, and preserves causal
ID order. It does not rescore history under the newest rule. Finalize also
rebuilds, so later evidence cannot resurrect withdrawn contributors.

The native proof observed identical contributor IDs before/after an unchanged
rebuild: `[["19db2dec-1309-4f1b-a710-ce41ad1c2211"]]`. After item revocation the original rule
partition is empty, while the separate 72-hour rule partition retains its ID.
A dedicated rubric withdrawal also empties its projection. A later finalize
keeps only its new contributing ID, and original final results remain identical.
A fixture rule with `delayHours=72` rejects at 48 hours, accepts at 72, and its
rebuilt partition preserves those decisions.

### 3. E02 fixture clock through finalize_attempt

The migration owner must opt the fixture database in and call the owner-only
`set_fixture_clock(timestamptz)` setter. It uses SET LOCAL plus protected backend
and transaction metadata; raw GUC assignment cannot enable the hook. This is
necessary because PostgreSQL does not expose SET versus SET LOCAL provenance
when reading a custom GUC. Default is real server time. The code also rejects an
owner session that has assumed an application role.

Through issue → submit → finalize, the **48h−1ms / exact / +1ms** results are
**false / true / true**, with server-stored issue/exposure timestamps printed in
[c6](evidence/r4/pg-c6.log). The actual assessment spoof observation is:

```json
{"guc":"2000-01-01T00:00:00Z","before":"2026-09-17T09:15:16.138Z","after":"2026-09-17T09:15:16.148Z","issuedAt":"2026-09-17T04:15:16.139793-05:00","submittedAt":"2026-09-17T04:15:16.141018-05:00","finalizedAt":"2026-09-17T04:15:16.14307-05:00","ignored":true}
```

An owner using SET ROLE assessment also gets real server time, and an unarmed
owner GUC is ignored. The owner fixture transaction rolls back its opt-in,
principal binding, clock marker and boundary data.

### 4. expire_attempt / cancel_attempt

All four paths (`issued`/`submitted` × `expired`/`cancelled`) pass through the
assessment functions. Exact retries return identical stored rows, evidence count
stays **0**, and finalize returns **P0001**. Immutable events contain the initial
states plus exactly one terminal transition. No automatic expiration policy is
claimed.

### 5. practice_check — two connections at the lock boundary

A companion `queue_practice_check` registers immutable pending state inside e2;
A must call it when issuing practice checks. `practice_check` takes the skill
lock, re-reads pending state, and consumes it through a unique evidence link.
Its payload requires `checkId`. The caller never acquires locks.

Native waiter **11746** was observed at **Lock/advisory**,
blocked by **11745**. Outcomes were one `ok:true` result
and `{"ok":false,"code":"NO_PENDING_CHECK"}`; exactly one evidence row was
`corrections-practice`, `qualifying=false`, despite a forged qualifying payload.
The second caller ran through the serializable transaction harness. A subsequent retry
adds nothing, and an injected transaction rollback leaves the check pending.
The new 20-entry function/role matrix checks actual denied EXECUTE calls, owners,
SECURITY DEFINER/search path, and cross-household invisibility/refusals.

### 6. Immutable event per attempt transition

Native issue/submit/finalize counts are **[1,1,1]**, including repeated issue,
submit and finalize calls. Retries append **0** events. Owner UPDATE/DELETE/
TRUNCATE of `attempt_events` each fail **55000**; application writes fail **42501**;
h2 sees zero h1 rows. Every tenant table, including the new ones, has enabled and
forced RLS. Existing lifecycle timestamps are backfilled with explicit
`migration-0004-reconstructed` provenance and unavailable-snapshot labels.

### Corrections, review, and limits

The [initial c6 red](evidence/r4/c6-red.log) proves the rebuild signature was
absent. The first installed candidate hit PostgreSQL's DISTINCT/collation order
error ([literal](evidence/r4/c6-first.log)); the next run reached a PL/pgSQL
record/alias ambiguity ([literal](evidence/r4/c6-second.log)). Forward migrations
0005 and 0006 correct these findings and set protected fixture-table RLS. Their
predecessor migration checksums were preserved. The final collector reruns all
migrations with `--reapply`, then executes every native case successfully.

The shared-content lock fix also has a deterministic two-learner/two-item proof:
an owner holds the high item's content guard, the first finalizer is observed
blocked there, and the second is observed blocked on the first. After release,
both finalize successfully with **retries=0**. This covers ordering across
learners, where their skill locks do not serialize them.

An additional [internal Astra code review](evidence/r4/internal-review.md) has
no remaining findings after its two test recommendations were implemented.
The appointed Claude/Fable **blind review was not executed** by this builder.
[GitHub reports zero CI workflows](evidence/r4/ci-workflows.log), so no CI-green
claim is made. A's route integration, including removal of its application lock,
was **not executed**: A's files are read-only and the new callable contract is
in [db/README.md](../../../db/README.md#part-a-interface-additions-round-4).

[External cleanup](evidence/r4/pg-down.log) reports `createdByRun:[]`: the canonical
schema/roles pre-existed and were retained. Synthetic UUID histories and forward
migrations remain in that shared schema; temporary test guards/triggers and
scratch worktrees are removed by their owners. No pre-existing schema, role,
source checkout or server was deleted or stopped.
