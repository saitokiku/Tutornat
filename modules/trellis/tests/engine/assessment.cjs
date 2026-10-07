// E2 part A — assessment service suite (issue #3; round 10 closes the r9 residue, issue #15): the service is a caller of
// C's `e2.*` functions (ADR-0066) and every case runs against PostgreSQL 17 on the
// cluster the environment names (KAIZENEDU_PG_URL or PGHOST/PGPORT/PGUSER/PGDATABASE),
// through C's tests/engine/pg/harness.cjs: one dedicated login per capability
// (`e2_h1_<role>` + SET ROLE), serializable transactions with 40001/40P01 retries,
// real backends per connection so row and advisory locks are the real thing.
//
//   sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/assessment.cjs [case ...]
//
// The suite never starts a server (ADR-0065) and installs no DDL of its own: it runs
// db/migrate.cjs (idempotent), seeds a synthetic household as the migration owner —
// the trusted boundary the seam names — and provisions the fixture logins with C's
// owner-only `provisionPrincipals`. Data isolation is by unique ids per run (C's
// tables are append-only; nothing is reset). Records land in
// tests/engine/evidence/results-assessment-pg.json with the observed server identity.
//
// Each case returns observations; the assertion block is the expectation. Every
// negative test sits beside its positive control in the same case. Every refused
// statement is recorded as {layer, sqlstate, message}: `grant` = 42501 "permission
// denied" (privilege check, before any function or trigger runs); `function` = P0001 /
// P0002 / 42501 raised inside an e2.* function (the documented contract); `trigger` =
// 55000 from e2.freeze_attempt / e2.reject_mutation; `rls` = a write filtered by the
// household policy (42501 "new row violates row-level security").
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ROOT, load, hashes } = require('./harness/loader.cjs');
const H = require('./pg/harness.cjs');
const { gate, waitBlocked } = require('./pg/barriers.cjs');
const { migrate } = require('../../db/migrate.cjs');

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));

const svc = load('@/lib/tutor/assessment/service');
const contentCheck = load('@/lib/tutor/assessment/content-check');
const { issueAttempt, submitAttempt, finalizeAttempt, recordExposure, appendPractice, readAttempt, readResult, readAttemptEvidence, presentItem, scoreResponse } = svc;
const { ASSESSMENT_RULE } = load('@/lib/tutor/assessment/contracts');
const { readProjection, rebuildProjection, rebuildStoredProjection } = load('@/lib/tutor/assessment/projection');
const { answerCheck } = load('@/lib/tutor/checks/service');
const { pendingFromTag } = load('@/lib/tutor/checks/prompt');
const { initialState } = load('@/lib/tutor/session/state');

const RUN = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const SESSION = 'ses_' + RUN;
const ROLES = ['learner', 'tutor', 'report', 'assessment'];

// An independently reviewed synthetic fixture: the key is checked in this file by arithmetic
// the reviewer can redo (3/4 + 1/8 = 7/8; 2 × 3/5 = 6/5), not by trusting the provenance row.
const ITEMS = {
  // Round 7: the strict evaluator has no word-problem path, so a word-problem stem would abstain (fail closed) and this
  // positive-control item would never qualify. The item keeps its family and `word` context tag with a canonical stem.
  add_word: { id: 'f9_add_word', family: 'add-unlike-denominators', contextTag: 'word', stem: 'What is 3/4 + 1/8?', key: { type: 'numeric', options: null, answer: { value: '7/8', tolerance: 0 } } },
  add_bare: { id: 'f9_add_bare', family: 'add-unlike-denominators', contextTag: 'bare', stem: 'Compute 3/4 + 1/8.', key: { type: 'numeric', options: null, answer: { value: '7/8', tolerance: 0 } } },
  mul_bare: { id: 'f10_mul_bare', family: 'multiply-whole-by-fraction', contextTag: 'bare', stem: 'Compute 2 × 3/5.', key: { type: 'numeric', options: null, answer: { value: '6/5', tolerance: 0 } } },
  short: { id: 'f9_short', family: 'explain-denominator', contextTag: 'explain', stem: 'Explain what the denominator tells you.', key: { type: 'short', options: null, answer: { value: 'how many equal parts' } } },
  // E3-K (#17): a wrong key carries `truth`, the value the second synthetic author derives independently; the two keys
  // disagree and the item is refused at approval — it never reaches grading.
  wrong_key: { id: 'f9_add_wrong', family: 'add-unlike-denominators', contextTag: 'bare', stem: 'Compute 1/2 + 1/3.', key: { type: 'numeric', options: null, answer: { value: '2/5', tolerance: 0 } }, truth: '5/6' },
  wrong_key_int: { id: 'f0_add_wrong', family: 'add-whole', contextTag: 'bare', stem: 'Compute 2 + 2.', key: { type: 'numeric', options: null, answer: { value: '5', tolerance: 0 } }, truth: '4' },
  wrong_key_mul: { id: 'f10_mul_wrong', family: 'multiply-whole-by-fraction', contextTag: 'bare', stem: 'Compute 2 × 3/5.', key: { type: 'numeric', options: null, answer: { value: '5/6', tolerance: 0 } }, truth: '6/5' },
};
const numericKey = (value) => ({ type: 'numeric', options: null, answer: { value, tolerance: 0 } });
assert.equal(3 / 4 + 1 / 8, 7 / 8);
assert.equal(2 * (3 / 5), 6 / 5);
assert.notEqual(1 / 2 + 1 / 3, 2 / 5, 'the wrong-key fixture is mathematically wrong on purpose');

// ---------------------------------------------------------------------------
// Connections: the owner (trusted boundary, fixture only) and one client per capability.
// ---------------------------------------------------------------------------
let admin; let server;
const conn = {};
const extra = [];
/** A service-shaped db over one capability connection: Queryable + C's transaction (serializable, retried). */
const adb = (client, opts = {}) => ({
  client,
  role: client.fixtureIdentity?.role ?? 'owner',
  query: (sql, params) => client.query(sql, params),
  transaction: (fn) => H.transaction(client, (tx) => fn(tx), opts),
});
async function connect(role, household = 'h1') { const c = await H.connect({ role, household }); extra.push(c); return adb(c); }

