#!/bin/sh
set -eu
# PGHOST/KAIZENEDU_PG_URL: connect and prepare only; never start a server.
# Fallback for an unsandboxed operator: LC_ALL=en_US.UTF-8.
here="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec node "$here/cluster.cjs" up
