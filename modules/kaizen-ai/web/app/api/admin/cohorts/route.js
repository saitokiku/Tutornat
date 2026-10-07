// /api/admin/cohorts — the standing seat as ONE object (migration 0038).
// Admin only. Every write is audited.
//
// WHY THIS ROUTE EXISTS (docs/superpowers/specs/2026-09-02-wave2-geometry.md)
// A seat is two sessions a week (clubPricing SEAT_PLAN.sessionsPerWeek) and a
// series is one weekday by construction (lib/server/series.js). So laying out
// the one recurring product meant creating two series by hand and remembering
// that they were halves of the same thing — a rule that lived only in the
// Director's head. 0038 added the `cohort` table and
// `group_session_series.cohort_id` to hold that rule, and until this route
// nothing in the product wrote either of them.
//
// GET                            → every cohort (paused ones too), its seat
//                                  series, its places taken, plus the seat
//                                  series that belong to no cohort yet
// POST {title, subject, slots}   → create a cohort AND its weekly series in
//                                  one action
// PATCH {id, ...}                → edit a cohort; the edits that describe the
//                                  ROOM travel to its series
// PATCH {id, attachSeriesId}     → adopt a seat series created before cohorts
//                                  existed
//
// THE CLUB GATE DOES NOT APPLY HERE, DELIBERATELY. Hard Rule 4 fails selling
// closed: /api/admin/seats refuses to ENROL a family while `club_enabled` is
// off, because an enrolment becomes a booked room within the hour. A cohort is
// a plan, not a sale — nobody is charged, nobody is placed, and laying the
// evenings out before counsel clears the queue is exactly what a director
// should be doing. Rooms still only materialize from a STAFFED series, and a
// family still cannot be put in one until the switch is on.
//
// WHAT THIS ROUTE DELIBERATELY DOES NOT DO
// It does not enrol anybody (that is /api/admin/seats), does not price
// anything (a seat room is reserved inventory at $0 — groupSeatQuote answers
// 'reserved' and the claim route refuses it), and does not touch rooms already
// on the calendar. A cohort edit reaches the calendar the way every other
// series edit does: through the hourly materializer, on the rooms it makes
// next.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { KIND_DEFAULTS, SEAT_PLAN } from '@/lib/server/clubPricing';
import { shapeCohort } from '@/lib/server/cohorts';
import { CLUB_TIMEZONE } from '@/lib/roomTime';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A cohort is made of seat rooms and nothing else. A Hall or a Clinic is a
// drop-in product with its own row and no cohort.
const SEAT_KIND = 'standing_seat';
const GRADE_BANDS = ['7-8', '9-12', 'college', 'all'];
// How many weekly series a cohort is made of, from the price sheet rather than
// from a number typed here: the family is buying 2 × 75 minutes a week, so a
// cohort with one evening in it would be a different product sold at the
// seat's price.
const SLOTS_PER_COHORT = SEAT_PLAN.seat.sessionsPerWeek;

