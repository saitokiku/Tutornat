// The session driver — where every engine module finally becomes one loop.
// Spec §4.1 F-2, §5.3.
//
// Order of precedence, and each rung is load-bearing:
//   1. safety            preempts everything
//   2. session caps      the system proposes stopping; no infinite sessions
//   3. due checks        retrieval outranks new material — and it is the only
//                        path to confirmed mastery
//   4. isomorphs due     an assisted item's unassisted retry, where credit
//                        actually accrues
//   5. the ladder        worked example -> completion -> independent, chosen by
//                        working mastery, with hints gated behind a real attempt
//
// SERVER ONLY. Everything stateful lives here; the pure decision logic lives in
// policy.js / hints.js / config.js and is unit-tested without a database.

import { activeScheduler } from '@/lib/engine/scheduler.js';
import { nextAction, detectGaming } from '@/lib/engine/policy.js';
import { hintState, applyAttemptEvent, attemptEvidence, isIndependentBlock } from '@/lib/engine/hints.js';
import { check as verifyAnswer, publicItem } from '@/lib/engine/verify/symbolic.js';
import { appendEvidence, recomputeEstimates, isMissingSchema } from '@/lib/engine/ledger.js';
import { DEFAULT_POLICY, resolvePolicy } from '@/lib/engine/config.js';
import { CONFIRM_THRESHOLD } from '@/lib/engine/types.js';

// ── Session lifecycle ────────────────────────────────────────────────────────

export async function startSession(svc, userId, { policy = DEFAULT_POLICY } = {}) {
  const { data, error } = await svc.from('learning_session').insert({
    user_id: userId,
    policy_version: policy.version,
  }).select('id,started_at').maybeSingle();
  if (error) throw new Error(`session start failed: ${error.message}`);
  return { sessionId: data.id, startedAt: data.started_at };
}

export async function endSession(svc, userId, sessionId, reason = 'learner') {
  const { data: s } = await svc.from('learning_session')
    .select('started_at,items_seen,hints_used').eq('id', sessionId).eq('user_id', userId).maybeSingle();
  if (!s) return null;
  const minutes = (Date.now() - new Date(s.started_at).getTime()) / 60000;
  await svc.from('learning_session').update({
    ended_at: new Date().toISOString(),
    end_reason: reason,
    minutes: Math.round(minutes * 10) / 10,
  }).eq('id', sessionId);
  return { minutes: Math.round(minutes), itemsSeen: s.items_seen, hintsUsed: s.hints_used, reason };
}

// ── The loop ─────────────────────────────────────────────────────────────────

/**
 * What should this learner do next? Returns a fully-formed activity the client
 * can render, with every answer key stripped.
 */
