import type { Key } from "@/i18n/en";
import type { ActivityEvent, Course } from "@/lib/types";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { PlanDone, ReadingEntry, SchoolEvent, SchoolResult } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import { isSecure, RULES, skillStatus } from "./engine";
import type { TeachingProfile } from "./profile";
import type { Attempt, PracticeSet, TeachingAct } from "./types";

// The improvement loop: every teaching act said what it meant to do; this works out, from later
// evidence only, whether that happened. Pure — the record and `now` in, outcomes out. Nothing here
// writes to the record; the backend will persist outcomes from the same rules.

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const OUTCOME_RULES = {
  /** A tutor conversation is judged by the learner's next answer on its skill within this long. */
  tutorMs: DAY,
  /** An act still waiting for the evidence that would decide it after this long is left out. */
  staleMs: 7 * DAY,
  /** An unfinished set with no answer for this long is closed (left, not paused). */
  closedMs: 12 * HOUR,
  /** A practice set moves its skill when the level rises or the skill is ready within this many sets. */
  moveSets: 3,
  /** A suggestion to a grown-up counts when its action happens within this long. */
  nudgeMs: 7 * DAY,
  /** A lesson left unfinished this long is judged on what was answered. */
  lessonMs: 14 * DAY,
  /** A course with no lesson activity this long has stalled. */
  courseIdleMs: 30 * DAY,
  /** A lesson's checks pass at the same share as a check: 4 of 5 right on the learner's own. */
  lessonPass: RULES.checkPass / RULES.checkSize,
};

/**
 * met / missed: the evidence decided it. pending: the evidence isn't in yet. void: the evidence that
 * would decide it can no longer come (help on the last problem of a set, a practice set on a skill
 * that was already ready, a suggestion about a test that was deleted); left out of every count.
 */
export type Status = "met" | "missed" | "pending" | "void";

export type ResolvedAct = TeachingAct & {
  status: Status;
  resolvedAt?: number;
  /** What decided it, when it is a count: check answers right on own, linked skills secure, lesson checks on own. */
  score?: { n: number; of: number };
  /** A school result for a test, entered by a grown-up. Shown beside the outcome, never part of it. */
  school?: { score: number; outOf: number };
  /** The test, lesson or course title, for sentences. */
  about?: string;
};

/** Decided either way: the only acts any count reads. */
export const decided = (a: Pick<ResolvedAct, "status">) => a.status === "met" || a.status === "missed";

/** The parts of the record outcomes read. StoreState fits it. */
export type OutcomeRecord = {
  attempts: Attempt[];
  sets: PracticeSet[];
  activity?: ActivityEvent[];
  courses?: Course[];
  events?: SchoolEvent[];
  results?: SchoolResult[];
  planDone?: PlanDone[];
  reading?: ReadingEntry[];
};

type Index = ReturnType<typeof indexOf>;
type Judged = Pick<ResolvedAct, "status" | "resolvedAt" | "score" | "school" | "about">;

const PENDING: Judged = { status: "pending" };
const VOID: Judged = { status: "void" };
const byTime = <T extends { at: number }>(list: T[]) => [...list].sort((a, b) => a.at - b.at);
const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => (m.get(k) ?? m.set(k, []).get(k)!).push(v);
const ownRight = (a: Attempt) => a.correct && !a.assisted;
const startOfDay = (date: string) => fromLocalDate(date).setHours(0, 0, 0, 0);
const endOfDay = (date: string) => {
  const d = fromLocalDate(date);
  d.setDate(d.getDate() + 1);
  return d.setHours(0, 0, 0, 0);
};

function indexOf(r: OutcomeRecord) {
  const answersBySkill = new Map<string, Attempt[]>(); // profile|skill → answers (no tutor help rows)
  const allBySkill = new Map<string, Attempt[]>(); // profile|skill → answers and tutor help rows
  const bySet = new Map<string, Attempt[]>();
  for (const a of byTime(r.attempts)) {
    push(allBySkill, `${a.profileId}|${a.skillId}`, a);
    if (a.mode === "tutor") continue;
    push(answersBySkill, `${a.profileId}|${a.skillId}`, a);
    if (a.setId) push(bySet, `${a.profileId}|${a.setId}`, a);
  }
  return { r, answersBySkill, allBySkill, bySet, sets: new Map(r.sets.map((s) => [s.id, s])) };
}

