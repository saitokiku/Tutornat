#!/usr/bin/env node
/**
 * Lists upstream-owned files that differ from upstream/main and do not carry a
 * `KAIZEN:` comment (CLAUDE.md: upstream files are edited only through small
 * commented patches). Product paths, docs, and JSON/lock files are exempt.
 * Exit 1 when an unmarked upstream edit exists. Run after `git fetch upstream main`.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PRODUCT_PREFIXES = [
  'app/(parent)/',
  'app/(learner)/',
  'lib/tutor/',
  'components/tutor/',
  'kaizen.config.ts',
  'compliance/',
  'eval/',
  'docs/',
  '.claude/',
  '.github/workflows/invariants.yml',
  'tests/invariants/',
  'tests/tutor/',
  'README.md',
  'CLAUDE.md',
  'scripts/latency-harness.ts',
  'scripts/audit-client-bundle.mjs',
  'scripts/validate-skills.mjs',
];
const EXEMPT = /\.(json|lock|yaml|yml|md|svg|png|jpg|ico|woff2?)$|^pnpm-lock\.yaml$/;

let changed;
try {
  changed = execSync('git diff --name-only upstream/main -- .', { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
} catch (error) {
  console.error(
    'check-upstream-patches: git diff against upstream/main failed. Run `git fetch upstream main` first.',
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const unmarked = [];
const marked = [];
for (const file of changed) {
  if (PRODUCT_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;
  if (EXEMPT.test(file)) continue;
  if (!existsSync(file)) continue; // deleted upstream file: a strip, recorded in the map
  const text = readFileSync(file, 'utf8');
  (text.includes('KAIZEN:') ? marked : unmarked).push(file);
}

console.log(
  `check-upstream-patches: ${changed.length} files differ from upstream/main; ${marked.length} carry a KAIZEN comment`,
);
for (const file of marked) console.log(`  ok   ${file}`);
if (unmarked.length > 0) {
  for (const file of unmarked) console.error(`  MISSING KAIZEN comment: ${file}`);
  process.exit(1);
}
