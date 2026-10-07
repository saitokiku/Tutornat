import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "./auth";
import { dataCounts, deleteFamily, deleteLearnerData, EXPORT_FORMAT, exportFamily, exportFileName, wipeBrowserStorage, withFiles } from "./export";
import { createLearner } from "./profiles";
import { emptyState, read, resetMemory, STORE_KEY, update, type StoreState } from "./store";
import type { Profile } from "./types";

afterEach(() => resetMemory());

const T = new Date(2026, 9, 7, 9, 30).getTime();

/** Two families on one device; the second (Ana's) must never leak into the first's export. */
async function twoFamilies() {
  await signUp({ email: "other@example.com", password: "longenough", displayName: "Lee" });
  const other = createLearner({ nickname: "Ana", grade: "2", locale: "es" }) as Profile;
  const otherAccount = read().session.accountId!;
  await signUp({ email: "maria@example.com", password: "longenough", displayName: "Maria" });
  const accountId = read().session.accountId!;
  const ada = createLearner({ nickname: "Ada", grade: "4", locale: "en" }) as Profile;
  const bo = createLearner({ nickname: "Bo", grade: "K", locale: "es" }) as Profile;
  update((s) => {
    for (const [p, n] of [[ada, 3], [bo, 1], [other, 2]] as const) {
      for (let i = 0; i < n; i++) s.attempts.push({ id: `${p.id}-a${i}`, profileId: p.id, at: T, skillId: "m.add.10", level: 1, seed: i, mode: "practice", correct: true, assisted: false, seconds: 9 });
      s.threads.push({ id: `${p.id}-t`, profileId: p.id, startedAt: T, surface: "talk", title: "fractions", lines: [{ role: "learner", text: "hi", at: T }] });
      s.acts.push({ id: `${p.id}-act`, profileId: p.id, at: T, kind: "hint", intent: "next-try-right" });
    }
    s.events.push({ id: "e1", profileId: ada.id, title: "Fractions quiz", kind: "quiz", date: "2026-10-09", skillIds: [], source: "typed", createdAt: T });
    s.notes.push({ id: "n1", profileId: ada.id, at: T, text: "Loves the number line" });
    s.reading.push({ id: "r1", profileId: bo.id, date: "2026-10-06", title: "Frog and Toad", minutes: 10 });
    s.reviews.push({ id: "rv1", skillId: "e.rhyme", status: "approved", by: accountId, at: T });
    s.reviews.push({ id: "rv2", skillId: "e.syllables", status: "flagged", note: "level 1 item 3", by: otherAccount, at: T });
    s.resets.push({ token: "secret-reset-token", accountId, expires: T + 1000 });
    // A list added to the store by a later feature is picked up by its profileId.
    (s as unknown as Record<string, unknown>).later = [{ id: "x", profileId: ada.id }, { id: "y", profileId: other.id }];
  });
  return { accountId, otherAccount, ada, bo, other };
}

