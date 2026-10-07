/**
 * Client for POST /api/tutor/tts (voice-16): one request per sentence, bytes
 * back, no base64. The route answers `audio/*` with an `x-tutor-audio-ms`
 * header when it could measure the clip. A network failure or a 5xx is
 * retried once; 4xx answers (cost ceiling, paused tutor) are final and carry
 * the route's error code so the screen can show the right state.
 */
import { TUTOR_API } from '@/lib/tutor/contracts';

export interface TtsSentenceRequest {
  sessionId: string;
  text: string;
  turnId?: string;
}

export interface TtsSentenceResult {
  bytes: ArrayBuffer;
  format: string;
  durationMs: number | null;
}

export class TtsError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'TtsError';
  }

  /** True when retrying the same sentence cannot help (budget, policy, bad input). */
  get terminal(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }
}

export interface TtsClientOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  url?: string;
  /** Retries on network failure or 5xx. Default 1. */
  maxRetries?: number;
}

function formatFromContentType(contentType: string | null): string {
  if (!contentType) return 'mp3';
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (type === 'audio/mpeg' || type === 'audio/mp3') return 'mp3';
  if (type === 'audio/wav' || type === 'audio/x-wav' || type === 'audio/wave') return 'wav';
  if (type.startsWith('audio/')) return type.slice('audio/'.length);
  return 'mp3';
}

export async function fetchSentenceAudio(
  request: TtsSentenceRequest,
  options: TtsClientOptions = {},
): Promise<TtsSentenceResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 1;
  let attempt = 0;
  for (;;) {
    try {
      const response = await fetchImpl(options.url ?? TUTOR_API.tts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/*' },
        body: JSON.stringify(request),
        signal: options.signal,
        credentials: 'same-origin',
      });
      if (!response.ok) {
        let code = 'TTS_FAILED';
        let message = `Speech failed (HTTP ${response.status}).`;
        try {
          const body = (await response.json()) as { errorCode?: string; error?: string };
          if (typeof body.errorCode === 'string') code = body.errorCode;
          if (typeof body.error === 'string') message = body.error;
        } catch {
          // non-JSON failure body
        }
        const error = new TtsError(code, response.status, message);
        if (error.terminal || attempt >= maxRetries) throw error;
        throw new RetryableTts(error);
      }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength === 0) throw new TtsError('EMPTY_AUDIO', response.status, 'No audio');
      const header = response.headers.get('x-tutor-audio-ms');
      const durationMs = header && Number.isFinite(Number(header)) ? Number(header) : null;
      return {
        bytes,
        format: formatFromContentType(response.headers.get('content-type')),
        durationMs,
      };
    } catch (error) {
      if (options.signal?.aborted) throw new TtsError('ABORTED', null, 'Speech cancelled');
      if (error instanceof TtsError) throw error;
      if (attempt >= maxRetries) {
        if (error instanceof RetryableTts) throw error.inner;
        throw new TtsError('NETWORK', null, 'Could not reach the speech service.');
      }
      attempt += 1;
    }
  }
}

class RetryableTts extends Error {
  constructor(readonly inner: TtsError) {
    super(inner.message);
  }
}
