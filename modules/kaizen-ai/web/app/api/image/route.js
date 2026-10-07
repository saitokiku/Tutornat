// POST /api/image { prompt } → a generated image (data URL), via Google's
// Imagen when GEMINI_API_KEY is set. This is the lowest-priority rich-output
// feature: with no key it simply 501s and the chat shows a friendly
// "image generation isn't enabled" chip. Metered as a `report` (it's an
// expensive generation) and rate-limited.

import { getCaller, checkEntitlement, recordUsage, auditLog } from '@/lib/server/context';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'Image generation isn’t enabled.' }, { status: 501 });

  const rl = await checkRate(rateKey(caller, req, 'image'), { limit: 8, windowMs: 60_000 });
  if (!rl.ok) return Response.json({ error: 'Too many images at once.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  const ent = await checkEntitlement(caller, 'report');
  if (!ent.ok) return Response.json({ error: ent.reason, code: 'limit' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const prompt = String(body?.prompt || '').trim().slice(0, 500);
  if (prompt.length < 3) return Response.json({ error: 'Describe the image.' }, { status: 400 });

  const model = process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        instances: [{ prompt: `Educational, clean illustration. ${prompt}` }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[image] service error', r.status, data?.error?.message);
      return Response.json({ error: 'The image service refused that one — try a different prompt.' }, { status: 502 });
    }
    const pred = data?.predictions?.[0];
    const b64 = pred?.bytesBase64Encoded;
    if (!b64) return Response.json({ error: 'No image was returned.' }, { status: 502 });

    recordUsage(caller, 'report', 1, 0, { kind: 'image', model }).catch(() => {});
    auditLog(caller.user.id, 'image.generated', model, { chars: prompt.length }).catch(() => {});
    return Response.json({ dataUrl: `data:${pred.mimeType || 'image/png'};base64,${b64}` });
  } catch (e) {
    console.error('[image] generation failed', e?.message);
    return Response.json({ error: 'Could not generate the image — try again.' }, { status: 502 });
  }
}
