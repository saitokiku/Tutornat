// Inference cost governor. Spec §6 (C1-C4).
//
// The problem this exists to solve: `usage_ledger.est_cost_usd` has always been
// WRITTEN and never READ. Nothing anywhere stops spending. The only brakes are
// manual booleans an admin flips in `app_settings` after noticing a bill.
//
// Measured on this product's own numbers, a $19.99/mo subscriber running their cap
// costs ~$45/mo in inference even with prompt caching. The caps were chosen for
// generosity, not margin, which means the product loses the most money on its
// most engaged users — the ones whose behaviour proves it works.
//
// So the constraints from §6, made enforceable:
//
//   C1  No frontier model in the per-turn loop. Frontier budget is metered and
//       capped per learner per month.
//   C2  >=95% of exchanges resolve with ZERO LLM calls. Checks, items, hints and
//       misconception feedback are all deterministic — that is why the engine
//       is built the way it is, and this is the telemetry that proves it.
//   C3  Cache everything cacheable; a cached call is counted separately so the
//       cache-hit rate is visible rather than assumed.
//   C4  Small-model-first, with cost alarms.
//
// PURE decision functions + a thin server accessor, so the policy is testable
// without a database.

import { estimateTokens } from '@/lib/server/models.js';

// Per learner per month. Deliberately generous enough that no ordinary learner
// ever meets it, and tight enough that a runaway loop or an abusive account
// cannot produce a four-figure surprise.
//
// EVERY plan key in context.js DEFAULT_LIMITS must appear below. The lookups
// are `BUDGET.monthlyUsd[plan] ?? BUDGET.monthlyUsd.free`, so a plan that is
// missing here is silently governed as a FREE account — which is what club,
// max and both AI tiers were, quietly capping paying members at the free
// ceiling. Harmless while the only spender was text chat (nobody reached it);
// not harmless once a single live-voice session books most of a month's budget
// in one go (H4). Ceilings are ~40-60% of the tier's subscription revenue.
export const BUDGET = {
  // Ceiling on total inference for one learner in one month.
  monthlyUsd: {
    free: 2.50,
    ai_solo: 7.00, ai_hall: 10.00,
    club: 15.00, plus: 20.00, max: 30.00,
    seat: 30.00,   // the standing seat carries Max-level AI (STRATEGY §5.1)
    student: 12.00, family: 12.00,       // retired from sale, still honoured
    internal: 1000,
  },
  // C1: frontier-tier calls are a scarce, budgeted resource — diagnosis and
  // authoring, never the per-turn loop.
  monthlyFrontierCalls: {
    free: 5,
    ai_solo: 20, ai_hall: 20,
    club: 40, plus: 60, max: 100,
    seat: 100,
    student: 30, family: 30,
    internal: 100000,
  },
  // Warn the operator well before the ceiling, so the response is a decision
  // rather than an outage.
  warnAt: 0.75,
  // C2: share of exchanges that must resolve with no model call at all.
  deterministicTarget: 0.95,
};

export const TIER_IS_FRONTIER = { fast: false, tutor: false, deep: true };

/**
 * May this learner spend on inference right now? PURE.
 *
 * Returns { ok, reason, remainingUsd, pctUsed }. Callers degrade rather than
 * fail: a learner at their ceiling still gets the deterministic engine — checks,
 * items, hints, misconception feedback — which is the whole point of building it
 * that way. They lose free-form chat, not learning.
 */
export function canSpend({ plan = 'free', spendUsd = 0, frontierCalls = 0, tier = 'tutor' }) {
  const cap = BUDGET.monthlyUsd[plan] ?? BUDGET.monthlyUsd.free;
  const frontierCap = BUDGET.monthlyFrontierCalls[plan] ?? BUDGET.monthlyFrontierCalls.free;
  const spent = Number(spendUsd) || 0;
  const calls = Number(frontierCalls) || 0;
  const pctUsed = cap > 0 ? spent / cap : 1;

  if (spent >= cap) {
    return {
      ok: false,
      reason: 'monthly_budget',
      remainingUsd: 0,
      pctUsed,
      // Learner-facing, and true: the parts that produce mastery still work.
      message: 'You’ve used this month’s AI conversation budget. Practice and checks still work — those are what confirm what you know.',
    };
  }

  if (TIER_IS_FRONTIER[tier] && calls >= frontierCap) {
    return {
      ok: false,
      reason: 'frontier_calls',
      remainingUsd: cap - spent,
      pctUsed,
      // Not learner-facing — downgrade silently to the cheaper tier instead.
      downgradeTo: 'tutor',
    };
  }

  return {
    ok: true,
    remainingUsd: cap - spent,
    pctUsed,
    warn: pctUsed >= BUDGET.warnAt,
  };
}

