import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Runner } from "@/components/practice/Runner";
import type { PracticeSet } from "@/learning/types";
import { signUp } from "@/lib/auth";
import { createLearner, selectLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Grade, Profile } from "@/lib/types";
import { makeItem } from "../skills";
import type { Item } from "../types";

// The five levels of this strand that answer on a touch pad, played through the real Runner by keyboard:
// the fraction bar (m.frac.equiv.model L1), the clock in 5- and 1-minute steps (m.time.elapsed L1, L3)
// and the number line in thousandths and in fractions (m.dec.thousandths L2, m.frac.asdiv L3).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/practice/x",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => resetMemory());

async function learner(grade: Grade) {
  await signUp({ email: `p${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
  const p = createLearner({ nickname: "Ana", grade, locale: "en" }) as Profile;
  selectLearner(p.id);
  return p;
}

/** Renders a one-problem set and waits until the problem has focus. */
async function play(p: Profile, kind: PracticeSet["kind"], skillId: string, level: number, seed: number) {
  const set: PracticeSet = { id: newId(), profileId: p.id, createdAt: Date.now(), kind, subject: "math", skillId, slots: [{ skillId, seed, level, role: kind === "check" ? "check" : "main" }] };
  update((s) => void s.sets.push(set));
  render(<Runner set={set} learner={p} exitHref="/practice" />);
  await waitFor(() => expect(document.getElementById("problem")).toHaveFocus());
}

function seedWhere(skillId: string, level: number, fits: (it: Item) => boolean = () => true) {
  for (let seed = 1; seed < 5000; seed++) if (fits(makeItem(skillId, level, seed, "en"))) return seed;
  throw new Error(`no seed for ${skillId}`);
}

/** Places the number-line point `steps` jumps right of the left end, by keyboard. */
async function placeOnLine(steps: number) {
  screen.getByRole("slider", { name: "Number line: place your point" }).focus();
  await userEvent.keyboard("{Home}");
  for (let k = 0; k < steps; k++) await userEvent.keyboard("{ArrowRight}");
}

/** Sets the clock pad to h:mm by keyboard and answers with Enter. */
async function setClock(time: string, stepMinutes: number) {
  const [h, m] = time.split(":").map(Number);
  screen.getByRole("spinbutton", { name: "Hour" }).focus();
  await userEvent.keyboard("{Home}");
  for (let k = 1; k < h; k++) await userEvent.keyboard("{ArrowUp}");
  screen.getByRole("spinbutton", { name: "Minutes" }).focus();
  await userEvent.keyboard("{Home}");
  for (let k = 0; k < m / stepMinutes; k++) await userEvent.keyboard("{ArrowUp}");
  await userEvent.keyboard("{Enter}");
}

/** This learner's attempts (the store outlives one render). */
const attemptsOf = (p: Profile) => read().attempts.filter((a) => a.profileId === p.id);
const right = (p: Profile, response: string) => {
  expect(screen.getByText("Right.", { exact: true })).toBeInTheDocument();
  expect(attemptsOf(p)).toEqual([expect.objectContaining({ correct: true, assisted: false, response })]);
};

describe("grades 3–5 (more): touch pads in the Runner", () => {
  it("m.frac.equiv.model L1: shading the bar below in its own parts answers right", async () => {
    const p = await learner("3");
    const seed = seedWhere("m.frac.equiv.model", 1);
    const item = makeItem("m.frac.equiv.model", 1, seed, "en");
    if (item.answer.kind !== "fraction" || item.pad?.kind !== "fraction-bar") throw new Error("shape");
    const { n, d } = item.answer;
    await play(p, "pick", "m.frac.equiv.model", 1, seed);
    for (let k = 1; k <= n; k++) await userEvent.click(screen.getByRole("button", { name: `Part ${k} of ${d}` }));
    expect(screen.getByText(`${n} of ${d} parts shaded`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    right(p, `${n}/${d}`);
  });

  it("m.time.elapsed L1 and L3: setting the end or start time on the clock answers right", async () => {
    for (const level of [1, 3]) {
      const p = await learner("3");
      const seed = seedWhere("m.time.elapsed", level, (it) => it.input === "clock");
      const item = makeItem("m.time.elapsed", level, seed, "en");
      if (item.answer.kind !== "text" || item.pad?.kind !== "clock") throw new Error("shape");
      await play(p, "pick", "m.time.elapsed", level, seed);
      await setClock(item.answer.accept[0], item.pad.stepMinutes);
      right(p, item.answer.accept[0]);
      cleanup();
    }
  });

  it("m.dec.thousandths L2: placing the decimal on its tick answers right", async () => {
    const p = await learner("5");
    const seed = seedWhere("m.dec.thousandths", 2, (it) => it.pad?.kind === "number-line" && it.pad.step === 0.001);
    const item = makeItem("m.dec.thousandths", 2, seed, "en");
    if (item.answer.kind !== "number" || item.pad?.kind !== "number-line") throw new Error("shape");
    const steps = Math.round((item.answer.value - item.pad.min) / item.pad.step);
    await play(p, "pick", "m.dec.thousandths", 2, seed);
    await placeOnLine(steps);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    right(p, String(item.answer.value));
  });

  it("m.frac.asdiv L3: a ÷ b placed at a b-ths answers right, and a tick-counting miss is diagnosed", async () => {
    const seed = seedWhere("m.frac.asdiv", 3, (it) => it.answer.kind === "fraction" && it.answer.n > 1);
    const item = makeItem("m.frac.asdiv", 3, seed, "en");
    if (item.answer.kind !== "fraction") throw new Error("shape");
    const { n, d } = item.answer;
    const p = await learner("5");
    await play(p, "pick", "m.frac.asdiv", 3, seed);
    await placeOnLine(n);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    right(p, `${n}/${d}`);
    cleanup();

    const q = await learner("5");
    await play(q, "check", "m.frac.asdiv", 3, seed);
    await placeOnLine(n - 1);
    await userEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(attemptsOf(q)).toEqual([expect.objectContaining({ correct: false, mode: "check", response: `${n - 1}/${d}`, why: "counted-ticks-not-jumps" })]);
  });
});