// E3-K (#17): two synthetic author identities per household. The author is the session login (never a parameter);
// the capability role is `author`. Provisioned here as the migration owner, exactly like C's principals.
const AUTHOR_LOGINS = { h1: ['e2_h1_author', 'e2_h1_author2'], h2: ['e2_h2_author', 'e2_h2_author2'] };
const authors = {};
async function provisionAuthors() {
  for (const [household, logins] of Object.entries(AUTHOR_LOGINS)) for (const login of logins) {
    const found = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [login]);
    if (found.rowCount === 0) await admin.query(`CREATE ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await admin.query(`GRANT author TO ${login}`);
    await admin.query('INSERT INTO e2.principals(login,household_id) VALUES($1,$2) ON CONFLICT(login) DO UPDATE SET household_id=EXCLUDED.household_id', [login, household]);
  }
}
async function connectAuthor(login) {
  const c = await H.newClient({ user: login, applicationName: 'e2-author-fixture' });
  extra.push(c);
  await c.query('SET ROLE author');
  const identity = (await c.query('SELECT current_user AS role,session_user AS login,e2.household_id() AS household,pg_backend_pid() AS pid')).rows[0];
  assert.deepEqual([identity.role, identity.login], ['author', login]);
  Object.defineProperty(c, 'fixtureIdentity', { value: Object.freeze(identity) });
  return c;
}
const sqlCall = (client, sql, args) => H.transaction(client, async (tx) => (await tx.query(sql, args)).rows[0].value);
const authorKey = (client, item, key, provenance = { source: 'fixture-author' }) => sqlCall(client, 'SELECT e2.author_key($1,$2,$3,$4) AS value', [item.id, item.version, key, provenance]);
const approveItem = (client, item, operationId = crypto.randomUUID(), provenance = { source: 'fixture' }) => sqlCall(client, 'SELECT e2.approve_item($1,$2,$3,$4) AS value', [item.id, item.version, operationId, provenance]);

async function seedHouseholds() {
  for (const h of ['h1', 'h2']) {
    await admin.query('INSERT INTO e2.households(household_id,timezone) VALUES($1,$2) ON CONFLICT DO NOTHING', [h, 'America/Chicago']);
    await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [h, ASSESSMENT_RULE.ruleVersion, { delayHours: 48, quietWindowReps: 10, escalationDays: 14, daySeven: [6, 9], certification: false }, { source: 'synthetic-fixture' }]);
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES($1,$2,'1','approved',$3,$4) ON CONFLICT DO NOTHING",
      [h, 'rubric_' + RUN, { method: 'exact-equality' }, { review: 'synthetic' }]);
  }
  await H.provisionPrincipals(admin);
}

/** Per-case scope: a fresh learner (in h1 and h2) and skill; items are versions of ITEMS under that skill. */
function scope(name) {
  const learner = `lrn_${RUN}_${name}`; const skill = `skill_${RUN}_${name}`;
  const s = {
    learner, skill, other: `lrn_${RUN}_${name}_other`,
    async init() {
      for (const h of ['h1', 'h2']) for (const l of [learner, s.other]) await admin.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING', [h, l]);
    },
    /** Items and rubrics are owner-seeded (no app role may write them): approval is a column, revocation a separate append-only row. */
    n: 0,
    async item(spec, { approval = 'approved', version = '1', rubric = 'rubric_' + RUN, skillId = skill, household = 'h1', id = `${spec.id}_${RUN}_${name}_${++s.n}`, secondKey, approve = true } = {}) {
      await admin.query("INSERT INTO e2.items(household_id,id,version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,approval,content,answer_key,provenance) VALUES($1,$2,$3,$3,$4,'1',$5,'1',$6,$7,$8,$9,$10,$11)",
        [household, id, version, rubric, skillId, spec.family, spec.contextTag, approval, { type: spec.key.type, stem: spec.stem }, spec.key, { reviewedBy: 'fixture-reviewer', source: 'fixture' }]);
      const it = { id, version, skillId, spec, keys: [], approval: null };
      // E3-K: two keys from two author logins, then the approval decision. The second author derives the value
      // independently: `secondKey`, else the spec's `truth` (a wrong-key fixture), else the same key.
      if (approve) {
        const [a1, a2] = authors[household];
        it.keys.push(await authorKey(a1, it, spec.key, { source: 'fixture-author-1' }));
        it.keys.push(await authorKey(a2, it, secondKey ?? (spec.truth !== undefined ? numericKey(spec.truth) : spec.key), { source: 'fixture-author-2' }));
        it.approval = await approveItem(a1, it);
      }
      return it;
    },
    /** A flow, or — when the two-key approval refused the item — the refusal and the issue that is refused with it. */
    async flowOrRefusal(db, item, response, opts = {}) {
      if (item.approval && item.approval.outcome === 'refused') {
        return { approval: item.approval, issued: refusal(await errOf(s.issue(db, item, opts))), result: null, score: null };
      }
      const r = await s.flow(db, item, response, opts);
      const score = (await readAttemptEvidence(conn.report, r.attempt.id))[0].payload.score;
      return { approval: item.approval, issued: null, attempt: r.attempt, result: r.result, score };
    },
    async revoke(kind, id, version = '1') {
      await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1',$1,$2,$3,'fixture withdrawal','{}')", [kind, id, version]);
    },
    issue: (db, item, { operationId = crypto.randomUUID(), learnerId = learner } = {}) =>
      issueAttempt(db, { learnerId, itemId: item.id, itemVersion: item.version, operationId, sessionId: SESSION }),
    submit: (db, attempt, response, { learnerId = learner, client } = {}) => submitAttempt(db, { learnerId, attemptId: attempt.id, response, client }),
    finalize: (db, attempt, response, { learnerId = learner, score } = {}) => finalizeAttempt(db, { learnerId, attemptId: attempt.id, response }, score ? { score } : {}),
    exposure: (db, { skills = [skill], operationId = crypto.randomUUID(), payload = { kind: 'hint' }, learnerId = learner } = {}) =>
      recordExposure(db, { learnerId, skillIds: skills, skillVersion: '1', operationId, sessionId: SESSION, payload, provenance: { source: 'synthetic' } }),
    practice: (db, { operationId = crypto.randomUUID(), payload = { kind: 'practice' }, learnerId = learner } = {}) =>
      appendPractice(db, { learnerId, skillId: skill, skillVersion: '1', operationId, sessionId: SESSION, payload, provenance: { source: 'synthetic' } }),
    async flow(db, item, response, opts = {}) {
      const attempt = await s.issue(db, item, opts);
      await s.submit(conn.learner, attempt, response, opts);
      const result = await s.finalize(db, attempt, response, opts);
      return { attempt, result };
    },
  };
  return s;
}

const errOf = async (p) => { try { await p; return null; } catch (e) { return { name: e.name, code: e.code || null, sqlstate: e.sqlstate ?? (e.name === 'error' ? e.code : null) ?? null, message: String(e.message).slice(0, 160) }; } };
/** Which layer refused a statement, from PostgreSQL's own SQLSTATE and message. */
function refusal(err) {
  if (!err) return { layer: 'none', sqlstate: null, message: null };
  const sqlstate = err.sqlstate || err.code; const m = err.message || '';
  let layer = 'other';
  if (sqlstate === '42501' && /row-level security/.test(m)) layer = 'rls';
  else if (sqlstate === '42501' && /permission denied/.test(m)) layer = 'grant';
  else if (sqlstate === '55000') layer = 'trigger';
  else if (['P0001', 'P0002', '42501', '22023'].includes(sqlstate)) layer = 'function';
  return { layer, sqlstate, message: m.replace(/\s*\|\s*CONTEXT:.*$/, '') };
}
/** A statement executed outside the service, as one role, recorded per statement. */
async function attempt(db, sql, params = []) { return refusal(await errOf(H.transaction(db.client, (tx) => tx.query(sql, params)))); }
async function evidenceCount(attemptId) { return Number((await admin.query('SELECT count(*)::int AS n FROM e2.evidence_events WHERE attempt_id=$1', [attemptId])).rows[0].n); }
async function rawHistory(attemptId) {
  const q = async (sql) => (await admin.query(sql, [attemptId])).rows;
  return JSON.stringify({ attempt: await q('SELECT * FROM e2.attempts WHERE id=$1'), evidence: await q('SELECT * FROM e2.evidence_events WHERE attempt_id=$1 ORDER BY causal_seq,id') });
}
const pid = (db) => db.client.fixtureIdentity?.pid ?? null;
async function backendPid(client) { return (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid; }

const cases = {};

/** Criterion 1: frozen attempt, one row per transition through the functions; every history table refuses UPDATE/DELETE, per statement. */
cases.c1_attempt_lifecycle_immutable = {
  async run() {
    const s = scope('c1'); await s.init();
    const A = conn.assessment;
    const item = await s.item(ITEMS.add_word);
    const op = crypto.randomUUID();
    const issued = await s.issue(A, item, { operationId: op });
    const again = await s.issue(A, item, { operationId: op });
    const other = await s.item(ITEMS.add_bare);
    const issueConflict = refusal(await errOf(s.issue(A, other, { operationId: op })));
    const prompt = await presentItem(conn.learner, issued);
    const submitted = await s.submit(conn.learner, issued, '7/8');
    const result = await s.finalize(A, issued, '7/8');
    const rec = await readAttempt(A, s.learner, issued.id);
    const evidence = await readAttemptEvidence(conn.report, issued.id);
    // Criterion 1 (C r4): one immutable e2.attempt_events row per transition; a retried issue/submit/finalize appends none.
    const eventsOf = async () => (await admin.query("SELECT state, count(*)::int AS n FROM e2.attempt_events WHERE attempt_id=$1 GROUP BY state ORDER BY state", [issued.id])).rows;
    const eventsAfterFlow = await eventsOf();
    await s.issue(A, item, { operationId: op }); await s.submit(conn.learner, issued, '7/8'); await s.finalize(A, issued, '7/8');
    const eventsAfterRetries = await eventsOf();
    const rawBefore = await rawHistory(issued.id);
    // Immutability per statement: first as the assessment role (grant layer), then as the migration owner (trigger layer).
    const mutations = {};
    for (const [name, db, sql, params] of [
      ['assessment_update_attempt', A, 'UPDATE e2.attempts SET learner_id=$2 WHERE id=$1', [issued.id, s.other]],
      ['assessment_delete_attempt', A, 'DELETE FROM e2.attempts WHERE id=$1', [issued.id]],
      ['assessment_update_evidence', A, "UPDATE e2.evidence_events SET payload='{}' WHERE attempt_id=$1", [issued.id]],
      ['assessment_delete_evidence', A, 'DELETE FROM e2.evidence_events WHERE attempt_id=$1', [issued.id]],
      ['assessment_insert_qualifying_evidence', A, "INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('h1',$2,'forged',$1,'s',$3,'1',999,'unassisted-attempt',true,'{}','{}','e2-draft-1')", [issued.id, s.learner, s.skill]],
      ['assessment_update_projection', A, 'UPDATE e2.projections SET independent_successes=99 WHERE learner_id=$1', [s.learner]],
      ['assessment_update_item_key', A, "UPDATE e2.items SET answer_key='{}' WHERE id=$1", [item.id]],
      ['assessment_set_role_writer', A, 'SET ROLE e2_writer', []],
      ['owner_update_attempt_provenance', adb(admin), 'UPDATE e2.attempts SET learner_id=$2 WHERE id=$1', [issued.id, s.other]],
      ['owner_update_attempt_terminal', adb(admin), "UPDATE e2.attempts SET final_result='{}' WHERE id=$1", [issued.id]],
      ['owner_delete_attempt', adb(admin), 'DELETE FROM e2.attempts WHERE id=$1', [issued.id]],
      ['owner_update_evidence', adb(admin), "UPDATE e2.evidence_events SET payload='{}' WHERE attempt_id=$1", [issued.id]],
      ['owner_delete_evidence', adb(admin), 'DELETE FROM e2.evidence_events WHERE attempt_id=$1', [issued.id]],
      ['owner_update_item_key', adb(admin), "UPDATE e2.items SET answer_key='{}' WHERE id=$1", [item.id]],
      ['owner_delete_item', adb(admin), 'DELETE FROM e2.items WHERE id=$1', [item.id]],
    ]) mutations[name] = await attempt(db, sql, params);
    const rawAfter = await rawHistory(issued.id);
    return {
      states: [issued.state, submitted.state, rec.state], sameIdOnRetry: again.id === issued.id, issueConflict,
      frozen: { item_id: rec.item_id, item_version: rec.item_version, key_version: rec.key_version, rubric_id: rec.rubric_id, rubric_version: rec.rubric_version, skill_id: rec.skill_id, skill_version: rec.skill_version, family_id: rec.family_id, context_tag: rec.context_tag, scorer_id: rec.scorer_id, scorer_version: rec.scorer_version, rule_version: rec.rule_version, session_id: rec.session_id },
      promptHasKey: JSON.stringify(prompt).includes('7/8'), promptStem: prompt.stem === ITEMS.add_word.stem,
      // Issue #15 (M08): the presentation names the issued item, and the attempt only as checkId — never the attempt UUID as the item.
      promptIdentity: { itemId: prompt.itemId, checkId: prompt.checkId, issuedItemId: issued.item_id, issuedItemVersion: issued.item_version, attemptId: issued.id, itemVersionPresented: item.version },
      response: submitted.response, result, storedResult: rec.final_result, evidence: evidence.map((e) => ({ class: e.class, qualifying: e.qualifying, id: e.id })),
      mutations, rawUnchanged: rawBefore === rawAfter,
      events: [eventsAfterFlow.map((r) => `${r.state}:${r.n}`), eventsAfterRetries.map((r) => `${r.state}:${r.n}`)],
    };
  },
  assert(o) {
    assert.deepEqual(o.states, ['issued', 'submitted', 'finalized']);
    assert.equal(o.sameIdOnRetry, true, 'same learner/operation returns the stored attempt');
    assert.deepEqual([o.issueConflict.layer, o.issueConflict.sqlstate], ['function', 'P0001'], 'different issue arguments under the same operation fail');
    assert.equal(o.frozen.scorer_id, ASSESSMENT_RULE.scorerId); assert.equal(o.frozen.rule_version, ASSESSMENT_RULE.ruleVersion);
    // Issue #15 (M05): the frozen scorer provenance is the rule's version, not merely some string.
    assert.equal(o.frozen.scorer_version, ASSESSMENT_RULE.scorerVersion, 'the attempt freezes the scorer version the service runs');
    assert.equal(o.promptIdentity.itemId, o.promptIdentity.issuedItemId, 'presentItem names the issued item id');
    assert.equal(o.promptIdentity.itemId, ITEMS.add_word.id + '_' + RUN + '_c1_1', 'the presented item id is the seeded item, version-frozen at issue');
    assert.equal(o.promptIdentity.issuedItemVersion, o.promptIdentity.itemVersionPresented, 'the frozen item version is the presented version');
    assert.notEqual(o.promptIdentity.itemId, o.promptIdentity.attemptId, 'the attempt UUID is never presented as the item id');
    assert.equal(o.promptIdentity.checkId, o.promptIdentity.attemptId, 'the attempt id is the checkId');
    assert.equal(o.frozen.item_version, '1'); assert.equal(o.frozen.family_id, ITEMS.add_word.family);
    assert.equal(o.promptHasKey, false, 'item_presentations carries no key'); assert.equal(o.promptStem, true);
    assert.equal(o.response, '7/8');
    assert.equal(o.result.qualifying, true); assert.deepEqual(o.result.reasons, []); assert.equal(o.result.certification, 'none');
    assert.deepEqual(o.storedResult, o.result, 'the stored first result is the returned result');
    assert.equal(o.evidence.length, 1); assert.equal(o.evidence[0].class, 'unassisted-attempt'); assert.equal(o.evidence[0].id, o.result.evidenceId);
    for (const name of Object.keys(o.mutations).filter((n) => n.startsWith('assessment_'))) assert.deepEqual([o.mutations[name].layer, o.mutations[name].sqlstate], ['grant', '42501'], name);
    for (const name of Object.keys(o.mutations).filter((n) => n.startsWith('owner_'))) assert.deepEqual([o.mutations[name].layer, o.mutations[name].sqlstate], ['trigger', '55000'], name);
    assert.equal(o.rawUnchanged, true, 'history is byte-identical after every refused mutation');
    assert.deepEqual(o.events[0], ['finalized:1', 'issued:1', 'submitted:1'], 'one attempt_events row per transition ([1,1,1])');
    assert.deepEqual(o.events[1], o.events[0], 'retried issue/submit/finalize append no state event');
  },
};

/** Criterion 2: two backends finalize the same attempt at once; one result, one evidence row; a duplicate issue returns one attempt. */
cases.c2_duplicate_concurrent = {
  async run() {
    const s = scope('c2dup'); await s.init();
    const A = conn.assessment; const A2 = await connect('assessment');
    const item = await s.item(ITEMS.add_word);
    const op = crypto.randomUUID();
    const [i1, i2] = await Promise.all([s.issue(A, item, { operationId: op }), s.issue(A2, item, { operationId: op })]);
    await s.submit(conn.learner, i1, '7/8');
    const [r1, r2] = await Promise.all([s.finalize(A, i1, '7/8'), s.finalize(A2, i1, '7/8')]);
    const attemptsForOp = Number((await admin.query('SELECT count(*)::int AS n FROM e2.attempts WHERE learner_id=$1 AND operation_id=$2', [s.learner, op])).rows[0].n);
    return { pids: [pid(A), pid(A2)], sameAttempt: i1.id === i2.id, attemptsForOp, sameResult: JSON.stringify(r1) === JSON.stringify(r2), evidenceRows: await evidenceCount(i1.id), qualifying: r1.qualifying };
  },
  assert(o) {
    assert.notEqual(o.pids[0], o.pids[1], 'two real backends');
    assert.equal(o.sameAttempt, true); assert.equal(o.attemptsForOp, 1);
    assert.equal(o.sameResult, true, 'both finalizers hold the one stored result'); assert.equal(o.evidenceRows, 1); assert.equal(o.qualifying, true);
  },
};

/** Criterion 2: a failure after the function call rolls everything back; the retry starts from nothing and produces the one result; a later retry with a different score gets the first result. */
cases.c2_partial_failure_retry = {
  async run() {
    const s = scope('c2retry'); await s.init();
    const A = conn.assessment;
    const item = await s.item(ITEMS.add_word);
    const issued = await s.issue(A, item);
    await s.submit(conn.learner, issued, '7/8');
    const score = scoreResponse((await svc.readItemForScoring(A, issued)), '7/8');
    const lostAck = await errOf(H.transaction(A.client, async (tx) => {
      await tx.query('SELECT e2.finalize_attempt($1,$2::uuid,$3::jsonb,$4::jsonb) AS value', [s.learner, issued.id, JSON.stringify('7/8'), JSON.stringify(score)]);
      throw new Error('commit acknowledgement lost');
    }));
    const afterRollback = { state: (await readAttempt(A, s.learner, issued.id)).state, evidence: await evidenceCount(issued.id) };
    const first = await s.finalize(A, issued, '7/8');
    const retryDifferentScore = await s.finalize(A, issued, '7/8', { score: () => ({ ...score, correct: false, graded: true }) });
    const retryWrongResponse = refusal(await errOf(s.finalize(A, issued, '1/2')));
    return { lostAck: lostAck.message, afterRollback, first, sameOnRetry: JSON.stringify(first) === JSON.stringify(retryDifferentScore), evidence: await evidenceCount(issued.id), retryWrongResponse };
  },
  assert(o) {
    assert.equal(o.lostAck, 'commit acknowledgement lost');
    assert.deepEqual(o.afterRollback, { state: 'submitted', evidence: 0 }, 'a throw after the call leaves nothing behind');
    assert.equal(o.first.qualifying, true); assert.equal(o.sameOnRetry, true, 'a retry supplying a different score gets the stored first result'); assert.equal(o.evidence, 1);
    assert.deepEqual([o.retryWrongResponse.layer, o.retryWrongResponse.sqlstate], ['function', 'P0001']);
  },
};

/** Criterion 2: the fixed response; a different response is a conflict; ownership is fixed at issue (another learner, another household). */
cases.c2_conflicting_resubmission_and_ownership = {
  async run() {
    const s = scope('c2own'); await s.init();
    const A = conn.assessment; const L = conn.learner;
    const item = await s.item(ITEMS.add_word);
    const issued = await s.issue(A, item);
    const s1 = await s.submit(L, issued, '7/8');
    const s2 = await s.submit(L, issued, '7/8');
    const conflict = refusal(await errOf(s.submit(L, issued, '1/2')));
    const finalizeWrong = refusal(await errOf(s.finalize(A, issued, '1/2')));
    const otherLearner = refusal(await errOf(s.submit(L, issued, '7/8', { learnerId: s.other })));
    const h2 = await connect('learner', 'h2');
    const otherHousehold = refusal(await errOf(s.submit(h2, issued, '7/8')));
    const h2Sees = Number((await h2.query('SELECT count(*)::int AS n FROM e2.attempts WHERE id=$1', [issued.id])).rows[0].n);
    const result = await s.finalize(A, issued, '7/8');
    const afterFinal = await s.submit(L, issued, '7/8');
    const afterFinalConflict = refusal(await errOf(s.submit(L, issued, '1/2')));
    const invalid = refusal(await errOf(s.submit(L, issued, { not: 'valid' })));
    // Issue #15 (M04): a response is stored verbatim; the service never trims. ` 7/8 ` is a different response from `7/8`
    // (a conflict on a fixed attempt) and, submitted first, is stored with its whitespace.
    const whitespaceConflict = refusal(await errOf(s.submit(L, issued, ' 7/8 ')));
    const issued2 = await s.issue(A, await s.item(ITEMS.add_word, { skillId: s.skill + '_ws' }));
    const verbatim = await s.submit(L, issued2, ' 7/8 ');
    const verbatimConflict = refusal(await errOf(s.submit(L, issued2, '7/8')));
    return { repeat: s1.id === s2.id && s2.state === 'submitted', conflict, finalizeWrong, otherLearner, otherHousehold, h2Sees, qualifying: result.qualifying, afterFinal: afterFinal.state, afterFinalConflict, invalid: invalid.sqlstate ?? invalid.message, whitespaceConflict, verbatim: verbatim.response, verbatimConflict };
  },
  assert(o) {
    assert.equal(o.repeat, true, 'an identical retry returns the current row');
    for (const k of ['conflict', 'finalizeWrong', 'afterFinalConflict']) assert.deepEqual([o[k].layer, o[k].sqlstate], ['function', 'P0001'], k);
    assert.deepEqual([o.whitespaceConflict.layer, o.whitespaceConflict.sqlstate], ['function', 'P0001'], 'M04: " 7/8 " is a different response from "7/8" — the service does not trim');
    assert.equal(o.verbatim, ' 7/8 ', 'M04: the response is stored verbatim, whitespace included');
    assert.deepEqual([o.verbatimConflict.layer, o.verbatimConflict.sqlstate], ['function', 'P0001'], 'M04: the trimmed form conflicts with the stored verbatim response');
    assert.deepEqual([o.otherLearner.layer, o.otherLearner.sqlstate], ['function', 'P0002'], 'another learner of the same household: the attempt is unavailable');
    assert.deepEqual([o.otherHousehold.layer, o.otherHousehold.sqlstate], ['function', 'P0002'], 'another household: RLS hides the attempt, the function reports it missing');
    assert.equal(o.h2Sees, 0, 'RLS: the other household reads zero rows');
    assert.equal(o.qualifying, true); assert.equal(o.afterFinal, 'finalized', 'an identical retry after finalization returns the finalized row');
    assert.match(o.invalid, /INVALID_RESPONSE|string/);
  },
};

/** Criterion 3: the capability matrix through the service — which role may call which function; report has no mutation entry point. */
cases.c3_service_role_refusal = {
  async run() {
    const s = scope('c3svc'); await s.init();
    const item = await s.item(ITEMS.add_word);
    const matrix = {};
    const seed = await s.issue(conn.assessment, item);
    await s.submit(conn.learner, seed, '7/8');
    for (const role of ROLES) {
      const db = conn[role];
      const fresh = await s.item(ITEMS.add_bare, { skillId: s.skill + '_' + role });
      matrix[role] = {
        issue: refusal(await errOf(s.issue(db, fresh))),
        submit: refusal(await errOf(s.submit(db, seed, '7/8'))),
        finalize: refusal(await errOf(s.finalize(db, seed, '7/8'))),
        exposure: refusal(await errOf(s.exposure(db, { skills: [s.skill + '_x_' + role] }))),
        practice: refusal(await errOf(s.practice(db))),
      };
    }
    const reportReads = Number((await conn.report.query('SELECT count(*)::int AS n FROM e2.report_projection WHERE learner_id=$1', [s.learner])).rows[0].n);
    const serviceCode = await errOf(s.issue(conn.tutor, item));
    return { matrix, reportReads, serviceCode: { name: serviceCode.name, code: serviceCode.code, sqlstate: serviceCode.sqlstate } };
  },
  assert(o) {
    const expect = { issue: ['assessment'], submit: ['learner', 'assessment'], finalize: ['assessment'], exposure: ['tutor', 'assessment'], practice: ['tutor', 'assessment'] };
    for (const role of ROLES) for (const [fn, allowed] of Object.entries(expect)) {
      const r = o.matrix[role][fn];
      if (allowed.includes(role)) assert.equal(r.layer, 'none', `${role}.${fn} is allowed: ${r.message}`);
      else assert.deepEqual([r.layer, r.sqlstate], ['grant', '42501'], `${role}.${fn} is refused at the EXECUTE grant`);
    }
    assert.equal(o.reportReads, 1, 'report reads the projection the assessment finalization wrote');
    assert.deepEqual(o.serviceCode, { name: 'AssessmentError', code: 'FORBIDDEN', sqlstate: '42501' }, 'the service names the refusal and carries the SQLSTATE');
  },
};

/** Criterion 3: no application role writes attempts, evidence or projections directly; RLS holds even for the owner-granted writer's tables. */
cases.c3_sql_role_refusal = {
  async run() {
    const s = scope('c3sql'); await s.init();
    const item = await s.item(ITEMS.add_word);
    const issued = await s.issue(conn.assessment, item);
    const direct = {};
    for (const role of ROLES) {
      direct[role] = {
        insert_qualifying_evidence: await attempt(conn[role], "INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('h1',$1,'forged',$2,'s',$3,'1',1,'unassisted-attempt',true,'{}','{}','e2-draft-1')", [s.learner, issued.id, s.skill]),
        insert_attempt: await attempt(conn[role], "INSERT INTO e2.attempts(household_id,operation_id,learner_id,item_id,item_version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,scorer_id,scorer_version,rule_version,session_id,issued_seq,exposure_seq) VALUES('h1','forged',$1,$2,'1','1',$3,'1',$4,'1','f','c','x','1','e2-draft-1','s',0,0)", [s.learner, item.id, 'rubric_' + RUN, s.skill]),
        upsert_projection: await attempt(conn[role], "INSERT INTO e2.projections(household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes) VALUES('h1',$1,$2,'1','e2-draft-1','{}',9)", [s.learner, s.skill]),
        update_skill_guard: await attempt(conn[role], 'UPDATE e2.skill_guards SET exposure_seq=0 WHERE learner_id=$1', [s.learner]),
        set_role_writer: await attempt(conn[role], 'SET ROLE e2_writer'),
        call_lock_skills: await attempt(conn[role], 'SELECT e2.lock_skills($1,$2::text[],$3)', [s.learner, [s.skill], '1']),
        read_items_key: await attempt(conn[role], 'SELECT answer_key FROM e2.items WHERE id=$1', [item.id]),
      };
    }
    // The trusted boundary: the owner can insert, but a row for another household is refused by the policy only under a bound login;
    // the owner is not bound (household_id() is NULL) so the policy hides every row from it — recorded, not asserted as protection.
    const ownerBinding = (await admin.query('SELECT e2.household_id() AS h, current_user AS u')).rows[0];
    const writerLogin = (await admin.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='e2_writer'")).rows[0].rolcanlogin;
    return { direct, ownerBinding, writerLogin, evidenceRows: await evidenceCount(issued.id) };
  },
  assert(o) {
    for (const role of ROLES) {
      const d = o.direct[role];
      for (const k of ['insert_qualifying_evidence', 'insert_attempt', 'upsert_projection', 'update_skill_guard', 'set_role_writer', 'call_lock_skills']) assert.deepEqual([d[k].layer, d[k].sqlstate], ['grant', '42501'], `${role}.${k}`);
      if (role === 'assessment') assert.equal(d.read_items_key.layer, 'none', 'the scorer role reads the key');
      else assert.deepEqual([d.read_items_key.layer, d.read_items_key.sqlstate], ['grant', '42501'], `${role} may not read answer keys`);
    }
    assert.equal(o.writerLogin, false, 'e2_writer is NOLOGIN'); assert.equal(o.evidenceRows, 0);
  },
};

/**
 * Criterion 3, end to end on PostgreSQL (E3 #13, ADR-0066): two `tutor` principals of household h1 answer the same
 * pending practice check. The route takes no lock of its own: it registers the check with `e2.queue_practice_check`
 * and consumes it with `e2.practice_check`, whose skill lock is inside the function. The second backend blocks on
 * that advisory lock inside the seam, then gets NO_PENDING_CHECK from it; one E1 result row, one linked seam row.
 */
cases.c3_practice_route_race_pg = {
  async run() {
    const schema = `e1_fixture_e2a_${RUN}`;
    const e1sql = fs.readFileSync(path.join(ROOT, 'tests/engine/pg/e1-schema.sql'), 'utf8');
    const now = new Date('2026-01-03T12:00:00.000Z');
    const sessionId = `s_${RUN}`;
    const learnerId = `lrn_e1_${RUN}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    // Two product callers: tutor principals, not the owner (README: never use the owner as a product caller).
    const raw = [await H.connect({ role: 'tutor', household: 'h1' }), await H.connect({ role: 'tutor', household: 'h1' })];
    extra.push(...raw);
    try {
      await admin.query(`SET search_path TO ${schema}, pg_catalog`);
      await admin.query(e1sql);
      await admin.query(`INSERT INTO accounts VALUES('acc_e1'); INSERT INTO learners VALUES('${learnerId}','acc_e1','13-17');`);
      await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO tutor; GRANT ALL ON ALL TABLES IN SCHEMA ${schema} TO tutor; GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schema} TO tutor; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schema} TO tutor`);
      await admin.query('RESET search_path');
      await admin.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING', ['h1', learnerId]);
      for (const c of raw) { await c.query(`SET search_path TO ${schema}, e2, pg_catalog`); await c.query("SELECT set_config('e1.fixture_time',$1,false)", [now.toISOString()]); }
      const principal = { accountId: 'acc_e1', learnerId, band: '13-17', role: 'learner' };
      const parsed = pendingFromTag({ type: 'numeric', skillId: 'F1', stem: 'Compute 2 plus 2.', answer: { value: 4, tolerance: 0 } }, { skillId: 'F1', diagnostic: false, issuedTurnId: 'trn_fixture', now });
      const pending = parsed.pending;
      const state = { ...initialState({ band: '13-17', target: 'skill', startedAt: now, skillId: 'F1', diagnostic: null, delayedCheck: null }), pendingCheck: pending };
      await admin.query(`INSERT INTO ${schema}.sessions(id,account_id,learner_id,started_at,phase,skill_id,state) VALUES($3,'acc_e1',$4,$1,'work','F1',$2)`, [now.toISOString(), JSON.stringify(state), sessionId, learnerId]);
      // Hold the first caller right after its queue call returns: the seam's skill lock is then held by its
      // transaction, so the competitor blocks inside e2.queue_practice_check. Count any lock statement the route issues itself.
      const g = gate();
      let routeLockStatements = 0;
      const wrap = (client, hold) => ({
        query: async (sql, params) => { if (/pg_advisory/.test(sql)) routeLockStatements += 1; const r = await client.query(sql.replace(/\bnow\(\)/gi, 'fixture_now()'), params); if (hold && /e2\.queue_practice_check/.test(sql)) await g.wait(); return r; },
        transaction: (fn) => H.transaction(client, (tx) => fn(wrap(tx, hold)), { isolation: 'read committed' }),
      });
      const pids = [await backendPid(raw[0]), await backendPid(raw[1])];
      const first = answerCheck(wrap(raw[0], true), principal, { sessionId, checkId: pending.checkId, answer: 4 }, { now });
      await g.entered;
      const second = answerCheck(wrap(raw[1], false), principal, { sessionId, checkId: pending.checkId, answer: 4 }, { now });
      const blocked = await waitBlocked(admin, pids[1], pids[0]);
      g.release();
      const a = await first; const b = await second;
      const results = (await admin.query(`SELECT count(*)::int AS n FROM ${schema}.evidence_events WHERE type='check_result'`)).rows[0].n;
      const seam = (await admin.query("SELECT count(*)::int AS n, bool_and(e.class='corrections-practice' AND e.qualifying=false) AS practice FROM e2.evidence_events e JOIN e2.practice_checks p ON p.id=e.practice_check_id WHERE p.learner_id=$1 AND p.session_id=$2 AND p.check_id=$3", [learnerId, sessionId, pending.checkId])).rows[0];
      const seamOnEvidence = (await admin.query(`SELECT payload->'exposure'->>'seam' AS seam FROM ${schema}.evidence_events WHERE type='check_result'`)).rows[0]?.seam;
      return { pids, blocked: { wait_event_type: blocked.wait_event_type, wait_event: blocked.wait_event, blockers: blocked.blockers }, outcomes: [a.ok, b.ok], secondCode: b.ok ? null : b.code, resultRows: Number(results), routeLockStatements, seamRows: Number(seam.n), seamPractice: seam.practice, seamOnEvidence };
    } finally {
      await admin.query('RESET search_path');
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  },
  assert(o) {
    assert.notEqual(o.pids[0], o.pids[1]);
    assert.equal(o.blocked.wait_event_type, 'Lock'); assert.equal(o.blocked.wait_event, 'advisory', 'the second backend waited on the advisory lock inside the seam'); assert.ok(o.blocked.blockers.includes(o.pids[0]));
    assert.deepEqual(o.outcomes, [true, false]); assert.equal(o.secondCode, 'NO_PENDING_CHECK'); assert.equal(o.resultRows, 1, 'exactly one result row for one pending check');
    assert.equal(o.routeLockStatements, 0, 'E3 #13: the route issued no advisory-lock statement of its own');
    assert.equal(o.seamRows, 1, 'exactly one seam evidence row linked to the queued check'); assert.equal(o.seamPractice, true, 'the seam row is corrections-practice, non-qualifying');
    assert.equal(o.seamOnEvidence, 'visible', 'the tutor principal saw the seam');
  },
};

/** Criterion 4: only approved, nonrevoked content issues; a revocation between issue and finalization disqualifies; a new key is a new version. */
cases.c4_trusted_content = {
  async run() {
    const s = scope('c4'); await s.init();
    const A = conn.assessment;
    const draft = await s.item(ITEMS.add_word, { approval: 'draft' });
    const draftIssue = refusal(await errOf(s.issue(A, draft)));
    const missing = refusal(await errOf(s.issue(A, { id: 'nope_' + RUN, version: '1' })));
    const revokedItem = await s.item(ITEMS.add_bare); await s.revoke('item', revokedItem.id);
    const revokedIssue = refusal(await errOf(s.issue(A, revokedItem)));
    const approved = await s.item(ITEMS.mul_bare);
    const ok = await s.flow(A, approved, '6/5');
    // E3-K: the mid-flight revocation control uses an approvable item (a wrong-key item is now refused before issue).
    const mid = await s.item(ITEMS.add_bare, { skillId: s.skill + '_mid' });
    const midIssued = await s.issue(A, mid); await s.submit(conn.learner, midIssued, '7/8');
    await s.revoke('item', mid.id);
    const midResult = await s.finalize(A, midIssued, '7/8');
    const rubricItem = await s.item(ITEMS.add_word, { skillId: s.skill + '_rub', rubric: 'rubric_' + RUN });
    const rubIssued = await s.issue(A, rubricItem); await s.submit(conn.learner, rubIssued, '7/8');
    // Revoking the shared rubric would poison every other case's items; revoke a dedicated rubric instead.
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES('h1',$1,'1','approved','{}','{}')", ['rubric_' + RUN + '_c4']);
    const rub2 = await s.item(ITEMS.add_bare, { skillId: s.skill + '_rub2', rubric: 'rubric_' + RUN + '_c4' });
    const rub2Issued = await s.issue(A, rub2); await s.submit(conn.learner, rub2Issued, '7/8');
    await s.revoke('rubric', 'rubric_' + RUN + '_c4');
    const rub2Result = await s.finalize(A, rub2Issued, '7/8');
    const rubResult = await s.finalize(A, rubIssued, '7/8');
    const keyEdit = await attempt(adb(admin), "UPDATE e2.items SET answer_key='{\"type\":\"numeric\",\"options\":null,\"answer\":{\"value\":\"1/8\",\"tolerance\":0}}' WHERE id=$1", [approved.id]);
    const v2 = await s.item(ITEMS.mul_bare, { version: '2', id: approved.id });
    const frozenAt = (await readAttempt(A, s.learner, ok.attempt.id)).item_version;
    // The reviewer's three known-wrong keys: the response that MATCHES the wrong key must not qualify, nor may the true answer.
    const wrongKeys = {};
    // E3-K: the second author's key is the truth, so the two keys disagree and the item is refused at approval (with the
    // content gate's disagreement recorded beside it); issuing it is refused; neither response ever reaches grading.
    for (const [name, spec, keyed, truth] of [['add', ITEMS.wrong_key, '2/5', '5/6'], ['int', ITEMS.wrong_key_int, '5', '4'], ['mul', ITEMS.wrong_key_mul, '5/6', '6/5']]) {
      const k = await s.flowOrRefusal(A, await s.item(spec, { skillId: `${s.skill}_wk_${name}` }), keyed);
      const t = await s.flowOrRefusal(A, await s.item(spec, { skillId: `${s.skill}_wt_${name}` }), truth);
      wrongKeys[name] = { keyed: k, truth: t, expected: truth, wrong: keyed };
    }
    const bareControl = await s.flow(A, await s.item(ITEMS.add_bare, { skillId: s.skill + '_bare' }), '7/8');
    // Round 6 (reviewer r5, criterion 4): the same three expressions in the eight presentations the reviewer used —
    // six of which bypassed the gate at 11d36ea. Wrong keys must abstain (key_unverified) and correct keys must
    // still grade, whatever the wrapper. Per case the evaluator path that fired is recorded.
    const FORMS = { plain: (x) => 'Compute ' + x + '.', parens: (x) => 'Compute (' + x + ').', value_of: (x) => 'What is the value of ' + x + '?', evaluate: (x) => 'Evaluate: ' + x + '.', latex: (x) => '$' + x + '$', equals_q: (x) => 'Compute ' + x + ' = ?', instruction_line: (x) => x + '\nGive your answer as a fraction.', calculate: (x) => 'Calculate ' + x + '.' };
    const EXPRS = { add: ['1/2 + 1/3', '5/6', '2/5'], int: ['2 + 2', '4', '5'], mul: ['2 × 3/5', '6/5', '5/6'] };
    const variants = [];
    let vi = 0;
    for (const [ename, [expr, truth, wrong]] of Object.entries(EXPRS)) for (const [fname, form] of Object.entries(FORMS)) for (const good of [true, false]) {
      const stem = form(expr); const keyValue = good ? truth : wrong; vi++;
      const key = { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: `f_v${vi}_${ename}_${fname}`, family: 'variant-' + ename, contextTag: 'bare', stem, key };
      // E3-K: for a wrong key the second author supplies the truth; the pair disagrees and approval is refused.
      const r = await s.flowOrRefusal(A, await s.item(spec, { skillId: `${s.skill}_v${vi}`, secondKey: numericKey(good ? keyValue : truth) }), keyValue);
      variants.push({ expr: ename, form: fname, stem, key: keyValue, good, approval: { outcome: r.approval.outcome, reasons: r.approval.reasons, authors: r.approval.authors, verdict: r.approval.content_verdict }, issued: r.issued, qualifying: r.result?.qualifying ?? null, reasons: r.result?.reasons ?? null, score: r.score, verdict: contentCheck.verifyNumericKey(stem, key) });
    }
    // Fail closed: a stem the evaluator cannot produce a value for never grades against the key, even when the key is right.
    const unverifiable = [];
    for (const [name, stem, keyValue, response] of [['three_terms', 'Compute 2 + 2 + 2.', '6', '6'], ['word_ambiguous', 'Maya has 3 boxes with 1/4 kg in each. How much is that?', '3/4', '3/4'], ['short_key', ITEMS.short.stem, null, 'how many equal parts']]) {
      const key = keyValue === null ? ITEMS.short.key : { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: 'f_u_' + name, family: 'unverifiable', contextTag: 'bare', stem, key };
      // E3-K: an abstaining gate does not block approval (the two keys agree); a non-rational key is refused at approval.
      const r = await s.flowOrRefusal(A, await s.item(spec, { skillId: `${s.skill}_u_${name}` }), response);
      unverifiable.push({ name, stem, approval: { outcome: r.approval.outcome, reasons: r.approval.reasons, verdict: r.approval.content_verdict }, issued: r.issued, qualifying: r.result?.qualifying ?? null, reasons: r.result?.reasons ?? null, score: r.score, verdict: contentCheck.verifyNumericKey(stem, key) });
    }
    // Round 7 (reviewer r6, criterion 4): the five semantic cases whose lossy normalisation admitted a wrong key, each with
    // the wrong key and with the true key, plus the zero denominator that threw. Every one must abstain with a recorded reason.
    const SEMANTIC = [['newline_instruction', 'Compute 2 + 2.\nThen double the result.', '4', '8'], ['trailing_sentence', 'Compute 2 + 2. Then double the result.', '4', '8'], ['superscript', 'Compute 2² + 3.', '25', '7'], ['word_product', 'Maya has 2 bags with 3 marbles in each. How many marbles in total?', '5', '6'], ['word_order', 'Maya has 3 marbles. Sam has 5 marbles. How many more does Sam have?', '-2', '2'], ['zero_denominator', 'Compute 1/0 + 2.', '2', null]];
    const semantic = [];
    for (const [name, stem, wrong, truth] of SEMANTIC) for (const keyValue of truth === null ? [wrong] : [wrong, truth]) {
      const good = keyValue === truth;
      const key = { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: `f_s_${name}_${good ? 'true' : 'wrong'}`, family: 'semantic', contextTag: 'bare', stem, key };
      const r = await s.flow(A, await s.item(spec, { skillId: `${s.skill}_s_${name}_${good ? 't' : 'w'}` }), keyValue);
      const score = (await readAttemptEvidence(conn.report, r.attempt.id))[0].payload.score;
      semantic.push({ name, stem, key: keyValue, truth, good, qualifying: r.result.qualifying, reasons: r.result.reasons, score, verdict: contentCheck.verifyNumericKey(stem, key), evaluation: (() => { const e = contentCheck.evaluateStem(stem); return { value: e.value ? contentCheck.showRational(e.value) : null, path: e.path, why: e.why ?? null }; })() });
    }
    // Round 8 (reviewer r7, criterion 4): the six trials whose mapping or float comparison admitted a wrong key, literal stems
    // and keys from the report, plus the `\times` control and an inexact key. Expected: [name, stem, key, status, reason|expected].
    const R7 = [
      ['factorial_plain', 'Compute 2 + 3!', '5', 'unverifiable', 'not_canonical_stem'], ['factorial_latex', '$2 + 3!$', '5', 'unverifiable', 'not_canonical_stem'],
      ['frac_adjacent_1', '$\\frac{1}{2}\\frac{3}{4}$', '1/92', 'unverifiable', 'not_canonical_stem'], ['frac_adjacent_2', '$\\frac{2}{3}\\frac{4}{5}$', '1/85', 'unverifiable', 'not_canonical_stem'],
      ['frac_times_control', '$\\frac{1}{2}\\times\\frac{3}{4}$', '3/8', 'unverifiable', 'not_canonical_stem'],
      ['precision_int_wrong', 'Compute 9007199254740992 + 1.', '9007199254740992', 'disagrees', '9007199254740993'], ['precision_int_true', 'Compute 9007199254740992 + 1.', '9007199254740993', 'agrees', '9007199254740993'],
      ['precision_small_wrong', 'Compute 1/10000000000 + 0.', '0', 'disagrees', '1/10000000000'], ['precision_small_true', 'Compute 1/10000000000 + 0.', '1/10000000000', 'agrees', '1/10000000000'],
      ['key_scientific', 'Compute 2 + 2.', '4e0', 'unverifiable', 'key_not_exact_rational'],
    ];
    const r7 = [];
    for (const [name, stem, keyValue, status, detail] of R7) {
      const key = { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: `f_r7_${name}`, family: 'r7', contextTag: 'bare', stem, key };
      // E3-K: two agreeing authors; the SQL content gate alone decides the two precision-wrong keys (refused) and the
      // inexact `4e0` key (refused as not an exact rational); abstentions approve and grade as before.
      const r = await s.flowOrRefusal(A, await s.item(spec, { skillId: `${s.skill}_r7_${name}` }), keyValue);
      r7.push({ name, stem, key: keyValue, status, detail, approval: { outcome: r.approval.outcome, reasons: r.approval.reasons, verdict: r.approval.content_verdict }, issued: r.issued, qualifying: r.result?.qualifying ?? null, reasons: r.result?.reasons ?? null, score: r.score, verdict: contentCheck.verifyNumericKey(stem, key) });
    }
    // Round 9 (reviewer r8, ADR-0067): the grammar is `ATOM OP ATOM` and nothing else. The reviewer's two division chains
    // (which qualified at 52d3e34 with the wrong key), the two slash-chain probes, and every other non-canonical shape
    // abstain; one operation between two fractions evaluates exactly. Expected: [name, stem, key, status, reason|expected].
    const R9 = [
      ['div_chain_8', 'Compute 8÷2÷2÷2.', '4', 'unverifiable', 'not_canonical_stem'], ['div_chain_9', 'Compute 9÷3÷3÷3.', '3', 'unverifiable', 'not_canonical_stem'],
      ['slash_chain', '1/2/3/4', '2/3', 'unverifiable', 'not_canonical_stem'], ['mixed_chain', '8÷2/2/2', '4', 'unverifiable', 'not_canonical_stem'],
      ['sub_chain', '8-2-2-2', '2', 'unverifiable', 'not_canonical_stem'], ['precedence', '2+3×4', '14', 'unverifiable', 'not_canonical_stem'],
      ['inner_parens', '(1/2)+(1/3)', '5/6', 'unverifiable', 'not_canonical_stem'], ['unary_minus', '-2 + 3', '1', 'unverifiable', 'not_canonical_stem'],
      ['double_minus', '2 - -3', '5', 'unverifiable', 'not_canonical_stem'], ['mixed_number', '1 1/2 + 1/2', '2', 'unverifiable', 'not_canonical_stem'],
      ['decimal', '2.5 + 1', '7/2', 'unverifiable', 'not_canonical_stem'],
      ['frac_add', '1/2 + 1/3', '5/6', 'agrees', '5/6'], ['int_times_frac', '2 × 3/5', '6/5', 'agrees', '6/5'], ['int_add', '2 + 2', '4', 'agrees', '4'],
      ['int_div', '6 ÷ 4', '3/2', 'agrees', '3/2'], ['outer_parens', '(1/2 + 1/3)', '5/6', 'agrees', '5/6'], ['latex_parens', '\\(1/2 + 1/3\\)', '5/6', 'agrees', '5/6'],
      ['no_spaces', '1/2+1/3', '5/6', 'agrees', '5/6'],
    ];
    const r9 = [];
    for (const [name, stem, keyValue, status, detail] of R9) {
      const key = { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: `f_r9_${name}`, family: 'r9', contextTag: 'bare', stem, key };
      const r = await s.flow(A, await s.item(spec, { skillId: `${s.skill}_r9_${name}` }), keyValue);
      const score = (await readAttemptEvidence(conn.report, r.attempt.id))[0].payload.score;
      r9.push({ name, stem, key: keyValue, status, detail, qualifying: r.result.qualifying, reasons: r.result.reasons, score, verdict: contentCheck.verifyNumericKey(stem, key) });
    }
    // Issue #15 (reviewer r9, ADR-0067): the trailer is ONE of the closed list `= ?`, `.`, `?`. A second trailer after `= ?`
    // (`= ?.`, `= ??`) is not on the list and abstains as not_canonical_stem; each single trailer still grades.
    const TRAILERS = [
      ['double_eq_dot', '2+3 = ?.', '5', 'unverifiable', 'not_canonical_stem'], ['double_eq_q', '2+3 = ??', '5', 'unverifiable', 'not_canonical_stem'],
      ['single_eq', '2+3 = ?', '5', 'agrees', '5'], ['single_dot', '2+3.', '5', 'agrees', '5'], ['single_q', '2+3?', '5', 'agrees', '5'],
    ];
    const trailers = [];
    for (const [name, stem, keyValue, status, detail] of TRAILERS) {
      const key = { type: 'numeric', options: null, answer: { value: keyValue, tolerance: 0 } };
      const spec = { id: `f_t15_${name}`, family: 'trailer', contextTag: 'bare', stem, key };
      const r = await s.flow(A, await s.item(spec, { skillId: `${s.skill}_t15_${name}` }), keyValue);
      const score = (await readAttemptEvidence(conn.report, r.attempt.id))[0].payload.score;
      trailers.push({ name, stem, key: keyValue, status, detail, qualifying: r.result.qualifying, reasons: r.result.reasons, score, verdict: contentCheck.verifyNumericKey(stem, key) });
    }
    // Property: 500 random `a/b OP c/d` (seeded; small integers, b,d > 0). The evaluator equals a BigInt reference computed
    // here; the two wrong keys reference ± 1/1000 never agree. Module-level (no flows); the flows above prove the seam.
    let seed = 0x9e3779b1 >>> 0;
    const rnd = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
    const red = (n, d) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
    const property = { trials: 0, agree: 0, wrongAgrees: 0, wrongAbstainOrDisagree: 0, first: null };
    for (let i = 0; i < 500; i++) {
      const [a, b, c, d] = [BigInt(rnd(20)), BigInt(1 + rnd(12)), BigInt(rnd(20)), BigInt(1 + rnd(12))];
      const op = ['+', '-', '×', '*', '÷'][rnd(5)];
      if (op === '÷' && c === 0n) continue;
      const ref = op === '+' ? red(a * d + c * b, b * d) : op === '-' ? red(a * d - c * b, b * d) : op === '÷' ? red(a * d, b * c) : red(a * c, b * d);
      const show = (r) => r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`;
      const stem = `${a}/${b} ${op} ${c}/${d}`;
      const mk = (v) => ({ type: 'numeric', options: null, answer: { value: v, tolerance: 0 } });
      const truth = contentCheck.verifyNumericKey(stem, mk(show(ref)));
      property.trials++;
      if (truth.status === 'agrees' && truth.expected === show(ref)) property.agree++;
      for (const delta of [1n, -1n]) {
        const wrong = contentCheck.verifyNumericKey(stem, mk(show(red(ref.n * 1000n + delta * ref.d, ref.d * 1000n))));
        if (wrong.status === 'agrees') property.wrongAgrees++; else property.wrongAbstainOrDisagree++;
      }
      if (!property.first) property.first = { stem, reference: show(ref), verdict: truth };
    }
    return { draftIssue, missing, revokedIssue, ok: ok.result, midResult, rub2Result, rubResult, keyEdit, v2: v2.version, frozenAt, wrongKeys, bareControl: bareControl.result, variants, unverifiable, semantic, r7, r9, trailers, property };
  },
  assert(o) {
    assert.deepEqual([o.draftIssue.layer, o.draftIssue.sqlstate], ['function', 'P0001']); assert.match(o.draftIssue.message, /not approved/);
    assert.deepEqual([o.missing.layer, o.missing.sqlstate], ['function', 'P0002']);
    assert.deepEqual([o.revokedIssue.layer, o.revokedIssue.sqlstate], ['function', 'P0001']);
    assert.equal(o.ok.qualifying, true, 'positive control');
    assert.equal(o.midResult.qualifying, false); assert.ok(o.midResult.reasons.includes('content_not_approved'), 'item revoked mid-flight');
    assert.equal(o.rub2Result.qualifying, false); assert.ok(o.rub2Result.reasons.includes('content_not_approved'), 'rubric revoked mid-flight');
    assert.equal(o.rubResult.qualifying, true, 'the shared rubric stays approved');
    assert.deepEqual([o.keyEdit.layer, o.keyEdit.sqlstate], ['trigger', '55000'], 'a key is never edited in place'); assert.equal(o.v2, '2'); assert.equal(o.frozenAt, '1');
    // E3-K: a known-wrong key is refused at approval — the two authors disagree and the SQL gate disagrees — and the item
    // cannot be issued, whichever response the learner would have given. Nothing reaches grading.
    for (const [name, w] of Object.entries(o.wrongKeys)) {
      for (const side of ['keyed', 'truth']) {
        assert.equal(w[side].approval.outcome, 'refused', `${name}/${side}: refused at approval`);
        assert.ok(w[side].approval.reasons.includes('keys_disagree'), `${name}/${side}: the two authors disagree`);
        assert.equal(w[side].approval.content_verdict.status, 'no_agreed_key', `${name}/${side}: with no agreed key the gate has nothing to compare`);
        assert.equal(w[side].approval.content_verdict.expected, w.expected, `${name}/${side}: the gate's own value is still recorded`);
        assert.deepEqual([w[side].issued.layer, w[side].issued.sqlstate], ['function', 'P0001'], `${name}/${side}: never issued`); assert.match(w[side].issued.message, /two-key/);
        assert.equal(w[side].result, null, `${name}/${side}: no attempt, no evidence`);
      }
    }
    assert.equal(o.bareControl.qualifying, true, 'positive control: an approved key the evaluator agrees with still grades');
    assert.equal(o.variants.length, 48, '3 expressions x 8 presentations x {correct, wrong} key');
    // E3-K: the 24 wrong keys fail at approval (two authors disagree) and are never issued; the 21 correct keys the gate can
    // evaluate still qualify; the 3 correct instruction_line keys approve on abstention and still fail closed at grading.
    assert.equal(o.variants.filter((v) => !v.good).length, 24); assert.equal(o.variants.filter((v) => v.qualifying === true).length, 21);
    for (const v of o.variants) {
      const label = `${v.expr}/${v.form}/${v.good ? 'correct' : 'wrong'} ${JSON.stringify(v.stem)}`;
      assert.equal(v.approval.authors.length, 2, `${label}: two recorded authors`);
      if (!v.good) {
        assert.equal(v.approval.outcome, 'refused', `${label}: refused at approval`); assert.ok(v.approval.reasons.includes('keys_disagree'), label);
        assert.equal(v.approval.verdict.status, v.form === 'instruction_line' ? 'abstained' : 'no_agreed_key', `${label}: the SQL gate's own evaluation is recorded beside the refusal`);
        if (v.form !== 'instruction_line') assert.equal(v.approval.verdict.expected, contentCheck.verifyNumericKey(v.stem, numericKey(v.key)).expected, `${label}: SQL and TS evaluate the stem to the same value`);
        assert.deepEqual([v.issued.layer, v.issued.sqlstate], ['function', 'P0001'], `${label}: never issued`); assert.equal(v.qualifying, null, `${label}: never graded`);
        continue;
      }
      assert.equal(v.approval.outcome, 'approved', label);
      if (v.form === 'instruction_line') {
        assert.equal(v.approval.verdict.status, 'abstained', `${label}: the SQL gate abstained and did not block`);
        // Round 7: a second, digit-free line is no longer dropped — the stem is not canonical and the gate fails closed
        // for the correct key as well as the wrong one. Recorded as fail-closed and acceptable, not fixed.
        assert.ok(v.verdict.path.startsWith('none'), `${label}: no value (path ${v.verdict.path})`);
        assert.equal(v.verdict.status, 'unverifiable', label); assert.equal(v.verdict.reason, 'not_canonical_stem', label);
        assert.equal(v.qualifying, false, `${label}: fail closed, whichever key`);
        assert.deepEqual(v.reasons, ['not_correct_or_ungraded'], label);
        assert.equal(v.score.graded, false, label); assert.equal(v.score.reason, 'key_unverifiable:not_canonical_stem', label);
        continue;
      }
      assert.ok(v.verdict.path.startsWith('binary'), `${label}: the evaluator produced a value (path ${v.verdict.path})`);
      assert.equal(v.verdict.status, 'agrees', label); assert.equal(v.approval.verdict.status, 'agrees', `${label}: the SQL gate agrees with the TS gate`);
      assert.equal(v.approval.verdict.path, v.verdict.path, `${label}: same normalisation path in SQL and TS`);
      assert.equal(v.qualifying, true, `${label}: a correct approved key still grades under this presentation`);
      assert.equal(v.score.correct, true, label);
    }
    assert.equal(o.unverifiable.length, 3);
    // E3-K: the short (non-rational) key is refused at approval and never issued; the two abstentions approve and fail closed at grading.
    assert.equal(o.unverifiable[2].approval.outcome, 'refused'); assert.ok(o.unverifiable[2].approval.reasons.some((r) => r.startsWith('key_not_exact_rational:')), 'short key: non-rational, refused');
    assert.deepEqual([o.unverifiable[2].issued.layer, o.unverifiable[2].issued.sqlstate], ['function', 'P0001']); assert.equal(o.unverifiable[2].verdict.status, 'unverifiable');
    for (const u of o.unverifiable.slice(0, 2)) {
      assert.equal(u.approval.outcome, 'approved', u.name); assert.equal(u.approval.verdict.status, 'abstained', `${u.name}: abstention does not block`);
      assert.equal(u.verdict.status, 'unverifiable', u.name);
      assert.equal(u.qualifying, false, `${u.name}: no independent value, no qualifying evidence`);
      assert.deepEqual(u.reasons, ['not_correct_or_ungraded'], u.name);
      assert.equal(u.score.graded, false, u.name);
      assert.equal(u.score.reason, 'key_unverifiable:' + u.verdict.reason, `${u.name}: the stated reason is recorded, never a fall-through to the key`);
    }
    assert.equal(o.unverifiable[0].score.reason, 'key_unverifiable:not_canonical_stem');
    assert.equal(o.unverifiable[1].score.reason, 'key_unverifiable:not_canonical_stem');
    // Reviewer r6 semantic cases: 5 stems x {wrong, true} key + the zero denominator = 11 flows, none qualifying, each with its reason recorded.
    assert.equal(o.semantic.length, 11);
    for (const c of o.semantic) {
      const label = `${c.name}/${c.good ? 'true' : 'wrong'} ${JSON.stringify(c.stem)} key=${c.key}`;
      assert.equal(c.evaluation.value, null, `${label}: the evaluator produced no value (path ${c.evaluation.path})`);
      assert.equal(c.verdict.status, 'unverifiable', label);
      assert.equal(c.qualifying, false, `${label}: never qualifying evidence`);
      assert.deepEqual(c.reasons, ['not_correct_or_ungraded'], label);
      assert.equal(c.score.graded, false, label);
      assert.equal(c.score.reason, 'key_unverifiable:' + c.verdict.reason, `${label}: the reason is recorded, never a throw and never a fall-through`);
      assert.equal(c.verdict.reason, c.name === 'zero_denominator' ? 'evaluator_error:division_by_zero' : 'not_canonical_stem', label);
    }
    assert.equal(o.semantic.find((c) => c.name === 'superscript').evaluation.path, 'none,nfkc-lossy', 'NFKC that creates a digit is refused, not applied');
    // Reviewer r7 trials: 10 flows. Whitelist-refused stems and inexact keys abstain with the reason recorded; the two
    // precision cases are decided by exact rational equality (wrong key disagrees, true key qualifies).
    assert.equal(o.r7.length, 10);
    for (const c of o.r7) {
      const label = `r7/${c.name} ${JSON.stringify(c.stem)} key=${c.key}`;
      assert.equal(c.verdict.status, c.status, label);
      if (c.status === 'agrees') {
        assert.equal(c.approval.outcome, 'approved', label); assert.equal(c.approval.verdict.status, 'agrees', label); assert.equal(c.approval.verdict.expected, c.detail, `${label}: the SQL gate is exact`);
        assert.equal(c.verdict.expected, c.detail, label); assert.equal(c.qualifying, true, `${label}: the exact true key still grades`); assert.equal(c.score.correct, true, label);
      } else if (c.status === 'disagrees') {
        // E3-K: both authors agree on the wrong key; the SQL gate alone refuses it at approval, exactly.
        assert.equal(c.approval.outcome, 'refused', label); assert.deepEqual(c.approval.reasons, ['content_gate_disagrees'], label);
        assert.equal(c.approval.verdict.expected, c.detail, label); assert.equal(c.approval.verdict.keyed, c.key, label);
        assert.deepEqual([c.issued.layer, c.issued.sqlstate], ['function', 'P0001'], `${label}: never issued`); assert.equal(c.qualifying, null, label);
        assert.equal(c.verdict.expected, c.detail, label);
      } else if (c.detail === 'key_not_exact_rational') {
        assert.equal(c.approval.outcome, 'refused', label); assert.deepEqual(c.approval.reasons, ['key_not_exact_rational:e2_h1_author', 'key_not_exact_rational:e2_h1_author2', 'fewer_than_two_authors'], `${label}: both inexact keys named, no rational pair`);
        assert.deepEqual([c.issued.layer, c.issued.sqlstate], ['function', 'P0001'], label); assert.equal(c.qualifying, null, label);
      } else {
        assert.equal(c.approval.outcome, 'approved', label); assert.equal(c.approval.verdict.status, 'abstained', label); assert.equal(c.approval.verdict.reason, c.detail, `${label}: SQL and TS abstain for the same reason`);
        assert.equal(c.verdict.reason, c.detail, label); assert.equal(c.qualifying, false, `${label}: never qualifying evidence`);
        assert.deepEqual(c.reasons, ['not_correct_or_ungraded'], label); assert.equal(c.score.graded, false, label);
        assert.equal(c.score.reason, 'key_unverifiable:' + c.detail, `${label}: the reason is recorded, never a fall-through`);
      }
    }
    // Reviewer r8 / ADR-0067: 18 flows. Every chain, precedence, inner-paren, signed, mixed or decimal stem abstains as
    // not_canonical_stem (the two division chains qualified at 52d3e34); the seven `ATOM OP ATOM` stems grade exactly.
    assert.equal(o.r9.length, 18);
    for (const c of o.r9) {
      const label = `r9/${c.name} ${JSON.stringify(c.stem)} key=${c.key}`;
      assert.equal(c.verdict.status, c.status, label);
      if (c.status === 'agrees') {
        assert.ok(c.verdict.path.startsWith('binary'), label);
        assert.equal(c.verdict.expected, c.detail, label); assert.equal(c.qualifying, true, `${label}: one operation between two fractions still grades`); assert.equal(c.score.correct, true, label);
      } else {
        assert.ok(c.verdict.path.startsWith('none'), `${label}: no value (path ${c.verdict.path})`);
        assert.equal(c.verdict.reason, c.detail, label); assert.equal(c.qualifying, false, `${label}: never qualifying evidence`);
        assert.deepEqual(c.reasons, ['not_correct_or_ungraded'], label); assert.equal(c.score.graded, false, label);
        assert.equal(c.score.reason, 'key_unverifiable:' + c.detail, `${label}: the reason is recorded, never a fall-through`);
      }
    }
    // Issue #15: 5 trailer flows. `= ?.` and `= ??` abstain as not_canonical_stem; `= ?`, `.` and `?` alone still grade.
    assert.equal(o.trailers.length, 5);
    for (const c of o.trailers) {
      const label = `trailer/${c.name} ${JSON.stringify(c.stem)} key=${c.key}`;
      assert.equal(c.verdict.status, c.status, label);
      if (c.status === 'agrees') {
        assert.equal(c.verdict.expected, c.detail, label); assert.equal(c.qualifying, true, `${label}: one trailer from the closed list still grades`); assert.equal(c.score.correct, true, label);
      } else {
        assert.equal(c.verdict.reason, c.detail, label); assert.equal(c.qualifying, false, `${label}: never qualifying evidence`);
        assert.deepEqual(c.reasons, ['not_correct_or_ungraded'], label); assert.equal(c.score.graded, false, label);
        assert.equal(c.score.reason, 'key_unverifiable:' + c.detail, `${label}: a double trailer is not on the closed list (ADR-0067)`);
      }
    }
    assert.ok(o.property.trials >= 480, `property: ${o.property.trials} trials`);
    assert.equal(o.property.agree, o.property.trials, 'property: the evaluator equals the inline BigInt reference on every trial');
    assert.equal(o.property.wrongAgrees, 0, 'property: no wrong key (reference ± 1/1000) ever agrees');
    assert.equal(o.property.wrongAbstainOrDisagree, 2 * o.property.trials, 'property: every wrong key abstains or disagrees');
  },
};

