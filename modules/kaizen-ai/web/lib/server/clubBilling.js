// Club allowance accounting — how "8 Homework Hall visits a month" is
// counted, spent, and given back.
//
// THE LEDGER IS THE ALLOWANCE. There is no separate credits table: a member's
// remaining allowance is (plan_entitlements.monthly_limit − sum of
// usage_ledger.quantity this calendar month) for the feature key. That is
// exactly the shape checkEntitlement (lib/server/context.js) computes for its
// monthly gate, so the storefront, the booking route, and the 429 path can
// never disagree about the same number.
//
// NO ROLLOVER (2026-08-12, counsel item 12 severability): included visits are
// use-them-this-month. A missed week is handled by a DISCRETIONARY grace-visit
// courtesy: an admin appends a negative-quantity ledger row (exactly the
// refund mechanism below), which extends remaining without any banked balance
// ever existing. Deliberately not an entitlement, so nothing here is stored
// value under gift-card statutes.
//
// TWO RULES THAT KEEP THE COUNT HONEST:
//   1. An included booking decrements SYNCHRONOUSLY (mustWrite), in the same
//      breath as the seat flip — never fire-and-forget recordUsage. A ledger
//      write that fails must fail the booking, or a member gets free inventory
//      the books don't know about.
//   2. Only settled bookings consume allowance. Included seats settle
//      instantly (no Stripe), so decrement-at-booking IS
//      decrement-at-fulfillment — the abandoned-checkout hazard can't exist.
//      Paid overflow/retail seats never touch these keys.
//
// Refunds within the cancellation window append a NEGATIVE quantity row —
// the sums above give the visit back without mutating history. Calendar-month
// windows (reset on the 1st) match checkEntitlement and are disclosed in Terms.

import { mustWrite } from '@/lib/server/billing';
import { auditLog } from '@/lib/server/context';

export const CLUB_FEATURES = ['club_hall_included', 'club_private_credit', 'club_seat_included'];

/**
 * Remaining monthly allowances for one user (calendar month, no rollover).
 * monthly_limit NULL (unlimited, e.g. internal) → Infinity.
 * No plan_entitlements row → 0 (fail toward charging, never toward free).
 */
export async function clubAllowances(svc, { userId, plan }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: ents }, { data: rows }] = await Promise.all([
    svc.from('plan_entitlements')
      .select('feature,monthly_limit')
      .eq('plan', plan || 'free')
      .in('feature', CLUB_FEATURES),
    svc.from('usage_ledger')
      .select('feature,quantity')
      .eq('user_id', userId)
      .in('feature', CLUB_FEATURES)
      .gte('created_at', monthStart.toISOString()),
  ]);

  const limitOf = Object.fromEntries((ents || []).map((e) => [e.feature, e.monthly_limit]));
  const usedOf = {};
  for (const r of rows || []) {
    usedOf[r.feature] = (usedOf[r.feature] || 0) + Number(r.quantity);
  }

  const remaining = (feature) => {
    if (!(feature in limitOf)) return 0;
    const limit = limitOf[feature];
    if (limit == null) return Infinity;
    // A discretionary grace credit (negative admin ledger row) lowers usedOf,
    // extending remaining through the exact same arithmetic as a refund.
    return Math.max(0, limit - (usedOf[feature] || 0));
  };

  return {
    hallRemaining: remaining('club_hall_included'),
    seatRemaining: remaining('club_seat_included'),
    hallRollover: 0, // kept for API compat; rollover is retired (grace visits are discretionary)
    creditRemaining: remaining('club_private_credit'),
    monthlyLimits: limitOf,
    usedThisMonth: usedOf,
  };
}

/**
 * Spend one unit of a club allowance. SYNCHRONOUS — throws on write failure so
 * the caller aborts the booking instead of giving away untracked inventory.
 */
export async function consumeAllowance(svc, { userId, feature, metadata = {} }) {
  mustWrite(await svc.from('usage_ledger').insert({
    user_id: userId, feature, quantity: 1, est_cost_usd: 0, metadata,
  }).select('id').maybeSingle());
}

/**
 * Give one unit back (cancellation inside the window, min-fill cancel, tutor
 * pulled). Appends quantity −1; history stays append-only. Best-effort at the
 * call sites that are themselves cleanup sweeps — a failed restore is logged
 * for support, never a crashed refund loop.
 */
export async function restoreAllowance(svc, { userId, feature, metadata = {} }) {
  mustWrite(await svc.from('usage_ledger').insert({
    user_id: userId, feature, quantity: -1, est_cost_usd: 0, metadata,
  }).select('id').maybeSingle());
  await auditLog(userId, 'club.allowance_restored', feature, metadata);
}
