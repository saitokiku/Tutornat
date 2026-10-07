// Club pricing — spec of record. These numbers are what the storefront sells
// and what Terms discloses; changing them here means changing the pricing page,
// /terms, and the founder's shop sheet (repricing addendum) together.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUB_PLANS, RETAIL, TUTOR_PAY, KIND_DEFAULTS, AI_PLANS, SEAT_PLAN, SALE_STATUS,
  groupSeatQuote, privateQuote, tutorPayCents, isClubMember, forSale,
  formatPrice,
} from '@/lib/server/clubPricing.js';

// ── The standing seat (docs/STRATEGY.md §5.1), pinned cell by cell ───────────
// The one recurring Local product. These numbers are what /terms discloses and
// what the seat's Stripe Price must carry; change them together or not at all.

test('the standing seat is $550/mo: 2 × 75 min a week, 1:4, 9 sessions, in person', () => {
  const seat = SEAT_PLAN.seat;
  assert.equal(seat.priceCents, 55000);
  assert.equal(seat.sessionsPerWeek, 2);
  assert.equal(seat.minutes, 75);
  assert.equal(seat.ratio, 4);
  assert.equal(seat.includedSeatMonthly, 9);
  assert.equal(seat.includedHallMonthly, 0, 'a seat is not a Hall allowance');
  assert.equal(seat.inPerson, true);
  // ~8.67 sessions a month, metered as 9 — never fewer than the calendar delivers.
  assert.ok(seat.includedSeatMonthly >= Math.ceil(seat.sessionsPerWeek * 52 / 12) - 1);
});

test('the seat sits inside the founder band and is one price for every payer', () => {
  assert.ok(SEAT_PLAN.seat.priceCents >= 45000 && SEAT_PLAN.seat.priceCents <= 65000);
  // Exactly one seat plan: there is no cash price and an ESA price.
  assert.deepEqual(Object.keys(SEAT_PLAN), ['seat']);
});

test('seat holders get Plus-level member rates on everything else', () => {
  assert.equal(SEAT_PLAN.seat.memberHallCents, CLUB_PLANS.plus.memberHallCents);
  assert.equal(SEAT_PLAN.seat.memberClinicCents, CLUB_PLANS.plus.memberClinicCents);
  assert.equal(SEAT_PLAN.seat.private60Cents, CLUB_PLANS.plus.private60Cents);
  assert.ok(isClubMember('seat'));
});

test('memberships are retired from sale; the seat and the AI upgrade are not', () => {
  assert.equal(SALE_STATUS.seat, 'active');
  assert.equal(SALE_STATUS.ai_solo, 'active');
  for (const tier of ['club', 'plus', 'max']) assert.equal(SALE_STATUS[tier], 'retired', tier);
  assert.ok(forSale('seat'));
  assert.ok(!forSale('plus'));
  assert.ok(!forSale('nonsense'));
  // Every sold plan has a definition; every membership still has one too.
  for (const tier of Object.keys(SALE_STATUS)) {
    assert.ok(SEAT_PLAN[tier] || CLUB_PLANS[tier] || AI_PLANS[tier], `${tier} has no definition`);
  }
});

test('seat rooms are reserved inventory, never sold at the door', () => {
  // A seat holder with sessions left is booked in on the seat allowance.
  assert.deepEqual(
    groupSeatQuote({ plan: 'seat', kind: 'standing_seat', seatRemaining: 3 }),
    { mode: 'included', amountCents: 0, feature: 'club_seat_included' },
  );
  // A seat holder who has used the month's sessions is NOT quoted a price —
  // there is no drop-in price for a seat.
  assert.equal(groupSeatQuote({ plan: 'seat', kind: 'standing_seat', seatRemaining: 0 }).mode, 'reserved');
  // Nobody else may buy a place: retail, member, or free.
  for (const plan of [undefined, 'free', 'plus', 'ai_solo']) {
    const q = groupSeatQuote({ plan, kind: 'standing_seat', hallRemaining: 8, seatRemaining: 9, seatPriceCents: 1400 });
    assert.equal(q.mode, 'reserved', `plan=${plan}`);
    assert.equal(q.amountCents, 0);
    assert.equal(q.feature, null);
  }
  // Staff may observe.
  assert.equal(groupSeatQuote({ plan: 'internal', kind: 'standing_seat' }).mode, 'included');
  // The kind's catalog defaults are the seat's own numbers, and it has no retail price.
  assert.equal(KIND_DEFAULTS.standing_seat.capacity, SEAT_PLAN.seat.ratio);
  assert.equal(KIND_DEFAULTS.standing_seat.minutes, SEAT_PLAN.seat.minutes);
  assert.equal(KIND_DEFAULTS.standing_seat.seatPriceCents, 0);
});

