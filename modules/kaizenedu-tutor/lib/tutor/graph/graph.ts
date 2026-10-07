/**
 * The launch-slice skill graph (spec §5.8, R12). `skill-graph.json` is a copy
 * of `.claude/skills/pedagogy-fractions/references/skill-graph.json` because
 * `.claude` is not shipped. Ordinals follow the file order, which is the
 * spec's F1–F12 order; next-skill selection uses them.
 */
import type { SkillNode } from '@/lib/tutor/contracts';

import graph from './skill-graph.json';
import {
  GENERIC_MISCONCEPTION_TAGS,
  isSubjectSkillId,
  subjectOfSkillId,
  subjectSkillNode,
} from './subjects';

interface RawGraph {
  slice: string;
  grades: string;
  prerequisite_checkins: string[];
  misconception_tags: string[];
  skills: Array<{ id: string; name: string; prereqs: string[]; tags: string[] }>;
  item_bank: { min_items_per_skill: number; min_total: number };
}

const RAW = graph as RawGraph;

export interface GraphSkill extends SkillNode {
  /** Position in the spec table, 0-based (F1 = 0). */
  ordinal: number;
}

export const SKILL_SLICE = RAW.slice;
export const MISCONCEPTION_TAGS: readonly string[] = [...RAW.misconception_tags];
export const ITEM_BANK_MINIMUMS = { ...RAW.item_bank } as const;

export const SKILLS: readonly GraphSkill[] = RAW.skills.map((skill, ordinal) => ({
  id: skill.id,
  name: skill.name,
  prereqs: [...skill.prereqs],
  tags: [...skill.tags],
  slice: RAW.slice,
  ordinal,
}));

const BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));

/** Subject skills sit after every graph skill; they never enter next-skill selection (`SKILLS`). */
const SUBJECT_ORDINAL_BASE = 1_000;

/** A graph skill (F1–F12) or a subject's synthetic skill (`S-math`, D35). */
export function isSkillId(value: unknown): value is string {
  return (typeof value === 'string' && BY_ID.has(value)) || isSubjectSkillId(value);
}

/** True only for the fractions graph, where prerequisites, bank items and the diagnostic exist. */
export function isGraphSkillId(value: unknown): value is string {
  return typeof value === 'string' && BY_ID.has(value);
}

export function skillById(id: string): GraphSkill | undefined {
  const graphSkill = BY_ID.get(id);
  if (graphSkill) return graphSkill;
  const subject = subjectOfSkillId(id);
  if (!subject) return undefined;
  return { ...subjectSkillNode(subject), ordinal: SUBJECT_ORDINAL_BASE };
}

export function isMisconceptionTag(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (MISCONCEPTION_TAGS.includes(value) || GENERIC_MISCONCEPTION_TAGS.includes(value))
  );
}

/** The plain SkillNode list for wire responses (no ordinal). */
export function skillNodes(): SkillNode[] {
  return SKILLS.map(({ id, name, prereqs, tags, slice }) => ({ id, name, prereqs, tags, slice }));
}

/** Every skill that lists `skillId` (transitively) as a prerequisite. */
export function dependentsOf(skillId: string): GraphSkill[] {
  const out: GraphSkill[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const skill of SKILLS) {
      if (skill.prereqs.includes(id) && !seen.has(skill.id)) {
        seen.add(skill.id);
        out.push(skill);
        walk(skill.id);
      }
    }
  };
  walk(skillId);
  return out.sort((a, b) => a.ordinal - b.ordinal);
}
