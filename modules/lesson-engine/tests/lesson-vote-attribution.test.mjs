/* lesson-vote-attribution.test.mjs — U1 (standing vote survives reload) and
 * M2 (configured must not impersonate requested).
 * Run: node --test lesson/tests/lesson-vote-attribution.test.mjs
 *
 * ADDITIVE. Nothing here edits, re-baselines or weakens an existing test. The
 * four known incumbent failures are contract adjudications recorded in the
 * handoff; this file states the CURRENT contract for the two confirmed defects
 * and nothing else.
 *
 * SYNTHETIC. Every payload is authored here. The store half runs against a real
 * filesystem archive in an ISOLATED temp directory — never
 * `.local-data/lesson-library`. No provider call, no browser, no network.
 *
 * What a passing run does NOT prove: that a thumb means anything was learned,
 * that a real browser renders this, or that a live model produced any metadata.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { installDom, fakeStore } from './ui-fixtures/dom-shim.mjs';
import { openLessonStore, lessonKey, LessonStoreError, STORE_VERSION } from '../lesson-store.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const realCore = resolve(here, '..', 'core.mjs');
const stubCore = resolve(here, 'ui-fixtures', 'core-stub.mjs');
if (!existsSync(realCore)) {
  registerHooks({
    resolve(spec, ctx, next) {
      if (spec === './core.mjs') return { url: pathToFileURL(stubCore).href, shortCircuit: true };
      return next(spec, ctx);
    },
  });
}
const app = await import('../app.mjs');
const { createApp, metadataRows, makeRecord, voterTokenKey, STRINGS, t, STORE_KEY } = app;

// ── fixtures ────────────────────────────────────────────────────────────────
const REC_A = 'a'.repeat(64);
const REC_B = 'b'.repeat(64);
const TOKEN = 'f'.repeat(32);

const lesson = (age = 9, locale = 'en') => ({
  version: 2, id: 'syn-vote-1', title: 'Equivalent fractions', goal: 'compare fractions',
  subject: 'math', age, locale, intro: 'Two names for the same amount.',
  steps: [
    { id: 's1', kind: 'numeric', prompt: 'How many parts are shaded?', explanation: 'Count them.',
      hint: 'Count the dark parts.', answer: '2',
      visual: { kind: 'fraction', parts: 4, filled: 2, caption: 'Two of four parts' } },
    { id: 's2', kind: 'numeric', prompt: 'And now?', explanation: 'Count again.', hint: 'Count.',
      answer: '3', visual: { kind: 'tokens', count: 3, caption: 'Three counters' } },
    { id: 's3', kind: 'numeric', prompt: 'And the last one?', explanation: 'Count once more.',
      hint: 'Count.', answer: '1', visual: { kind: 'tokens', count: 1, caption: 'One counter' } },
  ],
  path: { reinforce: { goal: 'More practice', reason: 'Naming first.' },
    advance: { goal: 'Add fractions', reason: 'Next idea.' } },
});

const MD = {
  schemaVersion: 1,
  createdAt: '2026-10-03T19:26:21.412Z',
  model: { requested: 'claude-opus-5', configured: 'claude-opus-5',
    reported: 'claude-opus-5-20260101', provider: 'anthropic',
    endpointHost: 'api.anthropic.com' },
  timing: { generationMs: 18400 },
  instructions: { system: 'S', teachingGuidance: 'T', lessonPrompt: 'L', contract: 'C' },
  device: { browser: 'safari', os: 'macos', type: 'desktop', source: 'client-reported' },
};
const FB = (up = 0, down = 0) => ({ thumbsUp: up, thumbsDown: down, total: up + down,
  reportedHelpful: up, semantics: 'self-reported-helpfulness' });
const libBlock = (recordId, feedback = FB()) =>
  ({ saved: true, cached: false, id: 'abc0123456789def', recordId, metadata: MD, feedback });
const provenance = { provider: 'anthropic', model: 'claude-opus-5', model_wire_proved: true };

const tick = () => new Promise((r) => setTimeout(r, 0));
const setNavigator = (userAgent) =>
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent }, configurable: true, writable: true });

/** @param libraryImpl receives (recordId, voterToken) exactly as the app adapter does. */
function mount({ api = {}, store = fakeStore(), libraryImpl } = {}) {
  setNavigator('curl/8');
  const { root } = installDom();
  const calls = { library: [], rating: [] };
  const inst = createApp(root, {
    store,
    api: {
      lesson: async () => ({ lesson: lesson(), provenance, library: libBlock(REC_A) }),
      feedback: async () => ({}),
      lessonRating: async (body) => {
        calls.rating.push(body);
        return { ok: true, recordId: body.recordId, vote: body.vote, feedback: FB(1, 0) };
      },
      lessonLibrary: async (recordId, voterToken) => {
        calls.library.push({ recordId, voterToken });
        if (libraryImpl) return libraryImpl(recordId, voterToken);
        return { recordId, metadata: MD, feedback: FB(2, 1) };
      },
      ...api,
    },
  });
  return { root, inst, calls, store, S: inst.state };
}
const thumbs = (root) => ({ up: root.querySelector('#rate-up'), down: root.querySelector('#rate-down') });

