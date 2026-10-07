/**
 * Client for POST /api/tutor/turn (voice-18): a tolerant `text/event-stream`
 * reader with one idempotent retry by `clientTurnId`.
 *
 * Wire grammar (lib/tutor/wire.ts): every frame is `data: <TurnEvent JSON>`
 * followed by a blank line. Unknown event types and missing optional fields
 * are tolerated so the client and the turn engine can drift a little without
 * breaking the session: unknown types come out as `{ type: 'unknown' }` and
 * the controller ignores them.
 *
 * A dropped stream (network error, 5xx, or a body that ends before `done`)
 * is retried once with the same request. The retry is announced with a local
 * `{ type: 'reconnect' }` event so the consumer can discard the partial turn
 * before the replayed frames arrive. 4xx answers and `error` frames are final.
 */
import type {
  CheckPrompt,
  CheckResult,
  ReactionKind,
  SessionPhase,
  TurnEvent,
  TurnRequest,
  WhiteboardAction,
} from '@/lib/tutor/contracts';
import { TUTOR_API } from '@/lib/tutor/contracts';

export type ParsedTurnEvent =
  | TurnEvent
  | { type: 'unknown'; raw: Record<string, unknown> }
  | { type: 'reconnect'; attempt: number };

export interface SseFrameParser {
  /** Feed decoded text; returns the `data` payloads of every completed frame. */
  push(chunk: string): string[];
  /** Return the payload of a trailing frame that had no terminating blank line. */
  flush(): string[];
}

/** Splits an event-stream into frame payloads (the `data` lines joined by newlines). */
export function createSseFrameParser(): SseFrameParser {
  let buffer = '';

  const frameData = (frame: string): string | null => {
    const lines: string[] = [];
    for (const rawLine of frame.split('\n')) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('data:')) lines.push(line.slice(5).replace(/^ /, ''));
      // `event:`, `id:`, `retry:` carry nothing the tutor needs.
    }
    return lines.length > 0 ? lines.join('\n') : null;
  };

  return {
    push(chunk) {
      buffer += chunk;
      const out: string[] = [];
      for (;;) {
        const match = /\r?\n\r?\n/.exec(buffer);
        if (!match) break;
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const data = frameData(frame);
        if (data !== null) out.push(data);
      }
      return out;
    },
    flush() {
      const rest = buffer;
      buffer = '';
      const data = rest.trim() ? frameData(rest) : null;
      return data !== null ? [data] : [];
    },
  };
}

const SESSION_PHASES: readonly SessionPhase[] = [
  'greet',
  'intake',
  'diagnose',
  'work',
  'check',
  'wrap',
  'ended',
];
const REACTIONS: readonly ReactionKind[] = ['smile', 'not_quite', 'neutral'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asPhase(value: unknown, fallback: SessionPhase): SessionPhase {
  return typeof value === 'string' && (SESSION_PHASES as readonly string[]).includes(value)
    ? (value as SessionPhase)
    : fallback;
}

let fallbackSentenceIndex = 0;

/** Validate one decoded frame into a TurnEvent; tolerant of aliases and gaps. */
export function parseTurnEvent(payload: string | Record<string, unknown>): ParsedTurnEvent | null {
  let raw: unknown = payload;
  if (typeof payload === 'string') {
    try {
      raw = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!isRecord(raw) || typeof raw.type !== 'string') return null;
  // Some engines nest the payload under `data`; accept both shapes.
  const data = isRecord(raw.data) ? { ...raw.data, type: raw.type } : raw;

  switch (data.type) {
    case 'phase':
      return {
        type: 'phase',
        phase: asPhase(data.phase, 'work'),
        remainingMs: asNumber(data.remainingMs, Number.NaN),
      };
    case 'text_delta': {
      const text = asString(data.text, asString(data.content, asString(data.delta)));
      return { type: 'text_delta', text };
    }
    case 'sentence': {
      const text = asString(data.text, asString(data.content));
      if (!text) return null;
      const index = asNumber(data.index, fallbackSentenceIndex);
      fallbackSentenceIndex = index + 1;
      return { type: 'sentence', index, text };
    }
    case 'action': {
      const action = isRecord(data.action) ? data.action : data;
      if (typeof action.type !== 'string' || !action.type.startsWith('wb_')) return null;
      return { type: 'action', action: action as unknown as WhiteboardAction };
    }
    case 'check': {
      const check = isRecord(data.check) ? data.check : null;
      if (!check || typeof check.checkId !== 'string' || typeof check.stem !== 'string')
        return null;
      return { type: 'check', check: check as unknown as CheckPrompt };
    }
    case 'check_result': {
      const result = isRecord(data.result) ? data.result : null;
      if (!result || typeof result.checkId !== 'string') return null;
      return { type: 'check_result', result: result as unknown as CheckResult };
    }
    case 'reaction': {
      const kind = asString(data.kind, 'neutral');
      return {
        type: 'reaction',
        kind: (REACTIONS as readonly string[]).includes(kind) ? (kind as ReactionKind) : 'neutral',
      };
    }
    case 'usage':
      return {
        type: 'usage',
        turnId: asString(data.turnId),
        cents: asNumber(data.cents, 0),
        sessionCents: asNumber(data.sessionCents, 0),
      };
    case 'done':
      return { type: 'done', turnId: asString(data.turnId), phase: asPhase(data.phase, 'work') };
    case 'error':
      return {
        type: 'error',
        code: asString(data.code, 'UNKNOWN'),
        message: asString(data.message, asString(data.error, 'Something went wrong.')),
      };
    default:
      return { type: 'unknown', raw: data };
  }
}

export class TurnStreamError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'TurnStreamError';
  }
}

