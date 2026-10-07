import { act, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsentReceipt } from "@/lib/server/db/policy";
import { resetMemory, update } from "@/lib/store";
import { resetSyncForTests, setServerStatusForTests, storeReceipts } from "@/lib/sync";
import { ConsentManager } from "./ConsentManager";
import { ConsentNeeded } from "./ConsentNeeded";

// The consent desk against a stand-in server: only fetch is faked; lib/auth and lib/sync are real.

type Method = { id: string; verified: boolean; forUnder13: boolean };
const DEV: Method = { id: "dev-not-verified", verified: false, forUnder13: true };
const PARENT: Method = { id: "parent-confirmed", verified: false, forUnder13: false };

let receipts: ConsentReceipt[] = [];
let methods: Method[] = [];
const posted: unknown[] = [];

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = String(input);
  const method = init?.method ?? "GET";
  if (path === "/api/sync") return Response.json({ cursor: 1, more: false, changes: {}, conflicts: {}, rejected: 0, flagged: 0 });
  if (path === "/api/consent" && method === "GET") return Response.json({ receipts, methods, noticeVersion: "2026-10-07-draft" });
  if (path === "/api/consent") {
    const body = JSON.parse(String(init!.body));
    posted.push(body);
    const m = methods.find((x) => x.id === body.method)!;
    const receipt: ConsentReceipt = {
      id: `3f2a9c1${receipts.length}-0000-4000-8000-000000000000`,
      profileId: body.profileId,
      method: m.id,
      verified: m.verified,
      scope: body.scope,
      noticeVersion: body.noticeVersion,
      under13: body.under13,
      grantedAt: Date.UTC(2026, 9, 7, 18),
      grantedBy: "maria@example.test",
    };
    receipts = [...receipts, receipt];
    return Response.json({ receipt, receipts });
  }
  if (path === "/api/consent/revoke") {
    const { id } = JSON.parse(String(init!.body));
    receipts = receipts.map((r) => (r.id === id ? { ...r, revokedAt: Date.UTC(2026, 9, 8, 9) } : r));
    return Response.json({ receipts });
  }
  throw new Error(`no route for ${method} ${path}`);
});