async function requireAdmin(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!isAdminCaller(caller)) return { error: Response.json({ error: 'Admin only.' }, { status: 403 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

// 0038 is the migration this route is. On a deployment without it the honest
// answer names the migration rather than reporting a generic failure the
// person at the console cannot act on.
function notProvisioned(then) {
  return Response.json({
    error: `This deployment’s database doesn’t have the cohort table yet (migration 0038). Apply it, then ${then}.`,
    notProvisioned: true,
  }, { status: 503 });
}

const bad = (msg) => Response.json({ error: msg }, { status: 400 });

/** PURE. Shared field validation for POST (full) and PATCH (partial). */
export function validateCohort(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return { error: bad('A title is required — it is what the family and the schedule call this cohort.') };
    out.title = title;
  }
  if (!partial || body.subject !== undefined) {
    const subject = String(body.subject || '').trim().slice(0, 60);
    if (!subject) return { error: bad('A subject is required — a seat is one subject (Math, English, Science, Social Studies).') };
    out.subject = subject;
  }
  // Venue is optional here for the same reason it is optional on a series: a
  // director lays the evenings out before the room is booked. The console shows
  // the blank as a warning, because an in-person cohort with no venue tells no
  // parent where to go.
  if (body.venue !== undefined) out.venue = String(body.venue || '').trim().slice(0, 200) || null;

  if (!partial || body.timezone !== undefined) {
    const tz = String(body.timezone || CLUB_TIMEZONE);
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch {
      return { error: bad(`Unknown timezone "${tz}" — use an IANA name like ${CLUB_TIMEZONE}.`) };
    }
    out.timezone = tz;
  }
  if (body.gradeBand !== undefined) {
    const g = body.gradeBand == null || body.gradeBand === '' ? null : String(body.gradeBand);
    if (g != null && !GRADE_BANDS.includes(g)) return { error: bad(`Grade band must be one of ${GRADE_BANDS.join(', ')}.`) };
    out.grade_band = g;
  }
  if (!partial || body.capacity !== undefined) {
    // 1:4 is the product, not a preference (SEAT_PLAN.ratio, mirrored in
    // KIND_DEFAULTS). A roomier cohort would be a different product sold at the
    // seat's price, so the ask is capped the way the series route caps it
    // rather than refused.
    const asked = Math.round(Number(body.capacity ?? KIND_DEFAULTS.standing_seat.capacity));
    if (!Number.isFinite(asked) || asked < 1) return { error: bad('Capacity must be at least 1 student.') };
    out.capacity = Math.min(asked, KIND_DEFAULTS.standing_seat.capacity);
  }
  return { out };
}

/**
 * The weekly evenings, validated as a set rather than one at a time.
 * Two series on the same weekday is not "twice a week" — it is one evening
 * twice, and every sentence the product writes about a cohort ("Tuesdays and
 * Thursdays") would be wrong.
 */
export function validateSlots(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length !== SLOTS_PER_COHORT) {
    return { error: bad(`A standing seat is ${SLOTS_PER_COHORT} sessions a week — give this cohort ${SLOTS_PER_COHORT} evenings.`) };
  }
  const slots = [];
  for (const s of list) {
    const weekday = Math.round(Number(s?.weekday));
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) {
      return { error: bad('Each evening needs a weekday, 0 (Sunday) through 6 (Saturday).') };
    }
    const localStartTime = String(s?.localStartTime || '');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localStartTime)) {
      return { error: bad('Each evening needs a start time as HH:MM (24h), e.g. 16:30.') };
    }
    const minutes = Math.round(Number(s?.durationMinutes ?? KIND_DEFAULTS.standing_seat.minutes));
    if (!Number.isFinite(minutes) || minutes < 30 || minutes > 120) {
      return { error: bad('Each session must run 30–120 minutes.') };
    }
    slots.push({ weekday, localStartTime, durationMinutes: minutes });
  }
  if (new Set(slots.map((s) => s.weekday)).size !== slots.length) {
    return { error: bad('Each evening must be a different weekday — two rooms on one night is not two sessions a week.') };
  }
  return { slots: slots.sort((a, b) => a.weekday - b.weekday) };
}

/**
 * PURE. May this series join this cohort?
 *
 * Returns null when it may, or `{status, error}` when it may not.
 *
 * Adoption is the OTHER door into the same object, and it used to check only
 * that the series existed, was a seat and was unowned — so a director could
 * attach a third and a fourth evening, or a second series on a night the
 * cohort already runs. Those are the two states `validateSlots` exists to
 * refuse, and both reach the customer: shapeCohort feeds `publicCohorts` and
 * `mySeat`, so a cohort sold as SLOTS_PER_COHORT sessions a week would
 * advertise "Tuesdays, Thursdays and Fridays" — or say "Tuesdays and
 * Thursdays" while holding three evenings, which is worse because it is
 * plausible.
 *
 * @param {any} series    the candidate row (id, kind, cohort_id, weekday)
 * @param {string} cohortId
 * @param {Array<{id: any, weekday: any}>} siblings seat series already on the cohort
 */
export function attachRefusal(series, cohortId, siblings = []) {
  if (!series) return { status: 404, error: 'No such series.' };
  if (series.kind !== SEAT_KIND) {
    return { status: 409, error: 'Only a standing-seat series belongs to a cohort — a Hall or a Clinic is a drop-in room.' };
  }
  if (series.cohort_id && series.cohort_id !== cohortId) {
    return { status: 409, error: 'That series already belongs to another cohort. Detach it there first.' };
  }
  // Re-attaching a series to the cohort it is already in is a no-op, never a
  // third evening, so the candidate is not counted as its own sibling.
  const others = (siblings || []).filter((s) => String(s.id) !== String(series.id));
  if (others.some((s) => Number(s.weekday) === Number(series.weekday))) {
    return {
      status: 409,
      error: 'This cohort already meets on that weekday — two rooms on one night is not two sessions a week.',
    };
  }
  if (others.length + 1 > SLOTS_PER_COHORT) {
    return {
      status: 409,
      error: `A standing seat is ${SLOTS_PER_COHORT} sessions a week and this cohort already has ${others.length}. `
        + 'Detach an evening before attaching another.',
    };
  }
  return null;
}

