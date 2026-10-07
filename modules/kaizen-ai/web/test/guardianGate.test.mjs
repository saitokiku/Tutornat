// The guardian gate — the rule that decides whether a minor may sit alone in a
// live video room with an adult. Two audit findings live here, and both were
// exploitable with nothing but a browser and the anon key:
//
//   A1 — is_minor came from client-written auth metadata and DEFAULTED TO ADULT
//        when birth_year was absent, so `supabase.auth.signUp()` with no
//        birth_year minted an account the gate waved straight through.
//   A2 — ANY on-behalf booking counted as consent, and "on behalf" included an
//        invite link, which is created by whoever knows the student's email and
//        activated by whoever controls the student account. A teen with two
//        addresses could link them and consent to themselves.
//   A4 — the guardian address a minor names AT SIGNUP never passed a
//        server-side check. It rides in on auth metadata written by the
//        browser, and "must differ from your own" lived only in LoginPage.js,
//        so a signup posted straight at Supabase could name the student's own
//        inbox and mint an account that was already consentable by its owner.
//
// This file pins the whole matrix — relationship × age posture × consent —
// because the failure mode is silent, and the next person to touch it deserves
// a red test rather than a plausible-looking refactor.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardianGateSatisfied, bookingRelationship } from '@/lib/server/family.js';
import {
  agePosture, decideSelfDeclaredBirthYear, normalizeStatedBirthYear,
  guardianEmailIsSelf, decideSignupGuardianEmail,
} from '@/lib/server/context.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const THIS_YEAR = new Date().getFullYear();
const y = (age) => THIS_YEAR - age;

// ── Age posture: the fail-safe half (A1) ─────────────────────────────────────

test('agePosture: a plausible stated year decides adult vs minor', () => {
  assert.equal(agePosture({ birth_year: y(40) }), 'adult');
  assert.equal(agePosture({ birth_year: y(18) }), 'adult');
  assert.equal(agePosture({ birth_year: y(17) }), 'minor');
  assert.equal(agePosture({ birth_year: y(13) }), 'minor');
});

test('agePosture: no usable birth year is UNKNOWN, never adult', () => {
  for (const profile of [
    undefined, null, {},
    { birth_year: null },
    { birth_year: undefined },
    { birth_year: '' },
    { birth_year: 'nineteen ninety' },
    { birth_year: NaN },
    { birth_year: 1990.5 },
    { birth_year: y(12) },   // below the 13+ product floor — not a usable claim
    { birth_year: y(200) },  // implausible
    { birth_year: y(-3) },   // the future
  ]) {
    assert.equal(agePosture(profile), 'unknown', `${JSON.stringify(profile)} must not read as an age`);
  }
});

test('agePosture: a stored is_minor flag outranks the arithmetic', () => {
  assert.equal(agePosture({ birth_year: y(40), is_minor: true }), 'minor');
  // ...but the flag cannot manufacture adulthood out of a missing year.
  assert.equal(agePosture({ birth_year: null, is_minor: false }), 'unknown');
});

test('an account signed up with no birth_year cannot be treated as an adult by the gate', () => {
  // Exactly the row `supabase.auth.signUp({ options: { data: {} } })` produced
  // before the fix: is_minor false, no birth year, no guardian on file.
  const ghost = { birth_year: null, is_minor: false, guardian_consent_at: null, guardian_email: null };
  assert.equal(agePosture(ghost), 'unknown');
  for (const relationship of ['self', 'invite', null]) {
    assert.ok(!guardianGateSatisfied({ studentProfile: ghost, relationship }),
      `unverified age must not book live video (relationship=${relationship})`);
  }
});

// ── The gate matrix: relationship × age × consent (A2) ───────────────────────

const AGES = {
  adult: { birth_year: y(40), is_minor: false },
  minor: { birth_year: y(15), is_minor: true },
  unknown: { birth_year: null, is_minor: false },
};
const RELATIONSHIPS = ['self', 'managed', 'invite', null];

