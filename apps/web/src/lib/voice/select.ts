import type { Key } from "@/i18n/en";
import type { Grade, Locale } from "@/lib/types";
import { browserSpeechIn, browserSpeechOut, browserVoice } from "./browser";
import { deepgramSpeechIn } from "./deepgram";
import { elevenLabsSpeechOut } from "./elevenlabs";
import { micSupported } from "./mic";
import { asVoiceError, emitter, type Band, type HeardWord, type SpeechIn, type SpeechOut, type TurnMeta, type Unsubscribe, type VoiceError, type VoiceErrorCode } from "./types";

// Which voice a learner gets (live tutor spec §1.2, §4). One voice for the whole app, built once per
// learner and language by VoiceRoot:
//  - reading aloud: the vendor voice (ElevenLabs) when this deployment has it for the learner's
//    language and, under 13, a grown-up allowed it; otherwise the best browser voice (./voices). A
//    Tier A browser voice may read by itself; a Tier B one only when the learner taps Hear; robots
//    never speak (text only);
//  - listening: only with a grown-up's consent, at every age. Deepgram when set up, the browser's
//    recognizer otherwise (and when Deepgram can't be reached);
//  - conversation mode (the microphone reopening after the tutor's question) only with all three:
//    consent, vendor listening, and the vendor voice or a Tier A one. Never with a robot or a
//    half-duplex recognizer: that is where a tutor talks over itself.
// The learner's name is never sent anywhere: it is used here only to keep it out of what leaves the
// device (vendor text, online browser voices, recognizer hints).

export type VoiceStatus = { tts: boolean; stt: boolean };

export type VoiceSetup = {
  locale: Locale;
  /** A grown-up allowed the microphone for this learner (today: settings.voiceInput; later the backend's consent record). */
  consent: boolean;
  /** The learner may be under 13 (see mayBeUnder13). */
  under13: boolean;
  band: Band;
  /** Names to keep out of anything that leaves the device. Never sent. */
  names?: string[];
  /** The learner's id on this device: their browser voice is remembered per learner and language. Never sent. */
  learner?: string;
  fetch?: typeof fetch;
};

export type Voice = {
  out: SpeechOut | null;
  in: SpeechIn | null;
  /** Who does the speaking and the listening, for the disclosure line (as chosen; in.kind may change to "browser" later). */
  vendor: { out: SpeechOut["kind"] | null; in: SpeechIn["kind"] | null };
  /** The microphone is allowed for this learner. */
  allowed: boolean;
  /** How natural the reading voice is: "A" may read by itself, "B" only on a Hear tap, null: text only. */
  tier: "A" | "B" | null;
  /** Replies and narration may be read aloud without a tap (vendor or Tier A only). */
  autoRead: boolean;
  /** Conversation mode is allowed (consent, vendor listening, and the vendor voice or a Tier A one). */
  conversation: boolean;
  /**
   * A natural browser voice for the reply after the vendor voice failed ("Using this device's voice"),
   * or null. Never used inside a reply: a voice never changes mid-reply.
   */
  deviceOut: SpeechOut | null;
  /** No natural voice here: Settings shows the grown-up how to download one. */
  tip: boolean;
};

/** Grades whose learners may be under 13 (K–8). Ages vary, so this errs toward asking a grown-up. */
export const mayBeUnder13 = (g: Grade) => g !== "9" && g !== "adult";

/** What /api/voice/status says is set up for this language; nothing on any failure. (The reply also renews the voice pass cookie the token routes need.) */
export async function voiceStatus(f: typeof fetch = (...a) => fetch(...a), locale: Locale = "en"): Promise<VoiceStatus> {
  try {
    const res = await f("/api/voice/status", { cache: "no-store" });
    if (!res.ok) return { tts: false, stt: false };
    const s = (await res.json()) as Partial<{ tts: boolean; ttsEs: boolean; stt: boolean }>;
    return { tts: locale === "es" ? s.ttsEs === true : s.tts === true, stt: s.stt === true };
  } catch {
    return { tts: false, stt: false };
  }
}

/** Failures of the vendor recognizer that the browser's recognizer may not have. */
const SWITCH_CODES = new Set<VoiceErrorCode>(["network", "unavailable"]);

/**
 * A SpeechIn that uses `primary` until it can't reach its service, then the one `fallback()` makes
 * (from then on). kind and duplex follow whichever is in use.
 */
