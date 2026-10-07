import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GrowthPage from "@/app/(app)/growth/page";
import { RULES } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import { practicedSkills, weeklyGrowth } from "@/lib/growth";
import { statusesOf } from "@/lib/practice";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { DayLog } from "./DayLog";
import { SubjectGrowth } from "./SubjectGrowth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/growth",
  useSearchParams: () => new URLSearchParams("learner=ada"),
}));

afterEach(() => {
  resetMemory();
  vi.useRealTimers();
});

// Wednesday 7 October 2026, 3 pm local; Tuesdays at 4 pm in the weeks before.
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const tue = (weeksAgo: number) => new Date(2026, 9, 6 - 7 * weeksAgo, 16, 0).getTime();
const ada: Profile = { id: "ada", accountId: "acc", nickname: "Ada", grade: "4", locale: "en", color: "#A93B5D", createdAt: 0 };
const bo: Profile = { ...ada, id: "bo", nickname: "Bo", color: "#3E6E8E" };

let n = 0;
const at = (skillId: string, t: number, correct: boolean, o: Partial<Attempt> = {}): Attempt => ({
  id: `a${n++}`, profileId: "ada", at: t, skillId, level: 1, seed: n, mode: "practice", correct, assisted: false, seconds: 6, ...o,
});
const check = (skillId: string, t: number) => Array.from({ length: RULES.checkSize }, (_, i) => at(skillId, t + i * 60_000, true, { mode: "check", setId: `c${t}` }));
const set = (id: string, kind: PracticeSet["kind"], skillId: string, size: number, finishedAt?: number): PracticeSet => ({
  id, profileId: "ada", createdAt: 0, kind, subject: skillId.startsWith("e.") ? "english" : "math", skillId, slots: Array.from({ length: size }, (_, i) => ({ skillId, seed: i, role: "main" })), finishedAt,
});

function seed(profileId: string | "parent", o: { grade?: Profile["grade"] } = {}) {
  update((s) => {
    s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
    s.profiles = [{ ...ada, grade: o.grade ?? ada.grade }, bo];
    s.session = { accountId: "acc", profileId, unlocked: profileId === "parent" };
    s.attempts = [
      // Add within 5: ready three weeks ago, a check two weeks ago, the second a week ago: proved.
      ...Array.from({ length: 10 }, (_, i) => at("m.add.5", tue(3) + i * 60_000, true, { setId: "p1" })),
      ...check("m.add.5", tue(2)),
      ...check("m.add.5", tue(1)),
      // Rhyming words (draft questions): two of ten answered this week, then left.
      at("e.rhyme", tue(0), true, { setId: "p2" }),
      at("e.rhyme", tue(0) + 1, false, { setId: "p2" }),
      // Count to 10 was only ever a placement probe: not practicing.
      at("m.count.10", tue(4), true, { mode: "placement", setId: "pl" }),
    ];
    s.sets = [
      set("p1", "daily", "m.add.5", 10, tue(3) + 10 * 60_000),
      set(`c${tue(2)}`, "check", "m.add.5", 5, tue(2) + 5 * 60_000),
      set(`c${tue(1)}`, "check", "m.add.5", 5, tue(1) + 5 * 60_000),
      set("p2", "pick", "e.rhyme", 10),
    ];
    s.classes = [{ id: "m4", profileId: "ada", name: "Math 4", subject: "math", color: "#000", createdAt: 0 }];
    s.results = [{ id: "r1", profileId: "ada", classId: "m4", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20 }];
  });
}

const growthOf = (subject: string, until = NOW) => weeklyGrowth(read(), "ada", until).find((g) => g.subject === subject)!;
const props = (subject: string) => ({
  growth: growthOf(subject),
  statuses: statusesOf(read(), "ada", NOW),
  practiced: practicedSkills(read().attempts),
  current: true,
  now: NOW,
});

