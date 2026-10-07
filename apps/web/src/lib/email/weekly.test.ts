import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startOfWeek, summarizeWeek } from "../activity";
import { signUp } from "../auth";
import { weekFacts } from "../family";
import { createLearner } from "../profiles";
import { read, resetMemory, update } from "../store";
import type { SchoolEvent } from "@/planner/types";
import type { Profile } from "../types";
import { renderWeekly, WeeklyInput, withoutNames } from "./render";
import { askConfirmation, confirmWeekly, LOOK_RULES, previewWeekly, resetEmailMode, sendDueWeekly, setWeeklyOn, useWeeklyEmail, weeklyInput, weeklyOf } from "./weekly";
import { getSkill } from "@/practice/skills";

const H = 3600_000;
const NOW = new Date(2026, 9, 8, 10, 0).getTime(); // Thursday, Oct 8 2026
const MON = startOfWeek(NOW); // Monday, Oct 5
const ORIGIN = "https://kaizenedu.net";

beforeEach(() => resetEmailMode());
afterEach(() => {
  resetMemory();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function family(grades: Profile["grade"][] = ["4", "K"]) {
  await signUp({ email: "maria@example.com", password: "longenough", displayName: "Maria" });
  const names = ["Ada", "Bo", "Cy"];
  const kids = grades.map((g, i) => createLearner({ nickname: names[i], grade: g, locale: "en" }) as Profile);
  update((s) => void (s.session.profileId = "parent"));
  return { accountId: read().session.accountId!, kids };
}

/** Ada this week: 3 practice answers (own, helped, missed), one lesson with a check right on her own. */
function adaWeek(ada: Profile) {
  update((s) => {
    const a = (id: string, at: number, correct: boolean, assisted: boolean) =>
      s.attempts.push({ id, profileId: ada.id, at, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct, assisted, seconds: 40 });
    a("1", MON + 9 * H, true, false);
    a("2", MON + 9 * H + 60_000, true, true);
    a("3", MON + 9 * H + 120_000, false, false);
    a("old", MON - 30 * H, true, false); // last week: not counted
    s.activity.push({ id: "l1", profileId: ada.id, at: MON + 20 * H, type: "quiz_answered", courseId: "c", lessonId: "x", correct: true, assisted: false });
    s.activity.push({ id: "l2", profileId: ada.id, at: MON + 20 * H + 1, type: "lesson_completed", courseId: "c", lessonId: "x", seconds: 300 });
    s.reading.push({ id: "r", profileId: ada.id, date: "2026-10-07", title: "Frog and Toad", minutes: 15 });
  });
}

describe("weeklyInput", () => {
  it("is null for an empty week: nothing is sent", async () => {
    const { accountId } = await family();
    expect(weeklyInput(read(), accountId, MON, NOW)).toBeNull();
    expect(previewWeekly(read(), accountId, NOW, ORIGIN)).toBeNull();
  });

  it("is null when the only activity was in another week", async () => {
    const { accountId, kids } = await family();
    update((s) => void s.attempts.push({ id: "x", profileId: kids[0].id, at: MON - 2 * H, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 }));
    expect(weeklyInput(read(), accountId, MON, NOW)).toBeNull();
  });

  it("uses the Family page's numbers: practice plus lesson checks, minutes plus reading", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    const input = weeklyInput(read(), accountId, MON, NOW)!;
    expect(input.weekStart).toBe("2026-10-05");
    const [ada, bo] = input.learners;
    // By hand: practice own 1 + lesson check 1 = 2; helped 1; missed 1; 120 s + 300 s = 7 min, + 15 reading.
    expect(ada).toMatchObject({ grade: "4", own: 2, helped: 1, missed: 1, lessons: 1, minutes: 22 });
    // Same as the Family page computes (lib/family weekFacts + lib/activity summarizeWeek).
    const f = weekFacts(read(), kids[0].id, NOW);
    const l = summarizeWeek(read().activity.filter((e) => e.profileId === kids[0].id), MON);
    expect([ada.own, ada.helped, ada.missed]).toEqual([f.own + l.own, f.helped + l.help, f.missed + l.missed]);
    expect(bo).toMatchObject({ grade: "K", own: 0, minutes: 0 });
    expect(WeeklyInput.parse(input)).toEqual(input);
  });

  it("tells learners in the same grade apart without names", async () => {
    const { accountId, kids } = await family(["4", "4"]);
    adaWeek(kids[0]);
    const input = weeklyInput(read(), accountId, MON, NOW)!;
    expect(input.learners.map((l) => l.n)).toEqual([1, 2]);
    const { text } = renderWeekly(input, ORIGIN);
    expect(text).toContain("Grade 4, learner 1");
    expect(text).toContain("Grade 4, learner 2");
  });

  it("lists a test from tomorrow to 3 days out with no prep set finished, with names taken out of its title", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    const ev = (id: string, title: string, kind: "test" | "quiz", date: string, done?: boolean): SchoolEvent => ({
      id,
      profileId: kids[0].id,
      title,
      kind,
      date,
      skillIds: ["m.add.10"],
      source: "typed",
      createdAt: NOW,
      ...(done ? { done } : {}),
    });
    update((s) => {
      s.events.push(ev("e1", "Ada's spelling quiz", "quiz", "2026-10-10"));
      s.events.push(ev("e2", "Fractions test", "test", "2026-10-09"));
      s.events.push(ev("e3", "Far away test", "test", "2026-10-20"));
      s.events.push(ev("e4", "Prepped test", "test", "2026-10-09"));
      s.events.push(ev("e5", "Prep started, not finished", "test", "2026-10-11"));
      s.events.push(ev("e6", "Today's test", "test", "2026-10-08"));
      s.events.push(ev("e7", "Done already", "quiz", "2026-10-09", true));
      s.sets.push({ id: "p4", profileId: kids[0].id, createdAt: NOW, finishedAt: NOW, kind: "prep", subject: "math", skillId: "m.add.10", slots: [], eventId: "e4" });
      s.sets.push({ id: "p5", profileId: kids[0].id, createdAt: NOW, kind: "prep", subject: "math", skillId: "m.add.10", slots: [], eventId: "e5" });
    });
    const ada = weeklyInput(read(), accountId, MON, NOW)!.learners[0];
    expect(ada.tests).toEqual([
      { kind: "test", date: "2026-10-09", title: "Fractions test" },
      { kind: "quiz", date: "2026-10-10", title: "your child's spelling quiz" },
      { kind: "test", date: "2026-10-11", title: "Prep started, not finished" },
    ]);
  });

  it("names checks open 14 days and stuck skills still being practiced, as the Family page's nudges do", async () => {
    const { accountId, kids } = await family(["4"]);
    const ada = kids[0].id;
    const D = 24 * H;
    update((s) => {
      // m.add.10: ten right answers at the top level 20 days ago → ready, its check open since then.
      const top = getSkill("m.add.10")!.levels;
      for (let i = 0; i < 10; i++) s.attempts.push({ id: `r${i}`, profileId: ada, at: NOW - 20 * D + i, skillId: "m.add.10", level: top, seed: i, mode: "practice", correct: true, assisted: false, seconds: 10 });
      // m.sub.10: three hard sets this week → stuck. m.add.20: three hard sets a month ago → stuck, but not recent.
      const hardSets = (skillId: string, at: number) => {
        for (let set = 0; set < 3; set++)
          for (let i = 0; i < 5; i++) s.attempts.push({ id: `${skillId}-${set}-${i}`, profileId: ada, at: at + set * H + i, skillId, level: 1, seed: i, mode: "practice", setId: `${skillId}-${set}`, correct: i === 0, assisted: false, seconds: 10 });
      };
      hardSets("m.sub.10", MON + 2 * H);
      hardSets("m.add.20", NOW - 30 * D);
    });
    const week = weeklyInput(read(), accountId, MON, NOW)!.learners[0];
    expect(week.overdue).toEqual(["m.add.10"]);
    expect(week.stuck).toEqual(["m.sub.10"]);
    const { text } = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    expect(text).toContain(`Worth a look:\n- A check open for 2 weeks or more: ${getSkill("m.add.10")!.title.en}\n- Stuck, three hard sets in a row: ${getSkill("m.sub.10")!.title.en}`);
    // By hand: the check opened 20 days ago minus the 20-hour quiet time, which is past 14 days.
    expect(NOW - (NOW - 20 * D + 9 + 20 * H)).toBeGreaterThanOrEqual(LOOK_RULES.checkWaitMs);
  });

  it("notes 5 or more calendar days without activity, counting a never-active learner from when they were added", async () => {
    const { accountId, kids } = await family(["4", "K"]);
    update((s) => {
      s.attempts.push({ id: "x", profileId: kids[0].id, at: MON + 2 * H, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 });
      s.profiles.find((p) => p.id === kids[0].id)!.createdAt = MON - 30 * 24 * H;
      s.profiles.find((p) => p.id === kids[1].id)!.createdAt = MON - 4 * 24 * H;
    });
    const later = MON + 6 * 24 * H + 23 * H; // Sunday night
    const [ada, bo] = weeklyInput(read(), accountId, MON, later)!.learners;
    expect(ada.idleDays).toBe(6);
    expect(bo.idleDays).toBe(10);
    const [adaNow, boNow] = weeklyInput(read(), accountId, MON, NOW)!.learners;
    expect(adaNow.idleDays).toBeUndefined();
    expect(boNow.idleDays).toBe(7);
    // Time with the tutor counts as activity.
    update((s) => void s.threads.push({ id: "t", profileId: kids[1].id, startedAt: MON + 3 * H, surface: "talk", title: "x", lines: [{ role: "learner", text: "hi", at: MON + 3 * H }] }));
    expect(weeklyInput(read(), accountId, MON, NOW)!.learners[1].idleDays).toBeUndefined();
  });
});

