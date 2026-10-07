#!/bin/sh
# E1 criterion 0: copy the audited engine/check/report closure from the pinned
# read-only KaizenEdu checkout into this repository and print the source hashes.
# Never writes to the source. Re-runnable; used once for the baseline commit and
# by the reviewer to confirm the copied files match the recorded manifest.
set -eu
SRC="${KAIZENEDU_SOURCE:-/Users/mann/pm/shared/repos/KaizenEdu}"
EXPECTED_SHA="20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe"
DEST="$(cd "$(dirname "$0")/../../.." && pwd)"
ACTUAL_SHA="$(git -C "$SRC" rev-parse HEAD)"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "source HEAD $ACTUAL_SHA != pinned $EXPECTED_SHA" >&2
  exit 2
fi
# Files copied verbatim (import paths are then adapted in-tree; every adapted
# file is listed in tests/engine/closure-manifest.json with both hashes).
FILES="
lib/tutor/graph/graph.ts
lib/tutor/graph/next-skill.ts
lib/tutor/graph/items.ts
lib/tutor/graph/skill-graph.json
lib/tutor/checks/grading.ts
lib/tutor/checks/math-expr.ts
lib/tutor/checks/symbolic.ts
lib/tutor/checks/prompt.ts
lib/tutor/checks/service.ts
lib/tutor/model/student-model.ts
lib/tutor/model/evidence.ts
lib/tutor/model/rows.ts
lib/tutor/model/service.ts
lib/tutor/session/state.ts
lib/tutor/session/state-machine.ts
lib/tutor/session/coach.ts
lib/tutor/session/sitting.ts
lib/tutor/session/service.ts
lib/tutor/report/parent-report.ts
lib/tutor/report/lead.ts
lib/tutor/report/rows.ts
lib/tutor/progress/service.ts
"
MODE="${1:-copy}"
for f in $FILES; do
  if [ "$MODE" = "copy" ]; then
    mkdir -p "$DEST/$(dirname "$f")"
    cp -L "$SRC/$f" "$DEST/$f"
  fi
  echo "$f blob=$(git -C "$SRC" hash-object "$f") sha256=$(shasum -a 256 "$SRC/$f" | cut -c1-64)"
done
