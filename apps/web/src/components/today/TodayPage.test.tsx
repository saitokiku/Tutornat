import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(app)/home/page";
import { RULES } from "@/learning/engine";
import { dayLabel } from "@/lib/format";
import { planRef } from "@/lib/plan";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";
import { getSkill } from "@/practice/skills";

// The Today page as a whole: who it is for, the plan acts it records, the K–2 variant, and a day that
// turns over while the page is open.

const push = vi.fn();
const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/home",
  useSearchParams: () => new URLSearchParams(search),
}));

const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const leo: Profile = { id: "p2", accountId: "a1", nickname: "Leo", grade: "K", locale: "en", color: "#000", createdAt: 0 };
const today = () => localDate(Date.now());

function family(session: string) {
  update((s) => {
    s.accounts.push({ id: "a1", email: "a@b.co", displayName: "Sam", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(ada, leo);
    s.session = { accountId: "a1", profileId: session };
  });
}
const planActs = () => read().acts.filter((a) => a.kind === "plan");

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  search = "";
});
afterEach(() => {
  vi.useRealTimers();
  resetMemory();
});

describe("Today", () => {
  it("records the lead lines the learner was shown, once, and starts nothing", async () => {
    family("p1");
    const { unmount } = render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeInTheDocument();
    await waitFor(() => expect(planActs()).toHaveLength(2));
    expect(planActs().map((a) => a.ref)).toEqual([`${today()}:daily:math`, `${today()}:daily:english`]);
    expect(planActs().every((a) => a.intent === "plan-line-done" && a.profileId === "p1")).toBe(true);
    unmount();
    render(<HomePage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Today's plan" })).toBeInTheDocument());
    expect(planActs()).toHaveLength(2);
    expect(read().sets).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("K–2: the tutor first, 56px read-aloud everywhere, the 10-minute day said to grown-ups only", () => {
    family("p2");
    render(<HomePage />);
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: /Talk with the tutor/ })).toHaveAttribute("href", "/talk");
    const speakers = screen.getAllByRole("button", { name: /^Read aloud:/ });
    expect(speakers.length).toBeGreaterThanOrEqual(6);
    for (const b of speakers) expect(b).toHaveClass("size-14!");
    // The greeting is read without the name.
    expect(screen.getByRole("button", { name: /^Read aloud: Hi\. Today is/ })).toBeInTheDocument();
    const plan = document.querySelector('section[aria-labelledby="today"]')!;
    expect(plan.textContent).not.toMatch(/\bmin\b/);
    const grownUps = document.querySelector('section[aria-labelledby="grown-ups"]') as HTMLElement;
    expect(within(grownUps).getByText("Leo's daily practice: 10 minutes.")).toBeInTheDocument();
    expect(within(grownUps).getByRole("link", { name: /Add homework/ })).toHaveAttribute("href", "/calendar?add=homework");
    expect(within(grownUps).getByRole("link", { name: /Add a test/ })).toHaveAttribute("href", "/calendar?add=test");
  });

  it("K–2: a course already added sits under the learner's courses, not among the ones to pick", () => {
    family("p2");
    render(<HomePage />);
    const pick = document.querySelector('section[aria-labelledby="pick"]') as HTMLElement;
    const first = within(pick).getAllByRole("button", { name: /^(?!Read aloud)/ })[0];
    const title = first.textContent!;
    fireEvent.click(first);
    expect(push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/learn\//));
    const mine = document.querySelector('section[aria-labelledby="in-progress"]') as HTMLElement;
    expect(within(mine).getByRole("heading", { name: "Your courses" })).toBeInTheDocument();
    expect(within(mine).getByRole("link", { name: new RegExp(title.slice(0, 10)) })).toBeInTheDocument();
    const after = document.querySelector('section[aria-labelledby="pick"]');
    expect(after?.textContent ?? "").not.toContain(title);
  });

  it("raises Get help now for a family that came for help right now", () => {
    family("p1");
    update((s) => void (s.accounts[0].goals = ["help"]));
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Get help now" })).toHaveClass("k-btn-primary");
    expect(screen.getByRole("link", { name: "I have a test coming" })).toHaveAttribute("href", "/calendar?add=test");
  });

  it("the checks cell starts a check the plan had no room for", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T16:00:00"));
    const now = Date.now();
    family("p1");
    const ids = ["m.add.5", "m.count.10", "m.count.20"];
    update((s) => {
      s.attempts = ids.flatMap((skillId, k) =>
        Array.from({ length: RULES.readyWindow }, (_, i) => ({ id: `${k}-${i}`, profileId: "p1", at: now - 3 * 864e5 + k * 20_000 + i * 1000, skillId, level: getSkill(skillId)!.levels, seed: i, mode: "practice" as const, correct: true, assisted: false, seconds: 4 })),
      );
    });
    render(<HomePage />);
    const lines = () => read().sets.filter((x) => x.kind === "check");
    // The plan lists two checks; finish both, as if done from the plan.
    for (const button of screen.getAllByRole("button", { name: /^Start check, Check:/ })) fireEvent.click(button);
    expect(lines()).toHaveLength(2);
    act(() => void update((s) => s.sets.forEach((x) => (x.finishedAt = now))));
    fireEvent.click(screen.getByRole("button", { name: /^3 checks ready/ }));
    const third = lines().find((x) => !x.finishedAt)!;
    expect(third.planKey).toBe(planRef(today(), `check:${third.skillId}`));
    expect(lines().filter((x) => x.finishedAt).map((x) => x.skillId)).not.toContain(third.skillId);
    expect(push).toHaveBeenLastCalledWith(`/practice/${third.id}?from=today`);
  });

  it("left open overnight, shows the new day's plan in the morning and files work under it", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-07T21:00:00"));
    family("p1");
    render(<HomePage />);
    expect(screen.getByText(dayLabel(Date.now(), "en"))).toBeInTheDocument();
    expect(planActs().map((a) => a.ref)).toContain("2026-10-07:daily:math");

    // The page stays mounted through the night: an hour at a time, past midnight.
    for (let h = 0; h < 4; h++) act(() => void vi.advanceTimersByTime(3600_000));
    expect(localDate(Date.now())).toBe("2026-10-08");
    expect(screen.getByText(dayLabel(Date.now(), "en"))).toBeInTheDocument();
    expect(planActs().map((a) => a.ref)).toContain("2026-10-08:daily:math");

    fireEvent.click(within(document.getElementById("next")!).getByRole("button", { name: /^Start, Math:/ }));
    expect(read().sets.map((x) => x.planKey)).toEqual(["2026-10-08:daily:math"]);
  });

  it("a grown-up sees the child asked for, read-only, logs nothing, and can hand over", async () => {
    family("parent");
    search = "learner=p2";
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Today for Leo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Leo's page" })).toHaveAttribute("href", "/family/p2");
    expect(screen.queryByRole("button", { name: /^(Start|Continue)/ })).toBeNull();
    expect(screen.getByText(/10 min a day/)).toBeInTheDocument();
    expect(planActs()).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Ada" }));
    expect(replace).toHaveBeenLastCalledWith("/home?learner=p1");

    await userEvent.click(screen.getByRole("button", { name: "Hand over to Leo" }));
    expect(read().session).toMatchObject({ profileId: "p2", unlocked: false });
    expect(replace).toHaveBeenLastCalledWith("/home");
    expect(await screen.findByRole("heading", { level: 1, name: "Hi, Leo" })).toBeInTheDocument();
    await waitFor(() => expect(planActs().length).toBeGreaterThan(0));
  });

  it("a grown-up with no child named goes to Family, their home", () => {
    family("parent");
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
    expect(replace).toHaveBeenCalledWith("/family");
  });

  it("a grown-up asking for another family's child goes to Family too", () => {
    family("parent");
    update((s) => void s.profiles.push({ ...ada, id: "x1", accountId: "other" }));
    search = "learner=x1";
    render(<HomePage />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith("/family");
  });
});