describe("SubjectGrowth", () => {
  it("draws the weeks with a text equivalent, and gives the same numbers as a table", () => {
    seed("parent");
    render(<SubjectGrowth {...props("math")} results={[]} detail={false} />);
    expect(screen.getByRole("img", { name: "Math, the last 8 weeks: skills proved went from 0 to 1. Now 0 ready for a check and 0 practicing." })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Math, week by week" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(9);
    expect(within(rows[8]).getByRole("rowheader")).toHaveTextContent("This week");
    expect(within(rows[8]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "0", "0", "0", "0", "—", "0"]);
    expect(within(rows[7]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "0", "0", "1 of 1", "0", "—", "1"]);
    expect(screen.getByRole("region", { name: "Math, week by week" })).toHaveAttribute("tabindex", "0");
    expect(screen.queryByText(/^Skills \(/)).not.toBeInTheDocument();
  });

  it("for a grown-up, lists the practiced skills with honest status and marks draft questions; a placement probe alone is not listed", async () => {
    seed("parent");
    const { unmount } = render(<SubjectGrowth {...props("english")} results={[]} detail />);
    await userEvent.click(screen.getByText("Skills (1)"));
    const row = screen.getByText("Rhyming words").closest("li")!;
    expect(within(row).getByText("Draft questions")).toBeInTheDocument();
    expect(within(row).getByText(/^Practicing/)).toBeInTheDocument();
    unmount();
    render(<SubjectGrowth {...props("math")} results={[]} detail />);
    expect(screen.getByText("Skills (1)")).toBeInTheDocument();
    expect(screen.queryByText("Count to 10")).not.toBeInTheDocument();
  });

  it("lists each finished lesson for a grown-up with its own question tally", async () => {
    seed("parent");
    update((s) => {
      s.courses = [{ id: "moon", profileId: "ada", title: "The Moon", goal: "", subject: "science", grade: "4", locale: "en", origin: "catalogue", status: "ready", length: "short", sources: [], lessons: [{ id: "l1", title: "Why the Moon changes", summary: "", minutes: 8, scenes: [] }], template: false, createdAt: 0, updatedAt: 0 }];
      s.activity = [
        { id: "q1", profileId: "ada", at: tue(0), type: "quiz_answered", courseId: "moon", lessonId: "l1", sceneId: "s1", correct: true, assisted: false },
        { id: "q2", profileId: "ada", at: tue(0) + 1, type: "quiz_answered", courseId: "moon", lessonId: "l1", sceneId: "s2", correct: false },
        { id: "done", profileId: "ada", at: tue(0) + 2, type: "lesson_completed", courseId: "moon", lessonId: "l1", seconds: 400 },
      ];
    });
    render(<SubjectGrowth {...props("science")} results={[]} detail />);
    expect(screen.getByText("No skills on the map practiced yet.")).toBeInTheDocument();
    expect(screen.getByText("Lesson questions: 1 right on own · 0 right with help · 1 not yet", { selector: "p" })).toBeInTheDocument();
    await userEvent.click(screen.getByText("Lessons finished (1)"));
    const row = screen.getByText("“Why the Moon changes”").closest("li")!;
    expect(within(row).getByText("The Moon · Oct 6")).toBeInTheDocument();
    expect(within(row).getByText("Lesson questions: 1 right on own · 0 right with help · 1 not yet")).toBeInTheDocument();
  });

  it("keeps results from school apart and labelled", () => {
    seed("parent");
    render(<SubjectGrowth {...props("math")} results={[{ id: "r1", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20, subject: "math", className: "Math 4" }]} detail />);
    expect(screen.getByRole("heading", { name: "From school" })).toBeInTheDocument();
    expect(screen.getByText("Scores a grown-up entered from school. They are kept apart from what was proved here.")).toBeInTheDocument();
    expect(screen.getByText("18 / 20")).toBeInTheDocument();
  });
});

describe("DayLog", () => {
  it("lists a week with answers, a set left early included, and steps through weeks from the keyboard, never past this one", async () => {
    seed("parent");
    render(<DayLog profileId="ada" now={NOW} />);
    expect(screen.getByText("Week of Oct 5")).toBeInTheDocument();
    expect(screen.queryByText("Nothing yet this week.")).not.toBeInTheDocument();
    expect(screen.getByText("Practiced: Rhyming words")).toBeInTheDocument();
    expect(screen.getByText("Stopped after 2 of 10 · 1 right on own · 0 right with help · 1 not yet")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Previous week" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Week of Sep 28")).toBeInTheDocument();
    expect(screen.getByText("Proved Add within 5")).toBeInTheDocument();
    expect(screen.getByText("Passed a check: Add within 5")).toBeInTheDocument();
    await userEvent.tab();
    const next = screen.getByRole("button", { name: "Next week" });
    expect(next).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Week of Oct 5")).toBeInTheDocument();
    expect(next).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Week of Oct 5")).toBeInTheDocument();
    expect(next).toHaveFocus();
  });

  it("shows reading a grown-up logged, by its day and without a clock time", () => {
    seed("parent");
    update((s) => void (s.reading = [{ id: "r", profileId: "ada", date: "2026-10-05", title: "Frog and Toad", author: "Arnold Lobel", minutes: 20 }]));
    render(<DayLog profileId="ada" now={NOW} />);
    const row = screen.getByText("Read “Frog and Toad” by Arnold Lobel").closest("li")!;
    expect(within(row).getByText("20 min, logged by a grown-up")).toBeInTheDocument();
    expect(row.textContent).not.toMatch(/\d:\d\d/);
  });
});

describe("Growth page", () => {
  // The page reads the clock once; pin it so the weeks shown do not drift with the real date.
  beforeEach(() => void vi.useFakeTimers({ now: NOW, toFake: ["Date"] }));

  it("a learner sees their own path, without the grown-up's detail", () => {
    seed("ada");
    render(<GrowthPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Growth" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Math" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "English" })).toBeInTheDocument();
    expect(screen.queryByText(/^Skills \(/)).not.toBeInTheDocument();
    expect(screen.queryByText("From school")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Viewing" })).not.toBeInTheDocument();
    // Older learners read; nothing is read aloud unless asked for in K–2.
    expect(screen.queryByRole("button", { name: /^Read aloud/ })).not.toBeInTheDocument();
  });

  it("a grown-up sees the same plus detail, and can switch child", async () => {
    seed("parent");
    render(<GrowthPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Growth · Ada" })).toBeInTheDocument();
    expect(screen.getAllByText(/^Skills \(/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "From school" })).toBeInTheDocument();
    const chips = screen.getByRole("group", { name: "Viewing" });
    expect(within(chips).getByRole("button", { name: "Ada" })).toHaveAttribute("aria-pressed", "true");
    within(chips).getByRole("button", { name: "Bo" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(replace).toHaveBeenCalledWith("/growth?learner=bo");
  });

  it("pages back to earlier weeks from the keyboard, and the record there stops at their end", async () => {
    seed("parent");
    // A first set in June, before the eight weeks shown.
    update((s) => {
      s.attempts.push(at("m.sub.10", new Date(2026, 5, 30, 16).getTime(), true, { setId: "june" }));
      s.sets.push({ ...set("june", "pick", "m.sub.10", 10), finishedAt: undefined });
    });
    render(<GrowthPage />);
    expect(screen.getByText("Weeks of Aug 17 to Oct 5")).toBeInTheDocument();
    const later = screen.getByRole("button", { name: "Later weeks" });
    expect(later).toHaveAttribute("aria-disabled", "true");
    screen.getByRole("button", { name: "Earlier weeks" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Weeks of Jun 22 to Aug 10")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Math, the 8 weeks from Jun 22 to Aug 10: skills proved went from 0 to 0. At the end, 0 ready for a check and 1 practicing." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Week of Aug 10" })).toBeInTheDocument();
    // Nothing earlier than June: the button says so and keeps focus.
    expect(screen.getByRole("button", { name: "Earlier weeks" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Earlier weeks" })).toHaveFocus();
    later.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Weeks of Aug 17 to Oct 5")).toBeInTheDocument();
  });

  it("a K–2 learner hears their path: read-aloud lines, the skills they proved by name, no table, big steps", () => {
    seed("ada", { grade: "1" });
    render(<GrowthPage />);
    expect(screen.getByText("What you did, week by week.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Read aloud: What you did, week by week\./ })).toBeInTheDocument();
    expect(screen.getByText("Math. Proved: 1. Ready for a check: 0. Practicing: 0.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read aloud: Math. Proved: 1. Ready for a check: 0. Practicing: 0." })).toHaveClass("min-h-14");
    expect(screen.getByText("You proved: Add within 5")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/right on own/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous week" })).toHaveClass("size-14");
    expect(screen.getByRole("button", { name: /^Read aloud: Tuesday/ })).toBeInTheDocument();
  });
});
