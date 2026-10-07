'use strict';
// Synthetic owner-clock fixtures. No caller locks; every fixture rolls back.
// --base creates a dedicated fixture database and installs the literal base SQL.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const H = require('./harness.cjs');
const { migrate, migrationFiles } = require('../../../db/migrate.cjs');
const twoKey = require('./two-key.cjs');
const BASE = 'ba8302771dd85a6e91525f0673542021b2cf804b';
// E3 integration (#24): at the integrated head #17's two-key rule (0007) applies; --base installs the literal
// base SQL, which has no author role or e2.author_key, so the two-key authoring is skipped there.
const TWO_KEY = !process.argv.includes('--base');
const id = () => randomUUID();
let db;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const value = async (sql, args = []) => (await q(sql, args))[0].value;
const clock = (at) => q('SELECT e2.set_fixture_clock($1)', [at]);
const cases = [];
const test = (name, fn) => cases.push({ name, fn });
async function scope() {
  const learner = 'q18_' + id(), skill = 'fractions_' + id(), rubric = 'rubric_' + id();
  await q("INSERT INTO e2.learners VALUES('h1',$1)", [learner]);
  await q("INSERT INTO e2.rubrics VALUES('h1',$1,'1','approved','{}','{}')", [rubric]);
  const s = { learner, skill };
  s.item = async (family = id(), tag = id()) => {
    const item = 'item_' + id();
    await q("INSERT INTO e2.items VALUES('h1',$1,'1','1',$2,'1',$3,'1',$4,$5,'approved','{\"stem\":\"1/2 + 1/4\"}',$6,'{\"source\":\"synthetic\"}')", [item, rubric, skill, family, tag, twoKey.numericKey('3/4')]);
    // E3 integration (#24): two author logins key 3/4 and approve inside this case's transaction (two-key.cjs).
    if (TWO_KEY) await twoKey.approveItem(db, item, { value: '3/4', inTransaction: true });
    return item;
  };
  s.issue = (item) => value('SELECT e2.issue_attempt($1,$2,\'1\',$3,\'fixture\',\'fixture-scorer\',\'1\') AS value', [learner, item, id()]);
  s.finish = async (a, correct = true) => {
    await q('SELECT e2.submit_attempt($1,$2,$3)', [learner, a.id, { answer: '3/4' }]);
    return value('SELECT e2.finalize_attempt($1,$2,$3,$4) AS value', [learner, a.id, { answer: '3/4' }, { correct }]);
  };
  s.success = async (at, family, tag) => { await clock(at); return s.finish(await s.issue(await s.item(family, tag))); };
  s.rebuild = async (at) => { if (at) await clock(at); return (await value('SELECT e2.rebuild_projection($1,$2) AS value', [learner, skill]))[0]; };
  s.expose = (skills = [skill], kind = 'hint') => value('SELECT e2.record_exposure($1,$2,\'1\',$3,\'fixture\',$4,\'{"source":"synthetic"}\') AS value', [learner, skills, id(), { kind }]);
  return s;
}
const facts = (p) => { assert(p.qualification, 'projection must expose server-derived qualification facts'); return p.qualification; };

test('Q01 account timezone validated and every change audited', async () => {
  const household = 'account_' + id();
  await q('INSERT INTO e2.households(household_id,timezone) VALUES($1,\'America/Chicago\')', [household]);
  assert.equal(await value('SELECT timezone AS value FROM e2.households WHERE household_id=$1', [household]), 'America/Chicago');
  await q('UPDATE e2.households SET timezone=\'America/New_York\' WHERE household_id=$1', [household]);
  assert.equal(await value("SELECT to_regclass('e2.household_timezone_events') IS NOT NULL AS value"), true, 'timezone changes need immutable audit');
  const rows = await q('SELECT old_timezone,new_timezone FROM e2.household_timezone_events WHERE household_id=$1 ORDER BY event_order', [household]);
  assert.deepEqual(rows, [{ old_timezone: null, new_timezone: 'America/Chicago' }, { old_timezone: 'America/Chicago', new_timezone: 'America/New_York' }]);
  await q('SAVEPOINT invalid_zone');
  await assert.rejects(q('UPDATE e2.households SET timezone=\'Mars/Olympus\' WHERE household_id=$1', [household]), { code: '22023' });
  await q('ROLLBACK TO SAVEPOINT invalid_zone');
  await q('SAVEPOINT immutable');
  await assert.rejects(q('UPDATE e2.household_timezone_events SET new_timezone=new_timezone WHERE false'), { code: '55000' });
  await q('ROLLBACK TO SAVEPOINT immutable');
});

