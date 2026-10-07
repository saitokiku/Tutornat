// Club pricing — the single source of truth for what anything costs and what
// a tutor is paid. Pure data + functions (same discipline as sessionStates.js):
// no I/O, so every price the product can ever quote is unit-testable, and
// routes NEVER re-derive prices locally.
//
// THE MODEL AS OF 2026-09-02 (docs/STRATEGY.md v0.2, founder's canonical doc):
//   - Kaizen Local sells ONE recurring product: the STANDING SEAT (SEAT_PLAN
//     below) — a reserved, recurring, in-person tutoring place, one price for
//     every payer (cash, 529, TEFA). Retail drop-ins and the free Community
//     Hall stay as the funnel. The AI is free with one optional upgrade
//     (ai_solo, "Max AI"); ai_hall stays built and disclosed but is not wired.
//   - The Club/Plus/Max memberships are RETIRED FROM SALE (SALE_STATUS). Their
//     definitions stay because /terms discloses them, the allowance engine is
//     the metering rail the seat reuses, and zero customers exist to migrate.
//
// THE PRIOR MODEL (Costco-style; founder's shop plan + repricing addendum),
// kept because the retail and member rates below still come from it:
//   - 13+ launch scope. Company-set retail; non-members buy à la carte forever:
//     Homework Hall $14 · Subject Clinic $20 · private $35/30min, $60/60min ·
//     one weekly Community Hall FREE (a permanent product, not a
//     funnel trick).
//   - Memberships include a DEFINED number of Homework Hall visits — never
//     unlimited human time on a small subscription:
//     Club $45 (4 visits/mo) · Plus $79 — THE HERO (8 visits/mo) ·
//     Max $109 (12 visits/mo).
//   - Member pricing on everything past the allowance: extra Hall $9/$8/$7,
//     Clinics $16/$14/$12, private $50/$47/$44 per hour.
//   - Included visits are use-them-this-month (reset on the 1st). There is NO
//     banked rollover: a missed week is handled by a DISCRETIONARY grace-visit
//     courtesy (admin ledger credit), deliberately not coded as an entitlement
//     so no stored-value balance ever exists (counsel item 12 severability).
//   - Tutors are paid a flat admin-set hourly rate ($22–30/hr) as a cost of
//     delivering the session — decoupled from what the learner paid, which is
//     what makes $0 community sessions and included visits payable at all.
//
// Allowances are metered in usage_ledger against plan_entitlements monthly
// limits (see 0022 + lib/server/clubBilling.js). Quotes here take the caller's
// REMAINING counts as inputs; they never read the database.

export const CLUB_PLANS = {
  club: {
    label: 'Club',
    priceCents: 4500,
    includedHallMonthly: 4,
    memberHallCents: 900,        // extra Hall visits beyond the allowance
    memberClinicCents: 1600,     // Subject Clinics (never allowance-included)
    private60Cents: 5000,        // member 1:1 pricing
    private30Cents: 2500,
    privateCreditMonthly: 0,
  },
  plus: {
    label: 'Plus',
    priceCents: 7900,
    includedHallMonthly: 8,
    memberHallCents: 800,
    memberClinicCents: 1400,
    private60Cents: 4700,
    private30Cents: 2350,
    privateCreditMonthly: 0,
  },
  max: {
    label: 'Max',
    priceCents: 10900,
    includedHallMonthly: 12,
    memberHallCents: 700,
    memberClinicCents: 1200,
    private60Cents: 4400,
    private30Cents: 2200,
    privateCreditMonthly: 0,
  },
};

