// The record that makes the seat worth its price (spec W4).
//
// Three claims are pinned here, and each one is a claim the product sells on:
//
//   1. The reachable set — the growth tip — is ONE function. It used to be a
//      filter buried inside nextAction; extracting it was only safe if the
//      extraction changed nothing, so the extraction is compared against a
//      verbatim copy of the old algorithm over a few hundred generated
//      lattices, not against a handful of hand-picked cases.
//   2. Only CONFIRMED concepts leave the product. The transcript section of the
//      account export lists a concept when its estimate is confirmed and never
//      otherwise, and the demonstrations under it are the confirming evidence
//      rows only — assisted work is kept, but it is never printed as a
//      demonstration (hard rule 5).
//   3. "Moved this week" is answered by replaying the ledger as it stood seven
//      days ago, so a concept confirmed last month does not get re-counted
//      every time the child touches it.
//
// Nothing here touches a database. Every function under test is pure and takes
// rows shaped exactly as the routes select them, which is the second point of
// the file: a column rename shows up right here.

import test from 'node:test';
import assert from 'node:assert/strict';

import { nextAction, reachableSet, GROWTH_TIP_LIMIT } from '@/lib/engine/policy.js';
import { CONFIRM_THRESHOLD } from '@/lib/engine/types.js';
import { buildMasteryRecord, MASTERY_RECORD_FORMAT } from '@/app/api/account/export/route.js';
import { masteryLead, MOVED_WINDOW_MS } from '@/lib/server/familySummary.js';

