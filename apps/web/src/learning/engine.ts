import type { Grade, Subject } from "@/lib/types";
import { getSkill, gradeIndex, makeItem, skillsFor } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import type { Attempt, PracticeSet, Slot } from "./types";

// The learning engine. Every function here is pure: evidence in, decisions out, `now` passed in.
// The rules are the owner-approved mastery law from the earlier repos (Kaizen-AI engine, trellis):
// practice never proves anything; a skill is proved only by unassisted, code-checked checks on
// fresh problems, delayed after the last help, passed on two different days.

export const RULES = {
  /** Correct-on-your-own answers in a row that move a learner up a level inside a skill. */
  stepUp: 5,
  /** Misses in a row that move a learner down a level. */
  stepDown: 2,
  /** Ready for a check: at least `readyOwn` of the last `readyWindow` top-level practice answers right on your own. */
  readyWindow: 10,
  readyOwn: 9,
  /** A check opens this long after the last help on the skill… */
  helpQuietMs: 48 * 3600_000,
  /** …and not before the day after the last practice. */
  practiceQuietMs: 20 * 3600_000,
  checkSize: 5,
  checkPass: 4,
  /** The second check opens this long after the first pass. */
  secondCheckMs: 6 * 24 * 3600_000,
  /** Reviews of a proved skill, in days after proving (each successful review moves to the next). */
  reviewDays: [7, 21, 60, 120],
  /** Review misses in a row that send a proved skill to "needs a refresh". */
  refreshMisses: 2,
  /** A ready skill not checked for this long is surfaced to the grown-up ("no silent trap"). */
  overdueCheckMs: 14 * 24 * 3600_000,
  /** Three practice sets in a row under this share right-on-your-own = stuck. */
  stuckShare: 0.6,
};

const DAY = 24 * 3600_000;

export type SkillState = "new" | "practicing" | "ready" | "checked" | "proved" | "refresh";

export type SkillStatus = {
  skillId: string;
  state: SkillState;
  /** The level the next practice problem should use. */
  level: number;
  /** When the next check opens (ready, checked, refresh). */
  checkOpensAt?: number;
  provedAt?: number;
  reviewDueAt?: number;
  lastPracticeAt?: number;
  lastHelpAt?: number;
  /** A ready skill waiting too long for its check. */
  overdue: boolean;
  stuck: boolean;
  totals: { own: number; helped: number; missed: number };
};

const PRACTICE_MODES = new Set(["practice", "prep", "review"]);

/** Replays the level-stepping rule over practice answers. */
function levelFrom(attempts: Attempt[], skill: Skill) {
  let level = 1, up = 0, down = 0;
  for (const a of attempts) {
    if (!PRACTICE_MODES.has(a.mode) || a.mode === "review") continue;
    level = Math.min(Math.max(1, a.level), skill.levels);
    if (a.correct && !a.assisted) {
      up++;
      down = 0;
      if (up >= RULES.stepUp && level < skill.levels) {
        level++;
        up = 0;
      }
    } else if (!a.correct) {
      down++;
      up = 0;
      if (down >= RULES.stepDown && level > 1) {
        level--;
        down = 0;
      }
    } else up = 0;
  }
  return level;
}

/** Groups check answers by set and grades each check. */
function checksOf(attempts: Attempt[]) {
  const sets = new Map<string, Attempt[]>();
  for (const a of attempts) if (a.mode === "check") sets.set(a.setId ?? a.id, [...(sets.get(a.setId ?? a.id) ?? []), a]);
  return [...sets.values()]
    .filter((list) => list.length >= RULES.checkSize)
    .map((list) => ({
      at: Math.max(...list.map((a) => a.at)),
      passed: list.filter((a) => a.correct && !a.assisted).length >= RULES.checkPass,
    }))
    .sort((a, b) => a.at - b.at);
}

const dayKey = (t: number) => new Date(t).toDateString();

