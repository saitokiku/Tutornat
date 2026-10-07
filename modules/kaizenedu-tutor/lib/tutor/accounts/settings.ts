/**
 * Parent settings (wire `ParentSettings`): one JSONB row per account in
 * `parent_settings`. Absent row or field reads as the default. The camera
 * toggle here is the parent's preference; the effective camera state also
 * needs the `camera_sensing_enabled` gate and a camera consent (spec D16,
 * §11.2 item 12), which the route checks before storing `true`.
 */
import type { Queryable } from '@/lib/tutor/db';
import type { ParentSettings } from '@/lib/tutor/wire';

import { AccountsError } from './errors';

export const PARENT_SETTINGS_DEFAULTS: Readonly<ParentSettings> = {
  cameraSensing: false,
  recoveryStepsDisabled: [],
  weeklyEmail: true,
};

/** Recovery-ladder steps a parent may switch off (spec §5.10 C). */
export const RECOVERY_LADDER_STEPS: readonly number[] = [1, 2, 3, 4, 5, 6];

/** Unique, sorted, and inside the ladder; anything else is a 400. */
export function normalizeRecoverySteps(steps: readonly unknown[]): number[] {
  const out = new Set<number>();
  for (const step of steps) {
    if (typeof step !== 'number' || !RECOVERY_LADDER_STEPS.includes(step)) {
      throw new AccountsError(
        'INVALID_REQUEST',
        400,
        `recoveryStepsDisabled lists ladder steps ${RECOVERY_LADDER_STEPS[0]} to ${RECOVERY_LADDER_STEPS[RECOVERY_LADDER_STEPS.length - 1]}.`,
      );
    }
    out.add(step);
  }
  return [...out].sort((a, b) => a - b);
}

export function parseParentSettings(value: unknown): ParentSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    cameraSensing:
      typeof raw.cameraSensing === 'boolean'
        ? raw.cameraSensing
        : PARENT_SETTINGS_DEFAULTS.cameraSensing,
    recoveryStepsDisabled: Array.isArray(raw.recoveryStepsDisabled)
      ? raw.recoveryStepsDisabled.filter(
          (step): step is number =>
            typeof step === 'number' && RECOVERY_LADDER_STEPS.includes(step),
        )
      : [...PARENT_SETTINGS_DEFAULTS.recoveryStepsDisabled],
    weeklyEmail:
      typeof raw.weeklyEmail === 'boolean' ? raw.weeklyEmail : PARENT_SETTINGS_DEFAULTS.weeklyEmail,
  };
}

export async function getParentSettings(db: Queryable, accountId: string): Promise<ParentSettings> {
  const { rows } = await db.query<{ settings: unknown }>(
    `SELECT settings FROM parent_settings WHERE account_id = $1`,
    [accountId],
  );
  return parseParentSettings(rows[0]?.settings);
}

export async function updateParentSettings(
  db: Queryable,
  accountId: string,
  patch: Partial<ParentSettings>,
): Promise<ParentSettings> {
  const current = await getParentSettings(db, accountId);
  const next: ParentSettings = {
    cameraSensing: patch.cameraSensing ?? current.cameraSensing,
    recoveryStepsDisabled: normalizeRecoverySteps(
      patch.recoveryStepsDisabled ?? current.recoveryStepsDisabled,
    ),
    weeklyEmail: patch.weeklyEmail ?? current.weeklyEmail,
  };
  await db.query(
    `INSERT INTO parent_settings (account_id, settings, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (account_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`,
    [accountId, JSON.stringify(next)],
  );
  return next;
}
