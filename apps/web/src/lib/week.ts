import { addDays, isDay, localDate } from "@/planner/dates";
import { toIcs } from "@/planner/ics";
import { planForWeek, type WeekInput } from "@/planner/week";
import type { EventKind, SchoolClass } from "@/planner/types";
import { continueTarget } from "./activity";
import { coursesOf } from "./courses";
import { attemptsOf, settingsOf, startOf, statusesOf } from "./practice";
import { addClass, classesOf, draftsFromIcs, eventsOf, importDrafts, updateClass, type Draft } from "./school";
import { read, type StoreState } from "./store";
import type { Profile, Subject } from "./types";

// The calendar's data: one learner's week (planner/week.ts does the rules), and class calendar feeds —
// bringing a feed in, refreshing it later, and the family's own .ics file out. Backend-shaped like the
// rest of lib/: screens call these; the bodies become API calls when accounts move to a server.

const SUBJECTS: Subject[] = ["math", "english", "science", "other"];

/** Everything planForWeek needs for one learner, read the same way Today reads it (lib/plan.ts). */
export function weekInput(s: StoreState, p: Profile, now: number): WeekInput {
  const date = localDate(now);
  const courses = coursesOf(s, p.id);
  const activity = s.activity.filter((e) => e.profileId === p.id);
  const ref = (courseId: string, lessonId?: string) => {
    const course = courses.find((c) => c.id === courseId);
    const lesson = course?.lessons.find((l) => l.id === lessonId);
    return course && lesson ? { courseId, lessonId: lesson.id, title: lesson.title, courseTitle: course.title, minutes: lesson.minutes } : null;
  };
  const lessonsDone = activity.flatMap((e) => {
    const r = e.type === "lesson_completed" ? ref(e.courseId, e.lessonId) : null;
    return r ? [{ ...r, at: e.at }] : [];
  });
  const next = continueTarget(courses, activity);
  const nextLesson = next ? ref(next.course.id, next.lesson.id) ?? undefined : undefined;
  // As on Today: a lesson finished today stays on today's plan (as done) instead of the next one.
  const finishedToday = lessonsDone.find((l) => localDate(l.at) === date);
  return {
    date,
    now,
    grade: p.grade,
    settings: settingsOf(p),
    statuses: statusesOf(s, p.id, now),
    starts: Object.fromEntries(SUBJECTS.map((x) => [x, startOf(p, x)])),
    events: s.events.filter((e) => e.profileId === p.id),
    feedback: s.feedback.filter((f) => f.profileId === p.id),
    sets: s.sets.filter((x) => x.profileId === p.id),
    done: s.planDone.filter((d) => d.profileId === p.id),
    lesson: finishedToday ?? nextLesson,
    nextLesson,
    attempts: attemptsOf(s, p.id),
    lessonsDone,
  };
}

/** One learner's days from `from`: done on past days, today's plan, planned after. */
export const weekOf = (s: StoreState, p: Profile, now: number, from: string, days = 7) => planForWeek(weekInput(s, p, now), from, days);

// ── Opening the add form from a link: /calendar?add=homework|test|quiz|project|other(&date=YYYY-MM-DD)

const ADD_KINDS: Record<string, EventKind> = { homework: "homework", test: "test", quiz: "quiz", project: "project", other: "event", event: "event", "no-school": "no-school" };

/** A real calendar day ("2026-02-30" is not one, though Date would roll it into March). */
export const realDay = (s: string | null | undefined): s is string => !!s && isDay(s) && addDays(s, 0) === s;

/** What an `?add=` link asks for. Unknown kinds open the form with its default; a bad date is ignored. */
export function addRequest(add: string | null, date: string | null): { kind?: EventKind; date?: string } | null {
  if (add === null) return null;
  return { kind: ADD_KINDS[add], date: realDay(date) ? date : undefined };
}

// ── Class calendar feeds (Google Classroom / Calendar, Canvas, Schoology) through /api/ics

export type FeedErrorCode = "url" | "blocked" | "status" | "size" | "timeout" | "format" | "rate" | "network";
const CODES: FeedErrorCode[] = ["url", "blocked", "status", "size", "timeout", "format", "rate"];

/** Reads a calendar link through our server (the browser can't fetch other sites). Never throws. */
export async function fetchCalendar(url: string): Promise<{ ok: true; text: string } | { ok: false; error: FeedErrorCode }> {
  try {
    const res = await fetch("/api/ics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: CODES.find((c) => c === body.error) ?? "status" };
    }
    return { ok: true, text: await res.text() };
  } catch {
    return { ok: false, error: "network" };
  }
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 160);
/** The UID suffix planner/ics.ts toIcs gives exported items. */
const OWN_UID = "@kaizenedu.net";

