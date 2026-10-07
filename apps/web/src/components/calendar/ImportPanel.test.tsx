import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addClass, classesOf, eventsOf } from "@/lib/school";
import { read, resetMemory } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import { ImportPanel } from "./ImportPanel";

vi.mock("@/lib/ai/client", () => ({ useAiMode: () => "demo" }));

const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const soon = addDays(localDate(Date.now()), 3);
const FEED = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:u1", `DTSTART;VALUE=DATE:${soon.replace(/-/g, "")}`, "SUMMARY:Unit 3 Test", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
const serve = (res: () => Response) => vi.stubGlobal("fetch", vi.fn(async () => res()));

afterEach(() => {
  vi.unstubAllGlobals();
  resetMemory();
});

describe("ImportPanel", () => {
  it("reads pasted text, shows every item for review, and saves only after the grown-up confirms", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} onDone={onDone} />);
    expect(screen.getByRole("heading", { name: "Bring in school dates" })).toHaveFocus();
    const [m, d] = [Number(soon.slice(5, 7)), Number(soon.slice(8, 10))];
    await user.type(screen.getByLabelText("School text to read"), `Multiplication test - ${m}/${d}{Enter}Bring a permission slip`);
    await user.click(screen.getByRole("button", { name: "Find the dates" }));
    expect(screen.getByText("Found 1. Check the name, date and type, then save.")).toHaveFocus();
    expect(screen.getByLabelText("Date: Multiplication test")).toHaveValue(soon);
    expect(screen.getByLabelText("Type: Multiplication test")).toHaveValue("test");
    expect(eventsOf(read(), "p1")).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Multiplication test", date: soon, kind: "test", source: "paste", skillIds: ["m.mult.facts"] }]);
    expect(onDone).toHaveBeenCalledWith("Saved: 1 new, 0 updated.", soon);
  });

  it("brings in a class calendar link by keyboard and keeps the link on a new class", async () => {
    const user = userEvent.setup();
    serve(() => new Response(FEED, { headers: { "content-type": "text/calendar" } }));
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} initialTab="link" onDone={onDone} />);
    expect(screen.getByRole("button", { name: "Calendar link" })).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Calendar link (iCal / .ics address)"), "webcal://school.example/math.ics");
    await user.type(screen.getByLabelText("Class name"), "Math 6");
    await user.selectOptions(screen.getByLabelText("Subject"), "math");
    await user.click(screen.getByRole("button", { name: "Get the events" }));
    expect(await screen.findByText("Found 1. Check the name, date and type, then save.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    const [cls] = classesOf(read(), "p1");
    expect(cls).toMatchObject({ name: "Math 6", feedUrl: "webcal://school.example/math.ics" });
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Unit 3 Test", uid: "u1", classId: cls.id, source: "ics" }]);
    expect(onDone).toHaveBeenCalledWith("Saved: 1 new, 0 updated. Math 6 keeps the link, so Refresh brings in changes later.", soon);
  });

  it("opens on the link tab for a chosen class and says plainly when a link can't be read", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Science", subject: "science" })!;
    serve(() => Response.json({ error: "blocked" }, { status: 400 }));
    render(<ImportPanel profile={ada} classes={classesOf(read(), "p1")} initialTab="link" initialClassId={cls.id} onDone={() => {}} />);
    expect(screen.getByLabelText("Which class is this calendar for?")).toHaveValue(cls.id);
    expect(screen.queryByLabelText("Class name")).toBeNull();
    await user.type(screen.getByLabelText("Calendar link (iCal / .ics address)"), "https://192.168.0.2/cal.ics");
    await user.click(screen.getByRole("button", { name: "Get the events" }));
    expect(await screen.findByText("That address can't be read from here.")).toBeInTheDocument();
    serve(() => Response.json({ error: "timeout" }, { status: 502 }));
    await user.click(screen.getByRole("button", { name: "Get the events" }));
    expect(await screen.findByText("The calendar took too long to answer. Try again in a moment.")).toBeInTheDocument();
    expect(classesOf(read(), "p1")[0].feedUrl).toBeUndefined();
  });

  it("reads a calendar file and, the second time, updates instead of duplicating", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const file = () => new File([FEED], "class.ics", { type: "text/calendar" });
    const { unmount } = render(<ImportPanel profile={ada} classes={[]} initialTab="file" onDone={onDone} />);
    await user.upload(screen.getByLabelText("Choose an .ics file"), file());
    await user.click(await screen.findByRole("button", { name: "Save 1" }));
    unmount();
    render(<ImportPanel profile={ada} classes={[]} initialTab="file" onDone={onDone} />);
    await user.upload(screen.getByLabelText("Choose an .ics file"), file());
    await user.click(await screen.findByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toHaveLength(1);
    expect(onDone).toHaveBeenLastCalledWith("Saved: 0 new, 0 updated, 1 already here.", soon);
  });

  it("points photos to the magic box on Today", async () => {
    const user = userEvent.setup();
    render(<ImportPanel profile={ada} classes={[]} onDone={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(screen.getByText("To bring in a photo of a syllabus, worksheet or graded test, use the magic box on Today.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to profiles" })).toHaveAttribute("href", "/profiles");
  });

  it("closes without saving", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onDone).toHaveBeenCalledWith();
  });
});
