// The cohort — the one recurring product, as an object a surface can render.
//
// WHY THIS FILE EXISTS (docs/superpowers/specs/2026-09-02-wave2-geometry.md)
// Three storefront surfaces independently reported the same gap: the seat has
// a price and a paragraph and no day, no venue, no lead tutor and no places
// remaining. Each proposed its own local fix. The actual cause is that no
// seat-shaped READ existed anywhere in lib/server, so every seat section could
// only ever be prose, and the three pages were already drifting apart.
//
// `publicSchedule` excludes standing_seat rooms — correctly, because they are
// reserved inventory that nobody may buy from a board. That exclusion got
// silently read as a rule about VISIBILITY rather than about PURCHASABILITY. A
// family is allowed to know the club runs a Tuesday-and-Thursday Algebra cohort
// at the library with two places left. They are not allowed to check out into
// it. This module draws exactly that line: it returns everything a parent needs
// in order to ask, and no price, no room id and no purchase path.
//
// THE ENROLMENT PATH IS UNCHANGED. A seat is still standing_seats rows against
// the cohort's series, still booked by the weekly sweep, still metered on
// club_seat_included. Cohorts group series; they do not replace them.

import { serviceClient } from '@/lib/server/context';
import { SEAT_PLAN } from '@/lib/server/clubPricing';

const SEAT_KIND = 'standing_seat';

/**
 * Every active seat cohort, shaped for a public surface.
 *
 * Fails toward SILENCE, not toward a wrong answer: an unconfigured or
 * unreadable database returns an empty list, so a storefront renders its
 * "cohorts post here" state rather than inventing rooms. Never throws — this
 * is called from server components that must render without a database.
 *
 * @returns {Promise<Array<{
 *   id, title, subject, venue, timezone, gradeBand, capacity,
 *   weekdays: number[], slots: Array<{weekday, localStartTime, durationMinutes}>,
 *   leadTutorName: string|null, placesLeft: number|null, isFull: boolean,
 *   sessionsPerWeek: number, minutes: number, ratio: number
 * }>>}
 */
