// E2 part B on PostgreSQL, round 3: the exposure ledger, eligibility clock, latch and quiet-window
// scheduler as callers of part C's e2.* functions, on part C's harness (tests/engine/pg/harness.cjs)
// and its role bindings. Cases b1–b4 are the blind reviewer's four findings
// (~/pm/shared/artifacts/review-kaizenedu-4/REVIEW.md) re-expressed on the seam; b5–b7 are the
// retained behaviours (48 h boundary on server time, cross-session help, duplicate operations); b8–b9 and
// the nine-rep / day-14 cells in b4 close issue #14 (the r3 reviewer's surviving mutants M03, M08, M09, M10).
//
//   set -a; . /Users/mann/pm/run/pg17.env; set +a
//   sh tests/engine/exposure-pg/run-pg.sh [case ...]
//
// Never starts a server. Migrates forward (idempotent), seeds a run-scoped synthetic learner in
// household h1 plus items per skill, and leaves the
// run-scoped rows in place (append-only tables; the seam forbids deleting them).
// Output: tests/engine/evidence/results-pg.json (server version, connection, pids, every case).
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT, TOOLCHAIN, load, hashes, typescriptVersion } = require('../harness/loader.cjs');
const { owner, connect, provisionPrincipals, transaction, serverIdentity } = require('../pg/harness.cjs');
const { gate, waitBlocked } = require('../pg/barriers.cjs');
const { migrate } = require('../../../db/migrate.cjs');
const twoKey = require('../pg/two-key.cjs');

const exposure = load('@/lib/tutor/exposure');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const run = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const learner = 'l_' + run;
const scope = { learnerId: learner };
const rubric = 'r_' + run;
const clients = [];
let admin, tutorA, tutorB, assessment, learnerConn;

const call = (c, sql, args) => transaction(c, async (tx) => (await tx.query(sql, args)).rows[0].value);
const runIn = (c, options) => (fn) => transaction(c, fn, options);
const rc = { isolation: 'read committed' };
const sqlstate = async (p) => { try { await p; return null; } catch (e) { return e.code ?? e.message; } };

let skillCounter = 0;
/** A fresh skill for a case, with `items` approved items on it (one per attempt: the seam marks re-issued items familiar).
 *  E3 integration (#24): under #17's two-key rule the stored key is a numeric key and two author logins key and
 *  approve each item (tests/engine/pg/two-key.cjs); the stem-less content abstains at the gate and does not block. */
async function newSkill(items = 3) {
  const skill = `s${++skillCounter}_${run}`;
  for (let n = 1; n <= items; n += 1) {
    await admin.query(
      "INSERT INTO e2.items(household_id,id,version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,approval,content,answer_key,provenance) VALUES('h1',$1,'1','1',$2,'1',$3,'1',$4,$5,'approved',$6,$7,$8)",
      [`${skill}_i${n}`, rubric, skill, `family_${skill}`, `context_${skill}_${n}`, { prompt: 'Synthetic arithmetic' }, twoKey.numericKey('4'), { review: 'synthetic' }],
    );
    await twoKey.approveItem(admin, `${skill}_i${n}`, { value: '4' });
  }
  let next = 0;
  return { id: skill, nextItem: () => `${skill}_i${++next}` };
}
const input = (opId, skillIds, more = {}) => ({ ...scope, opId: opId + '_' + run, sessionId: 'session_' + run, source: 'text', kind: 'hint', skillIds, skillVersion: '1', ...more });
async function issue(skill, session = 'session_' + run) {
  return call(assessment, 'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value', [learner, skill.nextItem(), '1', crypto.randomUUID(), session, 'fixture-scorer', '1']);
}
const submit = (a) => call(learnerConn, 'SELECT e2.submit_attempt($1,$2,$3) AS value', [learner, a.id, { answer: 4 }]);
const finalize = (c, a) => call(c, 'SELECT e2.finalize_attempt($1,$2,$3,$4) AS value', [learner, a.id, { answer: 4 }, { correct: true }]);
/** Fixture-only: age rows the seam wrote (owner, triggers off). Simulated age is setup, not a claim that time passed. */
async function age(statements) {
  await admin.query('BEGIN'); await admin.query("SET LOCAL session_replication_role = 'replica'");
  try { for (const [sql, args] of statements) await admin.query(sql, args); await admin.query('COMMIT'); } catch (e) { await admin.query('ROLLBACK'); throw e; }
}

/**
 * C r4's owner-only fixture clock: seed `n` clean reps whose server receipt time is `interval` ago,
 * committed. The opt-in, the clock and the owner's principal binding never outlive the transaction;
 * no row the seam wrote is edited. Simulated age is setup, not a claim that time passed.
 */
async function seedRepsAt(s, interval, n = 10) {
  await admin.query('BEGIN');
  try {
    await admin.query("INSERT INTO e2.principals(login,household_id) VALUES (session_user,'h1') ON CONFLICT (login) DO UPDATE SET household_id = EXCLUDED.household_id");
    await admin.query('UPDATE e2.fixture_control SET enabled = true WHERE singleton');
    await admin.query('SELECT e2.set_fixture_clock(now() - $1::interval)', [interval]);
    for (let i = 1; i <= n; i += 1) await exposure.appendPractice(admin, { ...scope, opId: `rep_${s.id}_${i}`, sessionId: 'session_' + run, skillId: s.id, skillVersion: '1', payload: { correct: true, assisted: false } });
    await admin.query('SELECT e2.set_fixture_clock(NULL)');
    await admin.query('UPDATE e2.fixture_control SET enabled = false WHERE singleton');
    await admin.query('DELETE FROM e2.principals WHERE login = session_user');
    await admin.query('COMMIT');
  } catch (e) { await admin.query('ROLLBACK'); throw e; }
}