test('the gate matrix: only a verified adult, a recorded consent, or the MANAGING parent gets through', () => {
  for (const [posture, base] of Object.entries(AGES)) {
    for (const consented of [false, true]) {
      for (const relationship of RELATIONSHIPS) {
        const studentProfile = { ...base, guardian_consent_at: consented ? '2026-01-01T00:00:00Z' : null };
        const expected = posture === 'adult' || consented || relationship === 'managed';
        assert.equal(
          guardianGateSatisfied({ studentProfile, relationship }), expected,
          `posture=${posture} consented=${consented} relationship=${relationship}`
        );
      }
    }
  }
});

test('an invite-linked "parent" booking for an unconsented minor is refused — this is the A2 bypass', () => {
  const teen = { birth_year: y(15), is_minor: true, guardian_consent_at: null };
  assert.ok(!guardianGateSatisfied({ studentProfile: teen, relationship: 'invite' }));
  // The same teen, once a guardian has actually clicked the emailed link:
  assert.ok(guardianGateSatisfied({ studentProfile: { ...teen, guardian_consent_at: '2026-02-02' }, relationship: 'invite' }));
});

test('the gate fails closed on a missing student profile, and on a caller that forgets the relationship', () => {
  assert.ok(!guardianGateSatisfied({ studentProfile: null, relationship: 'managed' }));
  assert.ok(!guardianGateSatisfied({ studentProfile: undefined }));
  const teen = { birth_year: y(15), is_minor: true, guardian_consent_at: null };
  assert.ok(!guardianGateSatisfied({ studentProfile: teen }), 'no relationship passed → no implicit consent');
});

test('a profile selected without birth_year reads as unverified, not as an adult', () => {
  // Every caller must select birth_year; one that does not gets the strict
  // answer rather than a silent pass.
  assert.ok(!guardianGateSatisfied({ studentProfile: { is_minor: false, guardian_consent_at: null }, relationship: 'invite' }));
});

// ── Which relationship earned the on-behalf booking ──────────────────────────

function stubSvc({ profiles = {}, links = [] } = {}) {
  return {
    from(table) {
      const f = {};
      const chain = {
        select() { return chain; },
        eq(col, val) { f[col] = val; return chain; },
        async maybeSingle() {
          if (table === 'profiles') return { data: profiles[f.id] || null, error: null };
          const hit = links.find((l) => l.parent_id === f.parent_id
            && l.student_id === f.student_id && l.status === f.status);
          return { data: hit || null, error: null };
        },
      };
      return chain;
    },
  };
}

test('bookingRelationship: managed_by wins, an active link is an invite, nothing is null', async () => {
  const svc = stubSvc({
    profiles: {
      'kid-1': { id: 'kid-1', managed_by: 'parent-1' },
      'teen-1': { id: 'teen-1', managed_by: null },
    },
    links: [{ parent_id: 'parent-1', student_id: 'teen-1', status: 'active', created_via: 'invite' }],
  });
  assert.equal(await bookingRelationship(svc, 'parent-1', 'parent-1'), 'self');
  assert.equal(await bookingRelationship(svc, 'parent-1', ''), 'self');
  assert.equal(await bookingRelationship(svc, 'parent-1', 'kid-1'), 'managed');
  assert.equal(await bookingRelationship(svc, 'parent-1', 'teen-1'), 'invite');
  assert.equal(await bookingRelationship(svc, 'parent-1', 'stranger'), null);
  assert.equal(await bookingRelationship(svc, 'other-parent', 'kid-1'), null);
});

