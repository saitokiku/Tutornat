/**
 * Global daily-spend alarm (spec R9, §12 "cost runaway"; guard-25).
 *
 * `checkGlobalSpend` compares today's ledger total with two thresholds. Over
 * the alarm it writes one `flags` row of kind `spend_alarm` per UTC day and
 * posts a JSON alert to ALERT_WEBHOOK_URL when that is set. Over the stop it
 * also flips `ai_kill_switch` on through app_settings and writes a
 * `spend_stop` flag. The result is cached for 60 s per instance so the turn
 * engine can call it on every turn; side effects never throw into a turn.
 */
import { randomBytes } from 'node:crypto';

import { createLogger } from '@/lib/logger';
import { globalSpentTodayCents } from '@/lib/tutor/cost';
import type { Queryable } from '@/lib/tutor/db';
import { setAppSetting } from '@/lib/tutor/settings';

const log = createLogger('tutor-spend-alarm');

export const DEFAULT_GLOBAL_DAILY_SPEND_ALARM_CENTS = 10_000;
export const DEFAULT_GLOBAL_DAILY_SPEND_STOP_CENTS = 25_000;
export const SPEND_CHECK_CACHE_MS = 60_000;
/** Owner of the alarm flags; never a real account, so no parent view lists them. */
export const SPEND_FLAG_ACCOUNT = 'system';
export const ALERT_TIMEOUT_MS = 5_000;

export type SpendLevel = 'ok' | 'alarm' | 'stop';
export type SpendFlagKind = 'spend_alarm' | 'spend_stop';

export interface SpendCheck {
  level: SpendLevel;
  spentCents: number;
  alarmCents: number;
  stopCents: number;
  /** Epoch ms of the database read behind this result. */
  checkedAt: number;
  fromCache: boolean;
}

export interface SpendCheckOptions {
  now?: () => number;
  /** Skip the 60 s cache. */
  force?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

export interface SpendAlert {
  kind: SpendFlagKind;
  spentCents: number;
  thresholdCents: number;
  /** UTC day, YYYY-MM-DD. */
  day: string;
  environment: string;
  /** Slack-compatible summary line. */
  text: string;
}

function readCents(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function spendThresholds(env: NodeJS.ProcessEnv = process.env): {
  alarmCents: number;
  stopCents: number;
} {
  return {
    alarmCents: readCents(
      env.GLOBAL_DAILY_SPEND_ALARM_CENTS,
      DEFAULT_GLOBAL_DAILY_SPEND_ALARM_CENTS,
    ),
    stopCents: readCents(env.GLOBAL_DAILY_SPEND_STOP_CENTS, DEFAULT_GLOBAL_DAILY_SPEND_STOP_CENTS),
  };
}

const STATE_KEY = Symbol.for('natural-tutor.spend-alarm');
interface SpendState {
  last?: { check: SpendCheck; at: number };
}
const state = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {}) as SpendState;

export function resetSpendCheckCache(): void {
  state.last = undefined;
}

export function buildSpendAlert(
  kind: SpendFlagKind,
  check: SpendCheck,
  env: NodeJS.ProcessEnv = process.env,
): SpendAlert {
  const thresholdCents = kind === 'spend_stop' ? check.stopCents : check.alarmCents;
  const environment = env.VERCEL_ENV ?? env.NODE_ENV ?? 'unknown';
  const day = new Date(check.checkedAt).toISOString().slice(0, 10);
  const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const text =
    kind === 'spend_stop'
      ? `Natural Tutor (${environment}): global spend today ${dollars(check.spentCents)} crossed the stop at ${dollars(thresholdCents)}. ai_kill_switch is now on; new turns are refused until an operator turns it off.`
      : `Natural Tutor (${environment}): global spend today ${dollars(check.spentCents)} crossed the alarm at ${dollars(thresholdCents)}. The stop is at ${dollars(check.stopCents)}.`;
  return { kind, spentCents: check.spentCents, thresholdCents, day, environment, text };
}

async function flaggedToday(db: Queryable, kind: SpendFlagKind): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM flags
     WHERE account_id = $1 AND kind = $2
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
     LIMIT 1`,
    [SPEND_FLAG_ACCOUNT, kind],
  );
  return rows.length > 0;
}

async function writeFlag(db: Queryable, kind: SpendFlagKind, note: string): Promise<string> {
  const id = `flg_${randomBytes(9).toString('base64url')}`;
  await db.query(
    `INSERT INTO flags (id, account_id, learner_id, session_id, kind, note)
     VALUES ($1, $2, NULL, NULL, $3, $4)`,
    [id, SPEND_FLAG_ACCOUNT, kind, note],
  );
  return id;
}

async function postAlert(
  alert: SpendAlert,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  const url = env.ALERT_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(alert),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    if (!response.ok) log.warn(`alert webhook answered ${response.status} for ${alert.kind}`);
    return response.ok;
  } catch (error) {
    log.warn(
      `alert webhook failed for ${alert.kind}: ${error instanceof Error ? error.name : 'error'}`,
    );
    return false;
  }
}

async function raiseOnce(
  db: Queryable,
  kind: SpendFlagKind,
  check: SpendCheck,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<void> {
  if (await flaggedToday(db, kind)) return;
  const alert = buildSpendAlert(kind, check, env);
  const flagId = await writeFlag(db, kind, alert.text);
  log.warn(`${kind} ${flagId}: ${alert.text}`);
  await postAlert(alert, env, fetchImpl);
}

/**
 * Cheap enough for every turn: one ledger SUM per instance per minute. The
 * turn engine refuses new work when `level` is `stop` (and `ai_kill_switch`
 * reads true from app_settings from then on).
 */
export async function checkGlobalSpend(
  db: Queryable,
  options: SpendCheckOptions = {},
): Promise<SpendCheck> {
  const now = options.now ?? Date.now;
  const at = now();
  const cached = state.last;
  if (!options.force && cached && at >= cached.at && at - cached.at < SPEND_CHECK_CACHE_MS) {
    return { ...cached.check, fromCache: true };
  }
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const { alarmCents, stopCents } = spendThresholds(env);
  const spentCents = await globalSpentTodayCents(db);
  const level: SpendLevel =
    spentCents >= stopCents ? 'stop' : spentCents >= alarmCents ? 'alarm' : 'ok';
  const check: SpendCheck = {
    level,
    spentCents,
    alarmCents,
    stopCents,
    checkedAt: at,
    fromCache: false,
  };
  if (level !== 'ok') {
    try {
      await raiseOnce(db, 'spend_alarm', check, env, fetchImpl);
      if (level === 'stop') {
        await setAppSetting(db, 'ai_kill_switch', true);
        await raiseOnce(db, 'spend_stop', check, env, fetchImpl);
      }
    } catch (error) {
      log.error(
        `spend alarm side effects failed: ${error instanceof Error ? error.name : 'error'}`,
      );
    }
  }
  state.last = { check, at };
  return check;
}
