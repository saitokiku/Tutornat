import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(app)/home/page";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";

// The Today page as a whole: who it is for, the plan acts it records, and the K–2 variant.

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
const today = localDate(Date.now());

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
afterEach(() => resetMemory());

describe("Today", () => {
  it("records the lead lines the learner was shown, once, and starts nothing", async () => {
    family("p1");
    const { unmount } = render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeInTheDocument();
    await waitFor(() => expect(planActs()).toHaveLength(2));
    expect(planActs().map((a) => a.ref)).toEqual([`${today}:daily:math`, `${today}:daily:english`]);
    expect(planActs().every((a) => a.intent === "plan-line-done" && a.profileId === "p1")).toBe(true);
    unmount();
    render(<HomePage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Today's plan" })).toBeInTheDocument());
    expect(planActs()).toHaveLength(2);
    expect(read().sets).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("K–2: the tutor first, read-aloud everywhere, the 10-minute day said to grown-ups only", () => {
    family("p2");
    render(<HomePage />);
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: /Talk with the tutor/ })).toHaveAttribute("href", "/talk");
    expect(screen.getAllByRole("button", { name: /^Read aloud:/ }).length).toBeGreaterThanOrEqual(6);
    // The greeting is read without the name.
    expect(screen.getByRole("button", { name: /^Read aloud: Hi\. Today is/ })).toBeInTheDocument();
    const plan = document.querySelector('section[aria-labelledby="today"]')!;
    expect(plan.textContent).not.toMatch(/\bmin\b/);
    const grownUps = document.querySelector('section[aria-labelledby="grown-ups"]') as HTMLElement;
    expect(within(grownUps).getByText("Leo's plan fits about 10 minutes a day.")).toBeInTheDocument();
    expect(within(grownUps).getByRole("link", { name: /Add a test or homework/ })).toHaveAttribute("href", "/calendar?add=test");
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

  it("a grown-up with no learners is pointed to adding one", () => {
    update((s) => {
      s.accounts.push({ id: "a1", email: "a@b.co", displayName: "Sam", salt: "", passwordHash: "", createdAt: 0 });
      s.session = { accountId: "a1", profileId: "parent" };
    });
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Add a learner" })).toHaveAttribute("href", "/profiles");
  });
});
