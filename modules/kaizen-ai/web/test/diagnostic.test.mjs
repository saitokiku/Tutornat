// The diagnostic, end to end (spec W3) — the two pieces of it that can be
// proved without a database.
//
// 1. THE PLACEMENT LOOP. lib/engine/placement.js has been in the tree since day
//    one and no route ever exposed it, so nothing ever exercised the loop as a
//    loop: the selection rule, the stopping rule, and the evidence a finished
//    run produces. The route (app/api/engine/placement/route.js) is a thin
//    driver over exactly these functions, so a simulated learner here is a real
//    test of what a real learner will get.
//
// 2. THE ORDER STATE MACHINE. Money moves an order forward and a refund ends
//    it. Both the checkout route and the Stripe webhook fold events through
//    applyOrderEvent, and Stripe retries every event it sends — so "paid twice
//    is paid once" and "a refunded order never becomes delivered" are the two
//    properties that have to hold or the funnel board reports revenue for work
//    nobody was paid for.
//
// 3. THE FIRST PURCHASE, as a parent makes it. The Wave 2 audit found the page
//    posting an empty body (so a parent's own account was stamped as the
//    student), the report the offer sells never reaching the family, and a
//    diagnostic_order written at 'pending' on every press of the button, before
//    Stripe was ever opened. Those three are release rules and shaping rules,
//    so they are pinned as pure functions here and as source assertions on the
//    page — the same technique familyPage.test.mjs uses, for the same reason:
//    there is no renderer in this rig and what matters is exactly the sort of
//    thing a refactor drops in silence.
//
// Nothing here touches Supabase. The fixtures are shaped exactly like the rows
// the route selects, which is also the point: a column rename shows up here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  nextPlacementItem, applyPlacementResponse, placementComplete, placementEvidence,
  PLACEMENT_MIN_ITEMS, PLACEMENT_MAX_ITEMS, PLACEMENT_CONVERGENCE,
} from '@/lib/engine/placement.js';
import { ELO_START, expectedScore } from '@/lib/engine/elo.js';
import { EVIDENCE_KINDS, VERIFIERS, isConfirming, weightOf } from '@/lib/engine/types.js';
import { applyOrderEvent, publicOrder, ORDER_STATUSES } from '@/lib/server/diagnosticOrders.js';
import {
  familyOrder, buyableStudents, checkoutPlan, recordCheckout, pendingOrderFor,
} from '@/app/api/diagnostic/route.js';
import { placementBinding, bindOrder } from '@/app/api/engine/placement/route.js';
import { INTEREST_KINDS } from '@/lib/server/interest.js';
import { DIAGNOSTIC } from '@/lib/server/clubPricing.js';
import { ONE_TIME_PRICES, PRICE_BY_PLAN } from '@/lib/server/stripe.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const sqlFile = (rel) => readFileSync(join(repoRoot, rel), 'utf8');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A bank spanning the usable difficulty range, three items per rung. */
function bank({ from = 700, to = 1900, step = 25 } = {}) {
  const out = [];
  let n = 0;
  for (let elo = from; elo <= to; elo += step) {
    for (let k = 0; k < 3; k++) {
      out.push({ id: `i${n}`, kc_id: `kc${n % 40}`, difficulty_elo: elo });
      n++;
    }
  }
  return out;
}

/**
 * Run the loop the way the route runs it, against a learner whose true ability
 * is `trueElo` and who answers deterministically: right at or below their
 * level, wrong above it. Deterministic on purpose — a placement test that
 * depends on a random draw is a placement test that flakes.
 */
function sit(pool, trueElo) {
  let state = { learnerElo: ELO_START, count: 0, lastDelta: Infinity };
  const served = [];
  const responses = [];
  const history = [];
  while (!placementComplete(state)) {
    const item = nextPlacementItem(pool, { learnerElo: state.learnerElo, servedIds: served });
    if (!item) break;
    served.push(item.id);
    const correct = Number(item.difficulty_elo) <= trueElo;
    responses.push({ kcId: item.kc_id, itemId: item.id, correct });
    state = applyPlacementResponse(state, { itemElo: item.difficulty_elo, correct });
    history.push(state);
  }
  return { state, served, responses, history };
}

// ── Item selection ───────────────────────────────────────────────────────────

test('the next item is the closest thing to a coin flip for this learner', () => {
  // Placement targets ~50% expected success: maximum information per item, and
  // deliberately harder than the 70-85% acquisition band.
  const pool = [
    { id: 'easy', kc_id: 'a', difficulty_elo: 600 },
    { id: 'fair', kc_id: 'b', difficulty_elo: 1210 },
    { id: 'hard', kc_id: 'c', difficulty_elo: 1900 },
  ];
  const picked = nextPlacementItem(pool, { learnerElo: 1200 });
  assert.equal(picked.id, 'fair');
  assert.ok(Math.abs(expectedScore(1200, picked.difficulty_elo) - 0.5) < 0.05);
});

test('an item is never served twice, and an exhausted pool ends the run', () => {
  const pool = bank({ from: 1100, to: 1300, step: 100 });
  const served = [];
  for (let i = 0; i < pool.length; i++) {
    const item = nextPlacementItem(pool, { learnerElo: 1200, servedIds: served });
    assert.ok(item, 'the pool still had items');
    assert.ok(!served.includes(item.id), 'the same item came back twice');
    served.push(item.id);
  }
  // Nothing left. The route reads this as "end the run honestly" rather than
  // re-serving items to pad it out to fifteen.
  assert.equal(nextPlacementItem(pool, { learnerElo: 1200, servedIds: served }), null);
});

test('a missing or junk difficulty is treated as the starting rating, not as NaN', () => {
  const pool = [
    { id: 'nodiff', kc_id: 'a' },
    { id: 'junk', kc_id: 'b', difficulty_elo: 'banana' },
  ];
  const picked = nextPlacementItem(pool, { learnerElo: ELO_START });
  assert.ok(picked, 'an item with no stored difficulty is still servable');
  assert.equal(nextPlacementItem([], {}), null);
  assert.equal(nextPlacementItem(null, {}), null);
});