test('a link that merely CLAIMS created_via=managed is still only an invite', async () => {
  // 0011's client INSERT policy constrains parent_id and status='pending' but
  // not created_via, so a browser can stamp a link 'managed' and have the
  // student accept it. managed_by (service-role only) is the authority.
  const svc = stubSvc({
    profiles: { 'teen-2': { id: 'teen-2', managed_by: null } },
    links: [{ parent_id: 'attacker', student_id: 'teen-2', status: 'active', created_via: 'managed' }],
  });
  assert.equal(await bookingRelationship(svc, 'attacker', 'teen-2'), 'invite');
  const teen = { birth_year: y(15), is_minor: true, guardian_consent_at: null };
  assert.ok(!guardianGateSatisfied({ studentProfile: teen, relationship: await bookingRelationship(svc, 'attacker', 'teen-2') }));
});

// ── Source assertions: the callers must keep feeding the gate ────────────────

test('every live-video booking path passes the RELATIONSHIP, never a bare on-behalf flag', () => {
  for (const p of ['app/api/tutoring/group/route.js', 'app/api/tutoring/sessions/route.js']) {
    const src = read(p);
    assert.ok(!/guardianGateSatisfied\(\{[^}]*onBehalf[^}]*\}\)/.test(src),
      `${p} must not gate on onBehalf — an invite link sets it too`);
    assert.match(src, /guardianGateSatisfied\(\{ studentProfile, relationship \}\)/, p);
    assert.match(src, /birth_year,is_minor,guardian_consent_at/, `${p} must select birth_year for the age posture`);
  }
});

test('the standing-seat cron re-derives the relationship every run instead of comparing ids', () => {
  const src = read('lib/server/series.js');
  assert.match(src, /bookingRelationship\(svc, seat\.user_id, seat\.student_id\)/,
    'a revoked or invite-only link must stop the weekly booking');
  assert.ok(!/const onBehalf = seat\.student_id !== seat\.user_id/.test(src));
});

test('signup stores an unverified age as a minor, and the profile insert is what carries it', () => {
  const src = read('lib/server/context.js');
  assert.match(src, /const isMinor = agePosture\(\{ birth_year: birthYear \}\) !== 'adult'/,
    'a missing birth year must produce a minor, not an adult');
  assert.match(src, /is_minor: isMinor/);
});

// ── Guardian email: the FIRST address (A4) ───────────────────────────────────
//
// The freeze, the cap and the audit log below all govern CHANGING an address
// that is already on the row. The first one never went through that path — it
// is browser-written auth metadata, and the only sameness check was in the
// browser too. These tests pin the server-side rule that decides what the
// profile insert is willing to store.
//
// What they pin is a floor, not a proof. None of this establishes that the
// address belongs to an adult, or to a parent, or to anyone other than the
// student — REVIEW_QUEUE item 16 is where that question actually lives.

test('a minor naming their own address as guardian stores NO guardian email', () => {
  const decision = decideSignupGuardianEmail('teen@example.com', 'teen@example.com', true);
  assert.equal(decision.email, null, 'this is the self-consent — it must not reach the row');
  assert.equal(decision.refusal, 'self_named');
  // Case and whitespace are not a bypass; neither is a plus-tag on either side.
  for (const stated of [
    ' TEEN@example.com ', 'teen+mom@example.com', 'TEEN+Parent@Example.com', 'teen+@example.com',
  ]) {
    assert.equal(decideSignupGuardianEmail('teen@example.com', stated, true).email, null, stated);
  }
  assert.equal(decideSignupGuardianEmail('teen+school@example.com', 'teen@example.com', true).email, null,
    'the fold has to work in both directions');
});

test('a distinct guardian address IS stored, normalised', () => {
  assert.deepEqual(
    decideSignupGuardianEmail('teen@example.com', '  Mom@Example.com  ', true),
    { email: 'mom@example.com', refusal: null, stated: 'mom@example.com' }
  );
  // Same local part at a different domain is a different mailbox, and a
  // different local part at the same domain is a different person.
  assert.equal(decideSignupGuardianEmail('teen@example.com', 'teen@other.com', true).email, 'teen@other.com');
  assert.equal(decideSignupGuardianEmail('teen@example.com', 'dad@example.com', true).email, 'dad@example.com');
  // Gmail's dots-are-ignored rule is deliberately NOT applied — it is one
  // provider's policy, and elsewhere first.last@ and firstlast@ can be two
  // people. Refusing a real parent's address costs them their approval email.
  assert.equal(decideSignupGuardianEmail('first.last@example.com', 'firstlast@example.com', true).email,
    'firstlast@example.com');
});

