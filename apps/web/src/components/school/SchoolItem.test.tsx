import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBlobs, putBlob } from "@/lib/blobs";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import type { SchoolEvent } from "@/planner/types";
import { SchoolItem } from "./SchoolItem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/ai/client", () => ({ useAiMode: () => "demo", aiStatus: async () => "demo" }));

const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const bo: Profile = { id: "p2", accountId: "a1", nickname: "Bo", grade: "2", locale: "en", color: "#111", createdAt: 0 };
const today = localDate(Date.now());
const item = (patch: Partial<SchoolEvent> & Pick<SchoolEvent, "id">): SchoolEvent => ({
  profileId: "p1",
  title: "Fractions test",
  kind: "test",
  date: addDays(today, 2),
  skillIds: [],
  source: "typed",
  createdAt: 0,
  ...patch,
});

function family(session: "p1" | "parent", unlocked = false, events: SchoolEvent[] = []) {
  update((s) => {
    s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(ada, bo);
    s.session = { accountId: "a1", profileId: session, unlocked };
    s.events.push(...events);
    // One practice answer: "Name the fraction" is being practiced; "Equivalent fractions" is not started.
    s.attempts.push({ id: "t1", profileId: "p1", at: Date.now() - 60_000, skillId: "m.frac.unit", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 12 });
  });
}

beforeEach(() => {
  push.mockClear();
  Element.prototype.scrollIntoView = vi.fn(); // not in jsdom
});
afterEach(async () => {
  resetMemory();
  await clearBlobs();
});

