import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { limited } from "@/lib/server/rate";
import type { Locale } from "@/lib/types";

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
//  6. a daily ceiling per server instance, so a runaway client can't spend without end.
// Until accounts exist (M5) a determined script can still get a pass; 3 and 6 bound what it costs.
//
//   ELEVENLABS_API_KEY         → read-aloud by ElevenLabs (single-use WebSocket tokens, 15 min)
//   ELEVENLABS_VOICE_ID        → the voice (default: a stock ElevenLabs voice); ELEVENLABS_VOICE_ID_ES for Spanish
//   ELEVENLABS_MODEL           → default eleven_flash_v2_5 (lowest latency, English and Spanish)
//   ELEVENLABS_ZERO_RETENTION  → "1" asks ElevenLabs not to keep the text (an enterprise feature)
//   DEEPGRAM_API_KEY           → listening by Deepgram (30-second tokens; the key needs Member role)
//   DEEPGRAM_MODEL             → default nova-3; DEEPGRAM_LANGUAGE_ES default es-419 ("multi" for code-switching)
//   KAIZEN_VOICE=vendor        → on Vercel, required as well, so keys left in the project by earlier
//                                attempts stay inert until someone means to use them (as with KAIZEN_AI)
//   KAIZEN_VOICE_SECRET        → signs the voice pass (default: derived from the vendor keys)
//   KAIZEN_VOICE_DAILY_TOKENS  → tokens per kind per server instance per day (default 2000)

const ELEVENLABS_TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/tts_websocket";
const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant";
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const VENDOR_TIMEOUT_MS = 5000;

/** Tokens per address per minute: a reply each few seconds (plus the next one fetched early) / a press of the microphone each few seconds. */
export const TTS_PER_MINUTE = 12;
export const STT_PER_MINUTE = 8;
const DEFAULT_DAILY_TOKENS = 2000;

export const PASS_COOKIE = "kz_voice";
const PASS_TTL_S = 2 * 60 * 60;

const NO_STORE = { "cache-control": "no-store" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { ...NO_STORE, ...extra } });

const vendorsOn = () => !process.env.VERCEL || process.env.KAIZEN_VOICE === "vendor";

export const ttsConfigured = () => vendorsOn() && !!process.env.ELEVENLABS_API_KEY;
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

function overDailyCeiling(kind: "tts" | "stt"): boolean {
  const date = new Date().toISOString().slice(0, 10);
  if (day.date !== date) day = { date, count: { tts: 0, stt: 0 } };
  const ceiling = Number(process.env.KAIZEN_VOICE_DAILY_TOKENS) || DEFAULT_DAILY_TOKENS;
  if (day.count[kind] >= ceiling) {
    if (day.count[kind] === ceiling) console.warn(`voice: daily ${kind} token ceiling (${ceiling}) reached on this instance`);
    day.count[kind] = ceiling + 1;
    return true;
  }
  day.count[kind]++;
  return false;
}

// ---- Routes

/** Which vendors are set up. Also hands out the voice pass the token routes ask for, when there is anything to use it on. */
export function voiceStatusResponse(req: Request): Response {
  const status = { tts: ttsConfigured(), stt: sttConfigured() };
  return json(status, 200, status.tts || status.stt ? { "set-cookie": passCookie(req) } : {});
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

/** The checks every token request passes, in order; a Response when one fails. */
async function gate(req: Request, kind: Kind, configured: boolean, perMinute: number): Promise<TokenRequest | Response> {
  if (!configured) return json({ error: "not_configured" }, 503);
  if (!sameSite(req)) return json({ error: "origin" }, 403);
  if (limited(req, `voice-${kind}`, perMinute)) return json({ error: "rate" }, 429);
  if (!passValid(readCookie(req, PASS_COOKIE))) return json({ error: "session" }, 401);
  const body = await readRequest(req);
  if (!body) return json({ error: "bad_request" }, 400);
  if (!(await voiceAllowed(req, kind, body))) return json({ error: "consent" }, 403);
  if (overDailyCeiling(kind)) return json({ error: "daily" }, 429);
  return body;
}

export async function ttsTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, "tts", ttsConfigured(), TTS_PER_MINUTE);
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
    return json({ error: "vendor" }, 502);
  }
  const data = res.ok ? ((await res.json().catch(() => null)) as { token?: unknown } | null) : null;
  if (typeof data?.token !== "string") {
    console.warn(`voice: ElevenLabs token request failed (${res.status})`);
    return json({ error: "vendor" }, 502);
  }
  const modelId = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";
  const voiceId = (body.locale === "es" && process.env.ELEVENLABS_VOICE_ID_ES) || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  return json(
    {
      token: data.token,
      voiceId,
      modelId,
      // Language enforcement exists only on the v2.5 Flash and Turbo models; others reject the parameter.
      languageCode: /_v2_5$/.test(modelId) ? body.locale : null,
      outputFormat: "pcm_24000",
      zeroRetention: process.env.ELEVENLABS_ZERO_RETENTION === "1",
    },
    200,
    { "set-cookie": passCookie(req) },
  );
}

export async function sttTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, "stt", sttConfigured(), STT_PER_MINUTE);
  if (body instanceof Response) return body;
  let res: Response;
  try {
    res = await f(DEEPGRAM_GRANT_URL, {
      method: "POST",
      headers: { authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl_seconds: 30 }),
      signal: AbortSignal.timeout(VENDOR_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return json({ error: "vendor" }, 502);
  }
  const data = res.ok ? ((await res.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null) : null;
  if (typeof data?.access_token !== "string") {
    console.warn(`voice: Deepgram token request failed (${res.status})`);
    return json({ error: "vendor" }, 502);
  }
  return json(
    {
      token: data.access_token,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : 30,
      model: process.env.DEEPGRAM_MODEL || "nova-3",
      language: body.locale === "es" ? process.env.DEEPGRAM_LANGUAGE_ES || "es-419" : "en-US",
    },
    200,
    { "set-cookie": passCookie(req) },
  );
}
