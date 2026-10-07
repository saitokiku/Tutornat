// The evidence loop's input end: the Director's exit-rating screen.
//
// POST /api/tutoring/group/brief is the only code path in the product that
// turns a room into evidence, and the Wave 2 audit found it had NO CALLER
// anywhere — `grep -rn "group/brief" web/app web/components` returned exactly
// one client call, a GET for the prose brief. The route was finished, correct
// and tested; the differentiator of the business simply had no input surface.
//
// This file has two halves, and the split is deliberate.
//
// FIRST: the logic that decides what reaches the ledger is RUN, not read. Every
// assertion behind the headline safety claim used to be `assert.match` against
// the source of a component — including the dedupe guard, whose failure appends
// a second copy of every observation to a ledger that is append-only by trigger
// (0034). A regex cannot tell a working guard from a broken one, so the pure
// parts live in lib/exitRatings.js (node:test cannot parse JSX) and are called
// here with a Map-backed localStorage, the way a browser would call them.
//
// SECOND: what is left as source-matching is only the CROSS-FILE contract —
// route ↔ client, and the promises the screen makes that the route has to keep.
// That is the one thing a regex is genuinely good for, and the one thing a unit
// test cannot see.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TUTOR_RATINGS } from '@/lib/engine/types.js';
import { ROOM_KINDS } from '@/lib/roomKinds.js';
import { roomDateTime, CLUB_TIMEZONE } from '@/lib/roomTime.js';
import {
  DRAFT_NS, DRAFT_VERSION, ratingsKey,
  readDraft, writeDraft, dropDraft, ratingsProgress, ratingsOwed,
  pendingObservations, pruneToStudents, fillMissing, orderConcepts,
} from '@/lib/exitRatings.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const ratings = src('components/ExitRatings.js');
const classes = src('components/TutorClasses.js');
const tutorPage = src('app/tutor/page.js');
const briefRoute = src('app/api/tutoring/group/brief/route.js');
const groupRoute = src('app/api/tutoring/group/route.js');

// A browser store, in about as many lines as it takes to describe one. The
// throwing variant is a locked-down browser or a private window, which is not
// hypothetical: localStorage throws outright there.
function installStore({ throwing = false } = {}) {
  const map = new Map();
  const boom = () => { throw new Error('The operation is insecure.'); };
  globalThis.window = {
    localStorage: {
      getItem: (k) => (throwing ? boom() : (map.has(k) ? map.get(k) : null)),
      setItem: (k, v) => (throwing ? boom() : void map.set(k, String(v))),
      removeItem: (k) => (throwing ? boom() : void map.delete(k)),
    },
  };
  return map;
}
function clearStore() { delete globalThis.window; }

// ── The draft survives the interruption (run, not read) ─────────────────────

test('a draft round-trips through the store it is kept in', (t) => {
  const store = installStore();
  t.after(clearStore);

  const key = ratingsKey('room-1');
  assert.equal(key, 'ratings.room-1', 'one draft per room, not one global scratchpad');

  writeDraft(key, { ratings: { s1: { k1: 'got_it' } }, notes: {}, sent: {} });
  assert.ok(store.has(DRAFT_NS + key), 'namespaced, so the console drafts are greppable in a store');

  const back = readDraft(key);
  assert.deepEqual(back.ratings, { s1: { k1: 'got_it' } });
  assert.equal(back.v, DRAFT_VERSION);
  assert.ok(back.at, 'and it records when, so the screen can say how old it is');

  dropDraft(key);
  assert.equal(readDraft(key), null);
});

test('a draft of an older shape is dropped, never half-read', (t) => {
  const store = installStore();
  t.after(clearStore);
  const key = ratingsKey('room-1');

  // Exactly what a previous release would have left behind.
  store.set(DRAFT_NS + key, JSON.stringify({ v: DRAFT_VERSION + 1, ratings: { s1: { k1: 'got_it' } } }));
  assert.equal(readDraft(key), null, 'restoring half of someone\'s work is worse than restoring none');

  store.set(DRAFT_NS + key, '{ this is not json');
  assert.equal(readDraft(key), null);
});

