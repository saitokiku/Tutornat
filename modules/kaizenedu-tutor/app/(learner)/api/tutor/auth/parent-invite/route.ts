/**
 * GET /api/tutor/auth/parent-invite?t= (wire ParentInviteResponse, 200):
 * what the emailed link is for — the teen's first name, login name and band,
 * the parent's address, and whether that address already has an account —
 * without consuming the token. 400 INVALID_TOKEN when the link is dead. Runs
 * before any session exists, so it applies the TUTOR_MODE and database gates
 * itself instead of through requirePrincipal.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  missingQueryParam,
  openDb,
  queryParam,
  readParentInvite,
} from '@/lib/tutor/accounts';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import type { ParentInviteResponse } from '@/lib/tutor/wire';

export async function GET(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const token = queryParam(request, 't');
  if (!token) return missingQueryParam('t');
  const opened = await openDb('open the invitation');
  if (!opened.ok) return opened.response;
  try {
    const payload: ParentInviteResponse = await readParentInvite(opened.db, token);
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
