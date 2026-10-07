import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { read, resetMemory } from "@/lib/store";
import { resetSyncForTests, setServerStatusForTests } from "@/lib/sync";
import SignUpPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/sign-up" }));

beforeEach(() => {
  push.mockClear();
  resetMemory();
});

describe("sign-up", () => {
  it("shows field errors and does not create an account", async () => {
    render(<SignUpPage />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter an email like name@example.com")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(read().accounts).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("asks nothing about age in the browser-only version", async () => {
    render(<SignUpPage />);
    await screen.findByRole("button", { name: "Create account" });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("sign-up with accounts on a server (parent-first)", () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const path = String(input);
    if (path === "/api/auth/sign-up")
      return Response.json({ account: { id: "srv-1", email: "maria@example.test", displayName: "Maria", goals: null, createdAt: 1 } });
    if (path === "/api/sync") return Response.json({ cursor: 1, more: false, changes: {}, rejected: 0, refused: {}, flagged: 0 });
    throw new Error(`no route for ${path}`);
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    setServerStatusForTests({ mode: "server", resetEmail: true, production: true });
    resetSyncForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setServerStatusForTests(null);
    resetSyncForTests();
  });

  it("needs the grown-up to say they are 18 or older, and works by keyboard alone", async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);
    await user.tab();
    expect(screen.getByLabelText("Your name")).toHaveFocus();
    await user.keyboard("Maria");
    await user.tab();
    await user.keyboard("maria@example.test");
    await user.tab();
    await user.keyboard("family-pass-2026");
    await user.tab();
    const adult = screen.getByRole("checkbox", { name: "I'm a parent or guardian, 18 or older" });
    expect(adult).toHaveFocus();
    // Submitting without it says why and sends nothing.
    await user.keyboard("{Enter}");
    expect(await screen.findByText("A parent or guardian needs to create this account.")).toBeInTheDocument();
    expect(adult).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.keyboard(" ");
    expect(adult).toBeChecked();
    await user.tab();
    expect(screen.getByRole("button", { name: "Create account" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/profiles"));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ email: "maria@example.test", displayName: "Maria", adult: true });
    // The server account is the session; no password material is kept in the browser.
    expect(read().session.accountId).toBe("srv-1");
    expect(read().accounts[0]).toMatchObject({ id: "srv-1", passwordHash: "", salt: "" });
  });
});
