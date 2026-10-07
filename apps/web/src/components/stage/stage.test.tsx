import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuizView } from "./scenes";
import { FractionBar } from "./widgets/FractionBar";
import { MoonPhases, phaseKey } from "./widgets/MoonPhases";
import { stateAt } from "./widgets/StatesOfMatter";

describe("FractionBar", () => {
  it("arrow keys change the number of parts and the readout", async () => {
    render(<FractionBar widget={{ kind: "fraction-bar", parts: 2, shaded: 1 }} />);
    expect(screen.getByText("1 of 2 parts shaded = 1/2")).toBeInTheDocument();
    screen.getByRole("button", { name: "Part 1, shaded" }).focus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByText("1 of 4 parts shaded = 1/4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Part 3, not shaded" }));
    expect(screen.getByText("3 of 4 parts shaded = 3/4")).toBeInTheDocument();
  });

  it("checks against the target", async () => {
    const onCheck = vi.fn();
    render(<FractionBar widget={{ kind: "fraction-bar", parts: 4, shaded: 2, target: { parts: 4, shaded: 3 } }} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole("button", { name: "Part 3, not shaded" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });
});

describe("QuizView", () => {
  const scene = {
    id: "s5", kind: "quiz" as const, title: "Check",
    questions: [{ id: "q1", prompt: "1/2 or 1/4: which is more?", choices: ["1/2", "1/4"], answer: 0, hint: "More pieces means smaller pieces.", explain: "1/2 is more." }],
  };

  it("a correct answer after a hint is recorded as helped", async () => {
    const onAnswer = vi.fn();
    render(<QuizView scene={scene} onAnswer={onAnswer} onSpeakText={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Show a hint/ }));
    await userEvent.click(screen.getByLabelText("1/2"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenCalledWith({ sceneId: "s5:q1", correct: true, assisted: true });
    expect(screen.getByText("That's right — with a hint.")).toBeInTheDocument();
  });

  it("a correct answer without help is recorded as on your own", async () => {
    const onAnswer = vi.fn();
    render(<QuizView scene={scene} onAnswer={onAnswer} onSpeakText={() => {}} />);
    await userEvent.click(screen.getByLabelText("1/4"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ sceneId: "s5:q1", correct: false, assisted: false });
    await userEvent.click(screen.getByLabelText("1/2"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ sceneId: "s5:q1", correct: true, assisted: false });
  });
});

describe("science widgets", () => {
  it("water changes state at 0 °C and 100 °C", () => {
    expect([stateAt(-10), stateAt(0), stateAt(10), stateAt(90), stateAt(100)]).toEqual(["solid", "solid", "liquid", "liquid", "gas"]);
  });

  it("names the Moon's phases through the cycle", () => {
    expect([0, 3, 7, 10, 15, 18, 22, 25, 29].map(phaseKey)).toEqual([
      "w.moon.new", "w.moon.waxingCrescent", "w.moon.firstQuarter", "w.moon.waxingGibbous", "w.moon.full",
      "w.moon.waningGibbous", "w.moon.lastQuarter", "w.moon.waningCrescent", "w.moon.new",
    ]);
  });

  it("moon widget accepts any day with the target's phase", async () => {
    const onCheck = vi.fn();
    render(<MoonPhases widget={{ kind: "moon-phases", target: 14 }} onCheck={onCheck} />);
    for (let i = 0; i < 15; i++) await userEvent.click(screen.getByRole("button", { name: "Later day" }));
    expect(screen.getByText("Day 15: full moon")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });
});
