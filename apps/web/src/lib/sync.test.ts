import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as signInRoute } from "@/app/api/auth/sign-in/route";
import { POST as signOutRoute } from "@/app/api/auth/sign-out/route";
import { POST as signUpRoute } from "@/app/api/auth/sign-up/route";
import { POST as consentRevoke } from "@/app/api/consent/revoke/route";
import { GET as consentGet, POST as consentPost } from "@/app/api/consent/route";
import { POST as syncRoute } from "@/app/api/sync/route";
import { answerText } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import { grantConsent, learnerHeaders, loadConsent, registerConsentFlow, revokeConsent, signIn, signOut, signOutNote, signUp, useConsent } from "./auth";
import { attemptIdentity } from "@/learning/evidence";
import { lessonAnswerId, record, sceneAttemptSource } from "./activity";
import { addFromCatalogue, saveCourse } from "./courses";
import { recordHelp } from "./evidence";
import { practiceSource, recordAnswer, recordTutorHelp, startSet } from "./practice";
import { addNote, createLearner, removeLearner, selectLearner, updateLearner } from "./profiles";
import { readSession } from "./server/db/auth";
import type { Db } from "./server/db/client";
import { CONSENT_METHODS, consentGate } from "./server/db/consent";
import { testDb } from "./server/db/testing";
import { emptyState, read, resetMemory, STORE_KEY, update, type StoreState } from "./store";
import { SYNC_LIMITS } from "./server/db/wire";
import { buildPush, diff, mergeRemote, resetSyncForTests, resume, setServerStatusForTests, syncNow, useSyncState } from "./sync";
import type { Profile } from "./types";
import { renderHook } from "@testing-library/react";

// Two browsers, one family, a real (in-process) Postgres behind the real route handlers. Each device
// has its own saved store, sync state and cookies; fetch goes to the handlers.

vi.mock("next/server", () => ({ connection: async () => {}, after: (task: () => unknown) => void task() }));

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

type Device = { storage: Record<string, string>; cookies: Map<string, string>; online: boolean };
const devices = new Map<string, Device>();
let current: Device | null = null;

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  "/api/auth/sign-up": signUpRoute,
  "/api/auth/sign-in": signInRoute,
  "/api/auth/sign-out": signOutRoute,
  "/api/sync": syncRoute,
  "GET /api/auth/me": meRoute,
  "GET /api/consent": consentGet,
  "/api/consent": consentPost,
  "/api/consent/revoke": consentRevoke,
};