/**
 * PURE. The room-describing fields an adopted series takes from its cohort.
 *
 * Every surface renders the COHORT's venue and lead tutor for all of its
 * evenings (shapeCohort → publicCohorts, mySeat, the console card), while the
 * ROOMS materialize from the series. An adopted Thursday left at its own venue
 * with its own tutor therefore makes the storefront, the parent's page and the
 * console all wrong about where a family should be on Thursday — so the same
 * fields a cohort edit propagates travel at adoption too.
 *
 * A field the cohort does not have is NOT propagated, because propagating a
 * blank is destructive in a way propagating a value is not: writing a null
 * tutor_id onto an adopted series unstaffs a room that holds real families and
 * silently stops it materializing, and erasing its venue leaves them with no
 * address. Those gaps are the cohort's to fill — the card already warns about
 * both, and filling them propagates through the normal edit.
 *
 * `active` does not travel either, and that one is a judgement rather than a
 * rule: both directions are destructive at adoption time (pausing stops the
 * rooms of families already in the series; resuming starts rooms nobody asked
 * for), so pausing stays the deliberate act it is on the card.
 */
export function adoptionPatch(cohort) {
  const patch = /** @type {Record<string, any>} */ ({ cohort_id: cohort?.id });
  for (const field of ['title', 'subject', 'venue', 'timezone', 'grade_band']) {
    const v = cohort?.[field];
    if (v != null && v !== '') patch[field] = v;
  }
  // The ratio is the product (SEAT_PLAN.ratio). An adopted room that seats six
  // is not the seat that was sold. Guarded on null rather than on Number()
  // alone, because Number(null) is 0 and a zero-capacity room books nobody.
  const capacity = cohort?.capacity == null ? NaN : Number(cohort.capacity);
  if (Number.isFinite(capacity) && capacity > 0) patch.capacity = capacity;
  if (cohort?.lead_tutor_id) patch.tutor_id = cohort.lead_tutor_id;
  return patch;
}

/** A lead tutor must clear the same gate as any staffed series. */
async function validateLead(svc, raw) {
  const leadTutorId = raw ? String(raw) : null;
  if (!leadTutorId) return { leadTutorId: null };
  const { data: t, error: readErr } = await svc.from('tutors')
    .select('id,status,vetting_status').eq('id', leadTutorId).maybeSingle();
  // A dropped read is not the answer "there is no such tutor" — that sentence
  // would send a director to re-create a tutor who is already on the roster.
  if (readErr) {
    console.error('[admin/cohorts] lead tutor read failed', leadTutorId, readErr.message);
    return { error: Response.json({ error: 'Could not check that tutor, so nothing was changed — try again.' }, { status: 500 }) };
  }
  if (!t) return { error: Response.json({ error: 'No such tutor.' }, { status: 404 }) };
  if (t.status !== 'active' || t.vetting_status !== 'cleared') {
    return { error: Response.json({ error: 'That tutor isn’t cleared/active — clear them before they lead a cohort.' }, { status: 409 }) };
  }
  return { leadTutorId };
}

/**
 * Places taken, counted from the ENROLMENTS and folded per cohort.
 *
 * One student enrolled in both of a cohort's evenings is ONE place taken. That
 * fold is the whole reason the cohort object exists: counted per series, a
 * four-seat cohort with four families in it reads as eight.
 */
export async function placesTaken(svc, seriesToCohort) {
  const seriesIds = Object.keys(seriesToCohort);
  if (!seriesIds.length) return {};
  const { data, error } = await svc.from('standing_seats')
    .select('series_id,student_id').in('series_id', seriesIds).eq('active', true);
  // A swallowed failure here reads as "nobody is enrolled": every cohort would
  // print 0 places taken and the console's headline card would put a confident
  // 0 on a business with families in it. The GET's catch turns this into the
  // named failure the panel already renders (Hard Rule 6).
  if (error) throw error;
  const byCohort = {};
  for (const row of data || []) {
    const cid = seriesToCohort[row.series_id];
    if (!cid) continue;
    (byCohort[cid] ||= new Set()).add(row.student_id);
  }
  return Object.fromEntries(Object.entries(byCohort).map(([cid, set]) => [cid, set.size]));
}

