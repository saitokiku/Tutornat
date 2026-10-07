/**
 * The learner's own progress view (wire `ProgressResponse`; spec §5.7, R12,
 * strategy D17). The skill graph, the mastery rows, the open and resolved
 * misconceptions, the next skill to work on, the delayed unassisted checks
 * that are due now, and the session and minute totals.
 *
 * Estimates, never grades: the screen that renders this calls `mastered` an
 * estimate and reserves the word mastery for `confirmed`.
 */
import type { MisconceptionState, SkillMastery, SkillNode } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { skillNodes } from '@/lib/tutor/graph/graph';
import { dueDelayedChecks, selectNextSkill } from '@/lib/tutor/graph/next-skill';
import {
  listMasteryRows,
  listMisconceptionRows,
  toMisconceptionState,
  toSkillMastery,
} from '@/lib/tutor/model/service';
import type { ProgressResponse } from '@/lib/tutor/wire';

export interface ProgressScope {
  accountId: string;
  learnerId: string;
}

interface TotalsRow extends Record<string, unknown> {
  sessions: number | string;
  minutes: number | string;
}

async function sessionTotals(
  db: Queryable,
  scope: ProgressScope,
): Promise<{ sessions: number; minutes: number }> {
  const { rows } = await db.query<TotalsRow>(
    `SELECT count(*)::int AS sessions, COALESCE(SUM(minutes), 0)::int AS minutes
     FROM sessions WHERE account_id = $1 AND learner_id = $2`,
    [scope.accountId, scope.learnerId],
  );
  return {
    sessions: Number(rows[0]?.sessions ?? 0),
    minutes: Number(rows[0]?.minutes ?? 0),
  };
}

export async function buildProgress(
  db: Queryable,
  scope: ProgressScope,
  now: Date = new Date(),
): Promise<ProgressResponse> {
  const [masteryRows, misconceptionRows, totals] = await Promise.all([
    listMasteryRows(db, scope.accountId, scope.learnerId),
    listMisconceptionRows(db, scope.accountId, scope.learnerId),
    sessionTotals(db, scope),
  ]);
  const mastery: SkillMastery[] = masteryRows.map(toSkillMastery);
  const misconceptions: MisconceptionState[] = misconceptionRows.map(toMisconceptionState);
  const skills: SkillNode[] = skillNodes();
  const next = selectNextSkill(mastery);
  return {
    skills,
    mastery,
    misconceptions,
    nextSkill: next
      ? { id: next.id, name: next.name, prereqs: next.prereqs, tags: next.tags, slice: next.slice }
      : null,
    dueChecks: dueDelayedChecks(mastery, now),
    sessions: totals.sessions,
    minutes: totals.minutes,
  };
}
