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

/**
 * E1 containment: the inherited "delayed unassisted check" was the path by
 * which a practice session certified a skill 24 h later. That path is closed;
 * the practice model schedules nothing (`nextCheckAt` stays null) and a legacy
 * row's stale `next_check_at` is ignored. Offering the independent check when
 * a skill becomes eligible (SPEC §3.1 quiet window, ≥ 48 h) is the assessment
 * service's job and is a named gap in this repository (docs/first-build.md).
 */
export function dueDelayedChecks(
  _mastery: ReadonlyArray<Pick<SkillMastery, 'skillId' | 'status' | 'nextCheckAt'>>,
  _now: Date = new Date(),
): DueCheck[] {
  return [];
}

/** True when the learner has never produced evidence in the slice (tutor-10: run the diagnostic). */
export function isBrandNew(mastery: ReadonlyArray<Pick<SkillMastery, 'nItems'>>): boolean {
  return mastery.every((row) => row.nItems === 0);
}
