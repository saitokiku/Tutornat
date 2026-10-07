import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Widget } from "@/lib/types";
import { HearContext } from "../hear";
import { AreaModel, partialProducts } from "./AreaModel";
import { Balance, equationText, isSolved, MOVES, solutionOf, tip } from "./Balance";
import { clockText, ClockWidget, fromMinutes, minuteStep, toMinutes } from "./Clock";
import { Coordinate, samePoints, togglePoint } from "./Coordinate";
import { scramble } from "./order";
import { PlaceValue, placeMax, placesFor } from "./PlaceValue";
import { bankOrder, matchesAnswer, SentenceBuilder } from "./SentenceBuilder";
import { Sequence, shift, startOrder } from "./Sequence";
import { isWordSort, Sorter } from "./Sorter";

type User = ReturnType<typeof userEvent.setup>;
const nameOf = (el: Element | null) => el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? "";

/** Keyboard only: Tab until the control with this name has focus. */
async function tabTo(user: User, name: string) {
  for (let i = 0; i < 80; i++) {
    await user.tab();
    if (nameOf(document.activeElement) === name) return document.activeElement as HTMLElement;
  }
  throw new Error(`Tab never reached "${name}"`);
}
async function press(user: User, name: string, times = 1) {
  await tabTo(user, name);
  for (let i = 0; i < times; i++) await user.keyboard("{Enter}");
}
const readout = (text: string) => expect(screen.getAllByText(text, { exact: false }).length).toBeGreaterThan(0);

describe("order helpers", () => {
  it("scramble is stable, a real permutation, and never the order it must avoid", () => {
    const keys = ["a", "b", "c", "d", "e"];
    const one = scramble(keys);
    expect(scramble(keys)).toEqual(one);
    expect([...one].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(one).not.toEqual([0, 1, 2, 3, 4]);
    expect(scramble(["x", "y"])).toEqual([1, 0]);
    // Avoiding several orders still finds one that is none of them.
    const avoid = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
    expect(avoid).not.toContainEqual(scramble(["p", "q", "r"], avoid));
  });
});

describe("AreaModel", () => {
  const w: Extract<Widget, { kind: "area-model" }> = { kind: "area-model", rows: 1, cols: 1, target: { rows: 2, cols: 4 } };

  it("splits a side past 10 into partial products", () => {
    expect(partialProducts(3, 4)).toBeNull();
    expect(partialProducts(3, 12)).toBe("3 × 12 = 3 × 10 + 3 × 2 = 30 + 6 = 36");
    expect(partialProducts(12, 12)).toBe("12 × 12 = 10 × 10 + 10 × 2 + 2 × 10 + 2 × 2 = 100 + 20 + 20 + 4 = 144");
  });

  it("taps to the target shape", async () => {
    const onCheck = vi.fn();
    render(<AreaModel widget={w} onCheck={onCheck} />);
    readout("1 × 1 = 1 square");
    await userEvent.click(screen.getByRole("button", { name: "More rows" }));
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "More columns" }));
    readout("2 × 4 = 8 squares");
    expect(screen.getByRole("img", { name: "Area model of 2 × 4" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("is completed by keyboard alone, and an edge button keeps focus", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<AreaModel widget={w} onCheck={onCheck} />);
    const fewer = await tabTo(user, "Fewer rows");
    await user.keyboard("{Enter}");
    expect(fewer).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(fewer);
    readout("1 × 1 = 1 square");
    await user.keyboard("{Tab}{Enter}"); // More rows
    await press(user, "More columns", 3);
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("a different shape with the same area is not yet right", async () => {
    const onCheck = vi.fn();
    render(<AreaModel widget={w} onCheck={onCheck} />);
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "More rows" }));
    await userEvent.click(screen.getByRole("button", { name: "More columns" }));
    readout("4 × 2 = 8 squares");
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
  });
});

