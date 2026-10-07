import { afterEach, describe, expect, it } from "vitest";
import type { PracticeSet } from "@/learning/types";
import { signUp } from "@/lib/auth";
import { markDone, todayPlan } from "@/lib/plan";
import { createLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";
import { nextOffer, planFinished } from "./next";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 16, 0).getTime();

async function learner() {
  await signUp({ email: `n${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
  return createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
}

describe("the finish after a set from Today", () => {
  it("says the plan is over only when every line is done, homework included", async () => {
    const p = await learner();
    const date = localDate(NOW);
    update((s) => void s.events.push({ id: "hw1", profileId: p.id, title: "Math worksheet", kind: "homework", date, skillIds: [], source: "typed", createdAt: NOW }));
    const plan = todayPlan(read(), p, NOW);
    const lines = [...plan.lead, ...plan.more];
    expect(lines.some((i) => i.kind === "due")).toBe(true);
    const own = lines.find((i) => i.kind === "daily")!;
    const set: PracticeSet = { id: newId(), profileId: p.id, createdAt: NOW, kind: "daily", subject: "math", skillId: own.skillIds[0], slots: [], planKey: `${date}:${own.key}` };

    // Everything else done except the homework: nothing practice can start, but the plan is not over.
    for (const i of lines) if (i.kind !== "due" && i.key !== own.key) markDone(p.id, date, i.key);
    expect(nextOffer(read(), p, set, NOW)).toBeNull();
    expect(planFinished(read(), p, set, NOW)).toBe(false);

    markDone(p.id, date, "due:hw1");
    expect(planFinished(read(), p, set, NOW)).toBe(true);
  });

  it("a set that did not come from the plan never claims to finish it", async () => {
    const p = await learner();
    const set: PracticeSet = { id: newId(), profileId: p.id, createdAt: NOW, kind: "pick", subject: "math", skillId: "m.round", slots: [] };
    expect(planFinished(read(), p, set, NOW)).toBe(false);
  });
});
