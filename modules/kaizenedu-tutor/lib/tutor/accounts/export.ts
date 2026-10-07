/**
 * The data export (spec §11.2 item 4 review and export, R16): every row the
 * product holds for one learner, scoped by account id. Evidence rows are
 * exported as they are stored (ids, type, the assisted flag, the payload).
 */
import type { Queryable } from '@/lib/tutor/db';
import type { DataExportResponse } from '@/lib/tutor/wire';
import {
  MASTERY_COLUMNS,
  MISCONCEPTION_COLUMNS,
  SESSION_COLUMNS,
  toMisconceptionState,
  toSkillMastery,
  toTurnRecord,
  toTutorSession,
  TURN_COLUMNS,
} from '@/lib/tutor/report/rows';
import type { MasteryRow, MisconceptionRow, SessionRow, TurnRow } from '@/lib/tutor/report/rows';

import { listConsents } from './consents';
import { requireLearner, toLearner } from './learners';
import { toIso } from './rows';

const TURN_COLUMNS_OF_T = TURN_COLUMNS.split(', ')
  .map((column) => `t.${column}`)
  .join(', ');

interface EvidenceRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  session_id: string | null;
  type: string;
  assisted: boolean;
  payload: unknown;
  ts: string | Date;
}

export async function exportLearnerData(
  db: Queryable,
  accountId: string,
  learnerId: string,
  now = new Date(),
): Promise<DataExportResponse> {
  const learner = await requireLearner(db, accountId, learnerId);
  const [sessions, turns, mastery, misconceptions, evidence, consents] = await Promise.all([
    db.query<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM sessions WHERE account_id = $1 AND learner_id = $2 ORDER BY started_at, id`,
      [accountId, learnerId],
    ),
    db.query<TurnRow>(
      `SELECT ${TURN_COLUMNS_OF_T}
       FROM turns t JOIN sessions s ON s.id = t.session_id
       WHERE s.account_id = $1 AND s.learner_id = $2 AND t.account_id = $1
       ORDER BY t.ts, t.id`,
      [accountId, learnerId],
    ),
    db.query<MasteryRow>(
      `SELECT ${MASTERY_COLUMNS} FROM skill_mastery WHERE account_id = $1 AND learner_id = $2 ORDER BY skill_id`,
      [accountId, learnerId],
    ),
    db.query<MisconceptionRow>(
      `SELECT ${MISCONCEPTION_COLUMNS} FROM misconceptions WHERE account_id = $1 AND learner_id = $2 ORDER BY first_seen_at, tag`,
      [accountId, learnerId],
    ),
    db.query<EvidenceRow>(
      `SELECT id, learner_id, session_id, type, assisted, payload, ts FROM evidence_events
       WHERE account_id = $1 AND learner_id = $2 ORDER BY ts, id`,
      [accountId, learnerId],
    ),
    listConsents(db, accountId, learnerId),
  ]);
  return {
    learner: toLearner(learner),
    sessions: sessions.rows.map(toTutorSession),
    turns: turns.rows.map(toTurnRecord),
    mastery: mastery.rows.map(toSkillMastery),
    misconceptions: misconceptions.rows.map(toMisconceptionState),
    evidence: evidence.rows.map((row) => ({
      id: row.id,
      learnerId: row.learner_id,
      sessionId: row.session_id,
      type: row.type,
      assisted: Boolean(row.assisted),
      payload: row.payload,
      ts: toIso(row.ts),
    })),
    consents,
    exportedAt: now.toISOString(),
  };
}
