// POST /api/chat — the tutor. Streams Claude text back as plain text.
// Auth: Bearer JWT when Supabase is configured; demo mode otherwise.
// Metered: tutor_message + token cost estimate into usage_ledger.

import Anthropic from '@anthropic-ai/sdk';
import {
  buildSocraticPrompt, buildCuriousPrompt, RICH_OUTPUT, VOICE_NOTE, STUDENT_SAFETY,
  minorDutiesApply, minorDutiesSection, sittingClock,
  MINOR_AI_DISCLOSURE, MINOR_BREAK_REMINDER,
} from '@/lib/prompts';
import { getCaller, getSettings, checkEntitlement, recordUsage, serviceClient, agePosture } from '@/lib/server/context';
import { MODELS, pickModel } from '@/lib/server/models';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { screenAndRecord } from '@/lib/server/moderation';
import { captureException } from '@/lib/monitoring';
import { guard, accrue, costOf } from '@/lib/engine/budget';
import { RATES } from '@/lib/server/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

const anthropic = new Anthropic({ timeout: 55_000, maxRetries: 1 }); // fit within maxDuration 60 (audit REL-007)

// See lib/server/aiCall.js — caching is unverified against the pinned SDK, so it
// must never be able to take the tutor down.
let cachingSupported = true;

// ── The three-hour clock, read from the ledger ───────────────────────────────
// docs/legal/REVIEW_QUEUE.md item 21, spec W5. The decision itself is pure and
// lives in lib/prompts.js (sittingClock, with the note on why the engine's
// session cap is a different clock); this is the only I/O it needs.
//
// Free-form chat holds no session row, so the sitting is reconstructed from the
// one durable trace every tutor turn already leaves: its usage_ledger row,
// indexed by (user_id, created_at) since 0001. One narrow index scan on a path
// that is about to spend seconds and cents on a model call.
//
// The window and the row cap can only ever UNDER-measure a sitting — an older
// turn we did not read makes the sitting look younger, which delays a reminder
// and never invents one. Reaching either bound needs 500 messages inside 24
// hours with no half-hour break, which no entitlement tier allows.
const SITTING_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const SITTING_ROW_CAP = 500;

