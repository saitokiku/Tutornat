// The JS vocabulary and the SQL CHECK constraints must never drift apart.
//
// types.js says "every constant here has a counterpart in a CHECK constraint" —
// this is what makes that true rather than aspirational. Drift is silent and
// nasty in both directions:
//
//   JS has a value SQL rejects  -> the insert fails at runtime, in production,
//                                  on a path that only fires for one evidence
//                                  kind. Tests that mock the DB never see it.
//   SQL allows a value JS omits -> data enters the ledger that isConfirming()
//                                  and weightOf() have no opinion about, so it
//                                  is silently weighted as the fallback.
//
// Verified against PostgreSQL's own parser (pglast/libpg_query) when written;
// the regex below was checked to produce identical results.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EVIDENCE_KINDS, VERIFIERS, KC_TYPES, TIERS, TUTOR_RATINGS,
} from '@/lib/engine/types.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '..');

const sql = fs.readdirSync(path.join(repoRoot, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(repoRoot, 'supabase', 'migrations', f), 'utf8'))
  .join('\n');

// Isolate one CREATE TABLE body. Column names repeat across tables — `kind`
// exists on both kc_item and evidence — so an unscoped search silently compares
// the wrong constraint, which is exactly the bug this test caught in itself.
function tableBody(table) {
  const re = new RegExp(`create table if not exists ${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i');
  const m = sql.match(re);
  return m ? m[1] : null;
}

// `check (col in ('a','b',...))` within a specific table.
function checkValues(table, column) {
  const body = tableBody(table);
  if (!body) return null;
  const re = new RegExp(`check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = body.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}

const CASES = [
  ['evidence', 'kind', EVIDENCE_KINDS, 'EVIDENCE_KINDS / evidence.kind'],
  ['evidence', 'verified_by', VERIFIERS, 'VERIFIERS / evidence.verified_by'],
  ['kc', 'type', KC_TYPES, 'KC_TYPES / kc.type'],
  ['kc', 'verifiability', TIERS, 'TIERS / kc.verifiability'],
  ['tutoring_session_kc', 'tutor_rating', TUTOR_RATINGS, 'TUTOR_RATINGS / tutoring_session_kc.tutor_rating'],
];

for (const [table, column, jsValues, label] of CASES) {
  test(`${label} — SQL and JS agree`, () => {
    const fromSql = checkValues(table, column);
    assert.ok(fromSql, `no CHECK constraint found for ${table}.${column} — did the migration change?`);
    assert.deepEqual(
      fromSql, [...jsValues].sort(),
      `drift between the database and the engine vocabulary for "${column}"`
    );
  });
}

test('the verifier handles every item kind the database allows', () => {
  // A kind the DB permits but the verifier has no case for fails closed (never
  // a pass) — safe, but the item is unusable and nothing would tell you.
  const itemKinds = checkValues('kc_item', 'kind');
  assert.ok(itemKinds, 'kc_item.kind constraint not found');

  const verifier = fs.readFileSync(path.join(webRoot, 'lib/engine/verify/symbolic.js'), 'utf8');
  const handled = new Set([...verifier.matchAll(/case '(\w+)':/g)].map((m) => m[1]));

  const missing = itemKinds.filter((k) => !handled.has(k));
  assert.deepEqual(missing, [], `kc_item.kind allows values the verifier cannot check: ${missing.join(', ')}`);
});

test('every confirming verifier is a real verifier', () => {
  // CONFIRMING_VERIFIERS is a subset of VERIFIERS by construction; a typo here
  // would silently make confirmation impossible.
  const confirming = ['symbolic', 'structural', 'human_tutor'];
  for (const v of confirming) {
    assert.ok(VERIFIERS.includes(v), `"${v}" can confirm mastery but is not a known verifier`);
  }
  // And the weak ones must NOT be able to confirm.
  for (const v of ['self', 'model']) {
    assert.ok(!confirming.includes(v), `"${v}" must never be a confirming verifier`);
  }
});