const cases = {};

/** Finding 1: exposure and every affected skill are one function; a retry repairs nothing because nothing is partial; issue is ordered with the exposure. */
cases.b1_atomic_multi_skill_and_issue_order = {
  async run() {
    const s1 = await newSkill(), s2 = await newSkill(), s3 = await newSkill();
    let delivered = 0;
    const first = await exposure.deliverAfterExposure(runIn(tutorA), input('b1', [s1.id, s2.id]), () => { delivered += 1; return 'sent'; });
    const [e1, e2, e3] = await Promise.all([s1, s2, s3].map((s) => exposure.skillEligibility(tutorB, scope, s.id)));
    const retry = await exposure.deliverAfterExposure(runIn(tutorA), input('b1', [s1.id, s2.id]), () => { delivered += 1; return 'sent'; });
    // Delivery that throws after the commit: the record stands; the replay does not deliver again (a new op id would).
    let threw = null, delivered2 = 0;
    try { await exposure.deliverAfterExposure(runIn(tutorA), input('b1_throw', [s1.id]), () => { throw new Error('client gone'); }); } catch (e) { threw = e.message; }
    const replay2 = await exposure.deliverAfterExposure(runIn(tutorA), input('b1_throw', [s1.id]), () => { delivered2 += 1; });
    // Issue while the exposure is recorded but uncommitted: the issue blocks on the skill lock, then sees it.
    const s4 = await newSkill();
    const g = gate();
    let delivered4 = false;
    const sending = exposure.deliverAfterExposure((fn) => transaction(tutorA, async (tx) => { const r = await fn(tx); await g.wait(); return r; }), input('b1_race', [s4.id]), () => { delivered4 = true; });
    await g.entered;
    const issuing = issue(s4);
    const blocked = await waitBlocked(admin, assessment.fixtureIdentity.pid, tutorA.fixtureIdentity.pid);
    const deliveredWhileIssueBlocked = delivered4;
    g.release();
    const sent = await sending;
    const attempt = await issuing;
    const deliveredAfterCommit = delivered4;
    await submit(attempt);
    const result = await finalize(assessment, attempt);
    return {
      first: { created: first.record.created, delivered: first.delivered, sequences: first.record.causalSequences, skills: first.record.skillIds },
      deliveredCount: delivered, eligibility: { s1: e1.eligible, s2: e2.eligible, s3: e3.eligible, s1Seq: e1.lastExposureSeq, s2Seq: e2.lastExposureSeq },
      retry: { created: retry.record.created, replayed: retry.replayed, delivered: retry.delivered, sameId: retry.record.id === first.record.id },
      throwThenReplay: { threw, delivered2, replayed: replay2.replayed },
      race: { issueBlockedOn: blocked.blockers, tutorPid: tutorA.fixtureIdentity.pid, deliveredWhileIssueBlocked, deliveredAfterCommit, exposureSeq: sent.record.causalSequences[s4.id], attemptExposureSeq: Number(attempt.exposure_seq), reasons: result.reasons, qualifying: result.qualifying },
    };
  },
  head(o) {
    assert.equal(o.first.created, true); assert.equal(o.first.delivered, 'sent');
    assert.deepEqual(o.first.skills.slice().sort(), Object.keys(o.first.sequences).sort(), 'every affected skill carries a sequence in the one row');
    assert.deepEqual([o.eligibility.s1, o.eligibility.s2, o.eligibility.s3], [false, false, true], 'both skills reset atomically; the third untouched');
    assert.deepEqual([o.eligibility.s1Seq, o.eligibility.s2Seq], [o.first.sequences[Object.keys(o.first.sequences)[0]], o.first.sequences[Object.keys(o.first.sequences)[1]]]);
    assert.equal(o.deliveredCount, 1, 'delivered once');
    assert.deepEqual([o.retry.created, o.retry.replayed, o.retry.delivered, o.retry.sameId], [false, true, undefined, true], 'the replay returns the stored row and delivers nothing');
    assert.equal(o.throwThenReplay.threw, 'client gone'); assert.deepEqual([o.throwThenReplay.delivered2, o.throwThenReplay.replayed], [0, true]);
    assert.ok(o.race.issueBlockedOn.includes(o.race.tutorPid), 'issue waited on the exposure writer');
    assert.equal(o.race.deliveredWhileIssueBlocked, false, 'nothing delivered before commit');
    assert.equal(o.race.deliveredAfterCommit, true);
    assert.equal(o.race.attemptExposureSeq, o.race.exposureSeq, 'the attempt was issued after the exposure and froze its sequence');
    assert.ok(o.race.reasons.includes('delay_under_48h'), 'issued inside the delay: not qualifying'); assert.equal(o.race.qualifying, false);
  },
};