/** Criterion 5: client clocks decide nothing; the scorer abstains visibly; a wrong answer and a wrong key both earn nothing. */
cases.c5_client_clock_and_ungraded = {
  async run() {
    const s = scope('c5clock'); await s.init();
    const A = conn.assessment;
    const item = await s.item(ITEMS.add_word);
    const issued = await s.issue(A, item);
    const before = (await admin.query('SELECT clock_timestamp() AS t')).rows[0].t;
    const submitted = await s.submit(conn.learner, issued, '7/8', { client: { submittedAt: '2000-01-01T00:00:00.000Z', latencyMs: -5 } });
    const after = (await admin.query('SELECT clock_timestamp() AS t')).rows[0].t;
    const result = await s.finalize(A, issued, '7/8');
    // E3-K: a short key is not an exact rational, so the item is refused at approval and cannot be issued; the ungraded
    // control is a canonical-looking stem the gate abstains on (three terms) with agreeing keys and a wrong response.
    const shortItem = await s.item(ITEMS.short, { skillId: s.skill + '_short' });
    const shortRefused = { approval: shortItem.approval.outcome, reasons: shortItem.approval.reasons, issued: refusal(await errOf(s.issue(A, shortItem))) };
    const ungraded = await s.flow(A, await s.item({ id: 'f_c5_three', family: 'unverifiable', contextTag: 'bare', stem: 'Compute 2 + 2 + 2.', key: numericKey('6') }, { skillId: s.skill + '_three' }), '6');
    const ungradedEvidence = (await readAttemptEvidence(conn.report, ungraded.attempt.id))[0];
    const wrongAnswer = await s.flow(A, await s.item(ITEMS.add_bare, { skillId: s.skill + '_wrong' }), '1/2');
    const wrongKeyItem = await s.item(ITEMS.wrong_key, { skillId: s.skill + '_key' });
    const wrongKey = { approval: wrongKeyItem.approval.outcome, reasons: wrongKeyItem.approval.reasons, issued: refusal(await errOf(s.issue(A, wrongKeyItem))) };
    const forgedScore = await s.flow(A, await s.item(ITEMS.mul_bare, { skillId: s.skill + '_forged' }), '1/2', { score: () => ({ graded: true, correct: 'true', qualifying: true, scorerId: 'x', scorerVersion: 'y' }) });
    return {
      submittedAt: submitted.submitted_at, serverWindow: [new Date(before).toISOString(), new Date(after).toISOString()], qualifying: result.qualifying,
      shortRefused, ungraded: ungraded.result, ungradedScore: ungradedEvidence.payload.score, wrongAnswer: wrongAnswer.result.reasons, wrongKey, forgedScore: forgedScore.result,
    };
  },
  assert(o) {
    const t = new Date(o.submittedAt).getTime();
    assert.ok(t >= new Date(o.serverWindow[0]).getTime() && t <= new Date(o.serverWindow[1]).getTime(), 'submitted_at is the server clock, not the client claim');
    assert.equal(o.qualifying, true);
    assert.equal(o.ungraded.qualifying, false); assert.deepEqual(o.ungraded.reasons, ['not_correct_or_ungraded']); assert.equal(o.ungradedScore.graded, false);
    assert.deepEqual(o.wrongAnswer, ['not_correct_or_ungraded']);
    assert.equal(o.shortRefused.approval, 'refused'); assert.ok(o.shortRefused.reasons.some((r) => r.startsWith('key_not_exact_rational:'))); assert.deepEqual([o.shortRefused.issued.layer, o.shortRefused.issued.sqlstate], ['function', 'P0001']);
    assert.equal(o.wrongKey.approval, 'refused', 'E3-K: a wrong key never reaches grading'); assert.ok(o.wrongKey.reasons.includes('keys_disagree')); assert.deepEqual([o.wrongKey.issued.layer, o.wrongKey.issued.sqlstate], ['function', 'P0001']);
    assert.equal(o.forgedScore.qualifying, false, 'a string "true" or a qualifying claim in the score is not boolean true');
  },
};

