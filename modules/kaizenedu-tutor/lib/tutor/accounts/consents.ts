/**
 * Consent records (spec §8.5 `consents`, §11.2 items 3 and 12, R16, D11).
 * One row per grant, for every learner: the minors' plumbing exists for all
 * bands (D11), adults included so the table has one shape. Revoking sets
 * `revoked_at` on the open rows and freezes the profile at once (R16).
 * `evidence_ref` carries the request id today; the card-transaction id lands
 * there when consent-33's Stripe step exists. The camera is a separate flag
 * on the row because the notice names it separately (§11.2 item 12).
 */
import { newId } from '@/lib/tutor/auth/session';
import type { Learner, LearnerKind, LearnerStatus } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import type { ConsentRecord, CreateConsentRequest } from '@/lib/tutor/wire';

import { hasPendingDeletion } from './deletion';
import { AccountsError, notFound } from './errors';
import { freezeLearner, requireLearner, setLearnerStatus, toLearner } from './learners';
import { toIso, toIsoOrNull } from './rows';

export interface ConsentRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  learner_id: string;
  method: string;
  notice_version: string;
  policy_version: string;
  camera: boolean;
  granted_at: string | Date;
  revoked_at: string | Date | null;
  evidence_ref: string | null;
}

export function toConsentRecord(row: ConsentRow): ConsentRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    method: row.method,
    noticeVersion: row.notice_version,
    policyVersion: row.policy_version,
    camera: Boolean(row.camera),
    grantedAt: toIso(row.granted_at),
    revokedAt: toIsoOrNull(row.revoked_at),
  };
}

export async function listConsents(
  db: Queryable,
  accountId: string,
  learnerId?: string,
): Promise<ConsentRecord[]> {
  const { rows } = await db.query<ConsentRow>(
    `SELECT * FROM consents
     WHERE account_id = $1 AND ($2::text IS NULL OR learner_id = $2)
     ORDER BY granted_at DESC, id DESC`,
    [accountId, learnerId ?? null],
  );
  return rows.map(toConsentRecord);
}

/** `granted` when an unrevoked row exists, `revoked` when only revoked rows do, else `none`. */
export type ConsentState = 'none' | 'granted' | 'revoked';

export async function consentState(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<ConsentState> {
  const { rows } = await db.query<{ open: number | string; total: number | string }>(
    `SELECT count(*) FILTER (WHERE revoked_at IS NULL)::int AS open, count(*)::int AS total
     FROM consents WHERE account_id = $1 AND learner_id = $2`,
    [accountId, learnerId],
  );
  const open = Number(rows[0]?.open ?? 0);
  const total = Number(rows[0]?.total ?? 0);
  if (open > 0) return 'granted';
  return total > 0 ? 'revoked' : 'none';
}

export interface ResolveStatusInput {
  kind: LearnerKind;
  status: LearnerStatus;
  consent: ConsentState;
  /** `under13_gate` from app_settings. */
  under13Open: boolean;
}

/**
 * The status a profile should have (consent-36 rules, pure and unit-tested):
 * a revoked consent freezes any profile; a frozen profile stays frozen unless
 * a new consent is granted; a child is active only while the under-13 gate is
 * open and locked otherwise (the gate is the operator's switch after counsel
 * sign-off, and a consent record alone never opens it); teen and adult
 * profiles are active. Re-evaluation never downgrades an active 13+ profile.
 */
export function resolveLearnerStatus(input: ResolveStatusInput): LearnerStatus {
  if (input.consent === 'revoked') return 'frozen';
  if (input.status === 'frozen' && input.consent !== 'granted') return 'frozen';
  if (input.kind === 'child') return input.under13Open ? 'active' : 'locked';
  return 'active';
}

export interface RecordConsentContext {
  /** The request id (later the transaction id): stored as `evidence_ref`. */
  evidenceRef: string;
  under13Open: boolean;
  cameraSensingEnabled: boolean;
}

export async function recordConsent(
  db: Queryable,
  accountId: string,
  input: CreateConsentRequest,
  context: RecordConsentContext,
): Promise<{ consent: ConsentRecord; learner: Learner }> {
  const row = await requireLearner(db, accountId, input.learnerId);
  const noticeVersion = input.noticeVersion.trim();
  const policyVersion = input.policyVersion.trim();
  if (!noticeVersion || !policyVersion) {
    throw new AccountsError(
      'MISSING_REQUIRED_FIELD',
      400,
      'A consent record names the notice version and the policy version it was given for.',
    );
  }
  if (input.camera && !context.cameraSensingEnabled) {
    throw new AccountsError(
      'GATE_CLOSED',
      409,
      'Camera consent cannot be recorded while the camera_sensing_enabled gate is shut.',
    );
  }
  if (await hasPendingDeletion(db, accountId, input.learnerId)) {
    throw new AccountsError(
      'CONFLICT',
      409,
      'This profile has a deletion request in progress; consent cannot be recorded.',
    );
  }
  const { rows } = await db.query<ConsentRow>(
    `INSERT INTO consents (id, account_id, learner_id, method, notice_version, policy_version, camera, evidence_ref)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      newId('cns'),
      accountId,
      row.id,
      input.method,
      noticeVersion,
      policyVersion,
      input.camera,
      context.evidenceRef,
    ],
  );
  const consent = toConsentRecord(rows[0]!);
  const status = resolveLearnerStatus({
    kind: row.kind,
    status: row.status,
    consent: 'granted',
    under13Open: context.under13Open,
  });
  const learner =
    status === row.status
      ? toLearner(row)
      : ((await setLearnerStatus(db, accountId, row.id, status)) ?? toLearner(row));
  return { consent, learner };
}

/**
 * Revokes every open consent of the learner and freezes the profile (R16:
 * "revoke freezes the profile"). Also the parent's "refuse further collection"
 * right (§11.2 item 4) for a profile that never needed a consent row.
 */
export async function revokeConsent(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<Learner> {
  await requireLearner(db, accountId, learnerId);
  await db.query(
    `UPDATE consents SET revoked_at = now()
     WHERE account_id = $1 AND learner_id = $2 AND revoked_at IS NULL`,
    [accountId, learnerId],
  );
  const learner = await freezeLearner(db, accountId, learnerId);
  if (!learner) throw notFound('Learner not found');
  return learner;
}
