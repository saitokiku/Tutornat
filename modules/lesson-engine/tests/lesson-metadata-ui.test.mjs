/* lesson-metadata-ui.test.mjs — lesson details + thumbs feedback, in the UI.
 * Run: node --test lesson/tests/lesson-metadata-ui.test.mjs
 *
 * SYNTHETIC. Every server payload, every device string and every vote reply in
 * this file is authored here. Nothing is a live provider call, a live server, a
 * real archive read or a real browser. These tests prove what the UI *does with
 * a payload* — never that a lesson was really cached, really saved, or that a
 * thumbs-up means anything was learned.
 *
 * The DOM is tests/ui-fixtures/dom-shim.mjs: render and click handlers run for
 * real, layout/CSS/screen-reader behaviour does not exist here. Real-browser
 * claims come from the Playwright files only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { installDom, fakeStore } from './ui-fixtures/dom-shim.mjs';

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
const {
  createApp, coarseDevice, nextVote, normalizeFeedback, metadataRows, instructionBlocks,
  libraryRecordId, makeRecord, readRecord, makeVoterToken, voterTokenKey, STRINGS, t, STORE_KEY,
} = app;

// ── synthetic fixtures ──────────────────────────────────────────────────────
const lesson = (age = 9, locale = 'en') => ({
  version: 2, id: 'syn-1', title: 'Equivalent fractions', goal: 'compare fractions',
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

const METADATA = {
  schemaVersion: 1,
  createdAt: '2026-10-03T19:26:21.412Z',
  model: {
    requested: 'claude-opus-5', configured: 'claude-opus-5',
    reported: 'claude-opus-5-20260101', provider: 'anthropic',
    endpointHost: 'api.anthropic.com', reasoningRequested: true, reasoningObserved: true,
  },
  timing: { generationMs: 18400 },
  instructions: {
    system: 'You write one short lesson for a named age. No praise inflation.',
    teachingGuidance: 'Explain the misconception, then re-ask.',
    lessonPrompt: 'Goal: compare fractions. Age: 9. Language: en.',
    contract: 'Return JSON matching lesson schema v2.',
    hashes: { schema: 'aa11', prompt: 'bb22', validator: 'cc33' },
    implementationVersion: 'lesson-store@3',
  },
  device: { browser: 'safari', os: 'macos', type: 'desktop', source: 'client-reported' },
};
const FEEDBACK = (up = 0, down = 0) => ({
  thumbsUp: up, thumbsDown: down, total: up + down,
  reportedHelpful: up, semantics: 'self-reported-helpfulness',
});
const REC = 'a'.repeat(64);
const reply = (over = {}) => ({
  lesson: lesson(), provenance: { provider: 'anthropic', model: 'claude-opus-5', model_wire_proved: true },
  library: { saved: true, cached: false, id: 'abc0123456789def', recordId: REC,
    metadata: METADATA, feedback: FEEDBACK() },
  ...over,
});

// ── harness ─────────────────────────────────────────────────────────────────
const tick = () => new Promise((r) => setTimeout(r, 0));

// Node exposes `navigator` as a getter-only global, so a plain assignment throws.
const setNavigator = (userAgent) =>
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent }, configurable: true, writable: true });
const SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

function mount({ api = {}, store = fakeStore(), nav } = {}) {
  const { root } = installDom();
  setNavigator(nav === undefined ? SAFARI_UA : nav?.userAgent);
  const calls = { lesson: [], rating: [], library: [] };
  const full = {
    lesson: async (body) => { calls.lesson.push(body); return reply(); },
    feedback: async () => ({ feedback: { text: 'n/a' } }),
    lessonRating: async (body) => {
      calls.rating.push(body);
      const up = body.vote === 'up' ? 1 : 0, down = body.vote === 'down' ? 1 : 0;
      return { ok: true, recordId: body.recordId, vote: body.vote, feedback: FEEDBACK(up, down) };
    },
    lessonLibrary: async (recordId) => { calls.library.push(recordId); return { recordId, metadata: METADATA, feedback: FEEDBACK(2, 1) }; },
    ...api,
  };
  const inst = createApp(root, { api: full, store });
  return { root, inst, calls, store, S: inst.state };
}

/** Walk straight to a rendered lesson: ack the gate, save a profile, generate. */
async function toLesson(h, opts = {}) {
  h.S.acked = true;
  h.S.profile = { name: 'T', age: 9 };
  h.S.profileDraft = { name: 'T', age: '9' };
  // The request locale must match the fixture's lesson locale, or the app's own
  // age/language mismatch guard (correctly) refuses to show the reply.
  h.S.setup = { goal: 'compare fractions', locale: opts.setupLocale || 'en' };
  await h.inst.generate();
  await tick();
  return h;
}

