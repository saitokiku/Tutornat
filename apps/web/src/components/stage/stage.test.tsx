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
    // Nothing to check until the learner changes something: a stray tap is never a "not yet".
    const check = screen.getByRole("button", { name: "Check my answer" });
    expect(check).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(check);
    expect(onCheck).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Part 4, not shaded" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole("button", { name: "Part 4, shaded" }));
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
    render(<QuizView scene={scene} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: /Show a hint/ }));
    await userEvent.click(screen.getByLabelText("1/2"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenCalledWith({ sceneId: "s5:q1", correct: true, assisted: true, response: "1/2", choice: 0 });
    expect(screen.getByText("That's right, with help.")).toBeInTheDocument();
  });

  it("a correct answer after a miss is recorded as helped", async () => {
    const onAnswer = vi.fn();
    render(<QuizView scene={scene} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("1/4"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ sceneId: "s5:q1", correct: false, assisted: false, response: "1/4", choice: 1 });
    await userEvent.click(screen.getByLabelText("1/2"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ sceneId: "s5:q1", correct: true, assisted: true, response: "1/2", choice: 0 });
  });
});

describe("QuizView focus", () => {
  const two = {
    id: "s6", kind: "quiz" as const, title: "Check",
    questions: [
      { id: "q1", prompt: "Which is more?", choices: ["1/2", "1/4"], answer: 0, hint: "Fewer pieces are bigger.", explain: "1/2 is more." },
      { id: "q2", prompt: "Which is less?", choices: ["1/3", "1/6"], answer: 1, hint: "More pieces are smaller.", explain: "1/6 is less." },
    ],
  };

  it("never drops keyboard focus: check, hint and the next question", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<QuizView scene={two} onAnswer={onAnswer} />);
    const check = screen.getByRole("button", { name: "Check" });
    expect(check).toHaveAttribute("aria-disabled", "true"); // nothing chosen yet
    await user.click(screen.getByRole("button", { name: /Show a hint/ }));
    expect(document.activeElement).toHaveTextContent("Fewer pieces are bigger.");
    await user.click(screen.getByLabelText("1/2"));
    check.focus();
    await user.keyboard("{Enter}");
    expect(onAnswer).toHaveBeenLastCalledWith({ sceneId: "s6:q1", correct: true, assisted: true, response: "1/2", choice: 0 });
    expect(document.activeElement).toBe(check);
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(document.activeElement).toHaveTextContent("Which is less?");
  });

  it("Why takes focus to the explanation", async () => {
    render(<QuizView scene={two} onAnswer={() => {}} />);
    await userEvent.click(screen.getByLabelText("1/4"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: "Why" }));
    expect(document.activeElement).toHaveTextContent("1/2 is more.");
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

describe("tap to hear", () => {
  it("shows a speaker for the question and every choice for young learners only", async () => {
    const { HearContext } = await import("./hear");
    const scene = {
      id: "s1", kind: "quiz" as const, title: "Check",
      questions: [{ id: "q1", prompt: "What happened first?", choices: ["Seed", "Water", "Plant"], answer: 0, hint: "h", explain: "e" }],
    };
    const { unmount } = render(
      <HearContext.Provider value={{ hear: true, young: true, locale: "en" }}>
        <QuizView scene={scene} onAnswer={() => {}} />
      </HearContext.Provider>,
    );
    expect(screen.getAllByRole("button", { name: /^Read aloud:/ })).toHaveLength(4);
    unmount();
    render(<QuizView scene={scene} onAnswer={() => {}} />);
    expect(screen.queryAllByRole("button", { name: /^Read aloud:/ })).toHaveLength(0);
  });
});
