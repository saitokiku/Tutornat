/**
 * The mastery projection is C's `e2.projections`, written only by
 * `e2.finalize_attempt` and `e2.rebuild_projection`, read through
 * `e2.qualification_projection`. It is never a second source of truth:
 * `rebuildProjection` recomputes it here from `e2.evidence_view` alone
 * (qualifying rows for the learner/skill/version/rule, ordered by
 * `causal_seq, id` — the function's own ordering) so a reviewer can compare
 * contributing ids against what is stored (E11).
 *
 * Revocation withdraws the claim without touching evidence: a qualifying row
 * whose frozen item OR rubric version has a `e2.content_revocations` row is
 * excluded from `evidenceIds` and the count (it is listed under
 * `withdrawnByRevocation` for the reviewer). The stored row is corrected by
 * `rebuildStoredProjection`, which calls C's `e2.rebuild_projection` as the
 * assessment role in its own transaction AFTER the revocation has committed
 * (db/README.md: revocation and rebuild never share a transaction).
 *
 * Under `e2-draft-1` `certification` is always `'none'`.
 */
import type { Queryable } from '@/lib/tutor/db';

import { ASSESSMENT_RULE, AssessmentError, fromSqlError, type AssessmentDb, type QualificationState, type QualificationFacts } from './contracts';

export interface ProjectionRow extends Record<string, unknown> {
  household_id: string;
  learner_id: string;
  skill_id: string;
  skill_version: string;
  rule_version: string;
  evidence_ids: string[];
  independent_successes: number;
  certification: 'none';
  qualification_state: QualificationState;
  qualification_reasons: string[];
  /** Empty until a legacy partition is first rebuilt through the E13 seam. */
  qualification: QualificationFacts | Record<string, never>;
  updated_at: string;
}

export interface RebuiltProjection {
  skillId: string;
  skillVersion: string;
  ruleVersion: string;
  /** Contributing evidence: qualifying AND its item and rubric versions are unrevoked. */
  evidenceIds: string[];
  independentSuccesses: number;
  /** Qualifying evidence withdrawn because its item or rubric version was revoked after finalization. Never counted. */
  withdrawnByRevocation: string[];
}

export async function readProjection(
  db: Queryable,
  learnerId: string,
  skillId: string,
  skillVersion: string,
  ruleVersion: string = ASSESSMENT_RULE.ruleVersion,
): Promise<ProjectionRow | null> {
  const { rows } = await db.query<ProjectionRow>(
    'SELECT * FROM e2.qualification_projection WHERE learner_id = $1 AND skill_id = $2 AND skill_version = $3 AND rule_version = $4',
    [learnerId, skillId, skillVersion, ruleVersion],
  );
  return rows[0] ?? null;
}

/**
 * Recompute from retained evidence only: no read of the stored projection.
 * The attempt row is joined for the frozen item/rubric versions the
 * revocation check needs (the evidence provenance carries the item but not
 * the rubric).
 */
export async function rebuildProjection(
  db: Queryable,
  learnerId: string,
  skillId: string,
  skillVersion: string,
  ruleVersion: string = ASSESSMENT_RULE.ruleVersion,
): Promise<RebuiltProjection> {
  const { rows } = await db.query<{ id: string; revoked: boolean }>(
    `SELECT e.id,
            EXISTS (SELECT 1 FROM e2.content_revocations r
                     WHERE (r.target_kind = 'item'   AND r.target_id = a.item_id   AND r.target_version = a.item_version)
                        OR (r.target_kind = 'rubric' AND r.target_id = a.rubric_id AND r.target_version = a.rubric_version)) AS revoked
       FROM e2.evidence_view e
       JOIN e2.attempts a ON a.id = e.attempt_id
      WHERE e.learner_id = $1 AND e.skill_id = $2 AND e.skill_version = $3 AND e.rule_version = $4 AND e.qualifying
      ORDER BY e.causal_seq, e.id`,
    [learnerId, skillId, skillVersion, ruleVersion],
  );
  const evidenceIds = rows.filter((r) => !r.revoked).map((r) => r.id);
  return {
    skillId,
    skillVersion,
    ruleVersion,
    evidenceIds,
    independentSuccesses: evidenceIds.length,
    withdrawnByRevocation: rows.filter((r) => r.revoked).map((r) => r.id),
  };
}

/**
 * Corrects the STORED projection through C's `e2.rebuild_projection`
 * (assessment role; the function takes its own locks). Call it in a
 * transaction of its own after the revocation committed. Returns the rebuilt
 * rows for the learner (one skill when given, else every retained partition).
 */
export async function rebuildStoredProjection(
  db: AssessmentDb,
  learnerId: string,
  skillId: string | null = null,
): Promise<ProjectionRow[]> {
  try {
    return await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ value: ProjectionRow[] }>('SELECT e2.rebuild_projection($1,$2) AS value', [learnerId, skillId]);
      const row = rows[0];
      if (!row) throw new AssessmentError('SQL', 'the function returned no row', null, null);
      return row.value;
    });
  } catch (error) {
    throw fromSqlError(error, null);
  }
}