export function skillStatus(skillId: string, all: Attempt[], now: number): SkillStatus {
  const skill = getSkill(skillId);
  const mine = all.filter((a) => a.skillId === skillId).sort((a, b) => a.at - b.at);
  // Tutor help rows mark help (they restart the check clock) but are not answers.
  const answers = mine.filter((a) => a.mode !== "tutor");
  const totals = {
    own: answers.filter((a) => a.correct && !a.assisted).length,
    helped: answers.filter((a) => a.correct && a.assisted).length,
    missed: answers.filter((a) => !a.correct).length,
  };
  const base = { skillId, overdue: false, stuck: false, totals };
  if (!skill || !mine.length) return { ...base, state: "new", level: 1 };

  const practice = mine.filter((a) => PRACTICE_MODES.has(a.mode));
  const lastPracticeAt = practice.at(-1)?.at;
  const lastHelpAt = mine.filter((a) => a.assisted).at(-1)?.at;
  const level = levelFrom(mine, skill);
  const checks = checksOf(mine);
  const out: Pick<SkillStatus, "level" | "lastPracticeAt" | "lastHelpAt"> = { level, lastPracticeAt, lastHelpAt };

  // Stuck: the last three practice sets each under the threshold.
  const bySet = new Map<string, Attempt[]>();
  for (const a of practice) if (a.setId && a.mode !== "review") bySet.set(a.setId, [...(bySet.get(a.setId) ?? []), a]);
  const lastSets = [...bySet.values()].slice(-3);
  const stuck = lastSets.length === 3 && lastSets.every((s) => s.filter((a) => a.correct && !a.assisted).length / s.length < RULES.stuckShare);

  const opens = (from: number) =>
    Math.max(from, (lastHelpAt ?? 0) + RULES.helpQuietMs, (lastPracticeAt ?? 0) + RULES.practiceQuietMs);

  // Proving: two passed checks on different days at least six days apart, with no failed check between.
  const lastFail = checks.filter((c) => !c.passed).at(-1)?.at ?? 0;
  const passes = checks.filter((c) => c.passed && c.at > lastFail);
  let provedAt: number | undefined;
  for (let i = 1; i < passes.length && !provedAt; i++)
    for (let j = 0; j < i; j++)
      if (dayKey(passes[i].at) !== dayKey(passes[j].at) && passes[i].at - passes[j].at >= RULES.secondCheckMs) provedAt = passes[i].at;

  if (provedAt) {
    const reviews = mine.filter((a) => a.mode === "review" && a.at > provedAt!);
    // Refresh: misses in a row on reviews; a later passed check restores the skill.
    let streak = 0, refreshAt: number | undefined;
    for (const r of reviews) {
      streak = r.correct && !r.assisted ? 0 : streak + 1;
      if (streak >= RULES.refreshMisses) refreshAt ??= r.at;
    }
    if (refreshAt !== undefined) {
      const restored = checks.some((c) => c.passed && c.at > refreshAt!);
      if (!restored) return { ...base, ...out, stuck, state: "refresh", provedAt, checkOpensAt: opens(refreshAt) };
    }
    const goodDays = new Set(reviews.filter((r) => r.correct && !r.assisted).map((r) => dayKey(r.at))).size;
    const step = RULES.reviewDays[Math.min(goodDays, RULES.reviewDays.length - 1)];
    const lastGood = reviews.filter((r) => r.correct && !r.assisted).at(-1)?.at ?? provedAt;
    return { ...base, ...out, state: "proved", provedAt, reviewDueAt: lastGood + step * DAY };
  }

  if (passes.length) {
    const first = passes[0].at;
    return { ...base, ...out, stuck, state: "checked", checkOpensAt: opens(first + RULES.secondCheckMs) };
  }

  // Ready: enough right-on-your-own answers at the top level since the last failed check.
  const top = practice.filter((a) => a.mode !== "review" && a.level >= skill.levels && a.at > lastFail).slice(-RULES.readyWindow);
  const ready = top.length >= RULES.readyWindow && top.filter((a) => a.correct && !a.assisted).length >= RULES.readyOwn;
  if (ready) {
    const readySince = top.at(-1)!.at;
    const checkOpensAt = opens(readySince);
    return { ...base, ...out, stuck: false, state: "ready", checkOpensAt, overdue: now - checkOpensAt > RULES.overdueCheckMs };
  }
  return { ...base, ...out, stuck, state: "practicing" };
}

export const isSecure = (s: SkillStatus) => s.state === "ready" || s.state === "checked" || s.state === "proved" || s.state === "refresh";

export type Statuses = Record<string, SkillStatus>;

export function allStatuses(attempts: Attempt[], now: number, subject?: Subject): Statuses {
  const ids = new Set(attempts.map((a) => a.skillId));
  const out: Statuses = {};
  for (const id of ids) if (!subject || getSkill(id)?.subject === subject) out[id] = skillStatus(id, attempts, now);
  return out;
}

