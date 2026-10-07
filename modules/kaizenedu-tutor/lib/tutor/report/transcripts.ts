/**
 * Transcript access for the account holder (spec §5.6 "Parent can read any
 * transcript for their learners", R11, §11.2 item 4 review). Every query
 * carries the account id; a session of another account reads as absent.
 */
import type { TurnRecord, TutorSession } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

import { SESSION_COLUMNS, toTurnRecord, toTutorSession, TURN_COLUMNS } from './rows';
import type { SessionRow, TurnRow } from './rows';

export const TRANSCRIPT_SESSION_LIMIT = 50;

/** Newest first, at most `limit` sessions. */
export async function listLearnerSessions(
  db: Queryable,
  accountId: string,
  learnerId: string,
  limit = TRANSCRIPT_SESSION_LIMIT,
): Promise<TutorSession[]> {
  const { rows } = await db.query<SessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM sessions
     WHERE account_id = $1 AND learner_id = $2
     ORDER BY started_at DESC, id DESC LIMIT $3`,
    [accountId, learnerId, limit],
  );
  return rows.map(toTutorSession);
}

export async function getLearnerSession(
  db: Queryable,
  accountId: string,
  learnerId: string,
  sessionId: string,
): Promise<TutorSession | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [sessionId, accountId, learnerId],
  );
  return rows[0] ? toTutorSession(rows[0]) : null;
}

export async function listSessionTurns(
  db: Queryable,
  accountId: string,
  sessionId: string,
): Promise<TurnRecord[]> {
  const { rows } = await db.query<TurnRow>(
    `SELECT ${TURN_COLUMNS} FROM turns WHERE session_id = $1 AND account_id = $2 ORDER BY ts, id`,
    [sessionId, accountId],
  );
  return rows.map(toTurnRecord);
}
