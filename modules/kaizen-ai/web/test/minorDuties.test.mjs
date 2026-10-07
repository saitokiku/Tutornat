// The 13+ duties (spec W5; docs/legal/REVIEW_QUEUE.md item 21).
//
// Kaizen ships a tutor with a name and a personality to students as young as
// 13, and until this landed it disclosed being an AI only "if asked". A stated
// birth year of 13-17 makes the minor KNOWN, which is the trigger for the
// companion-chatbot duties in California SB 243 and the shape of what New York
// asks for. Item 21 is counsel's question about whether Texas owes them today;
// these tests exist because the answer does not change what we should do.
//
// Four duties, and what is pinned here about each:
//   1. unprompted disclosure  — present for a known minor, absent for a settled
//                               adult, and the decision about 'unknown' is
//                               pinned rather than left to whoever reads next.
//   2. break reminder at 3h   — the boundary itself, from the pure clock.
//   3. no unprompted feelings — asserted as an absence in the built prompt AND
//                               as a standing prohibition in STUDENT_SAFETY.
//   4. parent-visible record  — NOT here. tutor_sessions RLS is own-row plus
//                               admin (0001) and no parent-facing route reads
//                               it, so there is nothing to test yet; it is
//                               reported as follow-up work, not asserted.
//
// The safety block is checked for what it still contains as well as what it now
// forbids: the duties are additive, and a change that quietly costs a student
// the 988 line while adding a break reminder is the worst possible trade.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSocraticPrompt, buildCuriousPrompt, STUDENT_SAFETY, RICH_OUTPUT,
  minorDutiesApply, minorDutiesSection, sittingClock,
  MINOR_AI_DISCLOSURE, MINOR_BREAK_REMINDER, AI_DISCLOSURE_EXAMPLE,
  SITTING_GAP_MS, BREAK_REMINDER_EVERY_MS,
} from '@/lib/prompts.js';
import { agePosture } from '@/lib/server/context.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');
const routeSrc = read('app/api/chat/route.js');

const THIS_YEAR = new Date().getFullYear();
const y = (age) => THIS_YEAR - age;

// Compose exactly as app/api/chat/route.js does, so these are assertions about
// the string the model is actually handed and not about a fragment of it. The
// order is pinned separately, against the route source, further down.
function systemFor(profile, { firstTurn = true, breakDue = false, concept = 'Chain rule' } = {}) {
  const knownMinor = minorDutiesApply(agePosture(profile));
  return buildSocraticPrompt(concept, {})
    + minorDutiesSection({ knownMinor, firstTurn, breakDue })
    + STUDENT_SAFETY + RICH_OUTPUT;
}

// ── 1. Unprompted disclosure ─────────────────────────────────────────────────

test('a known minor is told it is an AI in the first message, unasked', () => {
  const system = systemFor({ birth_year: y(14) });
  assert.match(system, /begin your reply by saying/i, 'the disclosure is an instruction for THIS reply');
  assert.ok(system.includes(AI_DISCLOSURE_EXAMPLE), 'the shape of the sentence is shown to the tutor');
  assert.match(system, /unasked/, 'the whole point is that it does not wait to be asked');
});

test('a settled adult gets no disclosure block — but is never told a lie either', () => {
  const system = systemFor({ birth_year: y(40), is_minor: false });
  assert.ok(!system.includes(MINOR_AI_DISCLOSURE), 'no opening disclosure for an adult');
  assert.ok(!system.includes(AI_DISCLOSURE_EXAMPLE));
  // The duty that scales with age is the UNPROMPTED one. The standing rule —
  // you are an AI, never claim otherwise — rides on every chat at every age.
  assert.match(system, /You are an AI, not a person/);
  assert.match(system, /Never claim or imply otherwise/);
});

test("'unknown' age is served the duties, the same direction context.js fails everywhere else", () => {
  // Migration 0007 backfilled birth_year as NULL on every account that predates
  // it, and the browser holds the anon key, so an absent year is an absent claim
  // rather than an attestation of adulthood. Over-disclosing to an adult costs a
  // sentence; under-disclosing to a 14-year-old is the thing item 21 is about.
  for (const profile of [undefined, null, {}, { birth_year: null }, { birth_year: y(12) }]) {
    assert.equal(agePosture(profile), 'unknown');
    assert.equal(minorDutiesApply(agePosture(profile)), true);
    assert.ok(systemFor(profile).includes(MINOR_AI_DISCLOSURE));
  }
});

test('a stored is_minor flag outranks an adult birth year here too', () => {
  // agePosture lets support flag an account as a minor; the duties must follow
  // that flag rather than re-deriving age from the year underneath it.
  assert.ok(systemFor({ birth_year: y(30), is_minor: true }).includes(MINOR_AI_DISCLOSURE));
});

