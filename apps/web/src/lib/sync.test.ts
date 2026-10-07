import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signInRoute } from "@/app/api/auth/sign-in/route";
import { POST as signOutRoute } from "@/app/api/auth/sign-out/route";
import { POST as signUpRoute } from "@/app/api/auth/sign-up/route";
import { GET as consentGet, POST as consentPost } from "@/app/api/consent/route";
import { POST as syncRoute } from "@/app/api/sync/route";
import { answerText } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import { grantConsent, loadConsent, signIn, signOut, signUp, useConsent } from "./auth";
import { addFromCatalogue } from "./courses";
import { recordAnswer, startSet } from "./practice";
import { addNote, createLearner, removeLearner, updateLearner } from "./profiles";
import { testDb } from "./server/db/testing";
import { emptyState, read, resetMemory, STORE_KEY, type StoreState } from "./store";
import { diff, resetSyncForTests, setServerStatusForTests, syncNow, useSyncState } from "./sync";
import type { Profile } from "./types";
import { renderHook } from "@testing-library/react";

// Two browsers, one family, a real (in-process) Postgres behind the real route handlers. Each device
// has its own saved store, sync state and cookies; fetch goes to the handlers.

vi.mock("next/server", () => ({ connection: async () => {} }));

let close: () => Promise<void>;
beforeAll(async () => ({ close } = await testDb()));
afterAll(() => close());

type Device = { storage: Record<string, string>; cookies: Map<string, string>; online: boolean };
const devices = new Map<string, Device>();
let current: Device | null = null;

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  "/api/auth/sign-up": signUpRoute,
  "/api/auth/sign-in": signInRoute,
  "/api/auth/sign-out": signOutRoute,
  "/api/sync": syncRoute,
  "GET /api/consent": consentGet,
  "/api/consent": consentPost,
};

function writeDocumentCookies(d: Device) {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  const hint = d.cookies.get("kz_acct");
  if (hint) document.cookie = `kz_acct=${hint}; Path=/`;
}

/** Switches to a device: its saved data, its cookies, a fresh page load. */
function on(name: string) {
  if (current) {
    current.storage = { ...localStorage };
    // A page script may have cleared the readable hint cookie.
    if (!document.cookie.includes("kz_acct=")) current.cookies.delete("kz_acct");
  }
  const d = devices.get(name) ?? { storage: {}, cookies: new Map(), online: true };
  devices.set(name, d);
  localStorage.clear();
  for (const [k, v] of Object.entries(d.storage)) localStorage.setItem(k, v);
  writeDocumentCookies(d);
  current = d;
  resetMemory();
  resetSyncForTests();
  return d;
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const d = current!;
  if (!d.online) throw new TypeError("Failed to fetch");
  const path = String(input);
  const method = init?.method ?? "GET";
  const handler = ROUTES[method === "GET" ? `GET ${path}` : path];
  if (!handler) throw new Error(`no route for ${method} ${path}`);
  const cookie = [...d.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await handler(new Request(`http://localhost${path}`, { method, headers: { ...(init?.headers as Record<string, string>), cookie, host: "localhost" }, body: init?.body }));
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (/Max-Age=0/.test(c)) d.cookies.delete(k);
    else d.cookies.set(k, v);
  }
  writeDocumentCookies(d);
  return res;
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setServerStatusForTests({ mode: "server", resetEmail: false, production: false });
  devices.clear();
  current = null;
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  setServerStatusForTests(null);
  vi.useRealTimers();
});

let n = 0;
const PASS = "family-pass-2026";
async function newFamily(device = "laptop") {
  on(device);
  const email = `two-devices-${++n}@example.test`;
  expect(await signUp({ email, password: PASS, displayName: "Maria", adult: true })).toEqual({ ok: true });
  return email;
}
const learner = (name = "Leo", grade: Profile["grade"] = "3") => createLearner({ nickname: name, grade, locale: "en" }) as Profile;
const tick = (ms = 1000) => vi.setSystemTime(Date.now() + ms);

