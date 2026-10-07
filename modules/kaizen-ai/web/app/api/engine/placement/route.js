// GET  /api/engine/placement                → start (or resume) a run + the next item
// POST /api/engine/placement {itemId,...}    → record a response, return the next item or the result
//
// The engine has implemented adaptive placement since day one
// (lib/engine/placement.js) and no route ever exposed it, so the product could
// price a diagnostic it had no way to administer. This is that route.
//
// PLACEMENT IS MEASUREMENT, NOT INSTRUCTION. There are no hints here, no worked
// examples, no feedback on an answer, and no teaching between items — those all
// belong to /api/engine/session. Items target ~50% expected success (maximum
// information per item), which is deliberately harder than the acquisition
// band, and the whole thing is over in 10-15 items.
//
// WHAT IT CAN AND CANNOT PROVE
// placementEvidence writes rows with assisted:true, which by the mastery law
// (docs/ENGINE.md) can never confirm anything. A twelve-item adaptive run says
// where to START. It does not say what the learner can do unaided next week,
// and nothing here may be worded as if it did.
//
// WHOSE RUN IT IS. A run is written to whoever is signed in, so an order may
// only ever be attached to a run sat by the STUDENT it names — see
// placementBinding. The page hides the button from a payer; this route is what
// refuses one, because a rule enforced in a client component is not enforced.
//
// THE ANSWER KEY NEVER LEAVES THE SERVER. Items are served through publicItem
// (which strips answer_spec, as migration 0012 also does at column level), the
// item the learner is answering is read from the item_attempt row this route
// wrote before serving it, and grading happens here against the bank.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { appendEvidence, recomputeEstimates, isMissingSchema } from '@/lib/engine/ledger';
import {
  nextPlacementItem, applyPlacementResponse, placementComplete, placementEvidence,
  PLACEMENT_MIN_ITEMS, PLACEMENT_MAX_ITEMS,
} from '@/lib/engine/placement';
import { check as verify, publicItem } from '@/lib/engine/verify/symbolic';
import { ELO_START } from '@/lib/engine/elo';
import { applyOrderEvent } from '@/lib/server/diagnosticOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_PROVISIONED = { notProvisioned: true, action: 'unavailable' };

// A placement run is a learning_session (0015) and each served item is an
// item_attempt row tagged with this prefix, so the run's state is reconstructed
// from the ledger rather than held in a column somewhere. That is the same
// asymmetry the evidence ledger is built on: derived state is a cache, the rows
// are the truth.
const RUN_REF = (sessionId) => `placement:${sessionId}`;

// learning_session.policy_version doubles as the marker that tells a placement
// run apart from a practice session, which is what makes "resume the unfinished
// one" safe: nothing here can pick up a half-finished practice loop.
const POLICY_VERSION = 'placement';

// One bank read per request. Placement ranges across the whole lattice rather
// than one KC, so the pool is every verified item — capped, because a bank that
// outgrows this cap wants a difficulty-windowed query, not a bigger number.
const POOL_LIMIT = 400;

/** Verified items only. A draft item has no human sign-off and may not measure anyone. */
async function readPool(svc) {
  const { data, error } = await svc.from('kc_item')
    .select('id,kc_id,kind,body,choices,context_tag,difficulty_elo')
    .eq('status', 'verified')
    // Deterministic: without an ORDER BY, Postgres may hand back a different
    // window on each call, and replayRun looks every served item's difficulty
    // up in this pool — an item that fell out of a later window would be
    // silently re-scored at the default Elo, which is exactly the kind of
    // irreproducibility a "replayed from the ledger" design exists to avoid.
    .order('id', { ascending: true })
    .limit(POOL_LIMIT);
  if (error) throw new Error(`item bank read failed: ${error.message}`);
  return data || [];
}

/**
 * Replay a run from its item_attempt rows: what has been served, what has been
 * answered, and where the Elo estimate stands.
 *
 * Elo is FOLDED rather than stored so a run is reproducible — the same property
 * that lets recomputeEstimates rebuild every learner's state from the ledger.
 * `pending` is the one row that has been served and not yet answered; POST
 * grades against it and against nothing the client sent.
 */
