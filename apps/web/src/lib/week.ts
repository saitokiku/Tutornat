import { addDays, isDay, localDate } from "@/planner/dates";
import { parseIcs, toIcs } from "@/planner/ics";
import { planForWeek, type WeekInput } from "@/planner/week";
import type { EventKind, SchoolClass, SchoolEvent } from "@/planner/types";
import { continueTarget } from "./activity";
import { coursesOf } from "./courses";
import { attemptsOf, settingsOf, startOf, statusesOf } from "./practice";
import { addClass, classesOf, draftsFromIcs, eventsOf, importDrafts, updateClass, type Draft } from "./school";
import { read, update, type StoreState } from "./store";
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
  return { kind: Object.hasOwn(ADD_KINDS, add) ? ADD_KINDS[add] : undefined, date: realDay(date) ? date : undefined };
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

/**
 * A class with a calendar link also remembers every item of that link the family has been shown —
 * kept, left out at review, or deleted later — so Refresh brings in only what is new from school.
 * ponytail: kept on the class record until planner/types.ts SchoolClass declares it.
 */
export type FeedClass = SchoolClass & { seenUids?: string[] };
const MAX_SEEN = 2000;

const tidy = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 160);
const norm = (s: string) => tidy(s).toLowerCase();
/** The UID suffix planner/ics.ts toIcs gives exported items. */
const OWN_UID = "@kaizenedu.net";

/** The id an item without a calendar UID gets from its day and name, so bringing it in again finds it. */
const draftUid = (date: string, title: string) => `kz:${date}:${norm(title)}`;

const ICS_LINE = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i;

/**
 * Gives every VEVENT its own UID. A recurring event's moved or changed instances (RECURRENCE-ID)
 * share the series' UID, and some school calendars list one item twice; without this, two rows would
 * be one item and each refresh would swap it between them. An instance becomes `<uid>#<recurrence>`;
 * a repeat on another day `<uid>#<date>`. The same item listed twice on the same day stays one.
 */
export function uniqueUids(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const firstDay = new Map<string, string>();
  let block: number[] | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^BEGIN:VEVENT$/i.test(lines[i])) block = [];
    else if (/^END:VEVENT$/i.test(lines[i]) && block) {
      const prop = (name: string) => {
        const j = block!.find((k) => ICS_LINE.exec(lines[k])?.[1].toUpperCase() === name);
        const m = j === undefined ? null : ICS_LINE.exec(lines[j]);
        return m ? { at: j!, params: m[2], value: m[3].trim() } : null;
      };
      const uid = prop("UID");
      if (uid?.value) {
        const rid = prop("RECURRENCE-ID")?.value.replace(/[^0-9TZ]/gi, "");
        const day = (prop("DTSTART") ?? prop("DUE"))?.value.slice(0, 8) ?? "";
        let next = uid.value;
        if (rid) next = `${uid.value}#${rid}`;
        else if (firstDay.has(uid.value) && firstDay.get(uid.value) !== day) next = `${uid.value}#${day}`;
        else firstDay.set(uid.value, day);
        if (next !== uid.value) lines[uid.at] = `UID${uid.params}:${next}`;
      }
      block = null;
    } else if (block) block.push(i);
  }
  return lines.join("\r\n");
}

const mine = (s: StoreState, profileId: string) => s.events.filter((e) => e.profileId === profileId);

/** The item a draft already is on the calendar: the same UID, or one typed by hand on the same day with the same name. */
function prevOf(events: SchoolEvent[], d: Pick<Draft, "uid" | "date" | "title">): SchoolEvent | undefined {
  return events.find((e) => !!d.uid && e.uid === d.uid) ?? events.find((e) => !e.uid && e.date === d.date && norm(e.title) === norm(d.title));
}

/**
 * Gives drafts the ids that let a second import update the first instead of duplicating it (pasted
 * text and AI reads included), and drops repeats. An item already on the calendar keeps what the
 * family set on it — its type, linked skills and class — while its date, time and name follow school.
 */
