import type { Key } from "@/i18n/en";
import type { Grade, Locale } from "@/lib/types";
import { browserSpeechIn, browserSpeechOut } from "./browser";
import { deepgramSpeechIn } from "./deepgram";
import { elevenLabsSpeechOut } from "./elevenlabs";
import { micSupported } from "./mic";
import type { SpeechIn, SpeechOut } from "./types";

// Which voice a learner gets. The vendor voice (ElevenLabs, Deepgram) when this deployment has it set
// up, the browser's own otherwise. A learner who may be under 13 gets voice only after a grown-up
// allowed it: without that there is no microphone at all and replies are read by the browser voice.
// The learner's name is never sent anywhere: it is only used here, to take it out of vendor-bound text.

export type VoiceStatus = { tts: boolean; stt: boolean };

export type VoiceSetup = {
  locale: Locale;
  /** A grown-up allowed voice for this learner (today: settings.voiceInput; later the backend's consent record). */
  consent: boolean;
  /** The learner may be under 13 (see mayBeUnder13). */
  under13: boolean;
  /** Names to keep out of anything sent to a vendor. Never sent. */
  names?: string[];
  /** K–5: slower speech and longer pauses before a turn ends. */
  young?: boolean;
  fetch?: typeof fetch;
};

export type Voice = {
  out: SpeechOut | null;
  in: SpeechIn | null;
  /** Who does the speaking and the listening, for the disclosure line. */
  vendor: { out: "elevenlabs" | "browser" | null; in: "deepgram" | "browser" | null };
  /** Voice beyond reading aloud is allowed for this learner. */
  allowed: boolean;
};

/** Grades whose learners may be under 13 (K–8). Ages vary, so this errs toward asking a grown-up. */
export const mayBeUnder13 = (g: Grade) => g !== "9" && g !== "adult";

/** K–5. */
export const isYoung = (g: Grade) => ["K", "1", "2", "3", "4", "5"].includes(g);

/** What /api/voice/status says is set up; nothing on any failure. */
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

/** Builds the learner's voice. Call in an effect or a handler, never during render. */
export async function voice(setup: VoiceSetup): Promise<Voice> {
  if (typeof window === "undefined") return { out: null, in: null, vendor: { out: null, in: null }, allowed: false };
  const allowed = setup.consent || !setup.under13;
  const status = allowed ? await voiceStatus(setup.fetch) : { tts: false, stt: false };
  const rate = setup.young ? 0.9 : 0.95;
  const local = browserSpeechOut({ locale: setup.locale, rate });

  const out: SpeechOut | null = status.tts
    ? elevenLabsSpeechOut({ locale: setup.locale, consent: allowed, names: setup.names, rate, fallback: local, fetch: setup.fetch })
    : local;

  let input: SpeechIn | null = null;
  if (allowed) {
    input =
      status.stt && micSupported()
        ? deepgramSpeechIn({ locale: setup.locale, consent: allowed, young: setup.young, fetch: setup.fetch })
        : browserSpeechIn({ locale: setup.locale, young: setup.young });
  }

  return { out, in: input, vendor: { out: out?.kind ?? null, in: input?.kind ?? null }, allowed };
}

/** The lines that tell a family where voice goes, for whatever voice() picked. */
export function voiceDisclosure(v: Pick<Voice, "vendor" | "allowed">): Key[] {
  const keys: Key[] = [];
  if (!v.allowed) return v.vendor.out ? ["voice.source.readOnly"] : [];
  if (v.vendor.in === "deepgram") keys.push("voice.source.deepgram");
  if (v.vendor.in === "browser") keys.push("voice.source.browser");
  if (v.vendor.out === "elevenlabs") keys.push("voice.source.elevenlabs");
  return keys;
}
