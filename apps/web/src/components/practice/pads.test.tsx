import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { check } from "@/practice/answer";
import type { Input, Pad } from "@/practice/types";
import { AnswerInput } from "./AnswerPad";
import { counterCell, layoutCounters, MarkCounters, type MarkableVisual } from "./MarkCounters";
import { hourAt, responseOf } from "./pad-math";

/** A pad in the Runner's shoes: it owns the value and shows what the checker would receive. */
function Harness({ input, pad, onSubmit = () => {} }: { input: "number-line" | "fraction-bar" | "clock" | "fraction"; pad?: Pad; onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <AnswerInput input={input} pad={pad} value={value} onChange={setValue} onSubmit={onSubmit} onPick={() => {}} label="Your answer" />
      {/* What Check would send, the way the Runner reads the pad. */}
      <output data-testid="response">{responseOf(input, value)}</output>
    </>
  );
}
const response = () => screen.getByTestId("response").textContent;

function TypingHarness({ input }: { input: Input }) {
  const [value, setValue] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  return <>
    <AnswerInput input={input} value={value} onChange={setValue} onSubmit={() => setAnswers((a) => [...a, responseOf(input, value)])} onPick={() => {}} label="Your answer" />
    <button type="button" onClick={() => setHints((h) => h + 1)}>Hint</button>
    <output aria-label="Submitted answers">{JSON.stringify(answers)}</output>
    <output aria-label="Hints taken">{hints}</output>
  </>;
}

describe("typing after help", () => {
  it("keypad typing moves Enter back to the answer after a hint", async () => {
    render(<TypingHarness input="keypad" />);
    await userEvent.click(screen.getByRole("button", { name: "Hint" }));
    await userEvent.keyboard("3{Enter}");
    expect(screen.getByLabelText("Submitted answers")).toHaveTextContent('["3"]');
    expect(screen.getByLabelText("Hints taken")).toHaveTextContent("1");
  });

  it("Tab follows the quotient and remainder fields, and Enter sends their values", async () => {
    render(<TypingHarness input="remainder" />);
    await userEvent.click(screen.getByRole("button", { name: /^Answer:/ }));
    await userEvent.keyboard("2");
    await userEvent.tab();
    await userEvent.keyboard("1{Enter}");
    expect(screen.getByLabelText("Submitted answers")).toHaveTextContent('["2 R 1"]');
  });

  it("the remainder shortcut resumes answering after a hint", async () => {
    render(<TypingHarness input="remainder" />);
    await userEvent.click(screen.getByRole("button", { name: "Hint" }));
    await userEvent.keyboard("2r1{Enter}");
    expect(screen.getByLabelText("Submitted answers")).toHaveTextContent('["2 R 1"]');
    expect(screen.getByLabelText("Hints taken")).toHaveTextContent("1");
  });

  it.each(["clock", "number-line"] as const)("composition Enter does not submit the %s", async (input) => {
    render(<TypingHarness input={input} />);
    const control = input === "clock" ? screen.getByRole("spinbutton", { name: "Hour" }) : screen.getByRole("slider", { name: "Number line: place your point" });
    control.focus();
    if (input === "number-line") await userEvent.keyboard("{ArrowRight}");
    fireEvent.keyDown(control, { key: "Enter", isComposing: true });
    expect(screen.getByLabelText("Submitted answers")).toHaveTextContent("[]");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("Submitted answers")).toHaveTextContent(input === "clock" ? '["12:00"]' : '["0"]');
  });

  it("keypad typing after a hint focuses the keys, never the live readout a screen reader already announces", async () => {
    render(<TypingHarness input="keypad" />);
    await userEvent.click(screen.getByRole("button", { name: "Hint" }));
    await userEvent.keyboard("3");
    expect(screen.getByRole("group", { name: "Number keys" })).toHaveFocus();
    expect(document.activeElement?.closest("[aria-live]")).toBeNull();
  });

  it.each([
    ["keypad", "3"],
    ["fraction", "3/4"],
    ["remainder", "3r1"],
  ] as const)("typing never pulls focus out of a panel open beside the problem (%s)", async (input, keys) => {
    render(
      <>
        <TypingHarness input={input} />
        <aside role="dialog" aria-modal="false" aria-label="Tutor">
          <button type="button">Show me</button>
        </aside>
      </>,
    );
    const inPanel = screen.getByRole("button", { name: "Show me" });
    inPanel.focus();
    await userEvent.keyboard(keys);
    expect(inPanel).toHaveFocus();
  });
});

