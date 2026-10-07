'use strict';
// One grammar in two languages (E3 integration #24 round 2, review r1 findings 5 and 6).
// Every vector in tests/engine/content-vectors.json is run through the TypeScript
// content-check (parseExactRational, evaluateStem) and the SQL twins
// (e2.exact_rational, e2.evaluate_stem) on the configured PostgreSQL database; each
// side must produce the vector's expected value AND the two sides must agree.
// Run: sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/content-parity.cjs
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./harness/loader.cjs');
const H = require('./pg/harness.cjs');

const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'content-vectors.json'), 'utf8'));
const cc = load('@/lib/tutor/assessment/content-check');

async function main() {
  const db = await H.owner();
  const failures = [];
  let cases = 0;
  try {
    for (const v of vectors.rational) {
      cases += 1;
      const ts = cc.parseExactRational(v.input);
      const tsText = ts ? cc.showRational(ts) : null;
      const sql = (await db.query('SELECT e2.exact_rational($1) AS v', [v.input])).rows[0].v;
      if (tsText !== v.expected || sql !== v.expected) failures.push({ kind: 'rational', input: v.input, expected: v.expected, ts: tsText, sql, note: v.note });
    }
    for (const v of vectors.stem) {
      cases += 1;
      const ts = cc.evaluateStem(v.input);
      const tsValue = ts.value ? cc.showRational(ts.value) : null;
      const tsWhy = ts.why ?? null;
      const raw = (await db.query('SELECT e2.evaluate_stem($1) AS v', [v.input])).rows[0].v;
      const sql = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const ok = tsValue === v.value && sql.value === v.value && tsWhy === v.why && sql.why === v.why && ts.path === sql.path;
      if (!ok) failures.push({ kind: 'stem', input: v.input, expected: { value: v.value, why: v.why }, ts: { value: tsValue, why: tsWhy, path: ts.path }, sql, note: v.note });
    }
  } finally {
    await db.end();
  }
  for (const f of failures) console.error('PARITY FAIL ' + JSON.stringify(f));
  console.log(JSON.stringify({ suite: 'content parity (TS vs SQL)', vectors: cases, failed: failures.length }));
  process.exitCode = failures.length === 0 ? 0 : 1;
}
main().catch((e) => { console.error(e); process.exitCode = 2; });
