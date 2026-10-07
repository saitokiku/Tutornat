// Occupancy mechanics — the PURE half of the load model (0029). Same
// discipline as sessionStates.js/clubPricing.js: no I/O, every rule
// unit-testable, so the storefront sort, the release sweep, and the waitlist
// batch picker can never disagree with their tests.
//
// THE LAW (launch plan v2, gap report 2026-08-13): density beats spread. New
// demand herds into the fullest room that fits; freed capacity is offered to
// the emptiest rooms; a seat someone won't confirm goes back to the pool
// before it becomes an empty chair.

// Calendar day ("2026-08-13") of a UTC instant in an IANA zone — the day the
// FAMILY sees, not the server's.
export function dayKeyInZone(iso, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(iso));
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return String(iso).slice(0, 10);
  }
}

/**
 * Storefront/browse order: chronological by LOCAL day, and inside a day the
 * fullest room first (herding — bookings concentrate instead of spreading one
 * student per room), ties chronological. Rooms already full sort after
 * bookable ones within the day: they're kept visible for "join the list",
 * not offered ahead of seats that exist.
 */
export function herdingCompare(a, b) {
  const dayA = dayKeyInZone(a.start, a.timezone);
  const dayB = dayKeyInZone(b.start, b.timezone);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  const fullA = a.seatsLeft <= 0 ? 1 : 0;
  const fullB = b.seatsLeft <= 0 ? 1 : 0;
  if (fullA !== fullB) return fullA - fullB;                 // bookable before full
  if (a.seatsLeft !== b.seatsLeft) return a.seatsLeft - b.seatsLeft; // fullest first
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

/**
 * Rebooking/suggestion order (after a cancel/release, grace-visit redemption):
 * emptiest first — banked demand levels troughs instead of crowding peaks.
 */
export function emptiestCompare(a, b) {
  if (a.seatsLeft !== b.seatsLeft) return b.seatsLeft - a.seatsLeft;
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

// Confirm-or-release policy. Booking inside this window IS confirmation.
export const CONFIRM_LEAD_MS = 24 * 3600 * 1000;
// Unconfirmed included seats release this close to start.
export const RELEASE_LEAD_MS = 4 * 3600 * 1000;

/**
 * Should the T-4h sweep release this seat? ONLY an included (membership/
 * ai_hall allowance) seat, still merely 'booked', never confirmed, that was
 * actually warned (reminder sent — we never release someone we never asked),
 * inside the release window but not yet started. Paid and free seats are
 * never auto-released: paid is purchased inventory, free community seats
 * cost the room nothing.
 */
export function shouldReleaseSeat({ seat, room, now = Date.now() }) {
  if (!seat || !room) return false;
  // A STANDING SEAT is never released, and this is the one exception that
  // matters. Confirm-or-release exists to recycle an included Homework Hall
  // visit that a member did not answer for, so the place goes to someone who
  // will use it. A $550/month seat is the opposite kind of thing: the family
  // has bought the place for the month, /tutoring tells them in as many words
  // that it is theirs whether or not their child turns up, and the release path
  // would have cancelled the session, offered the reserved place to the
  // waitlist, and restored the allowance against the WRONG feature
  // (club_hall_included, which the seat plan carries zero of) — burning the
  // session instead of returning it.
  if (room.kind === 'standing_seat') return false;
  if (seat.status !== 'booked') return false;
  if (seat.booked_via !== 'included') return false;
  if (seat.confirmed_at) return false;
  if (!seat.reminder_sent_at) return false;
  const start = new Date(room.scheduled_start).getTime();
  return start - now <= RELEASE_LEAD_MS && start > now;
}

/** Booking inside 24h auto-confirms (a late booking IS the confirmation). */
export function confirmedAtBooking({ scheduledStart, now = Date.now() }) {
  return new Date(scheduledStart).getTime() - now <= CONFIRM_LEAD_MS;
}

/**
 * Who gets the "a seat opened" email: the oldest `waiting` rows, one per open
 * seat. First come, first served — a notification, not a hold (a hold is
 * inventory invisible to the storefront, the exact bug this system exists to
 * kill). Pure: pass the waiting rows, get back the batch to notify.
 */
export function pickWaitlistBatch(waitingRows, seatsLeft) {
  if (!Array.isArray(waitingRows) || seatsLeft <= 0) return [];
  return [...waitingRows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, seatsLeft);
}
