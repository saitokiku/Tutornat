// Group sessions — the club's rooms: Subject Clinics, Homework Hall, and the
// weekly free Community Hall.
//
// GET  /api/tutoring/group              → browse upcoming rooms with seats left
//                                         (+kind/grade filters, caller's quote)
// GET  /api/tutoring/group?mine=1       → my booked seats (and a managed
//                                         child's with ?childId=)
// POST /api/tutoring/group {sessionId}  → claim a seat. Free/included seats
//                                         book INSTANTLY with no Stripe object;
//                                         member/retail seats go to Checkout.
// POST /api/tutoring/group {action:'host', ...}  → tutor opens a clinic
// DELETE                                → release a seat (refund/restore rules)
//
// Every child-safety gate that guards a 1:1 booking guards this one, and one
// more besides: a group room puts a minor in a video call with an adult AND
// other minors, so the vetting gate is checked here rather than trusted from
// whatever the browse endpoint happened to show.

import { getCaller, serviceClient, checkEntitlement, recordUsage, auditLog, getSettings } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { getStripe, appUrl } from '@/lib/server/stripe';
import { groupRefundEligible, GROUP_REFUND_WINDOW_HOURS } from '@/lib/server/sessionStates';
import { groupSeatQuote, tutorPayCents, KIND_DEFAULTS, RETAIL } from '@/lib/server/clubPricing';
import { clubAllowances, consumeAllowance, restoreAllowance } from '@/lib/server/clubBilling';
import { resolveBookingStudent, guardianGateSatisfied } from '@/lib/server/family';
import { sendGroupSeatEmails } from '@/lib/server/tutoringEmails';
import { herdingCompare, emptiestCompare, confirmedAtBooking } from '@/lib/server/occupancy';
import { joinWaitlist, leaveWaitlist, markWaitlistConverted, notifySeatOpened } from '@/lib/server/waitlist';
import { bookStandingSeats, STANDING_FEATURE } from '@/lib/server/series';
import { roomDateTime } from '@/lib/roomTime';
import { groupRoomPayout, holdExpiresAt, UNVERIFIED_ROOM_MS } from '@/lib/server/maintenance';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HELD_STATUSES = ['pending_payment', 'booked', 'attended'];
import { ROOM_KINDS, kindLabel } from '@/lib/roomKinds';
// The kind map is lib/roomKinds.js and nothing else. It is deliberately
// markup-free so a route can import it — this file used to keep its own copy,
// which is how two spellings of one room reach a customer. `ROOM_KINDS` is also
// the kind vocabulary the `?kind=` filter validates against, so an unknown kind
// cannot be smuggled into the query.

// ── Club gate (fail closed) ──────────────────────────────────────────────────
// The club sells sessions directly at house prices and pays tutors a flat
// hourly rate — Kaizen is the merchant, not a broker of tutor funds, which is
// a materially different money-transmission posture from the old tutor-set-
// rate marketplace (counsel confirms before live keys; docs/legal/REVIEW_QUEUE.md).
//
// Deliberately fails CLOSED: the switch must be explicitly true. An empty
// app_settings table means disabled, so the club cannot be switched on by
// forgetting to configure something. Flip `club_enabled` in Admin → Settings.
async function clubOpen() {
  const settings = await getSettings();
  return settings.club_enabled === true;
}