test('an unusable guardian address is refused rather than parked on the row', () => {
  // A stored non-address would look like a guardian on file: it silences the
  // "send us an address" prompt while every send against it fails.
  for (const stated of ['not-an-email', 'mom@localhost', 'mom @example.com', '@example.com']) {
    const decision = decideSignupGuardianEmail('teen@example.com', stated, true);
    assert.equal(decision.email, null, stated);
    assert.equal(decision.refusal, 'unusable_address');
  }
});

test('nothing stated, and adults, store nothing — and neither is a refusal', () => {
  for (const stated of [undefined, null, '', '   ']) {
    assert.deepEqual(decideSignupGuardianEmail('teen@example.com', stated, true),
      { email: null, refusal: null, stated: null });
  }
  // An adult's signup carries no guardian relationship to record at all.
  assert.equal(decideSignupGuardianEmail('adult@example.com', 'someone@example.com', false).email, null);
  assert.equal(decideSignupGuardianEmail('adult@example.com', 'someone@example.com', false).refusal, null);
});

test('guardianEmailIsSelf never guesses from a missing side', () => {
  assert.equal(guardianEmailIsSelf('', 'mom@example.com'), false);
  assert.equal(guardianEmailIsSelf('teen@example.com', ''), false);
  assert.equal(guardianEmailIsSelf(null, undefined), false);
});

test('the gate still refuses the unconsented minor whichever way the address went', () => {
  // The point of the whole fix: storing or not storing an address changes who
  // gets emailed, never who may book. Both rows are gated until a guardian
  // clicks the link — self-naming just means nobody was ever emailed.
  const refused = decideSignupGuardianEmail('teen@example.com', 'teen+mom@example.com', true);
  const stored = decideSignupGuardianEmail('teen@example.com', 'mom@example.com', true);
  for (const guardian_email of [refused.email, stored.email]) {
    const teen = { birth_year: y(15), is_minor: true, guardian_email, guardian_consent_at: null };
    for (const relationship of ['self', 'invite', null]) {
      assert.ok(!guardianGateSatisfied({ studentProfile: teen, relationship }),
        `an unconsented minor must not book (guardian_email=${guardian_email})`);
    }
  }
});

test('the profile insert uses the shared rule, and a refusal leaves an audit row', () => {
  const src = read('lib/server/context.js');
  assert.match(src, /decideSignupGuardianEmail\(data\.user\.email, meta\.guardian_email, isMinor\)/,
    'the first address must be decided server-side, against the account’s OWN email');
  assert.match(src, /const guardianEmail = guardian\.email/,
    'a refused address must not reach the insert by another route');
  assert.match(src, /guardian\.signup_email_refused/,
    'an account that asked to be its own guardian is invisible unless we record it');
});

test('the browser keeps its copy of the check, and agrees with the server about plus-tags', () => {
  // Better UX to catch it before submit — but the comment must not let the next
  // reader mistake the client check for the enforcement point.
  const src = read('components/LoginPage.js');
  assert.match(src, /sameMailbox\(g, email\)/, 'the pre-submit check stays');
  assert.match(src, /guardian email must be different from your own/i);
  assert.match(src, /split\('\+'\)\[0\]/, 'client and server must agree on what “different” means');
  assert.match(src, /UX, NOT SECURITY/, 'the client check must say what it is');
});

// ── Guardian email: what re-pointing costs (A4) ──────────────────────────────

