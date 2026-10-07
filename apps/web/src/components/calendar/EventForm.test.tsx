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

  it("adds a test by keyboard alone, linking the first suggested skill", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EventForm profileId="p1" kind="quiz" date="2026-10-12" classes={[]} locale="en" onDone={onDone} />);
    await user.tab();
    expect(screen.getByLabelText("What")).toHaveFocus();
    await user.keyboard("Multiplication test");
    expect(screen.getByText("If you don't pick one, the first suggestion is linked when you save.")).toBeInTheDocument();
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

  it("uses the skills a grown-up chose instead of the suggestion", async () => {
    const user = userEvent.setup();
    render(<EventForm profileId="p1" date="2026-10-12" classes={[]} locale="en" onDone={() => {}} />);
    await user.type(screen.getByLabelText("What"), "Fractions test");
    await user.type(screen.getByRole("searchbox", { name: "Find a skill" }), "equivalent");
    await user.click(screen.getByRole("button", { name: /Equivalent fractions/i }));
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

  it("edits an item and deletes it only after a confirm step", async () => {
    const user = userEvent.setup();
    const e = addEvent("p1", { title: "Unit 2 test", kind: "test", date: "2026-10-15", skillIds: [] })!;
    const onDone = vi.fn();
    render(<EventForm profileId="p1" event={e} classes={[]} locale="en" onDone={onDone} />);
    expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument();
    // No auto-link when editing: a grown-up who cleared the skills meant it.
    expect(screen.queryByText(/first suggestion is linked/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(eventsOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByText("Delete Unit 2 test?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(eventsOf(read(), "p1")).toEqual([]);
    expect(onDone).toHaveBeenCalledWith({ message: "Deleted: Unit 2 test." });
  });
});
