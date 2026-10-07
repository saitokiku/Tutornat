import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addEvent, eventsOf } from "@/lib/school";
import { read, resetMemory } from "@/lib/store";
import { EventForm } from "./EventForm";

afterEach(() => resetMemory());

describe("EventForm", () => {
  it("opens with the kind and date a link asked for, focused on the form", () => {
    render(<EventForm profileId="p1" kind="homework" date="2026-10-12" classes={[]} locale="en" onDone={() => {}} />);
    expect(screen.getByRole("radio", { name: "Homework" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Test" })).not.toBeChecked();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-10-12");
    expect(screen.getByRole("heading", { name: "Add to the calendar" })).toHaveFocus();
  });

  it("adds a test by keyboard alone, showing the skill its name points to as linked", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EventForm profileId="p1" kind="quiz" date="2026-10-12" classes={[]} locale="en" onDone={onDone} />);
    await user.tab();
    expect(screen.getByLabelText("What")).toHaveFocus();
    await user.keyboard("Multiplication test");
    // Shown as linked before saving, with a way to remove it.
    expect(screen.getByRole("button", { name: "Remove: Multiplication facts to 10 × 10" })).toBeInTheDocument();
    expect(screen.getByText("Linked from the words you typed. Remove it if it's the wrong skill.")).toBeInTheDocument();
    // Into the kind group (on the chosen one), arrow to the previous kind: Test.
    await user.tab();
    expect(screen.getByRole("radio", { name: "Quiz" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Test" })).toBeChecked();
    await user.click(screen.getByLabelText("What"));
    await user.keyboard("{Enter}");
    const [saved] = eventsOf(read(), "p1");
    expect(saved).toMatchObject({ title: "Multiplication test", kind: "test", date: "2026-10-12", skillIds: ["m.mult.facts"] });
    expect(onDone).toHaveBeenCalledWith({ message: "Saved: Multiplication test, Oct 12.", date: "2026-10-12" });
  });

  it("saves no skill when the grown-up removes the one its name pointed to", async () => {
    const user = userEvent.setup();
    render(<EventForm profileId="p1" date="2026-10-12" classes={[]} locale="en" onDone={() => {}} />);
    await user.type(screen.getByLabelText("What"), "History test: the area around the Nile");
    await user.click(screen.getByRole("button", { name: "Remove: Area and perimeter of rectangles" }));
    // Focus goes to the skill search, not lost with the chip; the suggestion can be added back.
    expect(screen.getByRole("searchbox", { name: "Find a skill" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Link Area and perimeter of rectangles" })).toBeInTheDocument();
    expect(screen.queryByText(/Linked from the words you typed/)).toBeNull();
    // Typing more doesn't bring the guess back.
    await user.type(screen.getByLabelText("What"), " (Unit 2)");
    expect(screen.queryByRole("button", { name: "Remove: Area and perimeter of rectangles" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "History test: the area around the Nile (Unit 2)", skillIds: [] }]);
  });

  it("uses the skills a grown-up chose", async () => {
    const user = userEvent.setup();
    render(<EventForm profileId="p1" date="2026-10-12" classes={[]} locale="en" onDone={() => {}} />);
    await user.type(screen.getByLabelText("What"), "Fractions test");
    await user.type(screen.getByRole("searchbox", { name: "Find a skill" }), "equivalent");
    await user.click(screen.getByRole("button", { name: /Equivalent fractions/i }));
    await user.click(screen.getByRole("button", { name: "Remove: Name the fraction" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(eventsOf(read(), "p1")[0].skillIds).toEqual(["m.frac.equiv"]);
  });

  it("says what is missing and puts focus there", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EventForm profileId="p1" date="" classes={[]} locale="en" onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Give it a name.")).toBeInTheDocument();
    expect(screen.getByLabelText("What")).toHaveFocus();
    await user.type(screen.getByLabelText("What"), "Book report");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Pick a date.")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveFocus();
    expect(onDone).not.toHaveBeenCalled();
    expect(eventsOf(read(), "p1")).toEqual([]);
  });

  it("edits an item and deletes it only after a confirm step, keeping focus on the question", async () => {
    const user = userEvent.setup();
    const e = addEvent("p1", { title: "Unit 2 test", kind: "test", date: "2026-10-15", skillIds: [] })!;
    const onDone = vi.fn();
    render(<EventForm profileId="p1" event={e} classes={[]} locale="en" onDone={onDone} />);
    expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument();
    // No guessed skill when editing: a grown-up who cleared the skills meant it.
    expect(screen.queryByText(/Linked from the words you typed/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(eventsOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Delete Unit 2 test?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toHaveFocus();
    await user.keyboard("{Tab}{Enter}");
    // Cancel: focus is back on Delete.
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(eventsOf(read(), "p1")).toEqual([]);
    expect(onDone).toHaveBeenCalledWith({ message: "Deleted: Unit 2 test." });
  });
});