async function replayRun(svc, userId, sessionId, pool) {
  const { data, error } = await svc.from('item_attempt')
    .select('id,item_id,kc_id,solved,resolved_at,created_at')
    .eq('user_id', userId).eq('session_ref', RUN_REF(sessionId))
    .order('created_at', { ascending: true });
  if (error) throw new Error(`placement replay failed: ${error.message}`);

  const rows = data || [];
  const eloOf = new Map(pool.map((i) => [i.id, Number(i.difficulty_elo) || ELO_START]));

  let state = { learnerElo: ELO_START, count: 0, lastDelta: Infinity };
  const responses = [];
  for (const r of rows) {
    if (!r.resolved_at) continue;
    state = applyPlacementResponse(state, {
      itemElo: eloOf.get(r.item_id) ?? ELO_START,
      correct: Boolean(r.solved),
    });
    responses.push({ kcId: r.kc_id, itemId: r.item_id, correct: Boolean(r.solved) });
  }

  return {
    state,
    responses,
    servedIds: rows.map((r) => r.item_id).filter(Boolean),
    servedKcIds: rows.map((r) => r.kc_id).filter(Boolean),
    pending: rows.find((r) => !r.resolved_at) || null,
  };
}

/**
 * Choose and record the next item, or report that the run is over.
 *
 * BREADTH FIRST: a KC already sampled in this run is set aside before Elo
 * targeting runs, so a fifteen-item placement covers fifteen concepts rather
 * than fifteen questions about fractions. Only when every KC has been sampled
 * does the pool reopen — a placement that keeps asking about one concept is
 * measuring that concept, not the learner.
 */
async function serveNext(svc, userId, sessionId, pool, run) {
  const seenKc = new Set(run.servedKcIds);
  const unseenKc = pool.filter((i) => !seenKc.has(i.kc_id));
  const item = nextPlacementItem(unseenKc.length ? unseenKc : pool, {
    learnerElo: run.state.learnerElo,
    servedIds: run.servedIds,
  });
  if (!item) return null;

  // Recorded BEFORE it is served, exactly as check.js records its item list:
  // grading then reads the item from this row and never from the request body.
  const { data: attempt, error } = await svc.from('item_attempt').insert({
    user_id: userId,
    kc_id: item.kc_id,
    item_id: item.id,
    session_ref: RUN_REF(sessionId),
    attempts: 0,
  }).select('id').maybeSingle();
  if (error) throw new Error(`placement item record failed: ${error.message}`);

  return { attemptId: attempt?.id || null, item };
}

/** The wire shape of one placement question. No answer key, no hints, no help. */
function itemPayload(sessionId, attemptId, item, run) {
  return {
    sessionId,
    attemptId,
    item: publicItem(item),
    // Progress, honestly: placement stops as soon as the estimate settles, so
    // the ceiling is what we promise and the floor is what we need.
    answered: run.state.count,
    minItems: PLACEMENT_MIN_ITEMS,
    maxItems: PLACEMENT_MAX_ITEMS,
    done: false,
  };
}

/**
 * Close a run: write the evidence, recompute estimates, end the session, and —
 * when the run was bought — move the diagnostic order along.
 *
 * The evidence rows are the point of the whole exercise. They are assisted by
 * construction (placementEvidence sets it), so they seed WORKING mastery and a
 * starting Elo and confirm nothing.
 */
