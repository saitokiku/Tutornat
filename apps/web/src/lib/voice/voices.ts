import type { Locale } from "@/lib/types";

// The one browser-voice picker for the whole app (live tutor spec §4). Browser voices range from
// natural (Edge's "Online (Natural)", Apple's Premium/Enhanced downloads, Android's local voices) to
// robots and novelty voices ("Eddy", "Zarvox", the old SAPI David/Zira). A child must never hear the
// second kind, so every voice gets a tier:
//   A  natural: may read aloud by itself and hold a conversation;
//   B  plain: reads only when the learner taps Hear;
//   C  never used.
// Only voices in the learner's language are considered. Online voices (Microsoft "Online", any
// "Google …") send the text to that company, so for a learner who may be under 13 they need the same
// grown-up consent as the vendor voice; Apple and Android voices run on the device and don't.

export type Tier = "A" | "B" | "C";

/** The parts of SpeechSynthesisVoice the picker reads (fixtures and real voices both fit). */
export type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang" | "localService" | "voiceURI"> & { default?: boolean };

export type VoicePick<V extends VoiceLike = VoiceLike> = { voice: V; tier: Exclude<Tier, "C">; online: boolean };

const lang = (v: VoiceLike) => v.lang.toLowerCase().replace("_", "-");
/** The name without a "(language (region))" suffix: "Eddy (Spanish (Spain))" → "Eddy". */
const baseName = (v: VoiceLike) => v.name.replace(/\s*\(.*$/, "").trim();

// ---- Tier C: never

// Every Windows desktop voice ("Microsoft Linda - English (Canada)", "Microsoft David Desktop - …") is
// the same old OneCore/SAPI generation; only the "Online (Natural)" ones are natural.
const SAPI = /^Microsoft \S+( Desktop)? - /;
const NOVELTY = new Set(
  "Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Kathy|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox".split("|"),
);
const ELOQUENCE = new Set("Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley".split("|"));

function isTierC(v: VoiceLike): boolean {
  if (SAPI.test(v.name) && !/Online|Natural/.test(v.name)) return true;
  const base = baseName(v);
  return NOVELTY.has(base) || ELOQUENCE.has(base) || /^Chrome OS\b/.test(v.name);
}

// ---- Tier A: natural, in order (lower rank first)

const EN_ONLINE_ORDER = ["AvaMultilingual", "Ava", "Andrew", "Emma", "Brian", "Jenny", "Aria"];
const ES_ONLINE_US = ["Paloma", "Alonso"];
const ES_ONLINE_MX = ["Dalia", "Jorge"];
const LATAM = /^es-(us|mx|419|ar|bo|cl|co|cr|cu|do|ec|gt|hn|ni|pa|pe|pr|py|sv|uy|ve)$/;

const isAndroid = (ua: string) => /Android/i.test(ua);
const premium = (v: VoiceLike) => /\(Premium\)/.test(v.name);
const enhanced = (v: VoiceLike) => /\(Enhanced\)/.test(v.name);
const onlineNatural = (v: VoiceLike) => /^Microsoft \S+ Online \(Natural\)/.test(v.name);
const onlineName = (v: VoiceLike) => /^Microsoft (\S+) Online/.exec(v.name)?.[1] ?? "";

/** Tier A rank, or null if the voice isn't natural. */
function rankA(v: VoiceLike, locale: Locale, ua: string): number | null {
  const l = lang(v);
  if (locale === "en") {
    if (onlineNatural(v) && /English \(United States\)/.test(v.name)) {
      const i = EN_ONLINE_ORDER.indexOf(onlineName(v));
      return i >= 0 ? i : EN_ONLINE_ORDER.length;
    }
    if (l === "en-us" && premium(v)) return 10;
    if (l === "en-us" && enhanced(v)) return 11;
    if (l === "en-us" && v.localService && isAndroid(ua)) return 12;
    return null;
  }
  if (onlineNatural(v)) {
    const i = [...ES_ONLINE_US, ...ES_ONLINE_MX].indexOf(onlineName(v));
    if (/Spanish \(United States\)/.test(v.name) && i >= 0 && i < 2) return i;
    if (/Spanish \(Mexico\)/.test(v.name) && i >= 2) return i;
    if (LATAM.test(l)) return 5;
    if (l === "es-es") return 30;
    return null;
  }
  if ((l === "es-us" || l === "es-mx") && premium(v)) return 10 + (l === "es-us" ? 0 : 1);
  if ((l === "es-us" || l === "es-mx") && enhanced(v)) return 12 + (l === "es-us" ? 0 : 1);
  if ((l === "es-us" || l === "es-mx") && v.localService && isAndroid(ua)) return 20 + (l === "es-us" ? 0 : 1);
  if (l === "es-es" && (premium(v) || enhanced(v))) return 31;
  return null;
}

// ---- Tier B order

const EN_B = ["Samantha", "Alex", "Google US English"];
const ES_B = ["Paulina", "Juan", "Google español de Estados Unidos", "Google español"];

/** Region order inside a tier: es-US > es-MX > es-419 > other Latin American > es-ES; en-US > en-CA > others. */
function regionRank(v: VoiceLike, locale: Locale): number {
  const l = lang(v);
  if (locale === "en") return l === "en-us" ? 0 : l === "en-ca" ? 1 : 2;
  if (l === "es-us") return 0;
  if (l === "es-mx") return 1;
  if (l === "es-419") return 2;
  if (LATAM.test(l)) return 3;
  return l === "es-es" ? 5 : 4;
}

function rankB(v: VoiceLike, locale: Locale): number {
  const names = locale === "en" ? EN_B : ES_B;
  const i = names.indexOf(v.name) >= 0 ? names.indexOf(v.name) : names.indexOf(baseName(v));
  if (locale === "es" && baseName(v) === "Mónica") return 1000; // Spain Spanish, last
  return (i >= 0 ? i : names.length) * 10 + regionRank(v, locale);
}

/** Does this voice send what it reads to the company that runs it? */
export const isOnline = (v: VoiceLike) => !v.localService || /\bOnline\b/.test(v.name) || /^Google\b/.test(v.name);

/** A voice in the learner's language (never another language's voice). */
export const speaksLocale = (v: VoiceLike, locale: Locale) => lang(v).split("-")[0] === locale;

/** The tier of one voice for a learner's language (C for a voice in another language). */
export function tierOf(v: VoiceLike, locale: Locale, ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): Tier {
  if (!speaksLocale(v, locale) || isTierC(v)) return "C";
  return rankA(v, locale, ua) != null ? "A" : "B";
}

export type PickOptions = {
  /** Online voices are allowed (an adult, or a grown-up's consent for an under-13 learner). */
  online: boolean;
  userAgent?: string;
};

/** Every usable voice for the language, best first (Tier A in its order, then Tier B). */
export function rankVoices<V extends VoiceLike>(voices: readonly V[], locale: Locale, o: PickOptions): VoicePick<V>[] {
  const ua = o.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return voices
    .filter((v) => speaksLocale(v, locale) && !isTierC(v) && (o.online || !isOnline(v)))
    .map((v, i) => {
      const a = rankA(v, locale, ua);
      return { pick: { voice: v, tier: a != null ? ("A" as const) : ("B" as const), online: isOnline(v) }, key: a != null ? a : 10_000 + rankB(v, locale), i };
    })
    .sort((x, y) => x.key - y.key || x.i - y.i)
    .map((x) => x.pick);
}

/** The best usable voice, or null (then read-aloud is text only: no robot ever speaks). */
export const pickBrowserVoice = <V extends VoiceLike>(voices: readonly V[], locale: Locale, o: PickOptions): VoicePick<V> | null => rankVoices(voices, locale, o)[0] ?? null;

type Synth = Pick<SpeechSynthesis, "getVoices"> & Partial<Pick<SpeechSynthesis, "addEventListener" | "removeEventListener">>;

/** The browser's voices, waiting up to `ms` for them to load (Chrome and Safari fill the list late). */
export function loadVoices(synth: Synth, ms = 1000): Promise<SpeechSynthesisVoice[]> {
  const now = synth.getVoices();
  if (now.length || !synth.addEventListener) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", done);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, ms);
    synth.addEventListener!("voiceschanged", done);
  });
}