export async function GET(req) {
  // Browsing a room you cannot book is a worse experience than an honest empty
  // state, and the client already renders `notProvisioned` correctly.
  if (!await clubOpen()) return Response.json({ notProvisioned: true, sessions: [] });
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ sessions: [], demo: true });
  const svc = serviceClient();
  if (!svc) return Response.json({ sessions: [] });

  const url = new URL(req.url);
  const mine = url.searchParams.get('mine') === '1';

  try {
    if (mine) {
      // A parent can list a managed child's seats with ?childId= (verified).
      const resolved = await resolveBookingStudent(svc, caller, url.searchParams.get('childId'));
      if (resolved.error) return resolved.error;

      const { data: seats } = await svc.from('group_seat')
        .select('id,status,amount_cents,paid,group_session_id,bring,booked_via,confirmed_at')
        .eq('student_id', resolved.studentId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }).limit(30);

      const ids = [...new Set((seats || []).map((s) => s.group_session_id))];
      const rooms = ids.length
        ? (await svc.from('group_session')
            .select('id,series_id,subject,topic,kind,grade_band,scheduled_start,scheduled_end,status,tutor_id,daily_room_url,capacity')
            .in('id', ids)).data || []
        : [];
      const tutorIds = [...new Set(rooms.map((r) => r.tutor_id))];
      const tutors = tutorIds.length
        ? (await svc.from('tutors').select('id,display_name').in('id', tutorIds)).data || []
        : [];
      const tutorName = Object.fromEntries(tutors.map((t) => [t.id, t.display_name]));
      const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

      // Standing seats this account manages (0029) — the family page renders
      // "your weekly Hall" from this, with skip/end controls.
      const { data: standingRows } = await svc.from('standing_seats')
        .select('id,series_id,student_id,active,created_at')
        .eq('user_id', caller.user.id).eq('active', true);
      const seriesIds = [...new Set((standingRows || []).map((s) => s.series_id))];
      const { data: seriesRows } = seriesIds.length
        ? await svc.from('group_session_series')
            .select('id,title,subject,weekday,local_start_time,timezone,kind,venue')
            .in('id', seriesIds)
        : { data: [] };
      const seriesById = Object.fromEntries((seriesRows || []).map((s) => [s.id, s]));

      return Response.json({
        seats: (seats || []).map((s) => {
          const r = roomById[s.group_session_id] || {};
          return {
            seatId: s.id, status: s.status, paid: s.paid, bookedVia: s.booked_via,
            confirmed: Boolean(s.confirmed_at),
            // The seat is asking for a confirm tap only when release could
            // ever apply to it (included + still merely booked).
            needsConfirm: s.booked_via === 'included' && s.status === 'booked' && !s.confirmed_at,
            sessionId: s.group_session_id,
            seriesId: r.series_id || null,
            subject: r.subject, topic: r.topic, kind: r.kind, kindLabel: kindLabel(r.kind),
            start: r.scheduled_start, end: r.scheduled_end,
            sessionStatus: r.status,
            tutorName: tutorName[r.tutor_id] || 'Tutor',
            bring: s.bring,
          };
        }),
        standing: (standingRows || []).map((s) => {
          const ser = seriesById[s.series_id] || {};
          return {
            standingId: s.id, seriesId: s.series_id, studentId: s.student_id,
            title: ser.title, subject: ser.subject, weekday: ser.weekday,
            localStartTime: ser.local_start_time, timezone: ser.timezone,
            // A standing booking is no longer always a Hall — the surface that
            // renders this has to be able to say which product it is.
            kind: ser.kind || null, kindLabel: kindLabel(ser.kind),
            // Where to turn up. An in-person product whose surfaces never say
            // the address is one a parent cannot actually use.
            venue: ser.venue || null,
          };
        }),
      });
    }

    // Tutor workspace: MY rooms (yesterday onward), with seat counts — the
    // list behind "Your classes" on /tutor. Tutor-of-the-rooms only; the
    // roster itself (names, intake, help queue) lives in group/roster.
    //
    // Plus every room of theirs that is STILL HELD by the earnings sweep. A
    // room that ended with no attendance and no exit summary is not paid until
    // one appears (maintenance.completeGroupSessions), and the only person who
    // can leave that record is this tutor — but a 24-hour window dropped the
    // room off their screen on day two of a seven-day hold, so six of those
    // days were unreachable and the room simply closed unpaid. The hold is only
    // fair if it is visible for its whole length, so held rooms are fetched
    // separately (their own bounded query, not a wider window that would let a
    // week of past rooms crowd out the upcoming ones) and flagged.
    if (url.searchParams.get('tutorView') === '1') {
      const { data: tutorRow } = await svc.from('tutors')
        .select('id').eq('user_id', caller.user.id).maybeSingle();
      if (!tutorRow) return Response.json({ error: 'Not a tutor account.' }, { status: 403 });
      const nowMs = Date.now();
      const since = new Date(nowMs - 24 * 3600 * 1000).toISOString();
      const nowIso = new Date(nowMs).toISOString();
      const holdFloor = new Date(nowMs - UNVERIFIED_ROOM_MS).toISOString();
      // timezone and venue travel to the console because the room is run in a
    // place at a time: without the zone the workspace falls back to the club's
    // default and can silently misstate an out-of-town room, and without the
    // venue it can never tell the Director which building to be in.
    const roomFields = 'id,subject,topic,kind,grade_band,capacity,min_seats,scheduled_start,scheduled_end,status,pay_model,tutor_pay_cents,seat_price_cents,tutor_share,timezone,venue';
      // Rooms they lead, plus rooms they co-staff (0029) — a co-tutor preps
      // and joins from the same workspace as a lead.
      const { data: staffLinks } = await svc.from('group_session_staff')
        .select('group_session_id').eq('tutor_id', tutorRow.id);
      const staffIds = [...new Set((staffLinks || []).map((r) => r.group_session_id))];
      // Rooms that ended and were never closed out: still confirmed/in_progress
      // past their end, inside the hold. Anything older than the hold has been
      // closed by the sweep and belongs to the admin payout queue instead.
      const heldQuery = (q) => q
        .in('status', ['confirmed', 'in_progress'])
        .lt('scheduled_end', nowIso).gte('scheduled_end', holdFloor)
        .order('scheduled_end', { ascending: false }).limit(40);
      const [{ data: leadRooms }, { data: staffedRooms }, { data: leadHeld }, { data: staffedHeld }] = await Promise.all([
        svc.from('group_session').select(roomFields)
          .eq('tutor_id', tutorRow.id)
          .gt('scheduled_start', since).neq('status', 'cancelled')
          .order('scheduled_start', { ascending: true }).limit(40),
        staffIds.length
          ? svc.from('group_session').select(roomFields)
              .in('id', staffIds)
              .gt('scheduled_start', since).neq('status', 'cancelled')
              .order('scheduled_start', { ascending: true }).limit(40)
          : Promise.resolve({ data: [] }),
        heldQuery(svc.from('group_session').select(roomFields).eq('tutor_id', tutorRow.id)),
        staffIds.length
          ? heldQuery(svc.from('group_session').select(roomFields).in('id', staffIds))
          : Promise.resolve({ data: [] }),
      ]);
      const seen = new Set();
      const myRooms = [...(leadRooms || []), ...(staffedRooms || []), ...(leadHeld || []), ...(staffedHeld || [])]
        .filter((r) => (seen.has(r.id) ? false : seen.add(r.id)))
        .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
      const roomIds = (myRooms || []).map((r) => r.id);
      const [{ data: seatRows }, { data: ratedRows }] = await Promise.all([
        roomIds.length
          // student_id rides along so `rateableStudents` can be a DISTINCT
          // count over the same set rosterSnapshot builds from, rather than a
          // row count that a duplicate seat would inflate.
          ? svc.from('group_seat').select('group_session_id,student_id,status,paid,exit').in('group_session_id', roomIds)
          : Promise.resolve({ data: [] }),
        // Has this room been rated? The exit-rating flow keeps drafts on the
        // Director's device, which cannot answer that question across a second
        // phone or a cleared browser — and "no ratings yet" is the callout that
        // recovers the most valuable two minutes in the business, so it has to
        // be server truth. A missing table (the engine not provisioned) reads
        // as "nothing rated", which is the honest answer either way.
        roomIds.length
          ? svc.from('group_observation').select('group_session_id,student_id').in('group_session_id', roomIds)
          : Promise.resolve({ data: [] }),
      ]);
      const ratedByRoom = {};
      for (const o of ratedRows || []) {
        (ratedByRoom[o.group_session_id] ||= new Set()).add(o.student_id);
      }
      const counts = {};
      const seatsByRoom = {};
      // Who a rating can actually attach to. NOT `counts`, which includes
      // pending_payment and no_show: a room where everyone no-showed has seats
      // but nobody to rate, and keying the callout on `counts` produced a nag
      // that opened a panel saying "Nobody to rate yet" and could never clear.
      // This is `booked | attended` — the same set rosterSnapshot selects in
      // the brief route, so the console and the screen agree on the roster.
      const rateableByRoom = {};
      for (const s of seatRows || []) {
        (seatsByRoom[s.group_session_id] ||= []).push(s);
        if (HELD_STATUSES.includes(s.status) || s.status === 'no_show') {
          counts[s.group_session_id] = (counts[s.group_session_id] || 0) + 1;
        }
        if (s.status === 'booked' || s.status === 'attended') {
          (rateableByRoom[s.group_session_id] ||= new Set()).add(s.student_id);
        }
      }
      return Response.json({
        rooms: (myRooms || []).map((r) => {
          // Exactly the sweep's own test, imported rather than restated: money
          // at stake, the room ran, and no tutor-side record of it yet.
          const { tutorCut, tutorWasThere } = groupRoomPayout(r, seatsByRoom[r.id] || []);
          const needsRoster = ['confirmed', 'in_progress'].includes(r.status)
            && new Date(r.scheduled_end).getTime() < nowMs
            && tutorCut > 0 && !tutorWasThere;
          return {
            id: r.id, subject: r.subject, topic: r.topic, kind: r.kind,
            kindLabel: kindLabel(r.kind),
            gradeBand: r.grade_band, capacity: r.capacity, minSeats: r.min_seats,
            start: r.scheduled_start, end: r.scheduled_end, status: r.status,
            tutorPayCents: r.tutor_pay_cents, seats: counts[r.id] || 0,
            // "Mark who was here to get paid for this one" — the tutor has no
            // other way to know the hour is sitting unpaid.
            needsRoster,
            holdExpiresAt: needsRoster ? holdExpiresAt(r) : null,
            // How many students in this room have any rating on record. The
            // console compares it against the attended count to decide whether
            // the room still owes its two minutes.
            ratedStudents: (ratedByRoom[r.id] || new Set()).size,
            // The denominator. Without it `ratingsOwed` compares against 0 and
            // the exit-ratings callout — the whole point of the console — never
            // fires for any room.
            rateableStudents: (rateableByRoom[r.id] || new Set()).size,
            timezone: r.timezone || null,
            venue: r.venue || null,
          };
        }),
      });
    }

    // Browse. Only VETTED, ACTIVE tutors appear — the same hard gate as 1:1,
    // applied at the source rather than trusted from the client.
    const kindFilter = url.searchParams.get('kind');
    const gradeFilter = url.searchParams.get('grade');
    const now = new Date().toISOString();
    let q = svc.from('group_session')
      .select('id,tutor_id,series_id,subject,topic,description,kind,grade_band,capacity,min_seats,seat_price_cents,scheduled_start,scheduled_end,status,timezone')
      .in('status', ['open', 'confirmed'])
      .gt('scheduled_start', now)
      // Seat rooms are reserved inventory and never appear on a board anyone
      // browses — the same exclusion lib/server/publicSchedule.js applies to
      // the signed-out schedule, applied here too because a signed-in browse
      // that listed them handed out the seriesId a standing booking is made
      // against, which is the whole key to a $550-a-month cohort.
      .neq('kind', 'standing_seat')
      .order('scheduled_start', { ascending: true })
      .limit(80);
    if (kindFilter && Object.hasOwn(ROOM_KINDS, kindFilter)) q = q.eq('kind', kindFilter);
    if (gradeFilter) q = q.in('grade_band', [gradeFilter, 'all']);
    const { data: rooms } = await q;

    if (!rooms?.length) return Response.json({ sessions: [] });

    const tutorIds = [...new Set(rooms.map((r) => r.tutor_id))];
    const { data: tutors } = await svc.from('tutors')
      .select('id,display_name,headline,photo_url,slug,status,vetting_status')
      .in('id', tutorIds);
    const bookable = Object.fromEntries(
      (tutors || [])
        .filter((t) => t.status === 'active' && t.vetting_status === 'cleared')
        .map((t) => [t.id, t])
    );

    const ids = rooms.map((r) => r.id);
    const [{ data: seats }, { data: myWaits }] = await Promise.all([
      svc.from('group_seat')
        .select('group_session_id,student_id,status').in('group_session_id', ids),
      // Which of these rooms is this account already waitlisted for? (0029 —
      // a missing table pre-migration just yields null, and no flags render.)
      svc.from('group_waitlist')
        .select('group_session_id,status')
        .eq('user_id', caller.user.id)
        .in('group_session_id', ids)
        .in('status', ['waiting', 'notified']),
    ]);
    const taken = {};
    const mineSet = new Set();
    for (const s of seats || []) {
      if (!HELD_STATUSES.includes(s.status)) continue;
      taken[s.group_session_id] = (taken[s.group_session_id] || 0) + 1;
      if (s.student_id === caller.user.id) mineSet.add(s.group_session_id);
    }
    const waitingSet = new Set((myWaits || []).map((w) => w.group_session_id));

    // What would THIS caller pay for each room? Membership feels valuable
    // every time the schedule is opened — "Included with your membership"
    // beats a price tag (the psychology the shop plan calls out).
    const allowances = await clubAllowances(svc, { userId: caller.user.id, plan: caller.profile?.plan });

    return Response.json({
      sessions: rooms
        .filter((r) => bookable[r.tutor_id])
        .map((r) => {
          const filled = taken[r.id] || 0;
          const quote = groupSeatQuote({
            plan: caller.profile?.plan,
            kind: r.kind,
            hallRemaining: allowances.hallRemaining,
            seatRemaining: allowances.seatRemaining,
            seatPriceCents: r.seat_price_cents,
          });
          return {
            id: r.id,
            seriesId: r.series_id || null,
            subject: r.subject,
            topic: r.topic,
            description: r.description,
            kind: r.kind,
            kindLabel: kindLabel(r.kind),
            gradeBand: r.grade_band,
            start: r.scheduled_start,
            end: r.scheduled_end,
            timezone: r.timezone,
            seatPriceCents: r.seat_price_cents,
            quote: { mode: quote.mode, amountCents: quote.amountCents },
            capacity: r.capacity,
            seatsLeft: Math.max(0, r.capacity - filled),
            filled,
            isFull: filled >= r.capacity,
            minSeats: r.min_seats,
            // Honest about the min-fill rule up front, rather than at cancellation.
            willRunAt: r.min_seats,
            confirmed: r.status === 'confirmed' || r.min_seats <= 1,
            alreadyBooked: mineSet.has(r.id),
            alreadyWaitlisted: waitingSet.has(r.id),
            tutor: {
              name: bookable[r.tutor_id].display_name,
              headline: bookable[r.tutor_id].headline,
              photo: bookable[r.tutor_id].photo_url,
              slug: bookable[r.tutor_id].slug,
            },
          };
        })
        // Full rooms stay VISIBLE ("Full — join the list") instead of
        // vanishing with their demand; herding sort concentrates bookings
        // (by local day, fullest bookable first — occupancy.js, 0029).
        .sort(herdingCompare),
      hallRemaining: Number.isFinite(allowances.hallRemaining) ? allowances.hallRemaining : null,
    });
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true, sessions: [] });
    console.error('[tutoring/group GET]', err?.message);
    return Response.json({ error: 'Could not load sessions.' }, { status: 500 });
  }
}

