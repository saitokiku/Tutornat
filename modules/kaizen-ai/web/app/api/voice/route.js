// POST /api/voice — text-to-speech (OpenAI gpt-4o-mini-tts).
// 501 when OPENAI_API_KEY missing → client falls back to browser voice.
// Metered as tts_chars; gated by voice kill switch + plan cap.

import { getCaller, getSettings, checkEntitlement, recordUsage } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response('TTS not configured', { status: 501 });

  const caller = await getCaller(req);
  if (!caller) return new Response('Sign in first.', { status: 401 });

  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const settings = await getSettings();
  if (settings.voice_enabled === false) return new Response('Voice is temporarily disabled.', { status: 503 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const text = String(body?.text || '').slice(0, 4000);
  if (!text.trim()) return new Response('No text', { status: 400 });

  const ent = await checkEntitlement(caller, 'tts_chars', text.length);
  if (!ent.ok) return new Response(ent.reason, { status: 429 });

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    signal: AbortSignal.timeout(30000),
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: 'nova',
      input: text,
      instructions: 'Warm, encouraging tutor. Natural pace, clear diction.',
    }),
  });
  if (!r.ok) return new Response('TTS failed', { status: 502 });

  // ~$12 per 1M chars estimate
  recordUsage(caller, 'tts_chars', text.length, (text.length * 12) / 1e6, {}).catch(() => {});

  return new Response(r.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
}
