// Entitlement-table integrity.
//
// checkEntitlement() resolves a cap as:
//   DEFAULT_LIMITS[plan]?.[feature] ?? DEFAULT_LIMITS.free[feature] ?? 0
// so a feature that is metered in a route but MISSING from this table silently
// resolves to 0 and hard-blocks every call — while a feature that is charged
// for but never checked (what /api/grade was) is uncapped spend. Both failure
// modes are silent, which is why they are pinned here.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LIMITS } from '@/lib/server/context.js';
import { CLUB_PLANS, AI_PLANS, SEAT_PLAN } from '@/lib/server/clubPricing.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '..');

// Every feature any route meters or gates. AI features must be positive on
// every plan (a 0 is a silent outage); club features are allowances — 0 is a
// legitimate value meaning "not part of this plan" — but they must be DEFINED
// everywhere or checkEntitlement's fallback chain gets inconsistent.
const AI_FEATURES = [
  'tutor_message', 'grade', 'tts_chars', 'stt_seconds',
  'syllabus_parse', 'report', 'courses', 'handoff',
];
const CLUB_FEATURES = ['club_hall_included', 'club_private_credit', 'group_seat'];

const CLUB_TIERS = ['club', 'plus', 'max'];
const AI_TIERS = ['ai_solo', 'ai_hall'];
const ALL_PAID = [...CLUB_TIERS, ...AI_TIERS, 'seat', 'student', 'family', 'internal'];

test('every plan defines every metered feature', () => {
  for (const [plan, limits] of Object.entries(DEFAULT_LIMITS)) {
    for (const feature of AI_FEATURES) {
      assert.equal(
        typeof limits[feature], 'number',
        `plan "${plan}" is missing a limit for "${feature}" — checkEntitlement would resolve it to 0 and block the feature outright`
      );
      assert.ok(limits[feature] > 0, `plan "${plan}" has a non-positive limit for "${feature}"`);
    }
    for (const feature of CLUB_FEATURES) {
      assert.equal(
        typeof limits[feature], 'number',
        `plan "${plan}" is missing a club allowance entry for "${feature}"`
      );
      assert.ok(limits[feature] >= 0, `plan "${plan}" has a negative allowance for "${feature}"`);
    }
  }
});

test('paid plans are never more restrictive than free on AI features', () => {
  // AI is included in EVERY membership — a club tier that gives less AI than
  // free would make upgrading a downgrade.
  for (const feature of AI_FEATURES) {
    for (const plan of ALL_PAID) {
      assert.ok(
        DEFAULT_LIMITS[plan][feature] >= DEFAULT_LIMITS.free[feature],
        `"${plan}" gives less "${feature}" than free`
      );
    }
  }
});

test('club allowances scale with the tier: club < plus < max, and match the sold numbers', () => {
  // The sold numbers: 4 / 8 / 12 included Homework Hall visits. If these
  // drift from clubPricing.js (the storefront's source of truth), a member is
  // sold one number and metered another.
  assert.equal(DEFAULT_LIMITS.club.club_hall_included, CLUB_PLANS.club.includedHallMonthly);
  assert.equal(DEFAULT_LIMITS.plus.club_hall_included, CLUB_PLANS.plus.includedHallMonthly);
  assert.equal(DEFAULT_LIMITS.max.club_hall_included, CLUB_PLANS.max.includedHallMonthly);
  // The seat is metered on its own feature and carries no Hall allowance.
  assert.equal(DEFAULT_LIMITS.seat.club_seat_included, SEAT_PLAN.seat.includedSeatMonthly);
  assert.equal(DEFAULT_LIMITS.seat.club_hall_included, SEAT_PLAN.seat.includedHallMonthly);
  // Only the seat carries the seat feature.
  for (const plan of Object.keys(DEFAULT_LIMITS)) {
    if (plan !== 'seat') assert.ok(!(DEFAULT_LIMITS[plan].club_seat_included > 0), `${plan} must not carry seat sessions`);
  }
  assert.ok(
    DEFAULT_LIMITS.club.club_hall_included < DEFAULT_LIMITS.plus.club_hall_included
    && DEFAULT_LIMITS.plus.club_hall_included < DEFAULT_LIMITS.max.club_hall_included
  );
  // No tier includes a private-session credit today (dormant mechanism).
  assert.equal(DEFAULT_LIMITS.club.club_private_credit, 0);
  assert.equal(DEFAULT_LIMITS.plus.club_private_credit, 0);
  assert.equal(DEFAULT_LIMITS.max.club_private_credit, 0);
});