export async function publicCohorts({ limit = 12 } = {}) {
  const svc = serviceClient();
  if (!svc) return [];

  try {
    const { data: cohorts, error } = await svc.from('cohort')
      .select('id,title,subject,venue,timezone,grade_band,capacity,lead_tutor_id,active')
      .eq('active', true)
      // Deterministic, because two surfaces read this with different caching
      // (/tutoring revalidates, /schedule is dynamic) and an unordered LIMIT
      // let them advertise different cohorts to the same family.
      .order('created_at', { ascending: true })
      // Over-fetch: the LIMIT has to count cohorts a family can actually be
      // shown, and a half-laid-out cohort with no seat series is dropped after
      // the query. Limiting first meant a handful of drafts could crowd out
      // every real cohort and render the "no cohorts yet" state while cohorts
      // existed — a failure indistinguishable from an unmigrated database.
      .limit(Math.max(1, limit) * 4);
    // A missing table (0038 not applied) is not an error worth a stack trace —
    // it is a deployment that has not migrated yet, and the storefront's held
    // state is the correct thing to show.
    if (error || !cohorts?.length) return [];

    const ids = cohorts.map((c) => c.id);
    const tutorIds = [...new Set(cohorts.map((c) => c.lead_tutor_id).filter(Boolean))];

    const [seriesQ, tutorQ] = await Promise.all([
      svc.from('group_session_series')
        .select('id,cohort_id,weekday,local_start_time,duration_minutes,kind,active')
        .in('cohort_id', ids),
      tutorIds.length
        ? svc.from('tutors').select('id,display_name,status,vetting_status').in('id', tutorIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Same hard gate as every other public surface: only a vetted, active
    // tutor is nameable. An uncleared lead is rendered as no name, never as a
    // name we have not cleared.
    const nameOf = Object.fromEntries(
      (tutorQ.data || [])
        .filter((t) => t.status === 'active' && t.vetting_status === 'cleared')
        .map((t) => [t.id, t.display_name]),
    );

    const seriesOf = {};
    for (const s of seriesQ.data || []) {
      if (s.kind !== SEAT_KIND || s.active === false) continue;
      (seriesOf[s.cohort_id] ||= []).push(s);
    }

    // Places remaining is counted from the ENROLMENTS, not from a room: a seat
    // is held for the month whether or not a given Thursday is booked yet, so
    // counting group_seat rows would show a cohort as empty every Monday.
    const seriesIds = Object.values(seriesOf).flat().map((s) => s.id);
    const held = {};
    // A failed enrolment read must not read as an empty one. `heldUnknown`
    // carries that all the way to shapeCohort, which then publishes no count.
    let heldUnknown = false;
    if (seriesIds.length) {
      const { data: standing, error: standingErr } = await svc.from('standing_seats')
        .select('series_id,student_id,active').in('series_id', seriesIds).eq('active', true);
      if (standingErr) heldUnknown = true;
      const byCohort = {};
      const seriesToCohort = Object.fromEntries(
        Object.entries(seriesOf).flatMap(([cid, list]) => list.map((s) => [s.id, cid])),
      );
      for (const row of standing || []) {
        const cid = seriesToCohort[row.series_id];
        if (!cid) continue;
        // One student in two of a cohort's series is ONE place taken. This is
        // the whole reason the cohort object exists.
        (byCohort[cid] ||= new Set()).add(row.student_id);
      }
      for (const [cid, set] of Object.entries(byCohort)) held[cid] = set.size;
    }

    return cohorts
      .map((c) => shapeCohort(
        c,
        seriesOf[c.id] || [],
        nameOf[c.lead_tutor_id] || null,
        heldUnknown ? null : (held[c.id] || 0),
      ))
      // A cohort with no seat series is a draft the director has not finished
      // laying out. It is not a thing to advertise.
      .filter((c) => c.slots.length > 0)
      .sort((a, b) => (a.weekdays[0] ?? 7) - (b.weekdays[0] ?? 7))
      .slice(0, Math.max(1, limit));
  } catch (err) {
    console.error('[cohorts] public read failed:', err?.message);
    return [];
  }
}

/** PURE. The row-to-object shape, so a test can pin it without a database. */
export function shapeCohort(row, series = [], leadTutorName = null, placesTaken = 0) {
  const slots = (Array.isArray(series) ? series : [])
    .map((s) => ({
      weekday: Number(s.weekday),
      localStartTime: String(s.local_start_time || '').slice(0, 5),
      durationMinutes: Number(s.duration_minutes) || SEAT_PLAN.seat.minutes,
    }))
    .filter((s) => Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6)
    .sort((a, b) => a.weekday - b.weekday || a.localStartTime.localeCompare(b.localStartTime));

  const capacity = Number(row?.capacity) || SEAT_PLAN.seat.ratio;
  // `null` means we could not read the enrolments, which is NOT zero. A dropped
  // error here advertised "4 of 4 left" on a cohort that was full — the most
  // expensive lie a storefront can tell, because a family acts on it. Unknown
  // occupancy renders as no count at all: RoomCard's Number.isFinite guard
  // drops the line, and isFull stays false so nothing claims it is open either.
  const unknown = placesTaken === null || placesTaken === undefined;
  const taken = unknown ? null : Math.max(0, Number(placesTaken) || 0);

  return {
    id: row?.id,
    title: row?.title || 'Standing seat',
    subject: row?.subject || null,
    venue: row?.venue || null,
    timezone: row?.timezone || null,
    gradeBand: row?.grade_band || null,
    capacity,
    slots,
    weekdays: slots.map((s) => s.weekday),
    leadTutorName,
    placesLeft: unknown ? null : Math.max(0, capacity - taken),
    isFull: unknown ? false : taken >= capacity,
    // So a caller can tell "we could not count" apart from "nobody yet".
    occupancyKnown: !unknown,
    // The seat's shape, from the price file rather than from the row, so a
    // cohort mis-configured in the admin cannot quietly redefine the product.
    sessionsPerWeek: SEAT_PLAN.seat.sessionsPerWeek,
    minutes: SEAT_PLAN.seat.minutes,
    ratio: SEAT_PLAN.seat.ratio,
  };
}

/**
 * The seat a family actually holds, for the parent's own page: one object, not
 * N weekly bookings.
 *
 * The audit's finding was that /family renders a $550 purchase as two unrelated
 * rows with two one-way delete buttons, because `standing_seats` is per-series.
 * This folds them back into the thing that was bought.
 *
 * Three answers, because the page says a different sentence to each: the seat,
 * `null` (this student holds no seat — a state, not a failure), and
 * `{ unavailable: true }` (we could not look).
 */
export async function mySeat(svc, studentId) {
  if (!svc || !studentId) return null;
  try {
    const { data: standing, error } = await svc.from('standing_seats')
      .select('id,series_id,user_id,student_id,active')
      .eq('student_id', studentId).eq('active', true);
    if (error || !standing?.length) return null;

    const seriesIds = [...new Set(standing.map((s) => s.series_id))];
    const { data: series, error: seriesErr } = await svc.from('group_session_series')
      .select('id,cohort_id,title,subject,weekday,local_start_time,duration_minutes,kind,timezone,venue,tutor_id')
      .in('id', seriesIds);
    // We already know this student HOLDS standing rows — the read above
    // succeeded. So a failure here is not "no seat", and answering null would
    // tell a family paying $550 a month that they have not got one. Throw to
    // the catch, which the caller renders as "we could not check just now".
    if (seriesErr) throw seriesErr;

    const seatSeries = (series || []).filter((s) => s.kind === SEAT_KIND);
    // No seat series means the student's standing bookings are weekly Halls,
    // which are a different product and belong to a different card.
    if (!seatSeries.length) return null;

    const cohortId = seatSeries.find((s) => s.cohort_id)?.cohort_id || null;
    let cohortRow = null;
    if (cohortId) {
      const { data } = await svc.from('cohort')
        .select('id,title,subject,venue,timezone,grade_band,capacity,lead_tutor_id')
        .eq('id', cohortId).maybeSingle();
      cohortRow = data || null;
    }

    // Fall back to the series when a cohort has not been assigned yet: a family
    // enrolled before 0038 still has a seat, and their page must still render.
    const base = cohortRow || {
      id: null,
      title: seatSeries[0].title,
      subject: seatSeries[0].subject,
      venue: seatSeries[0].venue,
      timezone: seatSeries[0].timezone,
      capacity: SEAT_PLAN.seat.ratio,
      lead_tutor_id: seatSeries[0].tutor_id,
    };

    let leadTutorName = null;
    if (base.lead_tutor_id) {
      const { data: t } = await svc.from('tutors')
        .select('display_name,status,vetting_status').eq('id', base.lead_tutor_id).maybeSingle();
      if (t && t.status === 'active' && t.vetting_status === 'cleared') leadTutorName = t.display_name;
    }

    // Scoped to the SEAT's own series, and this is not a detail: `standing`
    // is every active standing row the student holds, which includes a weekly
    // Homework Hall booked alongside the seat. Returning all of them let one
    // "end this seat" silently cancel the Hall too, behind a confirmation that
    // promised only to stop the seat's weeks.
    const seatSeriesIds = new Set(seatSeries.map((s) => s.id));

    return {
      ...shapeCohort(base, seatSeries, leadTutorName, 0),
      // What the family can act on: one "end this seat" ends every evening of
      // the seat together, instead of asking a parent to delete twice what she
      // bought once — and ends nothing that is not the seat.
      standingIds: standing.filter((s) => seatSeriesIds.has(s.series_id)).map((s) => s.id),
      seriesIds: seatSeries.map((s) => s.id),
      // placesLeft is meaningless on your own seat; you are in it.
      placesLeft: null,
      isFull: false,
    };
  } catch (err) {
    // NOT null. `null` is this file's word for "this family has no seat", and
    // saying it to a family who pays $550 a month because a query timed out is
    // the worst sentence /family can print. `{ unavailable: true }` is the same
    // three-answer shape nextSeatSession already uses: a seat, no seat, or we
    // could not look.
    console.error('[cohorts] mySeat failed:', err?.message);
    return { unavailable: true };
  }
}
