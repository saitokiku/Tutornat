// E1 engine harness (docs/first-build.md). Runs every case against the closure
// in lib/ through the SQLite adapter and checks the observations against the
// expectation table for `--mode baseline` (the inherited behaviour, recorded as
// an observed failure baseline) or `--mode head` (the containment). The same
// cases run in both modes so the reviewer can diff base against head with one
// command per commit. Positive practice controls (c3_*) must pass in BOTH modes;
// adversarial certification cases (c1_*, c2_*) fail at baseline by design.
//
//   node --no-warnings --experimental-sqlite tests/engine/run.cjs --mode baseline
//   node --no-warnings --experimental-sqlite tests/engine/run.cjs --mode head [case]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { ROOT, TOOLCHAIN, load, hashes, typescriptVersion } = require('./harness/loader.cjs');
const { FixtureDb, T0, HOUR, at } = require('./harness/sqlite-db.cjs');

const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const MODE = modeIndex >= 0 ? args[modeIndex + 1] : 'head';
assert.ok(MODE === 'baseline' || MODE === 'head', '--mode baseline|head');
const suffixIndex = args.indexOf('--out-suffix');
const OUT_SUFFIX = suffixIndex >= 0 ? '-' + args[suffixIndex + 1] : '';
const only = args.filter((a, i) => !a.startsWith('--') && i !== modeIndex + 1 && i !== suffixIndex + 1);

const { answerCheck } = load('@/lib/tutor/checks/service');
const { pendingFromTag, pendingFromBankItem } = load('@/lib/tutor/checks/prompt');
const { gradeLocally } = load('@/lib/tutor/checks/grading');
const evidenceModule = load('@/lib/tutor/model/evidence');
const { writeEvidence } = evidenceModule;
const modelService = load('@/lib/tutor/model/service');
const { recordCheckOutcome, getMasteryRow } = modelService;
const { applyCheck } = load('@/lib/tutor/model/student-model');
const { initialState } = load('@/lib/tutor/session/state');
const { afterCheckGraded, newDiagnostic } = load('@/lib/tutor/session/state-machine');
const { loadSession, saveSessionState } = load('@/lib/tutor/session/service');
const { packDryRun, packAndUnpack } = require('./harness/pack-inputs.cjs');
const report = load('@/lib/tutor/report/parent-report');
const { masteryStatusLabel, buildParentReport, REPORT_MASTERY_NOTE } = report;
const { weeklyLead } = load('@/lib/tutor/report/lead');
const reportRows = load('@/lib/tutor/report/rows');
const { buildProgress } = load('@/lib/tutor/progress/service');
const nextSkill = load('@/lib/tutor/graph/next-skill');
const { SKILLS } = load('@/lib/tutor/graph/graph');

const principal = { accountId: 'acc_e1', learnerId: 'lrn_e1', band: '13-17', role: 'learner' };

function newDb() {
  const db = new FixtureDb();
  db.raw.exec(`INSERT INTO accounts VALUES('acc_e1'); INSERT INTO learners VALUES('lrn_e1','acc_e1','13-17');`);
  db.seedSkills(SKILLS);
  return db;
}
function generatedPending(now = T0, key = 4, skillId = 'F1') {
  const parsed = pendingFromTag(
    { type: 'numeric', skillId, stem: 'Compute 2 plus 2.', answer: { value: key, tolerance: 0 } },
    { skillId, diagnostic: false, issuedTurnId: 'trn_fixture', now },
  );
  assert.equal(parsed.ok, true);
  assert.ok('pending' in parsed);
  return parsed.pending;
}
async function session(db, id, now = T0, pending = null, extra = {}) {
  db.time = now.toISOString();
  const state = {
    ...initialState({ band: '13-17', target: 'skill', startedAt: now, skillId: 'F1', diagnostic: null, delayedCheck: null }),
    ...extra,
    pendingCheck: pending,
  };
  await db.query(
    `INSERT INTO sessions(id,account_id,learner_id,started_at,phase,skill_id,state) VALUES($1,$2,$3,$4,'work','F1',$5)`,
    [id, principal.accountId, principal.learnerId, now.toISOString(), JSON.stringify(state)],
  );
  return state;
}
async function setPending(db, id, pending, now) {
  const rec = await loadSession(db, principal, id);
  db.time = now.toISOString();
  await saveSessionState(db, id, 'work', {
    ...rec.state,
    pendingCheck: pending,
    timer: { ...rec.state.timer, deadlineAt: new Date(+now + HOUR).toISOString() },
  });
}
async function answer(db, id, pending, now = T0, value = 4, deps = {}) {
  db.time = now.toISOString();
  return answerCheck(db, principal, { sessionId: id, checkId: pending.checkId, answer: value }, { now, ...deps });
}
const statusesOf = (results) => results.map((r) => r.response.mastery && r.response.mastery.status);
const never = (list, value) => !list.includes(value);
const changesTo = (db) => db.evidence().filter((e) => e.type === 'mastery_change').map((e) => e.payload.to);
const leadOf = (db, mastery, windowStart, windowEnd) =>
  weeklyLead({
    skills: mastery.map((m) => ({ skillId: m.skillId, name: m.skillId, status: m.status, certification: m.certification })),
    changes: db
      .evidence()
      .filter((e) => e.type === 'mastery_change')
      .map((e) => ({ skillId: e.payload.skillId, to: e.payload.to, at: e.ts, qualifying: e.payload.qualifying })),
    windowStart,
    windowEnd,
  });

// ---------------------------------------------------------------------------
const cases = {};

/** Criterion 1: tutor-authored (null item id) checks, long streak, many sessions, 7 days. */
cases.c1_generated_null_id_chain = {
  async run() {
    const db = newDb();
    const results = [];
    // 12 generated checks over 6 sessions spanning seven days; two per session.
    for (let s = 0; s < 6; s += 1) {
      const now = at(s * 28);
      const id = 'gen_' + s;
      await session(db, id, now);
      for (let k = 0; k < 2; k += 1) {
        const p = generatedPending(now);
        await setPending(db, id, p, now);
        results.push(await answer(db, id, p, now));
      }
    }
    const statuses = statusesOf(results);
    const final = results[results.length - 1].response.mastery;
    const checkResults = db.results();
    const lead = leadOf(db, [final], at(-1), at(24 * 8));
    return {
      statuses,
      finalStatus: final.status,
      finalCertification: final.certification,
      nullItemRows: checkResults.filter((e) => e.payload.itemId === null).length,
      bankLookups: db.log.filter((q) => /FROM check_items/.test(q.sql)).length,
      evidenceClasses: [...new Set(checkResults.map((e) => e.payload.evidenceClass))],
      qualifyingFlags: [...new Set(checkResults.map((e) => e.payload.qualifying))],
      masteryChangesTo: [...new Set(changesTo(db))],
      parentLabel: masteryStatusLabel(final.status),
      headline: lead.headline,
      leadConfirmed: lead.confirmed,
    };
  },
  baseline(o) {
    assert.equal(o.finalStatus, 'confirmed');
    assert.equal(o.parentLabel, 'mastery confirmed');
    assert.equal(o.leadConfirmed, 1);
    assert.ok(o.masteryChangesTo.includes('confirmed'));
    assert.equal(o.nullItemRows, 12);
    assert.deepEqual(o.evidenceClasses, [undefined]);
  },
  head(o) {
    assert.ok(never(o.statuses, 'confirmed'), 'a generated check reached confirmed: ' + o.statuses);
    assert.equal(o.finalStatus, 'mastered');
    assert.equal(o.finalCertification, 'none');
    assert.equal(o.nullItemRows, 12);
    assert.equal(o.bankLookups, 0);
    assert.deepEqual(o.evidenceClasses, ['corrections-practice']);
    assert.deepEqual(o.qualifyingFlags, [false]);
    assert.ok(!o.masteryChangesTo.includes('confirmed'));
    assert.match(o.parentLabel, /estimate/);
    assert.doesNotMatch(o.parentLabel, /mastery confirmed/);
    assert.equal(o.leadConfirmed, 0);
    assert.match(o.headline, /No skills independently confirmed/);
  },
};