const NOW = Date.parse('2026-09-02T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(NOW - n * DAY).toISOString();

const CONFIRMED = 0.97;      // above CONFIRM_THRESHOLD
const UNCONFIRMED = 0.42;    // plainly below it

const kc = (o = {}) => ({ kcId: 'k1', title: 'Concept', working: 0.5, confirmed: 0, prereqs: [], ...o });

// ── The reachable set ────────────────────────────────────────────────────────

test('a concept whose prerequisite is unconfirmed is not reachable', () => {
  const set = reachableSet([
    kc({ kcId: 'advanced', prereqs: ['basic'] }),
    kc({ kcId: 'basic', confirmed: UNCONFIRMED }),
  ]);
  assert.deepEqual(set.map((k) => k.kcId), ['basic']);
});

test('confirming the prerequisite makes the concept reachable', () => {
  const set = reachableSet([
    kc({ kcId: 'advanced', prereqs: ['basic'] }),
    kc({ kcId: 'basic', confirmed: CONFIRMED }),
  ]);
  // `basic` drops out because it is already confirmed — the tip is what comes
  // NEXT, not what is done.
  assert.deepEqual(set.map((k) => k.kcId), ['advanced']);
});

test('working mastery on a prerequisite is not enough — only confirmed opens a node', () => {
  const almost = reachableSet([
    kc({ kcId: 'advanced', prereqs: ['basic'] }),
    kc({ kcId: 'basic', working: 0.94, confirmed: CONFIRM_THRESHOLD - 0.01 }),
  ]);
  assert.deepEqual(almost.map((k) => k.kcId), ['basic'], 'could-do-it-with-help does not unlock the next concept');
});

test('a prerequisite the learner does not hold at all cannot block them', () => {
  // The lattice is far bigger than one learner's slice of it. An edge pointing
  // at a node they have never been given must not wall off the entry point.
  const set = reachableSet([kc({ kcId: 'entry', prereqs: ['not-on-this-trellis'] })]);
  assert.deepEqual(set.map((k) => k.kcId), ['entry']);
});

test('the tip is ordered shallowest first, then weakest', () => {
  const set = reachableSet([
    kc({ kcId: 'deep', prereqs: ['mid'], working: 0.1 }),
    kc({ kcId: 'mid', prereqs: ['root'], working: 0.1 }),
    kc({ kcId: 'root', working: 0.6 }),
    kc({ kcId: 'other-root', working: 0.2 }),
  ], { limit: null });
  // Both roots sit at depth 0; the weaker one leads. `mid` and `deep` are
  // blocked on unconfirmed prerequisites and are not in the set at all.
  assert.deepEqual(set.map((k) => k.kcId), ['other-root', 'root']);
});

test('the tip is capped so it stays a choice, not a lattice dump', () => {
  const many = Array.from({ length: 20 }, (_, i) => kc({ kcId: `k${i}`, working: i / 100 }));
  assert.equal(reachableSet(many).length, GROWTH_TIP_LIMIT);
  assert.ok(GROWTH_TIP_LIMIT >= 3 && GROWTH_TIP_LIMIT <= 5, 'the spec asks for 3-5');
  assert.equal(reachableSet(many, { limit: null }).length, 20, 'the policy loop still sees the whole set');
});

test('an all-confirmed trellis has an empty tip, and garbage in is an empty tip too', () => {
  assert.deepEqual(reachableSet([kc({ confirmed: CONFIRMED })]), []);
  assert.deepEqual(reachableSet(), []);
  assert.deepEqual(reachableSet(null), []);
});

test('a cycle in the lattice terminates instead of hanging the request', () => {
  // Two nodes each naming the other as a prerequisite is a data defect, not a
  // theory — and a depth walk without a visited set would recurse forever.
  // Neither is reachable while both are unconfirmed, which is the right answer:
  // the deadlock is real and the caller sees it as blocked, not as a hang.
  assert.deepEqual(reachableSet([
    kc({ kcId: 'a', prereqs: ['b'] }),
    kc({ kcId: 'b', prereqs: ['a'] }),
  ], { limit: null }), []);

  // Break the cycle by confirming one side and the depth walk still has to
  // survive the loop it walks into.
  const set = reachableSet([
    kc({ kcId: 'a', prereqs: ['b'] }),
    kc({ kcId: 'b', prereqs: ['a'], confirmed: CONFIRMED }),
  ], { limit: null });
  assert.deepEqual(set.map((k) => k.kcId), ['a']);
});

// ── The extraction changed nothing ───────────────────────────────────────────

// A verbatim copy of the algorithm as it stood inside nextAction before the
// reachable set was extracted. If these two ever disagree the extraction has
// drifted, which would mean the growth tip a parent is shown and the concept
// the session actually teaches are two different answers.
function legacyChoice(kcs, focusKcId = null) {
  const byId = new Map(kcs.map((k) => [k.kcId, k]));
  const eligible = kcs.filter((k) => {
    if ((k.confirmed ?? 0) >= CONFIRM_THRESHOLD) return false;
    const prereqs = Array.isArray(k.prereqs) ? k.prereqs : [];
    return prereqs.every((p) => (byId.get(p)?.confirmed ?? 0) >= CONFIRM_THRESHOLD || !byId.has(p));
  });
  if (!eligible.length) return null;
  if (focusKcId) {
    const picked = eligible.find((k) => k.kcId === focusKcId);
    if (picked) return picked.kcId;
  }
  const depth = (k, seen = new Set()) => {
    if (seen.has(k.kcId)) return 0;
    seen.add(k.kcId);
    const prereqs = (Array.isArray(k.prereqs) ? k.prereqs : []).map((p) => byId.get(p)).filter(Boolean);
    return prereqs.length ? 1 + Math.max(...prereqs.map((p) => depth(p, seen))) : 0;
  };
  return eligible
    .map((k) => ({ k, d: depth(k), w: k.working ?? 0 }))
    .sort((a, b) => a.d - b.d || a.w - b.w)[0].k.kcId;
}

// Deterministic PRNG: a flaky lattice generator would make a real regression
// look like a bad afternoon.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomLattice(rand) {
  const n = 2 + Math.floor(rand() * 7);
  const kcs = [];
  for (let i = 0; i < n; i++) {
    const prereqs = [];
    for (let j = 0; j < i; j++) if (rand() < 0.3) prereqs.push(`k${j}`);
    if (rand() < 0.1) prereqs.push('absent-node');
    kcs.push({
      kcId: `k${i}`,
      working: Math.round(rand() * 100) / 100,
      confirmed: rand() < 0.35 ? CONFIRMED : Math.round(rand() * 90) / 100,
      prereqs,
      // No check is ever due, so the study rung is the rung under test.
      nextCheckAt: null,
    });
  }
  return kcs;
}

