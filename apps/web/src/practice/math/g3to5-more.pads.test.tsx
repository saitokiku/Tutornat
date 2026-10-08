import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Runner } from "@/components/practice/Runner";
import { SkillMap } from "@/components/practice/SkillMap";
import type { PracticeSet } from "@/learning/types";
import { signUp } from "@/lib/auth";
import { createLearner, selectLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Grade, Profile } from "@/lib/types";
import { getSkill, makeItem } from "../skills";
import type { Item } from "../types";

// The five levels of this strand that answer on a touch pad, played through the real Runner by keyboard:
// the fraction bar (m.frac.equiv.model L1), the clock in 5- and 1-minute steps (m.time.elapsed L1, L3)
// and the number line in thousandths and in fractions (m.dec.thousandths L2, m.frac.asdiv L3). Then the
// two graphs a learner reads before answering: the bar graph (m.bargraph.scaled L2) and the line plot
// (m.lineplot.frac). Last, a merged skill's standards on the skill map: every level's code, each with its wording.

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
    // Only where the tick-counting value is listed: when (a − 1)/b equals the whole number a ÷ b drops to, that tap is "dropped-the-remainder".
    const seed = seedWhere("m.frac.asdiv", 3, (it) => it.answer.kind === "fraction" && it.answer.n > 1 && !!it.wrong?.some((w) => w.why === "counted-ticks-not-jumps"));
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

describe("grades 3–5 (more): graphs in the Runner", () => {
  it("m.bargraph.scaled L2: the bars are drawn, labelled and read to answer", async () => {
    const seed = seedWhere("m.bargraph.scaled", 2);
    const item = makeItem("m.bargraph.scaled", 2, seed, "en");
    if (item.visual?.kind !== "bar-graph" || item.answer.kind !== "number") throw new Error("shape");
    const p = await learner("3");
    await play(p, "pick", "m.bargraph.scaled", 2, seed);
    const graph = screen.getByRole("img", { name: item.alt });
    expect(graph.querySelectorAll("rect")).toHaveLength(3);
    for (const label of item.visual.labels) expect(graph).toHaveTextContent(label);
    await userEvent.keyboard(`${item.answer.value}{Enter}`);
    right(p, String(item.answer.value));
  });

  it("m.lineplot.frac: one X per measurement above the line, counted to answer", async () => {
    const seed = seedWhere("m.lineplot.frac", 1, (it) => it.answer.kind === "number");
    const item = makeItem("m.lineplot.frac", 1, seed, "en");
    if (item.visual?.kind !== "line-plot" || item.answer.kind !== "number") throw new Error("shape");
    const p = await learner("5");
    await play(p, "pick", "m.lineplot.frac", 1, seed);
    const plot = screen.getByRole("img", { name: item.alt });
    expect(plot.querySelectorAll("path")).toHaveLength(item.visual.values.length);
    for (const label of ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1"]) expect([...plot.querySelectorAll("text")].map((x) => x.textContent)).toContain(label);
    await userEvent.keyboard(`${item.answer.value}{Enter}`);
    right(p, String(item.answer.value));
  });
});

describe("grades 3–5 (more): every standard a merged skill practises, on the skill map", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("m.mult.compare shows 4.OA.A.2 and its level 3 code 4.OA.A.3, and opens the wording of the one tapped", async () => {
    const asked: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const code = new URL(url, "http://x").searchParams.get("q")!;
        asked.push(code);
        return Response.json({ standard: { code, text: `Wording of ${code}.`, subject: "Mathematics", grade: "4", source: "Common Core State Standards" } });
      }),
    );
    await learner("4");
    const skill = getSkill("m.mult.compare")!;
    render(<SkillMap skills={[skill]} statuses={{}} now={Date.now()} locale="en" near="4" onPractice={vi.fn()} />);
    const main = screen.getByRole("button", { name: "4.OA.A.2: show what this standard says" });
    const level3 = screen.getByRole("button", { name: "4.OA.A.3: show what this standard says" });
    await userEvent.click(level3);
    expect(level3).toHaveAttribute("aria-expanded", "true");
    expect(main).toHaveAttribute("aria-expanded", "false");
    expect(await screen.findByText("Wording of 4.OA.A.3.")).toBeInTheDocument();
    await userEvent.click(main);
    expect(await screen.findByText("Wording of 4.OA.A.2.")).toBeInTheDocument();
    expect(screen.queryByText("Wording of 4.OA.A.3.")).toBeNull();
    expect(asked).toEqual(["4.OA.A.3", "4.OA.A.2"]);
  });
});
