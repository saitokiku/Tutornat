import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "@/lib/auth";
import { createLearner } from "@/lib/profiles";
import { read, resetMemory, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { HowWeTeach } from "./HowWeTeach";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 18).getTime();

/** The page passes the child from the store; so does this. */
function Harness({ id }: { id: string }) {
  const child = useStore((s) => s.profiles.find((p) => p.id === id))!;
  return <HowWeTeach child={child} now={NOW} />;
}

async function setup() {
  await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
  const kid = createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
  render(<Harness id={kid.id} />);
  return kid;
}

describe("How we teach", () => {
  it("shows every fact with its evidence; an empty record says not enough yet", async () => {
    await setup();
    expect(screen.getByRole("heading", { level: 2, name: "How we teach Ada" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Hint that usually does it" })).toBeVisible();
    expect(screen.getAllByText("Not enough yet").length).toBe(8);
    expect(screen.getByText("Shows after 4 problems solved with a hint. So far: 0.")).toBeVisible();
    expect(screen.getByText(/^Learns in English\./)).toBeVisible();
    expect(screen.getByText("From settings")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Clear my edits" })).toBeNull();
  });

  it("a tapped choice is saved, checked, and marked as set by a grown-up", async () => {
    await setup();
    const group = screen.getByRole("group", { name: "Pictures that help" });
    await userEvent.click(within(group).getByRole("radio", { name: "Pictures" }));
    expect(read().profiles[0].teaching).toEqual({ representation: "pictures" });
    expect(within(group).getByRole("radio", { name: "Pictures" })).toBeChecked();
    expect(screen.getByText("Set by a grown-up")).toBeVisible();
    expect(screen.getByText("The record alone doesn't point to one yet.")).toBeVisible();
    await userEvent.click(within(group).getByRole("radio", { name: "Follow the record" }));
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
    expect(document.activeElement).toBe(screen.getByLabelText("Note for the tutor"));
    await user.keyboard("Likes drawing");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
    await user.keyboard("{Enter}");
    expect(read().profiles[0].teaching?.note).toBe("Likes drawing");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Clear my edits" }));
    await user.keyboard("{Enter}");
    expect(screen.getByText("Clear your edits? The record decides again.")).toBeVisible();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Yes, clear" }));
    await user.keyboard("{Enter}");
    expect(read().profiles[0]).not.toHaveProperty("teaching");
    expect(screen.getByLabelText("Note for the tutor")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("cancelling the clear keeps the edits and returns focus", async () => {
    await setup();
    await userEvent.click(within(screen.getByRole("group", { name: "When stuck, start with" })).getByRole("radio", { name: "A hint" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear my edits" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(read().profiles[0].teaching).toEqual({ leadWith: "hint" });
    expect(screen.getByRole("button", { name: "Clear my edits" })).toBeVisible();
  });
});
