import { checksOpen, type Statuses } from "@/learning/engine";
import { getSkill } from "@/practice/skills";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { ReadingEntry } from "@/planner/types";
import { startOfWeek } from "./activity";
import { statusesOf } from "./practice";
import { newId, update, type StoreState } from "./store";
import type { Goal, Subject } from "./types";

// What a grown-up sees about one learner, computed from the record. Numbers only; nothing here is
// written by a model. "Proved" means the mastery law was met; everything else is activity.

export type WeekFacts = {
  minutes: number;
  sets: number;
  lessons: number;
  /** Practice answers (not lesson questions). */
  own: number;
  helped: number;
  missed: number;
  /** Lesson questions answered this week (every answer, as with practice), kept apart from practice answers. */
  lessonChecks: { own: number; helped: number; missed: number };
  proved: string[];
  helpOn: string[];
  checksWaiting: string[];
  overdue: string[];
  stuck: string[];
  readingMinutes: number;
};

export function weekFacts(s: StoreState, profileId: string, now: number): WeekFacts {
  // Monday to Monday by the calendar, so a clock change never moves the week's edge.
  const from = startOfWeek(now), d = new Date(from), to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime();
  const inWeek = (t: number) => t >= from && t < to;
  const attempts = s.attempts.filter((a) => a.profileId === profileId && a.mode !== "tutor" && inWeek(a.at));
  const statuses: Statuses = statusesOf(s, profileId, now);
  const lessons = s.activity.filter((e) => e.profileId === profileId && e.type === "lesson_completed" && inWeek(e.at));
  const quiz = s.activity.filter((e) => e.profileId === profileId && e.type === "quiz_answered" && inWeek(e.at));
  // Reading counts by its calendar day; a day logged ahead waits for its date.
  const today = localDate(now);
  const reading = s.reading.filter((r) => r.profileId === profileId && r.date <= today && inWeek(fromLocalDate(r.date).getTime()));
  const helpCount = new Map<string, number>();
  for (const a of attempts) if (a.assisted || !a.correct) helpCount.set(a.skillId, (helpCount.get(a.skillId) ?? 0) + 1);
  const seconds = attempts.reduce((n, a) => n + a.seconds, 0) + lessons.reduce((n, e) => n + (e.seconds ?? 0), 0);
  return {
    minutes: Math.ceil(seconds / 60),
    sets: s.sets.filter((x) => x.profileId === profileId && x.finishedAt && inWeek(x.finishedAt)).length,
    lessons: lessons.length,
    own: attempts.filter((a) => a.correct && !a.assisted).length,
    helped: attempts.filter((a) => a.correct && a.assisted).length,
    missed: attempts.filter((a) => !a.correct).length,
    lessonChecks: {
      own: quiz.filter((e) => e.correct && !e.assisted).length,
      helped: quiz.filter((e) => e.correct && e.assisted).length,
      missed: quiz.filter((e) => !e.correct).length,
    },
    proved: Object.values(statuses).filter((x) => x.state === "proved" && x.provedAt && inWeek(x.provedAt)).map((x) => x.skillId),
    helpOn: [...helpCount.entries()].filter(([id]) => getSkill(id)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id),
    checksWaiting: checksOpen(statuses, now).map((x) => x.skillId),
    overdue: Object.values(statuses).filter((x) => x.overdue).map((x) => x.skillId),
    stuck: Object.values(statuses).filter((x) => x.stuck).map((x) => x.skillId),
    readingMinutes: reading.reduce((n, r) => n + r.minutes, 0),
  };
}

/**
 * The last time the learner did anything here, up to `now`: an answer, time with the tutor, a lesson,
 * a plan line marked done, or reading a grown-up logged. Adding a course is not doing something.
 */
export function lastActive(s: StoreState, profileId: string, now = Infinity): number | undefined {
  let last: number | undefined;
  const see = (t: number | undefined) => {
    if (t !== undefined && t <= now && (last === undefined || t > last)) last = t;
  };
  for (const a of s.attempts) if (a.profileId === profileId) see(a.at);
  for (const e of s.activity) if (e.profileId === profileId && e.type !== "course_added") see(e.at);
  for (const d of s.planDone) if (d.profileId === profileId) see(d.at);
  for (const th of s.threads) if (th.profileId === profileId) see(th.lines.at(-1)?.at ?? th.startedAt);
  // Reading is logged by calendar day (read as noon); reading logged for today counts from now.
  for (const r of s.reading) {
    if (r.profileId !== profileId) continue;
    const at = fromLocalDate(r.date).getTime();
    see(at > now && r.date === localDate(now) ? now : at);
  }
  return last;
}

