import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HearContext } from "@/components/stage/hear";
import { todayPlan, todayStatus } from "@/lib/plan";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import { ComingUp } from "./ComingUp";
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
const plan = (p: Profile) => todayPlan(read(), p, NOW);

beforeEach(() => push.mockClear());
afterEach(() => resetMemory());

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
    expect(screen.getByText("If you have more time (1)")).toBeInTheDocument();
  });

  it("lets ticked-off school work be undone", async () => {
    seed(ada);
    update((s) => void s.events.push({ id: "hw", profileId: "p1", title: "Reading log", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0 }));
    const { rerender } = render(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Mark done, Reading log" }));
    expect(read().events[0].done).toBe(true);
    rerender(<TodayPlan plan={plan(ada)} learner={ada} now={NOW} young={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Undo, Reading log" }));
    expect(read().events[0].done).toBe(false);
    expect(screen.getByRole("link", { name: "Reading log" })).toHaveAttribute("href", "/calendar/hw");
  });

  it("K–2: picture tiles, read-aloud on every line, big targets, no minute numbers", () => {
    seed(leo);
    const { container } = render(young(<TodayPlan plan={plan(leo)} learner={leo} now={NOW} young />));
    expect(container.textContent).not.toMatch(/\bmin\b/);
    expect(screen.getAllByRole("button", { name: /^Read aloud:/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("button", { name: /^Start, Math: Count up to 10/ })).toHaveClass("min-h-14");
    expect(screen.getByRole("button", { name: /^English: Letter sounds/ })).toHaveClass("min-h-14");
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

  it("K–2: every row can be heard, and no clock times are shown", () => {
    seed(leo);
    render(young(<ComingUp events={[ev(1, "08:30")]} classes={[]} locale="en" now={NOW} times={false} />));
    expect(screen.getByRole("button", { name: /^Read aloud: Item 1/ })).toBeInTheDocument();
    expect(screen.queryByText(/08:30/)).toBeNull();
  });
});