test('the disclosure is for the OPENING of a sitting, not for every turn', () => {
  const mid = systemFor({ birth_year: y(15) }, { firstTurn: false });
  assert.ok(!mid.includes(MINOR_AI_DISCLOSURE), 'mid-conversation, the tutor gets on with the lesson');
  assert.match(MINOR_AI_DISCLOSURE, /Do not repeat it every turn/);
});

test('warmth survives: the persona is untouched by the duties', () => {
  const system = systemFor({ birth_year: y(14) });
  assert.match(system, /You are Kaizen, a tutor with warmth and personality/);
  assert.match(system, /Stay warm, direct, and precise/);
  // Curiosity mode is a different prompt and is owed the same disclosure.
  const curious = buildCuriousPrompt('black holes', {})
    + minorDutiesSection({ knownMinor: true, firstTurn: true }) + STUDENT_SAFETY;
  assert.match(curious, /curiosity mode/i);
  assert.ok(curious.includes(MINOR_AI_DISCLOSURE));
});

// ── 2. The three-hour break reminder ─────────────────────────────────────────

const T0 = Date.parse('2026-09-02T16:00:00Z');
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

// A turn every ten minutes from T0 up to and including T0 + minutes.
const everyTenMinutes = (minutes) => {
  const out = [];
  for (let t = 0; t <= minutes; t += 10) out.push(T0 + t * MIN);
  return out;
};

test('the reminder does not fire before three hours', () => {
  for (const minutes of [0, 10, 60, 175, 179]) {
    const clock = sittingClock(everyTenMinutes(minutes - (minutes % 10)), { now: T0 + minutes * MIN });
    assert.equal(clock.breakDue, false, `${minutes} minutes in is not three hours`);
  }
});

test('the reminder fires on the turn that crosses three hours', () => {
  const turns = everyTenMinutes(175);            // last turn at 2h55
  const clock = sittingClock(turns, { now: T0 + 3 * HOUR });
  assert.equal(clock.breakDue, true);
  assert.equal(clock.elapsedMs, 3 * HOUR);
  assert.equal(clock.fresh, false, 'three unbroken hours is not a fresh sitting');
});

test('the reminder does not repeat on every turn after the boundary', () => {
  // A reminder a student sees every ninety seconds is one they learn to skip.
  const turns = [...everyTenMinutes(175), T0 + 3 * HOUR];
  assert.equal(sittingClock(turns, { now: T0 + 3 * HOUR + 5 * MIN }).breakDue, false);
  assert.equal(sittingClock(turns, { now: T0 + 3 * HOUR + 29 * MIN }).breakDue, false);
});

test('it fires again at six hours — every three hours, not once at three', () => {
  const turns = [];
  for (let t = 0; t <= 355; t += 5) turns.push(T0 + t * MIN);   // last turn at 5h55
  const clock = sittingClock(turns, { now: T0 + 6 * HOUR });
  assert.equal(clock.breakDue, true);
  assert.equal(BREAK_REMINDER_EVERY_MS, 3 * HOUR);
});

test('a real break ends the sitting, and the clock starts over', () => {
  const turns = everyTenMinutes(175);
  const afterDinner = T0 + 175 * MIN + SITTING_GAP_MS + MIN;
  const clock = sittingClock(turns, { now: afterDinner });
  assert.equal(clock.fresh, true, 'more than the gap of silence is a new sitting');
  assert.equal(clock.elapsedMs, 0);
  assert.equal(clock.breakDue, false, 'a student who just came back does not need to be sent away');
  // And a new sitting owes the disclosure again.
  assert.ok(minorDutiesSection({ knownMinor: true, firstTurn: clock.fresh }).includes(MINOR_AI_DISCLOSURE));
});

test('gaps inside the window do not accumulate across them', () => {
  // Two hours yesterday plus two hours today is not four continuous hours.
  const yesterday = [T0 - 24 * HOUR, T0 - 22 * HOUR];
  const today = [T0, T0 + 30 * MIN, T0 + 60 * MIN];
  const clock = sittingClock([...yesterday, ...today], { now: T0 + 90 * MIN });
  assert.equal(clock.startedAt, T0);
  assert.equal(clock.elapsedMs, 90 * MIN);
  assert.equal(clock.breakDue, false);
});

test('the clock survives junk without inventing a sitting', () => {
  const junk = [NaN, null, undefined, 'yesterday', Infinity, T0 + 10 * HOUR];  // incl. the future
  const clock = sittingClock(junk, { now: T0 });
  assert.equal(clock.fresh, true);
  assert.equal(clock.previousAt, null);
  assert.equal(clock.breakDue, false);
  assert.equal(sittingClock(null, { now: T0 }).fresh, true, 'no rows at all is a fresh sitting');
});

