/**
 * Staff accounts: the operator's own logins, raised above the plan so the
 * product can be exercised without paying a learner's caps.
 *
 * Two things are being pinned here, and the second matters more than the
 * first. One, that a staff account really does get out of the way — the trial
 * meter, the session ceiling, the daily cap and the request limiter all move.
 * Two, that every one of them is still a number. "Unlimited" in a product that
 * spends real money on every turn means "you will not meet a limit while
 * testing", not "there is no limit": a staff account with a runaway loop must
 * still stop, or the first thing an operator tests is their own bill.
 *
 * The allowlist itself is the other half. It lives in the deployment's
 * environment and nowhere else — not a column, not a field on a request — so
 * the only way to become staff is for whoever controls the environment to say
 * so.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COST, PLAN, STAFF, isStaffEmail } from '@/kaizen.config';
import { computeEntitlement, type SubscriptionRow } from '@/lib/tutor/billing/entitlement';
import { DAILY_HOP_LIMITS, RATE_LIMITS_PER_MINUTE, limitFor } from '@/lib/tutor/guards/rate-limit';
import { dailyCapCents } from '@/lib/tutor/turn';

const STAFF_EMAIL = 'operator@example.com';
const SAVED = process.env.TUTOR_STAFF_EMAILS;

function subscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    account_id: 'acc_test',
    status: 'trial',
    plan: 'monthly',
    pooled_minutes: 0,
    used_minutes: 0,
    trial_minutes_used: 0,
    current_period_end: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.TUTOR_STAFF_EMAILS = `someone@else.test, ${STAFF_EMAIL}`;
});

afterEach(() => {
  if (SAVED === undefined) delete process.env.TUTOR_STAFF_EMAILS;
  else process.env.TUTOR_STAFF_EMAILS = SAVED;
});

describe('who counts as staff', () => {
  it('matches an address on the allowlist regardless of case or padding', () => {
    expect(isStaffEmail(STAFF_EMAIL)).toBe(true);
    expect(isStaffEmail('  OPERATOR@Example.COM  ')).toBe(true);
  });

  it('refuses anyone not on it', () => {
    expect(isStaffEmail('stranger@example.com')).toBe(false);
    expect(isStaffEmail('')).toBe(false);
    expect(isStaffEmail(null)).toBe(false);
    expect(isStaffEmail(undefined)).toBe(false);
  });

  it('makes nobody staff when the variable is unset', () => {
    // A deploy that forgot to configure the allowlist should grant nothing,
    // not everything.
    delete process.env.TUTOR_STAFF_EMAILS;
    expect(isStaffEmail(STAFF_EMAIL)).toBe(false);
  });

  it('makes nobody staff when the variable is empty or only separators', () => {
    process.env.TUTOR_STAFF_EMAILS = ' , , ';
    expect(isStaffEmail(STAFF_EMAIL)).toBe(false);
    expect(isStaffEmail('')).toBe(false);
  });

  it('does not match a substring of a listed address', () => {
    // `example.com` must not let the whole domain in.
    expect(isStaffEmail('example.com')).toBe(false);
    expect(isStaffEmail('operator@example.com.attacker.test')).toBe(false);
  });
});

describe('what a staff account gets', () => {
  it('is never on a trial, whatever the subscription row says', () => {
    const entitlement = computeEntitlement(subscription({ email: STAFF_EMAIL }));
    expect(entitlement.status).toBe('active');
    expect(entitlement.pooledMinutes).toBe(STAFF.pooledMinutesMonthly);
    expect(entitlement.remainingMinutes).toBeGreaterThan(PLAN.trialMinutes13Plus);
  });

  it('leaves a non-staff row on exactly the plan it had', () => {
    const entitlement = computeEntitlement(subscription({ email: 'stranger@example.com' }));
    expect(entitlement.status).toBe('trial');
    expect(entitlement.pooledMinutes).toBe(PLAN.trialMinutes13Plus);
  });

  it('treats a row with no email as not staff', () => {
    // The Stripe webhook builds rows by hand; a missing field must read as
    // "ordinary account", never as "elevated".
    expect(computeEntitlement(subscription()).status).toBe('trial');
    expect(computeEntitlement(null).status).toBe('trial');
  });

  it('still meters the minutes it spends', () => {
    // The parent surfaces have to stay truthful about real usage even when the
    // pool is large enough that nothing stops.
    const entitlement = computeEntitlement(
      subscription({ email: STAFF_EMAIL, status: 'active', used_minutes: 240 }),
    );
    expect(entitlement.usedMinutes).toBe(240);
    expect(entitlement.remainingMinutes).toBe(STAFF.pooledMinutesMonthly - 240);
  });

  it('raises the daily cap and the request limits well clear of testing', () => {
    expect(dailyCapCents(process.env, true)).toBe(STAFF.dailyCapCents);
    expect(dailyCapCents(process.env, true)).toBeGreaterThan(dailyCapCents(process.env, false));
    expect(
      limitFor(RATE_LIMITS_PER_MINUTE.turn, { accountId: 'a', learnerId: 'l', staff: true }),
    ).toBeGreaterThan(RATE_LIMITS_PER_MINUTE.turn);
    expect(
      limitFor(DAILY_HOP_LIMITS.llm, { accountId: 'a', learnerId: 'l', staff: true }),
    ).toBeGreaterThan(DAILY_HOP_LIMITS.llm);
  });

  it('holds an ordinary principal to the ordinary limit', () => {
    const ordinary = { accountId: 'a', learnerId: 'l', staff: false };
    expect(limitFor(RATE_LIMITS_PER_MINUTE.turn, ordinary)).toBe(RATE_LIMITS_PER_MINUTE.turn);
    // A principal from a caller that predates the flag is not staff either.
    expect(limitFor(RATE_LIMITS_PER_MINUTE.turn, { accountId: 'a', learnerId: 'l' })).toBe(
      RATE_LIMITS_PER_MINUTE.turn,
    );
  });
});

describe('the limits staff cannot escape (invariant d)', () => {
  it('still has a finite session ceiling, a finite daily cap and a finite pool', () => {
    // This is the test that matters. Every one of these is a real number, so a
    // loop on a staff account stops at a bill someone can absorb rather than
    // running until a human notices.
    for (const value of [
      STAFF.sessionCeilingCents,
      STAFF.dailyCapCents,
      STAFF.pooledMinutesMonthly,
      STAFF.learnerProfiles,
      STAFF.rateLimitMultiplier,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(dailyCapCents(process.env, true)).toBeLessThan(Number.POSITIVE_INFINITY);
  });

  it('keeps the staff ceilings above the learner ones but within an order of magnitude of sanity', () => {
    expect(STAFF.sessionCeilingCents).toBeGreaterThan(COST.hardCeilingCentsPerSession);
    expect(STAFF.dailyCapCents).toBeGreaterThan(STAFF.sessionCeilingCents);
    // $500 a day on a test account would be a bug, not a budget.
    expect(STAFF.dailyCapCents).toBeLessThanOrEqual(50_000);
  });
});
