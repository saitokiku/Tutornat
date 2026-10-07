#!/bin/sh
# Typecheck the engine closure (lib/**) with the pinned TypeScript, offline.
# legacy/, tests/, docs/ and web/ are excluded by tsconfig.json.
set -eu
here="$(cd "$(dirname "$0")/../../.." && pwd)"
tool="$(sh "$here/tests/engine/harness/toolchain.sh")"
version="$(node -e "console.log(require('$tool/typescript/package.json').version)")"
pinned="$(node -e "console.log(require('$here/package.json').devDependencies.typescript)")"
echo "typescript=$version pinned=$pinned toolchain=$tool"
if [ "$version" != "$pinned" ]; then
  echo "toolchain TypeScript $version does not match the pinned $pinned" >&2
  exit 4
fi
cd "$here"
exec node "$tool/typescript/bin/tsc" -p tsconfig.json --typeRoots "$tool/@types"
