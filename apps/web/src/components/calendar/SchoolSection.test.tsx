import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addClass, addEvent, classesOf, eventsOf, resultsOf } from "@/lib/school";
import { read, resetMemory, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { SchoolSection } from "./SchoolSection";

const NOW = new Date("2026-10-07T16:00:00").getTime();
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };

function Live({ onLinkCalendar = () => {} }: { onLinkCalendar?: (id: string) => void }) {
  const classes = useStore((s) => classesOf(s, "p1"));
  return <SchoolSection profile={ada} classes={classes} now={NOW} onLinkCalendar={onLinkCalendar} />;
}
const row = (name: string) => screen.getByText(name, { selector: "span" }).closest("li")!;

afterEach(() => {
  vi.unstubAllGlobals();
  resetMemory();
});

describe("SchoolSection", () => {
  it("refreshes a linked class calendar and says what changed", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Math 6", subject: "math", feedUrl: "https://school.example/m.ics" })!;
    const feed = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:u9", "DTSTART;VALUE=DATE:20261012", "SUMMARY:Unit 3 Test", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feed)));
    render(<Live />);
    await user.click(within(row("Math 6")).getByRole("button", { name: "Refresh: Math 6" }));
    expect(await within(row("Math 6")).findByRole("status")).toHaveTextContent("1 new, 0 changed.");
    expect(eventsOf(read(), "p1")).toMatchObject([{ uid: "u9", classId: cls.id }]);
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

  it("deletes a class only after a confirm step, keeping its items", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Art", subject: "other" })!;
    addEvent("p1", { title: "Clay project", kind: "project", date: "2026-10-20", classId: cls.id });
    render(<Live />);
    await user.click(screen.getByRole("button", { name: "Delete: Art" }));
    expect(classesOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByText("Delete Art? Its items stay on the calendar.", { selector: "span" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(classesOf(read(), "p1")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Delete: Art" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(classesOf(read(), "p1")).toEqual([]);
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Clay project", classId: undefined }]);
  });

  it("edits a class and can forget its calendar link", async () => {
    const user = userEvent.setup();
    addClass("p1", { name: "Math", subject: "math", feedUrl: "https://school.example/m.ics" });
    render(<Live />);
    await user.click(screen.getByRole("button", { name: "Edit: Math" }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    await user.clear(within(form).getByLabelText("Class name"));
    await user.type(within(form).getByLabelText("Class name"), "Math 6");
    await user.type(within(form).getByLabelText("Teacher"), "Ms. Rivera");
    await user.click(within(form).getByRole("button", { name: "Forget the calendar link" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(classesOf(read(), "p1")[0]).toMatchObject({ name: "Math 6", teacher: "Ms. Rivera" });
    expect(classesOf(read(), "p1")[0].feedUrl).toBeUndefined();
    expect(screen.getByRole("button", { name: "Link calendar: Math 6" })).toBeInTheDocument();
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

  it("turns a teacher's note into practice, linking the suggested skill", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.type(screen.getByLabelText("Teacher's note"), "Needs more practice with borrowing");
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(read().feedback).toMatchObject([{ text: "Needs more practice with borrowing", skillIds: ["m.sub.2digit"] }]);
    expect(screen.getByText(/practice: Subtract/)).toBeInTheDocument();
  });
});
