// /api/admin/seats — the Program Director's seat console. Admin only.
// The screen that drives it is the "Seat cohorts" panel on /admin.
//
// GET                                     → every standing_seat cohort, its
//                                           enrolled holders, and for each one
//                                           the two things that decide whether
//                                           the weekly sweep will actually book
//                                           them: the payer's plan and the
//                                           student's guardian approval
// POST   {seriesId, payer, student}       → enrol a family into a cohort.
//                                           `payer`/`student` are emails — the
//                                           director types what is on the
//                                           parent's screen, not a UUID nobody
//                                           can read off a table. (payerId /
//                                           studentId still work for a caller
//                                           that already has the ids.)
// DELETE {standingId}                     → end an enrolment
//
// WHY THIS EXISTS SEPARATELY FROM /api/tutoring/group {action:'standing'}
// That action is the FAMILY enrolling itself, from the schedule, with its own
// guardian-consent checkbox. This one is the director sitting at a table with
// a parent, placing them in the cohort they just agreed to pay for. Same row
// (standing_seats, 0029), same weekly sweep (series.bookStandingSeats), a
// different person doing it — so it is admin-gated, audited on every write,
// and it never invents consent on the parent's behalf.
//
// WHAT THIS ROUTE DELIBERATELY DOES NOT DO
// It does not book anyone, charge anyone, or decide that a minor may sit in a
// live room. Enrolment is a RECORD; the booking is still done by
// bookStandingSeats, which re-derives the guardian relationship and the
// allowance on every single run. So an enrolment made before the plan or the
// consent lands simply books nothing until they do — and this route says so in
// plain words instead of reporting a success the calendar will not honour.
//
// THE CLUB GATE APPLIES HERE, AND ENROLLING IS REFUSED WHILE IT IS OFF
// Hard Rule 4: `app_settings.club_enabled` gates booking until counsel clears
// docs/legal/REVIEW_QUEUE.md items 10–15, and the family-facing twin fails
// closed on it (app/api/tutoring/group/route.js POST → 503). Being an admin is
// not a way around a legal gate. The alternative considered — write the record
// now, skip the booking until selling opens — does not hold, because the
// hourly cron runs bookStandingSeats ungated: a row written today is a live
// room booked within the hour. Refusing the WRITE is the only version of this
// that actually fails closed, and it preserves the invariant that no
// standing_seat row can exist that did not pass an open gate. Reading (GET) and
// ending an enrolment (DELETE) stay available: neither sells anything.

import { getCaller, isAdminCaller, serviceClient, auditLog, getSettings } from '@/lib/server/context';
import { KIND_DEFAULTS } from '@/lib/server/clubPricing';
import { bookStandingSeats, STANDING_FEATURE } from '@/lib/server/series';
import { guardianGateSatisfied, bookingRelationship } from '@/lib/server/family';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The console covers the reserved product only. A weekly Homework Hall
// standing seat is the family's own action on the schedule (it always has
// been), and listing one here that this route cannot show holders for would be
// a worse lie than not offering it.
const SEAT_KIND = 'standing_seat';

// The allowance a seat room is metered on. Read from the one map in
// lib/server/series.js that the weekly sweep meters against, so this console
// and the sweep cannot disagree about which allowance a seat spends.
const SEAT_FEATURE = STANDING_FEATURE[SEAT_KIND];

