import { RULES, skillStatus, type SkillState } from "@/learning/engine";
import type { Attempt, Mode, PracticeSet } from "@/learning/types";
import { getSkill } from "@/practice/skills";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { ReadingEntry } from "@/planner/types";
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
  /** Lessons finished in the week, and how their questions went (see lessonTallies). */
  lessons: number;
  lessonChecks: Tally;
  /** Practice and lesson time, rounded up to whole minutes. */
  minutes: number;
  /** Logged by a grown-up in the reading log (English only). */
  readingMinutes: number;
};

/** A lesson finished inside the window, with its own question tally. */
export type LessonDone = { id: string; at: number; courseId: string; lessonId?: string; tally: Tally };

export type SubjectGrowth = {
  subject: Subject;
  weeks: GrowthWeek[];
  /** Lessons finished in these weeks, newest first. */
  lessons: LessonDone[];
  /** Any evidence in this subject at all, up to the end of the window. */
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
 * Answers that move a skill: practice, test prep, reviews and checks. Placement probes find a
 * starting point and tutor rows mark help; on their own they do not mean a skill is being practiced.
 */
const MOVES = new Set<Mode>(["practice", "prep", "review", "check"]);
export const movesSkill = (a: Pick<Attempt, "mode">) => MOVES.has(a.mode);

/** Skills on the map with at least one answer that moves them: the ones Growth counts and lists. */
export function practicedSkills(attempts: Attempt[]): Set<string> {
  return new Set(attempts.filter((a) => movesSkill(a) && getSkill(a.skillId)).map((a) => a.skillId));
}

/**
 * Week boundaries, oldest first: the Mondays (00:00 local) of the `count` weeks ending with the one
 * that contains `now`, then the Monday after. Built from calendar dates so a clock change never
 * shifts a week.
 */
export function weekBounds(now: number, count: number): number[] {
  const d = new Date(startOfWeek(now));
  return Array.from({ length: count + 1 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * (i - count + 1)).getTime());
}

/**
 * The moment a window of `weeks` weeks ends, `back` windows before the current one: `now` itself
 * for the current window, else the last millisecond before the Monday the next window starts.
 */
export function windowEnd(now: number, back: number, weeks = GROWTH_WEEKS): number {
  if (back <= 0) return now;
  const d = new Date(startOfWeek(now));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7 * (weeks * back - 1)).getTime() - 1;
}

/** When this learner's record starts: their first answer, lesson, logged reading or school result. */
export function recordStart(s: StoreState, profileId: string): number | undefined {
  let first: number | undefined;
  const see = (t: number) => {
    if (first === undefined || t < first) first = t;
  };
  for (const a of s.attempts) if (a.profileId === profileId) see(a.at);
  for (const e of s.activity) if (e.profileId === profileId && e.type !== "course_added") see(e.at);
  for (const r of s.reading) if (r.profileId === profileId) see(fromLocalDate(r.date).getTime());
  for (const r of s.results) if (r.profileId === profileId) see(fromLocalDate(r.date).getTime());
  return first;
}

const indexIn = (bounds: number[], t: number) => {
  if (t < bounds[0] || t >= bounds[bounds.length - 1]) return -1;
  let i = bounds.length - 2;
  while (bounds[i] > t) i--;
  return i;
};

