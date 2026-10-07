/**
 * Fail-closed product gates (strategy §7, D17): every gate is a row in
 * `app_settings`, and an absent or malformed row reads as shut. Only the
 * operator flips a gate; no request path may write one.
 */
import type { AppSettingKey } from './contracts';
import type { Queryable } from './db';

export const APP_SETTING_KEYS: readonly AppSettingKey[] = [
  'under13_gate',
  'camera_sensing_enabled',
  'billing_enabled',
  'ai_kill_switch',
  'beta_invites_open',
];

/**
 * Settings that hold a number rather than a gate. These are tuning dials, not
 * safety switches, so an absent or unusable row falls back to the caller's
 * default instead of reading as shut — a missing dial must not silence the
 * microphone.
 */
const NUMERIC_KEYS = new Set<AppSettingKey>(['thinking_pause_ms']);

export async function getAppSetting(db: Queryable, key: AppSettingKey): Promise<boolean> {
  const { rows } = await db.query<{ value: unknown }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [key],
  );
  const value = rows[0]?.value;
  return value === true || value === 'true';
}

/**
 * Reads a numeric tuning setting, clamped to a sane range. Anything missing,
 * non-numeric or out of range returns `fallback`, so a bad row degrades to the
 * built-in default rather than breaking a session.
 */
export async function getNumberSetting(
  db: Queryable,
  key: AppSettingKey,
  fallback: number,
  range: { min: number; max: number },
): Promise<number> {
  if (!NUMERIC_KEYS.has(key)) return fallback;
  const { rows } = await db.query<{ value: unknown }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [key],
  );
  const raw = rows[0]?.value;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/** Operator use only (scripts, tests, the ops runbook). */
export async function setAppSetting(
  db: Queryable,
  key: AppSettingKey,
  value: boolean,
): Promise<void> {
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

export async function readGates(db: Queryable): Promise<Record<AppSettingKey, boolean>> {
  const { rows } = await db.query<{ key: string; value: unknown }>(
    `SELECT key, value FROM app_settings`,
  );
  const gates = Object.fromEntries(APP_SETTING_KEYS.map((key) => [key, false])) as Record<
    AppSettingKey,
    boolean
  >;
  for (const row of rows) {
    if ((APP_SETTING_KEYS as readonly string[]).includes(row.key)) {
      gates[row.key as AppSettingKey] = row.value === true || row.value === 'true';
    }
  }
  return gates;
}