export async function GET(req) {
  const { error, svc } = await requireAdmin(req);
  if (error) return error;

  try {
    const [cohortQ, seriesQ, tutorQ] = await Promise.all([
      svc.from('cohort')
        .select('id,title,subject,venue,timezone,grade_band,capacity,lead_tutor_id,active,created_at')
        .order('created_at', { ascending: false }),
      // Every seat series, linked or not: the unlinked ones are the rows a
      // director created before 0038, and a console that cannot see them can
      // never finish the job.
      svc.from('group_session_series')
        .select('id,cohort_id,title,subject,weekday,local_start_time,duration_minutes,kind,active,tutor_id,venue,timezone')
        .eq('kind', SEAT_KIND).order('weekday').order('local_start_time'),
      svc.from('tutors')
        .select('id,display_name,status,vetting_status,pay_rate_cents').order('display_name'),
    ]);
    if (cohortQ.error) throw cohortQ.error;
    if (seriesQ.error) throw seriesQ.error;
    // Unchecked, a failed tutors read empties `nameOf`, and every properly
    // staffed cohort then warns that its lead is not cleared — a sentence about
    // a person's vetting, invented by a dropped connection.
    if (tutorQ.error) throw tutorQ.error;

    const rows = cohortQ.data || [];
    const allSeries = seriesQ.data || [];
    const tutors = tutorQ.data || [];

    // Same gate as every other surface that prints a person's name: only a
    // cleared, active tutor is nameable. An uncleared lead renders as no name.
    const nameOf = Object.fromEntries(
      tutors.filter((t) => t.status === 'active' && t.vetting_status === 'cleared')
        .map((t) => [t.id, t.display_name]),
    );

    const seriesOf = {};
    const seriesToCohort = {};
    for (const s of allSeries) {
      if (!s.cohort_id) continue;
      (seriesOf[s.cohort_id] ||= []).push(s);
      seriesToCohort[s.id] = s.cohort_id;
    }
    const held = await placesTaken(svc, seriesToCohort);

    const cohorts = rows.map((row) => {
      const mine = seriesOf[row.id] || [];
      return {
        // The public shape, from lib/server/cohorts.js, so the console and the
        // storefront cannot disagree about what a cohort IS.
        ...shapeCohort(row, mine, nameOf[row.lead_tutor_id] || null, held[row.id] || 0),
        // …plus the four things only an operator needs.
        active: row.active !== false,
        leadTutorId: row.lead_tutor_id || null,
        leadTutorCleared: Boolean(nameOf[row.lead_tutor_id]),
        seatsTaken: held[row.id] || 0,
        series: mine.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          localStartTime: String(s.local_start_time || '').slice(0, 5),
          durationMinutes: s.duration_minutes,
          active: s.active !== false,
          staffed: Boolean(s.tutor_id),
        })),
        // An unstaffed series materializes no rooms at all, so a cohort with
        // one is a cohort whose Thursday will never happen.
        staffed: mine.length > 0 && mine.every((s) => s.tutor_id),
      };
    });

    return Response.json({
      cohorts,
      // Seat series with nobody to belong to. These still hold real families
      // (SeatsSection enrols against the series), which is why they are offered
      // for adoption rather than hidden.
      unlinked: allSeries.filter((s) => !s.cohort_id).map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        weekday: s.weekday,
        localStartTime: String(s.local_start_time || '').slice(0, 5),
        durationMinutes: s.duration_minutes,
        venue: s.venue || null,
        timezone: s.timezone || CLUB_TIMEZONE,
        active: s.active !== false,
        staffed: Boolean(s.tutor_id),
      })),
      tutors: tutors.map((t) => ({
        id: t.id,
        name: t.display_name,
        eligible: t.status === 'active' && t.vetting_status === 'cleared',
        payRateSet: t.pay_rate_cents != null,
      })),
      // The product's own shape, so the form defaults come from the price sheet
      // instead of from numbers typed into a picker.
      shape: {
        slotsPerCohort: SLOTS_PER_COHORT,
        minutes: KIND_DEFAULTS.standing_seat.minutes,
        capacity: KIND_DEFAULTS.standing_seat.capacity,
        timezone: CLUB_TIMEZONE,
      },
    });
  } catch (err) {
    if (isMissingSchema(err)) return notProvisioned('the cohorts will load');
    console.error('[admin/cohorts] read failed', err?.message);
    return Response.json({ error: 'Could not load the cohorts — try again.' }, { status: 500 });
  }
}