test('a store that throws costs a draft, never the console', (t) => {
  installStore({ throwing: true });
  t.after(clearStore);
  const key = ratingsKey('room-1');

  assert.equal(readDraft(key), null);
  assert.doesNotThrow(() => writeDraft(key, { ratings: { s1: { k1: 'got_it' } } }));
  assert.doesNotThrow(() => dropDraft(key));
  assert.equal(ratingsProgress('room-1').unsent, 0);
});

test('with no window at all, the helpers answer rather than explode', (t) => {
  clearStore();
  t.after(clearStore);
  assert.equal(readDraft('ratings.x'), null);
  assert.doesNotThrow(() => writeDraft('ratings.x', { ratings: {} }));
  assert.deepEqual(ratingsProgress('x'), { sent: 0, unsent: 0, at: null });
});

// ── The count the console prints back to the Director ───────────────────────

test('ratingsProgress separates what is saved from what is still on this phone', (t) => {
  installStore();
  t.after(clearStore);

  assert.deepEqual(ratingsProgress('empty-room'), { sent: 0, unsent: 0, at: null });

  writeDraft(ratingsKey('r1'), {
    ratings: { s1: { k1: 'got_it', k2: 'shaky' }, s2: { k1: 'not_yet', k3: '' } },
    sent: { s1: { k1: 'got_it' } },
  });
  const p = ratingsProgress('r1');
  assert.equal(p.sent, 1, 'one rating the server has accepted');
  assert.equal(p.unsent, 2, 'two still here — and the empty one is not a rating');
  assert.ok(p.at);
});

test('a rating changed after it was saved counts as unsaved again', (t) => {
  installStore();
  t.after(clearStore);
  // A correction is a new row (evidence cannot be edited), so it must be
  // offered for saving rather than counted as already done.
  writeDraft(ratingsKey('r1'), {
    ratings: { s1: { k1: 'shaky' } },
    sent: { s1: { k1: 'got_it' } },
  });
  assert.deepEqual(
    { sent: ratingsProgress('r1').sent, unsent: ratingsProgress('r1').unsent },
    { sent: 0, unsent: 1 },
  );
});

// ── The guard that keeps the append-only ledger honest ──────────────────────

const ROSTER = [{ studentId: 's1' }, { studentId: 's2' }];

test('a second Save sends nothing the server has already accepted', () => {
  const state = {
    students: ROSTER,
    ratings: { s1: { k1: 'got_it', k2: 'shaky' }, s2: { k1: 'not_yet' } },
    sent: {},
    notes: {},
  };
  assert.equal(pendingObservations(state).length, 3, 'first Save posts everything rated');

  // What the screen does with a batch the server accepted.
  const sent = { s1: { k1: 'got_it', k2: 'shaky' }, s2: { k1: 'not_yet' } };
  assert.deepEqual(pendingObservations({ ...state, sent }), [],
    'appendEvidence does not de-duplicate: a re-post is a second copy in the ledger');
});

test('changing a rating re-arms it, and only it', () => {
  const pending = pendingObservations({
    students: ROSTER,
    ratings: { s1: { k1: 'shaky', k2: 'got_it' }, s2: { k1: 'not_yet' } },
    sent: { s1: { k1: 'got_it', k2: 'got_it' }, s2: { k1: 'not_yet' } },
    notes: { s1: { k1: '  distributing negatives  ' } },
  });
  assert.deepEqual(pending, [{ studentId: 's1', kcId: 'k1', rating: 'shaky', note: 'distributing negatives' }],
    'the corrected concept, with its note trimmed — and nothing else');
});

test('an empty note is null, not an empty string, and a blank rating is not sent', () => {
  const pending = pendingObservations({
    students: ROSTER,
    ratings: { s1: { k1: 'got_it', k2: '' } },
    sent: {},
    notes: { s1: { k1: '   ' } },
  });
  assert.deepEqual(pending, [{ studentId: 's1', kcId: 'k1', rating: 'got_it', note: null }]);
});