test('extracting the reachable set left nextAction bit-for-bit unchanged', () => {
  const rand = lcg(20260902);
  let studied = 0;
  let blocked = 0;
  for (let i = 0; i < 400; i++) {
    const kcs = randomLattice(rand);
    const focus = rand() < 0.4 ? `k${Math.floor(rand() * kcs.length)}` : null;
    const expected = legacyChoice(kcs, focus);
    const got = nextAction({ kcs, now: NOW, focusKcId: focus });

    if (expected === null) {
      blocked++;
      assert.ok(
        got.action === 'blocked_on_prereqs' || got.action === 'all_confirmed',
        `no eligible KC must not become a study decision (got ${got.action})`,
      );
      const anyUnconfirmed = kcs.some((k) => k.confirmed < CONFIRM_THRESHOLD);
      assert.equal(got.action, anyUnconfirmed ? 'blocked_on_prereqs' : 'all_confirmed');
    } else {
      studied++;
      assert.equal(got.action, 'study');
      assert.equal(got.kcId, expected, `lattice ${i} picked a different concept`);
    }
  }
  // Guard the guard: a generator that only ever produced one branch would make
  // this test pass by never exercising the other.
  assert.ok(studied > 50 && blocked > 5, `weak coverage: ${studied} study / ${blocked} blocked`);
});

test('nextAction teaches the head of the reachable set', () => {
  const kcs = [
    kc({ kcId: 'deep', prereqs: ['root'], working: 0.1 }),
    kc({ kcId: 'root', working: 0.3 }),
  ];
  assert.equal(nextAction({ kcs, now: NOW }).kcId, reachableSet(kcs, { limit: null })[0].kcId);
});

test('the precedence above the tip is untouched: safety, then the cap, then due checks', () => {
  const due = kc({ kcId: 'due', working: 0.8, nextCheckAt: new Date(NOW - 1000).toISOString() });
  assert.equal(nextAction({ safetyFlag: true, kcs: [due], now: NOW }).action, 'safety_protocol');
  assert.equal(nextAction({ kcs: [due], now: NOW, sessionMinutes: 99, maxSessionMinutes: 25 }).action, 'end_session');
  assert.equal(nextAction({ kcs: [due, kc({ kcId: 'new', working: 0 })], now: NOW }).action, 'check');
});

test('an explicit focus still wins, and an unreachable focus is still ignored', () => {
  const kcs = [
    kc({ kcId: 'root', working: 0.1 }),
    kc({ kcId: 'gated', prereqs: ['root'], working: 0.9 }),
  ];
  assert.equal(nextAction({ kcs, now: NOW, focusKcId: 'root' }).kcId, 'root');
  // `gated` is blocked on an unconfirmed prerequisite. A learner (or a parent)
  // asking for it does not get to skip the prerequisite — assigning is not
  // certifying, and it is not overriding the lattice either.
  assert.equal(nextAction({ kcs, now: NOW, focusKcId: 'gated' }).kcId, 'root');
});

// ── The transcript ───────────────────────────────────────────────────────────

const confirmingRow = (o = {}) => ({
  id: 'e-confirm', kc_id: 'kc-frac', at: daysAgo(2),
  kind: 'check', outcome: 1, assisted: false, assistance_dose: 0,
  verified_by: 'symbolic', weight: 1, item_id: 'item-1',
  misconception_id: null, context_tag: 'word-problem', latency_ms: 4100,
  source_ref: 'session:s-1', ...o,
});

const assistedRow = (o = {}) => ({
  id: 'e-assisted', kc_id: 'kc-frac', at: daysAgo(9),
  kind: 'practice', outcome: 1, assisted: true, assistance_dose: 2,
  verified_by: 'symbolic', weight: 0.5, item_id: 'item-9',
  misconception_id: null, context_tag: 'drill', latency_ms: 9000,
  source_ref: 'session:s-0', ...o,
});

function exportFixture() {
  return {
    now: NOW,
    links: [
      { kc_id: 'kc-frac', local_title: 'Dividing fractions', course_id: 'c1', source: 'mapped' },
      { kc_id: 'kc-ratio', local_title: null, course_id: 'c1', source: 'mapped' },
    ],
    estimates: [
      {
        kc_id: 'kc-frac', confirmed: CONFIRMED, confidence: 0.8,
        contexts_seen: ['word-problem', 'bare-number'], last_instruction_at: daysAgo(6),
        next_check_at: daysAgo(-9), computed_at: daysAgo(0), scheduler_version: 'default-1',
      },
      {
        kc_id: 'kc-ratio', confirmed: UNCONFIRMED, confidence: 0.3,
        contexts_seen: ['drill'], last_instruction_at: daysAgo(1),
        next_check_at: daysAgo(-1), computed_at: daysAgo(0), scheduler_version: 'default-1',
      },
    ],
    evidence: [
      assistedRow(),
      confirmingRow(),
      confirmingRow({ id: 'e-confirm-2', at: daysAgo(1), context_tag: 'bare-number', item_id: 'item-2' }),
      // Unassisted, human-verified, on the concept that is NOT confirmed.
      confirmingRow({ id: 'e-ratio', kc_id: 'kc-ratio', at: daysAgo(3), kind: 'tutor_observation', verified_by: 'human_tutor' }),
      // Assisted chat on the confirmed concept — real evidence, never a demonstration.
      assistedRow({ id: 'e-chat', kind: 'chat_signal', verified_by: 'model', at: daysAgo(4) }),
    ],
    kcs: [
      { id: 'kc-frac', title: 'Division of fractions', subject: 'math', type: 'skill', verifiability: 'v1' },
      { id: 'kc-ratio', title: 'Ratio and proportion', subject: 'math', type: 'skill', verifiability: 'v1' },
    ],
    standards: [
      { kc_id: 'kc-frac', framework: 'TEKS', code: '6.3E', case_uri: 'https://teks.texasgateway.org/x/6.3E', alignment: 'exact' },
      { kc_id: 'kc-frac', framework: 'CCSS', code: '6.NS.A.1', case_uri: null, alignment: 'partial' },
      { kc_id: 'kc-ratio', framework: 'TEKS', code: '6.4B', case_uri: null, alignment: 'exact' },
    ],
  };
}