/** Holds the next /api/sync answer until released (a slow network). */
let held: Promise<void> | null = null;
function holdNextSync() {
  let release!: () => void;
  held = new Promise<void>((r) => (release = r));
  return () => release();
}

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
  const aborted = () => new DOMException("The operation was aborted.", "AbortError");
  if (path === "/api/sync" && held) {
    const wait = held;
    held = null;
    await wait;
  }
  if (init?.signal?.aborted) throw aborted();
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
    resetMemory();
    expect(read().attempts.filter((a) => a.setId === setId).map((a) => a.correct)).toEqual([true, false]);
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

  it("a lesson answer in a generated course, every id a UUID, reaches the account", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    const [courseId, lessonId, sceneId, questionId] = Array.from({ length: 4 }, () => crypto.randomUUID());
    const quiz = { id: sceneId, kind: "quiz" as const, title: "Check", questions: [{ id: questionId, prompt: "What lights the Moon?", choices: ["The Sun", "Earth"], answer: 0, hint: "Think of daytime.", explain: "Sunlight." }] };
    saveCourse({ id: courseId, profileId: leo.id, title: "The Moon", goal: "moon", subject: "science", grade: "3", locale: "en", origin: "generated", status: "ready", length: "short", sources: [], lessons: [{ id: lessonId, title: "Half is lit", summary: "", minutes: 5, scenes: [quiz] }], template: false, ai: true, createdAt: Date.now(), updatedAt: Date.now() });
    // What the lesson stage records for a right answer (Stage onAnswer), with the help it had.
    const checkId = `${sceneId}:${questionId}`;
    const source = sceneAttemptSource(leo.id, courseId, lessonId, sceneId, checkId);
    recordHelp(source, { kind: "hint" });
    record({ profileId: leo.id, courseId, lessonId, type: "quiz_answered", sceneId: checkId, correct: true, assisted: true, attemptId: attemptIdentity(source), response: "The Sun", choice: 0 }, lessonAnswerId(source, true));
    const answer = read().activity.find((e) => e.type === "quiz_answered")!;
    expect(answer.id.length).toBeLessThanOrEqual(100);
    expect(answer.id.length).toBeLessThanOrEqual(SYNC_LIMITS.idLength);
    await syncNow();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ pending: 0, refused: 0 });
    on("phone");
    await signIn(email, PASS);
    expect(read().activity.filter((e) => e.type === "quiz_answered")).toEqual([expect.objectContaining({ id: answer.id, correct: true, assisted: true, choice: 0 })]);
  });

  it("tutor help on a problem reaches the account; a hint on a problem left unanswered keeps the family here at sign-out", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    const setId = startSet(read(), { profile: leo, kind: "pick", skillIds: ["m.add.10"], now: Date.now() })!;
    const set = read().sets.find((x) => x.id === setId)!;
    const item = makeItem(set.slots[0].skillId, 1, set.slots[0].seed, "en");
    recordTutorHelp(leo.id, item.skillId, item.seed, 1, practiceSource(set, 0, 1));
    recordHelp(practiceSource(set, 1, 1), { kind: "hint", key: "1" });
    await syncNow();
    on("phone");
    await signIn(email, PASS);
    // The phone knows about the tutor's help: the check clock agrees on both devices.
    expect(read().attempts).toEqual([expect.objectContaining({ mode: "tutor", assisted: true, skillId: item.skillId })]);
    on("laptop");
    vi.stubGlobal("location", { assign: vi.fn() });
    // The hint lives only on the laptop until help syncs (T12): signing out keeps the family here.
    await signOut();
    expect(signOutNote()).toMatchObject({ reason: "kept", kept: 1 });
    expect(read().profiles.map((p) => p.id)).toEqual([leo.id]);
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

describe("a fresh page load", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T18:00:00Z") }));

  it("picks the family back up when this browser's saved data was cleared", async () => {
    await newFamily("laptop");
    const leo = learner();
    addNote(leo.id, "kept on the server");
    await syncNow();
    // Safari dropped the site's storage; the cookies are still there.
    localStorage.clear();
    resetMemory();
    resetSyncForTests();
    expect(read().profiles).toEqual([]);
    await resume();
    expect(read().profiles.map((p) => p.nickname)).toEqual(["Leo"]);
    expect(read().notes.map((x) => x.text)).toEqual(["kept on the server"]);
    // Not unlocked: whoever picks the device up next may be a child.
    expect(read().session.unlocked).toBe(false);
  });

  it("signs the grown-up out when the server session has lapsed, and keeps unsent work for later", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    await syncNow();
    current!.online = false;
    tick();
    addNote(leo.id, "written offline");
    await syncNow();
    // Thirty days pass unused: both cookies expire with the session.
    current!.online = true;
    current!.cookies.clear();
    on("laptop");
    await resume();
    expect(read().session.accountId).toBeNull();
    await signIn(email, PASS);
    await syncNow();
    on("phone");
    await signIn(email, PASS);
    expect(read().notes.map((x) => x.text)).toEqual(["written offline"]);
  });

  it("leaves a browser-only family signed in", async () => {
    setServerStatusForTests({ mode: "local", resetEmail: false, production: false });
    on("laptop");
    await signUp({ email: `local-resume-${++n}@example.test`, password: PASS, displayName: "Maria" });
    await resume();
    expect(read().session.accountId).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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

describe("what goes up first", () => {
  it("sends a learner the server lacks, then sets, then their answers, one request's worth at a time", () => {
    const s = emptyState();
    s.accounts = [{ id: "A", email: "a@x.co", displayName: "Maria", salt: "", passwordHash: "", createdAt: 1 }];
    s.profiles = [{ id: "p1", accountId: "A", nickname: "Leo", grade: "3", locale: "en", color: "#000", createdAt: 1 }];
    s.sets = [{ id: "set1", profileId: "p1", createdAt: 1, kind: "check", subject: "math", skillId: "m.add.10", slots: [] }];
    s.attempts = Array.from({ length: 600 }, (_, i) => ({ id: `t${i}`, profileId: "p1", at: i, skillId: "m.add.10", level: 1, seed: i, setId: "set1", mode: "check" as const, correct: true, assisted: false, seconds: 3 }));
    const outbox = { attempts: Object.fromEntries(s.attempts.map((a) => [a.id, { at: 5 }])), sets: { set1: { at: 5 } } };
    const { body, rest } = buildPush(s, { cursor: 0, outbox, consent: [], known: [] }, "A");
    expect(body.push.profiles?.map((r) => r.id)).toEqual(["p1"]);
    expect(body.push.sets?.map((r) => r.id)).toEqual(["set1"]);
    expect(body.push.attempts).toHaveLength(SYNC_LIMITS.pushRecords - 2);
    expect(rest).toBe(true);
  });
});

describe("consent from the browser", () => {
  it("keeps AI and voice off for a child until a grown-up consents with the account password, and shows the receipt", async () => {
    await newFamily("laptop");
    const leo = learner("Leo", "2");
    await syncNow();
    const gate = () => renderHook(() => useConsent(leo.id)).result.current;
    expect(gate()).toEqual({ needed: true, ai: false, voice: false });
    const options = await loadConsent();
    expect(options?.methods.map((m) => m.id)).toEqual(["dev-not-verified", "parent-confirmed"]);
    // The account holder's own confirmation is not enough for a child under 13.
    expect(await grantConsent({ profileId: leo.id, scope: ["ai"], method: "parent-confirmed", under13: true, password: PASS })).toEqual({ ok: false, error: "acct.consent.errMethod" });
    // Whoever holds the device needs the account password.
    expect(await grantConsent({ profileId: leo.id, scope: ["ai"], method: "dev-not-verified", under13: true, password: "7 x 8" })).toEqual({ ok: false, error: "acct.consent.errPassword" });
    const r = await grantConsent({ profileId: leo.id, scope: ["ai"], method: "dev-not-verified", under13: true, password: PASS });
    expect(r).toMatchObject({ ok: true, receipt: { method: "dev-not-verified", verified: false, scope: ["ai"], under13: true, passwordConfirmed: true } });
    expect(gate()).toEqual({ needed: true, ai: true, voice: false });
    const id = (r as { receipt: { id: string } }).receipt.id;
    expect(await revokeConsent(id, "guess")).toEqual({ ok: false, error: "acct.consent.errPassword" });
    expect(await revokeConsent(id, PASS)).toEqual({ ok: true });
    expect(gate()).toEqual({ needed: true, ai: false, voice: false });
  });

  it("runs a verified method's own browser flow and hands its proof to the server", async () => {
    const vendor = { id: "test-vendor", verified: true, forUnder13: true, available: () => true, verify: async ({ proof }: { proof: string | null }) => (proof === "pi_ok" ? { ok: true as const, evidence: proof } : { ok: false as const }) };
    CONSENT_METHODS.push(vendor);
    try {
      await newFamily("laptop");
      const leo = learner("Leo", "1");
      await syncNow();
      registerConsentFlow("test-vendor", async () => null);
      expect(await grantConsent({ profileId: leo.id, scope: ["voice"], method: "test-vendor", under13: true, password: PASS })).toEqual({ ok: false, error: "acct.consent.errStopped" });
      registerConsentFlow("test-vendor", async () => "pi_ok");
      expect(await grantConsent({ profileId: leo.id, scope: ["voice"], method: "test-vendor", under13: true, password: PASS })).toMatchObject({ ok: true, receipt: { method: "test-vendor", verified: true } });
    } finally {
      registerConsentFlow("test-vendor", null);
      CONSENT_METHODS.splice(CONSENT_METHODS.indexOf(vendor), 1);
    }
  });

  it("tells the server who is using the device, so the AI routes check that learner", async () => {
    await newFamily("laptop");
    const leo = learner("Leo", "3");
    await syncNow();
    const tutor = () => consentGate(new Request("http://localhost/api/tutor", { method: "POST", headers: { cookie: `kz_session=${current!.cookies.get("kz_session")}` } }), "ai");
    // Nobody picked yet, and a child without consent: refused.
    expect((await tutor())?.status).toBe(403);
    selectLearner("parent");
    await syncNow();
    expect(await tutor()).toBeNull();
    selectLearner(leo.id);
    await syncNow();
    expect(await (await tutor())?.json()).toMatchObject({ error: "consent", reason: "consent" });
    // The learner header is checked too: a grown-up session can't be used for a child.
    selectLearner("parent");
    await syncNow();
    const named = await consentGate(new Request("http://localhost/api/tutor", { method: "POST", headers: { cookie: `kz_session=${current!.cookies.get("kz_session")}`, ...learnerHeaders(leo.id) } }), "ai");
    expect(named?.status).toBe(403);
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

describe("what the account won't take", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T18:00:00Z") }));

  it("keeps refused and oversized records on the device, counts them, and keeps the family here on sign-out", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    // Bigger than the account takes: never sent.
    const huge = addFromCatalogue("math-fractions", leo.id)!;
    update((s) => void (s.courses.find((c) => c.id === huge)!.title = "x".repeat(SYNC_LIMITS.recordBytes)));
    // An id the server refuses.
    update((s) => void s.notes.push({ id: "n".repeat(301), profileId: leo.id, at: Date.now(), text: "refused" }));
    addNote(leo.id, "kept");
    await syncNow();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ phase: "idle", pending: 0, refused: 2 });

    vi.stubGlobal("location", { assign: vi.fn() });
    await signOut();
    // Not saved to the account: the family's copy stays, and the sign-in page says why.
    expect(read().profiles.map((p) => p.nickname)).toEqual(["Leo"]);
    expect(signOutNote()).toEqual({ reason: "kept", kept: 2, ended: true });
    expect((location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("/sign-in");

    // Changed so the account takes it: no longer refused.
    await signIn(email, PASS);
    expect(signOutNote()).toBeNull();
    tick();
    update((s) => void (s.courses.find((c) => c.id === huge)!.title = "Fractions"));
    await syncNow();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ refused: 1 });
    on("phone");
    await signIn(email, PASS);
    expect(read().courses.map((c) => c.title)).toEqual(["Fractions"]);
    expect(read().notes.map((x) => x.text)).toEqual(["kept"]);
  });

  it("caps each request by bytes as well as by count", () => {
    const s = emptyState();
    s.accounts = [{ id: "A", email: "a@x.co", displayName: "Maria", salt: "", passwordHash: "", createdAt: 1 }];
    s.profiles = [{ id: "p1", accountId: "A", nickname: "Leo", grade: "3", locale: "en", color: "#000", createdAt: 1 }];
    // Ten notes of about 400 KB each (three bytes a character).
    s.notes = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, profileId: "p1", at: i, text: "数".repeat(133_000) }));
    const outbox = { notes: Object.fromEntries(s.notes.map((x) => [x.id, { at: 5 }])) };
    const { body, rest } = buildPush(s, { cursor: 0, outbox, consent: [], known: ["p1"] }, "A");
    expect(body.push.notes!.length).toBe(6);
    expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThanOrEqual(SYNC_LIMITS.pushBytes + 10_000);
    expect(rest).toBe(true);
  });
});

