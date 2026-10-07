// Recurring weekly class series (0024 group_session_series) — the club's
// schedule engine. A series row is the template ("Algebra I Clinic · Tuesday
// 5:00 PM America/New_York"); materializeSeries() turns it into concrete
// group_session rows a couple of weeks ahead, idempotently, from the hourly
// cron.
//
// TIMEZONES, DELIBERATELY WITHOUT A LIBRARY: recurrence here is weekly-only —
// one weekday, one local wall-clock time, no exceptions, no RRULEs. For that
// shape, the standard two-pass Intl trick resolves each instance's UTC
// instant exactly: guess the UTC time assuming one offset, read back what
// wall-clock that lands on in the zone, and correct by the difference. Each
// instance resolves its OWN offset, which is precisely what makes "Tuesday
// 5 PM Eastern" stay 5 PM across DST transitions (the UTC instant shifts an
// hour; the wall clock doesn't). The DST weeks are pinned in series.test.mjs.

import { tutorPayCents, KIND_DEFAULTS, communityCapacity } from '@/lib/server/clubPricing';
import { clubAllowances, consumeAllowance } from '@/lib/server/clubBilling';
import { confirmedAtBooking } from '@/lib/server/occupancy';
import { guardianGateSatisfied, bookingRelationship } from '@/lib/server/family';
import { sendGroupSeatEmails } from '@/lib/server/tutoringEmails';

// Which allowance a standing booking draws, by room kind. Absent = not a
// standing product (clinics, community hall).
//
// Exported because three call sites need the same answer — this sweep, the
// member-facing standing-seat action and the admin enrolment route — and a
// restatement in any of them is a silent way for a seat holder to be metered
// against the wrong allowance. One map, one truth.
export const STANDING_FEATURE = { homework_hall: 'club_hall_included', standing_seat: 'club_seat_included' };

// What wall-clock time does this UTC instant show in `timeZone`?
function wallClockInZone(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/**
 * The UTC instant at which `timeZone` shows local `y-m-d hh:mm`.
 * Two-pass correction; for the one ambiguous fall-back hour a year this picks
 * the offset in force before the transition, which is fine for a class
 * schedule (the room exists either way; the label is what parents see).
 */
export function zonedTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset1 = wallClockInZone(asUtc, timeZone) - asUtc;
  const guess = asUtc - offset1;
  // Second pass: if the first guess crossed a transition, correct once more.
  const offset2 = wallClockInZone(guess, timeZone) - guess;
  return new Date(asUtc - offset2);
}

/**
 * Concrete future occurrences of a series within the horizon. Pure — `from`
 * is injected so tests never read the clock.
 *
 * @param {{weekday: number, local_start_time: string, timezone?: string,
 *          duration_minutes?: number, starts_on?: string, ends_on?: string|null}} series
 *   group_session_series row
 * @param {{from: Date, horizonDays?: number}} opts
 * @returns {Array<{start: Date, end: Date}>}
 */