test('a draft for a student who left the room is never sent', () => {
  // The roster is the seats that are booked or attended; a cancelled seat drops
  // out of it. The route would refuse the observation anyway (it checks the
  // room), so counting it as work waiting to be saved is a button that can
  // never finish.
  const pending = pendingObservations({
    students: [{ studentId: 's1' }],
    ratings: { s1: { k1: 'got_it' }, gone: { k1: 'shaky' } },
    sent: {},
    notes: {},
  });
  assert.deepEqual(pending.map((o) => o.studentId), ['s1']);
});

test('a roster that changed prunes the draft instead of stranding it', () => {
  const draft = { s1: { k1: 'got_it' }, gone: { k1: 'shaky' } };
  assert.deepEqual(pruneToStudents(draft, new Set(['s1'])), { s1: { k1: 'got_it' } });
  // Reference-stable when there is nothing to drop, so reconciling the roster
  // does not rewrite the draft on every render.
  const same = { s1: { k1: 'got_it' } };
  assert.equal(pruneToStudents(same, new Set(['s1', 's2'])), same);
  assert.deepEqual(pruneToStudents(undefined, new Set(['s1'])), {});
});

// ── What the server already holds is not this device's to guess ─────────────

test('what is already on record is seeded in, and a local answer is never overwritten', () => {
  const onRecord = { s1: { k1: 'got_it', k2: 'shaky' }, s2: { k1: 'not_yet' } };

  // A second device knows nothing: everything on record arrives as sent, so
  // nothing is offered for saving a second time.
  assert.deepEqual(fillMissing({}, onRecord), onRecord);
  assert.deepEqual(
    pendingObservations({ students: ROSTER, ratings: fillMissing({}, onRecord), sent: fillMissing({}, onRecord), notes: {} }),
    [],
    'the Director who rated on their phone is not invited to rate again on the laptop',
  );

  // A correction typed here outranks the copy it is correcting.
  const local = { s1: { k1: 'shaky' } };
  assert.deepEqual(fillMissing(local, onRecord), { s1: { k1: 'shaky', k2: 'shaky' }, s2: { k1: 'not_yet' } });

  // Reference-stable when nothing was missing.
  const full = { s1: { k1: 'got_it' } };
  assert.equal(fillMissing(full, { s1: { k1: 'got_it' } }), full);
  assert.equal(fillMissing(full, null), full);
});

// ── The order a tired person taps in ────────────────────────────────────────

test('concepts are offered shared-first, then weakest-first', () => {
  const kcs = [
    { kcId: 'a', confirmed: 0.1 },
    { kcId: 'b', confirmed: 0.9 },   // the room's shared concept, and nearly mastered
    { kcId: 'c', confirmed: 0.4 },
  ];
  const ordered = orderConcepts(kcs, new Set(['b']));
  assert.deepEqual(ordered.map((k) => k.kcId), ['b', 'a', 'c'],
    'the concept the room was taught around is the one the tutor just watched four people try');
  assert.deepEqual(kcs.map((k) => k.kcId), ['a', 'b', 'c'], 'and the snapshot it came from is not re-sorted');
  assert.deepEqual(orderConcepts(undefined, new Set()), []);
  assert.deepEqual(orderConcepts([{ kcId: 'x' }, { kcId: 'y', confirmed: 0.5 }], []).map((k) => k.kcId), ['x', 'y']);
});

// ── A room's time is the room's, not the club's default ─────────────────────

test('the same instant reads differently in two rooms, which is why the zone is per room', () => {
  const iso = '2026-09-03T23:00:00Z';
  assert.equal(roomDateTime(iso, CLUB_TIMEZONE), 'Thu 3 Sep · 6:00 PM');
  assert.equal(roomDateTime(iso, 'America/New_York'), 'Thu 3 Sep · 7:00 PM',
    'an out-of-town room formatted in the club zone is off by an hour, silently');
});