const txt = (root, sel) => root.querySelector(sel)?.textContent ?? null;
const thumbs = (root) => ({ up: root.querySelector('#rate-up'), down: root.querySelector('#rate-down') });

// ── coarse device: enums only, nothing else ─────────────────────────────────
test('device is coarsened to the documented enums and nothing finer', () => {
  const cases = [
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      { browser: 'safari', os: 'macos', type: 'desktop' }],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      { browser: 'chrome', os: 'windows', type: 'desktop' }],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 Edg/131.0.0.0',
      { browser: 'edge', os: 'windows', type: 'desktop' }],
    ['Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/133.0',
      { browser: 'firefox', os: 'linux', type: 'desktop' }],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      { browser: 'safari', os: 'ios', type: 'mobile' }],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      { browser: 'safari', os: 'ios', type: 'tablet' }],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36',
      { browser: 'chrome', os: 'android', type: 'mobile' }],
    ['Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      { browser: 'chrome', os: 'android', type: 'tablet' }],
  ];
  for (const [ua, want] of cases) {
    assert.deepEqual(coarseDevice({ userAgent: ua }), want, ua);
  }
});

test('an absent, hostile or unreadable navigator yields unknowns, never a throw', () => {
  const unknown = { browser: 'unknown', os: 'unknown', type: 'unknown' };
  assert.deepEqual(coarseDevice(undefined), unknown);
  assert.deepEqual(coarseDevice(null), unknown);
  assert.deepEqual(coarseDevice({}), unknown);
  assert.deepEqual(coarseDevice({ userAgent: '' }), unknown);
  assert.deepEqual(coarseDevice({ userAgent: 'curl/8.4.0' }), { browser: 'other', os: 'other', type: 'unknown' });
  assert.deepEqual(coarseDevice({ get userAgent() { throw new Error('blocked'); } }), unknown);
  // A descriptor is exactly three keys: no room to smuggle anything else out.
  assert.deepEqual(Object.keys(coarseDevice({ userAgent: 'curl/8' })).sort(), ['browser', 'os', 'type']);
});

test('the outbound lesson request carries only the coarse descriptor', async () => {
  const h = await toLesson(mount());
  const body = h.calls.lesson[0];
  assert.deepEqual(body.device, { browser: 'safari', os: 'macos', type: 'desktop' });
  const wire = JSON.stringify(body);
  // No raw UA, no screen metrics, no identifiers of any kind.
  assert.ok(!/Mozilla|AppleWebKit|KHTML|605\.1/.test(wire), 'raw user-agent leaked: ' + wire);
  assert.ok(!/screen|width|height|devicePixel|timezone|platform|vendor/i.test(wire), 'fingerprint field leaked: ' + wire);
  assert.ok(!('voterToken' in body), 'a generate call must not carry a voter token');
});

test('no device fields are read beyond the user-agent string', () => {
  const src = readFileSync(resolve(here, '..', 'app.mjs'), 'utf8');
  const banned = [
    'navigator.platform', 'navigator.vendor', 'navigator.hardwareConcurrency', 'deviceMemory',
    'screen.width', 'screen.height', 'devicePixelRatio', 'navigator.connection',
    'resolvedOptions', 'navigator.languages', 'getBattery', 'navigator.geolocation',
    'userAgentData', 'navigator.permissions', 'navigator.bluetooth', 'navigator.usb',
  ];
  for (const b of banned) assert.ok(!src.includes(b), `app.mjs reads a new device signal: ${b}`);
});

