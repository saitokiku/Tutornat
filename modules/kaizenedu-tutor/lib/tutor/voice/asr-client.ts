/**
 * Client for POST /api/tutor/asr (voice-17): one multipart upload per
 * utterance, the transcript back. The clip is a Blob that lives only in
 * memory and is handed straight to `fetch`; nothing keeps a reference to it
 * afterwards (spec §5.3: audio is never persisted).
 */
import type { AsrResponse } from '@/lib/tutor/contracts';
import { TUTOR_API } from '@/lib/tutor/contracts';

export interface AsrClipRequest {
  sessionId: string;
  blob: Blob;
  /** Client-measured length, used by the route when the container has no header. */
  durationMs: number;
  fileName?: string;
}

export class AsrError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'AsrError';
  }
}

export interface AsrClientOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  url?: string;
}

function fileNameFor(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes('wav')) return 'clip.wav';
  if (type.includes('mp4') || type.includes('aac')) return 'clip.m4a';
  if (type.includes('ogg')) return 'clip.ogg';
  return 'clip.webm';
}

export async function transcribeClip(
  request: AsrClipRequest,
  options: AsrClientOptions = {},
): Promise<AsrResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const form = new FormData();
  form.set('audio', request.blob, request.fileName ?? fileNameFor(request.blob));
  form.set('sessionId', request.sessionId);
  form.set('durationMs', String(Math.max(0, Math.round(request.durationMs))));
  let response: Response;
  try {
    response = await fetchImpl(options.url ?? TUTOR_API.asr, {
      method: 'POST',
      body: form,
      signal: options.signal,
      credentials: 'same-origin',
    });
  } catch {
    if (options.signal?.aborted) throw new AsrError('ABORTED', null, 'Cancelled');
    throw new AsrError('NETWORK', null, 'Could not reach the transcription service.');
  }
  let body: {
    success?: boolean;
    text?: string;
    seconds?: number;
    errorCode?: string;
    error?: string;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new AsrError('BAD_RESPONSE', response.status, 'Transcription answered with no JSON.');
  }
  if (!response.ok || body.success === false) {
    throw new AsrError(
      body.errorCode ?? 'ASR_FAILED',
      response.status,
      body.error ?? `Transcription failed (HTTP ${response.status}).`,
    );
  }
  return {
    text: typeof body.text === 'string' ? body.text : '',
    seconds: typeof body.seconds === 'number' ? body.seconds : request.durationMs / 1000,
  };
}