async function requireAdmin(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!isAdminCaller(caller)) return { error: Response.json({ error: 'Admin only.' }, { status: 403 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

// The same fail-closed reading of the master switch the family-facing booking
// route makes: the switch must be explicitly true, so an empty app_settings
// table means the club is shut, not open by omission.
async function clubOpen() {
  const settings = await getSettings();
  return settings.club_enabled === true;
}

// 0029 (standing_seats) and 0033 (the seat kind) are the two migrations this
// console needs. On a deployment without them the honest answer is "the
// database doesn't have this yet", not a 500 the director has to guess at.
function notProvisioned(what, extra = {}) {
  return Response.json({
    error: `This deployment’s database doesn’t have the standing-seat tables yet (migrations 0029 and 0033). Apply them, then ${what}.`,
    notProvisioned: true, ...extra,
  }, { status: 503 });
}

/** Whether this plan carries seat sessions at all, straight from the rail. */
async function seatAllowanceFor(svc, plan) {
  const { data } = await svc.from('plan_entitlements')
    .select('monthly_limit').eq('plan', plan || 'free').eq('feature', SEAT_FEATURE).maybeSingle();
  if (!data) return 0;
  return data.monthly_limit === null ? Infinity : Number(data.monthly_limit) || 0;
}

export async function GET(req) {
  const { error, svc } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data: cohorts, error: sErr } = await svc.from('group_session_series')
      .select('id,title,subject,kind,venue,weekday,local_start_time,timezone,duration_minutes,capacity,active,tutor_id')
      .eq('kind', SEAT_KIND)
      .order('weekday').order('local_start_time');
    if (sErr) throw sErr;

    const ids = (cohorts || []).map((c) => c.id);
    // Ended enrolments stay in the table (0029 deactivates, never deletes) so
    // "why did my Thursday stop" is answerable; the console shows the live
    // roster and leaves the history to the audit log.
    const { data: holders, error: hErr } = ids.length
      ? await svc.from('standing_seats')
          .select('id,series_id,user_id,student_id,created_at')
          .in('series_id', ids).eq('active', true).order('created_at')
      : { data: [], error: null };
    if (hErr) throw hErr;

    // birth_year / is_minor / guardian_consent_at ride along because
    // guardianGateSatisfied reads exactly those three; selecting less would
    // make every student look unverified (the gate fails closed on a missing
    // birth year, which is the direction we want, but not as a display bug).
    const peopleIds = [...new Set((holders || []).flatMap((h) => [h.user_id, h.student_id]))];
    const { data: people } = peopleIds.length
      ? await svc.from('profiles')
          .select('id,name,email,plan,birth_year,is_minor,guardian_consent_at').in('id', peopleIds)
      : { data: [] };
    const person = Object.fromEntries((people || []).map((p) => [p.id, p]));

    const tutorIds = [...new Set((cohorts || []).map((c) => c.tutor_id).filter(Boolean))];
    const { data: tutors } = tutorIds.length
      ? await svc.from('tutors').select('id,display_name,status,vetting_status').in('id', tutorIds)
      : { data: [] };
    const tutor = Object.fromEntries((tutors || []).map((t) => [t.id, t]));

    // Which plans carry seat sessions — read once, not once per holder, so the
    // console can flag a family whose plan will book nothing.
    const plans = [...new Set((people || []).map((p) => p.plan || 'free'))];
    const { data: ents } = plans.length
      ? await svc.from('plan_entitlements')
          .select('plan,monthly_limit').eq('feature', SEAT_FEATURE).in('plan', plans)
      : { data: [] };
    const seatPlans = new Set((ents || [])
      .filter((e) => e.monthly_limit === null || Number(e.monthly_limit) > 0)
      .map((e) => e.plan));

    // The guardian gate, per holder, derived by the same function the weekly
    // sweep and the family-facing action use rather than re-stated here — a
    // console that drew its own conclusion would eventually disagree with the
    // sweep, and the director would be the last to know. bookingRelationship
    // costs two indexed reads per holder; a 1:4 cohort keeps that bounded, and
    // reusing the shared rule is worth more than saving the round trips.
    const gates = await Promise.all((holders || []).map(async (h) => {
      const relationship = await bookingRelationship(svc, h.user_id, h.student_id);
      return [h.id, guardianGateSatisfied({ studentProfile: person[h.student_id], relationship })];
    }));
    const guardianOk = Object.fromEntries(gates);

    const byCohort = {};
    for (const h of holders || []) {
      const payer = person[h.user_id] || {};
      const student = person[h.student_id] || {};
      (byCohort[h.series_id] ||= []).push({
        standingId: h.id,
        enrolledAt: h.created_at,
        payer: { id: h.user_id, name: payer.name || null, email: payer.email || null, plan: payer.plan || null },
        student: { id: h.student_id, name: student.name || null, email: student.email || null },
        // The two things the director needs at a glance, and the only two that
        // silently stop the sweep: is this family's plan actually going to book
        // the seat, and may this student be put in a live room at all?
        payerOnSeatPlan: seatPlans.has(payer.plan || 'free'),
        guardianApproved: guardianOk[h.id] === true,
      });
    }

    return Response.json({
      // So the console can grey the enrol control and say WHY, instead of
      // letting the director type a family's details into a form that is
      // going to answer 503.
      clubOpen: await clubOpen(),
      cohorts: (cohorts || []).map((c) => ({
        id: c.id, title: c.title, subject: c.subject, venue: c.venue || null,
        weekday: c.weekday, localStartTime: c.local_start_time, timezone: c.timezone,
        durationMinutes: c.duration_minutes, capacity: c.capacity, active: c.active,
        tutorName: tutor[c.tutor_id]?.display_name || null,
        // An unstaffed or uncleared cohort materializes no rooms at all
        // (series.materializeSeries skips it), so enrolling into it books
        // nothing — worth saying before the director wonders why.
        staffed: Boolean(c.tutor_id) && tutor[c.tutor_id]?.status === 'active'
          && tutor[c.tutor_id]?.vetting_status === 'cleared',
        holders: byCohort[c.id] || [],
        seatsTaken: (byCohort[c.id] || []).length,
      })),
    });
  } catch (err) {
    if (isMissingSchema(err)) return notProvisioned('reload this page', { cohorts: [] });
    console.error('[admin/seats GET]', err?.message);
    return Response.json({ error: 'Could not load the seat cohorts — try again.' }, { status: 500 });
  }
}

// Find one account by the thing a director can actually read off a parent's
// phone. `id` wins when a caller already has it (the console sends ids back on
// a re-enrol); otherwise the email is matched case-insensitively, the way
// admin/grant-plan and family invites match one. Returns { profile } or
// { error }.
async function resolvePerson(svc, { id, email, role, fields }) {
  const rawId = String(id || '').trim();
  const rawEmail = String(email || '').trim().toLowerCase();
  if (!rawId && !rawEmail) {
    return { error: Response.json({ error: `Say who ${role}.` }, { status: 400 }) };
  }
  const q = svc.from('profiles').select(fields);
  const { data } = rawId ? await q.eq('id', rawId).maybeSingle() : await q.ilike('email', rawEmail).maybeSingle();
  if (!data) {
    return {
      error: Response.json({
        error: rawEmail
          // The director is at a table with this family: the next action is
          // "have them sign up", not "check your id".
          ? `No Kaizen account for ${rawEmail}. Have them create one first — the seat is attached to an account, not to a name.`
          : 'No account with that id.',
      }, { status: 404 }),
    };
  }
  return { profile: data };
}

export async function POST(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  // Hard Rule 4, and the reason is in the header: an enrolment row is booked
  // into live rooms by the ungated hourly cron, so writing one while selling
  // is shut would put a minor in a room the gate exists to hold back.
  if (!await clubOpen()) {
    return Response.json({
      error: 'Selling isn’t open yet, so nobody can be enrolled in a seat cohort. Lay the cohort out in Classes now; flip “Club selling open” in Settings once counsel clears it, then enrol the family.',
      code: 'notYetOpen',
    }, { status: 503 });
  }
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const seriesId = String(body?.seriesId || '').trim();
  if (!seriesId) return Response.json({ error: 'Pick the cohort to enrol them in.' }, { status: 400 });

  try {
    const { data: series, error: sErr } = await svc.from('group_session_series')
      .select('id,title,kind,active,capacity,venue').eq('id', seriesId).maybeSingle();
    if (sErr) throw sErr;
    if (!series) return Response.json({ error: 'No such cohort.' }, { status: 404 });
    if (series.kind !== SEAT_KIND) {
      return Response.json({
        error: `“${series.title}” is a ${series.kind.replace('_', ' ')}, not a standing-seat cohort. Change its kind in Classes, or enrol the family from the schedule instead.`,
      }, { status: 400 });
    }
    if (!series.active) {
      return Response.json({
        error: `“${series.title}” is paused, so it has no rooms to book into. Resume it in Classes first.`,
      }, { status: 409 });
    }

    const payerLookup = await resolvePerson(svc, {
      id: body?.payerId, email: body?.payer,
      role: 'is paying — the payer’s account holds the seat plan',
      fields: 'id,name,email,plan',
    });
    if (payerLookup.error) return payerLookup.error;
    const payer = payerLookup.profile;
    const payerId = payer.id;

    const studentLookup = await resolvePerson(svc, {
      id: body?.studentId, email: body?.student,
      role: 'is taking the seat',
      fields: 'id,name,email,birth_year,is_minor,guardian_consent_at',
    });
    if (studentLookup.error) return studentLookup.error;
    const student = studentLookup.profile;
    const studentId = student.id;

    // The room only holds four (SEAT_PLAN.ratio, enforced on the series by
    // /api/admin/classes). Over-enrolling would not fail loudly — it would
    // quietly lose whoever the weekly sweep reaches last, which is the worst
    // possible way for a family to discover it. A row with no capacity of its
    // own falls back to the ratio rather than to zero, so a legacy series
    // refuses nobody by accident.
    const roomCapacity = Number(series.capacity) || KIND_DEFAULTS.standing_seat.capacity;
    const { data: existing } = await svc.from('standing_seats')
      .select('id,student_id').eq('series_id', seriesId).eq('active', true);
    const alreadyIn = (existing || []).some((r) => r.student_id === studentId);
    if (!alreadyIn && (existing || []).length >= roomCapacity) {
      return Response.json({
        error: `“${series.title}” is full at ${roomCapacity} students. End an enrolment, or open another cohort.`,
      }, { status: 409 });
    }

    const { data: row, error: upErr } = await svc.from('standing_seats').upsert(
      { series_id: seriesId, user_id: payerId, student_id: studentId, active: true, ended_at: null },
      { onConflict: 'series_id,student_id' },
    ).select('id').maybeSingle();
    if (upErr) throw upErr;

    await auditLog(caller.user.id, 'seats.enrolled', row?.id || seriesId, {
      seriesId, payerId, studentId, kind: series.kind,
    });

    // Book this month's remaining rooms now, exactly as the family-facing
    // action does — the director wants to turn the laptop around and show the
    // parent the dates, not say "check back in an hour". The sweep re-checks
    // the guardian gate and the allowance itself, so this can honestly book
    // nothing; the message below only ever claims what it actually did.
    const kicked = await bookStandingSeats(svc, { standingId: row?.id }).catch(() => null);
    const booked = kicked?.booked || 0;

    // Two things can be true and still leave the calendar empty. Say both,
    // rather than let the director find out next Thursday.
    const seatSessions = await seatAllowanceFor(svc, payer.plan);
    const relationship = await bookingRelationship(svc, payerId, studentId);
    const consentOk = guardianGateSatisfied({ studentProfile: student, relationship });
    const holdups = [];
    if (!(seatSessions > 0)) {
      holdups.push(`${payer.email || 'the payer'} is on the ${payer.plan || 'free'} plan, which includes no seat sessions — nothing books until the seat plan is active.`);
    }
    if (!consentOk) {
      holdups.push('no guardian approval is on file for this student, so the weekly booking will hold until a parent approves live tutoring.');
    }

    const who = student.name || student.email || 'the student';
    return Response.json({
      ok: true,
      standingId: row?.id,
      booked,
      payerPlan: payer.plan || null,
      payerOnSeatPlan: seatSessions > 0,
      guardianApproved: consentOk,
      message: holdups.length
        ? `${who} is enrolled in “${series.title}”, but ${holdups.join(' And ')}`
        : booked > 0
          ? `${who} is enrolled in “${series.title}” — ${booked === 1 ? 'the next session this month is' : `${booked} sessions this month are`} on the calendar, and each new month books itself.`
          : `${who} is enrolled in “${series.title}”. This month's rooms are already gone or not yet scheduled; next month's book themselves.`,
    });
  } catch (err) {
    if (isMissingSchema(err)) return notProvisioned('enrol the family');
    console.error('[admin/seats POST]', err?.message);
    return Response.json({ error: 'Could not enrol that family — nothing was changed. Try again.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const standingId = String(body?.standingId || '').trim();
  if (!standingId) return Response.json({ error: 'Say which enrolment to end.' }, { status: 400 });

  try {
    const { data: row, error: rErr } = await svc.from('standing_seats')
      .select('id,series_id,user_id,student_id,active').eq('id', standingId).maybeSingle();
    if (rErr) throw rErr;
    if (!row) return Response.json({ error: 'No such enrolment.' }, { status: 404 });
    if (!row.active) return Response.json({ error: 'That enrolment has already ended.' }, { status: 409 });

    const { error: upErr } = await svc.from('standing_seats')
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq('id', standingId).eq('active', true);
    if (upErr) throw upErr;

    await auditLog(caller.user.id, 'seats.ended', standingId, {
      seriesId: row.series_id, payerId: row.user_id, studentId: row.student_id,
    });
    return Response.json({
      ok: true,
      // Ending the standing arrangement stops FUTURE weeks. Rooms already on
      // the calendar are real bookings a real tutor is staffed for, so they
      // stay until somebody cancels them on purpose.
      message: 'Enrolment ended — no further weeks will be booked. Sessions already on the calendar stay booked; cancel any of them in Classes if the family isn’t coming.',
    });
  } catch (err) {
    if (isMissingSchema(err)) return notProvisioned('end the enrolment');
    console.error('[admin/seats DELETE]', err?.message);
    return Response.json({ error: 'Could not end that enrolment — nothing was changed. Try again.' }, { status: 500 });
  }
}
