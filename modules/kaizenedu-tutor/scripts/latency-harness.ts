/**
 * Latency harness — spike-05 and the per-PR loop check (spec §5.3, R1; CLAUDE.md
 * performance budgets).
 *
 * Runs a scripted learner conversation against a deployed OpenMAIC-derived
 * server over plain HTTP and reports p50/p90 per hop:
 *
 *   learner_synth   TTS of the learner's line (produces realistic ASR input; not budgeted)
 *   asr             POST /api/transcription with that audio → transcript
 *   llm_ttft        POST /api/chat → first text_delta
 *   llm_first_sent  POST /api/chat → first complete sentence
 *   llm_total       POST /api/chat → done
 *   tts_first       TTS of the first sentence → response
 *   turn_to_audio   product mode: turn request out → that sentence's audio in hand,
 *                   with TTS fired at the `sentence` frame while the model streams on
 *   first_audio     asr + llm_first_sent + tts_first  (the serial sum: an upper bound)
 *   first_audio_pipelined  asr + turn_to_audio (the §5.3 figure for the real loop)
 *   wb_first_action first whiteboard action relative to the first text delta
 *   wb_action_to_sentence  product mode: the longest wait in the turn from a whiteboard
 *                   `action` frame to the `sentence` frame it sits in (the words the
 *                   tag was placed next to). The drawing is on the board the moment its
 *                   frame arrives, and that sentence's audio is only requested at its
 *                   frame, so this gap is how far ahead of its words a drawing lands
 *                   (budget: LATENCY.whiteboardActionAfterSentenceMs, judged at p90)
 *
 * The figure is the API floor: a real client adds VAD end-of-speech detection
 * (`VAD_END_OF_SPEECH_LAG_MS`, 600 ms — the silence a detector waits through
 * before it calls an utterance finished, and time the learner is already
 * inside the budget for), device network, and audio decode. Nothing here calls
 * a model SDK; the server's own routes and provider keys do the work.
 *
 * Required env (real mode): a server with a routed model (MODEL_ROUTES or
 *   DEFAULT_MODEL) and server-configured TTS and ASR providers.
 * Optional env: LATENCY_BASE_URL (default http://localhost:3000),
 *   LATENCY_ACCESS_CODE (staging ACCESS_CODE), LATENCY_TTS_PROVIDER,
 *   LATENCY_TTS_VOICE, LATENCY_ASR_PROVIDER, LATENCY_MODEL (provider:model,
 *   ignored when the chat-adapter stage is routed).
 * Usage:
 *   pnpm latency --turns 6 --out docs/metrics/latency-2026-09-10.json
 *   pnpm latency --mock            # proves the harness against an in-process fake
 *   pnpm latency --assert-budget   # exit 1 when p50/p90 exceed kaizen.config LATENCY
 *   pnpm latency --llm-only        # chat hops only (when TTS/ASR hosts are unreachable)
 *   pnpm latency --product         # the product path: sign-up → /api/tutor/session →
 *                                  # /api/tutor/turn (SSE TurnEvent) → /api/tutor/tts,
 *                                  # with /api/tutor/asr for the ASR hop (needs TUTOR_MODE
 *                                  # and DATABASE_URL on the server)
 *   pnpm latency --product --mock  # proves the product harness, including the
 *                                  # overlapped TTS, against the in-process fake
 * Output: a table on stdout and a JSON file with every sample.
 * Exit code: 0, or 1 when --assert-budget fails or every turn errored.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

import { LATENCY } from '@/kaizen.config';

type HopName =
  | 'learner_synth'
  | 'asr'
  | 'llm_ttft'
  | 'llm_first_sent'
  | 'llm_total'
  | 'tts_first'
  | 'turn_to_audio'
  | 'first_audio'
  | 'first_audio_pipelined'
  | 'wb_first_action'
  | 'wb_action_to_sentence';

const HOPS: readonly HopName[] = [
  'learner_synth',
  'asr',
  'llm_ttft',
  'llm_first_sent',
  'llm_total',
  'tts_first',
  'turn_to_audio',
  'first_audio',
  'first_audio_pipelined',
  'wb_first_action',
  'wb_action_to_sentence',
];

interface TurnSample {
  turn: number;
  learnerLine: string;
  transcript: string | null;
  asrInput: 'tts' | 'synthetic-tone';
  hops: Partial<Record<HopName, number>>;
  tutorText: string;
  actionCount: number;
  /** Product mode: cents the server charged for the turn (from the `usage` frame). */
  costCents?: number;
  error?: string;
}

