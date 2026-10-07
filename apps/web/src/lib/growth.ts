import { RULES, skillStatus, type SkillState } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import { getSkill } from "@/practice/skills";
import { fromLocalDate } from "@/planner/dates";
import { startOfWeek } from "./activity";
import { statusesOf } from "./practice";
import type { StoreState } from "./store";
import type { ActivityEvent, Subject } from "./types";

// Growth on the evidence model: the attempt ledger replayed through the mastery law at the end of
// each week, per subject. Every number is counted from the record; nothing is estimated, scored or
// written by a model. Practice moves a skill toward a check; only checks prove it (learning/engine).

export const GROWTH_WEEKS = 8;
export const GROWTH_SUBJECTS: Subject[] = ["math", "english", "science", "other"];

export type Tally = { own: number; helped: number; missed: number };

export type GrowthWeek = {
  /** Monday 00:00 local. */
  start: number;
  /** The next Monday 00:00 local; the week is [start, end). */
  end: number;
  /**
   * Skills by where they stood at the week's end (now, for the current week). Ready = waiting for a
   * check: ready for the first, passed one of two, or a proved skill that needs a refresh.
   */
  proved: number;
  ready: number;
  practicing: number;
  /** Checks graded in the week (five fresh problems, no help); passed = four or more right on their own. */
  checks: { passed: number; taken: number };
  /** Lessons finished in the week, and the checks answered in those lessons. */
  lessons: number;
  lessonChecks: Tally;
  /** Practice and lesson time, rounded up to whole minutes. */
  minutes: number;
  /** Logged by a grown-up in the reading log (English only). */
  readingMinutes: number;
};

export type SubjectGrowth = {
  subject: Subject;
  weeks: GrowthWeek[];
  /** Any evidence in this subject at all, up to now. */
  any: boolean;
};

const BUCKET: Record<SkillState, "proved" | "ready" | "practicing" | null> = {
  new: null,
  practicing: "practicing",
  ready: "ready",
  checked: "ready",
  refresh: "ready",
  proved: "proved",
};

/** Where a skill stands, in the three words Growth uses. */
export const bucketOf = (state: SkillState) => BUCKET[state];

/**
 * Week boundaries, oldest first: the Mondays (00:00 local) of the `count` weeks ending with the one
 * that contains `now`, then the Monday after. Built from calendar dates so a clock change never
 * shifts a week.
 */
export function weekBounds(now: number, count: number): number[] {
  const d = new Date(startOfWeek(now));
  return Array.from({ length: count + 1 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * (i - count + 1)).getTime());
}

const indexIn = (bounds: number[], t: number) => {
  if (t < bounds[0] || t >= bounds[bounds.length - 1]) return -1;
  let i = bounds.length - 2;
  while (bounds[i] > t) i--;
  return i;
};

const tally = (list: { correct?: boolean; assisted?: boolean }[]): Tally => ({
  own: list.filter((a) => a.correct && !a.assisted).length,
  helped: list.filter((a) => a.correct && a.assisted).length,
  missed: list.filter((a) => !a.correct).length,
});

export type GradedCheck = { skillId: string; setId: string; at: number; passed: boolean };

/** Checks graded the way the mastery law grades them: a full check, passed with enough right on their own. */
export function gradedChecks(attempts: Attempt[]): GradedCheck[] {
  const bySet = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (a.mode !== "check") continue;
    const key = `${a.skillId}|${a.setId ?? a.id}`;
    const list = bySet.get(key);
    if (list) list.push(a);
    else bySet.set(key, [a]);
  }
  return [...bySet.values()]
    .filter((list) => list.length >= RULES.checkSize)
    .map((list) => ({
      skillId: list[0].skillId,
      setId: list[0].setId ?? list[0].id,
      at: Math.max(...list.map((a) => a.at)),
      passed: list.filter((a) => a.correct && !a.assisted).length >= RULES.checkPass,
    }))
    .sort((a, b) => a.at - b.at);
}