test('AI-tier ladder is monotone: free ≤ ai tiers ≤ club on every AI feature', () => {
  // The AI tiers must never out-limit a club membership (that would make the
  // $45 upgrade an AI downgrade) and never under-limit free (broken upgrade).
  for (const feature of AI_FEATURES) {
    for (const tier of AI_TIERS) {
      assert.ok(
        DEFAULT_LIMITS[tier][feature] >= DEFAULT_LIMITS.free[feature],
        `"${tier}" gives less "${feature}" than free`
      );
      assert.ok(
        DEFAULT_LIMITS[tier][feature] <= DEFAULT_LIMITS.club[feature],
        `"${tier}" gives more "${feature}" than the club membership — undercuts memberships`
      );
    }
  }
  // ai_hall carries exactly the one sold visit; ai_solo carries none.
  assert.equal(DEFAULT_LIMITS.ai_hall.club_hall_included, AI_PLANS.ai_hall.includedHallMonthly);
  assert.equal(DEFAULT_LIMITS.ai_solo.club_hall_included, 0);
});

// ── The Max AI card's bullets ────────────────────────────────────────────────
//
// The card is the storefront's only paid AI claim, and it is guarded here
// because both halves of the claim live in this file's subject matter: what a
// bullet SAYS, and whether any route enforces the ceiling it names.
//
// This is a source read rather than a render. AiLadder is a React server
// component and the test runner has no JSX transform — scripts/test-loader.mjs
// only maps the "@/" alias — so importing it would throw on the first tag.
// What keeps the read honest is that nothing here is compared against a
// hand-typed expectation: every bullet is rebuilt FROM DEFAULT_LIMITS and the
// two lists must match exactly. Move a limit and it fails; reword a bullet and
// it fails; add an unpinned fourth claim and it fails.
//
// The previous version of this test asserted a 6x tts_chars ratio for a "6x
// voice" bullet the card had already dropped, and asserted nothing at all
// about the bullet that replaced it. It could not fail for the copy it named.

const aiLadderSrc = fs.readFileSync(path.join(webRoot, 'components', 'AiLadder.js'), 'utf8');

// The items array of the tier marked "Our pick" — the raised, purchasable one.
function recommendedBullets(src) {
  const mark = src.indexOf('mark="Our pick"');
  assert.ok(mark > 0, 'AiLadder no longer marks a recommended tier — this guard has lost its subject');
  const open = src.indexOf('items={[', mark);
  const close = src.indexOf(']}', open);
  assert.ok(open > mark && close > open, 'the recommended tier has no items list to read');
  return [...src.slice(open, close).matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

// The card spells its numbers out, so the expectations do too. An unlisted
// number fails loudly rather than silently skipping the comparison.
const NUMBER_WORD = new Map([
  [1, 'one'], [2, 'two'], [3, 'three'], [4, 'four'], [5, 'five'], [6, 'six'],
  [10, 'ten'], [20, 'twenty'], [30, 'thirty'], [40, 'forty'], [100, 'a hundred'],
]);
function word(n) {
  const w = NUMBER_WORD.get(n);
  assert.ok(w, `the card spells its figures out and there is no word form for ${n} — add it, or change the copy`);
  return w;
}
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

test('the Max AI card sells exactly the deltas DEFAULT_LIMITS actually gives', () => {
  const free = DEFAULT_LIMITS.free;
  const solo = DEFAULT_LIMITS.ai_solo;
  assert.deepEqual(recommendedBullets(aiLadderSrc), [
    'Everything in Free',
    `${Word(solo.tutor_message / free.tutor_message)} times the daily tutoring allowance`,
    `${Word(solo.syllabus_parse)} syllabus and homework imports a day, not ${word(free.syllabus_parse)}`,
    `${Word(solo.report)} weekly reports instead of ${word(free.report)}`,
  ], 'the recommended tier\u2019s bullets and the limit table have drifted apart');
});

// Every feature a route passes to checkEntitlement. A limit that appears in
// DEFAULT_LIMITS but in no route is a number the product does not enforce.
function enforcedFeatures() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const src = fs.readFileSync(full, 'utf8');
        for (const m of src.matchAll(/checkEntitlement\(\s*caller\s*,\s*'([a-z_]+)'/g)) found.add(m[1]);
      }
    }
  };
  walk(path.join(webRoot, 'app', 'api'));
  return found;
}

test('every ceiling the Max AI card sells is one a route actually checks', () => {
  // The bullet this replaced sold `courses`: DEFAULT_LIMITS.free.courses = 2
  // and seed.sql carries the row, but checkEntitlement is never called with
  // it, /api/entitlements/me does not list it, and lib/cloud.js upserts every
  // course row a device syncs. The storefront was selling the lifting of a
  // ceiling a free student never hits.
  const enforced = enforcedFeatures();
  assert.ok(enforced.size > 5, 'found almost no checkEntitlement calls — the scan is broken, not the product');
  for (const feature of ['tutor_message', 'syllabus_parse', 'report']) {
    assert.ok(
      enforced.has(feature),
      `the Max AI card sells "${feature}" but no route under app/api checks it — an unenforced ceiling is not a feature`
    );
  }
});

