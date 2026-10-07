// The session loop's decision surface and its content contract.
// Spec §4.1 F-2/F-3/F-7, §5.4.
//
// The driver itself is I/O-bound, so what is tested here is the contract it
// must uphold: precedence order, what may reach a client, and the copy rules.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextAction } from '@/lib/engine/policy.js';
import { hintState, isIndependentBlock } from '@/lib/engine/hints.js';
import { DEFAULT_POLICY } from '@/lib/engine/config.js';
import { publicItem } from '@/lib/engine/verify/symbolic.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

// Strip comments before scanning for banned copy: the comment that DOCUMENTS a
// rule ("no 'you're so smart'") must not be mistaken for a violation of it.
const codeOnly = (p) => src(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  // also strip TRAILING comments — `} : null,  // answer_index stays server-side`
  // is documentation, not a leak. Requires whitespace before // so `https://`
  // inside a string is untouched.
  .map((l) => l.replace(/\s+\/\/.*$/, ''))
  .join('\n')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

const T0 = Date.parse('2026-07-25T12:00:00Z');
const kc = (o = {}) => ({ kcId: 'k1', working: 0.5, confirmed: 0, prereqs: [], ...o });

// ── Precedence ───────────────────────────────────────────────────────────────

test('precedence: safety > session cap > due checks > new material', () => {
  const due = kc({ kcId: 'due', working: 0.8, nextCheckAt: new Date(T0 - 1000).toISOString() });

  assert.equal(nextAction({ safetyFlag: true, kcs: [due], now: T0 }).action, 'safety_protocol');
  assert.equal(nextAction({ kcs: [due], now: T0, sessionMinutes: 99, maxSessionMinutes: 25 }).action, 'end_session');
  assert.equal(nextAction({ kcs: [due, kc({ kcId: 'new', working: 0 })], now: T0 }).action, 'check');
  assert.equal(nextAction({ kcs: [kc({ working: 0.4 })], now: T0 }).action, 'study');
});

test('the session proposes stopping — there is no infinite session', () => {
  const r = nextAction({ kcs: [kc()], now: T0, sessionMinutes: DEFAULT_POLICY.session.softCapMinutes + 1 });
  assert.equal(r.action, 'end_session');
  assert.equal(r.reason, 'session_cap');
});

// ── What may reach the client ────────────────────────────────────────────────

test('no answer key can reach the client from any served item', () => {
  const item = {
    id: 'i1', kind: 'mc', body: 'Q', choices: ['a', 'b'],
    answer_spec: { index: 1 }, distractor_misconceptions: ['m1', null],
    difficulty_elo: 1300, exposures: 7, context_tag: 'x',
  };
  const wire = JSON.stringify(publicItem(item));
  assert.ok(!wire.includes('answer_spec'));
  assert.ok(!wire.includes('"index"'));
  assert.ok(!wire.includes('m1'), 'distractor mapping is diagnostic, not public');
  // Elo and exposure are internal selection state, not learner-facing.
  assert.ok(!wire.includes('1300') && !wire.includes('"exposures"'));
});

test('the session driver never sends a self-explanation answer key', () => {
  const code = codeOnly('lib/engine/session.js');
  const block = code.slice(code.indexOf('selfExplain:'), code.indexOf('because: \'new_concept\''));
  assert.ok(!/answer_index/.test(block), 'answer_index must stay server-side');
  assert.ok(/choices/.test(block), 'choices are what the learner picks from');
});

test('self-explanation writes NO evidence — it is processing, not assessment', () => {
  const code = src('lib/engine/session.js');
  const fn = code.slice(code.indexOf('export async function submitSelfExplain'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.ok(!/appendEvidence/.test(body),
    'treating self-explanation as assessment would be the assisted-performance-as-mastery mistake again');
});

// ── Hint ladder in session context ───────────────────────────────────────────

test('an isomorph retry runs as an independent block, so it can actually confirm', () => {
  const code = src('lib/engine/session.js');
  const iso = code.slice(code.indexOf('const iso = await dueIsomorph'), code.indexOf("because: 'isomorph'"));
  assert.ok(/independentBlock:\s*true/.test(iso),
    'the whole point of the isomorph is an UNASSISTED retry');
});

test('hints stay gated behind a real attempt, and vanish entirely when independent', () => {
  assert.equal(hintState({ attempts: 0 }).hintsAvailable, false);
  assert.equal(hintState({ attempts: 1 }).hintsAvailable, true);
  assert.equal(hintState({ attempts: 5 }, DEFAULT_POLICY, { independentBlock: true }).hintsAvailable, false);
});

test('independent blocks appear throughout a session, at a rising rate', () => {
  const early = Array.from({ length: 20 }, (_, i) => isIndependentBlock(i, 0.1)).filter(Boolean).length;
  const later = Array.from({ length: 20 }, (_, i) => isIndependentBlock(i, 0.9)).filter(Boolean).length;
  assert.ok(later > early, 'the system must recede as the learner grows');
});

// ── Copy rules (§4.1 F-8, §11.6) ─────────────────────────────────────────────

test('no person-praise or shame in any engine-authored copy', () => {
  // Self-level feedback is the reliably harmful category; a third of feedback
  // interventions make performance worse.
  const files = [
    'lib/engine/session.js', 'components/PracticeSession.js',
    'components/CheckFlow.js', 'components/ChecksDueCard.js',
  ];
  const banned = [
    /you'?re so (smart|clever|good)/i,
    /good (girl|boy)/i,
    /don'?t lose your/i,          // loss-framed streak
    /you (failed|are behind)/i,
    /keep your streak/i,
    /we miss you/i,
  ];
  for (const f of files) {
    const txt = codeOnly(f);
    for (const re of banned) {
      assert.ok(!re.test(txt), `${f} contains banned copy matching ${re}`);
    }
  }
});

test('the practice surface never grades, and holds no answer key', () => {
  const ui = src('components/PracticeSession.js');
  // The client must not import the verifier or compare answers itself.
  assert.ok(!/verify\/symbolic/.test(ui), 'the client must never verify');
  assert.ok(!/answer_spec|answerSpec/.test(ui), 'no answer key in the client');
  assert.ok(/action: 'answer'/.test(ui), 'answers go to the server to be graded');
});

test('a bottom-out solution is offered without guilt, and points at the retry', () => {
  const code = src('lib/engine/session.js');
  assert.ok(/No problem\./.test(code), 'the solution must arrive without scolding');
  assert.ok(/where it counts|comes back/i.test(code), 'and must name the retry that carries the credit');
});