interface Percentiles {
  n: number;
  p50: number | null;
  p90: number | null;
  max: number | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
}

interface StatelessEventLike {
  type: string;
  data?: Record<string, unknown>;
}

const DEFAULT_SCRIPT: readonly string[] = [
  'I have homework on fractions and I do not get equivalent fractions.',
  'Why is two fourths the same as one half? They look different.',
  'Okay so if I multiply the top and bottom by the same number it stays the same?',
  'Can you draw it on the whiteboard?',
  'What about three sixths, is that also one half?',
  'I think I get it now. Give me one to try.',
];

const { values: args } = parseArgs({
  options: {
    turns: { type: 'string', default: String(DEFAULT_SCRIPT.length) },
    'base-url': { type: 'string' },
    out: { type: 'string' },
    mock: { type: 'boolean', default: false },
    'assert-budget': { type: 'boolean', default: false },
    'tts-provider': { type: 'string' },
    'tts-voice': { type: 'string' },
    'asr-provider': { type: 'string' },
    model: { type: 'string' },
    'llm-only': { type: 'boolean', default: false },
    product: { type: 'boolean', default: false },
  },
});

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return sorted[rank - 1] ?? null;
}

function summarize(values: number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted.at(-1) ?? null,
  };
}

/** 16 kHz mono 16-bit PCM WAV: `seconds` of a soft 440 Hz tone. Used only when no TTS exists. */
function syntheticToneWav(seconds = 1.2): Uint8Array {
  const sampleRate = 16_000;
  const frames = Math.floor(seconds * sampleRate);
  const data = new Int16Array(frames);
  for (let i = 0; i < frames; i += 1) {
    data[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 6_000);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + frames * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(frames * 2, 40);
  return new Uint8Array(Buffer.concat([header, Buffer.from(data.buffer)]));
}

function firstSentence(text: string): string | null {
  const match = /^[\s\S]{12,}?[.!?](?=\s|$)/.exec(text);
  if (match) return match[0].trim();
  return text.length >= 80 ? text.slice(0, 80) : null;
}

interface TurnEventLike {
  type: string;
  [key: string]: unknown;
}

interface StreamResult {
  text: string;
  ttftMs: number | null;
  firstSentenceMs: number | null;
  firstActionMs: number | null;
  totalMs: number;
  actionCount: number;
  directorState: unknown;
  costCents?: number;
  /** Product mode with `speak`: the TTS hop for the first sentence. */
  ttsFirstMs?: number;
  /**
   * Product mode with `speak`: turn request out → the first sentence's audio
   * bytes in hand, with TTS fired at the `sentence` frame while the model was
   * still streaming. This is the shape of the real client loop, not the sum of
   * two hops measured one after the other.
   */
  turnToAudioMs?: number;
  /**
   * Product mode: for every whiteboard `action` frame, the wait until the
   * `sentence` frame that closed the sentence it was placed in (or until the
   * stream ended, for a tag at the very end of the turn).
   */
  actionToSentenceMs?: number[];
}

class Client {
  private cookies: string[] = [];

  constructor(readonly baseUrl: string) {}

  private absorbCookies(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const raw = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
    for (const entry of raw) {
      const pair = entry.split(';')[0]?.trim();
      if (!pair || !pair.includes('=')) continue;
      const name = pair.slice(0, pair.indexOf('='));
      this.cookies = this.cookies.filter((c) => !c.startsWith(`${name}=`));
      this.cookies.push(pair);
    }
  }

  async login(accessCode: string | undefined): Promise<void> {
    if (!accessCode) return;
    const response = await fetch(`${this.baseUrl}/api/access-code/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode }),
    });
    if (!response.ok) throw new Error(`access code rejected: HTTP ${response.status}`);
    this.absorbCookies(response);
  }

  headers(extra: Record<string, string> = {}): Record<string, string> {
    return this.cookies.length ? { ...extra, Cookie: this.cookies.join('; ') } : extra;
  }

  // ---- product mode (lib/tutor/wire.ts shapes) ----

  /** Creates a throwaway adult account; the server sets the nt_session cookie. */
  async productSignUp(): Promise<void> {
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const response = await fetch(`${this.baseUrl}/api/tutor/auth/sign-up`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        email: `latency-${stamp}@example.invalid`,
        password: `Latency-${stamp}-pass`,
        displayName: 'Latency Harness',
        kind: 'adult',
        birthYear: 1990,
      }),
    });
    if (!response.ok) throw new Error(`sign-up HTTP ${response.status}: ${await response.text()}`);
    this.absorbCookies(response);
  }

  async productSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/tutor/session`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mode: 'text' }),
    });
    if (!response.ok) throw new Error(`session HTTP ${response.status}: ${await response.text()}`);
    const payload = (await response.json()) as { session?: { id?: string } };
    const id = payload.session?.id;
    if (!id) throw new Error('session response carried no id');
    return id;
  }

  async productTts(
    text: string,
    sessionId: string,
  ): Promise<{ audio: Uint8Array; format: string; ms: number }> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/tutor/tts`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, sessionId }),
    });
    // The hop ends at the first byte; the body is drained afterwards for the ASR input.
    const ms = performance.now() - started;
    if (!response.ok) throw new Error(`tts HTTP ${response.status}: ${await response.text()}`);
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    const audio = new Uint8Array(await response.arrayBuffer());
    const format = contentType.startsWith('audio/') ? contentType.slice('audio/'.length) : 'mp3';
    return { audio, format: format === 'mpeg' ? 'mp3' : format, ms };
  }

  async productAsr(
    audio: Uint8Array,
    format: string,
    sessionId: string,
  ): Promise<{ text: string; ms: number }> {
    const formData = new FormData();
    formData.set(
      'audio',
      new File([audio.slice().buffer as ArrayBuffer], `clip.${format}`, {
        type: `audio/${format}`,
      }),
    );
    formData.set('sessionId', sessionId);
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/tutor/asr`, {
      method: 'POST',
      headers: this.headers(),
      body: formData,
    });
    if (!response.ok) throw new Error(`asr HTTP ${response.status}: ${await response.text()}`);
    const payload = (await response.json()) as { text?: string };
    return { text: payload.text ?? '', ms: performance.now() - started };
  }

  /**
   * One product turn over SSE (contracts.ts TurnEvent frames).
   *
   * When `speak` is given, the first `sentence` frame fires it immediately and
   * the stream keeps reading: that is what `playback-queue.ts` does, and it is
   * the only way to measure the real time to first audio rather than the sum
   * of two hops run back to back.
   */
  async productTurn(
    sessionId: string,
    text: string,
    turn: number,
    speak?: (sentence: string) => Promise<{ ms: number }>,
  ): Promise<StreamResult> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/tutor/turn`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        sessionId,
        text,
        inputMode: 'text',
        clientTurnId: `latency-${sessionId}-${turn}-${Date.now().toString(36)}`,
      }),
    });
    if (!response.ok || !response.body)
      throw new Error(`turn HTTP ${response.status}: ${await response.text()}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let out = '';
    let ttftMs: number | null = null;
    let firstSentenceMs: number | null = null;
    let firstActionMs: number | null = null;
    let actionCount = 0;
    let costCents: number | undefined;
    let ttsFirstMs: number | undefined;
    let turnToAudioMs: number | undefined;
    let speaking: Promise<void> | null = null;
    const actionToSentenceMs: number[] = [];
    let actionsAwaitingSentence: number[] = [];
    const handle = (event: TurnEventLike): void => {
      const now = performance.now() - started;
      switch (event.type) {
        case 'text_delta':
          out += String(event.text ?? '');
          ttftMs ??= now;
          break;
        case 'sentence': {
          for (const at of actionsAwaitingSentence) actionToSentenceMs.push(now - at);
          actionsAwaitingSentence = [];
          const already = firstSentenceMs !== null;
          firstSentenceMs ??= now;
          const sentence = String(event.text ?? '');
          if (!already && speak && sentence) {
            // Not awaited: the turn stream keeps flowing behind it, exactly as
            // the client's playback queue keeps consuming frames while the
            // first sentence is being synthesised.
            speaking = speak(sentence).then((tts) => {
              ttsFirstMs = tts.ms;
              turnToAudioMs = performance.now() - started;
            });
          }
          break;
        }
        case 'action':
          actionCount += 1;
          firstActionMs ??= now;
          actionsAwaitingSentence.push(now);
          break;
        case 'usage':
          if (typeof event.cents === 'number') costCents = event.cents;
          break;
        case 'error':
          throw new Error(`turn stream error ${String(event.code)}: ${String(event.message)}`);
        default:
          break;
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of frame.split('\n')) {
          if (line.startsWith('data: ')) handle(JSON.parse(line.slice(6)) as TurnEventLike);
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
    if (firstSentenceMs === null && firstSentence(out)) firstSentenceMs = ttftMs;
    const totalMs = performance.now() - started;
    // A tag with no sentence after it (the engine flushes the tail as a
    // sentence, so this is rare) waits until the stream ends.
    for (const at of actionsAwaitingSentence) actionToSentenceMs.push(totalMs - at);
    if (speaking) await speaking;
    return {
      text: out,
      ttftMs,
      firstSentenceMs,
      firstActionMs,
      totalMs,
      actionCount,
      directorState: undefined,
      costCents,
      ...(ttsFirstMs === undefined ? {} : { ttsFirstMs }),
      ...(turnToAudioMs === undefined ? {} : { turnToAudioMs }),
      ...(actionToSentenceMs.length === 0 ? {} : { actionToSentenceMs }),
    };
  }

  async tts(
    text: string,
    providerId: string,
    voice: string,
  ): Promise<{ audio: Uint8Array; format: string; ms: number }> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/generate/tts`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        text,
        audioId: `latency-${Date.now()}`,
        ttsProviderId: providerId,
        ttsVoice: voice,
      }),
    });
    if (!response.ok) throw new Error(`tts HTTP ${response.status}: ${await response.text()}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.startsWith('audio/')) {
      const audio = new Uint8Array(await response.arrayBuffer());
      return { audio, format: contentType.slice('audio/'.length), ms: performance.now() - started };
    }
    const payload = (await response.json()) as {
      data?: { base64?: string; format?: string };
      base64?: string;
      format?: string;
    };
    const base64 = payload.data?.base64 ?? payload.base64;
    const format = payload.data?.format ?? payload.format ?? 'mp3';
    if (!base64) throw new Error('tts response carried no audio');
    return {
      audio: new Uint8Array(Buffer.from(base64, 'base64')),
      format,
      ms: performance.now() - started,
    };
  }

  async transcribe(
    audio: Uint8Array,
    format: string,
    providerId: string | undefined,
  ): Promise<{ text: string; ms: number }> {
    const formData = new FormData();
    formData.set(
      'audio',
      new File([audio.slice().buffer as ArrayBuffer], `clip.${format}`, {
        type: `audio/${format}`,
      }),
    );
    if (providerId) formData.set('providerId', providerId);
    formData.set('language', 'en');
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/transcription`, {
      method: 'POST',
      headers: this.headers(),
      body: formData,
    });
    if (!response.ok) throw new Error(`asr HTTP ${response.status}: ${await response.text()}`);
    const payload = (await response.json()) as { data?: { text?: string }; text?: string };
    return { text: payload.data?.text ?? payload.text ?? '', ms: performance.now() - started };
  }

  async chat(
    messages: ChatMessage[],
    directorState: unknown,
    model: string | undefined,
  ): Promise<StreamResult> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        messages,
        storeState: {
          stage: null,
          scenes: [],
          currentSceneId: null,
          mode: 'autonomous',
          whiteboardOpen: true,
        },
        config: { agentIds: ['default-1'] },
        directorState,
        apiKey: '',
        ...(model ? { model } : {}),
      }),
    });
    if (!response.ok || !response.body)
      throw new Error(`chat HTTP ${response.status}: ${await response.text()}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let ttftMs: number | null = null;
    let firstSentenceMs: number | null = null;
    let firstActionMs: number | null = null;
    let actionCount = 0;
    let nextDirectorState: unknown = directorState;

    const handle = (event: StatelessEventLike): void => {
      const now = performance.now() - started;
      if (event.type === 'text_delta') {
        const content = String(event.data?.content ?? '');
        text += content;
        ttftMs ??= now;
        if (firstSentenceMs === null && firstSentence(text)) firstSentenceMs = now;
      } else if (event.type === 'action') {
        actionCount += 1;
        firstActionMs ??= now;
      } else if (event.type === 'done') {
        nextDirectorState = event.data?.directorState ?? nextDirectorState;
      } else if (event.type === 'error') {
        throw new Error(`chat stream error: ${String(event.data?.message ?? 'unknown')}`);
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of frame.split('\n')) {
          if (line.startsWith('data: ')) handle(JSON.parse(line.slice(6)) as StatelessEventLike);
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
    return {
      text,
      ttftMs,
      firstSentenceMs,
      firstActionMs,
      totalMs: performance.now() - started,
      actionCount,
      directorState: nextDirectorState,
    };
  }
}

/**
 * In-process fake of the routes with the real wire shapes and configurable
 * delays — both the upstream three and, for `--product --mock`, the product
 * five. It proves the harness, never the loop: every number it produces is the
 * delay it was told to sleep for.
 */
function startMockServer(): Promise<{ url: string; close: () => void }> {
  const delays = {
    asr: Number(process.env.MOCK_ASR_MS ?? 250),
    ttft: Number(process.env.MOCK_LLM_TTFT_MS ?? 400),
    perDelta: Number(process.env.MOCK_LLM_DELTA_MS ?? 25),
    tts: Number(process.env.MOCK_TTS_MS ?? 300),
  };
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const readBody = (req: IncomingMessage) =>
    new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  const json = (res: ServerResponse, body: unknown) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: body }));
  };
  const tutorReply =
    'Two fourths and one half name the same amount. Picture a chocolate bar cut into four pieces; two of them is exactly half the bar. So the fraction looks different, but the value is the same.';

  const sentences = tutorReply.match(/[^.!?]+[.!?]/g) ?? [tutorReply];

  const server = createServer(async (req, res) => {
    await readBody(req);
    // --- product routes (lib/tutor/wire.ts shapes) ---
    if (req.url === '/api/tutor/auth/sign-up') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'nt_session=mock; Path=/',
      });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (req.url === '/api/tutor/session') {
      // The product routes spread their payload at the top level (apiSuccess),
      // unlike upstream's `{ success, data }`.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          session: { id: 'ses_mock' },
          band: 'adult',
          sessionMinutes: 25,
        }),
      );
      return;
    }
    if (req.url === '/api/tutor/tts') {
      await sleep(delays.tts);
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' });
      res.end(Buffer.from(syntheticToneWav(0.4)));
      return;
    }
    if (req.url === '/api/tutor/asr') {
      await sleep(delays.asr);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, text: 'mock transcript of the learner line' }));
      return;
    }
    if (req.url === '/api/tutor/turn') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const send = (event: TurnEventLike) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      send({ type: 'phase', phase: 'work', remainingMs: 900_000 });
      await sleep(delays.ttft);
      let index = 0;
      for (const sentence of sentences) {
        const words = sentence.trim().split(' ');
        for (const [position, word] of words.entries()) {
          send({ type: 'text_delta', text: `${word} ` });
          await sleep(delays.perDelta);
          // The tag sits beside its words, so the action closes mid-sentence
          // and the sentence frame follows once the words run out.
          if (index === 0 && position === 1) {
            send({
              type: 'action',
              action: {
                type: 'wb_draw_shape',
                id: 'e1',
                elementId: 'bar1',
                shape: 'rectangle',
                x: 100,
                y: 100,
                width: 400,
                height: 120,
              },
            });
          }
        }
        send({ type: 'sentence', index, text: sentence.trim() });
        index += 1;
      }
      send({ type: 'usage', turnId: 'trn_mock', cents: 1, sessionCents: 1 });
      send({ type: 'done', turnId: 'trn_mock', phase: 'work' });
      res.end();
      return;
    }
    // --- upstream routes ---
    if (req.url === '/api/generate/tts') {
      await sleep(delays.tts);
      json(res, {
        audioId: 'mock',
        base64: Buffer.from(syntheticToneWav(0.4)).toString('base64'),
        format: 'wav',
      });
      return;
    }
    if (req.url === '/api/transcription') {
      await sleep(delays.asr);
      json(res, { text: 'mock transcript of the learner line' });
      return;
    }
    if (req.url === '/api/chat') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const send = (event: StatelessEventLike) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      send({ type: 'thinking', data: { stage: 'agent_loading', agentId: 'default-1' } });
      send({
        type: 'agent_start',
        data: { messageId: 'm1', agentId: 'default-1', agentName: 'Tutor' },
      });
      await sleep(delays.ttft);
      const words = tutorReply.split(' ');
      for (let i = 0; i < words.length; i += 1) {
        send({ type: 'text_delta', data: { content: `${words[i]} `, messageId: 'm1' } });
        if (i === 6) {
          send({
            type: 'action',
            data: {
              actionId: 'a1',
              actionName: 'wb_draw_shape',
              params: { shape: 'rectangle', x: 100, y: 100, width: 400, height: 120 },
              agentId: 'default-1',
              messageId: 'm1',
            },
          });
        }
        await sleep(delays.perDelta);
      }
      send({ type: 'agent_end', data: { messageId: 'm1', agentId: 'default-1' } });
      send({
        type: 'done',
        data: {
          totalActions: 1,
          totalAgents: 1,
          agentHadContent: true,
          directorState: { turnCount: 1 },
        },
      });
      res.end();
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

