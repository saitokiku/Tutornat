'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { AgeBand } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import type {
  AttentionSample,
  CheckResult,
  Entitlement,
  WhiteboardAction,
} from '@/lib/tutor/contracts';
import {
  INITIAL_BACKCHANNEL,
  INITIAL_LADDER,
  INITIAL_SAMPLER,
  aggregateSamples,
  ladderRunsFor,
  shouldCheckIn,
  stepBackchannel,
  stepLadder,
  stepSampler,
  type BackchannelCue,
  type LadderState,
  type PresenceInput,
  type RecoveryFired,
} from '@/lib/tutor/presence';
import { transcribeClip } from '@/lib/tutor/voice/asr-client';
import { ensureRunning, getAudioContext, unlockAudio } from '@/lib/tutor/voice/audio-context';
import {
  createPlaybackQueue,
  createWebAudioSink,
  type DecodedAudio,
  type PlaybackEvents,
  type PlaybackQueue,
  type PlaybackSink,
  type WebAudioClip,
} from '@/lib/tutor/voice/playback-queue';
import {
  createRecorder,
  isMicrophoneSupported,
  MicrophoneError,
  releaseEarlyMicrophone,
  requestMicrophone,
  setMicrophoneEnabled,
  stopMicrophone,
  takeEarlyMicrophone,
  type RecorderHandle,
} from '@/lib/tutor/voice/recorder';
import { streamTurn } from '@/lib/tutor/voice/sse-client';
import { fetchSentenceAudio } from '@/lib/tutor/voice/tts-client';
import {
  createTurnController,
  type TurnController,
  type TurnControllerState,
} from '@/lib/tutor/voice/turn-controller';
import { createVad, type Vad } from '@/lib/tutor/voice/vad';
import type { GetSessionResponse } from '@/lib/tutor/wire';

import { BOARD_GAZE, CENTER_GAZE, type AvatarGaze } from '@/components/tutor/avatar/driver';
import { applyBoardAction, replayBoard, type BoardState } from '@/components/tutor/board/reducer';

import { endSession as endSessionCall, heartbeat, postAttention } from './api';

export type MicStatus = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'busy';
export type InputPreference = 'push-to-talk' | 'hands-free';
export type StopReason = 'ended' | 'out-of-minutes' | 'paused' | null;

/** How long the face keeps looking at the board after an action lands. */
const BOARD_GAZE_MS = 2_500;
/** The presence rules tick on this cadence; the ladder's own step is 10 s. */
const PRESENCE_TICK_MS = 1_000;
/** Attention samples are posted in batches, never one per sample. */
const ATTENTION_FLUSH_MS = 30_000;
const CUE_VISIBLE_MS = 2_600;
const HEARTBEAT_MS = 60_000;

/**
 * The one clock for the turn controller and the presence rules. Every
 * timestamp the controller keeps (`lastLearnerInputAt`, `idleSince`,
 * `checkIns.lastAt`) and every one the screen samples (pointer activity, the
 * tab going hidden, the tick itself) must come from the same clock, or "quiet
 * for" is the distance between two epochs and every rule fires at once. It
 * did: the controller counted from page load and the tick from 1970, so the
 * silence check-in and the drift ladder both fired the moment the tutor went
 * idle (found on the production build, 2026-09-30; D38).
 */
function clock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** A clock reading, as the wall-clock time the server expects. */
function toEpochMs(at: number): number {
  return Date.now() - (clock() - at);
}

export interface TutorSessionOptions {
  sessionId: string;
  band: AgeBand;
  initial: GetSessionResponse;
  /** Recovery-ladder steps the parent switched off (spec §5.10 C). */
  disabledRecoverySteps?: readonly number[];
}

export interface TutorSessionApi {
  state: TurnControllerState;
  board: BoardState;
  /** The screen is live: audio unlocked and the controller built. */
  started: boolean;
  starting: boolean;
  start: () => void;
  mic: MicStatus;
  micMessage: string | null;
  requestMic: () => void;
  preference: InputPreference;
  setPreference: (next: InputPreference) => void;
  muted: boolean;
  setMuted: (next: boolean) => void;
  talking: boolean;
  pressToTalk: () => void;
  releaseToTalk: () => void;
  cancelToTalk: () => void;
  submitText: (text: string) => void;
  applyCheckResult: (result: CheckResult) => void;
  clearNotice: () => void;
  clearError: () => void;
  endSession: () => void;
  amplitude: () => number;
  gaze: AvatarGaze;
  /** The tutor is at the board: an action landed within the last few seconds. */
  drawing: boolean;
  cue: BackchannelCue | null;
  recovery: RecoveryFired | null;
  entitlement: Entitlement | null;
  elapsedMs: number;
  budgetMs: number;
  stopped: StopReason;
}