describe("sync between devices", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T18:00:00Z") }));

  it("two devices see the same family", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    addNote(leo.id, "Loves volcanoes");
    const courseId = addFromCatalogue("math-fractions", leo.id)!;
    await syncNow();

    on("phone");
    expect(await signIn(email, PASS)).toEqual({ ok: true });
    const s = read();
    expect(s.profiles.map((p) => p.nickname)).toEqual(["Leo"]);
    expect(s.notes.map((x) => x.text)).toEqual(["Loves volcanoes"]);
    expect(s.courses.map((c) => c.id)).toEqual([courseId]);

    // A change on the phone reaches the laptop.
    tick();
    addNote(leo.id, "Ask about the moon");
    await syncNow();
    on("laptop");
    await syncNow();
    expect(read().notes.map((x) => x.text).sort()).toEqual(["Ask about the moon", "Loves volcanoes"]);
  });

  it("keeps changes made offline and sends them on reconnect", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    await syncNow();
    const laptop = current!;
    laptop.online = false;
    tick();
    addNote(leo.id, "Written on the train");
    updateLearner(leo.id, { nickname: "Leonardo", grade: "3", locale: "en" });
    await syncNow();
    const { result } = renderHook(() => useSyncState());
    expect(result.current).toMatchObject({ phase: "offline", pending: 2 });

    // The tab closes and opens again later, still offline: nothing is lost.
    on("laptop");
    expect(read().notes.map((x) => x.text)).toEqual(["Written on the train"]);
    laptop.online = true;
    await syncNow();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ phase: "idle", pending: 0 });

    on("phone");
    await signIn(email, PASS);
    expect(read().profiles[0].nickname).toBe("Leonardo");
    expect(read().notes.map((x) => x.text)).toEqual(["Written on the train"]);
  });

  it("the later edit wins when both devices change the same learner", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    await syncNow();
    on("phone");
    await signIn(email, PASS);

    on("laptop");
    tick();
    updateLearner(leo.id, { nickname: "Leo L", grade: "3", locale: "en" });
    on("phone");
    tick();
    updateLearner(leo.id, { nickname: "Leo P", grade: "4", locale: "en" });
    // The phone syncs first with the newer change; the laptop's older one arrives after and loses.
    await syncNow();
    on("laptop");
    await syncNow();
    expect(read().profiles[0]).toMatchObject({ nickname: "Leo P", grade: "4" });
    on("phone");
    await syncNow();
    expect(read().profiles[0]).toMatchObject({ nickname: "Leo P", grade: "4" });
  });

  it("a learner removed on one device leaves the other", async () => {
    const email = await newFamily("laptop");
    const leo = learner("Leo");
    const ana = learner("Ana", "K");
    addNote(leo.id, "note");
    await syncNow();
    on("phone");
    await signIn(email, PASS);
    tick();
    removeLearner(leo.id);
    await syncNow();
    on("laptop");
    await syncNow();
    expect(read().profiles.map((p) => p.id)).toEqual([ana.id]);
    expect(read().notes).toEqual([]);
  });

  it("an answer the server's check rejects comes back as wrong on every device", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    const setId = startSet(read(), { profile: leo, kind: "pick", skillIds: ["m.add.10"], now: Date.now() })!;
    const set = read().sets.find((x) => x.id === setId)!;
    const right = (i: number) => answerText(makeItem(set.slots[i].skillId, 1, set.slots[i].seed, "en").answer);
    recordAnswer(setId, { slot: 0, level: 1, correct: true, assisted: false, seconds: 5, response: right(0) });
    // Edited in the browser to claim a right answer that isn't.
    recordAnswer(setId, { slot: 1, level: 1, correct: true, assisted: false, seconds: 5, response: `${Number(right(1)) + 7}` });
    await syncNow();
    const mine = read().attempts.filter((a) => a.setId === setId);
    expect(mine.map((a) => a.correct)).toEqual([true, false]);
    on("phone");
    await signIn(email, PASS);
    expect(read().attempts.map((a) => a.correct)).toEqual([true, false]);
  });

  it("brings a browser-only family into the new account", async () => {
    // Before this deployment had a server.
    setServerStatusForTests({ mode: "local", resetEmail: false, production: false });
    on("laptop");
    const email = `adopt-${++n}@example.test`;
    await signUp({ email, password: PASS, displayName: "Maria" });
    const leo = learner();
    addNote(leo.id, "from the demo days");
    expect(fetchMock).not.toHaveBeenCalled();

    setServerStatusForTests({ mode: "server", resetEmail: false, production: false });
    // Signing in finds no server account and says how to bring it along.
    expect(await signIn(email, PASS)).toEqual({ ok: false, error: "acct.err.localOnly" });
    expect(await signUp({ email, password: PASS, displayName: "Maria", adult: true })).toEqual({ ok: true });
    expect(read().profiles.map((p) => p.accountId)).toEqual([read().session.accountId]);

    on("phone");
    await signIn(email, PASS);
    expect(read().profiles.map((p) => p.nickname)).toEqual(["Leo"]);
    expect(read().notes.map((x) => x.text)).toEqual(["from the demo days"]);
  });

  it("signing out sends what's waiting, then takes the family off the device", async () => {
    const email = await newFamily("laptop");
    learner();
    vi.stubGlobal("location", { assign: vi.fn() });
    await signOut();
    expect(read().profiles).toEqual([]);
    expect(read().session.accountId).toBeNull();
    expect(document.cookie).not.toContain("kz_acct");
    await signIn(email, PASS);
    expect(read().profiles.map((p) => p.nickname)).toEqual(["Leo"]);
  });

  it("signed out elsewhere: this device stops, keeps its unsent work, and sends it after signing in", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    await syncNow();
    current!.cookies.delete("kz_session"); // the session ended on the server (a reset elsewhere)
    tick();
    addNote(leo.id, "unsent");
    await syncNow();
    expect(read().session.accountId).toBeNull();
    await signIn(email, PASS);
    await syncNow();
    on("phone");
    await signIn(email, PASS);
    expect(read().notes.map((x) => x.text)).toEqual(["unsent"]);
  });
});