export async function nextActivity(svc, userId, sessionId, { now = Date.now(), overrides = null, focusKcId = null } = {}) {
  const policy = resolvePolicy(overrides);
  const scheduler = activeScheduler();

  const session = await loadSession(svc, userId, sessionId);
  if (!session) return { action: 'end_session', reason: 'no_session' };

  const elapsedMin = (now - new Date(session.started_at).getTime()) / 60000;
  if (elapsedMin >= policy.session.hardCapMinutes) {
    return { action: 'end_session', reason: 'hard_cap', message: 'That is a solid stretch. Stopping here — spacing does the rest.' };
  }

  const state = await loadLearnerState(svc, userId);
  if (!state.kcs.length) return { action: 'needs_placement', reason: 'no_kcs' };

  // 4. An isomorph that came due outranks new material: it is the unassisted
  //    retry that turns an assisted success into real evidence.
  const iso = await dueIsomorph(svc, userId, now);
  if (iso) {
    const activity = await buildItemActivity(svc, userId, sessionId, {
      kcId: iso.kc_id, policy, scheduler, state,
      independentBlock: true,          // the retry must be unassisted to count
      isomorphOf: iso.id,
      rung: 'independent',
    });
    if (activity) return { ...activity, because: 'isomorph' };
  }

  // 1-3 + 5: the pure policy decides; this layer only fetches.
  // The focus is threaded through so the concept a parent (or the learner)
  // assigned is the concept this loop actually teaches. Without it the product
  // shows one answer on the dashboard and serves another in the session, which
  // is worse than having no assignment at all. `nextAction` still refuses a
  // focus whose prerequisites are unconfirmed — an assignment chooses among
  // what is reachable, it does not override the lattice.
  const decision = nextAction({
    kcs: state.kcs,
    now,
    sessionMinutes: elapsedMin,
    maxSessionMinutes: policy.session.softCapMinutes,
    focusKcId,
  });

  if (decision.action === 'check') {
    return {
      action: 'check',
      kcIds: decision.kcIds,
      title: state.titleOf[decision.kcIds[0]] || 'Concept',
      estimatedMinutes: decision.estimatedMinutes,
      because: 'checks_due',
    };
  }
  if (decision.action !== 'study') {
    return { action: decision.action, reason: decision.reason };
  }

  const kcId = decision.kcId;
  const rung = decision.activity;

  // The worked-example rung serves Tier-0 content, then a self-explanation
  // menu — studying a solution beats solving one at low prior knowledge, and
  // the menu keeps the processing active without costing an LLM call.
  if (rung === 'worked_example') {
    const example = await tier0(svc, kcId, 'worked_example');
    if (example) {
      const explain = await tier0(svc, kcId, 'self_explain');
      return {
        action: 'worked_example',
        kcId,
        title: state.titleOf[kcId] || 'Concept',
        content: { id: example.id, body: example.body },
        selfExplain: explain ? {
          id: explain.id,
          body: explain.body,
          choices: Array.isArray(explain.choices) ? explain.choices : [],
        } : null,     // answer_index and choice_feedback stay server-side
        because: 'new_concept',
      };
    }
    // No authored example yet — fall through to items rather than dead-end.
  }

  const independentBlock = isIndependentBlock(
    session.items_seen || 0,
    state.confirmedFraction,
    policy
  );

  // Gaming check. A detectable minority exploit the hint ladder — fast repeated
  // hint requests, answer cycling — and it correlates with substantially lower
  // learning. The response is deliberately NOT a lockout: locking a struggling
  // learner out of help is how you lose them. We change what help LOOKS like.
  const recent = await recentAttemptEvents(svc, userId, kcId);
  const gaming = detectGaming(recent);
  const effectiveRung = gaming.gaming ? 'worked_example' : rung;

  if (gaming.gaming && effectiveRung === 'worked_example') {
    const example = await tier0(svc, kcId, 'worked_example');
    if (example) {
      return {
        action: 'worked_example',
        kcId,
        title: state.titleOf[kcId] || 'Concept',
        content: { id: example.id, body: example.body },
        selfExplain: null,
        // One brief process-level message. No accusation, no shaming.
        note: 'Let’s slow this one down and walk through an example together.',
        because: 'gaming_detected',
      };
    }
  }

  const activity = await buildItemActivity(svc, userId, sessionId, {
    kcId, policy, scheduler, state, independentBlock, rung: effectiveRung,
  });
  return activity || { action: 'end_session', reason: 'no_items' };
}

async function buildItemActivity(svc, userId, sessionId, {
  kcId, policy, scheduler, state, independentBlock, rung, isomorphOf = null,
}) {
  const est = state.estOf[kcId] || {};
  const learnerElo = Number(est.learner_elo) || 1200;

  const { data: bank } = await svc.from('kc_item')
    .select('id,kind,tier,body,choices,context_tag,difficulty_elo,exposures')
    .eq('kc_id', kcId).eq('status', 'verified').limit(60);
  if (!bank?.length) return null;

  const { data: seen } = await svc.from('evidence')
    .select('item_id').eq('user_id', userId).eq('kc_id', kcId)
    .not('item_id', 'is', null).order('at', { ascending: false })
    .limit(policy.check.exposureLookback);

  const item = scheduler.pickItem(bank, learnerElo, {
    // Both rungs are acquisition; the review band belongs to the check flow
    // (lib/engine/check.js), which is the only dose-zero path.
    mode: 'acquisition',
    seenIds: (seen || []).map((s) => s.item_id),
    jitter: 40,
  });
  if (!item) return null;

  const { data: attempt, error } = await svc.from('item_attempt').insert({
    user_id: userId, kc_id: kcId, item_id: item.id,
    session_ref: sessionId, isomorph_of: isomorphOf,
    // The server's own independence decision, persisted at ISSUE time (0030).
    // It used to be handed to the client and read back at grade time, which
    // meant the browser could relabel assisted work as unassisted.
    independent_block: independentBlock,
  }).select('id,attempts,hints_used,bottomed_out,solved').maybeSingle();
  if (error) throw new Error(`attempt create failed: ${error.message}`);

  await svc.from('learning_session')
    .update({ items_seen: (state.itemsSeen || 0) + 1 })
    .eq('id', sessionId).then(() => {}, () => {});

  const hs = hintState(attempt, policy, { independentBlock });

  return {
    action: rung === 'completion' ? 'completion' : 'independent',
    kcId,
    title: state.titleOf[kcId] || 'Concept',
    attemptId: attempt.id,
    item: publicItem(item),          // answer key stripped
    independentBlock,
    hints: {
      available: hs.hintsAvailable,
      next: hs.nextHint,
      reason: hs.reason,
      used: 0,
    },
    because: rung,
  };
}

