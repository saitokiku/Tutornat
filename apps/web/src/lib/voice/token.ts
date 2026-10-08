import { VoiceError } from "./types";

// Asking our server for a vendor token (/api/voice/tts-token, /api/voice/stt-token). The server wants
// the voice pass cookie that /api/voice/status hands out; when it has run out (401), one fresh status
// call renews it. Only a refusal that says "consent" is about consent; 429 is a spent budget ("limit":
// try again later); any other refusal means the service isn't available to this page.

export type TokenBody = {
  /** A grown-up allowed voice for this learner. */
  consent: boolean;
  /** The learner may be under 13. */
  under13: boolean;
  locale: string;
};

export async function requestToken<T>(f: typeof fetch, url: string, body: TokenBody, statusUrl = "/api/voice/status"): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await f(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    } catch {
      throw new VoiceError("network");
    }
    if (res.status === 401 && attempt === 0) {
      await f(statusUrl, { cache: "no-store" }).catch(() => null);
      continue;
    }
    if (res.status === 403) {
      const why = (await res.json().catch(() => null)) as { error?: unknown } | null;
      throw new VoiceError(why?.error === "consent" ? "consent" : "unavailable", `refused: ${String(why?.error ?? res.status)}`);
    }
    // The per-minute or daily budget: the service is fine, just not this minute. Never a reason to
    // switch recognizers for the rest of the visit.
    if (res.status === 429) throw new VoiceError("limit", "budget");
    if (!res.ok) throw new VoiceError("unavailable", `token ${res.status}`);
    const t = (await res.json().catch(() => null)) as T | null;
    if (!t) throw new VoiceError("unavailable", "token reply");
    return t;
  }
}