/** Criterion 1: a supplied bank item id is not independent authority; repeats never certify. */
cases.c1_supplied_id_repeats = {
  async run() {
    const db = newDb();
    await db.query(
      `INSERT INTO check_items(id,skill_id,type,stem,answer,representation,band,source,reviewed_by,reviewed_at) VALUES('same_item','F1','numeric','Compute 2 plus 2.',$1,'symbolic','both','fixture','fixture-reviewer',$2)`,
      [JSON.stringify({ value: 4, tolerance: 0 }), T0.toISOString()],
    );
    const item = {
      id: 'same_item', skillId: 'F1', type: 'numeric', stem: 'Compute 2 plus 2.', options: null,
      answer: { value: 4, tolerance: 0 }, representation: 'symbolic', band: 'both', source: 'fixture',
      reviewedBy: 'fixture-reviewer', reviewedAt: T0.toISOString(),
    };
    const results = [];
    for (let i = 0; i < 6; i += 1) {
      const now = i < 4 ? at(i) : at(48 + i);
      const p = pendingFromBankItem(item, { diagnostic: false, issuedTurnId: 't' + i, now });
      await session(db, 'rep_' + i, now, p);
      results.push(await answer(db, 'rep_' + i, p, now));
    }
    const statuses = statusesOf(results);
    const e = db.results();
    return {
      statuses,
      finalStatus: statuses[statuses.length - 1],
      distinctItemIds: new Set(e.map((x) => x.payload.itemId)).size,
      itemIdsNonNull: e.every((x) => x.payload.itemId === 'same_item'),
      masteryChangesTo: [...new Set(changesTo(db))],
    };
  },
  baseline(o) {
    assert.equal(o.finalStatus, 'confirmed');
    assert.equal(o.distinctItemIds, 1);
  },
  head(o) {
    assert.ok(o.itemIdsNonNull);
    assert.ok(never(o.statuses, 'confirmed'), o.statuses.join(','));
    assert.equal(o.finalStatus, 'mastered');
    assert.ok(!o.masteryChangesTo.includes('confirmed'));
  },
};

/** Criterion 1: a wrong generated key grades the wrong answer correct; that must stay practice. */
cases.c1_wrong_generated_key = {
  async run() {
    const db = newDb();
    const probe = generatedPending(T0, 5);
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      const now = i < 4 ? at(i) : at(48);
      const p = generatedPending(now, 5);
      await session(db, 'wk_' + i, now, p);
      results.push(await answer(db, 'wk_' + i, p, now, 5));
    }
    const statuses = statusesOf(results);
    return {
      wrongAnswerGradedCorrect: gradeLocally(probe.key, 5).correct,
      trueAnswerGradedWrong: !gradeLocally(probe.key, 4).correct,
      statuses,
      finalStatus: statuses[statuses.length - 1],
    };
  },
  baseline(o) {
    assert.equal(o.wrongAnswerGradedCorrect, true);
    assert.equal(o.trueAnswerGradedWrong, true);
    assert.equal(o.finalStatus, 'confirmed');
  },
  head(o) {
    assert.equal(o.wrongAnswerGradedCorrect, true, 'grading against the generated key is unchanged (practice)');
    assert.ok(never(o.statuses, 'confirmed'));
    assert.equal(o.finalStatus, 'mastered');
  },
};

/** Criterion 1: an assisted streak, then one unassisted success 48 h later. */
cases.c1_assisted_streak = {
  async run() {
    const db = newDb();
    const results = [];
    for (let i = 0; i < 8; i += 1) {
      // One second between checks inside a session: the hint query is a strict
      // `ts >` against the previous result, so equal timestamps would hide the hint.
      const now = at(Math.floor(i / 3) * 6 + (i % 3) / 3600);
      const id = 'as_' + Math.floor(i / 3);
      if (i % 3 === 0) await session(db, id, now);
      const p = generatedPending(now);
      await setPending(db, id, p, now);
      db.time = now.toISOString();
      await writeEvidence(db, { ...principal, sessionId: id, type: 'hint', assisted: true, payload: { skillId: 'F1' } });
      results.push(await answer(db, id, p, now));
    }
    const p = generatedPending(at(60));
    await session(db, 'as_final', at(60), p);
    results.push(await answer(db, 'as_final', p, at(60)));
    const statuses = statusesOf(results);
    const assisted = results.map((r) => r.response.result.assisted);
    return {
      assistedFlags: assisted,
      statuses,
      finalStatus: statuses[statuses.length - 1],
      evidenceClasses: db.results().map((e) => e.payload.evidenceClass),
    };
  },
  baseline(o) {
    assert.deepEqual(o.assistedFlags.slice(0, 8), Array(8).fill(true));
    assert.equal(o.assistedFlags[8], false);
    assert.equal(o.finalStatus, 'confirmed');
  },
  head(o) {
    assert.deepEqual(o.assistedFlags.slice(0, 8), Array(8).fill(true));
    assert.ok(never(o.statuses, 'confirmed'));
    assert.deepEqual(o.evidenceClasses.slice(0, 8), Array(8).fill('assisted-help'));
    assert.equal(o.evidenceClasses[8], 'corrections-practice');
  },
};

/** Criterion 1: forcing the model layer directly (bypassing the check service) still cannot certify. */
cases.c1_direct_model_confirm_attempt = {
  async run() {
    let row = null;
    for (let i = 0; i < 4; i += 1) {
      row = applyCheck(row, 'L', 'F1', { sessionId: 's' + (i % 2), correct: true, assisted: false, now: T0 }).next;
    }
    const forced = { ...row, status: 'mastered', nextCheckAt: T0.toISOString() };
    const late = applyCheck(forced, 'L', 'F1', { sessionId: 's9', correct: true, assisted: false, now: at(72) });
    const db = newDb();
    db.raw
      .prepare(
        `INSERT INTO skill_mastery VALUES('acc_e1','lrn_e1','F1',0.9,5,3,'["a","b","c"]','confirmed',0.5,$1,$1,NULL)`,
      )
      .run({ $1: T0.toISOString() });
    const onLegacy = await recordCheckOutcome(db, {
      ...principal, sessionId: 'sx', skillId: 'F1', correct: true, assisted: false, hitTag: null, relevantTags: [], now: at(72),
    });
    return {
      afterFourStatus: row.status,
      nextCheckAtAfterFour: row.nextCheckAt,
      forcedDueResult: late.next.status,
      forcedDelayedFlag: late.delayed,
      legacyRowNextStatus: onLegacy.mastery.status,
      legacyRowCertification: onLegacy.mastery.certification,
      legacyChangesTo: changesTo(db),
    };
  },
  baseline(o) {
    assert.equal(o.afterFourStatus, 'mastered');
    assert.ok(o.nextCheckAtAfterFour !== null, 'baseline schedules the 24 h delayed check');
    assert.equal(o.forcedDueResult, 'confirmed');
    assert.equal(o.legacyRowNextStatus, 'confirmed');
  },
  head(o) {
    assert.equal(o.afterFourStatus, 'mastered');
    assert.equal(o.nextCheckAtAfterFour, null, 'practice never schedules a certifying check');
    assert.equal(o.forcedDueResult, 'mastered');
    assert.equal(o.forcedDelayedFlag, false);
    assert.equal(o.legacyRowNextStatus, 'mastered');
    assert.equal(o.legacyRowCertification, 'none');
    assert.ok(!o.legacyChangesTo.includes('confirmed'));
  },
};