// ── vote arithmetic ─────────────────────────────────────────────────────────
test('a vote toggles off on a second click and moves on the opposite click', () => {
  assert.equal(nextVote(null, 'up'), 'up');
  assert.equal(nextVote(null, 'down'), 'down');
  assert.equal(nextVote('up', 'up'), null, 'second click on the same thumb removes it');
  assert.equal(nextVote('down', 'down'), null);
  assert.equal(nextVote('up', 'down'), 'down', 'up -> down moves the vote');
  assert.equal(nextVote('down', 'up'), 'up');
});

test('counts are read from the server reply only, and never invented', () => {
  assert.deepEqual(normalizeFeedback(FEEDBACK(3, 1)),
    { thumbsUp: 3, thumbsDown: 1, total: 4, reportedHelpful: 3 });
  // Garbage, negatives and floats do not become displayed counts.
  for (const bad of [null, undefined, {}, 'up', { thumbsUp: -2, thumbsDown: 1 },
    { thumbsUp: 1.5, thumbsDown: 'x' }, { thumbsUp: Infinity, thumbsDown: NaN }]) {
    const n = normalizeFeedback(bad);
    assert.ok(n === null || (n.thumbsUp >= 0 && n.thumbsDown >= 0
      && Number.isInteger(n.thumbsUp) && Number.isInteger(n.thumbsDown)),
      `normalizeFeedback(${JSON.stringify(bad)}) produced ${JSON.stringify(n)}`);
  }
  assert.equal(normalizeFeedback(null), null, 'no feedback block means no counts, not zeroes');
});

test('a voter token is a fresh 128-bit lowercase hex value, scoped per lesson version', () => {
  const a = makeVoterToken(), b = makeVoterToken();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b, 'two tokens must not be equal');
  // Per lesson version: a different recordId cannot reuse the same storage slot.
  assert.notEqual(voterTokenKey(REC), voterTokenKey('b'.repeat(64)));
  assert.ok(voterTokenKey(REC).includes(REC.slice(0, 8)), 'the key must be scoped by recordId');
});

// ── recordId validation ─────────────────────────────────────────────────────
test('only a full 64-hex recordId is accepted as the feedback identity', () => {
  assert.equal(libraryRecordId({ library: { recordId: REC } }), REC);
  for (const bad of ['abc0123456789def', 'A'.repeat(64), 'z'.repeat(64), 'a'.repeat(63),
    'a'.repeat(65), '', null, undefined, 12, {}]) {
    assert.equal(libraryRecordId({ library: { recordId: bad } }), null, `accepted bad recordId ${bad}`);
  }
  assert.equal(libraryRecordId({}), null);
  assert.equal(libraryRecordId(null), null);
});

// ── the saved record stays byte-compatible ──────────────────────────────────
test('a record without a library reference is byte-identical to the old v1 shape', () => {
  const args = { lesson: lesson(), stepIndex: 1, answers: { s1: '2' }, assisted: {}, evidence: [], next: null };
  const rec = makeRecord(args);
  assert.ok(!('library' in rec), 'no recordId must mean no library key at all');
  assert.deepEqual(Object.keys(rec), ['v', 'lesson', 'stepIndex', 'answers', 'assisted', 'evidence', 'next', 'at']);
  // An old stored payload round-trips with no new keys appearing.
  const old = JSON.stringify({ ...rec });
  assert.ok(!('library' in readRecord(old)), 'reading an old record must not invent a library ref');
  assert.deepEqual(Object.keys(readRecord(old)),
    ['v', 'lesson', 'stepIndex', 'answers', 'assisted', 'evidence', 'next']);
});