/** Finding 2: the seal sees the exposure or the delivery has not happened; a seal first leaves history intact. */
cases.b2_seal_vs_delivery = {
  async run() {
    const s = await newSkill();
    const a = await issue(s); await submit(a);
    const g = gate(); let delivered = false;
    const sending = exposure.deliverAfterExposure((fn) => transaction(tutorA, async (tx) => { const r = await fn(tx); await g.wait(); return r; }), input('b2', [s.id]), () => { delivered = true; });
    await g.entered;
    const sealing = finalize(assessment, a);
    const blocked = await waitBlocked(admin, assessment.fixtureIdentity.pid, tutorA.fixtureIdentity.pid);
    const deliveredWhileSealBlocked = delivered;
    g.release();
    const sent = await sending; const sealed = await sealing;
    const latch = await exposure.attemptAssistanceLatch(tutorB, scope, a.id);
    // Seal first, then help: the completed result is untouched; the skill's clock resets for the future.
    const s2 = await newSkill();
    const b = await issue(s2); await submit(b); const sealedB = await finalize(assessment, b);
    const late = await exposure.deliverAfterExposure(runIn(tutorA), input('b2_late', [s2.id]), () => 'sent');
    const latchB = await exposure.attemptAssistanceLatch(tutorB, scope, b.id);
    const eligB = await exposure.skillEligibility(tutorB, scope, s2.id);
    return {
      sealBlockedOn: blocked.blockers, tutorPid: tutorA.fixtureIdentity.pid, deliveredWhileSealBlocked, deliveredAfter: delivered,
      exposureSeq: sent.record.causalSequences[s.id], attemptSeqAtIssue: Number(a.exposure_seq), reasons: sealed.reasons, qualifying: sealed.qualifying, latch: { latched: latch.latched, state: latch.state, reasons: latch.reasons },
      orderB: { reasons: sealedB.reasons, qualifying: sealedB.qualifying, lateDelivered: late.delivered, latchedAfter: latchB.latched, qualifyingAfter: latchB.qualifying, skillEligibleAfter: eligB.eligible },
    };
  },
  head(o) {
    assert.ok(o.sealBlockedOn.includes(o.tutorPid), 'the seal waited on the exposure writer');
    assert.equal(o.deliveredWhileSealBlocked, false, 'no delivery before the exposure committed');
    assert.equal(o.deliveredAfter, true);
    assert.ok(o.exposureSeq > o.attemptSeqAtIssue);
    assert.ok(o.reasons.includes('assistance_observed'), 'the seal saw the exposure'); assert.equal(o.qualifying, false);
    assert.deepEqual([o.latch.latched, o.latch.state], [true, 'finalized']);
    assert.deepEqual([o.orderB.reasons, o.orderB.qualifying], [[], true], 'seal first: qualifying');
    assert.equal(o.orderB.lateDelivered, 'sent');
    assert.deepEqual([o.orderB.latchedAfter, o.orderB.qualifyingAfter, o.orderB.skillEligibleAfter], [false, true, false], 'later help leaves the sealed result intact and resets the clock');
  },
};

/** Finding 3: a resumed delivery never delivers under an old receipt; a retry with different skills is a conflict. */
cases.b3_replay_never_redelivers = {
  async run() {
    const cells = [];
    for (const source of exposure.EXPOSURE_SOURCES) for (const kind of exposure.EXPOSURE_KINDS) for (const interval of ['48 hours', '49 hours', '7 days']) {
      const s = await newSkill(1);
      const op = `b3_${source}_${kind}_${interval.replace(' ', '')}`;
      let delivered = 0;
      const original = await exposure.deliverAfterExposure(runIn(tutorA), input(op, [s.id], { source, kind }), () => { delivered += 1; });
      await age([['UPDATE e2.exposure_events SET received_at = now() - $2::interval WHERE id = $1::uuid', [original.record.id, interval]], ['UPDATE e2.skill_guards SET last_exposure_at = now() - $2::interval WHERE learner_id = $1 AND skill_id = $3', [learner, interval, s.id]]]);
      const a = await issue(s); await submit(a);
      const resumed = await exposure.deliverAfterExposure(runIn(tutorA), input(op, [s.id], { source, kind }), () => { delivered += 1; });
      const elig = await exposure.skillEligibility(tutorB, scope, s.id);
      const sealed = await finalize(assessment, a);
      cells.push({ source, kind, interval, deliveredTotal: delivered, replayed: resumed.replayed, sameId: resumed.record.id === original.record.id, eligible: elig.eligible, reasons: sealed.reasons, qualifying: sealed.qualifying });
    }
    const s = await newSkill(1);
    await exposure.recordExposure(tutorA, input('b3_conflict', [s.id], { payload: { content: 'F1' } })).catch(() => null);
    const first = await exposure.deliverAfterExposure(runIn(tutorA), input('b3_conflict', [s.id], { payload: { content: 'F1' } }), () => 'sent');
    const other = await newSkill(1);
    let conflictDelivered = 0;
    const conflict = await sqlstate(exposure.deliverAfterExposure(runIn(tutorA), input('b3_conflict', [other.id], { payload: { content: 'F2' } }), () => { conflictDelivered += 1; }));
    const otherElig = await exposure.skillEligibility(tutorB, scope, other.id);
    return { cases: cells.length, redelivered: cells.filter((c) => c.deliveredTotal !== 1).length, notReplayed: cells.filter((c) => !c.replayed || !c.sameId).length, ineligible: cells.filter((c) => !c.eligible).length, notQualifying: cells.filter((c) => !c.qualifying).length, cells, conflict: { firstReplayed: first.replayed, code: conflict, conflictDelivered, otherEligible: otherElig.eligible } };
  },
  head(o) {
    assert.equal(o.cases, 36);
    assert.equal(o.redelivered, 0, 'no cell delivered twice');
    assert.equal(o.notReplayed, 0, 'every resume returned the stored row');
    assert.equal(o.ineligible, 0, 'aged ≥ 48 h: eligible on the server clock');
    assert.equal(o.notQualifying, 0, 'no fresh help was delivered, so the attempt qualifies');
    assert.equal(o.conflict.code, 'P0001', 'a retry with different skills is a conflict');
    assert.equal(o.conflict.conflictDelivered, 0); assert.equal(o.conflict.otherEligible, true, 'nothing was recorded or delivered for the other skill');
  },
};

