import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "@/lib/auth";
import { createLearner } from "@/lib/profiles";
import { read, resetMemory, update, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import { HowWeTeach } from "./HowWeTeach";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 18).getTime();

/** The page passes the child from the store; so does this. */
function Harness({ id }: { id: string }) {
  const child = useStore((s) => s.profiles.find((p) => p.id === id))!;
  return <HowWeTeach child={child} now={NOW} />;
}

async function setup(record?: (kid: Profile) => void) {
  await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
  const kid = createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
  record?.(kid);
  render(<Harness id={kid.id} />);
  return kid;
}

describe("How we teach", () => {
  it("a new learner: the two choices, the note, and one line for everything still waiting on practice", async () => {
    await setup();
    expect(screen.getByRole("heading", { level: 2, name: "How we teach Ada" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "When stuck, start with" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Pictures that help" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 3, name: "Hint that usually does it" })).toBeNull();
    expect(screen.getAllByText("Not enough yet")).toHaveLength(2);
    expect(
      screen.getByText("Not enough practice yet for hint that usually does it, pace, how a sitting goes, mistakes that come back, time of day, and day of the week. These fill in as Ada practices."),
    ).toBeVisible();
    expect(screen.getByText(/^Learns in English\./)).toBeVisible();
    expect(screen.getByText("From settings")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Clear my edits" })).toBeNull();

    await userEvent.click(screen.getByText("What each one needs"));
    expect(screen.getByText("Shows after 4 problems solved with a hint. So far: 0.")).toBeVisible();
  });

  it("shows a fact as its own row once there is enough evidence", async () => {
    const usual = makeItem("m.add.20", 1, 1, "en").seconds;
    await setup((kid) =>
      update((s) => {
        for (let i = 0; i < 12; i++) s.attempts.push({ id: `a${i}`, profileId: kid.id, at: NOW - 864e5 + i * 60_000, skillId: "m.add.20", level: 1, seed: i + 1, mode: "practice", correct: true, assisted: false, seconds: usual * 2 });
      }),
    );
    expect(screen.getByRole("heading", { level: 3, name: "Pace" })).toBeVisible();
    expect(screen.getByText("Takes longer than the usual pace")).toBeVisible();
    expect(screen.getByText(/^Not enough practice yet for hint that usually does it, how a sitting goes/)).toBeVisible();
  });

  it("a tapped choice is saved, checked, and marked as set by a grown-up", async () => {
    await setup();
    const group = screen.getByRole("group", { name: "Pictures that help" });
    await userEvent.click(within(group).getByRole("radio", { name: "Pictures" }));
    expect(read().profiles[0].teaching).toEqual({ representation: "pictures" });
    expect(within(group).getByRole("radio", { name: "Pictures" })).toBeChecked();
    expect(screen.getByText("Set by a grown-up")).toBeVisible();
    expect(screen.getByText("Practice alone doesn't point to one yet.")).toBeVisible();
    await userEvent.click(within(group).getByRole("radio", { name: "Decide from practice" }));
    expect(read().profiles[0]).not.toHaveProperty("teaching");
    expect(screen.queryByText("Set by a grown-up")).toBeNull();
  });

  it("works by keyboard alone: choose, leave a note, clear the edits behind a confirm", async () => {
    await setup();
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("group", { name: "When stuck, start with" })).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(read().profiles[0].teaching).toEqual({ leadWith: "example" });

    await user.tab();
    expect(screen.getByRole("group", { name: "Pictures that help" })).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(read().profiles[0].teaching).toEqual({ leadWith: "example", representation: "number-line" });

    await user.tab();
    expect(document.activeElement).toHaveTextContent("What each one needs");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Note for the tutor"));
    await user.keyboard("Likes drawing");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save note" }));
    await user.keyboard("{Enter}");
    expect(read().profiles[0].teaching?.note).toBe("Likes drawing");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Clear my edits" }));
    await user.keyboard("{Enter}");
    const yes = screen.getByRole("button", { name: "Yes, clear" });
    expect(document.activeElement).toBe(yes);
    expect(yes).toHaveAccessibleDescription("Clear your choices and your note? Their practice decides again.");
    await user.keyboard("{Enter}");
    expect(read().profiles[0]).not.toHaveProperty("teaching");
    expect(screen.getByLabelText("Note for the tutor")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("");
    await new Promise((r) => requestAnimationFrame(r));
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "How we teach Ada" }));
  });

  it("an unchanged note saved again, then cleared, doesn't claim it was saved", async () => {
    await setup();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Note for the tutor"), "Likes drawing");
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    await user.click(screen.getByRole("button", { name: "Clear my edits" }));
    await user.click(screen.getByRole("button", { name: "Yes, clear" }));
    expect(screen.getByLabelText("Note for the tutor")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("cancelling the clear keeps the edits and returns focus", async () => {
    await setup();
    await userEvent.click(within(screen.getByRole("group", { name: "When stuck, start with" })).getByRole("radio", { name: "A hint" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear my edits" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(read().profiles[0].teaching).toEqual({ leadWith: "hint" });
    await new Promise((r) => requestAnimationFrame(r));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Clear my edits" }));
  });

  it("can be turned off, which deletes the edits and works nothing out, and turned back on", async () => {
    await setup();
    const user = userEvent.setup();
    await user.click(within(screen.getByRole("group", { name: "Pictures that help" })).getByRole("radio", { name: "Words" }));
    await user.click(screen.getByRole("button", { name: "Turn off and delete" }));
    const yes = screen.getByRole("button", { name: "Yes, turn off" });
    expect(document.activeElement).toBe(yes);
    expect(yes).toHaveAccessibleDescription(/^Turn off How we teach Ada\? Your choices and note are deleted/);
    await user.keyboard("{Enter}");
    expect(read().profiles[0].teaching).toEqual({ off: true });
    expect(screen.getByText(/^Turned off\. Nothing about how Ada learns is worked out from practice/)).toBeVisible();
    expect(screen.queryByRole("group", { name: "Pictures that help" })).toBeNull();
    expect(screen.queryByLabelText("Note for the tutor")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Turn back on" }));
    expect(read().profiles[0]).not.toHaveProperty("teaching");
    expect(screen.getByRole("group", { name: "Pictures that help" })).toBeVisible();
  });
});
