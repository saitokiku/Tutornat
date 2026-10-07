// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sameSite, sttConfigured, sttTokenResponse, ttsConfigured, ttsTokenResponse, voiceStatusResponse } from "./server";

let ip = 0;
/** A same-site POST from a fresh address (so rate limits don't carry between tests). */
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://kaizenedu.net/api/voice/tts-token", {
    method: "POST",
    headers: { host: "kaizenedu.net", origin: "https://kaizenedu.net", "sec-fetch-site": "same-origin", "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });

const vendor = (status: number, body: unknown) => vi.fn<typeof fetch>(async () => Response.json(body, { status }));

beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("KAIZEN_VOICE", "");
  vi.stubEnv("ELEVENLABS_API_KEY", "el-test-key");
  vi.stubEnv("DEEPGRAM_API_KEY", "dg-test-key");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "");
  vi.stubEnv("ELEVENLABS_VOICE_ID_ES", "");
  vi.stubEnv("ELEVENLABS_MODEL", "");
  vi.stubEnv("ELEVENLABS_ZERO_RETENTION", "");
  vi.stubEnv("DEEPGRAM_MODEL", "");
  vi.stubEnv("DEEPGRAM_LANGUAGE_ES", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("which voice vendors are set up", () => {
  it("follows the keys", async () => {
    expect(await voiceStatusResponse().json()).toEqual({ tts: true, stt: true });
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(await voiceStatusResponse().json()).toEqual({ tts: false, stt: true });
    expect(voiceStatusResponse().headers.get("cache-control")).toBe("no-store");
  });

  it("on Vercel, keys stay inert until KAIZEN_VOICE=vendor", () => {
    vi.stubEnv("VERCEL", "1");
    expect(ttsConfigured()).toBe(false);
    expect(sttConfigured()).toBe(false);
    vi.stubEnv("KAIZEN_VOICE", "vendor");
    expect(ttsConfigured()).toBe(true);
    expect(sttConfigured()).toBe(true);
  });
});

describe("tts token", () => {
  it("refuses without a key", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const f = vendor(200, { token: "x" });
    const res = await ttsTokenResponse(post({ consent: true, locale: "en" }), f);
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses without the consent flag", async () => {
    const f = vendor(200, { token: "x" });
    for (const body of [{ locale: "en" }, { consent: false, locale: "en" }, { consent: "yes", locale: "en" }]) {
      const res = await ttsTokenResponse(post(body), f);
      expect(res.status, JSON.stringify(body)).toBe(403);
      expect(await res.json()).toEqual({ error: "consent" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses other sites and bad bodies", async () => {
    const f = vendor(200, { token: "x" });
    expect((await ttsTokenResponse(post({ consent: true }, { "sec-fetch-site": "cross-site" }), f)).status).toBe(403);
    expect((await ttsTokenResponse(post({ consent: true }, { origin: "https://evil.example", "sec-fetch-site": "" }), f)).status).toBe(403);
    const bad = new Request("https://kaizenedu.net/api/voice/tts-token", { method: "POST", headers: { host: "kaizenedu.net", "x-forwarded-for": "10.9.9.9" }, body: "not json" });
    expect((await ttsTokenResponse(bad, f)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it("mints a single-use token with the key on the server side only", async () => {
    const f = vendor(200, { token: "sutkn_abc" });
    const res = await ttsTokenResponse(post({ consent: true, locale: "es" }), f);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toEqual({ token: "sutkn_abc", voiceId: "JBFqnCBsd6RMkjVDRZzb", modelId: "eleven_flash_v2_5", languageCode: "es", outputFormat: "pcm_24000", zeroRetention: false });
    expect(JSON.stringify(body)).not.toContain("el-test-key");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/single-use-token/tts_websocket");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe("el-test-key");
  });

  it("uses the configured voice, model and retention", async () => {
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voiceEN");
    vi.stubEnv("ELEVENLABS_VOICE_ID_ES", "voiceES");
    vi.stubEnv("ELEVENLABS_MODEL", "eleven_multilingual_v2");
    vi.stubEnv("ELEVENLABS_ZERO_RETENTION", "1");
    const es = await (await ttsTokenResponse(post({ consent: true, locale: "es" }), vendor(200, { token: "t" }))).json();
    expect(es).toMatchObject({ voiceId: "voiceES", modelId: "eleven_multilingual_v2", languageCode: null, zeroRetention: true });
    const en = await (await ttsTokenResponse(post({ consent: true, locale: "en" }), vendor(200, { token: "t" }))).json();
    expect(en.voiceId).toBe("voiceEN");
  });

  it("says the vendor failed without passing its reply on", async () => {
    const res = await ttsTokenResponse(post({ consent: true, locale: "en" }), vendor(401, { detail: { message: "invalid key el-test-key" } }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "vendor" });
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect((await ttsTokenResponse(post({ consent: true, locale: "en" }), down)).status).toBe(502);
  });

  it("is rate limited per address", async () => {
    const f = vendor(200, { token: "t" });
    const same = () => post({ consent: true, locale: "en" }, { "x-forwarded-for": "10.1.1.1" });
    let last = 0;
    for (let i = 0; i < 41; i++) last = (await ttsTokenResponse(same(), f)).status;
    expect(last).toBe(429);
  });
});

describe("stt token", () => {
  it("refuses without a key or consent", async () => {
    const f = vendor(200, { access_token: "jwt", expires_in: 30 });
    expect((await sttTokenResponse(post({ consent: false, locale: "en" }), f)).status).toBe(403);
    vi.stubEnv("DEEPGRAM_API_KEY", "");
    expect((await sttTokenResponse(post({ consent: true, locale: "en" }), f)).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("grants a 30-second token and picks the language", async () => {
    const f = vendor(200, { access_token: "jwt.abc", expires_in: 30 });
    const en = await (await sttTokenResponse(post({ consent: true, locale: "en" }), f)).json();
    expect(en).toEqual({ token: "jwt.abc", expiresIn: 30, model: "nova-3", language: "en-US" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.deepgram.com/v1/auth/grant");
    expect((init?.headers as Record<string, string>).authorization).toBe("Token dg-test-key");
    expect(JSON.parse(String(init?.body))).toEqual({ ttl_seconds: 30 });
    const es = await (await sttTokenResponse(post({ consent: true, locale: "es" }), f)).json();
    expect(es.language).toBe("es-419");
    vi.stubEnv("DEEPGRAM_LANGUAGE_ES", "multi");
    expect((await (await sttTokenResponse(post({ consent: true, locale: "es" }), f)).json()).language).toBe("multi");
  });

  it("reports a vendor failure plainly", async () => {
    const res = await sttTokenResponse(post({ consent: true, locale: "en" }), vendor(403, { err_msg: "Insufficient permissions" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "vendor" });
  });
});

describe("same-site check", () => {
  const req = (headers: Record<string, string>) => new Request("https://kaizenedu.net/x", { headers });
  it("allows our own pages and non-browser callers, refuses other sites", () => {
    expect(sameSite(req({ host: "kaizenedu.net", origin: "https://kaizenedu.net", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(sameSite(req({ host: "kaizenedu.net" }))).toBe(true);
    expect(sameSite(req({ host: "kaizenedu.net", origin: "https://other.net" }))).toBe(false);
    expect(sameSite(req({ host: "kaizenedu.net", "sec-fetch-site": "same-site" }))).toBe(false);
    expect(sameSite(req({ "x-forwarded-host": "kaizenedu.net", host: "internal:3000", origin: "https://kaizenedu.net" }))).toBe(true);
  });
});