/** A saved local record pointing at `recordId`, plus optionally this browser's token. */
function savedStore(recordId, token) {
  const s = fakeStore();
  s.setItem(STORE_KEY, JSON.stringify(makeRecord({
    lesson: lesson(), stepIndex: 0, answers: {}, assisted: {}, evidence: [], next: null,
    library: { recordId },
  })));
  if (token) s.setItem(voterTokenKey(recordId), token);
  return s;
}
async function restore(h) {
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.inst.adoptSaved();
  await tick(); await tick(); await tick();
  return h;
}

// ── U1: the standing vote must survive a reload ─────────────────────────────

test('U1 a reloaded lesson shows the direction the server says this caller voted', async () => {
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async (recordId, voterToken) => {
      assert.equal(voterToken, TOKEN, 'the stored token must be presented to the server');
      return { recordId, metadata: MD, feedback: FB(2, 1), callerVote: 'down' };
    } });
  await restore(h);
  const { up, down } = thumbs(h.root);
  assert.ok(up && down, 'the thumbs must render for a restored version');
  assert.equal(down.getAttribute('aria-pressed'), 'true', 'the saved direction must read pressed');
  assert.equal(up.getAttribute('aria-pressed'), 'false', 'only the saved direction is pressed');
  const counts = h.root.querySelector('#rate-counts').textContent;
  assert.ok(/\b2\b/.test(counts) && /\b1\b/.test(counts), 'the server counts must still restore: ' + counts);
});

test('U1 an up vote restores as up, not merely as "some vote"', async () => {
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async (recordId) => ({ recordId, metadata: MD, feedback: FB(1, 0), callerVote: 'up' }) });
  await restore(h);
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
  assert.equal(thumbs(h.root).down.getAttribute('aria-pressed'), 'false');
});

test('U1 a legacy token with no reported direction stays unknown, never guessed', async () => {
  // The token proves this browser voted once. It does NOT prove which way, and a
  // server that cannot report a direction must not be rendered as either thumb.
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async (recordId) => ({ recordId, metadata: MD, feedback: FB(2, 1) }) });
  await restore(h);
  const { up, down } = thumbs(h.root);
  assert.equal(up.getAttribute('aria-pressed'), 'false', 'existence of a token is not a direction');
  assert.equal(down.getAttribute('aria-pressed'), 'false');
  assert.equal(h.S.rateVote, null);
});

test('U1 no stored token means no vote lookup is attempted at all', async () => {
  const h = mount({ store: savedStore(REC_A) });     // no token: this browser never voted
  await restore(h);
  assert.deepEqual(h.calls.library.map((c) => c.voterToken), [undefined],
    'a browser that never voted must not send a token it does not have');
  assert.equal(h.S.rateVote, null);
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'false');
});