/**
 * Each finished lesson's check tally: the lesson checks answered since that lesson was last
 * finished (a redo counts afresh). Keyed by the lesson_completed event id.
 */
export function lessonTallies(events: ActivityEvent[]): Map<string, Tally> {
  const open = new Map<string, ActivityEvent[]>();
  const out = new Map<string, Tally>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const key = `${e.courseId}|${e.lessonId}`;
    if (e.type === "quiz_answered") {
      const list = open.get(key);
      if (list) list.push(e);
      else open.set(key, [e]);
    }
    if (e.type === "lesson_completed") {
      out.set(e.id, tally(open.get(key) ?? []));
      open.delete(key);
    }
  }
  return out;
}

function subjectsOf(s: StoreState, profileId: string) {
  const setSubject = new Map(s.sets.filter((x) => x.profileId === profileId).map((x) => [x.id, x.subject]));
  const courseSubject = new Map(s.courses.filter((c) => c.profileId === profileId).map((c) => [c.id, c.subject]));
  return {
    // AI-written sets have no skill on the map; their set knows the subject.
    attempt: (a: Attempt): Subject => getSkill(a.skillId)?.subject ?? (a.setId ? setSubject.get(a.setId) : undefined) ?? "other",
    course: (id: string): Subject => courseSubject.get(id) ?? "other",
  };
}

/** Per subject, week by week, for the `count` weeks ending with the current one. */
export function weeklyGrowth(s: StoreState, profileId: string, now: number, count = GROWTH_WEEKS): SubjectGrowth[] {
  const bounds = weekBounds(now, count);
  const attempts = s.attempts.filter((a) => a.profileId === profileId && a.at <= now).sort((a, b) => a.at - b.at);
  const events = s.activity.filter((e) => e.profileId === profileId && e.at <= now);
  const subject = subjectsOf(s, profileId);
  const out = new Map<Subject, SubjectGrowth>(
    GROWTH_SUBJECTS.map((x) => [
      x,
      {
        subject: x,
        any: false,
        weeks: bounds.slice(0, -1).map((start, i) => ({
          start,
          end: bounds[i + 1],
          proved: 0,
          ready: 0,
          practicing: 0,
          checks: { passed: 0, taken: 0 },
          lessons: 0,
          lessonChecks: { own: 0, helped: 0, missed: 0 },
          minutes: 0,
          readingMinutes: 0,
        })),
      },
    ]),
  );
  const week = (x: Subject, t: number) => {
    const i = indexIn(bounds, t);
    return i < 0 ? null : out.get(x)!.weeks[i];
  };

  // 1. Replay the mastery law at each week's end over the evidence up to then.
  const bySkill = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!getSkill(a.skillId)) continue;
    const list = bySkill.get(a.skillId);
    if (list) list.push(a);
    else bySkill.set(a.skillId, [a]);
  }
  for (const [id, list] of bySkill) {
    const g = out.get(getSkill(id)!.subject)!;
    g.any = true;
    let k = 0;
    for (const w of g.weeks) {
      while (k < list.length && list[k].at < w.end) k++;
      if (!k) continue;
      const b = BUCKET[skillStatus(id, list.slice(0, k), Math.min(w.end, now)).state];
      if (b) w[b]++;
    }
  }

  // 2. Checks taken and passed, in the week they were finished.
  for (const c of gradedChecks(attempts)) {
    const w = week(getSkill(c.skillId)?.subject ?? "other", c.at);
    if (!w) continue;
    w.checks.taken++;
    if (c.passed) w.checks.passed++;
  }

  // 3. Minutes: practice answers and finished lessons. Tutor help rows are marks, not time.
  const seconds = new Map<GrowthWeek, number>();
  const addTime = (w: GrowthWeek | null, n: number) => {
    if (w) seconds.set(w, (seconds.get(w) ?? 0) + n);
  };
  for (const a of attempts) {
    if (a.mode === "tutor") continue;
    const x = subject.attempt(a);
    out.get(x)!.any = true;
    addTime(week(x, a.at), a.seconds);
  }

  // 4. Lessons finished, with their check tally.
  const tallies = lessonTallies(events);
  for (const e of events) {
    if (e.type === "course_added") continue;
    const x = subject.course(e.courseId);
    out.get(x)!.any = true;
    if (e.type !== "lesson_completed") continue;
    const w = week(x, e.at);
    if (!w) continue;
    w.lessons++;
    const tl = tallies.get(e.id)!;
    w.lessonChecks.own += tl.own;
    w.lessonChecks.helped += tl.helped;
    w.lessonChecks.missed += tl.missed;
    addTime(w, e.seconds ?? 0);
  }
  for (const [w, n] of seconds) w.minutes = Math.ceil(n / 60);

  // 5. Reading logged by a grown-up, by its calendar day.
  const english = out.get("english")!;
  for (const r of s.reading) {
    if (r.profileId !== profileId) continue;
    const at = fromLocalDate(r.date).getTime();
    if (at > now) continue;
    english.any = true;
    const w = week("english", at);
    if (w) w.readingMinutes += r.minutes;
  }
  return [...out.values()];
}