export function matchDrafts(s: StoreState, profileId: string, drafts: Draft[]): Draft[] {
  const events = mine(s, profileId);
  const seen = new Set<string>();
  const out: Draft[] = [];
  for (const d of drafts) {
    const uid = d.uid ?? draftUid(d.date, d.title);
    if (seen.has(uid)) continue;
    seen.add(uid);
    const prev = prevOf(events, { ...d, uid });
    out.push(prev ? { ...d, uid, kind: prev.kind, skillIds: prev.skillIds, classId: prev.classId ?? d.classId } : { ...d, uid });
  }
  return out;
}

/** Whether a draft is already on the calendar. */
const onCalendar = (s: StoreState, profileId: string, d: Pick<Draft, "uid" | "date" | "title">) => !!prevOf(mine(s, profileId), d);

const feedClass = (s: StoreState, classId?: string) => (classId ? (s.classes.find((c) => c.id === classId) as FeedClass | undefined) : undefined);

/**
 * Calendar text → reviewable drafts, one per item. Items from our own exported file that are still
 * here are left out: they are already on the calendar. For a class with a calendar link, items the
 * family left out or deleted before come unticked.
 */
export function icsDrafts(s: StoreState, profileId: string, text: string, today: string, classId?: string): Draft[] {
  const events = mine(s, profileId);
  const ours = (uid?: string) => !!uid?.endsWith(OWN_UID) && events.some((e) => `${e.id}${OWN_UID}` === uid);
  const seen = new Set(feedClass(s, classId)?.seenUids ?? []);
  const drafts = draftsFromIcs(s, profileId, uniqueUids(text), addDays(today, -7), classId).filter((d) => !ours(d.uid));
  return matchDrafts(s, profileId, drafts).map((d) => ({ ...d, key: d.uid!, include: !(seen.has(d.uid!) && !prevOf(events, d)) }));
}

/** Every item id in a calendar, any date. */
const feedUids = (text: string) => new Set(parseIcs(uniqueUids(text)).map((e) => e.uid ?? draftUid(e.date, e.title)));

function rememberSeen(classId: string, uids: string[], keepOnly?: Set<string>) {
  update((s) => {
    const c = feedClass(s, classId);
    if (!c) return;
    const all = [...new Set([...(c.seenUids ?? []), ...uids])].filter((u) => !keepOnly || keepOnly.has(u));
    c.seenUids = all.slice(-MAX_SEEN);
  });
}

export type ImportResult = { added: number; updated: number; unchanged: number; classId?: string };

/**
 * Saves reviewed drafts. With `link`, the calendar link is kept on its class (made here when it is new),
 * new items are filed under that class, and every item the family was shown is remembered so Refresh
 * doesn't bring back what they left out. Items that match an earlier import exactly are left alone and
 * counted as unchanged. An item typed by hand that the import matched by day and name takes the
 * import's id, so it is updated rather than repeated.
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
  if (link && classId) rememberSeen(classId, drafts.flatMap((d) => (d.uid ? [d.uid] : [])));

  const picked = drafts.filter((d) => d.include);
  const adopt = picked.flatMap((d) => {
    const prev = d.uid ? prevOf(mine(read(), profileId), d) : undefined;
    return prev && !prev.uid ? [[prev.id, d.uid!] as const] : [];
  });
  if (adopt.length)
    update((s) => {
      for (const [id, uid] of adopt) {
        const e = s.events.find((x) => x.id === id);
        if (e) e.uid = uid;
      }
    });

  const events = mine(read(), profileId);
  const byUid = (d: Draft) => (d.uid ? events.find((e) => e.uid === d.uid) : undefined);
  const chosen = picked.map((d) => (link && classId ? { ...d, classId: byUid(d)?.classId ?? classId } : d));
  const same = (d: Draft) => {
    const e = byUid(d);
    return !!e && e.title === tidy(d.title) && e.date === d.date && (e.time ?? "") === (d.time ?? "") && e.kind === d.kind && e.classId === (d.classId ?? e.classId) && e.skillIds.join() === (d.skillIds.length ? d.skillIds : e.skillIds).join();
  };
  const changed = chosen.filter((d) => !same(d));
  const { added, updated } = importDrafts(profileId, changed, source);
  return { added, updated, unchanged: chosen.length - changed.length, classId };
}

export type RefreshResult = { classId: string; name: string } & (
  | {
      ok: true;
      /** Items already on the calendar that the school moved or renamed (updated in place). */
      updated: number;
      unchanged: number;
      /** New on the school calendar: not saved until the family reviews them. */
      fresh: Draft[];
      /** Coming items from this calendar that the school has taken off it (left on ours). */
      gone: string[];
    }
  | { ok: false; error: FeedErrorCode }
);