/**
 * Cost of a call, using REAL usage when the provider reports it.
 *
 * The old estimator used `text.length / 4` and was blind to PDF and image
 * blocks entirely — so a 20-page PDF intake, by far the most expensive call in
 * the product, was recorded as roughly zero. Anthropic returns exact input,
 * output and cache token counts; use them, and fall back to the estimate only
 * when they are genuinely absent.
 */
export function costOf({ usage = null, model = null, rates, inputText = '', outputText = '' }) {  // eslint-disable-line no-unused-vars
  const r = rates || { in: 3, out: 15 };
  if (usage && Number.isFinite(usage.input_tokens)) {
    const cacheRead = Number(usage.cache_read_input_tokens) || 0;
    const cacheWrite = Number(usage.cache_creation_input_tokens) || 0;
    const fresh = Number(usage.input_tokens) || 0;
    const out = Number(usage.output_tokens) || 0;
    // Anthropic pricing: cache reads ~0.1x input, cache writes ~1.25x.
    const usd = (fresh * r.in + cacheRead * r.in * 0.1 + cacheWrite * r.in * 1.25 + out * r.out) / 1e6;
    return {
      usd: round6(usd),
      inputTokens: fresh + cacheRead + cacheWrite,
      outputTokens: out,
      // The cache split is RETURNED (and persisted by aiCall into the ledger
      // metadata) so the assumed ~47% cache saving is measurable from real
      // traffic instead of assumed (open items B6/B12): saving on a call =
      // cacheReadTokens * r.in * 0.9 / 1e6 versus the uncached price.
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      cacheSavedUsd: round6((cacheRead * r.in * 0.9) / 1e6),
      cached: cacheRead > 0,
      measured: true,
    };
  }
  // Fallback. Flagged `measured: false` so dashboards can show how much of the
  // cost line is guessed rather than reported.
  const inTok = estimateTokens(inputText);
  const outTok = estimateTokens(outputText);
  return {
    usd: round6((inTok * r.in + outTok * r.out) / 1e6),
    inputTokens: inTok,
    outputTokens: outTok,
    cached: false,
    measured: false,
  };
}

/** C2 telemetry: are we actually resolving >=95% of exchanges without a model? */
export function deterministicRate({ totalExchanges = 0, llmCalls = 0 }) {
  const total = Number(totalExchanges) || 0;
  if (total <= 0) return null;
  const rate = 1 - (Number(llmCalls) || 0) / total;
  return {
    rate: round6(rate),
    target: BUDGET.deterministicTarget,
    ok: rate >= BUDGET.deterministicTarget,
  };
}

// ── Server accessors ─────────────────────────────────────────────────────────

/** Current month's spend for a learner. Fails OPEN — a budget read that errors
 *  must never take the tutor down. */
export async function readBudget(svc, userId) {
  if (!svc || !userId) return { spendUsd: 0, frontierCalls: 0, totalCalls: 0, cachedCalls: 0 };
  try {
    const period = new Date();
    period.setUTCDate(1);
    const { data } = await svc.from('inference_budget')
      .select('spend_usd,frontier_calls,total_calls,cached_calls')
      .eq('user_id', userId)
      .eq('period_start', period.toISOString().slice(0, 10))
      .maybeSingle();
    return {
      spendUsd: Number(data?.spend_usd) || 0,
      frontierCalls: Number(data?.frontier_calls) || 0,
      totalCalls: Number(data?.total_calls) || 0,
      cachedCalls: Number(data?.cached_calls) || 0,
    };
  } catch {
    return { spendUsd: 0, frontierCalls: 0, totalCalls: 0, cachedCalls: 0 };
  }
}

/** Record a call. Atomic via the accrue_inference RPC (0015). Best-effort. */
export async function accrue(svc, userId, { usd, tier = 'tutor', cached = false }) {
  if (!svc || !userId) return;
  try {
    await svc.rpc('accrue_inference', {
      p_user: userId,
      p_usd: Number(usd) || 0,
      p_frontier: Boolean(TIER_IS_FRONTIER[tier]),
      p_cached: Boolean(cached),
    });
  } catch { /* metering must never break the product */ }
}

/**
 * One call for routes: check the budget, and say what to do about it.
 * Fails OPEN on error — an unreadable budget must not block a paying learner.
 */
export async function guard(svc, caller, { tier = 'tutor' } = {}) {
  if (!svc || caller?.demo || !caller?.user?.id) return { ok: true, remainingUsd: Infinity };
  const plan = caller.profile?.plan || 'free';
  const b = await readBudget(svc, caller.user.id);
  return canSpend({ plan, spendUsd: b.spendUsd, frontierCalls: b.frontierCalls, tier });
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