/** Criterion 1 invariant: no writer in this repository can append qualifying evidence. */
cases.c1_qualifying_write_refused = {
  async run() {
    const db = newDb();
    const before = db.evidence().length;
    const attempts = [];
    for (const evidenceClass of ['unassisted-attempt', 'delayed-retention']) {
      try {
        await writeEvidence(db, {
          ...principal, sessionId: null, type: 'check_result', assisted: false, evidenceClass,
          payload: { skillId: 'F1', correct: true, forged: true },
        });
        attempts.push({ evidenceClass, outcome: 'inserted' });
      } catch (error) {
        attempts.push({ evidenceClass, outcome: 'refused', error: error.name, message: error.message });
      }
    }
    // A forged `qualifying: true` in the payload is also overwritten, never persisted.
    let payloadForgery;
    try {
      await writeEvidence(db, {
        ...principal, sessionId: null, type: 'check_result', assisted: false, evidenceClass: 'corrections-practice',
        payload: { skillId: 'F1', correct: true, qualifying: true },
      });
      const last = db.evidence().at(-1);
      payloadForgery = { outcome: 'inserted', qualifying: last.payload.qualifying };
    } catch (error) {
      payloadForgery = { outcome: 'refused', error: error.name };
    }
    return { attempts, rowsAdded: db.evidence().length - before, payloadForgery, hasGuard: typeof evidenceModule.QUALIFYING_EVIDENCE_CLASSES !== 'undefined' };
  },
  baseline(o) {
    assert.equal(o.hasGuard, false, 'baseline has no evidence-class concept');
    assert.deepEqual(o.attempts.map((a) => a.outcome), ['inserted', 'inserted']);
    assert.equal(o.payloadForgery.outcome, 'inserted');
    assert.equal(o.payloadForgery.qualifying, true, 'baseline persists a forged qualifying flag');
  },
  head(o) {
    assert.equal(o.hasGuard, true);
    assert.deepEqual(o.attempts.map((a) => a.outcome), ['refused', 'refused']);
    assert.deepEqual(o.attempts.map((a) => a.error), ['QualifyingEvidenceRefusedError', 'QualifyingEvidenceRefusedError']);
    assert.equal(o.payloadForgery.outcome, 'inserted');
    assert.equal(o.payloadForgery.qualifying, false, 'forged flag overwritten by the writer');
    assert.equal(o.rowsAdded, 1);
  },
};

/** Criterion 2: every imported consumer of a persisted legacy `confirmed` row; rows stay intact. */
cases.c2_legacy_confirmed_consumers = {
  async run() {
    const db = newDb();
    const ins = db.raw.prepare(
      `INSERT INTO skill_mastery VALUES('acc_e1','lrn_e1',$skill,$est,$n,$ns,'["a","b"]',$status,0.5,$t,$t,$next)`,
    );
    ins.run({ $skill: 'F1', $est: 0.92, $n: 6, $ns: 3, $status: 'confirmed', $t: T0.toISOString(), $next: null });
    ins.run({ $skill: 'F2', $est: 0.85, $n: 4, $ns: 2, $status: 'mastered', $t: T0.toISOString(), $next: at(-1).toISOString() });
    ins.run({ $skill: 'F3', $est: 0.6, $n: 2, $ns: 1, $status: 'in_progress', $t: T0.toISOString(), $next: null });
    db.time = T0.toISOString();
    await writeEvidence(db, {
      ...principal, sessionId: 'legacy', type: 'mastery_change', assisted: false,
      payload: { skillId: 'F1', from: 'mastered', to: 'confirmed', estimate: 0.92, nItems: 6, nSessions: 3, delayed: true, nextCheckAt: null },
    });
    await db.query(`INSERT INTO sessions(id,account_id,learner_id,started_at,phase,skill_id,minutes,state) VALUES('legacy','acc_e1','lrn_e1',$1,'ended','F1',20,'{}')`, [T0.toISOString()]);
    const rowsBefore = JSON.stringify(db.mastery());
    const evidenceBefore = JSON.stringify(db.evidence());

    const parent = await buildParentReport(db, principal.accountId, principal.learnerId, at(1));
    const progress = await buildProgress(db, { accountId: principal.accountId, learnerId: principal.learnerId }, at(1));
    const modelRows = await modelService.listMasteryRows(db, principal.accountId, principal.learnerId);
    const modelView = modelRows.map(modelService.toSkillMastery);
    const rawRows = db.mastery();
    const reportRowView = rawRows.map((r) => reportRows.toSkillMastery(r));
    const lead = leadOf(db, modelView, at(-24), at(24));
    const f1 = (list) => list.find((m) => m.skillId === 'F1');

    const rowsAfter = JSON.stringify(db.mastery());
    const evidenceAfter = JSON.stringify(db.evidence());
    return {
      rowsIntact: rowsBefore === rowsAfter,
      evidenceIntact: evidenceBefore === evidenceAfter,
      persistedF1Status: rawRows.find((r) => r.skill_id === 'F1').status,
      report: { f1Status: f1(parent.skills).status, f1Label: masteryStatusLabel(f1(parent.skills).status), f1Certification: f1(parent.skills).certification, nextSkill: parent.nextSkill && parent.nextSkill.id },
      progress: { f1Status: f1(progress.mastery).status, f1Certification: f1(progress.mastery).certification, dueChecks: progress.dueChecks, nextSkill: progress.nextSkill && progress.nextSkill.id },
      modelView: { f1Status: f1(modelView).status, f1Certification: f1(modelView).certification },
      reportRowView: { f1Status: f1(reportRowView).status, f1Certification: f1(reportRowView).certification, masteryStatusFn: reportRows.masteryStatus('confirmed') },
      lead: { headline: lead.headline, confirmed: lead.confirmed, moved: lead.moved.length, tracked: lead.tracked },
      note: REPORT_MASTERY_NOTE,
      nextSkillPure: nextSkill.selectNextSkill(modelView) && nextSkill.selectNextSkill(modelView).id,
      dueDelayedPure: nextSkill.dueDelayedChecks(modelView, at(1)),
    };
  },
  baseline(o) {
    assert.equal(o.rowsIntact, true);
    assert.equal(o.report.f1Status, 'confirmed');
    assert.equal(o.report.f1Label, 'mastery confirmed');
    assert.equal(o.progress.f1Status, 'confirmed');
    assert.equal(o.progress.dueChecks.length, 1);
    assert.equal(o.lead.confirmed, 1);
    assert.equal(o.lead.moved, 1);
    assert.match(o.lead.headline, /1 of 3 skills confirmed, 1 this week/);
    assert.match(o.note, /a day later/);
  },
  head(o) {
    assert.equal(o.rowsIntact, true, 'reads must not rewrite persisted rows');
    assert.equal(o.evidenceIntact, true);
    assert.equal(o.persistedF1Status, 'confirmed', 'legacy row content preserved');
    for (const view of [o.report, o.progress, o.modelView, o.reportRowView]) {
      assert.notEqual(view.f1Status, 'confirmed', JSON.stringify(view));
      assert.equal(view.f1Status, 'mastered');
      assert.equal(view.f1Certification, 'legacy_unverified');
    }
    assert.equal(o.reportRowView.masteryStatusFn, 'mastered');
    assert.match(o.report.f1Label, /estimate/);
    assert.doesNotMatch(o.report.f1Label, /mastery confirmed/);
    assert.equal(o.lead.confirmed, 0);
    assert.equal(o.lead.moved, 0);
    assert.match(o.lead.headline, /No skills independently confirmed yet, 3 in progress/);
    assert.deepEqual(o.progress.dueChecks, []);
    assert.deepEqual(o.dueDelayedPure, []);
    assert.doesNotMatch(o.note, /a day later/);
    assert.match(o.note, /never/);
    // Teaching progression still treats a practiced skill as done for sequencing (disclosed
    // decision): F1 legacy, F2 practiced, F3 in progress with both prerequisites done → F3.
    assert.equal(o.nextSkillPure, 'F3');
    assert.equal(o.report.nextSkill, 'F3');
  },
};