/** Finding 4: scheduler transitions are serialized by the seam's skill lock (ADR-0066; the scheduler takes none), revalidated, and unique in the database. */
cases.b4_scheduler_concurrency_and_revalidation = {
  async run() {
    const seedReps = async (s, n = 10) => { for (let i = 1; i <= n; i += 1) await transaction(tutorA, (tx) => exposure.appendPractice(tx, { ...scope, opId: `rep_${s.id}_${i}`, sessionId: 'session_' + run, skillId: s.id, skillVersion: '1', payload: { correct: true, assisted: false } })); };
    // Two connections evaluate; the first pauses after its seam write (holding e2.lock_skills until commit), the second blocks inside the seam and returns the first's offer.
    const s = await newSkill(); await seedReps(s);
    const g1 = gate();
    const evalA = exposure.evaluateSkill(runIn(tutorA, rc), scope, s.id, { afterSeamWrite: () => g1.wait() });
    await g1.entered;
    const evalB = exposure.evaluateSkill(runIn(tutorB, rc), scope, s.id);
    const offerBlocked = await waitBlocked(admin, tutorB.fixtureIdentity.pid, tutorA.fixtureIdentity.pid);
    g1.release();
    const offers = await Promise.all([evalA, evalB]);
    const g2 = gate();
    const takeA = exposure.takeOffer(runIn(tutorA, rc), scope, s.id, offers[0].openOffer.id, { afterSeamWrite: () => g2.wait() });
    await g2.entered;
    const takeB = exposure.takeOffer(runIn(tutorB, rc), scope, s.id, offers[0].openOffer.id);
    const takeBlocked = await waitBlocked(admin, tutorB.fixtureIdentity.pid, tutorA.fixtureIdentity.pid);
    g2.release();
    const takes = await Promise.all([takeA, takeB]);
    const metrics = await exposure.offerMetrics(tutorA, scope, s.id);
    // Help after the offer, then a take before any evaluation: revalidated inside the take, restarted, refused.
    const s2 = await newSkill(); await seedReps(s2);
    const open = await exposure.evaluateSkill(runIn(tutorA, rc), scope, s2.id);
    const help = await exposure.recordExposure(tutorA, input('b4_help', [s2.id])).catch(() => null) ?? await transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b4_help2', [s2.id])));
    let stale; try { stale = (await exposure.takeOffer(runIn(tutorB, rc), scope, s2.id, open.openOffer.id)).kind; } catch (e) { stale = { name: e.name, reason: e.reason, restarted: e.restarted ? { id: e.restarted.id, kind: e.restarted.kind, offerId: e.restarted.offerId, offerSeq: e.restarted.reason.offerExposureSeq, exposureSeq: e.restarted.reason.exposureSeq } : null }; }
    // Round-2 finding 1: the restart the refusal reports is committed before any later evaluation — read from the other connection.
    const persisted = await exposure.listOffers(tutorA, scope, s2.id);
    const committed = { metrics: await exposure.offerMetrics(tutorA, scope, s2.id), restartRowExists: persisted.some((o) => o.kind === 'restarted' && o.id === stale?.restarted?.id), offerOpen: persisted.find((o) => o.id === open.openOffer.id)?.open };
    let staleAgain; try { staleAgain = (await exposure.takeOffer(runIn(tutorB, rc), scope, s2.id, open.openOffer.id)).kind; } catch (e) { staleAgain = { reason: e.reason, restartedId: e.restarted?.id ?? null }; }
    const after = await exposure.evaluateSkill(runIn(tutorA, rc), scope, s2.id);
    const metrics2 = await exposure.offerMetrics(tutorA, scope, s2.id);
    // Uniqueness, independent of the client: callers have no table write grant (42501); a second offer or a
    // second take through the seam under a distinct operation is refused (P0001); a retry under the same
    // operation returns the stored row.
    const s3 = await newSkill(); await seedReps(s3); const third = await exposure.evaluateSkill(runIn(tutorA, rc), scope, s3.id);
    const dupOffer = await sqlstate(call(tutorA, "INSERT INTO e2.assessment_offers(household_id,learner_id,skill_id,operation_id,kind,exposure_seq,causal_seq,open,request,reason,provenance,rule_version) VALUES(e2.household_id(),$1,$2,'dup',$3,0,0,true,'{}','{}','{}','e2-draft-1') RETURNING id AS value", [learner, s3.id, 'offered']));
    const dupOfferSeam = await sqlstate(call(tutorA, 'SELECT e2.offer_transition($1,$2,$3,NULL,$4::jsonb) AS value', [learner, s3.id, 'offer', JSON.stringify({ operationId: 'dup_offer_' + run })]));
    const dupTakeSeam = await sqlstate(call(tutorA, 'SELECT e2.offer_transition($1,$2,$3,$4::uuid,$5::jsonb) AS value', [learner, s.id, 'take', offers[0].openOffer.id, JSON.stringify({ operationId: 'dup_take_' + run })]));
    const retryTake = await exposure.takeOffer(runIn(tutorB, rc), scope, s.id, offers[0].openOffer.id);
    const secondOpen = (await exposure.listOffers(tutorB, scope, s3.id)).filter((o) => o.kind === 'offered' && o.open).length;
    // Issue #14 / reviewer mutant M08: nine clean reps is not priority (quietWindowReps = 10); the scheduler
    // reports a practice estimate and the seam refuses an offer at nine with practice_priority_not_reached.
    const nine = await newSkill(1); await seedReps(nine, 9);
    let atNine; try { const x = await exposure.evaluateSkill(runIn(tutorA, rc), scope, nine.id); atNine = { state: x.state, priority: x.reps.priority, cleanReps: x.reps.cleanReps, required: x.reps.required, openOffer: x.openOffer }; } catch (e) { atNine = { state: 'threw', message: e.message }; }
    let nineSeam; try { await call(tutorA, 'SELECT e2.offer_transition($1,$2,$3,NULL,$4::jsonb) AS value', [learner, nine.id, 'offer', JSON.stringify({ operationId: 'nine_offer_' + run })]); nineSeam = null; } catch (e) { nineSeam = { code: e.code, message: e.message }; }
    const nineOffers = (await exposure.listOffers(tutorA, scope, nine.id)).length;
    // Escalation on server time, reps seeded under C's owner-only fixture clock: priority held 14 days
    // (the threshold, exactly — issue #14 / reviewer mutant M09) or 15 days with no take escalates; 13 days waits.
    const esc = {};
    for (const [label, days] of [['day13', 13], ['day14', 14], ['day15', 15]]) {
      const sk = await newSkill(1); await seedRepsAt(sk, `${days} days`);
      await transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b4_' + label, [sk.id])));
      const x = await exposure.evaluateSkill(runIn(tutorA, rc), scope, sk.id);
      esc[label] = { state: x.state, heldMicros: x.escalation?.heldMicros ?? null, message: x.message.slice(0, 60) };
    }
    return {
      thresholds: { nine: atNine, nineSeam, nineOffers },
      offerRace: { blockedOn: offerBlocked.blockers, tutorAPid: tutorA.fixtureIdentity.pid, ids: offers.map((o) => o.openOffer.id), states: offers.map((o) => o.state) },
      takeRace: { blockedOn: takeBlocked.blockers, ids: takes.map((t) => t.id), kinds: takes.map((t) => t.kind) }, metrics,
      staleTake: { helpSeq: help.causalSequences[s2.id], offerSeq: open.openOffer.exposureSeq, result: stale, committed, staleAgain, stateAfter: after.state, metrics: metrics2 },
      uniqueness: { dupOffer, dupOfferSeam, dupTakeSeam, retryTakeId: retryTake.id, firstTakeId: takes[0].id, secondOpen, thirdOffer: third.openOffer?.id ?? null }, escalation: esc,
    };
  },
  head(o) {
    assert.ok(o.offerRace.blockedOn.includes(o.offerRace.tutorAPid), 'the second evaluation waited on the skill lock');
    assert.equal(new Set(o.offerRace.ids).size, 1, 'one offer'); assert.deepEqual(o.offerRace.states, ['eligible', 'eligible']);
    assert.ok(o.takeRace.blockedOn.includes(o.offerRace.tutorAPid)); assert.equal(new Set(o.takeRace.ids).size, 1, 'one take'); assert.deepEqual(o.takeRace.kinds, ['taken', 'taken']);
    assert.deepEqual(o.metrics, { offered: 1, taken: 1, restarted: 0, escalated: 0 });
    assert.ok(o.staleTake.helpSeq > o.staleTake.offerSeq, 'help after the offer has a higher sequence');
    assert.equal(o.staleTake.result.name, 'OfferStateError', 'the stale take was refused'); assert.equal(o.staleTake.result.restarted.kind, 'restarted');
    assert.ok(o.staleTake.result.restarted.exposureSeq > o.staleTake.result.restarted.offerSeq, 'compared by sequence');
    assert.equal(o.staleTake.result.reason, 'help_after_offer');
    assert.deepEqual(o.staleTake.committed, { metrics: { offered: 1, taken: 0, restarted: 1, escalated: 0 }, restartRowExists: true, offerOpen: false }, 'the reported restart is committed and the offer closed before any evaluation (finding 1)');
    assert.deepEqual(o.staleTake.staleAgain, { reason: 'restarted', restartedId: o.staleTake.result.restarted.id }, 'a second take reports the same committed restart');
    assert.equal(o.staleTake.stateAfter, 'waiting'); assert.deepEqual(o.staleTake.metrics, { offered: 1, taken: 0, restarted: 1, escalated: 0 }, 'evaluation adds nothing');
    assert.equal(o.uniqueness.dupOffer, '42501', 'callers cannot write the ledger directly');
    assert.equal(o.uniqueness.dupOfferSeam, 'P0001', 'the seam refuses a second open offer'); assert.equal(o.uniqueness.secondOpen, 1);
    assert.equal(o.uniqueness.dupTakeSeam, 'P0001', 'the seam refuses a second take of a closed offer'); assert.equal(o.uniqueness.retryTakeId, o.uniqueness.firstTakeId, 'a retried take returns the stored take');
    assert.deepEqual([o.thresholds.nine.state, o.thresholds.nine.priority, o.thresholds.nine.cleanReps, o.thresholds.nine.required, o.thresholds.nine.openOffer], ['practice_estimate', false, 9, 10, null], 'M08: nine clean reps is not priority; no offer is made');
    assert.equal(o.thresholds.nineSeam?.code, 'P0001', 'M08: the seam refuses an offer at nine reps'); assert.match(o.thresholds.nineSeam?.message ?? '', /practice_priority_not_reached/);
    assert.equal(o.thresholds.nineOffers, 0, 'M08: nothing was written for the nine-rep skill');
    assert.equal(o.escalation.day13.state, 'waiting');
    assert.equal(o.escalation.day14.state, 'escalated', 'M09: escalation fires at exactly day 14 (noWindowEscalationMicros), not later');
    assert.ok(o.escalation.day14.heldMicros >= 14 * 86_400_000_000 && o.escalation.day14.heldMicros < 15 * 86_400_000_000, 'M09: the day-14 cell was held 14 days, under 15');
    assert.equal(o.escalation.day15.state, 'escalated');
  },
};