describe("PlaceValue", () => {
  it("shows the places the number needs", () => {
    expect(placesFor(placeMax({ target: 15 }))).toEqual(["t", "o"]);
    expect(placesFor(placeMax({ target: 143 }))).toEqual(["h", "t", "o"]);
    expect(placesFor(placeMax({ target: 7, max: 9 }))).toEqual(["o"]);
  });

  it("builds 15 from a ten and five ones by keyboard", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<PlaceValue widget={{ kind: "place-value", target: 15 }} onCheck={onCheck} />);
    expect(screen.queryByRole("button", { name: "Add a hundred" })).toBeNull();
    readout("No blocks yet");
    await press(user, "Add a ten");
    await press(user, "Add a one", 5);
    readout("1 ten, 5 ones make 15");
    expect(screen.getByRole("img", { name: "1 ten, 5 ones" })).toBeInTheDocument();
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("checks the value, not just any blocks", async () => {
    const onCheck = vi.fn();
    render(<PlaceValue widget={{ kind: "place-value", target: 120 }} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a hundred" }));
    await userEvent.click(screen.getByRole("button", { name: "Add a ten" }));
    readout("1 hundred, 1 ten, 0 ones make 110");
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
  });
});

describe("ClockWidget", () => {
  it("keeps 12-hour time and wraps the hour with the minute hand", () => {
    expect(fromMinutes(toMinutes(12, 55) + 5)).toEqual({ h: 1, m: 0 });
    expect(fromMinutes(toMinutes(1, 0) - 5)).toEqual({ h: 12, m: 55 });
    expect(clockText(7, 5)).toBe("7:05");
    expect(minuteStep({ m: 0, target: { m: 50 } })).toBe(5);
    expect(minuteStep({ m: 0, target: { m: 48 } })).toBe(1);
  });

  it("sets 7:50 from 7:00 by keyboard", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<ClockWidget widget={{ kind: "clock", h: 7, m: 0, target: { h: 7, m: 50 } }} onCheck={onCheck} />);
    readout("The clock shows 7:00.");
    await press(user, "Minute hand forward 5 minutes", 10);
    readout("The clock shows 7:50.");
    expect(screen.getByRole("img", { name: "The clock shows 7:50." })).toBeInTheDocument();
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("moving the hour hand changes the hour, and a wrong time is not yet", async () => {
    const onCheck = vi.fn();
    render(<ClockWidget widget={{ kind: "clock", h: 12, m: 30, target: { h: 3, m: 30 } }} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Hour hand forward one hour" }));
    readout("The clock shows 1:30.");
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
  });
});

describe("Balance", () => {
  const w: Extract<Widget, { kind: "balance" }> = { kind: "balance", xCount: 3, leftUnits: 4, rightUnits: 19 };

  it("knows the solution and when the scale tips", () => {
    expect(solutionOf(w)).toBe(5);
    const start = { a: 3, l: 4, r: 19 };
    expect(tip(start, 5)).toBe(0);
    expect(equationText(start)).toBe("3x + 4 = 19");
    expect(MOVES.split(start)).toBeNull(); // 4 and 19 don't share into 3 groups
    expect(tip(MOVES.left(start)!, 5)).toBeLessThan(0); // left lighter
    expect(MOVES.split({ a: 3, l: 0, r: 15 })).toEqual({ a: 1, l: 0, r: 5 });
    expect(isSolved({ a: 1, l: 0, r: 5 }, 5)).toBe(true);
    expect(isSolved({ a: 1, l: 0, r: 4 }, 5)).toBe(false);
  });

  it("is solved by keyboard: take 4 from both sides, split into 3 groups", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<Balance widget={w} onCheck={onCheck} />);
    readout("3x + 4 = 19. The balance is level.");
    const both = await tabTo(user, "Take 1 from both sides");
    for (let i = 0; i < 4; i++) await user.keyboard("{Enter}");
    readout("3x = 15. The balance is level.");
    expect(both).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(both);
    await press(user, "Split both sides into 3 equal groups");
    readout("x = 5. The balance is level. x = 5");
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("taking from one side tips it; that is not yet; undo puts it back", async () => {
    const onCheck = vi.fn();
    render(<Balance widget={w} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Take 1 from the left" }));
    readout("3x + 3 = 19. The right side is heavier.");
    expect(screen.getByRole("img", { name: "3x + 3 = 19. The right side is heavier." })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    readout("3x + 4 = 19. The balance is level.");
  });
});

describe("Coordinate", () => {
  const w: Extract<Widget, { kind: "coordinate" }> = { kind: "coordinate", min: -5, max: 5, targets: [[-3, 2], [4, -1]] };

  it("compares points as a set and toggles them", () => {
    expect(samePoints([[4, -1], [-3, 2]], w.targets)).toBe(true);
    expect(samePoints([[-3, 2]], w.targets)).toBe(false);
    expect(togglePoint(togglePoint([], [1, 1]), [1, 1])).toEqual([]);
  });

  it("plots both points by keyboard: arrow buttons, arrow keys and Enter", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<Coordinate widget={w} onCheck={onCheck} />);
    readout("Cursor at (0, 0). No points plotted yet.");
    await press(user, "Move left", 3);
    await press(user, "Move up", 2);
    await press(user, "Plot (−3, 2)");
    readout("Plotted: (−3, 2).");
    // Arrow keys move the cursor while an arrow button has focus.
    await tabTo(user, "Move right");
    await user.keyboard("{ArrowRight>7/}{ArrowDown>3/}");
    readout("Cursor at (4, −1).");
    await press(user, "Plot (4, −1)");
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("an extra point is not yet, and is marked", async () => {
    const onCheck = vi.fn();
    render(<Coordinate widget={{ ...w, targets: [[0, 0]] }} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Plot (0, 0)" }));
    await userEvent.click(screen.getByRole("button", { name: "Move up" }));
    await userEvent.click(screen.getByRole("button", { name: "Plot (0, 1)" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    expect(screen.getByText("Not one of the points")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Remove (0, 1)" })[1]);
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });
});

describe("Sequence", () => {
  const w: Extract<Widget, { kind: "sequence" }> = {
    kind: "sequence",
    items: [
      { id: "new", text: "New moon" },
      { id: "crescent", text: "Waxing crescent" },
      { id: "quarter", text: "First quarter" },
      { id: "gibbous", text: "Waxing gibbous" },
      { id: "full", text: "Full moon" },
    ],
  };
  const shown = () => screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent?.replace(/^Step \d+: /, ""));

  it("opens scrambled the same way every time, and moves swap neighbours", () => {
    expect(startOrder(w)).toEqual(startOrder(w));
    expect(startOrder(w)).not.toEqual(w.items.map((i) => i.id));
    expect(shift(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(shift(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });

  it("is put in order by keyboard, with focus following the step", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<Sequence widget={w} onCheck={onCheck} />);
    for (const [i, item] of w.items.entries()) {
      const at = shown().indexOf(item.text);
      if (at === i) continue;
      const up = await tabTo(user, `Move “${item.text}” up`);
      for (let k = at; k > i; k--) {
        await user.keyboard("{Enter}");
        expect(nameOf(document.activeElement)).toBe(`Move “${item.text}” up`);
      }
      expect(up.isConnected).toBe(true);
    }
    expect(shown()).toEqual(w.items.map((i) => i.text));
    readout("is now step");
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("checking a wrong order marks the steps that are out of place", async () => {
    const onCheck = vi.fn();
    render(<Sequence widget={w} onCheck={onCheck} />);
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    expect(screen.getAllByText("Not here yet").length).toBeGreaterThan(0);
  });
});

describe("SentenceBuilder", () => {
  const w: Extract<Widget, { kind: "sentence-builder" }> = { kind: "sentence-builder", words: ["Nia", "flies", "her", "kite."], answers: [["Nia", "flies", "her", "kite."]] };

  it("matches any listed answer exactly, and never opens on one", () => {
    expect(matchesAnswer(["a", "b"], [["b", "a"], ["a", "b"]])).toBe(true);
    expect(matchesAnswer(["a"], [["a", "b"]])).toBe(false);
    expect(bankOrder(w)).not.toEqual([0, 1, 2, 3]);
  });

  it("builds the sentence by keyboard; focus stays in the word bank", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<SentenceBuilder widget={w} onCheck={onCheck} />);
    readout("Tap words to build the sentence.");
    for (const word of w.answers[0]) await press(user, `Add “${word}”`);
    readout("Your sentence: Nia flies her kite.");
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });

  it("a word tapped in the sentence goes back; a wrong order is not yet", async () => {
    const onCheck = vi.fn();
    render(<SentenceBuilder widget={w} onCheck={onCheck} />);
    for (const word of ["her", "Nia", "flies", "kite."]) await userEvent.click(screen.getByRole("button", { name: `Add “${word}”` }));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole("button", { name: "Take out “her”" }));
    expect(screen.getByRole("button", { name: "Add “her”" })).toBeInTheDocument();
    readout("Your sentence: Nia flies kite.");
  });
});

describe("Sorter as a word sort", () => {
  const w: Extract<Widget, { kind: "sorter" }> = {
    kind: "sorter",
    categories: ["Noun", "Verb"],
    items: [
      { id: "cat", text: "cat", answer: 0 },
      { id: "run", text: "run", answer: 1 },
      { id: "hop", text: "hop", answer: 1 },
    ],
  };

  it("lays single words out as a word sort and sorts them by keyboard", async () => {
    expect(isWordSort(w)).toBe(true);
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(<Sorter widget={w} onCheck={onCheck} />);
    await press(user, "Put “cat” in Noun");
    await press(user, "Put “run” in Verb");
    await press(user, "Put “hop” in Verb");
    await press(user, "Check my answer");
    expect(onCheck).toHaveBeenLastCalledWith(true);
  });
});

describe("K–2 sizing and read-aloud", () => {
  const young = (ui: ReactElement) => render(<HearContext.Provider value={{ hear: true, young: true, locale: "en" }}>{ui}</HearContext.Provider>);

  it("the check result can be heard and the check button is 56px", async () => {
    young(<PlaceValue widget={{ kind: "place-value", target: 1, max: 9 }} />);
    expect(screen.getByRole("button", { name: "Check my answer" }).className).toContain("min-h-14");
    await userEvent.click(screen.getByRole("button", { name: "Add a one" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(screen.getByRole("button", { name: "Read aloud: That's right." })).toBeInTheDocument();
  });

  it("every word tile and sequence step can be heard", () => {
    young(<SentenceBuilder widget={{ kind: "sentence-builder", words: ["Hi", "Sam."], answers: [["Hi", "Sam."]] }} />);
    expect(screen.getByRole("button", { name: "Read aloud: Hi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read aloud: Sam." })).toBeInTheDocument();
  });
});