export interface StreamTurnOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Delay before the single retry. Default 300 ms. */
  retryDelayMs?: number;
  /** Retries allowed on a dropped stream. Default 1. */
  maxRetries?: number;
  url?: string;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function* readFrames(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<ParsedTurnEvent> {
  if (!response.body) throw new TurnStreamError('NO_BODY', response.status, 'Empty response');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseFrameParser();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const payload of parser.push(decoder.decode(value, { stream: true }))) {
        const event = parseTurnEvent(payload);
        if (event) yield event;
      }
    }
    for (const payload of parser.flush()) {
      const event = parseTurnEvent(payload);
      if (event) yield event;
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * POST the turn and yield its events. Ends after `done` or `error`. Throws
 * `TurnStreamError` when the request fails for good or the caller aborts.
 */
export async function* streamTurn(
  request: TurnRequest,
  options: StreamTurnOptions = {},
): AsyncGenerator<ParsedTurnEvent> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 1;
  const url = options.url ?? TUTOR_API.turn;
  let attempt = 0;

  for (;;) {
    let sawDone = false;
    let sawEvents = false;
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request),
        signal: options.signal,
        credentials: 'same-origin',
      });
      if (!response.ok) {
        let code = 'HTTP_ERROR';
        let message = `The tutor did not answer (HTTP ${response.status}).`;
        try {
          const body = (await response.json()) as { errorCode?: string; error?: string };
          if (typeof body.errorCode === 'string') code = body.errorCode;
          if (typeof body.error === 'string') message = body.error;
        } catch {
          // no JSON body
        }
        if (response.status >= 500 && attempt < maxRetries) {
          throw new TurnStreamError(code, response.status, message);
        }
        yield { type: 'error', code, message };
        return;
      }
      for await (const event of readFrames(response, options.signal)) {
        sawEvents = true;
        yield event;
        if (event.type === 'done' || event.type === 'error') {
          sawDone = true;
          return;
        }
      }
      if (sawDone) return;
      // The body ended without `done`: treat as a dropped stream.
      throw new TurnStreamError('STREAM_DROPPED', null, 'The connection dropped mid-turn.');
    } catch (error) {
      if (options.signal?.aborted) {
        throw new TurnStreamError('ABORTED', null, 'Turn aborted');
      }
      if (attempt >= maxRetries) {
        if (error instanceof TurnStreamError) {
          yield { type: 'error', code: error.code, message: error.message };
          return;
        }
        yield {
          type: 'error',
          code: sawEvents ? 'STREAM_DROPPED' : 'NETWORK',
          message: 'The connection dropped. Check your network and try again.',
        };
        return;
      }
      attempt += 1;
      await sleep(options.retryDelayMs ?? 300, options.signal);
      yield { type: 'reconnect', attempt };
    }
  }
}
