// POST /api/voice/transcribe — speech-to-text (OpenAI Whisper / gpt-4o-transcribe).
// Accepts a multipart form with an `audio` blob and returns { text }.
// 501 when OPENAI_API_KEY missing (the client disables voice input rather than
// falling back to the browser's speech engine — voice is OpenAI-only by design).
// Gated by auth + the voice kill switch; metered as stt_seconds.

import { getCaller, getSettings, checkEntitlement, recordUsage } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 25 * 1024 * 1024; // OpenAI hard limit on audio uploads

export async function POST(req) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: 'Voice input not configured: set OPENAI_API_KEY.' }, { status: 501 });

  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const settings = await getSettings();
  if (settings.voice_enabled === false) {
    return Response.json({ error: 'Voice is temporarily disabled.' }, { status: 503 });
  }

  let form;
  try { form = await req.formData(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const audio = form.get('audio');
  if (!audio || typeof audio === 'string') {
    return Response.json({ error: 'No audio' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: 'Audio too long — keep replies under ~10 minutes.' }, { status: 413 });
  }

  // Daily plan cap BEFORE spending money upstream (audit SEC-006 — STT was
  // rate-limited but never entitlement-capped). Seconds estimated from byte
  // size (16kbps opus ≈ 2KB/s), same proxy used for metering below.
  const approxSeconds = Math.max(1, Math.round(audio.size / 2000));
  const ent = await checkEntitlement(caller, 'stt_seconds', approxSeconds);
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  const upstream = new FormData();
  upstream.append('file', audio, audio.name || 'speech.webm');
  upstream.append('model', process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe');
  upstream.append('response_format', 'json');
  upstream.append('language', 'en');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    signal: AbortSignal.timeout(45000),
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: upstream,
  });
  if (!r.ok) return Response.json({ error: 'Transcription failed' }, { status: 502 });

  const data = await r.json().catch(() => ({}));
  const text = String(data?.text || '').trim();

  // ~$0.006/min for whisper-1; gpt-4o-mini-transcribe is cheaper.
  recordUsage(caller, 'stt_seconds', approxSeconds, (approxSeconds * 0.006) / 60, { provider: 'openai' }).catch(() => {});

  return Response.json({ text });
}
