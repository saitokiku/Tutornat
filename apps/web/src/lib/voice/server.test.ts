// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makePass,
  PASS_COOKIE,
  passValid,
  sameSite,
  STT_PER_MINUTE,
  sttConfigured,
  sttTokenResponse,
  TTS_PER_MINUTE,
  ttsConfigured,
  ttsTokenResponse,
  voiceStatusResponse,
} from "./server";

let ip = 0;
const statusReq = () => new Request("https://kaizenedu.net/api/voice/status", { headers: { host: "kaizenedu.net" } });

/** The voice pass from a status call, as a Cookie header value. */
function pass(): string {
  const set = voiceStatusResponse(statusReq()).headers.get("set-cookie") ?? "";
  return set.split(";")[0];
}

/** A same-site POST with a voice pass, from a fresh address (so rate limits don't carry between tests). */
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://kaizenedu.net/api/voice/tts-token", {
    method: "POST",
    headers: {
      host: "kaizenedu.net",
      origin: "https://kaizenedu.net",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "x-forwarded-for": `10.0.${Math.floor(++ip / 250)}.${ip % 250}`,
      cookie: pass(),
      ...headers,
    },
    body: JSON.stringify(body),
  });

const vendor = (status: number, body: unknown) => vi.fn<typeof fetch>(async () => Response.json(body, { status }));
const ADULT = { consent: false, under13: false, locale: "en" };
const ALLOWED = { consent: true, under13: true, locale: "en" };

beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("KAIZEN_VOICE", "");
  vi.stubEnv("KAIZEN_VOICE_SECRET", "");
  vi.stubEnv("KAIZEN_VOICE_DAILY_TOKENS", "");
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
  vi.useRealTimers();
});

