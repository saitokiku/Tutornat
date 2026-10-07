/**
 * The weekly lead (reference §5; ported from Kaizen-AI's `masteryLead` in
 * `familySummary.js`). Pure, so the arithmetic behind a parent's headline is
 * pinned by a test without a database.
 *
 * E1 containment (SPEC v0.3 §3.1): a skill counts as confirmed only when its
 * certification is `independent`, i.e. backed by qualifying evidence from the
 * restricted assessment service. No writer in this repository produces that,
 * so the count is zero until the assessment path exists. The inherited
 * `confirmed` status and any `mastery_change` to `confirmed` that is not
 * marked `qualifying: true` are unverified history and never reach the
 * headline. "Moved this week" is a skill whose qualifying change was recorded
 * inside the window AND that is independently confirmed now.
 */
import type { Certification, MasteryStatus } from '@/lib/tutor/contracts';

export interface LeadSkill {
  skillId: string;
  name: string;
  status: MasteryStatus;
  /** Missing (older callers) reads as `none`: never as a confirmation. */
  certification?: Certification;
}

/** One `mastery_change` evidence event: what the status became, when, and whether it was qualifying. */
export interface LeadChange {
  skillId: string;
  to: string;
  at: string;
  /** Only `true` counts; absent or false is practice or legacy history. */
  qualifying?: boolean;
}

export interface MovedSkill {
  skillId: string;
  name: string;
  at: string;
}

export interface WeeklyLead {
  /** Skills the learner has touched: every row past `not_started`. */
  tracked: number;
  /** Independently confirmed skills; zero under E1 by construction. */
  confirmed: number;
  /** Independently confirmed inside the window and still confirmed now, newest first. */
  moved: MovedSkill[];
  headline: string;
}

export function headlineFor(tracked: number, confirmed: number, moved: number): string {
  if (tracked === 0) return 'No skills tracked yet';
  const plural = (n: number) => (n === 1 ? 'skill' : 'skills');
  if (confirmed === 0) return `No skills independently confirmed yet, ${tracked} in progress`;
  const base = `${confirmed} of ${tracked} ${plural(tracked)} independently confirmed`;
  return moved > 0 ? `${base}, ${moved} this week` : base;
}

export function isIndependentlyConfirmed(skill: Pick<LeadSkill, 'status' | 'certification'>): boolean {
  return skill.status === 'confirmed' && skill.certification === 'independent';
}

export function weeklyLead(input: {
  skills: readonly LeadSkill[];
  changes: readonly LeadChange[];
  windowStart: Date;
  windowEnd: Date;
}): WeeklyLead {
  const tracked = input.skills.filter((skill) => skill.status !== 'not_started');
  const confirmedNow = new Map(
    tracked.filter(isIndependentlyConfirmed).map((skill) => [skill.skillId, skill]),
  );
  const from = input.windowStart.getTime();
  const to = input.windowEnd.getTime();
  const moved = new Map<string, MovedSkill>();
  for (const change of input.changes) {
    if (change.to !== 'confirmed' || change.qualifying !== true) continue;
    const at = Date.parse(change.at);
    if (!(at >= from && at < to)) continue;
    const skill = confirmedNow.get(change.skillId);
    if (!skill) continue;
    const seen = moved.get(skill.skillId);
    if (!seen || Date.parse(seen.at) < at) {
      moved.set(skill.skillId, {
        skillId: skill.skillId,
        name: skill.name,
        at: new Date(at).toISOString(),
      });
    }
  }
  const movedList = [...moved.values()].sort((a, b) => b.at.localeCompare(a.at));
  return {
    tracked: tracked.length,
    confirmed: confirmedNow.size,
    moved: movedList,
    headline: headlineFor(tracked.length, confirmedNow.size, movedList.length),
  };
}
