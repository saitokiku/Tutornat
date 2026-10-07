import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "@/lib/auth";
import { addNote, createLearner } from "@/lib/profiles";
import { read, resetMemory } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { ChildNotes } from "./ChildNotes";

afterEach(() => resetMemory());

async function kid() {
  await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
  return createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
}

describe("child notes", () => {
  it("adds a note, marks the tutor's and the safety screen's, and deletes only after a confirm", async () => {
    const ada = await kid();
    addNote(ada.id, "Stuck on carrying again.", "tutor");
    addNote(ada.id, "A safety reply was shown.", "safety");
    render(<ChildNotes child={ada} />);
    expect(screen.getByText("From the tutor:")).toBeVisible();
    expect(screen.getByText("Safety note:")).toBeVisible();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add note"), "Try the number line");
    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByText("Try the number line")).toBeVisible();
    expect(read().notes).toHaveLength(3);

    const deletes = screen.getAllByRole("button", { name: "Delete note" });
    await user.click(deletes[0]);
    expect(screen.getByText("Delete this note?")).toBeVisible();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Yes, delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(read().notes).toHaveLength(3);
    await user.click(screen.getAllByRole("button", { name: "Delete note" })[0]);
    await user.keyboard("{Enter}");
    expect(read().notes).toHaveLength(2);
  });

  it("keeps keyboard focus in place: back on cancel, on to the next note after a delete, the heading after the last", async () => {
    const ada = await kid();
    addNote(ada.id, "First");
    addNote(ada.id, "Second");
    render(<ChildNotes child={ada} />);
    const user = userEvent.setup();
    const frame = () => new Promise((r) => requestAnimationFrame(r));

    const [top] = screen.getAllByRole("button", { name: "Delete note" });
    top.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Yes, delete" })).toHaveAccessibleDescription("Delete this note?");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await frame();
    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: "Delete note" })[0]);

    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    await frame();
    expect(read().notes).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete note" }));

    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    await frame();
    expect(read().notes).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your notes" }));
  });

  it("says when there are none", async () => {
    render(<ChildNotes child={await kid()} />);
    expect(screen.getByText("No notes yet.")).toBeVisible();
  });
});