// ── Recording ────────────────────────────────────────────────────────────────

/**
 * A learner answered. Verify server-side, fold the hint ladder, write evidence,
 * recompute. Returns feedback the client can render.
 */
export async function submitAnswer(svc, userId, { attemptId, response, sessionId }, { now = Date.now(), overrides = null } = {}) {
  const policy = resolvePolicy(overrides);

  const { data: attempt } = await svc.from('item_attempt')
    .select('*').eq('id', attemptId).eq('user_id', userId).maybeSingle();
  if (!attempt) return { error: 'not_found', status: 404 };
  if (attempt.resolved_at) return { error: 'already_resolved', status: 409 };

  const { data: item } = await svc.from('kc_item')
    .select('id,kind,answer_spec,distractor_misconceptions,context_tag,difficulty_elo,exposures')
    .eq('id', attempt.item_id).maybeSingle();
  if (!item) return { error: 'no_item', status: 500 };

  const verdict = verifyAnswer(item, response || {});
  const next = applyAttemptEvent(attempt, { type: 'attempt', correct: verdict.correct }, policy, { now });

  // SERVER STATE ONLY (0030). This line used to OR in `response.independentBlock`
  // — a key straight off the wire — so one crafted request flipped assisted work
  // to unassisted: double evidence weight, and `last_instruction_at` never set,
  // which collapsed the 48-hour delay before a check may confirm. The honest
  // client never sent the field; only an attacker had a reason to. requestHint
  // has always used server state alone, and now both paths agree.
  const independentBlock = Boolean(attempt.isomorph_of) || attempt.independent_block === true;
  const exhausted = next.attempts >= policy.hints.attemptsBeforeSolution;
  const resolved = next.solved || next.bottomedOut || exhausted;

  await svc.from('item_attempt').update({
    attempts: next.attempts,
    solved: next.solved,
    credit: next.credit,
    isomorph_due_at: next.isomorphDueAt,
    latency_ms: Number.isFinite(Number(response?.latencyMs)) ? Math.round(Number(response.latencyMs)) : null,
    resolved_at: resolved ? new Date(now).toISOString() : null,
  }).eq('id', attemptId);

  // Evidence only on resolution — a wrong first attempt that the learner then
  // gets right is one learning event, not two data points.
  let estimate = null;
  if (resolved) {
    await appendEvidence(svc, userId, [attemptEvidence(next, {
      kcId: attempt.kc_id,
      itemId: item.id,
      contextTag: item.context_tag,
      independentBlock,
      sourceRef: `session:${sessionId || attempt.session_ref || ''}`,
      now,
    })]);
    const [e] = await recomputeEstimates(svc, userId, { kcIds: [attempt.kc_id], now });
    estimate = e ? { working: e.working, confirmed: e.confirmed, confidence: e.confidence } : null;
  }

  // Elaborated feedback beats bare right/wrong, and a matched misconception
  // means we can name the actual error instead of saying "try again".
  const feedback = await buildFeedback(svc, {
    verdict, attempt: next, exhausted, independentBlock,
  });

  return {
    ok: true,
    correct: verdict.correct,
    outcome: verdict.outcome,
    resolved,
    credit: next.credit,
    attempts: next.attempts,
    feedback,
    estimate,
    hints: hintState({ ...attempt, ...next, hints_used: next.hintsUsed }, policy, { independentBlock }),
  };
}

