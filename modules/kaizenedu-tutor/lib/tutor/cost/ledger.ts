/**
 * Writes usage rows for every priced hop (spec R8 "cost logged per turn",
 * §8.5 usage_ledger) and reads the running totals the ceilings need.
 */
import { randomBytes } from 'node:crypto';

import type { Queryable } from '@/lib/tutor/db';

import type { BudgetKind } from './ceiling';

export interface UsageLine {
  accountId: string;
  learnerId: string | null;
  sessionId: string | null;
  turnId: string | null;
  kind: BudgetKind;
  provider: string | null;
  model: string | null;
  quantity: number;
  unit: 'token' | 'character' | 'second' | 'image';
  cents: number;
  priced: boolean;
}

export async function recordUsageLine(db: Queryable, line: UsageLine): Promise<string> {
  const id = `use_${randomBytes(9).toString('base64url')}`;
  await db.query(
    `INSERT INTO usage_ledger (id, account_id, learner_id, session_id, turn_id, kind, provider, model, quantity, unit, cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      line.accountId,
      line.learnerId,
      line.sessionId,
      line.turnId,
      line.kind,
      line.provider,
      line.model,
      line.quantity,
      line.unit,
      Math.round(line.cents),
    ],
  );
  return id;
}

export async function sessionSpentCents(db: Queryable, sessionId: string): Promise<number> {
  const { rows } = await db.query<{ cents: number | string | null }>(
    `SELECT COALESCE(SUM(cents), 0) AS cents FROM usage_ledger WHERE session_id = $1`,
    [sessionId],
  );
  return Number(rows[0]?.cents ?? 0);
}

export async function learnerSpentTodayCents(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<number> {
  const { rows } = await db.query<{ cents: number | string | null }>(
    `SELECT COALESCE(SUM(cents), 0) AS cents FROM usage_ledger
     WHERE account_id = $1 AND learner_id = $2 AND ts >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
    [accountId, learnerId],
  );
  return Number(rows[0]?.cents ?? 0);
}

export async function globalSpentTodayCents(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ cents: number | string | null }>(
    `SELECT COALESCE(SUM(cents), 0) AS cents FROM usage_ledger
     WHERE ts >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
  );
  return Number(rows[0]?.cents ?? 0);
}
