// GET /api/admin/metrics?days=30 — the business numbers the launch plan says
// to watch from day one (v2 §6), computed live from the operational tables so
// they can never drift from reality:
//
//   - occupied seats per tutor-hour (THE unit economic — the plan's target
//     band is ~4+ average, 8 max by policy)
//   - occupancy % by kind (halls vs clinics vs community)
//   - first→second-session conversion (the retention signal that decides
//     whether the funnel is a business or a leaky bucket)
//   - members by tier (the standing seat and the retired memberships), member
//     visits, overage purchases
//   - refunds, no-shows, gross session revenue by kind
//   - tutor hours delivered + pay accrued/paid
//
// Deliberately no new tables and no caching: the admin page calls this a few
// times a day at launch scale. If it gets slow at real scale, THAT is the
// signal to materialize.

import { getCaller, isAdminCaller, serviceClient } from '@/lib/server/context';
import { CLUB_PLANS, SEAT_PLAN } from '@/lib/server/clubPricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HELD = ['booked', 'attended'];
const SETTLED = ['booked', 'attended', 'no_show'];

// Who counts as a member here. Derived from the plan sets in clubPricing rather
// than typed out, because this list used to be the literal ['club','plus','max']
// and silently stopped describing the business the day the standing seat became
// the one recurring product: seat holders were members everywhere else
// (isClubMember, groupSeatQuote) and invisible in the numbers the founder reads.
// A retyped array cannot follow clubPricing; this does.
const MEMBER_PLAN_KEYS = [...Object.keys(SEAT_PLAN), ...Object.keys(CLUB_PLANS)];

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const now = new Date().toISOString();

  const [roomsQ, seatsAllQ, oneOnOneQ, membersQ, earningsQ] = await Promise.all([
    // Group rooms that already ran in the window (completed or past-end).
    svc.from('group_session')
      .select('id,kind,capacity,scheduled_start,scheduled_end,status,tutor_pay_cents')
      .gt('scheduled_start', since).lt('scheduled_start', now)
      .neq('status', 'cancelled'),
    // Every seat on those… easier: all seats created in the window (covers
    // future bookings too, flagged below).
    svc.from('group_seat')
      .select('id,group_session_id,student_id,status,paid,amount_cents,booked_via,refund_status,created_at')
      .gt('created_at', since),
    svc.from('tutoring_sessions')
      .select('id,student_id,status,amount_cents,scheduled_start,created_at')
      .gt('created_at', since),
    svc.from('profiles').select('id,plan').in('plan', MEMBER_PLAN_KEYS),
    svc.from('tutor_earnings').select('amount_cents,status,created_at').gt('created_at', since),
  ]);

  const rooms = roomsQ.data || [];
  const seats = seatsAllQ.data || [];
  const oneOnOne = oneOnOneQ.data || [];
  const members = membersQ.data || [];
  const earnings = earningsQ.data || [];

  // ── Occupancy + seats per tutor-hour, past rooms only ─────────────────────
  const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const attendedByRoom = {};
  for (const s of seats) {
    if (HELD.includes(s.status) && s.paid && roomById[s.group_session_id]) {
      attendedByRoom[s.group_session_id] = (attendedByRoom[s.group_session_id] || 0) + 1;
    }
  }
  const byKind = {};
  let tutorHours = 0, occupiedSeatHours = 0;
  for (const r of rooms) {
    const hours = Math.max(0.25, (new Date(r.scheduled_end).getTime() - new Date(r.scheduled_start).getTime()) / 3600000);
    const filled = attendedByRoom[r.id] || 0;
    tutorHours += hours;
    occupiedSeatHours += filled * hours;
    const k = (byKind[r.kind] ||= { rooms: 0, seats: 0, capacity: 0 });
    k.rooms += 1; k.seats += filled; k.capacity += r.capacity;
  }
  const occupancy = Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, {
    rooms: v.rooms, seatsFilled: v.seats,
    occupancyPct: v.capacity ? Math.round((v.seats / v.capacity) * 100) : 0,
  }]));

  // ── First→second conversion ───────────────────────────────────────────────
  // Students whose FIRST-ever settled booking (group seat or 1:1) is old
  // enough to have had a real chance at a second (≥14 days ago): what share
  // came back? Reads all-time history for just the students seen this window.
  const windowStudents = [...new Set([
    ...seats.filter((s) => SETTLED.includes(s.status) && s.paid).map((s) => s.student_id),
    ...oneOnOne.filter((s) => ['scheduled', 'completed', 'in_progress'].includes(s.status)).map((s) => s.student_id),
  ])];
  let conversionEligible = 0, converted = 0;
  if (windowStudents.length) {
    const [allSeatsQ, allOnesQ] = await Promise.all([
      svc.from('group_seat').select('student_id,status,paid,created_at').in('student_id', windowStudents),
      svc.from('tutoring_sessions').select('student_id,status,created_at').in('student_id', windowStudents),
    ]);
    const history = {};
    for (const s of allSeatsQ.data || []) {
      if (SETTLED.includes(s.status) && s.paid) (history[s.student_id] ||= []).push(s.created_at);
    }
    for (const s of allOnesQ.data || []) {
      if (['scheduled', 'completed', 'in_progress'].includes(s.status)) (history[s.student_id] ||= []).push(s.created_at);
    }
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
    for (const dates of Object.values(history)) {
      dates.sort();
      if (new Date(dates[0]).getTime() > cutoff) continue; // too new to judge
      conversionEligible += 1;
      if (dates.length >= 2) converted += 1;
    }
  }

  // ── Money + membership ─────────────────────────────────────────────────────
  const settledSeats = seats.filter((s) => SETTLED.includes(s.status) && s.paid);
  const grossGroupCents = settledSeats.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
  const grossPrivateCents = oneOnOne
    .filter((s) => ['scheduled', 'completed', 'in_progress'].includes(s.status))
    .reduce((sum, s) => sum + (s.amount_cents || 0), 0);
  // Every key present at zero, so a tier that sold nothing this window reads as
  // "nobody bought it" rather than disappearing from the payload.
  const memberTiers = Object.fromEntries(MEMBER_PLAN_KEYS.map((k) => [k, 0]));
  for (const m of members) memberTiers[m.plan] = (memberTiers[m.plan] || 0) + 1;
  const memberIds = new Set(members.map((m) => m.id));
  const includedVisits = settledSeats.filter((s) => s.booked_via === 'included').length;
  const overagePurchases = settledSeats.filter((s) => (s.amount_cents || 0) > 0 && memberIds.has(s.student_id)).length;

  return Response.json({
    windowDays: days,
    rooms: {
      ran: rooms.length,
      tutorHours: Math.round(tutorHours * 10) / 10,
      seatsPerTutorHour: tutorHours ? Math.round((occupiedSeatHours / tutorHours) * 10) / 10 : 0,
      occupancy,
    },
    conversion: {
      eligibleFirstTimers: conversionEligible,
      cameBack: converted,
      pct: conversionEligible ? Math.round((converted / conversionEligible) * 100) : null,
    },
    membership: {
      byTier: memberTiers,
      total: members.length,
      includedVisitsUsed: includedVisits,
      overagePurchases,
    },
    sessions: {
      groupSeatsSettled: settledSeats.length,
      noShows: seats.filter((s) => s.status === 'no_show').length,
      refunds: seats.filter((s) => s.refund_status !== 'none' && s.refund_status != null).length,
      oneOnOneBooked: oneOnOne.length,
    },
    revenue: {
      groupCents: grossGroupCents,
      privateCents: grossPrivateCents,
    },
    tutorPay: {
      accruedCents: earnings.filter((e) => e.status === 'accrued').reduce((a, e) => a + e.amount_cents, 0),
      paidCents: earnings.filter((e) => e.status === 'paid').reduce((a, e) => a + e.amount_cents, 0),
    },
  });
}
