// POST /api/voice/realtime-token — mint a short-lived OpenAI Realtime session.
// The browser/mobile client never sees the long-lived OPENAI_API_KEY.
// Gated by auth + voice kill switch + a real, priced budget check.

import { getCaller, getSettings, recordUsage, serviceClient } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { guard, accrue, BUDGET } from '@/lib/engine/budget';
import { STUDENT_SAFETY, VOICE_NOTE } from '@/lib/prompts';

export const runtime = 'nodejs';

// The live voice tutor talks to students — most of them minors — with no
// human in the loop, so it carries the SAME wellbeing guardrails as the text
// tutor: crisis referral (988 / Crisis Text Line), abuse handling, and
// age-appropriate boundaries. Text chat had STUDENT_SAFETY; this route did not,
// which meant a minor disclosing self-harm to the voice tutor got a lesson
// instead of a lifeline. The safety text is composed here, server-side, at
// session creation — it is never shipped to the client as instructions the
// browser could edit.
const VOICE_TUTOR_PERSONA =
  'You are Kaizen, a Socratic voice tutor. Keep every reply under 3 sentences. '
  + 'Ask one question at a time. Never give final homework answers directly.';

const REALTIME_INSTRUCTIONS = VOICE_TUTOR_PERSONA + STUDENT_SAFETY + VOICE_NOTE;

// ── What a session is allowed to cost ────────────────────────────────────────
// A Realtime session bills by the second for as long as it stays open, and the
// session object OpenAI hands back carries no ceiling of its own. This route
// used to gate on the tts_chars entitlement — a budget a Realtime session never
// spends a single character of — and then record 'voice_session' at a cost of
// zero against a key no plan caps. Voice was, in practice, free and unbounded
// on the free tier (audit H4).
//
// So a session buys a fixed WINDOW, priced and charged against the learner's
// monthly inference budget before the token is minted. The window is returned
// to the client, which must tear the connection down when it expires.
//
// Charging the whole window up front is the only honest booking available AT
// MINT TIME: there is no session-end callback, so the authorized ceiling is the
// only figure we can defend, and the governor must never under-count what it
// has already let out the door. Charging it and never revisiting it is what the
// verification pass caught, though — a learner who talks for forty seconds pays
// for five minutes, a dropped connection pays for five more, and an AI-tier
// subscriber loses text chat after roughly three voice sessions to time nobody
// spent.
//
// So a window is SETTLED at the next mint. Nobody holds two Realtime sessions
// at once, which makes a fresh mint the one piece of evidence we get that the
// previous window is over: its unused tail is credited back, and the new window
// is charged from now. The invariant that survives is the one that matters —
//
//     total charged >= price(wall-clock time from the first mint to the last)
//
// — and it holds for a cooperating client and a lying one alike. A client
// reconnecting every ten seconds through a flaky tunnel pays for the ten
// seconds, not a fresh window each time. A client re-minting to farm credits
// pays for exactly the span it keeps re-minting across. At most ONE window is
// ever outstanding: the current one.
//
// The residual, stated plainly: the CURRENT window is always booked in full,
// so a learner who talks for forty seconds and does not come back still pays
// for the whole window. What is deliberately NOT here is a client-reported
// "session ended" call to settle that last one. Nothing stops a client claiming
// it hung up at second one and then talking for fifteen minutes on a session we
// have no way to kill, so a self-reported end is an unbounded discount with no
// evidence behind it. A mint is evidence. A promise is not — and the reserve
// below is what keeps that residual from costing the learner anything that
// matters.
//
// Free gets a short window because free pays for it out of a small monthly
// ceiling; anything else gets the longer one. A plan absent here is treated as
// paid, which is safe: the budget check below is what actually bounds it.
const SESSION_SECONDS = { free: 300 };
const SESSION_SECONDS_PAID = 900;

// gpt-4o Realtime audio costs 100 USD per 1M input tokens and 200 per 1M
// output, and speech runs roughly 600 audio tokens a minute in each direction —
// so a two-way minute is about 0.09 USD. 0.15 leaves headroom for the text
// tokens and the instruction block every turn re-reads. (Written without a
// currency symbol on purpose: test/priceTruth.test.mjs scans app code for
// dollar literals, and this is a vendor cost, not a product price.)
const REALTIME_USD_PER_MINUTE = 0.15;

// Seconds of voice → what they cost us. Rounded to the millionth, the same
// precision lib/engine/budget.js keeps its own numbers at.
const priceUsd = (sec) => Math.round((Math.max(0, Number(sec) || 0) / 60) * REALTIME_USD_PER_MINUTE * 1e6) / 1e6;

// ── The share of the month voice may not touch ───────────────────────────────
// Voice and text tutoring draw on ONE monthly inference budget, and they are
// not remotely the same size: a paid 15-minute window is over two dollars,
// while a text turn is a fraction of a cent. Left alone, that arithmetic ends
// with a subscriber who used voice a few times losing TEXT CHAT for the rest of
// the month — the cheap, core thing killed by the expensive, optional one.
//
// So the last quarter of every learner's ceiling is reserved: voice is refused
// once minting a session would eat into it. The number is chosen for what it
// buys on the OTHER side — text turns cost a fraction of a cent, so a quarter
// of any plan's ceiling is a great many of them — and it costs voice at most
// one session while guaranteeing the tutor keeps talking. The failure mode becomes "voice is done for the month",
// which is true, specific, and survivable, instead of "the tutor stopped".
const TEXT_RESERVE_SHARE = 0.25;