/** Retained: the 48 h boundary against the server's now() at microsecond precision, one transaction per cell. */
cases.b5_boundary_server_time = {
  async run() {
    const s = await newSkill(1);
    await transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b5', [s.id])));
    const probe = async (interval) => {
      await admin.query('BEGIN');
      try {
        await admin.query(`UPDATE e2.skill_guards SET last_exposure_at = now() - interval '${interval}' WHERE learner_id = $1 AND skill_id = $2`, [learner, s.id]);
        const e = await exposure.skillEligibility(admin, scope, s.id);
        const { rows } = await admin.query(`SELECT (now() - last_exposure_at) >= interval '48 hours' AS server_says FROM e2.skill_guards WHERE learner_id = $1 AND skill_id = $2`, [learner, s.id]);
        return { interval, eligible: e.eligible, reason: e.reason, remainingMicros: e.remainingMicros, serverSays: rows[0].server_says };
      } finally { await admin.query('ROLLBACK'); }
    };
    const cells = { minus1ms: await probe('47 hours 59 minutes 59.999 seconds'), minus1us: await probe('47 hours 59 minutes 59.999999 seconds'), exact: await probe('48 hours'), plus1us: await probe('48 hours 0.000001 seconds'), plus1ms: await probe('48 hours 0.001 seconds') };
    const other = await exposure.skillEligibility(tutorB, scope, (await newSkill(1)).id);
    return { cells, otherReason: other.reason };
  },
  head(o) {
    for (const [k, c] of Object.entries(o.cells)) assert.equal(c.eligible, c.serverSays, k + ': matches the server oracle');
    assert.deepEqual([o.cells.minus1ms.eligible, o.cells.minus1us.eligible, o.cells.exact.eligible, o.cells.plus1us.eligible, o.cells.plus1ms.eligible], [false, false, true, true, true]);
    assert.deepEqual([o.cells.minus1ms.remainingMicros, o.cells.minus1us.remainingMicros, o.cells.exact.remainingMicros], [1000, 1, 0]);
    assert.equal(o.otherReason, 'no_exposure');
  },
};

