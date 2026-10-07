/**
 * POST /api/tutor/asr (voice-17): one utterance in, its transcript out.
 *
 * Multipart `audio` plus `sessionId` (and `durationMs`, which the client
 * measured while recording — no container gives a reliable length for a
 * `MediaRecorder` slice). The clip is handed straight to `transcribeAudio` and
 * dropped; the only thing this route persists is a `usage_ledger` row counting
 * seconds. Invariant (b): the bytes are never written to disk, a database,
 * object storage, a log line, or an error report, and the transcript is never
 * logged either — the answer goes to the caller and nowhere else.
 *
 * `app/api/transcription/route.ts` is the shape this follows; the differences
 * are that the provider is server-resolved (no client key, no client baseUrl,
 * spec R8), the session is checked against the principal, and the usage line
 * that upstream's route is missing (`docs/ARCHITECTURE-MAP.md` §2.3) is
 * written here.
 */
import { transcribeAudio } from '@/lib/audio/asr-providers';
import type { ASRProviderId } from '@/lib/audio/types';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  isServerProviderDisabled,
  resolveASRApiKey,
  resolveASRBaseUrl,
  resolveASRModel,
  resolveServerASRProviderId,
} from '@/lib/server/provider-config';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import type { AsrResponse } from '@/lib/tutor/contracts';
import { asrCost, recordUsageLine, SessionBudget, sessionSpentCents } from '@/lib/tutor/cost';
import { DbNotConfiguredError, getTutorDb, type Queryable } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { isAiKillSwitchOn } from '@/lib/tutor/guards/gates';
import { enforceRateLimits } from '@/lib/tutor/guards/rate-limit';

const log = createLogger('tutor-asr');
const ROUTE = '/api/tutor/asr';

/** One utterance. The VAD caps an utterance at 30 s (`lib/tutor/voice/vad.ts`). */
export const CLIP_MAX_BYTES = 8 * 1024 * 1024;
export const CLIP_MAX_MS = 60_000;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export const maxDuration = 60;

interface SessionRow extends Record<string, unknown> {
  id: string;
  ended_at: string | Date | null;
}

async function ownedSession(
  db: Queryable,
  sessionId: string,
  accountId: string,
  learnerId: string,
): Promise<SessionRow | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT id, ended_at FROM sessions WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [sessionId, accountId, learnerId],
  );
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('listen');
  const { accountId, learnerId } = auth.principal;
  if (!learnerId) return apiError('FORBIDDEN', 403, 'Choose a learner first.');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request must be a multipart form.');
  }
  const audio = form.get('audio');
  if (!(audio instanceof Blob)) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'audio is required.');
  }
  if (audio.size === 0) return apiError('INVALID_REQUEST', 400, 'audio is empty.');
  if (audio.size > CLIP_MAX_BYTES) {
    return apiError('INVALID_REQUEST', 413, 'That clip is too long. Speak in shorter turns.');
  }
  const sessionId = form.get('sessionId');
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) {
    return apiError('INVALID_REQUEST', 400, 'sessionId must be a session id.');
  }
  const declaredMs = Number(form.get('durationMs') ?? Number.NaN);
  const clientMs =
    Number.isFinite(declaredMs) && declaredMs > 0 ? Math.min(declaredMs, CLIP_MAX_MS) : 0;

  try {
    const db = await getTutorDb();
    // ASR is the first hop of the turn, so its four guards are four database
    // round trips between the learner falling silent and the tutor starting to
    // think. They are independent, so they go out together and cost one round
    // trip (spec §5.3); each still binds before `transcribeAudio` is called.
    const [session, killSwitch, limited, spent] = await Promise.all([
      ownedSession(db, sessionId, accountId, learnerId),
      isAiKillSwitchOn(db),
      enforceRateLimits(db, auth.principal, 'asr'),
      sessionSpentCents(db, sessionId).then(
        (cents) => ({ ok: true as const, cents }),
        () => ({ ok: false as const, cents: 0 }),
      ),
    ]);
    if (!session) return apiError('NOT_FOUND', 404, 'No such session.');
    if (session.ended_at) return apiError('FORBIDDEN', 403, 'This session has ended.');
    if (killSwitch) {
      return apiError('FORBIDDEN', 403, 'The tutor is paused right now. Try again later.');
    }
    if (limited) return limited;

    const providerId = (process.env.TUTOR_ASR_PROVIDER ??
      resolveServerASRProviderId() ??
      'openai-whisper') as ASRProviderId;
    if (isServerProviderDisabled('asr', providerId)) {
      return apiError('PROVIDER_DISABLED', 403, 'Speech input is turned off on this server.');
    }
    const apiKey = resolveASRApiKey(providerId);
    if (!apiKey) {
      return apiError('MISSING_API_KEY', 503, 'Speech input is not configured on this server.');
    }

    // The ceiling binds on the request that would cross it (spec R9). The
    // total came from the pre-flight above; a read that failed counts as over.
    const seconds = clientMs > 0 ? clientMs / 1000 : audio.size / 32_000;
    const cost = asrCost(providerId, seconds);
    const budget = new SessionBudget();
    let overCeiling = !spent.ok;
    try {
      if (spent.ok) budget.record({ kind: 'asr', cents: spent.cents });
    } catch {
      overCeiling = true;
    }
    if (overCeiling || !budget.canSpend(cost.cents)) {
      return apiError(
        'FORBIDDEN',
        403,
        'This session reached its cost ceiling. Start a new session to keep going.',
      );
    }

    const model = resolveASRModel(providerId);
    const result = await transcribeAudio(
      {
        providerId,
        modelId: model,
        language: process.env.TUTOR_ASR_LANGUAGE || 'en',
        apiKey,
        baseUrl: resolveASRBaseUrl(providerId),
      },
      audio,
    );

    await recordUsageLine(db, {
      accountId,
      learnerId,
      sessionId,
      turnId: null,
      kind: 'asr',
      provider: providerId,
      model: model ?? null,
      quantity: seconds,
      unit: 'second',
      cents: cost.cents,
      priced: cost.priced,
    });

    // Ids and lengths only: the transcript never reaches a log line.
    log.info(`asr session=${sessionId} bytes=${audio.size} seconds=${seconds.toFixed(2)}`);
    const payload: AsrResponse = {
      text: typeof result.text === 'string' ? result.text : '',
      seconds,
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      sessionId,
      route: ROUTE,
      code: 'asr_failed',
    });
    return apiError(
      'TRANSCRIPTION_FAILED',
      502,
      'Could not make out that recording. Try again, or type it instead.',
    );
  }
}
