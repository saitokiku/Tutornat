import "server-only";
import { limited } from "@/lib/server/rate";
import type { Locale } from "@/lib/types";

// The server half of voice: says which vendors are set up and mints short-lived tokens so the
// browser can talk to them directly. Keys never leave this file's process. A token is only handed
// out for a learner whose voice is allowed (the consent flag), to a page on our own site.
//
//   ELEVENLABS_API_KEY        → read-aloud by ElevenLabs (single-use WebSocket tokens, 15 min)
//   ELEVENLABS_VOICE_ID       → the voice (default: a stock ElevenLabs voice); ELEVENLABS_VOICE_ID_ES for Spanish
//   ELEVENLABS_MODEL          → default eleven_flash_v2_5 (lowest latency, English and Spanish)
//   ELEVENLABS_ZERO_RETENTION → "1" asks ElevenLabs not to keep the text (an enterprise feature)
//   DEEPGRAM_API_KEY          → listening by Deepgram (30-second tokens; the key needs Member role)
//   DEEPGRAM_MODEL            → default nova-3; DEEPGRAM_LANGUAGE_ES default es-419 ("multi" for code-switching)
//   KAIZEN_VOICE=vendor       → on Vercel, required as well, so keys left in the project by earlier
//                               attempts stay inert until someone means to use them (as with KAIZEN_AI)

const ELEVENLABS_TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/tts_websocket";
const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant";
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const VENDOR_TIMEOUT_MS = 5000;

const NO_STORE = { "cache-control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

const vendorsOn = () => !process.env.VERCEL || process.env.KAIZEN_VOICE === "vendor";

export const ttsConfigured = () => vendorsOn() && !!process.env.ELEVENLABS_API_KEY;
export const sttConfigured = () => vendorsOn() && !!process.env.DEEPGRAM_API_KEY;

export function voiceStatusResponse(): Response {
  return json({ tts: ttsConfigured(), stt: sttConfigured() });
}

/** Only pages on this site may ask for tokens (a browser sends these headers on every POST). */
export function sameSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

type TokenRequest = { consent: boolean; locale: Locale };

async function readRequest(req: Request): Promise<TokenRequest | null> {
  const b = (await req.json().catch(() => null)) as { consent?: unknown; locale?: unknown } | null;
  if (!b || typeof b !== "object") return null;
  return { consent: b.consent === true, locale: b.locale === "es" ? "es" : "en" };
}

/**
 * Is voice allowed for the learner asking? Today the page says so (a grown-up's toggle in the browser
 * store). When accounts arrive, replace this body with a lookup of the stored consent for the session.
 */
export async function voiceAllowed(_req: Request, body: TokenRequest): Promise<boolean> {
  return body.consent;
}

/** The checks every token request passes, in order; a Response when one fails. */
async function gate(req: Request, configured: boolean, bucket: string, perMinute: number): Promise<TokenRequest | Response> {
  if (!configured) return json({ error: "not_configured" }, 503);
  if (!sameSite(req)) return json({ error: "origin" }, 403);
  if (limited(req, bucket, perMinute)) return json({ error: "rate" }, 429);
  const body = await readRequest(req);
  if (!body) return json({ error: "bad_request" }, 400);
  if (!(await voiceAllowed(req, body))) return json({ error: "consent" }, 403);
  return body;
}

export async function ttsTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, ttsConfigured(), "voice-tts", 40);
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
  return json({
    token: data.token,
    voiceId,
    modelId,
    // Language enforcement exists only on the v2.5 Flash and Turbo models; others reject the parameter.
    languageCode: /_v2_5$/.test(modelId) ? body.locale : null,
    outputFormat: "pcm_24000",
    zeroRetention: process.env.ELEVENLABS_ZERO_RETENTION === "1",
  });
}

export async function sttTokenResponse(req: Request, f: typeof fetch = fetch): Promise<Response> {
  const body = await gate(req, sttConfigured(), "voice-stt", 20);
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
  return json({
    token: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 30,
    model: process.env.DEEPGRAM_MODEL || "nova-3",
    language: body.locale === "es" ? process.env.DEEPGRAM_LANGUAGE_ES || "es-419" : "en-US",
  });
}
