/**
 * POST /api/tutor/turn — the streaming turn (spec §5.2, §5.3, R1, R2).
 *
 * The only product route that does not answer JSON: it streams
 * `text/event-stream`, one `data: <TurnEvent JSON>\n\n` per frame, in the order
 * `phase` → `text_delta`/`sentence`/`action`/`check`/`reaction` → `usage` →
 * `done`, or `error` and stop. `lib/tutor/turn/README.md` is the grammar the
 * session client reads.
 *
 * Refusals that happen before the stream opens are ordinary JSON failures: an
 * unknown session is 404, an ended one 409, a malformed body 400. A breach of
 * the session budget or the learner's daily cap happens after the headers are
 * out, so it arrives as an `error` frame and ends the session.
 */
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/server/api-response';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimits } from '@/lib/tutor/guards';
import { NOT_CONFIGURED_MESSAGE, tutorConfigStatus } from '@/lib/tutor/config-status';
import { isPreviewMode } from '@/lib/tutor/preview';
import { SSE_HEADERS, startTurn, turnEventStream } from '@/lib/tutor/turn';

const log = createLogger('tutor-turn-route');
const ROUTE = '/api/tutor/turn';

/** Long-lived streams: never statically optimised, never cached. */
export const dynamic = 'force-dynamic';
/** The model and the voice providers can take a while; vercel.json's pattern covers only upstream's api directory. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  const { principal } = auth;

  // Preview mode refuses through the stream, not with a JSON body: the client
  // is parsing text/event-stream by this point, and a JSON refusal would reach
  // it as an unreadable frame rather than a message it can show.
  if (isPreviewMode()) {
    const frame = `data: ${JSON.stringify({
      type: 'error',
      code: 'PREVIEW_READ_ONLY',
      message:
        'This is a preview with sample data, so it cannot run a live session. Set DATABASE_URL to run for real.',
    })}\n\n`;
    return new Response(frame, { status: 200, headers: SSE_HEADERS });
  }

  // A deploy with no provider key answers every other route normally and then
  // kills the turn, which reaches the learner as a tutor that will not start
  // and reaches the log as a provider auth error three layers down. Refuse
  // here instead, with the operator's detail in the log and a sentence a child
  // can read on the screen. GET /api/tutor/health says exactly what is unset.
  const config = tutorConfigStatus();
  if (!config.llm.key) {
    log.error(`turn refused: not configured (missing ${config.missing.join(', ')})`);
    return apiError('NOT_CONFIGURED', 503, NOT_CONFIGURED_MESSAGE);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }

  try {
    const db = await getTutorDb();
    const limited = await enforceRateLimits(db, principal, 'turn');
    if (limited) return limited;

    const started = await startTurn({
      db,
      principal,
      body: body as never,
      signal: request.signal,
      baseUrl: resolveAppUrl(request),
    });
    if (!started.ok) {
      return apiError(started.code, started.status, started.message);
    }
    return new Response(
      turnEventStream(started.events, (error) => {
        void reportError(error, {
          accountId: principal.accountId,
          learnerId: principal.learnerId,
          route: ROUTE,
          code: 'turn_stream_failed',
        });
      }),
      { status: 200, headers: SSE_HEADERS },
    );
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    log.error(`turn refused account=${principal.accountId}`);
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      route: ROUTE,
      code: 'turn_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'The tutor could not answer. Try again.');
  }
}
