/**
 * The client half of one tutor turn (voice-16, voice-17, voice-18, tutor-08).
 *
 *   idle → listening → thinking → speaking → idle
 *                ↑___________________|  (barge-in)
 *
 * - `listening`: the learner is talking (VAD start or push-to-talk down).
 * - `thinking`: end of speech → ASR → turn request → first audio. The avatar
 *   covers this gap, which is the latency budget made visible.
 * - `speaking`: sentences play from the queue while the stream continues.
 *
 * Every transition is a `performance.mark` (`tutor:eos`, `tutor:asr-result`,
 * `tutor:first-delta`, `tutor:first-sentence`, `tutor:first-audio`,
 * `tutor:done`, `tutor:barge-in`, `tutor:audio-stopped`) and the per-turn
 * numbers live in `state.metrics` for the `?metrics=1` overlay.
 *
 * Barge-in is two-phase: `bargeIn()` sets the phase to `listening` *before*
 * touching audio (a late frame must never flip it back), fades the queue out
 * and holds it; `confirmBargeIn()` aborts the stream and drops the queue;
 * `cancelBargeIn()` (a VAD misfire) resumes from where the sentence was.
 * Push-to-talk confirms at once. A generation token guards every async
 * continuation so nothing from an interrupted turn can write state.
 *
 * Framework-free: React subscribes with `useSyncExternalStore`. Tests drive
 * it with a scripted stream, a fake sink, and fake timers.
 */
import type {
  AsrResponse,
  CheckPrompt,
  CheckResult,
  InputMode,
  ReactionKind,
  SessionPhase,
  TurnRequest,
  WhiteboardAction,
} from '@/lib/tutor/contracts';

import type { PlaybackEvents, PlaybackQueue, SentenceRef } from './playback-queue';
import { splitSentences } from './sentence-splitter';
import type { ParsedTurnEvent } from './sse-client';
import { TtsError } from './tts-client';
import { VAD_END_OF_SPEECH_LAG_MS, VAD_SAMPLE_RATE } from './vad';
import { encodeWav16 } from './wav';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TranscriptEntry {
  id: string;
  role: 'learner' | 'tutor';
  text: string;
  status: 'streaming' | 'final' | 'interrupted' | 'failed';
  ts: number;
  clientTurnId: string | null;
}

export interface TurnMetrics {
  clientTurnId: string;
  inputMode: InputMode;
  /** End of learner speech (voice) or submit (text). */
  eosAt: number;
  asrAt: number | null;
  firstDeltaAt: number | null;
  firstSentenceAt: number | null;
  firstAudioAt: number | null;
  doneAt: number | null;
  bargeInAt: number | null;
  audioStoppedAt: number | null;
}

export interface ControllerError {
  code: string;
  message: string;
  /** The session cannot continue (budget, policy, auth). */
  terminal: boolean;
}

export interface TurnControllerState {
  phase: VoicePhase;
  sessionPhase: SessionPhase;
  remainingMs: number | null;
  transcript: TranscriptEntry[];
  /** Every whiteboard action so far, in arrival order (replayed on reload). */
  boardActions: WhiteboardAction[];
  boardVersion: number;
  check: CheckPrompt | null;
  lastCheckResult: CheckResult | null;
  reaction: { kind: ReactionKind; at: number } | null;
  usage: { turnCents: number; sessionCents: number } | null;
  error: ControllerError | null;
  connection: 'online' | 'retrying';
  metrics: TurnMetrics[];
  /** Speech failed this session; the turn continues in text. */
  audioFailed: boolean;
  /** A turn is in flight (stream open or audio queued). */
  busy: boolean;
  /** Last time the learner spoke, typed, or answered (presence rules). */
  lastLearnerInputAt: number | null;
  /** When the tutor last went quiet after a turn (presence rules). */
  idleSince: number | null;
  checkIns: { lastAt: number | null; consecutive: number };
  /** A tentative (VAD) barge-in is being held. */
  bargeInPending: boolean;
  notice: 'nothing-heard' | null;
}