/** Criterion 5: assistance from issue through finalization latches the attempt; the barrier is real (a held exposure blocks the finalizer); later help leaves the result intact and affects the next attempt. */
cases.c5_assistance_latch_barrier = {
  async run() {
    const s = scope('c5latch'); await s.init();
    const A = conn.assessment; const T = conn.tutor;
    const i1 = await s.issue(A, await s.item(ITEMS.add_word));
    await s.exposure(T);
    await s.submit(conn.learner, i1, '7/8');
    const r1 = await s.finalize(A, i1, '7/8');
    const latched = (await readAttempt(A, s.learner, i1.id)).assistance_latched;
    // The barrier: the tutor holds record_exposure's locks (uncommitted); the finalizer must wait on the skill lock, then see the help.
    const s2 = scope('c5latch2'); await s2.init();
    const i2 = await s2.issue(A, await s2.item(ITEMS.add_bare)); await s2.submit(conn.learner, i2, '7/8');
    const T2 = await connect('tutor'); const g = gate();
    const held = H.transaction(T2.client, async (tx) => {
      await tx.query('SELECT e2.record_exposure($1,$2::text[],$3,$4,$5,$6::jsonb,$7::jsonb,$8)', [s2.learner, [s2.skill], '1', crypto.randomUUID(), SESSION, '{"kind":"hint"}', '{}', ASSESSMENT_RULE.ruleVersion]);
      await g.wait();
    });
    await g.entered;
    const finalizing = s2.finalize(A, i2, '7/8');
    const blocked = await waitBlocked(admin, pid(A), pid(T2));
    g.release(); await held;
    const r2 = await finalizing;
    // Help after a completed result: history intact; the next attempt on that skill sees the delay rule. Positive control: a fresh skill has no delay.
    const s3 = scope('c5latch3'); await s3.init();
    const clean = await s3.flow(A, await s3.item(ITEMS.mul_bare), '6/5');
    const rawBefore = await rawHistory(clean.attempt.id);
    await s3.exposure(T);
    const rawAfter = await rawHistory(clean.attempt.id);
    const next = await s3.flow(A, await s3.item(ITEMS.add_word), '7/8');
    const fresh = await s3.flow(A, await s3.item(ITEMS.add_bare, { skillId: s3.skill + '_fresh' }), '7/8');
    const practiceOnly = await s3.practice(T, { payload: { qualifying: true, class: 'unassisted-attempt' } });
    return { r1: r1.reasons, latched, blocked: { wait_event_type: blocked.wait_event_type, wait_event: blocked.wait_event }, r2: r2.reasons, cleanIntact: rawBefore === rawAfter && clean.result.qualifying, next: next.result.reasons, fresh: fresh.result.reasons, practiceOnly: { class: practiceOnly.class, qualifying: practiceOnly.qualifying, operation_id: practiceOnly.operation_id.startsWith('practice:') } };
  },
  assert(o) {
    // Help between issue and finalization latches the attempt AND puts the last exposure after issue time, so the
    // function records both reasons (its delay rule measures issue time against the latest exposure).
    assert.deepEqual(o.r1, ['assistance_observed', 'delay_under_48h']); assert.equal(o.latched, true);
    assert.equal(o.blocked.wait_event_type, 'Lock'); assert.equal(o.blocked.wait_event, 'advisory', 'the finalizer waited on the held skill lock');
    assert.deepEqual(o.r2, ['assistance_observed', 'delay_under_48h'], 'help that committed first disqualifies the attempt');
    assert.equal(o.cleanIntact, true, 'help after a completed result leaves that history intact');
    assert.deepEqual(o.next, ['delay_under_48h'], 'the next attempt on the skill sees the delay rule from issue time');
    assert.deepEqual(o.fresh, [], 'positive control: no exposure, no delay');
    assert.deepEqual(o.practiceOnly, { class: 'corrections-practice', qualifying: false, operation_id: true }, 'practice never qualifies whatever the payload claims');
  },
};

