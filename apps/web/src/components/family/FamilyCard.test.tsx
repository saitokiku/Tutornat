import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Attempt } from "@/learning/types";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import { FamilyCard } from "./FamilyCard";

vi.mock("next/link", () => ({
  default: ({ href, onNavigate, children, ...rest }: ComponentProps<"a"> & { href: string; onNavigate?: (e: { preventDefault: () => void }) => void }) => (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.({ preventDefault: () => {} });
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

afterEach(() => resetMemory());

const H = 3600_000;
// Wednesday 7 October 2026, 3 pm local.
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const ada: Profile = { id: "ada", accountId: "acc", nickname: "Ada", grade: "4", locale: "en", color: "#A93B5D", createdAt: NOW - 30 * 24 * H };
const answer = (i: number, correct: boolean, assisted = false): Attempt => ({
  id: `a${i}`, profileId: "ada", at: NOW - 2 * H + i * 60_000, skillId: "m.add.10", level: 1, seed: i, setId: "s1", mode: "practice", correct, assisted, seconds: 30,
});

function seed() {
  update((s) => {
    s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
    s.profiles = [ada];
    s.session = { accountId: "acc", profileId: "parent", unlocked: true };
    s.events = [{ id: "t1", profileId: "ada", title: "Fractions test", kind: "test", date: addDays(localDate(NOW), 2), skillIds: ["m.frac.equiv"], source: "typed", createdAt: NOW - 24 * H }];
    s.attempts = [answer(0, true), answer(1, true), answer(2, true, true), answer(3, false)];
    s.sets = [{ id: "s1", profileId: "ada", createdAt: NOW - 3 * H, kind: "daily", subject: "math", skillId: "m.add.10", slots: [], finishedAt: NOW - H }];
    s.notes = [{ id: "n1", profileId: "ada", at: NOW - H, text: "Ada wrote something worrying in Talk.", from: "safety" }];
  });
}

/** A lesson this week: two questions right on her own, one right with help, one not yet, and last week's answer that must not count. */
function lessonThisWeek() {
  const quiz = (i: number, correct: boolean, assisted = false, at = NOW - 5 * H + i * 60_000) =>
    ({ id: `q${i}`, profileId: "ada", at, type: "quiz_answered", courseId: "c1", lessonId: "l1", sceneId: `s${i}`, correct, assisted }) as const;
  update((s) => {
    s.activity = [
      quiz(0, true),
      quiz(1, true),
      quiz(2, true, true),
      quiz(3, false),
      quiz(4, true, false, NOW - 9 * 24 * H),
      { id: "done", profileId: "ada", at: NOW - 4 * H, type: "lesson_completed", courseId: "c1", lessonId: "l1", seconds: 120 },
    ];
  });
}

describe("FamilyCard", () => {
  it("shows what needs the grown-up first, then today, then the week in counted numbers", () => {
    seed();
    render(<FamilyCard child={ada} now={NOW} />);
    const card = screen.getByRole("article", { name: "Ada" });
    // A safety note stays in sight, outside the folded notes.
    expect(within(card).getAllByText("Ada wrote something worrying in Talk.")[0].closest("details")).toBeNull();
    expect(within(card).getByText("Ada has a test in 2 days, “Fractions test”, and no prep set is finished yet.")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Hand over to Ada to prep: Fractions test" })).toHaveAttribute("href", "/home");
    expect(within(card).getByRole("link", { name: "Open Ada's page" })).toHaveAttribute("href", "/family/ada");
    expect(within(card).getByText("Last active today", { exact: false })).toBeInTheDocument();
    // Today: the prep set for the test leads the plan.
    expect(within(card).getByText(/next: Get ready for Fractions test/)).toBeInTheDocument();
    const figure = (label: string) => within(card).getByText(label).parentElement!.querySelector("dd")!.textContent;
    expect(figure("Minutes learning")).toBe("2");
    expect(figure("Sets finished")).toBe("1");
    expect(figure("Right on own")).toBe("2");
    expect(figure("Right with help")).toBe("1");
    expect(figure("Not yet")).toBe("1");
    expect(within(card).getByText("Add within 10", { exact: false })).toBeInTheDocument();
  });

  it("adds this week's lesson questions to the practice answers, each counted once", () => {
    seed();
    lessonThisWeek();
    render(<FamilyCard child={ada} now={NOW} />);
    const card = screen.getByRole("article", { name: "Ada" });
    const figure = (label: string) => within(card).getByText(label).parentElement!.querySelector("dd")!.textContent;
    // Practice: 2 own, 1 helped, 1 not yet. Lesson: 2 own, 1 helped, 1 not yet (last week's answer left out).
    expect(figure("Right on own")).toBe("4");
    expect(figure("Right with help")).toBe("2");
    expect(figure("Not yet")).toBe("2");
    expect(figure("Lessons finished")).toBe("1");
    // 4 answers × 30 s and a 120 s lesson.
    expect(figure("Minutes learning")).toBe("4");
  });

  it("hands the device to the child from the keyboard", async () => {
    seed();
    render(<FamilyCard child={ada} now={NOW} />);
    const open = screen.getByRole("link", { name: "Hand over to Ada" });
    open.focus();
    await userEvent.keyboard("{Enter}");
    expect(read().session.profileId).toBe("ada");
  });

  it("keeps notes and courses folded away until asked for; a note can be added with the keyboard", async () => {
    seed();
    render(<FamilyCard child={ada} now={NOW} />);
    const summary = screen.getByText("Notes and courses");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await userEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    await userEvent.type(screen.getByLabelText("Add note"), "Loved the moon lesson");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Add note" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(read().notes.map((n) => n.text)).toContain("Loved the moon lesson");
    expect(screen.getByText("· 2 notes")).toBeInTheDocument();
  });

  it("says so plainly when a week is quiet", () => {
    update((s) => {
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
    });
    render(<FamilyCard child={ada} now={NOW} />);
    expect(screen.getByText("No activity this week yet.")).toBeInTheDocument();
    expect(screen.getByText("No activity yet", { exact: false })).toBeInTheDocument();
  });
});
