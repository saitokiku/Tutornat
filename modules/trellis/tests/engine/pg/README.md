# Native PostgreSQL authority reproduction

Builder round 2 passed criteria 0–4 and the E1 adapter/head suite on the PM's
PostgreSQL 17.11 server over TCP. E1 contains **16** cases; the issue's 15-case
count is stale. Literal commands, results and PID pairs are in
[EVIDENCE.md](EVIDENCE.md) and [reproduction.json](evidence/reproduction.json).

Use the existing synthetic cluster; workers never start a server:

```sh
set -a
. /Users/mann/pm/run/pg17.env
set +a
node tests/engine/pg/reproduce.cjs --base=ff65a54
```

Alternatively set `KAIZENEDU_PG_URL` to the synthetic PostgreSQL connection URI.
It takes precedence over `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` and other
standard `pg` connection settings. Passwords/URI credentials are never printed
in evidence. Each capability connection still authenticates as its dedicated
login, not the URI's owner; the fixture server must permit those logins (the PM
cluster uses local trust). The owner needs schema/role creation and superuser
fixture privileges for RLS controls and `pg_control_system()` identity checks.

Individual commands, with the same environment throughout:

```sh
sh tests/engine/pg/up.sh
node db/migrate.cjs
node tests/engine/pg/prove.cjs --case=c0
node tests/engine/pg/prove.cjs --case=c1
node tests/engine/pg/prove.cjs --case=c2
node tests/engine/pg/prove.cjs --case=c3
node tests/engine/pg/prove.cjs --case=c4
node tests/engine/pg/prove.cjs --case=c5
node tests/engine/pg/e1-test.cjs
sh tests/engine/pg/e1-run.sh --mode head --out-suffix pg
sh tests/engine/pg/down.sh
```

With `PGHOST` or `KAIZENEDU_PG_URL`, up verifies the actual server/version and
creates absent `e2`/`e2_migrations` schemas and fixture roles, recording their
OIDs plus cluster/database/owner identity in gitignored `external-state.json`.
Repeated up retains the receipt. Down drops only its recorded objects and
leaves the server running. Existing schemas/roles are retained. A changed target
or replaced object's OID refuses cleanup; role dependencies outside owned schemas
also refuse cleanup instead of cascading into another caller's objects. Keep the
receipt until down succeeds. Use one lifecycle run at a time per shared database;
other consumers must not add data to a disposable run's owned schemas.
`external-test.cjs` checks preservation, repeat calls and target-mismatch refusal
with an intentionally nonexistent server-tool directory. No external-mode code
invokes `postgres`, `initdb`, `pg_ctl` or `psql`.

Without either external setting, an **unsandboxed operator** can use the retained
self-managed fallback with **`LC_ALL=en_US.UTF-8`**. It requires the pinned local
PostgreSQL 17.11 binaries at `/usr/local/opt/postgresql@17/bin` (or `E2_PG_BIN`).
It creates a private local-trust Unix-socket cluster, no TCP listener, beneath
`data/` and `socket/`, then checks actual owner/data/socket/listen/version identity.
Managed down stops that owned cluster and retains data. This round did **not**
execute managed startup/stop; the worker cannot `initdb` because macOS sandbox
SysV shared memory is denied. Do not try starting a server from a worker.

The offline driver is pinned to `pg` 8.23.0, loaded from this checkout's
`node_modules`, the pre-existing read-only cache, or `E2_PG_MODULES`. No installs,
source-checkout changes, provider calls or package downloads are required.
`reproduce.cjs` uses a fresh physical base archive, keeps scratch writes under
`.tmp`, records every command and expected exit, and cleans up a prepared fixture
even after collector exceptions. `--down` on the migration runner is expected to
exit 1: forward-only history is separate from disposable fixture cleanup.

`prove.cjs` with no case runs each criterion in a separate process. The E1 suite
and SQLite adapter are unchanged; the PG preload also propagates the external
connection environment to the packed archive's child suite. Each proof logs the
actual server version, target, capability identities and backend PIDs.

| Criterion | Fixture and intended observation | Connection identities |
| --- | --- | --- |
| 0 | `c0`: four distinct backend PIDs, per-connection role, household, exact server version; too-few connections and privilege switch rejected | Four `e2_h1_<role>` logins, `SET ROLE` matching each capability |
| 1 | `c1`: migrations repeat/reapply, checksum mismatch, immutable history and frozen attempts, approved/unapproved controls, 48h −1ms/exact/+1ms/interior, skill revision, unrelated exposure, revocation, forced UUID/time collision, 1,105 practice rows | Owner fixture setup; assessment SQL operations; tutor practice/exposure |
| 2 | `c2`: learner/tutor/report raw/view/finalize writes and role/login escalation denied; authorized assessment result; injected indirect writer membership removed by reapply | Each dedicated role; owner only injects/removes the inherited-grant fixture |
| 3 | `c3`: all tenant tables/views hide household 2; writes denied; temporary insert grants isolate RLS WITH CHECK from ordinary grants, each with own-household control; private metadata denied | Each role bound to household 1, household-2 positive fixtures; owner grants rolled back |
| 4 | `c4`: same/different attempt races, attempt-row and skill-lock holds, issue/submit/finalize versus assistance, equal ledger timestamps with held scoring, content withdrawal, partial rollback, lost acknowledgment, serialization retry and later recovery | Independent assessment/tutor connections; owner only for observer, fault, content-review and counter fixtures |
| 5 | `e1-test.cjs` and unchanged E1 suite through native `pg`; the suite includes packed-archive execution | Separate `e1_fixture` role/schema; not E2 authority proof |

The [SQL caller seam](../../../db/README.md) specifies all six functions, roles,
returns, test-principal provisioning and lock order. `harness.cjs` exports
`owner`, `connect`, `open`, `provisionPrincipals`, `serverIdentity` and
`transaction` (`withTransaction` alias). `barriers.cjs` exports `gate`,
`waitBlocked`, `lockSkills`. Scoring/external effects stay outside retry callbacks.

Full E13 certification and correction-driven rebuilding remain integration work;
projections retain independent-success IDs with `certification='none'`. A/B must
call this seam on rebase. Part C does not claim product-route integration.
[E1-ADAPTER.md](E1-ADAPTER.md) records the native dialect/fixture bridge; the
unchanged E1 suite still exposes its existing practice concurrency defects.

Round 3 adds `c5` for offer transitions, races, sequence ordering, boundaries,
role/RLS refusals and atomic close. Use `--evidence-subdir=r3` with the collector
to preserve round-2 evidence; see the round-3 section of [EVIDENCE.md](EVIDENCE.md).
