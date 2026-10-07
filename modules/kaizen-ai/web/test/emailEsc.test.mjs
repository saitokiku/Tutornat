import test from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '@/lib/server/email.js';

test('esc neutralizes every HTML-significant character', () => {
  assert.equal(
    esc(`<a href="x" onclick='p'>Bob & Sons</a>`),
    '&lt;a href=&quot;x&quot; onclick=&#39;p&#39;&gt;Bob &amp; Sons&lt;/a&gt;'
  );
});

test('esc escapes & first so entities are not double-broken', () => {
  assert.equal(esc('&lt;'), '&amp;lt;');   // pre-escaped input stays inert, not re-activated
});

test('esc handles non-string and nullish input', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(42), '42');
  assert.equal(esc(''), '');
});

test('a realistic hostile display name cannot break out of an email body', () => {
  const name = `"><img src=x onerror=alert(1)>`;
  const html = `<p>Hi ${esc(name)},</p>`;
  // no new tag can open and no attribute can close — the payload is inert text
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('">'));
});

// ── The mail's clock, and what it may promise ────────────────────────────────
// Source-level pins, because these functions send rather than return and the
// defects they guard are the kind that only show up in somebody's inbox.
import { readFileSync } from 'node:fs';
const emails = readFileSync(new URL('../lib/server/tutoringEmails.js', import.meta.url), 'utf8');
// Comment lines are stripped before the "this pattern is gone" assertions:
// several of those comments NAME the defect they replaced, and a guard that a
// file may not describe its own history is a guard against writing things down.
const emailCode = emails.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('every email writes a room time in the room’s own zone', () => {
  // `new Date(iso).toLocaleString('en-US', …)` with no timeZone is the SERVER's
  // zone — UTC on Vercel — so a 6:00 PM Austin room was mailed out as 11:00 PM
  // on the confirmation, the reminder and the release notice alike. The
  // storefront was fixed for this in wave 2; the mail was not.
  assert.doesNotMatch(emailCode, /toLocaleString\('en-US'/, 'no locale-of-the-server formatting');
  assert.match(emails, /roomDateTime\(iso, tz\)/);
  assert.match(emails, /zoneAbbrev\(iso, tz\)/, 'and the zone is disclosed — mail is read anywhere');
  // The room's own zone reaches the formatter at every room-shaped send.
  const roomSends = emailCode.match(/when\(room\.scheduled_start[^)]*\)/g) || [];
  assert.ok(roomSends.length >= 4, 'four room emails');
  for (const call of roomSends) {
    assert.match(call, /room\.timezone/, `${call} must pass the room's zone`);
  }
});

test('a standing seat is never threatened with release, and no club email offers a video room', () => {
  // shouldReleaseSeat and notifySeatOpened both refuse standing_seat, so the
  // weekly reminder may not tell a $550-a-month family their reserved place is
  // about to go to a waitlist.
  assert.match(emailCode, /room\.kind !== 'standing_seat'\s*&& seat\.booked_via === 'included'\s*&& !seat\.confirmed_at/);
  // Club rooms are in person — that is the product. "The video room opens 15
  // minutes before" was a leftover from the cut 1:1 marketplace.
  assert.doesNotMatch(emailCode, /video room opens/);
  assert.match(emails, /function placeLine\(room\)/);
  assert.match(emails, /in person/);
});
