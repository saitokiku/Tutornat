/**
 * The entitlement formula (spec R7, §9; PLAN in kaizen.config). One
 * subscriptions row per account. A trial account has PLAN.trialMinutes13Plus
 * free minutes with no card; a paid account has the pooled monthly minutes
 * shared by every learner profile. Minutes are the metered unit; cost ceilings
 * (lib/tutor/cost) are a separate, server-side guard.
 */
import { GUEST, isStaffEmail, PLAN, STAFF } from '@/kaizen.config';

import type { Entitlement, SubscriptionStatus } from '../contracts';
import type { Queryable } from '../db';

export interface SubscriptionRow extends Record<string, unknown> {
  account_id: string;
  status: SubscriptionStatus;
  plan: string;
  pooled_minutes: number;
  used_minutes: number;
  trial_minutes_used: number;
  current_period_end: string | Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /**
   * The account's email, joined in by `getSubscription` so staff membership is
   * decided in the same round trip as the entitlement. Absent on a row built
   * by hand (the Stripe webhook), which reads as "not staff".
   */
  email?: string;
  /** Whether the account is a guest (D35), joined in the same way; absent reads as false. */
  guest?: boolean;
  /**
   * For a guest, the whole minutes metered today (UTC), summed from the
   * sessions table by `getSubscription`; the subscription row itself keeps
   * counting for the record but the allowance is a daily one.
   */
  guest_minutes_today?: number | string;
}

/**
 * The guest entitlement (D35): `GUEST.dailyMinutes` per UTC day, never a
 * lifetime trial. Finite by construction, so invariant (d) holds for a
 * visitor exactly as it does for an account; the per-session and per-day
 * cost ceilings in lib/tutor/cost bind on top of it.
 */
export function computeGuestEntitlement(minutesToday: number): Entitlement {
  const used = Math.max(0, Math.round(minutesToday));
  return {
    status: 'active',
    pooledMinutes: GUEST.dailyMinutes,
    usedMinutes: used,
    trialMinutesUsed: 0,
    remainingMinutes: Math.max(0, GUEST.dailyMinutes - used),
    warnAt80: used >= (GUEST.dailyMinutes * PLAN.warnAtPercent) / 100,
    guest: true,
  };
}

export function computeEntitlement(row: SubscriptionRow | null): Entitlement {
  if (row?.guest) return computeGuestEntitlement(Number(row.guest_minutes_today ?? 0));
  const status: SubscriptionStatus = row?.status ?? 'trial';
  const trialMinutesUsed = Number(row?.trial_minutes_used ?? 0);
  const usedMinutes = Number(row?.used_minutes ?? 0);
  // A staff account is never on a trial and never runs out of minutes in a
  // testing session: the pool is large enough that the meter is not what stops
  // you, while still being a number, so a runaway loop is still bounded. The
  // minutes are metered as normal — `usedMinutes` keeps counting — so the
  // parent surfaces stay truthful about what was actually spent.
  if (isStaffEmail(row?.email)) {
    const used = status === 'trial' ? trialMinutesUsed : usedMinutes;
    return {
      status: 'active',
      pooledMinutes: STAFF.pooledMinutesMonthly,
      usedMinutes: used,
      trialMinutesUsed,
      remainingMinutes: Math.max(0, STAFF.pooledMinutesMonthly - used),
      warnAt80: false,
    };
  }
  if (status === 'trial') {
    const remaining = Math.max(0, PLAN.trialMinutes13Plus - trialMinutesUsed);
    return {
      status,
      pooledMinutes: PLAN.trialMinutes13Plus,
      usedMinutes: trialMinutesUsed,
      trialMinutesUsed,
      remainingMinutes: remaining,
      warnAt80: trialMinutesUsed >= (PLAN.trialMinutes13Plus * PLAN.warnAtPercent) / 100,
    };
  }
  if (status === 'canceled') {
    return {
      status,
      pooledMinutes: 0,
      usedMinutes,
      trialMinutesUsed,
      remainingMinutes: 0,
      warnAt80: true,
    };
  }
  // active and past_due (grace until the webhook cancels)
  const pooled = Number(row?.pooled_minutes ?? 0) || PLAN.pooledMinutesMonthly;
  return {
    status,
    pooledMinutes: pooled,
    usedMinutes,
    trialMinutesUsed,
    remainingMinutes: Math.max(0, pooled - usedMinutes),
    warnAt80: usedMinutes >= (pooled * PLAN.warnAtPercent) / 100,
  };
}

/** Reads (and creates, as a trial) the account's subscription row. */
export async function getSubscription(db: Queryable, accountId: string): Promise<SubscriptionRow> {
  // The guest's day is summed here so one round trip answers the entitlement
  // for every kind of account; for a non-guest the subquery is skipped.
  const select = `SELECT s.*, a.email, a.guest,
       CASE WHEN a.guest THEN (
         SELECT COALESCE(SUM(minutes), 0)::int FROM sessions
         WHERE account_id = s.account_id AND started_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
       ) ELSE 0 END AS guest_minutes_today
     FROM subscriptions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.account_id = $1`;
  const { rows } = await db.query<SubscriptionRow>(select, [accountId]);
  if (rows[0]) return rows[0];
  await db.query(
    `INSERT INTO subscriptions (account_id, status, plan) VALUES ($1, 'trial', 'monthly')
     ON CONFLICT (account_id) DO NOTHING`,
    [accountId],
  );
  const again = await db.query<SubscriptionRow>(select, [accountId]);
  return again.rows[0]!;
}

export async function getEntitlement(db: Queryable, accountId: string): Promise<Entitlement> {
  return computeEntitlement(await getSubscription(db, accountId));
}

/**
 * Meters minutes against the right bucket. Returns the entitlement after the
 * charge so the caller can stop the session at zero (R7 "hard stop at cap").
 */
export async function addUsedMinutes(
  db: Queryable,
  accountId: string,
  minutes: number,
): Promise<Entitlement> {
  const whole = Math.max(0, Math.round(minutes));
  const row = await getSubscription(db, accountId);
  if (whole > 0) {
    if (row.status === 'trial') {
      await db.query(
        `UPDATE subscriptions SET trial_minutes_used = trial_minutes_used + $2, updated_at = now() WHERE account_id = $1`,
        [accountId, whole],
      );
    } else {
      await db.query(
        `UPDATE subscriptions SET used_minutes = used_minutes + $2, updated_at = now() WHERE account_id = $1`,
        [accountId, whole],
      );
    }
  }
  return getEntitlement(db, accountId);
}
