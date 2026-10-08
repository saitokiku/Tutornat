// The listening kit (live tutor spec §7.5): renders the 30-line EN/ES script (./voice-script) to WAV
// files in a shuffled folder, with an answer key kept apart, for the blind listen and the voice
// audition. Each take is what a child would hear from the app: the same stream-input socket and
// messages (elevenlabs.ts ttsSocketUrl / openingMessage / sentenceMessage / closingMessage), so the
// band's speed (K–2 0.94 on Flash), one sentence at a time as the voice-mode chunker cuts a reply,
// the spoken form of every sentence (speakable: numbers in words), and the app's own player
// (player.ts) on an offline clock, which cuts in the band's sentence pauses (K–2: 400 ms, and 300 ms
// more before a question; 3–5: 250 ms; 6–9: 120 ms) and none after a clause cut.
//
//   ELEVENLABS_API_KEY=… VOICES=id1,id2,… [MODELS=eleven_flash_v2_5,eleven_v4_turbo] npx tsx evals/voice-listen.ts
//
// Writes evals/out/listen/<n>.wav and evals/out/listen-key.json (which file is which voice, model,
// line, band and language; don't open it until the ratings are in). Add manual recordings of the best
// Tier A browser voice to the folder by hand for the comparison. Without a key it says what it needs.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isClauseCut, splitSentences } from "../src/lib/voice/chunk";
import { closingMessage, openingMessage, pcm16ToFloat32, sentenceMessage, ttsSocketUrl, TTS_SAMPLE_RATE, type TtsToken } from "../src/lib/voice/elevenlabs";
import { createPlayer } from "../src/lib/voice/player";
import { speakable } from "../src/lib/voice/speakable";
import type { Band } from "../src/lib/voice/types";
import { SCRIPT } from "./voice-script";

const OUT = fileURLToPath(new URL("./out/", import.meta.url));
const RATE = TTS_SAMPLE_RATE;

/** 16-bit mono PCM → a WAV file. */
function wav(pcm: Int16Array): Uint8Array {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const out = new Uint8Array(44 + bytes.length);
  const v = new DataView(out.buffer);
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + bytes.length, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, bytes.length, true);
  out.set(bytes, 44);
  return out;
}

/**
 * An AudioContext that never plays: the player schedules its buffers on it (its clock stands at 0, so
 * everything lines up back to back with the pauses the player inserts), and mix() lays them out.
 */
function offlineContext() {
  const sources: { at: number; data: Float32Array }[] = [];
  const param = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
  const ctx = {
    currentTime: 0,
    state: "running",
    sampleRate: RATE,
    outputLatency: 0,
    baseLatency: 0,
    destination: {},
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
    createBuffer: (_ch: number, length: number) => {
      const data = new Float32Array(length);
      return { length, duration: length / RATE, getChannelData: () => data };
    },
    createBufferSource() {
      const node = {
        buffer: null as { getChannelData: () => Float32Array } | null,
        connect() {},
        start: (at = 0) => sources.push({ at, data: node.buffer!.getChannelData() }),
        stop() {},
      };
      return node;
    },
  };
  const mix = (): Int16Array => {
    const end = sources.reduce((m, s) => Math.max(m, Math.round(s.at * RATE) + s.data.length), 0);
    const out = new Int16Array(end);
    for (const s of sources) {
      const o = Math.round(s.at * RATE);
      for (let i = 0; i < s.data.length; i++) out[o + i] = Math.max(-32768, Math.min(32767, Math.round(s.data[i] * 0x7fff)));
    }
    return out;
  };
  return { ctx: ctx as unknown as AudioContext, mix };
}

/** One line as the app would play it, through the live socket. */
async function render(key: string, t: Omit<TtsToken, "token">, text: string, locale: "en" | "es", band: Band): Promise<Int16Array> {
  const res = await fetch("https://api.elevenlabs.io/v1/single-use-token/tts_websocket", { method: "POST", headers: { "xi-api-key": key } });
  if (!res.ok) throw new Error(`ElevenLabs token ${res.status}`);
  const token: TtsToken = { ...t, token: ((await res.json()) as { token: string }).token };
  const { ctx, mix } = offlineContext();
  const player = createPlayer({ ctx, sampleRate: RATE, band });
  const sentences = splitSentences(text, { mode: "voice" });
  const ws = new WebSocket(ttsSocketUrl(token));
  let carry: number | null = null;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no audio within 20 s")), 20_000);
    ws.onopen = () => {
      ws.send(JSON.stringify(openingMessage(token, band)));
      sentences.forEach((s, i) => {
        const sp = speakable(s, locale);
        player.addSentence(sp.text, sp.words, /[?¿]/.test(s), isClauseCut(s));
        ws.send(JSON.stringify(sentenceMessage(token, sp.text, i === 0)));
      });
      ws.send(JSON.stringify(closingMessage(token)));
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data)) as { audio?: string | null; alignment?: { chars?: string[]; charStartTimesMs?: number[] } | null; isFinal?: boolean; error?: string };
      if (m.error) return reject(new Error(m.error));
      if (m.audio) {
        const pcm = pcm16ToFloat32(m.audio, carry);
        carry = pcm.carry;
        player.push(pcm.samples, m.alignment ?? null);
      }
      if (m.isFinal) {
        clearTimeout(timer);
        resolve();
      }
    };
    ws.onerror = () => reject(new Error("socket"));
    ws.onclose = () => {
      clearTimeout(timer);
      resolve();
    };
  });
  try {
    ws.close();
  } catch {}
  player.end();
  return mix();
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voices = (process.env.VOICES ?? [process.env.ELEVENLABS_VOICE_ID, process.env.ELEVENLABS_VOICE_ID_ES].filter(Boolean).join(",")).split(",").filter(Boolean);
  const models = (process.env.MODELS ?? "eleven_flash_v2_5").split(",").filter(Boolean);
  if (!key || !voices.length) {
    console.log("voice-listen: needs ELEVENLABS_API_KEY and VOICES=<voice ids> (or ELEVENLABS_VOICE_ID). Blocked on keys.");
    return;
  }
  const takes: { voice: string; model: string; line: string; band: Band; locale: "en" | "es" }[] = [];
  for (const voice of voices) for (const model of models) for (const line of SCRIPT) for (const locale of ["en", "es"] as const) takes.push({ voice, model, line: line.id, band: line.band, locale });
  // Shuffle so file names say nothing.
  for (let i = takes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [takes[i], takes[j]] = [takes[j], takes[i]];
  }
  mkdirSync(`${OUT}listen`, { recursive: true });
  const answers: Record<string, (typeof takes)[number]> = {};
  for (const [n, t] of takes.entries()) {
    const line = SCRIPT.find((l) => l.id === t.line)!;
    const dialogue = /v4/.test(t.model);
    // The token the app gets from /api/voice/tts-token for this model (server.ts), minus the token.
    const tok: Omit<TtsToken, "token"> = { voiceId: t.voice, modelId: t.model, languageCode: dialogue || /_v2_5$/.test(t.model) ? t.locale : null, outputFormat: "pcm_24000", zeroRetention: false, transport: dialogue ? "dialogue" : "stream-input" };
    const pcm = await render(key, tok, line[t.locale], t.locale, t.band);
    const name = String(n + 1).padStart(3, "0");
    writeFileSync(`${OUT}listen/${name}.wav`, wav(pcm));
    answers[name] = t;
  }
  writeFileSync(`${OUT}listen-key.json`, `${JSON.stringify(answers, null, 2)}\n`);
  console.log(`voice-listen: ${takes.length} files in ${OUT}listen/ (key: ${OUT}listen-key.json).`);
}

void main();
