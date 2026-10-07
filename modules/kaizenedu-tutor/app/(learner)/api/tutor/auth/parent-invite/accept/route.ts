/**
 * POST /api/tutor/auth/parent-invite/accept (wire AcceptParentInviteRequest →
 * AcceptParentInviteResponse, 200). Anonymous with a name and a password: the
 * parent account is created around the teen's profile and the response sets
 * its session cookie. Signed in as the invited address: the profile attaches
 * to that account. Either way the teen profile, its consent row and the
 * consumed token land in one transaction. 400 INVALID_TOKEN for a dead link,
 * 403 for a different signed-in address, 409 when the address has an account
 * the caller is not signed in to, or when the login name was taken in the
 * meantime (the link stays usable with another).
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  acceptParentInvite,
  acceptParentInviteSchema,
  accountsErrorResponse,
  buildSessionState,
  openDb,
  parseJsonBody,
  requestId,
  withSetCookie,
} from '@/lib/tutor/accounts';
import { notFoundResponse, resolvePrincipal, unauthorized } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import { getAppSetting } from '@/lib/tutor/settings';
import type { AcceptParentInviteResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, acceptParentInviteSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('finish setting up the account');
  if (!opened.ok) return opened.response;
  const db = opened.db;
  try {
    const principal = await resolvePrincipal(request.headers, db);
    const accepted = await acceptParentInvite(db, body.data, {
      principal,
      under13Open: await getAppSetting(db, 'under13_gate'),
      evidenceRef: requestId(request),
    });
    const state = await buildSessionState(db, accepted.session?.principal ?? principal!);
    if (!state) return unauthorized();
    const payload: AcceptParentInviteResponse = { ...state, teen: accepted.teen };
    const response = apiSuccess({ ...payload });
    return accepted.session
      ? withSetCookie(
          response,
          sessionCookieHeader(accepted.session.token, accepted.session.expiresAt),
        )
      : response;
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