// ---- the pick, remembered per learner and language

const cacheKey = (learner: string, locale: Locale) => `kaizenedu.voice.${learner}.${locale}`;

type Cached = { voiceURI: string; name: string };

function readCache(key: string): Cached | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const c = raw ? (JSON.parse(raw) as Partial<Cached>) : null;
    return c && typeof c.voiceURI === "string" && typeof c.name === "string" ? { voiceURI: c.voiceURI, name: c.name } : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, v: VoiceLike) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify({ voiceURI: v.voiceURI, name: v.name }));
  } catch {
    // private window or blocked storage: the pick is still made, just not remembered
  }
}

/**
 * The learner's browser voice: the one picked last time on this device if it is still there, still
 * allowed and as good as the best one now on offer; otherwise the best one (and that is remembered).
 */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[], locale: Locale, o: PickOptions & { learner?: string }): VoicePick<V> | null {
  const ranked = rankVoices(voices, locale, o);
  if (!ranked.length) return null;
  const key = o.learner ? cacheKey(o.learner, locale) : null;
  const cached = key ? readCache(key) : null;
  const kept = cached && ranked.find((p) => p.voice.voiceURI === cached.voiceURI && p.voice.name === cached.name);
  if (kept && kept.tier === ranked[0].tier) return kept;
  if (key) writeCache(key, ranked[0].voice);
  return ranked[0];
}
