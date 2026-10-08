import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PracticeSet, Slot } from "@/learning/types";
import { signUp } from "@/lib/auth";
import { createLearner, selectLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Grade, Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { Runner, speakableSteps } from "./Runner";
import { TutorDock } from "./tutor-dock";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
const openTutor = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/practice/x",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  resetMemory();
  nav.push.mockReset();
  openTutor.mockReset();
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
  render(<TutorDock.Provider value={{ open: openTutor }}><Runner set={set} learner={p} exitHref="/practice" /></TutorDock.Provider>);
  await settled();
}

/** Waits for the runner to move focus to the problem on screen, as it does for every new problem. */
const settled = () => waitFor(() => expect(document.getElementById("problem")).toHaveFocus());

/** Presses a button that moves on to another problem, then waits until that problem has focus. */
async function moveOn(name: string | RegExp) {
  await userEvent.click(screen.getByRole("button", { name }));
  await settled();
}

/** The first seed whose item fits. */
function seedWhere(skillId: string, level: number, fits: (it: Item) => boolean) {
  for (let seed = 1; seed < 5000; seed++) if (fits(makeItem(skillId, level, seed, "en"))) return seed;
  throw new Error(`no seed for ${skillId}`);
}

describe("reading worked steps aloud", () => {
  it("is offered for plain steps, not for notation a voice would garble", () => {
    expect(speakableSteps(["Start at 7, count on 3: 10."])).toBe(true);
    expect(speakableSteps(["5 − 2 = 3", "3 × 4 = 12"])).toBe(true);
    expect(speakableSteps(["3/4 of the bar is shaded."])).toBe(false);
    expect(speakableSteps(["|−7| = 7"])).toBe(false);
    expect(speakableSteps(["x^2 + 1"])).toBe(false);
  });
});

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

  it.each(["Tab", "slash"])("hint_then_keyboard_fraction_submits_once (%s)", async (move) => {
    const p = await learner("3");
    // Seed 11 shows one of four equal parts shaded.
    const set = setOf(p, "pick", [{ skillId: "m.frac.unit", seed: 11, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.click(screen.getByRole("button", { name: /^Hint/ }));
    if (move === "Tab") await userEvent.click(screen.getByRole("button", { name: /^Top number:/ }));
    await userEvent.keyboard("1");
    if (move === "Tab") await userEvent.tab();
    else await userEvent.keyboard("/");
    await userEvent.keyboard("4{Enter}");

    expect(read().attempts).toEqual([expect.objectContaining({ response: "1/4", correct: true, assisted: true })]);
    expect(read().acts.filter((a) => a.kind === "hint")).toHaveLength(1);
    expect(screen.getByText("Right, with help.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(openTutor).not.toHaveBeenCalled();
  });

  // Dogfood #5, the other order: the answer is typed first, then a hint, then Enter. Focus is on the
  // hint button by then; Enter must check the answer, not take a second hint nobody asked for.
  it.each([
    ["fraction", "m.frac.unit", 1],
    ["keypad", "m.div.long", 1],
    ["remainder", "m.div.long", 2],
  ] as const)("typed_then_hint_then_enter_checks_once (%s)", async (input, skillId, level) => {
    const p = await learner("4");
    // Two hints or more, so the hint button stays on screen (as "Another hint") after the first.
    const seed = seedWhere(skillId, level, (it) => it.input === input && it.hints.length >= 2 && (it.answer.kind !== "remainder" || it.answer.r > 0));
    const { answer } = makeItem(skillId, level, seed, "en");
    const keys = answer.kind === "fraction" ? `${answer.n}/${answer.d}` : answer.kind === "remainder" ? `${answer.q}r${answer.r}` : answer.kind === "number" ? String(answer.value) : "";
    const set = setOf(p, "pick", [{ skillId, seed, role: "main", level }]);
    await show(set, p);
    await userEvent.keyboard(keys);
    await userEvent.click(screen.getByRole("button", { name: /^Hint/ }));
    expect(screen.getByRole("button", { name: /Another hint/ })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");

    expect(read().attempts).toEqual([expect.objectContaining({ correct: true, assisted: true })]);
    expect(read().acts.filter((a) => a.kind === "hint")).toHaveLength(1);
    expect(screen.getByText("Right, with help.")).toBeInTheDocument();
  });

  it("a hinted fraction can be entered by touch and checked once", async () => {
    const p = await learner("3");
    const set = setOf(p, "pick", [{ skillId: "m.frac.unit", seed: 11, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.click(screen.getByRole("button", { name: /^Hint/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Top number:/ }));
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    await userEvent.click(screen.getByRole("button", { name: /^Bottom number:/ }));
    await userEvent.click(screen.getByRole("button", { name: "4" }));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(read().attempts).toEqual([expect.objectContaining({ response: "1/4", correct: true, assisted: true })]);
    expect(read().acts.filter((a) => a.kind === "hint")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])("composition Enter does not submit a fraction (%j)", async (composition) => {
    const p = await learner("3");
    const set = setOf(p, "pick", [{ skillId: "m.frac.unit", seed: 11, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.keyboard("1/4");
    const field = screen.getByRole("button", { name: /^Bottom number:/ });
    field.focus();
    fireEvent.keyDown(field, { key: "Enter", ...composition });
    expect(read().attempts).toEqual([]);
    await userEvent.keyboard("{Enter}");
    expect(read().attempts).toEqual([expect.objectContaining({ response: "1/4", correct: true, assisted: false })]);
  });

  it("a wrong answer in a check is stored with the misconception it shows", async () => {
    const p = await learner("3");
    const seed = seedWhere("m.frac.numberline", 3, (it) => it.input === "number-line" && it.answer.kind === "fraction" && it.answer.n >= 2 && it.answer.n < it.answer.d);
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

  it("a problem missed, skipped and fixed at the end counts as right with help", async () => {
    const p = await learner("1");
    const [a, b] = [5, 9].map((seed) => makeItem("m.add.20", 1, seed, "en"));
    const set = setOf(p, "pick", [
      { skillId: "m.add.20", seed: 5, role: "main", level: 1 },
      { skillId: "m.add.20", seed: 9, role: "main", level: 1 },
    ]);
    await show(set, p);
    const value = (it: Item) => (it.answer.kind === "number" ? it.answer.value : NaN);
    await userEvent.keyboard(`${value(a) + 1}{Enter}`);
    expect(screen.getByText(/^Not yet/)).toBeInTheDocument();
    await moveOn("Skip for now");
    await userEvent.keyboard(`${value(b)}{Enter}`);
    expect(screen.getByText("Right.", { exact: true })).toBeInTheDocument();
    await moveOn(/^Next/);
    // The fix pass brings the skipped problem back, and it still remembers the miss.
    expect(screen.getByText(/Fix the ones you skipped/)).toBeInTheDocument();
    await userEvent.keyboard(`${value(a)}{Enter}`);
    expect(screen.getByText("Right, with help.")).toBeInTheDocument();
    expect(read().attempts.map((x) => [x.seed, x.correct, x.assisted])).toEqual([
      [9, true, false],
      [5, true, true],
    ]);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByRole("heading", { name: "Set done" })).toBeInTheDocument();
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["1", "1", "0"]);
  });

  it("hints and steps taken before a skip come back with the problem, and are not logged twice", async () => {
    const p = await learner("1");
    const a = makeItem("m.add.20", 1, 5, "en");
    const set = setOf(p, "pick", [
      { skillId: "m.add.20", seed: 5, role: "main", level: 1 },
      { skillId: "m.add.20", seed: 9, role: "main", level: 1 },
    ]);
    await show(set, p);
    for (const name of [/^Hint/, /Another hint/, /Another hint/]) await userEvent.click(screen.getByRole("button", { name }));
    await userEvent.click(screen.getByRole("button", { name: "Show me how" }));
    await moveOn("Skip for now");
    const b = makeItem("m.add.20", 1, 9, "en");
    await userEvent.keyboard(`${b.answer.kind === "number" ? b.answer.value : ""}{Enter}`);
    await moveOn(/^Next/);
    // Back for fixing: the three hints and the worked steps are still there; nothing new to take.
    expect(within(screen.getByRole("list", { name: "Hints" })).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("How it's done")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hint/i })).toBeNull();
    await userEvent.keyboard(`${a.answer.kind === "number" ? a.answer.value : ""}{Enter}`);
    expect(read().attempts.find((x) => x.seed === 5)).toMatchObject({ correct: true, assisted: true });
    expect(read().acts.filter((x) => x.setId === set.id).map((x) => [x.kind, x.detail])).toEqual([
      ["hint", "1"],
      ["hint", "2"],
      ["hint", "3"],
      ["steps", undefined],
    ]);
  });

  it("leaving a problem in the fix pass records the last miss and the misconception it shows", async () => {
    const p = await learner("3");
    const seed = seedWhere("m.frac.numberline", 3, (it) => it.input === "number-line" && it.answer.kind === "fraction" && it.answer.n >= 2 && it.answer.n < it.answer.d);
    const item = makeItem("m.frac.numberline", 3, seed, "en");
    const { n, d } = item.answer as { n: number; d: number };
    const other = makeItem("m.add.20", 1, 9, "en");
    const set = setOf(p, "pick", [
      { skillId: "m.frac.numberline", seed, role: "main", level: 3 },
      { skillId: "m.add.20", seed: 9, role: "main", level: 1 },
    ]);
    await show(set, p);
    screen.getByRole("slider", { name: "Number line: place your point" }).focus();
    for (let k = 0; k < n; k++) await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText(/^Not yet/)).toBeInTheDocument();
    await moveOn("Skip for now");
    await userEvent.keyboard(`${other.answer.kind === "number" ? other.answer.value : ""}{Enter}`);
    await moveOn(/^Next/);
    await userEvent.click(screen.getByRole("button", { name: "Leave this one" }));
    expect(read().attempts.find((x) => x.seed === seed)).toMatchObject({ correct: false, assisted: true, response: `${n - 1}/${d}`, why: "counted-ticks-not-jumps" });
  });

  it("on a keypad problem, Enter on a counter marks it and never answers; Tab from the question reaches the counters", async () => {
    const p = await learner("1");
    const seed = seedWhere("m.add.10", 1, (it) => it.markable === true);
    const item = makeItem("m.add.10", 1, seed, "en");
    const set = setOf(p, "pick", [{ skillId: "m.add.10", seed, role: "main", level: 1 }]);
    await show(set, p);
    await userEvent.keyboard(String(item.answer.kind === "number" ? item.answer.value : ""));
    await userEvent.tab();
    expect(screen.getByRole("button", { name: `Read aloud: ${item.say.slice(0, 60)}` })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Dot 1" })).toHaveFocus();
    await userEvent.keyboard("{Enter}{ArrowRight} ");
    expect(screen.getByText("2 marked")).toBeInTheDocument();
    expect(read().attempts).toEqual([]);
    // Enter on Hint takes a hint; it does not send the typed answer either.
    await userEvent.click(screen.getByRole("button", { name: /^Hint/ }));
    expect(read().attempts).toEqual([]);
    expect(screen.getByRole("list", { name: "Hints" })).toBeInTheDocument();
  });

  it("the draft label follows the problem on screen, and the finish names draft questions", async () => {
    const p = await learner("K");
    const math = makeItem("m.count.10", 1, 3, "en");
    const draftSeed = 4;
    const english = makeItem("e.rhyme", 1, draftSeed, "en");
    const set = setOf(p, "pick", [
      { skillId: "m.count.10", seed: 3, role: "main", level: 1 },
      { skillId: "e.rhyme", seed: draftSeed, role: "review", level: 1 },
    ]);
    await show(set, p);
    expect(screen.queryByText("Draft questions")).toBeNull();
    const label = (it: Item) => (it.answer.kind === "choice" ? it.choices![it.answer.index].label : "");
    await userEvent.click(screen.getByRole("button", { name: label(math) }));
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByText("Draft questions")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: label(english) }));
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByText("These questions are a draft. A teacher hasn't reviewed them yet.")).toBeInTheDocument();
  });

  it("a clock left at 12:00 answers 12:00, and after a right answer the clock stays, showing it", async () => {
    const p = await learner("1");
    const seed = seedWhere("m.time.clock", 1, (it) => it.input === "clock" && it.answer.kind === "text" && it.answer.accept[0] === "12:00");
    const set = setOf(p, "pick", [{ skillId: "m.time.clock", seed, role: "main", level: 1 }]);
    await show(set, p);
    const check = screen.getByRole("button", { name: "Check" });
    expect(check).toBeEnabled();
    await userEvent.click(check);
    expect(screen.getByText("Right.", { exact: true })).toBeInTheDocument();
    expect(read().attempts[0]).toMatchObject({ correct: true, response: "12:00" });
    expect(screen.getByRole("img", { name: /Clock face showing 12:00/ })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /^Next/ })).toHaveFocus();
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