describe("storage running out", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T18:00:00Z") }));

  it("still saves to the account, says so, and never moves the saved cursor past what the store kept", async () => {
    await newFamily("laptop");
    const leo = learner();
    await syncNow();
    const savedMeta = localStorage.getItem("kaizenedu.sync.v1");
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    try {
      tick();
      addNote(leo.id, "written while full");
      await syncNow();
      expect(renderHook(() => useSyncState()).result.current).toMatchObject({ storage: true, pending: 0 });
    } finally {
      setItem.mockRestore();
    }
    // Nothing of the round was kept on the device, so a reload starts from where the store really was.
    expect(localStorage.getItem("kaizenedu.sync.v1")).toBe(savedMeta);
    on("laptop");
    expect(read().notes).toEqual([]);
    await syncNow();
    expect(read().notes.map((x) => x.text)).toEqual(["written while full"]);
  });
});

describe("signing out", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T18:00:00Z") }));

  it("drops a round still in flight, so nothing it brings back lands after the family leaves", async () => {
    await newFamily("laptop");
    learner();
    await syncNow();
    const release = holdNextSync();
    const round = syncNow();
    vi.stubGlobal("location", { assign: vi.fn() });
    await signOut();
    release();
    await round;
    expect(read().profiles).toEqual([]);
    expect(read().accounts).toEqual([]);
    expect(JSON.parse(localStorage.getItem("kaizenedu.sync.v1") ?? '{"accounts":{}}').accounts).toEqual({});
  }, 20_000);

  it("offline: says the sign-out finishes later, and finishes it when the device is back", async () => {
    await newFamily("laptop");
    learner();
    await syncNow();
    const token = current!.cookies.get("kz_session")!;
    current!.online = false;
    vi.stubGlobal("location", { assign: vi.fn() });
    await signOut();
    expect(signOutNote()).toEqual({ reason: "offline", ended: false });
    expect(await readSession(db, token)).not.toBeNull();
    // The next page load, online again.
    current!.online = true;
    on("laptop");
    await resume();
    await vi.waitFor(async () => expect(await readSession(db, token)).toBeNull());
  });

  it("signed out elsewhere: the sign-in page will say so, until someone signs in", async () => {
    const email = await newFamily("laptop");
    learner();
    await syncNow();
    current!.cookies.delete("kz_session");
    tick();
    addNote(read().profiles[0].id, "unsent");
    await syncNow();
    expect(signOutNote()).toEqual({ reason: "elsewhere" });
    await signIn(email, PASS);
    expect(signOutNote()).toBeNull();
  });
});

