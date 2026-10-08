import type { ActivityEvent, Course, Locale, Profile, TeachingPrefs } from "@/lib/types";
import type { SchoolResult } from "@/planner/types";
import { getSkill, makeItem, standardsOf } from "@/practice/skills";
import type { Item } from "@/practice/types";
import type { Statuses } from "./engine";
import { decided, helpedProblems, OUTCOME_RULES, resolveActs, type ResolvedAct, type Sentence } from "./outcomes";
import type { Attempt, PracticeSet, TeachingAct } from "./types";

// The learner model: what this learner has verifiably learned, and how they learn — each teaching
// fact computed from their own record with the evidence count behind it. A grown-up's choice
// (Profile.teaching) overrides a derived value and says so, and a grown-up can turn the whole
// teaching profile off. Pure: record and `now` in, facts out. Used to teach (the tutor, the parent's
// page); never for engagement, ranking or anyone else.

export type Representation = NonNullable<TeachingPrefs["representation"]>;
export const REPRESENTATIONS: Representation[] = ["pictures", "number-line", "blocks", "words"];

/**
 * A grown-up's edits to the teaching profile. `off`: they turned it off, so nothing is worked out
 * and nothing goes to the tutor. (Stored in Profile.teaching; lib/types.ts TeachingPrefs gains `off`.)
 */
export type TeachingEdits = TeachingPrefs & { off?: true };

export type Fact<V> = {
  /** null: not enough evidence yet, or no clear answer in it (and no grown-up's choice). */
  value: V | null;
  /** True once there is enough evidence to say anything. */
  enough: boolean;
  /** How many problems, answers or sets the fact rests on. */
  evidence: number;
  source: "record" | "grown-up" | "settings";
  /** What the record shows, in plain sentences. Kept when a grown-up's choice overrides the value. */
  says: Sentence[];
  /** What the record alone suggests, when a grown-up's choice overrides it. */
  derived?: V | null;
};

export type Misconception = { tag: string; count: number; sets: number; skillIds: string[]; example?: string };
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type Rung = 1 | 2 | 3;

export type TeachingProfile = {
  /** A grown-up turned the teaching profile off: every fact is empty and the tutor gets none of it. */
  off?: boolean;
  /** The hint rung (1 nudge · 2 strategy · 3 first step) to start at. `solved`: problems solved after hints, by the last rung they needed. */
  hintRung: Fact<Rung> & { solved: [number, number, number] };
  /** Whether a worked example or a hint more often leads to the next problem right on their own. */
  leadWith: Fact<"hint" | "example">;
  /** The kind of picture that lands best (right on their own most often) at the first level of a skill. */
  representation: Fact<Representation>;
  pace: Fact<"quicker" | "usual" | "slower">;
  sessions: Fact<"finishes" | "stops-early">;
  /** Mistakes (tagged wrong answers) that came back in more than one set. */
  misconceptions: Fact<Misconception[]>;
  timeOfDay: Fact<TimeOfDay>;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: Fact<number>;
  language: Fact<{ locale: Locale; readAloud: boolean; mic: boolean }>;
  /** A grown-up's note for the tutor. Goes to a model only with names scrubbed. */
  note?: string;
};

/** Minimum evidence before a fact says anything, and the margins that count as a real difference. */
export const PROFILE_RULES = {
  hintProblems: 4,
  /** Hints start at the highest rung that at most this share of solved problems needed less than. */
  hintBelow: 0.25,
  leadEach: 3,
  leadMargin: 0.15,
  reprEach: 5,
  reprMargin: 0.1,
  reprRecent: 300,
  pace: 10,
  paceRecent: 40,
  /** The same bounds as a finished set's pace words (lib/practice paceOf), so the two never disagree. */
  paceQuick: 0.75,
  paceSlow: 1.35,
  sessions: 4,
  stopsShare: 0.3,
  shortSet: 6,
  whyMin: 3,
  whySets: 2,
  timeEach: 15,
  dayEach: 10,
  timeMargin: 0.15,
};

export type ProfileInput = {
  /** This learner's evidence. */
  attempts: Attempt[];
  acts: TeachingAct[];
  sets: PracticeSet[];
  prefs?: TeachingEdits;
  learner?: Pick<Profile, "locale" | "grade" | "settings">;
  /** Outcomes already resolved for `acts`, to avoid resolving twice. */
  resolved?: ResolvedAct[];
};

/**
 * Answers that show how they learn: not tutor help rows, and not placement, which goes on until a
 * miss by design and so would make whatever it showed look harder than it is.
 */