test('the transcript names only confirmed concepts', () => {
  const rec = buildMasteryRecord(exportFixture());
  assert.equal(rec.format, MASTERY_RECORD_FORMAT);
  assert.deepEqual(rec.concepts.map((c) => c.kcId), ['kc-frac']);
  assert.equal(rec.concepts[0].status, 'confirmed');
  assert.ok(rec.concepts.every((c) => c.confirmed >= CONFIRM_THRESHOLD));
  // The unconfirmed concept is counted, never named as an achievement.
  assert.equal(rec.summary.conceptsTracked, 2);
  assert.equal(rec.summary.conceptsConfirmed, 1);
  assert.equal(rec.summary.conceptsInProgress, 1);
});

test('no working-mastery number can reach the transcript', () => {
  const fixture = exportFixture();
  // Even if a caller hands the shaper a working value, nothing renders it.
  fixture.estimates = fixture.estimates.map((e) => ({ ...e, working: 0.93 }));
  const json = JSON.stringify(buildMasteryRecord(fixture));
  assert.ok(!/"working"/.test(json), 'working mastery is not a claim anyone outside gets handed');
});

test('a demonstration is confirming evidence and nothing else', () => {
  const rec = buildMasteryRecord(exportFixture());
  const [frac] = rec.concepts;
  assert.deepEqual(frac.demonstrations.map((d) => d.evidenceId), ['e-confirm', 'e-confirm-2']);
  assert.ok(frac.demonstrations.every((d) => d.unassisted === true));
  assert.ok(frac.demonstrations.every((d) => ['check', 'tutor_observation'].includes(d.kind)));
  // Every demonstration says what it was and how it was verified, in words.
  assert.equal(frac.demonstrations[0].what, 'unassisted delayed check');
  assert.equal(frac.demonstrations[0].verification, 'answer checked symbolically');
  assert.equal(frac.firstDemonstratedAt, daysAgo(2));
  assert.equal(frac.lastDemonstratedAt, daysAgo(1));
  assert.equal(rec.summary.demonstrations, 2);
});

test('the assisted rows survive as observations — portability drops nothing', () => {
  const fixture = exportFixture();
  const rec = buildMasteryRecord(fixture);
  assert.equal(rec.observations.rows.length, fixture.evidence.length);
  assert.ok(rec.observations.rows.some((r) => r.id === 'e-chat'), 'assisted chat is kept');
  assert.match(rec.observations.note, /evidence, not claims/i);
});

test('each concept carries the standards it aligns to, and never invents one', () => {
  const rec = buildMasteryRecord(exportFixture());
  const [frac] = rec.concepts;
  assert.deepEqual(frac.standards, [
    { framework: 'TEKS', code: '6.3E', caseUri: 'https://teks.texasgateway.org/x/6.3E', alignment: 'exact' },
    { framework: 'CCSS', code: '6.NS.A.1', caseUri: null, alignment: 'partial' },
  ]);
  const bare = buildMasteryRecord({ ...exportFixture(), standards: [] });
  assert.deepEqual(bare.concepts[0].standards, [], 'no crosswalk means no alignment, not a guessed one');
});