test('U1 a cache hit on a version this browser already rated restores the thumb', async () => {
  // The generate path, not the restore path: the same version comes back from the
  // archive, and the standing vote belongs to it just as much.
  const store = fakeStore();
  store.setItem(voterTokenKey(REC_A), TOKEN);
  const h = mount({ store,
    api: { lesson: async () => ({ lesson: lesson(), provenance, library: { ...libBlock(REC_A, FB(3, 1)), cached: true } }) },
    libraryImpl: async (recordId, voterToken) => ({ recordId, metadata: MD, feedback: FB(3, 1),
      callerVote: voterToken === TOKEN ? 'up' : null }) });
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.S.profileDraft = { name: 'T', age: '9' };
  h.S.setup = { goal: 'compare fractions', locale: 'en' };
  await h.inst.generate(); await tick(); await tick();
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true',
    'a cache hit must restore this browser\u2019s own standing vote');
  assert.equal(h.S.rateFeedback.thumbsUp, 3, 'the reply counts must not be replaced by the lookup');
});

test('U1 a failed vote lookup leaves the lesson and its counts intact', async () => {
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async () => { const e = new Error('http 503'); throw e; } });
  await restore(h);
  // The details load owns the 404/unavailable story; the vote lookup must not
  // invent a direction and must not wipe what is on screen.
  assert.equal(h.S.rateVote, null, 'a failed lookup must not produce a direction');
  assert.ok(h.S.lesson, 'the restored lesson must survive a failed lookup');
});

test('U1 a late vote lookup for a superseded version does not press a thumb', async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const store = savedStore(REC_A, TOKEN);
  const h = mount({ store,
    api: { lesson: async () => ({ lesson: lesson(), provenance, library: libBlock(REC_B, FB(5, 1)) }) },
    libraryImpl: async (recordId) => {
      if (recordId === REC_A) { await gate; return { recordId, metadata: MD, feedback: FB(2, 1), callerVote: 'up' }; }
      return { recordId, metadata: MD, feedback: FB(5, 1) };
    } });
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.inst.adoptSaved();                               // starts the REC_A lookups
  h.S.profileDraft = { name: 'T', age: '9' };
  h.S.setup = { goal: 'compare fractions', locale: 'en' };
  h.S.lesson = null;
  await h.inst.generate(); await tick();             // REC_B is now the version on screen
  release(); await tick(); await tick();
  assert.equal(h.S.recordId, REC_B);
  assert.equal(h.S.rateVote, null, 'a stale caller-vote reply pressed a thumb on another version');
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'false');
});

test('U1 remove/change/idempotence still hold after a restored vote', async () => {
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async (recordId) => ({ recordId, metadata: MD, feedback: FB(1, 0), callerVote: 'up' }) });
  await restore(h);
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
  // Clicking the standing thumb removes it, exactly as it does without a reload.
  await thumbs(h.root).up.click(); await tick();
  assert.deepEqual(h.calls.rating.map((c) => c.vote), [null]);
  // One token throughout: the restored vote reused the stored token, not a new one.
  assert.deepEqual([...new Set(h.calls.rating.map((c) => c.voterToken))], [TOKEN]);
  await thumbs(h.root).down.click(); await tick();
  assert.deepEqual(h.calls.rating.map((c) => c.vote), [null, 'down']);
  assert.deepEqual([...new Set(h.calls.rating.map((c) => c.voterToken))], [TOKEN]);
});

test('U1 a restored vote is dropped when the profile changes under it', async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const h = mount({ store: savedStore(REC_A, TOKEN),
    libraryImpl: async (recordId) => { await gate; return { recordId, metadata: MD, feedback: FB(2, 1), callerVote: 'up' }; } });
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.inst.adoptSaved();
  h.inst.invalidate();                               // profile/lesson changed under the reply
  release(); await tick(); await tick();
  assert.equal(h.S.rateVote, null, 'a reply for a discarded screen pressed a thumb');
});

test('U1 a blocked-storage browser keeps its in-tab token and its honest notice', async () => {
  const h = mount({ store: fakeStore({ fail: 'set' }),
    api: { lesson: async () => ({ lesson: lesson(), provenance, library: libBlock(REC_A) }) } });
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.S.profileDraft = { name: 'T', age: '9' };
  h.S.setup = { goal: 'compare fractions', locale: 'en' };
  await h.inst.generate(); await tick();
  await thumbs(h.root).up.click(); await tick();
  assert.equal(h.calls.rating.length, 1, 'the vote must still be sent');
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
  const notice = h.root.querySelector('#rate-storage');
  assert.ok(notice && /tab|pesta/i.test(notice.textContent), 'the tab-only scope must be disclosed');
});

// ── M2: four model identities, none substituting for another ────────────────