describe("renderWeekly", () => {
  it("never contains a learner's or grown-up's name, in text or HTML", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    update((s) => void s.events.push({ id: "e1", profileId: kids[0].id, title: "Quiz for Ada and Bo, from Maria", kind: "quiz", date: "2026-10-09", skillIds: [], source: "typed", createdAt: NOW }));
    const email = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    for (const part of [email.subject, email.text, email.html]) expect(part).not.toMatch(/Ada|\bBo\b|Maria|maria@/);
    expect(email.text).toContain("Quiz for your child and your child, from your child");
  });

  it("hides each word of a full name too", async () => {
    const { accountId, kids } = await family(["4"]);
    adaWeek(kids[0]);
    update((s) => {
      s.accounts[0].displayName = "Maria Lopez";
      s.profiles[0].nickname = "Ada Rose";
      s.events.push({ id: "e1", profileId: kids[0].id, title: "Rose's quiz, signed Lopez", kind: "quiz", date: "2026-10-09", skillIds: [], source: "typed", createdAt: NOW });
    });
    const { text } = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    expect(text).not.toMatch(/Rose|Lopez/);
    expect(text).toContain("your child's quiz, signed your child");
  });

  it("says what happened in plain words, with links to Family and Settings", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    const { subject, text, html } = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    expect(subject).toMatch(/^Your KaizenEDU week: Oct 5\s–\s11$/); // Intl puts thin spaces around the dash
    expect(text).toContain("Grade 4\n- 22 minutes of practice, lessons and reading\n- Right on their own: 2 · Right with help: 1 · Not yet: 1\n- Lessons finished: 1 · Practice sets finished: 0");
    expect(text).toContain("Kindergarten\n- No practice, lessons or reading this week.");
    expect(text).toContain("https://kaizenedu.net/family");
    expect(text).toContain("https://kaizenedu.net/settings");
    expect(text).toContain("A skill is proved only by two checks on different days with no help.");
    expect(text).not.toMatch(/!|great|awesome|amazing/i);
    expect(html).toMatch(/^<!doctype html><html lang="en">/);
    expect(html).toContain('href="https://kaizenedu.net/family"');
  });

  it("escapes anything typed into HTML", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    update((s) => void s.events.push({ id: "e1", profileId: kids[0].id, title: '<img src=x onerror="alert(1)"> test', kind: "test", date: "2026-10-09", skillIds: [], source: "typed", createdAt: NOW }));
    const { html } = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; test");
  });

  it("follows the account's language", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    update((s) => void (s.prefs.locale = "es"));
    const { subject, text, html } = previewWeekly(read(), accountId, NOW, ORIGIN)!;
    expect(subject).toBe("Tu semana en KaizenEDU: 5–11 de oct");
    expect(text).toContain("Grado 4");
    expect(text).toContain("Bien sin ayuda: 2 · Bien con ayuda: 1 · Todavía no: 1");
    expect(text).toContain("Kínder");
    expect(html).toMatch(/<html lang="es">/);
  });

  it("drops unknown skill ids a client might send", () => {
    const input = WeeklyInput.parse({
      locale: "en",
      weekStart: "2026-10-05",
      learners: [{ grade: "3", minutes: 5, lessons: 0, sets: 1, own: 3, helped: 0, missed: 0, proved: ["m.add.10", "<b>nope</b>"], checksWaiting: [], helpOn: [], overdue: [], stuck: [], tests: [] }],
    });
    expect(input.learners[0].proved).toEqual(["m.add.10"]);
    expect(renderWeekly(input, ORIGIN).text).not.toContain("nope");
    expect(() => WeeklyInput.parse({ ...input, weekStart: "Oct 6" })).toThrow();
    expect(() => WeeklyInput.parse({ ...input, learners: [] })).toThrow();
  });
});

