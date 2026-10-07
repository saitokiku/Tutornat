// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { APPLIED_MIGRATION_SQL, getDb, newestMigration, rowsOf, serverMode, setDbForTests, type Db } from "./client";
import { accounts, attempts, consentReceipts, courses, profiles, RECORD_TABLES, sessions } from "./schema";
import { testDb } from "./testing";
import { SYNC_LISTS } from "./wire";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const account = (id: string, email = `${id}@example.test`) => ({ id, email, displayName: "Sam", passwordHash: "scrypt$x" });
const rec = (accountId: string, id: string, profileId: string | null = null) => ({ accountId, id, profileId, data: { id }, updatedAt: new Date() });

describe("schema", () => {
  it("has one table per synced store list", async () => {
    const result = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public'`);
    const tables = rowsOf<{ table_name: string }>(result).map((r) => r.table_name);
    for (const t of ["accounts", "sessions", "password_resets", "auth_throttle", "attempts", "consent_receipts", "plan_done"]) expect(tables).toContain(t);
    // Every list the browser syncs has a home: attempts on its own, the rest as record tables.
    expect(SYNC_LISTS.filter((l) => l !== "attempts").sort()).toEqual(Object.keys(RECORD_TABLES).sort());
  });

  it("records the newest migration where a cold start looks before taking the migration lock", async () => {
    const [row] = rowsOf<{ at: string }>(await db.execute(sql.raw(APPLIED_MIGRATION_SQL)));
    expect(Number(row.at)).toBe(newestMigration());
    expect(newestMigration()).toBeGreaterThan(0);
  });

  it("opens Postgres in-process from DATABASE_URL=pglite:memory, migrated, for local development", async () => {
    setDbForTests(null);
    vi.stubEnv("DATABASE_URL", "");
    try {
      expect(serverMode()).toBe(false);
      await expect(getDb()).rejects.toThrow(/browser-only/);
      vi.stubEnv("DATABASE_URL", "pglite:memory");
      expect(serverMode()).toBe(true);
      const local = await getDb();
      expect(local).not.toBe(db);
      expect(rowsOf<{ n: number }>(await local.execute(sql`select count(*)::int as n from accounts`))[0].n).toBe(0);
      expect(await getDb()).toBe(local);
    } finally {
      vi.unstubAllEnvs();
      setDbForTests(db);
    }
  });

  it("keeps one account per email", async () => {
    await db.insert(accounts).values(account("a1", "same@example.test"));
    await expect(db.insert(accounts).values(account("a2", "same@example.test"))).rejects.toThrow();
  });

  it("scopes record ids to their account, so two families never collide", async () => {
    await db.insert(accounts).values([account("b1"), account("b2")]);
    await db.insert(courses).values([rec("b1", "c-1", "p"), rec("b2", "c-1", "p")]);
    await expect(db.insert(courses).values(rec("b1", "c-1", "p"))).rejects.toThrow();
    expect(await db.select().from(courses).where(eq(courses.id, "c-1"))).toHaveLength(2);
  });

  it("numbers every write from one sequence, in order", async () => {
    await db.insert(accounts).values(account("s1"));
    const [p] = await db.insert(profiles).values(rec("s1", "p1")).returning({ seq: profiles.seq });
    const [c] = await db.insert(courses).values(rec("s1", "c1", "p1")).returning({ seq: courses.seq });
    expect(c.seq).toBeGreaterThan(p.seq);
  });

  it("removes everything of an account with it", async () => {
    await db.insert(accounts).values(account("d1"));
    await db.insert(profiles).values(rec("d1", "p1"));
    await db.insert(sessions).values({ id: "s", accountId: "d1", tokenHash: "h", expiresAt: new Date(Date.now() + 1000) });
    await db.insert(attempts).values({
      accountId: "d1", id: "t1", profileId: "p1", at: new Date(), skillId: "x", level: 1, seed: 4_000_000_000, mode: "practice",
      correct: true, claimedCorrect: true, assisted: false, seconds: 3, verdict: "verified",
    });
    await db.insert(consentReceipts).values({
      id: "r1", accountId: "d1", profileId: "p1", method: "dev-not-verified", verified: false, scope: ["ai"], noticeVersion: "v", under13: true, grantedBy: "d1@example.test",
    });
    // Seeds go up to 2^32 (rng uses seed >>> 0): stored exactly.
    expect((await db.select({ seed: attempts.seed }).from(attempts).where(eq(attempts.id, "t1")))[0].seed).toBe(4_000_000_000);
    await db.delete(accounts).where(eq(accounts.id, "d1"));
    for (const t of [profiles, sessions, attempts, consentReceipts]) expect(await db.select().from(t).where(eq(t.accountId, "d1"))).toEqual([]);
  });
});