// Non-member retail. A parent can explain this in one sentence.
//
// The Subject Clinic moved from $20 to $30 on 2026-09-02 after the Austin
// market research (docs/PRICING_EVIDENCE.md). The reason is internal, not
// competitive: a taught 1:6 clinic at $20 is about $16 per instructional hour
// against the seat's $50.77, so two clinics a week bought a 1:6 version of the
// standing seat for a third of its price — the drop-in was quietly answering
// the question the seat exists to answer. At $30 the ladder reads the way the
// product actually works: Hall $14 (supervised, 1:8), Clinic $30 (taught, 1:6,
// drop-in), seat $550/mo (taught, 1:4, reserved, named lead teacher, twice a
// week). Roughly a doubling at each step, and the clinic is still well under
// half of every published Austin rate for taught group instruction.
export const RETAIL = {
  hallSeatCents: 1400,
  clinicSeatCents: 3000,
  private30Cents: 3500,
  private60Cents: 6000,
  communityCents: 0,
};

// The AI ladder (founder, 2026-08-12): Free (daily allowance) · AI Solo $11.99 ·
// AI + Hall $24.99. Deliberate decoy structure: Solo exists as an honest choice,
// but ~$13 more buys one real Homework Hall visit a month (a $14 session), so
// ai_hall is the tier the pricing pages divert to. AI tiers are NOT club
// memberships: no member discounts, no rollover; ai_hall's single visit rides
// the same club_hall_included allowance mechanism (0027 seeds monthly_limit=1).
export const AI_PLANS = {
  ai_solo: {
    label: 'Max AI',   // renamed from 'AI Solo' 2026-09-02: the one AI upgrade
    priceCents: 1199,
    includedHallMonthly: 0,
    blurb: 'The full companion, in every gap.',
  },
  ai_hall: {
    label: 'AI + Hall',
    priceCents: 2499,
    includedHallMonthly: 1,
    blurb: 'The full companion, plus one real tutoring session every month.',
  },
};

// Session-pricing def for ai_hall: grants the included visit, then charges
// plain retail (an AI subscriber is not a club member; no discounts).
const AI_SESSION_DEFS = {
  ai_hall: {
    includedHallMonthly: 1,
    memberHallCents: RETAIL.hallSeatCents,
    memberClinicCents: RETAIL.clinicSeatCents,
    private60Cents: RETAIL.private60Cents,
    private30Cents: RETAIL.private30Cents,
    privateCreditMonthly: 0,
  },
};

// THE STANDING SEAT (docs/STRATEGY.md §5.1). One recurring product, one price
// for every payer. Defined here first so the arithmetic is fixed before the
// storefront says a word about it:
//   - 2 sessions a week × 75 minutes, ratio 1:4 (capacity 4), in person, one
//     subject, a named lead tutor. ~8.67 sessions a month → metered as 9
//     (club_seat_included, calendar month, no rollover — same allowance rail as
//     Hall visits, same "no stored value" posture as counsel item 12).
//   - Member rates on everything else at the Plus (hero) level.
//   - Price: the founder's band is $450–650/mo; this pins the modelled midpoint.
//     Changing it means changing /terms, CLAIMS_MATRIX, the Stripe Price and
//     the pinned tests together — that is the point of pinning it.
//   - Seat rooms (kind 'standing_seat') are RESERVED: only seat holders are
//     booked into them (by the standing-seat cron), never sold as drop-ins.
//     groupSeatQuote answers 'reserved' for anyone else, and the claim route
//     refuses that mode — fail toward not selling, never toward $0.
export const SEAT_PLAN = {
  seat: {
    label: 'Standing Seat',
    priceCents: 55000,
    sessionsPerWeek: 2,
    minutes: 75,
    ratio: 4,
    includedSeatMonthly: 9,
    includedHallMonthly: 0,
    memberHallCents: 800,
    memberClinicCents: 1400,
    private60Cents: 4700,
    private30Cents: 2350,
    privateCreditMonthly: 0,
    inPerson: true,
  },
};