test('courses stays unsold while nothing enforces it', () => {
  const enforced = enforcedFeatures();
  if (enforced.has('courses')) {
    // Someone gated it. Good — but then this guard is the stale thing: give
    // the claim a CLAIMS_MATRIX row and pin the bullet above instead.
    return;
  }
  assert.ok(
    !/courses|classes/i.test(recommendedBullets(aiLadderSrc).join(' ')),
    'the card claims a course/class ceiling, but checkEntitlement is never called with "courses" — gate it before selling it'
  );
});

test('the AI ladder makes no voice claim while voice is off the storefront', () => {
  // tts_chars/stt_seconds are still metered and still rise on ai_solo; what
  // was removed is the CLAIM, because the voice surface is not sold. If voice
  // comes back it needs a CLAIMS_MATRIX row before it comes back here.
  assert.ok(
    !/voice|speak|talk/i.test(recommendedBullets(aiLadderSrc).join(' ')),
    'a voice claim returned to the AI ladder — /pricing and /ai dropped it when voice_enabled went false'
  );
});

test('the switches a fresh environment comes up with agree with the storefront', () => {
  // voice_enabled seeded `true` while production ran it false and the ladder
  // sold nothing with it, so every new environment — local dev, a fresh deploy,
  // a restored database — came up spending at a second vendor (OpenAI is in
  // this repo for voice and nothing else) on a feature no surface offers.
  // getSettings' no-service-client fallback did the same. Both now agree with
  // the price sheet. If voice is ever sold again it needs a CLAIMS_MATRIX row,
  // and this test is where the seed follows it.
  for (const name of ['seed.sql', 'GO_LIVE.sql']) {
    const sql = fs.readFileSync(path.join(repoRoot, 'supabase', name), 'utf8');
    assert.match(sql, /\('voice_enabled',\s*'false'::jsonb\)/,
      `supabase/${name} seeds voice on for a feature the storefront does not sell`);
  }
  const ctx = fs.readFileSync(path.join(webRoot, 'lib', 'server', 'context.js'), 'utf8');
  assert.match(ctx, /if \(!svc\) return \{[^}]*voice_enabled: false/,
    'the no-service-client fallback switches on a vendor the configured system has switched off');
});

test('grade is capped — it is a paid model call, not a free action', () => {
  // Regression: /api/grade recorded usage but never called checkEntitlement,
  // so the only ceiling was the 20/min burst limiter — which degrades to
  // per-instance counting when Upstash is unset.
  assert.ok(DEFAULT_LIMITS.free.grade > 0 && DEFAULT_LIMITS.free.grade < 1000);
  assert.ok(DEFAULT_LIMITS.club.grade > DEFAULT_LIMITS.free.grade);
});

test('seed.sql and DEFAULT_LIMITS cover the same plan/feature pairs', () => {
  // Drift here is invisible at runtime: the DB row silently overrides the code
  // default, so a stale seed quietly changes what a plan is worth.
  const seed = fs.readFileSync(path.join(repoRoot, 'supabase', 'seed.sql'), 'utf8');
  const seeded = new Set();
  // Plan keys can carry underscores (ai_solo, ai_hall).
  for (const m of seed.matchAll(/\(\s*'([a-z_]+)'\s*,\s*'([a-z_]+)'\s*,/g)) {
    seeded.add(`${m[1]}.${m[2]}`);
  }

  const missing = [];
  for (const [plan, limits] of Object.entries(DEFAULT_LIMITS)) {
    for (const feature of Object.keys(limits)) {
      if (!seeded.has(`${plan}.${feature}`)) missing.push(`${plan}.${feature}`);
    }
  }
  assert.deepEqual(missing, [], `plan/feature pairs in code but not in seed.sql: ${missing.join(', ')}`);
});

test('legacy plans (student, family) keep working limits', () => {
  // Retired from sale, but any account still carrying one must keep its
  // limits — dropping them from DEFAULT_LIMITS would silently downgrade those
  // accounts to free.
  assert.ok(DEFAULT_LIMITS.student, 'student limits removed — legacy accounts would fall back to free');
  assert.ok(DEFAULT_LIMITS.family, 'family limits removed — legacy accounts would fall back to free');
});

test('the profiles.plan CHECK admits every plan in DEFAULT_LIMITS', () => {
  // 0022 widened the constraint, 0027 widened it again; a plan key added to
  // code without a migration breaks every profile write for that plan. The
  // LAST migration to define profiles_plan_check wins, so scan them all.
  const dir = path.join(repoRoot, 'supabase', 'migrations');
  let last = null;
  for (const f of fs.readdirSync(dir).sort()) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!sql.includes('profiles_plan_check')) continue;
    const m = sql.match(/plan in \(([^)]+)\)/);
    if (m) last = m[1];
  }
  assert.ok(last, 'no migration defines the profiles_plan_check constraint');
  const allowed = new Set([...last.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]));
  for (const plan of Object.keys(DEFAULT_LIMITS)) {
    assert.ok(allowed.has(plan), `plan "${plan}" exists in DEFAULT_LIMITS but not in the profiles.plan CHECK`);
  }
});
