// The listening kit (live tutor spec §7.5): renders the 30-line EN/ES script (./voice-script) to WAV
// files in a shuffled folder, with an answer key kept apart, for the blind listen and the voice
// audition. Each candidate voice reads every line in both languages, exactly as the app would send it
// (speakable: numbers in words, names out).
//
//   ELEVENLABS_API_KEY=… VOICES=id1,id2,… [MODELS=eleven_flash_v2_5,eleven_multilingual_v2] npx tsx evals/voice-listen.ts
//
// Writes evals/out/listen/<n>.wav and evals/out/listen-key.json (which file is which voice, model,
// line and language; don't open it until the ratings are in). Add manual recordings of the best
// Tier A browser voice to the folder by hand for the comparison. Without a key it says what it needs.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { speakable } from "../src/lib/voice/speakable";
import { SCRIPT } from "./voice-script";

const OUT = fileURLToPath(new URL("./out/", import.meta.url));
const RATE = 24000;

/** 16-bit mono PCM → a WAV file. */
function wav(pcm: Uint8Array): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
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
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voices = (process.env.VOICES ?? [process.env.ELEVENLABS_VOICE_ID, process.env.ELEVENLABS_VOICE_ID_ES].filter(Boolean).join(",")).split(",").filter(Boolean);
  const models = (process.env.MODELS ?? "eleven_flash_v2_5").split(",").filter(Boolean);
  if (!key || !voices.length) {
    console.log("voice-listen: needs ELEVENLABS_API_KEY and VOICES=<voice ids> (or ELEVENLABS_VOICE_ID). Blocked on keys.");
    return;
  }
  const takes: { voice: string; model: string; line: string; locale: "en" | "es" }[] = [];
  for (const voice of voices) for (const model of models) for (const line of SCRIPT) for (const locale of ["en", "es"] as const) takes.push({ voice, model, line: line.id, locale });
  // Shuffle so file names say nothing.
  for (let i = takes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [takes[i], takes[j]] = [takes[j], takes[i]];
  }
  mkdirSync(`${OUT}listen`, { recursive: true });
  const answers: Record<string, (typeof takes)[number]> = {};
  for (const [n, t] of takes.entries()) {
    const line = SCRIPT.find((l) => l.id === t.line)!;
    const text = speakable(line[t.locale], t.locale).text;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(t.voice)}?output_format=pcm_24000`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: t.model, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true }, ...(/_v2_5$/.test(t.model) ? { language_code: t.locale } : {}) }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${t.voice} ${t.model}`);
    const name = String(n + 1).padStart(3, "0");
    writeFileSync(`${OUT}listen/${name}.wav`, wav(new Uint8Array(await res.arrayBuffer())));
    answers[name] = t;
  }
  writeFileSync(`${OUT}listen-key.json`, `${JSON.stringify(answers, null, 2)}\n`);
  console.log(`voice-listen: ${takes.length} files in ${OUT}listen/ (key: ${OUT}listen-key.json).`);
}

void main();