describe("what a local write changed", () => {
  const base = (): StoreState => ({
    ...emptyState(),
    accounts: [{ id: "A", email: "a@x.co", displayName: "Maria", salt: "", passwordHash: "", createdAt: 1 }],
    profiles: [{ id: "p1", accountId: "A", nickname: "Leo", grade: "3", locale: "en", color: "#000", createdAt: 1 }, { id: "q1", accountId: "B", nickname: "Other", grade: "3", locale: "en", color: "#000", createdAt: 1 }],
  });

  it("finds new, edited and removed records of this account only", () => {
    const prev = base();
    prev.notes = [{ id: "n1", profileId: "p1", at: 1, text: "a" }, { id: "n2", profileId: "p1", at: 1, text: "b" }];
    const next = structuredClone(prev);
    next.notes[0].text = "edited";
    next.notes.splice(1, 1);
    next.notes.push({ id: "n3", profileId: "p1", at: 2, text: "new" }, { id: "x", profileId: "q1", at: 2, text: "someone else's" });
    next.planDone.push({ profileId: "p1", date: "2026-10-07", key: "daily:math", at: 3 });
    next.accounts[0].goals = ["daily"];
    expect(diff(prev, next, "A")).toEqual({
      changes: [
        ["notes", "n1", false],
        ["notes", "n3", false],
        ["notes", "n2", true],
        ["planDone", "p1|2026-10-07|daily:math", false],
      ],
      account: true,
    });
  });

  it("never reports a device trimming attempts, acts or threads as a delete", () => {
    const prev = base();
    prev.acts = [{ id: "a1", profileId: "p1", at: 1, kind: "hint", intent: "next-try-right" }];
    prev.attempts = [{ id: "t1", profileId: "p1", at: 1, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 1 }];
    const next = structuredClone(prev);
    next.acts = [];
    next.attempts = [];
    expect(diff(prev, next, "A").changes).toEqual([]);
  });
});

describe("consent from the browser", () => {
  it("keeps AI and voice off for a child until a grown-up consents, and shows the receipt", async () => {
    await newFamily("laptop");
    const leo = learner("Leo", "2");
    await syncNow();
    const gate = () => renderHook(() => useConsent(leo.id)).result.current;
    expect(gate()).toEqual({ needed: true, ai: false, voice: false });
    const options = await loadConsent();
    expect(options?.methods.map((m) => m.id)).toEqual(["dev-not-verified", "parent-confirmed"]);
    // The account holder's own confirmation is not enough for a child under 13.
    expect(await grantConsent({ profileId: leo.id, scope: ["ai"], method: "parent-confirmed", under13: true })).toEqual({ ok: false, error: "acct.consent.errMethod" });
    const r = await grantConsent({ profileId: leo.id, scope: ["ai"], method: "dev-not-verified", under13: true });
    expect(r).toMatchObject({ ok: true, receipt: { method: "dev-not-verified", verified: false, scope: ["ai"], under13: true } });
    expect(gate()).toEqual({ needed: true, ai: true, voice: false });
  });

  it("changes nothing in browser-only mode", async () => {
    setServerStatusForTests({ mode: "local", resetEmail: false, production: true });
    on("laptop");
    await signUp({ email: `local-${++n}@example.test`, password: PASS, displayName: "Maria" });
    const leo = learner("Leo", "K");
    expect(renderHook(() => useConsent(leo.id)).result.current).toEqual({ needed: false, ai: true, voice: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORE_KEY)).toContain("Leo");
    expect(localStorage.getItem("kaizenedu.sync.v1")).toBeNull();
  });
});