/**
 * Re-reads one class's calendar link. Items already on the calendar follow the school's changes in
 * place (by UID; the family's type, skills and class stay). New items come back for review instead of
 * being saved, and items the family left out or deleted before stay out. Nothing is deleted: items the
 * school took off its calendar are named so the family can decide.
 */
export async function refreshClass(profileId: string, classId: string, today: string): Promise<RefreshResult> {
  const cls = classesOf(read(), profileId).find((c) => c.id === classId) as FeedClass | undefined;
  if (!cls?.feedUrl) return { classId, name: cls?.name ?? "", ok: false, error: "url" };
  const got = await fetchCalendar(cls.feedUrl);
  if (!got.ok) return { classId, name: cls.name, ok: false, error: got.error };
  const s = read();
  const drafts = icsDrafts(s, profileId, got.text, today, classId);
  const here = drafts.filter((d) => onCalendar(s, profileId, d));
  const fresh = drafts.filter((d) => d.include && !onCalendar(s, profileId, d));
  const r = saveImport(profileId, here, "ics");
  const inFeed = feedUids(got.text);
  const seen = new Set(cls.seenUids ?? []);
  const events = eventsOf(read(), profileId);
  const gone = events.filter((e) => !!e.uid && seen.has(e.uid) && !inFeed.has(e.uid) && e.date >= today && !e.done).map((e) => e.title);
  // What is remembered stays as long as the school's calendar or ours still has it.
  rememberSeen(classId, here.map((d) => d.uid!), new Set([...inFeed, ...events.flatMap((e) => (e.uid ? [e.uid] : []))]));
  return { classId, name: cls.name, ok: true, updated: r.updated, unchanged: r.unchanged, fresh, gone };
}

export const linkedClasses = (s: StoreState, profileId: string): SchoolClass[] => classesOf(s, profileId).filter((c) => c.feedUrl);

/** Refreshes every linked class calendar for a learner, one after another. */
export async function refreshAll(profileId: string, today: string): Promise<RefreshResult[]> {
  const out: RefreshResult[] = [];
  for (const c of linkedClasses(read(), profileId)) out.push(await refreshClass(profileId, c.id, today));
  return out;
}

/** Forgets a class's calendar link and what it had shown; its items stay. */
export function unlinkCalendar(classId: string) {
  updateClass(classId, { feedUrl: undefined });
  update((s) => {
    const c = feedClass(s, classId);
    if (c) delete c.seenUids;
  });
}

/** The family's own calendar file: school items from a week ago on, for a phone or family calendar. */
export function calendarFile(s: StoreState, p: Profile, today: string): { name: string; text: string; count: number } {
  const events = eventsOf(s, p.id).filter((e) => e.date >= addDays(today, -7));
  const slug = p.nickname.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
  return { name: `kaizenedu-${slug}.ics`, text: toIcs(events, `KaizenEDU · ${p.nickname}`), count: events.length };
}
