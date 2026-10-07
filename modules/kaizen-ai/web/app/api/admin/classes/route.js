// /api/admin/classes — the weekly class catalog (group_session_series, 0024).
// Admin only. The series grid is the storefront's schedule: an admin lays out
// "Algebra I Clinic · Tuesday 5 PM · grade 9-12", takes the drop-in price from
// clubPricing.KIND_DEFAULTS rather than typing one (Hard Rule 2 — the figure
// that used to sit in this sentence outlived the price it named), assigns a
// cleared tutor (plus an optional co-tutor, 0029), and the hourly cron materializes
// bookable rooms two weeks ahead. Community capacity DERIVES from staffing —
// 8 students per cleared staff member (clubPricing.communityCapacity) until
// the supervision review clears a different ratio.
//
// Since 2026-09-02 the grid also lays out the product Kaizen Local actually
// sells: a `standing_seat` series ("Tue/Thu 4:30 · 75 min · Cedar Park
// library") whose defaults, ratio and $0 reserved price all come from
// clubPricing.KIND_DEFAULTS.standing_seat. Families are enrolled into one
// through /api/admin/seats, not by buying a place in it.
//
// GET                 → all series + their upcoming instances
// GET ?view=tonight   → TODAY'S ROOMS: what is running now, what ran and has
//                       no exit ratings yet, and what is next. Added
//                       2026-09-02 because the console modelled the CATALOGUE
//                       of rooms and never the OCCASION: the query below
//                       filters `.gt('scheduled_start', now)`, so a room in
//                       progress was invisible on the only screen the Director
//                       has (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//                       It is a separate view rather than a bigger payload
//                       because the two questions have different answers and
//                       different panels — neither pays for the other's reads.
// POST {series}       → create a series
// PATCH {id, ...}     → update fields / toggle active
// PATCH {action:'cancel_instance', instanceId} → cancel one room + make every
//                       held seat whole (shared refund truth: refundHeldSeats)
// DELETE {id}         → delete a series (existing instances survive; the FK is
//                       ON DELETE SET NULL — cancel them first if needed)

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { getStripe } from '@/lib/server/stripe';
import { refundHeldSeats } from '@/lib/server/maintenance';
import { KIND_DEFAULTS, communityCapacity } from '@/lib/server/clubPricing';
import { CLUB_TIMEZONE } from '@/lib/roomTime';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = ['clinic', 'homework_hall', 'community_free', 'standing_seat'];
const GRADE_BANDS = ['7-8', '9-12', 'college', 'all'];

// How far back the Tonight board keeps looking for a room whose exit ratings
// were never written. A week, because a rating written late is still worth
// writing and a room that falls off every screen is a room nobody ever rates.
const OWED_LOOKBACK_DAYS = 7;
// A hard ceiling on the board's read. At launch scale a week is a dozen rooms;
// the limit exists so a mis-seeded database cannot hand the console thousands.
const BOARD_ROOM_LIMIT = 80;

