import { sharedAudio, unlockAudio } from "./audio";
import { emitter, type OutState, type OutTiming, type SpeakOptions, type SpeakSource, type SpeechOut, type SpeechRun, type VoiceError } from "./types";

// The app's one SpeechOut (live tutor spec §2.6–2.7). Every speaker in the app — the tutor, lesson
// narration, every Hear button, read-aloud — speaks through it, so one new speak() always replaces
// the last (a 120 ms fade), and events carry the run id so callers ignore each other's runs.
//  - warm() works before the learner's voice is built: it unlocks the shared AudioContext in the tap.
//  - speak() before then is queued, never dropped, and starts when the voice is ready.
//  - a voice never changes inside a reply; after the vendor voice failed, the *next* reply may use
//    the device's natural (Tier A) voice for a while ("Using this device's voice").

/** After a vendor failure, replies use the device's natural voice this long before trying the vendor again. */
export const DEVICE_VOICE_MS = 5 * 60_000;

export type Voices = { out: SpeechOut | null; deviceOut: SpeechOut | null };

export type AppSpeechOut = SpeechOut & {
  /** The voice is built (or rebuilt for another learner); a queued speak() starts now. */
  attach(v: Voices | null): void;
  /** The next replies use the device's voice after a vendor failure. */
  readonly usingDeviceVoice: boolean;
  onDeviceVoice(fn: (on: boolean) => void): () => void;
};

type Pending = { id: number; source: SpeakSource; opts: SpeakOptions; resolve: () => void; cancelled: boolean };

export function appSpeechOut({ now = () => Date.now(), unlock = () => unlockAudio(sharedAudio()) }: { now?: () => number; unlock?: () => void } = {}): AppSpeechOut {
  const ev = {
    boundary: emitter<[number, number]>(),
    scheduled: emitter<[number, number, number]>(),
    start: emitter<[number]>(),
    end: emitter<[{ cancelled: boolean }, number]>(),
    error: emitter<[VoiceError, number]>(),
    locked: emitter<[boolean]>(),
    timing: emitter<[OutTiming]>(),
    device: emitter<[boolean]>(),
  };
  let voices: Voices | null = null;
  let ids = 0;
  let pending: Pending | null = null;
  /** The inner voice and run behind the current outer run. */
  let current: { id: number; inner: SpeechOut; innerId: number } | null = null;
  let vendorFailedAt: number | null = null;
  let subs: (() => void)[] = [];

  const usingDevice = () => !!voices?.deviceOut && vendorFailedAt != null && now() - vendorFailedAt < DEVICE_VOICE_MS;
  const pick = (): SpeechOut | null => (usingDevice() ? voices!.deviceOut : (voices?.out ?? null));
  /** What the screen was last told ("Using this device's voice"): it follows the voice that actually speaks. */
  let shownDevice = false;
  const showDevice = (on: boolean) => {
    if (on === shownDevice) return;
    shownDevice = on;
    ev.device.emit(on);
  };

  /** Inner events, re-sent with the outer run id; anything from another inner run is dropped. */
  function wire(o: SpeechOut) {
    const mine = (innerId: number) => (current && current.inner === o && current.innerId === innerId ? current.id : null);
    subs.push(
      o.onBoundary((w, r) => {
        const id = mine(r);
        if (id != null) ev.boundary.emit(w, id);
      }),
      o.onWordScheduled((w, at, r) => {
        const id = mine(r);
        if (id != null) ev.scheduled.emit(w, at, id);
      }),
      o.onStart((r) => {
        const id = mine(r);
        if (id != null) ev.start.emit(id);
      }),
      o.onEnd((e, r) => {
        const id = mine(r);
        if (id == null) return;
        current = null;
        ev.end.emit(e, id);
      }),
      o.onError((e, r) => {
        const id = mine(r);
        if (id == null) return;
        if (o === voices?.out && o.kind === "elevenlabs" && voices.deviceOut) {
          vendorFailedAt = now();
          showDevice(true);
        }
        ev.error.emit(e, id);
      }),
      o.onLocked((l) => ev.locked.emit(l)),
      o.onTiming((t) => {
        const id = mine(t.run);
        if (id != null) ev.timing.emit({ ...t, run: id });
      }),
    );
  }

  function start(id: number, source: SpeakSource, opts: SpeakOptions): Promise<void> {
    const inner = pick();
    // The device's voice was used for a while after a vendor failure; once the vendor speaks again, say so.
    showDevice(!!inner && inner === voices?.deviceOut && inner !== voices.out);
    if (!inner) {
      ev.end.emit({ cancelled: false }, id);
      return Promise.resolve();
    }
    const run = inner.speak(source, opts);
    current = { id, inner, innerId: run.id };
    return run;
  }

  const out: AppSpeechOut = {
    get kind() {
      return pick()?.kind ?? "browser";
    },
    get tier() {
      return pick()?.tier ?? "B";
    },
    get state(): OutState {
      if (pending && !pending.cancelled) return "waiting";
      return current ? current.inner.state : "idle";
    },
    get locked() {
      return pick()?.locked ?? false;
    },
    get usingDeviceVoice() {
      return usingDevice();
    },
    attach(v) {
      subs.forEach((u) => u());
      subs = [];
      current?.inner.cancel({ fadeMs: 0 });
      current = null;
      voices = v;
      vendorFailedAt = null;
      showDevice(false); // another learner, or none: their voice starts fresh
      for (const o of new Set([v?.out, v?.deviceOut])) if (o) wire(o);
      const p = pending;
      pending = null;
      if (p && !p.cancelled) void start(p.id, p.source, p.opts).then(p.resolve);
    },
    speak(source, opts = {}): SpeechRun {
      out.cancel();
      const id = ++ids;
      if (opts.signal?.aborted) return Object.assign(Promise.resolve(), { id });
      if (!voices) {
        // Not built yet: queued, never dropped.
        let resolve!: () => void;
        const done = new Promise<void>((ok) => (resolve = ok));
        const p: Pending = { id, source, opts, resolve, cancelled: false };
        pending = p;
        opts.signal?.addEventListener("abort", () => {
          if (pending === p) out.cancel();
        });
        return Object.assign(done, { id });
      }
      return Object.assign(start(id, source, opts), { id });
    },
    pause: () => current?.inner.pause(),
    resume: () => current?.inner.resume(),
    cancel(opts) {
      const p = pending;
      if (p) {
        pending = null;
        p.cancelled = true;
        ev.end.emit({ cancelled: true }, p.id);
        p.resolve();
      }
      const c = current;
      if (c) c.inner.cancel(opts);
    },
    warm() {
      // Inside a tap: unlock the shared audio now, whether or not the voice is built.
      try {
        unlock();
      } catch {}
      try {
        voices?.out?.warm();
        if (voices?.deviceOut && voices.deviceOut !== voices.out) voices.deviceOut.warm();
      } catch {}
    },
    dispose() {
      out.cancel();
      out.attach(null);
    },
    heardUpTo: () => current?.inner.heardUpTo() ?? pick()?.heardUpTo() ?? -1,
    duck: (gain, ms) => current?.inner.duck(gain, ms),
    unduck: (ms) => current?.inner.unduck(ms),
    onBoundary: ev.boundary.on,
    onWordScheduled: ev.scheduled.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
    onLocked: ev.locked.on,
    onTiming: ev.timing.on,
    onDeviceVoice: ev.device.on,
  };
  return out;
}