for (const [name, first, second, dates] of [
  ['Q02 local 23:59/00:00 (UTC-only negative)', '2026-01-02T05:59:00Z', '2026-01-02T06:00:00Z', ['2026-01-01','2026-01-02']],
  ['Q03 spring DST local midnight', '2026-03-08T05:59:00Z', '2026-03-09T05:00:00Z', ['2026-03-07','2026-03-09']],
  ['Q04 UTC midnight is the same household day', '2026-01-01T23:59:00Z', '2026-01-02T00:00:00Z', ['2026-01-01']],
]) test(name, async () => {
  const s = await scope(); await s.success(first); await s.success(second);
  const f = facts(await s.rebuild()); assert.deepEqual(f.localDays, dates);
  if (name.startsWith('Q02')) assert.notDeepEqual(f.localDays, [first.slice(0,10)], 'UTC-only date counting must fail');
});

for (const [label, at, expected, day] of [
  ['day5 23:59', '2026-01-07T05:59:00Z', false, 5],
  ['day6 00:00', '2026-01-07T06:00:00Z', true, 6],
  ['day7', '2026-01-08T18:00:00Z', true, 7],
  ['day9 23:59', '2026-01-11T05:59:00Z', true, 9],
  ['day10 00:00', '2026-01-11T06:00:00Z', false, 10],
]) test('Q05 retention ' + label, async () => {
  const s = await scope(); const anchor = await s.success('2026-01-01T18:00:00Z', 'family-a','word');
  const result = await s.success(at, 'family-b', 'diagram');
  const p = await s.rebuild(); const f = facts(p);
  assert.equal(Date.parse(f.anchorAt), Date.parse('2026-01-01T18:00:00Z'));
  assert.equal(f.retentionSatisfied, expected); assert.equal(p.qualification_state, expected ? 'qualified' : 'pending');
  assert.equal(p.certification, 'none'); assert.equal(result.ruleVersion, 'e2-draft-1');
  const rows = await q('SELECT payload FROM e2.evidence_view WHERE id=$1', [result.evidenceId]);
  assert.equal(rows[0].payload.e13.localDayOffset, day);
  assert.equal(rows[0].payload.e13.retentionInWindow, expected);
  assert.equal(result.qualificationState, expected ? 'qualified' : 'pending');
  assert.equal(f.anchorEvidenceId, anchor.evidenceId);
  await q('SET LOCAL ROLE report');
  const report = await q('SELECT * FROM e2.qualification_projection WHERE learner_id=$1', [s.learner]);
  assert.equal(report[0].qualification.retentionSatisfied, expected);
  assert.equal((await q('SELECT * FROM e2.evidence_view WHERE id=$1', [result.evidenceId])).length, 1);
  await q('RESET ROLE');
});