describe("school item page", () => {
  it("shows a test with its day, its linked skills' statuses and a prep button that starts prep", async () => {
    family("p1", false, [item({ id: "e1", skillIds: ["m.frac.unit", "m.frac.equiv"] })]);
    render(<SchoolItem eventId="e1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Fractions test" })).toBeInTheDocument();
    expect(screen.getByText("in 2 days")).toBeInTheDocument();
    expect(screen.getByText("0 proved · 1 practicing · 1 not started")).toBeInTheDocument();
    const rows = within(screen.getByRole("region", { name: "What it covers" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Name the fraction");
    expect(rows[0]).toHaveTextContent("Practicing");
    expect(rows[1]).toHaveTextContent("Not started");
    expect(screen.getByRole("link", { name: /Get help/ })).toHaveAttribute("href", "/talk?event=e1");
    await userEvent.click(screen.getByRole("button", { name: /Prep for this test/ }));
    const set = read().sets[0];
    expect(set).toMatchObject({ kind: "prep", eventId: "e1", planKey: `${today}:prep:e1`, profileId: "p1" });
    expect(push).toHaveBeenCalledWith(`/practice/${set.id}?from=event:e1`);
  });

  it("homework offers help first and practice on its skill; it can be marked done and undone by keyboard", async () => {
    const user = userEvent.setup();
    family("p1", false, [item({ id: "e2", kind: "homework", title: "Times tables sheet", date: addDays(today, 1), skillIds: ["m.mult.facts"] })]);
    render(<SchoolItem eventId="e2" />);
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Prep/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Practice Multiplication facts to 10 × 10" }));
    expect(read().sets[0]).toMatchObject({ kind: "pick", skillId: "m.mult.facts" });

    const done = screen.getByRole("button", { name: /Mark done/ });
    done.focus();
    await user.keyboard("{Enter}");
    expect(read().events[0].done).toBe(true);
    expect(screen.getByText("Done")).toBeInTheDocument();
    // Due tomorrow, so it is on Today's plan: marked done the way Today marks it.
    expect(read().planDone).toMatchObject([{ profileId: "p1", date: today, key: "due:e2" }]);
    await user.keyboard("{Enter}");
    expect(read().events[0].done).toBe(false);
    expect(read().planDone).toHaveLength(0);
  });

  it("an item not on today's plan is marked done on its own", async () => {
    family("p1", false, [item({ id: "e12", kind: "homework", date: addDays(today, 9) })]);
    render(<SchoolItem eventId="e12" />);
    await userEvent.click(screen.getByRole("button", { name: /Mark done/ }));
    expect(read().events[0].done).toBe(true);
    expect(read().planDone).toHaveLength(0);
  });

  it("for a K-2 learner, every action is the bigger target and the lines can be read aloud", () => {
    family("p1", false, [item({ id: "e13", profileId: "p2", title: "Spelling test", skillIds: ["m.frac.unit"] })]);
    update((s) => void (s.session.profileId = "p2"));
    render(<SchoolItem eventId="e13" />);
    expect(screen.getByRole("button", { name: /^Read aloud: Spelling test/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Read aloud: Name the fraction/ })).toBeInTheDocument();
    for (const name of [/Prep for this test/, /Mark done/, /Edit/, /Delete/]) expect(screen.getByRole("button", { name })).toHaveClass("min-h-14");
    expect(screen.getByRole("link", { name: /Get help/ })).toHaveClass("min-h-14");
  });

  it("shows what came with it: the text, and the file when this device has it", async () => {
    const blobId = (await putBlob(new Blob(["%PDF-1.4"], { type: "application/pdf" }), "sheet.pdf"))!;
    family("p1", false, [
      item({ id: "e3", kind: "homework", attachment: { text: "Show your work on every problem.\nPages 45 and 46.", blobId, name: "sheet.pdf", mediaType: "application/pdf" } }),
      item({ id: "e4", kind: "homework", attachment: { blobId: "gone-from-this-device" } }),
    ]);
    const { unmount } = render(<SchoolItem eventId="e3" />);
    expect(screen.getByText(/Show your work on every problem/)).toBeInTheDocument();
    const open = await screen.findByRole("link", { name: /Open the PDF/ });
    expect(open).toHaveAttribute("target", "_blank");
    expect(open.getAttribute("href")).toMatch(/^blob:/);
    expect(screen.getByText(/^PDF · sheet\.pdf · /)).toBeInTheDocument();
    // jsdom has no IndexedDB: the file is only in memory, and the page says so.
    expect(screen.getByText("This browser won't keep the file after the page closes.")).toBeInTheDocument();
    unmount();
    render(<SchoolItem eventId="e4" />);
    expect(await screen.findByText("The file isn't saved on this device.")).toBeInTheDocument();
  });

  it("changes linked skills with the skill picker", async () => {
    family("p1", false, [item({ id: "e5", skillIds: ["m.frac.unit", "m.frac.equiv"] })]);
    render(<SchoolItem eventId="e5" />);
    await userEvent.click(screen.getByRole("button", { name: /Change skills/ }));
    await userEvent.click(screen.getByRole("button", { name: "Remove: Equivalent fractions" }));
    expect(read().events[0].skillIds).toEqual(["m.frac.unit"]);
  });

  it("deleting asks a grown-up first, then confirms, then goes back to the calendar", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // the gate asks 6 × 6
    const user = userEvent.setup();
    family("p1", false, [item({ id: "e6" })]);
    render(<SchoolItem eventId="e6" />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await user.type(screen.getByLabelText("What is 6 × 6?"), "36");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Delete “Fractions test”? Its file goes too. This can't be undone.")).toBeInTheDocument();
    // Focus lands on Cancel, so a second Enter never deletes; the delete button carries the question.
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    const yes = screen.getByRole("button", { name: "Yes, delete" });
    expect(yes).toHaveAccessibleDescription("Delete “Fractions test”? Its file goes too. This can't be undone.");
    await user.tab();
    expect(yes).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/calendar");
    expect(read().events).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("backing out of the delete step puts focus back on Delete", async () => {
    const user = userEvent.setup();
    family("p1", true, [item({ id: "e14" })]);
    render(<SchoolItem eventId="e14" />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await user.keyboard("{Enter}"); // Cancel has focus
    expect(screen.getByRole("button", { name: /Delete/ })).toHaveFocus();
    expect(read().events).toHaveLength(1);
  });

  it("a grown-up already trusted goes straight to the confirm step", async () => {
    family("p1", true, [item({ id: "e7" })]);
    render(<SchoolItem eventId="e7" />);
    await userEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(read().events).toHaveLength(1);
  });

  it("a day off is shown, not worked on", () => {
    family("p1", false, [item({ id: "e11", kind: "no-school", title: "Teacher work day" })]);
    render(<SchoolItem eventId="e11" />);
    expect(screen.getByText("No school")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get help/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark done/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "What it covers" })).not.toBeInTheDocument();
  });

  it("is not found for a wrong id or another learner's item", () => {
    family("p1", false, [item({ id: "e8", profileId: "p2", title: "Bo's quiz" })]);
    render(<SchoolItem eventId="e8" />);
    expect(screen.getByText("We couldn't find that")).toBeInTheDocument();
    expect(screen.queryByText("Bo's quiz")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the calendar" })).toHaveAttribute("href", "/calendar");
  });

  it("a grown-up sees any of the family's items, without the learner's buttons", () => {
    family("parent", true, [item({ id: "e9", profileId: "p2", title: "Bo's spelling test", skillIds: ["m.frac.unit"] })]);
    render(<SchoolItem eventId="e9" />);
    expect(screen.getByRole("heading", { level: 1, name: "Bo's spelling test" })).toBeInTheDocument();
    expect(screen.getByText(/Prep, practice and help open in Bo's profile/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Prep for this test/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get help/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark done/ })).toBeInTheDocument();
  });

  it("a learner on their own can't reach the edit form's delete: Edit asks a grown-up first", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // the gate asks 6 × 6
    const user = userEvent.setup();
    family("p1", false, [item({ id: "e10" })]);
    render(<SchoolItem eventId="e10" />);
    await user.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByText("Ask a grown-up")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Edit" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: /Edit/ })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /Edit/ }));
    await user.type(screen.getByLabelText("What is 6 × 6?"), "36");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("a trusted grown-up edits through the calendar's form, and the page leaves when the form deletes the item", async () => {
    family("p1", true, [item({ id: "e15" })]);
    render(<SchoolItem eventId="e15" />);
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/calendar"));
  });
});
