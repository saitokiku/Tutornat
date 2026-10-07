// GET /api/club/schedule — the public weekly schedule (unauthenticated).
// Sanitized fields only; retail prices only. Cached briefly at the edge so a
// storefront hit never hammers the database.

import { publicSchedule } from '@/lib/server/publicSchedule';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const rl = await checkRate(rateKey(null, req, 'sched'), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  const url = new URL(req.url);
  const data = await publicSchedule({
    days: Math.min(14, Math.max(1, Number(url.searchParams.get('days')) || 7)),
    kind: url.searchParams.get('kind'),
    grade: url.searchParams.get('grade'),
  });
  // A failed read answers 503 and is never cached. Returning it as a 200 with
  // an empty list is what let a database outage render as a quiet week on every
  // storefront at once — and caching that answer for a minute would have spread
  // it to every visitor in the window.
  if (data.failed) {
    return Response.json(
      { error: 'The schedule could not be read just now.', failed: true, sessions: [], notYetOpen: data.notYetOpen },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return Response.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