// ── The stopping rule ────────────────────────────────────────────────────────

test('placement never stops before the floor, however settled the estimate looks', () => {
  for (let n = 0; n < PLACEMENT_MIN_ITEMS; n++) {
    assert.equal(placementComplete({ count: n, lastDelta: 0 }), false, `stopped at ${n} items`);
  }
  assert.equal(placementComplete({ count: PLACEMENT_MIN_ITEMS, lastDelta: 0 }), true);
});

test('placement stops at the ceiling however unsettled the estimate is', () => {
  assert.equal(placementComplete({ count: PLACEMENT_MAX_ITEMS - 1, lastDelta: 10_000 }), false);
  assert.equal(placementComplete({ count: PLACEMENT_MAX_ITEMS, lastDelta: 10_000 }), true);
  assert.equal(placementComplete({ count: PLACEMENT_MAX_ITEMS + 5, lastDelta: 10_000 }), true);
});

test('between floor and ceiling, the convergence band is what decides', () => {
  const n = PLACEMENT_MIN_ITEMS + 1;
  assert.equal(placementComplete({ count: n, lastDelta: PLACEMENT_CONVERGENCE - 1 }), true);
  assert.equal(placementComplete({ count: n, lastDelta: PLACEMENT_CONVERGENCE + 1 }), false);
  // No state at all is not a finished placement.
  assert.equal(placementComplete(null), false);
});

// ── The loop ─────────────────────────────────────────────────────────────────

test('the loop separates a strong learner from a weak one, and always terminates', () => {
  const pool = bank();
  const weak = sit(pool, 800);
  const strong = sit(pool, 1800);

  for (const run of [weak, strong]) {
    assert.ok(run.state.count >= PLACEMENT_MIN_ITEMS, 'ran at least the floor');
    assert.ok(run.state.count <= PLACEMENT_MAX_ITEMS, 'ran no more than the ceiling');
    assert.equal(run.served.length, new Set(run.served).size, 'served a duplicate item');
  }

  assert.ok(weak.state.learnerElo < ELO_START, 'a weak learner ends below the starting rating');
  assert.ok(strong.state.learnerElo > ELO_START, 'a strong learner ends above it');
  // The whole product claim is teaching at the right level, so the two have to
  // land somewhere genuinely different — not two numbers either side of 1200.
  assert.ok(strong.state.learnerElo - weak.state.learnerElo > 250,
    `strong ${strong.state.learnerElo} and weak ${weak.state.learnerElo} are too close to act on`);
});

test('an estimate that is still moving runs past the floor, to the ceiling and no further', () => {
  // Every item far above the starting rating, all answered right: each response
  // is a surprise, so the movement never falls inside the convergence band.
  const outOfReach = Array.from({ length: 40 }, (_, i) => ({ id: `h${i}`, kc_id: `kc${i}`, difficulty_elo: 2200 }));
  const run = sit(outOfReach, 9999);
  assert.equal(run.state.count, PLACEMENT_MAX_ITEMS, 'the ceiling is what stopped this run');
  // It did not stop at the floor, and the reason is the one that matters: at
  // the tenth item the estimate was still moving further than the convergence
  // band allows. Pinning the reason and not just the count is what keeps this
  // test honest if the band is ever retuned.
  const atFloor = run.history[PLACEMENT_MIN_ITEMS - 1];
  assert.ok(atFloor.lastDelta >= PLACEMENT_CONVERGENCE,
    `the estimate had already settled (${atFloor.lastDelta}) — this fixture no longer tests the ceiling`);
});

test('a bank too small to reach the floor ends the run instead of hanging', () => {
  const tiny = bank({ from: 1150, to: 1250, step: 50 });   // 9 items, floor is 10
  const run = sit(tiny, 1200);
  assert.ok(run.state.count < PLACEMENT_MIN_ITEMS);
  assert.equal(run.served.length, tiny.length, 'used every item it had');
});

// ── The evidence a finished run writes ───────────────────────────────────────

test('completion produces rows shaped for appendEvidence', () => {
  const run = sit(bank(), 1400);
  const at = Date.parse('2026-09-02T12:00:00Z');
  const rows = placementEvidence('user-1', run.responses.map((r) => ({ ...r, runId: 'run-7' })), { now: at });

  assert.equal(rows.length, run.responses.length, 'one row per answered item');
  for (const row of rows) {
    // The exact field names lib/engine/ledger.js appendEvidence reads.
    assert.ok(row.kcId, 'kc_id is NOT NULL on evidence');
    assert.ok(EVIDENCE_KINDS.includes(row.kind), `${row.kind} is not an evidence kind the DB allows`);
    assert.ok(VERIFIERS.includes(row.verifiedBy), `${row.verifiedBy} is not a verifier the DB allows`);
    assert.ok(row.outcome === 0 || row.outcome === 1);
    assert.equal(row.assistanceDose, 0);
    assert.equal(row.contextTag, 'placement');
    assert.equal(row.sourceRef, 'placement:run-7', 'the run has to be traceable from the ledger');
    assert.ok(row.itemId, 'the item is on the record, for exposure control and audit');
    assert.equal(row.at, new Date(at).toISOString());
  }
});

test('placement evidence can never confirm mastery', () => {
  const run = sit(bank(), 1400);
  const rows = placementEvidence('user-1', run.responses, {});
  assert.ok(rows.length);
  for (const row of rows) {
    assert.equal(row.assisted, true, 'a twelve-item adaptive run is a starting guess, not a demonstration');
    // isConfirming reads the DB column names, which is the shape appendEvidence
    // writes — so check the row as it will exist in the ledger.
    const stored = { kind: row.kind, assisted: row.assisted, verified_by: row.verifiedBy };
    assert.equal(isConfirming(stored), false, 'placement moved confirmed mastery — the mastery law is broken');
    assert.ok(weightOf(stored) < 1, 'assisted evidence must be discounted');
  }
});

