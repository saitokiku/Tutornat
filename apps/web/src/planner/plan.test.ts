import { describe, expect, it } from "vitest";
import { RULES, skillStatus } from "@/learning/engine";
import type { Attempt } from "@/learning/types";
import type { LearnerSettings } from "@/lib/types";
import { addDays, daysBetween, localDate, weekStart } from "./dates";
import { planFor, type PlanInput } from "./plan";
import type { SchoolEvent } from "./types";

const NOW = new Date("2026-10-07T16:00:00").getTime();
const DATE = localDate(NOW);
const settings: LearnerSettings = { dailyMinutes: 15, subjects: ["math", "english"], timer: true, voiceInput: false };
const base = (o: Partial<PlanInput> = {}): PlanInput => ({
  date: DATE,
  now: NOW,
  grade: "1",
  settings,
  statuses: {},
  starts: {},
  events: [],
  feedback: [],
  sets: [],
  done: [],
  ...o,
});
const event = (o: Partial<SchoolEvent>): SchoolEvent => ({ id: "e1", profileId: "p", title: "Unit test", kind: "test", date: addDays(DATE, 2), skillIds: ["m.add.10"], source: "typed", createdAt: 0, ...o });

describe("dates", () => {
  it("does calendar arithmetic in local days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(daysBetween("2026-10-07", "2026-10-09")).toBe(2);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1); // across the US DST change
    expect(weekStart("2026-10-07")).toBe("2026-10-05");
  });
});

describe("planFor", () => {
  it("gives one daily set per enabled subject from the map", () => {
    const plan = planFor(base());
    const daily = [...plan.lead, ...plan.more].filter((i) => i.kind === "daily");
    expect(daily.map((i) => i.subject)).toEqual(["math", "english"]);
    expect(daily[0].skillIds[0]).toBe("m.count.10");
    expect(daily[1].skillIds[0]).toBe("e.letter.sounds");
  });

  it("puts open checks first", () => {
    let n = 0;
    const attempts: Attempt[] = Array.from({ length: 10 }, () => ({
      id: `a${n}`, profileId: "p", at: NOW - 3 * 864e5 + n++ * 1000, skillId: "m.add.5", level: 1, seed: n, mode: "practice", correct: true, assisted: false, seconds: 4,
    }));
    const statuses = { "m.add.5": skillStatus("m.add.5", attempts, NOW) };
    expect(statuses["m.add.5"].checkOpensAt! <= NOW).toBe(true);
    const plan = planFor(base({ statuses }));
    expect(plan.lead[0]).toMatchObject({ kind: "check", skillIds: ["m.add.5"] });
    expect(RULES.checkSize).toBe(5);
  });

  it("adds test prep only in the three days before, and lists work due within two days", () => {
    const soon = planFor(base({ events: [event({})] }));
    expect([...soon.lead, ...soon.more].find((i) => i.kind === "prep")).toMatchObject({ inDays: 2 });
    const far = planFor(base({ events: [event({ date: addDays(DATE, 6) })] }));
    expect([...far.lead, ...far.more].some((i) => i.kind === "prep")).toBe(false);
    const hw = planFor(base({ events: [event({ id: "h", kind: "homework", date: addDays(DATE, 1), title: "Worksheet" })] }));
    expect([...hw.lead, ...hw.more].find((i) => i.kind === "due")).toMatchObject({ inDays: 1 });
    const today = planFor(base({ events: [event({ date: DATE })] }));
    expect([...today.lead, ...today.more].find((i) => i.kind === "due")).toBeTruthy();
  });

  it("keeps to the minutes budget; the rest waits under more", () => {
    const plan = planFor(base({ settings: { ...settings, dailyMinutes: 5 }, events: [event({})] }));
    expect(plan.lead.length).toBeGreaterThanOrEqual(1);
    expect(plan.more.length).toBeGreaterThan(0);
  });

  it("marks lines done from done markers and finished sets", () => {
    const plan = planFor(base({ done: [{ profileId: "p", date: DATE, key: "daily:math", at: NOW }] }));
    expect(plan.lead.find((i) => i.key === "daily:math")?.done).toBe(true);
    const viaSet = planFor(base({ sets: [{ id: "s", profileId: "p", createdAt: NOW, kind: "daily", subject: "math", skillId: "m.count.10", slots: [], planKey: `${DATE}:daily:math`, finishedAt: NOW }] }));
    expect(viaSet.lead.find((i) => i.key === "daily:math")).toMatchObject({ done: true, setId: "s" });
  });

  it("uses each teacher note once", () => {
    const f = { id: "f1", profileId: "p", at: NOW - 864e5, text: "borrowing", skillIds: ["m.sub.20"], source: "typed" as const };
    expect([...planFor(base({ feedback: [f] })).lead, ...planFor(base({ feedback: [f] })).more].some((i) => i.kind === "feedback")).toBe(true);
    const used = planFor(base({ feedback: [f], sets: [{ id: "s", profileId: "p", createdAt: NOW, kind: "feedback", subject: "math", skillId: "m.sub.20", slots: [], planKey: `2026-10-06:feedback:f1`, finishedAt: NOW - 1000 }] }));
    expect([...used.lead, ...used.more].some((i) => i.kind === "feedback")).toBe(false);
  });
});