const statusOf = (statuses: Statuses, id: string): SkillStatus =>
  statuses[id] ?? { skillId: id, state: "new", level: 1, overdue: false, stuck: false, totals: { own: 0, helped: 0, missed: 0 } };

/** Where a learner of this grade starts by default: a grade below, so the first sets feel easy (Kumon's comfortable start). */
export function defaultStart(subject: Subject, grade: Grade): string | undefined {
  const list = skillsFor(subject);
  const target = grade === "adult" ? gradeIndex("6") : Math.max(0, gradeIndex(grade) - 1);
  return (list.find((s) => gradeIndex(s.grade) >= target) ?? list.at(-1))?.id;
}

/**
 * The next skill on a subject's map: the first skill at or after the start that is not yet secure and
 * whose prerequisites are secure (or come before the start, which counts as known).
 */
export function nextSkill(subject: Subject, statuses: Statuses, start?: string): string | undefined {
  const list = skillsFor(subject);
  const from = Math.max(0, start ? list.findIndex((s) => s.id === start) : 0);
  const before = new Set(list.slice(0, from).map((s) => s.id));
  const ok = (id: string) => before.has(id) || !getSkill(id) || isSecure(statusOf(statuses, id)) || getSkill(id)!.subject !== subject;
  for (const s of list.slice(from)) {
    if (isSecure(statusOf(statuses, s.id))) continue;
    if (s.prereqs.every(ok)) return s.id;
  }
  return undefined;
}

/** Proved skills whose review is due, most overdue first. */
export function reviewsDue(statuses: Statuses, now: number, subject?: Subject) {
  return Object.values(statuses)
    .filter((s) => s.state === "proved" && s.reviewDueAt !== undefined && s.reviewDueAt <= now)
    .filter((s) => !subject || getSkill(s.skillId)?.subject === subject)
    .sort((a, b) => a.reviewDueAt! - b.reviewDueAt!);
}

/** Checks open now. */
export function checksOpen(statuses: Statuses, now: number) {
  return Object.values(statuses).filter((s) => (s.state === "ready" || s.state === "checked" || s.state === "refresh") && (s.checkOpensAt ?? 0) <= now);
}

export const setSize = (grade: Grade) => (["K", "1", "2"].includes(grade) ? 6 : 10);

type Seeds = () => number;

/**
 * Draws seeds so a set never shows the same problem twice while the skill has others. A hand-written bank
 * of 13–19 questions a level would otherwise repeat a whole passage and question in most 10-problem sets,
 * and a repeated check problem is not a fresh one. A main problem's level is only known as the set goes,
 * so its seed must be new at every level of the skill. After 100 draws a repeat is allowed.
 */
function freshSeeds(seed: Seeds) {
  const seen = new Set<string>();
  const key = (skillId: string, level: number, s: number) => {
    const it = makeItem(skillId, level, s, "en");
    return JSON.stringify([skillId, it.level, it.passage, it.prompt, it.say, it.picture, it.visual]);
  };
  return (skillId: string, levels: number[]): number => {
    if (!getSkill(skillId)) return seed();
    let s = seed();
    let keys = levels.map((l) => key(skillId, l, s));
    for (let tries = 1; tries < 100 && keys.some((k) => seen.has(k)); tries++) {
      s = seed();
      keys = levels.map((l) => key(skillId, l, s));
    }
    for (const k of keys) seen.add(k);
    return s;
  };
}

const allLevels = (skillId: string) => Array.from({ length: getSkill(skillId)?.levels ?? 1 }, (_, i) => i + 1);

/**
 * A practice set: mostly one skill, with up to two review problems interleaved (a proved skill due for
 * review, or a skill practiced in the last two weeks), the way spaced, mixed practice works best.
 */
export function buildPracticeSlots(opts: { skillId: string; grade: Grade; statuses: Statuses; now: number; seed: Seeds; recent?: string[] }): Slot[] {
  const { skillId, grade, statuses, now, seed } = opts;
  const subject = getSkill(skillId)?.subject;
  const size = setSize(grade);
  const reviewSkills = [
    ...reviewsDue(statuses, now, subject).map((s) => s.skillId),
    ...(opts.recent ?? []),
  ].filter((id, i, list) => id !== skillId && list.indexOf(id) === i).slice(0, size >= 10 ? 2 : 1);
  const positions = size >= 10 ? [3, 7] : [3];
  const fresh = freshSeeds(seed);
  return Array.from({ length: size }, (_, k): Slot => {
    const id = reviewSkills[positions.indexOf(k)];
    if (id === undefined) return { skillId, seed: fresh(skillId, allLevels(skillId)), role: "main" };
    const s = getSkill(id)!;
    const level = Math.min(statusOf(statuses, id).level || s.levels, s.levels);
    return { skillId: id, seed: fresh(id, [level]), role: "review", level };
  });
}