test('a seat holder buying a Hall drop-in pays the member Hall rate, not the seat', () => {
  const q = groupSeatQuote({ plan: 'seat', kind: 'homework_hall', hallRemaining: 0, seatRemaining: 9, seatPriceCents: RETAIL.hallSeatCents });
  assert.deepEqual(q, { mode: 'member', amountCents: SEAT_PLAN.seat.memberHallCents, feature: null });
});

test('the seat clears the cash-cow gate in borrowed space at built and certified pay', () => {
  // STRATEGY §5.1 arithmetic, pinned: labour per seat-month at each rate.
  const seat = SEAT_PLAN.seat;
  const sessionsPerMonth = seat.sessionsPerWeek * 52 / 12;
  for (const rate of [2750, TUTOR_PAY.certifiedDefaultCents]) {
    const labour = (rate * seat.minutes / 60 / seat.ratio) * sessionsPerMonth;
    const gm = (seat.priceCents - labour) / seat.priceCents;
    assert.ok(gm > 0.75, `labour-only gross margin at ${rate}/hr is ${(gm * 100).toFixed(0)}%`);
  }
});

test('the pay band admits the credentialed tier', () => {
  assert.equal(TUTOR_PAY.minCents, 2200);
  assert.equal(TUTOR_PAY.maxCents, 5000);   // the Program Director's rate (0035)
  assert.equal(TUTOR_PAY.defaultCents, 2500);
  assert.equal(TUTOR_PAY.certifiedDefaultCents, 4000);
  assert.ok(TUTOR_PAY.certifiedDefaultCents <= TUTOR_PAY.maxCents);
});

// ── The sold matrix, pinned cell by cell ─────────────────────────────────────

test('membership prices are $45 / $79 / $109', () => {
  assert.equal(CLUB_PLANS.club.priceCents, 4500);
  assert.equal(CLUB_PLANS.plus.priceCents, 7900);
  assert.equal(CLUB_PLANS.max.priceCents, 10900);
});

test('included Homework Hall visits are 4 / 8 / 12 per month', () => {
  assert.equal(CLUB_PLANS.club.includedHallMonthly, 4);
  assert.equal(CLUB_PLANS.plus.includedHallMonthly, 8);
  assert.equal(CLUB_PLANS.max.includedHallMonthly, 12);
});

test('member pricing on extra Hall visits is $9 / $8 / $7', () => {
  assert.equal(CLUB_PLANS.club.memberHallCents, 900);
  assert.equal(CLUB_PLANS.plus.memberHallCents, 800);
  assert.equal(CLUB_PLANS.max.memberHallCents, 700);
});

test('member Subject Clinic pricing is $16 / $14 / $12', () => {
  assert.equal(CLUB_PLANS.club.memberClinicCents, 1600);
  assert.equal(CLUB_PLANS.plus.memberClinicCents, 1400);
  assert.equal(CLUB_PLANS.max.memberClinicCents, 1200);
});

test('member 1:1 rates are $50 / $47 / $44 per hour (Target-style repricing)', () => {
  assert.equal(CLUB_PLANS.club.private60Cents, 5000);
  assert.equal(CLUB_PLANS.plus.private60Cents, 4700);
  assert.equal(CLUB_PLANS.max.private60Cents, 4400);
  // 30-minute member prices are half the hourly, to the cent.
  assert.equal(CLUB_PLANS.club.private30Cents, 2500);
  assert.equal(CLUB_PLANS.plus.private30Cents, 2350);
  assert.equal(CLUB_PLANS.max.private30Cents, 2200);
});