/** jsdom has no layout; give an element a box so taps can be turned into positions. */
function box(el: Element, width: number, height: number) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) });
}

describe("NumberLinePad", () => {
  it("keyboard only: Tab to the line, arrows place and move the point, Enter answers", async () => {
    const onSubmit = vi.fn();
    render(<Harness input="number-line" pad={{ kind: "number-line", min: -5, max: 5, step: 1 }} onSubmit={onSubmit} />);
    await userEvent.tab();
    const line = screen.getByRole("slider", { name: "Number line: place your point" });
    expect(line).toHaveFocus();
    expect(line).toHaveAttribute("aria-valuetext", "No point yet");
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowLeft}");
    expect(response()).toBe("0");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(response()).toBe("-2");
    expect(line).toHaveAttribute("aria-valuetext", "−2");
    expect(screen.getByText("Your point: −2")).toBeInTheDocument();
    expect(check({ kind: "number", value: -2 }, response()!).correct).toBe(true);
    await userEvent.keyboard("{Home}");
    expect(response()).toBe("-5");
    await userEvent.keyboard("{End}{Enter}");
    expect(response()).toBe("5");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("fraction ticks: the point lands on fourths and answers 3/4", async () => {
    render(<Harness input="number-line" pad={{ kind: "number-line", min: 0, max: 2, step: 1, denominator: 4 }} />);
    screen.getByRole("slider").focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(response()).toBe("3/4");
    expect(check({ kind: "fraction", n: 3, d: 4 }, response()!).correct).toBe(true);
    await userEvent.keyboard("{PageUp}");
    expect(response()).toBe("7/4");
  });

  it("a tap snaps to the nearest point; the step buttons nudge it", async () => {
    render(<Harness input="number-line" pad={{ kind: "number-line", min: 0, max: 10, step: 1 }} />);
    const line = screen.getByRole("slider");
    box(line, 640, 112);
    // The line runs from 28 to 612 in a 640-wide box: 7 sits at 28 + 0.7 × 584 ≈ 437.
    fireEvent.click(line, { clientX: 440, clientY: 50 });
    expect(response()).toBe("7");
    await userEvent.click(screen.getByRole("button", { name: "Move the point right" }));
    expect(response()).toBe("8");
    await userEvent.click(screen.getByRole("button", { name: "Move the point left" }));
    await userEvent.click(screen.getByRole("button", { name: "Move the point left" }));
    expect(response()).toBe("6");
  });
});

describe("FractionBarPad", () => {
  it("keyboard only: choose the parts, then shade three of four", async () => {
    render(<Harness input="fraction-bar" pad={{ kind: "fraction-bar", maxParts: 12 }} />);
    expect(screen.getByText("0 of 1 part shaded")).toBeInTheDocument();
    // Fewer is disabled at one part, so Tab lands on More.
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "More parts" })).toHaveFocus();
    await userEvent.keyboard("{Enter}{Enter}{Enter}");
    expect(response()).toBe("0/4");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Part 1 of 4" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight} ");
    await userEvent.keyboard("{ArrowRight} ");
    expect(response()).toBe("3/4");
    expect(screen.getByText("3 of 4 parts shaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Part 3 of 4" })).toHaveAttribute("aria-pressed", "true");
    expect(check({ kind: "fraction", n: 3, d: 4 }, response()!).correct).toBe(true);
    // ↑ on a part splits the bar again and clears the shading.
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(response()).toBe("0/8");
    expect(screen.getAllByRole("button", { name: /^Part \d of 8$/, pressed: false })).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Part 3 of 8" })).toHaveFocus();
  });

  it("taps shade any parts; equal amounts are right", async () => {
    render(<Harness input="fraction-bar" pad={{ kind: "fraction-bar", maxParts: 12 }} />);
    for (let i = 0; i < 7; i++) await userEvent.click(screen.getByRole("button", { name: "More parts" }));
    for (const n of [2, 4, 6, 8, 5, 7]) await userEvent.click(screen.getByRole("button", { name: `Part ${n} of 8` }));
    expect(response()).toBe("6/8");
    expect(check({ kind: "fraction", n: 3, d: 4 }, response()!).correct).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Part 5 of 8" }));
    expect(response()).toBe("5/8");
  });

  it("fixed parts: no part chooser, just shading", async () => {
    render(<Harness input="fraction-bar" pad={{ kind: "fraction-bar", parts: 3, maxParts: 12 }} />);
    expect(screen.queryByRole("button", { name: "More parts" })).toBeNull();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Part 1 of 3" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("button", { name: /of 3$/ })).toHaveLength(3);
    await userEvent.keyboard("{End} ");
    expect(response()).toBe("1/3");
  });
});