describe("what comes down", () => {
  it("keeps a device's caps on lists the server keeps whole", () => {
    const s = emptyState();
    const threads = Array.from({ length: 250 }, (_, i) => ({ id: `t${i}`, data: { id: `t${i}`, profileId: "p1", startedAt: i, lines: [] } }));
    mergeRemote(s, { changes: { threads } }, "A", () => false);
    expect(s.threads).toHaveLength(200);
    expect(s.threads[0].id).toBe("t50");
  });

  it("keeps a class's feed link on the device that added it", async () => {
    const email = await newFamily("laptop");
    const leo = learner();
    update((s) => void s.classes.push({ id: "k1", profileId: leo.id, name: "Math", subject: "math", color: "#000", feedUrl: "https://school.example/feed?token=secret", createdAt: 1 }));
    await syncNow();
    on("phone");
    await signIn(email, PASS);
    expect(read().classes[0]).not.toHaveProperty("feedUrl");
    tick();
    update((s) => void (s.classes[0].name = "Math 4"));
    await syncNow();
    on("laptop");
    await syncNow();
    expect(read().classes[0]).toMatchObject({ name: "Math 4", feedUrl: "https://school.example/feed?token=secret" });
  });

  it("says a new device is still getting the family until its first sync is done", async () => {
    await newFamily("laptop");
    learner();
    await syncNow();
    localStorage.removeItem("kaizenedu.sync.v1");
    resetSyncForTests();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ firstSync: true });
    await syncNow();
    expect(renderHook(() => useSyncState()).result.current).toMatchObject({ firstSync: false });
  });
});