export async function POST(req) {
  if (!await clubOpen()) {
    return Response.json({ error: 'Session booking isn’t open yet.' }, { status: 503 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Booking needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 20, windowMs: 3600_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  if (body?.action === 'host') return hostRoom(caller, svc, body);
  if (body?.action === 'waitlist') return joinWaitlistAction(caller, svc, body);
  if (body?.action === 'unwaitlist') return leaveWaitlistAction(caller, svc, body);
  if (body?.action === 'confirm') return confirmSeatAction(caller, svc, body);
  if (body?.action === 'standing') return standingSeatAction(caller, svc, body);
  if (body?.action === 'unstanding') return endStandingSeatAction(caller, svc, body);

  try {
    return await claimSeat(caller, svc, body, req);
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true }, { status: 503 });
    console.error('[tutoring/group POST]', err?.message);
    return Response.json({ error: 'Could not book that seat.' }, { status: 500 });
  }
}

// ── Occupancy actions (0029) ─────────────────────────────────────────────────

// Join the list for a FULL room. No guardian gate here — waiting is not a
// live session; the gate runs when they actually book the freed seat.
async function joinWaitlistAction(caller, svc, body) {
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'Pick a session.' }, { status: 400 });

  const resolved = await resolveBookingStudent(svc, caller, body?.childId);
  if (resolved.error) return resolved.error;

  const { data: room } = await svc.from('group_session')
    .select('id,status,capacity,scheduled_start').eq('id', sessionId).maybeSingle();
  if (!room) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (!['open', 'confirmed'].includes(room.status) || new Date(room.scheduled_start).getTime() < Date.now()) {
    return Response.json({ error: 'That session isn’t taking a waitlist.' }, { status: 409 });
  }
  const { count: held } = await svc.from('group_seat')
    .select('id', { count: 'exact', head: true })
    .eq('group_session_id', sessionId).in('status', HELD_STATUSES);
  if ((held || 0) < room.capacity) {
    return Response.json({ error: 'Seats are open — book one instead.', code: 'seats_open' }, { status: 409 });
  }

  const joined = await joinWaitlist(svc, {
    roomId: sessionId, userId: caller.user.id, studentId: resolved.studentId,
  });
  if (joined.error) return Response.json({ error: joined.error }, { status: 500 });
  await auditLog(caller.user.id, 'group.waitlist_joined', sessionId, { studentId: resolved.studentId });
  return Response.json({ ok: true, waitlisted: true, message: 'You’re on the list — we’ll email you the moment a seat opens. First come, first served.' });
}

