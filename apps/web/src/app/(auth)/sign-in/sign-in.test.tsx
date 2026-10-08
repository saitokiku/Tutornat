import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RULES } from "@/learning/engine";
import { read, resetMemory, update } from "@/lib/store";
import { dayLabel, timeLabel } from "@/lib/format";
import SignInPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/sign-in", useSearchParams: () => new URLSearchParams() }));

const NOW = new Date("2026-10-07T18:00:00Z").getTime();

beforeEach(() => {
  resetMemory();
  localStorage.clear();
});

describe("sign-in after a sign-out that kept the family's copy", () => {
  it("says help shown only here keeps it, until when, and lets the grown-up remove it now", async () => {
    // What a sign-out left: a server account's family, kept for one problem's hint (lib/sync.ts signedOut).
    update((s) => {
      s.accounts.push({ id: "acct", email: "maria@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: NOW });
      s.profiles.push({ id: "leo", accountId: "acct", nickname: "Leo", grade: "3", locale: "en", color: "#000", createdAt: NOW });
      s.helpExposures.push({ id: "att_x:hint:1", attemptId: "att_x", profileId: "leo", skillId: "m.add.10", kind: "hint", capturedAt: NOW, delivery: "released" });
    });
    const until = NOW + RULES.helpQuietMs;
    localStorage.setItem("kaizenedu.signedout", JSON.stringify({ reason: "help", problems: 1, until, account: "acct", ended: true }));
    render(<SignInPage />);
    expect(
      screen.getByText(
        `Signed out. Help on 1 problem from the last 2 days is saved only on this device, because help doesn't reach your account yet. It still decides when a check opens, so the family's copy stays here until a sign-out after ${dayLabel(until, "en")}, ${timeLabel(until, "en")}.`,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove it from this device now" }));
    expect(screen.getByText("The family's copy is off this device. That help isn't on your account, so a check may open sooner than it would have.")).toBeInTheDocument();
    expect(read().profiles).toEqual([]);
    expect(read().accounts).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(localStorage.getItem("kaizenedu.signedout")).toBeNull();
  });

  it("offers no removal when changes still wait for the account", () => {
    localStorage.setItem("kaizenedu.signedout", JSON.stringify({ reason: "kept", kept: 2, ended: true }));
    render(<SignInPage />);
    expect(screen.getByText(/2 changes from this device haven't reached your account yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove it from this device now" })).toBeNull();
  });
});
