/**
 * GET and POST /api/tutor/email/unsubscribe?t= — the opt-out every weekly
 * report carries (parent-comms skill). GET is the link a person clicks: it
 * turns the weekly report off on the first click and sends them to a page
 * that says so. POST is the RFC 8058 one-click form a mail client sends. No
 * sign-in either way, and neither touches essential mail (password resets,
 * safety notices), which has no opt-out.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { openDb, queryParam } from '@/lib/tutor/accounts';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { optOutByToken } from '@/lib/tutor/email/weekly';

export const dynamic = 'force-dynamic';

async function optOut(request: Request): Promise<boolean | Response> {
  const token = queryParam(request, 't');
  const opened = await openDb('change email settings');
  if (!opened.ok) return opened.response;
  return token ? optOutByToken(opened.db, token) : false;
}

export async function GET(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const result = await optOut(request);
  if (result instanceof Response) return result;
  const target = new URL(
    `${PRODUCT_ROUTES.unsubscribed}?state=${result ? 'off' : 'invalid'}`,
    `${resolveAppUrl(request)}/`,
  );
  return Response.redirect(target, 303);
}

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const result = await optOut(request);
  if (result instanceof Response) return result;
  if (!result) return apiError('INVALID_TOKEN', 400, 'This link is not valid any more.');
  return apiSuccess({ weeklyEmail: false });
}
