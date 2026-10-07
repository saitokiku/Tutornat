import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import { resetMemory, update } from "@/lib/store";
import { setServerStatusForTests } from "@/lib/sync";
import ForgotPasswordPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/forgot-password" }));

beforeEach(() => resetMemory());

async function ask(email = "maria@example.test") {
  const user = userEvent.setup();
  render(<ForgotPasswordPage />);
  await user.type(screen.getByLabelText("Email"), email);
  await user.keyboard("{Enter}");
}

describe("forgot password, browser-only", () => {
  it("shows the reset link on the page, since there is no email", async () => {
    await signUp({ email: "maria@example.test", password: "demo-pass-2026", displayName: "Maria" });
    update((s) => void (s.session = { accountId: null, profileId: null }));
    await ask();
    expect(await screen.findByText("If an account exists for maria@example.test, a reset link is on its way.")).toBeInTheDocument();
    expect(screen.getByText("Demo: email isn't connected yet, so here's the link.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open reset link" })).toHaveAttribute("href", expect.stringMatching(/^\/reset-password\?token=/));
  });
});

describe("forgot password, accounts on a server", () => {
  let answer: { status: number; body: object } = { status: 200, body: {} };
  const fetchMock = vi.fn(async () => Response.json(answer.body, { status: answer.status }));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setServerStatusForTests(null);
  });

  it("says the link is on its way, whoever asks", async () => {
    setServerStatusForTests({ mode: "server", resetEmail: true, production: true });
    answer = { status: 200, body: { delivery: "sent" } };
    await ask();
    expect(await screen.findByText("If an account exists for maria@example.test, a reset link is on its way.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open reset link" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset", expect.objectContaining({ body: JSON.stringify({ email: "maria@example.test", locale: "en" }) }));
  });

  it("shows the link only in development without email", async () => {
    setServerStatusForTests({ mode: "server", resetEmail: false, production: false });
    answer = { status: 200, body: { delivery: "not-configured", devLink: "/reset-password?token=abc" } };
    await ask();
    expect(await screen.findByText("Development: email isn't set up here, so the link is shown instead.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open reset link" })).toHaveAttribute("href", "/reset-password?token=abc");
  });

  it("says plainly when this site can't send reset email", async () => {
    setServerStatusForTests({ mode: "server", resetEmail: false, production: true });
    answer = { status: 200, body: { delivery: "not-configured" } };
    await ask();
    expect(await screen.findByText("Password reset by email isn't set up on this site yet.")).toBeInTheDocument();
  });

  it("says how long to wait after too many requests", async () => {
    setServerStatusForTests({ mode: "server", resetEmail: true, production: true });
    answer = { status: 429, body: { error: "rate", retryAfter: 125 } };
    await ask();
    expect(await screen.findByText("Too many tries. Try again in 3 min.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
