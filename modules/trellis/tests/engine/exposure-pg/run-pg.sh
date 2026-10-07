#!/bin/sh
# E2 part B on PostgreSQL 17, round 3: connects to the PM's already-running cluster over TCP
# (never starts one — the worker sandbox refuses SysV shared memory; ADR-0065). Connection from
# the environment: PGHOST PGPORT PGUSER PGDATABASE / KAIZENEDU_PG_URL (trust auth), exported here
# from /Users/mann/pm/run/pg17.env when absent, because part C's harness reads them from the
# process environment. Migrates forward (db/migrations, idempotent), seeds a run-scoped synthetic
# learner in household h1, and runs the cases through part C's role bindings.
#
#   sh tests/engine/exposure-pg/run-pg.sh [case ...]
#
# Results: tests/engine/evidence/results-pg.json (server version, connection, pids, every case).
set -eu
here="$(cd "$(dirname "$0")/../../.." && pwd)"
if [ -z "${PGHOST:-}" ] && [ -f /Users/mann/pm/run/pg17.env ]; then
  set -a
  . /Users/mann/pm/run/pg17.env
  set +a
fi
cd "$here"
exec node --no-warnings tests/engine/exposure-pg/run-pg.cjs "$@"