/** Proved / in progress / not started per subject, for the skill overview. */
export function subjectProgress(statuses: Statuses, subject: Subject, all: { id: string; subject: Subject }[]) {
  const list = all.filter((k) => k.subject === subject);
  const st = (id: string) => statuses[id]?.state ?? "new";
  return {
    total: list.length,
    proved: list.filter((k) => st(k.id) === "proved").length,
    checking: list.filter((k) => ["ready", "checked", "refresh"].includes(st(k.id))).length,
    practicing: list.filter((k) => st(k.id) === "practicing").length,
  };
}

// ----- family goals (asked once at setup) -----

export function setGoals(goals: Goal[]) {
  update((s) => {
    const a = s.accounts.find((x) => x.id === s.session.accountId);
    if (!a) return;
    a.goals = goals;
    // Homeschool families get all three subjects and a longer day, unless a grown-up already chose.
    if (goals.includes("homeschool"))
      for (const p of s.profiles.filter((x) => x.accountId === a.id)) {
        p.settings = { ...p.settings };
        p.settings.subjects ??= ["math", "english", "science"];
        p.settings.dailyMinutes ??= ["K", "1", "2"].includes(p.grade) ? 20 : 30;
      }
  });
}

export const goalsOf = (s: StoreState): Goal[] | undefined => s.accounts.find((x) => x.id === s.session.accountId)?.goals;

// ----- reading log -----

export function addReading(profileId: string, input: { title: string; author?: string; minutes: number; date: string }): ReadingEntry | null {
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 160);
  const minutes = Math.round(input.minutes);
  if (!title || !(minutes > 0 && minutes <= 600) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  const entry: ReadingEntry = { id: newId(), profileId, date: input.date, title, author: input.author?.trim().slice(0, 120) || undefined, minutes };
  update((s) => void s.reading.push(entry));
  return entry;
}

export function removeReading(id: string) {
  update((s) => void (s.reading = s.reading.filter((r) => r.id !== id)));
}

// ----- homeschool records -----

export type DayRecord = { date: string; minutes: Record<Subject, number>; sets: number; lessons: number; proved: string[]; books: string[] };

/** One row per day with any learning, between two local dates inclusive. */
export function dailyRecords(s: StoreState, profileId: string, from: string, to: string, now: number): DayRecord[] {
  const rows = new Map<string, DayRecord>();
  const row = (date: string) => {
    let r = rows.get(date);
    if (!r) rows.set(date, (r = { date, minutes: { math: 0, english: 0, science: 0, other: 0 }, sets: 0, lessons: 0, proved: [], books: [] }));
    return r;
  };
  const inRange = (d: string) => d >= from && d <= to;
  const secs = new Map<string, number>();
  for (const a of s.attempts) {
    if (a.profileId !== profileId || a.mode === "tutor") continue;
    const d = localDate(a.at);
    if (!inRange(d)) continue;
    const subject = getSkill(a.skillId)?.subject ?? "other";
    const key = `${d}|${subject}`;
    secs.set(key, (secs.get(key) ?? 0) + a.seconds);
    row(d);
  }
  for (const e of s.activity) {
    if (e.profileId !== profileId || e.type !== "lesson_completed") continue;
    const d = localDate(e.at);
    if (!inRange(d)) continue;
    const subject = s.courses.find((c) => c.id === e.courseId)?.subject ?? "other";
    const key = `${d}|${subject}`;
    secs.set(key, (secs.get(key) ?? 0) + (e.seconds ?? 0));
    row(d).lessons++;
  }
  for (const [key, n] of secs) {
    const [d, subject] = key.split("|") as [string, Subject];
    row(d).minutes[subject] += Math.ceil(n / 60);
  }
  for (const x of s.sets) if (x.profileId === profileId && x.finishedAt && inRange(localDate(x.finishedAt))) row(localDate(x.finishedAt)).sets++;
  for (const r of s.reading) {
    if (r.profileId !== profileId || !inRange(r.date)) continue;
    const day = row(r.date);
    day.minutes.english += r.minutes;
    day.books.push(r.author ? `${r.title} (${r.author})` : r.title);
  }
  for (const st of Object.values(statusesOf(s, profileId, now))) if (st.provedAt && inRange(localDate(st.provedAt))) row(localDate(st.provedAt)).proved.push(st.skillId);
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function recordsCsv(rows: DayRecord[], headers: string[], skillTitle: (id: string) => string): string {
  const lines = [headers.map(cell).join(",")];
  for (const r of rows)
    lines.push(
      [r.date, r.minutes.math, r.minutes.english, r.minutes.science, r.minutes.other, r.minutes.math + r.minutes.english + r.minutes.science + r.minutes.other, r.sets, r.lessons, r.proved.map(skillTitle).join("; "), r.books.join("; ")]
        .map(cell)
        .join(","),
    );
  return lines.join("\r\n") + "\r\n";
}
