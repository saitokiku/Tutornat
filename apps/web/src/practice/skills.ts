import type { Grade, Locale, Subject } from "@/lib/types";
import { ENGLISH_K_4 } from "./english/early";
import { ENGLISH_5_9 } from "./english/upper";
import { EARLY_MATH } from "./math/early";
import { MATH_3_5 } from "./math/g3to5";
import { MATH_6_7 } from "./math/g6to7";
import { MATH_8_9 } from "./math/g8to9";
import { rng } from "./rng";
import { SCIENCE_K_5 } from "./science/early";
import { SCIENCE_6_9 } from "./science/upper";
import type { Item, Skill } from "./types";

// The skill map: every practicable skill, its prerequisites (the lattice) and its generator.
// Order inside a subject is teaching order; the planner walks it to find what comes next.

export const SKILLS: Skill[] = [
  ...EARLY_MATH,
  ...MATH_3_5,
  ...MATH_6_7,
  ...MATH_8_9,
  ...ENGLISH_K_4,
  ...ENGLISH_5_9,
  ...SCIENCE_K_5,
  ...SCIENCE_6_9,
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export const getSkill = (id: string) => BY_ID.get(id);

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
