import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addClass, addEvent, classesOf, eventsOf, resultsOf, type Draft } from "@/lib/school";
import { read, resetMemory, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { saveImport } from "@/lib/week";
import { decimal, SchoolSection } from "./SchoolSection";

const NOW = new Date("2026-10-07T16:00:00").getTime();
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const FEED = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:u9", "DTSTART;VALUE=DATE:20261012", "SUMMARY:Unit 3 Test", "END:VEVENT", "END:VCALENDAR"].join("\r\n");

function Live({ onLinkCalendar = () => {}, onReview = () => {} }: { onLinkCalendar?: (id: string) => void; onReview?: (id: string, drafts: Draft[]) => void }) {
  const classes = useStore((s) => classesOf(s, "p1"));
  return <SchoolSection profile={ada} classes={classes} now={NOW} onLinkCalendar={onLinkCalendar} onReview={onReview} />;
}
const row = (name: string) => screen.getByText(name, { selector: "span" }).closest("li")!;

afterEach(() => {
  vi.unstubAllGlobals();
  resetMemory();
});

describe("SchoolSection", () => {
  it("refreshes a linked class calendar: new items wait for review, changes say what changed", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Math 6", subject: "math", feedUrl: "https://school.example/m.ics" })!;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED)));
    const onReview = vi.fn();
    render(<Live onReview={onReview} />);
    await user.click(within(row("Math 6")).getByRole("button", { name: "Refresh: Math 6" }));
    expect(await within(row("Math 6")).findByRole("status")).toHaveTextContent("1 new to review.");
    expect(eventsOf(read(), "p1")).toEqual([]);
    await user.click(within(row("Math 6")).getByRole("button", { name: "Review 1 new" }));
    expect(onReview).toHaveBeenCalledWith(cls.id, [expect.objectContaining({ uid: "u9", title: "Unit 3 Test", classId: cls.id })]);
    // Once it is saved, Refresh has nothing new.
    saveImport("p1", onReview.mock.calls[0][1], "ics", { url: cls.feedUrl!, classId: cls.id });
    await user.click(within(row("Math 6")).getByRole("button", { name: "Refresh: Math 6" }));
    expect(await within(row("Math 6")).findByText("Up to date, nothing new.")).toBeInTheDocument();
    expect(eventsOf(read(), "p1")).toHaveLength(1);
  });

  it("offers to link a calendar for a class without one", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn();
    const cls = addClass("p1", { name: "Science", subject: "science" })!;
    render(<Live onLinkCalendar={onLink} />);
    await user.click(screen.getByRole("button", { name: "Link calendar: Science" }));
    expect(onLink).toHaveBeenCalledWith(cls.id);
  });

  it("deletes a class only after a confirm step, keeping its items and the keyboard user's place", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Art", subject: "other" })!;
    addEvent("p1", { title: "Clay project", kind: "project", date: "2026-10-20", classId: cls.id });
    render(<Live />);
    await user.click(screen.getByRole("button", { name: "Delete: Art" }));
    expect(classesOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Delete Art? Its items stay on the calendar." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(classesOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Delete: Art" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(classesOf(read(), "p1")).toEqual([]);
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Clay project", classId: undefined }]);
    expect(screen.getByRole("heading", { name: "Classes" })).toHaveFocus();
  });

  it("edits a class, with focus in the form and back on the pen after", async () => {
    const user = userEvent.setup();
    addClass("p1", { name: "Math", subject: "math" });
    render(<Live />);
    await user.click(screen.getByRole("button", { name: "Edit: Math" }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    expect(within(form).getByLabelText("Class name")).toHaveFocus();
    await user.keyboard("{Control>}a{/Control}Math 6");
    await user.type(within(form).getByLabelText("Teacher"), "Ms. Rivera");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(classesOf(read(), "p1")[0]).toMatchObject({ name: "Math 6", teacher: "Ms. Rivera" });
    expect(screen.getByRole("button", { name: "Edit: Math 6" })).toHaveFocus();
  });

  it("forgets a calendar link only on Save; Cancel keeps it", async () => {
    const user = userEvent.setup();
    addClass("p1", { name: "Math", subject: "math", feedUrl: "https://school.example/m.ics" });
    render(<Live />);
    await user.click(screen.getByRole("button", { name: "Edit: Math" }));
    let form = screen.getByRole("form", { name: "Edit Math" });
    await user.click(within(form).getByRole("button", { name: "Forget the calendar link" }));
    expect(within(form).getByRole("status")).toHaveTextContent("The link will be forgotten when you save.");
    expect(classesOf(read(), "p1")[0].feedUrl).toBe("https://school.example/m.ics");
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(classesOf(read(), "p1")[0].feedUrl).toBe("https://school.example/m.ics");
    expect(screen.getByRole("button", { name: "Refresh: Math" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit: Math" }));
    form = screen.getByRole("form", { name: "Edit Math" });
    // Changing one's mind inside the form keeps it too.
    await user.click(within(form).getByRole("button", { name: "Forget the calendar link" }));
    await user.click(within(form).getByRole("button", { name: "Keep the link" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(classesOf(read(), "p1")[0].feedUrl).toBe("https://school.example/m.ics");

    await user.click(screen.getByRole("button", { name: "Edit: Math" }));
    form = screen.getByRole("form", { name: "Edit Math" });
    await user.click(within(form).getByRole("button", { name: "Forget the calendar link" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(classesOf(read(), "p1")[0].feedUrl).toBeUndefined();
    expect(screen.getByRole("button", { name: "Link calendar: Math" })).toBeInTheDocument();
  });

  it("keeps scores from school labelled as such, and says when one doesn't add up", async () => {
    const user = userEvent.setup();
    render(<Live />);
    const form = screen.getByRole("form", { name: "Add score" });
    await user.type(within(form).getByLabelText("Test or assignment"), "Unit 2 test");
    await user.type(within(form).getByLabelText("Score"), "45");
    await user.type(within(form).getByLabelText("Out of"), "0");
    await user.click(within(form).getByRole("button", { name: "Add score" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Check the score and what it's out of.");
    await user.clear(within(form).getByLabelText("Out of"));
    await user.type(within(form).getByLabelText("Out of"), "50");
    await user.click(within(form).getByRole("button", { name: "Add score" }));
    expect(resultsOf(read(), "p1")).toMatchObject([{ title: "Unit 2 test", score: 45, outOf: 50 }]);
    expect(screen.getByText("45 / 50").closest("li")).toHaveTextContent(/Unit 2 test.*· from school/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reads a decimal comma as a decimal point", async () => {
    expect(["8,5", "8.5", "8,5,1", " 9 ", "1,5"].map(decimal)).toEqual(["8.5", "8.5", "8.51", "9", "1.5"]);
    const user = userEvent.setup();
    render(<Live />);
    const form = screen.getByRole("form", { name: "Add score" });
    await user.type(within(form).getByLabelText("Test or assignment"), "Quiz 3");
    await user.type(within(form).getByLabelText("Score"), "8,5");
    expect(within(form).getByLabelText("Score")).toHaveValue("8.5");
    await user.type(within(form).getByLabelText("Out of"), "10");
    await user.click(within(form).getByRole("button", { name: "Add score" }));
    expect(resultsOf(read(), "p1")).toMatchObject([{ score: 8.5, outOf: 10 }]);
    expect(screen.getByText("8.5 / 10")).toBeInTheDocument();
  });

  it("turns a teacher's note into practice, showing the suggested skill as linked first", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.type(screen.getByLabelText("Teacher's note"), "Needs more practice with borrowing");
    expect(screen.getByRole("button", { name: /^Remove: Subtract/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(read().feedback).toMatchObject([{ text: "Needs more practice with borrowing", skillIds: ["m.sub.2digit"] }]);
    expect(screen.getByText(/practice: Subtract/)).toBeInTheDocument();
  });

  it("saves a note with no skill when the grown-up removes the guess", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.type(screen.getByLabelText("Teacher's note"), "Borrowing books from the library on time");
    await user.click(screen.getByRole("button", { name: /^Remove: Subtract/ }));
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(read().feedback).toMatchObject([{ skillIds: [] }]);
    expect(screen.getByText(/no skill linked yet/)).toBeInTheDocument();
  });
});
