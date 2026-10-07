import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bandOf, catalogueFor } from "@/catalogue";
import { HearContext } from "@/components/stage/hear";
import { continueTarget } from "@/lib/continue";
import { todayPlan, todayStatus } from "@/lib/plan";
import { read, resetMemory, update } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import { ComingUp } from "./ComingUp";
import { CoursesInProgress } from "./CoursesInProgress";
import { PickTiles } from "./Picks";
import { StatusStrip } from "./StatusStrip";
import { TodayPlan } from "./TodayPlan";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const NOW = new Date("2026-10-07T16:00:00").getTime();
const DATE = localDate(NOW);
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0, settings: { subjects: ["math", "english", "science"], dailyMinutes: 30 } };
const leo: Profile = { id: "p2", accountId: "a1", nickname: "Leo", grade: "K", locale: "en", color: "#000", createdAt: 0 };

function seed(p: Profile) {
  update((s) => {
    s.accounts.push({ id: "a1", email: "a@b.co", displayName: "Sam", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(p);
    s.session = { accountId: "a1", profileId: p.id };
  });
}
const young = (children: ReactNode) => <HearContext.Provider value={{ hear: true, young: true, locale: "en" }}>{children}</HearContext.Provider>;
const plan = (p: Profile, now = NOW) => todayPlan(read(), p, now);
const speakers = () => screen.getAllByRole("button", { name: /^Read aloud:/ });
const starts = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

const lesson = (id: string): Lesson => ({ id, title: `Lesson ${id}`, summary: "", minutes: 8, scenes: [] });
const course = (o: Partial<Course> & { id: string; profileId: string }): Course => ({
  title: `Course ${o.id}`,
  goal: "",
  subject: "science",
  grade: "4",
  locale: "en",
  origin: "generated",
  status: "ready",
  length: "short",
  sources: [],
  lessons: [lesson("a"), lesson("b"), lesson("c")],
  template: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...o,
});

beforeEach(() => {
  push.mockClear();
  // Taps file their work under the day they happen; the tests pin that day.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  resetMemory();
});

describe("TodayPlan", () => {
  it("starts any line, in any order, from the keyboard", async () => {
    seed(ada);
    const user = userEvent.setup();
    render(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    // Math leads as the suggestion; English and Science are rows below it.
    expect(within(document.getElementById("next")!).getByText(/^Math: /)).toBeInTheDocument();
    const science = screen.getByRole("button", { name: /^Start, Science:/ });
    const english = screen.getByRole("button", { name: /^Start, English:/ });

    // Tab to the last row first, and press Enter.
    for (let i = 0; i < 20 && document.activeElement !== science; i++) await user.tab();
    expect(science).toHaveFocus();
    await user.keyboard("{Enter}");
    const scienceSet = read().sets.find((x) => x.planKey === `${DATE}:daily:science`)!;
    expect(push).toHaveBeenLastCalledWith(`/practice/${scienceSet.id}?from=today`);

    // Then back up to English and press Space.
    for (let i = 0; i < 20 && document.activeElement !== english; i++) await user.tab({ shift: true });
    expect(english).toHaveFocus();
    await user.keyboard(" ");
    const englishSet = read().sets.find((x) => x.planKey === `${DATE}:daily:english`)!;
    expect(push).toHaveBeenLastCalledWith(`/practice/${englishSet.id}?from=today`);

    // Nothing else was started: two taps, two sets, and Math still waits.
    expect(read().sets).toHaveLength(2);
    expect(read().sets.some((x) => x.planKey === `${DATE}:daily:math`)).toBe(false);
  });

  it("K–2: starts a tile, then the Next card, in that order, from the keyboard", async () => {
    seed(leo);
    const user = userEvent.setup();
    render(young(<TodayPlan plan={plan(leo)} learner={leo} now={NOW} young />));
    const tile = screen.getByRole("button", { name: /^English: Letter sounds/ });
    for (let i = 0; i < 20 && document.activeElement !== tile; i++) await user.tab();
    expect(tile).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(read().sets.map((x) => x.planKey)).toEqual([`${DATE}:daily:english`]);
    const next = screen.getByRole("button", { name: /^Start, Math: Count up to 10/ });
    for (let i = 0; i < 20 && document.activeElement !== next; i++) await user.tab({ shift: true });
    expect(next).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(read().sets.map((x) => x.planKey)).toEqual([`${DATE}:daily:english`, `${DATE}:daily:math`]);
  });

  it("files a set under the day of the tap when the screen was left open overnight", async () => {
    seed(ada);
    const yesterday = NOW - 864e5;
    render(<TodayPlan plan={plan(ada, yesterday)} learner={ada} now={yesterday} young={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Start, Math:/ }));
    expect(read().sets.map((x) => x.planKey)).toEqual([`${DATE}:daily:math`]);
    // So when Today comes back, the line just done is today's, and shows as done.
    update((s) => void (s.sets[0].finishedAt = NOW));
    expect(plan(ada).lead.find((i) => i.key === "daily:math")).toMatchObject({ done: true });
  });

  it("shows a started line as Continue and a finished line as done, and never starts anything by itself", () => {
    seed(ada);
    update((s) => {
      s.sets.push(
        { id: "s1", profileId: "p1", createdAt: NOW, kind: "daily", subject: "math", skillId: "m.add.1000", slots: [], planKey: `${DATE}:daily:math`, finishedAt: NOW },
        { id: "s2", profileId: "p1", createdAt: NOW, kind: "daily", subject: "english", skillId: "e.x", slots: [], planKey: `${DATE}:daily:english` },
      );
    });
    render(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    // English was started, so it leads now as "pick up where you left off".
    const next = within(document.getElementById("next")!);
    expect(next.getByText("Pick up where you left off")).toBeInTheDocument();
    expect(next.getByRole("button", { name: /^Continue, English:/ })).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 done · 30 min a day")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(read().sets).toHaveLength(2);
  });

  it("says plainly that today is done when the lead lines are, and offers more without raising it", () => {
    seed({ ...ada, settings: { subjects: ["math"], dailyMinutes: 5 } });
    const p = read().profiles[0];
    update((s) => {
      s.events.push({ id: "hw", profileId: "p1", title: "Reading log", kind: "homework", date: addDays(DATE, 1), skillIds: [], source: "typed", createdAt: 0 });
      s.planDone.push({ profileId: "p1", date: DATE, key: "due:hw", at: NOW });
      s.events[0].done = true;
    });
    const today = plan(p);
    expect(today.lead.map((i) => i.key)).toEqual(["due:hw"]);
    render(<TodayPlan plan={today} learner={p} now={NOW} young={false} />);
    expect(screen.getByText("That's today's plan done.")).toBeInTheDocument();
    expect(screen.getByText("You can stop here. If you want more, it's below.")).toBeInTheDocument();
    expect(document.getElementById("next")).toBeNull();
    // The count is of today's plan, the same lines "done" was decided by; the extra line counts itself.
    expect(screen.getByText("1 of 1 done · 5 min a day")).toBeInTheDocument();
    expect(screen.getByText("If you have more time (1)")).toBeInTheDocument();
  });

  it("lets ticked-off school work be undone", async () => {
    seed(ada);
    update((s) => void s.events.push({ id: "hw", profileId: "p1", title: "Reading log", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0 }));
    const { rerender } = render(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Mark done, Reading log" }));
    expect(read().events[0].done).toBe(true);
    expect(read().planDone).toEqual([expect.objectContaining({ date: DATE, key: "due:hw" })]);
    rerender(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Undo, Reading log" }));
    expect(read().events[0].done).toBe(false);
    expect(screen.getByRole("link", { name: "Reading log" })).toHaveAttribute("href", "/calendar/hw");
  });

  it("K–2: picture tiles, read-aloud on every line, 56px targets, no minute numbers", () => {
    seed(leo);
    const { container } = render(young(<TodayPlan plan={plan(leo)} learner={leo} now={NOW} young />));
    expect(container.textContent).not.toMatch(/\bmin\b/);
    expect(speakers().length).toBeGreaterThanOrEqual(3);
    // Every speaker is a 56px target (the stage's own is 40px).
    for (const b of speakers()) expect(b).toHaveClass("size-14!");
    expect(screen.getByRole("button", { name: /^Start, Math: Count up to 10/ })).toHaveClass("min-h-14");
    expect(screen.getByRole("button", { name: /^English: Letter sounds/ })).toHaveClass("min-h-14");
  });

  it("K–2: the extra lines' summary can be heard, and hearing it does not open it", async () => {
    seed({ ...leo, settings: { subjects: ["math", "english", "science"] } });
    const p = read().profiles[0];
    const today = plan(p);
    expect(today.more.map((i) => i.key)).toEqual(["daily:science"]);
    render(young(<TodayPlan plan={today} learner={p} now={NOW} young />));
    const details = document.querySelector("details")!;
    const say = screen.getByRole("button", { name: "Read aloud: If you have more time (1)" });
    expect(details.contains(say)).toBe(false);
    await userEvent.click(say);
    expect(details.open).toBe(false);
    expect(read().sets).toHaveLength(0);
  });

  it("says it is fine to stop once today's minutes are used, without stopping anything", () => {
    seed(ada);
    const { rerender } = render(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} timeUp />);
    expect(screen.getByText("That's today's time. You can stop here, or keep going.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start, Math:/ })).toBeEnabled();
    rerender(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} timeUp grownUp />);
    expect(screen.queryByText(/today's time/)).toBeNull();
  });

  it("K–2: school work ticked off stays on its tile as done, and can be undone with a big button", async () => {
    seed(leo);
    update((s) => {
      s.events.push({ id: "hw", profileId: "p2", title: "Reading log", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0 });
      s.planDone.push({ profileId: "p2", date: DATE, key: "due:hw", at: NOW });
      s.events[0].done = true;
    });
    render(young(<TodayPlan plan={plan(leo)} learner={leo} now={NOW} young />));
    expect(screen.getByText("Done")).toBeInTheDocument();
    const undo = screen.getByRole("button", { name: "Undo, Reading log" });
    expect(undo).toHaveClass("min-h-14");
    await userEvent.click(undo);
    expect(read().events[0].done).toBe(false);
  });

  it("a grown-up sees the same lines with nothing to start", () => {
    seed(leo);
    render(<TodayPlan plan={plan(leo)} learner={leo} now={NOW} young grownUp />);
    expect(screen.getByText("Math: Count up to 10")).toBeInTheDocument();
    expect(screen.getByText("English: Letter sounds")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText(/10 min a day/)).toBeInTheDocument();
    expect(screen.getByText(/Only Leo can start these/)).toBeInTheDocument();
  });
});

describe("TodayPlan lesson lines", () => {
  const started = (p: Profile, c: Course) =>
    update((s) => {
      s.courses.push(c);
      s.activity.push({ id: "e1", profileId: p.id, at: NOW - 3600_000, type: "lesson_started", courseId: c.id, lessonId: "a" });
    });

  it("a lesson under way reads Continue, as it does under the courses, and says it was written by AI", async () => {
    seed({ ...ada, settings: { subjects: [], dailyMinutes: 30 } });
    const p = read().profiles[0];
    started(p, course({ id: "moon", profileId: "p1", ai: true }));
    render(<TodayPlan plan={plan(p)} learner={p} now={NOW} young={false} />);
    const next = within(document.getElementById("next")!);
    expect(next.getByText("Pick up where you left off")).toBeInTheDocument();
    expect(next.getByText("Written by AI")).toBeInTheDocument();
    await userEvent.click(next.getByRole("button", { name: "Continue, Lesson a" }));
    expect(push).toHaveBeenLastCalledWith("/learn/moon/a");
    expect(read().sets).toHaveLength(0);
  });

  it("K–2: a lesson tile from a template outline says so, and its course's language", () => {
    seed({ ...leo, settings: { subjects: ["math"], dailyMinutes: 30 } });
    const p = read().profiles[0];
    update((s) => void s.courses.push(course({ id: "luna", profileId: "p2", template: true, locale: "es", lessons: [{ ...lesson("a"), title: "Las fases" }] })));
    render(young(<TodayPlan plan={plan(p)} learner={p} now={NOW} young />));
    const tile = screen.getByRole("button", { name: /^Las fases/ });
    expect(within(tile).getByText("Template outline")).toBeInTheDocument();
    expect(within(tile).getByText("In Spanish")).toBeInTheDocument();
    expect(within(tile).getByText("Start")).toBeInTheDocument();
  });
});

describe("StatusStrip", () => {
  it("links each item to where you act on it, and shows nothing that is zero", async () => {
    seed(ada);
    update((s) => {
      s.events.push(
        { id: "hw", profileId: "p1", title: "Worksheet", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0 },
        { id: "t1", profileId: "p1", title: "Spelling test", kind: "test", date: addDays(DATE, 2), skillIds: [], source: "typed", createdAt: 0 },
      );
    });
    const onStartCheck = vi.fn();
    const status = { ...todayStatus(read(), ada, NOW), checks: ["m.add.5"] };
    render(<StatusStrip status={status} learnerId="p1" young={false} grownUp={false} onStartCheck={onStartCheck} />);
    const strip = within(screen.getByRole("list", { name: "Today's status" }));
    expect(strip.getByRole("link", { name: "Due today: Worksheet" })).toHaveAttribute("href", "/calendar/hw");
    expect(strip.getByRole("link", { name: "Test in 2 days: Spelling test" })).toHaveAttribute("href", "/calendar/t1");
    expect(strip.getByRole("link", { name: "Left today: 30 of 30 min" })).toHaveAttribute("href", "#today");
    await userEvent.click(strip.getByRole("button", { name: /^1 check ready/ }));
    expect(onStartCheck).toHaveBeenCalledTimes(1);
  });

  it("is empty with nothing to say; a pre-reader's has no minutes, their grown-up's does", () => {
    seed(leo);
    const status = todayStatus(read(), leo, NOW);
    const { container, rerender } = render(<StatusStrip status={{ ...status, left: 0 }} learnerId="p2" young={false} grownUp={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StatusStrip status={status} learnerId="p2" young grownUp={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StatusStrip status={{ ...status, checks: ["m.count.10"] }} learnerId="p2" young grownUp />);
    expect(screen.getByRole("link", { name: "Left today: 10 of 10 min" })).toHaveAttribute("href", "/family/p2");
    expect(screen.getByRole("link", { name: /^1 check ready/ })).toHaveAttribute("href", "/family/p2");
  });

  it("names the skills a check is waiting on, and several due items together", () => {
    seed(ada);
    update((s) => {
      s.events.push(
        { id: "a", profileId: "p1", title: "Worksheet", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0 },
        { id: "b", profileId: "p1", title: "Poster", kind: "project", date: DATE, skillIds: [], source: "typed", createdAt: 0 },
        { id: "q", profileId: "p1", title: "Map quiz", kind: "quiz", date: DATE, skillIds: [], source: "typed", createdAt: 0 },
      );
    });
    const status = { ...todayStatus(read(), ada, NOW), checks: ["m.count.10", "m.count.20"] };
    render(<StatusStrip status={status} learnerId="p1" young={false} grownUp={false} onStartCheck={() => {}} />);
    expect(screen.getByRole("link", { name: "Due today: Worksheet, Poster" })).toHaveAttribute("href", "/calendar");
    expect(screen.getByRole("link", { name: "Quiz today: Map quiz" })).toHaveAttribute("href", "/calendar/q");
    expect(screen.getByRole("button", { name: "2 checks ready: Count up to 10, Count up to 20" })).toBeInTheDocument();
  });
});

describe("ComingUp", () => {
  const ev = (i: number, time?: string) => ({ id: `e${i}`, profileId: "p1", title: `Item ${i}`, kind: "homework" as const, date: addDays(DATE, i % 7), time, skillIds: [], source: "typed" as const, createdAt: 0 });

  it("opens each school item's page, and points to the calendar for the rest", () => {
    seed(ada);
    render(<ComingUp events={Array.from({ length: 8 }, (_, i) => ev(i, "08:30"))} classes={[]} locale="en" now={NOW} />);
    const list = within(screen.getByRole("list"));
    expect(list.getByRole("link", { name: /Item 0/ })).toHaveAttribute("href", "/calendar/e0");
    expect(list.getAllByRole("link", { name: /^Item/ })).toHaveLength(6);
    expect(list.getByRole("link", { name: "2 more in the calendar" })).toHaveAttribute("href", "/calendar");
    expect(screen.getAllByText(/08:30/).length).toBeGreaterThan(0);
  });

  it("K–2: every row can be heard, every link is a 56px target, and no clock times are shown", () => {
    seed(leo);
    render(young(<ComingUp events={Array.from({ length: 7 }, (_, i) => ev(i, "08:30"))} classes={[]} locale="en" now={NOW} times={false} />));
    expect(screen.getByRole("button", { name: /^Read aloud: Item 1/ })).toHaveClass("size-14!");
    expect(screen.queryByText(/08:30/)).toBeNull();
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveClass("min-h-14");
    expect(screen.getByRole("link", { name: "1 more in the calendar" })).toHaveClass("min-h-14");
  });
});

describe("CoursesInProgress", () => {
  const points = () => continueTarget(read(), "p1");
  function courses() {
    seed(ada);
    update((s) => {
      s.courses.push(
        course({ id: "ai", profileId: "p1", ai: true, title: "The Moon" }),
        course({ id: "tpl", profileId: "p1", template: true, title: "Volcanoes" }),
        course({ id: "es", profileId: "p1", locale: "es", title: "Fracciones", origin: "catalogue" }),
      );
      s.activity.push(
        { id: "x1", profileId: "p1", at: 5000, type: "lesson_started", courseId: "ai", lessonId: "a" },
        { id: "x2", profileId: "p1", at: 4000, type: "lesson_completed", courseId: "tpl", lessonId: "a" },
      );
    });
  }

  it("rows: each course with what made it, where it picks up, and Continue or Start", () => {
    courses();
    render(<CoursesInProgress points={points()} locale="en" young={false} grownUp={false} />);
    expect(screen.getByRole("heading", { name: "Your courses" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("Written by AI")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: "Continue, The Moon" })).toHaveAttribute("href", "/learn/ai/a");
    expect(within(rows[1]).getByText("Template outline")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Next: Lesson b")).toBeInTheDocument();
    expect(within(rows[1]).getByText("1 of 3 lessons finished")).toBeInTheDocument();
    expect(within(rows[2]).getByText("In Spanish")).toBeInTheDocument();
    expect(within(rows[2]).getByRole("link", { name: "Start, Fracciones" })).toHaveAttribute("href", "/learn/es/a");
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/courses");
  });

  it("K–2 tiles carry the same labels, can be heard, and open the next lesson", () => {
    courses();
    render(young(<CoursesInProgress points={points()} locale="en" young grownUp={false} />));
    const moon = screen.getByRole("link", { name: /^The Moon/ });
    expect(moon).toHaveAttribute("href", "/learn/ai/a");
    expect(within(moon).getByText("Written by AI")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^Volcanoes/ })).getByText("Template outline")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^Fracciones/ })).getByText("In Spanish")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read aloud: The Moon. Next: Lesson a" })).toHaveClass("size-14!");
    expect(screen.getByRole("link", { name: "See all" })).toHaveClass("min-h-14");
  });

  it("a grown-up sees the list with nothing to open", () => {
    courses();
    render(<CoursesInProgress points={points()} locale="en" young={false} grownUp />);
    expect(screen.getByText("The Moon")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("never pushes a grown-up's assignment off Today", () => {
    seed(ada);
    update((s) => {
      for (const id of ["c1", "c2", "c3"]) {
        s.courses.push(course({ id, profileId: "p1", title: id }));
        s.activity.push({ id: `s-${id}`, profileId: "p1", at: 9000, type: "lesson_started", courseId: id, lessonId: "a" });
      }
      s.courses.push(course({ id: "asg", profileId: "p1", title: "Assigned", assigned: true, createdAt: 2000 }));
    });
    render(<CoursesInProgress points={points()} locale="en" young={false} grownUp={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("From a grown-up")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start, Assigned" })).toBeInTheDocument();
  });

  it("shows nothing without courses", () => {
    seed(ada);
    const { container } = render(<CoursesInProgress points={[]} locale="en" young={false} grownUp={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PickTiles", () => {
  it("K–2: a ready-made course as a picture tile, heard by name, added and opened in one tap", async () => {
    seed(leo);
    const entries = catalogueFor("K", "en").filter((c) => bandOf(c.grade) === "k2");
    expect(entries.length).toBeGreaterThan(0);
    render(young(<PickTiles entries={entries} learner={leo} />));
    const first = entries[0];
    expect(screen.getByRole("button", { name: `Read aloud: ${first.title}`.slice(0, 12 + 60) })).toHaveClass("size-14!");
    await userEvent.click(screen.getByRole("button", { name: starts(first.title) }));
    const added = read().courses.find((c) => c.catalogueId === first.id)!;
    expect(added).toMatchObject({ profileId: "p2", status: "ready" });
    expect(push).toHaveBeenLastCalledWith(`/learn/${added.id}/${first.lessons[0].id}`);
    // Adding a course is a teaching act: meant to be finished. Its outcome is worked out later.
    expect(read().acts).toEqual([expect.objectContaining({ profileId: "p2", kind: "course", intent: "course-finished", ref: added.id })]);
    expect(read().acts[0].outcome).toBeUndefined();
    // Tapping again opens the same course, never a second copy, and logs nothing new.
    await userEvent.click(screen.getByRole("button", { name: starts(first.title) }));
    expect(read().courses.filter((c) => c.catalogueId === first.id)).toHaveLength(1);
    expect(read().acts).toHaveLength(1);
  });

  it("shows nothing when every course is already the learner's", () => {
    seed(leo);
    const { container } = render(young(<PickTiles entries={[]} learner={leo} />));
    expect(container).toBeEmptyDOMElement();
  });
});
