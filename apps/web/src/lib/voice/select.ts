import type { Key } from "@/i18n/en";
import type { Grade, Locale } from "@/lib/types";
import { browserSpeechIn, browserSpeechOut } from "./browser";
import { deepgramSpeechIn } from "./deepgram";
import { elevenLabsSpeechOut } from "./elevenlabs";
import { micSupported } from "./mic";
import { asVoiceError, emitter, type SpeechIn, type SpeechOut, type Unsubscribe, type VoiceError, type VoiceErrorCode } from "./types";

// Which voice a learner gets. The microphone is on offer only when a grown-up allowed it (the family
// setting), at every age. The vendor voice (ElevenLabs, Deepgram) is used when this deployment has it
// set up and, for a learner who may be under 13, only with that same consent; otherwise the browser's
// own voice reads aloud. When the vendor recognizer can't be reached, listening moves to the
// browser's recognizer. The learner's name is never sent: it is only used here, to keep it out of
// anything that leaves the device (vendor text, online browser voices, recognizer hints).

export type VoiceStatus = { tts: boolean; stt: boolean };

export type VoiceSetup = {
  locale: Locale;
  /** A grown-up allowed the microphone for this learner (today: settings.voiceInput; later the backend's consent record). */
  consent: boolean;
  /** The learner may be under 13 (see mayBeUnder13). */
  under13: boolean;
  /** Names to keep out of anything that leaves the device. Never sent. */
  names?: string[];
  /** K–5: slower speech and longer pauses before a turn ends. */
  young?: boolean;
  fetch?: typeof fetch;
};

export type Voice = {
  out: SpeechOut | null;
  in: SpeechIn | null;
  /** Who does the speaking and the listening, for the disclosure line (as chosen; in.kind may change to "browser" later). */
  vendor: { out: SpeechOut["kind"] | null; in: SpeechIn["kind"] | null };
  /** The microphone is allowed for this learner. */
  allowed: boolean;
};

/** Grades whose learners may be under 13 (K–8). Ages vary, so this errs toward asking a grown-up. */
export const mayBeUnder13 = (g: Grade) => g !== "9" && g !== "adult";

/** K–5. */
export const isYoung = (g: Grade) => ["K", "1", "2", "3", "4", "5"].includes(g);

/** What /api/voice/status says is set up; nothing on any failure. (The reply also renews the voice pass cookie the token routes need.) */
export async function voiceStatus(f: typeof fetch = (...a) => fetch(...a)): Promise<VoiceStatus> {
  try {
    const res = await f("/api/voice/status", { cache: "no-store" });
    if (!res.ok) return { tts: false, stt: false };
    const s = (await res.json()) as Partial<VoiceStatus>;
    return { tts: s.tts === true, stt: s.stt === true };
  } catch {
    return { tts: false, stt: false };
  }
}

/** Failures of the vendor recognizer that the browser's recognizer may not have. */
const SWITCH_CODES = new Set<VoiceErrorCode>(["network", "unavailable"]);

/**
 * A SpeechIn that uses `primary` until it can't reach its service, then the one `fallback()` makes
 * (from then on). kind follows whichever is in use.
 */
export function withFallback(primary: SpeechIn, fallback: () => SpeechIn | null): SpeechIn {
  const ev = { partial: emitter<[string]>(), final: emitter<[string]>(), turn: emitter<[string]>(), speech: emitter<[]>(), error: emitter<[VoiceError]>() };
  let active = primary;
  let starting = false;
  let moveOn = false; // the primary lost its service mid-stream: the next start uses the fallback
  const wire = (s: SpeechIn): Unsubscribe[] => [
    s.onPartial((t) => active === s && ev.partial.emit(t)),
    s.onFinal((t) => active === s && ev.final.emit(t)),
    s.onEndOfTurn((t) => active === s && ev.turn.emit(t)),
    s.onSpeechStart(() => active === s && ev.speech.emit()),
    s.onError((e) => {
      if (active !== s || (starting && s === primary)) return; // a failed start is decided in start()
      if (s === primary && SWITCH_CODES.has(e.code)) moveOn = true;
      ev.error.emit(e);
    }),
  ];
  wire(primary);
  const switchTo = () => {
    const fb = fallback();
    if (!fb) return null;
    wire(fb);
    active = fb;
    return fb;
  };
  return {
    get kind() {
      return active.kind;
    },
    get listening() {
      return active.listening;
    },
    async start(opts) {
      if (active === primary && moveOn) switchTo();
      if (active !== primary) return active.start(opts);
      starting = true;
      try {
        await primary.start(opts);
      } catch (e) {
        starting = false;
        const err = asVoiceError(e);
        const fb = SWITCH_CODES.has(err.code) ? switchTo() : null;
        if (!fb) {
          ev.error.emit(err);
          throw err;
        }
        return fb.start(opts);
      } finally {
        starting = false;
      }
    },
    stop: () => active.stop(),
    abort: () => active.abort(),
    level: () => active.level(),
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onEndOfTurn: ev.turn.on,
    onSpeechStart: ev.speech.on,
    onError: ev.error.on,
  };
}

/** Builds the learner's voice. Call in an effect or a handler, never during render. */
export async function voice(setup: VoiceSetup): Promise<Voice> {
  if (typeof window === "undefined") return { out: null, in: null, vendor: { out: null, in: null }, allowed: false };
  const { locale, consent, under13, young } = setup;
  const names = setup.names ?? [];
  const vendorAllowed = consent || !under13;
  const status = vendorAllowed ? await voiceStatus(setup.fetch) : { tts: false, stt: false };
  const rate = young ? 0.9 : 0.95;
  const local = browserSpeechOut({ locale, rate, names });

  const out: SpeechOut | null =
    status.tts && typeof AudioContext !== "undefined"
      ? elevenLabsSpeechOut({ locale, consent, under13, names, rate, fallback: local, fetch: setup.fetch })
      : local;

  let input: SpeechIn | null = null;
  if (consent) {
    const browserIn = () => browserSpeechIn({ locale, young });
    input = status.stt && micSupported() ? withFallback(deepgramSpeechIn({ locale, consent, under13, names, young, fetch: setup.fetch }), browserIn) : browserIn();
  }

  return { out, in: input, vendor: { out: out?.kind ?? null, in: input?.kind ?? null }, allowed: consent };
}

/** The lines that tell a family where voice goes, for whatever is in use: listening first, then reading aloud. */
export function voiceDisclosure(v: Pick<Voice, "vendor" | "allowed">): Key[] {
  const keys: Key[] = [];
  if (v.vendor.in === "deepgram") keys.push("voice.source.deepgram");
  if (v.vendor.in === "browser") keys.push("voice.source.browser");
  if (!v.allowed && v.vendor.out) keys.push("voice.source.readOnly");
  if (v.vendor.out === "elevenlabs") keys.push("voice.source.elevenlabs");
  if (v.vendor.out === "browser") keys.push("voice.source.browserRead");
  return keys;
}
