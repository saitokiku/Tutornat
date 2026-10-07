// E3-R — replay and corrections preserve honest claims (issue #16, acceptance row E11).
// The projection is never a second source of truth: `e2.rebuild_projection` from retained
// evidence under each row's own rule version reproduces the live projection; an owner-side
// content revocation withdraws exactly its contributor set without touching evidence rows;
// corrections append provenance and never relabel; a rule version never re-counts another's
// evidence. Every write in this file is a documented `e2.*` call (ADR-0066); the only direct
// INSERTs are fixture seeding and the owner-side revocation the seam documents, both as the
// migration owner (the trusted boundary). Callers take no locks.
//
//   sh tests/engine/harness/with-pg17.sh node --no-warnings tests/engine/replay.cjs [case ...]
//
// Knobs (all optional): REPLAY_SEED=<string> reproduces a run; REPLAY_SEQUENCES=<n> (default 500);
// REPLAY_SCOPES=<n> learner×skill scopes (default 40, 20 per household);
// REPLAY_MUTANT=ignore-revocations|count-practice breaks the independent replay on purpose so
// the reviewer can watch criterion 1 fail (the "failure before success" evidence for a property
// that already holds at base).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const H = require('./pg/harness.cjs');
const twoKey = require('./pg/two-key.cjs');
const { migrate } = require('../../db/migrate.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const RUN = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const SESSION = 'ses_' + RUN;
const RULE = 'e2-draft-1';
const RULE2 = 'e2-draft-2';
const ROLES = ['learner', 'tutor', 'report', 'assessment'];
const HOUSEHOLDS = ['h1', 'h2'];
// Knobs come from `--seed=… --sequences=… --scopes=… --mutant=…` or the REPLAY_* environment.
const flag = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=') || process.env[`REPLAY_${name.toUpperCase()}`];
const SEED = flag('seed') || RUN;
const SEQUENCES = Number(flag('sequences') || 500);
const SCOPES = Number(flag('scopes') || 40);
const MUTANT = flag('mutant') || '';

// Deterministic PRNG (mulberry32 over a sha256 of the seed) so a printed failing sequence can be re-run.
function prng(seed) {
  let a = crypto.createHash('sha256').update(String(seed)).digest().readUInt32LE(0);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Synthetic elementary-fractions fixture; the key is checked by arithmetic the reviewer can redo.
const ITEM = { family: 'add-unlike-denominators', contextTag: 'bare', stem: 'Compute 3/4 + 1/8.', key: { type: 'numeric', options: null, answer: { value: '7/8', tolerance: 0 } } };
assert.equal(3 / 4 + 1 / 8, 7 / 8);
const RIGHT = { answer: '7/8' }; const WRONG = { answer: '5/8' };

let admin; let server;
const conn = { h1: {}, h2: {} };
// The fixture logins (e2_h1_<role>, …) are cluster-wide and every suite's owner-only `provisionPrincipals`
// REVOKEs and re-GRANTs their capability. A sibling worker's suite running on the same cluster therefore
// opens a window in which `SET LOCAL ROLE <capability>` fails with 42501 "permission denied to set role".
// That is an environmental race, not a seam refusal: retry it a few times and count every retry.
let roleRetries = 0;
async function withRoleRetry(fn) {
  for (let i = 0; ; i += 1) {
    try { return await fn(); } catch (e) {
      if (e.code === '42501' && /to set role/.test(e.message) && i < 8) { roleRetries += 1; await new Promise((r) => setTimeout(r, 250 * (i + 1))); continue; }
      throw e;
    }
  }
}
const call = (client, sql, params) => withRoleRetry(() => H.transaction(client, async (tx) => (await tx.query(sql, params)).rows[0].value));
const errOf = async (p) => { try { await p; return null; } catch (e) { return { code: e.code || null, message: String(e.message).slice(0, 160) }; } };
function refusal(err) {
  if (!err) return { layer: 'none', sqlstate: null, message: null };
  const m = err.message || ''; let layer = 'other';
  if (err.code === '42501' && /row-level security/.test(m)) layer = 'rls';
  else if (err.code === '42501' && /permission denied/.test(m)) layer = 'grant';
  else if (err.code === '55000') layer = 'trigger';
  else if (['P0001', 'P0002', '42501', '22023'].includes(err.code)) layer = 'function';
  return { layer, sqlstate: err.code, message: m.replace(/\s*\|\s*CONTEXT:.*$/, '') };
}
async function statement(client, sql, params = []) { return refusal(await errOf(withRoleRetry(() => H.transaction(client, (tx) => tx.query(sql, params))))); }

async function seed() {
  for (const h of HOUSEHOLDS) {
    await admin.query('INSERT INTO e2.households(household_id,timezone) VALUES($1,$2) ON CONFLICT DO NOTHING', [h, 'America/Chicago']);
    for (const rule of [RULE, RULE2]) {
      await admin.query('INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [h, rule, { delayHours: 48, quietWindowReps: 10, escalationDays: 14, daySeven: [6, 9], certification: false }, { source: 'synthetic-fixture', suite: 'replay', synthetic: rule === RULE2 }]);
    }
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES($1,$2,'1','approved',$3,$4) ON CONFLICT DO NOTHING",
      [h, 'rubric_' + RUN, { method: 'exact-equality' }, { review: 'synthetic' }]);
  }
  await H.provisionPrincipals(admin);
  await twoKey.provisionAuthors(admin, HOUSEHOLDS);
}

/** One learner × skill in one household. Items are owner-seeded versions of ITEM under that skill. */
function scope(name, h = 'h1') {
  const learner = `lrn_${RUN}_${name}`; const skill = `skill_${RUN}_${name}`; const other = `skill_${RUN}_${name}_other`;
  const c = conn[h];
  const s = {
    h, learner, skill, other, n: 0, items: [],
    async init() { await admin.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING', [h, learner]); return s; },
    async item({ rubric = 'rubric_' + RUN } = {}) {
      const id = `item_${RUN}_${name}_${++s.n}`;
      await admin.query("INSERT INTO e2.items(household_id,id,version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,approval,content,answer_key,provenance) VALUES($1,$2,'1','1',$3,'1',$4,'1',$5,$6,'approved',$7,$8,$9)",
        [h, id, rubric, skill, ITEM.family, ITEM.contextTag, { type: 'numeric', stem: ITEM.stem }, ITEM.key, { reviewedBy: 'fixture-reviewer', source: 'fixture' }]);
      // E3 integration (#24): #17's two-key rule — two author logins key 7/8 and approve (tests/engine/pg/two-key.cjs).
      await twoKey.approveItem(admin, id, { household: h, value: ITEM.key.answer.value });
      const it = { id, version: '1', rubric }; s.items.push(it); return it;
    },
    issue: (item, { rule = RULE, operationId = crypto.randomUUID() } = {}) =>
      call(c.assessment, 'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7,$8) AS value', [learner, item.id, item.version, operationId, SESSION, 'offline-scorer', '1', rule]),
    submit: (attempt, response) => call(c.learner, 'SELECT e2.submit_attempt($1,$2,$3) AS value', [learner, attempt.id, response]),
    finalize: (attempt, response, score) => call(c.assessment, 'SELECT e2.finalize_attempt($1,$2,$3,$4) AS value', [learner, attempt.id, response, score]),
    exposure: ({ skills = [skill], payload = { kind: 'hint' } } = {}) =>
      call(c.tutor, 'SELECT e2.record_exposure($1,$2,$3,$4,$5,$6,$7) AS value', [learner, skills, '1', crypto.randomUUID(), SESSION, payload, { source: 'synthetic' }]),
    practice: (payload, { operationId = crypto.randomUUID() } = {}) =>
      call(c.tutor, 'SELECT e2.append_practice($1,$2,$3,$4,$5,$6,$7) AS value', [learner, skill, '1', operationId, SESSION, payload, { source: 'synthetic' }]),
    rebuild: (skillId = null) => call(c.assessment, 'SELECT e2.rebuild_projection($1,$2) AS value', [learner, skillId]),
    /** The seam's documented owner-side withdrawal: an append-only revocation row whose provenance is the audit (who/what/when is the row). */
    revoke: (kind, id, version = '1', reason = 'fixture withdrawal') =>
      admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES($1,$2,$3,$4,$5,jsonb_build_object('by',session_user,'suite','replay','run',$6::text)) RETURNING id,target_kind,target_id,target_version,reason,provenance,received_at",
        [h, kind, id, version, reason, RUN]).then((r) => r.rows[0]),
    /** An unassisted attempt end to end; `correct` drives the offline score, `item` defaults to a fresh (unfamiliar) item. */
    async flow({ correct = true, item = null, rule = RULE } = {}) {
      const it = item || await s.item();
      const attempt = await s.issue(it, { rule });
      const response = correct ? RIGHT : WRONG;
      await s.submit(attempt, response);
      const result = await s.finalize(attempt, response, { correct });
      return { attempt, item: it, result };
    },
    /** What reports read: the stored projection rows, as the report role. */
    live: async () => (await c.report.query('SELECT skill_id,skill_version,rule_version,evidence_ids,independent_successes,certification FROM e2.report_projection WHERE learner_id=$1 ORDER BY skill_id,skill_version,rule_version', [learner])).rows,
    /** Byte-level fingerprint of every evidence row (and attempt row) of this learner, as the owner. */
    async hash() {
      const q = async (sql) => (await admin.query(sql, [h, learner])).rows[0].h;
      return { evidence: await q("SELECT md5(string_agg(t::text,E'\\n' ORDER BY id)) AS h FROM e2.evidence_events t WHERE household_id=$1 AND learner_id=$2"), attempts: await q("SELECT md5(string_agg(t::text,E'\\n' ORDER BY id)) AS h FROM e2.attempts t WHERE household_id=$1 AND learner_id=$2") };
    },
    /** Fingerprint of exactly these evidence rows (so an appended row does not hide an edit to an old one). */
    async hashRows(ids) { return (await admin.query("SELECT md5(string_agg(t::text,E'\\n' ORDER BY id)) AS h, count(*)::int AS n FROM e2.evidence_events t WHERE household_id=$1 AND id=ANY($2::uuid[])", [h, ids])).rows[0]; },
    /** Every evidence id of this learner right now. */
    async evidenceIds() { return (await admin.query('SELECT id FROM e2.evidence_events WHERE household_id=$1 AND learner_id=$2 ORDER BY id', [h, learner])).rows.map((r) => r.id); },
  };
  return s;
}

/**
 * Independent replay from retained evidence (owner read, no e2.* function): a qualifying row
 * contributes to its own (skill, version, rule) partition iff its attempt carries the same
 * rule version and neither its item nor its rubric version is revoked; ordered by causal
 * sequence then id. Partitions with no contributor are retained. REPLAY_MUTANT breaks this.
 */
async function replay(s) {
  const ev = (await admin.query(`SELECT e.id,e.skill_id,e.skill_version,e.rule_version,e.qualifying,e.class,e.causal_seq,a.item_id,a.item_version,a.rubric_id,a.rubric_version,a.rule_version AS attempt_rule
    FROM e2.evidence_events e LEFT JOIN e2.attempts a ON a.household_id=e.household_id AND a.id=e.attempt_id
    WHERE e.household_id=$1 AND e.learner_id=$2 ORDER BY e.causal_seq,e.id`, [s.h, s.learner])).rows;
  const rev = (await admin.query('SELECT target_kind,target_id,target_version FROM e2.content_revocations WHERE household_id=$1', [s.h])).rows;
  const revoked = new Set(rev.map((r) => `${r.target_kind}|${r.target_id}|${r.target_version}`));
  const parts = new Map();
  for (const e of ev) {
    const key = `${e.skill_id}|${e.skill_version}|${e.rule_version}`;
    if (!parts.has(key)) parts.set(key, []);
    let counts = e.qualifying && e.item_id !== null && e.attempt_rule === e.rule_version
      && !revoked.has(`item|${e.item_id}|${e.item_version}`) && !revoked.has(`rubric|${e.rubric_id}|${e.rubric_version}`);
    if (MUTANT === 'ignore-revocations') counts = e.qualifying && e.item_id !== null && e.attempt_rule === e.rule_version;
    if (MUTANT === 'count-practice') counts = counts || e.class === 'corrections-practice';
    if (counts) parts.get(key).push(e.id);
  }
  return [...parts.entries()].map(([key, ids]) => { const [skill_id, skill_version, rule_version] = key.split('|'); return { skill_id, skill_version, rule_version, evidence_ids: ids, independent_successes: ids.length, certification: 'none' }; })
    .sort((x, y) => (x.skill_id + x.skill_version + x.rule_version).localeCompare(y.skill_id + y.skill_version + y.rule_version));
}
const shape = (rows) => rows.map((r) => ({ skill_id: r.skill_id, skill_version: r.skill_version, rule_version: r.rule_version, evidence_ids: r.evidence_ids, independent_successes: r.independent_successes, certification: r.certification }));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const cases = {};

/** Criterion 1: ≥ 500 random evidence sequences over ≥ 20 learner×skill scopes; live == rebuild == independent replay, in order. */
cases.r1_rebuild_reproduces = {
  async run() {
    const rand = prng(SEED);
    const scopes = [];
    for (let i = 0; i < SCOPES; i += 1) scopes.push(await scope(`r1s${i}`, HOUSEHOLDS[i % 2]).init());
    const STEPS = ['unassisted-correct', 'unassisted-wrong', 'practice', 'assisted-help', 'help-other-skill', 'help-during-check', 'familiar-retry', 'revocation'];
    const stepCounts = Object.fromEntries(STEPS.map((k) => [k, 0]));
    const failures = []; let compared = 0; let qualifyingTotal = 0; let withdrawnTotal = 0;
    for (let n = 0; n < SEQUENCES; n += 1) {
      const s = scopes[n % scopes.length];
      const len = 1 + Math.floor(rand() * 5);
      const seq = [];
      for (let k = 0; k < len; k += 1) {
        const step = STEPS[Math.floor(rand() * STEPS.length)];
        stepCounts[step] += 1; seq.push(step);
        if (step === 'unassisted-correct') { const f = await s.flow({ correct: true }); if (f.result.qualifying) qualifyingTotal += 1; }
        else if (step === 'unassisted-wrong') await s.flow({ correct: false });
        else if (step === 'practice') await s.practice({ kind: 'practice', correct: rand() < 0.5, answer: '7/8' });
        else if (step === 'assisted-help') await s.exposure();
        else if (step === 'help-other-skill') await s.exposure({ skills: [s.other] });
        else if (step === 'help-during-check') { const it = await s.item(); const a = await s.issue(it); await s.exposure(); await s.submit(a, RIGHT); await s.finalize(a, RIGHT, { correct: true }); }
        else if (step === 'familiar-retry') {
          // A familiar item gives non-qualifying evidence; a revoked one cannot even be issued (P0001 'content is not approved') and leaves nothing behind.
          const it = s.items[Math.floor(rand() * s.items.length)] || await s.item();
          try { await s.flow({ correct: true, item: it }); } catch (e) { if (e.code !== 'P0001') throw e; stepCounts['familiar-retry-refused'] = (stepCounts['familiar-retry-refused'] || 0) + 1; seq[seq.length - 1] = 'familiar-retry-refused'; }
        }
        else if (step === 'revocation') {
          // Withdraw a random contributor's item (or its rubric, when this scope owns one) and rebuild in a separate transaction, as A's workflow does.
          const live = await s.live(); const ids = live.flatMap((r) => r.evidence_ids);
          if (ids.length > 0) {
            const id = ids[Math.floor(rand() * ids.length)];
            const a = (await admin.query('SELECT a.item_id,a.item_version FROM e2.evidence_events e JOIN e2.attempts a ON a.household_id=e.household_id AND a.id=e.attempt_id WHERE e.household_id=$1 AND e.id=$2', [s.h, id])).rows[0];
            await s.revoke('item', a.item_id, a.item_version); withdrawnTotal += 1;
          }
          await s.rebuild();
        }
      }
      const live = shape(await s.live());
      const rebuilt = shape(await s.rebuild());
      const liveAfter = shape(await s.live());
      const replayed = await replay(s);
      compared += 1;
      // The live table has no row for a partition until finalize or rebuild materializes it (the seam
      // retains empty partitions on rebuild), so the pre-rebuild comparison is on contributor sets:
      // an absent live row means zero contributors. Rebuild output, the live table after it, and the
      // independent replay must agree row for row, contributor for contributor, in order.
      const contributors = (rows) => rows.filter((r) => r.evidence_ids.length > 0);
      if (!(same(contributors(live), contributors(rebuilt)) && same(rebuilt, liveAfter) && same(rebuilt, replayed))) {
        const failure = { n, scope: s.learner, household: s.h, sequence: seq, live, rebuilt, liveAfter, replayed };
        failures.push(failure);
        console.error('REPLAY MISMATCH ' + JSON.stringify(failure));
      }
    }
    return { seed: SEED, scopes: scopes.length, households: HOUSEHOLDS.length, sequences: SEQUENCES, compared, stepCounts, qualifyingTotal, withdrawnTotal, mutant: MUTANT || null, failures: failures.length, firstFailure: failures[0] || null };
  },
  assert(o) {
    assert.equal(o.failures, 0, `live projection, e2.rebuild_projection and the independent replay agree on contributing evidence ids in order for every sequence (first mismatch: ${JSON.stringify(o.firstFailure)})`);
    assert.ok(o.scopes >= 20 && o.sequences >= 500 && o.compared === o.sequences, 'at least 20 scopes and 500 sequences, all compared');
    for (const [k, v] of Object.entries(o.stepCounts)) assert.ok(v > 0, `step ${k} exercised`);
    assert.ok(o.qualifyingTotal > 0 && o.withdrawnTotal > 0, 'sequences produced qualifying evidence and withdrew some of it');
  },
};

/** Criterion 2: an authorized item/rubric invalidation withdraws exactly its contributor set; evidence rows byte-identical; audit row; unauthorized roles 42501. */
cases.r2_invalidation_withdraws_exactly = {
  async run() {
    const s = await scope('r2').init();
    const rubric = 'rubric_' + RUN + '_r2';
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES('h1',$1,'1','approved','{}','{}')", [rubric]);
    const f1 = await s.flow(); const f2 = await s.flow();
    const f3 = await s.flow({ item: await s.item({ rubric }) }); const f4 = await s.flow({ item: await s.item({ rubric }) });
    const ids = [f1, f2, f3, f4].map((f) => f.result.evidenceId);
    const before = shape(await s.live()); const hBefore = await s.hash();
    const audit = await s.revoke('item', f1.item.id, '1', 'key error: answer key disputed');
    const stale = shape(await s.live());
    await s.rebuild(s.skill);
    const afterItem = shape(await s.live()); const hAfterItem = await s.hash();
    const auditRubric = await s.revoke('rubric', rubric, '1', 'rubric withdrawn');
    await s.rebuild(s.skill);
    const afterRubric = shape(await s.live()); const hAfterRubric = await s.hash();
    const unauthorized = {};
    for (const role of ROLES) unauthorized[role] = await statement(conn.h1[role], "INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','forged','{}')", [f2.item.id]);
    const auditRow = (await admin.query('SELECT target_kind,target_id,target_version,reason,provenance,received_at FROM e2.content_revocations WHERE household_id=$1 AND id=$2', ['h1', audit.id])).rows[0];
    const auditEdit = await statement(admin, 'UPDATE e2.content_revocations SET reason=$2 WHERE id=$1', [audit.id, 'rewritten']);
    return { ids, before: before.map((r) => r.evidence_ids), stale: stale.map((r) => r.evidence_ids), afterItem: afterItem.map((r) => r.evidence_ids), afterRubric: afterRubric.map((r) => r.evidence_ids), hashes: { before: hBefore, afterItem: hAfterItem, afterRubric: hAfterRubric }, audit: { ...auditRow, hasWho: typeof auditRow.provenance.by === 'string', hasWhen: auditRow.received_at instanceof Date }, auditRubric: { kind: auditRubric.target_kind, id: auditRubric.target_id }, unauthorized, auditEdit };
  },
  assert(o) {
    assert.deepEqual(o.before, [o.ids], 'four qualifying contributors before');
    assert.deepEqual(o.stale, [o.ids], 'the stored row is stale until the assessment role rebuilds (separate transaction, ADR-0066 lock order)');
    assert.deepEqual(o.afterItem, [[o.ids[1], o.ids[2], o.ids[3]]], 'item revocation withdraws exactly the revoked item\'s contributor, order kept');
    assert.deepEqual(o.afterRubric, [[o.ids[1]]], 'rubric revocation withdraws exactly the two contributors scored under that rubric');
    assert.deepEqual(o.hashes.afterItem, o.hashes.before, 'evidence and attempt rows byte-identical after the item invalidation');
    assert.deepEqual(o.hashes.afterRubric, o.hashes.before, 'evidence and attempt rows byte-identical after the rubric invalidation');
    assert.deepEqual([o.audit.target_kind, o.audit.reason, o.audit.hasWho, o.audit.hasWhen], ['item', 'key error: answer key disputed', true, true], 'the revocation row is the audit: what, why, who (provenance.by), when (received_at)');
    assert.deepEqual([o.auditRubric.kind, o.auditRubric.id.startsWith('rubric_')], ['rubric', true]);
    for (const role of ROLES) assert.deepEqual([o.unauthorized[role].layer, o.unauthorized[role].sqlstate], ['grant', '42501'], `${role} cannot invalidate at the SQL level`);
    assert.deepEqual([o.auditEdit.layer, o.auditEdit.sqlstate], ['trigger', '55000'], 'even the owner cannot rewrite an audit row');
  },
};

/** Criterion 3: a correction appends a provenance event; originals unchanged; reports show both with classes intact; nothing is relabelled unassisted. */
cases.r3_corrections_append = {
  async run() {
    const s = await scope('r3').init();
    const original = await s.practice({ kind: 'practice', answer: '5/8', correct: false });
    const hBefore = await s.hashRows([original.id]);
    const correction = await s.practice({ kind: 'correction', correctionOf: original.id, answer: '7/8', correct: true });
    const hAfter = await s.hashRows([original.id]);
    const report = (await conn.h1.report.query('SELECT id,class,qualifying,payload FROM e2.evidence_view WHERE learner_id=$1 ORDER BY causal_seq,id', [s.learner])).rows;
    // Negative: a practice payload that claims to be unassisted and qualifying is stored as corrections-practice, qualifying=false.
    const forged = await s.practice({ kind: 'correction', class: 'unassisted-attempt', qualifying: true, correctionOf: original.id });
    // Negative: no role, and not even the owner, can relabel a stored row.
    const relabel = {};
    for (const role of ROLES) relabel[role] = await statement(conn.h1[role], "UPDATE e2.evidence_events SET class='unassisted-attempt',qualifying=true WHERE id=$1", [original.id]);
    relabel.owner = await statement(admin, "UPDATE e2.evidence_events SET class='unassisted-attempt',qualifying=true WHERE id=$1", [original.id]);
    // Negative: an assisted attempt (help during the check) stays non-qualifying after a "correction" is appended; the projection never counts it.
    const it = await s.item(); const a = await s.issue(it); await s.exposure(); await s.submit(a, RIGHT);
    const assisted = await s.finalize(a, RIGHT, { correct: true });
    const idsBefore = await s.evidenceIds();
    const hAssisted = await s.hashRows(idsBefore);
    await s.practice({ kind: 'correction', correctionOf: assisted.evidenceId, answer: '7/8', correct: true });
    const hAssistedAfter = await s.hashRows(idsBefore);
    const assistedRow = (await conn.h1.report.query('SELECT class,qualifying FROM e2.evidence_view WHERE id=$1', [assisted.evidenceId])).rows[0];
    const rebuilt = shape(await s.rebuild(s.skill));
    return { original: { id: original.id, class: original.class, qualifying: original.qualifying }, correction: { id: correction.id, class: correction.class, qualifying: correction.qualifying, correctionOf: correction.payload.correctionOf }, unchanged: same(hBefore, hAfter), report: report.map((r) => ({ id: r.id, class: r.class, qualifying: r.qualifying, kind: r.payload.kind })), forged: { class: forged.class, qualifying: forged.qualifying }, relabel, assisted: { reasons: assisted.reasons, qualifying: assisted.qualifying, row: assistedRow, unchanged: same(hAssisted, hAssistedAfter) }, rebuilt: rebuilt.map((r) => r.evidence_ids) };
  },
  assert(o) {
    assert.deepEqual([o.original.class, o.original.qualifying, o.correction.class, o.correction.qualifying, o.correction.correctionOf], ['corrections-practice', false, 'corrections-practice', false, o.original.id]);
    assert.equal(o.unchanged, true, 'the original practice row (and every other row of the learner) is byte-identical after the correction');
    assert.deepEqual(o.report, [{ id: o.original.id, class: 'corrections-practice', qualifying: false, kind: 'practice' }, { id: o.correction.id, class: 'corrections-practice', qualifying: false, kind: 'correction' }], 'the report shows original and correction with classes intact');
    assert.deepEqual(o.forged, { class: 'corrections-practice', qualifying: false }, 'a payload cannot promote practice to unassisted');
    for (const who of [...ROLES, 'owner']) assert.ok(o.relabel[who].sqlstate === '42501' || o.relabel[who].sqlstate === '55000', `${who} cannot relabel (${o.relabel[who].sqlstate})`);
    assert.ok(o.assisted.reasons.includes('assistance_observed') && o.assisted.qualifying === false, 'help during the check disqualifies the attempt');
    assert.deepEqual([o.assisted.row.class, o.assisted.row.qualifying, o.assisted.unchanged], ['unassisted-attempt', false, true], 'the assisted attempt keeps its class and stays non-qualifying after a correction');
    assert.deepEqual(o.rebuilt, [[]], 'the projection counts nothing from practice, corrections or the assisted attempt');
  },
};

/** Criterion 4: evidence under e2-draft-1 is never re-counted under a synthetic e2-draft-2; each version rebuilds its own set; nothing certifies. */
cases.r4_rule_versions_pin = {
  async run() {
    const s = await scope('r4').init();
    const d1a = await s.flow({ rule: RULE }); const d1b = await s.flow({ rule: RULE });
    const liveAfterDraft1 = shape(await s.live());
    const d2 = await s.flow({ rule: RULE2 });
    const live = shape(await s.live());
    const rebuilt = shape(await s.rebuild(s.skill));
    const replayed = await replay(s);
    const rules = (await admin.query('SELECT id,rule_version FROM e2.evidence_events WHERE household_id=$1 AND learner_id=$2 ORDER BY causal_seq', ['h1', s.learner])).rows;
    return { d1: [d1a.result.evidenceId, d1b.result.evidenceId], d2: d2.result.evidenceId, resultRules: [d1a.result.ruleVersion, d2.result.ruleVersion], certifications: [d1a.result.certification, d1b.result.certification, d2.result.certification], liveAfterDraft1, live, rebuilt, replayed, rules };
  },
  assert(o) {
    assert.deepEqual(o.resultRules, [RULE, RULE2]);
    assert.deepEqual(o.liveAfterDraft1.map((r) => [r.rule_version, r.evidence_ids]), [[RULE, o.d1]]);
    assert.deepEqual(o.live.map((r) => [r.rule_version, r.evidence_ids, r.independent_successes]), [[RULE, o.d1, 2], [RULE2, [o.d2], 1]], 'the draft-2 partition holds only draft-2 evidence; draft-1 keeps its own');
    assert.deepEqual(o.rebuilt, o.live, 'rebuild under each version yields its own contributor set');
    assert.deepEqual(o.replayed, o.live, 'the independent replay agrees');
    assert.deepEqual(o.certifications, ['none', 'none', 'none']); assert.ok(o.live.every((r) => r.certification === 'none'), 'nothing certifies across versions');
    assert.deepEqual(o.rules.map((r) => r.rule_version), [RULE, RULE, RULE2], 'each evidence row keeps the rule it was recorded under');
  },
};

/** Criterion 5: this caller takes no locks; every write is a documented e2.* call; the EXECUTE matrix equals db/README.md. */
cases.r5_no_caller_locks_role_matrix = {
  async run() {
    const source = fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    const lockPattern = new RegExp(['pg_' + 'advisory', 'FOR ' + 'UPDATE', 'FOR ' + 'SHARE', 'LOCK ' + 'TABLE', 'LOCK ' + 'e2'].join('|'), 'i');
    const callerLocks = (source.match(lockPattern) || []).length;
    const e2Writes = [...source.matchAll(/e2\.([a-z_]+)\(/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).sort();
    const directWrites = [...source.matchAll(/(INSERT INTO|UPDATE|DELETE FROM) e2\.([a-z_]+)/g)].map((m) => `${m[1]} e2.${m[2]}`).filter((v, i, a) => a.indexOf(v) === i).sort();
    const functions = (await admin.query("SELECT p.proname AS name, p.oid::int AS oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='e2' ORDER BY 1,2")).rows;
    const matrix = {};
    for (const f of functions) {
      const row = (await admin.query(`SELECT ${ROLES.map((r) => `has_function_privilege('${r}',$1::oid,'EXECUTE') AS ${r}`).join(',')}`, [f.oid])).rows[0];
      matrix[f.name] = ROLES.filter((r) => row[r]);
    }
    return { callerLocks, e2Writes, directWrites, matrix, matrixHash: crypto.createHash('sha256').update(JSON.stringify(matrix)).digest('hex') };
  },
  assert(o) {
    assert.equal(o.callerLocks, 0, 'no advisory, row or table lock in this caller');
    const documented = { issue_attempt: ['assessment'], submit_attempt: ['learner', 'assessment'], finalize_attempt: ['assessment'], record_exposure: ['tutor', 'assessment'], append_practice: ['tutor', 'assessment'], offer_transition: ['learner', 'tutor', 'assessment'], rebuild_projection: ['assessment'], expire_attempt: ['assessment'], cancel_attempt: ['assessment'], queue_practice_check: ['tutor', 'assessment'], practice_check: ['tutor', 'assessment'], set_fixture_clock: [], operation_clock: [], lock_skills: [], lock_content: [], lock_projection_content: [], end_attempt: [] };
    for (const [fn, roles] of Object.entries(documented)) assert.deepEqual(o.matrix[fn], roles, `EXECUTE on e2.${fn} is exactly ${JSON.stringify(roles)} (db/README.md)`);
    assert.ok(!Object.entries(o.matrix).some(([fn, roles]) => fn !== 'household_id' && roles.includes('report')), 'report has no mutation entry point');
    const seamWrites = ['issue_attempt', 'submit_attempt', 'finalize_attempt', 'record_exposure', 'append_practice', 'rebuild_projection'];
    for (const w of seamWrites) assert.ok(o.e2Writes.includes(w), `write path ${w} is a documented e2.* call`);
    assert.deepEqual(o.directWrites.filter((w) => !/(INSERT INTO e2\.(households|learners|rule_versions|rubrics|items|content_revocations))|(UPDATE e2\.(content_revocations|evidence_events))/.test(w)), [], 'direct statements are owner fixture seeding, the documented owner-side revocation, or negative tests');
  },
};

/**
 * The suite runs in its own database on the PM cluster (default `kaizenedu_e3r`, `--database=` to
 * change), created once by the owner and migrated from THIS worktree's db/migrations. The shared
 * `kaizenedu_e2` database carries whatever sibling worktrees have applied to it (on 2026-09-17 an
 * unmerged 0007 changed `issue_attempt`), so a proof about this tree's seam must not read it.
 */
async function ownDatabase() {
  const name = flag('database') || 'kaizenedu_e3r';
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new TypeError('database name');
  const url = new URL(process.env.KAIZENEDU_PG_URL);
  const bootstrap = await H.owner();
  try {
    const exists = await bootstrap.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
    if (exists.rowCount === 0) await bootstrap.query(`CREATE DATABASE ${name}`);
  } finally { await bootstrap.end(); }
  url.pathname = '/' + name;
  process.env.KAIZENEDU_PG_URL = url.toString();
  process.env.PGDATABASE = name;
  return name;
}

async function main() {
  const database = await ownDatabase();
  admin = await H.owner();
  server = await H.serverIdentity(admin);
  await migrate(admin);
  await seed();
  for (const h of HOUSEHOLDS) for (const role of ROLES) conn[h][role] = await H.connect({ household: h, role });
  const records = [];
  const names = Object.keys(cases).filter((n) => only.length === 0 || only.some((o) => n.includes(o)));
  for (const name of names) {
    const c = cases[name];
    let observed = null; let error = null; let pass = false;
    try { observed = await c.run(); c.assert(observed); pass = true; }
    catch (e) { error = { name: e.name, message: String(e.message).slice(0, 600), code: e.code ?? null }; }
    records.push({ case: name, db: 'postgresql', pass, observed, error });
    console.log(JSON.stringify({ case: name, pass, error: error && error.message }));
  }
  const header = {
    suite: 'replay', issue: 16, criterion: 'E11', seam: 'e2.* SQL functions (ADR-0066); callers hold no locks', runtime: process.version,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    dirty: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean).length,
    server: { version: server.version, version_num: server.version_num, mode: server.mode, target: server.target, database: server.database, owner_login: server.login },
    database, migrations: fs.readdirSync(path.join(ROOT, 'db/migrations')).filter((f) => f.endsWith('.sql')).sort(),
    run: RUN, seed: SEED, sequences: SEQUENCES, scopes: SCOPES, mutant: MUTANT || null, roleRetries, at: new Date().toISOString(),
  };
  const out = path.join(ROOT, 'tests/engine/evidence/results-replay-pg.json');
  if (only.length === 0 && !MUTANT) fs.writeFileSync(out, JSON.stringify({ header, records }, null, 2) + '\n');
  const failed = records.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ suite: 'replay', server: header.server, seed: SEED, mutant: MUTANT || null, passed: records.length - failed, failed, written: only.length === 0 && !MUTANT ? path.relative(ROOT, out) : null }));
  process.exitCode = failed ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await Promise.all(HOUSEHOLDS.flatMap((h) => Object.values(conn[h])).map((c) => c.end().catch(() => {})));
  if (admin) await admin.end().catch(() => {});
});
