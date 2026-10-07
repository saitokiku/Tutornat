import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Nudge } from "@/lib/nudges";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import type { SchoolEvent } from "@/planner/types";
import { NudgeList, NUDGES_SHOWN } from "./NudgeList";

// The app router is not mounted in unit tests: a link here is a plain anchor that runs onNavigate.
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

afterEach(() => resetMemory());

const ada: Profile = { id: "ada", accountId: "acc", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const event: SchoolEvent = { id: "e1", profileId: "ada", title: "Fractions test", kind: "test", date: "2026-10-09", skillIds: ["m.frac.equiv"], source: "typed", createdAt: 0 };
const history: SchoolEvent = { ...event, id: "e2", title: "History test", date: "2026-10-08", skillIds: [] };
const NUDGES: Nudge[] = [
  { key: "unlinked:e2", kind: "unlinked", days: 1, event: history, action: { href: "/calendar/e2", handover: false } },
  { key: "prep:e1", kind: "prep", days: 2, event, action: { href: "/home", handover: true } },
  { key: "check:m.add.5", kind: "check", days: 15, skillId: "m.add.5", action: { href: "/practice?subject=math", handover: true } },
  { key: "stuck:m.add.10", kind: "stuck", days: 0, skillId: "m.add.10", action: { href: "/practice?subject=math&again=m.add.10", handover: true } },
  { key: "idle:2026-10-01", kind: "idle", days: 6, action: { href: "/home", handover: true } },
];

const session = (profileId: string) =>
  update((s) => {
    s.profiles = [ada];
    s.session = { accountId: "acc", profileId, unlocked: profileId === "parent" };
  });

describe("NudgeList", () => {
  it("says each nudge in one sentence with one action link, named for what it does and what it is about", () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    expect(screen.getByText("Ada has a test tomorrow, “History test”, but no skills are linked to it yet, so there is no prep set for it.")).toBeInTheDocument();
    expect(screen.getByText("Ada has a test in 2 days, “Fractions test”, and no prep set is finished yet.")).toBeInTheDocument();
    expect(screen.getByText("The check on “Add within 5” has been waiting for Ada for 15 days.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the test: History test" })).toHaveAttribute("href", "/calendar/e2");
    // The visible words start the accessible name, so speech input finds the link by what it shows.
    const prep = screen.getByRole("link", { name: "Hand over to Ada to prep: Fractions test" });
    expect(prep).toHaveAttribute("href", "/home");
    expect(prep).toHaveTextContent("Hand over to Ada to prep");
    expect(screen.getByRole("link", { name: "Hand over to Ada for the check: Add within 5" })).toHaveAttribute("href", "/practice?subject=math");
    expect(screen.getAllByRole("link")).toHaveLength(NUDGES_SHOWN);
    // The other two wait behind "Show 2 more".
    expect(screen.queryByText("Ada hasn't done anything here for 6 days.")).not.toBeInTheDocument();
  });

  it("works from the keyboard: the test link goes to the item page; a hand-over link switches to the child", async () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Open the test: History test" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(read().session.profileId).toBe("parent");
    await userEvent.tab();
    expect(screen.getByRole("link", { name: /^Hand over to Ada to prep/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(read().session).toMatchObject({ profileId: "ada", unlocked: false });
  });

  it("shows the rest on request, keeping focus on the toggle; a stuck skill opens on Practice", async () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    const more = screen.getByRole("button", { name: "Show 2 more" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    more.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("“Add within 10” has been hard for Ada three sets in a row. Try the next one together.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hand over to Ada to practice: Add within 10" })).toHaveAttribute("href", "/practice?subject=math&again=m.add.10");
    expect(screen.getByText("Ada hasn't done anything here for 6 days.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hand over to Ada" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
  });

  it("records each shown nudge once as a nudge act for the child, and the rest when shown", async () => {
    session("parent");
    const { rerender } = render(<NudgeList child={ada} nudges={NUDGES} />);
    rerender(<NudgeList child={ada} nudges={NUDGES} />);
    const acts = () => read().acts.map((a) => [a.profileId, a.kind, a.intent, a.ref, a.detail]);
    expect(acts()).toEqual([
      ["ada", "nudge", "parent-acts", "unlinked:e2", "unlinked"],
      ["ada", "nudge", "parent-acts", "prep:e1", "prep"],
      ["ada", "nudge", "parent-acts", "check:m.add.5", "check"],
    ]);
    expect(read().acts.every((a) => a.outcome === undefined)).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(acts().map((a) => a[3])).toEqual(["unlinked:e2", "prep:e1", "check:m.add.5", "stuck:m.add.10", "idle:2026-10-01"]);
  });

  it("shows nothing to a child and records nothing", () => {
    session("ada");
    const { container } = render(<NudgeList child={ada} nudges={NUDGES} />);
    expect(container).toBeEmptyDOMElement();
    expect(read().acts).toEqual([]);
  });

  it("says quiz for a quiz, and tomorrow for one day away", () => {
    session("parent");
    render(<NudgeList child={ada} nudges={[{ ...NUDGES[1], days: 1, event: { ...event, kind: "quiz", title: "Spelling quiz" } }]} />);
    expect(screen.getByText("Ada has a quiz tomorrow, “Spelling quiz”, and no prep set is finished yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hand over to Ada to prep: Spelling quiz" })).toBeInTheDocument();
  });

  it("speaks the grown-up's language", () => {
    update((s) => {
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
      s.prefs = { locale: "es" };
    });
    render(<NudgeList child={ada} nudges={NUDGES.slice(0, 2)} />);
    expect(screen.getByText("Ada tiene un examen en 2 días, “Fractions test”, y todavía no terminó ninguna práctica de preparación.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pasarle el dispositivo a Ada para prepararse: Fractions test" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir el examen: History test" })).toBeInTheDocument();
  });
});
