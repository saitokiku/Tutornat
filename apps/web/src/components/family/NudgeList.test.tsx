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
const event: SchoolEvent = { id: "e1", profileId: "ada", title: "Fractions test", kind: "test", date: "2026-10-09", skillIds: [], source: "typed", createdAt: 0 };
const today = { href: "/home", handover: true };
const NUDGES: Nudge[] = [
  { key: "prep:e1", kind: "prep", days: 2, event, action: { href: "/calendar/e1", handover: false } },
  { key: "check:m.add.5", kind: "check", days: 15, skillId: "m.add.5", action: today },
  { key: "stuck:m.add.10", kind: "stuck", days: 0, skillId: "m.add.10", action: today },
  { key: "idle:2026-10-01", kind: "idle", days: 6, action: today },
];

const session = (profileId: string) =>
  update((s) => {
    s.profiles = [ada];
    s.session = { accountId: "acc", profileId, unlocked: profileId === "parent" };
  });

describe("NudgeList", () => {
  it("says each nudge in one sentence with one action link", () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    expect(screen.getByText("Ada has a test in 2 days, “Fractions test”, and no prep set is finished yet.")).toBeInTheDocument();
    expect(screen.getByText("The check on “Add within 5” has been waiting for Ada for 15 days.")).toBeInTheDocument();
    expect(screen.getByText("“Add within 10” has been hard for Ada three sets in a row. Try the next one together.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the test" })).toHaveAttribute("href", "/calendar/e1");
    expect(screen.getAllByRole("link", { name: "Open Ada's Today" })).toHaveLength(NUDGES_SHOWN - 1);
    // The fourth waits behind "Show 1 more".
    expect(screen.queryByText("Ada hasn't done anything here for 6 days.")).not.toBeInTheDocument();
  });

  it("works from the keyboard: the test link goes to the item page; a Today link hands the device to the child", async () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Open the test" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(read().session.profileId).toBe("parent");
    await userEvent.tab();
    expect(screen.getAllByRole("link", { name: "Open Ada's Today" })[0]).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(read().session.profileId).toBe("ada");
  });

  it("shows the rest on request, keeping focus on the toggle", async () => {
    session("parent");
    render(<NudgeList child={ada} nudges={NUDGES} />);
    const more = screen.getByRole("button", { name: "Show 1 more" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    more.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Ada hasn't done anything here for 6 days.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
  });

  it("records each shown nudge once as a nudge act for the child, and the rest when shown", async () => {
    session("parent");
    const { rerender } = render(<NudgeList child={ada} nudges={NUDGES} />);
    rerender(<NudgeList child={ada} nudges={NUDGES} />);
    const acts = () => read().acts.map((a) => [a.profileId, a.kind, a.intent, a.ref]);
    expect(acts()).toEqual([
      ["ada", "nudge", "parent-acts", "prep:e1"],
      ["ada", "nudge", "parent-acts", "check:m.add.5"],
      ["ada", "nudge", "parent-acts", "stuck:m.add.10"],
    ]);
    expect(read().acts.every((a) => a.outcome === undefined)).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    expect(acts().map((a) => a[3])).toEqual(["prep:e1", "check:m.add.5", "stuck:m.add.10", "idle:2026-10-01"]);
  });

  it("shows nothing to a child and records nothing", () => {
    session("ada");
    const { container } = render(<NudgeList child={ada} nudges={NUDGES} />);
    expect(container).toBeEmptyDOMElement();
    expect(read().acts).toEqual([]);
  });

  it("says quiz for a quiz, and tomorrow for one day away", () => {
    session("parent");
    render(<NudgeList child={ada} nudges={[{ ...NUDGES[0], days: 1, event: { ...event, kind: "quiz", title: "Spelling quiz" } }]} />);
    expect(screen.getByText("Ada has a quiz tomorrow, “Spelling quiz”, and no prep set is finished yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the quiz" })).toBeInTheDocument();
  });
});