/** A check: fresh problems at the top level, no help available. */
export function buildCheckSlots(skillId: string, seed: Seeds): Slot[] {
  const top = getSkill(skillId)?.levels ?? 1;
  const fresh = freshSeeds(seed);
  return Array.from({ length: RULES.checkSize }, () => ({ skillId, seed: fresh(skillId, [top]), role: "check" as const, level: top }));
}

/** A review set across several due skills (3 problems each, at most 9). */
export function buildReviewSlots(skillIds: string[], statuses: Statuses, seed: Seeds): Slot[] {
  const ids = skillIds.filter((id) => getSkill(id)).slice(0, 3);
  const slots: Slot[] = [];
  const fresh = freshSeeds(seed);
  // Interleaved: a, b, c, a, b, c…
  for (let k = 0; k < 3; k++)
    for (const id of ids) {
      const level = Math.min(statusOf(statuses, id).level, getSkill(id)!.levels);
      slots.push({ skillId: id, seed: fresh(id, [level]), role: "review", level });
    }
  return slots;
}

/** Test or feedback prep: problems across several skills, interleaved, at each skill's current level. */
export function buildMixedSlots(skillIds: string[], statuses: Statuses, grade: Grade, seed: Seeds): Slot[] {
  const ids = skillIds.filter((id) => getSkill(id));
  if (!ids.length) return [];
  const size = setSize(grade);
  const fresh = freshSeeds(seed);
  return Array.from({ length: size }, (_, i) => {
    const id = ids[i % ids.length];
    const level = statusOf(statuses, id).level;
    return { skillId: id, seed: fresh(id, [level]), role: "main" as const, level };
  });
}

/** Level for the next main problem inside a set, given the answers so far in this set. */
export function levelInSet(start: number, maxLevel: number, answers: { correct: boolean; assisted: boolean }[]) {
  let level = start, up = 0, down = 0;
  for (const a of answers) {
    if (a.correct && !a.assisted) {
      up++;
      down = 0;
      if (up >= RULES.stepUp && level < maxLevel) {
        level++;
        up = 0;
      }
    } else if (!a.correct) {
      down++;
      up = 0;
      if (down >= RULES.stepDown && level > 1) {
        level--;
        down = 0;
      }
    } else up = 0;
  }
  return level;
}

// Placement: walk the subject's map from a grade below, jumping ahead after a right answer and stepping
// back after a miss. Ends after 12 problems or two misses in a row; the learner starts at the last skill
// they got right on their own (comfortable start), or at the first skill if none.
export const PLACEMENT_MAX = 12;

export function placementNext(subject: Subject, grade: Grade, answers: { skillId: string; correct: boolean }[]): { skillId: string } | { done: true; start: string } {
  const list = skillsFor(subject);
  const first = defaultStart(subject, grade === "adult" ? "6" : grade) ?? list[0].id;
  let i = Math.max(0, list.findIndex((s) => s.id === first) - 1);
  let lastGood = -1, missesInRow = 0;
  for (const a of answers) {
    const at = list.findIndex((s) => s.id === a.skillId);
    if (a.correct) {
      lastGood = Math.max(lastGood, at);
      missesInRow = 0;
      i = at + 2;
    } else {
      missesInRow++;
      i = Math.max(lastGood + 1, at - 1);
    }
  }
  const tried = new Set(answers.map((a) => a.skillId));
  const finished = answers.length >= PLACEMENT_MAX || missesInRow >= 2 || i >= list.length;
  if (finished) return { done: true, start: list[Math.max(0, lastGood)].id };
  // Never ask the same skill twice: move forward to an untried one.
  while (i < list.length && tried.has(list[i].id)) i++;
  if (i >= list.length) return { done: true, start: list[Math.max(0, lastGood)].id };
  return { skillId: list[i].id };
}

/** Sets are small; this just finds a learner's unfinished set of a kind for today. */
export function openSet(sets: PracticeSet[], profileId: string, planKey: string) {
  return sets.find((s) => s.profileId === profileId && s.planKey === planKey);
}
