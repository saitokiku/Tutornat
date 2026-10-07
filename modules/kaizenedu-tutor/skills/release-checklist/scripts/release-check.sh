#!/usr/bin/env bash
# Mechanical release gates, printed as a checklist. Usage:
#   bash .claude/skills/release-checklist/scripts/release-check.sh [--with-build]
# --with-build also runs pnpm build with canary secrets and the bundle audit.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
status=0
run() {
  local name="$1"; shift
  if "$@" >/tmp/release-check.log 2>&1; then
    echo "  pass  $name"
  else
    echo "  FAIL  $name  (see /tmp/release-check.log)"
    status=1
  fi
}
echo "release-check on $(git rev-parse --short HEAD)"
run "typecheck (npx tsc --noEmit)" npx tsc --noEmit
run "prettier (pnpm check)" pnpm check
run "eslint (pnpm lint)" pnpm lint
run "unit tests (pnpm test)" pnpm test
run "invariants (pnpm test:invariants)" pnpm test:invariants
run "skills (pnpm skills:validate)" pnpm skills:validate
run "upstream patches carry KAIZEN comments" node .claude/skills/openmaic-internals/scripts/check-upstream-patches.mjs
run "product copy (check-copy)" node .claude/skills/design-system/scripts/check-copy.mjs
run "tutor prompts (check-prompts)" node .claude/skills/tutor-loop/scripts/check-prompts.mjs
run "compliance gate and trackers" node .claude/skills/minors-privacy/scripts/check-compliance-gate.mjs
if [ "${1:-}" = "--with-build" ]; then
  run "build with canary secrets" env KAIZEN_CANARY_SECRET=canary-8d1f0a7c-local OPENAI_API_KEY=sk-canary-8d1f0a7c-local TUTOR_MODE=1 pnpm build
  run "client bundle carries no secrets" env KAIZEN_CANARY_SECRET=canary-8d1f0a7c-local OPENAI_API_KEY=sk-canary-8d1f0a7c-local pnpm audit:client-bundle
fi
exit $status