beforeEach(() => {
  receipts = [];
  methods = [DEV, PARENT];
  posted.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  setServerStatusForTests({ mode: "server", resetEmail: false, production: false });
  // Signed in to the server on this browser (the readable hint cookie the server sets with the session).
  document.cookie = "kz_acct=A; Path=/";
  resetMemory();
  resetSyncForTests();
  update((s) => {
    s.accounts = [{ id: "A", email: "maria@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 1 }];
    s.profiles = [
      { id: "leo", accountId: "A", nickname: "Leo", grade: "2", locale: "en", color: "#A93B5D", createdAt: 1 },
      { id: "sam", accountId: "A", nickname: "Sam", grade: "8", locale: "en", color: "#3E6E8E", createdAt: 2 },
      { id: "dad", accountId: "A", nickname: "Dad", grade: "adult", locale: "en", color: "#4F7A5B", createdAt: 3 },
    ];
    s.session = { accountId: "A", profileId: null, unlocked: true };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setServerStatusForTests(null);
  document.cookie = "kz_acct=; Max-Age=0; Path=/";
});

/** Presses Tab until the focused element has this accessible name (keyboard only, no clicks). */
async function tabTo(user: UserEvent, name: string | RegExp) {
  for (let i = 0; i < 60; i++) {
    await user.tab();
    const el = document.activeElement as HTMLElement | null;
    const label = el?.getAttribute("aria-label") ?? (el?.closest("label")?.textContent || el?.textContent || "");
    if (typeof name === "string" ? label.trim() === name : name.test(label)) return el!;
  }
  throw new Error(`could not tab to ${name}`);
}

const row = (name: string) => screen.getByRole("heading", { name }).closest("li")!;

describe("ConsentManager", () => {
  it("lists only children, each with AI and voice off until a grown-up consents", async () => {
    render(<ConsentManager />);
    expect(await screen.findByRole("heading", { name: "Leo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sam" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dad" })).toBeNull();
    expect(within(row("Leo")).getAllByText("Off")).toHaveLength(2);
  });

  it("gives and revokes consent by keyboard alone, and shows the receipt", async () => {
    const user = userEvent.setup();
    render(<ConsentManager />);
    await screen.findByRole("heading", { name: "Leo" });

    await tabTo(user, "Give consent for Leo");
    await user.keyboard("{Enter}");
    // Leo is in second grade: only the method that may be used for a child under 13 is offered.
    expect(screen.getByRole("radio", { name: /Development only: not verified/ })).toBeChecked();
    expect(screen.queryByRole("radio", { name: /I confirm as the account holder/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Record consent" })).toBeDisabled();

    await tabTo(user, "Voice");
    await user.keyboard(" ");
    await tabTo(user, "I have read how KaizenEDU handles children's information");
    await user.keyboard(" ");
    await tabTo(user, "Record consent");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Consent recorded. The receipt is below.")).toBeInTheDocument();
    expect(posted).toEqual([{ profileId: "leo", scope: ["ai"], method: "dev-not-verified", under13: true, noticeVersion: "2026-10-07-draft" }]);
    const leo = row("Leo");
    expect(within(leo).getByText("Receipt 3f2a9c10")).toBeInTheDocument();
    expect(within(leo).getByText("Not verified")).toBeInTheDocument();
    expect(within(leo).getByText("Development only: not verified")).toBeInTheDocument();
    expect(within(leo).getByText(/by maria@example\.test/)).toBeInTheDocument();
    expect(within(leo).getByText("2026-10-07-draft")).toBeInTheDocument();
    expect(within(leo).getAllByText("On")).toHaveLength(1);

    await tabTo(user, "Revoke");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Revoke this consent? What it covers turns off for Leo right away.")).toBeInTheDocument();
    // The confirm step takes focus, so Enter confirms.
    expect(document.activeElement).toHaveTextContent("Revoke consent");
    await user.keyboard("{Enter}");
    expect(await within(row("Leo")).findAllByText("Revoked")).toHaveLength(2);
    expect(within(row("Leo")).getAllByText("Off")).toHaveLength(2);
  });

  it("asks a grown-up the age of an eighth grader, and offers their own confirmation only for 13 or older", async () => {
    const user = userEvent.setup();
    render(<ConsentManager />);
    await screen.findByRole("heading", { name: "Sam" });
    await user.click(within(row("Sam")).getByRole("button", { name: "Give consent for Sam" }));
    expect(screen.getByRole("radio", { name: "Under 13" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: /I confirm as the account holder/ })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "13 or older" }));
    expect(screen.getByRole("radio", { name: /I confirm as the account holder/ })).toBeInTheDocument();
  });

  it("in production without a verified method, says the AI tutor and voice stay off for under-13s", async () => {
    setServerStatusForTests({ mode: "server", resetEmail: false, production: true });
    methods = [PARENT];
    const user = userEvent.setup();
    render(<ConsentManager />);
    expect(await screen.findByText(/Verified parental consent isn't set up on this site yet/)).toBeInTheDocument();
    await user.click(within(row("Leo")).getByRole("button", { name: "Give consent for Leo" }));
    expect(screen.getByText("There is no way to give consent for Leo on this site yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record consent" })).toBeDisabled();
  });

  it("explains itself in the browser-only version", () => {
    document.cookie = "kz_acct=; Max-Age=0; Path=/";
    resetSyncForTests();
    render(<ConsentManager />);
    expect(screen.getByText(/This version keeps everything in this browser/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ConsentNeeded", () => {
  const receipt = (scope: ConsentReceipt["scope"]): ConsentReceipt => ({
    id: "r1", profileId: "leo", method: "dev-not-verified", verified: false, scope, noticeVersion: "2026-10-07-draft", under13: true, grantedAt: 1, grantedBy: "maria@example.test",
  });

  it("points a grown-up to consent while the AI tutor or voice is off for a child, and goes quiet once allowed", () => {
    render(
      <>
        <ConsentNeeded profileId="leo" scope="ai" />
        <ConsentNeeded profileId="leo" scope="voice" />
      </>,
    );
    expect(screen.getByText("The AI tutor is off for Leo until a grown-up gives consent.")).toBeInTheDocument();
    expect(screen.getByText("Talking by voice is off for Leo until a grown-up gives consent.")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Ask a grown-up" })) expect(link).toHaveAttribute("href", "/consent");
    act(() => storeReceipts([receipt(["ai"])]));
    expect(screen.queryByText(/The AI tutor is off/)).toBeNull();
    expect(screen.getByText(/Talking by voice is off/)).toBeInTheDocument();
  });

  it("stays quiet for grown-up learners and in the browser-only version", () => {
    const { container, unmount } = render(<ConsentNeeded profileId="dad" scope="ai" />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    document.cookie = "kz_acct=; Max-Age=0; Path=/";
    resetSyncForTests();
    expect(render(<ConsentNeeded profileId="leo" scope="voice" />).container).toBeEmptyDOMElement();
  });
});
