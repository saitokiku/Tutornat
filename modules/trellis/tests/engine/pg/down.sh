#!/bin/sh
set -eu
# External mode removes only objects in this checkout's creation receipt.
here="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec node "$here/cluster.cjs" down