test('retail: Hall $14 · Clinic $20 · 1:1 $35/$60 · community $0', () => {
  assert.equal(RETAIL.hallSeatCents, 1400);
  assert.equal(RETAIL.clinicSeatCents, 3000);   // raised 2026-09-02; docs/PRICING_EVIDENCE.md
  assert.equal(RETAIL.private30Cents, 3500);
  assert.equal(RETAIL.private60Cents, 6000);
  assert.equal(RETAIL.communityCents, 0);
});

test('no tier includes a private-session credit (mechanism dormant), and nothing banks', () => {
  for (const def of Object.values(CLUB_PLANS)) assert.equal(def.privateCreditMonthly, 0);
  // Rollover is retired (counsel item 12 severability): no plan banks visits;
  // grace visits are a discretionary admin ledger credit, never an entitlement.
});

test('member pricing is never above retail — membership must win on math', () => {
  for (const [tier, def] of Object.entries(CLUB_PLANS)) {
    assert.ok(def.memberHallCents <= RETAIL.hallSeatCents, `${tier} hall extra above retail`);
    assert.ok(def.memberClinicCents <= RETAIL.clinicSeatCents, `${tier} clinic above retail`);
    assert.ok(def.private30Cents <= RETAIL.private30Cents, `${tier} 30-min above retail`);
    assert.ok(def.private60Cents <= RETAIL.private60Cents, `${tier} hourly above retail`);
  }
  // The conversion math the storefront quotes: 4 retail Halls ($56) > Club ($45).
  assert.ok(4 * RETAIL.hallSeatCents > CLUB_PLANS.club.priceCents);
  // And 8 retail Halls ($112) > Plus ($79) — the hero's pitch.
  assert.ok(8 * RETAIL.hallSeatCents > CLUB_PLANS.plus.priceCents);
});

// ── groupSeatQuote decision order ────────────────────────────────────────────

test('the weekly Community Hall is free for everyone, member or not', () => {
  for (const plan of [null, 'free', 'club', 'plus', 'max']) {
    const q = groupSeatQuote({ plan, kind: 'community_free', seatPriceCents: 0 });
    assert.equal(q.mode, 'free');
    assert.equal(q.amountCents, 0);
    assert.equal(q.feature, null);
  }
});

test('a Hall visit books included while the allowance lasts, member overage after', () => {
  const withAllowance = groupSeatQuote({ plan: 'plus', kind: 'homework_hall', hallRemaining: 3, seatPriceCents: 1200 });
  assert.deepEqual(
    { mode: withAllowance.mode, amountCents: withAllowance.amountCents, feature: withAllowance.feature },
    { mode: 'included', amountCents: 0, feature: 'club_hall_included' }
  );
  const exhausted = groupSeatQuote({ plan: 'plus', kind: 'homework_hall', hallRemaining: 0, seatPriceCents: 1200 });
  assert.deepEqual(
    { mode: exhausted.mode, amountCents: exhausted.amountCents },
    { mode: 'member', amountCents: 800 }
  );
});

test('non-members pay the room’s posted retail price', () => {
  const hall = groupSeatQuote({ plan: 'free', kind: 'homework_hall', hallRemaining: 0, seatPriceCents: 1200 });
  assert.deepEqual({ mode: hall.mode, amountCents: hall.amountCents }, { mode: 'retail', amountCents: 1200 });
  const clinic = groupSeatQuote({ plan: 'free', kind: 'clinic', seatPriceCents: 1800 });
  assert.deepEqual({ mode: clinic.mode, amountCents: clinic.amountCents }, { mode: 'retail', amountCents: 1800 });
});

test('Subject Clinics are never allowance-included — members always pay their tier price', () => {
  // Even with hall allowance remaining, a clinic charges the member rate.
  const q = groupSeatQuote({ plan: 'max', kind: 'clinic', hallRemaining: 12, seatPriceCents: 1800 });
  assert.deepEqual({ mode: q.mode, amountCents: q.amountCents, feature: q.feature },
    { mode: 'member', amountCents: 1200, feature: null });
});