/** Each act with its outcome: met, missed, pending while the evidence isn't in yet, or void. */
export function resolveActs(acts: TeachingAct[], record: OutcomeRecord, now: number): ResolvedAct[] {
  const ix = indexOf(record);
  return acts.map((act) => {
    // An outcome already on the act (from the backend) is the record; keep it.
    if (act.outcome) return { ...act, status: act.outcome, resolvedAt: act.resolvedAt };
    return { ...act, ...resolve(act, ix, now) };
  });
}

function resolve(act: TeachingAct, ix: Index, now: number): Judged {
  switch (act.intent) {
    case "next-try-right":
      return nextTryRight(act, ix, now);
    case "skill-moves":
      return skillMoves(act, ix, now);
    case "check-decides":
      return checkDecides(act, ix, now);
    case "test-goes-well":
      return testGoesWell(act, ix, now);
    case "lesson-checks-pass":
      return lessonChecksPass(act, ix, now);
    case "plan-line-done":
      return planLineDone(act, ix, now);
    case "parent-acts":
      return parentActs(act, ix, now);
    case "course-finished":
      return courseFinished(act, ix, now);
  }
}

const judged = (a: Attempt): Judged => ({ status: ownRight(a) ? "met" : "missed", resolvedAt: a.at });

const setClosed = (set: PracticeSet | undefined, answers: Attempt[], now: number) =>
  !!set?.finishedAt || (answers.length > 0 && now - answers.at(-1)!.at > OUTCOME_RULES.closedMs);

/**
 * Hint, worked steps, similar problem → the next problem on that skill in that set is right on the
 * learner's own. The helped problem itself is marked helped, so the one after it decides; help on the
 * last problem on the skill in a set has nothing to show it and is left out (void).
 *
 * A tutor conversation → the learner's next answer on its skill within a day. A talk beside a problem
 * is about that problem, and the problem's own answer is helped by the talk, so it is skipped and the
 * next one decides. The problem is known from the tutor help row the drawer records when it opens on
 * it (same skill and seed, in the day before the talk or after it), or from the act itself (`setId`,
 * and the seed in `detail`).
 */
function nextTryRight(act: TeachingAct, ix: Index, now: number): Judged {
  const set = act.setId ? ix.sets.get(act.setId) : undefined;
  const slot = act.kind !== "tutor" && set && act.ref !== undefined && /^\d+$/.test(act.ref) ? set.slots[Number(act.ref)] : undefined;
  const skillId = act.skillId ?? slot?.skillId;
  if (!skillId) return PENDING;
  const answers = ix.answersBySkill.get(`${act.profileId}|${skillId}`) ?? [];

  if (act.kind === "tutor" || !act.setId) {
    const until = act.at + OUTCOME_RULES.tutorMs;
    const seed = act.kind === "tutor" && /^\d+$/.test(act.detail ?? "") ? Number(act.detail) : undefined;
    const drawer =
      act.kind === "tutor" ? (ix.allBySkill.get(`${act.profileId}|${skillId}`) ?? []).filter((a) => a.mode === "tutor" && a.at >= act.at - OUTCOME_RULES.tutorMs && a.at <= until) : [];
    const helped = (a: Attempt) => (seed !== undefined && a.seed === seed && (!act.setId || a.setId === act.setId)) || drawer.some((d) => d.seed === a.seed && d.at <= a.at);
    const next = answers.find((a) => a.at > act.at && a.at <= until && !helped(a));
    if (next) return judged(next);
    return now > until ? VOID : PENDING;
  }

  const inSet = ix.bySet.get(`${act.profileId}|${act.setId}`) ?? [];
  const closed = setClosed(set, inSet, now) || now - act.at > OUTCOME_RULES.staleMs;
  const helped = slot ? inSet.find((a) => a.seed === slot.seed && a.skillId === slot.skillId) : inSet.find((a) => a.skillId === skillId && a.at >= act.at);
  if (!helped) return closed ? VOID : PENDING;
  const later = inSet.slice(inSet.indexOf(helped) + 1).find((a) => a.skillId === skillId);
  if (later) return judged(later);
  return closed ? VOID : PENDING;
}

/**
 * Practice set → the skill's level rises, or it becomes ready for a check, within the next three sets
 * on it. A set on a skill that was already ready or proved (a review) has nothing to move: void.
 */
