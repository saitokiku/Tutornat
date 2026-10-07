import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addClass, addEvent } from "@/lib/school";
import { resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate, weekStart } from "@/planner/dates";
import { lineText, WeekView } from "./WeekView";

const NOW = new Date("2026-10-07T16:00:00").getTime(); // a Wednesday
const TODAY = localDate(NOW);
const MON = weekStart(TODAY);
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };

function Harness({ onAdd = () => {} }: { onAdd?: (d: string) => void }) {
  const [start, setStart] = useState(MON);
  return <WeekView profile={ada} now={NOW} start={start} onWeek={setStart} onAdd={onAdd} />;
}
const day = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) });
const range = () => screen.getByRole("heading", { level: 2 }).textContent;

afterEach(() => resetMemory());

describe("WeekView", () => {
  it("has a real heading for every day and marks today", () => {
    render(<Harness />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toHaveLength(7);
    expect(screen.getByRole("heading", { level: 3, name: "Wednesday, October 7, Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Monday, October 5" })).toBeInTheDocument();
    expect(range()).toMatch(/October 5\s*–\s*11/);
  });

  it("shows school items as links to their page, prep on the days before, and what each line is", () => {
    const test = addEvent("p1", { title: "Multiplication test", kind: "test", date: addDays(TODAY, 3), skillIds: ["m.mult.facts"] })!;
    addEvent("p1", { title: "Spelling quiz", kind: "quiz", date: addDays(TODAY, 4) });
    render(<Harness />);
    const sat = day("Saturday, October 10");
    expect(within(sat).getByRole("link", { name: /Multiplication test/ })).toHaveAttribute("href", `/calendar/${test.id}`);
    for (const name of ["Thursday, October 8", "Friday, October 9"]) expect(within(day(name)).getByText("Prep: Multiplication test")).toBeInTheDocument();
    expect(within(day("Wednesday, October 7")).getByText("Prep: Multiplication test")).toBeInTheDocument();
    // Status is in words for screen readers, not only in the mark.
    expect(within(day("Thursday, October 8")).getAllByText(/^Planned:/).length).toBeGreaterThan(0);
    expect(within(day("Wednesday, October 7")).getAllByText(/^To do:/).length).toBeGreaterThan(0);
    // A test with no skill linked says it will get no prep.
    expect(within(day("Sunday, October 11")).getByText("No prep yet: link what it covers")).toBeInTheDocument();
    // Past days with nothing done say so; nothing is planned onto them.
    expect(within(day("Monday, October 5")).getByText("Nothing recorded")).toBeInTheDocument();
    expect(within(day("Monday, October 5")).queryByText(/^Planned:/)).toBeNull();
  });

  it("moves between days with the arrow keys and between weeks at the edges", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // One day is in the tab order: today.
    expect(day("Wednesday, October 7")).toHaveAttribute("tabindex", "0");
    expect(day("Thursday, October 8")).toHaveAttribute("tabindex", "-1");
    day("Wednesday, October 7").focus();
    await user.keyboard("{ArrowRight}");
    expect(day("Thursday, October 8")).toHaveFocus();
    expect(day("Thursday, October 8")).toHaveAttribute("tabindex", "0");
    await user.keyboard("{ArrowDown}{End}");
    expect(day("Sunday, October 11")).toHaveFocus();
    // Past Sunday: next week, Monday.
    await user.keyboard("{ArrowRight}");
    expect(range()).toMatch(/October 12\s*–\s*18/);
    expect(day("Monday, October 12")).toHaveFocus();
    // Before Monday: the week before, Sunday.
    await user.keyboard("{ArrowLeft}");
    expect(day("Sunday, October 11")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(day("Monday, October 5")).toHaveFocus();
    // Page Down / Page Up keep the weekday.
    await user.keyboard("{ArrowRight}{PageDown}");
    expect(day("Tuesday, October 13")).toHaveFocus();
    await user.keyboard("{PageUp}");
    expect(day("Tuesday, October 6")).toHaveFocus();
  });

  it("works by keyboard alone: week buttons and a day's add button", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Previous week" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "This week" })).toHaveAttribute("aria-current", "date");
    await user.tab();
    expect(screen.getByRole("button", { name: "Next week" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(range()).toMatch(/October 12\s*–\s*18/);
    expect(screen.getByRole("button", { name: "This week" })).not.toHaveAttribute("aria-current");
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "This week" })).toHaveFocus();
    await user.keyboard(" ");
    expect(range()).toMatch(/October 5\s*–\s*11/);
    // Focus stays on the button that was pressed.
    expect(screen.getByRole("button", { name: "This week" })).toHaveFocus();
    // From a day, Tab reaches its add button; Enter adds on that day.
    day("Wednesday, October 7").focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Add on Wednesday, October 7" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith(TODAY);
  });

  it("names each item's class in words, not only by its color", () => {
    const cls = addClass("p1", { name: "Math 4", subject: "math" })!;
    addEvent("p1", { title: "Fractions quiz", kind: "quiz", date: addDays(TODAY, 1), classId: cls.id });
    render(<Harness />);
    expect(within(day("Thursday, October 8")).getByRole("link", { name: /Fractions quiz\s*Quiz · Math 4/ })).toBeInTheDocument();
  });

  it("keeps lines past the day's minutes budget under “If there's time”, as Today does", () => {
    addEvent("p1", { title: "Multiplication test", kind: "test", date: addDays(TODAY, 3), skillIds: ["m.mult.facts"] });
    render(<Harness />);
    const thu = day("Thursday, October 8");
    const lead = within(thu).getByRole("list", { name: "Planned" });
    expect(within(lead).getByText("Prep: Multiplication test")).toBeInTheDocument();
    const extra = within(thu).getByRole("list", { name: "If there's time" });
    expect(within(extra).getByText(/^Practice:/)).toBeInTheDocument();
  });

  it("words our own check apart from a school quiz in Spanish", () => {
    const line = { key: "check:m.add.5", kind: "check", status: "planned", skillIds: ["m.add.5"] } as const;
    expect(lineText({ ...line, skillIds: [...line.skillIds] }, "es")).toMatch(/^Prueba sin ayuda: /);
    expect(lineText({ ...line, skillIds: [...line.skillIds], opens: true }, "es")).toMatch(/^Desde hoy, prueba sin ayuda: /);
    expect(lineText({ ...line, skillIds: [...line.skillIds] }, "en")).toMatch(/^Check: /);
  });

  it("reads a day aloud for a young learner, and leaves adding to grown-ups", async () => {
    const user = userEvent.setup();
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn(), getVoices: () => [] });
    vi.stubGlobal("SpeechSynthesisUtterance", function (this: { text: string }, text: string) {
      this.text = text;
    });
    addEvent("p1", { title: "Spelling quiz", kind: "quiz", date: TODAY });
    render(<WeekView profile={{ ...ada, grade: "1" }} now={NOW} start={MON} onWeek={() => {}} young learner />);
    expect(screen.queryByRole("button", { name: /^Add on/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Read aloud: Wednesday, October 7" }));
    expect(speak.mock.calls[0][0].text).toMatch(/^Wednesday, October 7\. Quiz: Spelling quiz\. /);
    vi.unstubAllGlobals();
  });

  it("sends the learner from today's plan to Today, where it starts", () => {
    render(<WeekView profile={ada} now={NOW} start={MON} onWeek={() => {}} learner />);
    expect(within(day("Wednesday, October 7")).getByRole("link", { name: "Start on Today" })).toHaveAttribute("href", "/home");
    expect(within(day("Thursday, October 8")).queryByRole("link", { name: "Start on Today" })).toBeNull();
  });

  it("shows what was done on a past day, with honest numbers", () => {
    const mon = MON;
    const at = new Date(`${mon}T17:00:00`).getTime();
    update((s) => {
      s.sets.push({ id: "s1", profileId: "p1", createdAt: at, kind: "daily", subject: "math", skillId: "m.mult.facts", slots: [], planKey: `${mon}:daily:math`, finishedAt: at });
      for (let i = 0; i < 3; i++) s.attempts.push({ id: `a${i}`, profileId: "p1", at, skillId: "m.mult.facts", level: 1, seed: i, setId: "s1", mode: "practice", correct: i < 2, assisted: i === 1, seconds: 4 });
    });
    render(<Harness />);
    const monday = day("Monday, October 5");
    expect(within(monday).getByText(/^Done:/).parentElement).toHaveTextContent("Math: Multiplication facts to 10 × 10");
    expect(within(monday).getByText("3 answers · 1 without help")).toBeInTheDocument();
  });
});