describe("which voice vendors are set up", () => {
  it("follows the keys", async () => {
    expect(await voiceStatusResponse(statusReq()).json()).toEqual({ tts: true, stt: true });
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(await voiceStatusResponse(statusReq()).json()).toEqual({ tts: false, stt: true });
    expect(voiceStatusResponse(statusReq()).headers.get("cache-control")).toBe("no-store");
  });

  it("hands out an HttpOnly, same-site voice pass only when there is a vendor to use it on", () => {
    const set = voiceStatusResponse(statusReq()).headers.get("set-cookie")!;
    expect(set).toMatch(new RegExp(`^${PASS_COOKIE}=`));
    expect(set).toContain("HttpOnly");
    expect(set).toContain("SameSite=Strict");
    expect(set).toContain("Path=/api/voice");
    expect(set).toContain("Secure");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("DEEPGRAM_API_KEY", "");
    expect(voiceStatusResponse(statusReq()).headers.get("set-cookie")).toBeNull();
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

describe("voice pass", () => {
  it("is signed and runs out after two hours", () => {
    const p = makePass(1000);
    expect(passValid(p, 1000)).toBe(true);
    expect(passValid(p, 1000 + 2 * 3600 - 1)).toBe(true);
    expect(passValid(p, 1000 + 2 * 3600 + 1)).toBe(false);
    const [exp, nonce, sig] = p.split(".");
    expect(passValid(`${Number(exp) + 9999}.${nonce}.${sig}`, 1000)).toBe(false); // can't stretch it
    expect(passValid(`${exp}.${nonce}.${sig.slice(0, -2)}xx`, 1000)).toBe(false);
    expect(passValid("", 1000)).toBe(false);
    expect(passValid(null, 1000)).toBe(false);
  });

  it("is tied to this deployment's secret", () => {
    const p = makePass(1000);
    vi.stubEnv("KAIZEN_VOICE_SECRET", "another-secret");
    expect(passValid(p, 1000)).toBe(false);
  });
});

describe("tts token", () => {
  it("refuses without a key", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const f = vendor(200, { token: "x" });
    const res = await ttsTokenResponse(post(ALLOWED), f);
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses an under-13 learner without consent; 13 and over may hear the vendor voice", async () => {
    const f = vendor(200, { token: "x" });
    for (const body of [{ locale: "en" }, { consent: false, locale: "en" }, { consent: false, under13: true, locale: "en" }, { consent: "yes", locale: "en" }]) {
      const res = await ttsTokenResponse(post(body), f);
      expect(res.status, JSON.stringify(body)).toBe(403);
      expect(await res.json()).toEqual({ error: "consent" });
    }
    expect(f).not.toHaveBeenCalled();
    expect((await ttsTokenResponse(post(ADULT), f)).status).toBe(200);
  });

  it("refuses other sites, callers with no Origin, and bad bodies", async () => {
    const f = vendor(200, { token: "x" });
    expect((await ttsTokenResponse(post(ALLOWED, { "sec-fetch-site": "cross-site" }), f)).status).toBe(403);
    expect((await ttsTokenResponse(post(ALLOWED, { origin: "https://evil.example", "sec-fetch-site": "" }), f)).status).toBe(403);
    const noOrigin = new Request("https://kaizenedu.net/api/voice/tts-token", {
      method: "POST",
      headers: { host: "kaizenedu.net", cookie: pass(), "x-forwarded-for": "10.9.9.8", "content-type": "application/json" },
      body: JSON.stringify(ALLOWED),
    });
    const r = await ttsTokenResponse(noOrigin, f);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "origin" });
    const bad = new Request("https://kaizenedu.net/api/voice/tts-token", {
      method: "POST",
      headers: { host: "kaizenedu.net", origin: "https://kaizenedu.net", cookie: pass(), "x-forwarded-for": "10.9.9.9" },
      body: "not json",
    });
    expect((await ttsTokenResponse(bad, f)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it("asks for the voice pass: none, forged or expired gets 401 so the page can renew it", async () => {
    const f = vendor(200, { token: "x" });
    for (const cookie of ["", `${PASS_COOKIE}=123.abcdefgh.${"x".repeat(43)}`, `${PASS_COOKIE}=${makePass(1000)}`]) {
      const res = await ttsTokenResponse(post(ALLOWED, { cookie }), f);
      expect(res.status, cookie).toBe(401);
      expect(await res.json()).toEqual({ error: "session" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("mints a single-use token with the key on the server side only, and renews the pass", async () => {
    const f = vendor(200, { token: "sutkn_abc" });
    const res = await ttsTokenResponse(post({ ...ALLOWED, locale: "es" }), f);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`^${PASS_COOKIE}=`));
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
    const es = await (await ttsTokenResponse(post({ ...ALLOWED, locale: "es" }), vendor(200, { token: "t" }))).json();
    expect(es).toMatchObject({ voiceId: "voiceES", modelId: "eleven_multilingual_v2", languageCode: null, zeroRetention: true });
    const en = await (await ttsTokenResponse(post(ALLOWED), vendor(200, { token: "t" }))).json();
    expect(en.voiceId).toBe("voiceEN");
  });

  it("says the vendor failed without passing its reply on", async () => {
    const res = await ttsTokenResponse(post(ALLOWED), vendor(401, { detail: { message: "invalid key el-test-key" } }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "vendor" });
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect((await ttsTokenResponse(post(ALLOWED), down)).status).toBe(502);
  });

  it("is rate limited per address to what one learner needs", async () => {
    const f = vendor(200, { token: "t" });
    const same = () => post(ALLOWED, { "x-forwarded-for": "10.1.1.1" });
    const statuses: number[] = [];
    for (let i = 0; i <= TTS_PER_MINUTE; i++) statuses.push((await ttsTokenResponse(same(), f)).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(TTS_PER_MINUTE);
    expect(statuses.at(-1)).toBe(429);
  });

  it("stops at a daily ceiling per server instance", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-01-02T10:00:00Z")); // a day no other test used
    vi.stubEnv("KAIZEN_VOICE_DAILY_TOKENS", "3");
    const f = vendor(200, { token: "t" });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await ttsTokenResponse(post(ALLOWED), f)).status);
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
    expect(f).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledOnce();
    vi.setSystemTime(new Date("2031-01-03T00:00:01Z"));
    expect((await ttsTokenResponse(post(ALLOWED), f)).status).toBe(200);
  });
});

describe("stt token", () => {
  it("refuses without a key, and without consent at any age", async () => {
    const f = vendor(200, { access_token: "jwt", expires_in: 30 });
    expect((await sttTokenResponse(post({ consent: false, under13: true, locale: "en" }), f)).status).toBe(403);
    expect((await sttTokenResponse(post(ADULT), f)).status).toBe(403);
    vi.stubEnv("DEEPGRAM_API_KEY", "");
    expect((await sttTokenResponse(post(ALLOWED), f)).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("grants a 30-second token and picks the language", async () => {
    const f = vendor(200, { access_token: "jwt.abc", expires_in: 30 });
    const en = await (await sttTokenResponse(post(ALLOWED), f)).json();
    expect(en).toEqual({ token: "jwt.abc", expiresIn: 30, model: "nova-3", language: "en-US" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.deepgram.com/v1/auth/grant");
    expect((init?.headers as Record<string, string>).authorization).toBe("Token dg-test-key");
    expect(JSON.parse(String(init?.body))).toEqual({ ttl_seconds: 30 });
    const es = await (await sttTokenResponse(post({ ...ALLOWED, locale: "es" }), f)).json();
    expect(es.language).toBe("es-419");
    vi.stubEnv("DEEPGRAM_LANGUAGE_ES", "multi");
    expect((await (await sttTokenResponse(post({ ...ALLOWED, locale: "es" }), f)).json()).language).toBe("multi");
  });

  it("reports a vendor failure plainly", async () => {
    const res = await sttTokenResponse(post(ALLOWED), vendor(403, { err_msg: "Insufficient permissions" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "vendor" });
  });

  it("is rate limited more tightly than read-aloud", async () => {
    const f = vendor(200, { access_token: "jwt", expires_in: 30 });
    const same = () => post(ALLOWED, { "x-forwarded-for": "10.2.2.2" });
    let last = 0;
    for (let i = 0; i <= STT_PER_MINUTE; i++) last = (await sttTokenResponse(same(), f)).status;
    expect(last).toBe(429);
    expect(STT_PER_MINUTE).toBeLessThan(TTS_PER_MINUTE);
  });
});

describe("same-site check", () => {
  const req = (headers: Record<string, string>) => new Request("https://kaizenedu.net/x", { headers });
  it("allows our own pages, refuses other sites and callers without an Origin", () => {
    expect(sameSite(req({ host: "kaizenedu.net", origin: "https://kaizenedu.net", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(sameSite(req({ host: "kaizenedu.net" }))).toBe(false);
    expect(sameSite(req({ host: "kaizenedu.net", origin: "https://other.net" }))).toBe(false);
    expect(sameSite(req({ host: "kaizenedu.net", origin: "https://kaizenedu.net", "sec-fetch-site": "same-site" }))).toBe(false);
    expect(sameSite(req({ "x-forwarded-host": "kaizenedu.net", host: "internal:3000", origin: "https://kaizenedu.net" }))).toBe(true);
  });
});
