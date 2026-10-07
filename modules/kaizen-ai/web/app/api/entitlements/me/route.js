// GET /api/entitlements/me — the caller's plan, subscription status, today's
// usage vs limits per feature, and the club's MONTHLY allowances ("3 of 9
// sessions used"). Powers /billing, /family, and upgrade prompts.

import { getCaller, getPlanLimits, serviceClient } from '@/lib/server/context';
import { clubAllowances } from '@/lib/server/clubBilling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FEATURES = ['tutor_message', 'grade', 'syllabus_parse', 'tts_chars', 'report', 'handoff'];
// The seat's own allowance leads, because the seat is the product. It was
// missing entirely, so the one page that renders this — the parent's — could
// never show a month to the family paying for a standing seat: the allowance
// card only renders features that appear here
// (docs/superpowers/specs/2026-09-02-wave2-audit.md).
const CLUB_VIEW = ['club_seat_included', 'club_hall_included', 'club_private_credit'];

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  if (caller.demo) {
    // Demo deployments have no metering — report an unlimited shape honestly.
    return Response.json({
      plan: 'demo',
      status: 'active',
      currentPeriodEnd: null,
      demo: true,
      usageToday: Object.fromEntries(FEATURES.map((f) => [f, { used: 0, limit: null }])),
      club: Object.fromEntries(CLUB_VIEW.map((f) => [f, { used: 0, limit: null, remaining: null }])),
    });
  }

  const plan = caller.profile?.plan || 'free';
  const svc = serviceClient();
  let status = 'active';
  let currentPeriodEnd = null;
  let usageToday = Object.fromEntries(FEATURES.map((f) => [f, { used: 0, limit: null }]));
  let club = Object.fromEntries(CLUB_VIEW.map((f) => [f, { used: 0, limit: 0, remaining: 0 }]));

  if (svc) {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const [subQ, limits, usageQ, allowances] = await Promise.all([
      svc.from('subscriptions').select('status,current_period_end').eq('user_id', caller.user.id).maybeSingle(),
      getPlanLimits(plan),
      svc.from('usage_ledger').select('feature,quantity')
        .eq('user_id', caller.user.id).gte('created_at', since.toISOString()),
      clubAllowances(svc, { userId: caller.user.id, plan }),
    ]);
    if (subQ.data) {
      status = subQ.data.status || 'active';
      currentPeriodEnd = subQ.data.current_period_end || null;
    }
    const used = {};
    for (const row of usageQ.data || []) {
      used[row.feature] = (used[row.feature] || 0) + Number(row.quantity);
    }
    usageToday = Object.fromEntries(FEATURES.map((f) => [f, {
      used: Math.round(used[f] || 0),
      limit: limits[f] ?? null,
    }]));

    // Monthly club allowances: limit null = unlimited (serialized as null,
    // remaining null). Allowances reset on the 1st of each calendar month.
    // Rollover is retired: nothing banks or carries between months; the
    // `rollover` field below stays (always 0 from clubBilling) only for API
    // shape compatibility. A missed week is handled by a discretionary
    // grace-visit courtesy, not a stored balance.
    const remainOf = {
      club_seat_included: allowances.seatRemaining,
      club_hall_included: allowances.hallRemaining,
      club_private_credit: allowances.creditRemaining,
    };
    club = Object.fromEntries(CLUB_VIEW.map((f) => {
      // Three states, and only two of them used to exist here. A plan with NO
      // plan_entitlements row for a feature does not have an unresolved
      // allowance — it has none, which is exactly how clubAllowances' own
      // remaining() reads a missing row (0, fail toward charging). Serializing
      // that absence as `null` meant "unlimited/unknown", so the moment the
      // seat allowance joined this list every free account's page would have
      // shown a row about a product they have not bought. A NULL monthly_limit
      // on a row that does exist still means unlimited, and still serializes
      // as null.
      const provisioned = Object.prototype.hasOwnProperty.call(allowances.monthlyLimits, f);
      const limit = provisioned ? allowances.monthlyLimits[f] : 0;
      const remaining = remainOf[f];
      return [f, {
        used: Math.round(allowances.usedThisMonth[f] || 0),
        limit: limit == null ? null : limit,
        remaining: Number.isFinite(remaining) ? remaining : null,
        ...(f === 'club_hall_included' ? { rollover: allowances.hallRollover } : {}),
      }];
    }));
  }

  return Response.json({ plan, status, currentPeriodEnd, usageToday, club });
}
