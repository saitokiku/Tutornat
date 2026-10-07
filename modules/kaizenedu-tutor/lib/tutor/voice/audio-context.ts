/**
 * One AudioContext for the whole session (voice-16, voice-17).
 *
 * iOS Safari and Chrome only start audio from inside a user gesture, and iOS
 * additionally needs a buffer to have been played from that gesture before
 * later, programmatic playback is audible. `unlockAudio()` does both: call it
 * from the first tap (the Start button, the push-to-talk pointerdown). Every
 * later playback goes through `ensureRunning()`, which resumes a context the
 * OS suspended (phone call, tab in the background).
 *
 * Browser-only; every export is a no-op that reports `unsupported` under SSR.
 */

export type TutorAudioState = 'unsupported' | 'suspended' | 'running' | 'closed';

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let unlocked = false;

function contextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function isAudioSupported(): boolean {
  return contextCtor() !== null;
}

/** The shared context, created lazily (outside a gesture it stays suspended). */
export function getAudioContext(): AudioContext | null {
  if (context && context.state !== 'closed') return context;
  const Ctor = contextCtor();
  if (!Ctor) return null;
  try {
    context = new Ctor({ latencyHint: 'interactive' });
  } catch {
    context = null;
  }
  return context;
}

export function audioContextState(): TutorAudioState {
  if (!isAudioSupported()) return 'unsupported';
  if (!context) return 'suspended';
  const state = context.state as string;
  if (state === 'running') return 'running';
  if (state === 'closed') return 'closed';
  return 'suspended';
}

export function isAudioUnlocked(): boolean {
  return unlocked && audioContextState() === 'running';
}

/** Call inside a user gesture. Resolves true when audio can play. */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state !== 'running') await ctx.resume();
  } catch {
    // resume() rejects outside a gesture; the next tap tries again.
  }
  if ((ctx.state as string) !== 'running') return false;
  if (!unlocked) {
    try {
      // A one-frame silent buffer: the iOS "unlock" idiom.
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      unlocked = true;
    } catch {
      unlocked = false;
    }
  }
  return unlocked;
}

/** Resume a context the OS suspended. Safe to call from anywhere. */
export async function ensureRunning(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if ((ctx.state as string) === 'running') return true;
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  return (ctx.state as string) === 'running';
}

export async function closeAudio(): Promise<void> {
  const ctx = context;
  context = null;
  unlocked = false;
  if (ctx && ctx.state !== 'closed') {
    try {
      await ctx.close();
    } catch {
      // already closing
    }
  }
}
