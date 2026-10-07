// GET  /api/tutoring/group/brief?sessionId=            → the roster brief for a group room
// GET  /api/tutoring/group/brief?sessionId=&snapshot=1 → the roster alone, no AI
// POST /api/tutoring/group/brief                       → per-student observations
//
// THE SNAPSHOT IS NOT THE BRIEF. The exit-rating screen (components/ExitRatings)
// reads the roster and what is already on record for the room; it discards the
// prose entirely. Making it ask for the prose anyway put the only write path in
// the product that turns a room into evidence behind a metered AI call: with
// the month's AI budget spent, or 20 briefs into an hour, the GET answered a
// bare 429 carrying no roster, and the Director got a Try again button that
// could never help and no way to record a single rating. `snapshot=1` answers
// the roster and returns — before the entitlement check, before the rate limit,
// before meteredCall — because rating a room must not depend on being able to
// afford a paragraph.
//
// THIS IS THE BOTH-SIDES PLAY, AT ITS STRONGEST.
//
// In a 1:1 session the AI tells the tutor where one student is. In a group room
// it can do something no human could do unaided in the ninety seconds before a
// session starts: read four learner models at once and find what they SHARE.
//
// "Three of these four are stuck on the same thing" turns a discount product
// into a better one. A group session is not a cheaper 1:1 — it is a different
// pedagogy, and it only works if the room has a shared centre of gravity. The
// engine is what finds it.
//
// And the return path is four times richer: a tutor watching four students work
// unaided produces four independent CONFIRMING observations. That makes a group
// session the highest-yield assessment event anywhere in the product.

