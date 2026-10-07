#!/bin/sh
# Run a command with the shared PM PostgreSQL 17 cluster's connection settings
# exported (ADR-0065: the suite never starts a server). Usage:
#   sh tests/engine/harness/with-pg17.sh node tests/engine/assessment.cjs --db pg
set -eu
set -a
. "${KAIZENEDU_PG_ENV:-/Users/mann/pm/run/pg17.env}"
set +a
exec "$@"
