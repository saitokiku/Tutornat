import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "@/lib/auth";
import { createLearner } from "@/lib/profiles";
import { read, resetMemory } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { ReadingLog } from "./ReadingLog";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 18).getTime();

describe("reading log", () => {
  it("logs a book, and deletes it only after a confirm, by keyboard, without losing focus", async () => {
    await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
    const ada = createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
    render(<ReadingLog child={ada} now={NOW} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Book"), "Frog and Toad");
    await user.click(screen.getByRole("button", { name: "Log reading" }));
    expect(read().reading).toMatchObject([{ title: "Frog and Toad", minutes: 20, date: "2026-10-07" }]);

    const trash = screen.getByRole("button", { name: "Delete: Frog and Toad" });
    trash.focus();
    await user.keyboard("{Enter}");
    const yes = screen.getByRole("button", { name: "Yes, delete" });
    expect(document.activeElement).toBe(yes);
    expect(yes).toHaveAccessibleDescription("Delete “Frog and Toad” from the reading log?");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await new Promise((r) => requestAnimationFrame(r));
    expect(read().reading).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete: Frog and Toad" }));

    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    await new Promise((r) => requestAnimationFrame(r));
    expect(read().reading).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Reading log" }));
  });
});
