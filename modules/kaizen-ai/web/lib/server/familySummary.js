// Server-side student summary — the ONE aggregation behind the parent's
// read-only window (/api/family/summary) and the monthly summary email
// (lib/server/parentSummary.js). Stats are computed HERE from the database,
// never accepted from a client: the number a parent trusts must not be a
// number a browser sent us.
//
// WHAT LEADS, AND WHY IT CHANGED
// This module used to open on a streak and a GPA. A streak measures showing up
// and a GPA measures a school's grading, and neither is a claim about what the
// child can now do — which is the only thing the seat is sold on. The lead is
// now `mastery`: confirmed concepts out of the concepts being tracked, and what
// crossed into confirmed in the last seven days. Streak, GPA, open work and
// attendance are kept, and are supporting lines.
//
// Only CONFIRMED mastery is read. Working mastery is real, is shown to the
// learner inside the product, and never appears here: "could do it with help"
// is not a thing to tell a parent their child has learned (hard rule 5).

import { courseGrade, gpa } from '@/lib/grades';
import { activeScheduler } from '@/lib/engine/scheduler';
import { isMissingSchema } from '@/lib/engine/ledger';
import { isConfirming, CONFIRM_THRESHOLD } from '@/lib/engine/types';

// "This week" for a parent is the last seven days, not a calendar week — the
// summary is read on whatever evening they open it.
export const MOVED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function summarizeStudent(svc, studentId, { now = Date.now() } = {}) {
  const [profileQ, coursesQ, hwQ, reportQ, mastery] = await Promise.all([
    svc.from('profiles').select('name,email,app_meta').eq('id', studentId).maybeSingle(),
    svc.from('courses').select('*').eq('user_id', studentId),
    svc.from('homework_items').select('*').eq('user_id', studentId),
    svc.from('weekly_reports').select('content_md,stats,created_at').eq('user_id', studentId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    masterySummary(svc, studentId, { now }),
  ]);

  const meta = profileQ.data?.app_meta || {};
  // Map DB rows → the client shapes lib/grades.js expects.
  const courses = (coursesQ.data || []).map((c) => ({
    id: c.id, name: c.title, color: c.color || '#B4536F',
    gradeCategories: c.grade_categories || [], gradeScale: c.grade_scale || null,
    credits: c.credits == null ? 1 : Number(c.credits),
  }));
  const assignments = (hwQ.data || []).map((h) => ({
    id: h.id, courseId: h.course_id, title: h.title, due: h.due, status: h.status,
    category: h.category || null, graded: Boolean(h.graded),
    pointsEarned: h.points_earned == null ? null : Number(h.points_earned),
    pointsPossible: h.points_possible == null ? null : Number(h.points_possible),
  }));

  const byCourse = (cid) => assignments.filter((a) => a.courseId === cid);
  return {
    student: { name: profileQ.data?.name || profileQ.data?.email || 'Student' },
    // The lead. `headline` is lifted to the top level so a consumer that shows
    // one line shows the mastery line — the demotion has to hold in the data,
    // not only in the page that happens to render it today.
    headline: mastery.headline,
    mastery,
    // ── Supporting lines from here down ──────────────────────────────────────
    streak: meta.streak?.count || 0,
    gpa: gpa(courses, byCourse),
    openAssignments: assignments.filter((a) => a.status !== 'done').length,
    courses: courses.map((c) => {
      const g = courseGrade(c, byCourse(c.id));
      return { name: c.name, color: c.color, percent: g.percent, letter: g.letter };
    }),
    latestReport: reportQ.data
      ? { at: reportQ.data.created_at, content: reportQ.data.content_md }
      : null,
  };
}

/** Sessions a student actually attended in a window — the club's month story. */
export async function sessionsInWindow(svc, studentId, { from, to }) {
  const [seatsQ, privQ] = await Promise.all([
    svc.from('group_seat')
      .select('id,status,group_session_id,created_at,group_session(kind,scheduled_start,status)')
      .eq('student_id', studentId)
      .in('status', ['booked', 'attended']),
    svc.from('tutoring_sessions')
      .select('id,status,scheduled_start')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .gte('scheduled_start', from.toISOString())
      .lt('scheduled_start', to.toISOString()),
  ]);

  let hall = 0; let clinics = 0; let community = 0;
  for (const seat of seatsQ.data || []) {
    const room = seat.group_session;
    if (!room || room.status !== 'completed') continue;
    const start = new Date(room.scheduled_start);
    if (start < from || start >= to) continue;
    if (room.kind === 'homework_hall') hall += 1;
    else if (room.kind === 'community_free') community += 1;
    else clinics += 1;
  }
  return { hall, clinics, community, privateSessions: (privQ.data || []).length };
}

/**
 * The mastery lead, read from the ledger.
 *
 * Degrades to an explicit not-provisioned state when the engine's tables
 * (0012/0013) are not applied: a parent's page must render on a deployment
 * where concept tracking is not switched on, rather than 500.
 */
export async function masterySummary(svc, studentId, { now = Date.now() } = {}) {
  // The whole body is guarded. A parent's page is the one surface where an
  // engine that is half-provisioned, or simply having a bad minute, must not
  // take the grades and the attendance down with it.
  try {
    const [linksQ, estQ] = await Promise.all([
      svc.from('learner_kc').select('kc_id,local_title').eq('user_id', studentId),
      // Only `confirmed` is selected. There is no code path from this module to
      // a working-mastery number, by construction.
      svc.from('kc_estimate').select('kc_id,confirmed').eq('user_id', studentId),
    ]);

    const failure = [linksQ, estQ].map((q) => q.error).find(Boolean);
    if (failure) {
      if (!isMissingSchema(failure)) console.error('[familySummary mastery]', failure.message);
      return notTracked();
    }

    const links = linksQ.data || [];
    const estimates = estQ.data || [];
    const confirmedIds = estimates
      .filter((e) => Number(e.confirmed) >= CONFIRM_THRESHOLD)
      .map((e) => e.kc_id);

    // Evidence is fetched only for the concepts that are actually confirmed —
    // the "moved this week" replay needs their history and nothing else, which
    // keeps this bounded by what the parent is being told about.
    let evidence = [];
    let kcs = [];
    if (confirmedIds.length) {
      const [evQ, kcQ] = await Promise.all([
        svc.from('evidence')
          .select('kc_id,at,kind,outcome,assisted,assistance_dose,verified_by,weight,item_id,context_tag')
          .eq('user_id', studentId).in('kc_id', confirmedIds)
          .order('at', { ascending: true }).limit(5000),
        svc.from('kc').select('id,title').in('id', confirmedIds),
      ]);
      if (evQ.error) return notTracked();
      evidence = evQ.data || [];
      kcs = kcQ.data || [];
    }

    return masteryLead({ links, estimates, evidence, kcs, now });
  } catch (err) {
    if (!isMissingSchema(err)) console.error('[familySummary mastery]', err?.message);
    return notTracked();
  }
}

/**
 * PURE. The arithmetic behind the parent's headline, so it can be pinned by a
 * test without a database.
 *
 * "Moved this week" is answered by REPLAY, not by a timestamp: the ledger is
 * the source of truth and kc_estimate is a cache, so the honest question is
 * "would this concept have been confirmed seven days ago, on the evidence that
 * existed then?" Anything cheaper — a computed_at column, the date of the most
 * recent check — either counts a concept confirmed months ago because it was
 * revisited, or misses one that crossed the line on old evidence catching up.
 *
 * BOTH ENDS OF THE WINDOW ARE REPLAYED, and that is not belt-and-braces. The
 * cached `confirmed` in kc_estimate is only recomputed when new evidence
 * arrives, while the replay applies the scheduler's recency decay — so a
 * concept confirmed months ago and untouched since has a stale cache above the
 * threshold and a live replay below it at BOTH ends of the window. Comparing
 * the stale cache against a decayed replay would report that dormant concept
 * as "moved this week", every week, for as long as nobody practised it. The
 * only honest statement is that it is confirmed on today's evidence and was
 * not on the evidence that existed a week ago.
 */
export function masteryLead({ links = [], estimates = [], evidence = [], kcs = [], now = Date.now() } = {}) {
  const canonicalOf = Object.fromEntries(kcs.map((k) => [k.id, k.title]));
  const titleOf = {};
  for (const l of links) titleOf[l.kc_id] = l.local_title || canonicalOf[l.kc_id] || 'Concept';

  const total = new Set([...links.map((l) => l.kc_id), ...estimates.map((e) => e.kc_id)]).size;
  const confirmedRows = estimates.filter((e) => Number(e.confirmed) >= CONFIRM_THRESHOLD);

  const cutoff = now - MOVED_WINDOW_MS;
  const byKc = new Map();
  for (const e of evidence) {
    if (!byKc.has(e.kc_id)) byKc.set(e.kc_id, []);
    byKc.get(e.kc_id).push(e);
  }

  const scheduler = activeScheduler();
  const moved = [];
  for (const est of confirmedRows) {
    const rows = byKc.get(est.kc_id) || [];
    const before = rows.filter((r) => new Date(r.at).getTime() <= cutoff);
    const wasConfirmed = before.length
      ? Number(scheduler.estimate(before, { now: cutoff }).confirmed) >= CONFIRM_THRESHOLD
      : false;
    if (wasConfirmed) continue;
    // Confirmed NOW on the same replay, not merely in the cache.
    const isConfirmedNow = rows.length
      ? Number(scheduler.estimate(rows, { now }).confirmed) >= CONFIRM_THRESHOLD
      : false;
    if (!isConfirmedNow) continue;
    const last = rows.filter(isConfirming)
      .reduce((acc, r) => (!acc || new Date(r.at).getTime() > new Date(acc.at).getTime() ? r : acc), null);
    // And the thing that moved it has to be inside the window it is being
    // reported in. Without this a concept whose last confirming evidence is
    // older than the cutoff could still be announced as this week's news.
    if (!last?.at || new Date(last.at).getTime() < cutoff) continue;
    moved.push({
      kcId: est.kc_id,
      title: titleOf[est.kc_id] || canonicalOf[est.kc_id] || 'Concept',
      at: last?.at || null,
    });
  }
  moved.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

  const confirmed = confirmedRows.length;
  return {
    // `tracked` separates "the engine is on and this child has no confirmed
    // concepts yet" from "the engine is not on here". Both look like a zero.
    tracked: true,
    total,
    confirmed,
    movedThisWeek: moved.length,
    // Named, not just counted: "Dividing fractions" is what a parent repeats at
    // the dinner table; "2" is not.
    moved: moved.slice(0, 5),
    windowDays: Math.round(MOVED_WINDOW_MS / 86400000),
    headline: total
      ? `${confirmed} of ${total} concepts confirmed${moved.length ? `, ${moved.length} moved this week` : ''}`
      : 'No concepts tracked yet',
  };
}

// The engine is not provisioned on this deployment (or its read failed). Say so
// rather than reporting a confident zero, which reads as "your child learned
// nothing" — the worst possible way to be wrong at a parent.
function notTracked() {
  return {
    tracked: false,
    total: 0,
    confirmed: 0,
    movedThisWeek: 0,
    moved: [],
    windowDays: Math.round(MOVED_WINDOW_MS / 86400000),
    headline: 'Concept tracking is not switched on for this account yet',
  };
}