import { meteredCall } from '@/lib/server/aiCall';
import { getCaller, serviceClient, checkEntitlement, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { pickModel } from '@/lib/server/models';
import { appendEvidence, recomputeEstimates, isMissingSchema } from '@/lib/engine/ledger';
import { TUTOR_RATINGS } from '@/lib/engine/types';
import { CONFIRM_THRESHOLD } from '@/lib/engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROUP_BRIEF_SYSTEM = `You brief a human tutor 90 seconds before a small-group drop-in session (2-4 students). You are given each student's per-concept mastery snapshot.

Your ONE job is to find the shared centre of gravity: what can this tutor teach ONCE that lands for most of the room, and where do individuals diverge enough to need a moment each.

Write markdown with exactly these sections:
## Teach this to the room
## Watch individually
## If it goes fast

Rules:
- Name students by first name only.
- Cite the real numbers you were given.
- "Teach this to the room" must be ONE concept, chosen because most of the group is weak on it. If there is genuinely no overlap, say so plainly and say what to do instead.
- Under 180 words. Bullets. No preamble, no sign-off — the tutor is about to start.`;

const RATING_OUTCOME = { got_it: 1, shaky: 0.5, not_yet: 0 };
const POST_SESSION_CHECK_DELAY_MS = 48 * 60 * 60 * 1000;

async function tutorRoomOr(caller, svc, sessionId) {
  const { data: room } = await svc.from('group_session').select('*').eq('id', sessionId).maybeSingle();
  if (!room) return { error: 'No such session.', status: 404 };
  const { data: tutor } = await svc.from('tutors').select('id,display_name').eq('user_id', caller.user.id).maybeSingle();
  if (!tutor) return { error: 'Not your session.', status: 403 };
  if (tutor.id !== room.tutor_id) {
    // Co-tutors (0029) prep from the same brief as the lead.
    const { data: staffRow } = await svc.from('group_session_staff')
      .select('tutor_id').eq('group_session_id', sessionId).eq('tutor_id', tutor.id).maybeSingle();
    if (!staffRow) return { error: 'Not your session.', status: 403 };
  }
  return { room, tutor };
}

/** The roster's learner models, and where they overlap. */
async function rosterSnapshot(svc, sessionId) {
  const { data: seats } = await svc.from('group_seat')
    .select('student_id,bring,status')
    .eq('group_session_id', sessionId)
    .in('status', ['booked', 'attended']);
  if (!seats?.length) return { students: [], shared: [] };

  const ids = seats.map((s) => s.student_id);
  const [{ data: profiles }, { data: estimates }] = await Promise.all([
    svc.from('profiles').select('id,name').in('id', ids),
    svc.from('kc_estimate')
      .select('user_id,kc_id,working,confirmed,dose_slope,human_recommended')
      .in('user_id', ids),
  ]);

  const kcIds = [...new Set((estimates || []).map((e) => e.kc_id))];
  const { data: kcs } = kcIds.length
    ? await svc.from('kc').select('id,title').in('id', kcIds)
    : { data: [] };
  const titleOf = Object.fromEntries((kcs || []).map((k) => [k.id, k.title]));
  const nameOf = Object.fromEntries((profiles || []).map((p) => [p.id, (p.name || 'Student').split(' ')[0]]));
  const bringOf = Object.fromEntries(seats.map((s) => [s.student_id, s.bring]));

  const byStudent = {};
  for (const e of estimates || []) {
    (byStudent[e.user_id] ||= []).push(e);
  }

  // The shared centre of gravity: concepts where MOST of the room is weak.
  // Confirmed mastery is the bar, because "can do it with help" is exactly the
  // state a group session is for.
  const weakCount = {};
  for (const e of estimates || []) {
    if (Number(e.confirmed) >= CONFIRM_THRESHOLD) continue;
    if (Number(e.working) < 0.15) continue;      // not yet started ≠ stuck
    weakCount[e.kc_id] = (weakCount[e.kc_id] || 0) + 1;
  }
  const shared = Object.entries(weakCount)
    .filter(([, n]) => n >= Math.max(2, Math.ceil(ids.length / 2)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kcId, n]) => ({ kcId, title: titleOf[kcId] || 'Concept', studentsWeak: n, of: ids.length }));

  return {
    students: ids.map((id) => ({
      studentId: id,
      name: nameOf[id] || 'Student',
      bring: bringOf[id] || null,
      kcs: (byStudent[id] || [])
        .sort((a, b) => Number(a.confirmed) - Number(b.confirmed))
        .slice(0, 8)
        .map((e) => ({
          kcId: e.kc_id,
          title: titleOf[e.kc_id] || 'Concept',
          working: Number(e.working) || 0,
          confirmed: Number(e.confirmed) || 0,
          leaning: e.dose_slope != null && e.dose_slope >= 0 && Number(e.working) > 0.3,
        })),
    })),
    shared,
  };
}

/**
 * What is ALREADY on record for this room: student → concept → the rating that
 * was written. `group_observation` is upserted on (session, student, concept),
 * so it holds exactly one row per rated concept and is the server's answer to
 * "has this been rated".
 *
 * The exit screen seeds itself from this. Without it the only dedupe guard is
 * the draft on one device, so the same Director rating the same room from a
 * laptop after a phone re-posts every observation — and evidence rows are
 * append-only by trigger (0034), so that is a second copy in the ledger, not an
 * overwrite. A failed read answers null rather than {}: an empty map would be a
 * confident "nothing is recorded", which is the answer that causes the harm.
 */
async function recordedRatings(svc, sessionId) {
  try {
    const { data, error } = await svc.from('group_observation')
      .select('student_id,kc_id,tutor_rating')
      .eq('group_session_id', sessionId);
    if (error) return null;
    const out = {};
    for (const row of data || []) {
      if (!row?.student_id || !row?.kc_id || !row?.tutor_rating) continue;
      (out[row.student_id] ||= {})[row.kc_id] = row.tutor_rating;
    }
    return out;
  } catch {
    return null;
  }
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const refresh = url.searchParams.get('refresh') === '1';
  const snapshotOnly = url.searchParams.get('snapshot') === '1';
  if (!sessionId) return Response.json({ error: 'sessionId required.' }, { status: 400 });

  try {
    const got = await tutorRoomOr(caller, svc, sessionId);
    if (got.error) return Response.json({ error: got.error }, { status: got.status });

    const snapshot = await rosterSnapshot(svc, sessionId);
    if (!snapshot.students.length) {
      return Response.json({ students: [], roster: [], shared: [], brief: null, empty: true });
    }

    // The rating screen's answer, and the end of the road for it: no
    // entitlement, no rate limit, no model. See the header.
    if (snapshotOnly) {
      const recorded = await recordedRatings(svc, sessionId);
      return Response.json({ ...snapshot, brief: null, snapshotOnly: true, recorded });
    }

    // The structured snapshot is ALWAYS fresh; only the prose is cached.
    if (got.room.brief_md && !refresh) {
      return Response.json({ brief: got.room.brief_md, cached: true, ...snapshot });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ brief: null, ...snapshot });
    }

    const ent = await checkEntitlement(caller, 'report');
    if (!ent.ok) return Response.json({ brief: null, ...snapshot });

    const limited = await rateLimitResponse(caller, req, { limit: 20, windowMs: 3600_000 });
    if (limited) return limited;

    const settings = {};
    const model = pickModel('fast', settings, caller.profile?.plan);
    const payload = JSON.stringify({
      subject: got.room.subject, topic: got.room.topic,
      students: snapshot.students, sharedWeakness: snapshot.shared,
    });

    const metered = await meteredCall({
      caller, model, system: GROUP_BRIEF_SYSTEM, messages: [{ role: 'user', content: payload }],
      maxTokens: 700, feature: 'report', tier: 'fast',
    });
    if (!metered) return Response.json({ error: 'AI budget reached for this month.' }, { status: 429 });
    const brief = metered.text;

    await svc.from('group_session').update({ brief_md: brief }).eq('id', sessionId);

    return Response.json({ brief, ...snapshot });
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true, roster: [], shared: [] });
    console.error('[group/brief]', err?.message);
    return Response.json({ error: 'Could not build the brief.' }, { status: 500 });
  }
}

/**
 * Per-student observations from a group room.
 *
 * Four students × their concepts = up to a dozen confirming observations from
 * one hour of tutor attention. Each carries verified_by='human_tutor' and
 * assisted=false, exactly as the 1:1 path does, because the evidence class is
 * the same: a trained human watched them work.
 */
export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 60, windowMs: 3600_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'sessionId required.' }, { status: 400 });

  try {
    const got = await tutorRoomOr(caller, svc, sessionId);
    if (got.error) return Response.json({ error: got.error }, { status: got.status });

    const observations = Array.isArray(body?.observations) ? body.observations.slice(0, 40) : [];
    if (!observations.length) return Response.json({ error: 'Rate at least one student.' }, { status: 400 });

    // Only students actually in this room may be rated.
    const { data: seats } = await svc.from('group_seat')
      .select('student_id').eq('group_session_id', sessionId).in('status', ['booked', 'attended']);
    const inRoom = new Set((seats || []).map((s) => s.student_id));

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const rows = [];
    const byStudent = {};
    const skipped = [];

    for (const o of observations) {
      const studentId = String(o?.studentId || '');
      const kcId = String(o?.kcId || '');
      const rating = String(o?.rating || '');
      if (!inRoom.has(studentId) || !kcId || !TUTOR_RATINGS.includes(rating)) { skipped.push(studentId); continue; }

      // And only concepts that student is actually working on.
      const { data: owns } = await svc.from('learner_kc')
        .select('kc_id').eq('user_id', studentId).eq('kc_id', kcId).maybeSingle();
      if (!owns) { skipped.push(studentId); continue; }

      rows.push({
        group_session_id: sessionId, student_id: studentId, kc_id: kcId,
        tutor_rating: rating,
        misconception_id: o?.misconceptionId || null,
        note: o?.note ? String(o.note).slice(0, 500) : null,
        observed_at: nowIso,
      });

      (byStudent[studentId] ||= []).push({
        kcId,
        kind: 'tutor_observation',
        outcome: RATING_OUTCOME[rating],
        assisted: false,
        assistanceDose: 0,
        verifiedBy: 'human_tutor',
        misconceptionId: o?.misconceptionId || null,
        contextTag: 'group_session',
        sourceRef: `group_session:${sessionId}`,
        at: nowIso,
        meta: { tutorId: got.tutor.id, rating, groupSize: inRoom.size },
      });
    }

    if (!rows.length) return Response.json({ error: 'No valid observations.', skipped }, { status: 400 });

    await svc.from('group_observation')
      .upsert(rows, { onConflict: 'group_session_id,student_id,kc_id' });

    // Write evidence and schedule the delayed unassisted check per student —
    // the measurement that says whether this hour actually worked.
    //
    // check_floor_at is written alongside next_check_at, exactly as the 1:1
    // path does (app/api/tutoring/observe/route.js). The floor is the half that
    // survives: recomputeEstimates rebuilds next_check_at from the ledger on the
    // very next evidence append and honours the floor only as a lower bound, so
    // without it an evening of practice after a group room erased the 48-hour
    // delay and a same-evening check could confirm mastery the mastery law says
    // is not yet confirmable. That is a defect in the law itself, not a nicety.
    const checkAt = new Date(now + POST_SESSION_CHECK_DELAY_MS).toISOString();
    let recorded = 0;
    for (const [studentId, evidence] of Object.entries(byStudent)) {
      await appendEvidence(svc, studentId, evidence);
      const kcIds = evidence.map((e) => e.kcId);
      await recomputeEstimates(svc, studentId, { kcIds, now });
      for (const kcId of kcIds) {
        await svc.from('kc_estimate').update({ next_check_at: checkAt, check_floor_at: checkAt })
          .eq('user_id', studentId).eq('kc_id', kcId).then(() => {}, () => {});
      }
      recorded += evidence.length;
    }

    await auditLog(caller.user.id, 'group.observed', sessionId, {
      students: Object.keys(byStudent).length, observations: recorded,
    });

    return Response.json({
      ok: true,
      students: Object.keys(byStudent).length,
      recorded,
      skipped,
      nextCheckAt: checkAt,
    });
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true }, { status: 503 });
    console.error('[group/brief POST]', err?.message);
    return Response.json({ error: 'Could not save observations.' }, { status: 500 });
  }
}