function skillMoves(act: TeachingAct, ix: Index, now: number): Judged {
  const skillId = act.skillId ?? (act.setId ? ix.sets.get(act.setId)?.skillId : undefined);
  if (!skillId || !getSkill(skillId)) return PENDING;
  const mine = ix.allBySkill.get(`${act.profileId}|${skillId}`) ?? [];
  const before = skillStatus(skillId, mine.filter((a) => a.at < act.at), act.at);
  if (isSecure(before)) return VOID;
  const order: string[] = [];
  for (const a of mine) if (a.mode !== "tutor" && a.setId && a.at >= act.at && !order.includes(a.setId)) order.push(a.setId);
  for (const [i, setId] of order.slice(0, OUTCOME_RULES.moveSets).entries()) {
    const end = Math.max(...mine.filter((a) => a.setId === setId).map((a) => a.at));
    const after = skillStatus(skillId, mine.filter((a) => a.at <= end), end);
    if (after.level > before.level || isSecure(after)) return { status: "met", resolvedAt: end };
    if (i === OUTCOME_RULES.moveSets - 1 && setClosed(ix.sets.get(setId), ix.bySet.get(`${act.profileId}|${setId}`) ?? [], now)) return { status: "missed", resolvedAt: end };
  }
  return PENDING;
}

/**
 * Check → passed (met) or not yet (missed) once all its problems are answered. A check left partway
 * is not passed (missed, scored on what was answered); one opened and never answered is void.
 */
function checkDecides(act: TeachingAct, ix: Index, now: number): Judged {
  const answers = act.setId ? (ix.bySet.get(`${act.profileId}|${act.setId}`) ?? []) : [];
  const own = answers.filter(ownRight).length;
  if (answers.length >= RULES.checkSize) return { status: own >= RULES.checkPass ? "met" : "missed", resolvedAt: answers.at(-1)!.at, score: { n: own, of: answers.length } };
  if (answers.length && setClosed(act.setId ? ix.sets.get(act.setId) : undefined, answers, now)) return { status: "missed", resolvedAt: answers.at(-1)!.at, score: { n: own, of: answers.length } };
  if (!answers.length && now - act.at > OUTCOME_RULES.closedMs) return VOID;
  return PENDING;
}

/**
 * Prep before a school test → every linked skill secure going into the test day: ready, checked or
 * proved. A proved skill that needs a refresh has slipped since, so it is not secure for the test.
 */
function testGoesWell(act: TeachingAct, ix: Index, now: number): Judged {
  const event = ix.r.events?.find((e) => e.id === act.ref && e.profileId === act.profileId);
  if (!event) return PENDING;
  const linked = event.skillIds.filter((id) => getSkill(id));
  const school = ix.r.results?.find((r) => r.profileId === act.profileId && r.date === event.date && (same(r.title, event.title) || (!!event.classId && r.classId === event.classId)));
  const base = { about: event.title, school: school && { score: school.score, outOf: school.outOf } };
  const start = startOfDay(event.date);
  if (!linked.length || now < start) return { ...PENDING, ...base };
  const holding = (id: string) => {
    const s = skillStatus(id, (ix.allBySkill.get(`${act.profileId}|${id}`) ?? []).filter((a) => a.at < start), start);
    return isSecure(s) && s.state !== "refresh";
  };
  const secure = linked.filter(holding).length;
  return { ...base, status: secure === linked.length ? "met" : "missed", resolvedAt: start, score: { n: secure, of: linked.length } };
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Lesson → at least 4 of every 5 of its checks right on the learner's own. */
function lessonChecksPass(act: TeachingAct, ix: Index, now: number): Judged {
  const cut = act.ref?.indexOf("/") ?? -1;
  if (!act.ref || cut < 1) return PENDING;
  const courseId = act.ref.slice(0, cut), lessonId = act.ref.slice(cut + 1);
  const events = byTime((ix.r.activity ?? []).filter((e) => e.profileId === act.profileId && e.courseId === courseId && e.lessonId === lessonId && e.at >= act.at));
  const completed = events.find((e) => e.type === "lesson_completed");
  const own = new Map<string, boolean>();
  for (const e of events) {
    if (completed && e.at > completed.at) break;
    if (e.type === "quiz_answered" && e.sceneId) own.set(e.sceneId, own.get(e.sceneId) || (!!e.correct && !e.assisted));
  }
  const lesson = ix.r.courses?.find((c) => c.id === courseId)?.lessons.find((l) => l.id === lessonId);
  const expected = lesson ? lesson.scenes.reduce((n, s) => n + (s.kind === "quiz" ? s.questions.length : s.kind === "interactive" ? 1 : 0), 0) : own.size;
  const of = Math.max(expected, own.size);
  const n = [...own.values()].filter(Boolean).length;
  const verdict = (at: number): Judged => ({ status: of === 0 || n / of >= OUTCOME_RULES.lessonPass ? "met" : "missed", resolvedAt: at, score: { n, of }, about: lesson?.title });
  if (completed) return verdict(completed.at);
  const answered = events.filter((e) => e.type === "quiz_answered");
  if (expected > 0 && own.size >= expected) return verdict(answered.at(-1)!.at);
  if (now - act.at > OUTCOME_RULES.lessonMs) return { ...verdict(act.at + OUTCOME_RULES.lessonMs), status: "missed" };
  return { ...PENDING, about: lesson?.title };
}

/** Plan line ("<date>:<key>") → done that day: marked done, its set finished, or its lesson finished. */
function planLineDone(act: TeachingAct, ix: Index, now: number): Judged {
  const date = act.ref?.slice(0, 10) ?? "";
  const key = act.ref?.slice(11) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || act.ref?.[10] !== ":" || !key) return PENDING;
  const marked = ix.r.planDone?.find((d) => d.profileId === act.profileId && d.date === date && d.key === key);
  if (marked) return { status: "met", resolvedAt: marked.at };
  const set = ix.r.sets.find((s) => s.profileId === act.profileId && s.planKey === act.ref && s.finishedAt && localDate(s.finishedAt) === date);
  if (set) return { status: "met", resolvedAt: set.finishedAt };
  if (key.startsWith("lesson:")) {
    const [, courseId, lessonId] = key.split(":");
    const done = ix.r.activity?.find((e) => e.profileId === act.profileId && e.type === "lesson_completed" && e.courseId === courseId && e.lessonId === lessonId && localDate(e.at) === date);
    if (done) return { status: "met", resolvedAt: done.at };
  }
  const end = endOfDay(date);
  return now >= end ? { status: "missed", resolvedAt: end } : PENDING;
}

