/**
 * POST /api/tutor/tts (voice-16): one sentence in, audio bytes out.
 *
 * The playback queue asks for one sentence at a time while the turn is still
 * streaming, so this route is on the critical path of the time-to-first-audio
 * budget (`LATENCY.firstAudioP50Ms`). It answers the provider's bytes with the
 * right `content-type`, never base64 JSON (`docs/ARCHITECTURE-MAP.md` §2.3
 * calls out `app/api/generate/tts/route.ts:155` for that), and never with a
 * cache: `cache-control: no-store`, because the bytes are a minor's voice
 * session.
 *
 * Invariant (b): the bytes exist as a `Uint8Array` from the provider and go
 * straight into the response body. Nothing writes them anywhere, and the text
 * is never logged — log lines carry ids and lengths only.
 */
import { NextResponse } from 'next/server';

import { measureAudioDuration } from '@/lib/audio/audio-duration';
import { generateTTS } from '@/lib/audio/tts-providers';
import type { TTSProviderId } from '@/lib/audio/types';
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/server/api-response';
import {
  isServerProviderDisabled,
  resolveTTSApiKey,
  resolveTTSBaseUrl,
  resolveTTSModel,
} from '@/lib/server/provider-config';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { recordUsageLine, SessionBudget, sessionSpentCents, ttsCost } from '@/lib/tutor/cost';
import { DbNotConfiguredError, getTutorDb, type Queryable } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { isAiKillSwitchOn } from '@/lib/tutor/guards/gates';
import { enforceRateLimits } from '@/lib/tutor/guards/rate-limit';
import type { TtsRequest } from '@/lib/tutor/wire';

const log = createLogger('tutor-tts');
const ROUTE = '/api/tutor/tts';

/** One sentence. The splitter never produces more (`lib/tutor/voice/sentence-splitter.ts`). */
export const TEXT_MAX = 600;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export const maxDuration = 30;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  pcm: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
};

function contentTypeFor(format: string): string {
  return CONTENT_TYPES[format.toLowerCase()] ?? 'application/octet-stream';
}

interface SessionRow extends Record<string, unknown> {
  id: string;
  ended_at: string | Date | null;
}

/** The session must belong to this account *and* this learner (invariant a). */
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
  if (isPreviewMode()) return previewReadOnlyResponse('speak');
  const { accountId, learnerId } = auth.principal;
  if (!learnerId) return apiError('FORBIDDEN', 403, 'Choose a learner first.');

  let body: Partial<TtsRequest>;
  try {
    body = (await request.json()) as Partial<TtsRequest>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return apiError('INVALID_REQUEST', 400, 'text is required.');
  if (text.length > TEXT_MAX) {
    return apiError('INVALID_REQUEST', 400, `text must be ${TEXT_MAX} characters or fewer.`);
  }
  const sessionId = body.sessionId;
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) {
    return apiError('INVALID_REQUEST', 400, 'sessionId must be a session id.');
  }
  const turnId = typeof body.turnId === 'string' && ID.test(body.turnId) ? body.turnId : null;

  try {
    const db = await getTutorDb();
    // Four independent reads guard this route, and every one of them is a
    // database round trip in front of the provider call on the sentence the
    // learner is waiting to hear. They do not depend on each other, so they go
    // out together: the pre-flight costs one round trip instead of four (spec
    // §5.3). Every guard still binds before `generateTTS` is called.
    const [session, killSwitch, limited, spent] = await Promise.all([
      ownedSession(db, sessionId, accountId, learnerId),
      isAiKillSwitchOn(db),
      enforceRateLimits(db, auth.principal, 'tts'),
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

    const providerId = (process.env.TUTOR_TTS_PROVIDER ?? 'openai-tts') as TTSProviderId;
    const voice = process.env.TUTOR_TTS_VOICE ?? 'alloy';
    if (isServerProviderDisabled('tts', providerId)) {
      return apiError('PROVIDER_DISABLED', 403, 'Speech is turned off on this server.');
    }
    const apiKey = resolveTTSApiKey(providerId);
    if (!apiKey) {
      return apiError('MISSING_API_KEY', 503, 'Speech is not configured on this server.');
    }

    // Spend check before the provider call, not after: the ceiling has to bind
    // on the request that would cross it (spec R9, invariant d). The total was
    // read in the pre-flight above; a read that failed counts as over.
    const cost = ttsCost(providerId, text.length);
    const budget = new SessionBudget();
    let overCeiling = !spent.ok;
    try {
      if (spent.ok) budget.record({ kind: 'tts', cents: spent.cents });
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

    const result = await generateTTS(
      {
        providerId,
        modelId: resolveTTSModel(providerId, undefined, voice),
        apiKey,
        baseUrl: resolveTTSBaseUrl(providerId),
        voice,
        signal: request.signal,
      },
      text,
    );

    await recordUsageLine(db, {
      accountId,
      learnerId,
      sessionId,
      turnId,
      kind: 'tts',
      provider: providerId,
      model: resolveTTSModel(providerId, undefined, voice) ?? null,
      quantity: text.length,
      unit: 'character',
      cents: cost.cents,
      priced: cost.priced,
    });

    // `measureAudioDuration` answers seconds; the header is milliseconds, and
    // is absent when the container is one it cannot parse.
    const seconds = measureAudioDuration(result.audio, result.format);
    log.info(
      `tts session=${sessionId} turn=${turnId ?? 'none'} chars=${text.length} provider=${providerId}`,
    );
    const headers = new Headers({
      'content-type': contentTypeFor(result.format),
      'content-length': String(result.audio.byteLength),
      'cache-control': 'no-store',
    });
    if (seconds !== null) headers.set('x-tutor-audio-ms', String(Math.round(seconds * 1000)));
    // A fresh copy so the response body owns a plain ArrayBuffer, never the
    // provider's pooled view; the provider bytes go out of scope right here.
    const bytes = new Uint8Array(result.audio);
    return new NextResponse(bytes, { status: 200, headers });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      sessionId,
      route: ROUTE,
      code: 'tts_failed',
    });
    return apiError('GENERATION_FAILED', 502, 'Speech failed. The tutor will keep going in text.');
  }
}
