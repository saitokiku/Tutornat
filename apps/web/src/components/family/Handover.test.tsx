import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, StrictMode, act, type ComponentProps, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FamilyPage from "@/app/(app)/family/page";
import PracticePage from "@/app/(app)/practice/page";
import { RULES } from "@/learning/engine";
import type { Attempt } from "@/learning/types";
import { nudgesFor } from "@/lib/nudges";
import { useScopeKey } from "@/components/shell/route";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { HandoverScope, useHandover } from "./Handover";

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
const replace = vi.fn();
let search = "";
let path = "/family";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }), usePathname: () => path, useSearchParams: () => new URLSearchParams(search) }));

afterEach(() => {
  resetMemory();
  replace.mockClear();
  vi.useRealTimers();
  path = "/family";
});

/** The handover boundary must survive the shell's learner-specific page remount. */
function Shell({ children }: { children: ReactNode }) {
  return <HandoverScope><div key={useScopeKey()}>{children}</div></HandoverScope>;
}

// Wednesday 7 October 2026, 3 pm local.
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const D = 864e5;
const ada: Profile = { id: "ada", accountId: "acc", nickname: "Ada", grade: "4", locale: "en", color: "#A93B5D", createdAt: NOW - 30 * D };

describe("handing the device to a child from the family overview", () => {
  it("lands on the link's page: the grown-ups-only Guard does not send the child to Today first", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    // Three hard sets on fractions during test prep: a stuck skill that is not on Today's plan.
    const hard = (day: number, setId: string): Attempt[] =>
      Array.from({ length: 5 }, (_, i) => ({ id: `${setId}${i}`, profileId: "ada", at: NOW - day * D + i * 1000, skillId: "m.frac.equiv", level: 1, seed: i, setId, mode: "prep", correct: i < 1, assisted: false, seconds: 20 }));
    update((s) => {
      s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
      s.attempts = [...hard(3, "a"), ...hard(2, "b"), ...hard(1, "c")];
    });
    render(<Shell><FamilyPage /></Shell>);
    const link = screen.getByRole("link", { name: "Hand over to Ada to practice: Equivalent fractions" });
    expect(link).toHaveAttribute("href", "/practice?subject=math&again=m.frac.equiv");
    link.focus();
    await userEvent.keyboard("{Enter}");
    expect(read().session.profileId).toBe("ada");
    // The page stepped aside; nothing redirected the navigation.
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Family" })).not.toBeInTheDocument();
  });

  it("still steps aside when the shell starts the page fresh for the child (its content is keyed by who is learning)", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const hard = (day: number, setId: string): Attempt[] =>
      Array.from({ length: 5 }, (_, i) => ({ id: `${setId}${i}`, profileId: "ada", at: NOW - day * D + i * 1000, skillId: "m.frac.equiv", level: 1, seed: i, setId, mode: "prep", correct: i < 1, assisted: false, seconds: 20 }));
    update((s) => {
      s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
      s.attempts = [...hard(3, "a"), ...hard(2, "b"), ...hard(1, "c")];
    });
    // As AppShell does: a new learner gets their pages fresh.
    const { unmount } = render(
      <Shell>
        <FamilyPage />
      </Shell>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Hand over to Ada to practice: Equivalent fractions" }));
    expect(read().session.profileId).toBe("ada");
    // The remounted page did not mount its grown-ups-only Guard in the child's session.
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Family" })).not.toBeInTheDocument();
    unmount();
    // A later visit by the child is an ordinary one: the Guard sends them to their own Today.
    render(<Shell><FamilyPage /></Shell>);
    expect(replace).toHaveBeenCalledWith("/home");
  });

  it("shows the page again when the grown-up comes back to it (Next keeps visited pages hidden, not unmounted)", async () => {
    function Card() {
      const handover = useHandover("ada");
      return (
        <button type="button" onClick={handover}>
          Hand over
        </button>
      );
    }
    update((s) => {
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
    });
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <HandoverScope>
          <Card />
        </HandoverScope>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await userEvent.click(screen.getByRole("button", { name: "Hand over" }));
    expect(screen.queryByRole("button", { name: "Hand over" })).not.toBeInTheDocument();
    rerender(page("hidden"));
    // Back through the grown-up gate.
    act(() => update((s) => void (s.session.profileId = "parent")));
    rerender(page("visible"));
    expect(screen.getByRole("button", { name: "Hand over" })).toBeVisible();
  });

  it("Back to a cached Family page as the child remounts its guard, including StrictMode", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    update((s) => {
      s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
      s.attempts = [1, 2, 3].flatMap((day) => Array.from({ length: 5 }, (_, i) => ({ id: `${day}-${i}`, profileId: "ada", at: NOW - day * D + i * 1000, skillId: "m.frac.equiv", level: 1, seed: i, setId: `set-${day}`, mode: "prep" as const, correct: i === 0, assisted: false, seconds: 20 })));
    });
    const page = (mode: "visible" | "hidden") => <StrictMode><Shell><Activity mode={mode}><FamilyPage /></Activity></Shell></StrictMode>;
    const { rerender } = render(page("visible"));
    await userEvent.click(screen.getByRole("link", { name: "Hand over to Ada to practice: Equivalent fractions" }));
    expect(replace).not.toHaveBeenCalled();
    path = "/practice";
    rerender(page("hidden"));
    path = "/family";
    rerender(page("visible"));
    expect(replace).toHaveBeenCalledWith("/home");
  });
});

describe("where the hand-over links land, in the child's session", () => {
  const answer = (i: number, t: number, skillId: string, o: Partial<Attempt> = {}): Attempt => ({
    id: `x${skillId}${i}`, profileId: "ada", at: t + i * 60_000, skillId, level: 1, seed: i, setId: `s${t}`, mode: "practice", correct: true, assisted: false, seconds: 10, ...o,
  });
  const asChild = (attempts: Attempt[]) =>
    update((s) => {
      s.accounts = [{ id: "acc", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 }];
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "ada", unlocked: false };
      s.attempts = attempts;
    });

  it("a stuck skill's link opens Practice with that skill first", () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    asChild([1, 2, 3].flatMap((day) => Array.from({ length: 5 }, (_, i) => answer(i, NOW - day * D, "m.frac.equiv", { mode: "prep", correct: i === 0 }))));
    const nudge = nudgesFor(read(), "ada", NOW).find((x) => x.kind === "stuck")!;
    search = nudge.action.href.split("?")[1];
    render(<PracticePage />);
    const next = screen.getByRole("region", { name: "Practice this again" });
    expect(next).toHaveTextContent("Equivalent fractions");
  });

  it("an overdue check's link opens Practice with the check ready to start", () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    // Ready a month ago, never checked.
    asChild(Array.from({ length: RULES.readyWindow }, (_, i) => answer(i, NOW - 30 * D, "m.add.5")));
    const nudge = nudgesFor(read(), "ada", NOW).find((x) => x.kind === "check")!;
    search = nudge.action.href.split("?")[1];
    render(<PracticePage />);
    const checks = screen.getByRole("region", { name: "Checks ready" });
    expect(checks).toHaveTextContent("Add within 5");
    expect(screen.getAllByRole("button", { name: /^Start check: / })).toHaveLength(1);
  });
});