test('a library reference is stored minimally: the recordId and nothing else', () => {
  const rec = makeRecord({ lesson: lesson(), stepIndex: 0, answers: {}, assisted: {},
    evidence: [], next: null, library: { recordId: REC, metadata: METADATA, feedback: FEEDBACK(9, 9) } });
  assert.deepEqual(rec.library, { recordId: REC }, 'only the id belongs in browser storage');
  const back = readRecord(JSON.stringify(rec));
  assert.deepEqual(back.library, { recordId: REC });
  // A junk id in a hand-edited file is dropped rather than trusted.
  assert.ok(!('library' in readRecord(JSON.stringify({ ...rec, library: { recordId: 'nope' } }))));
});

// ── details panel ───────────────────────────────────────────────────────────
test('the details rows separate the model asked for from the model that answered', () => {
  const rows = metadataRows(METADATA);
  const byKey = Object.fromEntries(rows.map((r) => [r.labelKey, r.value]));
  assert.equal(byKey.mdModelRequested, 'claude-opus-5');
  assert.equal(byKey.mdModelReported, 'claude-opus-5-20260101');
  assert.equal(byKey.mdCreated, '2026-10-03');
  assert.equal(byKey.mdGenerationTime, '18.4');
  assert.equal(byKey.mdDevice, 'safari / macos / desktop');
  for (const r of rows) assert.equal(typeof r.value, 'string', `${r.labelKey} must be a plain string`);
  // Unproved: the reported row must not silently echo the requested model.
  const noReport = { ...METADATA, model: { ...METADATA.model, reported: null } };
  const rep = metadataRows(noReport).find((r) => r.labelKey === 'mdModelReported');
  assert.ok(!rep || rep.value !== 'claude-opus-5', 'an unreported model must not be credited');
  assert.deepEqual(metadataRows(null), []);
  assert.deepEqual(metadataRows({}), []);
});

test('the instruction blocks are the application teaching inputs, verbatim', () => {
  const blocks = instructionBlocks(METADATA);
  const got = Object.fromEntries(blocks.map((b) => [b.labelKey, b.text]));
  assert.equal(got.mdSystem, METADATA.instructions.system);
  assert.equal(got.mdTeaching, METADATA.instructions.teachingGuidance);
  assert.equal(got.mdLessonPrompt, METADATA.instructions.lessonPrompt);
  assert.equal(got.mdContract, METADATA.instructions.contract);
  for (const b of blocks) assert.equal(typeof b.text, 'string');
  assert.deepEqual(instructionBlocks({ instructions: {} }), []);
  assert.deepEqual(instructionBlocks(null), []);
});

test('Lesson details renders as a native details element with text nodes only', async () => {
  const h = await toLesson(mount());
  const d = h.root.querySelector('#lesson-details');
  assert.ok(d, 'the details panel must render once metadata arrived');
  assert.equal(d.tagName, 'DETAILS', 'native disclosure, not a scripted accordion');
  assert.ok(d.querySelector('summary'), 'a details needs a summary to be operable');
  const body = d.textContent;
  assert.ok(body.includes('claude-opus-5-20260101'), 'the model that answered must be shown');
  assert.ok(body.includes('2026-10-03'), 'the creation date must be shown');
  assert.ok(body.includes('safari'), 'the source device must be shown');
  assert.ok(body.includes(METADATA.instructions.system), 'the real system instruction must be shown');
  assert.ok(body.includes(METADATA.instructions.lessonPrompt), 'the real lesson prompt must be shown');
  // The instructions arrive as text, in a <pre>: no markup is parsed out of them.
  assert.ok(d.querySelectorAll('pre').length >= 1, 'instruction text belongs in a pre');
  assert.equal(d.querySelectorAll('a').length, 0, 'no links are built out of metadata');
});