test('the transcript carries its own standard of proof', () => {
  const rec = buildMasteryRecord(exportFixture());
  assert.equal(rec.standardOfProof.confirmThreshold, CONFIRM_THRESHOLD);
  assert.deepEqual(rec.standardOfProof.confirmingKinds, ['check', 'tutor_observation']);
  assert.ok(rec.standardOfProof.minInstructionToCheckDelayMs >= 48 * 60 * 60 * 1000);
  assert.match(rec.standardOfProof.rule, /unassisted/i);
});

test('an unprovisioned engine exports an empty record, not a broken one', () => {
  const rec = buildMasteryRecord({ notProvisioned: true, now: NOW });
  assert.equal(rec.notProvisioned, true);
  assert.deepEqual(rec.concepts, []);
  assert.equal(rec.summary.conceptsConfirmed, 0);
  assert.deepEqual(rec.observations.rows, []);
});

// ── The parent's headline ────────────────────────────────────────────────────

// Four unassisted symbolic checks across two surface contexts is exactly what
// the mastery gate asks for (window 5, required 4, minContexts 2).
function confirmingRun(kcId, agoDays) {
  return agoDays.map((d, i) => ({
    kc_id: kcId, at: daysAgo(d), kind: 'check', outcome: 1,
    assisted: false, assistance_dose: 0, verified_by: 'symbolic', weight: 1,
    item_id: `${kcId}-i${i}`, context_tag: i % 2 === 0 ? 'word-problem' : 'bare-number',
  }));
}

function summaryFixture() {
  return {
    now: NOW,
    links: [
      { kc_id: 'kc-new', local_title: 'Dividing fractions' },
      { kc_id: 'kc-old', local_title: null },
      { kc_id: 'kc-open', local_title: 'Ratios' },
    ],
    estimates: [
      { kc_id: 'kc-new', confirmed: CONFIRMED },
      { kc_id: 'kc-old', confirmed: CONFIRMED },
      { kc_id: 'kc-open', confirmed: UNCONFIRMED },
    ],
    // kc-new was confirmed inside the window; kc-old was already confirmed a
    // month ago and must not be counted again.
    evidence: [
      ...confirmingRun('kc-new', [5, 4, 3, 2]),
      ...confirmingRun('kc-old', [33, 32, 31, 30]),
    ],
    kcs: [{ id: 'kc-old', title: 'Order of operations' }],
  };
}

test('the parent leads on confirmed concepts, not on a streak', () => {
  const lead = masteryLead(summaryFixture());
  assert.equal(lead.total, 3);
  assert.equal(lead.confirmed, 2);
  assert.equal(lead.headline, '2 of 3 concepts confirmed, 1 moved this week');
});

test('"moved this week" counts a confirmation inside the window and not outside it', () => {
  const lead = masteryLead(summaryFixture());
  assert.equal(lead.movedThisWeek, 1);
  assert.deepEqual(lead.moved.map((m) => m.kcId), ['kc-new']);
  // Named, because "Dividing fractions" is what a parent repeats at dinner.
  assert.equal(lead.moved[0].title, 'Dividing fractions');
  assert.equal(lead.moved[0].at, daysAgo(2));
  assert.equal(lead.windowDays, Math.round(MOVED_WINDOW_MS / DAY));
});

test('the same concept stops counting once its week has passed', () => {
  const fixture = summaryFixture();
  // Roll the clock forward past the window: nothing moved, both stay confirmed.
  const later = masteryLead({ ...fixture, now: NOW + 10 * DAY });
  assert.equal(later.confirmed, 2);
  assert.equal(later.movedThisWeek, 0);
  assert.equal(later.headline, '2 of 3 concepts confirmed');
});

test('the canonical title is used when the learner has not renamed the concept', () => {
  const fixture = summaryFixture();
  // Push kc-old's run inside the window so it appears in `moved`.
  fixture.evidence = [
    ...confirmingRun('kc-new', [5, 4, 3, 2]),
    ...confirmingRun('kc-old', [5, 4, 3, 1]),
  ];
  const lead = masteryLead(fixture);
  assert.equal(lead.movedThisWeek, 2);
  assert.equal(lead.moved.find((m) => m.kcId === 'kc-old').title, 'Order of operations');
});

test('an engine with nothing in it says so without claiming a zero', () => {
  const lead = masteryLead({ now: NOW });
  assert.equal(lead.total, 0);
  assert.equal(lead.confirmed, 0);
  assert.equal(lead.movedThisWeek, 0);
  assert.equal(lead.headline, 'No concepts tracked yet');
  assert.equal(lead.tracked, true, 'the engine is on; this child simply has no concepts yet');
});