export function nextOccurrences(series, { from, horizonDays = 14 }) {
  const [hh, mm] = String(series.local_start_time).split(':').map(Number);
  // Fallback matches the operation's home zone (Austin); the DB default is
  // America/Chicago too (0029). Rows carry their own zone regardless.
  const tz = series.timezone || 'America/Chicago';
  const out = [];

  // Walk calendar days in the series' OWN zone (not the server's), so the
  // weekday check matches what the family sees on their calendar.
  for (let i = 0; i <= horizonDays; i++) {
    const probe = new Date(from.getTime() + i * 24 * 3600 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(probe);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    if (weekday !== Number(series.weekday)) continue;

    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (series.starts_on && dateStr < String(series.starts_on)) continue;
    if (series.ends_on && dateStr > String(series.ends_on)) continue;

    const start = zonedTimeToUtc({ year, month, day, hour: hh, minute: mm || 0 }, tz);
    if (start.getTime() <= from.getTime()) continue; // never materialize the past
    const end = new Date(start.getTime() + (series.duration_minutes || 60) * 60000);
    out.push({ start, end });
  }
  return out;
}

// Min-fill only applies to clinics that genuinely need a minimum: hall and
// community rooms run for whoever shows up (cutoff_at NULL keeps them out of
// resolve_group_fill's sweep — 0020's predicate requires cutoff_at IS NOT NULL).
const CUTOFF_LEAD_MS = 2 * 60 * 60 * 1000;

function cutoffFor(series, start) {
  if (series.kind !== 'clinic') return null;
  if ((series.min_seats || 1) <= 1) return null;
  return new Date(start.getTime() - CUTOFF_LEAD_MS).toISOString();
}

/**
 * Materialize every active, staffed series into group_session rows for the
 * next `horizonDays`. Idempotent two ways: the partial unique index
 * (series_id, scheduled_start) is the hard backstop, and the upsert ignores
 * duplicates so re-runs are no-ops. Series with no tutor are SKIPPED and
 * reported — a room nobody teaches must never become bookable.
 */
export async function materializeSeries(svc, { horizonDays = 14, now = new Date() } = {}) {
  const { data: seriesRows, error } = await svc.from('group_session_series')
    .select('*').eq('active', true);
  if (error) return { created: 0, skippedUnstaffed: 0, error: error.message };

  let created = 0;
  let skippedUnstaffed = 0;

  for (const series of seriesRows || []) {
    if (!series.tutor_id) { skippedUnstaffed += 1; continue; }

    // Snapshot the tutor's pay once per series per run.
    const { data: tutor } = await svc.from('tutors')
      .select('id,pay_rate_cents,status,vetting_status').eq('id', series.tutor_id).maybeSingle();
    // An unstaffable tutor (pulled, pending) also skips — same reason.
    if (!tutor || tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
      skippedUnstaffed += 1;
      continue;
    }

    // Co-tutor (0029): only a CLEARED, active co-tutor counts toward the
    // supervision ratio — an uncleared one is ignored exactly like an
    // uncleared lead, it just doesn't cancel the room.
    let coTutor = null;
    if (series.co_tutor_id) {
      const { data: co } = await svc.from('tutors')
        .select('id,status,vetting_status').eq('id', series.co_tutor_id).maybeSingle();
      if (co && co.status === 'active' && co.vetting_status === 'cleared') coTutor = co;
    }

    const occurrences = nextOccurrences(series, { from: now, horizonDays });
    if (!occurrences.length) continue;

    const defaults = KIND_DEFAULTS[series.kind] || KIND_DEFAULTS.clinic;
    // The free community hall's capacity DERIVES from staffing (8 per cleared
    // staff member, interim supervision cap — clubPricing.communityCapacity).
    // Paid kinds keep their configured capacity; the 8-per-tutor hall policy
    // is already the default there.
    const staffCount = 1 + (coTutor ? 1 : 0);
    const roomCapacity = series.kind === 'community_free'
      ? communityCapacity(staffCount, series.capacity || defaults.capacity)
      : (series.capacity || defaults.capacity);
    const rows = occurrences.map(({ start, end }) => ({
      series_id: series.id,
      tutor_id: series.tutor_id,
      subject: series.subject,
      topic: series.topic || series.title,
      description: series.description,
      kind: series.kind,
      grade_band: series.grade_band,
      // The venue travels from the template to the room (0033 put the column
      // on both). Without this line an in-person cohort has its address on the
      // series and NULL on every session, so nothing that renders a room can
      // tell a family which building to walk into.
      venue: series.venue || null,
      capacity: roomCapacity,
      min_seats: series.min_seats || defaults.minSeats,
      seat_price_cents: series.seat_price_cents ?? defaults.seatPriceCents,
      tutor_share: 0.75, // ignored under flat_hourly; column is NOT NULL
      pay_model: 'flat_hourly',
      tutor_pay_cents: tutorPayCents(tutor.pay_rate_cents, series.duration_minutes || 60),
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      cutoff_at: cutoffFor(series, start),
      timezone: series.timezone,
      status: 'open',
    }));

    // ignoreDuplicates rides the (series_id, scheduled_start) unique index —
    // the second run inserts nothing.
    const { data: inserted, error: insErr } = await svc.from('group_session')
      .upsert(rows, { onConflict: 'series_id,scheduled_start', ignoreDuplicates: true })
      .select('id');
    if (insErr) {
      console.error('[series] materialize failed', series.id, insErr.message);
      continue;
    }
    created += (inserted || []).length;

    // Staff rows for the co-tutor on freshly created rooms (0029). Upsert on
    // the (session, tutor) PK keeps re-runs no-ops; failure is logged, never
    // fatal — the room exists either way, capacity was already derived.
    if (coTutor && (inserted || []).length) {
      const staffRows = inserted.map((r) => ({ group_session_id: r.id, tutor_id: coTutor.id }));
      const { error: staffErr } = await svc.from('group_session_staff')
        .upsert(staffRows, { onConflict: 'group_session_id,tutor_id', ignoreDuplicates: true });
      if (staffErr) console.error('[series] staff rows failed', series.id, staffErr.message);
    }
  }
  return { created, skippedUnstaffed };
}

// ── Standing member seats (0029) ─────────────────────────────────────────────

/**
 * Book every active standing seat into its series' materialized rooms for the
 * CURRENT calendar month. Month-scoped on purpose: allowances are calendar-
 * month windows (clubBilling), so booking a September room in August would
 * spend August's visits on September's seats. Rooms materialize up to two
 * weeks ahead; cross-month rooms get booked by the first sweeps of the new
 * month. (Documented tradeoff: in those few cross-month days a standing seat
 * competes with retail buyers — LAUNCH_GAPS tracks the reserve-ahead variant.)
 *
 * Same discipline as the booking route, because it IS a booking:
 *   - guardian gate re-checked per run (consent can be withdrawn after setup)
 *   - race-free claim via claim_group_seat (full / already_booked are no-ops)
 *   - allowance consumed SYNCHRONOUSLY; a failed ledger write rolls the seat
 *     back rather than gifting untracked inventory
 *   - no allowance left → the week is skipped, never auto-charged
 */
export async function bookStandingSeats(svc, { now = new Date(), standingId = null } = {}) {
  const monthEnd = new Date(now.getTime());
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(1);
  monthEnd.setHours(0, 0, 0, 0);

  let q = svc.from('standing_seats')
    .select('id,series_id,user_id,student_id')
    .eq('active', true)
    .limit(500);
  // standingId: the just-created seat books immediately from its API action.
  if (standingId) q = q.eq('id', standingId);
  const { data: standing, error } = await q;
  if (error) return { booked: 0, error: error.message };

  let booked = 0;
  let skippedNoAllowance = 0;
  let skippedGate = 0;

  for (const seat of standing || []) {
    // Rooms of this series still to come THIS month, oldest first.
    const { data: rooms } = await svc.from('group_session')
      .select('id,kind,capacity,scheduled_start,scheduled_end,subject,topic,tutor_id,seat_price_cents,status,timezone,venue')
      .eq('series_id', seat.series_id)
      .in('status', ['open', 'confirmed'])
      .gt('scheduled_start', now.toISOString())
      .lt('scheduled_start', monthEnd.toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(6);
    if (!rooms?.length) continue;

    // The payer's plan + allowance, re-read per standing seat (cheap, correct).
    const { data: payer } = await svc.from('profiles')
      .select('id,plan').eq('id', seat.user_id).maybeSingle();
    if (!payer) continue;

    // Guardian gate, re-checked every run — standing consent is not forever,
    // and neither is the link that earned it: the relationship is re-derived
    // here rather than inferred from "these two ids differ", so a revoked link
    // (or one that was only ever an invite) stops the weekly booking.
    const { data: student } = await svc.from('profiles')
      .select('id,birth_year,is_minor,guardian_consent_at').eq('id', seat.student_id).maybeSingle();
    if (!student) continue;
    const relationship = await bookingRelationship(svc, seat.user_id, seat.student_id);
    if (!guardianGateSatisfied({ studentProfile: student, relationship })) {
      skippedGate += 1;
      continue;
    }

    for (const room of rooms) {
      // A standing seat consumes the allowance its room kind is metered on:
      // Hall rooms draw club_hall_included (memberships, retired from sale but
      // honoured); standing_seat rooms draw club_seat_included (the seat plan,
      // STRATEGY §5.1). Any other kind is not a standing product.
      const feature = STANDING_FEATURE[room.kind];
      if (!feature) continue;

      const allowances = await clubAllowances(svc, { userId: seat.user_id, plan: payer.plan });
      const remaining = feature === 'club_seat_included' ? allowances.seatRemaining : allowances.hallRemaining;
      if (!(remaining > 0)) { skippedNoAllowance += 1; break; }

      const { data: claim, error: claimErr } = await svc.rpc('claim_group_seat', {
        p_session: room.id,
        p_student: seat.student_id,
        p_amount: 0,
        p_consent: true,
        p_bring: null,
      });
      if (claimErr) { console.error('[standing] claim failed', seat.id, claimErr.message); continue; }
      const result = Array.isArray(claim) ? claim[0] : claim;
      if (!result || result.outcome !== 'claimed') continue; // full / already booked — fine

      const { error: bookErr } = await svc.from('group_seat').update({
        status: 'booked', paid: true, booked_via: 'included', booked_by: seat.user_id,
        // A standing booking made inside the confirm window IS confirmed;
        // otherwise the T-24h email asks, and T-4h releases (occupancy.js).
        ...(confirmedAtBooking({ scheduledStart: room.scheduled_start, now: now.getTime() })
          ? { confirmed_at: new Date().toISOString() } : {}),
      }).eq('id', result.seat_id);
      if (bookErr) {
        await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
        continue;
      }
      try {
        await consumeAllowance(svc, {
          userId: seat.user_id,
          feature,
          metadata: { kind: 'standing_seat', roomKind: room.kind, seatId: result.seat_id, sessionId: room.id, standingId: seat.id },
        });
      } catch {
        await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
        continue;
      }
      booked += 1;
      sendGroupSeatEmails(svc, {
        seat: { student_id: seat.student_id, amount_cents: 0 },
        room, mode: 'included',
      }).catch(() => {});
    }
  }
  return { booked, skippedNoAllowance, skippedGate };
}