// ----- suggestions to a grown-up -----

export type NudgeKind = "check" | "stuck" | "prep" | "idle";
const NUDGE_KINDS: NudgeKind[] = ["check", "stuck", "prep", "idle"];
export type NudgeRef = { kind: NudgeKind; skillId?: string; eventId?: string };

/** The key a suggestion to a grown-up is logged under, e.g. "check:m.round", "prep:<event id>", "idle". */
export const nudgeKey = (kind: NudgeKind, id?: string) => (id ? `${kind}:${id}` : kind);

/**
 * Reads a suggestion's key. The kind comes from the act's `detail` when it names one (lib/nudges.ts
 * logs it there); otherwise from the key's first word, tolerantly. null: the skill or test it is about
 * is not on the record (deleted, or never was), so whether it was acted on can't be known.
 */
export function parseNudge(ref: string, events: SchoolEvent[] = [], kind?: string, skillId?: string): NudgeRef | null {
  const parts = ref.split(/[:/|]/);
  const head = parts[0].toLowerCase();
  const skill = (skillId && getSkill(skillId) ? skillId : undefined) ?? parts.find((p) => getSkill(p));
  const known = parts.find((p) => events.some((e) => e.id === p));
  const k = NUDGE_KINDS.find((x) => x === kind) ?? (/stuck|hard/.test(head) ? "stuck" : /check|overdue|waiting|ready/.test(head) ? "check" : /prep|test|quiz/.test(head) ? "prep" : /idle|quiet|nothing/.test(head) ? "idle" : undefined);
  if (k === "stuck" || k === "check") return skill ? { kind: k, skillId: skill } : null;
  // A prep suggestion keeps its event id even after the test is deleted: prep done before that still counts.
  if (k === "prep") return known || parts[1] ? { kind: "prep", eventId: known ?? parts[1] } : null;
  if (k === "idle") return { kind: "idle" };
  if (known) return { kind: "prep", eventId: known };
  if (skill) return { kind: "check", skillId: skill };
  return null;
}