async function readSitting(svc, userId, now) {
  if (!svc || !userId) return { fresh: true, breakDue: false };
  try {
    const { data, error } = await svc
      .from('usage_ledger')
      .select('created_at')
      .eq('user_id', userId)
      .eq('feature', 'tutor_message')
      .gte('created_at', new Date(now - SITTING_LOOKBACK_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(SITTING_ROW_CAP);
    if (error) throw new Error(error.message);
    return sittingClock((data || []).map((r) => Date.parse(r.created_at)), { now });
  } catch {
    // A clock we cannot read must never cost a student their reply. Failing to
    // `fresh` fails toward the disclosure — the duty we would rather over-serve
    // — while the break reminder is simply skipped for this turn.
    return { fresh: true, breakDue: false };
  }
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('Tutor not configured: set ANTHROPIC_API_KEY on the server.', { status: 501 });
  }

  const caller = await getCaller(req);
  if (!caller) return new Response('Sign in to use the tutor.', { status: 401 });

  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const settings = await getSettings();
  if (settings.maintenance_mode === true) {
    return new Response('Kaizen is briefly down for maintenance. Back soon.', { status: 503 });
  }
  if (settings.tutor_enabled === false) {
    return new Response('The tutor is temporarily disabled by the administrator.', { status: 503 });
  }

  const ent = await checkEntitlement(caller, 'tutor_message');
  if (!ent.ok) return new Response(ent.reason, { status: 429 });

  // Spec §6 C1: spend is CHECKED, not merely recorded. est_cost_usd has always
  // been written and never read — nothing in the product stopped spending. A
  // learner at their ceiling still gets the deterministic engine (checks, items,
  // hints), which is the whole reason it was built that way: they lose free-form
  // chat, not learning.
  const svcForBudget = serviceClient();
  const budget = await guard(svcForBudget, caller, { tier: 'tutor' });
  if (!budget.ok && budget.reason === 'monthly_budget') {
    return new Response(budget.message, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { messages, concept, mode = 'socratic', documents = [], studentName = '', learningStyle = '', voice = false, mastery = null } = body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 80) {
    return new Response('messages must be a non-empty array (max 80)', { status: 400 });
  }
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
      return new Response('invalid message shape', { status: 400 });
    }
    if (m.content.length > 8000) return new Response('message too long', { status: 400 });
  }

  // Safety screen on the newest student turn. STUDENT_SAFETY makes the tutor
  // RESPOND to a crisis in-conversation; this makes sure a human on the safety
  // team also LEARNS it happened. Fire-and-forget: a real account only (never
  // demo), never awaited, so it adds no latency to the reply and a screening
  // failure cannot break the conversation.
  if (!caller.demo && caller.user?.id) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      screenAndRecord(serviceClient(), {
        userId: caller.user.id, text: lastUser.content, source: 'chat',
      }).catch(() => {});
    }
  }

  // Sanitize the client-supplied mastery hint (never trust the body blindly).
  const safeMastery = mastery && typeof mastery === 'object' ? {
    pct: Number.isFinite(Number(mastery.pct)) ? Math.max(0, Math.min(100, Number(mastery.pct))) : null,
    status: ['good', 'warn', 'bad'].includes(mastery.status) ? mastery.status : undefined,
    lastQuality: Number.isInteger(mastery.lastQuality) ? mastery.lastQuality : null,
    seen: Boolean(mastery.seen),
  } : null;

  const base = mode === 'curious'
    ? buildCuriousPrompt(concept, { studentName })
    : buildSocraticPrompt(concept, {
        studentName, learningStyle,
        documents: (documents || []).slice(0, 3),
        teach: mode === 'lesson',
        mastery: safeMastery,
      });
  // The known-minor duties (spec W5). `agePosture` is the same reading of the
  // profile that the guardian gate uses, and minorDutiesApply is the single
  // place that decides what 'unknown' means — see the note beside it.
  const knownMinor = minorDutiesApply(agePosture(caller.profile));
  // The ledger is only worth a round trip for a caller it can say something
  // about. A demo caller (local dev, no auth, no ledger) is left to the thread
  // heuristic below rather than being told it is an AI on every single turn.
  const now = Date.now();
  const sitting = knownMinor && !caller.demo
    ? await readSitting(svcForBudget, caller.user?.id, now)
    : { fresh: false, breakDue: false };
  // Two ways a turn can open a sitting: the ledger says nothing has happened for
  // half an hour, or the thread in front of us carries no assistant turn yet —
  // a conversation that has not started cannot be in the middle of one.
  const duties = minorDutiesSection({
    knownMinor,
    firstTurn: sitting.fresh || !messages.some((m) => m.role === 'assistant'),
    breakDue: sitting.breakDue,
  });

  // Safety rules ride on every student chat; then voice → speak in words
  // (no markup) or text → rich renderer syntax. The duties sit BEFORE the safety
  // block so that "these override all other instructions" is still the last word
  // on the subject — a break reminder must never read as licence to skip a
  // crisis response.
  //
  // On the cache (§6 C3, below): `duties` is non-empty on at most two turns of a
  // sitting, and the first of those is a cold cache anyway — the ephemeral entry
  // has long expired across the half-hour of silence that made the sitting new.
  // So the whole cost of this is one extra cache write every three hours.
  const system = base + duties + STUDENT_SAFETY + (voice ? VOICE_NOTE : RICH_OUTPUT);

  const model = pickModel('tutor', settings, caller.profile?.plan);
  const inputText = system + messages.map((m) => m.content).join('\n');

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      let usage = null;
      try {
        // §6 C3: cache the stable prefix. The system prompt carries the
        // safety rules, the output contract and up to 3 documents — it is the
        // largest and most repeated part of every turn, and it was being
        // re-billed at full price on each one.
        // Same self-disabling guard as lib/server/aiCall.js: the pinned SDK
        // predates cache_control in its types, so a rejection must degrade to an
        // uncached call rather than breaking the tutor.
        const open = (useCache) => anthropic.messages.stream(/** @type {any} */ ({
          model,
          max_tokens: 1500,
          system: useCache
            ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
            : system,
          messages,
        }));
        let stream;
        try {
          stream = open(cachingSupported);
        } catch {
          cachingSupported = false;
          stream = open(false);
        }
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
          // Real token counts, including cache reads/writes.
          if (event.type === 'message_start' && event.message?.usage) usage = { ...event.message.usage };
          if (event.type === 'message_delta' && event.usage) usage = { ...(usage || {}), ...event.usage };
        }
      } catch (err) {
        captureException(err, { route: 'chat', model, plan: caller.profile?.plan });
        controller.enqueue(encoder.encode('\n[error] ' + (err?.message || 'stream failed')));
      } finally {
        controller.close();
        // Cost from REPORTED usage when available. The old estimator used
        // length/4 and was blind to document and image blocks entirely, so the
        // most expensive calls in the product were recorded as ~$0.
        const cost = costOf({ usage, model, rates: RATES[model], inputText, outputText: full });
        recordUsage(caller, 'tutor_message', 1, cost.usd, {
          model, mode, concept: (concept || '').slice(0, 80),
          input_tokens: cost.inputTokens, output_tokens: cost.outputTokens,
          cached: cost.cached, measured: cost.measured,
          // A duty performed with no record of it is a duty we cannot show we
          // performed. These two flags are the whole audit trail for item 21.
          ai_disclosure: duties.includes(MINOR_AI_DISCLOSURE),
          break_reminder: duties.includes(MINOR_BREAK_REMINDER),
        }).catch(() => {});
        accrue(svcForBudget, caller.user?.id, { usd: cost.usd, tier: 'tutor', cached: cost.cached }).catch(() => {});
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
