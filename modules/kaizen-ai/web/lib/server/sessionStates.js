// Tutoring-session lifecycle state machine (audit REL-002).
// Pure data + predicates so the rules are unit-testable and every mutation
// path (PATCH route, webhook fulfillment, cron release) shares ONE truth.
//
//   pending_payment → scheduled | cancelled
//   scheduled       → in_progress | completed | cancelled | no_show
//   in_progress     → completed | cancelled | no_show
//   completed / cancelled / no_show — terminal

export const TRANSITIONS = {
  pending_payment: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

// Refund policy (audit REL-002): refunds only make sense for sessions that
// never happened. Tutor-cancel always refunds; student-cancel refunds only
// ≥24h before start. A completed/no_show session is never refundable here.
// The window constants are exported so Terms discloses the same numbers this
// code enforces — one truth, like clubPricing.
export const REFUND_WINDOW_HOURS = 24;        // 1:1 sessions
export const GROUP_REFUND_WINDOW_HOURS = 12;  // group seats (Hall/Clinic)

export function refundEligible({ status, scheduledStart, byTutor, now = Date.now() }) {
  if (!['scheduled', 'in_progress'].includes(status)) return false;
  if (byTutor) return true;
  const hoursUntil = (new Date(scheduledStart).getTime() - now) / 3600000;
  return hoursUntil >= REFUND_WINDOW_HOURS;
}

// Marketplace economics (audit-adjacent single source of truth): tutors keep
// 89% of paid sessions; free intro sessions accrue nothing.
export function earningsSplit(amountCents, introFree = false) {
  const gross = introFree ? 0 : Math.max(0, Math.round(amountCents || 0));
  const tutorCut = Math.round(gross * 0.89);
  return { gross, tutorCut, fee: gross - tutorCut };
}

// ── Group drop-in economics ──────────────────────────────────────────────────
// A different shape from 1:1, and deliberately so. Modelled before it was built:
//
//   1:1 at $40:      tutor $35.60 (89%), Stripe $1.46, platform $2.94  (7.4%)
//   group 4 x $15:   tutor $45.00 (75%), Stripe $2.94, platform $12.06 (20.1%)
//
// Four times the platform margin per tutor-hour, while the student pays 62% less
// and the tutor earns 26% more than they would 1:1. The take rate is higher
// because the platform is doing something genuinely harder here — filling a room
// on a schedule — not because the tutor is worth less.
//
// REVENUE SHARE, NOT A FIXED FEE. A flat $45 payment loses money at every fill
// below capacity (at one seat the platform is down $30.73). The tutor takes a
// percentage of what the room actually earned, so the platform is never
// underwater and the split is legible to both sides.

export const GROUP_DEFAULTS = {
  capacity: 4,
  minSeats: 2,
  tutorShare: 0.75,
  seatPriceCents: 1500,
  minSeatPriceCents: 1000,
  maxSeatPriceCents: 2500,
  // Min-fill is decided this long before the room opens: late enough to fill,
  // early enough that a cancellation is not a wasted evening.
  cutoffLeadMs: 2 * 60 * 60 * 1000,
};

/**
 * What the room earned and who gets what.
 * `seatsFilled` counts PAID seats only — an unpaid hold is not revenue.
 */
export function groupEarnings(seatPriceCents, seatsFilled, tutorShare = GROUP_DEFAULTS.tutorShare) {
  const seats = Math.max(0, Math.round(Number(seatsFilled) || 0));
  const price = Math.max(0, Math.round(Number(seatPriceCents) || 0));
  const share = Math.min(0.95, Math.max(0, Number(tutorShare) || 0));

  const gross = price * seats;
  const tutorCut = Math.round(gross * share);
  return {
    gross,
    seats,
    tutorCut,
    fee: gross - tutorCut,          // platform, BEFORE payment processing
    perSeat: price,
  };
}

/**
 * Does this room run? Below the minimum it cancels and everyone is refunded —
 * the platform never pays out on an empty room, and the tutor never sits
 * through an hour that earns less than not showing up.
 */
export function groupViable(seatsFilled, minSeats = GROUP_DEFAULTS.minSeats) {
  return (Number(seatsFilled) || 0) >= Math.max(1, Number(minSeats) || 1);
}

/**
 * What the tutor is looking at when deciding whether to host. They are
 * comparing against filling that hour 1:1, so say so plainly rather than
 * quoting a rate that only holds at full capacity.
 */
export function groupProjection(seatPriceCents, capacity, tutorShare, oneToOneRateCents) {
  const full = groupEarnings(seatPriceCents, capacity, tutorShare).tutorCut;
  const oneToOne = Math.round((Number(oneToOneRateCents) || 4000) * 0.89);
  const breakEvenSeats = Math.ceil(oneToOne / (seatPriceCents * tutorShare));
  return {
    atCapacityCents: full,
    oneToOneCents: oneToOne,
    // Below this many seats the tutor would have done better on a 1:1 booking.
    breakEvenSeats,
    beatsOneToOneAtCapacity: full > oneToOne,
  };
}

/**
 * Refund policy for a seat. Stricter than 1:1 on late cancels, and for a
 * reason worth stating: dropping out of a 4-seat room at short notice can push
 * it below its minimum and cancel the session for three other students.
 * Platform-side cancellation always refunds in full.
 */
export function groupRefundEligible({ status, scheduledStart, byPlatform = false, now = Date.now() }) {
  if (byPlatform) return true;                      // we cancelled: always refund
  if (!['pending_payment', 'booked'].includes(status)) return false;
  const hoursUntil = (new Date(scheduledStart).getTime() - now) / 3600000;
  return hoursUntil >= GROUP_REFUND_WINDOW_HOURS;
}

// ── Pulling a tutor out of the market ────────────────────────────────────────
const PULL_LIVE_1TO1 = ['scheduled', 'in_progress', 'pending_payment'];
const PULL_LIVE_GROUP = ['open', 'confirmed', 'in_progress'];
const PULL_HELD_SEATS = ['pending_payment', 'booked'];

/**
 * Plan the removal of a tutor from the marketplace. PURE — no I/O, so the
 * decision logic is testable without a database or a Stripe key. Given the
 * tutor's live work, returns exactly what should be cancelled and which
 * payments should be refunded. Executed by lib/server/tutorSafety.js.
 *
 * Platform-initiated cancellation refunds unconditionally. `refundEligible`
 * with `byTutor: true` returns true for any live session regardless of notice,
 * which is the correct posture: the student did nothing wrong, and a
 * cancellation window exists to protect a tutor's time from late cancellers,
 * not to let the platform keep money for a session it cancelled itself.
 *
 * @param {{sessions?: Array, rooms?: Array, seats?: Array, now?: number}} input
 */
export function planPull({ sessions = [], rooms = [], seats = [], now = Date.now() }) {
  const cancelSessions = [];
  for (const s of sessions) {
    if (!PULL_LIVE_1TO1.includes(s.status)) continue;
    if (new Date(s.scheduled_start).getTime() < now && s.status !== 'in_progress') continue;
    const refund = Boolean(
      s.paid
      && s.stripe_payment_intent_id
      && s.refund_status === 'none'
      && refundEligible({ status: s.status, scheduledStart: s.scheduled_start, byTutor: true, now }),
    );
    cancelSessions.push({ id: s.id, refund, paymentIntent: s.stripe_payment_intent_id || null });
  }

  const liveRoomIds = new Set(
    rooms.filter((r) => PULL_LIVE_GROUP.includes(r.status)
      && new Date(r.scheduled_start).getTime() >= now).map((r) => r.id),
  );
  const cancelSeats = seats
    .filter((x) => liveRoomIds.has(x.group_session_id) && PULL_HELD_SEATS.includes(x.status))
    .map((x) => ({
      id: x.id,
      // A seat still awaiting checkout has taken no money; refunding it is a
      // no-op that would log a spurious Stripe error.
      refund: Boolean(x.paid && x.stripe_payment_intent_id && x.refund_status === 'none'),
      paymentIntent: x.stripe_payment_intent_id || null,
    }));

  return { cancelSessions, cancelRooms: [...liveRoomIds], cancelSeats };
}