export async function POST(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return bad('Bad request'); }

  const v = validateCohort(body);
  if (v.error) return v.error;
  const s = validateSlots(body.slots);
  if (s.error) return s.error;
  const lead = await validateLead(svc, body.leadTutorId);
  if (lead.error) return lead.error;

  const fields = v.out;
  const { data: cohort, error: insErr } = await svc.from('cohort').insert({
    ...fields,
    venue: fields.venue ?? null,
    grade_band: fields.grade_band ?? null,
    lead_tutor_id: lead.leadTutorId,
    created_by: caller.user.id,
  }).select().maybeSingle();
  if (insErr || !cohort) {
    if (isMissingSchema(insErr)) return notProvisioned('create the cohort');
    console.error('[admin/cohorts] create failed', insErr?.message);
    return Response.json({ error: 'Could not create the cohort — try again.' }, { status: 500 });
  }

  const seriesRows = s.slots.map((slot) => ({
    cohort_id: cohort.id,
    title: cohort.title,
    subject: cohort.subject,
    kind: SEAT_KIND,
    venue: cohort.venue,
    timezone: cohort.timezone,
    grade_band: cohort.grade_band,
    weekday: slot.weekday,
    local_start_time: slot.localStartTime,
    duration_minutes: slot.durationMinutes,
    capacity: cohort.capacity,
    min_seats: KIND_DEFAULTS.standing_seat.minSeats,
    // Reserved inventory has no door price. A posted price here would be a
    // price nobody can ever pay, and the one way to end up selling a place in
    // a $550-a-month room as a drop-in (see /api/admin/classes for the same
    // refusal on the same field).
    seat_price_cents: 0,
    tutor_id: lead.leadTutorId,
    created_by: caller.user.id,
  }));

  const { data: series, error: sErr } = await svc.from('group_session_series')
    .insert(seriesRows).select('id,weekday,local_start_time,duration_minutes');
  if (sErr) {
    // PostgREST gives us no transaction, so the compensation is explicit: a
    // cohort with no evenings is a draft nobody asked for and it would sit in
    // the console forever. Delete it and say what happened. If even the
    // cleanup fails, the row is named in the log so it can be found.
    const { error: rollbackErr } = await svc.from('cohort').delete().eq('id', cohort.id);
    console.error('[admin/cohorts] series create failed, cohort rolled back', cohort.id, sErr.message);
    if (rollbackErr) console.error('[admin/cohorts] rollback failed — orphan cohort', cohort.id, rollbackErr.message);
    if (isMissingSchema(sErr)) return notProvisioned('create the cohort');
    return Response.json({
      error: 'The weekly evenings could not be created, so the cohort was not kept. Check the times and try again.',
    }, { status: 500 });
  }

  await auditLog(caller.user.id, 'cohorts.created', cohort.id, {
    title: cohort.title,
    slots: s.slots.map((slot) => `${slot.weekday} ${slot.localStartTime}`),
    seriesIds: (series || []).map((r) => r.id),
    leadTutorId: lead.leadTutorId,
  });

  return Response.json({ ok: true, cohort, series: series || [] });
}