async function leaveWaitlistAction(caller, svc, body) {
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'Pick a session.' }, { status: 400 });
  await leaveWaitlist(svc, { roomId: sessionId, userId: caller.user.id });
  return Response.json({ ok: true, waitlisted: false });
}

// "Same room every week": create a standing seat on a series (0029). This is
// a STANDING BOOKING, so every gate a booking has runs here — guardian
// consent especially (the cron re-checks each run, but the front door is
// here). Immediate feedback: this month's rooms book right away instead of
// waiting for the next cron tick.
async function standingSeatAction(caller, svc, body) {
  const seriesId = String(body?.seriesId || '');
  if (!seriesId) return Response.json({ error: 'Pick a weekly session.' }, { status: 400 });
  if (!body?.guardianConsent) {
    return Response.json({ error: 'Guardian consent is required for a weekly live session.' }, { status: 400 });
  }

  const resolved = await resolveBookingStudent(svc, caller, body?.childId);
  if (resolved.error) return resolved.error;
  const { studentId, onBehalf, relationship } = resolved;
  const studentProfile = onBehalf
    ? (await svc.from('profiles').select('id,birth_year,is_minor,guardian_consent_at').eq('id', studentId).maybeSingle()).data
    : caller.profile;
  if (onBehalf && !studentProfile) return Response.json({ error: 'No such student.' }, { status: 404 });
  if (!guardianGateSatisfied({ studentProfile, relationship })) {
    return Response.json({
      error: 'Live sessions need a parent or guardian’s approval first. We emailed them a link — ask them to click "Approve live tutoring", then try again.',
      code: 'guardian_consent_required',
    }, { status: 403 });
  }

  const { data: series } = await svc.from('group_session_series')
    .select('id,kind,active,title,capacity').eq('id', seriesId).maybeSingle();
  if (!series || !series.active) return Response.json({ error: 'That weekly session isn’t running.' }, { status: 404 });

  // Only a kind that HAS a standing product can carry a standing seat. Until
  // 2026-09-02 this refused every kind but the weekly Hall, which refused the
  // one product Kaizen Local actually sells: a family paying for a standing
  // seat could not be placed in the cohort they were paying for.
  const feature = STANDING_FEATURE[series.kind];
  if (!feature) {
    return Response.json({ error: 'Standing seats are for weekly Homework Halls and standing-seat rooms.' }, { status: 400 });
  }
  // A standing booking spends included sessions, so it needs a plan that has
  // them — and the allowance to check is the one this ROOM KIND is metered on,
  // because that is the one the weekly sweep will actually spend. Checking
  // club_hall_included for a seat room refuses every seat holder on earth: the
  // seat plan deliberately carries zero Hall visits (0033).
  const { data: ents } = await svc.from('plan_entitlements')
    .select('monthly_limit').eq('plan', caller.profile?.plan || 'free')
    .eq('feature', feature).maybeSingle();
  if (!ents || !(ents.monthly_limit === null || ents.monthly_limit > 0)) {
    return Response.json({
      error: feature === 'club_seat_included'
        ? 'A standing seat needs an active seat plan — the plan is what reserves the place.'
        : 'Standing seats use included membership visits — add a membership first.',
    }, { status: 403 });
  }

  // The cohort holds what the room holds, and no standing booking may exceed
  // it. Over-enrolling fails SILENTLY otherwise: the row is written, this
  // route says "that's your standing seat now", and claim_group_seat then
  // drops whoever the weekly sweep reaches last — a family discovering on a
  // Thursday that the place they pay for is not theirs. Same guard, same
  // fallback and same refusal as app/api/admin/seats/route.js, because the two
  // doors write the same row. A student already holding a row is re-activating
  // it, not taking a new place, so the count never refuses them.
  const roomCapacity = Number(series.capacity)
    || KIND_DEFAULTS[series.kind]?.capacity || KIND_DEFAULTS.standing_seat.capacity;
  const { data: takenRows } = await svc.from('standing_seats')
    .select('id,student_id').eq('series_id', seriesId).eq('active', true);
  const alreadyIn = (takenRows || []).some((r) => r.student_id === studentId);
  if (!alreadyIn && (takenRows || []).length >= roomCapacity) {
    return Response.json({
      error: `“${series.title}” is full at ${roomCapacity} students — ask us about the next cohort.`,
      code: 'cohort_full',
    }, { status: 409 });
  }

  const { data: row, error } = await svc.from('standing_seats').upsert(
    { series_id: seriesId, user_id: caller.user.id, student_id: studentId, active: true, ended_at: null },
    { onConflict: 'series_id,student_id' },
  ).select('id').maybeSingle();
  if (error) {
    console.error('[group] standing seat write failed', seriesId, error.message);
    return Response.json({ error: 'Could not save your weekly seat — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'group.standing_created', row?.id || seriesId, { seriesId, studentId, kind: series.kind });
  // Book this month's remaining rooms now — the answer to "did it work" is a
  // seat on the calendar, not "wait an hour".
  const kicked = await bookStandingSeats(svc, { standingId: row?.id }).catch(() => null);
  const booked = kicked?.booked || 0;
  // Name the thing the family bought, and name the allowance it spends: a seat
  // holder told "your weekly Hall" would reasonably think they bought the
  // wrong product.
  const noun = series.kind === 'standing_seat' ? 'standing seat' : 'weekly Hall';
  const spends = feature === 'club_seat_included' ? 'included seat sessions' : 'included visits';
  // The message carries the count so it only claims what actually happened —
  // bookStandingSeats can book nothing (month over, rooms full, sweep failed),
  // and each new month books itself either way.
  return Response.json({
    ok: true, standingId: row?.id,
    message: booked > 0
      ? `That's your ${noun} now — ${booked === 1 ? "this month's next session is" : `${booked} sessions this month are`} booked from your ${spends}. We'll ask you to confirm before each one.`
      : `That's your ${noun} now. Each month's sessions book themselves from your ${spends}, and we'll ask you to confirm before each one.`,
  });
}

async function endStandingSeatAction(caller, svc, body) {
  const standingId = String(body?.standingId || '');
  if (!standingId) return Response.json({ error: 'standingId required.' }, { status: 400 });
  const { data: row } = await svc.from('standing_seats')
    .select('id,user_id').eq('id', standingId).maybeSingle();
  if (!row || row.user_id !== caller.user.id) {
    return Response.json({ error: 'Not your standing seat.' }, { status: 403 });
  }
  await svc.from('standing_seats')
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq('id', standingId);
  await auditLog(caller.user.id, 'group.standing_ended', standingId, {});
  return Response.json({
    ok: true,
    message: 'Standing seat ended. Already-booked weeks stay booked — cancel any of them individually if needed.',
  });
}

// Confirm-or-release: the student in the seat, or the account that booked it,
// confirms attendance. Idempotent; only meaningful for a still-booked seat.
async function confirmSeatAction(caller, svc, body) {
  const seatId = String(body?.seatId || '');
  if (!seatId) return Response.json({ error: 'Seat id required.' }, { status: 400 });
  const { data: seat } = await svc.from('group_seat')
    .select('id,student_id,booked_by,status,confirmed_at').eq('id', seatId).maybeSingle();
  if (!seat || (seat.student_id !== caller.user.id && seat.booked_by !== caller.user.id)) {
    return Response.json({ error: 'Not your seat.' }, { status: 403 });
  }
  if (seat.status !== 'booked') {
    return Response.json({ error: 'That seat isn’t awaiting confirmation.' }, { status: 409 });
  }
  if (!seat.confirmed_at) {
    const { error } = await svc.from('group_seat')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', seatId).eq('status', 'booked');
    if (error) {
      console.error('[group] seat confirm failed', seatId, error.message);
      return Response.json({ error: 'Could not confirm the seat — try again.' }, { status: 500 });
    }
  }
  return Response.json({ ok: true, confirmed: true });
}

async function claimSeat(caller, svc, body, req) {
  const sessionId = String(body?.sessionId || '');
  // Checkout lands back where booking started (/dashboard, /schedule, /family)
  // — a fixed local allowlist, never an arbitrary redirect target.
  const requestedReturn = String(body?.returnPath || '');
  const returnPath = ['/dashboard', '/schedule', '/family'].includes(requestedReturn)
    ? requestedReturn : '/dashboard';
  if (!sessionId) return Response.json({ error: 'Pick a session.' }, { status: 400 });
  if (!body?.guardianConsent) {
    return Response.json({ error: 'Guardian consent is required to join a live session.' }, { status: 400 });
  }

  // Who is the seat FOR? A parent may book on behalf of a linked/managed teen —
  // verified server-side, never from the client's word alone.
  const resolved = await resolveBookingStudent(svc, caller, body?.childId);
  if (resolved.error) return resolved.error;
  const { studentId, onBehalf, relationship } = resolved;
  const studentProfile = onBehalf
    ? (await svc.from('profiles').select('id,birth_year,is_minor,guardian_consent_at').eq('id', studentId).maybeSingle()).data
    : caller.profile;
  if (onBehalf && !studentProfile) return Response.json({ error: 'No such student.' }, { status: 404 });

  // Same account-level gate as 1:1. A checkbox is not consent for a minor —
  // but the MANAGING parent booking the seat IS the guardian approving it. An
  // invite link is not: it proves nothing about who created it (family.js).
  if (!guardianGateSatisfied({ studentProfile, relationship })) {
    return Response.json({
      error: 'Live sessions need a parent or guardian’s approval first. We emailed them a link — ask them to click "Approve live tutoring", then book again.',
      code: 'guardian_consent_required',
    }, { status: 403 });
  }

  // Daily anti-abuse ceiling on group bookings of any kind (its own key —
  // group seats no longer consume the shared 'handoff' budget).
  const ent = await checkEntitlement(caller, 'group_seat');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  const { data: room } = await svc.from('group_session')
    .select('*').eq('id', sessionId).maybeSingle();
  if (!room) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (!['open', 'confirmed'].includes(room.status)) {
    return Response.json({ error: 'That session isn’t taking bookings.' }, { status: 409 });
  }
  if (new Date(room.scheduled_start).getTime() < Date.now()) {
    return Response.json({ error: 'That session has already started.' }, { status: 409 });
  }

  // The vetting gate, re-checked at booking. Never trust what the browse
  // endpoint showed — that is the whole lesson of the 1:1 path.
  const { data: tutor } = await svc.from('tutors')
    .select('id,display_name,status,vetting_status').eq('id', room.tutor_id).maybeSingle();
  if (!tutor || tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
    return Response.json({ error: 'That session isn’t bookable right now.' }, { status: 403 });
  }

  // THE pricing decision — one function, no local price math. Allowances meter
  // the CALLER (the payer): a parent's membership covers seats they book for
  // their teens.
  const allowances = await clubAllowances(svc, { userId: caller.user.id, plan: caller.profile?.plan });
  const quote = groupSeatQuote({
    plan: caller.profile?.plan,
    kind: room.kind,
    hallRemaining: allowances.hallRemaining,
            seatRemaining: allowances.seatRemaining,
    seatPriceCents: room.seat_price_cents,
  });
  // Reserved inventory (standing-seat rooms) is never sold at the door. The
  // quote says 'reserved' with amountCents 0 — that is a refusal, not a free
  // seat, and it must be handled before anything reads amountCents.
  if (quote.mode === 'reserved') {
    return Response.json(
      { error: 'This room is reserved for standing-seat members.', code: 'reserved' },
      { status: 403 },
    );
  }
  const settlesFree = quote.mode === 'free' || quote.mode === 'included';

  // Race-free claim: two students hitting checkout at the same instant must not
  // both get the last seat. Counting and claiming happen in one locked statement.
  const { data: claim, error: claimErr } = await svc.rpc('claim_group_seat', {
    p_session: sessionId,
    p_student: studentId,
    p_amount: quote.amountCents,
    p_consent: true,
    p_bring: String(body?.bring || '').slice(0, 300) || null,
  });
  if (claimErr) {
    console.error('[group] seat claim failed', sessionId, claimErr.message);
    return Response.json({ error: 'Could not claim a seat — try again.' }, { status: 500 });
  }

  // Structured Hall intake (0026): subject / topic / stuck / goal, each a
  // short string. Only known keys survive; anything else in the payload is
  // dropped, never stored. Best-effort — the seat is valid without it.
  const intake = {};
  for (const key of ['subject', 'topic', 'stuck', 'goal']) {
    const v = String(body?.intake?.[key] || '').trim().slice(0, 300);
    if (v) intake[key] = v;
  }

  const result = Array.isArray(claim) ? claim[0] : claim;
  if (!result || result.outcome !== 'claimed') {
    const messages = {
      full: 'That session just filled up — join the waitlist and we’ll email you if a seat opens.',
      already_booked: onBehalf ? 'They already have a seat in this session.' : 'You already have a seat in this session.',
      closed: 'That session isn’t taking bookings.',
      not_found: 'No such session.',
    };
    return Response.json({
      error: messages[result?.outcome] || 'Could not claim a seat.',
      ...(result?.outcome === 'full' ? { waitlistable: true } : {}),
    }, { status: 409 });
  }

  // ── Free / included: settle instantly, no Stripe object ever exists ────────
  // paid=true means "settled, nothing owed" — min-fill counting, the room-join
  // gate, ?mine=1, and roster briefs all read it without special-casing.
  if (settlesFree) {
    const bookedVia = quote.mode === 'included' ? 'included' : 'free';
    const { error: bookErr } = await svc.from('group_seat').update({
      status: 'booked', paid: true, booked_via: bookedVia, booked_by: caller.user.id,
      // Booking an included seat inside the confirm window IS confirmation
      // (0029) — the T-24h ask would be asking about a decision just made.
      ...(bookedVia === 'included' && confirmedAtBooking({ scheduledStart: room.scheduled_start })
        ? { confirmed_at: new Date().toISOString() } : {}),
      ...(Object.keys(intake).length ? { intake } : {}),
    }).eq('id', result.seat_id);
    if (bookErr) {
      await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
      console.error('[group] seat settle failed', result.seat_id, bookErr.message);
      return Response.json({ error: 'Could not book the seat — nothing was spent. Try again.' }, { status: 500 });
    }

    // The allowance is spent in the same breath as the booking settles —
    // synchronous, so a failed ledger write rolls the seat back instead of
    // gifting untracked inventory.
    if (quote.feature) {
      try {
        await consumeAllowance(svc, {
          userId: caller.user.id,
          feature: quote.feature,
          metadata: { kind: 'group_seat', seatId: result.seat_id, sessionId, studentId },
        });
      } catch {
        await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
        return Response.json({ error: 'Could not apply your included visit — try again.' }, { status: 500 });
      }
    }

    recordUsage(caller, 'group_seat', 1, 0, { kind: room.kind, sessionId, mode: quote.mode }).catch(() => {});
    markWaitlistConverted(svc, { roomId: sessionId, userId: caller.user.id }).catch(() => {});
    await auditLog(caller.user.id, 'group.seat_booked', result.seat_id, {
      sessionId, studentId, mode: quote.mode, seatsTaken: result.seats_taken,
    });
    // Confirmation email the moment the seat settles (paid seats get theirs
    // from the webhook/reconcile path). Best-effort, never blocks the booking.
    sendGroupSeatEmails(svc, {
      seat: { student_id: studentId, amount_cents: 0 },
      room, mode: quote.mode,
    }).catch(() => {});
    return Response.json({
      ok: true, booked: true, mode: quote.mode, seatId: result.seat_id,
      seatsTaken: result.seats_taken, capacity: result.capacity,
    });
  }

  // ── Member / retail: Stripe Checkout ────────────────────────────────────────
  // Fail CLOSED, exactly as 1:1 does — but only AFTER the free/included branch,
  // so community sessions and membership visits work with Stripe unconfigured.
  const stripe = getStripe();
  if (!stripe) {
    await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
    return Response.json({
      error: 'Paid sessions aren’t available on this deployment yet (online payments aren’t set up). Please check back soon.',
    }, { status: 503 });
  }

  const base = appUrl(req);
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Managed Payments is enabled by default on this Stripe account, and it
      // made EVERY drop-in booking fail with a 502 while /api/health still
      // reported billing:true — the keys were present, the call was rejected.
      //
      // Two rejections, and the fix is not the obvious one:
      //   1. `payment_method_types` is "handled for you" and may not be passed.
      //   2. every product needs a tax code ELIGIBLE for Managed Payments — and
      //      every accurate one for live human instruction is ineligible. Only
      //      digital-goods codes qualify. Taking one would file a live session
      //      as an electronically supplied service — a false tax classification
      //      to satisfy a payments API. So this path opts out per-request and
      //      keeps the honest code.
      managed_payments: { enabled: false },
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: quote.amountCents,
          product_data: {
            name: `${kindLabel(room.kind)}: ${room.topic || room.subject} with ${tutor.display_name}`,
            // In the ROOM's zone. Formatted with the server's own locale, a
            // 6:00 PM Austin room appeared on the checkout page and the Stripe
            // receipt as 11:00 PM — the same wrong-evening bug the storefront
            // was just fixed for, on the one document a parent keeps.
            description: `${roomDateTime(room.scheduled_start, room.timezone)} · up to ${room.capacity} students`,
            // Live human instruction — Stripe's "Tutoring" code. Confirm with
            // an accountant before live launch.
            tax_code: 'txcd_20060059',
          },
        },
      }],
      customer_email: caller.user.email || undefined,
      metadata: { group_seat_id: result.seat_id, group_session_id: sessionId, kaizen_user_id: caller.user.id },
      payment_intent_data: { metadata: { group_seat_id: result.seat_id, group_session_id: sessionId } },
      success_url: `${base}${returnPath}?dropin=paid`,
      cancel_url: `${base}${returnPath}?dropin=cancelled`,
    });
    await svc.from('group_seat')
      .update({
        stripe_checkout_session_id: checkout.id, booked_by: caller.user.id,
        ...(Object.keys(intake).length ? { intake } : {}),
      }).eq('id', result.seat_id);
    recordUsage(caller, 'group_seat', 1, 0, { kind: room.kind, sessionId, mode: quote.mode }).catch(() => {});
    markWaitlistConverted(svc, { roomId: sessionId, userId: caller.user.id }).catch(() => {});
    await auditLog(caller.user.id, 'group.seat_claimed', result.seat_id, {
      sessionId, studentId, amount_cents: quote.amountCents, mode: quote.mode, seatsTaken: result.seats_taken,
    });
    return Response.json({
      ok: true, url: checkout.url, seatId: result.seat_id,
      seatsTaken: result.seats_taken, capacity: result.capacity,
    });
  } catch (e) {
    // Release the seat rather than stranding it in pending_payment.
    await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', result.seat_id);
    console.error('[group] checkout create failed', result.seat_id, e?.message);
    return Response.json({ error: 'Could not start the payment — the seat was released, try again.' }, { status: 502 });
  }
}