export function withFallback(primary: SpeechIn, fallback: () => SpeechIn | null): SpeechIn {
  const ev = {
    partial: emitter<[string]>(),
    final: emitter<[string]>(),
    words: emitter<[HeardWord[]]>(),
    turn: emitter<[string, TurnMeta]>(),
    eager: emitter<[string, TurnMeta]>(),
    resumed: emitter<[]>(),
    speech: emitter<[]>(),
    slow: emitter<[boolean]>(),
    error: emitter<[VoiceError]>(),
  };
  let active = primary;
  let starting = false;
  let moveOn = false; // the primary lost its service mid-stream: the next start uses the fallback
  const wire = (s: SpeechIn): Unsubscribe[] => [
    s.onPartial((t) => active === s && ev.partial.emit(t)),
    s.onFinal((t) => active === s && ev.final.emit(t)),
    s.onWords((w) => active === s && ev.words.emit(w)),
    s.onEndOfTurn((t, m) => active === s && ev.turn.emit(t, m)),
    s.onEagerEnd((t, m) => active === s && ev.eager.emit(t, m)),
    s.onTurnResumed(() => active === s && ev.resumed.emit()),
    s.onSpeechStart(() => active === s && ev.speech.emit()),
    s.onSlow((x) => active === s && ev.slow.emit(x)),
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
    get duplex() {
      return active.duplex;
    },
    get listening() {
      return active.listening;
    },
    get model() {
      return active.model ?? null;
    },
    prepare: () => primary.prepare?.() ?? (() => {}),
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
    onWords: ev.words.on,
    onEndOfTurn: ev.turn.on,
    onEagerEnd: ev.eager.on,
    onTurnResumed: ev.resumed.on,
    onSpeechStart: ev.speech.on,
    onSlow: ev.slow.on,
    onError: ev.error.on,
  };
}

const NONE: Voice = { out: null, in: null, vendor: { out: null, in: null }, allowed: false, tier: null, autoRead: false, conversation: false, deviceOut: null, tip: false };

/** Builds the learner's voice. Call in an effect or a handler, never during render. */
export async function voice(setup: VoiceSetup): Promise<Voice> {
  if (typeof window === "undefined") return NONE;
  const { locale, consent, under13, band, learner } = setup;
  const names = setup.names ?? [];
  // Vendor voices and online browser voices send text to a company: under 13 that needs the grown-up.
  const mayLeave = consent || !under13;
  const [status, pick] = await Promise.all([mayLeave ? voiceStatus(setup.fetch, locale) : Promise.resolve({ tts: false, stt: false }), browserVoice({ locale, online: mayLeave, learner })]);
  const local = browserSpeechOut({ locale, pick, band, names });
  const vendorOut = status.tts && typeof AudioContext !== "undefined";
  const out: SpeechOut | null = vendorOut ? elevenLabsSpeechOut({ locale, consent, under13, names, band, fetch: setup.fetch }) : local;
  const deviceOut = vendorOut && local?.tier === "A" ? local : null;

  let input: SpeechIn | null = null;
  const vendorIn = consent && status.stt && micSupported();
  if (consent) {
    const browserIn = () => browserSpeechIn({ locale, band });
    input = vendorIn ? withFallback(deepgramSpeechIn({ locale, consent, under13, names, band, fetch: setup.fetch }), browserIn) : browserIn();
  }

  const tier = out ? out.tier : null;
  return {
    out,
    in: input,
    vendor: { out: out?.kind ?? null, in: input?.kind ?? null },
    allowed: consent,
    tier,
    autoRead: tier === "A",
    conversation: vendorIn && tier === "A",
    deviceOut,
    tip: !vendorOut && tier !== "A",
  };
}

/** The lines that tell a family where voice goes, for whatever is in use: listening first, then reading aloud. */
export function voiceDisclosure(v: Pick<Voice, "vendor" | "allowed">): Key[] {
  const keys: Key[] = [];
  if (v.vendor.in === "deepgram") keys.push("voice.source.deepgram");
  if (v.vendor.in === "browser") keys.push("voice.source.browser");
  if (!v.allowed && v.vendor.out) keys.push("voice.source.readOnly");
  // The vendor voice is never handed to the browser's voice mid-reply, so its line no longer says so.
  if (v.vendor.out === "elevenlabs") keys.push("voice.source.vendorRead");
  if (v.vendor.out === "browser") keys.push("voice.source.browserRead");
  return keys;
}
