#!/usr/bin/env node
// Local evidence for the practice route when `next` cannot be installed offline:
// drives the SAME SQL the route handler issues (web/lib/practice.ts, web/lib/record.ts)
// through the seeded tutor/report LOGIN roles and prints the honest record after
// (1) a correct answer → append_practice, (2) a wrong answer → record_exposure.
// Fails loudly if anything ends up qualifying or certified.
'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { resolvePg } = require('../../tests/engine/pg/resolve-pg.cjs');

const LEARNER = 'ada', SKILL = 'frac-add-unlike', RULE = 'e2-draft-1';
const RECORD_SQL = require('node:fs').readFileSync(require.resolve('../lib/record.ts'), 'utf8')
  .split('export const RECORD_SQL = `')[1].split('`;')[0];

async function one(client, sql, params) {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try { const r = await client.query(sql, params); await client.query('COMMIT'); return r.rows[0].value; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
}

async function main() {
  const { pg } = resolvePg();
  const tutor = new pg.Client({ connectionString: process.env.KAIZENEDU_PG_TUTOR_URL });
  const report = new pg.Client({ connectionString: process.env.KAIZENEDU_PG_REPORT_URL });
  await tutor.connect(); await report.connect();
  // NOINHERIT logins assume their one capability, as web/lib/db.ts does on connect.
  await tutor.query('SET ROLE tutor'); await report.query('SET ROLE report');
  const session = 'smoke-' + randomUUID();
  const prov = { source: 'web/learn', tutor: 'trellis', app: 'kaizenedu-web', smoke: true };
  try {
    const record = async () => (await report.query(RECORD_SQL, [LEARNER, SKILL, RULE])).rows[0].value;
    const before = await record();
    const practice = await one(tutor, 'SELECT e2.append_practice($1,$2,$3,$4,$5,$6,$7,$8) AS value',
      [LEARNER, SKILL, '1', `${session}:0:1`, session, { correct: true, assisted: false, item: 0, answer: '3/4', claim: 'mastered' }, prov, RULE]);
    assert.equal(practice.class, 'corrections-practice'); assert.equal(practice.qualifying, false);
    const retry = await one(tutor, 'SELECT e2.append_practice($1,$2,$3,$4,$5,$6,$7,$8) AS value',
      [LEARNER, SKILL, '1', `${session}:0:1`, session, { correct: true, assisted: false, item: 0, answer: '3/4', claim: 'mastered' }, prov, RULE]);
    assert.equal(retry.id, practice.id, 'stable operation id returns the stored row');
    const mid = await record();
    assert.equal(Number(mid.practised), Number(before.practised) + 1);
    const exposure = await one(tutor, 'SELECT e2.record_exposure($1,$2,$3,$4,$5,$6,$7,$8) AS value',
      [LEARNER, [SKILL], '1', `${session}:1:1`, session, { kind: 'hint', item: 1, answer: '2/9' }, prov, RULE]);
    assert.equal(exposure.class, 'assisted-help');
    const after = await record();
    assert.equal(Number(after.helped), Number(before.helped) + 1);
    assert.equal(Number(after.proven), 0, 'nothing qualifying from the web surface');
    assert.equal(after.certification, 'none');
    assert.equal(after.eligibleNow, false, '48 h clock restarted by help');
    // The tutor role must not be able to write qualifying evidence directly.
    let denied = null;
    try { await one(tutor, "INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('home',$1,'x','x',$2,'1',0,'unassisted-attempt',true,'{}','{}',$3) RETURNING 1 AS value", [LEARNER, SKILL, RULE]); }
    catch (e) { denied = e.code; }
    assert.equal(denied, '42501', 'tutor role cannot insert evidence');
    console.log(JSON.stringify({ smoke: 'ok', session, practiceId: practice.id, exposureId: exposure.id, before, after, deniedDirectEvidence: denied }));
  } finally { await tutor.end(); await report.end(); }
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