/** Retained: help in one session is seen by a check in another, and the seam refuses to qualify it; unrelated skills untouched. */
cases.b6_cross_session_help = {
  async run() {
    const s = await newSkill(), other = await newSkill();
    await exposure.deliverAfterExposure(runIn(tutorA), input('b6', [s.id], { sessionId: 'sessionA_' + run, source: 'audio', kind: 'worked_example' }), () => 'sent');
    const seen = await exposure.skillEligibility(tutorB, scope, s.id);
    const unrelated = await exposure.skillEligibility(tutorB, scope, other.id);
    const a = await issue(s, 'sessionB_' + run); await submit(a); const sealed = await finalize(assessment, a);
    const b = await issue(other, 'sessionB_' + run); await submit(b); const sealedOther = await finalize(assessment, b);
    return { seen: { eligible: seen.eligible, reason: seen.reason }, unrelated: unrelated.reason, sameSkill: { reasons: sealed.reasons, qualifying: sealed.qualifying }, otherSkill: { reasons: sealedOther.reasons, qualifying: sealedOther.qualifying } };
  },
  head(o) {
    assert.deepEqual(o.seen, { eligible: false, reason: 'exposure_within_delay' }); assert.equal(o.unrelated, 'no_exposure');
    assert.deepEqual(o.sameSkill, { reasons: ['delay_under_48h'], qualifying: false }); assert.deepEqual(o.otherSkill, { reasons: [], qualifying: true });
  },
};

