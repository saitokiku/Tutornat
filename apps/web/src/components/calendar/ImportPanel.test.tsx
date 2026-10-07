import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addClass, addEvent, classesOf, eventsOf } from "@/lib/school";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { icsDrafts, type FeedClass } from "@/lib/week";
import { addDays, localDate } from "@/planner/dates";
import { ImportPanel } from "./ImportPanel";

vi.mock("@/lib/ai/client", () => ({ useAiMode: () => "demo" }));
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));

const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const today = localDate(Date.now());
const soon = addDays(today, 3);
const vevent = (uid: string, date: string, title: string) => ["BEGIN:VEVENT", `UID:${uid}`, `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`, `SUMMARY:${title}`, "END:VEVENT"];
const cal = (...events: string[][]) => ["BEGIN:VCALENDAR", ...events.flat(), "END:VCALENDAR"].join("\r\n");
const FEED = cal(vevent("u1", soon, "Unit 3 Test"));
const serve = (res: () => Response) => vi.stubGlobal("fetch", vi.fn(async () => res()));
const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

afterEach(() => {
  vi.unstubAllGlobals();
  nav.push.mockReset();
  resetMemory();
});

describe("ImportPanel", () => {
  it("reads pasted text, shows every item for review, and saves only after the grown-up confirms", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} onDone={onDone} />);
    expect(screen.getByRole("heading", { name: "Bring in school dates" })).toHaveFocus();
    await user.type(screen.getByLabelText("School text to read"), `Multiplication test - ${md(soon)}{Enter}Bring a permission slip`);
    await user.click(screen.getByRole("button", { name: "Find the dates" }));
    expect(screen.getByText("Found 1. Check the name, date and type, then save.")).toHaveFocus();
    expect(screen.getByLabelText("Date: Multiplication test")).toHaveValue(soon);
    expect(screen.getByLabelText("Type: Multiplication test")).toHaveValue("test");
    expect(eventsOf(read(), "p1")).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Multiplication test", date: soon, kind: "test", source: "paste" }]);
    expect(eventsOf(read(), "p1")[0].skillIds).toContain("m.mult.facts");
    expect(onDone).toHaveBeenCalledWith("Saved: 1 new, 0 updated.", soon);
  });

  it("keeps focus where the grown-up is while they fix names, dates and what to leave out", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const later = addDays(today, 5);
    render(<ImportPanel profile={ada} classes={[]} initialTab="file" onDone={onDone} />);
    await user.upload(screen.getByLabelText("Choose an .ics file"), new File([cal(vevent("u1", soon, "Unit 3 Test"), vevent("u2", later, "Picture day"))], "class.ics"));
    expect(await screen.findByText("Found 2. Check the names, dates and types, then save.")).toHaveFocus();
    const name = screen.getByLabelText("What: Unit 3 Test");
    await user.clear(name);
    await user.type(name, "Unit 3 Test (fractions)");
    expect(name).toHaveFocus();
    expect(name).toHaveValue("Unit 3 Test (fractions)");
    // The row keeps its name while it is edited.
    expect(screen.getByLabelText("What: Unit 3 Test")).toBe(name);
    const skip = screen.getByRole("checkbox", { name: "Include: Picture day" });
    await user.click(skip);
    expect(skip).toHaveFocus();
    expect(skip).not.toBeChecked();
    await user.keyboard(" ");
    expect(skip).toBeChecked();
    await user.keyboard(" ");
    await user.selectOptions(screen.getByLabelText("Type: Unit 3 Test"), "quiz");
    expect(screen.getByLabelText("Type: Unit 3 Test")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Unit 3 Test (fractions)", kind: "quiz", date: soon }]);
  });

  it("shows guessed skills as chips that can be removed before saving", async () => {
    const user = userEvent.setup();
    render(<ImportPanel profile={ada} classes={[]} onDone={() => {}} />);
    await user.type(screen.getByLabelText("School text to read"), `History test: the area around the Nile - ${md(soon)}`);
    await user.click(screen.getByRole("button", { name: "Find the dates" }));
    const row = screen.getByRole("listitem");
    const remove = within(row).getByRole("button", { name: /^Remove Area and perimeter of rectangles from History test/ });
    await user.click(remove);
    expect(within(row).queryByText(/Area and perimeter/)).toBeNull();
    // Focus goes back to the row's name rather than being lost.
    expect(within(row).getByRole("textbox")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ kind: "test", skillIds: [] }]);
  });

  it("finds last week's items when the same text is pasted again", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    addEvent("p1", { title: "Spelling quiz", kind: "quiz", date: soon, skillIds: [] });
    render(<ImportPanel profile={ada} classes={[]} onDone={onDone} />);
    await user.type(screen.getByLabelText("School text to read"), `Spelling quiz ${md(soon)}`);
    await user.click(screen.getByRole("button", { name: "Find the dates" }));
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toHaveLength(1);
    expect(onDone).toHaveBeenCalledWith("Saved: 0 new, 0 updated, 1 already here.", soon);
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
    expect(cls).toMatchObject({ name: "Math 6", feedUrl: "webcal://school.example/math.ics", seenUids: ["u1"] });
    expect(eventsOf(read(), "p1")).toMatchObject([{ title: "Unit 3 Test", uid: "u1", classId: cls.id, source: "ics" }]);
    expect(onDone).toHaveBeenCalledWith("Saved: 1 new, 0 updated. Math 6 keeps the link, so Refresh brings in changes later.", soon);
  });

  it("keeps a link whose calendar has nothing coming up yet", async () => {
    const user = userEvent.setup();
    serve(() => new Response(cal(vevent("old", addDays(today, -40), "Last term's final")), { headers: { "content-type": "text/calendar" } }));
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} initialTab="link" onDone={onDone} />);
    await user.type(screen.getByLabelText("Calendar link (iCal / .ics address)"), "https://school.example/sci.ics");
    await user.type(screen.getByLabelText("Class name"), "Science 6");
    await user.click(screen.getByRole("button", { name: "Get the events" }));
    expect(await screen.findByText("That calendar has nothing coming up yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep the link on Science 6" }));
    expect(classesOf(read(), "p1")).toMatchObject([{ name: "Science 6", feedUrl: "https://school.example/sci.ics" }]);
    expect(onDone).toHaveBeenCalledWith("Science 6 keeps the link. Refresh brings in dates once the school adds them.");
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

  it("reviews only what a refresh found new, and remembers what was left out", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Math 6", subject: "math", feedUrl: "https://school.example/m.ics" })!;
    const drafts = icsDrafts(read(), "p1", cal(vevent("n1", soon, "Unit 4 Test"), vevent("n2", soon, "Class meeting")), today, cls.id);
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={classesOf(read(), "p1")} review={{ classId: cls.id, drafts }} onDone={onDone} />);
    expect(screen.getByRole("heading", { name: "New on Math 6's calendar" })).toHaveFocus();
    expect(screen.queryByRole("group", { name: "How to import" })).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Include: Class meeting" }));
    await user.click(screen.getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ uid: "n1", classId: cls.id }]);
    expect((classesOf(read(), "p1")[0] as FeedClass).seenUids).toEqual(["n1", "n2"]);
    expect(onDone).toHaveBeenCalledWith("Saved: 1 new, 0 updated.", soon);
  });

  it("can leave everything a refresh found out", async () => {
    const user = userEvent.setup();
    const cls = addClass("p1", { name: "Math 6", subject: "math", feedUrl: "https://school.example/m.ics" })!;
    const drafts = icsDrafts(read(), "p1", cal(vevent("n2", soon, "Class meeting")), today, cls.id);
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={classesOf(read(), "p1")} review={{ classId: cls.id, drafts }} onDone={onDone} />);
    await user.click(screen.getByRole("checkbox", { name: "Include: Class meeting" }));
    await user.click(screen.getByRole("button", { name: "Leave them all out" }));
    expect(eventsOf(read(), "p1")).toEqual([]);
    expect(onDone).toHaveBeenCalledWith("Left out 1. Refresh won't bring it back.");
  });

  it("points photos to the magic box on Today, and takes a grown-up there in one step", async () => {
    const user = userEvent.setup();
    update((s) => {
      s.profiles.push(ada);
      s.session = { accountId: "a1", profileId: "parent", unlocked: true };
    });
    render(<ImportPanel profile={ada} classes={[]} onDone={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(screen.getByText("To bring in a photo of a syllabus, worksheet or graded test, use the magic box on Today.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open Ada's Today" }));
    expect(read().session.profileId).toBe("p1");
    expect(nav.push).toHaveBeenCalledWith("/home");
  });

  it("closes without saving", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ImportPanel profile={ada} classes={[]} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onDone).toHaveBeenCalledWith();
  });
});