/** A hint was requested. Costs mastery credit; recorded so fading is measurable. */
export async function requestHint(svc, userId, { attemptId }, { now = Date.now(), overrides = null } = {}) {
  const policy = resolvePolicy(overrides);
  const { data: attempt } = await svc.from('item_attempt')
    .select('*').eq('id', attemptId).eq('user_id', userId).maybeSingle();
  if (!attempt) return { error: 'not_found', status: 404 };

  const independentBlock = Boolean(attempt.isomorph_of);
  const before = hintState(attempt, policy, { independentBlock });
  if (!before.hintsAvailable) {
    return { error: before.reason === 'attempt_required' ? 'attempt_required' : 'unavailable', status: 409, reason: before.reason };
  }

  const wantSolution = before.nextHint === 'solution';
  const next = applyAttemptEvent(
    attempt,
    { type: wantSolution ? 'solution' : 'hint' },
    policy,
    { now }
  );

  const content = wantSolution
    ? (await tier0(svc, attempt.kc_id, 'solution')) || (await tier0(svc, attempt.kc_id, 'worked_example'))
    : await tier0(svc, attempt.kc_id, 'hint', { level: next.hintsUsed });

  await svc.from('item_attempt').update({
    hints_used: next.hintsUsed,
    bottomed_out: next.bottomedOut,
    credit: next.credit,
    isomorph_due_at: next.isomorphDueAt,
  }).eq('id', attemptId);

  await svc.rpc('increment_session_hints', { p_session: attempt.session_ref }).then(() => {}, () => {});

  return {
    ok: true,
    kind: wantSolution ? 'solution' : 'hint',
    body: content?.body || (wantSolution
      ? 'Here is the full working — take a look, then a similar one comes back shortly.'
      : 'Try re-reading what the question is actually asking for.'),
    contentId: content?.id || null,
    credit: next.credit,
    // Said plainly and without guilt: the credit moves to the unassisted retry.
    note: wantSolution
      ? 'No problem. A similar question comes back in a bit — that one is where it counts.'
      : null,
    hints: hintState({ ...attempt, ...next, hints_used: next.hintsUsed }, policy, { independentBlock }),
  };
}

/** Menu self-explanation (§4.1 F-7). Machine-checkable, so it costs nothing. */
export async function submitSelfExplain(svc, userId, { contentId, choice }) {
  const { data: c } = await svc.from('kc_content')
    .select('id,kc_id,answer_index,choice_feedback').eq('id', contentId).maybeSingle();
  if (!c) return { error: 'not_found', status: 404 };

  const picked = Number(choice);
  const correct = Number.isInteger(picked) && picked === Number(c.answer_index);
  const fb = Array.isArray(c.choice_feedback) ? c.choice_feedback : [];

  // Deliberately writes NO evidence: self-explanation is processing support,
  // not an assessment, and treating it as one would be exactly the
  // assisted-performance-as-mastery mistake this engine exists to prevent.
  return {
    ok: true,
    correct,
    feedback: fb[picked] || (correct ? 'That is the one.' : 'Not quite — look at the example again.'),
  };
}

// ── Loaders ──────────────────────────────────────────────────────────────────

async function loadSession(svc, userId, sessionId) {
  const { data } = await svc.from('learning_session')
    .select('id,started_at,items_seen,hints_used,ended_at')
    .eq('id', sessionId).eq('user_id', userId).maybeSingle();
  return data && !data.ended_at ? data : null;
}

