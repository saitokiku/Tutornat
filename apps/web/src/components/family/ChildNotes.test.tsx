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

  it("says when there are none", async () => {
    render(<ChildNotes child={await kid()} />);
    expect(screen.getByText("No notes yet.")).toBeVisible();
  });
});