async function requireAdmin(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!isAdminCaller(caller)) return { error: Response.json({ error: 'Admin only.' }, { status: 403 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

function wallPartsIn(ms, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const part of fmt.formatToParts(new Date(ms))) p[part.type] = part.value;
  return p;
}

// The zone's offset from UTC at a given instant: the gap between the wall clock
// read in the zone and the same fields read as UTC.
function zoneOffsetMs(ms, timeZone) {
  const p = wallPartsIn(ms, timeZone);
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

/**
 * Midnight of the club's own day, as a UTC instant.
 *
 * "Today" on this console has to mean the day the ROOMS are in, not the day
 * the server happens to be in: on Vercel that is UTC, where a 6 PM Austin room
 * belongs to tomorrow from 7 PM onward. lib/roomTime.js owns how a time is
 * WRITTEN in a zone; this is the same idea applied to a query window, and it
 * lives here because a route is the only thing that needs it.
 */
function zonedMidnight(instant, timeZone) {
  const p = wallPartsIn(instant.getTime(), timeZone);
  const midnightAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day);
  // Two passes, because on the two DST days a year the offset in force at
  // MIDNIGHT is not the offset in force now: on the March Sunday the first
  // guess lands an hour before the day started, and on the November Sunday it
  // lands an hour after — which is a window that silently drops rooms.
  const guess = midnightAsUtc - zoneOffsetMs(instant.getTime(), timeZone);
  return new Date(midnightAsUtc - zoneOffsetMs(guess, timeZone));
}

/**
 * Today's rooms, plus the ones that ran earlier in the week and were never
 * rated. Never throws: an unmigrated or unreachable database answers
 * `unavailable`, which the console renders as a named failure rather than as
 * an empty evening (Hard Rule 6).
 */
export async function tonightBoard(svc, callerUserId) {
  const now = new Date();
  const dayStart = zonedMidnight(now, CLUB_TIMEZONE);
  // A club day is 23, 24 or 25 hours long twice a year, so the end of it is
  // the NEXT day's midnight rather than a fixed 24 hours.
  const dayEnd = zonedMidnight(new Date(dayStart.getTime() + 26 * 3600e3), CLUB_TIMEZONE);
  const base = {
    timezone: CLUB_TIMEZONE,
    now: now.toISOString(),
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
    lookbackDays: OWED_LOOKBACK_DAYS,
    rooms: [],
    owed: [],
    truncated: false,
  };

  try {
    const since = new Date(dayStart.getTime() - OWED_LOOKBACK_DAYS * 864e5);
    // Newest first under the limit, then sorted forward for display: an
    // ascending read would spend the whole limit on last week and cut TODAY,
    // which is the one day this board exists to show.
    const { data: rows, error: roomsErr } = await svc.from('group_session')
      .select('id,series_id,tutor_id,subject,topic,kind,venue,timezone,scheduled_start,scheduled_end,status,capacity')
      .gte('scheduled_start', since.toISOString())
      .lt('scheduled_start', dayEnd.toISOString())
      .order('scheduled_start', { ascending: false })
      .limit(BOARD_ROOM_LIMIT);
    if (roomsErr) throw roomsErr;

    const list = (rows || []).slice().reverse();
    if (!list.length) return base;

    const ids = list.map((r) => r.id);
    const tutorIds = [...new Set(list.map((r) => r.tutor_id).filter(Boolean))];
    const [seatQ, obsQ, tutorQ] = await Promise.all([
      svc.from('group_seat').select('group_session_id,student_id,status').in('group_session_id', ids),
      // Exit ratings are per student per concept; the board only needs to know
      // WHO has one, never what it said.
      svc.from('group_observation').select('group_session_id,student_id').in('group_session_id', ids),
      tutorIds.length
        ? svc.from('tutors').select('id,display_name,user_id').in('id', tutorIds)
        : Promise.resolve({ data: [] }),
    ]);
    if (seatQ.error) throw seatQ.error;
    if (obsQ.error) throw obsQ.error;
    // The resolved literal above carries no `error` key, so this only ever
    // fires on a read that actually happened. It is checked for the same reason
    // as the other two and it matters more: an unchecked failure here leaves
    // `tutorOf` empty, and every room on the board then prints "No tutor on
    // this room" and hides the console link from the tutor who is standing in
    // it — a confident wrong answer to "who do I call tomorrow".
    if (tutorQ.error) throw tutorQ.error;

    const seatsOf = {};
    for (const s of seatQ.data || []) (seatsOf[s.group_session_id] ||= []).push(s);
    const ratedOf = {};
    for (const o of obsQ.data || []) (ratedOf[o.group_session_id] ||= new Set()).add(o.student_id);
    const tutorOf = Object.fromEntries((tutorQ.data || []).map((t) => [t.id, t]));

    const shaped = list.map((r) => {
      const seats = seatsOf[r.id] || [];
      // The roster is who was expected to be IN the room: a cancelled seat was
      // never there, and a marked no-show is not somebody to rate.
      const roster = seats.filter((s) => s.status === 'booked' || s.status === 'attended');
      const present = seats.filter((s) => s.status === 'attended').length;
      const noShow = seats.filter((s) => s.status === 'no_show').length;
      const rated = ratedOf[r.id] ? ratedOf[r.id].size : 0;
      const start = new Date(r.scheduled_start);
      const end = new Date(r.scheduled_end);
      const cancelled = r.status === 'cancelled';
      const running = !cancelled && (r.status === 'in_progress' || (start <= now && now < end));
      const ended = !cancelled && end <= now;
      const tutor = tutorOf[r.tutor_id] || null;
      return {
        id: r.id,
        seriesId: r.series_id || null,
        title: r.topic || r.subject || 'Session',
        subject: r.subject || null,
        kind: r.kind || 'clinic',
        venue: r.venue || null,
        // The room's own zone, so every surface reading this board writes the
        // time the family will actually turn up at.
        timezone: r.timezone || CLUB_TIMEZONE,
        start: r.scheduled_start,
        end: r.scheduled_end,
        status: r.status,
        capacity: r.capacity ?? null,
        tutorName: tutor?.display_name || null,
        // Whether the person reading the console is the person who teaches this
        // room, because only they can write its ratings — and if they are not,
        // the name above is who to call.
        yours: Boolean(tutor?.user_id && tutor.user_id === callerUserId),
        booked: roster.length,
        present,
        noShow,
        attendanceMarked: present + noShow > 0,
        rated,
        // A room with nobody in it owes nobody a rating.
        needsRatings: ended && roster.length > 0 && rated < roster.length,
        phase: cancelled ? 'cancelled' : running ? 'now' : ended ? 'done' : 'next',
      };
    });

    const dayStartMs = dayStart.getTime();
    return {
      ...base,
      rooms: shaped.filter((r) => new Date(r.start).getTime() >= dayStartMs),
      // Older rooms are only worth a line when something is still owed on
      // them; a rated Tuesday is finished business.
      owed: shaped.filter((r) => new Date(r.start).getTime() < dayStartMs && r.needsRatings),
      truncated: (rows || []).length >= BOARD_ROOM_LIMIT,
    };
  } catch (err) {
    console.error('[admin/classes] tonight board failed', err?.message);
    return { ...base, unavailable: true };
  }
}

/**
 * PURE. The board as a response.
 *
 * `tonightBoard` never throws — a failed read answers an EMPTY board carrying
 * `unavailable: true`. Wrapped in a 200 that flag is a footnote: a caller that
 * checks `res.ok` sees a well-formed board with no rooms in it and renders a
 * quiet evening, which is the confident zero Hard Rule 6 exists to forbid. The
 * transport says it too, so the failure has to be handled before it can be
 * rendered — and the sentence naming it travels with it.
 */
export function tonightResponse(board) {
  if (board?.unavailable) {
    return Response.json({
      tonight: board,
      error: 'Today’s rooms could not be read — the database did not answer. Nothing has been changed; reload to try again.',
    }, { status: 503 });
  }
  return Response.json({ tonight: board });
}

export async function GET(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;

  // The occasion, not the catalogue. Asked for by its own panel so the two
  // reads stay independent.
  if (new URL(req.url).searchParams.get('view') === 'tonight') {
    return tonightResponse(await tonightBoard(svc, caller.user.id));
  }

  const [seriesQ, tutorQ] = await Promise.all([
    svc.from('group_session_series').select('*').order('weekday').order('local_start_time'),
    svc.from('tutors').select('id,display_name,status,vetting_status,pay_rate_cents').order('display_name'),
  ]);
  // Unchecked, a dropped read here renders as an empty grid under the sentence
  // "No series yet. Create the weekly grid above." — an instruction to lay out
  // a catalogue that already exists, on a screen that can create duplicates of
  // every room in it. Same rule as the board above (Hard Rule 6).
  if (seriesQ.error || tutorQ.error) {
    console.error('[admin/classes] catalogue read failed', (seriesQ.error || tutorQ.error)?.message);
    return Response.json({
      error: 'The weekly grid could not be read — the database did not answer. Nothing has been changed; reload to try again.',
    }, { status: 503 });
  }
  const series = seriesQ.data;
  const tutors = tutorQ.data;

  const ids = (series || []).map((s) => s.id);
  // Future-only, and it stays that way: the only thing this list does is
  // CANCEL a room, which refunds every held seat. Offering that on a room that
  // already ran would refund an evening that happened. A room in progress is
  // answered by ?view=tonight above, where the action is the roster, not a
  // refund.
  const { data: instances, error: instErr } = ids.length
    ? await svc.from('group_session')
        .select('id,series_id,scheduled_start,status,capacity')
        .in('series_id', ids)
        .gt('scheduled_start', new Date().toISOString())
        .order('scheduled_start')
    : { data: [], error: null };
  // A series whose upcoming rooms could not be read renders as a series with
  // none — which reads as "the cron has not run" and invites the director to
  // re-create it.
  if (instErr) {
    console.error('[admin/classes] upcoming rooms read failed', instErr.message);
    return Response.json({
      error: 'The rooms already on the calendar could not be read, so the grid is not being shown — reload to try again.',
    }, { status: 503 });
  }
  const upcomingBySeries = {};
  for (const i of instances || []) {
    (upcomingBySeries[i.series_id] ||= []).push({ id: i.id, start: i.scheduled_start, status: i.status });
  }

  return Response.json({
    series: (series || []).map((s) => ({ ...s, upcoming: upcomingBySeries[s.id] || [] })),
    tutors: (tutors || []).map((t) => ({
      id: t.id, name: t.display_name,
      eligible: t.status === 'active' && t.vetting_status === 'cleared',
      payRateSet: t.pay_rate_cents != null,
    })),
  });
}

function validateSeriesPatch(body, { partial = false } = {}) {
  const out = {};
  const bad = (msg) => ({ error: Response.json({ error: msg }, { status: 400 }) });

  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return bad('A title is required — it is what parents see on the schedule.');
    out.title = title;
  }
  if (!partial || body.subject !== undefined) {
    const subject = String(body.subject || '').trim().slice(0, 60);
    if (!subject) return bad('A subject is required (Math, English, Science, Social Studies, Homework).');
    out.subject = subject;
  }
  if (body.topic !== undefined) out.topic = String(body.topic || '').slice(0, 160) || null;
  if (body.description !== undefined) out.description = String(body.description || '').slice(0, 600) || null;

  if (!partial || body.kind !== undefined) {
    const kind = String(body.kind || 'clinic');
    if (!KINDS.includes(kind)) return bad(`Kind must be one of ${KINDS.join(', ')}.`);
    out.kind = kind;
  }
  // Venue (0033): free text, NULL = online (the Daily room, as before). A
  // standing seat is in person by definition, and a Hall or Clinic may be
  // either, so every kind can carry one. "Cedar Park library, room B" is the
  // whole record — there is no venues table until there are two venues.
  if (body.venue !== undefined) {
    out.venue = String(body.venue || '').trim().slice(0, 200) || null;
  }
  if (body.gradeBand !== undefined) {
    const g = body.gradeBand == null || body.gradeBand === '' ? null : String(body.gradeBand);
    if (g != null && !GRADE_BANDS.includes(g)) return bad(`Grade band must be one of ${GRADE_BANDS.join(', ')}.`);
    out.grade_band = g;
  }
  if (!partial || body.weekday !== undefined) {
    const weekday = Math.round(Number(body.weekday));
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) return bad('Weekday must be 0 (Sunday) through 6 (Saturday).');
    out.weekday = weekday;
  }
  if (!partial || body.localStartTime !== undefined) {
    const t = String(body.localStartTime || '');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return bad('Start time must be HH:MM (24h), e.g. 17:00.');
    out.local_start_time = t;
  }
  if (body.durationMinutes !== undefined || !partial) {
    // The default follows the KIND, not the hour: a standing seat is 75
    // minutes by definition (SEAT_PLAN.minutes, mirrored in KIND_DEFAULTS), and
    // a director who leaves the field alone must not get a 60-minute seat room
    // that quietly under-delivers the product the family bought. Kinds with no
    // minutes of their own keep the old 60.
    const kindDefault = KIND_DEFAULTS[out.kind]?.minutes ?? 60;
    const d = Math.round(Number(body.durationMinutes ?? kindDefault));
    if (!Number.isFinite(d) || d < 30 || d > 120) return bad('Duration must be 30–120 minutes.');
    out.duration_minutes = d;
  }
  if (body.timezone !== undefined || !partial) {
    // Default matches the operation's home zone (Austin) — an Eastern default
    // silently shifted every hurried series by an hour.
    const tz = String(body.timezone || 'America/Chicago');
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { return bad(`Unknown timezone "${tz}" — use an IANA name like America/Chicago.`); }
    out.timezone = tz;
  }
  return { out };
}

