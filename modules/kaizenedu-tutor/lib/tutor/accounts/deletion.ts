/**
 * Deletion requests and the retention job (spec §8.5 `deletion_requests`,
 * §11.2 items 4 and 5, R16). Filing a request freezes the profile at once
 * (or every profile of the account) so nothing new is collected; the job
 * deletes every row the request covers once the window has passed and marks
 * the request completed. The request rows themselves stay: ids only, the
 * record that the right was exercised.
 */
import { newId } from '@/lib/tutor/auth/session';
import type { Queryable, TutorDb } from '@/lib/tutor/db';

import { freezeAccountLearners, freezeLearner, requireLearner } from './learners';

/**
 * Placeholder for the published retention window. Spec §11.2 item 5 proposes
 * twelve months after last activity for inactive profiles and "deletion on
 * request within the window"; counsel (consent-35) sets the final numbers and
 * this constant then moves to kaizen.config. Ask before changing (CLAUDE.md).
 */
export const DELETION_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export function deletionCompletesBy(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_WINDOW_DAYS * DAY_MS);
}

export interface DeletionRequestRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  learner_id: string | null;
  requested_at: string | Date;
  completed_at: string | Date | null;
}

export interface FiledDeletion {
  id: string;
  requestedAt: string;
  completesBy: string;
}

function filedFromRow(row: DeletionRequestRow): FiledDeletion {
  const requestedAt =
    row.requested_at instanceof Date ? row.requested_at : new Date(row.requested_at);
  return {
    id: row.id,
    requestedAt: requestedAt.toISOString(),
    completesBy: deletionCompletesBy(requestedAt).toISOString(),
  };
}

export async function fileDeletionRequest(
  db: Queryable,
  accountId: string,
  learnerId: string | null,
  now = new Date(),
): Promise<FiledDeletion> {
  const id = newId('del');
  await db.query(
    `INSERT INTO deletion_requests (id, account_id, learner_id, requested_at) VALUES ($1, $2, $3, $4)`,
    [id, accountId, learnerId, now],
  );
  return {
    id,
    requestedAt: now.toISOString(),
    completesBy: deletionCompletesBy(now).toISOString(),
  };
}

async function pendingRequest(
  db: Queryable,
  accountId: string,
  learnerId: string | null,
): Promise<FiledDeletion | null> {
  const { rows } = await db.query<DeletionRequestRow>(
    `SELECT * FROM deletion_requests
     WHERE account_id = $1 AND completed_at IS NULL AND learner_id IS NOT DISTINCT FROM $2::text
     ORDER BY requested_at, id LIMIT 1`,
    [accountId, learnerId],
  );
  return rows[0] ? filedFromRow(rows[0]) : null;
}