describe("exportFamily", () => {
  it("contains every row of this family and nothing of another", async () => {
    const { accountId, ada, bo } = await twoFamilies();
    const out = exportFamily(read(), accountId, { at: T, note: "Your data" })!;
    expect(out.format).toBe(EXPORT_FORMAT);
    expect(out.version).toBe(1);
    expect(out.exportedAt).toBe(new Date(T).toISOString());
    expect(out.note).toBe("Your data");
    expect(out.account).toMatchObject({ id: accountId, email: "maria@example.com", displayName: "Maria" });
    expect(out.learners.map((p) => p.nickname)).toEqual(["Ada", "Bo"]);
    expect(out.data.attempts).toHaveLength(4);
    expect(out.data.threads.map((t) => (t as { profileId: string }).profileId).sort()).toEqual([ada.id, bo.id].sort());
    expect(out.data.acts).toHaveLength(2);
    expect(out.data.events).toHaveLength(1);
    expect(out.data.notes).toHaveLength(1);
    expect(out.data.reading).toHaveLength(1);
    expect(out.data.reviews).toEqual([expect.objectContaining({ id: "rv1" })]);
    expect(out.data.later).toEqual([{ id: "x", profileId: ada.id }]);
    const text = JSON.stringify(out);
    expect(text).not.toMatch(/Ana|other@example\.com|rv2/);
  });

  it("leaves out credentials: password hash, salt, reset tokens", async () => {
    const { accountId } = await twoFamilies();
    const out = exportFamily(read(), accountId)!;
    expect(out.account).not.toHaveProperty("passwordHash");
    expect(out.account).not.toHaveProperty("salt");
    expect(out.data).not.toHaveProperty("resets");
    expect(out.data).not.toHaveProperty("accounts");
    expect(JSON.stringify(out)).not.toContain("secret-reset-token");
  });

  it("is null for an account that isn't on this device, and round-trips through JSON", async () => {
    const { accountId } = await twoFamilies();
    expect(exportFamily(read(), "nope")).toBeNull();
    const out = exportFamily(read(), accountId, { at: T })!;
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it("has a key for every list in the store except credentials", async () => {
    const { accountId } = await twoFamilies();
    const out = exportFamily(read(), accountId)!;
    const lists = Object.keys(emptyState()).filter((k) => Array.isArray(emptyState()[k as keyof StoreState]) && !["accounts", "profiles", "resets"].includes(k));
    for (const k of lists) expect(out.data, k).toHaveProperty(k);
  });

  it("works on an empty family", async () => {
    await signUp({ email: "solo@example.com", password: "longenough", displayName: "Solo" });
    const out = exportFamily(read(), read().session.accountId!)!;
    expect(out.learners).toEqual([]);
    expect(Object.values(out.data).every((rows) => rows.length === 0)).toBe(true);
  });

  it("withFiles puts this family's attachments inside, once each, and names any this browser lost", async () => {
    const { accountId, ada, other } = await twoFamilies();
    update((s) => {
      const e1 = s.events.find((e) => e.id === "e1")!;
      e1.attachment = { blobId: "b1", name: "quiz.jpg", mediaType: "image/jpeg" };
      s.events.push({ id: "e2", profileId: ada.id, title: "Same photo again", kind: "homework", date: "2026-10-10", skillIds: [], source: "typed", createdAt: T, attachment: { blobId: "b1" } });
      s.events.push({ id: "e3", profileId: ada.id, title: "Lost file", kind: "test", date: "2026-10-11", skillIds: [], source: "typed", createdAt: T, attachment: { blobId: "gone" } });
      s.events.push({ id: "e4", profileId: other.id, title: "Theirs", kind: "test", date: "2026-10-11", skillIds: [], source: "typed", createdAt: T, attachment: { blobId: "b-other" } });
    });
    const asked: string[] = [];
    const out = await withFiles(exportFamily(read(), accountId, { at: T })!, async (id) => {
      asked.push(id);
      if (id === "gone") return null;
      return { name: "quiz.jpg", type: "image/jpeg", size: 3, dataUrl: "data:image/jpeg;base64,AAAA" };
    });
    expect(asked).toEqual(["b1", "gone"]);
    expect(out.files).toEqual([{ id: "b1", name: "quiz.jpg", type: "image/jpeg", size: 3, dataUrl: "data:image/jpeg;base64,AAAA" }]);
    expect(out.missingFiles).toEqual(["gone"]);
    expect(JSON.stringify(out)).not.toContain("b-other");
    // A read that fails counts as missing rather than breaking the download.
    const failing = await withFiles(exportFamily(read(), accountId)!, () => Promise.reject(new Error("blocked")));
    expect(failing.files).toEqual([]);
    expect(failing.missingFiles).toEqual(["b1", "gone"]);
  });

  it("names the file by date, without names", () => {
    expect(exportFileName(T)).toBe("kaizenedu-family-2026-10-07.json");
  });
});

describe("dataCounts", () => {
  it("counts a family and one learner from the record", async () => {
    const { accountId, ada } = await twoFamilies();
    expect(dataCounts(read(), { accountId })).toEqual({ learners: 2, courses: 0, answers: 4, conversations: 2, schoolItems: 1, notes: 1, books: 1 });
    expect(dataCounts(read(), { profileId: ada.id })).toEqual({ learners: 1, courses: 0, answers: 3, conversations: 1, schoolItems: 1, notes: 1, books: 0 });
  });
});

describe("deleteLearnerData", () => {
  it("removes the learner and every row of theirs, keeping siblings and other families", async () => {
    const { ada, bo, other } = await twoFamilies();
    update((s) => void (s.session.profileId = ada.id));
    deleteLearnerData(ada.id);
    const s = read();
    expect(s.profiles.map((p) => p.id).sort()).toEqual([bo.id, other.id].sort());
    expect(s.session.profileId).toBeNull();
    for (const key of ["attempts", "threads", "acts", "events", "notes"] as const) expect(s[key].some((r) => r.profileId === ada.id), key).toBe(false);
    expect((s as unknown as { later: { id: string }[] }).later.map((r) => r.id)).toEqual(["y"]);
    expect(s.attempts.filter((a) => a.profileId === bo.id)).toHaveLength(1);
    expect(s.reviews).toHaveLength(2);
  });

  it("does nothing for a learner of another family", async () => {
    const { other } = await twoFamilies();
    const before = JSON.stringify(read());
    deleteLearnerData(other.id);
    expect(JSON.stringify(read())).toBe(before);
  });
});

describe("deleteFamily", () => {
  it("removes one family and signs out, leaving the other family whole", async () => {
    const { accountId, otherAccount, other } = await twoFamilies();
    expect(await deleteFamily(accountId)).toBe("family");
    const s = read();
    expect(s.accounts.map((a) => a.id)).toEqual([otherAccount]);
    expect(s.profiles.map((p) => p.id)).toEqual([other.id]);
    expect(s.attempts.every((a) => a.profileId === other.id)).toBe(true);
    expect(s.reviews.map((r) => r.id)).toEqual(["rv2"]);
    expect(s.resets).toEqual([]);
    expect(s.session).toEqual({ accountId: null, profileId: null });
    expect(exportFamily(s, otherAccount)!.data.attempts).toHaveLength(2);
  });

  it("clears the whole device when it was the only family", async () => {
    await signUp({ email: "solo@example.com", password: "longenough", displayName: "Solo" });
    createLearner({ nickname: "Kit", grade: "1", locale: "en" });
    localStorage.setItem("kaizenedu.drafts", "{}");
    localStorage.setItem("unrelated", "keep");
    expect(await deleteFamily(read().session.accountId!)).toBe("device");
    expect(read()).toEqual(emptyState());
    expect(localStorage.getItem(STORE_KEY)).toBeNull();
    expect(localStorage.getItem("kaizenedu.drafts")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("reports an account that isn't here", async () => {
    expect(await deleteFamily("nope")).toBe("missing");
  });
});

describe("wipeBrowserStorage", () => {
  it("never throws when storage APIs are missing", async () => {
    const idb = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", { value: undefined, configurable: true });
    await expect(wipeBrowserStorage()).resolves.toBeUndefined();
    Object.defineProperty(globalThis, "indexedDB", { value: idb, configurable: true });
  });
});
