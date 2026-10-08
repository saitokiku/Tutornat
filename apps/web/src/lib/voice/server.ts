import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { limited } from "@/lib/server/rate";
import type { Locale } from "@/lib/types";
import { VoiceMetric } from "./metrics";

// The server half of voice: says which vendors are set up and mints short-lived tokens so the
// browser can talk to them directly. Keys never leave this file's process.
//
// Every vendor token costs money, so a token request has to pass, in order:
//  1. the vendor is configured;
//  2. it comes from a page on this site (Origin header present and ours; Sec-Fetch-Site same-origin);
//  3. a per-address budget (one learner needs a few a minute);
//  4. a voice pass: a signed, HttpOnly cookie that /api/voice/status hands out (2 hours, renewed by
//     each token), so the routes answer only browsers that loaded our voice code;
//  5. a learner whose voice is allowed (voiceAllowed — today the page's word; M5: the stored consent);
//  6. a daily ceiling per server instance, so a runaway client can't spend without end. A token is
//     reserved against it before the vendor is asked and handed back if the vendor fails (reserve,
//     then settle), so an outage doesn't use up the day.
// Until accounts exist (M5) a determined script can still get a pass; 3 and 6 bound what it costs.
//
//   ELEVENLABS_API_KEY         → read-aloud by ElevenLabs (single-use WebSocket tokens, 15 min)
//   ELEVENLABS_VOICE_ID        → required: the English voice, the owner's audition pick (spec §2.2). There
//   ELEVENLABS_VOICE_ID_ES     → required for Spanish: the same id for a bilingual voice, or one matched
//                                on gender, age and pitch. No default: without it Spanish isn't read by
//                                the vendor, rather than in an English (or British narrator's) voice.
//   ELEVENLABS_MODEL           → default eleven_flash_v2_5 (the stream-input socket)
//   ELEVENLABS_TRANSPORT       → "dialogue" switches to eleven_v4_turbo on the Text to Dialogue socket,
//                                only after P0 shows it works with the single-use token (spec §2.2)
//   ELEVENLABS_ZERO_RETENTION  → "1" asks ElevenLabs not to keep the text (an enterprise feature)
//   DEEPGRAM_API_KEY           → listening by Deepgram (60-second tokens; the key needs Member role)
//   DEEPGRAM_MODEL             → default flux-general-en (Flux, /v2/listen); "nova-3" for the fallback
//   DEEPGRAM_MODEL_ES          → default flux-general-multi with language hints es, en; with nova-3 the
//                                language is DEEPGRAM_LANGUAGE_ES (default es-419; "multi" for code-switching)
//   KAIZEN_VOICE=vendor        → on Vercel, required as well, so keys left in the project by earlier
//                                attempts stay inert until someone means to use them (as with KAIZEN_AI)
//   KAIZEN_VOICE_SECRET        → signs the voice pass (default: derived from the vendor keys)
//   KAIZEN_VOICE_DAILY_TOKENS  → tokens per kind per server instance per day (default 2000)

const ELEVENLABS_TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/tts_websocket";
const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant";
const VENDOR_TIMEOUT_MS = 5000;
/** Deepgram grants live this long; the page fetches the next one every 50 s. */
export const STT_TOKEN_TTL_S = 60;

/** Tokens per address per minute: a reply each few seconds (plus the next one fetched early) / a press of the microphone each few seconds. */
export const TTS_PER_MINUTE = 12;
export const STT_PER_MINUTE = 8;
const DEFAULT_DAILY_TOKENS = 2000;

export const PASS_COOKIE = "kz_voice";
const PASS_TTL_S = 2 * 60 * 60;

const NO_STORE = { "cache-control": "no-store" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { ...NO_STORE, ...extra } });

const vendorsOn = () => !process.env.VERCEL || process.env.KAIZEN_VOICE === "vendor";

/** The vendor voice for a language: both the key and that language's voice id must be set. */
const voiceIdFor = (locale: Locale) => (locale === "es" ? process.env.ELEVENLABS_VOICE_ID_ES : process.env.ELEVENLABS_VOICE_ID) || null;

export const ttsConfigured = (locale: Locale = "en") => vendorsOn() && !!process.env.ELEVENLABS_API_KEY && !!voiceIdFor(locale);
export const sttConfigured = () => vendorsOn() && !!process.env.DEEPGRAM_API_KEY;

// ---- The voice pass

const passKey = () =>
  createHmac("sha256", process.env.KAIZEN_VOICE_SECRET || `${process.env.ELEVENLABS_API_KEY ?? ""}|${process.env.DEEPGRAM_API_KEY ?? ""}`)
    .update("kaizen voice pass v1")
    .digest();