/** True when a request for this learner, or for the whole account, is still open. */
export async function hasPendingDeletion(
  db: Queryable,
  accountId: string,
  learnerId: string | null,
): Promise<boolean> {
  const { rows } = await db.query<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM deletion_requests
     WHERE account_id = $1 AND completed_at IS NULL AND (learner_id IS NULL OR learner_id = $2::text)`,
    [accountId, learnerId],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

/**
 * DELETE learners and POST data for one learner: the profile is frozen now
 * and a request is filed. Idempotent: a request already open for the learner
 * is returned instead of duplicated.
 */
export async function requestLearnerDeletion(
  db: Queryable,
  accountId: string,
  learnerId: string,
  now = new Date(),
): Promise<FiledDeletion> {
  await requireLearner(db, accountId, learnerId);
  await freezeLearner(db, accountId, learnerId);
  return (
    (await pendingRequest(db, accountId, learnerId)) ??
    fileDeletionRequest(db, accountId, learnerId, now)
  );
}

/**
 * POST data with `learnerId: null`: every profile is frozen, every other
 * sign-in of the account is destroyed (the requesting session stays so the
 * parent sees the confirmation), and an account-wide request is filed.
 */
export async function requestAccountDeletion(
  db: Queryable,
  accountId: string,
  keepAuthSessionId: string,
  now = new Date(),
): Promise<FiledDeletion> {
  await freezeAccountLearners(db, accountId);
  await db.query(`DELETE FROM account_sessions WHERE account_id = $1 AND id <> $2`, [
    accountId,
    keepAuthSessionId,
  ]);
  return (
    (await pendingRequest(db, accountId, null)) ?? fileDeletionRequest(db, accountId, null, now)
  );
}

export interface DeletionJobResult {
  processed: number;
  learners: number;
  accounts: number;
}

/**
 * `evidence_events` is append-only by trigger (strategy law 1). A parent's
 * deletion right is the one sanctioned exception, so the job disables that
 * trigger for its own statements inside the transaction and re-enables it
 * before commit; a failure rolls the whole request back, trigger included.
 */
async function deleteEvidence(tx: Queryable, where: string, params: unknown[]): Promise<void> {
  await tx.query(`ALTER TABLE evidence_events DISABLE TRIGGER evidence_events_immutable`);
  await tx.query(`DELETE FROM evidence_events WHERE ${where}`, params);
  await tx.query(`ALTER TABLE evidence_events ENABLE TRIGGER evidence_events_immutable`);
}

/**
 * Deletes one learner's rows. Foreign keys cascade sessions (with turns,
 * attention_stats, recovery_events), coursework, consents, skill_mastery,
 * misconceptions, and learner_profiles; the tables without a key are
 * deleted here. Usage rows keep their cents for billing and cost totals with
 * the learner, session, and turn ids nulled.
 */
async function purgeLearner(tx: Queryable, accountId: string, learnerId: string): Promise<void> {
  await deleteEvidence(tx, `account_id = $1 AND learner_id = $2`, [accountId, learnerId]);
  await tx.query(
    `UPDATE usage_ledger SET learner_id = NULL, session_id = NULL, turn_id = NULL
     WHERE account_id = $1 AND (learner_id = $2 OR session_id IN
       (SELECT id FROM sessions WHERE account_id = $1 AND learner_id = $2))`,
    [accountId, learnerId],
  );
  await tx.query(`DELETE FROM flags WHERE account_id = $1 AND learner_id = $2`, [
    accountId,
    learnerId,
  ]);
  await tx.query(`DELETE FROM learners WHERE id = $2 AND account_id = $1`, [accountId, learnerId]);
}

/**
 * Deletes the account row; every learner and account-scoped table cascades.
 * Exported for guest mode (D35), whose "Start over" deletes now rather than
 * filing a request: a guest has no parent to exercise a window for.
 */
export async function purgeAccount(tx: Queryable, accountId: string): Promise<void> {
  await deleteEvidence(tx, `account_id = $1`, [accountId]);
  await tx.query(
    `UPDATE usage_ledger SET learner_id = NULL, session_id = NULL, turn_id = NULL WHERE account_id = $1`,
    [accountId],
  );
  await tx.query(`DELETE FROM flags WHERE account_id = $1`, [accountId]);
  await tx.query(`DELETE FROM accounts WHERE id = $1`, [accountId]);
}

/**
 * Completes every request whose window has passed, one transaction per
 * request so a crash leaves each request either untouched or complete. No
 * scheduler is wired here; the integrator adds the cron route that calls it.
 */
export async function runDeletionJob(db: TutorDb, now = new Date()): Promise<DeletionJobResult> {
  const cutoff = new Date(now.getTime() - DELETION_WINDOW_DAYS * DAY_MS);
  const { rows } = await db.query<DeletionRequestRow>(
    `SELECT * FROM deletion_requests
     WHERE completed_at IS NULL AND requested_at <= $1
     ORDER BY requested_at, id`,
    [cutoff],
  );
  const result: DeletionJobResult = { processed: 0, learners: 0, accounts: 0 };
  for (const request of rows) {
    await db.withTransaction(async (tx) => {
      // An account-wide request earlier in this run may have completed this one.
      const open = await tx.query(
        `SELECT id FROM deletion_requests WHERE id = $1 AND completed_at IS NULL`,
        [request.id],
      );
      if (open.rows.length === 0) return;
      if (request.learner_id) {
        await purgeLearner(tx, request.account_id, request.learner_id);
        await tx.query(`UPDATE deletion_requests SET completed_at = $2 WHERE id = $1`, [
          request.id,
          now,
        ]);
        result.learners += 1;
      } else {
        await purgeAccount(tx, request.account_id);
        await tx.query(
          `UPDATE deletion_requests SET completed_at = $2 WHERE account_id = $1 AND completed_at IS NULL`,
          [request.account_id, now],
        );
        result.accounts += 1;
      }
      result.processed += 1;
    });
  }
  return result;
}
