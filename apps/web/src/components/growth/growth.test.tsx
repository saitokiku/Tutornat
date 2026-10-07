import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GrowthPage from "@/app/(app)/growth/page";
import { RULES } from "@/learning/engine";
import type { Attempt } from "@/learning/types";
import { weeklyGrowth } from "@/lib/growth";
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

afterEach(() => resetMemory());

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

function seed(profileId: string | "parent") {
  update((s) => {
    s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
    s.profiles = [ada, bo];
    s.session = { accountId: "acc", profileId, unlocked: profileId === "parent" };
    s.attempts = [
      // Add within 5: ready three weeks ago, a check two weeks ago, the second a week ago: proved.
      ...Array.from({ length: 10 }, (_, i) => at("m.add.5", tue(3) + i * 60_000, true, { setId: "p1" })),
      ...check("m.add.5", tue(2)),
      ...check("m.add.5", tue(1)),
      // Rhyming words (draft questions): practicing this week.
      at("e.rhyme", tue(0), true, { setId: "p2" }),
      at("e.rhyme", tue(0) + 1, false, { setId: "p2" }),
    ];
    s.classes = [{ id: "m4", profileId: "ada", name: "Math 4", subject: "math", color: "#000", createdAt: 0 }];
    s.results = [{ id: "r1", profileId: "ada", classId: "m4", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20 }];
  });
}

const growthOf = (subject: string) => weeklyGrowth(read(), "ada", NOW).find((g) => g.subject === subject)!;

describe("SubjectGrowth", () => {
  it("draws the weeks with a text equivalent, and gives the same numbers as a table", () => {
    seed("parent");
    render(<SubjectGrowth growth={growthOf("math")} statuses={statusesOf(read(), "ada", NOW)} results={[]} detail={false} now={NOW} />);
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

  it("for a grown-up, lists the skills with honest status and marks draft questions", async () => {
    seed("parent");
    render(<SubjectGrowth growth={growthOf("english")} statuses={statusesOf(read(), "ada", NOW)} results={[]} detail now={NOW} />);
    await userEvent.click(screen.getByText("Skills (1)"));
    const row = screen.getByText("Rhyming words").closest("li")!;
    expect(within(row).getByText("Draft questions")).toBeInTheDocument();
    expect(within(row).getByText(/^Practicing/)).toBeInTheDocument();
  });

  it("keeps results from school apart and labelled", () => {
    seed("parent");
    render(
      <SubjectGrowth
        growth={growthOf("math")}
        statuses={statusesOf(read(), "ada", NOW)}
        results={[{ id: "r1", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20, subject: "math", className: "Math 4" }]}
        detail
        now={NOW}
      />,
    );
    expect(screen.getByRole("heading", { name: "From school" })).toBeInTheDocument();
    expect(screen.getByText("Scores a grown-up entered from school. They are kept apart from what was proved here.")).toBeInTheDocument();
    expect(screen.getByText("18 / 20")).toBeInTheDocument();
  });
});

describe("DayLog", () => {
  it("steps through weeks from the keyboard and never past this one", async () => {
    seed("parent");
    render(<DayLog profileId="ada" now={NOW} />);
    expect(screen.getByText("Week of Oct 5")).toBeInTheDocument();
    expect(screen.getByText("Nothing yet this week.", { exact: false })).not.toBeNull();
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
});

describe("Growth page", () => {
  it("a learner sees their own path, without the grown-up's detail", () => {
    seed("ada");
    render(<GrowthPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Growth" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Math" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "English" })).toBeInTheDocument();
    expect(screen.queryByText(/^Skills \(/)).not.toBeInTheDocument();
    expect(screen.queryByText("From school")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Viewing" })).not.toBeInTheDocument();
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
});