export interface TurnControllerDeps {
  sessionId: string;
  stream: (request: TurnRequest, signal: AbortSignal) => AsyncIterable<ParsedTurnEvent>;
  createPlayback: (events: PlaybackEvents) => PlaybackQueue;
  transcribe?: (
    clip: { blob: Blob; durationMs: number },
    signal: AbortSignal,
  ) => Promise<AsrResponse>;
  now?: () => number;
  mark?: (name: string) => void;
  measure?: (name: string, startMark: string, endMark: string) => void;
  newId?: () => string;
  initial?: Partial<
    Pick<
      TurnControllerState,
      'sessionPhase' | 'transcript' | 'boardActions' | 'remainingMs' | 'usage'
    >
  >;
  /** The session reached WRAP (server phase `wrap` or `ended`). */
  onWrap?: (phase: SessionPhase) => void;
  /** A whiteboard action was applied (avatar gaze). */
  onAction?: (action: WhiteboardAction) => void;
  /**
   * Silence the detector waits through before calling an utterance finished.
   * The session says what it is, because it varies by band and the operator
   * can retune it live; the constant is only a fallback for callers that have
   * no session yet. Subtracted from the end-of-speech mark so the reported
   * first-audio figure is the one the learner actually experienced.
   */
  endOfSpeechLagMs?: number;
}

export interface TurnController {
  getState(): TurnControllerState;
  subscribe(listener: () => void): () => void;
  submitText(text: string): void;
  /**
   * Recorded push-to-talk clip. `eosAt` is when the learner actually stopped
   * speaking; pass it when the caller knows better than "now" (the VAD path
   * does, because a detector only reports an utterance after its silence
   * window has run).
   */
  submitVoiceClip(clip: { blob: Blob; durationMs: number; eosAt?: number }): void;
  /** VAD utterance (16 kHz PCM). */
  submitVoiceAudio(audio: Float32Array): void;
  /** Silence check-in: an empty voice turn. */
  checkIn(): void;
  /** The opening turn: the tutor speaks first without it counting as a check-in (D36). */
  greet(): void;
  /**
   * The controller's clock, in the same units as every timestamp it keeps
   * (`lastLearnerInputAt`, `idleSince`, `checkIns.lastAt`). The presence rules
   * must be fed from this clock and no other.
   */
  now(): number;
  /** The learner started talking. */
  bargeIn(source: 'vad' | 'ptt'): void;
  confirmBargeIn(): void;
  cancelBargeIn(): void;
  /** The learner stopped talking without a clip (PTT cancelled, mute). */
  stopListening(): void;
  applyCheckResult(result: CheckResult): void;
  clearCheck(): void;
  noteLearnerActivity(): void;
  clearNotice(): void;
  clearError(): void;
  amplitude(): number;
  setMuted(muted: boolean): void;
  abortTurn(): void;
  dispose(): void;
}

export const TERMINAL_ERROR_CODES: ReadonlySet<string> = new Set([
  'COST_CEILING',
  'SESSION_COST_CEILING',
  'DAILY_CAP',
  'AI_PAUSED',
  'PROFILE_LOCKED',
  'CAP_REACHED',
  'SESSION_ENDED',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'NO_LEARNER',
  'NOT_CONFIGURED',
]);

export const MARKS = {
  eos: 'tutor:eos',
  asr: 'tutor:asr-result',
  firstDelta: 'tutor:first-delta',
  firstSentence: 'tutor:first-sentence',
  firstAudio: 'tutor:first-audio',
  done: 'tutor:done',
  bargeIn: 'tutor:barge-in',
  audioStopped: 'tutor:audio-stopped',
  eosToFirstAudio: 'tutor:eos-to-first-audio',
} as const;

function defaultMark(name: string): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(name);
    } catch {
      // older browsers
    }
  }
}

function defaultMeasure(name: string, start: string, end: string): void {
  if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
    try {
      performance.measure(name, start, end);
    } catch {
      // a mark may be missing after a reload
    }
  }
}