const answersOf = (attempts: Attempt[]) => attempts.filter((a) => a.mode !== "tutor" && a.mode !== "placement").sort((a, b) => a.at - b.at);
const ownRight = (a: Attempt) => a.correct && !a.assisted;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const item = (a: Pick<Attempt, "skillId" | "level" | "seed">, locale: Locale): Item | null => (getSkill(a.skillId) ? makeItem(a.skillId, a.level, a.seed, locale) : null);
const notYet = <V>(key: Sentence["key"], n: number, min: number, evidence = n): Fact<V> => ({ value: null, enough: false, evidence, source: "record", says: [{ key, vars: { n, min } }] });
const empty = <V>(): Fact<V> => ({ value: null, enough: false, evidence: 0, source: "record", says: [] });

/** How this learner learns, from their record, with a grown-up's choices on top. */
export function teachingProfile(input: ProfileInput, now: number): TeachingProfile {
  const prefs = input.prefs ?? {};
  if (prefs.off) return offProfile();
  const locale = input.learner?.locale ?? "en";
  const answers = answersOf(input.attempts);
  const resolved = input.resolved ?? resolveActs(input.acts, { attempts: input.attempts, sets: input.sets }, now);
  return {
    hintRung: hintRung(resolved, input.sets, answers),
    leadWith: override(leadWith(resolved), prefs.leadWith),
    representation: override(representation(answers, locale), prefs.representation),
    pace: pace(answers, locale),
    sessions: sessions(input.sets, answers, now),
    misconceptions: misconceptions(answers),
    timeOfDay: timeOfDay(answers),
    weekday: weekday(answers),
    language: language(input.learner),
    note: prefs.note?.trim() || undefined,
  };
}

function offProfile(): TeachingProfile {
  return {
    off: true,
    hintRung: { ...empty<Rung>(), solved: [0, 0, 0] },
    leadWith: empty(),
    representation: empty(),
    pace: empty(),
    sessions: empty(),
    misconceptions: empty(),
    timeOfDay: empty(),
    weekday: empty(),
    language: empty(),
  };
}

function override<V>(fact: Fact<V>, pref: V | undefined): Fact<V> {
  if (pref === undefined) return fact;
  return { ...fact, value: pref, enough: true, source: "grown-up", derived: fact.value };
}

/**
 * Hint acts followed by a right answer on the same problem, by the last rung that problem needed.
 * Hints start at the highest rung that few solved problems (at most a quarter) needed less than:
 * starting higher would hand over a step the learner could have found themselves.
 */
function hintRung(resolved: ResolvedAct[], sets: PracticeSet[], answers: Attempt[]): TeachingProfile["hintRung"] {
  const byId = new Map(sets.map((s) => [s.id, s]));
  const bySlot = new Map(answers.filter((a) => a.setId).map((a) => [`${a.setId}|${a.skillId}|${a.seed}`, a]));
  const solved: [number, number, number] = [0, 0, 0];
  for (const p of helpedProblems(resolved)) {
    if (p.kind !== "hint" || !p.act.setId || !/^\d+$/.test(p.act.ref ?? "")) continue;
    const slot = byId.get(p.act.setId)?.slots[Number(p.act.ref)];
    const answer = slot && bySlot.get(`${p.act.setId}|${slot.skillId}|${slot.seed}`);
    if (!answer?.correct) continue;
    solved[Math.min(3, Math.max(1, p.rung)) - 1]++;
  }
  const total = solved[0] + solved[1] + solved[2];
  if (total < PROFILE_RULES.hintProblems) return { ...notYet<Rung>("lm.fact.rung.notYet", total, PROFILE_RULES.hintProblems), solved };
  const below = (r: Rung) => solved.slice(0, r - 1).reduce((n, x) => n + x, 0) / total;
  const rung = ([3, 2, 1] as const).find((r) => below(r) <= PROFILE_RULES.hintBelow)!;
  return { value: rung, enough: true, evidence: total, source: "record", solved, says: [{ key: "lm.fact.rung.counts", vars: { total, a: solved[0], b: solved[1], c: solved[2] } }] };
}