describe("withoutNames", () => {
  it("replaces whole names and possessives, case-insensitively, leaving other words alone", () => {
    expect(withoutNames("ada's quiz with ADA and Adam", ["Ada"], "your child", "your child's")).toBe("your child's quiz with your child and Adam");
    expect(withoutNames("Examen de José", ["José"], "tu hijo o hija", "de tu hijo o hija")).toBe("Examen de tu hijo o hija");
    expect(withoutNames("Unit 3 test", ["A"], "x", "y")).toBe("Unit 3 test");
    expect(withoutNames("a+b test", ["a+b"], "x", "y")).toBe("x test");
  });
});

// ----- talking to the server -----

type Call = { url: string; body?: Record<string, unknown> };
function fakeServer(mode: "send" | "preview", answer: (body: Record<string, unknown>) => [number, unknown] = () => [200, { ok: true }]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (!init?.method) return Response.json({ mode });
      const [status, json] = answer(body);
      return Response.json(json, { status });
    }),
  );
  return calls;
}

const TOKEN = "t".repeat(43);

describe("opt-in and sending", () => {
  it("stays off by default and sends nothing", async () => {
    await family();
    const calls = fakeServer("send");
    expect(weeklyOf(read(), read().session.accountId)).toBeUndefined();
    expect(await sendDueWeekly(NOW)).toBe("off");
    expect(calls).toEqual([]);
  });

  it("asks for confirmation and keeps the token only after the server checks it", async () => {
    const { accountId } = await family();
    setWeeklyOn(true);
    const calls = fakeServer("send", (b) => [200, { ok: b.action !== "verify" || b.token === TOKEN }]);
    expect(await askConfirmation(NOW)).toBe("sent");
    expect(calls[0].body).toEqual({ action: "confirm", to: "maria@example.com", locale: "en" });
    expect(weeklyOf(read(), accountId)).toMatchObject({ on: true, askedAt: NOW });
    expect(await sendDueWeekly(NOW)).toBe("unconfirmed");
    expect(await confirmWeekly("x".repeat(43), NOW)).toBe(false);
    expect(await confirmWeekly("bad token!", NOW)).toBe(false);
    expect(await confirmWeekly(TOKEN, NOW)).toBe(true);
    expect(weeklyOf(read(), accountId)?.confirmed).toEqual({ token: TOKEN, at: NOW });
  });

  it("reports preview mode and rate limits from the server", async () => {
    await family();
    setWeeklyOn(true);
    fakeServer("preview", () => [503, { error: "preview" }]);
    expect(await askConfirmation(NOW)).toBe("preview");
    vi.unstubAllGlobals();
    fakeServer("send", () => [429, { error: "rate" }]);
    expect(await askConfirmation(NOW)).toBe("rate");
  });

  it("sends last week's email once, after the week the address was confirmed", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    setWeeklyOn(true);
    const calls = fakeServer("send");
    await confirmWeekly(TOKEN, NOW); // confirmed on Thursday: this week is not sent
    const nextMonday = MON + 7 * 24 * H + 8 * H;
    expect(await sendDueWeekly(NOW)).toBe("not-due");
    expect(await sendDueWeekly(nextMonday)).toBe("sent");
    const sent = calls.filter((c) => c.body?.action === "send");
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ to: "maria@example.com", token: TOKEN, week: { weekStart: "2026-10-05", locale: "en" } });
    expect(JSON.stringify(sent[0].body!.week)).not.toMatch(/Ada|Bo|Maria/);
    expect(weeklyOf(read(), accountId)).toMatchObject({ lastWeek: "2026-10-05", lastSentAt: nextMonday });
    expect(await sendDueWeekly(nextMonday + H)).toBe("not-due");
  });

  it("skips an empty week without sending, and forgets a confirmation the server rejects", async () => {
    const { accountId } = await family();
    setWeeklyOn(true);
    let calls = fakeServer("send");
    await confirmWeekly(TOKEN, MON - 3 * 24 * H);
    expect(await sendDueWeekly(MON + 7 * 24 * H + H)).toBe("empty");
    expect(calls.filter((c) => c.body?.action === "send")).toEqual([]);
    expect(weeklyOf(read(), accountId)?.lastWeek).toBe("2026-10-05");

    adaWeek(read().profiles[0]);
    update((s) => void s.attempts.push({ id: "w2", profileId: s.profiles[0].id, at: MON + 8 * 24 * H, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 }));
    vi.unstubAllGlobals();
    resetEmailMode();
    calls = fakeServer("send", (b) => (b.action === "send" ? [403, { error: "unconfirmed" }] : [200, { ok: true }]));
    expect(await sendDueWeekly(MON + 14 * 24 * H + H)).toBe("unconfirmed");
    expect(weeklyOf(read(), accountId)?.confirmed).toBeUndefined();
    expect(calls.some((c) => c.body?.action === "send")).toBe(true);
  });

  it("does nothing in preview mode, and turning it off forgets the confirmation", async () => {
    const { accountId, kids } = await family();
    adaWeek(kids[0]);
    setWeeklyOn(true);
    fakeServer("send");
    await confirmWeekly(TOKEN, MON - 3 * 24 * H);
    vi.unstubAllGlobals();
    resetEmailMode();
    const calls = fakeServer("preview");
    expect(await sendDueWeekly(MON + 7 * 24 * H + H)).toBe("preview");
    expect(calls.filter((c) => c.body)).toEqual([]);
    setWeeklyOn(false);
    expect(weeklyOf(read(), accountId)).toEqual({ on: false });
  });

  it("two screens asking at once send one email", async () => {
    const { kids } = await family();
    adaWeek(kids[0]);
    setWeeklyOn(true);
    const calls = fakeServer("send");
    await confirmWeekly(TOKEN, MON - 3 * 24 * H);
    const monday = MON + 7 * 24 * H + H;
    const [a, b] = await Promise.all([sendDueWeekly(monday), sendDueWeekly(monday)]);
    expect([a, b]).toEqual(["sent", "sent"]);
    expect(calls.filter((c) => c.body?.action === "send")).toHaveLength(1);
    expect(await sendDueWeekly(monday)).toBe("not-due");
  });

  it("useWeeklyEmail sends when the Parent view opens with a confirmed email, and not for a learner", async () => {
    const { kids } = await family();
    adaWeek(kids[0]);
    setWeeklyOn(true);
    let calls = fakeServer("send");
    await confirmWeekly(TOKEN, MON - 3 * 24 * H);
    vi.spyOn(Date, "now").mockReturnValue(MON + 7 * 24 * H + H);
    calls.length = 0;
    update((s) => void (s.session.profileId = kids[0].id));
    const { unmount } = renderHook(() => useWeeklyEmail());
    await act(async () => {});
    expect(calls).toEqual([]);
    unmount();
    vi.unstubAllGlobals();
    calls = fakeServer("send");
    act(() => update((s) => void (s.session.profileId = "parent")));
    renderHook(() => useWeeklyEmail());
    await waitFor(() => expect(calls.filter((c) => c.body?.action === "send")).toHaveLength(1));
  });

  it("only acts for a grown-up in the Parent view", async () => {
    await family();
    setWeeklyOn(true);
    update((s) => void (s.session.profileId = s.profiles[0].id));
    const calls = fakeServer("send");
    expect(await askConfirmation(NOW)).toBe("failed");
    expect(await sendDueWeekly(NOW)).toBe("off");
    expect(calls).toEqual([]);
  });
});