test('Q06 receipt anchor excludes issue and client times', async () => {
  const s = await scope(); await clock('2026-01-01T18:00:00Z'); const a = await s.issue(await s.item());
  await clock('2026-01-02T18:00:00Z'); await s.finish(a);
  await s.success('2026-01-08T06:00:00Z');
  const f = facts(await s.rebuild()); assert.equal(Date.parse(f.anchorAt), Date.parse('2026-01-02T18:00:00Z')); assert.equal(f.retentionSatisfied, true);
});
for (const [label, family, tag, count] of [['same family','a','diagram',1], ['same tag','b','word',1], ['distinct','b','diagram',2]]) test('Q07 contexts ' + label, async () => {
  const s = await scope(); await s.success('2026-01-01T18:00:00Z','a','word'); await s.success('2026-01-08T18:00:00Z',family,tag);
  const p = await s.rebuild(); assert.equal(facts(p).contextCount,count); assert.equal(p.qualification_state,count === 2 ? 'qualified' : 'eligible');
  if (count === 1) assert(p.qualification_reasons.includes('repeated_family'));
});
for (const state of ['issued','submitted','expired','cancelled','finalized']) test('Q08 unfamiliar excludes prior ' + state, async () => {
  const s = await scope(); await clock('2026-01-01T18:00:00Z'); const item = await s.item(); const first = await s.issue(item);
  if (state === 'submitted') await q('SELECT e2.submit_attempt($1,$2,$3)',[s.learner,first.id,{answer:'3/4'}]);
  if (state === 'expired' || state === 'cancelled') await q(`SELECT e2.${state === 'expired' ? 'expire' : 'cancel'}_attempt($1,$2)`,[s.learner,first.id]);
  if (state === 'finalized') await s.finish(first);
  await clock('2026-01-08T18:00:00Z'); const r = await s.finish(await s.issue(item));
  assert.equal(r.qualifying,false); assert(r.reasons.includes('familiar_item')); assert.equal(r.certification,'none');
});
for (const [delta, expected] of [[-1,false],[0,true]]) test('Q09 E02 48h ' + delta + 'ms', async () => {
  const s = await scope(); await clock('2026-03-07T18:00:00Z'); await s.expose();
  await clock(new Date(Date.parse('2026-03-09T18:00:00Z')+delta).toISOString());
  const r = await s.finish(await s.issue(await s.item())); assert.equal(r.qualifying,expected);
  if (!expected) assert(r.reasons.includes('delay_under_48h'));
});
test('Q10 exposure touches only named skills and every kind restarts', async () => {
  const s = await scope(); await clock('2026-01-01T18:00:00Z'); await s.expose();
  await clock('2026-01-03T18:00:00Z'); await s.expose(['other-skill']);
  assert.equal((await s.finish(await s.issue(await s.item()))).qualifying,true);
  for (const kind of ['hint','instruction','answer']) {
    await s.expose([s.skill,'other-skill'],kind);
    const r = await s.finish(await s.issue(await s.item())); assert.equal(r.qualifying,false); assert(r.reasons.includes('delay_under_48h'));
  }
});

test('Q11 pending eligible qualified transitions and immutable reasons', async () => {
  const s = await scope(); const first = await s.success('2026-01-01T18:00:00Z','a','word');
  assert.equal(first.qualificationState,'pending');
  assert.equal((await s.rebuild('2026-01-07T06:00:00Z')).qualification_state,'eligible');
  const final = await s.success('2026-01-08T18:00:00Z','b','diagram'); assert.equal(final.qualificationState,'qualified');
  const events = await q('SELECT state,reasons,rule_version FROM e2.qualification_events WHERE learner_id=$1 ORDER BY event_order',[s.learner]);
  assert.deepEqual(events.map(e=>e.state),['pending','eligible','qualified']);
  assert(events.every(e=>e.reasons.length > 0 && e.rule_version==='e2-draft-1'));
  const before = events.length; await s.rebuild(); assert.equal((await q('SELECT * FROM e2.qualification_events WHERE learner_id=$1',[s.learner])).length,before);
  await q('SAVEPOINT frozen'); await assert.rejects(q('DELETE FROM e2.qualification_events WHERE false'),{code:'55000'}); await q('ROLLBACK TO SAVEPOINT frozen');
});

test('Q12 revoked evidence withdraws qualification without changing anchor or results', async () => {
  const s = await scope(); const a = await s.success('2026-01-01T18:00:00Z','a','word'); const b = await s.success('2026-01-08T18:00:00Z','b','diagram');
  const item = await value('SELECT item_id AS value FROM e2.attempts WHERE id=$1',[b.attemptId]);
  await q("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','synthetic withdrawal','{}')",[item]);
  const p = await s.rebuild(); assert.notEqual(p.qualification_state,'qualified'); assert.equal(facts(p).anchorEvidenceId,a.evidenceId);
  assert.deepEqual(await value('SELECT final_result AS value FROM e2.attempts WHERE id=$1',[b.attemptId]),b);
});

test('Q13 delayed grading cannot move first receipt anchor', async () => {
  const s = await scope(); await clock('2026-01-01T18:00:00Z'); const a = await s.issue(await s.item());
  await q('SELECT e2.submit_attempt($1,$2,$3)',[s.learner,a.id,{answer:'3/4'}]);
  await clock('2026-01-02T18:00:00Z'); await s.finish(a);
  assert.equal(Date.parse(facts(await s.rebuild()).anchorAt),Date.parse('2026-01-01T18:00:00Z'));
});
test('Q14 delayed grading cannot fabricate a retention check', async () => {
  const s = await scope(); await s.success('2026-01-01T18:00:00Z','a','word'); const a = await s.issue(await s.item('b','diagram'));
  await q('SELECT e2.submit_attempt($1,$2,$3)',[s.learner,a.id,{answer:'3/4'}]);
  await clock('2026-01-08T18:00:00Z'); await s.finish(a);
  const p = await s.rebuild(); assert.equal(facts(p).retentionSatisfied,false); assert.notEqual(p.qualification_state,'qualified');
});

