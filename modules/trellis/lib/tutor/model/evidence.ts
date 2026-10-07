/**
 * The evidence writer (data-30, strategy D17). `evidence_events` is
 * append-only by trigger; corrections are new rows. Payloads carry ids,
 * counts, tags, and scores: never transcript text, names, or media.
 *
 * E1 containment (SPEC v0.3 §3.1, ADR-0042): every row names its evidence
 * class. This writer is the tutoring/report side of the boundary and may
 * append only `assisted-help` and `corrections-practice`. The qualifying
 * classes (`unassisted-attempt`, `delayed-retention`) belong to a restricted
 * assessment service that does not exist in this repository; asking this
 * writer for one throws before any SQL runs. A payload cannot smuggle
 * `qualifying: true` past it either — the writer owns that field.
 */
import type { EvidenceClass, EvidenceType } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { newId } from '@/lib/tutor/ids';

import { CONTAINMENT_RULE_VERSION } from './student-model';

export const QUALIFYING_EVIDENCE_CLASSES: ReadonlySet<EvidenceClass> = new Set<EvidenceClass>([
  'unassisted-attempt',
  'delayed-retention',
]);

export class QualifyingEvidenceRefusedError extends Error {
  readonly code = 'QUALIFYING_EVIDENCE_REFUSED' as const;

  constructor(readonly evidenceClass: EvidenceClass) {
    super(
      `evidence class "${evidenceClass}" is qualifying evidence; only the restricted assessment service may append it, and none exists in this repository (E1, SPEC §3.1)`,
    );
    this.name = 'QualifyingEvidenceRefusedError';
  }
}

export interface EvidenceInput {
  accountId: string;
  learnerId: string;
  sessionId: string | null;
  type: EvidenceType;
  assisted: boolean;
  /**
   * Defaults from `assisted`: help observed → `assisted-help`, otherwise
   * `corrections-practice`. Never a qualifying class through this writer.
   */
  evidenceClass?: EvidenceClass;
  payload: Record<string, unknown>;
}

export function practiceEvidenceClass(assisted: boolean): EvidenceClass {
  return assisted ? 'assisted-help' : 'corrections-practice';
}

export async function writeEvidence(db: Queryable, input: EvidenceInput): Promise<string> {
  const evidenceClass = input.evidenceClass ?? practiceEvidenceClass(input.assisted);
  if (QUALIFYING_EVIDENCE_CLASSES.has(evidenceClass)) {
    throw new QualifyingEvidenceRefusedError(evidenceClass);
  }
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
      JSON.stringify({
        ...input.payload,
        evidenceClass,
        qualifying: false,
        ruleVersion: CONTAINMENT_RULE_VERSION,
      }),
    ],
  );
  return id;
}

/**
 * True when a hint was recorded for `skillId` in this session after the last
 * check result on that skill (strategy law 1: the next check is assisted).
 * Inherited scope: this session only. Cross-session exposure is the later
 * assessment path's problem (docs/first-build.md), not E1's; here a hint can
 * at most change the practice evidence class.
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
