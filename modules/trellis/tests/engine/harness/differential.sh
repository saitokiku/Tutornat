#!/bin/sh
# The base/head differential for the engine suite (E2 part B, issue #4). Four cells:
#   head mode at head, baseline mode at head          — this checkout
#   head mode at base, baseline mode at base          — the head HARNESS (run.cjs, the cases,
#                                                        the SQLite fixture, package.json) run
#                                                        against the BASE closure (lib/) exported
#                                                        with `git archive` into a temp directory
# Logs land in tests/engine/evidence/<mode>-mode-at-<cell>.log with the exit code appended;
# result JSON in tests/engine/evidence/results-<mode>[-at-baseline|-at-head].json.
#   sh tests/engine/harness/differential.sh [base-commit]   (default: the merge-base with main)
set -u
here="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$here"
base="${1:-$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main)}"
out="$here/tests/engine/evidence"
mkdir -p "$out"
run_cell() { # mode label dir suffix-args...
  mode="$1"; label="$2"; dir="$3"; shift 3
  (cd "$dir" && node --no-warnings --experimental-sqlite tests/engine/run.cjs --mode "$mode" "$@") > "$out/$mode-mode-at-$label.log" 2>&1
  echo "exit=$?" >> "$out/$mode-mode-at-$label.log"
  tail -1 "$out/$mode-mode-at-$label.log"
}
echo "head=$(git rev-parse HEAD) base=$base"
run_cell head head "$here"
run_cell baseline head "$here" --out-suffix at-head

tmp="$(mktemp -d "${TMPDIR:-/tmp}/kaizenedu-base-XXXXXX")"
git archive "$base" | tar -x -C "$tmp"
# The head harness over the base closure.
cp tests/engine/run.cjs "$tmp/tests/engine/"
cp tests/engine/harness/sqlite-db.cjs "$tmp/tests/engine/harness/"
cp package.json "$tmp/package.json"
export KAIZENEDU_PACKED_FROM="$base (base closure exported by git archive; head harness)"
run_cell head baseline "$tmp" --out-suffix at-baseline
run_cell baseline baseline "$tmp" --out-suffix at-baseline
cp "$tmp/tests/engine/evidence/results-head-at-baseline.json" "$tmp/tests/engine/evidence/results-baseline-at-baseline.json" "$out/"
rm -rf "$tmp"
echo "differential written to $out"