test('Q15 relevant exposure refreshes eligibility; unrelated exposure leaves it', async () => {
  const s = await scope(); await s.success('2026-01-01T18:00:00Z');
  assert.equal((await s.rebuild('2026-01-07T18:00:00Z')).qualification_state,'eligible');
  await s.expose(['other-skill']);
  assert.equal(await value('SELECT qualification_state AS value FROM e2.qualification_projection WHERE learner_id=$1',[s.learner]),'eligible');
  await s.expose();
  assert.equal(await value('SELECT qualification_state AS value FROM e2.qualification_projection WHERE learner_id=$1',[s.learner]),'pending');
  assert((await value('SELECT qualification_reasons AS value FROM e2.qualification_projection WHERE learner_id=$1',[s.learner])).includes('quiet_window_not_elapsed'));
});
test('Q16 out-of-order grading preserves first recognized success anchor', async () => {
  const s = await scope(); await clock('2026-01-01T18:00:00Z'); const earlier = await s.issue(await s.item('a','word'));
  await q('SELECT e2.submit_attempt($1,$2,$3)',[s.learner,earlier.id,{answer:'3/4'}]);
  const first = await s.success('2026-01-02T18:00:00Z','b','diagram');
  await clock('2026-01-08T18:00:00Z'); const late = await s.finish(earlier);
  const f = facts(await s.rebuild()); assert.equal(f.anchorEvidenceId,first.evidenceId); assert.equal(Date.parse(f.anchorAt),Date.parse('2026-01-02T18:00:00Z')); assert.equal(f.retentionSatisfied,false);
  assert.equal((await value('SELECT payload AS value FROM e2.evidence_events WHERE id=$1',[late.evidenceId])).e13.localDayOffset,-1);
});

test('Q17 qualification ledgers retain the four-role read-only boundary', async () => {
  const s = await scope(); await s.success('2026-01-01T18:00:00Z');
  for (const role of ['learner','tutor','report','assessment']) {
    await q('SET LOCAL ROLE '+role);
    assert.equal((await q('SELECT * FROM e2.qualification_events WHERE learner_id=$1',[s.learner])).length,1);
    for (const sql of ['UPDATE e2.qualification_events SET state=state WHERE false',
      'DELETE FROM e2.household_timezone_events WHERE false',
      'SELECT e2.qualification_facts(\'x\',\'x\',\'1\',\'e2-draft-1\')',
      "SELECT e2.set_fixture_clock('2000-01-01')"]) {
      await q('SAVEPOINT denied'); await assert.rejects(q(sql),{code:'42501'}); await q('ROLLBACK TO SAVEPOINT denied');
    }
    await q('RESET ROLE');
  }
});

test('Q18 accepted rule id e13-v1 is recorded on every row without re-counting e2-draft-1 evidence', async () => {
  // ADR-0064 accepted 2026-09-17 11:57 CDT (round-2 brief); the accepted id is a caller-passed
  // rule id with its own e2.rule_versions row. Nothing under e2-draft-1 is re-counted.
  const RULE = 'e13-v1';
  await q("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES('h1',$1,'{\"delayHours\":48,\"daySeven\":[6,9],\"certification\":false}','{\"adr\":\"ADR-0064\",\"accepted\":\"2026-09-17T16:57:00Z\"}') ON CONFLICT DO NOTHING", [RULE]);
  const s = await scope();
  const run = async (at, family, tag) => {
    await clock(at); const item = await s.item(family, tag);
    const a = await value('SELECT e2.issue_attempt($1,$2,\'1\',$3,\'fixture\',\'fixture-scorer\',\'1\',$4) AS value', [s.learner, item, id(), RULE]);
    return s.finish(a);
  };
  const first = await run('2026-01-01T18:00:00Z', 'a', 'word'); assert.equal(first.ruleVersion, RULE); assert.equal(first.qualificationState, 'pending');
  const draft = await s.success('2026-01-02T18:00:00Z', 'c', 'audio'); assert.equal(draft.ruleVersion, 'e2-draft-1');
  const second = await run('2026-01-08T18:00:00Z', 'b', 'diagram'); assert.equal(second.ruleVersion, RULE); assert.equal(second.qualificationState, 'qualified');
  assert.equal(second.certification, 'none');
  // The draft partition has its own anchor (day 0 = 2026-01-02) and is merely eligible on its day 6; only the e13-v1 partition qualified.
  const rows = await q('SELECT rule_version,qualification_state FROM e2.qualification_projection WHERE learner_id=$1 ORDER BY rule_version DESC', [s.learner]);
  assert.deepEqual(rows, [{ rule_version: 'e2-draft-1', qualification_state: 'eligible' }, { rule_version: RULE, qualification_state: 'qualified' }]);
  const events = await q('SELECT rule_version,state FROM e2.qualification_events WHERE learner_id=$1 AND rule_version=$2 ORDER BY event_order', [s.learner, RULE]);
  assert.deepEqual(events.map(e => e.state), ['pending', 'qualified']); assert(events.every(e => e.rule_version === RULE));
  assert(events.length && (await q('SELECT rule_version FROM e2.evidence_events WHERE learner_id=$1', [s.learner])).every(e => e.rule_version === RULE || e.rule_version === 'e2-draft-1'));
  assert.equal(await value('SELECT count(*)::int AS value FROM e2.evidence_events WHERE learner_id=$1 AND rule_version=$2', [s.learner, RULE]), 2);
});

