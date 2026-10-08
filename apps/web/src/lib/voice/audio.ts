// One AudioContext for the whole app: the tutor's voice, narration, Hear and the microphone all use
// it (live tutor spec §2.6). A second context starts locked on iOS after any navigation and plays
// nothing, and two contexts can't share a clock for echo timing. The first tap anywhere unlocks it
// (VoiceRoot listens for that), and the unlock survives client-side navigation.

export type AudioCtor = new () => AudioContext;

let shared: AudioContext | null = null;
let makeShared: (() => AudioContext) | null = null;

/** The app's AudioContext, made on first use. `make` replaces the constructor (tests). */
export function sharedAudio(make?: () => AudioContext): AudioContext {
  if (make) makeShared = make;
  if (!shared || shared.state === "closed") shared = (makeShared ?? (() => new AudioContext()))();
  return shared;
}

/** Has the shared context been made? (Nothing is created by asking.) */
export const audioReady = () => !!shared && shared.state !== "closed";

/** Forget the shared context (tests, or a learner leaving). */
export function closeSharedAudio() {
  const c = shared;
  shared = null;
  if (c && c.state !== "closed") void c.close().catch(() => {});
}

/** Tests: start fresh and make contexts with `make`. */
export function resetAudioForTests(make: (() => AudioContext) | null = null) {
  shared = null;
  makeShared = make;
  micsOpen = 0;
}

/**
 * Resumes a context, giving up after `ms` (300 by default): on iOS a resume outside a tap may never
 * settle, and nothing may wait on it. True when the context is running.
 */
export async function resumeWithin(ctx: AudioContext, ms = 300): Promise<boolean> {
  if (ctx.state === "running") return true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([ctx.resume().catch(() => {}), new Promise<void>((ok) => (timer = setTimeout(ok, ms)))]);
  clearTimeout(timer);
  return (ctx.state as string) === "running";
}

/** The device's output latency in ms (Bluetooth headphones add 150–250 ms): outputLatency, else baseLatency. */
export const latencyMs = (ctx: Pick<AudioContext, "outputLatency" | "baseLatency">) => ((ctx.outputLatency || ctx.baseLatency || 0) as number) * 1000;

/** performance.now() ms at which context time `t` (seconds) is heard: the clock offset plus output latency. */
export function audibleAtMs(ctx: Pick<AudioContext, "currentTime" | "outputLatency" | "baseLatency">, t: number, now = performance.now()): number {
  return now + (t - ctx.currentTime) * 1000 + latencyMs(ctx);
}

type AudioSessionType = "auto" | "playback" | "play-and-record" | "ambient" | "transient" | "transient-solo";
type NavigatorWithSession = Navigator & { audioSession?: { type: AudioSessionType } };

let silentLoop: HTMLAudioElement | null = null;

/**
 * Tells iOS what the page is doing: "playback" while reading aloud (so the silent switch doesn't mute
 * the tutor), "play-and-record" while the microphone is open. Without navigator.audioSession, the
 * first unlock starts a looping near-silent <audio> element, which puts Safari in playback mode.
 */
export function setAudioSession(type: "playback" | "play-and-record" | "auto") {
  const nav = typeof navigator !== "undefined" ? (navigator as NavigatorWithSession) : null;
  try {
    if (nav?.audioSession) nav.audioSession.type = type;
  } catch {
    // older WebKit throws on unknown types
  }
}

const hasAudioSession = () => typeof navigator !== "undefined" && !!(navigator as NavigatorWithSession).audioSession;

let micsOpen = 0;

/** The microphone opened or closed: "play-and-record" only while it is open, "playback" otherwise. */
export function micSession(open: boolean) {
  micsOpen = Math.max(0, micsOpen + (open ? 1 : -1));
  setAudioSession(micsOpen ? "play-and-record" : "playback");
}

/**
 * About to read aloud: with the microphone closed, "playback", so an iPhone's ring/silent switch
 * doesn't mute the tutor (Web Audio follows the switch under "auto"). Hear, narration and the K–2
 * opening all play before anyone opens the mic.
 */
export function playbackSession() {
  if (!micsOpen) setAudioSession("playback");
}

// 50 ms of silence as a WAV data URL (8-bit mono, 8 kHz).
const SILENT_WAV = "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

/**
 * Inside a tap or key press: resume the shared context and play one silent sample (what iOS needs to
 * unlock Web Audio), set the playback session, and start the silent loop where there is no
 * audioSession API. Never throws.
 */
export function unlockAudio(ctx: AudioContext = sharedAudio()) {
  playbackSession();
  try {
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
    const b = ctx.createBuffer(1, 1, ctx.sampleRate || 24000);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start();
  } catch {
    // a context that can't play yet; the next tap tries again
  }
  if (!silentLoop && !hasAudioSession() && typeof Audio !== "undefined" && /iP(hone|ad|od)|Macintosh.*Mobile/.test(navigator.userAgent)) {
    try {
      silentLoop = new Audio(SILENT_WAV);
      silentLoop.loop = true;
      silentLoop.volume = 0.01;
      void silentLoop.play().catch(() => (silentLoop = null));
    } catch {
      silentLoop = null;
    }
  }
}