test('metadata strings are rendered as text even when they contain markup', async () => {
  const hostile = {
    ...METADATA,
    model: { ...METADATA.model, reported: '<img src=x onerror=alert(1)>' },
    instructions: { ...METADATA.instructions, system: '</pre><script>alert(1)</script>' },
  };
  const h = await toLesson(mount({ api: { lesson: async () => reply({
    library: { saved: true, cached: false, id: 'x', recordId: REC, metadata: hostile, feedback: FEEDBACK() } }) } }));
  const d = h.root.querySelector('#lesson-details');
  assert.ok(d.textContent.includes('<script>'), 'the markup must survive as literal text');
  assert.equal(d.querySelectorAll('script').length, 0, 'no script element may be created');
  assert.equal(d.querySelectorAll('img').length, 0, 'no img element may be created');
});

test('no metadata means no details panel and no invented placeholder values', async () => {
  const h = await toLesson(mount({ api: { lesson: async () => reply({ library: { saved: true, cached: false, id: 'x' } }) } }));
  assert.equal(h.root.querySelector('#lesson-details'), null);
  assert.ok(!/undefined|null|NaN/.test(h.root.textContent), 'a missing block leaked a placeholder');
});

// ── thumbs: accessibility + state ───────────────────────────────────────────
test('the thumbs pair is a real button pair with aria-pressed state', async () => {
  const h = await toLesson(mount());
  const { up, down } = thumbs(h.root);
  assert.ok(up && down, 'both controls must render');
  for (const b of [up, down]) {
    assert.equal(b.tagName, 'BUTTON');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('aria-pressed'), 'false', 'nothing is pressed before a vote');
    assert.ok(b.textContent.trim().length > 2, 'an emoji-only control has no accessible name');
  }
  assert.ok(/helpful/i.test(up.textContent), 'the up control must say what it means');
  assert.ok(/not helpful/i.test(down.textContent));
});

test('a click posts the exact rating body and shows only the confirmed count', async () => {
  const h = await toLesson(mount());
  await thumbs(h.root).up.click();
  await tick();
  assert.equal(h.calls.rating.length, 1);
  const body = h.calls.rating[0];
  assert.equal(body.adultTest, true);
  assert.equal(body.recordId, REC);
  assert.equal(body.vote, 'up');
  assert.match(body.voterToken, /^[0-9a-f]{32}$/);
  assert.deepEqual(Object.keys(body).sort(), ['adultTest', 'recordId', 'vote', 'voterToken']);
  const { up, down } = thumbs(h.root);
  assert.equal(up.getAttribute('aria-pressed'), 'true');
  assert.equal(down.getAttribute('aria-pressed'), 'false');
  assert.ok(/\b1\b/.test(h.root.querySelector('#rate-counts').textContent), 'the confirmed count must show');
});

test('a second click on the same thumb removes the vote with vote:null', async () => {
  const h = await toLesson(mount());
  await thumbs(h.root).up.click(); await tick();
  await thumbs(h.root).up.click(); await tick();
  assert.deepEqual(h.calls.rating.map((c) => c.vote), ['up', null]);
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'false');
  // Same browser, same lesson version: one token throughout, so this is idempotent.
  assert.equal(new Set(h.calls.rating.map((c) => c.voterToken)).size, 1);
});

test('up then down moves the vote and keeps the same voter token', async () => {
  const h = await toLesson(mount());
  await thumbs(h.root).up.click(); await tick();
  await thumbs(h.root).down.click(); await tick();
  assert.deepEqual(h.calls.rating.map((c) => c.vote), ['up', 'down']);
  assert.equal(new Set(h.calls.rating.map((c) => c.voterToken)).size, 1);
  const { up, down } = thumbs(h.root);
  assert.equal(up.getAttribute('aria-pressed'), 'false');
  assert.equal(down.getAttribute('aria-pressed'), 'true');
});