test('the guardian email freezes once consent is recorded, is capped, and every change is audited', () => {
  const src = read('app/api/family/guardian-consent/route.js');
  assert.match(src, /guardian_consent_locked/, 'a consented account must not silently re-point its guardian');
  assert.match(src, /guardian_email_change_limit/, 're-pointing must be capped');
  assert.match(src, /guardian\.email_changed/, 'every change must leave an audit row for a human to review');
  assert.match(src, /from: currentEmail \|\| null, to: newEmail/, 'the audit row must show the move, not just that one happened');
});

// ── The way back out: one-time self-declaration (the legacy lockout) ─────────
//
// Closing A1 had a cost nobody paid for a week. 0007 added birth_year as NULL
// to every row that already existed, so 'unknown' — the posture the gate
// refuses — became the posture of every account older than the column, and
// there was no way to leave it: birth_year is written only at profile insert,
// 0011 revokes client UPDATE on it, and the guardian path wants an address
// those accounts were never asked for. These tests pin the door that was added
// and, more importantly, its jambs.

test('a legacy account with no birth year is gated, states a year once, and then books', () => {
  // Exactly what 0007 left behind: no year, no flag, no guardian.
  const legacy = { birth_year: null, is_minor: false, guardian_consent_at: null, guardian_email: null };
  assert.equal(agePosture(legacy), 'unknown');
  assert.ok(!guardianGateSatisfied({ studentProfile: legacy, relationship: 'self' }),
    'this is the lockout — it must be real before the remedy means anything');

  const decision = decideSelfDeclaredBirthYear(legacy, y(34));
  assert.ok(decision.ok);
  assert.deepEqual(decision.patch, { birth_year: y(34), is_minor: false });

  const after = { ...legacy, ...decision.patch };
  assert.equal(agePosture(after), 'adult');
  assert.ok(guardianGateSatisfied({ studentProfile: after, relationship: 'self' }),
    'a stated adult year must un-gate live booking — otherwise there is still no way out');
});

test('the signup fail-safe’s is_minor does not outlive the absent year it stood in for', () => {
  // getCaller writes is_minor:true for a signup carrying no usable year. That
  // `true` is the fail-safe echoing the blank field, not a support judgement —
  // if it survived the declaration, this week's accounts would stay stuck.
  const ghost = { birth_year: null, is_minor: true, guardian_consent_at: null };
  const decision = decideSelfDeclaredBirthYear(ghost, y(30));
  assert.ok(decision.ok);
  assert.equal(decision.patch.is_minor, false);
  assert.equal(agePosture({ ...ghost, ...decision.patch }), 'adult');
});

test('a stated year cannot be overwritten — not even an unusable one, which is the bypass', () => {
  for (const existing of [y(15), y(40), y(11)]) {
    // y(11) is stored but reads 'unknown'. If the remedy keyed off POSTURE
    // instead of the stored VALUE, that row could be "corrected" to an adult
    // year and every age rule in the product would be optional.
    const decision = decideSelfDeclaredBirthYear({ birth_year: existing, is_minor: true }, y(40));
    assert.ok(!decision.ok, `a row already holding ${existing} must not be rewritten`);
    assert.equal(decision.code, 'birth_year_already_set');
    assert.equal(decision.status, 409);
    assert.ok(!decision.patch, 'a refusal must not carry a write');
  }
});

test('a stated under-13 year is refused and never written', () => {
  for (const stated of [y(12), y(5), y(0)]) {
    const decision = decideSelfDeclaredBirthYear({ birth_year: null }, stated);
    assert.ok(!decision.ok, `${stated} is below the 13+ product floor`);
    assert.equal(decision.code, 'under_13_unsupported');
    // Storing the claim would freeze the row at an age we cannot serve, because
    // the once-only rule would then refuse every later correction.
    assert.ok(!decision.patch, 'an under-13 claim must not be stored');
  }
});