test("the console builds its formatter from the room's zone, not the club's", () => {
  assert.doesNotMatch(classes, /toLocaleString|toLocaleTimeString|toLocaleDateString/,
    'the 6:00 PM Austin room that rendered "11:00 PM" came from exactly this call');
  assert.match(classes, /import \{ roomDateTime, CLUB_TIMEZONE \} from '@\/lib\/roomTime'/);
  assert.match(classes, /roomDateTime\(iso, room\?\.timezone \|\| CLUB_TIMEZONE\)/,
    "the room's own zone, with the club's as the fallback for a row that carries none");
  assert.doesNotMatch(classes, /roomDateTime\(iso, CLUB_TIMEZONE\)/,
    'a screen-wide formatter pinned to Chicago is the same bug in a different costume');
  assert.match(classes, /const when = whenIn\(room\);/, 'bound per room, inside the row');
  // The room payload carries it, so there is no excuse for not reading it.
  assert.match(groupRoute, /timezone: r\.timezone \|\| null/);
  // And the two times on the same screen agree: the unaided-check date is
  // formatted in the same room's zone.
  assert.match(ratings, /roomDateTime\(result\.nextCheckAt, room\?\.timezone\)/);
});

// ── Rating a room must not depend on affording a paragraph ──────────────────

test('the ratings screen asks for the roster alone, with no AI in the path', () => {
  assert.match(ratings, /brief\?sessionId=\$\{encodeURIComponent\(roomId\)\}&snapshot=1/,
    'the screen reads students and shared; it discards the prose entirely');

  const early = briefRoute.indexOf('if (snapshotOnly)');
  const ent = briefRoute.indexOf("checkEntitlement(caller, 'report')");
  const limit = briefRoute.indexOf('rateLimitResponse(caller, req');
  const metered = briefRoute.indexOf('meteredCall({');
  assert.ok(early > 0, 'the route has a snapshot-only mode');
  assert.ok(ent > 0 && limit > 0 && metered > 0, 'and still has its metered brief path');
  assert.ok(early < ent && early < limit && early < metered,
    'it returns BEFORE the entitlement check, the rate limit and the model call — '
    + 'a spent AI budget answered 429 with no roster, and the Director could not record a rating');
  assert.match(briefRoute, /url\.searchParams\.get\('snapshot'\) === '1'/);
});

test('the snapshot answers what is already recorded, and says when it could not', () => {
  // Server truth about the room, so the dedupe guard is not one device's memory.
  assert.match(briefRoute, /from\('group_observation'\)\s*\n?\s*\.select\('student_id,kc_id,tutor_rating'\)/);
  assert.match(briefRoute, /if \(error\) return null;/, 'a failed read is null, not an empty map');
  assert.match(ratings, /snapshot\.snapshotOnly === true && recorded == null/);
  assert.match(ratings, /records the same observation twice/,
    'a confident empty slate is exactly the answer that causes the harm');
  assert.match(ratings, /fillMissing\(pruneToStudents\(prev, ids\), onRecord\)/);
});

// ── The caller that did not exist ───────────────────────────────────────────

