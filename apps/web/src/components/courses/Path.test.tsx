import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addFromCatalogue, pathOf } from "@/lib/courses";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { SubjectPath } from "./Path";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => resetMemory());

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const addedAt = (id: string, at: number) => update((s) => void (s.courses.find((c) => c.id === id)!.createdAt = at));
const rows = () => within(screen.getByRole("list", { name: "Math path" })).getAllByRole("listitem");
const rowTitles = () => rows().map((li) => within(li).getAllByRole("link")[0].textContent);

function twoCourses() {
  const a = addFromCatalogue("math-add-number-line", learner.id)!;
  const b = addFromCatalogue("math-fractions", learner.id)!;
  addedAt(a, 1);
  addedAt(b, 2);
  return { a, b };
}

describe("SubjectPath", () => {
  it("lists the path in order with progress, the next lesson and a way to start", () => {
    twoCourses();
    render(<SubjectPath subject="math" learner={learner} now={0} />);
    expect(screen.getByRole("heading", { name: "Math" })).toBeInTheDocument();
    expect(rowTitles()).toEqual(["Adding on the number line", "Fractions: parts of a whole"]);
    const first = rows()[0];
    expect(within(first).getByText(/0 of 4 lessons finished/)).toBeInTheDocument();
    expect(within(first).getByText("Next: Start, then jump")).toBeInTheDocument();
    expect(within(first).getByText("Written by people")).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: "Start: Adding on the number line" })).toHaveAttribute("href", expect.stringMatching(/^\/learn\/.+\/jump-forward$/));
    expect(screen.getByText(/0 proved · 0 practicing · \d+ skills on the map/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Math skill map" })).toHaveAttribute("href", "/practice?subject=math");
  });

  it("reorders with the keyboard alone, keeps focus on the moved course and says where it went", async () => {
    const { a } = twoCourses();
    render(<SubjectPath subject="math" learner={learner} now={0} />);
    const up = screen.getByRole("button", { name: "Move “Adding on the number line” up" });
    expect(up).toBeDisabled();
    // Tab to the first course's "down" button, then press Enter.
    const down = screen.getByRole("button", { name: "Move “Adding on the number line” down" });
    for (let i = 0; i < 12 && document.activeElement !== down; i++) await userEvent.tab();
    expect(down).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(rowTitles()).toEqual(["Fractions: parts of a whole", "Adding on the number line"]);
    expect(screen.getByRole("status")).toHaveTextContent("“Adding on the number line” is now 2 of 2 on your Math path.");
    // At the bottom now, "down" is disabled, so focus lands on its "up" button.
    await waitFor(() => expect(screen.getByRole("button", { name: "Move “Adding on the number line” up" })).toHaveFocus());
    // Saved: a fresh read of the store has the same order.
    resetMemory();
    expect(pathOf(read(), learner.id, "math").map((c) => c.id).at(-1)).toBe(a);
    // Space works too, and moves it back.
    await userEvent.keyboard(" ");
    expect(rowTitles()).toEqual(["Adding on the number line", "Fractions: parts of a whole"]);
  });

  it("a course from a grown-up comes first and says so", () => {
    twoCourses();
    addFromCatalogue("math-negative", learner.id, { assigned: true });
    render(<SubjectPath subject="math" learner={learner} now={0} />);
    expect(rowTitles()[0]).toBe("Negative numbers and the number line");
    expect(within(rows()[0]).getByText("From a grown-up")).toBeInTheDocument();
  });

  it("suggests the next ready-made course and adds it from the keyboard", async () => {
    render(<SubjectPath subject="math" learner={learner} now={0} />);
    expect(screen.getByText("No Math courses on your path yet.")).toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add to my path: Multiplying bigger numbers" });
    expect(screen.getByText(/Suggested next for Grade 4/)).toBeInTheDocument();
    add.focus();
    await userEvent.keyboard("{Enter}");
    expect(rowTitles()).toEqual(["Multiplying bigger numbers"]);
    await waitFor(() => expect(screen.getByRole("link", { name: "Multiplying bigger numbers" })).toHaveFocus());
    expect(read().acts).toEqual([expect.objectContaining({ kind: "course", intent: "course-finished" })]);
    // The next suggestion takes its place.
    expect(screen.getByRole("button", { name: "Add to my path: Decimals and place value" })).toBeInTheDocument();
  });

  it("K–2 learners get 56px targets: start, move, add and the skill map", () => {
    addFromCatalogue("math-add-number-line", "k1");
    render(<SubjectPath subject="math" learner={{ ...learner, id: "k1", grade: "1" }} now={0} />);
    expect(screen.getByRole("link", { name: "Start: Adding on the number line" }).className).toContain("min-h-14");
    expect(screen.getByRole("button", { name: "Move “Adding on the number line” up" }).className).toContain("size-14");
    expect(screen.getByRole("button", { name: "Move “Adding on the number line” down" }).className).toContain("size-14");
    expect(screen.getByRole("button", { name: /^Add to my path: / }).className).toContain("min-h-14");
    expect(screen.getByRole("link", { name: "Math skill map" }).className).toContain("min-h-14");
  });

  it("older learners keep 44px targets", () => {
    addFromCatalogue("math-add-number-line", learner.id);
    render(<SubjectPath subject="math" learner={learner} now={0} />);
    expect(screen.getByRole("button", { name: "Move “Adding on the number line” up" }).className).toContain("size-11");
    expect(screen.getByRole("link", { name: "Math skill map" }).className).toContain("min-h-11");
  });
});
