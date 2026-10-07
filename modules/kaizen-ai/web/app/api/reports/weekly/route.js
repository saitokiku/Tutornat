// POST /api/reports/weekly — generate a parent-friendly weekly report from
// the stats snapshot the client sends. FAST model tier; metered as `report`.
import { meteredCall } from '@/lib/server/aiCall';
import { getCaller, getSettings, checkEntitlement, recordUsage, serviceClient } from '@/lib/server/context';
import { pickModel } from '@/lib/server/models';

export const runtime = 'nodejs';
export const maxDuration = 60;


const SYSTEM = `You write weekly progress reports for a tutoring app, addressed to the student (parent-friendly tone: warm, specific, honest, zero fluff).
Given a JSON stats snapshot, produce a short markdown report with these sections:
## This week
## What improved
## Needs attention
## Next 3 actions
Rules: cite actual numbers from the stats. If a human tutor seems warranted (multiple critical weaknesses or stalled mastery), say so plainly in Needs attention. Keep it under 250 words.`;

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Not configured: ANTHROPIC_API_KEY missing.' }, { status: 501 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const ent = await checkEntitlement(caller, 'report');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const stats = body?.stats || {};

  const settings = await getSettings();
  const model = pickModel('fast', settings, caller.profile?.plan);

  try {
    const metered = await meteredCall({
      caller, model, system: SYSTEM, messages: [{ role: 'user', content: 'Stats snapshot:\n' + JSON.stringify(stats).slice(0, 8000) }],
      maxTokens: 800, feature: 'report', tier: 'fast',
    });
    if (!metered) return Response.json({ error: 'AI budget reached for this month.' }, { status: 429 });
    const content = metered.text;

    // meteredCall already recorded the REAL cost (reported tokens, cache
    // reads, document blocks). Reuse it rather than re-estimating.
    const cost = metered.cost;
    recordUsage(caller, 'report', 1, cost.usd, { model }).catch(() => {});

    if (!caller.demo) {
      const svc = serviceClient();
      if (svc) svc.from('weekly_reports').insert({ user_id: caller.user.id, content_md: content, stats }).then(() => {}, () => {});
    }
    return Response.json({ report: content });
  } catch (err) {
    console.error('[reports/weekly] generation failed', err?.message);
    return Response.json({ error: 'Could not write the report — try again.' }, { status: 500 });
  }
}
