// @vitest-environment node
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Attempt } from "@/learning/types";
import { answerText } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import { signUp, type AuthOk } from "./auth";
import type { Db } from "./client";
import { attempts, classes, consentReceipts } from "./schema";
import { syncAccount, type SyncBody } from "./sync";
import { testDb } from "./testing";
import { SYNC_LIMITS, utf8Bytes, type PushRecord, type SyncList, type SyncResponse } from "./wire";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

let n = 0;
async function family() {
  const r = (await signUp(db, { email: `sync${++n}@example.test`, password: "long enough", displayName: "Maria", adult: true }, { ip: `10.1.0.${n}` })) as AuthOk;
  return r.account.id;
}

/** A device: keeps its cursor and sends what changed, the way lib/sync.ts does. */
function device(accountId: string, clockOffset = 0) {
  return {
    cursor: 0,
    last: null as SyncResponse | null,
    async sync(push: Partial<Record<SyncList, PushRecord[]>> = {}, extra: Partial<SyncBody> = {}) {
      const res = await syncAccount(db, accountId, { v: 1, since: this.cursor, now: Date.now() + clockOffset, push, ...extra });
      this.cursor = res.cursor;
      this.last = res;
      return res;
    },
  };
}

const profile = (id: string, extra: object = {}) => ({ id, accountId: "client-says-anything", nickname: "Leo", grade: "3", locale: "en", color: "#A93B5D", createdAt: 1, ...extra });
const put = <T extends { id: string }>(data: T, at = Date.now()): PushRecord => ({ id: data.id, at, data });
const course = (id: string, profileId: string, title: string) => ({ id, profileId, title, lessons: [] });

function attempt(profileId: string, over: Partial<Attempt> = {}): Attempt {
  const seed = over.seed ?? 1000 + ++n;
  const item = makeItem("m.add.10", 1, seed, "en");
  return { id: `att-${++n}`, profileId, at: Date.now(), skillId: "m.add.10", level: 1, seed, mode: "practice", correct: true, assisted: false, seconds: 4, response: answerText(item.answer), ...over };
}

