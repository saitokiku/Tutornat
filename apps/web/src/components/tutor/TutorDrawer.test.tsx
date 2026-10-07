import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTutorDock } from "@/components/practice/tutor-dock";
import { read, resetMemory } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import { TutorDrawer } from "./TutorDrawer";

// The tutor's seat beside a problem, by keyboard: it opens with focus inside, offers a photo and the
// problem's own hints, closes on Escape, and gives focus back to the button that opened it.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const item = makeItem("m.frac.addlike", 1, 7, "en");

function Problem() {
  const dock = useTutorDock();
  return (
    <button type="button" onClick={() => dock.open({ item, tries: 0 })}>
      Ask the tutor
    </button>
  );
}

beforeEach(() => {
  resetMemory();
  vi.stubGlobal("fetch", async (url: string) => (String(url).startsWith("/api/ai/status") ? new Response(JSON.stringify({ mode: "demo" }), { status: 200 }) : new Response("{}", { status: 404 })));
});

describe("TutorDrawer", () => {
  it("opens beside the problem with focus inside, closes on Escape, and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <TutorDrawer learner={learner} surface="practice">
        <Problem />
      </TutorDrawer>,
    );
    const ask = screen.getByRole("button", { name: "Ask the tutor" });
    await user.tab();
    expect(ask).toHaveFocus();
    await user.keyboard("{Enter}");

    const panel = screen.getByRole("dialog", { name: "Tutor" });
    expect(panel).toHaveFocus();
    expect(await screen.findByRole("button", { name: "Photo of the problem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Give me a hint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" }).className).toContain("size-11");
    // Opening it is help: the problem is marked, and the tutor's act is on the record.
    await waitFor(() => expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ skillId: "m.frac.addlike" })]));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(ask).toHaveFocus();
  });
});