test('both controls are busy during the post and no count moves until it returns', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const h = await toLesson(mount({ api: {
    lessonRating: async (body) => { await gate; return { ok: true, recordId: body.recordId, vote: body.vote, feedback: FEEDBACK(1, 0) }; },
  } }));
  const p = thumbs(h.root).up.click();
  await tick();
  const busy = thumbs(h.root);
  assert.ok(busy.up.disabled && busy.down.disabled, 'both thumbs must be inert mid-post');
  assert.equal(busy.up.getAttribute('aria-pressed'), 'false', 'no optimistic pressed state');
  assert.ok(!/\b1\b/.test(h.root.querySelector('#rate-counts')?.textContent ?? ''), 'no optimistic count');
  assert.ok(h.root.querySelector('#rate-busy'), 'a visible saving state is required');
  release(); await p; await tick();
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
});

test('a failed vote states the failure, offers retry and never fakes a count', async () => {
  let fail = true;
  const h = await toLesson(mount({ api: {
    lessonRating: async (body) => {
      if (fail) { const e = new Error('http 500'); throw e; }
      return { ok: true, recordId: body.recordId, vote: body.vote, feedback: FEEDBACK(1, 0) };
    },
  } }));
  await thumbs(h.root).up.click(); await tick();
  const err = h.root.querySelector('#rate-error');
  assert.ok(err, 'a failure must be visible');
  assert.ok(err.textContent.trim().length > 0);
  assert.ok(!/http 500|500/.test(err.textContent), 'the raw server status must not be learner-facing');
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'false', 'a failed vote is not pressed');
  assert.ok(!/\b1\b/.test(h.root.querySelector('#rate-counts')?.textContent ?? ''), 'a failed vote added a count');
  const retry = h.root.querySelector('#rate-retry');
  assert.ok(retry, 'the failure needs a retry control');
  fail = false;
  await retry.click(); await tick();
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
  assert.equal(h.root.querySelector('#rate-error'), null, 'the error must clear on success');
});

test('a late vote reply for a replaced lesson is dropped', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const other = 'b'.repeat(64);
  let first = true;
  const h = await toLesson(mount({ api: {
    lesson: async () => {
      if (first) { first = false; return reply(); }
      return reply({ library: { saved: true, cached: false, id: 'z', recordId: other, metadata: METADATA, feedback: FEEDBACK(5, 5) } });
    },
    lessonRating: async (body) => { await gate; return { ok: true, recordId: body.recordId, vote: body.vote, feedback: FEEDBACK(99, 0) }; },
  } }));
  const p = thumbs(h.root).up.click();
  await tick();
  await h.inst.generate();                 // a new lesson replaces the one being voted on
  await tick();
  release(); await p; await tick();
  assert.ok(!/99/.test(h.root.textContent), 'a stale reply wrote counts onto the new lesson');
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'false');
});

test('no recordId means the feedback offer is absent, not a dead control', async () => {
  const h = await toLesson(mount({ api: { lesson: async () => reply({ library: { saved: true, cached: false, id: 'short' } }) } }));
  assert.equal(h.root.querySelector('#rate-up'), null);
  assert.equal(h.root.querySelector('#rate-down'), null);
  assert.ok(/feedback/i.test(h.root.textContent) === false || h.root.querySelector('#rate-unavailable'),
    'either stay silent or state plainly that feedback is unavailable');
});

// ── token storage, honestly ─────────────────────────────────────────────────
test('no token is stored before an explicit vote, and only the token after', async () => {
  const h = await toLesson(mount());
  const keys = () => [...h.store.map.keys()];
  assert.equal(keys().filter((k) => /vote/i.test(k)).length, 0, 'viewing a lesson stored a voter token');
  await thumbs(h.root).up.click(); await tick();
  const vk = keys().filter((k) => /vote/i.test(k));
  assert.equal(vk.length, 1, 'exactly one per-lesson token slot');
  assert.match(h.store.map.get(vk[0]), /^[0-9a-f]{32}$/, 'only the token, no profile or device data');
  assert.ok(vk[0].includes(REC.slice(0, 8)), 'the slot must be scoped to this lesson version');
});

