/**
 * /api/parent/settings (wire SettingsResponse): the parent's own settings
 * plus the three fail-closed gates the parent UI reads. PATCH merges a
 * partial update; switching camera sensing on needs the camera gate open
 * (spec D16, §11.2 item 12), otherwise 409 naming the gate.
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  getParentSettings,
  parseJsonBody,
  updateParentSettings,
  updateSettingsSchema,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import { readGates } from '@/lib/tutor/settings';
import type { SettingsResponse } from '@/lib/tutor/wire';

async function gatesFor(
  db: Awaited<ReturnType<typeof getTutorDb>>,
): Promise<SettingsResponse['gates']> {
  const gates = await readGates(db);
  return {
    under13Open: gates.under13_gate,
    cameraSensingEnabled: gates.camera_sensing_enabled,
    billingEnabled: gates.billing_enabled,
  };
}

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    return apiSuccess({
      settings: { cameraSensing: false, recoveryStepsDisabled: [], weeklyEmail: true },
      gates: { under13Open: false, cameraSensingEnabled: false, billingEnabled: false },
    });
  }
  const db = await getTutorDb();
  const payload: SettingsResponse = {
    settings: await getParentSettings(db, auth.principal.accountId),
    gates: await gatesFor(db),
  };
  return apiSuccess({ ...payload });
}

export async function PATCH(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('change settings');
  const body = await parseJsonBody(request, updateSettingsSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  const gates = await gatesFor(db);
  if (body.data.cameraSensing && !gates.cameraSensingEnabled) {
    return apiError(
      'GATE_CLOSED',
      409,
      'Camera sensing cannot be switched on while the camera_sensing_enabled gate is shut.',
    );
  }
  try {
    const payload: SettingsResponse = {
      settings: await updateParentSettings(db, auth.principal.accountId, body.data),
      gates,
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
