// The cohort pattern sentence — the one a parent needs and that no row could
// produce before cohorts existed. Pure, so it is pinned without a renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortPattern } from '@/lib/roomTime.js';
import { kindLabel, isTaught, ROOM_KINDS } from '@/lib/roomKinds.js';

test('a two-evening cohort reads as one sentence', () => {
  assert.equal(
    cohortPattern([{ weekday: 2, localStartTime: '18:00' }, { weekday: 4, localStartTime: '18:00' }]),
    'Tuesdays and Thursdays, 6:00 PM',
  );
});

test('a cohort whose evenings differ says both, rather than averaging them', () => {
  // Collapsing this to one time sends a family to the wrong room on Thursday.
  const out = cohortPattern([
    { weekday: 2, localStartTime: '18:00' },
    { weekday: 4, localStartTime: '17:00' },
  ]);
  assert.match(out, /Tue 6:00 PM/);
  assert.match(out, /Thu 5:00 PM/);
});

test('one evening is still a sentence, and no evenings is silence', () => {
  assert.equal(cohortPattern([{ weekday: 1, localStartTime: '16:30' }]), 'Mondays, 4:30 PM');
  for (const bad of [[], null, undefined]) assert.equal(cohortPattern(bad), '');
});

test('every room kind has exactly one label, and the seat is not a clinic', () => {
  // The console badged every $550 seat room "Clinic" because its local map had
  // no entry for standing_seat and fell through to the default.
  assert.equal(kindLabel('standing_seat'), 'Standing Seat');
  assert.equal(kindLabel('homework_hall'), 'Homework Hall');
  assert.equal(kindLabel('community_free'), 'Community Hall');
  assert.equal(kindLabel('clinic'), 'Subject Clinic');
  // An unknown kind is a generic session, never someone else's product.
  assert.equal(kindLabel('nonsense'), 'Session');
});

test('the supervision firewall is data, not prose', () => {
  // Review-queue item 20: every rail pays for tutoring; the Hall is
  // supervision; no surface may blur them.
  assert.equal(isTaught('standing_seat'), true);
  assert.equal(isTaught('clinic'), true);
  assert.equal(isTaught('homework_hall'), false, 'the Hall is supervised study, not tutoring');
  assert.equal(isTaught('community_free'), false);
  assert.equal(isTaught('nonsense'), false, 'an unknown kind must not claim to be taught');
});

test('the kind map covers every kind the database allows', () => {
  // The CHECK on group_session.kind (0033) is the source of truth for what a
  // room can be. A kind in the database with no entry here is how the console
  // came to badge a seat "Clinic".
  for (const kind of ['clinic', 'homework_hall', 'community_free', 'standing_seat']) {
    assert.ok(ROOM_KINDS[kind], `${kind} must have a label and a tone`);
  }
});

// ── The map may not fork ─────────────────────────────────────────────────────
// Every one of these was a real defect, not a hypothetical: DropInSessions
// badged a $550 seat room "Clinic" because its local map had no standing_seat
// entry; ScheduleBrowser toned the free Community Hall `warn` where the
// canonical map says `muted`, so /schedule and RoomCard painted one room two
// colours on the same page; and tutoringEmails had no standing_seat entry
// either, so a seat family's confirmation called the product they had just
// bought "Session".
//
// lib/roomKinds.js is markup-free precisely so a route or a mailer can import
// it. There is no reason left to retype it, so this fails if anyone does.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

test('lib/roomKinds.js is the only place a kind is given a label or a tone', () => {
  // NARROW ON PURPOSE. Plenty of files legitimately key on a room kind —
  // clubPricing's KIND_DEFAULTS (kind -> capacity and price), series.js's
  // STANDING_FEATURE (kind -> allowance), /tutoring's price row. Those are not
  // second opinions about what a room IS. What may not fork is the LABEL a
  // reader sees and the TONE that colours it, because those are the two the
  // canonical map owns and the two that actually drifted.
  const kinds = ['clinic', 'homework_hall', 'community_free', 'standing_seat'];
  // A value that is a human label for a room, or a tone/colour for one.
  const LABELISH = /:\s*'[^']*(Hall|Clinic|Seat|Session)[^']*'/;
  const TONEISH = /:\s*'[^']*(k-badge|text-accent|text-good|text-warn|text-muted)[^']*'/;
  // The interest vocabulary (seat / diagnostic / ai / community_free / ...) is a
  // DIFFERENT enum that happens to share two spellings; lib/server/interest.js
  // owns it and app/api/admin/funnel renders its labels.
  const ALLOW = new Set([path.join('app', 'api', 'admin', 'funnel', 'route.js')]);
  const offenders = [];

  for (const root of ['app', 'components', 'lib']) {
    for (const file of walk(path.join(webRoot, root))) {
      const rel = path.relative(webRoot, file);
      if (rel === path.join('lib', 'roomKinds.js') || ALLOW.has(rel)) continue;
      const code = readFileSync(file, 'utf8')
        .split('\n')
        // Comments are stripped: several files legitimately NAME the maps they
        // deleted, in the comment explaining why.
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join('\n');
      const bad = kinds.filter((k) => {
        const m = code.match(new RegExp(`(^|[{,\\s])${k}\\s*:.*$`, 'm'));
        return m && (LABELISH.test(m[0]) || TONEISH.test(m[0]));
      });
      if (bad.length) offenders.push(`${rel} labels/tones ${bad.join(', ')}`);
    }
  }

  assert.deepEqual(offenders, [],
    'a kind->label or kind->tone map lives outside lib/roomKinds.js — import kindLabel/ROOM_KINDS instead');
});