describe("FractionPad", () => {
  it("a whole number in the top box, with the bottom box empty, is sent as that number", async () => {
    render(<Harness input="fraction" />);
    for (const k of ["1", "3", "5"]) await userEvent.click(screen.getByRole("button", { name: k }));
    expect(screen.getByRole("button", { name: "Bottom number: empty" })).toBeInTheDocument();
    expect(response()).toBe("135");
    expect(check({ kind: "fraction", n: 135, d: 1, simplest: true }, response()!)).toEqual({ correct: true });
    await userEvent.click(screen.getByRole("button", { name: "Minus" }));
    expect(response()).toBe("-135");
    expect(check({ kind: "fraction", n: -135, d: 1, simplest: true }, response()!)).toEqual({ correct: true });
    // A bottom number makes it a fraction again; deleting it goes back to the whole number.
    await userEvent.keyboard("/2");
    expect(response()).toBe("-135/2");
    await userEvent.keyboard("{Backspace}");
    expect(response()).toBe("-135");
  });

  it("a mixed-number pad with only the whole box filled sends the whole number", async () => {
    render(<Harness input="fraction" />);
    await userEvent.click(screen.getByRole("button", { name: "Add a whole number" }));
    await userEvent.keyboard("6");
    expect(response()).toBe("6");
    expect(check({ kind: "fraction", n: 6, d: 1, simplest: true }, response()!).correct).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Top number: empty" }));
    await userEvent.keyboard("1/3");
    expect(response()).toBe("6 1/3");
    expect(check({ kind: "fraction", n: 19, d: 3, simplest: true }, response()!).correct).toBe(true);
  });

  it("an emptied pad sends nothing", async () => {
    render(<Harness input="fraction" />);
    await userEvent.keyboard("4{Backspace}");
    expect(response()).toBe("");
  });
});