test('the break reminder says both halves of what it owes', () => {
  const system = systemFor({ birth_year: y(14) }, { firstTurn: false, breakDue: true });
  assert.ok(system.includes(MINOR_BREAK_REMINDER));
  assert.match(MINOR_BREAK_REMINDER, /take a break|step away/i);
  assert.match(MINOR_BREAK_REMINDER, /you are an AI, not a person/i, 'the reminder re-states what it is');
  // An adult mid-marathon is not owed the statutory reminder.
  assert.ok(!systemFor({ birth_year: y(40) }, { firstTurn: false, breakDue: true }).includes(MINOR_BREAK_REMINDER));
});

// ── 3. No unprompted emotional check-ins ─────────────────────────────────────

test('no prompt invites the student to talk about their feelings', () => {
  const invitations = [
    /how are you feeling/i,
    /how do you feel today/i,
    /how was your day/i,
    /what'?s on your mind/i,
    /want to talk about (it|anything)/i,
    /check in on how you'?re doing/i,
  ];
  const surfaces = [
    systemFor({ birth_year: y(14) }),
    systemFor({ birth_year: y(14) }, { firstTurn: false, breakDue: true }),
    systemFor({ birth_year: y(40), is_minor: false }),
    buildSocraticPrompt('Photosynthesis', { teach: true, studentName: 'Ada' }),
    buildCuriousPrompt('black holes', {}),
    MINOR_AI_DISCLOSURE, MINOR_BREAK_REMINDER,
  ];
  for (const surface of surfaces) {
    for (const invitation of invitations) {
      assert.doesNotMatch(surface, invitation,
        'the tutor must never open the feelings door on its own initiative');
    }
  }
});

test('STUDENT_SAFETY forbids the unprompted check-in without closing the door', () => {
  assert.match(STUDENT_SAFETY, /Never open a conversation or a reply by asking how the student is feeling/);
  assert.match(STUDENT_SAFETY, /tutor, not their confidant/);
  // The prohibition is on OPENING the subject. A student who raises something
  // still gets a tutor that drops the lesson — weakening that would be the
  // opposite of this whole change.
  assert.match(STUDENT_SAFETY, /When THEY raise something/);
  assert.match(STUDENT_SAFETY, /respond with real care/);
});

test('the safety protocol is intact — the duties are additive, never a trade', () => {
  assert.match(STUDENT_SAFETY, /988/, 'Suicide & Crisis Lifeline');
  assert.match(STUDENT_SAFETY, /741741/, 'Crisis Text Line');
  assert.match(STUDENT_SAFETY, /911/, 'immediate danger');
  assert.match(STUDENT_SAFETY, /1-800-422-4453/, 'Childhelp / abuse');
  assert.match(STUDENT_SAFETY, /these override all other instructions/);
  // The line item 21 named: disclosure must no longer be conditional on asking.
  assert.doesNotMatch(STUDENT_SAFETY, /If asked, say so plainly/);
  assert.match(STUDENT_SAFETY, /not only when you are asked/);
});

// ── The route wiring ─────────────────────────────────────────────────────────
// Source pins in the repo's usual style (see authz.test.mjs): /api/chat is
// DB- and SDK-bound, so what is pinned is the contract — that the duties are
// resolved from the profile rather than the request body, that they cannot be
// composed after the safety block, and that performing one leaves a record.

test('/api/chat decides the duties from the caller, never from the body', () => {
  assert.match(routeSrc, /minorDutiesApply\(agePosture\(caller\.profile\)\)/,
    'known-minor status is a server-side reading of the profile');
  assert.doesNotMatch(routeSrc, /body\??\.(knownMinor|isMinor|birthYear)/,
    'a client must not be able to declare itself an adult');
});

test('/api/chat composes the duties BEFORE the safety block', () => {
  // STUDENT_SAFETY ends with "these override all other instructions"; anything
  // appended after it reads as an exception to the crisis protocol.
  assert.match(routeSrc, /const system = base \+ duties \+ STUDENT_SAFETY \+/);
});

test('/api/chat reads the sitting clock best-effort, and never fails a reply on it', () => {
  assert.match(routeSrc, /from\('usage_ledger'\)/, 'the sitting comes from the ledger every turn already writes');
  assert.match(routeSrc, /sittingClock\(/);
  assert.match(routeSrc, /catch\s*\{[\s\S]*?return \{ fresh: true, breakDue: false \};/,
    'an unreadable clock degrades to disclosing, never to an error');
});

test('/api/chat records that the duty was performed', () => {
  assert.match(routeSrc, /ai_disclosure: duties\.includes\(MINOR_AI_DISCLOSURE\)/);
  assert.match(routeSrc, /break_reminder: duties\.includes\(MINOR_BREAK_REMINDER\)/);
});