async function finishRun(svc, userId, sessionId, run, { orderId = null, now = Date.now() } = {}) {
  const rows = placementEvidence(userId, run.responses.map((r) => ({ ...r, runId: sessionId })), { now });
  if (rows.length) {
    await appendEvidence(svc, userId, rows);
    const kcIds = [...new Set(rows.map((r) => r.kcId))];
    // The learner's link into the library. Without it the placement is invisible
    // to /api/engine/state, which reads learner_kc — the baseline would sit in
    // the ledger and show up nowhere. source 'placement' is in 0012's CHECK for
    // exactly this path.
    await svc.from('learner_kc')
      .upsert(kcIds.map((kcId) => ({ user_id: userId, kc_id: kcId, source: 'placement' })), {
        onConflict: 'user_id,kc_id', ignoreDuplicates: true,
      })
      .then(() => {}, () => { /* a pre-existing link is the normal case */ });
    await recomputeEstimates(svc, userId, { kcIds, now });
  }

  const { error: sessionErr } = await svc.from('learning_session').update({
    ended_at: new Date(now).toISOString(),
    // None of 0015's six end reasons was written for placement. 'mastery_point'
    // is the one that looks closest and is the one that must not be used: a
    // placement run reaching no mastery point is the whole premise. 'soft_cap'
    // is the honest reading — the system decided it had measured enough.
    end_reason: 'soft_cap',
    items_seen: run.state.count,
    hints_used: 0,
    // Placement is hint-free by construction, so the whole run was independent.
    // That is a statement about the RUN, not about the learner: the evidence
    // rows are still assisted:true, because a two-minute adaptive probe is not
    // a demonstration of unaided competence.
    independent_share: 1,
  }).eq('id', sessionId).eq('user_id', userId);
  // supabase-js resolves with { data, error } instead of rejecting, so an
  // un-destructured await here is a silent no-op on failure — and a run whose
  // session never closes can be finished twice.
  if (sessionErr) throw new Error(`placement session close failed: ${sessionErr.message}`);

  let order = null;
  if (orderId) order = await bindOrder(svc, userId, orderId, sessionId);

  return {
    done: true,
    sessionId,
    answered: run.state.count,
    // The Elo is the engine's starting point, not a score to show a teenager as
    // a number they can be ranked by. It is returned for the record and the
    // director's report; the page renders none of it.
    learnerElo: run.state.learnerElo,
    kcsSampled: [...new Set(run.responses.map((r) => r.kcId))].length,
    order,
  };
}

/**
 * May THIS caller's finished run be attached to THIS order? PURE, so the rule
 * is unit-tested rather than hoped for (test/diagnostic.test.mjs).
 *
 * A PAYER MAY PAY; ONLY THE STUDENT MAY SIT. This is the whole reason the
 * function exists. /diagnostic only renders the "Start the assessment" button
 * inside its `o.forViewer` branch, but a rule enforced in a client component is
 * not enforced: GET /api/engine/placement?orderId=<the child's order> starts a
 * run keyed on caller.user.id, and binding it here would stamp the CHILD's
 * order with the PARENT's session. The Director would then read the parent's
 * answers and write the child's report, and because the bind keeps the first
 * session id it wrote, the child's own later run could never displace it. So
 * the check is server-side and it is narrow: student_id, or nothing.
 *
 * Everything else is the order lifecycle (applyOrderEvent): an unpaid order
 * cannot be scheduled and a refunded one is terminal.
 *
 * Reasons, all named so the page can say WHY rather than fail silently:
 *   no_order / not_your_order  → the caller learns nothing about it
 *   not_the_student            → the payer sat it; the run stays on their record
 *   not_paid / refunded        → the order is in no state to take a run
 */
export function placementBinding(row, userId) {
  if (!row) return { attach: false, reason: 'no_order' };
  const isPayer = row.payer_id === userId;
  const isStudent = row.student_id === userId;
  if (!isPayer && !isStudent) return { attach: false, reason: 'not_your_order' };
  if (!isStudent) return { attach: false, reason: 'not_the_student' };

  const next = applyOrderEvent(row.status, 'scheduled');
  if (next.refused) return { attach: false, reason: row.status === 'refunded' ? 'refunded' : 'not_paid' };
  return { attach: true, reason: null, status: next.status };
}

/**
 * Attach a finished run to the diagnostic order that paid for it and move the
 * order to 'scheduled' — the report is now queued for a person to write.
 *
 * The decision is placementBinding's; this does the I/O and reports what it
 * decided. An order this caller has no part in is answered `null`, exactly as
 * an unknown id is: telling a stranger that an order exists is telling them
 * something about a family.
 */