// THE DIAGNOSTIC (docs/RELEASE_PLAN.md stage 1). A one-time purchase, not a
// plan and not an entitlement: a family pays once for an adaptive placement
// plus a written report from a person. It is the first thing the Program
// Director sells and the top of the funnel — the conversation that turns
// "how is my kid doing" into "here is the room where we fix it".
//
// It lives here because it is a price, and Hard Rule 2 admits no exceptions.
// It is deliberately NOT in SALE_STATUS or PAID_PLANS: nothing about it is
// metered, nothing about it recurs, and no entitlement key exists for it. The
// order row (diagnostic_order, 0036) is the record; delivery is a human act.
//
// It is CREDITED IN FULL against the first month for a family that takes a seat
// within the window below. That is a credit against a purchase, not a discount
// off the seat, so it does not break the one-price rule (STRATEGY §5.1: one
// price for cash, 529 and TEFA payers). It also answers the one real objection
// to charging at all — every franchise in Austin gives the assessment away as a
// lead magnet — without making the front door free, which would set the wrong
// tier for a $550 product and would fill a four-seat room with tyre-kickers.
// The window is a number here rather than in copy because the promise has to be
// enforceable by the code that applies the credit, and a CLAIMS_MATRIX row
// depends on it being true.
export const DIAGNOSTIC = {
  label: 'Placement diagnostic',
  priceCents: 5900,
  oneTime: true,
  creditsTowardFirstMonth: true,
  creditWindowDays: 30,
  blurb: 'An adaptive assessment, then a written report from the person who will teach your child.',
};

// What is for sale. 'active' plans render on the storefront and are purchasable
// once priced (env) and, for club-gated plans, once club_enabled is true.
// 'retired' plans keep their definitions (terms, metering, legacy resolution)
// but no surface may offer them. Memberships retired 2026-09-02 (STRATEGY §11).
export const SALE_STATUS = {
  seat: 'active',
  ai_solo: 'active',   // the one AI upgrade ("Max AI"); free tier is the product
  ai_hall: 'active',   // built and disclosed; deliberately not wired at launch
  club: 'retired',
  plus: 'retired',
  max: 'retired',
};
export function forSale(plan) {
  return SALE_STATUS[String(plan || '')] === 'active';
}

// What tutors are paid (cost, not price). Bounds mirror the DB CHECK on
// tutors.pay_rate_cents (0023, widened by 0033 and again by 0035); default
// applies when an admin hasn't set one. certifiedDefaultCents is the modelled
// rate for the credentialed tier every public rail requires (STRATEGY §7.4) —
// a licensed or retired teacher delivering seats; it is a default, not a
// separate band. The ceiling is the Program Director's rate: the director is
// also the certified tutor who delivers the room (founder, 2026-09-02), so the
// band has to admit what the director is actually paid.
export const TUTOR_PAY = {
  minCents: 2200,
  maxCents: 5000,
  defaultCents: 2500,
  certifiedDefaultCents: 4000,
};

// The staffing model, in one place, because every margin figure in
// docs/RELEASE_PLAN.md and every hiring page derives from it. The Program
// Director is one person doing three jobs — delivering seat sessions, running
// the room, and selling — at an hourly rate, part time, until seat volume
// justifies more hours. This is a COST model, not a price: nothing quoted to a
// family is derived from it (STRATEGY: price for the market, not for the
// burn). Hours are the founder's dial; the rate is the market rate for a
// credentialed Austin teacher who can also sell.
export const STAFFING = {
  directorHourlyCents: 5000,
  directorHoursPerWeek: 15,
  weeksPerMonth: 52 / 12,
};

/** Monthly cost of the Program Director at the current dial, in cents. */
export function directorMonthlyCents(hoursPerWeek = STAFFING.directorHoursPerWeek) {
  const hours = Math.max(0, Number(hoursPerWeek) || 0);
  return Math.round(STAFFING.directorHourlyCents * hours * STAFFING.weeksPerMonth);
}

// The one price formatter every surface uses. Whole dollars render bare
// ($45); psychological price points keep their cents ($11.99). Rounding a
// .99 price to "$12" would misquote it, which the claims discipline forbids.
export function formatPrice(cents) {
  const n = Math.max(0, Number(cents) || 0);
  return n % 100 === 0 ? `$${n / 100}` : `$${(n / 100).toFixed(2)}`;
}