test('included and free modes never charge; charged modes never carry a feature key', () => {
  const cases = [
    groupSeatQuote({ plan: 'max', kind: 'homework_hall', hallRemaining: 12, seatPriceCents: 1200 }),
    groupSeatQuote({ plan: 'free', kind: 'community_free', seatPriceCents: 0 }),
    groupSeatQuote({ plan: 'club', kind: 'homework_hall', hallRemaining: 0, seatPriceCents: 1200 }),
    groupSeatQuote({ plan: null, kind: 'clinic', seatPriceCents: 1800 }),
  ];
  for (const q of cases) {
    if (q.mode === 'included' || q.mode === 'free') {
      assert.equal(q.amountCents, 0, `${q.mode} must be $0`);
    } else {
      assert.ok(q.amountCents > 0, `${q.mode} must charge`);
      assert.equal(q.feature, null, 'a charged seat must never decrement an allowance');
    }
  }
});

test('an unrecognized kind prices as a clinic — fail toward charging, never toward free', () => {
  const q = groupSeatQuote({ plan: 'free', kind: 'mystery', seatPriceCents: 1800 });
  assert.equal(q.mode, 'retail');
  assert.ok(q.amountCents > 0);
});

// ── privateQuote ─────────────────────────────────────────────────────────────

test('1:1 buckets: ≤45 min books as the 30-minute product, longer as the hour', () => {
  assert.equal(privateQuote({ plan: null, minutes: 30 }).amountCents, 3500);
  assert.equal(privateQuote({ plan: null, minutes: 45 }).amountCents, 3500);
  assert.equal(privateQuote({ plan: null, minutes: 60 }).amountCents, 6000);
  assert.equal(privateQuote({ plan: null, minutes: 90 }).amountCents, 6000);
});

test('member 1:1 pricing by tier', () => {
  assert.equal(privateQuote({ plan: 'club', minutes: 60 }).amountCents, 5000);
  assert.equal(privateQuote({ plan: 'plus', minutes: 60 }).amountCents, 4700);
  assert.equal(privateQuote({ plan: 'max', minutes: 60 }).amountCents, 4400);
  assert.equal(privateQuote({ plan: 'club', minutes: 30 }).amountCents, 2500);
  assert.equal(privateQuote({ plan: 'plus', minutes: 30 }).amountCents, 2350);
});

test('the private-credit branch stays wired for a future tier, but no one qualifies today', () => {
  // With a credit remaining, a member 30-min books included — the machinery
  // works; plan_entitlements simply seeds 0 credits on every current tier.
  const q = privateQuote({ plan: 'plus', minutes: 30, creditRemaining: 1 });
  assert.deepEqual(
    { mode: q.mode, amountCents: q.amountCents, feature: q.feature },
    { mode: 'included', amountCents: 0, feature: 'club_private_credit' }
  );
  // Never applies to an hour.
  assert.equal(privateQuote({ plan: 'plus', minutes: 60, creditRemaining: 1 }).mode, 'member');
});

// ── Tutor pay ────────────────────────────────────────────────────────────────

test('tutor pay is a flat hourly rate pro-rated to the minute, clamped to $22–$30', () => {
  assert.equal(tutorPayCents(2500, 60), 2500);
  assert.equal(tutorPayCents(2500, 30), 1250);
  assert.equal(tutorPayCents(3000, 45), 2250);
  // Clamps: below the floor and above the ceiling both snap to bounds.
  assert.equal(tutorPayCents(1000, 60), TUTOR_PAY.minCents);
  assert.equal(tutorPayCents(9900, 60), TUTOR_PAY.maxCents);
  // Unset rate → default $25/hr.
  assert.equal(tutorPayCents(null, 60), TUTOR_PAY.defaultCents);
});