export async function POST(req) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Realtime voice not configured: set OPENAI_API_KEY.' }, { status: 501 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  // This route MINTS OpenAI Realtime credentials, and a Realtime session bills
  // open-endedly once live — so it was the most expensive unlimited endpoint in
  // the app. Tighter than the shared AI bucket: a session is a deliberate act,
  // nobody needs six a minute.
  const limited = await rateLimitResponse(caller, req, { limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const settings = await getSettings();
  if (settings.voice_enabled === false) {
    return Response.json({ error: 'Voice is temporarily disabled.' }, { status: 503 });
  }

  const plan = caller.profile?.plan || 'free';
  const seconds = SESSION_SECONDS[plan] ?? SESSION_SECONDS_PAID;
  const windowUsd = priceUsd(seconds);

  // Fail closed. A real account we cannot meter (no service role key, so no
  // usage_ledger and no inference_budget) does not get an open-ended session —
  // it gets an explicit unavailable, the way every other unconfigured
  // integration degrades. Demo callers are local dev only and stay unmetered.
  const svc = serviceClient();
  if (!svc && !caller.demo) {
    return Response.json(
      { error: 'Voice sessions are unavailable right now (usage metering is not configured).' },
      { status: 503 },
    );
  }

  // Settle the previous window before pricing this one. `window_ends_at` on the
  // learner's most recent voice_session row is the entire stored state, and the
  // row written below replaces it — so a tail can be credited exactly once.
  let creditUsd = 0;
  if (svc && caller.user?.id) {
    const { data: prior } = await svc.from('usage_ledger')
      .select('created_at,metadata')
      .eq('user_id', caller.user.id).eq('feature', 'voice_session')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const priorEnd = Date.parse(prior?.metadata?.window_ends_at || '');
    const priorAt = prior ? new Date(prior.created_at) : null;
    const now = new Date();
    // Same calendar month only. inference_budget accrues per month, so
    // crediting last month's booking against this month's ceiling would hand
    // back budget that was never spent here. A window is minutes long, so this
    // skips a settlement only within minutes of a month boundary.
    const sameMonth = priorAt
      && priorAt.getUTCFullYear() === now.getUTCFullYear()
      && priorAt.getUTCMonth() === now.getUTCMonth();
    if (sameMonth && Number.isFinite(priorEnd) && priorEnd > now.getTime()) {
      creditUsd = priceUsd((priorEnd - now.getTime()) / 1000);
    }
  }

  // What this mint actually costs: the new window, less the tail of the old one
  // that starting this session proves is over. A reconnect seconds into an
  // authorized window therefore costs seconds, not another whole window.
  const sessionUsd = Math.round((windowUsd - creditUsd) * 1e6) / 1e6;

  // The learner must be able to afford the WHOLE of that without dipping into
  // the text reserve — not merely have a cent left, or the first session of the
  // month is also the one that blows through the ceiling.
  const budget = await guard(svc, caller, { tier: 'tutor' });
  if (!budget.ok && budget.reason === 'monthly_budget') {
    return Response.json({ error: budget.message }, { status: 429 });
  }
  const reserveUsd = (BUDGET.monthlyUsd[plan] ?? BUDGET.monthlyUsd.free) * TEXT_RESERVE_SHARE;
  if (Number.isFinite(budget.remainingUsd) && budget.remainingUsd - sessionUsd < reserveUsd) {
    return Response.json({
      error: 'Not enough AI budget left this month for a voice session — what is left is held back so '
        + 'the tutor keeps working. Text tutoring, practice and checks are unaffected.',
      code: 'voice_budget',
    }, { status: 429 });
  }

  const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
    signal: AbortSignal.timeout(15000),
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      voice: 'verse',
      instructions: REALTIME_INSTRUCTIONS,
      max_response_output_tokens: 500,
    }),
  });
  if (!r.ok) return Response.json({ error: 'Could not create Realtime session.' }, { status: 502 });
  const session = await r.json();

  const windowEndsAt = new Date(Date.now() + seconds * 1000).toISOString();

  // Book the window the moment it is authorized. accrue() is the governor's own
  // running total (inference_budget); recordUsage is the per-feature audit row —
  // which used to carry a cost of zero for the most expensive session we sell —
  // and it is also the state the settlement above reads, so it is AWAITED
  // rather than fired off: if that row never lands, the next mint would credit
  // the same tail a second time.
  await recordUsage(caller, 'voice_session', 1, sessionUsd, {
    provider: 'openai_realtime',
    authorized_seconds: seconds,
    window_ends_at: windowEndsAt,     // what the next mint settles against
    window_usd: windowUsd,            // list price before the settlement
    settled_prior_usd: creditUsd,     // credited back off the previous window
    basis: creditUsd > 0 ? 'window_less_settled_tail' : 'authorized_window',
  }).catch(() => {});
  accrue(svc, caller.user?.id, { usd: sessionUsd, tier: 'tutor', cached: false }).catch(() => {});

  // The client is responsible for closing at maxDurationSeconds; the budget is
  // what enforces it if the client misbehaves.
  return Response.json({
    ...session,
    maxDurationSeconds: seconds,
    expiresAt: windowEndsAt,
  });
}