describe("ClockPad", () => {
  it("keyboard only: set 3:30 with the arrow keys on each hand, Enter answers", async () => {
    const onSubmit = vi.fn();
    render(<Harness input="clock" pad={{ kind: "clock", stepMinutes: 5 }} onSubmit={onSubmit} />);
    expect(screen.getByRole("img", { name: /Clock face showing 12:00/ })).toBeInTheDocument();
    const hour = screen.getByRole("spinbutton", { name: "Hour" });
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    // The face shows 12:00 before anything moves, and that is an answer too ("Set the clock to 12:00").
    expect(response()).toBe("12:00");
    hour.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(response()).toBe("3:00");
    expect(hour).toHaveAttribute("aria-valuenow", "3");
    minutes.focus();
    await userEvent.keyboard("{PageUp}{PageUp}");
    expect(response()).toBe("3:30");
    expect(minutes).toHaveAttribute("aria-valuetext", "30 minutes");
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(check({ kind: "text", accept: ["3:30"] }, response()!).correct).toBe(true);
    expect(screen.getByRole("img", { name: /Clock face showing 3:30/ })).toBeInTheDocument();
  });

  it("taps on the face move the chosen hand, snapped to the step", async () => {
    render(<Harness input="clock" pad={{ kind: "clock", stepMinutes: 15 }} />);
    const face = screen.getByRole("img", { name: /Clock face/ });
    box(face, 200, 200);
    fireEvent.click(face, { clientX: 190, clientY: 100 }); // the 3
    expect(response()).toBe("3:00");
    await userEvent.click(screen.getByRole("button", { name: "Long hand" }));
    fireEvent.click(face, { clientX: 100, clientY: 190 }); // the 6
    expect(response()).toBe("3:30");
    fireEvent.click(face, { clientX: 20, clientY: 112 }); // just below the 9
    expect(response()).toBe("3:45");
    await userEvent.click(screen.getByRole("button", { name: "Move the short hand forward one hour" }));
    expect(response()).toBe("4:45");
  });

  it("at half past and quarter to, a tap where the short hand really sits keeps the hour", async () => {
    render(<Harness input="clock" pad={{ kind: "clock", stepMinutes: 15 }} />);
    const face = screen.getByRole("img", { name: /Clock face/ });
    box(face, 200, 200);
    const at = (deg: number, len = 60) => ({ clientX: 100 + Math.sin((deg * Math.PI) / 180) * len, clientY: 100 - Math.cos((deg * Math.PI) / 180) * len });
    await userEvent.click(screen.getByRole("button", { name: "Long hand" }));
    fireEvent.click(face, at(180, 80)); // the 6: half past
    await userEvent.click(screen.getByRole("button", { name: "Short hand" }));
    fireEvent.click(face, at(105)); // half way between 3 and 4
    expect(response()).toBe("3:30");
    expect(hourAt(105, 30)).toBe(3);
    await userEvent.click(screen.getByRole("button", { name: "Long hand" }));
    fireEvent.click(face, at(270, 80)); // the 9: quarter to
    await userEvent.click(screen.getByRole("button", { name: "Short hand" }));
    fireEvent.click(face, at(112)); // three quarters of the way from 3 to 4
    expect(response()).toBe("3:45");
    expect(screen.getByRole("img", { name: /Clock face showing 3:45/ })).toBeInTheDocument();
  });

  it("disabled after a right answer: the hands stay where they were set, and nothing moves them", async () => {
    render(<AnswerInput input="clock" pad={{ kind: "clock", stepMinutes: 5 }} value="4:20" disabled onChange={() => {}} onSubmit={() => {}} onPick={() => {}} label="Your answer" />);
    expect(screen.getByRole("img", { name: /Clock face showing 4:20/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move the short hand forward one hour" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(/Tap the clock/)).toBeNull();
  });

  it("o'clock items move only the short hand", async () => {
    render(<Harness input="clock" pad={{ kind: "clock", stepMinutes: 60 }} />);
    expect(screen.queryByRole("spinbutton", { name: "Minutes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Long hand" })).toBeNull();
    screen.getByRole("spinbutton", { name: "Hour" }).focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(response()).toBe("10:00");
  });
});

describe("MarkCounters", () => {
  it("keyboard only: arrows move between dots, Space marks, the count is announced", async () => {
    render(<MarkCounters visual={{ kind: "dots", groups: [7] }} alt="7 dots in rows of five" />);
    expect(screen.getByRole("img", { name: "7 dots in rows of five" }).querySelectorAll("circle")).toHaveLength(7);
    expect(screen.getByText("Tap each one as you count.")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Dot 1" })).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(screen.getByText("1 marked")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}{Enter}{ArrowDown}");
    // Dot 2 is in the top row; one row down is dot 7.
    expect(screen.getByRole("button", { name: "Dot 7" })).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(screen.getByText("3 marked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dot 2" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard(" ");
    expect(screen.getByText("2 marked")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear marks" }));
    expect(screen.getByText("Tap each one as you count.")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("named groups are announced and number their own dots, so the last label is not the total", async () => {
    render(<MarkCounters visual={{ kind: "dots", groups: [3, 2], labels: ["Sunny days", "Rainy days"] }} alt="Two groups of dots to count" />);
    const sunny = screen.getByRole("group", { name: "Sunny days" });
    const rainy = screen.getByRole("group", { name: "Rainy days" });
    expect(within(sunny).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Dot 1", "Dot 2", "Dot 3"]);
    expect(within(rainy).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Dot 1", "Dot 2"]);
    // Arrows still run through every dot, from one group into the next.
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(within(rainy).getByRole("button", { name: "Dot 1" })).toHaveFocus();
  });

  it("taken-away dots are drawn but not counted; ten-frame boxes say whether they hold a counter", async () => {
    const { unmount } = render(<MarkCounters visual={{ kind: "dots", groups: [5], crossed: 2 }} alt="5 dots, 2 crossed out" />);
    expect(screen.getAllByRole("button", { name: /^Dot/ })).toHaveLength(3);
    unmount();
    render(<MarkCounters visual={{ kind: "ten-frame", filled: 7 }} alt="A ten-frame with 7 filled" />);
    expect(screen.getByRole("button", { name: "Box 7, with a counter" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Box 8, empty" }));
    expect(screen.getByText("1 marked")).toBeInTheDocument();
  });

  it("lays counters out on full-size squares and wraps groups instead of shrinking them", () => {
    const wide = layoutCounters({ kind: "dots", groups: [4, 5] }, 900, 46);
    const narrow = layoutCounters({ kind: "dots", groups: [4, 5] }, 288, 46);
    expect(wide.cell).toBe(46);
    expect(new Set(wide.counters.map((c) => c.y)).size).toBe(1);
    expect(new Set(narrow.counters.map((c) => c.y)).size).toBe(2);
    expect(narrow.width).toBeLessThanOrEqual(288);
    const array = layoutCounters({ kind: "array", rows: 3, cols: 9 }, 288, 46);
    expect(array.cell).toBeLessThan(46);
    expect(array.width).toBeLessThanOrEqual(288);
  });

  it("K–2 counters are 56 px squares in the room a 320 px phone gives them, and never under 44 px", () => {
    // The Runner lets the counters use the problem card's side padding on phones: 320 − 2 × 16 − 2 = 286.
    const young = counterCell(true);
    expect(young).toBe(56);
    const pictures: MarkableVisual[] = [
      { kind: "ten-frame", filled: 7 },
      { kind: "ten-frame", filled: 14, frames: 2 },
      { kind: "dots", groups: [5] },
      { kind: "dots", groups: [10] },
      { kind: "dots", groups: [4, 5] },
      { kind: "dots", groups: [9], crossed: 3 },
    ];
    for (const v of pictures) {
      const lay = layoutCounters(v, 286, young);
      expect(lay.cell, JSON.stringify(v)).toBe(56);
      expect(lay.width, JSON.stringify(v)).toBeLessThanOrEqual(286);
    }
    const frames = layoutCounters({ kind: "ten-frame", filled: 14, frames: 2 }, 286, young);
    expect(frames.counters).toHaveLength(20);
    expect(frames.counters.filter((c) => c.filled)).toHaveLength(14);
    // Narrower than one row of five needs: the squares shrink to fit, but stay at least 44 px.
    const tight = layoutCounters({ kind: "ten-frame", filled: 3 }, 246, young);
    expect(tight.cell).toBe(48);
    expect(tight.width).toBeLessThanOrEqual(246);
    expect(layoutCounters({ kind: "ten-frame", filled: 3 }, 200, young).cell).toBe(44);
  });
});
