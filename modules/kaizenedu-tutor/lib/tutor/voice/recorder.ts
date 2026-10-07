/**
 * Microphone capture for push-to-talk (voice-17).
 *
 * One `MediaStream` is opened per session with echo cancellation, noise
 * suppression, and automatic gain (spec §5.3: barge-in over a speaker
 * self-triggers without them). The stream is shared with the VAD. Push-to-talk
 * records the press with `MediaRecorder` in 250 ms slices so the clip is
 * assembled incrementally and uploaded the instant the pointer lifts. The
 * chunks live in memory and are dropped after the upload.
 */

export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

export type MicrophoneErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'busy';

export class MicrophoneError extends Error {
  constructor(
    readonly code: MicrophoneErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MicrophoneError';
  }
}

export function isMicrophoneSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

export async function requestMicrophone(): Promise<MediaStream> {
  if (!isMicrophoneSupported()) {
    throw new MicrophoneError('unsupported', 'This browser cannot record audio.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new MicrophoneError('denied', 'Microphone access was not allowed.');
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      throw new MicrophoneError('busy', 'The microphone is in use by another app.');
    }
    throw new MicrophoneError('unavailable', 'No microphone was found.');
  }
}

let early: Promise<MediaStream> | null = null;

/**
 * Ask for the microphone inside the press that starts a session (D36: the
 * landing button), so the prompt is up while the session is being created
 * and the session screen never has to ask a second time. The screen takes
 * the pending stream with `takeEarlyMicrophone`; a refusal is handled there
 * exactly as a refusal of its own request.
 */
export function requestMicrophoneEarly(): void {
  if (early || !isMicrophoneSupported()) return;
  const pending = requestMicrophone();
  early = pending;
  pending.catch(() => {
    if (early === pending) early = null;
  });
}

/** The stream (or refusal) `requestMicrophoneEarly` started, once; null when none is pending. */
export function takeEarlyMicrophone(): Promise<MediaStream> | null {
  const pending = early;
  early = null;
  return pending;
}

/**
 * Stops an early stream nobody took: the session did not start (the guest
 * call failed, the learner pressed "Not now", the screen unmounted). Without
 * this the browser's recording indicator stays on with no session behind it.
 */
export function releaseEarlyMicrophone(): void {
  const pending = takeEarlyMicrophone();
  if (!pending) return;
  pending.then((stream) => stopMicrophone(stream)).catch(() => undefined);
}

export function stopMicrophone(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function setMicrophoneEnabled(stream: MediaStream | null, enabled: boolean): void {
  stream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export interface RecordedClip {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

export interface RecorderHandle {
  start(): void;
  /** Resolves with the assembled clip once the last slice has arrived. */
  stop(): Promise<RecordedClip>;
  cancel(): void;
  readonly recording: boolean;
}

export interface RecorderOptions {
  timesliceMs?: number;
  now?: () => number;
}

export function createRecorder(stream: MediaStream, options: RecorderOptions = {}): RecorderHandle {
  const timesliceMs = options.timesliceMs ?? 250;
  const now = options.now ?? (() => performance.now());
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;

  return {
    get recording() {
      return recorder !== null && recorder.state === 'recording';
    },
    start() {
      if (recorder) return;
      const mimeType = pickRecorderMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      startedAt = now();
      recorder.start(timesliceMs);
    },
    stop() {
      const current = recorder;
      recorder = null;
      if (!current) {
        return Promise.resolve({ blob: new Blob([]), durationMs: 0, mimeType: '' });
      }
      const durationMs = Math.max(0, now() - startedAt);
      return new Promise<RecordedClip>((resolve) => {
        current.onstop = () => {
          const mimeType = current.mimeType || chunks[0]?.type || 'audio/webm';
          const blob = new Blob(chunks, { type: mimeType });
          chunks = [];
          resolve({ blob, durationMs, mimeType });
        };
        if (current.state !== 'inactive') current.stop();
        else current.onstop(new Event('stop'));
      });
    },
    cancel() {
      const current = recorder;
      recorder = null;
      chunks = [];
      if (current && current.state !== 'inactive') {
        current.onstop = null;
        current.ondataavailable = null;
        current.stop();
      }
    },
  };
}