test('M2 an absent requested model omits the row instead of showing configured', () => {
  const rows = metadataRows({ createdAt: MD.createdAt, model: { configured: 'claude-opus-5' } });
  const byKey = Object.fromEntries(rows.map((r) => [r.labelKey, r.value]));
  assert.equal(byKey.mdModelRequested, undefined,
    'an unobserved requested model must not be back-filled from configured');
  assert.equal(byKey.mdModelConfigured, 'claude-opus-5',
    'configured must still be visible under its own label');
});

test('M2 requested, configured, outbound request and provider reply stay separate rows', () => {
  const rows = metadataRows({ createdAt: MD.createdAt, model: {
    requested: 'asked-for', configured: 'build-default',
    observedRequestModel: 'on-the-wire', reported: 'provider-said',
  } });
  const byKey = Object.fromEntries(rows.map((r) => [r.labelKey, r.value]));
  assert.equal(byKey.mdModelRequested, 'asked-for');
  assert.equal(byKey.mdModelConfigured, 'build-default');
  assert.equal(byKey.mdModelRequestSent, 'on-the-wire');
  assert.equal(byKey.mdModelReported, 'provider-said');
  assert.equal(new Set(Object.values(byKey)).size, Object.keys(byKey).length,
    'four distinct identities must not collapse onto one value');
  // Each identity has its own label in both locales, and none of them claims to be
  // another: a label that reads the same is a merged fact with extra steps.
  for (const locale of ['en', 'es']) {
    const labels = ['mdModelRequested', 'mdModelConfigured', 'mdModelRequestSent', 'mdModelReported']
      .map((k) => String(STRINGS[locale][k] ?? '').trim());
    assert.ok(labels.every((s) => s.length > 0), `${locale} is missing a model label`);
    assert.equal(new Set(labels).size, 4, `${locale} reuses a label for two identities`);
  }
});

test('M2 an unproved provider reply is still never credited from a sibling field', () => {
  const rows = metadataRows({ createdAt: MD.createdAt, model: {
    requested: 'claude-opus-5', configured: 'claude-opus-5', reported: null } });
  assert.equal(rows.find((r) => r.labelKey === 'mdModelReported'), undefined,
    'an unreported model must stay absent');
});

test('M2 the new model labels claim no learning and are translated', () => {
  const banned = /master|mastery|dominio|learned|aprendid|proficien|efficacy|eficacia|verified|verificad/i;
  for (const k of ['mdModelConfigured', 'mdModelRequestSent']) {
    for (const locale of ['en', 'es']) {
      const s = String(STRINGS[locale][k] ?? '').trim();
      assert.ok(s.length > 0, `${locale}.${k} missing`);
      assert.ok(!banned.test(s), `${locale}.${k} claims learning: ${s}`);
      assert.ok(!/undefined|\bnull\b/.test(t(locale, k)), `${locale}.${k} leaked a placeholder`);
    }
    assert.notEqual(STRINGS.es[k], STRINGS.en[k], `es.${k} is untranslated English`);
  }
});

test('M2 the details panel renders each model identity as its own text row', async () => {
  const md = { ...MD, model: { requested: 'asked-for', configured: 'build-default',
    observedRequestModel: 'on-the-wire', reported: 'provider-said', provider: 'anthropic' } };
  const h = mount({ api: { lesson: async () => ({ lesson: lesson(), provenance,
    library: { ...libBlock(REC_A), metadata: md } }) } });
  h.S.acked = true; h.S.profile = { name: 'T', age: 9 };
  h.S.profileDraft = { name: 'T', age: '9' };
  h.S.setup = { goal: 'compare fractions', locale: 'en' };
  await h.inst.generate(); await tick();
  const d = h.root.querySelector('#lesson-details');
  assert.ok(d, 'the details panel must render');
  for (const v of ['asked-for', 'build-default', 'on-the-wire', 'provider-said']) {
    assert.ok(d.textContent.includes(v), `${v} is missing from the panel`);
  }
  assert.equal(d.querySelectorAll('script, img, a').length, 0, 'no element is built out of metadata');
});

// ── the store/server half of U1, on a real isolated archive ─────────────────