/** E3-K (#17): the dual-key content boundary — two distinct authors must agree exactly; the gate's disagreement blocks, its abstention does not; only `author` may key or approve; every decision is an audit row. */
cases.c7_dual_key_boundary = {
  async run() {
    const s = scope('c7'); await s.init();
    const A = conn.assessment; const [a1, a2] = authors.h1; const [b1] = authors.h2;
    const mk = (id, stem, value, extra = {}) => s.item({ id, family: 'dual-key', contextTag: 'bare', stem, key: numericKey(value) }, { approve: false, ...extra });
    // Structural refusals, each with the recorded reason (positive control last).
    const one = await mk('f_k_one', 'Compute 1/2 + 1/3.', '5/6'); await authorKey(a1, one, numericKey('5/6'));
    const oneAuthor = await approveItem(a1, one);
    const oneAuthorIssue = refusal(await errOf(s.issue(A, one)));
    const same = await mk('f_k_same', 'Compute 1/2 + 1/3.', '5/6'); await authorKey(a1, same, numericKey('5/6')); await authorKey(a1, same, numericKey('5/6'));
    const sameAuthorTwice = await approveItem(a1, same);
    const sameAuthorConflict = refusal(await errOf(authorKey(a1, same, numericKey('7/8'))));
    const dis = await mk('f_k_dis', 'Compute 1/2 + 1/3.', '5/6'); await authorKey(a1, dis, numericKey('5/6')); await authorKey(a2, dis, numericKey('2/5'));
    const disagree = await approveItem(a1, dis);
    const nonr = await mk('f_k_nonr', 'Compute 2 + 2.', '4'); await authorKey(a1, nonr, numericKey('4e0')); await authorKey(a2, nonr, { type: 'short', options: null, answer: { value: 'four' } });
    const nonRational = await approveItem(a1, nonr);
    const stored = await mk('f_k_stored', 'Compute 1/2 + 1/3.', '2/5'); await authorKey(a1, stored, numericKey('5/6')); await authorKey(a2, stored, numericKey('5/6'));
    const storedDisagrees = await approveItem(a1, stored);
    // Exact-rational forms: 0.25, 1/4 and 2/8 are the same rational; the agreed key is canonical.
    const forms = await mk('f_k_forms', 'Compute 1/8 + 1/8.', '0.25'); await authorKey(a1, forms, numericKey('2/8')); await authorKey(a2, forms, numericKey(0.25));
    const formsApproved = await approveItem(a1, forms, 'op_forms_' + RUN);
    const formsRetry = await approveItem(a1, forms, 'op_forms_' + RUN);
    const formsAgain = await approveItem(a2, forms, 'op_forms2_' + RUN);
    const formsFlow = await s.flow(A, forms, '1/4');
    const lateKey = refusal(await errOf(authorKey(b1, forms, numericKey('1/4'))));
    // The content gate: disagreement blocks and is the audit row; abstention is recorded and does not block.
    const gateD = await mk('f_k_gate_d', 'Compute 1/2 + 1/3.', '2/5'); await authorKey(a1, gateD, numericKey('2/5')); await authorKey(a2, gateD, numericKey('2/5'));
    const gateDisagrees = await approveItem(a1, gateD);
    const gateDisagreesIssue = refusal(await errOf(s.issue(A, gateD)));
    const gateA = await mk('f_k_gate_a', 'Maya has 3 boxes with 1/4 kg in each. How much is that?', '3/4'); await authorKey(a1, gateA, numericKey('3/4')); await authorKey(a2, gateA, numericKey('3/4'));
    const gateAbstains = await approveItem(a1, gateA);
    const audit = (await admin.query("SELECT item_id,outcome,reasons,authors,agreed_key,content_verdict->>'status' AS gate FROM e2.item_approval_events WHERE item_id=ANY($1) ORDER BY event_order", [[gateD.id, gateA.id]])).rows;
    const auditEdit = await attempt(adb(admin), 'UPDATE e2.item_approval_events SET outcome=$2 WHERE item_id=$1', [gateD.id, 'approved']);
    const keyEdit = await attempt(adb(admin), 'DELETE FROM e2.item_keys WHERE item_id=$1', [gateD.id]);
    // Roles: learner/tutor/report/assessment cannot author or approve; author cannot issue; keys are unreadable; the report view shows both authors.
    const roles = {};
    for (const role of ROLES) {
      roles[role] = {
        author_key: await attempt(conn[role], 'SELECT e2.author_key($1,$2,$3,$4)', [forms.id, forms.version, numericKey('1/4'), {}]),
        approve_item: await attempt(conn[role], 'SELECT e2.approve_item($1,$2,$3,$4)', [forms.id, forms.version, 'op_' + role + RUN, {}]),
        insert_key: await attempt(conn[role], "INSERT INTO e2.item_keys(household_id,item_id,item_version,author_login,key,provenance) VALUES('h1',$1,$2,'forged','{}','{}')", [forms.id, forms.version]),
        insert_approval: await attempt(conn[role], "INSERT INTO e2.item_approval_events(household_id,item_id,item_version,operation_id,outcome,reasons,authors,content_verdict,provenance) VALUES('h1',$1,$2,'forged','approved','[]','{}','{}','{}')", [forms.id, forms.version]),
        read_keys: await attempt(conn[role], 'SELECT * FROM e2.item_keys WHERE item_id=$1', [forms.id]),
      };
    }
    const authorIssue = refusal(await errOf(H.transaction(a1, (tx) => tx.query('SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7)', [s.learner, forms.id, forms.version, crypto.randomUUID(), SESSION, 'x', '1']))));
    const authorReadItems = refusal(await errOf(a1.query('SELECT answer_key FROM e2.items WHERE id=$1', [forms.id])));
    const reportView = (await conn.report.query('SELECT item_id,authors,approved_by FROM e2.item_approvals WHERE item_id=$1', [forms.id])).rows;
    const reportKeyColumn = await attempt(conn.report, 'SELECT agreed_key FROM e2.item_approval_events WHERE item_id=$1', [forms.id]);
    const learnerView = (await conn.learner.query('SELECT authors FROM e2.item_approvals WHERE item_id=$1', [forms.id])).rows;
    const crossHousehold = refusal(await errOf(authorKey(b1, one, numericKey('5/6'))));
    // Exact rational in SQL versus TS on the module's own edge cases.
    const rationals = (await admin.query("SELECT v, e2.exact_rational(v) AS sql FROM unnest($1::text[]) AS v", [['0.25', '-3/6', '007', '1e5', '1/0', '2.50', ' 7/8 ', '0', '-0.5', '10/4', 'four', '9007199254740993']])).rows
      .map((r) => ({ v: r.v, sql: r.sql, ts: (() => { const p = contentCheck.parseExactRational(r.v); return p ? contentCheck.showRational(p) : null; })() }));
    return { oneAuthor, oneAuthorIssue, sameAuthorTwice, sameAuthorConflict, disagree, nonRational, storedDisagrees, formsApproved, formsRetry, formsAgain, formsFlow: formsFlow.result, lateKey, gateDisagrees, gateDisagreesIssue, gateAbstains, audit, auditEdit, keyEdit, roles, authorIssue, authorReadItems, reportView, reportKeyColumn, learnerView, crossHousehold, rationals };
  },
  assert(o) {
    assert.equal(o.oneAuthor.outcome, 'refused'); assert.deepEqual(o.oneAuthor.reasons, ['fewer_than_two_authors']); assert.equal(o.oneAuthor.authors.length, 1);
    assert.deepEqual([o.oneAuthorIssue.layer, o.oneAuthorIssue.sqlstate], ['function', 'P0001']); assert.match(o.oneAuthorIssue.message, /two-key/);
    assert.equal(o.sameAuthorTwice.outcome, 'refused'); assert.deepEqual(o.sameAuthorTwice.reasons, ['fewer_than_two_authors'], 'the same login keying twice is one author');
    assert.deepEqual([o.sameAuthorConflict.layer, o.sameAuthorConflict.sqlstate], ['function', 'P0001'], 'an author cannot rekey an item version');
    assert.equal(o.disagree.outcome, 'refused'); assert.deepEqual(o.disagree.reasons, ['keys_disagree']); assert.equal(o.disagree.agreed_key, null);
    assert.equal(o.nonRational.outcome, 'refused'); assert.deepEqual(o.nonRational.reasons, ['key_not_exact_rational:e2_h1_author', 'key_not_exact_rational:e2_h1_author2', 'fewer_than_two_authors']);
    assert.equal(o.storedDisagrees.outcome, 'refused'); assert.deepEqual(o.storedDisagrees.reasons, ['stored_key_disagrees'], 'the grading key must be the agreed key');
    assert.equal(o.formsApproved.outcome, 'approved'); assert.equal(o.formsApproved.agreed_key, '1/4', '0.25, 2/8 and 1/4 are one rational, stored canonically'); assert.deepEqual(o.formsApproved.authors, ['e2_h1_author', 'e2_h1_author2']);
    assert.equal(o.formsApproved.content_verdict.status, 'agrees'); assert.equal(o.formsApproved.content_verdict.expected, '1/4');
    assert.equal(o.formsRetry.id, o.formsApproved.id, 'same operation returns the stored decision'); assert.equal(o.formsAgain.id, o.formsApproved.id, 'an approved item stays approved: one approval row');
    assert.equal(o.formsFlow.qualifying, true, 'positive control: the approved item issues and qualifies');
    assert.deepEqual([o.lateKey.layer, o.lateKey.sqlstate], ['function', 'P0002'], 'another household cannot see the item (RLS)');
    assert.equal(o.gateDisagrees.outcome, 'refused'); assert.deepEqual(o.gateDisagrees.reasons, ['content_gate_disagrees'], 'two agreeing authors with a wrong key: the gate is the third check');
    assert.deepEqual(o.gateDisagrees.content_verdict, { status: 'disagrees', expected: '5/6', keyed: '2/5', path: 'binary,lead-phrase,trail' });
    assert.deepEqual([o.gateDisagreesIssue.layer, o.gateDisagreesIssue.sqlstate], ['function', 'P0001']);
    assert.equal(o.gateAbstains.outcome, 'approved', 'abstention is recorded and does not block'); assert.equal(o.gateAbstains.content_verdict.status, 'abstained'); assert.equal(o.gateAbstains.content_verdict.reason, 'not_canonical_stem');
    assert.deepEqual(o.audit.map((r) => [r.outcome, r.gate]), [['refused', 'disagrees'], ['approved', 'abstained']], 'both decisions are audit rows');
    assert.deepEqual([o.auditEdit.layer, o.auditEdit.sqlstate], ['trigger', '55000'], 'the ledger is append-only even for the owner'); assert.deepEqual([o.keyEdit.layer, o.keyEdit.sqlstate], ['trigger', '55000']);
    for (const role of ROLES) for (const [what, r] of Object.entries(o.roles[role])) assert.deepEqual([r.layer, r.sqlstate], ['grant', '42501'], `${role} ${what} is refused by grant`);
    assert.deepEqual([o.authorIssue.layer, o.authorIssue.sqlstate], ['grant', '42501'], 'the author cannot issue attempts'); assert.deepEqual([o.authorReadItems.layer, o.authorReadItems.sqlstate], ['grant', '42501'], 'the author cannot read stored keys');
    assert.deepEqual(o.reportView, [{ item_id: o.reportView[0].item_id, authors: ['e2_h1_author', 'e2_h1_author2'], approved_by: 'e2_h1_author' }], 'the report view shows both authors and no key');
    assert.deepEqual([o.reportKeyColumn.layer, o.reportKeyColumn.sqlstate], ['grant', '42501'], 'the agreed key column is not readable by report');
    assert.deepEqual(o.learnerView, [{ authors: ['e2_h1_author', 'e2_h1_author2'] }]);
    assert.deepEqual([o.crossHousehold.layer, o.crossHousehold.sqlstate], ['function', 'P0002']);
    for (const r of o.rationals) assert.equal(r.sql, r.ts, `exact_rational(${JSON.stringify(r.v)}) agrees with content-check.ts`);
    assert.deepEqual(o.rationals.map((r) => r.sql), ['1/4', '-1/2', '7', null, null, '5/2', '7/8', '0', '-1/2', '5/2', null, '9007199254740993']);
  },
};