// Internal staff accounts get member treatment everywhere. Seat holders are
// members: member rates on drop-ins and clinics past their seat sessions.
const MEMBER_PLANS = new Set(['seat', 'club', 'plus', 'max', 'internal']);

export function isClubMember(plan) {
  return MEMBER_PLANS.has(String(plan || ''));
}

function planDef(plan) {
  if (plan === 'internal') {
    // Staff: everything included, nothing charged.
    return { ...CLUB_PLANS.max, memberHallCents: 0, memberClinicCents: 0, private60Cents: 0, private30Cents: 0 };
  }
  return SEAT_PLAN[plan] || CLUB_PLANS[plan] || AI_SESSION_DEFS[plan] || null;
}

/**
 * Price one group seat for one caller. The ONLY place the
 * included-vs-member-vs-retail decision is made.
 *
 * @param {{plan?: string, kind?: string, hallRemaining?: number,
 *          seatRemaining?: number, seatPriceCents?: number}} input
 *   - hallRemaining:  club_hall_included allowance left this month (rollover
 *                     already folded in by clubBilling.clubAllowances)
 *   - seatRemaining:  club_seat_included sessions left this month (seat plan)
 *   - seatPriceCents: the room's posted retail price (group_session row)
 * @returns {{mode: 'free'|'included'|'member'|'retail'|'reserved', amountCents: number,
 *            feature: string|null}}
 *   feature = the usage_ledger key to decrement for included modes, else null.
 *   'reserved' = this room is not for sale to this caller; callers MUST refuse
 *   it (never treat amountCents 0 as free).
 */
export function groupSeatQuote({ plan, kind, hallRemaining = 0, seatRemaining = 0, seatPriceCents } = {}) {
  const def = planDef(plan);

  // The weekly Community Hall is free for everyone — a real product, not a
  // funnel.
  if (kind === 'community_free') return { mode: 'free', amountCents: 0, feature: null };

  // Standing-seat rooms are reserved inventory: a seat holder with sessions
  // left this month is booked in (the cron does this; a manual claim works the
  // same way), and nobody else may buy a place — there is no drop-in price for
  // a seat, by design (STRATEGY §5.1). Internal staff may observe.
  if (kind === 'standing_seat') {
    if (plan === 'internal') return { mode: 'included', amountCents: 0, feature: null };
    if (def && def.includedSeatMonthly > 0 && seatRemaining > 0) {
      return { mode: 'included', amountCents: 0, feature: 'club_seat_included' };
    }
    return { mode: 'reserved', amountCents: 0, feature: null };
  }

  if (kind === 'homework_hall') {
    if (def && def.includedHallMonthly > 0 && hallRemaining > 0) {
      return { mode: 'included', amountCents: 0, feature: 'club_hall_included' };
    }
    if (def) {
      return def.memberHallCents === 0
        ? { mode: 'included', amountCents: 0, feature: null } // internal staff
        : { mode: 'member', amountCents: def.memberHallCents, feature: null };
    }
    const retail = Number.isFinite(seatPriceCents) ? Math.max(0, seatPriceCents) : RETAIL.hallSeatCents;
    return retail === 0
      ? { mode: 'free', amountCents: 0, feature: null }
      : { mode: 'retail', amountCents: retail, feature: null };
  }

  // 'clinic' (and anything unrecognized prices as a clinic — fail toward
  // charging retail, never toward giving paid inventory away). Clinics are
  // never allowance-included: members always pay their tier's clinic price.
  if (def) {
    return def.memberClinicCents === 0
      ? { mode: 'included', amountCents: 0, feature: null } // internal staff
      : { mode: 'member', amountCents: def.memberClinicCents, feature: null };
  }
  const retail = Number.isFinite(seatPriceCents) ? Math.max(0, seatPriceCents) : RETAIL.clinicSeatCents;
  return retail === 0
    ? { mode: 'free', amountCents: 0, feature: null }
    : { mode: 'retail', amountCents: retail, feature: null };
}

