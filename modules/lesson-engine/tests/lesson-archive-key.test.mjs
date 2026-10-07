// The cache KEY in isolation.
//
// Why this file exists separately from the HTTP partition tests: those tests prove the
// end-to-end guarantee (no learner is ever served another learner's lesson), but they
// pass even when a field is missing from the key, because the cache-hit revalidation
// catches the mismatch and regenerates. That is correct defence in depth and it is worth
// keeping — but it means the HTTP tests alone do not pin the KEY. A key missing a field
// would still be safe and would silently regenerate forever, which defeats the entire
// point of the archive. So the fingerprint is asserted directly here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonFingerprint } from '../server.mjs';
import { lessonKey } from '../lesson-store.mjs';

const CTX = { model: 'claude-opus-5', provider: 'subprocess', generator: 'python3 ai_bridge.py',
  promptDoc: '## scope\nteach safely' };
const V2 = { version: 2, age: 9, goal: 'understand halves', locale: 'en' };
const V1 = { version: 1, subject: 'math', grade: '3', goal: 'understand halves', locale: 'en' };

const keyOf = (req, ctx = CTX) => lessonKey(lessonFingerprint(req, ctx));

/** Changing `field` must change the key, or two different requests share one lesson. */
function distinct(label, a, b, ctxA = CTX, ctxB = CTX) {
  test(`${label} changes the cache key`, () => {
    assert.notEqual(keyOf(a, ctxA), keyOf(b, ctxB), `${label} is NOT in the cache key`);
  });
}

test('an identical request produces an identical key', () => {
  assert.equal(keyOf(V2), keyOf({ ...V2 }));
  // Field order must be irrelevant, or the same request regenerates when typed
  // differently.
  assert.equal(keyOf(V2), keyOf({ locale: 'en', goal: 'understand halves', age: 9, version: 2 }));
});

// --- the learner's own parameters
distinct('age', V2, { ...V2, age: 10 });
distinct('age by one year (no bands)', { ...V2, age: 10 }, { ...V2, age: 11 });
distinct('locale', V2, { ...V2, locale: 'es' });
distinct('goal', V2, { ...V2, goal: 'understand thirds' });
distinct('goal whitespace', V2, { ...V2, goal: 'understand  halves' });
distinct('goal case', V2, { ...V2, goal: 'Understand halves' });

// --- dialect: v1 and v2 are never substitutes
distinct('request dialect (v1 vs v2)', V1, V2);
distinct('v1 subject', V1, { ...V1, subject: 'english' });
distinct('v1 grade', V1, { ...V1, grade: '4' });

// --- adaptive context
const PREV = { ...V2, previous: { goal: 'halves intro', reason: 'got it wrong' } };
distinct('presence of previous', V2, PREV);
distinct('previous.reason', PREV, { ...V2, previous: { goal: 'halves intro', reason: 'was too easy' } });
distinct('previous.goal', PREV, { ...V2, previous: { goal: 'other intro', reason: 'got it wrong' } });

// --- generation recipe
distinct('model', V2, V2, CTX, { ...CTX, model: 'claude-other-9' });
distinct('provider/transport', V2, V2, CTX, { ...CTX, provider: 'anthropic' });
distinct('generator command', V2, V2, CTX, { ...CTX, generator: 'node other-bridge.mjs' });
distinct('teaching guidance document', V2, V2, CTX, { ...CTX, promptDoc: '## scope\nteach differently' });

test('the key material contains nothing personal about a learner', () => {
  const fp = lessonFingerprint(PREV, CTX);
  const keys = Object.keys(fp).sort();
  // 'prompt', 'system' and 'implementation' were ADDED by the hardening pass: the static
  // contract hash in 'recipe' does not change when the rendered prompt wording, the
  // SYSTEM text or the bridge implementation changes, so each is its own key field.
  assert.deepEqual(keys, ['age', 'generator', 'goal', 'grade', 'guidance', 'implementation',
    'locale', 'model', 'previous', 'prompt', 'provider', 'recipe', 'subject', 'system',
    'version']);
  // Nothing identifying a person, and no answers: a cache partition must never be a
  // profile of a learner.
  for (const forbidden of ['nickname', 'name', 'learner', 'answer', 'answers',
    'session', 'sessionId', 'feedback', 'ip', 'user']) {
    assert.equal(Object.hasOwn(fp, forbidden), false, `${forbidden} must not be key material`);
  }
  // The guidance document is hashed, not stored verbatim, so the key cannot carry
  // prompt text around.
  assert.match(fp.guidance, /^[0-9a-f]{16}$/);
  assert.match(fp.recipe, /^[0-9a-f]{16}$/);
  // Same rule for the prompt material: hashed, so the key never carries the rendered
  // prompt (which contains the owner's own goal and adaptive context).
  for (const f of ['prompt', 'system', 'implementation']) assert.match(fp[f], /^[0-9a-f]{16}$/);
});

test('a stray personal field in the request object cannot reach the key', () => {
  // Defence in depth: the request parser already strips unexpected fields, so this
  // object shape cannot occur — but the fingerprint must not be the thing that starts
  // trusting it either.
  const dirty = { ...V2, nickname: 'Rosie', sessionId: 'sess-1', answers: ['1/2'] };
  assert.equal(keyOf(dirty), keyOf(V2), 'unexpected fields must not partition the cache');
});