const sign = (payload: string) => createHmac("sha256", passKey()).update(payload).digest("base64url");

/** A new pass, valid for two hours from `nowS` (seconds). */
export function makePass(nowS = Math.floor(Date.now() / 1000)): string {
  const payload = `${nowS + PASS_TTL_S}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function passValid(pass: string | null | undefined, nowS = Math.floor(Date.now() / 1000)): boolean {
  const m = /^(\d{1,12})\.([\w-]{6,32})\.([\w-]{20,64})$/.exec(pass ?? "");
  if (!m || Number(m[1]) < nowS) return false;
  const want = Buffer.from(sign(`${m[1]}.${m[2]}`));
  const got = Buffer.from(m[3]);
  return want.length === got.length && timingSafeEqual(want, got);
}

const readCookie = (req: Request, name: string) =>
  (req.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1] ?? null;

function passCookie(req: Request): string {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return `${PASS_COOKIE}=${makePass()}; Path=/api/voice; Max-Age=${PASS_TTL_S}; HttpOnly; SameSite=Strict${https ? "; Secure" : ""}`;
}

// ---- Daily ceiling (per server instance)

let day = { date: "", count: { tts: 0, stt: 0 } };

const warned = { tts: "", stt: "" };

/**
 * Reserves one token against today's ceiling; null when the day is used up. `settle(false)` hands the
 * reservation back (the vendor failed, so nothing was spent).
 */
export function reserveToken(kind: "tts" | "stt"): { settle(spent: boolean): void } | null {
  const date = new Date().toISOString().slice(0, 10);
  if (day.date !== date) day = { date, count: { tts: 0, stt: 0 } };
  const ceiling = Number(process.env.KAIZEN_VOICE_DAILY_TOKENS) || DEFAULT_DAILY_TOKENS;
  if (day.count[kind] >= ceiling) {
    if (warned[kind] !== date) console.warn(`voice: daily ${kind} token ceiling (${ceiling}) reached on this instance`);
    warned[kind] = date;
    return null;
  }
  day.count[kind]++;
  const on = date;
  let settled = false;
  return {
    settle(spent: boolean) {
      if (settled) return;
      settled = true;
      if (!spent && day.date === on) day.count[kind] = Math.max(0, day.count[kind] - 1);
    },
  };
}

// ---- Routes

/** Which vendors are set up. Also hands out the voice pass the token routes ask for, when there is anything to use it on. */
export function voiceStatusResponse(req: Request): Response {
  const status = { tts: ttsConfigured("en"), ttsEs: ttsConfigured("es"), stt: sttConfigured() };
  return json(status, 200, status.tts || status.ttsEs || status.stt ? { "set-cookie": passCookie(req) } : {});
}

/** Only pages on this site may ask for tokens: a browser sends Origin on every POST, so a request without one is refused. */
export function sameSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Kind = "tts" | "stt";
type TokenRequest = { consent: boolean; under13: boolean; locale: Locale };

async function readRequest(req: Request): Promise<TokenRequest | null> {
  const b = (await req.json().catch(() => null)) as { consent?: unknown; under13?: unknown; locale?: unknown } | null;
  if (!b || typeof b !== "object") return null;
  // A missing age band counts as under 13: the careful reading.
  return { consent: b.consent === true, under13: b.under13 !== false, locale: b.locale === "es" ? "es" : "en" };
}

/**
 * Is this voice allowed for the learner asking? The microphone (stt) needs a grown-up's consent at
 * every age; the vendor read-aloud (tts) needs it under 13. Today the page says so (the grown-up's
 * setting in the browser store). M5 replaces this body with a lookup of the stored consent record
 * and the learner's age band for the signed-in session; callers don't change.
 */
export async function voiceAllowed(_req: Request, kind: Kind, body: TokenRequest): Promise<boolean> {
  return kind === "stt" ? body.consent : body.consent || !body.under13;
}

type Admitted = TokenRequest & { settle(spent: boolean): void };

/** The checks every token request passes, in order; a Response when one fails. */
async function gate(req: Request, kind: Kind, configured: (locale: Locale) => boolean, perMinute: number): Promise<Admitted | Response> {
  if (!configured("en") && !configured("es")) return json({ error: "not_configured" }, 503);
  if (!sameSite(req)) return json({ error: "origin" }, 403);
  if (limited(req, `voice-${kind}`, perMinute)) return json({ error: "rate" }, 429);
  if (!passValid(readCookie(req, PASS_COOKIE))) return json({ error: "session" }, 401);
  const body = await readRequest(req);
  if (!body) return json({ error: "bad_request" }, 400);
  if (!configured(body.locale)) return json({ error: "not_configured" }, 503);
  if (!(await voiceAllowed(req, kind, body))) return json({ error: "consent" }, 403);
  const reservation = reserveToken(kind);
  if (!reservation) return json({ error: "daily" }, 429);
  return { ...body, settle: reservation.settle };
}

export async function ttsTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, "tts", ttsConfigured, TTS_PER_MINUTE);
  if (body instanceof Response) return body;
  let res: Response;
  try {
    res = await f(ELEVENLABS_TOKEN_URL, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      signal: AbortSignal.timeout(VENDOR_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    body.settle(false);
    return json({ error: "vendor" }, 502);
  }
  const data = res.ok ? ((await res.json().catch(() => null)) as { token?: unknown } | null) : null;
  if (typeof data?.token !== "string") {
    body.settle(false);
    console.warn(`voice: ElevenLabs token request failed (${res.status})`);
    return json({ error: "vendor" }, 502);
  }
  body.settle(true);
  const dialogue = process.env.ELEVENLABS_TRANSPORT === "dialogue";
  const modelId = dialogue ? "eleven_v4_turbo" : process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";
  return json(
    {
      token: data.token,
      voiceId: voiceIdFor(body.locale),
      modelId,
      // Language enforcement exists only on the v2.5 Flash and Turbo models and the dialogue socket; others reject the parameter.
      languageCode: dialogue || /_v2_5$/.test(modelId) ? body.locale : null,
      outputFormat: "pcm_24000",
      zeroRetention: process.env.ELEVENLABS_ZERO_RETENTION === "1",
      transport: dialogue ? "dialogue" : "stream-input",
    },
    200,
    { "set-cookie": passCookie(req) },
  );
}

/** Which Deepgram model listens for a language, and how (spec §2.2): Flux by default, Nova-3 as the fallback. */
export function sttModel(locale: Locale): { model: string; language: string; api: "v1" | "v2"; languageHint?: string[] } {
  const base = process.env.DEEPGRAM_MODEL;
  // Spanish: its own model if set; Nova when the whole deployment is on Nova; else Flux multilingual.
  const model = locale === "es" ? process.env.DEEPGRAM_MODEL_ES || (base?.startsWith("nova") ? base : "flux-general-multi") : base || "flux-general-en";
  const flux = model.startsWith("flux");
  if (flux) return { model, language: locale === "es" ? "es" : "en", api: "v2", ...(model.endsWith("-multi") ? { languageHint: locale === "es" ? ["es", "en"] : ["en", "es"] } : {}) };
  return { model, language: locale === "es" ? process.env.DEEPGRAM_LANGUAGE_ES || "es-419" : "en-US", api: "v1" };
}

export async function sttTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, "stt", sttConfigured, STT_PER_MINUTE);
  if (body instanceof Response) return body;
  let res: Response;
  try {
    res = await f(DEEPGRAM_GRANT_URL, {
      method: "POST",
      headers: { authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl_seconds: STT_TOKEN_TTL_S }),
      signal: AbortSignal.timeout(VENDOR_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    body.settle(false);
    return json({ error: "vendor" }, 502);
  }
  const data = res.ok ? ((await res.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null) : null;
  if (typeof data?.access_token !== "string") {
    body.settle(false);
    console.warn(`voice: Deepgram token request failed (${res.status})`);
    return json({ error: "vendor" }, 502);
  }
  body.settle(true);
  return json(
    {
      token: data.access_token,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : STT_TOKEN_TTL_S,
      ...sttModel(body.locale),
    },
    200,
    { "set-cookie": passCookie(req) },
  );
}

// ---- Turn metrics

/** One learner's turns per minute, with room for a conversation. */
export const METRIC_PER_MINUTE = 60;
const METRIC_MAX_BYTES = 2048;

/**
 * One turn's latency numbers (./metrics VoiceMetric: numbers and labels only, nothing else accepted),
 * printed as one JSON log line. Same-site pages only, budgeted per address.
 */
export async function voiceMetricResponse(req: Request): Promise<Response> {
  if (!sameSite(req)) return json({ error: "origin" }, 403);
  if (limited(req, "voice-metric", METRIC_PER_MINUTE)) return json({ error: "rate" }, 429);
  const text = await req.text().catch(() => "");
  if (!text || text.length > METRIC_MAX_BYTES) return json({ error: "bad_request" }, 400);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const m = VoiceMetric.safeParse(raw);
  if (!m.success) return json({ error: "bad_request" }, 400);
  console.log(JSON.stringify({ voice_turn: m.data }));
  return new Response(null, { status: 204, headers: NO_STORE });
}