let idCounter = 0;
function defaultNewId(): string {
  idCounter += 1;
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `ct_${Date.now().toString(36)}_${idCounter}_${random}`;
}

export function createTurnController(deps: TurnControllerDeps): TurnController {
  const endOfSpeechLagMs = deps.endOfSpeechLagMs ?? VAD_END_OF_SPEECH_LAG_MS;
  const now = deps.now ?? (() => performance.now());
  const mark = deps.mark ?? defaultMark;
  const measure = deps.measure ?? defaultMeasure;
  const newId = deps.newId ?? defaultNewId;

  let state: TurnControllerState = {
    phase: 'idle',
    sessionPhase: deps.initial?.sessionPhase ?? 'greet',
    remainingMs: deps.initial?.remainingMs ?? null,
    transcript: deps.initial?.transcript ?? [],
    boardActions: deps.initial?.boardActions ?? [],
    boardVersion: 0,
    check: null,
    lastCheckResult: null,
    reaction: null,
    usage: deps.initial?.usage ?? null,
    error: null,
    connection: 'online',
    metrics: [],
    audioFailed: false,
    busy: false,
    lastLearnerInputAt: null,
    idleSince: null,
    checkIns: { lastAt: null, consecutive: 0 },
    bargeInPending: false,
    notice: null,
  };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<TurnControllerState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  // Per-turn bookkeeping guarded by `generation`.
  let generation = 0;
  let abort: AbortController | null = null;
  let streamOpen = false;
  let currentMetrics: TurnMetrics | null = null;
  let tutorEntryId: string | null = null;
  let enqueued = new Set<number>();
  let sentenceIndex = 0;
  let pendingWrap: SessionPhase | null = null;
  let bargeInTentative = false;
  let disposed = false;

  const updateMetrics = (patch: Partial<TurnMetrics>) => {
    if (!currentMetrics) return;
    currentMetrics = { ...currentMetrics, ...patch };
    const metrics = state.metrics.slice();
    const at = metrics.findIndex((m) => m.clientTurnId === currentMetrics!.clientTurnId);
    if (at === -1) metrics.push(currentMetrics);
    else metrics[at] = currentMetrics;
    set({ metrics });
  };

  const updateEntry = (id: string, patch: Partial<TranscriptEntry>) => {
    set({
      transcript: state.transcript.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    });
  };

  const goIdle = () => {
    set({ phase: 'idle', busy: false, idleSince: now(), bargeInPending: false });
    if (pendingWrap) {
      const phase = pendingWrap;
      pendingWrap = null;
      deps.onWrap?.(phase);
    }
  };

  const playback = deps.createPlayback({
    onFirstAudio: () => {
      if (!currentMetrics || bargeInTentative) return;
      mark(MARKS.firstAudio);
      measure(MARKS.eosToFirstAudio, MARKS.eos, MARKS.firstAudio);
      updateMetrics({ firstAudioAt: now() });
      if (state.phase === 'thinking') set({ phase: 'speaking' });
    },
    onSentenceStart: () => {
      if (state.phase === 'thinking' && !bargeInTentative) set({ phase: 'speaking' });
    },
    onDrained: () => {
      if (!streamOpen && state.phase === 'speaking') goIdle();
    },
    onStopped: () => {
      if (!currentMetrics?.bargeInAt || currentMetrics.audioStoppedAt !== null) return;
      mark(MARKS.audioStopped);
      updateMetrics({ audioStoppedAt: now() });
    },
    onError: (_sentence: SentenceRef, error: unknown) => {
      if (error instanceof TtsError && error.terminal && TERMINAL_ERROR_CODES.has(error.code)) {
        set({ error: { code: error.code, message: error.message, terminal: true } });
        return;
      }
      if (!state.audioFailed) set({ audioFailed: true });
      if (playback.size === 0 && !streamOpen && state.phase !== 'idle') goIdle();
    },
  });

  const finishStream = (status: TranscriptEntry['status']) => {
    streamOpen = false;
    if (tutorEntryId) updateEntry(tutorEntryId, { status });
    if (playback.size === 0 && playback.state !== 'playing' && playback.state !== 'paused') {
      goIdle();
    } else if (state.phase === 'thinking') {
      set({ phase: 'speaking' });
    }
  };

  const abortCurrent = () => {
    abort?.abort();
    abort = null;
    streamOpen = false;
    bargeInTentative = false;
    playback.stop({ fadeMs: 20 });
  };

  const ensureTutorEntry = (clientTurnId: string): string => {
    if (tutorEntryId) return tutorEntryId;
    const id = newId();
    tutorEntryId = id;
    set({
      transcript: [
        ...state.transcript,
        { id, role: 'tutor', text: '', status: 'streaming', ts: now(), clientTurnId },
      ],
    });
    return id;
  };

  const enqueueSentence = (index: number, text: string, turnId?: string) => {
    if (enqueued.has(index) || state.audioFailed) return;
    enqueued.add(index);
    if (!currentMetrics?.firstSentenceAt) {
      mark(MARKS.firstSentence);
      updateMetrics({ firstSentenceAt: now() });
    }
    playback.enqueue({ index, text, generation: playback.generation, turnId });
  };

  const runTurn = async (
    text: string,
    inputMode: InputMode,
    options: { eosAt: number; learnerEntry: boolean; asrAt?: number },
  ) => {
    if (disposed) return;
    abortCurrent();
    generation += 1;
    const gen = generation;
    const controller = new AbortController();
    abort = controller;
    const clientTurnId = newId();
    tutorEntryId = null;
    enqueued = new Set();
    sentenceIndex = 0;
    pendingWrap = null;
    currentMetrics = {
      clientTurnId,
      inputMode,
      eosAt: options.eosAt,
      asrAt: options.asrAt ?? null,
      firstDeltaAt: null,
      firstSentenceAt: null,
      firstAudioAt: null,
      doneAt: null,
      bargeInAt: null,
      audioStoppedAt: null,
    };
    const transcript = options.learnerEntry
      ? [
          ...state.transcript,
          {
            id: newId(),
            role: 'learner' as const,
            text,
            status: 'final' as const,
            ts: now(),
            clientTurnId,
          },
        ]
      : state.transcript;
    set({
      phase: 'thinking',
      busy: true,
      transcript,
      error: null,
      notice: null,
      check: null,
      bargeInPending: false,
      metrics: [...state.metrics, currentMetrics],
    });
    streamOpen = true;

    const request: TurnRequest = { sessionId: deps.sessionId, text, inputMode, clientTurnId };
    let turnId: string | undefined;
    let tutorText = '';
    let failed: ControllerError | null = null;
    try {
      for await (const event of deps.stream(request, controller.signal)) {
        if (gen !== generation || disposed) return;
        switch (event.type) {
          case 'reconnect':
            // The replay resends the whole turn: discard the partial text but
            // keep the sentences already queued so nothing is spoken twice.
            tutorText = '';
            if (tutorEntryId) updateEntry(tutorEntryId, { text: '' });
            set({ connection: 'retrying' });
            break;
          case 'phase':
            set({
              sessionPhase: event.phase,
              remainingMs: Number.isFinite(event.remainingMs) ? event.remainingMs : null,
            });
            if (event.phase === 'wrap' || event.phase === 'ended') pendingWrap = event.phase;
            break;
          case 'text_delta': {
            if (!event.text) break;
            if (state.connection !== 'online') set({ connection: 'online' });
            if (!currentMetrics?.firstDeltaAt) {
              mark(MARKS.firstDelta);
              updateMetrics({ firstDeltaAt: now() });
            }
            tutorText += event.text;
            updateEntry(ensureTutorEntry(clientTurnId), { text: tutorText });
            break;
          }
          case 'sentence':
            ensureTutorEntry(clientTurnId);
            sentenceIndex = Math.max(sentenceIndex, event.index + 1);
            enqueueSentence(event.index, event.text, turnId);
            break;
          case 'action':
            set({
              boardActions: [...state.boardActions, event.action],
              boardVersion: state.boardVersion + 1,
            });
            deps.onAction?.(event.action);
            break;
          case 'check':
            set({ check: event.check });
            break;
          case 'check_result':
            set({ lastCheckResult: event.result, check: null });
            break;
          case 'reaction':
            set({ reaction: { kind: event.kind, at: now() } });
            break;
          case 'usage':
            turnId = event.turnId || turnId;
            set({ usage: { turnCents: event.cents, sessionCents: event.sessionCents } });
            break;
          case 'done':
            turnId = event.turnId || turnId;
            mark(MARKS.done);
            updateMetrics({ doneAt: now() });
            set({ sessionPhase: event.phase, connection: 'online' });
            if (event.phase === 'wrap' || event.phase === 'ended') pendingWrap = event.phase;
            break;
          case 'error':
            failed = {
              code: event.code,
              message: event.message,
              terminal: TERMINAL_ERROR_CODES.has(event.code),
            };
            break;
          default:
            break;
        }
      }
    } catch (error) {
      if (gen !== generation || disposed) return;
      failed = {
        code: 'STREAM_FAILED',
        message: error instanceof Error ? error.message : 'The connection dropped.',
        terminal: false,
      };
    }
    if (gen !== generation || disposed) return;

    // A stream that carried only text: split it here so the tutor still speaks.
    if (enqueued.size === 0 && tutorText.trim() && !failed) {
      splitSentences(tutorText).forEach((sentence, index) =>
        enqueueSentence(sentenceIndex + index, sentence, turnId),
      );
    }
    if (failed) {
      set({ error: failed });
      finishStream(tutorText ? 'final' : 'failed');
      return;
    }
    if (!tutorEntryId && !pendingWrap) {
      // Nothing came back (an empty check-in answer): back to idle quietly.
      finishStream('final');
      return;
    }
    finishStream('final');
  };

  const controller: TurnController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    submitText(text) {
      const trimmed = text.trim();
      if (!trimmed || disposed) return;
      const at = now();
      mark(MARKS.eos);
      set({ lastLearnerInputAt: at, checkIns: { lastAt: null, consecutive: 0 } });
      void runTurn(trimmed, 'text', { eosAt: at, learnerEntry: true });
    },
    submitVoiceClip(clip) {
      if (disposed) return;
      // The budget is measured from the end of the learner's speech (spec
      // §5.3), which is earlier than this call whenever a detector had to wait
      // out its silence window first. Taking `now()` here would quietly hand
      // back a number the learner never experienced.
      const at = clip.eosAt ?? now();
      mark(MARKS.eos);
      abortCurrent();
      generation += 1;
      const gen = generation;
      const asrAbort = new AbortController();
      abort = asrAbort;
      set({
        phase: 'thinking',
        busy: true,
        lastLearnerInputAt: at,
        checkIns: { lastAt: null, consecutive: 0 },
        bargeInPending: false,
        notice: null,
      });
      const transcribe = deps.transcribe;
      if (!transcribe) {
        set({ phase: 'idle', busy: false, notice: 'nothing-heard', idleSince: now() });
        return;
      }
      void (async () => {
        let result: AsrResponse;
        try {
          result = await transcribe(clip, asrAbort.signal);
        } catch (error) {
          if (gen !== generation || disposed) return;
          set({
            phase: 'idle',
            busy: false,
            idleSince: now(),
            error: {
              code: 'ASR_FAILED',
              message: error instanceof Error ? error.message : 'Could not hear that. Try typing.',
              terminal: false,
            },
          });
          return;
        }
        if (gen !== generation || disposed) return;
        mark(MARKS.asr);
        const text = result.text.trim();
        if (!text) {
          set({ phase: 'idle', busy: false, notice: 'nothing-heard', idleSince: now() });
          return;
        }
        await runTurn(text, 'voice', { eosAt: at, asrAt: now(), learnerEntry: true });
      })();
    },
    submitVoiceAudio(audio) {
      if (disposed) return;
      const bytes = encodeWav16(audio, VAD_SAMPLE_RATE);
      const durationMs = (audio.length / VAD_SAMPLE_RATE) * 1000;
      controller.submitVoiceClip({
        blob: new Blob([bytes], { type: 'audio/wav' }),
        durationMs,
        eosAt: now() - endOfSpeechLagMs,
      });
    },
    checkIn() {
      if (disposed || state.busy || state.phase !== 'idle') return;
      const at = now();
      set({
        checkIns: { lastAt: at, consecutive: state.checkIns.consecutive + 1 },
      });
      void runTurn('', 'voice', { eosAt: at, learnerEntry: false });
    },
    greet() {
      // The tutor's first words (D36). The same empty turn as a check-in, but
      // it is not one: nothing was asked and left unanswered, so the silence
      // and drift rules start from zero, not from a check-in already sent.
      if (disposed || state.busy || state.phase !== 'idle') return;
      void runTurn('', 'voice', { eosAt: now(), learnerEntry: false });
    },
    now,
    bargeIn(source) {
      if (disposed) return;
      const at = now();
      const tutorTurn = state.phase === 'thinking' || state.phase === 'speaking';
      // Phase first, audio second: a late frame cannot undo `listening`.
      set({
        phase: 'listening',
        lastLearnerInputAt: at,
        bargeInPending: tutorTurn && source === 'vad',
        notice: null,
      });
      if (!tutorTurn) return;
      mark(MARKS.bargeIn);
      updateMetrics({ bargeInAt: at, audioStoppedAt: null });
      if (source === 'ptt') {
        controller.confirmBargeIn();
        return;
      }
      bargeInTentative = true;
      playback.pause(20);
    },
    confirmBargeIn() {
      if (disposed) return;
      const wasTentative = bargeInTentative;
      bargeInTentative = false;
      const hadTurn = streamOpen || playback.size > 0 || playback.state !== 'idle';
      if (!hadTurn && !wasTentative) {
        set({ bargeInPending: false });
        return;
      }
      abort?.abort();
      abort = null;
      streamOpen = false;
      playback.stop({ fadeMs: 20 });
      if (tutorEntryId) updateEntry(tutorEntryId, { status: 'interrupted' });
      generation += 1;
      set({ phase: 'listening', bargeInPending: false, busy: false });
    },
    cancelBargeIn() {
      if (disposed || !bargeInTentative) {
        if (state.phase === 'listening' && !state.busy) set({ phase: 'idle', idleSince: now() });
        return;
      }
      bargeInTentative = false;
      updateMetrics({ bargeInAt: null, audioStoppedAt: null });
      playback.resume();
      set({
        phase: playback.state === 'playing' || playback.size > 0 ? 'speaking' : 'thinking',
        bargeInPending: false,
      });
      if (!streamOpen && playback.size === 0 && playback.state === 'idle') goIdle();
    },
    stopListening() {
      if (state.phase === 'listening') {
        if (bargeInTentative) controller.cancelBargeIn();
        else set({ phase: state.busy ? 'thinking' : 'idle', idleSince: now() });
      }
    },
    applyCheckResult(result) {
      set({
        lastCheckResult: result,
        check: null,
        reaction: { kind: result.correct ? 'smile' : 'not_quite', at: now() },
        lastLearnerInputAt: now(),
      });
    },
    clearCheck: () => set({ check: null }),
    noteLearnerActivity: () =>
      set({ lastLearnerInputAt: now(), checkIns: { lastAt: null, consecutive: 0 } }),
    clearNotice: () => set({ notice: null }),
    clearError: () => set({ error: null }),
    amplitude: () => playback.amplitude(),
    setMuted: (muted) => playback.setMuted(muted),
    abortTurn() {
      abortCurrent();
      generation += 1;
      if (tutorEntryId) updateEntry(tutorEntryId, { status: 'interrupted' });
      goIdle();
    },
    dispose() {
      disposed = true;
      abortCurrent();
      playback.dispose();
      listeners.clear();
    },
  };
  return controller;
}