/**
 * Calendar text → reviewable drafts. An event the family already imported (same UID) keeps what the
 * family set on it — its type, linked skills and class — while the date, time and name follow the
 * school. Events without a UID get one from their date and name, so a second import updates them.
 * Items from our own exported file that are still here are left out: they are already on the calendar.
 */
export function icsDrafts(s: StoreState, profileId: string, text: string, today: string, classId?: string): Draft[] {
  const ours = (uid?: string) => !!uid?.endsWith(OWN_UID) && s.events.some((e) => e.profileId === profileId && `${e.id}${OWN_UID}` === uid);
  return draftsFromIcs(s, profileId, text, addDays(today, -7), classId).filter((d) => !ours(d.uid)).map((d) => {
    const uid = d.uid ?? `kz:${d.date}:${tidy(d.title).toLowerCase()}`;
    const prev = s.events.find((e) => e.profileId === profileId && e.uid === uid);
    return prev ? { ...d, uid, kind: prev.kind, skillIds: prev.skillIds, classId: classId ?? prev.classId ?? d.classId } : { ...d, uid };
  });
}

export type ImportResult = { added: number; updated: number; unchanged: number; classId?: string };

/**
 * Saves reviewed drafts. With `link`, the calendar link is kept on its class (made here when it is new)
 * so it can be refreshed later, and every item is filed under that class. Items that match an earlier
 * import exactly are left alone and counted as unchanged.
 */
export function saveImport(
  profileId: string,
  drafts: Draft[],
  source: "paste" | "ics" | "ai",
  link?: { url: string; classId?: string; newClass?: { name: string; subject: Subject } },
): ImportResult {
  let classId = link?.classId;
  if (link && !classId && link.newClass) classId = addClass(profileId, { ...link.newClass, feedUrl: link.url.trim() })?.id;
  else if (link && classId) updateClass(classId, { feedUrl: link.url.trim() });
  const s = read();
  const chosen = drafts.filter((d) => d.include).map((d) => (link && classId ? { ...d, classId } : d));
  const same = (d: Draft) => {
    const e = d.uid ? s.events.find((x) => x.profileId === profileId && x.uid === d.uid) : undefined;
    return !!e && e.title === tidy(d.title) && e.date === d.date && (e.time ?? "") === (d.time ?? "") && e.kind === d.kind && e.classId === (d.classId ?? e.classId) && e.skillIds.join() === (d.skillIds.length ? d.skillIds : e.skillIds).join();
  };
  const changed = chosen.filter((d) => !same(d));
  const { added, updated } = importDrafts(profileId, changed, source);
  return { added, updated, unchanged: chosen.length - changed.length, classId };
}

export type RefreshResult = { classId: string; name: string } & ({ ok: true; added: number; updated: number; unchanged: number } | { ok: false; error: FeedErrorCode });

/** Re-reads one class's calendar link and updates its items by UID. No review step: the family reviewed the first import. */
export async function refreshClass(profileId: string, classId: string, today: string): Promise<RefreshResult> {
  const cls = classesOf(read(), profileId).find((c) => c.id === classId);
  if (!cls?.feedUrl) return { classId, name: cls?.name ?? "", ok: false, error: "url" };
  const got = await fetchCalendar(cls.feedUrl);
  if (!got.ok) return { classId, name: cls.name, ok: false, error: got.error };
  const drafts = icsDrafts(read(), profileId, got.text, today, classId);
  const r = saveImport(profileId, drafts, "ics");
  return { classId, name: cls.name, ok: true, added: r.added, updated: r.updated, unchanged: r.unchanged };
}

export const linkedClasses = (s: StoreState, profileId: string): SchoolClass[] => classesOf(s, profileId).filter((c) => c.feedUrl);

/** Refreshes every linked class calendar for a learner, one after another. */
export async function refreshAll(profileId: string, today: string): Promise<RefreshResult[]> {
  const out: RefreshResult[] = [];
  for (const c of linkedClasses(read(), profileId)) out.push(await refreshClass(profileId, c.id, today));
  return out;
}

/** Forgets a class's calendar link; its items stay. */
export const unlinkCalendar = (classId: string) => updateClass(classId, { feedUrl: undefined });

/** The family's own calendar file: school items from a week ago on, for a phone or family calendar. */
export function calendarFile(s: StoreState, p: Profile, today: string): { name: string; text: string; count: number } {
  const events = eventsOf(s, p.id).filter((e) => e.date >= addDays(today, -7));
  const slug = p.nickname.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
  return { name: `kaizenedu-${slug}.ics`, text: toIcs(events, `KaizenEDU · ${p.nickname}`), count: events.length };
}
