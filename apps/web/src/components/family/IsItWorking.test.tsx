import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { logAct } from "@/lib/acts";
import { signUp } from "@/lib/auth";
import { createLearner } from "@/lib/profiles";
import { resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { IsItWorking } from "./IsItWorking";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 18).getTime();
const S = "m.add.20";

async function kid() {
  await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
  return createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
}

describe("Is it working?", () => {
  it("turns a hint and the answers after it into a sentence", async () => {
    const ada = await kid();
    const at = NOW - 864e5;
    update((s) => {
      s.sets.push({ id: "s1", profileId: ada.id, createdAt: at, kind: "pick", subject: "math", skillId: S, slots: [10, 11, 12].map((seed) => ({ skillId: S, seed, role: "main" as const })), finishedAt: at + 5 * 60_000 });
      const answer = (seed: number, minute: number, assisted: boolean) => ({ id: `a${seed}`, profileId: ada.id, at: at + minute * 60_000, skillId: S, level: 1, seed, setId: "s1", mode: "practice" as const, correct: true, assisted, seconds: 8 });
      s.attempts.push(answer(10, 1, false), answer(11, 3, true), answer(12, 4, false));
    });
    logAct({ profileId: ada.id, kind: "hint", intent: "next-try-right", skillId: S, setId: "s1", ref: "1", detail: "1" }, { at: at + 2 * 60_000 });
    render(<IsItWorking child={ada} now={NOW} />);
    expect(screen.getByRole("heading", { name: "Is it working?" })).toBeVisible();
    expect(screen.getByText("After a hint, the next problem was right on their own 1 of 1 times.")).toBeVisible();
    expect(screen.getByText(/None of it is written by AI/)).toBeVisible();
  });

  it("says not enough yet with nothing to count", async () => {
    const ada = await kid();
    render(<IsItWorking child={ada} now={NOW} />);
    expect(screen.getByText("Not enough yet. This fills in as Ada uses hints, practice sets, checks and lessons.")).toBeVisible();
  });
});