/** After help on a problem, was the next problem right on their own — for hints, and for worked examples. */
function leadWith(resolved: ResolvedAct[]): Fact<"hint" | "example"> {
  const tally = (kind: "hint" | "example") => {
    const list = helpedProblems(resolved).filter((p) => p.kind === kind && decided(p.act));
    return { n: list.filter((p) => p.act.status === "met").length, of: list.length };
  };
  const h = tally("hint"), e = tally("example");
  const vars = { h: h.n, hn: h.of, e: e.n, en: e.of };
  if (h.of < PROFILE_RULES.leadEach || e.of < PROFILE_RULES.leadEach)
    return { value: null, enough: false, evidence: h.of + e.of, source: "record", says: [{ key: "lm.fact.lead.notYet", vars: { ...vars, min: PROFILE_RULES.leadEach } }] };
  const diff = e.n / e.of - h.n / h.of;
  const value = diff >= PROFILE_RULES.leadMargin ? "example" : -diff >= PROFILE_RULES.leadMargin ? "hint" : null;
  return { value, enough: true, evidence: h.of + e.of, source: "record", says: [{ key: "lm.fact.lead.says", vars }] };
}

const BLOCKS = new Set(["dots", "ten-frame", "base-ten", "array", "fraction"]);

/** The kind of representation a problem leads with. */
export function representationOf(it: Pick<Item, "visual" | "picture" | "input">): Representation {
  const v = it.visual?.kind;
  if (v === "number-line" || it.input === "number-line") return "number-line";
  if ((v && BLOCKS.has(v)) || it.input === "fraction-bar") return "blocks";
  if (v === "column") return "words";
  if (v || it.picture || it.input === "clock") return "pictures";
  return "words";
}

/**
 * How often a problem did not land (needed help, or missed) by representation, at level 1 where the
 * picture is doing the most work. A problem solved after hints is recorded as right but helped, so
 * "right on their own" is the measure, not "right". Checks are left out: they allow no help.
 */
function representation(answers: Attempt[], locale: Locale): Fact<Representation> {
  const stats = new Map<Representation, { n: number; missed: number }>();
  let total = 0;
  for (const a of answers.filter((x) => x.level === 1 && x.mode !== "check" && getSkill(x.skillId)).slice(-PROFILE_RULES.reprRecent)) {
    const rep = representationOf(item(a, locale)!);
    const s = stats.get(rep) ?? { n: 0, missed: 0 };
    s.n++;
    if (!ownRight(a)) s.missed++;
    stats.set(rep, s);
    total++;
  }
  const ranked = [...stats.entries()]
    .filter(([, s]) => s.n >= PROFILE_RULES.reprEach)
    .sort(([, a], [, b]) => a.missed / a.n - b.missed / b.n || b.n - a.n);
  if (ranked.length < 2) return notYet("lm.fact.repr.notYet", total, PROFILE_RULES.reprEach);
  const [best, second] = ranked, worst = ranked.at(-1)!;
  const clear = second[1].missed / second[1].n - best[1].missed / best[1].n >= PROFILE_RULES.reprMargin;
  return {
    value: clear ? best[0] : null,
    enough: true,
    evidence: ranked.reduce((n, [, s]) => n + s.n, 0),
    source: "record",
    says: [{ key: "lm.fact.repr.landed", vars: { a: best[1].missed, an: best[1].n, best: { key: `lm.repr.with.${best[0]}` }, b: worst[1].missed, bn: worst[1].n, worst: { key: `lm.repr.with.${worst[0]}` } } }],
  };
}

/** Seconds a problem against its standard time (Kumon's comfortable pace), never a limit. */
function pace(answers: Attempt[], locale: Locale): Fact<"quicker" | "usual" | "slower"> {
  const rows = answers
    .filter((a) => a.seconds > 0 && getSkill(a.skillId))
    .slice(-PROFILE_RULES.paceRecent)
    .map((a) => ({ mine: a.seconds, usual: item(a, locale)!.seconds }));
  if (rows.length < PROFILE_RULES.pace) return notYet("lm.fact.pace.notYet", rows.length, PROFILE_RULES.pace);
  const ratio = median(rows.map((r) => r.mine / r.usual));
  const value = ratio < PROFILE_RULES.paceQuick ? "quicker" : ratio > PROFILE_RULES.paceSlow ? "slower" : "usual";
  return { value, enough: true, evidence: rows.length, source: "record", says: [{ key: "lm.fact.pace.says", vars: { mine: Math.round(median(rows.map((r) => r.mine))), usual: Math.round(median(rows.map((r) => r.usual))) } }] };
}