/** Criterion 3: positive practice controls; identical expectations in both modes. */
cases.c3_practice_positive_control = {
  async run() {
    const db = newDb();
    const item = {
      id: 'f1_bar_01', skillId: 'F1', type: 'numeric', stem: 'A bar is cut into 4 equal parts. What fraction is one part?',
      options: null, answer: { value: '1/4', tolerance: 0, wrong: [{ value: '1/3', misconception: 'whole_number_bias' }] },
      representation: 'bar', band: 'both', source: 'fixture', reviewedBy: 'fixture-reviewer', reviewedAt: T0.toISOString(),
    };
    const p1 = pendingFromBankItem(item, { diagnostic: false, issuedTurnId: 't1', now: T0 });
    await session(db, 's1', T0, p1);
    const r1 = await answer(db, 's1', p1, T0, '1/4');
    const afterFirst = (await loadSession(db, principal, 's1')).state;
    const duplicate = await answer(db, 's1', p1, T0, '1/4');
    const p2 = pendingFromBankItem(item, { diagnostic: false, issuedTurnId: 't2', now: at(0.5) });
    await setPending(db, 's1', p2, at(0.5));
    const r2 = await answer(db, 's1', p2, at(0.5), '1/3');
    const shortItem = pendingFromTag(
      { type: 'short', skillId: 'F1', stem: 'Explain what the denominator tells you.', answer: { value: 'how many equal parts' } },
      { skillId: 'F1', diagnostic: false, issuedTurnId: 't3', now: at(1) },
    ).pending;
    await setPending(db, 's1', shortItem, at(1));
    const r3 = await answer(db, 's1', shortItem, at(1), 'an unrelated response', { grader: async () => null });
    const mastery = await getMasteryRow(db, principal.accountId, principal.learnerId, 'F1');
    const finalState = (await loadSession(db, principal, 's1')).state;
    const misconceptions = db.rows('SELECT tag, status, clean_streak FROM misconceptions');
    return {
      firstOk: r1.ok, firstCorrect: r1.response.result.correct, firstEstimate: r1.response.mastery.estimate, firstStatus: r1.response.mastery.status,
      resultRowsAfterFirst: 1,
      pendingClearedAfterFirst: afterFirst.pendingCheck === null, checksAfterFirst: afterFirst.checks,
      duplicateCode: duplicate.ok ? null : duplicate.code,
      secondCorrect: r2.response.result.correct, secondMisconception: r2.response.result.misconception,
      misconceptionRows: misconceptions, observationOpened: db.evidence().some((e) => e.type === 'observation' && e.payload.kind === 'misconception_opened' && e.payload.tag === 'whole_number_bias'),
      thirdOk: r3.ok, thirdMastery: r3.response.mastery, thirdUngraded: db.results()[2].payload.ungraded,
      resultRows: db.results().length, masteryNItems: mastery.nItems, masteryEstimate: mastery.estimate,
      finalChecks: finalState.checks, finalPhase: db.rows("SELECT phase FROM sessions WHERE id='s1'")[0].phase,
      usedItemIds: finalState.usedItemIds,
    };
  },
  both(o) {
    assert.equal(o.firstOk, true);
    assert.equal(o.firstCorrect, true);
    assert.equal(Math.round(o.firstEstimate * 1000) / 1000, 0.65);
    assert.equal(o.firstStatus, 'in_progress');
    assert.equal(o.pendingClearedAfterFirst, true);
    assert.deepEqual(o.checksAfterFirst, { count: 1, correct: 1 });
    assert.equal(o.duplicateCode, 'NO_PENDING_CHECK');
    assert.equal(o.secondCorrect, false);
    assert.equal(o.secondMisconception, 'whole_number_bias');
    assert.deepEqual(o.misconceptionRows, [{ tag: 'whole_number_bias', status: 'open', clean_streak: 0 }]);
    assert.equal(o.observationOpened, true);
    assert.equal(o.thirdOk, true);
    assert.equal(o.thirdMastery, null, 'abstention earns nothing');
    assert.equal(o.thirdUngraded, true);
    assert.equal(o.resultRows, 3, 'one result row per submitted check, exactly once');
    assert.equal(o.masteryNItems, 2, 'the ungraded check did not count');
    assert.equal(Math.round(o.masteryEstimate * 1000) / 1000, 0.455);
    assert.deepEqual(o.finalChecks, { count: 3, correct: 1 });
    assert.equal(o.finalPhase, 'work');
    assert.deepEqual(o.usedItemIds, ['f1_bar_01', 'f1_bar_01']);
  },
};

