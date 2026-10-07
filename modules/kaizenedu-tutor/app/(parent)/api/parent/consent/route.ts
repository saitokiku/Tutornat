/**
 * /api/parent/consent (spec R16, §11.2 items 3 and 12, D11). GET lists the
 * account's consent records (optionally one learner's); POST records one and
 * re-evaluates the profile status against the under-13 gate; DELETE revokes
 * and freezes the profile at once. Camera consent is accepted only while the
 * camera_sensing_enabled gate is open.
 */
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  createConsentSchema,
  listConsents,
  onAccountEvent,
  parseJsonBody,
  queryParam,
  recordConsent,
  requestId,
  requireLearner,
  revokeConsent,
  revokeConsentSchema,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import { readGates } from '@/lib/tutor/settings';
import type {
  CreateConsentResponse,
  ListConsentsResponse,
  RevokeConsentResponse,
} from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    return apiSuccess({ consents: [] });
  }
  const learnerId = queryParam(request, 'learnerId');
  const db = await getTutorDb();
  try {
    if (learnerId) await requireLearner(db, auth.principal.accountId, learnerId);
    const payload: ListConsentsResponse = {
      consents: await listConsents(db, auth.principal.accountId, learnerId ?? undefined),
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('record consent');
  const body = await parseJsonBody(request, createConsentSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  try {
    const gates = await readGates(db);
    const result = await recordConsent(db, auth.principal.accountId, body.data, {
      evidenceRef: requestId(request),
      under13Open: gates.under13_gate,
      cameraSensingEnabled: gates.camera_sensing_enabled,
    });
    onAccountEvent('consent_recorded', {
      accountId: auth.principal.accountId,
      learnerId: result.learner.id,
    });
    const payload: CreateConsentResponse = result;
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('revoke consent');
  const body = await parseJsonBody(request, revokeConsentSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  try {
    const payload: RevokeConsentResponse = {
      learner: await revokeConsent(db, auth.principal.accountId, body.data.learnerId),
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