test('a response with no concept attached is dropped rather than written', () => {
  // evidence.kc_id is NOT NULL; a row without one fails the insert at runtime,
  // taking the whole finished placement down with it.
  const rows = placementEvidence('user-1', [
    { kcId: 'kc-1', itemId: 'i1', correct: true },
    { itemId: 'i2', correct: false },
    null,
  ], {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kcId, 'kc-1');
  assert.deepEqual(placementEvidence('user-1', null, {}), []);
});

// ── The order state machine ──────────────────────────────────────────────────

test('paid is idempotent — Stripe retries must not move an order twice', () => {
  const first = applyOrderEvent('pending', 'paid');
  assert.deepEqual(first, { status: 'paid', changed: true, refused: false });

  const retry = applyOrderEvent('paid', 'paid');
  assert.equal(retry.status, 'paid');
  assert.equal(retry.changed, false, 'a retry is a no-op, not a second fulfilment');
  assert.equal(retry.refused, false, 'a retry is legal — it just changes nothing');
});

test('a late paid event never walks a working order backwards', () => {
  // The webhook can arrive after the placement has been sat, or after the
  // director has written the report. Either way the order stays where it got to.
  for (const status of ['scheduled', 'delivered']) {
    const r = applyOrderEvent(status, 'paid');
    assert.equal(r.status, status);
    assert.equal(r.changed, false);
  }
});

test('a refunded order does not become delivered', () => {
  for (const event of ['paid', 'scheduled', 'delivered']) {
    const r = applyOrderEvent('refunded', event);
    assert.equal(r.status, 'refunded', `${event} resurrected a refunded order`);
    assert.equal(r.changed, false);
    assert.equal(r.refused, true);
  }
  // Refunding a refund is a legal no-op, so a replayed refund event is safe.
  assert.deepEqual(applyOrderEvent('refunded', 'refunded'), { status: 'refunded', changed: false, refused: false });
});

test('an unpaid diagnostic cannot be scheduled or delivered', () => {
  for (const event of ['scheduled', 'delivered']) {
    const r = applyOrderEvent('pending', event);
    assert.equal(r.refused, true, `a pending order accepted ${event}`);
    assert.equal(r.status, 'pending');
  }
  // Refunding before payment is legal (a Stripe-side reversal of a stray
  // charge) and ends the order.
  assert.equal(applyOrderEvent('pending', 'refunded').status, 'refunded');
});

test('every order reaches delivered exactly one way: pay, sit, deliver', () => {
  let status = 'pending';
  for (const event of ['paid', 'scheduled', 'delivered']) status = applyOrderEvent(status, event).status;
  assert.equal(status, 'delivered');
  // And a diagnostic the director writes up without a separate scheduling step
  // is still legal — the report, not the calendar, is the deliverable.
  assert.equal(applyOrderEvent('paid', 'delivered').status, 'delivered');
});

test('garbage in is refused, never thrown', () => {
  assert.deepEqual(applyOrderEvent('not_a_status', 'paid'), { status: 'paid', changed: true, refused: false });
  assert.equal(applyOrderEvent('paid', 'exploded').refused, true);
  assert.equal(applyOrderEvent(null, null).refused, true);
  assert.equal(applyOrderEvent(undefined, 'paid').status, 'paid');
});

test('the shared order shape carries no report and no session secret', () => {
  // publicOrder is the shape BOTH consoles start from — the family's page and
  // the director's — so it withholds report_md and the Stripe session id by
  // default. Releasing the report to the family is a separate, narrower
  // decision, and it is `familyOrder` below that makes it.
  const shaped = publicOrder({
    id: 'o1', payer_id: 'p1', student_id: 's1', status: 'delivered', amount_cents: 5900,
    stripe_session_id: 'cs_live_secret', placement_session_id: 'ls1',
    delivered_at: '2026-09-10T00:00:00Z', report_md: '# private notes', created_at: '2026-09-01T00:00:00Z',
  });
  assert.equal(shaped.status, 'delivered');
  assert.equal(shaped.amountCents, 5900);
  assert.ok(!('report_md' in shaped) && !('reportMd' in shaped), 'the default shape never carries the report');
  assert.ok(!('stripe_session_id' in shaped) && !('stripeSessionId' in shaped));
  assert.equal(publicOrder(null), null);
});

// ── The report finally reaches the family ────────────────────────────────────
// The offer sells "a written report from a person", the director writes it into
// report_md through the admin route, and until now nothing served it to anyone
// who paid for it. familyOrder is the one place that release happens, and both
// halves of the rule have to hold: DELIVERED, and this reader.

const ORDER = {
  id: 'o1', payer_id: 'parent', student_id: 'kid', status: 'delivered', amount_cents: 5900,
  stripe_session_id: 'cs_live_secret', placement_session_id: 'ls1',
  delivered_at: '2026-09-10T00:00:00Z', report_md: '# Where Maya is', created_at: '2026-09-01T00:00:00Z',
};

test('the payer and the student both get the delivered report, and nobody else', () => {
  assert.equal(familyOrder(ORDER, 'parent').report, '# Where Maya is', 'the payer bought this');
  assert.equal(familyOrder(ORDER, 'kid').report, '# Where Maya is', 'it is written about them');
  assert.equal(familyOrder(ORDER, 'stranger').report, null, 'a report leaked to a third party');
  // The session id stays withheld whoever is reading: familyOrder adds to
  // publicOrder, it never reopens what publicOrder closed.
  for (const viewer of ['parent', 'kid', 'stranger']) {
    const shaped = familyOrder(ORDER, viewer);
    assert.ok(!('stripeSessionId' in shaped) && !('stripe_session_id' in shaped));
  }
});

test('a report is released only once the order is delivered', () => {
  for (const status of ['pending', 'paid', 'scheduled', 'refunded']) {
    const shaped = familyOrder({ ...ORDER, status }, 'parent');
    assert.equal(shaped.report, null, `a ${status} order handed over its report`);
  }
});

test('an empty report is null, never an empty string', () => {
  // A blank string renders as a report card with nothing in it, which reads as
  // "your report says nothing" rather than "something went wrong".
  assert.equal(familyOrder({ ...ORDER, report_md: '' }, 'parent').report, null);
  assert.equal(familyOrder({ ...ORDER, report_md: null }, 'parent').report, null);
  assert.equal(familyOrder(null, 'parent'), null);
});

test('the order says whether the reader is the one who sits it', () => {
  // /api/engine/placement writes every attempt against caller.user.id, so a
  // parent who pressed "Start the assessment" would put her own answers on her
  // child's baseline. forViewer is what the page gates that button on.
  assert.equal(familyOrder(ORDER, 'kid').forViewer, true);
  assert.equal(familyOrder(ORDER, 'parent').forViewer, false);
  // And the name, so a family with two children reads two different cards —
  // never the reader's own name back at them.
  assert.equal(familyOrder(ORDER, 'parent', { kid: 'Maya' }).studentName, 'Maya');
  assert.equal(familyOrder(ORDER, 'kid', { kid: 'Maya' }).studentName, null);
  assert.equal(familyOrder(ORDER, 'parent', {}).studentName, null, 'a missing name is null, not "undefined"');
});

// ── A payer may pay; only the student may sit ────────────────────────────────
// forViewer above is the PAGE's gate, and a rule enforced in a client component
// is not enforced (Hard Rule 3). GET /api/engine/placement?orderId=<the child's
// order> starts a run keyed on whoever is signed in; binding that run to the
// child's order would stamp the child's order with the parent's session, and
// because the bind keeps the first session id it wrote, the child's own later
// run could never displace it. The Director would read the parent's answers and
// write the child's report. placementBinding is the server-side refusal.

const PAID_ORDER = { id: 'o1', payer_id: 'parent', student_id: 'kid', status: 'paid', placement_session_id: null };

test('a parent may not sit her child’s assessment, whatever the client sends', () => {
  const refused = placementBinding(PAID_ORDER, 'parent');
  assert.equal(refused.attach, false, 'the payer was allowed to sit her child’s assessment');
  assert.equal(refused.reason, 'not_the_student', 'the refusal has to be named or the page cannot say why');

  const allowed = placementBinding(PAID_ORDER, 'kid');
  assert.equal(allowed.attach, true);
  assert.equal(allowed.status, 'scheduled', 'sitting it queues the report');

  // A stranger who guessed an id learns nothing at all — not even that it exists.
  assert.deepEqual(placementBinding(PAID_ORDER, 'stranger'), { attach: false, reason: 'not_your_order' });
  assert.deepEqual(placementBinding(null, 'kid'), { attach: false, reason: 'no_order' });
});

test('the order lifecycle still gates the bind, and each refusal is named', () => {
  // Sending an orderId is never a way past the till, and a refunded order is
  // terminal — the same table applyOrderEvent enforces for the webhook.
  assert.deepEqual(placementBinding({ ...PAID_ORDER, status: 'pending' }, 'kid'),
    { attach: false, reason: 'not_paid' });
  assert.deepEqual(placementBinding({ ...PAID_ORDER, status: 'refunded' }, 'kid'),
    { attach: false, reason: 'refunded' });
  // Sitting it twice is legal and idempotent: the run is already scheduled.
  assert.equal(placementBinding({ ...PAID_ORDER, status: 'scheduled' }, 'kid').status, 'scheduled');
  // And a delivered order does not walk backwards to scheduled.
  assert.equal(placementBinding({ ...PAID_ORDER, status: 'delivered' }, 'kid').status, 'delivered');
});

test('the refused bind writes nothing — the child’s order keeps its own session', async () => {
  const rows = [{ ...PAID_ORDER }];
  const { svc, table } = fakeOrders(rows);
  const refused = await bindOrder(svc, 'parent', 'o1', 'parents-session');
  assert.deepEqual(refused, { id: 'o1', status: 'paid', attached: false, reason: 'not_the_student' });
  assert.equal(table[0].placement_session_id, null, 'the parent’s session was written to the child’s order');
  assert.equal(table[0].status, 'paid', 'the child’s order was moved by someone who is not the child');

  // The student sitting it is what moves the order, and the session that lands
  // on the row is theirs.
  const bound = await bindOrder(svc, 'kid', 'o1', 'kids-session');
  assert.deepEqual(bound, { id: 'o1', status: 'scheduled', attached: true, reason: null });
  assert.equal(table[0].placement_session_id, 'kids-session');
  assert.equal(table[0].status, 'scheduled');

  // An order that is none of this caller's business is answered `null`, exactly
  // as an unknown id is.
  assert.equal(await bindOrder(svc, 'stranger', 'o1', 'their-session'), null);
  assert.equal(await bindOrder(svc, 'kid', 'no-such-order', 'kids-session'), null);
});

test('a refund that lands mid-run is not walked forward by the bind', async () => {
  // The read said 'paid'; the write is a compare-and-set on that status, so the
  // refund that arrived in between stands. `attached: true` is a claim the page
  // shows the family and it may only be made when a row actually moved.
  const { svc, table } = fakeOrders([{ ...PAID_ORDER }], { raceTo: 'refunded' });
  const out = await bindOrder(svc, 'kid', 'o1', 'kids-session');
  assert.equal(out.attached, false);
  assert.equal(out.reason, 'raced');
  assert.equal(table[0].status, 'refunded', 'a refunded order was resurrected');
  assert.equal(table[0].placement_session_id, null);
});

/**
 * A stand-in for the ONE table the checkout and the bind write to. It is a
 * fixture with a memory, not a database: the rows are mutated in place, so a
 * test can assert what the code left behind rather than what it called.
 *
 * The chain is exactly the one the routes use — select/eq/order/limit,
 * insert, and update(...).eq(...).select() — and awaiting it yields
 * { data, error } the way supabase-js does. `raceTo` moves the row's status the
 * instant it has been READ, which is the only way to reproduce the webhook
 * landing between a read and its write.
 */
function fakeOrders(rows = [], { raceTo = null } = {}) {
  const table = rows.map((r) => ({ ...r }));
  const writes = [];
  let st;
  const reset = () => { st = { op: 'select', filters: [], patch: null, limit: null }; };
  reset();
  const matches = (row) => st.filters.every(([col, val]) => row[col] === val);

  const run = () => {
    if (st.op === 'insert') {
      table.push({ ...st.patch });
      writes.push({ op: 'insert', patch: st.patch });
      return { data: null, error: null };
    }
    if (st.op === 'update') {
      const hit = table.filter(matches);
      for (const row of hit) Object.assign(row, st.patch);
      writes.push({ op: 'update', patch: st.patch, filters: st.filters, matched: hit.length });
      return { data: hit.map((row) => ({ id: row.id })), error: null };
    }
    const found = table.filter(matches);
    return { data: st.limit == null ? found : found.slice(0, st.limit), error: null };
  };

  const q = {
    select() { return q; },
    eq(col, val) { st.filters.push([col, val]); return q; },
    order() { return q; },
    limit(n) { st.limit = n; return q; },
    insert(patch) { st.op = 'insert'; st.patch = patch; return q; },
    update(patch) { st.op = 'update'; st.patch = patch; st.filters = []; return q; },
    maybeSingle() {
      const { data } = run();
      reset();
      const first = data[0] ? { ...data[0] } : null;
      if (raceTo && first) {
        const live = table.find((row) => row.id === first.id);
        if (live) live.status = raceTo;
      }
      return Promise.resolve({ data: first, error: null });
    },
    then(res, rej) { const out = run(); reset(); return Promise.resolve(out).then(res, rej); },
  };
  return { svc: { from() { reset(); return q; } }, table, writes };
}

// ── Whose child it is ────────────────────────────────────────────────────────
// The picker and the route's refusal read the same list, so the page can never
// offer a name resolveBookingStudent would turn down.

/**
 * A minimal stand-in for one PostgREST table: the select/eq/in/order chain the
 * route actually uses, and awaiting it yields { data }. Nothing here talks to
 * Supabase; the rows are shaped exactly like the columns the route selects.
 */
function fakeSvc(tables) {
  const chain = (rows) => ({
    select: () => chain(rows),
    order: () => chain(rows),
    limit: (n) => chain(rows.slice(0, n)),
    eq: (col, val) => chain(rows.filter((r) => r[col] === val)),
    in: (col, vals) => chain(rows.filter((r) => vals.includes(r[col]))),
    then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
  });
  return { from: (name) => chain(tables[name] || []) };
}

test('the picker offers the children a parent manages and the students who linked to them', () => {
  const svc = fakeSvc({
    profiles: [
      { id: 'kid1', name: 'Maya', managed_by: 'parent' },
      { id: 'kid2', name: null, email: 'sam@example.com', managed_by: 'parent' },
      { id: 'teen', name: 'Jordan', managed_by: null },
      { id: 'someone', name: 'Not yours', managed_by: 'other-parent' },
    ],
    parent_student_relationships: [
      { parent_id: 'parent', student_id: 'teen', status: 'active' },
      { parent_id: 'parent', student_id: 'someone', status: 'pending' },
    ],
  });
  return buyableStudents(svc, 'parent').then((rows) => {
    assert.deepEqual(rows.map((r) => r.id), ['kid1', 'kid2', 'teen'],
      'managed children first, then the invite links; a pending link is not a link');
    assert.equal(rows[1].name, 'sam@example.com', 'an unnamed child is still recognisable to their parent');
    assert.deepEqual(rows.map((r) => r.relationship), ['managed', 'managed', 'invite'],
      'the relationship travels with the row — it is what resolveBookingStudent re-verifies');
  });
});

test('the picker never offers the payer themselves, or the same child twice', () => {
  // Offering "myself" beside a child's name is how the purchase lands on the
  // wrong ledger again, and a child who is both managed and invite-linked is
  // still one child.
  const svc = fakeSvc({
    profiles: [
      { id: 'kid1', name: 'Maya', managed_by: 'parent' },
      { id: 'parent', name: 'The payer', managed_by: null },
    ],
    parent_student_relationships: [
      { parent_id: 'parent', student_id: 'kid1', status: 'active' },
      { parent_id: 'parent', student_id: 'parent', status: 'active' },
    ],
  });
  return buyableStudents(svc, 'parent').then((rows) => {
    assert.deepEqual(rows.map((r) => r.id), ['kid1']);
  });
});

test('a caller with no children gets an empty list, not a self entry', () => {
  const svc = fakeSvc({ profiles: [{ id: 'solo', name: 'Adult learner' }], parent_student_relationships: [] });
  return buyableStudents(svc, 'solo').then((rows) => {
    assert.deepEqual(rows, [], 'an empty list is what tells the route this is a self-purchase');
  });
});

test('a failed family read refuses the purchase instead of falling back to the payer', async () => {
  // The dangerous failure mode, and the reason this does not call
  // managedChildren: that helper answers [] when its read fails, and [] is
  // exactly what the route reads as "no children, so this is for themself".
  // A database hiccup would put a child's baseline back on a parent's record.
  const broken = {
    from: () => ({
      select: () => broken.from(),
      order: () => broken.from(),
      eq: () => broken.from(),
      in: () => broken.from(),
      then: (res) => res({ data: null, error: { message: 'connection reset' } }),
    }),
  };
  await assert.rejects(() => buyableStudents(broken, 'parent'), /connection reset/);
});

// ── The route and the page, read as source ───────────────────────────────────
// There is no renderer in this rig, so the four defects that reached this
// surface are pinned where they live. Comments legitimately describe what was
// REMOVED, so the bans run against the code with comments stripped — the same
// technique claims.test.mjs and familyPage.test.mjs use.

const routeSrc = readFileSync(join(here, '..', 'app', 'api', 'diagnostic', 'route.js'), 'utf8');
const pageSrc = readFileSync(join(here, '..', 'app', 'diagnostic', 'page.js'), 'utf8');
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const routeCode = stripComments(routeSrc);
const pageCode = stripComments(pageSrc);

test('no order row is written until a Checkout session exists', async () => {
  // Every press of the buy button used to insert a diagnostic_order at
  // 'pending' with an amount already on it, before Stripe was ever opened, and
  // the route removed it only if an exception threw. The funnel board then
  // counted intentions as orders. It is a guard now, not a convention: an order
  // with no session id is an intention, and recordCheckout refuses to write one.
  const { svc, table } = fakeOrders([]);
  await assert.rejects(
    () => recordCheckout(svc, { action: 'create' }, {
      orderId: 'o-new', payerId: 'parent', studentId: 'kid', sessionId: null, amountCents: 5900,
    }),
    /Checkout session/,
  );
  assert.equal(table.length, 0, 'an intention was written as an order');

  await recordCheckout(svc, { action: 'create' }, {
    orderId: 'o-new', payerId: 'parent', studentId: 'kid', sessionId: 'cs_1', amountCents: 5900,
  });
  assert.deepEqual(table.map((r) => [r.id, r.status, r.stripe_session_id]), [['o-new', 'pending', 'cs_1']],
    'the row is born attached to its session, so a pending order is always a real abandoned checkout');
  assert.ok(!/diagnostic_order'\)\.delete\(/.test(routeCode),
    'there is no orphan row left to clean up any more');
  // And the call still happens after the session exists, at the one call site.
  assert.ok(routeCode.lastIndexOf('recordCheckout(') > routeCode.indexOf('checkout.sessions.create'));
});

// ── One pending row per family per child ─────────────────────────────────────
// `pending` is what the funnel board counts as an abandoned checkout
// (app/api/admin/funnel/route.js). Stripe expires a Checkout session after 24h,
// so a family who pressed on Monday and came back on Wednesday used to leave a
// second row behind — and a family who converted on the third visit contributed
// 2 to the abandoned count for ever. checkoutPlan is the rule and recordCheckout
// is the write; both are exercised here rather than grepped for.

test('a second press inside the window re-opens the same session, and mints nothing', () => {
  const plan = checkoutPlan(
    { id: 'o1', stripe_session_id: 'cs_1' },
    { status: 'open', url: 'https://checkout.stripe.test/cs_1' },
  );
  assert.deepEqual(plan, { action: 'resume', orderId: 'o1', url: 'https://checkout.stripe.test/cs_1' });
});

test('an expired session is reused IN PLACE — a second row is a phantom abandonment', async () => {
  // Monday: pressed, never paid. Wednesday: pressed again, and Stripe has
  // expired Monday's session.
  assert.deepEqual(checkoutPlan({ id: 'o1', stripe_session_id: 'cs_1' }, { status: 'expired' }),
    { action: 'reuse', orderId: 'o1' });
  // A legacy row with no session at all is reused rather than orphaned beside a
  // new one.
  assert.equal(checkoutPlan({ id: 'o1', stripe_session_id: null }, null).action, 'reuse');

  const { svc, table } = fakeOrders([
    { id: 'o1', payer_id: 'parent', student_id: 'kid', status: 'pending', stripe_session_id: 'cs_1', amount_cents: 5900 },
  ]);
  const written = await recordCheckout(svc, { action: 'reuse' }, {
    orderId: 'o1', payerId: 'parent', studentId: 'kid', sessionId: 'cs_2', amountCents: 6100,
  });
  assert.deepEqual(written, { ok: true, reused: true });
  assert.equal(table.length, 1, 'one family coming back twice is ONE abandoned checkout, not two');
  assert.equal(table[0].stripe_session_id, 'cs_2', 'the row now points at the session that is actually live');
  assert.equal(table[0].amount_cents, 6100, 'and at what Stripe says that session will charge');
});

test('a session Stripe would not describe is not treated as a dead one', () => {
  // This block used to assert the opposite — that a retrieve failure meant the
  // session was dead and the row was ours to re-point. It is not the same
  // thing. `expired` is Stripe telling us the URL is spent; a thrown retrieve
  // is Stripe telling us nothing, and the family may still have a live,
  // payable URL open in another tab. Minting a second session beside it bills
  // one order twice, and the webhook — idempotent per order — would fulfil
  // once, so nothing downstream would ever notice the second charge.
  assert.deepEqual(
    checkoutPlan({ id: 'o1', stripe_session_id: 'cs_1' }, null, { sessionKnown: false }),
    { action: 'unknown', orderId: 'o1' },
  );
  // Only when the row names a session: a row with none has no live URL to
  // collide with, so an unreadable Stripe does not block the family.
  assert.equal(
    checkoutPlan({ id: 'o1', stripe_session_id: null }, null, { sessionKnown: false }).action,
    'reuse',
  );
  // And a successful read still decides on its own merits.
  assert.equal(
    checkoutPlan({ id: 'o1', stripe_session_id: 'cs_1' }, { status: 'expired' }, { sessionKnown: true }).action,
    'reuse',
  );
  // The route turns it into a 503 that says nothing was charged, never a
  // second Checkout session.
  const route = readFileSync(new URL('../app/api/diagnostic/route.js', import.meta.url), 'utf8');
  assert.match(route, /plan\.action === 'unknown'/);
  assert.match(route, /code: 'checkout_unreachable'/);
  assert.match(route, /Nothing has been charged/);
});

test('a paid order never gets a second Checkout opened against it', async () => {
  // Stripe reports the session complete: the money is taken and the webhook has
  // not landed yet. Minting a fresh session here is how a family pays twice.
  assert.deepEqual(checkoutPlan({ id: 'o1', stripe_session_id: 'cs_1' }, { status: 'complete' }),
    { action: 'settled', orderId: 'o1' });
  // A complete session with a URL is still complete — 'open' is the only status
  // whose URL may be handed back.
  assert.equal(checkoutPlan({ id: 'o1' }, { status: 'complete', url: 'https://x.test' }).action, 'settled');

  // And the same discovery made a moment later: the webhook landed while Stripe
  // was minting the new session, so the compare-and-set on `pending` misses.
  const { svc, table } = fakeOrders([
    { id: 'o1', payer_id: 'parent', student_id: 'kid', status: 'paid', stripe_session_id: 'cs_1', amount_cents: 5900 },
  ]);
  const written = await recordCheckout(svc, { action: 'reuse' }, {
    orderId: 'o1', payerId: 'parent', studentId: 'kid', sessionId: 'cs_2', amountCents: 5900,
  });
  assert.deepEqual(written, { ok: false, code: 'already_paid' });
  assert.equal(table[0].stripe_session_id, 'cs_1', 'a paid order was re-pointed at an unpaid session');
  assert.equal(table[0].status, 'paid');
});

test('nothing in flight means a new row, and the new row is the only one', () => {
  assert.deepEqual(checkoutPlan(null, null), { action: 'create', orderId: null });
  assert.deepEqual(checkoutPlan(undefined, { status: 'open', url: 'x' }), { action: 'create', orderId: null });
});

test('only a pending order of this family for this child is ever reused', async () => {
  // The read is the other half of the invariant: reusing a paid row would
  // re-open a checkout for something already bought, and reusing another
  // family's row is not a thing to contemplate at all.
  const { svc } = fakeOrders([
    { id: 'paid', payer_id: 'parent', student_id: 'kid', status: 'paid', stripe_session_id: 'cs_paid' },
    { id: 'other-child', payer_id: 'parent', student_id: 'sib', status: 'pending', stripe_session_id: 'cs_sib' },
    { id: 'other-payer', payer_id: 'stranger', student_id: 'kid', status: 'pending', stripe_session_id: 'cs_x' },
    { id: 'mine', payer_id: 'parent', student_id: 'kid', status: 'pending', stripe_session_id: 'cs_mine' },
  ]);
  assert.equal((await pendingOrderFor(svc, 'parent', 'kid'))?.id, 'mine');
  assert.equal(await pendingOrderFor(svc, 'parent', 'nobody'), null);
});

test('the route refuses to guess which child a purchase is for', () => {
  assert.match(routeCode, /student_required/, 'a caller with children must name one');
  assert.match(routeCode, /buyableStudents\(svc, caller\.user\.id\)/, 'the refusal reads the same list the picker does');
  assert.match(routeCode, /resolveBookingStudent\(svc, caller, asked\)/,
    'and the named child is still verified server-side — the client’s word is never enough');
});

test('the family route selects the columns the release rule needs', () => {
  assert.match(routeCode, /payer_id[^']*report_md/,
    'familyOrder decides on payer_id and report_md; a select that drops either silently withholds every report');
});

test('the page wears the same chrome as every other public page', () => {
  // It wore AppHeader/AppFooter while /pricing, /tutoring and /schedule wear
  // the marketing Shell, so a parent arriving from the price sheet crossed a
  // seam into what looked like a different site.
  assert.match(pageSrc, /from '@\/components\/dn\/Shell'/);
  assert.ok(!/AppHeader|AppFooter/.test(pageCode), 'the app shell does not belong on a storefront page');
});

test('the page posts the chosen child and will not buy without one', () => {
  assert.match(pageCode, /body: JSON\.stringify\(\{ studentId/, 'the empty body is what stamped the payer as the student');
  assert.match(pageCode, /mustPick = students\.length > 0 && !studentId/);
  // The product's submit rule: live on press, `disabled` reserved for in
  // flight. So the refusal is a sentence beside the button, not a dead pill.
  assert.match(pageCode, /if \(mustPick\) \{\s*setPickError/, 'the press is what refuses, and it says why');
  assert.match(pageCode, /disabled=\{busy\}/, 'disabled means in flight and nothing else');
  assert.ok(!/useState\(students\[0\]/.test(pageCode), 'nothing is preselected — that is the whole point of the picker');
});

test('the page renders the report it now receives', () => {
  assert.match(pageCode, /o\.report \?/, 'a delivered order renders its report');
  assert.match(pageCode, /MessageBody content=\{o\.report\}/);
  const report = pageCode.indexOf('Your report');
  const price = pageCode.indexOf('What it costs');
  assert.ok(report > 0 && price > 0 && report < price,
    'once a family has a record, the record outranks the price (the geometry spec’s second visual decision)');
});

test('a parent is never invited to sit their child’s assessment', () => {
  // The run is written to whoever is signed in, so the button only exists for
  // the student the order belongs to. The mastery law starts here: an answer a
  // parent typed is not evidence about a child.
  assert.match(pageCode, /o\.forViewer \? \(/);
  assert.match(pageCode, /startPlacement\(o\)/);
  const gate = pageCode.indexOf('o.forViewer ? (');
  const button = pageCode.indexOf('startPlacement(o)');
  assert.ok(gate > 0 && button > gate, 'the start button sits inside the forViewer branch');
});

test('the held page captures interest, which is what the route’s own refusal promises', () => {
  assert.match(routeCode, /Leave us your details/, 'the 503 still promises a capture');
  assert.match(pageCode, /<InterestForm/, 'and the page can now honour it');
  assert.match(pageCode, /kind="diagnostic"/);
  assert.ok(INTEREST_KINDS.includes('diagnostic'),
    'the kind must be in the closed enum or the capture is rejected with a 400');
});

test('nothing on the page hands a parent an engineering task', () => {
  // Four not-configured strings used to name the deployment and an env var at
  // someone who came here to book an assessment for their kid.
  for (const phrase of ['deployment', 'Stripe', 'STRIPE_PRICE', 'Supabase', 'migration']) {
    assert.ok(!pageCode.includes(phrase), `the page says "${phrase}" to a parent`);
  }
});

test('the cause is kept for the operator without being handed to the parent', () => {
  // Deleting the four operator strings is only honest if the cause survives
  // somewhere an operator can reach. It is on the envelope, and the held block
  // carries it as an attribute — no admin page and no /api/health reads it, so
  // those are not claims this file or its comments may make.
  assert.match(routeCode, /reason: blocked\?\.code \|\| null/, 'the envelope still names the cause');
  assert.match(pageCode, /data-reason=\{envelope\.reason/, 'the held block carries it for whoever deployed this');
  assert.ok(!/\{envelope\.reason\}/.test(pageCode), 'a reason code rendered as text is a sentence for an engineer');
});

test('an already-paid order is reported as news, not as a failed checkout', () => {
  // The route refuses to open a second Checkout against an order Stripe has
  // taken money for. Painted red, that refusal reads as a failure and invites
  // the second press it exists to prevent.
  const good = pageCode.indexOf("data.code === 'already_paid'");
  const red = pageCode.indexOf("setError(data.error || 'Could not start checkout");
  assert.ok(good > 0, 'the page has no branch for the one refusal that is good news');
  assert.ok(red > good, 'the red channel swallows it first');
  assert.match(pageCode.slice(good, red), /setNotice\(/);
});

test('a run that never reached its order is not answered with a promise of a report', () => {
  // placementBinding refuses to attach a payer's run to her child's order, so
  // the page must not then tell her a report is on its way: none was queued.
  const branch = pageCode.indexOf('{unattached ? (');
  const promise = pageCode.indexOf('Your written report is coming');
  assert.ok(branch > 0, 'the done card does not read the route’s refusal');
  assert.ok(promise > branch && pageCode.slice(branch, promise).includes(') : ('),
    'the handoff promise must be the ELSE of the refusal, not a line beside it');
  assert.match(pageCode, /not_the_student:/, 'the named refusal has copy of its own');
});

test('the sales header comes down once a run starts', () => {
  // A fourteen-year-old should not answer question seven under a price and a
  // credit window.
  assert.match(pageCode, /const selling = !run;/);
  assert.match(pageCode, /\{selling && DIAGNOSTIC\.creditsTowardFirstMonth/);
  assert.match(pageCode, /\{selling && <Eyebrow>/);
});

// ── The vocabulary the database agrees to ────────────────────────────────────

test('the JS status vocabulary matches the CHECK constraint in migration 0036', () => {
  const sql = sqlFile('supabase/migrations/0036_diagnostic_orders.sql');
  const m = sql.match(/check\s*\(status\s+in\s*\(([^)]*)\)/i);
  assert.ok(m, 'no status CHECK constraint found in 0036');
  const fromSql = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(fromSql, [...ORDER_STATUSES].sort(),
    'the order lifecycle and the database disagree about what a status is');
});

test('the go-live bundle carries the diagnostic table', () => {
  // GO_LIVE.sql is the one-paste ops bundle. A migration missing from it is a
  // table that exists in the repo and not in production.
  const goLive = sqlFile('supabase/GO_LIVE.sql');
  assert.match(goLive, /-- supabase\/migrations\/0036_diagnostic_orders\.sql/);
  assert.match(goLive, /create table if not exists diagnostic_order/);
  // It has to land before the switch is flipped, or the first sale hits a
  // table that does not exist yet.
  assert.ok(
    goLive.indexOf('create table if not exists diagnostic_order') < goLive.indexOf('Flip the switch'),
    'the diagnostic table is created after selling opens',
  );
});

test('the go-live bundle carries EVERY migration from 0022 on', () => {
  // Generalised from a pin on one number, which went stale the next time
  // anyone added a migration — and a stale pin is worse than none, because it
  // fails for the wrong reason and gets "fixed" by bumping the literal. What
  // actually matters is the invariant: the bundle an operator pastes into
  // production must contain every migration the repo has since the bundle's
  // starting point, and its header must say so.
  const goLive = sqlFile('supabase/GO_LIVE.sql');
  const dir = join(repoRoot, 'supabase', 'migrations');
  const numbered = readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .map((f) => ({ file: f, n: Number(f.slice(0, 4)) }))
    .filter((m) => m.n >= 22)
    .sort((a, b) => a.n - b.n);

  assert.ok(numbered.length > 0, 'no migrations found to check the bundle against');
  for (const { file } of numbered) {
    assert.ok(
      goLive.includes(`-- supabase/migrations/${file}`),
      `GO_LIVE.sql is missing ${file} — it exists in the repo and would not exist in production`,
    );
  }
  const last = String(numbered[numbered.length - 1].n).padStart(4, '0');
  assert.match(
    goLive, new RegExp(`migrations 0022 -> ${last}`),
    `the bundle header must name the highest migration it carries (${last})`,
  );
});

// ── The one-time SKU is not a plan ───────────────────────────────────────────

test('the diagnostic is a one-time price and never resolves to a subscription plan', () => {
  assert.equal(DIAGNOSTIC.oneTime, true);
  assert.ok(DIAGNOSTIC.priceCents > 0);
  assert.ok('diagnostic' in ONE_TIME_PRICES, 'the diagnostic needs its own env-driven Stripe Price');
  assert.ok(!('diagnostic' in PRICE_BY_PLAN),
    'a one-time SKU in PRICE_BY_PLAN would let planByPrice grant a subscription plan for a single payment');
});