/**
 * Price a 1:1 session. House pricing knows exactly two durations; anything
 * ≤45 min books as the 30-minute product, longer books as the hour.
 *
 * The private-credit branch is DORMANT (no current tier includes a private
 * session) but kept: a future tier switches it on by seeding
 * club_private_credit > 0, with no code change.
 *
 * @param {{plan?: string, minutes?: number, creditRemaining?: number}} input
 * @returns {{mode: 'included'|'member'|'retail', amountCents: number,
 *            feature: string|null, minutes: 30|60}}
 */
export function privateQuote({ plan, minutes = 60, creditRemaining = 0 } = {}) {
  const bucket = Number(minutes) <= 45 ? 30 : 60;
  const def = planDef(plan);

  if (def && bucket === 30 && creditRemaining > 0) {
    return { mode: 'included', amountCents: 0, feature: 'club_private_credit', minutes: bucket };
  }
  if (def) {
    const cents = bucket === 30 ? def.private30Cents : def.private60Cents;
    return cents === 0
      ? { mode: 'included', amountCents: 0, feature: null, minutes: bucket } // internal staff
      : { mode: 'member', amountCents: cents, feature: null, minutes: bucket };
  }
  return {
    mode: 'retail',
    amountCents: bucket === 30 ? RETAIL.private30Cents : RETAIL.private60Cents,
    feature: null,
    minutes: bucket,
  };
}

/**
 * What the tutor is paid for a session of this length: flat hourly rate,
 * pro-rated to the minute and snapshotted onto the session row at booking
 * (tutoring_sessions.tutor_pay_cents / group_session.tutor_pay_cents).
 */
export function tutorPayCents(payRateCents, minutes) {
  const rate = Math.min(TUTOR_PAY.maxCents, Math.max(TUTOR_PAY.minCents, Math.round(Number(payRateCents) || TUTOR_PAY.defaultCents)));
  const mins = Math.max(0, Number(minutes) || 0);
  return Math.round((rate * mins) / 60);
}

// Kind-specific catalog defaults (admin-UI defaults; the DB CHECK is 1–30).
// Hall capacity is 8 per tutor BY POLICY (addendum §10): do not overload
// tutors to improve margin. The free community hall runs bigger rooms — but
// no longer 30:1: until the supervision review clears a ratio
// (docs/legal/REVIEW_QUEUE.md), community capacity derives from staffing via
// communityCapacity() below, and the default assumes two staff.
export const KIND_DEFAULTS = {
  clinic: { capacity: 6, minSeats: 2, seatPriceCents: RETAIL.clinicSeatCents },
  homework_hall: { capacity: 8, minSeats: 1, seatPriceCents: RETAIL.hallSeatCents },
  community_free: { capacity: 16, minSeats: 1, seatPriceCents: 0 },
  // Reserved rooms: capacity is the seat's ratio, retail price is meaningless
  // (0 here is "not for sale", enforced by groupSeatQuote's 'reserved' mode),
  // and duration is the seat's 75 minutes (series default; see 0033).
  standing_seat: { capacity: SEAT_PLAN.seat.ratio, minSeats: 1, seatPriceCents: 0, minutes: SEAT_PLAN.seat.minutes },
};

// The supervision law, one place: every kind runs at most 8 students per
// CLEARED staff member in the room ("every body counts toward the ratio").
// For paid rooms that is the existing 8-per-tutor policy; for the free
// community hall it is the interim safety cap (one tutor caps the room at 8,
// two staff at 16) pending the supervision review. `requested` is the admin's
// ask; the answer is what staffing supports.
export const STUDENTS_PER_STAFF = 8;

export function communityCapacity(staffCount, requested) {
  const staff = Math.max(1, Math.round(Number(staffCount) || 1));
  const ceiling = STUDENTS_PER_STAFF * staff;
  const ask = Number(requested);
  const want = Number.isFinite(ask) && ask > 0 ? Math.round(ask) : KIND_DEFAULTS.community_free.capacity;
  return Math.max(1, Math.min(want, ceiling));
}
