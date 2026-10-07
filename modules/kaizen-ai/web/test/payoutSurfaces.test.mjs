// The two human surfaces behind the group-room payout hold: the tutor's "Your
// classes" list and the admin payout queue. The server side of both is pinned
// by groupHoldPayout.test.mjs; what round 6 found is that the SERVER can be
// right while the screen shows nothing — /api/tutoring/group?tutorView=1 was
// returning needsRoster/holdExpiresAt to a component that read neither, so a
// held room looked exactly like any other past room and the tutor never learned
// the hour was sitting unpaid.
//
// These are source-pinning tests in the idiom of hallOps.test.mjs: client
// components can't be imported into node:test, so what is pinned is that the
// keys are consumed, the instruction is on screen, and — the other half of the
// round — that neither screen makes a promise the code does not keep.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const classes = src('components/TutorClasses.js');
const admin = src('app/admin/page.js');
const groupRoute = src('app/api/tutoring/group/route.js');

// ── Tutor: a held room is visibly unpaid, and the flag is answerable ─────────

test('TutorClasses reads the two keys the tutor view sends about an unpaid room', () => {
  // Both ends of the contract, so neither side can drift alone.
  assert.match(groupRoute, /needsRoster/);
  assert.match(groupRoute, /holdExpiresAt: needsRoster \?/);
  assert.match(classes, /room\.needsRoster === true/);
  assert.match(classes, /room\.holdExpiresAt/);
});

test('a held room shows what to do and by when', () => {
  assert.match(classes, /Mark who was here to get paid for this one/);
  assert.match(classes, /closes unpaid on \{when\(room\.holdExpiresAt\)\}/,
    'the deadline is shown, not just the fact of the hold');
  assert.match(classes, /holdLeft\(room\.holdExpiresAt\)/, 'and how much of it is left');
  assert.match(classes, /k-badge k-badge-warn/, 'flagged in the row itself, not only in a panel');
});

test('the flag leads into the roster, where Here/No-show already work', () => {
  assert.match(classes, /needsRoster && \(\s*<button type="button" onClick=\{\(\) => setOpen\(room\.id\)\}/,
    'the callout opens the roster panel for that room');
  assert.match(classes, /<RosterPanel[^>]*needsRoster=\{needsRoster\}/);
  assert.match(classes, /onRosterChange=\{load\}/,
    'closing the roster re-reads the rooms so the flag clears — a flag you cannot answer is noise');
  assert.match(classes, /onRosterChange\?\.\(\)/);
});

// ── Admin: no promise the data cannot keep ──────────────────────────────────

test('the unpaid queue no longer claims rooms stay on the list forever', () => {
  assert.doesNotMatch(admin, /stay on this list until you settle them/,
    'unpaidGroupRooms is a bounded, newest-first scan — an old room can age off it');
  assert.match(admin, /not a permanent list/);
});

test('the queue surfaces its own size and says when it was cut', () => {
  assert.match(admin, /readRoomQueue/);
  assert.match(admin, /queue\.total/, 'a count, so "showing N of M" is possible');
  assert.match(admin, /queue\.truncated \?/);
  assert.match(admin, /older unsettled rooms are <b>not shown<\/b>/);
  // Defensive read: the payload may carry the envelope whole, flattened, or
  // (older builds) as a bare array of rooms.
  assert.match(admin, /Array\.isArray\(raw\) \? \{ rooms: raw \}/);
  assert.match(admin, /payload\?\.roomsTruncated === true/);
});

test('a failed rooms lookup is an explicit state, not a silently empty queue', () => {
  assert.match(admin, /roomsUnavailable/);
  assert.match(admin, /The unpaid-room queue could not be loaded/);
});

// ── Admin: "No pay" is reversible, and the dialog describes what it is ───────

test('the no-pay dialog no longer promises a reversal with no path to it', () => {
  assert.doesNotMatch(admin, /you can still accrue it later if that turns out to be wrong/);
  assert.match(admin, /Record NOTHING OWED for this room/);
  assert.match(admin, /To undo it, use the "Written off" list below/);
  assert.match(admin, /this browser keeps it/,
    'the dialog states the limit of the undo instead of implying a durable one');
});

test('written-off rooms stay reachable, with a real Accrue that reverses the $0 settlement', () => {
  assert.match(admin, /writeOffs\.map/, 'they are rendered, not just remembered');
  assert.match(admin, /settleRoom\(w, 'accrue', \{ reversing: true \}\)/);
  assert.match(admin, /Reverse the write-off and accrue/);
  assert.match(admin, /this browser only/, 'the list says where it lives');
  // The reversal is the server's accrueGroupRoom overwriting the zero-cent row;
  // if that ever stops being possible this UI is a lie, so pin it too.
  const maintenance = fs.readFileSync(path.join(webRoot, 'lib', 'server', 'maintenance.js'), 'utf8');
  assert.match(maintenance, /export async function accrueGroupRoom/);
  assert.match(maintenance, /\.eq\('amount_cents', 0\)/,
    'the update is gated on the row still being the $0 marker');
});

test('the write-off index is guarded — localStorage can throw or be empty', () => {
  assert.match(admin, /function readWriteOffs\(\)[\s\S]*?try \{[\s\S]*?\} catch \{ return \[\]; \}/);
  assert.match(admin, /function saveWriteOffs\(list\)[\s\S]*?try \{[\s\S]*?\} catch/);
  assert.match(admin, /useEffect\(\(\) => \{ setWriteOffs\(readWriteOffs\(\)\); \}, \[\]\);/,
    'read after mount so the server and first client render agree');
});
