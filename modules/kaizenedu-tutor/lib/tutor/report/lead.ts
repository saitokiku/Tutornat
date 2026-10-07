/**
 * The weekly lead (reference §5; ported from Kaizen-AI's `masteryLead` in
 * `familySummary.js`). Pure, so the arithmetic behind a parent's headline is
 * pinned by a test without a database.
 *
 * Only `confirmed` counts (D17): "could do it with help" is not a thing to
 * tell a parent their child has learned, so `mastered` — the tutor's own
 * estimate after assisted work — never reaches the headline. "Moved this
 * week" is a skill whose change to confirmed was recorded inside the window
 * AND that is confirmed now: the change log says when, the current row says
 * whether it still holds, and the two are compared like with like rather
 * than a cached estimate against a timestamp.
 */
import type { MasteryStatus } from '@/lib/tutor/contracts';

export interface LeadSkill {
  skillId: string;
  name: string;
  status: MasteryStatus;
}

/** One `mastery_change` evidence event: what the status became, and when. */
export interface LeadChange {
  skillId: string;
  to: string;
  at: string;
}

export interface MovedSkill {
  skillId: string;
  name: string;
  at: string;
}

export interface WeeklyLead {
  /** Skills the learner has touched: every row past `not_started`. */
  tracked: number;
  confirmed: number;
  /** Confirmed inside the window and still confirmed now, newest first; named, not just counted. */
  moved: MovedSkill[];
  headline: string;
}

export function headlineFor(tracked: number, confirmed: number, moved: number): string {
  if (tracked === 0) return 'No skills tracked yet';
  const plural = (n: number) => (n === 1 ? 'skill' : 'skills');
  if (confirmed === 0) return `No skills confirmed yet, ${tracked} in progress`;
  const base = `${confirmed} of ${tracked} ${plural(tracked)} confirmed`;
  return moved > 0 ? `${base}, ${moved} this week` : base;
}

export function weeklyLead(input: {
  skills: readonly LeadSkill[];
  changes: readonly LeadChange[];
  windowStart: Date;
  windowEnd: Date;
}): WeeklyLead {
  const tracked = input.skills.filter((skill) => skill.status !== 'not_started');
  const confirmedNow = new Map(
    tracked.filter((skill) => skill.status === 'confirmed').map((skill) => [skill.skillId, skill]),
  );
  const from = input.windowStart.getTime();
  const to = input.windowEnd.getTime();
  const moved = new Map<string, MovedSkill>();
  for (const change of input.changes) {
    if (change.to !== 'confirmed') continue;
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
