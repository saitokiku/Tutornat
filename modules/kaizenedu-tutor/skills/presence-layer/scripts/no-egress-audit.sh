#!/usr/bin/env bash
# No-face-data-egress audit (spec D16, R29; CLAUDE.md invariant c).
# Static half now: the invariant test. Runtime half once presence-42 lands:
# the Playwright spec that records every request during a camera-on session.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "[1/2] static scan: camera APIs only under components/tutor/presence and lib/tutor/presence, no network calls there"
npx vitest run tests/invariants/no-camera-egress.test.ts
if [ -f e2e/tests/tutor-no-face-egress.spec.ts ]; then
  echo "[2/2] runtime audit: every request during a camera-on session, no image bytes in any body"
  pnpm exec playwright test e2e/tests/tutor-no-face-egress.spec.ts
else
  echo "[2/2] runtime audit not present yet (presence-42 adds e2e/tests/tutor-no-face-egress.spec.ts); static scan only"
fi
