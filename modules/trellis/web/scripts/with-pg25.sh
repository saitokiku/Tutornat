#!/bin/sh
# Run a command against the branch-local kaizenedu_25 database (never the shared kaizenedu_e2).
# Usage: sh web/scripts/with-pg25.sh node db/migrate.cjs
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
KAIZENEDU_PG_ENV="${KAIZENEDU_PG_ENV:-$here/pg25.env.example}"
export KAIZENEDU_PG_ENV
exec sh "$here/../tests/engine/harness/with-pg17.sh" "$@"