// ----- results from school (entered by a grown-up; never part of proof) -----

export type SchoolRow = { id: string; title: string; date: string; score: number; outOf: number; subject: Subject; className?: string };

/** School scores on or after `from` (YYYY-MM-DD), newest first, with the subject of their class. */
export function schoolResults(s: StoreState, profileId: string, from: string): SchoolRow[] {
  return s.results
    .filter((r) => r.profileId === profileId && r.date >= from)
    .map((r) => {
      const cls = s.classes.find((c) => c.id === r.classId && c.profileId === profileId);
      return { id: r.id, title: r.title, date: r.date, score: r.score, outOf: r.outOf, subject: cls?.subject ?? "other", className: cls?.name };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ----- day by day -----

export type LogEntry =
  | { kind: "activity"; id: string; at: number; event: ActivityEvent }
  | { kind: "set"; id: string; at: number; set: PracticeSet; tally: Tally }
  | { kind: "check"; id: string; at: number; skillId: string; passed: boolean }
  | { kind: "proved"; id: string; at: number; skillId: string };

export type LogDay = { day: number; entries: LogEntry[] };

/** One week of the record, a day at a time, newest first within each day. */
export function weekLog(s: StoreState, profileId: string, weekStart: number, now: number): LogDay[] {
  const d = new Date(weekStart);
  const days = Array.from({ length: 8 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime());
  const entries: LogEntry[] = [];
  const inWeek = (t: number) => t >= days[0] && t < days[7];
  const mine = s.attempts.filter((a) => a.profileId === profileId);

  for (const e of s.activity) if (e.profileId === profileId && inWeek(e.at)) entries.push({ kind: "activity", id: e.id, at: e.at, event: e });
  for (const set of s.sets) {
    if (set.profileId !== profileId || set.kind === "check" || !set.finishedAt || !inWeek(set.finishedAt)) continue;
    const answers = mine.filter((a) => a.setId === set.id);
    if (answers.length) entries.push({ kind: "set", id: set.id, at: set.finishedAt, set, tally: tally(answers) });
  }
  for (const c of gradedChecks(mine)) if (inWeek(c.at)) entries.push({ kind: "check", id: c.setId, at: c.at, skillId: c.skillId, passed: c.passed });
  for (const st of Object.values(statusesOf(s, profileId, now)))
    if (st.provedAt && inWeek(st.provedAt)) entries.push({ kind: "proved", id: `proved:${st.skillId}`, at: st.provedAt, skillId: st.skillId });

  return days.slice(0, 7).map((day, i) => ({
    day,
    // Newest first; a proof sits above the check that made it.
    entries: entries.filter((e) => e.at >= day && e.at < days[i + 1]).sort((a, b) => b.at - a.at || rank(a) - rank(b)),
  }));
}

const rank = (e: LogEntry) => (e.kind === "proved" ? 0 : 1);
