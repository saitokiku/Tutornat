#!/usr/bin/env node
/**
 * Two deterministic checks for the minors' privacy rules.
 *
 * 1. Gate: when UNDER13_GATE=1 (or the flag file compliance/under13-gate.txt
 *    says "open"), compliance/signoff.md must exist and contain a line
 *    matching "counsel sign-off: YYYY-MM-DD". Otherwise the gate may not open.
 * 2. Trackers: product code (app/(learner), app/(parent), components/tutor,
 *    lib/tutor) must not reference known ad or tracking hosts.
 *
 * Exit 1 on a violation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const problems = [];

const gateRequested =
  process.env.UNDER13_GATE === '1' ||
  (existsSync(join(root, 'compliance', 'under13-gate.txt')) &&
    /^\s*open\s*$/im.test(readFileSync(join(root, 'compliance', 'under13-gate.txt'), 'utf8')));
if (gateRequested) {
  const signoff = join(root, 'compliance', 'signoff.md');
  if (!existsSync(signoff)) {
    problems.push('UNDER13_GATE requested but compliance/signoff.md does not exist');
  } else if (!/counsel sign-off:\s*\d{4}-\d{2}-\d{2}/i.test(readFileSync(signoff, 'utf8'))) {
    problems.push('compliance/signoff.md has no "counsel sign-off: YYYY-MM-DD" line');
  }
}

const TRACKER_HOSTS =
  /googletagmanager\.com|google-analytics\.com|doubleclick\.net|facebook\.net|connect\.facebook|hotjar\.com|fullstory\.com|mouseflow|clarity\.ms|segment\.com|amplitude\.com|mixpanel\.com|tiktok\.com\/i18n|snap\.licdn|ads\.linkedin|adroll|criteo|taboola|outbrain/i;
const PRODUCT_ROOTS = ['app/(learner)', 'app/(parent)', 'components/tutor', 'lib/tutor'];

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|md|html)$/.test(entry)) out.push(full);
  }
  return out;
}

let scanned = 0;
for (const rel of PRODUCT_ROOTS) {
  for (const file of walk(join(root, rel), [])) {
    scanned += 1;
    if (TRACKER_HOSTS.test(readFileSync(file, 'utf8'))) {
      problems.push(`tracker host referenced in ${file.slice(root.length + 1)}`);
    }
  }
}

console.log(
  `check-compliance-gate: gate ${gateRequested ? 'requested' : 'closed'}; scanned ${scanned} product files for tracker hosts`,
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