// A co-tutor must clear the same gate as a lead. Returns { coTutorId } or
// { error } — null co-tutor is always fine.
async function validateCoTutor(svc, raw) {
  const coTutorId = raw ? String(raw) : null;
  if (!coTutorId) return { coTutorId: null };
  const { data: co } = await svc.from('tutors')
    .select('id,status,vetting_status').eq('id', coTutorId).maybeSingle();
  if (!co) return { error: Response.json({ error: 'No such co-tutor.' }, { status: 404 }) };
  if (co.status !== 'active' || co.vetting_status !== 'cleared') {
    return { error: Response.json({ error: 'That co-tutor isn’t cleared/active.' }, { status: 409 }) };
  }
  return { coTutorId };
}

export async function POST(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const v = validateSeriesPatch(body);
  if (v.error) return v.error;
  const fields = v.out;

  const co = await validateCoTutor(svc, body.coTutorId);
  if (co.error) return co.error;

  const defaults = KIND_DEFAULTS[fields.kind] || KIND_DEFAULTS.clinic;
  let capacity = Math.min(30, Math.max(1, Math.round(Number(body.capacity) || defaults.capacity)));
  // Community capacity derives from staffing: 8 per cleared staff member
  // (interim supervision cap — REVIEW_QUEUE). One tutor caps at 8; the
  // default 16 needs a co-tutor.
  if (fields.kind === 'community_free') {
    capacity = communityCapacity(1 + (co.coTutorId ? 1 : 0), Number(body.capacity) || defaults.capacity);
  }
  // 1:4 is the standing seat, not a preference: it is the ratio the price
  // sheet and every public claim state (SEAT_PLAN.ratio, KIND_DEFAULTS). A
  // roomier seat room would be a different product sold at the seat's price,
  // so the ask is capped the way community capacity is, rather than refused.
  if (fields.kind === 'standing_seat') capacity = Math.min(capacity, defaults.capacity);
  const minSeats = Math.min(capacity, Math.max(1, Math.round(Number(body.minSeats) || defaults.minSeats)));
  const seatPrice = body.seatPriceCents === undefined
    ? defaults.seatPriceCents
    : Math.min(10000, Math.max(0, Math.round(Number(body.seatPriceCents))));
  // A community_free series must actually be free — the name is a promise.
  if (fields.kind === 'community_free' && seatPrice !== 0) {
    return Response.json({ error: 'Community sessions are free — set the seat price to $0.' }, { status: 400 });
  }
  // A seat room is RESERVED inventory, never sold at the door: groupSeatQuote
  // answers 'reserved' for it and the claim route refuses that mode. A posted
  // price on the row would be a price nobody can ever pay — and the one way to
  // end up selling a $550-a-month place as a drop-in.
  if (fields.kind === 'standing_seat' && seatPrice !== 0) {
    return Response.json({ error: 'A standing-seat room is reserved for seat holders, not sold at the door — leave the seat price at $0.' }, { status: 400 });
  }

  const tutorId = body.tutorId ? String(body.tutorId) : null;
  if (tutorId) {
    const { data: tutor } = await svc.from('tutors')
      .select('id,status,vetting_status').eq('id', tutorId).maybeSingle();
    if (!tutor) return Response.json({ error: 'No such tutor.' }, { status: 404 });
    if (tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
      return Response.json({ error: 'That tutor isn’t cleared/active — clear them before staffing a series.' }, { status: 409 });
    }
  }

  const { data: series, error: insErr } = await svc.from('group_session_series').insert({
    ...fields,
    tutor_id: tutorId,
    co_tutor_id: co.coTutorId,
    created_by: caller.user.id,
    capacity,
    min_seats: minSeats,
    seat_price_cents: seatPrice,
    starts_on: body.startsOn || undefined,
    ends_on: body.endsOn || null,
  }).select().maybeSingle();
  if (insErr) {
    console.error('[admin/classes] series create failed', insErr.message);
    // An un-applied migration is answered honestly rather than as a generic
    // failure: `venue` and the standing_seat kind both arrive with 0033, and
    // "run 0033" is the only useful thing to tell the person at the console.
    if (isMissingSchema(insErr)) {
      return Response.json({
        error: 'This deployment’s database is missing the seat/venue columns (migration 0033). Apply it, then create the series.',
        notProvisioned: true,
      }, { status: 503 });
    }
    return Response.json({ error: 'Could not create the series — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'classes.series_created', series.id, { title: series.title, kind: series.kind });
  return Response.json({ ok: true, series });
}

export async function PATCH(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  // ── Cancel one materialized room + make every held seat whole ──────────────
  if (body?.action === 'cancel_instance') {
    const instanceId = String(body?.instanceId || '');
    if (!instanceId) return Response.json({ error: 'Which instance?' }, { status: 400 });
    const { data: room } = await svc.from('group_session')
      .select('id,status').eq('id', instanceId).maybeSingle();
    if (!room) return Response.json({ error: 'No such room.' }, { status: 404 });
    if (['completed', 'cancelled'].includes(room.status)) {
      return Response.json({ error: `That room is already ${room.status}.` }, { status: 409 });
    }
    const { error: upErr } = await svc.from('group_session')
      .update({ status: 'cancelled', cancel_reason: 'admin_cancelled' }).eq('id', instanceId);
    if (upErr) {
      console.error('[admin/classes] instance cancel failed', instanceId, upErr.message);
      return Response.json({ error: 'Could not cancel the room — try again.' }, { status: 500 });
    }
    const result = await refundHeldSeats(svc, getStripe(), instanceId, { reason: 'admin_cancelled' });
    await auditLog(caller.user.id, 'classes.instance_cancelled', instanceId, result);
    // 207 when a refund could not be completed — the room IS cancelled either
    // way, but a human settles the remainder (same posture as tutor pulls).
    return Response.json({ ok: true, ...result }, { status: result.failures.length ? 207 : 200 });
  }

  const id = String(body?.id || '');
  if (!id) return Response.json({ error: 'Series id required.' }, { status: 400 });
  const { data: existing } = await svc.from('group_session_series').select('*').eq('id', id).maybeSingle();
  if (!existing) return Response.json({ error: 'No such series.' }, { status: 404 });

  const v = validateSeriesPatch(body, { partial: true });
  if (v.error) return v.error;
  const patch = v.out;

  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.tutorId !== undefined) {
    const tutorId = body.tutorId ? String(body.tutorId) : null;
    if (tutorId) {
      const { data: tutor } = await svc.from('tutors')
        .select('id,status,vetting_status').eq('id', tutorId).maybeSingle();
      if (!tutor || tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
        return Response.json({ error: 'That tutor isn’t cleared/active.' }, { status: 409 });
      }
    }
    patch.tutor_id = tutorId;
  }
  if (body.coTutorId !== undefined) {
    const co = await validateCoTutor(svc, body.coTutorId);
    if (co.error) return co.error;
    patch.co_tutor_id = co.coTutorId;
  }
  if (body.capacity !== undefined) patch.capacity = Math.min(30, Math.max(1, Math.round(Number(body.capacity))));
  if (body.minSeats !== undefined) patch.min_seats = Math.max(1, Math.round(Number(body.minSeats)));
  if (body.seatPriceCents !== undefined) patch.seat_price_cents = Math.min(10000, Math.max(0, Math.round(Number(body.seatPriceCents))));
  if (body.endsOn !== undefined) patch.ends_on = body.endsOn || null;
  const finalKind = patch.kind || existing.kind;
  const finalPrice = patch.seat_price_cents ?? existing.seat_price_cents;
  if (finalKind === 'community_free' && finalPrice !== 0) {
    return Response.json({ error: 'Community sessions are free — set the seat price to $0.' }, { status: 400 });
  }
  // Same promise on the way in as on the way out: converting a priced clinic
  // into a seat room must clear the price, not carry it into reserved
  // inventory (see the POST branch for why a price there can never be paid).
  if (finalKind === 'standing_seat' && finalPrice !== 0) {
    return Response.json({ error: 'A standing-seat room is reserved for seat holders, not sold at the door — set the seat price to $0.' }, { status: 400 });
  }
  // And the ratio holds across an edit, exactly as it does at creation.
  if (finalKind === 'standing_seat') {
    const wanted = patch.capacity ?? existing.capacity;
    patch.capacity = Math.max(1, Math.min(Number(wanted) || KIND_DEFAULTS.standing_seat.capacity, KIND_DEFAULTS.standing_seat.capacity));
  }
  // Community capacity re-derives whenever kind/capacity/staffing move —
  // dropping the co-tutor of a 16-seat community series halves the room.
  if (finalKind === 'community_free') {
    const finalCo = patch.co_tutor_id !== undefined ? patch.co_tutor_id : existing.co_tutor_id;
    const wanted = patch.capacity ?? existing.capacity;
    patch.capacity = communityCapacity(1 + (finalCo ? 1 : 0), wanted);
  }

  const { data: updated, error: upErr } = await svc.from('group_session_series')
    .update(patch).eq('id', id).select().maybeSingle();
  if (upErr) {
    console.error('[admin/classes] series update failed', id, upErr.message);
    return Response.json({ error: 'Could not update the series — try again.' }, { status: 500 });
  }
  await auditLog(caller.user.id, 'classes.series_updated', id, { fields: Object.keys(patch) });
  return Response.json({ ok: true, series: updated });
}

export async function DELETE(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  if (!id) return Response.json({ error: 'Series id required.' }, { status: 400 });

  const { error: delErr } = await svc.from('group_session_series').delete().eq('id', id);
  if (delErr) {
    console.error('[admin/classes] series delete failed', id, delErr.message);
    return Response.json({ error: 'Could not delete the series — try again.' }, { status: 500 });
  }
  await auditLog(caller.user.id, 'classes.series_deleted', id, {});
  return Response.json({ ok: true });
}
