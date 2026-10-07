import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "@/app/(app)/calendar/page";
import { addClass, eventsOf } from "@/lib/school";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";

// The calendar page as a family meets it: the URL picks the panel, panels close the way they opened,
// and a young learner's week leaves grown-up controls behind the grown-up question.

vi.mock("@/lib/ai/client", () => ({ useAiMode: () => "demo" }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (fn: () => void) => {
    window.addEventListener("popstate", fn);
    window.addEventListener("test:navigate", fn);
    return () => {
      window.removeEventListener("popstate", fn);
      window.removeEventListener("test:navigate", fn);
    };
  };
  return {
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
    usePathname: () => window.location.pathname,
    useRouter: () => router,
  };
});

const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
function signIn(p: Profile, unlocked = false) {
  update((s) => {
    s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(p);
    s.session = { accountId: "a1", profileId: p.id, unlocked };
  });
}
const at = (url: string) => window.history.replaceState(null, "", url);

beforeEach(() => {
  // Next keeps useSearchParams in step with the history API; the mock above listens for this.
  for (const name of ["pushState", "replaceState"] as const) {
    const real = History.prototype[name];
    vi.spyOn(window.history, name).mockImplementation(function (this: History, ...args: Parameters<History["pushState"]>) {
      real.apply(window.history, args);
      window.dispatchEvent(new Event("test:navigate"));
    });
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  resetMemory();
  at("/");
});

describe("Calendar page", () => {
  it("opens the add form a link asks for, with that kind and day chosen", () => {
    signIn(ada);
    at("/calendar?add=test&date=2026-10-12");
    render(<CalendarPage />);
    const form = screen.getByRole("form", { name: "Add to the calendar" });
    expect(within(form).getByRole("radio", { name: "Test" })).toBeChecked();
    expect(within(form).getByLabelText("Date")).toHaveValue("2026-10-12");
  });

  it("closes a form reached by a link in place, leaving a clean address", async () => {
    const user = userEvent.setup();
    signIn(ada);
    at("/calendar?add=quiz");
    render(<CalendarPage />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(window.location.search).toBe("");
    expect(screen.queryByRole("form", { name: "Add to the calendar" })).toBeNull();
    // Focus lands on the page heading rather than nowhere.
    expect(screen.getByRole("heading", { level: 1, name: "Calendar & school" })).toHaveFocus();
  });

  it("opens a panel as one history step, so closing it goes back, and focus returns to its button", async () => {
    const user = userEvent.setup();
    signIn(ada);
    at("/calendar");
    const length = window.history.length;
    render(<CalendarPage />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(window.location.search).toBe("?add=");
    // Switching to another panel replaces the step instead of stacking one.
    await user.click(screen.getByRole("button", { name: "Import from school" }));
    expect(window.location.search).toBe("?import=paste");
    expect(window.history.length).toBe(length + 1);
    const back = vi.spyOn(window.history, "back");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(back).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.queryByRole("region", { name: "Bring in school dates" })).toBeNull();
    expect(screen.getByRole("button", { name: "Import from school" })).toHaveFocus();
  });

  it("puts a saved item's result where focus is, and shows its week", async () => {
    const user = userEvent.setup();
    signIn(ada);
    at("/calendar?add=test&date=2030-01-15");
    render(<CalendarPage />);
    await user.type(screen.getByLabelText("What"), "Science test");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(eventsOf(read(), "p1")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Saved: Science test, Jan 15.");
    expect(screen.getByRole("status").parentElement).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: /January 14\s*–\s*20, 2030/ })).toBeInTheDocument();
  });

  it("refreshes class calendars and opens the review of what is new", async () => {
    const user = userEvent.setup();
    signIn(ada);
    addClass("p1", { name: "Math 6", subject: "math", feedUrl: "https://school.example/m.ics" });
    const feed = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:n1", "DTSTART;VALUE=DATE:20300115", "SUMMARY:Unit 4 Test", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feed)));
    at("/calendar");
    render(<CalendarPage />);
    await user.click(screen.getByRole("button", { name: "Refresh class calendars" }));
    expect(await screen.findByText("Math 6: 1 new to review.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review 1 new from Math 6" }));
    const panel = screen.getByRole("region", { name: "New on Math 6's calendar" });
    await user.click(within(panel).getByRole("button", { name: "Save 1" }));
    expect(eventsOf(read(), "p1")).toMatchObject([{ uid: "n1", title: "Unit 4 Test" }]);
    vi.unstubAllGlobals();
  });

  it("gives a young learner the week, read aloud, and keeps grown-up controls behind the grown-up question", async () => {
    const user = userEvent.setup();
    signIn({ ...ada, grade: "1" });
    at("/calendar");
    render(<CalendarPage />);
    expect(screen.getAllByRole("button", { name: /^Read aloud: / })).toHaveLength(7);
    for (const name of ["Add", "Import from school", "Download .ics"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByRole("form", { name: "Add class" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "For grown-ups" }));
    const question = screen.getByLabelText(/^What is \d+ × \d+\?$/);
    const [a, b] = question.closest("form")!.textContent!.match(/(\d+) × (\d+)/)!.slice(1).map(Number);
    await user.type(question, String(a * b));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(read().session.unlocked).toBe(true);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Add class" })).toBeInTheDocument();
  });

  it("asks the grown-up question before a young learner's link opens the add form", async () => {
    signIn({ ...ada, grade: "K" });
    at("/calendar?add=test");
    render(<CalendarPage />);
    expect(screen.queryByRole("form", { name: "Add to the calendar" })).toBeNull();
    expect(screen.getByText("Ask a grown-up")).toBeInTheDocument();
    act(() => update((s) => void (s.session.unlocked = true)));
    expect(screen.getByRole("form", { name: "Add to the calendar" })).toBeInTheDocument();
  });
});