/** Retained: the same operation from two connections at once collapses onto one row; conflicting arguments fail. */
cases.b7_duplicate_operation_two_connections = {
  async run() {
    const s = await newSkill(1);
    const pair = await Promise.all([tutorA, tutorB].map((c) => transaction(c, (tx) => exposure.recordExposure(tx, input('b7', [s.id])))));
    const { rows } = await tutorA.query('SELECT count(*)::int AS n FROM e2.exposure_events WHERE learner_id = $1 AND operation_id = $2', [learner, 'b7_' + run]);
    const conflict = await sqlstate(transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b7', [s.id], { kind: 'answer' }))));
    return { pids: [tutorA.fixtureIdentity.pid, tutorB.fixtureIdentity.pid], sameId: pair[0].id === pair[1].id, created: pair.map((p) => p.created).sort(), rows: rows[0].n, conflict };
  },
  head(o) {
    assert.notEqual(o.pids[0], o.pids[1]); assert.equal(o.sameId, true); assert.equal(o.rows, 1); assert.deepEqual(o.created, [false, true]); assert.equal(o.conflict, 'P0001');
  },
};

/**
 * Issue #14 / reviewer mutant M03: the all-skills fallback (no explicit and no session skills) records every
 * skill it was given, in C order — not just the first — in the one row, and resets each one's clock.
 */
cases.b8_all_skills_fallback_records_every_skill = {
  async run() {
    const sA = await newSkill(1), sB = await newSkill(1), sC = await newSkill(1), untouched = await newSkill(1);
    const given = [sC.id, sA.id, sB.id];
    const rec = await transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b8_all', [], { allSkillIds: given })));
    const elig = await Promise.all([sA, sB, sC, untouched].map((s) => exposure.skillEligibility(tutorB, scope, s.id)));
    return { given, scope: rec.skillScope, skillIds: rec.skillIds, sequenced: Object.keys(rec.causalSequences).sort(), eligible: elig.map((e) => e.eligible), reasons: elig.map((e) => e.reason) };
  },
  head(o) {
    assert.equal(o.scope, 'all', 'M03: no explicit and no session skills falls back to the all-skills scope');
    assert.deepEqual(o.skillIds, o.given.slice().sort(), 'M03: the all-skills fallback records every skill it was given, in C order');
    assert.deepEqual(o.sequenced, o.given.slice().sort(), 'M03: every skill in the all-skills fallback carries a sequence in the one row');
    assert.deepEqual(o.eligible, [false, false, false, true], 'M03: every skill in the all-skills fallback had its clock reset; a skill outside the list did not');
    assert.deepEqual(o.reasons, ['exposure_within_delay', 'exposure_within_delay', 'exposure_within_delay', 'no_exposure']);
  },
};

/**
 * Issue #14 / reviewer mutant M10: the practice route (lib/tutor/checks/service.ts) reads the cross-session
 * exposure ledger. Help on a skill in one session inside the 48 h delay makes a check on that skill in ANOTHER
 * session `assisted`, with no in-session hint row to fall back on; a check on an unrelated skill is not.
 * E1's tables come from the retained compatibility fixture, created in a private run-scoped schema.
 */
cases.b9_practice_check_reads_cross_session_exposure = {
  async run() {
    const checks = load('@/lib/tutor/checks/service'), prompt = load('@/lib/tutor/checks/prompt'), sessionState = load('@/lib/tutor/session/state'), graph = load('@/lib/tutor/graph/graph');
    const schema = 'e2b_b8_' + run, account = 'acc_' + run, sessionA = 'sessionA_' + run, sessionB = 'sessionB_' + run;
    const principal = { learnerId: learner, accountId: account, band: '13-17', role: 'learner' };
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(`SET search_path TO ${schema}, pg_catalog`);
    try {
      await admin.query(fs.readFileSync(path.join(ROOT, 'tests/engine/pg/e1-schema.sql'), 'utf8').replace("SELECT current_setting('e1.fixture_time')::timestamptz", 'SELECT clock_timestamp()'));
      await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO tutor; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA ${schema} TO tutor; GRANT USAGE ON ALL SEQUENCES IN SCHEMA ${schema} TO tutor`);
      for (const s of graph.SKILLS) await admin.query('INSERT INTO skills(id,name,prereqs,tags,slice,ordinal) VALUES($1,$2,$3,$4,$5,$6)', [s.id, s.name, JSON.stringify(s.prereqs), JSON.stringify(s.tags), s.slice, s.ordinal]);
      await admin.query('INSERT INTO accounts VALUES($1)', [account]);
      await admin.query("INSERT INTO learners VALUES($1,$2,'13-17')", [learner, account]);
    } finally { await admin.query('RESET search_path'); }
    await tutorA.query(`SET search_path TO ${schema}, pg_catalog`);
    // The practice route wants an AssessmentDb (query + transaction) over the tutor connection.
    const db = { query: (text, params) => tutorA.query(text, params), transaction: (fn) => transaction(tutorA, fn) };
    try {
      // Help on F1 in session A, through the seam (no E1 hint row anywhere).
      const help = await transaction(tutorA, (tx) => exposure.recordExposure(tx, input('b9_help', ['F1'], { sessionId: sessionA })));
      const check = async (skillId, turn) => {
        const now = new Date();
        const p = prompt.pendingFromTag({ type: 'numeric', skillId, stem: 'Synthetic 2 + 2', answer: { value: 4, tolerance: 0 } }, { skillId, diagnostic: false, issuedTurnId: `turn_${turn}_${run}`, now }).pending;
        const state = { ...sessionState.initialState({ band: '13-17', target: 'skill', startedAt: now, skillId, diagnostic: null, delayedCheck: null }), pendingCheck: p };
        await tutorA.query("INSERT INTO sessions(id,account_id,learner_id,started_at,phase,skill_id,state) VALUES($1,$2,$3,$4,'work',$5,$6) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state, skill_id=EXCLUDED.skill_id", [sessionB, account, learner, now.toISOString(), skillId, JSON.stringify(state)]);
        const r = await checks.answerCheck(db, principal, { sessionId: sessionB, checkId: p.checkId, answer: 4 }, { now });
        if (!r.ok) return { ok: false, code: r.code };
        return { ok: true, assisted: r.response.result.assisted, correct: r.response.result.correct };
      };
      const sameSkill = await check('F1', 1);
      const unrelated = await check('F2', 2);
      const { rows } = await tutorA.query("SELECT count(*)::int AS n FROM evidence_events WHERE learner_id = $1 AND session_id = $2 AND type = 'hint'", [learner, sessionB]);
      const eligibility = await exposure.skillEligibility(tutorB, scope, 'F1');
      return { helpSession: sessionA, checkSession: sessionB, helpSeq: help.causalSequences.F1, f1: { eligible: eligibility.eligible, reason: eligibility.reason }, hintRowsInCheckSession: rows[0].n, sameSkill, unrelated };
    } finally { await tutorA.query('RESET search_path'); }
  },
  head(o) {
    assert.notEqual(o.helpSession, o.checkSession);
    assert.deepEqual(o.f1, { eligible: false, reason: 'exposure_within_delay' }, 'the help in session A is on the ledger');
    assert.equal(o.hintRowsInCheckSession, 0, 'no in-session hint row exists for the check session: only the ledger can mark it');
    assert.deepEqual(o.sameSkill, { ok: true, assisted: true, correct: true }, 'M10: a practice check on F1 in session B is assisted by the help on F1 in session A');
    assert.deepEqual(o.unrelated, { ok: true, assisted: false, correct: true }, 'a check on an unrelated skill is not assisted');
  },
};

async function main() {
  const chosen = only.length ? only : Object.keys(cases);
  admin = await owner(); clients.push(admin);
  const server = await serverIdentity(admin);
  const migrations = await migrate(admin);
  await admin.query("INSERT INTO e2.households(household_id,timezone) VALUES('h1','America/Chicago') ON CONFLICT DO NOTHING");
  await admin.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2)', ['h1', learner]);
  await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES('h1','e2-draft-1',$1,$2) ON CONFLICT DO NOTHING", [{ delayHours: 48, quietWindowReps: 10, escalationDays: 14, daySeven: [6, 9], certification: false }, { source: 'synthetic-fixture' }]);
  await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES('h1',$1,'1','approved',$2,$3)", [rubric, { method: 'exact-equality' }, { review: 'synthetic' }]);
  await provisionPrincipals(admin);
  await twoKey.provisionAuthors(admin, ['h1']);
  tutorA = await connect({ household: 'h1', role: 'tutor' }); tutorB = await connect({ household: 'h1', role: 'tutor' });
  assessment = await connect({ household: 'h1', role: 'assessment' }); learnerConn = await connect({ household: 'h1', role: 'learner' });
  clients.push(tutorA, tutorB, assessment, learnerConn);
  const header = { runtime: process.version, typescript: typescriptVersion, toolchain: TOOLCHAIN, server, migrations, connection: `tcp ${server.target.host}:${server.target.port}`, learner, connections: { tutorA: tutorA.fixtureIdentity, tutorB: tutorB.fixtureIdentity, assessment: assessment.fixtureIdentity, learner: learnerConn.fixtureIdentity }, head: fs.existsSync(path.join(ROOT, '.git')) ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() : '(no git checkout)' };
  console.log(JSON.stringify(header));
  const records = []; let failures = 0;
  for (const name of chosen) {
    const c = cases[name]; assert.ok(c, 'unknown case ' + name);
    let observed, error = null;
    try { observed = await c.run(); c.head(observed); } catch (e) { error = { name: e.name, code: e.code, message: String(e.message).split('\n').slice(0, 8).join(' | ') }; failures += 1; }
    const record = { case: name, database: 'postgresql', pass: error === null, observed, error };
    records.push(record); console.log(JSON.stringify(record));
  }
  const outDir = path.join(ROOT, 'tests/engine/evidence'); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'results-pg.json'), JSON.stringify({ header, records, loadedSourceHashes: hashes }, null, 2) + '\n');
  console.log(JSON.stringify({ summary: { database: 'postgresql', schema: 'e2', learner, cases: records.length, failures } }));
  if (failures) process.exitCode = 1;
}
main().catch((e) => { console.error(e.stack); process.exitCode = 1; }).finally(() => Promise.all(clients.map((c) => c.end().catch(() => {}))));