test('a browser that blocks storage still votes once, and says so', async () => {
  const h = await toLesson(mount({ store: fakeStore({ fail: 'set' }) }));
  await thumbs(h.root).up.click(); await tick();
  assert.equal(h.calls.rating.length, 1, 'the vote must still be sent');
  assert.equal(thumbs(h.root).up.getAttribute('aria-pressed'), 'true');
  const notice = h.root.querySelector('#rate-storage');
  assert.ok(notice && notice.textContent.trim().length > 0, 'the fallback must be disclosed, not hidden');
  assert.ok(/tab|pesta/i.test(notice.textContent), 'the notice must say the scope is this tab');
});

// ── restoring a saved lesson ────────────────────────────────────────────────
test('a resumed lesson fetches its details by recordId and shows real counts', async () => {
  const store = fakeStore();
  store.setItem(STORE_KEY, JSON.stringify(makeRecord({
    lesson: lesson(), stepIndex: 0, answers: {}, assisted: {}, evidence: [], next: null,
    library: { recordId: REC },
  })));
  const { root } = installDom();
  setNavigator('curl/8');
  const calls = [];
  const inst = createApp(root, { store, api: {
    lesson: async () => reply(), feedback: async () => ({}),
    lessonRating: async () => ({ ok: true, recordId: REC, vote: 'up', feedback: FEEDBACK(2, 1) }),
    lessonLibrary: async (id) => { calls.push(id); return { recordId: id, metadata: METADATA, feedback: FEEDBACK(2, 1) }; },
  } });
  inst.state.acked = true;
  inst.state.profile = { name: 'T', age: 9 };
  inst.adoptSaved(); inst.render();
  await tick(); await tick();
  assert.deepEqual(calls, [REC], 'the saved recordId must be the only thing looked up');
  assert.ok(root.querySelector('#lesson-details'), 'restored metadata must render');
  const counts = root.querySelector('#rate-counts').textContent;
  assert.ok(/\b2\b/.test(counts) && /\b1\b/.test(counts), 'the server counts must show: ' + counts);
});

test('a 404 on restore says the details are unavailable and claims no counts', async () => {
  const store = fakeStore();
  store.setItem(STORE_KEY, JSON.stringify(makeRecord({
    lesson: lesson(), stepIndex: 0, answers: {}, assisted: {}, evidence: [], next: null,
    library: { recordId: REC },
  })));
  const { root } = installDom();
  setNavigator('curl/8');
  const inst = createApp(root, { store, api: {
    lesson: async () => reply(), feedback: async () => ({}),
    lessonRating: async () => ({ ok: true }),
    lessonLibrary: async () => { const e = new Error('http 404'); e.notFound = true; throw e; },
  } });
  inst.state.acked = true;
  inst.state.profile = { name: 'T', age: 9 };
  inst.adoptSaved(); inst.render();
  await tick(); await tick();
  assert.equal(root.querySelector('#lesson-details'), null, 'no details may be invented for a 404');
  assert.ok(!/\b0 of 0\b/.test(root.textContent), 'a 404 must not be drawn as zero votes');
  assert.ok(root.querySelector('#rate-unavailable'), 'the unavailability must be stated');
});

// ── copy: honest in both locales ────────────────────────────────────────────
test('the counts are labelled self-reported helpfulness, never mastery', () => {
  const banned = /master|mastery|dominio|learned|aprendid|proficien|efficacy|eficacia|verified|verificad|score|calificaci/i;
  const added = ['rateTitle', 'rateUp', 'rateDown', 'rateCounts', 'rateSemantics', 'rateBusy',
    'rateFailed', 'rateRetry', 'rateStorage', 'rateUnavailable', 'mdTitle', 'mdDeviceNote',
    'mdModelRequested', 'mdModelReported', 'mdCreated', 'mdGenerationTime', 'mdDevice',
    'mdInstructionsNote', 'mdSystem', 'mdTeaching', 'mdLessonPrompt', 'mdContract'];
  for (const k of added) {
    for (const locale of ['en', 'es']) {
      const s = String(STRINGS[locale][k] ?? '').trim();
      assert.ok(s.length > 0, `${locale}.${k} missing`);
      assert.ok(!banned.test(s), `${locale}.${k} claims learning: ${s}`);
    }
    assert.notEqual(STRINGS.es[k], STRINGS.en[k], `es.${k} is untranslated English`);
  }
  assert.match(t('en', 'rateCounts', { up: 2, down: 1 }), /helpful/i);
  assert.match(t('en', 'rateSemantics'), /self-reported|what .*thought|opinion/i);
  assert.match(t('es', 'rateSemantics'), /opini|propia|report/i);
});