test('a stated year that makes the caller a minor still needs the guardian link', () => {
  const legacy = { birth_year: null, is_minor: false, guardian_consent_at: null };
  const decision = decideSelfDeclaredBirthYear(legacy, y(15));
  assert.ok(decision.ok);
  assert.equal(decision.patch.is_minor, true);

  const after = { ...legacy, ...decision.patch };
  assert.equal(agePosture(after), 'minor');
  for (const relationship of ['self', 'invite', null]) {
    assert.ok(!guardianGateSatisfied({ studentProfile: after, relationship }),
      'declaring a minor year must not be a self-consent (relationship=' + relationship + ')');
  }
  assert.ok(guardianGateSatisfied({ studentProfile: { ...after, guardian_consent_at: '2026-03-03' }, relationship: 'self' }));
});

test('garbage and implausible years are refused rather than stored as an unusable posture', () => {
  for (const stated of ['', null, undefined, 'nineteen ninety', 1990.5, y(-1), y(200), y(111)]) {
    const decision = decideSelfDeclaredBirthYear({ birth_year: null }, stated);
    assert.ok(!decision.ok, `${String(stated)} must not be stored`);
    assert.ok(!decision.patch);
  }
});

test('signup and the self-declaration read a stated year through the SAME normalizer', () => {
  // A remedy that accepted more than the door it re-opens would be a wider
  // door. One function, both callers.
  assert.equal(normalizeStatedBirthYear(String(y(20))), y(20), 'a form sends strings');
  assert.equal(normalizeStatedBirthYear(y(20)), y(20));
  for (const bad of [null, undefined, '', 'x', 1990.5, THIS_YEAR + 1, THIS_YEAR - 121]) {
    assert.equal(normalizeStatedBirthYear(bad), null, `${String(bad)} is not a stated year`);
  }
  const src = read('lib/server/context.js');
  assert.match(src, /const birthYear = normalizeStatedBirthYear\(meta\.birth_year\)/,
    'the signup insert must use the shared normalizer, not a second copy of the window');
});

// ── Source assertions: the door, and the copy on it ──────────────────────────

test('the birth-year route writes once, atomically, on the service role, and leaves a trail', () => {
  const src = read('app/api/account/birth-year/route.js');
  assert.match(src, /decideSelfDeclaredBirthYear/, 'the rule lives in context.js, not in a second copy here');
  assert.match(src, /\.is\('birth_year', null\)/,
    'the once-only rule must be in the WHERE clause — a read-then-write races itself');
  assert.match(src, /auditLog\(/, 'a self-asserted age is only as good as the record of who asserted it');
  assert.ok(!/is_minor: false/.test(src), 'the route must not hand-write a posture — the decision does');
});

test('the guardian refusal never claims an email was sent when none was', () => {
  const modal = read('components/BookModal.js');
  // The server copy for guardian_consent_required says "We emailed them a
  // link", which is false for an account with no guardian address. The sheet
  // renders what is on file instead of echoing it.
  assert.ok(!/setMsg\(d\.error \|\| 'Could not book\.'\);\s*\n\s*if \(d\.code === 'guardian_consent_required'\)/.test(modal),
    'the server copy must not be shown for the guardian refusal');
  assert.match(modal, /nothing has been sent/i, 'the no-guardian-on-file case must say so');
  assert.match(modal, /guardianEmail/, 'and must offer somewhere to put an address');

  const route = read('app/api/family/guardian-consent/route.js');
  assert.match(route, /guardian_email_missing/, 'no guardian on file is an instruction, not a dead end');
  assert.match(route, /guardian_email_not_sent/,
    'an unconfigured mailer must not be reported to the user as a sent email');
});

test('/settings is where an unknown age posture gets fixed', () => {
  const src = read('app/settings/page.js');
  assert.match(src, /\/api\/account\/birth-year/, 'the birth-year declaration needs a UI or it does not exist');
  assert.match(src, /\/api\/family\/guardian-consent/, 'and so does the guardian email');
});
