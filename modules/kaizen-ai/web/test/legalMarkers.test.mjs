// Build gate: legal drafting markers must never reach a user.
//
// docs/legal/REVIEW_QUEUE.md and any legal draft use [ATTORNEY REVIEW] and
// [FOUNDER INPUT REQUIRED] to mark text that is not cleared or not final. Those
// markers are a drafting tool. If one ever renders inside web/app/** it means an
// un-reviewed or placeholder legal statement shipped to a real user — which is
// exactly the failure this gate exists to prevent. Live pages must carry only
// finished, factual copy; anything pending stays in docs/ behind this test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');

function allSourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...allSourceFiles(p));
    else if (/\.(js|jsx|ts|tsx|md|mdx)$/.test(name)) out.push(p);
  }
  return out;
}

const MARKERS = ['[ATTORNEY REVIEW]', '[FOUNDER INPUT REQUIRED]'];

test('no legal drafting markers render under web/app/**', () => {
  const offenders = [];
  for (const f of allSourceFiles(appDir)) {
    const text = readFileSync(f, 'utf8');
    for (const m of MARKERS) {
      if (text.includes(m)) offenders.push(`${f.replace(appDir, 'app')} → ${m}`);
    }
  }
  assert.deepEqual(offenders, [],
    `un-cleared legal markers found in user-facing code:\n  ${offenders.join('\n  ')}`);
});