test('the device row is labelled client-reported, never verified hardware', () => {
  for (const locale of ['en', 'es']) {
    const s = String(STRINGS[locale].mdDeviceNote);
    assert.ok(/report|indic/i.test(s), `${locale}.mdDeviceNote must say it is reported: ${s}`);
    assert.ok(!/verified|confirmed|verificad|confirmad/i.test(s), `${locale} claims verification: ${s}`);
  }
});

test('every added string renders without a leaked placeholder in both locales', () => {
  const vars = { up: 1, down: 2, n: 3, model: 'm', provider: 'p', at: '2026-10-03', secs: '1.2' };
  for (const locale of ['en', 'es']) {
    for (const k of Object.keys(STRINGS[locale])) {
      const s = t(locale, k, vars);
      assert.ok(!/undefined|\bnull\b/.test(s), `${locale}.${k} leaked: ${s}`);
    }
  }
});

test('a Spanish lesson renders the thumbs and details in Spanish', async () => {
  const h = mount({ api: { lesson: async () => reply({ lesson: lesson(9, 'es') }) } });
  await toLesson(h, { setupLocale: 'es' });
  assert.equal(h.S.locale, 'es');
  const { up } = thumbs(h.root);
  assert.equal(up.textContent.includes(STRINGS.en.rateUp), false, 'Spanish UI showed the English label');
  assert.ok(up.textContent.includes(STRINGS.es.rateUp.replace(/^\S+\s/, '').slice(0, 6)), up.textContent);
  assert.ok(h.root.querySelector('#lesson-details').textContent.includes(STRINGS.es.mdTitle));
});

// ── the rules the whole app already lives under ─────────────────────────────
test('the feature adds no HTML sink, no new sensor and no credentials override', () => {
  const src = readFileSync(resolve(here, '..', 'app.mjs'), 'utf8');
  for (const banned of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(']) {
    assert.ok(!src.includes(banned), `app.mjs grew a sink: ${banned}`);
  }
  assert.ok(!/getUserMedia|MediaDevices|navigator\.media|AudioContext/.test(src), 'app.mjs touches camera/mic');
  assert.ok(!/credentials\s*:/.test(src), 'same-origin default must not be overridden');
  assert.ok(!/https?:\/\/(?!hermes|localhost)/.test(src.replace(/^\s*\*.*$/gm, '')), 'no cross-origin URL');
  // The rating call must go through the api adapter, so tests can mock it.
  assert.match(src, /api\.lessonRating\(/, 'the vote must use the injectable adapter');
  assert.match(src, /api\.lessonLibrary\(/, 'the details lookup must use the injectable adapter');
  assert.match(src, /'\/api\/lesson-rating'/, 'the documented rating path must be the one used');
  assert.match(src, /\/api\/lesson-library\//, 'the documented library path must be the one used');
});

test('profile reset still does not claim the server library was deleted', () => {
  for (const locale of ['en', 'es']) {
    const s = String(STRINGS[locale].clearConfirmBody) + String(STRINGS[locale].cleared);
    assert.ok(!/server|servidor/i.test(s), `${locale} clear copy now implies a server delete: ${s}`);
  }
  // disclose6 still discloses server retention, and the vote does not contradict it.
  assert.match(STRINGS.en.disclose6, /server/i);
});
