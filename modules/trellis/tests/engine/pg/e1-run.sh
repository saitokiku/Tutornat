#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
exec node --no-warnings --require ./tests/engine/pg/e1-preload.cjs tests/engine/run.cjs "$@"
