// The cost governor must be able to SEE every call that spends money.
//
// Two holes from the 2026-08-18 audit, both of them money leaving the building
// with no row to show for it:
//
//   H5  PDF/image intake called Anthropic directly — no budget check, no prompt
//       caching, and a length/4 cost estimate blind to document and image
//       blocks, so the single most expensive call class in the product was
//       recorded at roughly zero while a free learner ran past their ceiling.
//   H4  /api/voice/realtime-token gated on a `tts_chars` proxy a Realtime
//       session never spends, then recorded 'voice_session' at zero cost
//       against a key no plan caps: unbounded OpenAI spend on the free tier.
//
// Both fixes are wiring, and wiring is exactly what a refactor drops silently —
// hence source-level pins, the same way voiceSafety.test.mjs pins the safety
// block into the voice route.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUDGET } from '@/lib/engine/budget.js';
import { DEFAULT_LIMITS } from '@/lib/server/context.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...p) => readFileSync(join(here, '..', ...p), 'utf8');

const intakeCore = src('lib', 'server', 'intakeCore.js');
const intakeRoute = src('app', 'api', 'intake', 'route.js');
const ingestRoute = src('app', 'api', 'intake', 'ingest', 'route.js');
const voiceRoute = src('app', 'api', 'voice', 'realtime-token', 'route.js');
const aiCall = src('lib', 'server', 'aiCall.js');

// ── H5: intake spends through the one metered path ───────────────────────────

test('intake extraction goes through meteredCall, not a private Anthropic client', () => {
  assert.match(intakeCore, /meteredCall/, 'intakeCore must call the metered path');
  assert.doesNotMatch(
    intakeCore, /messages\.create/,
    'a direct model call here bypasses the budget guard, prompt caching and reported-token costing',
  );
  assert.doesNotMatch(
    intakeCore, /estimateCost/,
    'length/4 costing cannot see a PDF or an image block — cost must come from reported usage',
  );
});

test('both intake front doors hand runIntake the caller the budget is charged to', () => {
  // guard() fails open on an unknown caller, so a call site that forgets this
  // is unmetered and looks exactly like a working one.
  for (const [name, route] of [['/api/intake', intakeRoute], ['/api/intake/ingest', ingestRoute]]) {
    const call = route.match(/runIntake\(\{[\s\S]*?\}\)/);
    assert.ok(call, `${name} should call runIntake`);
    assert.match(call[0], /(^|[\s{,])caller\s*[,}]/, `${name} must pass caller to runIntake`);
  }
});

test('intake writes exactly one usage_ledger row per parse', () => {
  // checkEntitlement COUNTS ledger rows, so a second row would halve every
  // plan's real syllabus_parse allowance. The routes own the row; the core
  // opts out and the budget accrual happens regardless.
  assert.match(intakeCore, /ledger:\s*false/, 'runIntake must not write a second ledger row');
  assert.match(intakeRoute, /recordUsage\(caller,\s*'syllabus_parse'/);
  assert.match(ingestRoute, /recordUsage\(caller,\s*'syllabus_parse'/);
  // ...and the opt-out must never reach the governor.
  const accrual = aiCall.slice(aiCall.indexOf('if (ledger)'));
  assert.match(accrual, /accrue\(/, 'accrue must sit OUTSIDE the ledger opt-out');
});

// ── H4: a voice session costs something ──────────────────────────────────────

test('the Realtime route no longer gates on a budget voice never spends', () => {
  // (The route's prose may name the old gate; the CALL must be gone.)
  assert.doesNotMatch(
    voiceRoute, /checkEntitlement\([^)]*tts_chars/,
    'a Realtime session spends no TTS characters — that gate metered nothing',
  );
});

test('a Realtime session is priced, bounded, and booked before it is minted', () => {
  assert.match(voiceRoute, /guard\(/, 'the budget must be checked BEFORE the token is minted');
  assert.match(voiceRoute, /accrue\(/, 'the authorized window must be booked against the budget');
  // The recorded cost must be the computed session price, never a literal 0.
  assert.match(
    voiceRoute, /recordUsage\(caller,\s*'voice_session',\s*1,\s*sessionUsd/,
    'the ledger row must carry the session price',
  );
  assert.match(voiceRoute, /maxDurationSeconds/, 'the session must carry a duration cap');
  // Minting must precede nothing: an unmeterable real caller gets an explicit
  // unavailable rather than a free unlimited session.
  assert.ok(
    voiceRoute.indexOf('!svc && !caller.demo') < voiceRoute.indexOf('api.openai.com'),
    'the "cannot meter" refusal must come before the OpenAI call',
  );
});

// ── The budget table must cover every plan we sell ───────────────────────────

test('every plan has its own inference ceiling', () => {
  // canSpend resolves `BUDGET.monthlyUsd[plan] ?? BUDGET.monthlyUsd.free`, so a
  // missing plan is governed as a free account — invisible until a paying
  // member is cut off. Voice books a whole session at once, which is where that
  // silence turns into a support ticket.
  for (const plan of Object.keys(DEFAULT_LIMITS)) {
    assert.equal(typeof BUDGET.monthlyUsd[plan], 'number', `plan "${plan}" has no monthly inference ceiling`);
    assert.equal(typeof BUDGET.monthlyFrontierCalls[plan], 'number', `plan "${plan}" has no frontier-call ceiling`);
    if (plan === 'free') continue;
    assert.ok(
      BUDGET.monthlyUsd[plan] > BUDGET.monthlyUsd.free,
      `paid plan "${plan}" is capped at or below the free ceiling`,
    );
  }
});