/** Sets they started: finished, or left partway (and where they stopped). */
function sessions(sets: PracticeSet[], answers: Attempt[], now: number): Fact<"finishes" | "stops-early"> {
  const bySet = new Map<string, Attempt[]>();
  for (const a of answers) if (a.setId) bySet.set(a.setId, [...(bySet.get(a.setId) ?? []), a]);
  const closed = sets
    .filter((s) => s.kind !== "check" && s.kind !== "placement" && bySet.has(s.id))
    .filter((s) => s.finishedAt || now - bySet.get(s.id)!.at(-1)!.at > OUTCOME_RULES.closedMs);
  if (closed.length < PROFILE_RULES.sessions) return notYet("lm.fact.sessions.notYet", closed.length, PROFILE_RULES.sessions);
  const left = closed.filter((s) => !s.finishedAt);
  const says: Sentence[] = [];
  const value = left.length / closed.length >= PROFILE_RULES.stopsShare ? "stops-early" : "finishes";
  if (value === "finishes") says.push({ key: "lm.fact.sessions.finishes", vars: { n: closed.length - left.length, total: closed.length } });
  else {
    const stoppedAfter = left.map((s) => bySet.get(s.id)!);
    says.push({
      key: "lm.fact.sessions.stops",
      vars: {
        n: left.length,
        total: closed.length,
        after: Math.round(median(stoppedAfter.map((l) => l.length))),
        minutes: Math.max(1, Math.round(median(stoppedAfter.map((l) => l.reduce((m, a) => m + a.seconds, 0))) / 60)),
      },
    });
  }
  const short = closed.filter((s) => s.slots.length <= PROFILE_RULES.shortSet), long = closed.filter((s) => s.slots.length > PROFILE_RULES.shortSet);
  if (short.length >= 2 && long.length >= 2)
    says.push({
      key: "lm.fact.sessions.length",
      vars: { short: PROFILE_RULES.shortSet, a: short.filter((s) => s.finishedAt).length, an: short.length, b: long.filter((s) => s.finishedAt).length, bn: long.length },
    });
  return { value, enough: true, evidence: closed.length, source: "record", says };
}

/** "added-denominators" → "added denominators". Tags are the authors' names for a mistake. */
export const tagLabel = (tag: string) => tag.replace(/[-_]+/g, " ").trim();

/** Tagged wrong answers that came back across more than one set. */
function misconceptions(answers: Attempt[]): Fact<Misconception[]> {
  const by = new Map<string, { count: number; sets: Set<string>; skills: Set<string>; example?: string }>();
  for (const a of answers) {
    if (a.correct || !a.why) continue;
    const m = by.get(a.why) ?? { count: 0, sets: new Set(), skills: new Set() };
    m.count++;
    m.sets.add(a.setId ?? a.id);
    m.skills.add(a.skillId);
    m.example = a.response ?? m.example;
    by.set(a.why, m);
  }
  const total = [...by.values()].reduce((n, m) => n + m.count, 0);
  if (total < PROFILE_RULES.whyMin) return notYet("lm.fact.why.notYet", total, PROFILE_RULES.whyMin);
  const list: Misconception[] = [...by.entries()]
    .filter(([, m]) => m.sets.size >= PROFILE_RULES.whySets)
    .sort(([, a], [, b]) => b.count - a.count || b.sets.size - a.sets.size)
    .slice(0, 3)
    .map(([tag, m]) => ({ tag, count: m.count, sets: m.sets.size, skillIds: [...m.skills], example: m.example }));
  if (!list.length) return { value: null, enough: true, evidence: total, source: "record", says: [{ key: "lm.fact.why.none", vars: { n: total } }] };
  return {
    value: list,
    enough: true,
    evidence: total,
    source: "record",
    says: list.map((m) => ({
      key: m.example ? "lm.fact.why.tagExample" : "lm.fact.why.tagRow",
      vars: { tag: { tag: m.tag }, n: m.count, sets: m.sets, skill: { skills: m.skillIds }, example: m.example ?? "" },
    })),
  };
}

const timeOf = (at: number): TimeOfDay => {
  const h = new Date(at).getHours();
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : "evening";
};

/**
 * Right-on-own rate by bucket, best first, over buckets with enough answers. A best bucket only
 * when it beats the next best clearly: a tie at the top is no answer, however poor the rest.
 */
function bestBucket<B extends string | number>(answers: Attempt[], bucket: (a: Attempt) => B, min: number) {
  const stats = new Map<B, { own: number; n: number }>();
  for (const a of answers) {
    const s = stats.get(bucket(a)) ?? { own: 0, n: 0 };
    s.n++;
    if (ownRight(a)) s.own++;
    stats.set(bucket(a), s);
  }
  const ranked = [...stats.entries()].filter(([, s]) => s.n >= min).sort(([, a], [, b]) => b.own / b.n - a.own / a.n || b.n - a.n);
  if (ranked.length < 2) return null;
  const [best, second] = ranked;
  return { ranked, clear: best[1].own / best[1].n - second[1].own / second[1].n >= PROFILE_RULES.timeMargin, evidence: ranked.reduce((n, [, s]) => n + s.n, 0) };
}