/** Criterion 3: the concurrent-duplicate race E1 disclosed; E2-A closed it with a transaction; E3 #13 moves the authority into the seam (queue/practice_check, no application lock). */
cases.c3_concurrent_duplicate_disclosed = {
  async run() {
    const db = newDb();
    let r;
    for (let i = 0; i < 4; i += 1) {
      r = await recordCheckOutcome(db, { ...principal, sessionId: 'b' + (i % 2), skillId: 'F1', correct: true, assisted: false, hitTag: null, relevantTags: [], now: T0 });
    }
    const p = generatedPending(at(48));
    await session(db, 's', at(48), p);
    // Without a transaction (E1 code) both callers are held after their session read so both see the
    // pending check. With a transaction (E2-A code) the fixture's queue serializes the callers — the
    // stand-in for the skill lock — so holding the first would deadlock the second; the hold is skipped.
    const inTx = () => db.log.some((q) => /^BEGIN/.test(q.sql));
    let reads = 0, releaseReads; const bothRead = new Promise((res) => (releaseReads = res));
    let hints = 0, releaseSecond; const secondGate = new Promise((res) => (releaseSecond = res));
    db.after = async (sql) => { if (/SELECT s\.\*, l\.age_band/.test(sql)) { reads += 1; if (reads === 2) releaseReads(); if (!inTx()) await bothRead; } };
    db.before = async (sql) => { if (/SELECT count\(\*\)::int AS n FROM evidence_events h/.test(sql)) { hints += 1; if (hints === 2) await secondGate; } };
    const a = answer(db, 's', p, at(48)); const b = answer(db, 's', p, at(48));
    const first = await a; releaseSecond(); const second = await b; db.before = null; db.after = null;
    const mastery = await getMasteryRow(db, principal.accountId, principal.learnerId, 'F1');
    return {
      seededStatus: r.mastery.status, bothOk: [first.ok, second.ok], secondCode: second.ok ? null : second.code, resultRows: db.results().length,
      nItemsBefore: 4, nItemsAfter: mastery.nItems, status: mastery.status,
      transactions: db.log.filter((q) => /^(BEGIN|COMMIT)/.test(q.sql)).length,
      lockTaken: db.log.some((q) => /pg_advisory_xact_lock/.test(q.sql)),
      seamConsumed: db.log.filter((q) => /e2\.practice_check\(/.test(q.sql)).length,
    };
  },
  baseline(o) {
    assert.deepEqual(o.bothOk, [true, true]);
    assert.equal(o.resultRows, 2);
    assert.equal(o.nItemsAfter, 6);
    assert.equal(o.status, 'confirmed', 'baseline: the duplicated unassisted result also confirms');
  },
  head(o) {
    assert.deepEqual(o.bothOk, [true, false], 'E2-A: the second caller is refused under the skill lock');
    assert.equal(o.secondCode, 'NO_PENDING_CHECK');
    assert.equal(o.resultRows, 1, 'exactly one result row for one pending check');
    assert.equal(o.nItemsAfter, 5);
    assert.equal(o.lockTaken, false, 'E3 #13 (ADR-0066): the route takes no application-side lock');
    // The fixture serializes transactions, so the second caller is refused at its re-read before
    // reaching the seam; a seam-absent connection (E1's PostgreSQL fixture role) consumes nothing.
    assert.ok(o.seamConsumed <= 1, 'at most the first answer consumed the check on the seam');
    assert.ok(o.transactions >= 2, 'both callers ran in a transaction');
  },
};

/** Criterion 0/2: excluded consumers are not present and nothing in lib/ imports them; no routes exist. */
cases.c0_consumer_inventory = {
  async run() {
    const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/engine/consumer-inventory.json'), 'utf8'));
    const present = [];
    for (const c of inventory.excluded) if (fs.existsSync(path.join(ROOT, c.path))) present.push(c.path);
    const libFiles = walk(path.join(ROOT, 'lib'));
    const externalImports = [];
    for (const f of libFiles) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/from '(@\/[^']+)'/g)) {
        const target = m[1].slice(2);
        const ok = ['lib/tutor/'].some((p) => target.startsWith(p));
        if (!ok) externalImports.push(path.relative(ROOT, f) + ' -> ' + m[1]);
      }
    }
    const routes = fs.existsSync(path.join(ROOT, 'app')) ? walk(path.join(ROOT, 'app')).filter((f) => /route\.tsx?$|page\.tsx?$/.test(f)) : [];
    const importedMissing = inventory.imported.filter((c) => !fs.existsSync(path.join(ROOT, c.path))).map((c) => c.path);
    // r2 (review item 3): the inventory must be closed over the committed grep of the pinned
    // source. Every lib/tutor or components/tutor file the grep hits is imported, excluded,
    // or listed as a non-mastery sense of the word; the two visual consumers the review
    // found missing must be excluded with their line citations.
    const grep = fs.readFileSync(path.join(ROOT, inventory.provenance.output), 'utf8');
    const grepFiles = [...new Set(grep.split('\n').filter(Boolean).map((l) => l.split(':')[0]))];
    const listed = new Set([
      ...inventory.imported.map((c) => c.path),
      ...inventory.excluded.map((c) => c.path.split('#')[0]),
      ...inventory.provenance.notMasteryConsumers.flatMap((c) => c.path.split(',').map((p) => p.trim())),
    ]);
    const tutorTree = (f) => /^(lib|components)\/tutor\//.test(f) || /^app\/\((learner|parent)\)\//.test(f);
    const unlisted = grepFiles.filter((f) => tutorTree(f) && !listed.has(f));
    const visualPair = ['components/tutor/ui/section.tsx', 'components/tutor/brand/tokens.css'];
    const pairCited = visualPair.map((p) => {
      const entry = inventory.excluded.find((c) => c.path === p);
      const cited = entry ? entry.lines.every((n) => grep.includes(`${p}:${n}:`)) : false;
      return { path: p, excluded: Boolean(entry), linesInGrep: cited };
    });
    // r3 (review item 3): a second, broader grep over reads of the mastery status field/type. Every
    // tutor file it hits is imported, excluded, a non-mastery sense, or recorded in provenance.broad
    // as a type / re-export / comment / static copy — nothing is silently dropped. The prompt
    // formatter the review found must be excluded with both interpolation lines cited in that grep.
    const broad = inventory.provenance.broad;
    const broadGrep = fs.readFileSync(path.join(ROOT, broad.output), 'utf8');
    const broadFiles = [...new Set(broadGrep.split('\n').filter(Boolean).map((l) => l.split(':')[0]))];
    const broadListed = new Set([
      ...listed,
      ...['types', 'reExports', 'commentsOnly', 'staticCopy'].flatMap((k) => broad[k].map((c) => c.path)),
    ]);
    const broadUnlisted = broadFiles.filter((f) => tutorTree(f) && !broadListed.has(f));
    const broadSupersetOfLiteral = grepFiles.filter((f) => !broadFiles.includes(f));
    const dynamicCited = broad.newDynamicConsumers.map((c) => {
      const entry = inventory.excluded.find((e) => e.path === c.path);
      return {
        path: c.path,
        excluded: Boolean(entry),
        linesMatch: Boolean(entry) && JSON.stringify(entry.lines) === JSON.stringify(c.lines),
        linesInBroadGrep: c.lines.every((n) => broadGrep.includes(`${c.path}:${n}:`)),
        absentFromLiteralGrep: !grepFiles.includes(c.path),
      };
    });
    const formatterLines = broadGrep.split('\n').filter((l) => /^lib\/tutor\/prompts\/build\.ts:(123|128):/.test(l));
    return {
      excludedPresent: present, externalImports, routes, importedMissing,
      imported: inventory.imported.length, excluded: inventory.excluded.length,
      grepFiles: grepFiles.length, unlisted, pairCited,
      broadFiles: broadFiles.length, broadUnlisted, broadSupersetOfLiteral, dynamicCited,
      formatterInterpolatesStatus: formatterLines.every((l) => l.includes('status.replace(')) && formatterLines.length === 2,
    };
  },
  both(o) {
    assert.deepEqual(o.excludedPresent, []);
    assert.deepEqual(o.externalImports, []);
    assert.deepEqual(o.routes, []);
    assert.deepEqual(o.importedMissing, []);
    assert.deepEqual(o.unlisted, [], 'every tutor file the pinned-source grep hits is classified');
    assert.deepEqual(o.pairCited, [
      { path: 'components/tutor/ui/section.tsx', excluded: true, linesInGrep: true },
      { path: 'components/tutor/brand/tokens.css', excluded: true, linesInGrep: true },
    ]);
    assert.deepEqual(o.broadUnlisted, [], 'every tutor file the broad mastery-status grep hits is classified');
    assert.deepEqual(o.broadSupersetOfLiteral, [], 'the broad grep covers every file the literal grep hit');
    assert.deepEqual(o.dynamicCited, [
      { path: 'lib/tutor/prompts/build.ts', excluded: true, linesMatch: true, linesInBroadGrep: true, absentFromLiteralGrep: true },
      { path: 'lib/tutor/analytics/queries.sql.ts', excluded: true, linesMatch: true, linesInBroadGrep: true, absentFromLiteralGrep: true },
    ]);
    assert.equal(o.formatterInterpolatesStatus, true, 'build.ts:123 and :128 interpolate mastery status into the prompt');
  },
};

// The MIT permission paragraph the packed notices must carry (review r2 item 1). Verbatim from
// legacy/reference-implementations/kaizenedu/LICENSE; that file is not a package input, so the text is
// pinned here as well as in THIRD_PARTY_NOTICES.md.
const MIT_PERMISSION_PARAGRAPH =
  'Permission is hereby granted, free of charge, to any person obtaining a copy\n' +
  'of this software and associated documentation files (the "Software"), to deal\n' +
  'in the Software without restriction, including without limitation the rights\n' +
  'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n' +
  'copies of the Software, and to permit persons to whom the Software is\n' +
  'furnished to do so, subject to the following conditions:';
