/**
 * Next-skill selection (spec §5.7, tutor-12) and the delayed unassisted check
 * (strategy D17). Pure: takes mastery rows, returns a decision.
 */
import type { MasteryStatus, SkillMastery } from '@/lib/tutor/contracts';

import { SKILLS, type GraphSkill } from './graph';

const SATISFIED: readonly MasteryStatus[] = ['mastered', 'confirmed'];

export function isMasteredOrConfirmed(status: MasteryStatus | undefined): boolean {
  return status !== undefined && SATISFIED.includes(status);
}

/**
 * The lowest-ordinal skill that is not mastered or confirmed and whose
 * prerequisites all are. A brand-new learner gets F1. Null when every skill
 * in the slice is mastered.
 */
export function selectNextSkill(
  mastery: ReadonlyArray<Pick<SkillMastery, 'skillId' | 'status'>>,
): GraphSkill | null {
  const status = new Map(mastery.map((row) => [row.skillId, row.status]));
  for (const skill of SKILLS) {
    if (isMasteredOrConfirmed(status.get(skill.id))) continue;
    if (skill.prereqs.every((prereq) => isMasteredOrConfirmed(status.get(prereq)))) return skill;
  }
  return null;
}

export interface DueCheck {
  skillId: string;
  dueAt: string;
}

/** Mastered skills whose delayed unassisted check is due (`next_check_at` ≤ now). */
export function dueDelayedChecks(
  mastery: ReadonlyArray<Pick<SkillMastery, 'skillId' | 'status' | 'nextCheckAt'>>,
  now: Date = new Date(),
): DueCheck[] {
  const due: DueCheck[] = [];
  for (const row of mastery) {
    if (row.status !== 'mastered' || !row.nextCheckAt) continue;
    const dueAt = new Date(row.nextCheckAt);
    if (dueAt.getTime() <= now.getTime())
      due.push({ skillId: row.skillId, dueAt: dueAt.toISOString() });
  }
  return due.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** True when the learner has never produced evidence in the slice (tutor-10: run the diagnostic). */
export function isBrandNew(mastery: ReadonlyArray<Pick<SkillMastery, 'nItems'>>): boolean {
  return mastery.every((row) => row.nItems === 0);
}
