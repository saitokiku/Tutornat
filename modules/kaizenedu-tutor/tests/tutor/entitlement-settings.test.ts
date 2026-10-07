import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PLAN } from '@/kaizen.config';
import { addUsedMinutes, computeEntitlement, getEntitlement } from '@/lib/tutor/billing';
import type { TutorDb } from '@/lib/tutor/db';
import { getAppSetting, readGates, setAppSetting } from '@/lib/tutor/settings';

import { testDb } from './_db';

let db: TutorDb;

beforeAll(async () => {
  db = await testDb();
  await db.query(
    `INSERT INTO accounts (id, email, display_name, password_hash) VALUES ('acc_1', 'p@example.com', 'P', 'x')`,
  );
});

afterAll(async () => {
  await db.end();
});

describe('app settings are fail-closed', () => {
  it('an absent row reads as shut and a seeded row reads its value', async () => {
    await db.query(`DELETE FROM app_settings WHERE key = 'ai_kill_switch'`);
    expect(await getAppSetting(db, 'ai_kill_switch')).toBe(false);
    expect(await getAppSetting(db, 'beta_invites_open')).toBe(true);
    expect(await getAppSetting(db, 'under13_gate')).toBe(false);
  });

  it('setAppSetting flips a gate and readGates lists every key', async () => {
    await setAppSetting(db, 'billing_enabled', true);
    expect(await getAppSetting(db, 'billing_enabled')).toBe(true);
    const gates = await readGates(db);
    expect(Object.keys(gates).sort()).toEqual(
      [
        'ai_kill_switch',
        'beta_invites_open',
        'billing_enabled',
        'camera_sensing_enabled',
        'under13_gate',
      ].sort(),
    );
    expect(gates.ai_kill_switch).toBe(false);
    await setAppSetting(db, 'billing_enabled', false);
  });
});

describe('entitlement formula (R7)', () => {
  it('a new account is a trial with the spec minutes and no card', async () => {
    const entitlement = await getEntitlement(db, 'acc_1');
    expect(entitlement.status).toBe('trial');
    expect(entitlement.remainingMinutes).toBe(PLAN.trialMinutes13Plus);
    expect(entitlement.warnAt80).toBe(false);
  });

  it('meters trial minutes, warns at 80 percent, and stops at zero', async () => {
    let entitlement = await addUsedMinutes(db, 'acc_1', 24);
    expect(entitlement.remainingMinutes).toBe(PLAN.trialMinutes13Plus - 24);
    expect(entitlement.warnAt80).toBe(true);
    entitlement = await addUsedMinutes(db, 'acc_1', 100);
    expect(entitlement.remainingMinutes).toBe(0);
  });

  it('an active plan pools the monthly minutes and a canceled one has none', () => {
    const active = computeEntitlement({
      account_id: 'acc_2',
      status: 'active',
      plan: 'monthly',
      pooled_minutes: 0,
      used_minutes: 100,
      trial_minutes_used: 30,
      current_period_end: null,
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
    });
    expect(active.pooledMinutes).toBe(PLAN.pooledMinutesMonthly);
    expect(active.remainingMinutes).toBe(PLAN.pooledMinutesMonthly - 100);
    expect(active.warnAt80).toBe(false);
    const canceled = computeEntitlement({ ...active, status: 'canceled' } as never);
    expect(canceled.remainingMinutes).toBe(0);
  });
});
