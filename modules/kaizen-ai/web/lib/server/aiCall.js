// One metered path for every non-streaming model call. SERVER ONLY.
//
// WHY THIS EXISTS
// The cost governor (lib/engine/budget.js) was wired into /api/chat only. Nine
// other routes still called Anthropic directly with:
//   - no budget check      (spend was recorded, never checked)
//   - no prompt caching    (the system prompt re-billed at full price each call)
//   - length/4 costing     (blind to document and image blocks, so the single
//                           most expensive call in the product — a 20MB PDF
//                           intake — was recorded as roughly $0)
//
// Every one of those routes now goes through here, so adding a tenth cannot
// quietly reintroduce the gap: there is one place to call, and it does the
// right thing by default.
//
// The PDF/image intake path (lib/server/intakeCore.js) was the last holdout and
// the worst one — the header above described its cost bug while the call itself
// still bypassed this module. It routes through here as of the 2026-08-18 audit
// (H5), passing `ledger: false` because both intake routes write their own
// `syllabus_parse` ledger row and a second one would double-count the caller's
// entitlement. Nothing opts out of the budget.

import Anthropic from '@anthropic-ai/sdk';
import { RATES } from '@/lib/server/models';
import { guard, accrue, costOf } from '@/lib/engine/budget';
import { recordUsage, serviceClient } from '@/lib/server/context';

const anthropic = new Anthropic({ timeout: 55_000, maxRetries: 1 });

// Prompt caching is the single biggest cost lever. The SDK now types
// `cache_control` natively (upgraded 0.32.1 → 0.116.x, 2026-08-13; caching is
// GA), so the compiler checks what only a runtime guard used to. The guard
// stays anyway: if the API ever rejects the field, caching disables
// process-wide and the call retries bare — the product never goes down over a
// cost optimisation.
let cachingSupported = true;
function isCacheRejection(err) {
  const m = String(err?.message || '').toLowerCase();
  return m.includes('cache_control') || (m.includes('cache') && m.includes('unsupported'));
}

/**
 * A budgeted, cached, honestly-costed model call.
 *
 * @param {Object}  opts
 * @param {Object}  opts.caller     from getCaller()
 * @param {string}  opts.model
 * @param {string}  [opts.system]   cached automatically when worth it
 * @param {Array}   opts.messages
 * @param {number}  opts.maxTokens
 * @param {string}  opts.feature    usage_ledger feature key
 * @param {string}  opts.tier       'fast' | 'tutor' | 'deep' (frontier budget)
 * @param {Object}  [opts.meta]     extra metadata for the ledger
 * @param {boolean} [opts.hardFail] true → over budget throws; false → returns null
 * @param {boolean} [opts.ledger]   false → the CALLER writes the usage_ledger row.
 *                                  Only for a caller that already writes one with
 *                                  metadata only it has (intake), because
 *                                  checkEntitlement COUNTS those rows and a
 *                                  duplicate halves the plan's real allowance.
 *                                  It never skips the budget accrual below —
 *                                  the governor sees every call regardless.
 *
 * @returns {Promise<{text: string, cost: Object, raw: Object}|null>} null when over budget
 *          and hardFail is false, so callers can degrade rather than error.
 */
export async function meteredCall({
  caller, model, system, messages, maxTokens = 800,
  feature = 'tutor_message', tier = 'tutor', meta = {}, hardFail = false, ledger = true,
}) {
  const svc = serviceClient();

  // C1: check BEFORE spending. A learner at their ceiling keeps the
  // deterministic engine — they lose generated prose, not learning.
  const budget = await guard(svc, caller, { tier });
  if (!budget.ok && budget.reason === 'monthly_budget') {
    if (hardFail) {
      const err = /** @type {Error & {code?: string}} */ (new Error(budget.message));
      err.code = 'over_budget';
      throw err;
    }
    return null;
  }
  // A frontier-capped caller silently drops to the cheaper tier rather than
  // failing mid-task.
  const effectiveTier = (!budget.ok && budget.downgradeTo) ? budget.downgradeTo : tier;

  // C3: cache the system prompt. Anthropic requires a minimum cacheable prefix,
  // so only mark it when it is actually long enough to pay for itself —
  // otherwise the cache-write surcharge makes short calls MORE expensive.
  const CACHE_MIN_CHARS = 2048;
  const wantsCache = cachingSupported && system && system.length >= CACHE_MIN_CHARS;

  const send = (useCache) => anthropic.messages.create({
    model, max_tokens: maxTokens,
    ...(system
      ? {
          system: useCache
            ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
            : system,
        }
      : {}),
    messages,
  });

  let msg;
  try {
    msg = await send(wantsCache);
  } catch (err) {
    if (wantsCache && isCacheRejection(err)) {
      console.warn('[aiCall] prompt caching rejected by the API — disabling for this process');
      cachingSupported = false;
      msg = await send(false);
    } else {
      throw err;
    }
  }

  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');

  // Real reported tokens, including cache reads/writes and any document or
  // image blocks the old estimator could not see. The estimator's input text is
  // built ONLY when the API reported no usage: an intake call carries a whole
  // base64 PDF in `messages`, and serializing tens of megabytes to compute a
  // number we then discard is its own kind of expensive.
  const reported = msg.usage && Number.isFinite(msg.usage.input_tokens) ? msg.usage : null;
  const cost = costOf({
    usage: reported,
    model,
    rates: RATES[model],
    inputText: reported ? '' : (system || '') + JSON.stringify(messages).slice(0, 20000),
    outputText: text,
  });

  // The cache split lands in the ledger so the assumed ~47% cache saving is
  // finally measurable from production rows (B6/B12): sum cache_saved_usd
  // against est_cost_usd over any window.
  if (ledger) {
    recordUsage(caller, feature, 1, cost.usd, {
      model, cached: cost.cached, measured: cost.measured,
      input_tokens: cost.inputTokens, output_tokens: cost.outputTokens,
      cache_read_tokens: cost.cacheReadTokens || 0,
      cache_write_tokens: cost.cacheWriteTokens || 0,
      cache_saved_usd: cost.cacheSavedUsd || 0,
      ...meta,
    }).catch(() => {});
  }
  accrue(svc, caller?.user?.id, { usd: cost.usd, tier: effectiveTier, cached: cost.cached })
    .catch(() => {});

  return { text, cost, raw: msg };
}

/** Extract the first JSON object from a model reply. Shared by every route that
 *  asks for JSON, all of which had their own copy of this regex. */
export function parseJsonReply(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}