describe("sync", () => {
  it("two devices see the same family", async () => {
    const acct = await family();
    const a = device(acct);
    const b = device(acct);
    await a.sync({ profiles: [put(profile("p1"))], courses: [put(course("c1", "p1", "Fractions"))] });
    const pulled = await b.sync();
    expect(pulled.changes.profiles).toEqual([{ id: "p1", data: { ...profile("p1"), accountId: acct } }]);
    expect(pulled.changes.courses).toEqual([{ id: "c1", data: course("c1", "p1", "Fractions") }]);

    // B renames the course; A gets B's version on its next sync.
    await b.sync({ courses: [put(course("c1", "p1", "Fractions, part 2"))] });
    expect((await a.sync()).changes.courses).toEqual([{ id: "c1", data: course("c1", "p1", "Fractions, part 2") }]);
    // Nothing new: an empty answer, same cursor.
    const cursor = a.cursor;
    expect(await a.sync()).toMatchObject({ changes: {}, cursor, more: false });
  });

  it("last write wins by change time, and the older writer is handed the newer copy", async () => {
    const acct = await family();
    const a = device(acct);
    const b = device(acct);
    const t = Date.now();
    await a.sync({ profiles: [put(profile("p1"))] });
    await b.sync({ courses: [put(course("c2", "p1", "Newer"), t)] });
    // A has already pulled the newer copy, then sends an edit it made earlier (offline, say).
    expect((await a.sync()).changes.courses).toEqual([{ id: "c2", data: course("c2", "p1", "Newer") }]);
    const res = await a.sync({ courses: [put(course("c2", "p1", "Older"), t - 60_000)] });
    expect(res.changes.courses).toEqual([{ id: "c2", data: course("c2", "p1", "Newer") }]);
    expect((await device(acct).sync()).changes.courses).toEqual([{ id: "c2", data: course("c2", "p1", "Newer") }]);
  });

  it("corrects a device clock that runs an hour slow", async () => {
    const acct = await family();
    const right = device(acct);
    const slow = device(acct, -3600_000);
    await right.sync({ profiles: [put(profile("p1"))], notes: [put({ id: "n1", profileId: "p1", text: "first" } as never, Date.now() - 5000)] });
    // The slow device's change happened after, but its clock says an hour earlier.
    const res = await slow.sync({ notes: [put({ id: "n1", profileId: "p1", text: "second" } as never, Date.now() - 3600_000)] });
    expect(res.changes.notes).toEqual([{ id: "n1", data: { id: "n1", profileId: "p1", text: "second" } }]);
    expect((await right.sync()).changes.notes).toEqual([{ id: "n1", data: { id: "n1", profileId: "p1", text: "second" } }]);
  });

  it("merges append-only attempts by id: a second copy changes nothing", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"))] });
    const x = attempt("p1");
    await a.sync({ attempts: [put(x)] });
    await device(acct).sync({ attempts: [put({ ...x, correct: false, seconds: 99 })] });
    const rows = await db.select().from(attempts).where(and(eq(attempts.accountId, acct), eq(attempts.id, x.id)));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ correct: true, seconds: 4, verdict: "verified", flagged: false });
  });

  it("stores a forged 'correct' attempt as incorrect, flags it, and tells every device", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"))] });
    const truth = Number(attempt("p1").response);
    const forged = attempt("p1", { response: String(truth + 1000) });
    const res = await a.sync({ attempts: [put(forged)] });
    expect(res.flagged).toBe(1);
    expect(res.changes.attempts).toEqual([{ id: forged.id, data: { ...forged, correct: false } }]);
    const [row] = await db.select().from(attempts).where(and(eq(attempts.accountId, acct), eq(attempts.id, forged.id)));
    expect(row).toMatchObject({ correct: false, claimedCorrect: true, verdict: "forged", flagged: true });
    expect((await device(acct).sync()).changes.attempts?.[0].data).toMatchObject({ correct: false });
  });

  it("checks answers against their set and keeps a check unhelped", async () => {
    const acct = await family();
    const a = device(acct);
    const x = attempt("p1", { mode: "check", setId: "s1", assisted: true });
    const set = { id: "s1", profileId: "p1", kind: "check", skillId: "m.add.10", slots: [{ skillId: "m.add.10", seed: x.seed, role: "check", level: 1 }] };
    const res = await a.sync({ profiles: [put(profile("p1"))], sets: [put(set)], attempts: [put(x)] });
    expect(res.flagged).toBe(0);
    expect(res.changes.attempts?.[0].data).toMatchObject({ correct: true, assisted: false });
    // A check answer for a problem that isn't in its set did not come from the app.
    const stray = attempt("p1", { mode: "check", setId: "s1" });
    expect((await a.sync({ attempts: [put(stray)] })).flagged).toBe(1);
  });

  it("keeps families apart: records for another account's learner are refused", async () => {
    const mine = await family();
    const theirs = await family();
    await device(mine).sync({ profiles: [put(profile("p-mine"))] });
    const res = await device(theirs).sync({ courses: [put(course("c9", "p-mine", "Sneaky"))], attempts: [put(attempt("p-mine"))] });
    expect(res.rejected).toBe(2);
    expect((await device(mine).sync()).changes.courses).toBeUndefined();
    // The same id in two accounts is two records.
    await device(theirs).sync({ profiles: [put(profile("p-mine", { nickname: "Other" }))] });
    expect((await device(mine).sync()).changes.profiles?.[0].data).toMatchObject({ nickname: "Leo", accountId: mine });
  });

  it("refuses malformed records without failing the rest", async () => {
    const acct = await family();
    const res = await device(acct).sync({
      profiles: [put(profile("ok")), put({ id: "bad", nickname: "", grade: "13" } as never)],
      courses: [{ id: "c1", at: Date.now(), data: { id: "different", profileId: "ok" } }, put(course("c2", "ok", "Fine"))],
    });
    expect(res.rejected).toBe(2);
    expect(res.refused).toEqual({ profiles: ["bad"], courses: ["c1"] });
    expect(res.changes.profiles?.map((p) => p.id)).toEqual(["ok"]);
    expect(res.changes.courses?.map((c) => c.id)).toEqual(["c2"]);
  });

  it("refuses a malformed envelope, an unknown list or an id Postgres can't hold on its own, never the batch", async () => {
    const acct = await family();
    const res = await device(acct).sync({
      profiles: [put(profile("ok"))],
      notes: [{ id: "", at: 1 } as never, { id: "n-at", at: "yesterday" } as never, { id: "a\u0000b", at: Date.now(), deleted: true }, put({ id: "n1", profileId: "ok", text: "kept" } as never)],
      ...({ stickers: [put({ id: "s1" })] } as object),
    });
    expect(res.rejected).toBe(4);
    expect(res.refused).toEqual({ notes: ["n-at", "a\u0000b"], stickers: ["s1"] });
    expect(res.changes.notes).toEqual([{ id: "n1", data: { id: "n1", profileId: "ok", text: "kept" } }]);
  });

  it("cleans text Postgres can't store (a half emoji, NUL) instead of failing the family's sync", async () => {
    const acct = await family();
    const cut = "Loves volcanoes 🌋".slice(0, -1); // cut mid-emoji, as `.slice(0, 1000)` can
    const res = await device(acct).sync({
      profiles: [put(profile("p1", { nickname: "Le\u0000o" }))],
      notes: [put({ id: "n1", profileId: "p1", text: cut, ["k\uDC00"]: "\uD800" } as never), put({ id: "n2", profileId: "p1", text: "fine" } as never)],
      attempts: [put(attempt("p1", { why: "\uD83D" }))],
    });
    expect(res.rejected).toBe(0);
    expect(res.changes.profiles?.[0].data).toMatchObject({ nickname: "Leo" });
    expect(res.changes.notes).toEqual([
      { id: "n1", data: { id: "n1", profileId: "p1", text: "Loves volcanoes �", ["k�"]: "�" } },
      { id: "n2", data: { id: "n2", profileId: "p1", text: "fine" } },
    ]);
    expect(res.changes.attempts).toHaveLength(1);
  });

  it("when Postgres refuses one row, keeps the rest of the batch and names the one it refused", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"))] });
    // Stands in for any row Postgres won't take.
    await db.execute(sql`alter table notes add constraint test_no_boom check (data->>'text' <> 'boom')`);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await a.sync({ notes: ["one", "boom", "three"].map((text, i) => put({ id: `n${i}`, profileId: "p1", text } as never)) });
      expect(res.refused).toEqual({ notes: ["n1"] });
      expect(res.changes.notes?.map((r) => r.id)).toEqual(["n0", "n2"]);
    } finally {
      error.mockRestore();
      await db.execute(sql`alter table notes drop constraint test_no_boom`);
    }
  });

  it("never keeps a class's calendar feed link on the server", async () => {
    const acct = await family();
    const klass = { id: "k1", profileId: "p1", name: "Math", subject: "math", color: "#000", feedUrl: "https://school.example/feed?token=secret", createdAt: 1 };
    const res = await device(acct).sync({ profiles: [put(profile("p1"))], classes: [put(klass)] });
    const rest: Partial<typeof klass> = { ...klass };
    delete rest.feedUrl;
    expect(res.changes.classes).toEqual([{ id: "k1", data: rest }]);
    expect(JSON.stringify(await db.select().from(classes))).not.toContain("secret");
  });

  it("removing a learner removes their record everywhere and revokes their consent", async () => {
    const acct = await family();
    const a = device(acct);
    const b = device(acct);
    await a.sync({ profiles: [put(profile("p1")), put(profile("p2"))], courses: [put(course("c1", "p1", "A")), put(course("c2", "p2", "B"))], attempts: [put(attempt("p1"))] });
    await db.insert(consentReceipts).values({ id: "r1", accountId: acct, profileId: "p1", method: "dev-not-verified", verified: false, scope: ["ai"], noticeVersion: "v", under13: true, grantedBy: "x" });
    await b.sync();
    const res = await a.sync({ profiles: [{ id: "p1", at: Date.now(), deleted: true }] });
    expect(res.changes.profiles).toEqual([{ id: "p1", deleted: true }]);
    expect(await db.select().from(attempts).where(and(eq(attempts.accountId, acct), eq(attempts.profileId, "p1")))).toEqual([]);
    expect(res.consent?.[0]).toMatchObject({ id: "r1", revokedAt: expect.any(Number) });
    const other = await b.sync();
    expect(other.changes.profiles).toEqual([{ id: "p1", deleted: true }]);
    // The other learner is untouched.
    expect((await device(acct).sync()).changes.courses?.map((c) => c.id)).toEqual(["c2"]);
  });

  it("keeps a removed learner removed when an offline device edits them afterwards", async () => {
    const acct = await family();
    const a = device(acct);
    const offline = device(acct);
    await a.sync({ profiles: [put(profile("p1"), Date.now() - 120_000)] });
    await offline.sync();
    await a.sync({ profiles: [{ id: "p1", at: Date.now() - 60_000, deleted: true }] });
    // The other device was offline when it renamed the child, with a later change time.
    const res = await offline.sync({ profiles: [put(profile("p1", { nickname: "Renamed" }), Date.now())], notes: [put({ id: "n1", profileId: "p1", text: "x" } as never)] });
    expect(res.changes.profiles).toEqual([{ id: "p1", deleted: true }]);
    expect(res.rejected).toBe(1);
    expect(res.refused).toEqual({ notes: ["n1"] });
    expect((await device(acct).sync()).changes.profiles).toEqual([{ id: "p1", deleted: true }]);
  });

  it("ignores a device trimming append-only and capped lists", async () => {
    const acct = await family();
    const a = device(acct);
    const x = attempt("p1");
    await a.sync({ profiles: [put(profile("p1"))], attempts: [put(x)], acts: [put({ id: "act1", profileId: "p1", kind: "hint" } as never)] });
    await a.sync({ attempts: [{ id: x.id, at: Date.now(), deleted: true }], acts: [{ id: "act1", at: Date.now(), deleted: true }] });
    const all = await device(acct).sync();
    expect(all.changes.attempts).toHaveLength(1);
    expect(all.changes.acts).toEqual([{ id: "act1", data: { id: "act1", profileId: "p1", kind: "hint" } }]);
  });

  it("syncs the account's name and goals, last write wins", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({}, { account: { displayName: "Maria L.", goals: ["daily", "made-up"], at: Date.now() } });
    expect((await device(acct).sync()).account).toEqual({ displayName: "Maria L.", goals: ["daily"] });
    await a.sync({}, { account: { displayName: "Old name", at: Date.now() - 3600_000 } });
    expect((await device(acct).sync()).account).toEqual({ displayName: "Maria L.", goals: ["daily"] });
  });

  it("pages a large first sync without losing a row", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"))] });
    for (let batch = 0; batch < 5; batch++)
      await a.sync({ activity: Array.from({ length: 500 }, (_, i) => put({ id: `e${batch}-${i}`, profileId: "p1", at: i } as never)) });
    const fresh = device(acct);
    const seen = new Set<string>();
    let pages = 0;
    do {
      const res = await fresh.sync();
      for (const r of res.changes.activity ?? []) seen.add(r.id);
      pages++;
    } while (fresh.last!.more && pages < 10);
    expect(pages).toBe(2);
    expect(seen.size).toBe(2500);
  });

  it("counts UTF-8 bytes the way they go over the network, half emoji included", () => {
    for (const s of ["abc", "é", "数", "🌋", "a\uD83Db", "\uDC00", ""]) expect(utf8Bytes(s), JSON.stringify(s)).toBe(Buffer.byteLength(s));
  });

  it("keeps every answer under the byte budget, counting UTF-8, and still loses no row", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"))] });
    // Thirty courses of about 200 KB each, in a script that takes three bytes a character.
    const big = (i: number) => ({ ...course(`c${i}`, "p1", `Course ${i}`), body: "数".repeat(66_000) });
    for (let i = 0; i < 30; i += 5) await a.sync({ courses: Array.from({ length: 5 }, (_, j) => put(big(i + j))) });
    const fresh = device(acct);
    const seen = new Set<string>();
    let pages = 0;
    do {
      const res = await fresh.sync();
      expect(new TextEncoder().encode(JSON.stringify(res)).length).toBeLessThan(SYNC_LIMITS.pullBytes + 100_000);
      for (const r of res.changes.courses ?? []) seen.add(r.id);
      pages++;
    } while (fresh.last!.more && pages < 20);
    expect(seen.size).toBe(30);
    expect(pages).toBeGreaterThanOrEqual(2);
  });

  it("gives a new device the family's learners on its first page, wherever they fall in the order", async () => {
    const acct = await family();
    const a = device(acct);
    await a.sync({ profiles: [put(profile("p1"), Date.now() - 1000)] });
    for (let batch = 0; batch < 5; batch++)
      await a.sync({ activity: Array.from({ length: 500 }, (_, i) => put({ id: `e${batch}-${i}`, profileId: "p1", at: i } as never)) });
    // Renamed after all that, so its row is past the first page.
    await a.sync({ profiles: [put(profile("p1", { nickname: "Leonardo" }))] });
    const first = await device(acct).sync();
    expect(first.more).toBe(true);
    expect(first.changes.profiles?.map((p) => (p.data as { nickname: string }).nickname)).toEqual(["Leonardo"]);
  });
});
