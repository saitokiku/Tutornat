#!/bin/sh
# Resolves the offline TypeScript toolchain for typecheck and the harness.
# Order: $KAIZENEDU_TOOLCHAIN (a node_modules directory containing typescript/
# and @types/node/), then ./node_modules, then the shared read-only cache the
# RO-5 research used. Prints the directory or exits 3. No network is used.
#
# Criterion 0 (r2): the resolved toolchain must carry exactly the versions the
# lockfile pins for the whole dev closure — typescript, @types/node and the
# transitive undici-types — or this exits 5. typecheck.sh re-checks TypeScript.
#
# r3 (review item 2): the lock is read from package-lock.json or, in a packed
# archive where npm never ships the lock, from npm-shrinkwrap.json (kept
# byte-identical; c0_package_inputs asserts that). undici-types is resolved the
# way TypeScript resolves it — Node module resolution starting from @types/node's
# own directory, so a copy nested under @types/node/node_modules/ wins over a
# hoisted one — and that resolved copy is the one checked against the lock.
set -eu
here="$(cd "$(dirname "$0")/../../.." && pwd)"
lock=""
for name in package-lock.json npm-shrinkwrap.json; do
  if [ -f "$here/$name" ]; then lock="$here/$name"; break; fi
done
if [ -z "$lock" ]; then
  echo "no lockfile: neither package-lock.json nor npm-shrinkwrap.json exists in $here" >&2
  exit 6
fi
for candidate in "${KAIZENEDU_TOOLCHAIN:-}" "$here/node_modules" \
  /Users/mann/pm/shared/eval/openclaw/prefix/lib/node_modules/openclaw/node_modules; do
  if [ -n "$candidate" ] && [ -f "$candidate/typescript/package.json" ] && [ -f "$candidate/@types/node/package.json" ]; then
    # Verify the resolved versions against the lock before trusting the directory.
    node - "$lock" "$candidate" <<'EOF' >&2
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const [lockPath, tool] = process.argv.slice(2);
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const pinned = (name) => lock.packages['node_modules/' + name].version;
const versionAt = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).version : null);
const resolved = {};
// typescript and @types/node are the entry points: the directories typecheck.sh hands to tsc.
for (const name of ['typescript', '@types/node']) {
  const p = path.join(tool, name, 'package.json');
  resolved[name] = { version: versionAt(p) ?? 'missing', at: p };
}
// undici-types is imported by @types/node's declarations, so the copy TypeScript loads is the
// first `undici-types` found walking node_modules directories up from @types/node — nested
// (@types/node/node_modules/undici-types) before hoisted. Module._nodeModulePaths is Node's own
// list for that walk. A toolchain directory that is not itself named node_modules (a test
// layout) is not on that walk, so the hoisted copy beside @types/node is the last resort.
{
  const from = path.join(tool, '@types/node');
  const candidates = [...Module._nodeModulePaths(from).map((d) => path.join(d, 'undici-types')), path.join(tool, 'undici-types')];
  const hit = candidates.map((d) => path.join(d, 'package.json')).find((p) => fs.existsSync(p));
  resolved['undici-types'] = hit ? { version: versionAt(hit), at: hit } : { version: 'missing', at: null };
}
const names = ['typescript', '@types/node', 'undici-types'];
console.error('toolchain-closure ' + names.map((n) => `${n}=${resolved[n].version} lock=${pinned(n)}`).join(' '));
console.error('toolchain-resolved undici-types at ' + (resolved['undici-types'].at ?? 'missing') + ' (lock: ' + path.basename(lockPath) + ')');
const bad = names.filter((n) => resolved[n].version !== pinned(n));
if (bad.length) {
  console.error('toolchain closure does not match ' + path.basename(lockPath) + ': ' + bad.join(', '));
  process.exit(5);
}
EOF
    echo "$candidate"
    exit 0
  fi
done
echo "no offline toolchain: set KAIZENEDU_TOOLCHAIN to a node_modules dir with typescript and @types/node" >&2
exit 3