const PACK_DEPTH = Number(process.env.KAIZENEDU_PACK_DEPTH || 0);

/**
 * Criterion 0 (r2 item 1, rewritten r3): `npm pack` ships the product closure only — no reference
 * snapshots, no synced product record — AND the packed archive runs its own checks. The real
 * tarball is produced into a temp dir, unpacked, and `typecheck.sh` plus `run.cjs --mode head`
 * are executed inside the unpacked tree; both must exit 0. The packed notices must carry the
 * inherited MIT permission text, and the packed npm-shrinkwrap.json must equal package-lock.json.
 * Inside the unpacked archive (KAIZENEDU_PACK_DEPTH=1) the nested execution is not repeated —
 * that inner run is the one the outer case is asserting on — and the case records that it ran
 * at depth 1 instead.
 */
cases.c0_package_inputs = {
  async run() {
    const pack = packAndUnpack();
    try {
      const under = (prefix) => pack.paths.filter((p) => p.startsWith(prefix));
      const packedNotices = fs.readFileSync(path.join(pack.dir, 'THIRD_PARTY_NOTICES.md'), 'utf8');
      const referenceLicense = path.join(ROOT, 'legacy/reference-implementations/kaizenedu/LICENSE');
      const fullMitVerbatim = fs.existsSync(referenceLicense)
        ? packedNotices.includes(fs.readFileSync(referenceLicense, 'utf8').trim())
        : 'reference LICENSE not present (packed archive); permission paragraph checked only';
      const lockPath = path.join(ROOT, 'package-lock.json');
      const shrinkwrapPacked = path.join(pack.dir, 'npm-shrinkwrap.json');
      const shrinkwrapEqualsLock = fs.existsSync(lockPath)
        ? fs.existsSync(shrinkwrapPacked) && fs.readFileSync(lockPath).equals(fs.readFileSync(shrinkwrapPacked))
        : 'package-lock.json not present (packed archive); shrinkwrap is the lock here';
      const nested = { depth: PACK_DEPTH };
      if (PACK_DEPTH === 0) {
        const outerHead = fs.existsSync(path.join(ROOT, '.git')) ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() : process.env.KAIZENEDU_PACKED_FROM || '';
        const env = { ...process.env, KAIZENEDU_PACK_DEPTH: '1', KAIZENEDU_PACKED_FROM: outerHead };
        const runIn = (cmd, args) => {
          const r = spawnSync(cmd, args, { cwd: pack.dir, env, encoding: 'utf8' });
          return { exit: r.status, tail: (r.stdout + r.stderr).trim().split('\n').slice(-3) };
        };
        nested.typecheck = runIn('sh', ['tests/engine/harness/typecheck.sh']);
        // The inner suite runs in the outer mode: `--mode head` in the head run (the check the brief
        // names), `--mode baseline` in the baseline column so the differential's positive-control
        // diagonal stays clean and the off-diagonal cells fail for the same behavioural reasons.
        nested.suite = runIn(process.execPath, ['--no-warnings', '--experimental-sqlite', 'tests/engine/run.cjs', '--mode', MODE]);
        nested.suite.mode = MODE;
        const innerResults = path.join(pack.dir, `tests/engine/evidence/results-${MODE}.json`);
        if (fs.existsSync(innerResults)) {
          const inner = JSON.parse(fs.readFileSync(innerResults, 'utf8'));
          nested.suite.head = inner.header.head;
          nested.suite.cases = inner.records.length;
          nested.suite.failed = inner.records.filter((r) => !r.pass).map((r) => r.case);
          nested.suite.innerPackageCase = inner.records.find((r) => r.case === 'c0_package_inputs')?.observed?.nested ?? null;
        }
      } else {
        nested.skipped = 'already inside the unpacked archive; the outer run asserts on this suite';
      }
      return {
        total: pack.total,
        byPrefix: pack.byPrefix,
        referenceImplementations: [...under('legacy/'), ...under('reference-implementations/')],
        docs: under('docs/'),
        app: under('app/'),
        db: under('db/'),
        evidence: under('tests/engine/evidence/'),
        notices: pack.paths.filter((p) => /^(LICENSE|THIRD_PARTY_NOTICES\.md|README\.md|package\.json|tsconfig\.json|npm-shrinkwrap\.json)$/.test(p)).sort(),
        hasLib: under('lib/').length > 0,
        hasHarness: under('tests/engine/harness/').length > 0 && pack.paths.includes('tests/engine/run.cjs'),
        packedLockfileNames: pack.paths.filter((p) => /^(package-lock|npm-shrinkwrap)\.json$/.test(p)),
        shrinkwrapEqualsLock,
        noticesCarryMitPermission: packedNotices.includes(MIT_PERMISSION_PARAGRAPH),
        noticesCarryMitCopyright: packedNotices.includes('Copyright (c) 2026 THU-MAIC'),
        fullMitVerbatim,
        nested,
      };
    } finally {
      fs.rmSync(pack.tmp, { recursive: true, force: true });
    }
  },
  both(o) {
    assert.deepEqual(o.referenceImplementations, [], 'reference snapshots are not package inputs');
    assert.deepEqual(o.docs, [], 'the synced product record is not a package input');
    assert.deepEqual(o.app, []);
    assert.deepEqual(o.db, []);
    assert.deepEqual(o.evidence, [], 'evidence logs stay in git, not in the tarball');
    assert.deepEqual(o.notices, ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'npm-shrinkwrap.json', 'package.json', 'tsconfig.json']);
    assert.equal(o.hasLib, true);
    assert.equal(o.hasHarness, true);
    assert.deepEqual(o.packedLockfileNames, ['npm-shrinkwrap.json'], 'npm never packs package-lock.json; the shrinkwrap is the packed lock');
    assert.ok(o.shrinkwrapEqualsLock === true || typeof o.shrinkwrapEqualsLock === 'string', 'npm-shrinkwrap.json is byte-identical to package-lock.json');
    assert.equal(o.noticesCarryMitPermission, true, 'the packed THIRD_PARTY_NOTICES.md carries the MIT permission paragraph');
    assert.equal(o.noticesCarryMitCopyright, true);
    assert.ok(o.fullMitVerbatim === true || typeof o.fullMitVerbatim === 'string', 'the full source LICENSE text is embedded verbatim');
    if (o.nested.depth === 0) {
      assert.equal(o.nested.typecheck.exit, 0, 'typecheck.sh exits 0 inside the unpacked archive: ' + o.nested.typecheck.tail.join(' | '));
      assert.equal(o.nested.suite.exit, 0, `run.cjs --mode ${o.nested.suite.mode} exits 0 inside the unpacked archive: ` + o.nested.suite.tail.join(' | '));
      assert.deepEqual(o.nested.suite.failed, []);
      assert.equal(o.nested.suite.cases, Object.keys(cases).length, 'the packed suite runs every case this checkout runs');
      assert.equal(o.nested.suite.innerPackageCase?.depth, 1, 'the inner package case ran at depth 1 and did not recurse');
    } else {
      assert.equal(o.nested.depth, 1);
      assert.ok(o.nested.skipped);
    }
  },
};