/** Criterion 6: the projection is rebuildable from evidence_view alone; a familiar item earns nothing; a post-hoc revocation is derived here and the stored row is corrected through C's `e2.rebuild_projection` (assessment role, its own transaction after the revocation commits); a rebuild counts only its own rule partition. */
cases.c6_projection_rebuild_and_invalidation = {
  async run() {
    const s = scope('c6'); await s.init();
    const A = conn.assessment; const R = conn.report;
    const item1 = await s.item(ITEMS.add_word); const item2 = await s.item(ITEMS.add_bare);
    const a = await s.flow(A, item1, '7/8'); const b = await s.flow(A, item2, '7/8');
    const stored = await readProjection(R, s.learner, s.skill, '1');
    const rebuilt = await rebuildProjection(R, s.learner, s.skill, '1');
    const familiar = await s.flow(A, item1, '7/8');
    const storedAfterFamiliar = await readProjection(R, s.learner, s.skill, '1');
    const rawBefore = await rawHistory(a.attempt.id);
    await s.revoke('item', item1.id);
    const rebuiltAfterRevoke = await rebuildProjection(R, s.learner, s.skill, '1');
    const storedBeforeRebuild = await readProjection(R, s.learner, s.skill, '1');
    const rebuildRefused = refusal(await errOf(rebuildStoredProjection(R, s.learner, s.skill)));
    const rebuiltRows = await rebuildStoredProjection(A, s.learner, s.skill);
    const storedAfterRebuild = await readProjection(R, s.learner, s.skill, '1');
    const rawAfter = await rawHistory(a.attempt.id);
    // Rubric revocation withdraws too (target_kind='rubric'): a dedicated rubric so no other case is poisoned.
    const rubric = 'rubric_' + RUN + '_c6';
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES('h1',$1,'1','approved','{}','{}')", [rubric]);
    const rs = scope('c6rub'); await rs.init();
    const r1 = await rs.flow(A, await rs.item(ITEMS.add_word, { rubric }), '7/8'); const r2 = await rs.flow(A, await rs.item(ITEMS.mul_bare), '6/5');
    await rs.revoke('rubric', rubric);
    const rubDerived = await rebuildProjection(R, rs.learner, rs.skill, '1');
    await rebuildStoredProjection(A, rs.learner);
    const rubStored = await readProjection(R, rs.learner, rs.skill, '1');
    // The reviewer's contributor-set sizes: revoke one contributor of n; derived and stored agree on n-1 with identical order.
    const sizes = {};
    for (const n of [1, 2, 3, 7, 16]) {
      const ss = scope(`c6n${n}`); await ss.init();
      const flows = [];
      for (let i = 0; i < n; i += 1) flows.push(await ss.flow(A, await ss.item(i % 2 ? ITEMS.add_bare : ITEMS.mul_bare), i % 2 ? '7/8' : '6/5'));
      const before = await rebuildProjection(R, ss.learner, ss.skill, '1');
      const victim = flows[Math.floor(n / 2)];
      await ss.revoke('item', (await readAttempt(A, ss.learner, victim.attempt.id)).item_id);
      const derived = await rebuildProjection(R, ss.learner, ss.skill, '1');
      await rebuildStoredProjection(A, ss.learner, ss.skill);
      const st = await readProjection(R, ss.learner, ss.skill, '1');
      const expected = flows.map((f) => f.result.evidenceId).filter((id) => id !== victim.result.evidenceId);
      sizes[n] = { allBefore: before.evidenceIds.length === n && before.withdrawnByRevocation.length === 0, derivedOk: JSON.stringify(derived.evidenceIds) === JSON.stringify(expected) && derived.independentSuccesses === n - 1 && JSON.stringify(derived.withdrawnByRevocation) === JSON.stringify([victim.result.evidenceId]), storedOk: JSON.stringify(st.evidence_ids) === JSON.stringify(expected) && st.independent_successes === n - 1 };
    }
    const reportWrite = await attempt(R, 'UPDATE e2.projections SET independent_successes=0 WHERE learner_id=$1', [s.learner]);
    // Issue #15 (M06): mixed rule partitions. One finalized attempt under the running rule, plus an owner-seeded qualifying
    // row under another rule version on a second attempt of the same learner/skill/version. Each rebuild counts only its own rule.
    const otherRule = 'e2-other-rule-' + RUN;
    // The other rule clones the running rule's parameters (the table's check constraint refuses empty parameters); only its id differs.
    await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) SELECT household_id,$1,parameters,'{\"source\":\"synthetic-fixture\"}' FROM e2.rule_versions WHERE household_id='h1' AND id=$2 ON CONFLICT DO NOTHING", [otherRule, ASSESSMENT_RULE.ruleVersion]);
    const ps = scope('c6rule'); await ps.init();
    const own = await ps.flow(A, await ps.item(ITEMS.add_word), '7/8');
    const foreignAttempt = await ps.issue(A, await ps.item(ITEMS.add_bare)); await ps.submit(conn.learner, foreignAttempt, '7/8');
    const foreignId = (await admin.query("INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('h1',$1,$2,$3,$4,$5,'1',1,'unassisted-attempt',true,'{}','{\"source\":\"synthetic-fixture\"}',$6) RETURNING id",
      [ps.learner, 'fixture-other-rule-' + RUN, foreignAttempt.id, SESSION, ps.skill, otherRule])).rows[0].id;
    const partitions = { own: await rebuildProjection(R, ps.learner, ps.skill, '1'), other: await rebuildProjection(R, ps.learner, ps.skill, '1', otherRule) };
    return {
      partitions: { ownIds: partitions.own.evidenceIds, ownN: partitions.own.independentSuccesses, otherIds: partitions.other.evidenceIds, otherN: partitions.other.independentSuccesses, ownEvidence: own.result.evidenceId, foreignId },
      ids: [a.result.evidenceId, b.result.evidenceId], stored: { n: stored.independent_successes, ids: stored.evidence_ids, cert: stored.certification }, rebuilt,
      familiar: familiar.result.reasons, nAfterFamiliar: storedAfterFamiliar.independent_successes,
      rebuiltAfterRevoke: { withdrawn: rebuiltAfterRevoke.withdrawnByRevocation, ids: rebuiltAfterRevoke.evidenceIds, n: rebuiltAfterRevoke.independentSuccesses },
      storedBeforeRebuild: storedBeforeRebuild.independent_successes, rebuildRefused, rebuiltRows: rebuiltRows.map((r) => ({ skill_id: r.skill_id, ids: r.evidence_ids, n: r.independent_successes, cert: r.certification })),
      storedAfterRebuild: { ids: storedAfterRebuild.evidence_ids, n: storedAfterRebuild.independent_successes }, evidenceUnchanged: rawBefore === rawAfter,
      rubric: { ids: [r1.result.evidenceId, r2.result.evidenceId], derived: { ids: rubDerived.evidenceIds, withdrawn: rubDerived.withdrawnByRevocation }, stored: { ids: rubStored.evidence_ids, n: rubStored.independent_successes } },
      sizes, reportWrite,
    };
  },
  assert(o) {
    assert.deepEqual(o.stored, { n: 2, ids: o.ids, cert: 'none' });
    assert.deepEqual(o.rebuilt.evidenceIds, o.ids, 'rebuilt from evidence_view equals the stored projection'); assert.deepEqual(o.rebuilt.withdrawnByRevocation, []);
    assert.deepEqual(o.familiar, ['familiar_item']); assert.equal(o.nAfterFamiliar, 2);
    assert.deepEqual(o.rebuiltAfterRevoke, { withdrawn: [o.ids[0]], ids: [o.ids[1]], n: 1 }, 'the derivation withdraws the revoked item\'s evidence and does not count it');
    assert.equal(o.storedBeforeRebuild, 2, 'the stored row is stale until the assessment role rebuilds it (C: separate transaction after the revocation commits)');
    assert.deepEqual([o.rebuildRefused.layer, o.rebuildRefused.sqlstate], ['grant', '42501'], 'the report role cannot rebuild');
    assert.deepEqual(o.rebuiltRows, [{ skill_id: o.rebuiltRows[0].skill_id, ids: [o.ids[1]], n: 1, cert: 'none' }], 'e2.rebuild_projection returns the corrected partition');
    assert.deepEqual(o.storedAfterRebuild, { ids: [o.ids[1]], n: 1 }, 'the stored projection withdraws the claim');
    assert.equal(o.evidenceUnchanged, true, 'the evidence is byte-identical; only the projection changed');
    assert.deepEqual(o.rubric.derived, { ids: [o.rubric.ids[1]], withdrawn: [o.rubric.ids[0]] }, 'a rubric revocation withdraws its item\'s evidence');
    assert.deepEqual(o.rubric.stored, { ids: [o.rubric.ids[1]], n: 1 });
    for (const [n, r] of Object.entries(o.sizes)) assert.deepEqual(r, { allBefore: true, derivedOk: true, storedOk: true }, `contributor set of size ${n}`);
    assert.deepEqual([o.reportWrite.layer, o.reportWrite.sqlstate], ['grant', '42501']);
    assert.deepEqual({ ids: o.partitions.ownIds, n: o.partitions.ownN }, { ids: [o.partitions.ownEvidence], n: 1 }, 'M06: a rebuild counts only evidence of its own rule version');
    assert.deepEqual({ ids: o.partitions.otherIds, n: o.partitions.otherN }, { ids: [o.partitions.foreignId], n: 1 }, 'M06: the other rule partition holds only its own row');
  },
};