async function loadLearnerState(svc, userId) {
  const [{ data: links }, { data: estimates }] = await Promise.all([
    svc.from('learner_kc').select('kc_id,local_title').eq('user_id', userId),
    svc.from('kc_estimate')
      .select('kc_id,working,confirmed,learner_elo,next_check_at,dose_slope,human_recommended')
      .eq('user_id', userId),
  ]);

  const ids = (links || []).map((l) => l.kc_id);
  const { data: kcs } = ids.length
    ? await svc.from('kc').select('id,title').in('id', ids)
    : { data: [] };
  const { data: edges } = ids.length
    ? await svc.from('kc_edge').select('from_kc,to_kc,kind').in('to_kc', ids)
    : { data: [] };

  const estOf = Object.fromEntries((estimates || []).map((e) => [e.kc_id, e]));
  const canonical = Object.fromEntries((kcs || []).map((k) => [k.id, k.title]));
  const titleOf = Object.fromEntries((links || []).map((l) => [l.kc_id, l.local_title || canonical[l.kc_id] || 'Concept']));

  const prereqsOf = {};
  for (const e of edges || []) if (e.kind === 'prerequisite') (prereqsOf[e.to_kc] ||= []).push(e.from_kc);

  const shaped = (links || []).map((l) => ({
    kcId: l.kc_id,
    working: Number(estOf[l.kc_id]?.working) || 0,
    confirmed: Number(estOf[l.kc_id]?.confirmed) || 0,
    nextCheckAt: estOf[l.kc_id]?.next_check_at || null,
    humanRecommended: Boolean(estOf[l.kc_id]?.human_recommended),
    prereqs: prereqsOf[l.kc_id] || [],
  }));

  const confirmedCount = shaped.filter((k) => k.confirmed >= CONFIRM_THRESHOLD).length;

  return {
    kcs: shaped,
    estOf,
    titleOf,
    confirmedFraction: shaped.length ? confirmedCount / shaped.length : 0,
    itemsSeen: 0,
  };
}

/** Recent attempt/hint events on a KC, shaped for the gaming detector. */
async function recentAttemptEvents(svc, userId, kcId) {
  const { data } = await svc.from('item_attempt')
    .select('attempts,hints_used,bottomed_out,solved,latency_ms')
    .eq('user_id', userId).eq('kc_id', kcId)
    .order('created_at', { ascending: false }).limit(12);
  const events = [];
  for (const a of data || []) {
    for (let i = 0; i < (a.hints_used || 0); i++) {
      events.push({ type: 'hint', latencyMs: a.latency_ms, level: a.bottomed_out ? 'bottom' : 'mid' });
    }
    if (a.attempts) {
      events.push({ type: 'answer', correct: a.solved, latencyMs: a.latency_ms });
    }
  }
  return events;
}

async function dueIsomorph(svc, userId, now) {
  const { data } = await svc.from('item_attempt')
    .select('id,kc_id,isomorph_due_at')
    .eq('user_id', userId)
    .not('isomorph_due_at', 'is', null)
    .is('resolved_at', null)
    .lte('isomorph_due_at', new Date(now).toISOString())
    .order('isomorph_due_at', { ascending: true })
    .limit(1);
  return data?.[0] || null;
}

async function tier0(svc, kcId, kind, { level = null } = {}) {
  let q = svc.from('kc_content')
    .select('id,body,choices,answer_index,level')
    .eq('kc_id', kcId).eq('kind', kind)
    .eq('status', 'verified').eq('disabled', false);
  if (level != null) q = q.eq('level', level);
  const { data } = await q.order('level', { ascending: true }).limit(1);
  return data?.[0] || null;
}

async function buildFeedback(svc, { verdict, attempt, exhausted, independentBlock }) {
  if (verdict.correct) {
    // Task-level, never person-level. No "you're so smart".
    return {
      tone: 'correct',
      body: attempt.credit >= 1 ? 'Correct.' : 'Correct — that one took some help, so a similar one comes back later.',
    };
  }

  // A matched misconception names the actual error. Elaborated feedback is the
  // form with the real effect size; bare "try again" is the form that does least.
  if (verdict.matchedMisconception) {
    const { data: m } = await svc.from('kc_misconception')
      .select('label,feedback_md').eq('id', verdict.matchedMisconception).maybeSingle();
    if (m) return { tone: 'diagnosed', label: m.label, body: m.feedback_md };
  }

  if (independentBlock) {
    return { tone: 'incorrect', body: 'Not this time. We will come back to this one.' };
  }
  if (exhausted) {
    return { tone: 'exhausted', body: 'Let us look at the full working together — no problem.' };
  }
  return { tone: 'incorrect', body: 'Not quite. Have another look — you can ask for a hint once you have tried.' };
}

export { isMissingSchema };