test('the exit ratings POST to the one route that writes evidence', () => {
  assert.match(ratings, /authedFetch\('\/api\/tutoring\/group\/brief', \{\s*method: 'POST'/,
    'the screen calls the route the whole loop turns on');
  assert.match(ratings, /body: JSON\.stringify\(\{ sessionId: roomId, observations: batch \}\)/);
  // The other end of the contract, so neither side can drift alone.
  assert.match(briefRoute, /export async function POST/);
  assert.match(briefRoute, /Array\.isArray\(body\?\.observations\)/);
});

test('the screen is reachable from the room it belongs to', () => {
  assert.match(classes, /import ExitRatings from '@\/components\/ExitRatings'/);
  assert.match(classes, /<ExitRatings room=\{room\} onSaved=/,
    'opened from the room row, and it tells the row when the work lands');
  assert.match(classes, /onSaved=\{\(\) => \{ load\(\); refreshRatingLog\(rooms\); \}\}/,
    'and the row re-reads the SERVER, not just this phone, so the callout clears where it asked');
});

test('the rating vocabulary comes from the engine, not from the screen', () => {
  // TUTOR_RATINGS has a CHECK constraint standing behind it. A retyped copy is
  // how a fourth rating gets added to the engine and stays untappable.
  assert.match(ratings, /import \{ TUTOR_RATINGS \} from '@\/lib\/engine\/types'/);
  assert.match(ratings, /TUTOR_RATINGS\.map\(/, 'the buttons are derived from the constant');
  for (const id of TUTOR_RATINGS) {
    assert.ok(ratings.includes(`${id}:`), `${id} needs a label on the screen`);
  }
  assert.match(briefRoute, /TUTOR_RATINGS\.includes\(rating\)/, 'and the route validates against the same list');
});

// ── What the screen promises, and what the route does ───────────────────────

test('the screen says what a rating DOES, and the route does it', () => {
  // A director who thinks this is a form will skip it; one who knows it books
  // the only measurement that can confirm a concept will not.
  assert.match(ratings, /books an unaided check on every concept you rate/);
  assert.match(ratings, /the only evidence that can confirm anything/);
  // The route's half of that sentence: confirming evidence plus the delay floor
  // that stops the same evening's practice erasing the wait.
  assert.match(briefRoute, /verifiedBy: 'human_tutor'/);
  assert.match(briefRoute, /assisted: false/);
  assert.match(briefRoute, /check_floor_at: checkAt/);
  assert.match(briefRoute, /POST_SESSION_CHECK_DELAY_MS/);
});

test('the mastery law is in the copy, where it can actually be broken', () => {
  // The rating asserts UNASSISTED work — the route hardcodes assisted:false —
  // so the person tapping the button has to be told what they are asserting.
  assert.match(ratings, /on their own<\/b>/);
  assert.match(ratings, /help changes what the rating means/);
  // And one observation never confirms anything by itself: the gate is 4 of 5
  // recent confirming passes across at least two contexts (engine config).
  assert.match(ratings, /still not enough by itself/);
  assert.match(ratings, /several unaided passes, in more than\s+one setting/);
});

test('the saved confirmation names the real date the server returned', () => {
  // Not a retyped "in 48 hours": the route answers nextCheckAt, and a delay
  // that changes in config must not leave a wrong sentence on the screen.
  assert.match(ratings, /result\.nextCheckAt/);
  assert.match(briefRoute, /nextCheckAt: checkAt/);
});

test('the client batches to the same limit the route silently enforces', () => {
  // The route slices observations to 40 and says nothing about the rest; a Hall
  // of eight with eight concepts each would lose half without a word.
  assert.match(ratings, /const MAX_PER_POST = 40;/);
  assert.match(ratings, /pending\.slice\(i, i \+ MAX_PER_POST\)/);
  assert.match(briefRoute, /observations\)\s*\?\s*body\.observations\.slice\(0, 40\)/);
});

test('a refused save keeps the work and says so', () => {
  assert.match(ratings, /Nothing is lost — they are still here/);
  assert.match(ratings, /Could not reach the server\. Nothing is lost/);
  assert.match(ratings, /disabled=\{busy \|\| !pending\.length\}/, 'and a double tap cannot fire twice');
});

test('a concept the server refused is reported, not silently dropped', () => {
  // The route answers `skipped` when a student is not studying that concept.
  assert.match(ratings, /result\.skipped\.length > 0/);
  assert.match(ratings, /aren&apos;t studying it yet/);
  assert.match(briefRoute, /skipped/);
});

// ── Every state this screen can be in ───────────────────────────────────────

test('loading, not-provisioned, failed and empty are all designed', () => {
  assert.match(ratings, /Reading the room…/);
  assert.match(ratings, /snapshot\.notProvisioned/);
  assert.match(ratings, /isn&apos;t switched on for this deployment yet/,
    'hard rule 6: missing schema is an explicit state, never a crash or a fake success');
  assert.match(ratings, /snapshot\.status === 501/,
    'and so is a missing service key or a demo account — one vocabulary, not four');
  assert.match(ratings, /snapshot\.failed/);
  assert.match(ratings, /Try again/);
  assert.match(ratings, /Nobody to rate yet/);
  assert.match(ratings, /<EmptyState/, 'the shared primitive, not a third local grey sentence');
});

test('a student with no mapped concepts is explained, not shown an empty box', () => {
  assert.match(ratings, /No concepts on \{s\.name\.split\(' '\)\[0\]\}/);
  assert.match(ratings, /rating could attach to/);
  assert.match(ratings, /concepts appear once they have worked on\s+something/);
});

// ── The room row itself ─────────────────────────────────────────────────────

test('an unrated room says so where the Director will see it, and is the button', () => {
  assert.match(classes, /Write the exit ratings for this room/);
  assert.match(classes, /needsRatings && rating !== room\.id && \(\s*<button type="button" onClick=\{\(\) => setRating\(room\.id\)\}/,
    'the callout opens the ratings for that room — the shape of the unpaid-room nag');
  assert.match(classes, /Finish the exit ratings for this room/,
    'and a partly-rated room, or an interrupted draft, says so instead');
});

test('a room owes its ratings until every rateable student has one', () => {
  // Run, not read: this is the rule the callout is drawn from.
  assert.equal(ratingsOwed({ rateableStudents: 4, ratedStudents: 0 }), true);
  assert.equal(ratingsOwed({ rateableStudents: 4, ratedStudents: 1 }), true,
    'one student rated leaves three hours of the room unrecorded');
  assert.equal(ratingsOwed({ rateableStudents: 4, ratedStudents: 4 }), false);
});

test('a room nobody turned up to is never nagged for ratings it cannot take', () => {
  // seats counts pending_payment|booked|attended|no_show; the rateable roster
  // is booked|attended only. Drawn from seats, this callout asks for ratings
  // and the screen it opens answers "Nobody to rate yet" — a flag that can
  // never be cleared, pinned above the room running tonight.
  assert.equal(ratingsOwed({ seats: 3, rateableStudents: 0, ratedStudents: 0 }), false);
  // And a payload without the counts says nothing rather than saying something
  // nobody can answer.
  assert.equal(ratingsOwed({ seats: 3 }), false);
  assert.equal(ratingsOwed(undefined), false);
});

test('the room row draws that flag from the server, not from this phone', () => {
  // The device-local answer ("nothing has been rated from this phone") invited
  // a Director who rated on their phone to rate the same room again on a
  // laptop — a second full copy of every observation in an append-only ledger.
  assert.doesNotMatch(classes, /from this phone\. One tap/, 'that sentence is gone');
  assert.match(classes, /const needsRatings = ended && ratingsOwed\(room\);/);
  assert.doesNotMatch(classes, /needsRatings = ended && room\.seats/,
    'not seats, which counts no-shows');
  assert.doesNotMatch(classes, /progress\.sent === 0/, 'and not this device\'s draft');
  // THE SERVER END OF THE CONTRACT, ASSERTED RATHER THAN DESCRIBED. This block
  // used to check only `ratedStudents:` and note in a comment that the
  // denominator "is added alongside it" — it was not, so ratingsOwed compared
  // every room against a rateable count of 0, and the callout this whole file
  // exists for could never fire on any room in production.
  assert.match(groupRoute, /ratedStudents:/,
    'the room list answers how many students in the room have a rating on record');
  assert.match(groupRoute, /rateableStudents:/,
    'and how many it could attach to — without the denominator ratingsOwed is always false');
  assert.match(groupRoute, /s\.status === 'booked' \|\| s\.status === 'attended'/,
    'the denominator is booked+attended, the same set rosterSnapshot builds from');
  assert.match(groupRoute, /select\('group_session_id,student_id,status,paid,exit'\)/,
    'and it is a DISTINCT student count, so a duplicate seat row cannot inflate it');
});

test('the draft only says what a draft can know', () => {
  assert.match(classes, /unsaved on this phone/, 'this device knows what is unsaved on it');
  assert.match(classes, /students in\s*\n?\s*this room have something on record/,
    'and the record is quoted from the server');
});

test('the room list orders by what has to be done now, not by the catalogue', () => {
  assert.match(classes, /const ordered = useMemo/);
  assert.match(classes, /if \(startMs - 15 \* 60000 < now && now < endMs \+ 30 \* 60000\) return 0;/);
  assert.match(classes, /room\.needsRoster === true \|\| ratingsOwed\(room\) \? 1 : 3/,
    'the same server answer that draws the callout, so a room cannot be pinned above tonight '
    + 'by a flag the screen will not show');
});

test('the kind badge comes from lib/roomKinds, so a $550 seat is not a "Clinic"', () => {
  assert.doesNotMatch(classes, /const KIND_BADGE/, 'the local map is gone');
  assert.match(classes, /import KindBadge from '@\/components\/ui\/KindBadge'/);
  assert.match(classes, /<KindBadge kind=\{room\.kind\} \/>/);
  assert.ok(ROOM_KINDS.standing_seat, 'and the one map has the seat in it');
});

test('the page keeps a clock, so a room can end while the Director is watching', () => {
  // `ended` was derived from Date.now() in the render body and nothing ever
  // re-rendered: the close-out could simply never appear.
  assert.match(classes, /function useNow\(/);
  assert.match(classes, /setInterval\(\(\) => setNow\(Date\.now\(\)\), intervalMs\)/);
  assert.match(classes, /return \(\) => clearInterval\(id\)/, 'and it is cleaned up');
  assert.match(classes, /const now = useNow\(\);/);
});

test('attendance checks its answer — the route can legitimately 409', () => {
  assert.match(classes, /if \(!r\.ok\) \{ setWriteError\(d\.error \|\| 'Could not save that — try again\.'\); return; \}/);
  assert.match(classes, /disabled=\{busySeat === s\.seatId\}/, 'and the button says it is working');
  assert.match(classes, /\{writeError && <Notice kind="bad">\{writeError\}<\/Notice>\}/);
});

test('the written exit summary keeps its draft too, and drops it only on success', () => {
  assert.match(classes, /const key = `exit\.\$\{seatId\}`/);
  assert.match(classes, /if \(dirty\) writeDraft\(key, \{ form \}\);/);
  assert.match(classes, /dropDraft\(key\);\s*\n\s*onDone\(\);/,
    'a draft dropped on a failed write is the interruption bug with extra steps');
  assert.match(classes, /drafted\[s\.seatId\] \? 'Finish exit summary · draft saved'/,
    'and the row says the work is still there');
});

test('the exit summary no longer offers a product Kaizen does not sell', () => {
  assert.doesNotMatch(classes, /<option value="private">/, '1:1 tutoring is cut');
  assert.doesNotMatch(classes, /1:1 tutoring, needs individual help/);
  assert.match(classes, /<option value="rebook">/);
  assert.match(classes, /<option value="clinic">/);
});

// ── The page around it ──────────────────────────────────────────────────────

test('the room comes first on /tutor', () => {
  const rooms = tutorPage.indexOf('<TutorClasses />');
  const stats = tutorPage.indexOf('<StatCard label="Awaiting payout"');
  const profile = tutorPage.indexOf('<ProfileEditor');
  assert.ok(rooms > 0 && stats > 0 && profile > 0, 'all three panels still exist');
  assert.ok(rooms < stats, 'the room outranks the payout figures');
  assert.ok(rooms < profile, 'and the public-profile editor');
});

test('the rooms panel no longer names three products and omits the fourth', () => {
  assert.doesNotMatch(tutorPage, /Your classes: Homework Hall, Clinics, Community Hall/,
    'the standing seat is the product, and that title left it out');
  assert.match(tutorPage, /<Panel title="Your rooms">/);
});