function isolatedStore() {
  // An isolated copy under TMPDIR. The durable `.local-data/lesson-library` is never
  // opened, written or migrated by this file.
  return openLessonStore({ dir: mkdtempSync(join(tmpdir(), 'lesson-vote-attr-')) });
}
function archived(store, over = {}) {
  const key = lessonKey({ goal: 'compare fractions', age: 9, locale: 'en', ...over });
  const out = store.save(key, { lesson: lesson(), request: { goal: 'compare fractions' },
    provenance, metadata: MD });
  return { key, recordId: out.recordId };
}

test('U1/store voteOf returns the direction this exact token recorded', () => {
  const store = isolatedStore();
  const { recordId } = archived(store);
  const mine = '1'.repeat(32); const theirs = '2'.repeat(32);
  assert.equal(store.voteOf(recordId, mine), null, 'no vote yet is null, not a direction');
  store.vote(recordId, { voterToken: mine, vote: 'down' });
  store.vote(recordId, { voterToken: theirs, vote: 'up' });
  assert.equal(store.voteOf(recordId, mine), 'down', 'the caller must get their OWN direction');
  assert.equal(store.voteOf(recordId, theirs), 'up');
  assert.equal(store.voteOf(recordId, '3'.repeat(32)), null, 'a stranger token has no vote');
  // Changing and removing move the reported direction with them.
  store.vote(recordId, { voterToken: mine, vote: 'up' });
  assert.equal(store.voteOf(recordId, mine), 'up');
  store.vote(recordId, { voterToken: mine, vote: null });
  assert.equal(store.voteOf(recordId, mine), null);
  assert.equal(store.voteOf(recordId, theirs), 'up', 'one voter\u2019s removal is not another\u2019s');
  assert.equal(store.feedbackOf(recordId).thumbsUp, 1, 'the tally still agrees');
});

test('U1/store a direction survives reopening the archive', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-vote-attr-'));
  const token = '4'.repeat(32);
  const first = openLessonStore({ dir });
  const { recordId } = archived(first);
  first.vote(recordId, { voterToken: token, vote: 'down' });
  assert.equal(openLessonStore({ dir }).voteOf(recordId, token), 'down',
    'a restart must not lose the caller\u2019s direction');
});

test('U1/store voteOf rejects a bad key or token and never reads another record', () => {
  const store = isolatedStore();
  const { recordId } = archived(store);
  assert.throws(() => store.voteOf('../etc/passwd', '5'.repeat(32)), LessonStoreError);
  assert.throws(() => store.voteOf(recordId, 'nope'), (e) => e.code === 'VoterTokenInvalid');
  assert.throws(() => store.voteOf(recordId, 'A'.repeat(32)), (e) => e.code === 'VoterTokenInvalid');
  assert.equal(store.voteOf('c'.repeat(64), '5'.repeat(32)), null, 'an unknown record is a clean null');
});

test('U1/store corrupt feedback bytes are reported, not overwritten or zeroed', () => {
  const store = isolatedStore();
  const { recordId } = archived(store);
  const token = '6'.repeat(32);
  store.vote(recordId, { voterToken: token, vote: 'up' });
  const fb = join(store.dir, `${recordId}.fb`);
  const before = readFileSync(fb);
  writeFileSync(fb, '{"v":1,"votes":{"not-a-hash":"up"}}');
  const broken = readFileSync(fb);
  assert.throws(() => store.voteOf(recordId, token), (e) => e.code === 'LibraryFeedbackInvalid',
    'invalid feedback must be a typed failure, not a fabricated null');
  assert.deepEqual(readFileSync(fb), broken, 'the corrupt bytes must be left exactly as found');
  assert.notDeepEqual(before, broken);              // the test really did corrupt it
});

test('U1/store the version digest and its metadata are untouched by voting', () => {
  const store = isolatedStore();
  const { key, recordId } = archived(store);
  const rec = store.recordById(recordId);
  store.vote(recordId, { voterToken: '7'.repeat(32), vote: 'up' });
  assert.deepEqual(store.recordById(recordId), rec, 'a vote changed the archived record');
  assert.equal(store.get(key).record.digest, recordId, 'a vote moved the cache key');
  assert.equal(store.voteOf(recordId, '7'.repeat(32)), 'up');
  assert.equal(STORE_VERSION, 1);
});