/** Right on their own, right with help, not yet. */
export const tally = (list: { correct?: boolean; assisted?: boolean }[]): Tally => ({
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
 * Lesson questions as they last stood, like a practice item: between two finishes of a lesson only
 * the latest answer to each question counts, so a visit left halfway and then done again counts each
 * question once, and a miss put right with help counts once, as right with help. A redo after a
 * finish counts afresh. Each answer comes with the lesson_completed event that closed it, if any.
 */
export function lessonAnswers(events: ActivityEvent[]): { answer: ActivityEvent; finish?: ActivityEvent }[] {
  const open = new Map<string, Map<string, ActivityEvent>>();
  const out: { answer: ActivityEvent; finish?: ActivityEvent }[] = [];
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const key = `${e.courseId}|${e.lessonId}`;
    if (e.type === "quiz_answered") {
      const answers = open.get(key) ?? new Map<string, ActivityEvent>();
      answers.set(e.sceneId ?? e.id, e);
      open.set(key, answers);
    }
    if (e.type === "lesson_completed") {
      for (const answer of open.get(key)?.values() ?? []) out.push({ answer, finish: e });
      open.delete(key);
    }
  }
  for (const answers of open.values()) for (const answer of answers.values()) out.push({ answer });
  return out;
}

/** Each finished lesson's question tally (see lessonAnswers), keyed by the lesson_completed event id. */
export function lessonTallies(events: ActivityEvent[]): Map<string, Tally> {
  const by = new Map<string, ActivityEvent[]>(events.filter((e) => e.type === "lesson_completed").map((e) => [e.id, []]));
  for (const { answer, finish } of lessonAnswers(events)) if (finish) by.get(finish.id)?.push(answer);
  return new Map([...by].map(([id, list]) => [id, tally(list)]));
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

/**
 * Per subject, week by week, for the `count` weeks ending with the one that contains `now`. `now` is
 * where the record stops: the real now for the current weeks, or windowEnd() for earlier ones.
 */
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
        lessons: [],
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

  // 1. Replay the mastery law at each week's end over the evidence up to then, from the first answer
  //    that moves the skill (a placement probe or a tutor row alone is not practice).
  const bySkill = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!getSkill(a.skillId)) continue;
    const list = bySkill.get(a.skillId);
    if (list) list.push(a);
    else bySkill.set(a.skillId, [a]);
  }
  for (const [id, list] of bySkill) {
    const first = list.findIndex(movesSkill);
    if (first < 0) continue;
    const g = out.get(getSkill(id)!.subject)!;
    g.any = true;
    let k = 0;
    for (const w of g.weeks) {
      while (k < list.length && list[k].at < w.end) k++;
      if (k <= first) continue;
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

  // 3. Minutes: answers (practice, checks, placement, AI-written sets) and finished lessons. Tutor help
  //    rows are marks, not time.
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

  // 4. Lessons finished, with their question tally.
  const tallies = lessonTallies(events);
  for (const e of events) {
    if (e.type === "course_added") continue;
    const x = subject.course(e.courseId);
    const g = out.get(x)!;
    g.any = true;
    if (e.type !== "lesson_completed") continue;
    const w = week(x, e.at);
    if (!w) continue;
    const tl = tallies.get(e.id)!;
    w.lessons++;
    w.lessonChecks.own += tl.own;
    w.lessonChecks.helped += tl.helped;
    w.lessonChecks.missed += tl.missed;
    addTime(w, e.seconds ?? 0);
    g.lessons.push({ id: e.id, at: e.at, courseId: e.courseId, lessonId: e.lessonId, tally: tl });
  }
  for (const [w, n] of seconds) w.minutes = Math.ceil(n / 60);
  for (const g of out.values()) g.lessons.sort((a, b) => b.at - a.at);

  // 5. Reading logged by a grown-up, by its calendar day. Today's counts from the morning on; a day
  //    logged ahead waits for its date.
  const english = out.get("english")!;
  const today = localDate(now);
  for (const r of s.reading) {
    if (r.profileId !== profileId || r.date > today) continue;
    english.any = true;
    const w = week("english", Math.min(fromLocalDate(r.date).getTime(), now));
    if (w) w.readingMinutes += r.minutes;
  }
  return [...out.values()];
}

// ----- results from school (entered by a grown-up; never part of proof) -----

export type SchoolRow = { id: string; title: string; date: string; score: number; outOf: number; subject: Subject; className?: string };

/** School scores dated from `from` to `to` (YYYY-MM-DD, inclusive), newest first, with the subject of their class. */
export function schoolResults(s: StoreState, profileId: string, from: string, to = "9999-12-31"): SchoolRow[] {
  return s.results
    .filter((r) => r.profileId === profileId && r.date >= from && r.date <= to)
    .map((r) => {
      const cls = s.classes.find((c) => c.id === r.classId && c.profileId === profileId);
      return { id: r.id, title: r.title, date: r.date, score: r.score, outOf: r.outOf, subject: cls?.subject ?? "other", className: cls?.name };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ----- day by day -----

export type LogEntry =
  | { kind: "activity"; id: string; at: number; event: ActivityEvent; /** A finished lesson's questions. */ tally?: Tally }
  | {
      kind: "set";
      id: string;
      /** When it was finished, or its last answer if it was left before the end. */
      at: number;
      set: PracticeSet;
      tally: Tally;
      finished: boolean;
      answered: number;
      /** Problems in the set; unknown for placement, which grows as it goes. */
      of?: number;
    }
  | { kind: "check"; id: string; at: number; skillId: string; passed: boolean }
  | { kind: "proved"; id: string; at: number; skillId: string }
  | { kind: "reading"; id: string; at: number; entry: ReadingEntry };

export type LogDay = { day: number; entries: LogEntry[] };

/**
 * One week of the record, a day at a time, newest first within each day: sets (left early ones too),
 * checks, proofs, lessons with their question tally, and reading a grown-up logged. Every answer
 * that counts toward Growth's minutes shows up in some line.
 */
export function weekLog(s: StoreState, profileId: string, weekStart: number, now: number): LogDay[] {
  const d = new Date(weekStart);
  const days = Array.from({ length: 8 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime());
  const entries: LogEntry[] = [];
  const inWeek = (t: number) => t >= days[0] && t < days[7] && t <= now;
  const mine = s.attempts.filter((a) => a.profileId === profileId && a.at <= now);
  const bySet = new Map<string, Attempt[]>();
  for (const a of mine) {
    if (!a.setId) continue;
    const list = bySet.get(a.setId);
    if (list) list.push(a);
    else bySet.set(a.setId, [a]);
  }

  const events = s.activity.filter((e) => e.profileId === profileId);
  const tallies = lessonTallies(events.filter((e) => e.at <= now));
  for (const e of events) if (inWeek(e.at)) entries.push({ kind: "activity", id: e.id, at: e.at, event: e, tally: tallies.get(e.id) });

  for (const set of s.sets) {
    if (set.profileId !== profileId) continue;
    const answers = bySet.get(set.id) ?? [];
    if (!answers.length) continue;
    // A whole check is graded below; only a check left before its last problem is listed as a set.
    if (set.kind === "check" && answers.length >= RULES.checkSize) continue;
    const finished = !!set.finishedAt && set.finishedAt <= now;
    const at = finished ? set.finishedAt! : Math.max(...answers.map((a) => a.at));
    if (!inWeek(at)) continue;
    entries.push({ kind: "set", id: set.id, at, set, tally: tally(answers), finished, answered: answers.length, of: set.kind === "placement" ? undefined : set.slots.length });
  }
  for (const c of gradedChecks(mine)) if (inWeek(c.at)) entries.push({ kind: "check", id: c.setId, at: c.at, skillId: c.skillId, passed: c.passed });
  for (const st of Object.values(statusesOf(s, profileId, now)))
    if (st.provedAt && inWeek(st.provedAt)) entries.push({ kind: "proved", id: `proved:${st.skillId}`, at: st.provedAt, skillId: st.skillId });

  // Reading has a day, not a time: it sorts as midday (or now, this morning) and shows no clock time.
  const today = localDate(now);
  for (const r of s.reading) {
    if (r.profileId !== profileId || r.date > today) continue;
    const at = Math.min(fromLocalDate(r.date).getTime(), now);
    if (inWeek(at)) entries.push({ kind: "reading", id: r.id, at, entry: r });
  }

  return days.slice(0, 7).map((day, i) => ({
    day,
    // Newest first; a proof sits above the check that made it.
    entries: entries.filter((e) => e.at >= day && e.at < days[i + 1]).sort((a, b) => b.at - a.at || rank(a) - rank(b)),
  }));
}

const rank = (e: LogEntry) => (e.kind === "proved" ? 0 : 1);
