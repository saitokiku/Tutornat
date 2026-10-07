import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "../types";

// Its own file: the clock-change week only exists in a time zone that changes clocks, and the zone
// is process-wide. US clocks spring forward on Sunday 2026-03-08, so that Monday-to-Sunday week is
// 167 hours long.
const zone = process.env.TZ;
beforeAll(() => void (process.env.TZ = "America/New_York"));
afterAll(() => void (process.env.TZ = zone));

const { startOfWeek } = await import("../activity");
const { signUp } = await import("../auth");
const { createLearner } = await import("../profiles");
const { read, resetMemory, update } = await import("../store");
const { confirmWeekly, resetEmailMode, sendDueWeekly, setWeeklyOn, weekEnd, weeklyInput } = await import("./weekly");

afterEach(() => {
  resetMemory();
  resetEmailMode();
  vi.unstubAllGlobals();
});

const H = 3600_000;

async function familyWithAWednesday() {
  await signUp({ email: "maria@example.com", password: "longenough", displayName: "Maria" });
  const ada = createLearner({ nickname: "Ada", grade: "4", locale: "en" }) as Profile;
  const mon = new Date(2026, 2, 2).getTime(); // Monday, Mar 2 2026, 00:00 in New York
  update((s) => {
    s.session.profileId = "parent";
    s.attempts.push({ id: "w", profileId: ada.id, at: new Date(2026, 2, 4, 16).getTime(), skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 60 });
  });
  return { accountId: read().session.accountId!, mon };
}

describe("the week clocks spring forward (America/New_York)", () => {
  it("is 167 hours long, and ends at the next Monday's midnight", () => {
    const mon = new Date(2026, 2, 2).getTime();
    expect(new Date(mon).getTimezoneOffset()).toBe(300);
    expect(weekEnd(mon) - mon).toBe(167 * H);
    expect(weekEnd(mon)).toBe(new Date(2026, 2, 9).getTime());
    expect(startOfWeek(weekEnd(mon) - 1)).toBe(mon);
  });

  it("composed on the Monday after, describes that week, not the new one", async () => {
    const { accountId, mon } = await familyWithAWednesday();
    const mondayAfter = new Date(2026, 2, 9, 10).getTime();
    const input = weeklyInput(read(), accountId, mon, mondayAfter);
    expect(input?.weekStart).toBe("2026-03-02");
    expect(input?.learners[0]).toMatchObject({ own: 1, minutes: 1 });
  });

  it("so that week's email is sent, not skipped as empty", async () => {
    await familyWithAWednesday();
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init?.method) return Response.json({ mode: "send" });
        const body = JSON.parse(String(init.body));
        posts.push(body);
        return Response.json(body.action === "verify" ? { ok: true, token: `w2.abc.${"t".repeat(43)}` } : { ok: true });
      }),
    );
    setWeeklyOn(true);
    await confirmWeekly("4K7QMZ2D", new Date(2026, 1, 25).getTime());
    expect(await sendDueWeekly(new Date(2026, 2, 9, 10).getTime())).toBe("sent");
    const sent = posts.find((p) => p.action === "send") as { week: { weekStart: string; learners: { own: number }[] } };
    expect(sent.week.weekStart).toBe("2026-03-02");
    expect(sent.week.learners[0].own).toBe(1);
  });
});
