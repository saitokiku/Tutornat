import type { Grade, Locale, Subject } from "@/lib/types";
import { STRANDS } from "./registry";
import { rng } from "./rng";
import type { Item, Skill } from "./types";

// The skill map: every practicable skill, its prerequisites (the lattice) and its generator.
// Order inside a subject is teaching order; the planner walks it to find what comes next.

/** Every skill: math, then English, then science, each in teaching order (grade, then strand order). */
const SUBJECT_ORDER = ["math", "english", "science", "other"];
const GRADES: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "adult"];
export const SKILLS: Skill[] = STRANDS.flat()
  .map((s, i) => [s, i] as const)
  .sort(([a, i], [b, j]) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject) || GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) || i - j)
  .map(([s]) => s);

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export const getSkill = (id: string) => BY_ID.get(id);

type Coded = Pick<Skill, "standard" | "levelStandards">;
/** Every code a skill practises: its `standard`, then any level's own code in level order, without repeats. */
export function standardsOf(skill: Coded): string[] {
  const byLevel = Object.entries(skill.levelStandards ?? {}).sort(([a], [b]) => Number(a) - Number(b));
  return [...new Set([skill.standard, ...byLevel.map(([, code]) => code)].filter((c): c is string => !!c))];
}
/** The code one level practises. */
export const standardAt = (skill: Coded, level: number) => skill.levelStandards?.[level] ?? skill.standard;

export function skillsFor(subject: Subject) {
  return SKILLS.filter((s) => s.subject === subject);
}

const GRADE_ORDER: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "adult"];
export const gradeIndex = (g: Grade) => GRADE_ORDER.indexOf(g);

/** Builds the item for (skill, level, seed). Same inputs, same problem, on the server and in the browser. */
export function makeItem(skillId: string, level: number, seed: number, locale: Locale): Item {
  const skill = BY_ID.get(skillId);
  if (!skill) throw new Error(`Unknown skill ${skillId}`);
  const lv = Math.min(Math.max(1, level), skill.levels);
  return { ...skill.generate(rng(seed), lv, locale), id: `${skillId}:${lv}:${seed}`, skillId, level: lv, seed };
}