export async function bindOrder(svc, userId, orderId, sessionId) {
  const { data: row } = await svc.from('diagnostic_order')
    .select('id,payer_id,student_id,status,placement_session_id')
    .eq('id', orderId).maybeSingle();

  const plan = placementBinding(row, userId);
  if (plan.reason === 'no_order' || plan.reason === 'not_your_order') return null;
  if (!plan.attach) {
    if (plan.reason === 'not_the_student') {
      // A payer reaching this line has bypassed the page's own gate, so it is
      // worth a line in the log even though nothing was written.
      await auditLog(userId, 'diagnostic.placement_refused', orderId, {
        reason: plan.reason, placement_session_id: sessionId, student_id: row.student_id,
      });
    }
    return { id: row.id, status: row.status, attached: false, reason: plan.reason };
  }

  const { data: moved, error: bindErr } = await svc.from('diagnostic_order')
    .update({ status: plan.status, placement_session_id: row.placement_session_id || sessionId })
    // Compare-and-set on the status the transition was computed from: a refund
    // that landed between the read and this write is terminal, and must not be
    // walked forward by a run that started before it.
    .eq('id', orderId).eq('status', row.status)
    .select('id');
  // `attached: true` is a claim the page shows the family. It may only be made
  // after the write reports no error AND says it moved a row.
  if (bindErr) {
    console.error('[placement] order bind failed', orderId, bindErr.message);
    return { id: row.id, status: row.status, attached: false, reason: 'write_failed' };
  }
  if (!(moved || []).length) {
    return { id: row.id, status: row.status, attached: false, reason: 'raced' };
  }
  await auditLog(userId, 'diagnostic.placement_recorded', orderId, {
    placement_session_id: sessionId, from: row.status, to: plan.status,
  });
  return { id: row.id, status: plan.status, attached: true, reason: null };
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ demo: true, action: 'unavailable' });
  const svc = serviceClient();
  if (!svc) return Response.json(NOT_PROVISIONED);

  const limited = await rateLimitResponse(caller, req, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  let sessionId = url.searchParams.get('sessionId');
  const userId = caller.user.id;

  try {
    const pool = await readPool(svc);
    if (pool.length < 2) {
      // An unpromoted item bank is not a broken route. seed_kc_algebra1.sql
      // ships 90 items as 'draft' on purpose, awaiting human sign-off.
      return Response.json({ noBank: true, message: 'There are no verified questions to place with yet.' }, { status: 503 });
    }

    if (!sessionId) {
      // Resume rather than restart. A learner who closes the tab halfway through
      // and comes back must not sit the first eight questions again — and the
      // family paid for one assessment, not for however many the browser
      // happened to start. Only an unfinished run of THIS kind qualifies;
      // POLICY_VERSION is what tells a placement apart from a practice session.
      const { data: open } = await svc.from('learning_session')
        .select('id').eq('user_id', userId).eq('policy_version', POLICY_VERSION)
        .is('ended_at', null)
        .order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (open?.id) sessionId = open.id;
    }

    if (!sessionId) {
      const { data: started, error } = await svc.from('learning_session').insert({
        user_id: userId,
        policy_version: POLICY_VERSION,
      }).select('id').maybeSingle();
      if (error) throw new Error(`placement start failed: ${error.message}`);
      sessionId = started.id;
    } else {
      // A sessionId that arrived on the query string is a claim, not a fact.
      // Nothing downstream checks it: replayRun filters on the TEXT column
      // session_ref, so an unowned or invented id simply replays as an empty
      // run and starts serving questions against it — attributing one learner's
      // attempts to another learner's session, and letting a finished run be
      // finished again. Load it, or refuse it.
      const { data: owned } = await svc.from('learning_session')
        .select('id').eq('id', sessionId).eq('user_id', userId)
        .eq('policy_version', POLICY_VERSION).is('ended_at', null).maybeSingle();
      if (!owned) {
        return Response.json(
          { error: 'That placement isn’t yours, or it has already finished.', reason: 'unknown_session' },
          { status: 404 },
        );
      }
    }

    const run = await replayRun(svc, userId, sessionId, pool);

    // A reload mid-question gets the SAME question back, not a fresh draw —
    // re-serving an item already recorded cannot leak anything the first serve
    // did not, and a new draw would let a learner shop for an easier item.
    if (run.pending) {
      const item = pool.find((i) => i.id === run.pending.item_id);
      if (item) return Response.json({ ...itemPayload(sessionId, run.pending.id, item, run), resumed: true });
    }

    if (placementComplete(run.state)) {
      return Response.json(await finishRun(svc, userId, sessionId, run, { orderId: url.searchParams.get('orderId') }));
    }

    const served = await serveNext(svc, userId, sessionId, pool, run);
    // The bank ran dry before the minimum. Ending honestly beats re-serving
    // items to pad a run to fifteen.
    if (!served) return Response.json(await finishRun(svc, userId, sessionId, run, { orderId: url.searchParams.get('orderId') }));
    return Response.json(itemPayload(sessionId, served.attemptId, served.item, run));
  } catch (err) {
    if (isMissingSchema(err)) return Response.json(NOT_PROVISIONED);
    console.error('[engine/placement GET]', err?.message);
    return Response.json({ error: 'Could not start your placement.' }, { status: 500 });
  }
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Placement needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json(NOT_PROVISIONED);

  const limited = await rateLimitResponse(caller, req, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const sessionId = String(body?.sessionId || '');
  const attemptId = String(body?.attemptId || '');
  if (!sessionId || !attemptId) return Response.json({ error: 'sessionId and attemptId are required.' }, { status: 400 });
  const userId = caller.user.id;
  const now = Date.now();

  try {
    // Ownership and identity come from the attempt row this route wrote, not
    // from the body: the client says which attempt it is answering and nothing
    // more about what the question was.
    const { data: attempt } = await svc.from('item_attempt')
      .select('id,user_id,kc_id,item_id,session_ref,resolved_at')
      .eq('id', attemptId).maybeSingle();
    if (!attempt || attempt.user_id !== userId || attempt.session_ref !== RUN_REF(sessionId)) {
      return Response.json({ error: 'That question isn’t part of this placement.' }, { status: 404 });
    }
    if (attempt.resolved_at) return Response.json({ error: 'You already answered that one.' }, { status: 409 });

    const { data: item } = await svc.from('kc_item')
      .select('id,kc_id,kind,body,choices,answer_spec,distractor_misconceptions,context_tag,difficulty_elo')
      .eq('id', attempt.item_id).maybeSingle();
    if (!item) return Response.json({ error: 'That question was retired — start a fresh placement.' }, { status: 410 });

    const response = body?.response && typeof body.response === 'object' ? body.response : {};
    const graded = verify(item, response);

    const { error: resolveErr } = await svc.from('item_attempt').update({
      attempts: 1,
      solved: graded.correct,
      credit: graded.outcome,
      latency_ms: Number.isFinite(Number(response.latencyMs)) ? Math.round(Number(response.latencyMs)) : null,
      resolved_at: new Date(now).toISOString(),
    }).eq('id', attemptId);
    // If this write is dropped, `resolved_at` stays null, the replay skips the
    // row, the run's count never rises, and the learner is served question
    // after question with no error and no way to reach the end. It is the one
    // failure in this route a family would actually experience, so it is the
    // one that must not be swallowed.
    if (resolveErr) throw new Error(`placement answer write failed: ${resolveErr.message}`);

    // Exposure counters drive item rotation everywhere else in the engine; a
    // placement item is as seen as any other.
    await svc.rpc('increment_item_exposure', { item_id: item.id }).then(() => {}, () => {});

    const pool = await readPool(svc);
    const run = await replayRun(svc, userId, sessionId, pool);
    const orderId = body?.orderId ? String(body.orderId) : null;

    // No feedback on the answer. The learner is told the run is progressing and
    // nothing about whether they were right: telling them turns a measurement
    // into a lesson, and a demoralising one for the learner who is behind —
    // which, by design, is most of them.
    if (placementComplete(run.state)) {
      return Response.json(await finishRun(svc, userId, sessionId, run, { orderId, now }));
    }

    const served = await serveNext(svc, userId, sessionId, pool, run);
    if (!served) return Response.json(await finishRun(svc, userId, sessionId, run, { orderId, now }));
    return Response.json(itemPayload(sessionId, served.attemptId, served.item, run));
  } catch (err) {
    if (isMissingSchema(err)) return Response.json(NOT_PROVISIONED);
    console.error('[engine/placement POST]', err?.message);
    return Response.json({ error: 'That didn’t save — try again.' }, { status: 500 });
  }
}