async function hostRoom(caller, svc, body) {
  const { data: tutor } = await svc.from('tutors')
    .select('id,status,vetting_status,pay_rate_cents').eq('user_id', caller.user.id).maybeSingle();
  if (!tutor) return Response.json({ error: 'Only tutors can host.' }, { status: 403 });
  if (tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
    return Response.json({ error: 'Your profile isn’t cleared to host yet.' }, { status: 403 });
  }

  const start = new Date(body?.start);
  const end = new Date(body?.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return Response.json({ error: 'Pick a valid start and end time.' }, { status: 400 });
  }

  // Tutor self-hosting creates CLINICS at the house retail price. Hall and
  // community rooms are scheduled by admins/series — they carry membership and
  // free-access economics a tutor shouldn't improvise.
  const defaults = KIND_DEFAULTS.clinic;
  const capacity = Math.min(defaults.capacity, Math.max(2, Math.round(Number(body?.capacity) || defaults.capacity)));
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  const { data: room, error } = await svc.from('group_session').insert({
    tutor_id: tutor.id,
    subject: String(body?.subject || '').slice(0, 120) || 'General',
    topic: String(body?.topic || '').slice(0, 160) || null,
    description: String(body?.description || '').slice(0, 600) || null,
    kind: 'clinic',
    capacity,
    min_seats: Math.min(capacity, Math.max(1, Math.round(Number(body?.minSeats) || defaults.minSeats))),
    seat_price_cents: RETAIL.clinicSeatCents,
    tutor_share: 0.75, // ignored under flat_hourly; column is NOT NULL
    pay_model: 'flat_hourly',
    tutor_pay_cents: tutorPayCents(tutor.pay_rate_cents, durationMin),
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    cutoff_at: new Date(start.getTime() - 2 * 3600 * 1000).toISOString(),
  }).select().maybeSingle();
  if (error) {
    console.error('[group] host insert failed', error.message);
    return Response.json({ error: 'Could not create the session — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'group.hosted', room.id, { capacity });

  return Response.json({
    ok: true,
    session: room,
    pay: {
      perSession: room.tutor_pay_cents,
      note: `You're paid $${(room.tutor_pay_cents / 100).toFixed(2)} for this ${durationMin}-minute clinic once it runs — regardless of how seats were paid for.`,
    },
  });
}

// The only seat statuses a student may release. 'attended' is deliberately
// absent: see the refusal in DELETE below.
const CANCELLABLE_SEAT = ['pending_payment', 'booked'];

export async function DELETE(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const seatId = String(body?.seatId || '');
  if (!seatId) return Response.json({ error: 'Seat id required.' }, { status: 400 });

  // The room's KIND rides along because the allowance to give back depends on
  // it (see the restore below) — one join, not a second round trip.
  const { data: seat } = await svc.from('group_seat')
    .select('*,group_session(scheduled_start,status,kind)').eq('id', seatId).maybeSingle();
  // The seat's student OR the parent who booked it may release it.
  if (!seat || (seat.student_id !== caller.user.id && seat.booked_by !== caller.user.id)) {
    return Response.json({ error: 'Not your seat.' }, { status: 403 });
  }

  // Only a seat still being HELD can be released. An 'attended' seat is a
  // record of a session that ran: cancelling it would zero the tutor's
  // flat-hourly pay (completeGroupSessions counts settled seats), so the
  // student does not get to rewrite history after the fact. A seat that is
  // already cancelled has nothing left to give back.
  if (!CANCELLABLE_SEAT.includes(seat.status)) {
    return Response.json({
      error: seat.status === 'attended'
        ? 'That session already ran — the seat can’t be cancelled now. Contact support if something went wrong.'
        : 'That seat is already released.',
    }, { status: 409 });
  }

  const eligible = groupRefundEligible({
    status: seat.status,
    scheduledStart: seat.group_session?.scheduled_start,
  });

  // Claim the seat BEFORE any side effect, the way releaseUnconfirmedSeats
  // does: the conditional update is the lock. Gated on the status we read AND
  // on the releasable set, so a second DELETE landing at the same moment — or
  // a T-4h release, or a webhook settling the row — moves it out from under us
  // and comes back empty. Only the winner refunds and restores the allowance;
  // without this, two parallel cancels minted two included Hall visits.
  const { data: claimed } = await svc.from('group_seat')
    .update({ status: 'cancelled' })
    .eq('id', seatId).eq('status', seat.status).in('status', CANCELLABLE_SEAT)
    .select('id').maybeSingle();
  if (!claimed) {
    return Response.json({ error: 'That seat just changed — reload and try again.' }, { status: 409 });
  }

  // Kill the payment link before anything else. 0031 lets a cancelled seat be
  // RE-ARMED for a rebooking, and the re-armed row keeps its id — which is the
  // id this seat's old Checkout session carries in its metadata. Leave that
  // session payable and a student who cancels, rebooks, then pays the stale
  // link is charged twice for one seat, with fulfillGroupSeatCheckout settling
  // the new hold against the old payment. Same reasoning as REL-001 in
  // releaseAbandonedSeats, which has always expired links on release.
  if (seat.stripe_checkout_session_id && !seat.paid) {
    const stripeForLink = getStripe();
    if (stripeForLink) {
      try { await stripeForLink.checkout.sessions.expire(seat.stripe_checkout_session_id); }
      catch { /* already expired, already paid, or Stripe unreachable */ }
    }
  }

  let refunded = false;
  if (eligible && seat.paid && seat.stripe_payment_intent_id && seat.refund_status === 'none') {
    const stripe = getStripe();
    if (stripe) {
      try {
        await stripe.refunds.create({ payment_intent: seat.stripe_payment_intent_id });
        refunded = true;
      } catch (e) {
        console.error('[group] refund failed', e?.message);
      }
    }
  }

  // An included visit released inside the window goes back on the allowance —
  // to the BOOKER, whose ledger was decremented, and onto the SAME allowance
  // the booking spent. Hard-coding club_hall_included here handed a cancelling
  // seat holder a Homework Hall visit their plan says they have none of, while
  // the seat session they actually paid for stayed spent; the room kind is the
  // only thing that knows which one it was.
  const restoreFeature = STANDING_FEATURE[seat.group_session?.kind];
  if (eligible && seat.booked_via === 'included' && restoreFeature) {
    await restoreAllowance(svc, {
      userId: seat.booked_by || seat.student_id,
      feature: restoreFeature,
      metadata: { kind: 'group_seat_cancelled', roomKind: seat.group_session?.kind, seatId },
    }).catch((e) => console.error('[group] allowance restore failed', seatId, e?.message));
    refunded = true; // "you got your visit back" is the honest summary
  }

  if (refunded && seat.paid && seat.stripe_payment_intent_id) {
    // Still gated on 'cancelled': between the refund call and this write the
    // same student can rebook the room, and 0031's re-arm reuses this row. An
    // unconditional stamp would mark that fresh hold 'refunded' and make a
    // genuinely paid seat permanently ineligible for one.
    await svc.from('group_seat').update({ refund_status: 'refunded' })
      .eq('id', seatId).eq('status', 'cancelled');
  }

  await auditLog(caller.user.id, 'group.seat_cancelled', seatId, { refunded });

  // The freed seat goes to the front of the waitlist (0029) — the claim above
  // only succeeds from a held status, so there is always a seat to offer…
  notifySeatOpened(svc, seat.group_session_id).catch(() => {});

  // …and the canceller gets somewhere to land: same-kind upcoming rooms,
  // EMPTIEST first — a rebooking should level a trough, not crowd a peak.
  let alternatives = [];
  try {
    const { data: roomRow } = await svc.from('group_session')
      .select('kind').eq('id', seat.group_session_id).maybeSingle();
    if (roomRow?.kind) {
      const { data: others } = await svc.from('group_session')
        .select('id,subject,topic,kind,capacity,scheduled_start,scheduled_end,timezone,status')
        .eq('kind', roomRow.kind)
        .in('status', ['open', 'confirmed'])
        .neq('id', seat.group_session_id)
        .gt('scheduled_start', new Date().toISOString())
        .lt('scheduled_start', new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString())
        .limit(30);
      const ids = (others || []).map((r) => r.id);
      const { data: heldSeats } = ids.length
        ? await svc.from('group_seat').select('group_session_id,status').in('group_session_id', ids)
        : { data: [] };
      const takenBy = {};
      for (const s of heldSeats || []) {
        if (['pending_payment', 'booked', 'attended'].includes(s.status)) {
          takenBy[s.group_session_id] = (takenBy[s.group_session_id] || 0) + 1;
        }
      }
      alternatives = (others || [])
        .map((r) => ({
          id: r.id, subject: r.subject, topic: r.topic, kind: r.kind,
          start: r.scheduled_start, seatsLeft: Math.max(0, r.capacity - (takenBy[r.id] || 0)),
        }))
        .filter((r) => r.seatsLeft > 0)
        .sort(emptiestCompare)
        .slice(0, 3);
    }
  } catch { /* suggestions are a courtesy, never a failure */ }

  return Response.json({
    ok: true,
    refunded,
    alternatives,
    // Stricter than 1:1, and the reason is worth saying: leaving late can drop
    // the room below its minimum and cancel it for everyone else.
    message: refunded
      ? 'Seat released — your payment (or included visit) is back.'
      : `Seat released. Cancellations under ${GROUP_REFUND_WINDOW_HOURS} hours aren’t refunded — a late drop can cancel the session for the others.`,
  });
}