/** Suggestion to a grown-up → its action happened within a week. */
function parentActs(act: TeachingAct, ix: Index, now: number): Judged {
  const n = parseNudge(act.ref ?? "", ix.r.events, act.detail, act.skillId);
  if (!n) return VOID;
  const until = act.at + OUTCOME_RULES.nudgeMs;
  const inWindow = (t: number) => t > act.at && t <= until;
  const first = (times: number[]) => times.filter(inWindow).sort((a, b) => a - b)[0];
  let at: number | undefined;
  if (n.kind === "check") at = first((ix.answersBySkill.get(`${act.profileId}|${n.skillId}`) ?? []).filter((a) => a.mode === "check").map((a) => a.at));
  else if (n.kind === "stuck") {
    const mine = ix.allBySkill.get(`${act.profileId}|${n.skillId}`) ?? [];
    // The tutor helped on it, or new work shows it is no longer stuck.
    at = first(mine.filter((a) => a.mode === "tutor").map((a) => a.at));
    for (const a of mine) {
      if (at !== undefined && a.at >= at) break;
      if (a.mode === "tutor" || !inWindow(a.at)) continue;
      if (!skillStatus(n.skillId!, mine.filter((x) => x.at <= a.at), a.at).stuck) {
        at = a.at;
        break;
      }
    }
  } else if (n.kind === "prep") {
    const prepSets = new Set(ix.r.sets.filter((s) => s.profileId === act.profileId && s.eventId === n.eventId).map((s) => s.id));
    at = first([...prepSets].flatMap((id) => (ix.bySet.get(`${act.profileId}|${id}`) ?? []).map((a) => a.at)));
    if (at === undefined && !ix.r.events?.some((e) => e.id === n.eventId && e.profileId === act.profileId)) return VOID;
  } else {
    const day = localDate(act.at);
    const reading = (ix.r.reading ?? []).filter((r) => r.profileId === act.profileId && r.date >= day && r.date <= localDate(until));
    at = first([
      ...ix.r.attempts.filter((a) => a.profileId === act.profileId && a.mode !== "tutor").map((a) => a.at),
      ...(ix.r.activity ?? []).filter((e) => e.profileId === act.profileId && e.type !== "course_added").map((e) => e.at),
      ...reading.map((r) => Math.max(act.at + 1, fromLocalDate(r.date).getTime())),
    ]);
  }
  if (at !== undefined) return { status: "met", resolvedAt: at };
  return now > until ? { status: "missed", resolvedAt: until } : PENDING;
}

/** Course built or added → every lesson finished. Stalls (missed) after a month with no lesson activity. */
function courseFinished(act: TeachingAct, ix: Index, now: number): Judged {
  const course = ix.r.courses?.find((c) => c.id === act.ref && c.profileId === act.profileId);
  if (!course || !course.lessons.length) return PENDING;
  const events = (ix.r.activity ?? []).filter((e) => e.profileId === act.profileId && e.courseId === course.id);
  const doneAt = course.lessons.map((l) => events.find((e) => e.type === "lesson_completed" && e.lessonId === l.id)?.at);
  const about = course.title;
  if (doneAt.every((t) => t !== undefined)) return { status: "met", resolvedAt: Math.max(...(doneAt as number[])), about };
  const lastTouch = Math.max(act.at, ...events.map((e) => e.at));
  if (now - lastTouch > OUTCOME_RULES.courseIdleMs) return { status: "missed", resolvedAt: lastTouch + OUTCOME_RULES.courseIdleMs, about };
  return { ...PENDING, about };
}

// ----- "Is it working?" -----

/**
 * A sentence for a grown-up: an i18n key and its values. A value can be a key to translate, a
 * misconception tag, skill ids (titles in the reader's language), or a list of sentences to join.
 */
export type Sentence = { key: Key; vars?: Record<string, SentenceVar> };
export type SentenceVar = string | number | { key: Key } | { tag: string } | { skills: string[] } | { list: Sentence[] };

/** The window "Is it working?" reads, and the half-window the hint trend compares. */
export const WORKING_DAYS = 14;

type Count = { n: number; of: number };
const count = (list: ResolvedAct[]): Count => ({ n: list.filter((a) => a.status === "met").length, of: list.filter(decided).length });

/** Help on one problem in a set, whatever mix of hints and examples it took; "example" if any was a worked example. */
export function helpedProblems(resolved: ResolvedAct[]) {
  const by = new Map<string, { kind: "hint" | "example"; act: ResolvedAct; rung: number }>();
  for (const a of resolved) {
    if (!a.setId || (a.kind !== "hint" && a.kind !== "steps" && a.kind !== "similar")) continue;
    const key = `${a.setId}:${a.ref ?? a.skillId}`;
    const prev = by.get(key);
    const kind = a.kind === "hint" && prev?.kind !== "example" ? "hint" : "example";
    const rung = Math.max(prev?.rung ?? 0, a.kind === "hint" ? Number(a.detail) || 1 : 0);
    // Every act on one problem shares its outcome; keep a decided one.
    by.set(key, { kind, rung, act: prev && decided(prev.act) ? prev.act : a });
  }
  return [...by.values()];
}