export async function PATCH(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return bad('Bad request'); }

  const id = String(body?.id || '');
  if (!id) return bad('Cohort id required.');
  const { data: existing, error: readErr } = await svc.from('cohort').select('*').eq('id', id).maybeSingle();
  if (readErr && isMissingSchema(readErr)) return notProvisioned('edit the cohort');
  // A dropped read is not an answer about whether this cohort exists, and
  // "No such cohort" is the one sentence that would send a director to create a
  // second one.
  if (readErr) {
    console.error('[admin/cohorts] patch read failed', id, readErr.message);
    return Response.json({ error: 'Could not read that cohort, so nothing was changed — try again.' }, { status: 500 });
  }
  if (!existing) return Response.json({ error: 'No such cohort.' }, { status: 404 });

  // ── Adopt a seat series that predates cohorts ──────────────────────────────
  if (body.attachSeriesId !== undefined) {
    const seriesId = String(body.attachSeriesId || '');
    if (!seriesId) return bad('Which series?');
    const { data: series, error: seriesErr } = await svc.from('group_session_series')
      .select('id,kind,cohort_id,title,weekday').eq('id', seriesId).maybeSingle();
    if (seriesErr) {
      console.error('[admin/cohorts] attach read failed', seriesId, seriesErr.message);
      return Response.json({ error: 'Could not read that series, so nothing was attached — try again.' }, { status: 500 });
    }
    // The evenings this cohort already has. Without them the refusal below
    // cannot be computed, so a failed read refuses rather than attaching a
    // third Tuesday on an assumption.
    const { data: siblings, error: sibErr } = await svc.from('group_session_series')
      .select('id,weekday').eq('cohort_id', id).eq('kind', SEAT_KIND);
    if (sibErr) {
      console.error('[admin/cohorts] attach sibling read failed', id, sibErr.message);
      return Response.json({
        error: 'Could not read this cohort’s evenings, so nothing was attached — try again.',
      }, { status: 500 });
    }
    const refusal = attachRefusal(series, id, siblings || []);
    if (refusal) return Response.json({ error: refusal.error }, { status: refusal.status });

    const aligned = adoptionPatch(existing);
    const travelled = Object.keys(aligned).filter((k) => k !== 'cohort_id');
    const { error: upErr } = await svc.from('group_session_series')
      .update(aligned).eq('id', seriesId);
    if (upErr) {
      console.error('[admin/cohorts] attach failed', seriesId, upErr.message);
      return Response.json({ error: 'Could not attach that series — try again.' }, { status: 500 });
    }
    await auditLog(caller.user.id, 'cohorts.series_attached', id, { seriesId, title: series.title, aligned: travelled });
    return Response.json({ ok: true, attached: seriesId, aligned: travelled });
  }

  const v = validateCohort(body, { partial: true });
  if (v.error) return v.error;
  // Column-name keys, assembled field by field, so the cast is the honest
  // description rather than a widening (same posture as circle/route.js).
  const patch = /** @type {Record<string, any>} */ ({ ...v.out });
  if (body.active !== undefined) patch.active = Boolean(body.active);
  let lead;
  if (body.leadTutorId !== undefined) {
    lead = await validateLead(svc, body.leadTutorId);
    if (lead.error) return lead.error;
    patch.lead_tutor_id = lead.leadTutorId;
  }
  if (!Object.keys(patch).length) return bad('Nothing to change.');

  const { data: updated, error: upErr } = await svc.from('cohort')
    .update(patch).eq('id', id).select().maybeSingle();
  if (upErr) {
    console.error('[admin/cohorts] update failed', id, upErr.message);
    return Response.json({ error: 'Could not update the cohort — try again.' }, { status: 500 });
  }

  // The edits that describe the ROOM travel to the cohort's series, because
  // that is what makes the cohort one object rather than a label over two
  // unrelated rows: move the venue on the cohort and the Thursday moves too.
  // Times and weekdays deliberately do NOT travel — an evening is a property of
  // its own series, and a cohort-wide time change would silently move both.
  const seriesPatch = {};
  if (patch.title !== undefined) seriesPatch.title = patch.title;
  if (patch.subject !== undefined) seriesPatch.subject = patch.subject;
  if (patch.venue !== undefined) seriesPatch.venue = patch.venue;
  if (patch.timezone !== undefined) seriesPatch.timezone = patch.timezone;
  if (patch.grade_band !== undefined) seriesPatch.grade_band = patch.grade_band;
  if (patch.capacity !== undefined) seriesPatch.capacity = patch.capacity;
  if (patch.active !== undefined) seriesPatch.active = patch.active;
  if (patch.lead_tutor_id !== undefined) seriesPatch.tutor_id = patch.lead_tutor_id;

  let seriesUpdated = 0;
  if (Object.keys(seriesPatch).length) {
    const { data: touched, error: seriesErr } = await svc.from('group_session_series')
      .update(seriesPatch).eq('cohort_id', id).eq('kind', SEAT_KIND).select('id');
    if (seriesErr) {
      // The cohort row already moved, so this is a PARTIAL result and it says
      // so: the console must not report a venue change that the rooms will not
      // honour.
      console.error('[admin/cohorts] series propagate failed', id, seriesErr.message);
      await auditLog(caller.user.id, 'cohorts.updated', id, { fields: Object.keys(patch), seriesUpdated: 0, partial: true });
      return Response.json({
        ok: true, cohort: updated, seriesUpdated: 0, partial: true,
        message: 'The cohort was updated, but its weekly evenings were not — reload and check them before the next cron tick.',
      }, { status: 207 });
    }
    seriesUpdated = (touched || []).length;
  }

  await auditLog(caller.user.id, 'cohorts.updated', id, { fields: Object.keys(patch), seriesUpdated });
  return Response.json({ ok: true, cohort: updated, seriesUpdated });
}