async function main() {
  let database, control;
  const baseMode = process.argv.includes('--base');
  const mutantUtc = process.argv.includes('--mutant-utc');
  try {
    if (baseMode || mutantUtc) {
      control = await H.owner(); database = 'q18_negative_' + id().replaceAll('-','');
      await control.query(`CREATE DATABASE ${database}`);
      if (process.env.KAIZENEDU_PG_URL) { const url = new URL(process.env.KAIZENEDU_PG_URL); url.pathname = '/' + database; process.env.KAIZENEDU_PG_URL = url.toString(); }
      process.env.PGDATABASE = database;
    }
    db = await H.owner();
    console.log('SOURCE ' + (baseMode ? BASE : execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()));
    console.log(JSON.stringify({server:await H.serverIdentity(db)}));
    let files = baseMode ? execFileSync('git',['ls-tree','-r','--name-only',BASE,'db/migrations'],{encoding:'utf8'}).trim().split('\n').map(path=> {
      const sql = execFileSync('git',['show',BASE+':'+path],{encoding:'utf8'});
      return {name:path.split('/').pop(),sql,sha256:createHash('sha256').update(sql).digest('hex')};
    }) : undefined;
    if (mutantUtc) {
      files = migrationFiles().map(file => { const sql = file.sql.replaceAll('AT TIME ZONE zone', "AT TIME ZONE 'UTC'"); return {...file,sql,sha256:createHash('sha256').update(sql).digest('hex')}; });
      console.log('MUTANT household calendar calculations replaced with UTC');
    }
    await migrate(db, files ? {files} : {});
    if (TWO_KEY) await twoKey.provisionAuthors(db, ['h1']);
    let failures = 0;
    for (const t of cases.filter(t=>!process.env.Q18_FILTER || t.name.includes(process.env.Q18_FILTER))) {
      await q('BEGIN');
      try {
        await q("INSERT INTO e2.households(household_id,timezone) VALUES('h1','America/Chicago') ON CONFLICT DO NOTHING");
        await q("INSERT INTO e2.principals VALUES(session_user,'h1') ON CONFLICT(login) DO UPDATE SET household_id='h1'");
        await q('UPDATE e2.fixture_control SET enabled=true WHERE singleton');
        await q("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES('h1','e2-draft-1','{\"delayHours\":48,\"daySeven\":[6,9],\"certification\":false}','{}') ON CONFLICT DO NOTHING");
        await t.fn(); console.log('PASS ' + t.name);
      } catch (e) { failures++; console.log('FAIL ' + t.name + ': ' + e.message); }
      finally { await q('ROLLBACK'); }
    }
    const total = cases.filter(t=>!process.env.Q18_FILTER || t.name.includes(process.env.Q18_FILTER)).length;
    console.log(`E13 ${total-failures}/${total} passed; ${failures} failed`); process.exitCode = failures ? 1 : 0;
  } finally {
    if (db) await db.end();
    if (control) { await control.query(`DROP DATABASE ${database}`); await control.end(); }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