const latestPer = (list: ResolvedAct[]) => {
  const by = new Map<string, ResolvedAct>();
  for (const a of list) {
    const prev = by.get(a.ref ?? a.id);
    if (!prev || (a.resolvedAt ?? 0) > (prev.resolvedAt ?? 0)) by.set(a.ref ?? a.id, a);
  }
  return [...by.values()];
};

/**
 * "Is it working?" in plain sentences, from outcomes decided in the last two weeks. Each sentence is
 * a count from the record; after the help counts, what to start with when they're stuck.
 */
export function isItWorking(resolved: ResolvedAct[], profile: TeachingProfile, now: number): Sentence[] {
  const from = now - WORKING_DAYS * DAY, mid = now - (WORKING_DAYS / 2) * DAY;
  const recent = resolved.filter((a) => decided(a) && (a.resolvedAt ?? 0) >= from && (a.resolvedAt ?? 0) <= now);
  const out: Sentence[] = [];
  const of = (intent: TeachingAct["intent"]) => recent.filter((a) => a.intent === intent);

  const problems = helpedProblems(recent);
  const hint = count(problems.filter((p) => p.kind === "hint").map((p) => p.act));
  const example = count(problems.filter((p) => p.kind === "example").map((p) => p.act));
  if (hint.of && example.of) out.push({ key: "lm.work.help.both", vars: { h: hint.n, hn: hint.of, e: example.n, en: example.of } });
  else if (hint.of) out.push({ key: "lm.work.help.hint", vars: { h: hint.n, hn: hint.of } });
  else if (example.of) out.push({ key: "lm.work.help.example", vars: { e: example.n, en: example.of } });
  const hints = problems.filter((p) => p.kind === "hint").map((p) => p.act);
  const late = count(hints.filter((a) => a.resolvedAt! >= mid)), early = count(hints.filter((a) => a.resolvedAt! < mid));
  if (late.of >= 3 && early.of >= 3) {
    const change = late.n / late.of - early.n / early.of;
    if (change <= -0.25) out.push({ key: "lm.work.help.less" });
    else if (change >= 0.25) out.push({ key: "lm.work.help.more" });
  }
  const lead = profile.leadWith.value;
  if (lead && (hint.of || example.of)) {
    const what = { key: lead === "example" ? "lm.lead.example" : "lm.lead.hint" } as const;
    out.push({ key: profile.leadWith.source === "grown-up" ? "lm.work.start.set" : "lm.work.start", vars: { what } });
  }

  const tutor = count(of("next-try-right").filter((a) => a.kind === "tutor"));
  if (tutor.of) out.push({ key: "lm.work.tutor", vars: { n: tutor.n, total: tutor.of } });
  const sets = count(of("skill-moves"));
  if (sets.of) out.push({ key: "lm.work.sets", vars: { n: sets.n, total: sets.of } });
  const checks = count(of("check-decides"));
  if (checks.of) out.push({ key: "lm.work.checks", vars: { n: checks.n, total: checks.of } });

  for (const a of latestPer(of("test-goes-well")).sort((x, y) => y.resolvedAt! - x.resolvedAt!).slice(0, 3)) {
    const title = a.about ?? "";
    out.push(a.status === "met" ? { key: "lm.work.test.ready", vars: { title } } : { key: "lm.work.test.notReady", vars: { title, n: a.score?.n ?? 0, total: a.score?.of ?? 0 } });
    if (a.school) out.push({ key: "lm.work.test.school", vars: { title, score: a.school.score, outOf: a.school.outOf } });
  }

  const lessons = count(latestPer(of("lesson-checks-pass")).filter((a) => a.score?.of));
  if (lessons.of) out.push({ key: "lm.work.lessons", vars: { n: lessons.n, total: lessons.of } });
  const plan = count(of("plan-line-done"));
  if (plan.of) out.push({ key: "lm.work.plan", vars: { n: plan.n, total: plan.of } });
  const nudges = count(latestPer(of("parent-acts")));
  if (nudges.of) out.push({ key: "lm.work.nudges", vars: { n: nudges.n, total: nudges.of } });
  const courses = count(latestPer(of("course-finished")));
  if (courses.of) out.push({ key: courses.n === courses.of ? "lm.work.courses.all" : "lm.work.courses", vars: { n: courses.n, total: courses.of } });
  return out;
}