// ---------------------------------------------------------------------------
async function main() {
  admin = await H.owner();
  server = await H.serverIdentity(admin);
  await migrate(admin);
  await seedHouseholds();
  await provisionAuthors();
  for (const role of ROLES) conn[role] = await connect(role);
  for (const [household, logins] of Object.entries(AUTHOR_LOGINS)) authors[household] = await Promise.all(logins.map(connectAuthor));
  const records = [];
  const names = Object.keys(cases).filter((n) => only.length === 0 || only.some((o) => n.includes(o)));
  for (const name of names) {
    const c = cases[name];
    let observed = null; let error = null; let pass = false;
    try { observed = await c.run(); c.assert(observed); pass = true; }
    catch (e) { error = { name: e.name, message: String(e.message).slice(0, 400), code: e.code ?? null }; }
    records.push({ case: name, db: 'postgresql', pass, observed, error });
    console.log(JSON.stringify({ case: name, pass, error: error && error.message }));
  }
  const header = {
    suite: 'assessment', round: 10, seam: 'e2.* SQL functions (ADR-0066); the service holds no DDL, roles or locks', runtime: process.version,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    dirty: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean).length,
    server: { version: server.version, version_num: server.version_num, mode: server.mode, target: server.target, database: server.database, owner_login: server.login },
    logins: Object.fromEntries(ROLES.map((r) => [r, conn[r].client.fixtureIdentity])), ruleVersion: ASSESSMENT_RULE.ruleVersion, run: RUN, sources: hashes,
  };
  const out = path.join(ROOT, 'tests/engine/evidence/results-assessment-pg.json');
  if (only.length === 0) fs.writeFileSync(out, JSON.stringify({ header, records }, null, 2) + '\n');
  const failed = records.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ server: header.server, passed: records.length - failed, failed, written: only.length === 0 ? path.relative(ROOT, out) : null }));
  process.exitCode = failed ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await Promise.all([...extra, ...Object.values(conn).map((d) => d.client)].map((c) => c.end().catch(() => {})));
  if (admin) await admin.end().catch(() => {});
});