/** Web Audio is missing (very old browser): every sentence fails, the turn continues in text. */
function silentSink(): PlaybackSink<DecodedAudio> {
  return {
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    decode: () => Promise.reject(new Error('This browser cannot play audio.')),
    start: () => ({ stop: (_fadeMs: number, onStopped?: () => void) => onStopped?.() }),
    amplitude: () => 0,
  };
}

export function useTutorSession(options: TutorSessionOptions): TutorSessionApi {
  const { sessionId, band, initial } = options;
  const given = options.disabledRecoverySteps;
  const disabledSteps = useMemo<readonly number[]>(() => given ?? [], [given]);

  const [controller, setController] = useState<TurnController | null>(null);
  const [starting, setStarting] = useState(false);
  const [board, setBoard] = useState<BoardState>(() => replayBoard(initial.board ?? []));
  const [mic, setMic] = useState<MicStatus>(() =>
    isMicrophoneSupported() ? 'unknown' : 'unsupported',
  );
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const [preference, setPreferenceState] = useState<InputPreference>('push-to-talk');
  const [muted, setMutedState] = useState(false);
  const [talking, setTalking] = useState(false);
  const [gaze, setGaze] = useState<AvatarGaze>(CENTER_GAZE);
  const [cue, setCue] = useState<BackchannelCue | null>(null);
  const [recovery, setRecovery] = useState<RecoveryFired | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stopped, setStopped] = useState<StopReason>(
    initial.session.endedAt || initial.session.phase === 'ended' ? 'ended' : null,
  );

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const vadRef = useRef<Vad | null>(null);
  const lastPointerAt = useRef<number | null>(null);
  const documentHidden = useRef(false);
  const hiddenSince = useRef<number | null>(null);
  const backchannel = useRef(INITIAL_BACKCHANNEL);
  const sampler = useRef(INITIAL_SAMPLER);
  const ladder = useRef<LadderState>(INITIAL_LADDER);
  const pending = useRef<AttentionSample[]>([]);
  const counts = useRef({ attending: 0, drifting: 0, away: 0, no_face: 0 });
  const lastFlushAt = useRef(0);
  const startedAt = useMemo(() => new Date(initial.session.startedAt).getTime(), [initial.session]);
  const budgetMs = publicConfig.bands[band].sessionMinutes * 60_000;

  // ---------------------------------------------------------------------
  // The turn controller
  // ---------------------------------------------------------------------

  const fallbackState = useMemo<TurnControllerState>(
    () => ({
      phase: 'idle',
      sessionPhase: initial.session.phase,
      remainingMs: null,
      transcript: (initial.turns ?? []).map((turn) => ({
        id: turn.id,
        role: turn.role,
        text: turn.text,
        status: 'final' as const,
        ts: new Date(turn.ts).getTime(),
        clientTurnId: null,
      })),
      boardActions: initial.board ?? [],
      boardVersion: 0,
      check: null,
      lastCheckResult: null,
      reaction: null,
      usage: null,
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
    }),
    [initial],
  );

  const subscribe = useCallback(
    (listener: () => void) => (controller ? controller.subscribe(listener) : () => undefined),
    [controller],
  );
  const snapshot = useCallback(
    () => controller?.getState() ?? fallbackState,
    [controller, fallbackState],
  );
  const serverSnapshot = useCallback(() => fallbackState, [fallbackState]);
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const onAction = useCallback((action: WhiteboardAction) => {
    setBoard((current) => applyBoardAction(current, action));
    setGaze(BOARD_GAZE);
  }, []);

  const buildController = useCallback((): TurnController => {
    const createPlayback = (events: PlaybackEvents): PlaybackQueue => {
      const fetchAudio = async (
        sentence: { text: string; turnId?: string },
        signal: AbortSignal,
      ): Promise<ArrayBuffer> => {
        const result = await fetchSentenceAudio(
          { sessionId, text: sentence.text, turnId: sentence.turnId },
          { signal },
        );
        return result.bytes;
      };
      const context = getAudioContext();
      if (context) {
        return createPlaybackQueue<WebAudioClip>({
          sink: createWebAudioSink(context),
          fetchAudio,
          ...events,
        });
      }
      return createPlaybackQueue<DecodedAudio>({ sink: silentSink(), fetchAudio, ...events });
    };

    return createTurnController({
      sessionId,
      now: clock,
      endOfSpeechLagMs: publicConfig.bands[band].thinkingPauseMs,
      stream: (request, signal) => streamTurn(request, { signal }),
      createPlayback,
      transcribe: (clip, signal) =>
        transcribeClip({ sessionId, blob: clip.blob, durationMs: clip.durationMs }, { signal }),
      initial: {
        sessionPhase: initial.session.phase,
        transcript: fallbackState.transcript,
        boardActions: initial.board ?? [],
      },
      onAction,
      onWrap: () => setStopped('ended'),
    });
  }, [band, sessionId, initial, fallbackState, onAction]);

  useEffect(
    () => () => {
      controller?.dispose();
    },
    [controller],
  );

  // ---------------------------------------------------------------------
  // Microphone, push-to-talk, hands-free
  // ---------------------------------------------------------------------

  const openMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;
    if (!isMicrophoneSupported()) {
      setMic('unsupported');
      setMicMessage('This browser cannot record audio. Type your answers instead.');
      return null;
    }
    setMic('requesting');
    try {
      const stream = await (takeEarlyMicrophone() ?? requestMicrophone());
      streamRef.current = stream;
      setMic('granted');
      setMicMessage(null);
      return stream;
    } catch (error) {
      const code = error instanceof MicrophoneError ? error.code : 'unavailable';
      setMic(code === 'denied' ? 'denied' : code === 'busy' ? 'busy' : 'unsupported');
      setMicMessage(
        code === 'denied'
          ? 'The microphone is blocked for this site. Type your answers, or allow the microphone in the browser’s address bar.'
          : code === 'busy'
            ? 'Another app is using the microphone. Type your answers, or close the other app and try again.'
            : 'No microphone was found. Type your answers instead.',
      );
      return null;
    }
  }, []);

  const requestMic = useCallback(() => {
    void openMicrophone();
  }, [openMicrophone]);

  /** Hands-free needs the VAD running on the shared stream; push-to-talk does not. */
  useEffect(() => {
    if (!controller || preference !== 'hands-free' || mic !== 'granted' || muted || stopped) {
      void vadRef.current?.pause();
      return;
    }
    const stream = streamRef.current;
    if (!stream) return;
    let cancelled = false;
    let vad: Vad | null = vadRef.current;
    void (async () => {
      if (!vad) {
        const context = getAudioContext();
        vad = await createVad({
          stream,
          ...(context ? { audioContext: context } : {}),
          endOfSpeechMs: publicConfig.bands[band].thinkingPauseMs,
          onSpeechStart: () => controller.bargeIn('vad'),
          onSpeechRealStart: () => controller.confirmBargeIn(),
          onMisfire: () => controller.cancelBargeIn(),
          onSpeechEnd: (audio) => controller.submitVoiceAudio(audio),
        });
        if (cancelled) {
          void vad.destroy();
          return;
        }
        vadRef.current = vad;
      }
      await vad.start();
    })();
    return () => {
      cancelled = true;
    };
  }, [band, controller, preference, mic, muted, stopped]);

  useEffect(() => {
    vadRef.current?.setProfile(
      state.phase === 'speaking' || state.phase === 'thinking' ? 'speaking' : 'listening',
    );
  }, [state.phase]);

  useEffect(
    () => () => {
      void vadRef.current?.destroy();
      vadRef.current = null;
      recorderRef.current?.cancel();
      stopMicrophone(streamRef.current);
      streamRef.current = null;
      // The landing press may have opened the microphone before this screen
      // took it (a text session, "Not now", a reload): never leave it live.
      releaseEarlyMicrophone();
    },
    [],
  );

  const pressToTalk = useCallback(() => {
    if (!controller || stopped) return;
    void unlockAudio();
    void (async () => {
      const stream = await openMicrophone();
      if (!stream) return;
      setMicrophoneEnabled(stream, true);
      controller.bargeIn('ptt');
      setTalking(true);
      const recorder = createRecorder(stream);
      recorderRef.current = recorder;
      recorder.start();
    })();
  }, [controller, openMicrophone, stopped]);

  const releaseToTalk = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setTalking(false);
    if (!recorder || !controller) return;
    void recorder.stop().then((clip) => {
      if (clip.blob.size === 0) {
        controller.stopListening();
        return;
      }
      controller.submitVoiceClip({ blob: clip.blob, durationMs: clip.durationMs });
    });
  }, [controller]);

  const cancelToTalk = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setTalking(false);
    controller?.stopListening();
  }, [controller]);

  const setMuted = useCallback(
    (next: boolean) => {
      setMutedState(next);
      setMicrophoneEnabled(streamRef.current, !next);
      controller?.setMuted(next);
      if (next) cancelToTalk();
    },
    [cancelToTalk, controller],
  );

  const setPreference = useCallback(
    (next: InputPreference) => {
      setPreferenceState(next);
      if (next === 'hands-free') void openMicrophone();
      else void vadRef.current?.pause();
    },
    [openMicrophone],
  );

  // ---------------------------------------------------------------------
  // Heartbeat: whole minutes, and the hard stop at zero
  // ---------------------------------------------------------------------

  const beat = useCallback(async () => {
    const minutes = Math.floor((Date.now() - startedAt) / 60_000);
    const result = await heartbeat(sessionId, minutes);
    if (!result.ok) return;
    setEntitlement(result.data.entitlement);
    if (result.data.entitlement.remainingMinutes <= 0) setStopped('out-of-minutes');
    if (result.data.session.endedAt) setStopped('ended');
  }, [sessionId, startedAt]);

  // ---------------------------------------------------------------------
  // Start: unlock audio in the gesture, build the controller, greet
  // ---------------------------------------------------------------------

  const start = useCallback(() => {
    if (controller || starting) return;
    setStarting(true);
    void (async () => {
      await unlockAudio();
      const next = buildController();
      setController(next);
      setStarting(false);
      // The first heartbeat is what fetches the entitlement, so the minutes
      // banner is right from the start rather than a minute late.
      void beat();
      // A session with no turns yet needs the tutor to speak first: an empty
      // voice turn is exactly the greeting request (`TurnController.checkIn`).
      // It goes out before the microphone prompt, so the tutor is already
      // talking while the browser asks (D36: the tutor speaks first).
      if ((initial.turns ?? []).length === 0 && !stopped) next.greet();
      // A text session never asks for the microphone; the dock offers it.
      if (initial.session.mode === 'text') return;
      // Hands-free is the desktop default once the microphone is granted;
      // push-to-talk is the default on touch (spec §5.10 A).
      const coarse =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      const stream = await openMicrophone();
      if (stream && !coarse) setPreferenceState('hands-free');
    })();
  }, [
    beat,
    buildController,
    controller,
    initial.session.mode,
    initial.turns,
    openMicrophone,
    starting,
    stopped,
  ]);

  // ---------------------------------------------------------------------
  // Gaze, cues, timers
  // ---------------------------------------------------------------------

  useEffect(() => {
    if (gaze === CENTER_GAZE) return;
    const timer = setTimeout(() => setGaze(CENTER_GAZE), BOARD_GAZE_MS);
    return () => clearTimeout(timer);
  }, [gaze]);

  useEffect(() => {
    if (!cue) return;
    const timer = setTimeout(() => setCue(null), CUE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [cue]);

  useEffect(() => {
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAt));
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      documentHidden.current = hidden;
      hiddenSince.current = hidden ? clock() : null;
    };
    const onActivity = () => {
      lastPointerAt.current = clock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    onVisibility();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);

  // The first beat is sent from `start()`, inside the press that begins the
  // session, so this effect only keeps the minute clock running.
  useEffect(() => {
    if (!controller || stopped) return;
    const timer = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [beat, controller, stopped]);

  useEffect(() => {
    if (stopped !== 'out-of-minutes' && stopped !== 'paused') return;
    controller?.abortTurn();
  }, [controller, stopped]);

  // ---------------------------------------------------------------------
  // Presence: silence check-in, backchannels, samples, the recovery ladder
  // ---------------------------------------------------------------------

  const flushAttention = useCallback(
    async (extra?: RecoveryFired) => {
      const samples = pending.current;
      pending.current = [];
      if (samples.length === 0 && !extra) return;
      const aggregate = aggregateSamples(samples, counts.current);
      counts.current = {
        attending: aggregate.attending,
        drifting: aggregate.drifting,
        away: aggregate.away,
        no_face: aggregate.no_face,
      };
      await postAttention({
        sessionId,
        ...(samples.length > 0
          ? { samples: samples.map((sample) => ({ ...sample, ts: toEpochMs(sample.ts) })) }
          : {}),
        stats: {
          cameraEnabled: false,
          attendingPct: aggregate.attendingPct,
          driftCount: aggregate.drifting,
          awayCount: aggregate.away,
          recoveries: ladder.current.recoveries,
        },
        ...(extra
          ? {
              recovery: {
                triggerState: extra.triggerState,
                ladderStep: extra.spec.step,
                outcome: extra.spec.tactic,
              },
            }
          : {}),
      });
    },
    [sessionId],
  );

  useEffect(() => {
    if (!controller || stopped) return;
    const timer = setInterval(() => {
      const now = controller.now();
      const current = controller.getState();
      const input: PresenceInput = {
        now,
        band,
        phase: current.phase,
        busy: current.busy,
        lastLearnerInputAt: current.lastLearnerInputAt,
        idleSince: current.idleSince,
        documentHidden: documentHidden.current,
        hiddenSince: hiddenSince.current,
        lastPointerAt: lastPointerAt.current,
        checkIns: current.checkIns,
        awaitingCheck: current.check !== null,
        stopped: false,
      };

      const cued = stepBackchannel(backchannel.current, input);
      backchannel.current = cued.state;
      if (cued.cue) setCue(cued.cue);

      const sampled = stepSampler(sampler.current, input);
      sampler.current = sampled.state;
      if (sampled.sample) pending.current.push(sampled.sample);

      const advanced = stepLadder(ladder.current, {
        now,
        band,
        state: sampled.sample?.state ?? sampler.current.last ?? 'attending',
        disabledSteps,
      });
      ladder.current = advanced.state;
      if (advanced.fired) {
        setRecovery(advanced.fired);
        void flushAttention(advanced.fired);
        if (advanced.fired.pause) setStopped('paused');
        // Steps 1-4 ask the tutor for a fresh, short turn; what it says is the
        // turn engine's call (`lib/tutor/turn`), not the screen's.
        else controller.checkIn();
      } else if (shouldCheckIn(input)) {
        controller.checkIn();
      }

      if (now - lastFlushAt.current >= ATTENTION_FLUSH_MS && pending.current.length > 0) {
        lastFlushAt.current = now;
        void flushAttention();
      }
    }, PRESENCE_TICK_MS);
    return () => clearInterval(timer);
  }, [band, controller, disabledSteps, flushAttention, stopped]);

  // ---------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------

  const submitText = useCallback(
    (text: string) => {
      if (!controller || stopped) return;
      void ensureRunning();
      controller.submitText(text);
    },
    [controller, stopped],
  );

  const endSession = useCallback(() => {
    controller?.abortTurn();
    setStopped('ended');
    void flushAttention();
    void endSessionCall(sessionId).then((result) => {
      if (result.ok) setEntitlement(result.data.entitlement);
    });
  }, [controller, flushAttention, sessionId]);

  const amplitude = useCallback(() => controller?.amplitude() ?? 0, [controller]);

  return {
    state,
    board,
    started: controller !== null,
    starting,
    start,
    mic,
    micMessage,
    requestMic,
    preference,
    setPreference,
    muted,
    setMuted,
    talking,
    pressToTalk,
    releaseToTalk,
    cancelToTalk,
    submitText,
    applyCheckResult: (result) => controller?.applyCheckResult(result),
    clearNotice: () => controller?.clearNotice(),
    clearError: () => controller?.clearError(),
    endSession,
    amplitude,
    gaze,
    drawing: gaze !== CENTER_GAZE,
    cue,
    recovery: ladderRunsFor(band) ? recovery : null,
    entitlement,
    elapsedMs,
    budgetMs,
    stopped,
  };
}
