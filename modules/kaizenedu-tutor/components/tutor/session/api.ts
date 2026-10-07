/**
 * The session screen's calls to the product API. Paths come from
 * `TUTOR_API` and bodies from `lib/tutor/wire.ts`; the typed client
 * (`lib/tutor/client`) classifies every failure once, so the screen branches
 * on `kind` and never on a status code.
 *
 * `/api/tutor/turn`, `/api/tutor/tts`, and `/api/tutor/asr` are not here: they
 * are not JSON, and the voice loop owns them (`lib/tutor/voice/sse-client.ts`,
 * `tts-client.ts`, `asr-client.ts`).
 */
import { client, type ClientResult } from '@/lib/tutor/client';
import { TUTOR_API } from '@/lib/tutor/contracts';
import type {
  AttentionRequest,
  CheckAnswerRequest,
  CheckAnswerResponse,
  FlagRequest,
  FlagResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  WrapRequest,
  WrapResponse,
} from '@/lib/tutor/wire';

export function heartbeat(
  sessionId: string,
  minutes: number,
): Promise<ClientResult<UpdateSessionResponse>> {
  const body: UpdateSessionRequest = { sessionId, action: 'heartbeat', minutes };
  return client.patch<UpdateSessionResponse>(TUTOR_API.session, body);
}

export function endSession(sessionId: string): Promise<ClientResult<UpdateSessionResponse>> {
  const body: UpdateSessionRequest = { sessionId, action: 'end' };
  return client.patch<UpdateSessionResponse>(TUTOR_API.session, body);
}

export function setThumbs(
  sessionId: string,
  thumbs: 'up' | 'down',
): Promise<ClientResult<UpdateSessionResponse>> {
  const body: UpdateSessionRequest = { sessionId, action: 'thumbs', thumbs };
  return client.patch<UpdateSessionResponse>(TUTOR_API.session, body);
}

export function answerCheck(body: CheckAnswerRequest): Promise<ClientResult<CheckAnswerResponse>> {
  return client.post<CheckAnswerResponse>(TUTOR_API.check, body);
}

export function requestWrap(sessionId: string): Promise<ClientResult<WrapResponse>> {
  const body: WrapRequest = { sessionId };
  return client.post<WrapResponse>(TUTOR_API.wrap, body);
}

export function reportProblem(body: FlagRequest): Promise<ClientResult<FlagResponse>> {
  return client.post<FlagResponse>(TUTOR_API.flag, body);
}

/**
 * Coarse attention states and ladder events only. There is no media in this
 * body and no code path that could put any there (spec D16).
 */
export function postAttention(
  body: AttentionRequest,
): Promise<ClientResult<Record<string, unknown>>> {
  return client.post<Record<string, unknown>>(TUTOR_API.attention, body);
}