test('occupied-seat economics: a well-filled Hall clears the tutor hour; capacity policy is 8 per tutor', () => {
  // Addendum §22-23: ~$8.50 blended × 8 seats = $68 against $30-35 loaded labor.
  assert.equal(KIND_DEFAULTS.homework_hall.capacity, 8);
  const fullRetailHall = KIND_DEFAULTS.homework_hall.capacity * RETAIL.hallSeatCents; // $96
  assert.ok(fullRetailHall > TUTOR_PAY.maxCents * 2, 'a full Hall must earn well beyond the tutor cost');
  // Even at the deepest member overage price ($6), a full room beats the hour.
  assert.ok(KIND_DEFAULTS.homework_hall.capacity * CLUB_PLANS.max.memberHallCents > TUTOR_PAY.maxCents);
  // Community sessions earn $0 by design; the cost is the acquisition budget.
  assert.equal(KIND_DEFAULTS.community_free.seatPriceCents, 0);
  // Clinics: up to 6 students, higher price point.
  assert.equal(KIND_DEFAULTS.clinic.capacity, 6);
  assert.ok(KIND_DEFAULTS.clinic.minSeats >= 2, 'clinics keep min-fill economics');
});

test('isClubMember covers the three tiers + internal, nothing else', () => {
  for (const plan of ['club', 'plus', 'max', 'internal']) assert.ok(isClubMember(plan));
  for (const plan of ['free', 'student', 'family', null, undefined, 'demo']) assert.ok(!isClubMember(plan));
});

// ── The AI ladder (Free / Solo $15 / + Hall $19), decoy structure ────────────
// Founder decision 2026-08-12: Solo is an honest middle choice; $4 more buys
// one real Homework Hall visit a month, so ai_hall is the divert target.

test('AI plan prices are $11.99 (solo) and $24.99 (+ one Hall visit)', () => {
  assert.equal(AI_PLANS.ai_solo.priceCents, 1199);
  assert.equal(AI_PLANS.ai_hall.priceCents, 2499);
});

test('ai_hall includes exactly 1 Homework Hall visit per month; ai_solo none', () => {
  assert.equal(AI_PLANS.ai_hall.includedHallMonthly, 1);
  assert.equal(AI_PLANS.ai_solo.includedHallMonthly, 0);
});

test('ai_hall Hall visit is included while allowance remains, retail after', () => {
  const withCredit = groupSeatQuote({ plan: 'ai_hall', kind: 'homework_hall', hallRemaining: 1 });
  assert.deepEqual(withCredit, { mode: 'included', amountCents: 0, feature: 'club_hall_included' });
  const spent = groupSeatQuote({ plan: 'ai_hall', kind: 'homework_hall', hallRemaining: 0, seatPriceCents: 1400 });
  assert.equal(spent.mode, 'member');    // has a plan def, so "member" mode...
  assert.equal(spent.amountCents, 1400); // ...but priced at retail: no club discount
});

test('AI tiers get NO club discounts: clinic and 1:1 price at retail', () => {
  assert.equal(groupSeatQuote({ plan: 'ai_hall', kind: 'clinic', seatPriceCents: 3000 }).amountCents, 3000);
  assert.equal(privateQuote({ plan: 'ai_hall', minutes: 60 }).amountCents, 6000);
  assert.equal(privateQuote({ plan: 'ai_solo', minutes: 60 }).amountCents, 6000);
});

test('AI tiers are not club members (no member scheduling perks)', () => {
  assert.equal(isClubMember('ai_solo'), false);
  assert.equal(isClubMember('ai_hall'), false);
});

test('formatPrice renders whole dollars bare and .99 prices with cents', () => {
  assert.equal(formatPrice(4500), '$45');
  assert.equal(formatPrice(1400), '$14');
  assert.equal(formatPrice(1199), '$11.99');
  assert.equal(formatPrice(2499), '$24.99');
  assert.equal(formatPrice(0), '$0');
  // The divert nudge computes a whole-dollar difference from .99 prices.
  assert.equal(formatPrice(AI_PLANS.ai_hall.priceCents - AI_PLANS.ai_solo.priceCents), '$13');
});
