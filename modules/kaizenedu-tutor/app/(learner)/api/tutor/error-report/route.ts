/**
 * POST /api/tutor/error-report { code, route?, sessionId? } → 202.
 * The browser error boundary's report: ids and a short code only. The server
 * turns it into `reportError` (Sentry when configured) and an `error` event.
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { track } from '@/lib/tutor/analytics';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimit } from '@/lib/tutor/guards/rate-limit';

const ROUTE = '/api/tutor/error-report';
const CODE = /^[A-Za-z0-9_.-]{1,64}$/;
const PATH = /^\/[A-Za-z0-9_\-./]{0,199}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: Request) {
  const auth = await requirePrincipal(request);
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(auth.principal, 'error-report');
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const code = typeof input.code === 'string' && CODE.test(input.code) ? input.code : null;
  if (!code) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'code must be 1 to 64 letters, digits, dots, dashes, or underscores.',
    );
  }
  // The path only; a query string could carry typed content.
  const route =
    typeof input.route === 'string' && PATH.test(input.route.split('?')[0] ?? '')
      ? (input.route.split('?')[0] as string)
      : undefined;
  const sessionId =
    typeof input.sessionId === 'string' && ID.test(input.sessionId) ? input.sessionId : undefined;

  const { accountId, learnerId } = auth.principal;
  const report = await reportError(new Error(`client error ${code}`), {
    accountId,
    learnerId,
    sessionId,
    route,
    code: `client_${code}`,
    level: 'warning',
  });
  await track('error', {
    accountId,
    ...(learnerId ? { learnerId } : {}),
    ...(sessionId ? { sessionId } : {}),
    code,
    ...(route ? { route } : {}),
    source: 'client',
  });
  return apiSuccess({ reported: true, eventId: report.eventId }, 202);
}