/**
 * Criterion 0 (r3, review item 2): toolchain.sh checks the undici-types copy TypeScript actually
 * loads. Eight synthetic layouts in a temp toolchain copy (package.json stubs only — the gate reads
 * versions, not declarations): the reviewer's seven with their recorded exits, plus the conflict
 * layout (hoisted 6.21.0 beside a nested 6.20.0 under @types/node/node_modules) which must now
 * exit non-zero because the nested copy is the one the compiler resolves.
 */
cases.c0_toolchain_resolution = {
  async run() {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, fs.existsSync(path.join(ROOT, 'package-lock.json')) ? 'package-lock.json' : 'npm-shrinkwrap.json'), 'utf8'));
    const pinned = Object.fromEntries(['typescript', '@types/node', 'undici-types'].map((n) => [n, lock.packages['node_modules/' + n].version]));
    const layouts = [
      { layout: 'hoisted', hoisted: pinned['undici-types'] },
      { layout: 'wrong-typescript', hoisted: pinned['undici-types'], versions: { typescript: '0.0.0' } },
      { layout: 'wrong-node', hoisted: pinned['undici-types'], versions: { '@types/node': '0.0.0' } },
      { layout: 'wrong-undici', hoisted: '0.0.0' },
      { layout: 'missing-undici' },
      { layout: 'nested-correct', nested: pinned['undici-types'] },
      { layout: 'nested-conflict', hoisted: pinned['undici-types'], nested: '6.20.0' },
      { layout: 'nested-correct-hoisted-wrong', hoisted: '0.0.0', nested: pinned['undici-types'] },
    ];
    const base = fs.mkdtempSync(path.join(process.env.TMPDIR || require('node:os').tmpdir(), 'kaizenedu-toolchain-'));
    const results = [];
    try {
      for (const l of layouts) {
        const tree = path.join(base, l.layout);
        const stub = (rel, name, version) => {
          fs.mkdirSync(path.join(tree, rel), { recursive: true });
          fs.writeFileSync(path.join(tree, rel, 'package.json'), JSON.stringify({ name, version }));
        };
        stub('typescript', 'typescript', l.versions?.typescript ?? pinned.typescript);
        stub('@types/node', '@types/node', l.versions?.['@types/node'] ?? pinned['@types/node']);
        if (l.hoisted) stub('undici-types', 'undici-types', l.hoisted);
        if (l.nested) stub('@types/node/node_modules/undici-types', 'undici-types', l.nested);
        const r = spawnSync('sh', [path.join(ROOT, 'tests/engine/harness/toolchain.sh')], { env: { ...process.env, KAIZENEDU_TOOLCHAIN: tree }, encoding: 'utf8' });
        const resolvedLine = r.stderr.split('\n').find((s) => s.startsWith('toolchain-resolved')) || '';
        const closureLine = r.stderr.split('\n').find((s) => s.startsWith('toolchain-closure')) || '';
        results.push({
          layout: l.layout,
          exit: r.status,
          undici: (closureLine.match(/undici-types=(\S+)/) || [])[1] ?? null,
          resolvedFrom: resolvedLine.includes('/@types/node/node_modules/') ? 'nested' : resolvedLine.includes('missing') ? 'missing' : 'hoisted',
        });
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
    return { pinned, results };
  },
  both(o) {
    const byLayout = Object.fromEntries(o.results.map((r) => [r.layout, r]));
    // The reviewer's seven, as recorded in review r2 closure-probes.json — except the conflict.
    assert.equal(byLayout['hoisted'].exit, 0);
    assert.equal(byLayout['wrong-typescript'].exit, 5);
    assert.equal(byLayout['wrong-node'].exit, 5);
    assert.equal(byLayout['wrong-undici'].exit, 5);
    assert.equal(byLayout['missing-undici'].exit, 5);
    assert.equal(byLayout['missing-undici'].undici, 'missing');
    assert.equal(byLayout['nested-correct'].exit, 0);
    assert.equal(byLayout['nested-correct'].resolvedFrom, 'nested');
    // The r2 defect: the gate reported the hoisted 6.21.0 while tsc loaded the nested 6.20.0.
    assert.equal(byLayout['nested-conflict'].resolvedFrom, 'nested', 'the nested copy is the one TypeScript resolves');
    assert.equal(byLayout['nested-conflict'].undici, '6.20.0');
    assert.notEqual(byLayout['nested-conflict'].exit, 0, 'a nested copy that differs from the lock fails the gate');
    assert.equal(byLayout['nested-conflict'].exit, 5);
    // The inverse: the compiler never sees the wrong hoisted copy, so the closure it loads is correct.
    assert.equal(byLayout['nested-correct-hoisted-wrong'].exit, 0);
    assert.equal(byLayout['nested-correct-hoisted-wrong'].resolvedFrom, 'nested');
  },
};

/** Criterion 2 (r2, kills M07): the raw legacy `confirmed` status, not a pre-normalized view, must never read as confirmed. */
cases.c2_raw_confirmed_label = {
  async run() {
    const raw = masteryStatusLabel('confirmed');
    return { raw, all: ['not_started', 'in_progress', 'mastered', 'confirmed'].map((s) => [s, masteryStatusLabel(s)]) };
  },
  baseline(o) {
    assert.equal(o.raw, 'mastery confirmed', 'baseline: the raw legacy status is printed as a confirmation');
  },
  head(o) {
    assert.doesNotMatch(o.raw, /mastery confirmed/);
    assert.doesNotMatch(o.raw, /\bconfirmed\b(?! record)/i, 'no wording that reads as a confirmation');
    assert.match(o.raw, /unverified/);
    for (const [, label] of o.all) assert.doesNotMatch(label, /mastery confirmed/);
  },
};

/** Criterion 2 (r2, kills M08): the weekly headline is fed the raw model view; a raw `confirmed` without independent certification counts for nothing. */
cases.c2_weekly_headline_raw_status = {
  async run() {
    const skills = [
      { skillId: 'F1', name: 'Unit fractions', status: 'confirmed' },
      { skillId: 'F2', name: 'Equivalent fractions', status: 'confirmed', certification: 'legacy_unverified' },
      { skillId: 'F3', name: 'Comparing fractions', status: 'confirmed', certification: 'none' },
      { skillId: 'F4', name: 'Adding fractions', status: 'mastered', certification: 'none' },
    ];
    const changes = [
      { skillId: 'F1', to: 'confirmed', at: T0.toISOString() },
      { skillId: 'F2', to: 'confirmed', at: T0.toISOString(), qualifying: false },
      { skillId: 'F3', to: 'confirmed', at: T0.toISOString() },
    ];
    const lead = weeklyLead({ skills, changes, windowStart: at(-1), windowEnd: at(1) });
    // The single-raw-row shape the reviewer probed with, verbatim.
    const single = weeklyLead({
      skills: [{ skillId: 'F1', name: 'Unit fractions', status: 'confirmed' }],
      changes: [{ skillId: 'F1', to: 'confirmed', at: T0.toISOString() }],
      windowStart: at(-1),
      windowEnd: at(1),
    });
    return { tracked: lead.tracked, confirmed: lead.confirmed, moved: lead.moved.map((m) => m.skillId), headline: lead.headline, single: { confirmed: single.confirmed, headline: single.headline } };
  },
  baseline(o) {
    assert.equal(o.confirmed, 3, 'baseline: raw confirmed rows count');
    assert.equal(o.single.headline, '1 of 1 skill confirmed, 1 this week');
  },
  head(o) {
    assert.equal(o.tracked, 4);
    assert.equal(o.confirmed, 0, 'no independent certification exists, so nothing is confirmed');
    assert.deepEqual(o.moved, []);
    assert.equal(o.headline, 'No skills independently confirmed yet, 4 in progress');
    assert.equal(o.single.confirmed, 0);
    assert.equal(o.single.headline, 'No skills independently confirmed yet, 1 in progress');
  },
};