async function main(): Promise<void> {
  const turns = Math.max(1, Number(args.turns));
  const mock = args.mock ? await startMockServer() : null;
  const baseUrl =
    mock?.url ?? args['base-url'] ?? process.env.LATENCY_BASE_URL ?? 'http://localhost:3000';
  const ttsProvider =
    args['tts-provider'] ?? process.env.LATENCY_TTS_PROVIDER ?? (mock ? 'mock-tts' : undefined);
  const ttsVoice = args['tts-voice'] ?? process.env.LATENCY_TTS_VOICE ?? 'alloy';
  const asrProvider = args['asr-provider'] ?? process.env.LATENCY_ASR_PROVIDER;
  const model = args.model ?? process.env.LATENCY_MODEL;
  const client = new Client(baseUrl);
  await client.login(process.env.LATENCY_ACCESS_CODE);
  const product = Boolean(args.product);
  let productSessionId: string | null = null;
  if (product) {
    await client.productSignUp();
    productSessionId = await client.productSession();
    console.log(`product session ${productSessionId}`);
  }

  const samples: TurnSample[] = [];
  const history: ChatMessage[] = [];
  let directorState: unknown;

  for (let turn = 0; turn < turns; turn += 1) {
    const learnerLine = DEFAULT_SCRIPT[turn % DEFAULT_SCRIPT.length] ?? DEFAULT_SCRIPT[0]!;
    const sample: TurnSample = {
      turn: turn + 1,
      learnerLine,
      transcript: null,
      asrInput: 'synthetic-tone',
      hops: {},
      tutorText: '',
      actionCount: 0,
    };
    try {
      let audio = syntheticToneWav();
      let format = 'wav';
      if (args['llm-only']) {
        sample.asrInput = 'synthetic-tone';
      }
      const synthAllowed = product ? !args['llm-only'] : Boolean(ttsProvider) && !args['llm-only'];
      if (synthAllowed) {
        const synth = product
          ? await client.productTts(learnerLine, productSessionId!)
          : await client.tts(learnerLine, ttsProvider!, ttsVoice);
        audio = synth.audio;
        format = synth.format;
        sample.asrInput = 'tts';
        sample.hops.learner_synth = synth.ms;
      }
      let userText = learnerLine;
      if (!args['llm-only']) {
        const asr = product
          ? await client.productAsr(audio, format, productSessionId!)
          : await client.transcribe(audio, format, asrProvider);
        sample.transcript = asr.text;
        sample.hops.asr = asr.ms;
        if (sample.asrInput === 'tts' && asr.text.trim()) userText = asr.text;
      }
      history.push({ id: `u${turn}`, role: 'user', parts: [{ type: 'text', text: userText }] });
      // Product mode speaks the first sentence while the turn is still
      // streaming, the way the client does; `--llm-only` skips TTS entirely.
      const speak =
        product && !args['llm-only']
          ? (sentence: string) => client.productTts(sentence, productSessionId!)
          : undefined;
      const chat = product
        ? await client.productTurn(productSessionId!, userText, turn, speak)
        : await client.chat(history, directorState, model);
      directorState = chat.directorState;
      sample.tutorText = chat.text;
      sample.actionCount = chat.actionCount;
      if (chat.costCents !== undefined) sample.costCents = chat.costCents;
      history.push({
        id: `a${turn}`,
        role: 'assistant',
        parts: [{ type: 'text', text: chat.text }],
      });
      sample.hops.llm_total = chat.totalMs;
      if (chat.ttftMs !== null) sample.hops.llm_ttft = chat.ttftMs;
      if (chat.firstSentenceMs !== null) sample.hops.llm_first_sent = chat.firstSentenceMs;
      if (chat.firstActionMs !== null && chat.ttftMs !== null)
        sample.hops.wb_first_action = chat.firstActionMs - chat.ttftMs;
      // The budget is per drawing, so a turn is judged by its slowest one.
      if (chat.actionToSentenceMs && chat.actionToSentenceMs.length > 0)
        sample.hops.wb_action_to_sentence = Math.max(...chat.actionToSentenceMs);

      if (chat.ttsFirstMs !== undefined) sample.hops.tts_first = chat.ttsFirstMs;
      if (chat.turnToAudioMs !== undefined) sample.hops.turn_to_audio = chat.turnToAudioMs;
      const sentence = firstSentence(chat.text) ?? chat.text.slice(0, 80);
      if (
        sample.hops.tts_first === undefined &&
        sentence &&
        !args['llm-only'] &&
        (product || ttsProvider)
      ) {
        const tts = product
          ? await client.productTts(sentence, productSessionId!)
          : await client.tts(sentence, ttsProvider!, ttsVoice);
        sample.hops.tts_first = tts.ms;
      }
      if (
        sample.hops.asr !== undefined &&
        sample.hops.llm_first_sent !== undefined &&
        sample.hops.tts_first !== undefined
      ) {
        sample.hops.first_audio =
          sample.hops.asr + sample.hops.llm_first_sent + sample.hops.tts_first;
      }
      // The figure the learner lives with: the ASR round trip, then the turn,
      // with TTS overlapped onto the still-open stream. Always at or below the
      // serial `first_audio` sum, and the one to hold against the budget once
      // the product path can be run end to end.
      if (sample.hops.asr !== undefined && sample.hops.turn_to_audio !== undefined) {
        sample.hops.first_audio_pipelined = sample.hops.asr + sample.hops.turn_to_audio;
      }
      // Reset director state between turns so each turn is one full request on the code-only director.
      directorState = undefined;
    } catch (error) {
      sample.error = error instanceof Error ? error.message : String(error);
    }
    samples.push(sample);
    const status = sample.error
      ? `ERROR ${sample.error}`
      : `first_audio=${sample.hops.first_audio?.toFixed(0) ?? 'n/a'} ms  pipelined=${
          sample.hops.first_audio_pipelined?.toFixed(0) ?? 'n/a'
        } ms`;
    console.log(`turn ${sample.turn}: ${status}`);
  }

  mock?.close();

  const summary = Object.fromEntries(
    HOPS.map((hop) => [
      hop,
      summarize(
        samples.flatMap((sample) => (sample.hops[hop] === undefined ? [] : [sample.hops[hop]!])),
      ),
    ]),
  ) as Record<HopName, Percentiles>;

  const fmt = (value: number | null) => (value === null ? '   n/a' : value.toFixed(0).padStart(6));
  console.log(
    `\nbase URL: ${baseUrl}${mock ? ' (mock)' : ''}   turns: ${turns}   errors: ${samples.filter((s) => s.error).length}`,
  );
  console.log('hop                    n    p50    p90    max   budget');
  for (const hop of HOPS) {
    const row = summary[hop];
    const budget =
      hop === 'first_audio' || hop === 'first_audio_pipelined'
        ? `${LATENCY.firstAudioP50Ms}/${LATENCY.firstAudioP90Ms}`
        : hop === 'wb_first_action' || hop === 'wb_action_to_sentence'
          ? `${LATENCY.whiteboardActionAfterSentenceMs}`
          : '';
    console.log(
      `${hop.padEnd(22)} ${String(row.n).padStart(2)} ${fmt(row.p50)} ${fmt(row.p90)} ${fmt(row.max)}   ${budget}`,
    );
  }

  const out =
    args.out ??
    `docs/metrics/latency-${new Date().toISOString().replace(/[:.]/g, '-')}${mock ? '-mock' : ''}.json`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        mode: product ? 'product' : 'upstream',
        mock: Boolean(mock),
        turns,
        ttsProvider: ttsProvider ?? null,
        asrProvider: asrProvider ?? null,
        model: model ?? null,
        budget: LATENCY,
        summary,
        samples,
      },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${out}`);

  if (samples.every((sample) => sample.error)) process.exit(1);
  if (args['assert-budget']) {
    // Judge the pipelined figure when the run produced one: it is what the
    // client actually does, and holding the serial sum to the budget would
    // fail a loop that is in fact inside it.
    const first =
      summary.first_audio_pipelined.n > 0 ? summary.first_audio_pipelined : summary.first_audio;
    const over =
      first.p50 === null ||
      first.p90 === null ||
      first.p50 > LATENCY.firstAudioP50Ms ||
      first.p90 > LATENCY.firstAudioP90Ms;
    if (over) {
      const label = summary.first_audio_pipelined.n > 0 ? 'first_audio_pipelined' : 'first_audio';
      console.error(
        `budget check failed: ${label} p50=${first.p50 ?? 'n/a'} p90=${first.p90 ?? 'n/a'} vs ${LATENCY.firstAudioP50Ms}/${LATENCY.firstAudioP90Ms}`,
      );
      process.exit(1);
    }
    // A drawing has to land within two seconds of its words (spec R2). Judged
    // at p90 when the run drew anything at all.
    const drawing = summary.wb_action_to_sentence;
    if (
      drawing.n > 0 &&
      (drawing.p90 === null || drawing.p90 > LATENCY.whiteboardActionAfterSentenceMs)
    ) {
      console.error(
        `budget check failed: wb_action_to_sentence p90=${drawing.p90 ?? 'n/a'} vs ${LATENCY.whiteboardActionAfterSentenceMs}`,
      );
      process.exit(1);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