function bucketFact<B extends string | number>(r: NonNullable<ReturnType<typeof bestBucket<B>>>, when: (b: B) => Sentence["key"]): Fact<B> {
  const list = r.ranked.map(([b, s]): Sentence => ({ key: "lm.fact.when.item", vars: { a: s.own, an: s.n, when: { key: when(b) } } }));
  return { value: r.clear ? r.ranked[0][0] : null, enough: true, evidence: r.evidence, source: "record", says: [{ key: "lm.fact.when.says", vars: { list: { list } } }] };
}

function timeOfDay(answers: Attempt[]): Fact<TimeOfDay> {
  const r = bestBucket(answers, (a) => timeOf(a.at), PROFILE_RULES.timeEach);
  if (!r) return notYet("lm.fact.time.notYet", answers.length, PROFILE_RULES.timeEach);
  return bucketFact(r, (b) => `lm.time.${b}`);
}

function weekday(answers: Attempt[]): Fact<number> {
  const r = bestBucket(answers, (a) => new Date(a.at).getDay(), PROFILE_RULES.dayEach);
  if (!r) return notYet("lm.fact.day.notYet", answers.length, PROFILE_RULES.dayEach);
  return bucketFact(r, (d) => `lm.day.${d as 0 | 1 | 2 | 3 | 4 | 5 | 6}`);
}

/**
 * Language and voice, from settings: the learner's language, read-aloud (on by default for K–2),
 * the microphone. Nothing records when read-aloud or the microphone is used yet, so use isn't counted.
 */
function language(learner: ProfileInput["learner"]): TeachingProfile["language"] {
  const locale = learner?.locale ?? "en";
  const readAloud = ["K", "1", "2"].includes(learner?.grade ?? "");
  const mic = !!learner?.settings?.voiceInput;
  return {
    value: { locale, readAloud, mic },
    enough: true,
    evidence: 0,
    source: "settings",
    says: [{ key: locale === "es" ? "lm.fact.lang.es" : "lm.fact.lang.en" }, { key: readAloud ? "lm.fact.lang.readAloud" : "lm.fact.lang.readOnAsk" }, { key: mic ? "lm.fact.lang.mic" : "lm.fact.lang.noMic" }],
  };
}

// ----- verified education -----

export type Verified = {
  /** Skills proved under the mastery law, newest first, with the standards behind each (a merged skill has several). */
  proved: { skillId: string; provedAt: number; standards: string[]; refresh: boolean }[];
  /** Courses with lessons done and the lesson-check tally. */
  courses: { courseId: string; title: string; done: number; total: number; own: number; helped: number; missed: number }[];
  /** Scores from school, entered by a grown-up. Never mixed with proof. */
  school: SchoolResult[];
};

/** What the record can show they know: proof, courses with their check tallies, and school's own results, kept apart. */
export function verifiedEducation(input: { statuses: Statuses; activity: ActivityEvent[]; courses: Course[]; results: SchoolResult[] }): Verified {
  const proved = Object.values(input.statuses)
    .filter((s) => s.provedAt !== undefined && (s.state === "proved" || s.state === "refresh"))
    .map((s) => ({ skillId: s.skillId, provedAt: s.provedAt!, standards: standardsOf(getSkill(s.skillId) ?? {}), refresh: s.state === "refresh" }))
    .sort((a, b) => b.provedAt - a.provedAt);
  const courses = input.courses
    .filter((c) => c.status === "ready" && c.lessons.length)
    .map((c) => {
      const events = input.activity.filter((e) => e.courseId === c.id);
      const quiz = events.filter((e) => e.type === "quiz_answered");
      return {
        courseId: c.id,
        title: c.title,
        done: c.lessons.filter((l) => events.some((e) => e.type === "lesson_completed" && e.lessonId === l.id)).length,
        total: c.lessons.length,
        own: quiz.filter((e) => e.correct && !e.assisted).length,
        helped: quiz.filter((e) => e.correct && e.assisted).length,
        missed: quiz.filter((e) => !e.correct).length,
      };
    })
    .filter((c) => c.done || c.own + c.helped + c.missed);
  return { proved, courses, school: [...input.results].sort((a, b) => b.date.localeCompare(a.date)) };
}
