import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PracticeSet, Slot } from "@/learning/types";
import { signUp } from "@/lib/auth";
import { createLearner, selectLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Grade, Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { Runner } from "./Runner";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/practice/x",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  resetMemory();
  nav.push.mockReset();
});

async function learner(grade: Grade) {
  await signUp({ email: `r${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
  const p = createLearner({ nickname: "Leo", grade, locale: "en" }) as Profile;
  selectLearner(p.id);
  return p;
}

function setOf(p: Profile, kind: PracticeSet["kind"], slots: Slot[]): PracticeSet {
  const set: PracticeSet = { id: newId(), profileId: p.id, createdAt: Date.now(), kind, subject: "math", skillId: slots[0].skillId, slots };
  update((s) => void s.sets.push(set));
  return set;
}

/** Renders a set and waits until its first problem has focus, the way the runner presents it. */
async function show(set: PracticeSet, p: Profile) {
  render(<Runner set={set} learner={p} exitHref="/practice" />);
  await waitFor(() => expect(document.getElementById("problem")).toHaveFocus());
}

/** The first seed whose item fits. */
function seedWhere(skillId: string, level: number, fits: (it: Item) => boolean) {
  for (let seed = 1; seed < 5000; seed++) if (fits(makeItem(skillId, level, seed, "en"))) return seed;
  throw new Error(`no seed for ${skillId}`);
}

describe("Runner", () => {
  it("K counting: mark the dots while counting, tap the number; marking is not help", async () => {
    const p = await learner("K");
    const seed = seedWhere("m.count.10", 1, (it) => it.visual?.kind === "dots" && it.visual.groups[0] >= 3);
    const item = makeItem("m.count.10", 1, seed, "en");
    const n = item.visual!.kind === "dots" ? item.visual.groups[0] : 0;
    const set = setOf(p, "pick", [{ skillId: "m.count.10", seed, role: "main", level: 1 }]);
    await show(set, p);

    expect(screen.getByRole("img", { name: item.alt }).querySelectorAll("circle")).toHaveLength(n);
    for (let k = 1; k <= n; k++) await userEvent.click(screen.getByRole("button", { name: `Dot ${k}` }));
    expect(screen.getByText(`${n} marked`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${n}$`) }));
    expect(screen.getByText("Right.", { exact: true })).toBeInTheDocument();
    expect(read().attempts).toEqual([expect.objectContaining({ correct: true, assisted: false, response: String(n) })]);

    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByRole("heading", { name: "Set done" })).toBeInTheDocument();
  });

  it("hints and worked steps are logged as teaching acts with their rung", async () => {
    const p = await learner("3");
    const set = setOf(p, "pick", [{ skillId: "m.frac.unit", seed: 11, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.click(screen.getByRole("button", { name: /^Hint/ }));
    await userEvent.click(screen.getByRole("button", { name: /Another hint/ }));
    await userEvent.click(screen.getByRole("button", { name: /Another hint/ }));
    await userEvent.click(screen.getByRole("button", { name: "Show me how" }));
    const acts = read().acts.filter((a) => a.setId === set.id);
    expect(acts.map((a) => [a.kind, a.detail, a.ref, a.intent, a.skillId])).toEqual([
      ["hint", "1", "0", "next-try-right", "m.frac.unit"],
      ["hint", "2", "0", "next-try-right", "m.frac.unit"],
      ["hint", "3", "0", "next-try-right", "m.frac.unit"],
      ["steps", undefined, "0", "next-try-right", "m.frac.unit"],
    ]);
    expect(acts.every((a) => a.outcome === undefined && a.profileId === p.id)).toBe(true);
  });

  it("a wrong answer in a check is stored with the misconception it shows", async () => {
    const p = await learner("3");
    const seed = seedWhere("m.frac.numberline", 3, (it) => it.answer.kind === "fraction" && it.answer.n >= 2 && it.answer.n < it.answer.d);
    const item = makeItem("m.frac.numberline", 3, seed, "en");
    const { n, d } = item.answer as { n: number; d: number };
    const set = setOf(p, "check", [{ skillId: "m.frac.numberline", seed, role: "check", level: 3 }]);
    await show(set, p);
    expect(screen.queryByRole("button", { name: /^Hint/ })).toBeNull();
    // Keyboard only: the first arrow places the point at 0, each next one moves a jump.
    screen.getByRole("slider", { name: "Number line: place your point" }).focus();
    for (let k = 0; k < n; k++) await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText(`Your point: ${n - 1}/${d}`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(read().attempts).toEqual([expect.objectContaining({ correct: false, mode: "check", response: `${n - 1}/${d}`, why: "counted-ticks-not-jumps" })]);
    expect(await screen.findByRole("heading", { name: "Not this time" })).toBeInTheDocument();
  });

  it("keyboard only: a clock problem set with the arrow keys", async () => {
    const p = await learner("1");
    const seed = seedWhere("m.time.clock", 2, (it) => it.input === "clock");
    const item = makeItem("m.time.clock", 2, seed, "en");
    const [h, m] = (item.answer.kind === "text" ? item.answer.accept[0] : "").split(":").map(Number);
    const set = setOf(p, "pick", [{ skillId: "m.time.clock", seed, role: "main", level: 2 }]);
    await show(set, p);
    screen.getByRole("spinbutton", { name: "Hour" }).focus();
    // Once round the face (back to 12), then on to the hour.
    for (let k = 0; k < 12 + (h % 12); k++) await userEvent.keyboard("{ArrowUp}");
    if (m) {
      screen.getByRole("spinbutton", { name: "Minutes" }).focus();
      await userEvent.keyboard("{ArrowUp}");
    }
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Right.", { exact: true })).toBeInTheDocument();
    expect(read().attempts[0]).toMatchObject({ correct: true, assisted: false, response: item.answer.kind === "text" ? item.answer.accept[0] : "" });
  });

  it("finishing never starts another set; the next thing starts only when chosen, and done-for-today goes to Today", async () => {
    const p = await learner("K");
    const seed = seedWhere("m.count.20", 1, () => true);
    const item = makeItem("m.count.20", 1, seed, "en");
    const right = item.answer.kind === "choice" ? item.choices![item.answer.index].label : "";
    const set = setOf(p, "pick", [{ skillId: "m.count.20", seed, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${right}$`) }));
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByRole("heading", { name: "Set done" })).toBeInTheDocument();
    await waitFor(() => expect(read().sets[0].finishedAt).toBeDefined());

    expect(screen.getByRole("link", { name: "I'm done for today" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "Back to Practice" })).toHaveAttribute("href", "/practice");
    // Offered, not started: still one set, nowhere to go yet.
    expect(screen.getByText("Count up to 10")).toBeInTheDocument();
    expect(read().sets).toHaveLength(1);
    expect(nav.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(read().sets).toHaveLength(2);
    expect(nav.push).toHaveBeenCalledWith(`/practice/${read().sets[1].id}`);
    expect(read().sets[1]).toMatchObject({ skillId: "m.count.10", kind: "pick" });
  });
});