/** Criterion 3 (r2, kills M10): check completion honours an unfinished diagnostic and the session deadline. Passes in both modes. */
cases.c3_check_completion_phase = {
  async run() {
    const base = initialState({ band: '9-12', target: 'skill', startedAt: T0, skillId: 'F1', diagnostic: null, delayedCheck: null });
    const deadline = new Date(base.timer.deadlineAt);
    const unit = {
      live: afterCheckGraded(base, T0),
      atDeadline: afterCheckGraded(base, deadline),
      expired: afterCheckGraded(base, at(1)),
      diagnosticOpen: afterCheckGraded({ ...base, diagnostic: newDiagnostic() }, T0),
      diagnosticOpenAndExpired: afterCheckGraded({ ...base, diagnostic: newDiagnostic() }, at(1)),
      diagnosticDone: afterCheckGraded({ ...base, diagnostic: { ...newDiagnostic(), done: true } }, T0),
    };
    // Through the check route body: the phase the service saves on the session row.
    const db = newDb();
    const learner9 = { ...principal, band: '9-12' };
    db.raw.exec(`UPDATE learners SET age_band='9-12' WHERE id='lrn_e1'`);
    const service = {};
    for (const [name, extra, when] of [
      ['live', {}, T0],
      ['expired', {}, at(1)],
      ['diagnosticOpen', { diagnostic: newDiagnostic() }, T0],
    ]) {
      const id = 'ses_phase_' + name;
      const pending = generatedPending(T0);
      db.time = T0.toISOString();
      const state = { ...initialState({ band: '9-12', target: 'skill', startedAt: T0, skillId: 'F1', diagnostic: null, delayedCheck: null }), ...extra, pendingCheck: pending };
      await db.query(
        `INSERT INTO sessions(id,account_id,learner_id,started_at,phase,skill_id,state) VALUES($1,$2,$3,$4,'work','F1',$5)`,
        [id, principal.accountId, principal.learnerId, T0.toISOString(), JSON.stringify(state)],
      );
      db.time = when.toISOString();
      let ok, error = null;
      try {
        ok = (await answerCheck(db, learner9, { sessionId: id, checkId: pending.checkId, answer: 4 }, { now: when })).ok;
      } catch (e) {
        error = e.message;
      }
      const row = await loadSession(db, learner9, id);
      service[name] = { ok, error, phase: row.session.phase };
    }
    return { unit, service };
  },
  both(o) {
    assert.deepEqual(o.unit, { live: 'work', atDeadline: 'wrap', expired: 'wrap', diagnosticOpen: 'diagnose', diagnosticOpenAndExpired: 'diagnose', diagnosticDone: 'work' });
    assert.equal(o.service.live.error, null);
    assert.equal(o.service.live.phase, 'work');
    assert.equal(o.service.expired.error, null);
    assert.equal(o.service.expired.phase, 'wrap', 'an expired 9-12 session wraps after the check');
    assert.equal(o.service.diagnosticOpen.error, null);
    assert.equal(o.service.diagnosticOpen.phase, 'diagnose', 'an unfinished diagnostic resumes after the check');
  },
};

/** Criterion 0/5: copied files match the pinned source hashes except the files this PR deliberately changed. */
cases.c0_closure_manifest = {
  async run() {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/engine/closure-manifest.json'), 'utf8'));
    // Every copied file that is not a declared criterion-0 adaptation must still
    // hash to its pinned source, except the files the containment commit declares.
    const diffs = [];
    for (const f of manifest.files) {
      if (f.adaptation) continue;
      const current = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f.path))).digest('hex');
      if (current !== f.sourceSha256) diffs.push(f.path);
    }
    const referenceLoaded = Object.keys(hashes).filter((h) => h.startsWith('legacy') || h.startsWith('reference-implementations'));
    const adapted = new Set(manifest.files.filter((f) => f.adaptation).map((f) => f.path));
    const containment = [...manifest.containmentModified].sort();
    return {
      driftedFromSource: diffs.sort(),
      containmentModified: containment,
      // Containment files that already carried a criterion-0 adaptation: their source hash
      // differed at baseline too, so the base→head git diff is the evidence for them.
      containmentAlsoAdapted: containment.filter((p) => adapted.has(p)),
      expectedDrift: containment.filter((p) => !adapted.has(p)),
      referenceLoaded,
      sourceCommit: manifest.sourceCommit,
    };
  },
  baseline(o) {
    assert.deepEqual(o.driftedFromSource, [], 'baseline: every non-adapter copy is byte-identical to source');
    assert.deepEqual(o.referenceLoaded, []);
  },
  head(o) {
    assert.deepEqual(o.driftedFromSource, o.expectedDrift, 'only the declared containment files differ from source');
    assert.deepEqual(o.referenceLoaded, []);
  },
};

// E2 part B (issue #4), round 3: the exposure ledger is a caller of part C's e2.* SQL functions,
// which SQLite cannot emulate; its cases run on PostgreSQL only (tests/engine/exposure-pg/run-pg.cjs).
// The SQLite fixture keeps a read-only mirror of e2.skill_guards so the practice route's
// eligibility read (lib/tutor/checks/service.ts) answers "no exposure" for E1's cases.

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
async function main() {
  const chosen = only.length ? only : Object.keys(cases);
  // r3: inside an unpacked `npm pack` archive there is no git checkout; npm records the packing
  // commit as package.json#gitHead, so the header labels the run with that instead of failing.
  const inGit = fs.existsSync(path.join(ROOT, '.git'));
  const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
  const packedHead = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).gitHead;
  const header = {
    mode: MODE,
    runtime: process.version,
    typescript: typescriptVersion,
    toolchain: TOOLCHAIN,
    database: 'node:sqlite (not PostgreSQL)',
    head: inGit
      ? git(['rev-parse', 'HEAD'])
      : process.env.KAIZENEDU_PACKED_FROM
        ? `${process.env.KAIZENEDU_PACKED_FROM} (packed archive; label passed by the outer c0_package_inputs run)`
        : packedHead
          ? `${packedHead} (packed archive, package.json#gitHead)`
          : '(no git checkout)',
    dirty: inGit ? git(['status', '--porcelain', '--', 'lib', 'tests']).split('\n').filter(Boolean).length : null,
    packDepth: Number(process.env.KAIZENEDU_PACK_DEPTH || 0),
  };
  console.log(JSON.stringify(header));
  const records = [];
  let failures = 0;
  for (const name of chosen) {
    const c = cases[name];
    assert.ok(c, 'unknown case ' + name);
    let observed, error = null;
    try {
      observed = await c.run();
      (c.both ?? c[MODE])(observed);
    } catch (e) {
      error = { name: e.name, message: e.message.split('\n').slice(0, 6).join(' | ') };
      failures += 1;
    }
    const record = { case: name, mode: MODE, pass: error === null, observed, error };
    records.push(record);
    console.log(JSON.stringify(record));
  }
  const outDir = path.join(ROOT, 'tests/engine/evidence');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `results-${MODE}${OUT_SUFFIX}.json`), JSON.stringify({ header, records, loadedSourceHashes: hashes }, null, 2) + '\n');
  console.log(JSON.stringify({ summary: { mode: MODE, cases: records.length, failures, loadedSourceFiles: Object.keys(hashes).length } }));
  if (failures) process.exitCode = 1;
}
main().catch((e) => { console.error(e.stack); process.exitCode = 1; });
