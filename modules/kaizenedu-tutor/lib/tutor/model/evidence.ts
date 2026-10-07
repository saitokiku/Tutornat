/**
 * The evidence writer (data-30, strategy D17). `evidence_events` is
 * append-only by trigger; corrections are new rows. Payloads carry ids,
 * counts, tags, and scores: never transcript text, names, or media.
 */
import { newId } from '@/lib/tutor/auth/session';
import type { EvidenceType } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

export interface EvidenceInput {
  accountId: string;
  learnerId: string;
  sessionId: string | null;
  type: EvidenceType;
  assisted: boolean;
  payload: Record<string, unknown>;
}

export async function writeEvidence(db: Queryable, input: EvidenceInput): Promise<string> {
  const id = newId('ev');
  await db.query(
    `INSERT INTO evidence_events (id, account_id, learner_id, session_id, type, assisted, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      id,
      input.accountId,
      input.learnerId,
      input.sessionId,
      input.type,
      input.assisted,
      JSON.stringify(input.payload),
    ],
  );
  return id;
}

/**
 * True when a hint was recorded for `skillId` in this session after the last
 * check result on that skill (strategy law 1: the next check is assisted).
 */
export async function hintSinceLastCheck(
  db: Queryable,
  sessionId: string,
  skillId: string,
): Promise<boolean> {
  const { rows } = await db.query<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM evidence_events h
     WHERE h.session_id = $1 AND h.type = 'hint' AND h.payload->>'skillId' = $2
       AND h.ts > COALESCE(
         (SELECT max(c.ts) FROM evidence_events c
          WHERE c.session_id = $1 AND c.type = 'check_result' AND c.payload->>'skillId' = $2),
         '-infinity'::timestamptz)`,
    [sessionId, skillId],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}
