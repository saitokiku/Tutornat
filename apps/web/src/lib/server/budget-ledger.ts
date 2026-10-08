import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { assertPrincipalLive, type LearningPrincipal } from "./authorize";
import type { Db } from "./db/client";
import { budgetHolds, budgetPeriods } from "./db/schema";

type Limits = { dayTurns: number; dayUsd: number; monthTurns: number; monthUsd: number; addressTurns: number; addressUsd: number };
type Spend = { turns: number; usd: number; tokens: number };
const ZERO: Spend = { turns: 0, usd: 0, tokens: 0 };
export const HOLD_MS = 120_000;
const keysOf = (p: LearningPrincipal, address: string, now: number, namespace: string) => {
  const date = new Date(now).toISOString();
  return { day: `${namespace}:day:${p.accountId}:${p.learnerId ?? p.accountId}:${date.slice(0, 10)}`, month: `${namespace}:month:${p.accountId}:${date.slice(0, 7)}`, address: `${namespace}:addr:${address}:${date.slice(0, 10)}` };
};
const accountLock = (db: Db, account: string) => db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${account}, 0))`);
async function keyLocks(db: Db, keys: string[]) {
  for (const key of [...new Set(keys)].sort()) await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`budget:${key}`}, 0))`);
}
async function spentOn(db: Db, key: string): Promise<Spend> {
  const [row] = await db.select().from(budgetPeriods).where(eq(budgetPeriods.key, key));
  return row ? { turns: row.turns, usd: row.usd, tokens: row.tokens } : ZERO;
}
async function add(db: Db, key: string, delta: Spend) {
  await db.insert(budgetPeriods).values({ key, ...delta }).onConflictDoUpdate({ target: budgetPeriods.key, set: { turns: sql`${budgetPeriods.turns} + ${delta.turns}`, usd: sql`${budgetPeriods.usd} + ${delta.usd}`, tokens: sql`${budgetPeriods.tokens} + ${delta.tokens}` } });
}

/** Separate instances share only Postgres. Locks cover both account and shared network ceilings. */
export function createBudgetLedger(db: Db, limits: Limits, namespace = "ai") {
  async function spent(principal: LearningPrincipal, address: string, now = Date.now()) {
    const keys = keysOf(principal, address, now, namespace);
    const [day, month, network] = await Promise.all([spentOn(db, keys.day), spentOn(db, keys.month), spentOn(db, keys.address)]);
    return { day, month, address: network };
  }
  async function scope(tx: Db, principal: LearningPrincipal, address: string, now: number, holds: boolean, costsOnly = false) {
    const keys = keysOf(principal, address, now, namespace);
    for (const [key, turns, usd, result] of [[keys.month, limits.monthTurns, limits.monthUsd, "month"], [keys.day, limits.dayTurns, limits.dayUsd, "day"], [keys.address, limits.addressTurns, limits.addressUsd, "day"]] as const) {
      const used = await spentOn(tx, key);
      const waiting = holds ? await tx.select({ id: budgetHolds.id }).from(budgetHolds).where(and(gt(budgetHolds.expiresAt, new Date(now)), isNull(budgetHolds.startedAt), sql`${budgetHolds.keys} @> ${JSON.stringify([key])}::jsonb`)) : [];
      if ((!costsOnly && used.turns + waiting.length >= turns) || used.usd >= usd) return result;
    }
    return null;
  }
  return {
    spent,
    overCap: (p: LearningPrincipal, address: string, now = Date.now()) => scope(db, p, address, now, true),
    overSpend: (p: LearningPrincipal, address: string, now = Date.now()) => scope(db, p, address, now, false, true),
    reserve: (p: LearningPrincipal, address: string, now = Date.now()) => db.transaction(async (tx) => {
      await accountLock(tx, p.accountId);
      await assertPrincipalLive(tx, p, now);
      const keys = Object.values(keysOf(p, address, now, namespace));
      await keyLocks(tx, keys);
      const over = await scope(tx, p, address, now, true);
      if (over) return { ok: false as const, scope: over };
      const id = randomUUID();
      await tx.insert(budgetHolds).values({ id, accountId: p.accountId, sessionId: p.sessionId, keys, expiresAt: new Date(now + HOLD_MS) });
      return { ok: true as const, id };
    }),
    start: (id: string, p: LearningPrincipal, now = Date.now()) => db.transaction(async (tx) => {
      await accountLock(tx, p.accountId);
      await assertPrincipalLive(tx, p, now);
      const [hold] = await tx.select().from(budgetHolds).where(and(eq(budgetHolds.id, id), eq(budgetHolds.accountId, p.accountId), eq(budgetHolds.sessionId, p.sessionId)));
      if (!hold || (!hold.startedAt && hold.expiresAt.getTime() <= now)) throw new Error("Reservation expired");
      if (hold.startedAt) return;
      await keyLocks(tx, hold.keys);
      for (const key of hold.keys) await add(tx, key, { turns: 1, usd: 0, tokens: 0 });
      await tx.update(budgetHolds).set({ startedAt: new Date(now) }).where(eq(budgetHolds.id, id));
    }),
    usage: (id: string, usd: number, tokens: number) => db.transaction(async (tx) => {
      const [hold] = await tx.select().from(budgetHolds).where(eq(budgetHolds.id, id));
      if (!hold?.startedAt) throw new Error("No admitted provider call");
      if (!Number.isFinite(usd) || usd < 0 || !Number.isSafeInteger(tokens) || tokens < 0) throw new Error("Invalid usage");
      await keyLocks(tx, hold.keys);
      for (const key of hold.keys) await add(tx, key, { turns: 0, usd, tokens });
    }),
  };
}
