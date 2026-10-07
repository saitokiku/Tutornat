import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import { downloadFile, reloadHome } from "@/lib/export";
import { resetEmailMode, resetSendStatus, useWeeklyEmail, weeklyOf } from "@/lib/email/weekly";
import { createLearner } from "@/lib/profiles";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import SettingsPage from "./page";

// Next's router object is stable across renders; the mock must be too.
const nav = { params: new URLSearchParams(), replace: vi.fn() };
const router = { push: vi.fn(), replace: (href: string) => nav.replace(href) };
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  usePathname: () => "/settings",
  useRouter: () => router,
}));
vi.mock("@/lib/export", async (original) => ({ ...(await original<typeof import("@/lib/export")>()), downloadFile: vi.fn(), reloadHome: vi.fn() }));

let mode: "send" | "preview" = "preview";
let posts: Record<string, unknown>[] = [];
const CODE = "4K7QMZ2D";
const TOKEN = `w2.abc123.${"a".repeat(43)}`;

beforeEach(() => {
  mode = "preview";
  posts = [];
  resetEmailMode();
  resetSendStatus();
  nav.params = new URLSearchParams();
  history.replaceState(null, "", "/settings");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/ai/status") return Response.json({ mode: "demo" });
      if (!init?.method) return Response.json({ mode });
      const body = JSON.parse(String(init.body));
      posts.push(body);
      if (mode === "preview") return Response.json({ error: "preview" }, { status: 503 });
      if (body.action === "verify") return Response.json(body.code === CODE ? { ok: true, token: TOKEN } : { ok: false });
      return Response.json({ ok: true });
    }),
  );
});
afterEach(() => {
  resetMemory();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function grownUp() {
  await signUp({ email: "maria@example.com", password: "longenough", displayName: "Maria" });
  const ada = createLearner({ nickname: "Ada", grade: "4", locale: "en" }) as Profile;
  const bo = createLearner({ nickname: "Bo", grade: "K", locale: "en" }) as Profile;
  update((s) => {
    s.session.profileId = "parent";
    s.attempts.push({ id: "a1", profileId: ada.id, at: Date.now(), skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 });
    s.threads.push({ id: "t1", profileId: ada.id, startedAt: Date.now(), surface: "talk", title: "fractions", lines: [] });
  });
  return { ada, bo, accountId: read().session.accountId! };
}

describe("Settings for a grown-up", () => {
  it("downloads the family's data as JSON, without the password", async () => {
    const { accountId } = await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByRole("button", { name: "Download our data" }));
    expect(downloadFile).toHaveBeenCalledOnce();
    const [name, text] = vi.mocked(downloadFile).mock.calls[0];
    expect(name).toMatch(/^kaizenedu-family-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(text);
    expect(data.account.id).toBe(accountId);
    expect(data.learners.map((p: Profile) => p.nickname)).toEqual(["Ada", "Bo"]);
    expect(data.data.attempts).toHaveLength(1);
    expect(text).not.toContain("passwordHash");
    expect(screen.getByText(`Saved ${name}`)).toBeInTheDocument();
  });

  it("deletes one learner after a confirm step, by keyboard", async () => {
    const { ada, bo } = await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    screen.getByRole("button", { name: "Delete Ada and their records" }).focus();
    await user.keyboard("{Enter}");
    const group = screen.getByRole("group", { name: "Delete Ada?" });
    expect(within(group).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(within(group).getByLabelText("What would be deleted")).toHaveTextContent(/Answers\s*1|1\s*Answers/);
    await user.tab();
    expect(within(group).getByRole("button", { name: "Yes, delete Ada" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(read().profiles.map((p) => p.id)).toEqual([bo.id]);
    expect(read().attempts.some((a) => a.profileId === ada.id)).toBe(false);
    expect(read().threads).toEqual([]);
    // Focus lands on the notice, so it is read out and the next Tab goes on from here.
    const notice = screen.getByText("Deleted Ada and their records.");
    expect(notice.closest("[tabindex='-1']")).toHaveFocus();
  });

  it("cancelling a learner delete keeps everything and returns focus to that learner's Delete button", async () => {
    await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    screen.getByRole("button", { name: "Delete Bo and their records" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(read().profiles).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Delete Bo and their records" })).toHaveFocus();
  });

  it("deletes everything only with the confirm word and the account password, then reloads", async () => {
    await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    const del = screen.getByRole("button", { name: "Delete our account and data" });
    expect(del).toBeDisabled();
    expect(screen.getAllByLabelText("What would be deleted")[0]).toHaveTextContent(/Learners\s*2|2\s*Learners/);
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "delete");
    expect(del).toBeDisabled(); // still needs the password
    const password = screen.getByLabelText("Your password");
    await user.type(password, "not-my-password");
    expect(del).toBeEnabled();
    await user.click(del);
    expect(await screen.findByText("That password isn't right.")).toBeInTheDocument();
    expect(password).toHaveFocus();
    expect(read().accounts).toHaveLength(1);
    expect(reloadHome).not.toHaveBeenCalled();
    await user.clear(password);
    await user.type(password, "longenough{Enter}");
    await waitFor(() => expect(reloadHome).toHaveBeenCalledOnce());
    expect(read().accounts).toEqual([]);
    expect(read().profiles).toEqual([]);
  });

  it("says when saved files aren't inside the download", async () => {
    const { ada } = await grownUp();
    update((s) => void s.events.push({ id: "e1", profileId: ada.id, title: "Quiz", kind: "quiz", date: "2026-10-09", skillIds: [], source: "typed", createdAt: Date.now(), attachment: { blobId: "b1", name: "quiz.jpg" } }));
    render(<SettingsPage />);
    expect(screen.getByText(/1 saved photo or file attached to a school item isn't inside it/)).toBeInTheDocument();
  });

  it("links to question review, the policies and the contact address", async () => {
    await grownUp();
    render(<SettingsPage />);
    expect(screen.getByRole("link", { name: "Open question review" })).toHaveAttribute("href", "/review");
    expect(screen.getAllByRole("link", { name: "Privacy" })[0]).toHaveAttribute("href", "/privacy");
    expect(screen.getAllByRole("link", { name: "Data retention" })[0]).toHaveAttribute("href", "/retention");
    expect(screen.getAllByRole("link", { name: "Terms of use" })[0]).toHaveAttribute("href", "/terms");
    expect(screen.getAllByRole("link", { name: "privacy@kaizenedu.net" })[0]).toHaveAttribute("href", "mailto:privacy@kaizenedu.net");
    expect(await screen.findByRole("link", { name: "What the tutor sends, and to whom" })).toHaveAttribute("href", "/privacy#ai");
  });
});

describe("Weekly email in Settings", () => {
  it("in preview mode: off by default, switch by keyboard, and shows exactly what would be sent", async () => {
    const { accountId } = await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    const sw = await screen.findByRole("switch", { name: /Send me the weekly email/ });
    await waitFor(() => expect(sw).toBeEnabled());
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Email isn't connected on this site yet/)).toBeInTheDocument();
    sw.focus();
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(weeklyOf(read(), accountId)?.on).toBe(true);
    expect(posts).toEqual([]);
    // The preview is the real email for this week so far: numbers, no names.
    await user.click(screen.getByText("Preview this week's email"));
    const text = screen.getByLabelText("Plain text", { selector: "pre" });
    expect(text).toHaveTextContent("Right on own: 1");
    expect(text.textContent).not.toMatch(/Ada|Bo\b|Maria/);
    expect(screen.getByTitle("Weekly email preview")).toHaveAttribute("sandbox", "");
  });

  it("says nothing would go out for an empty week", async () => {
    await grownUp();
    update((s) => void (s.attempts = []));
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Preview this week's email"));
    expect(screen.getByText("Nothing has happened this week yet, so no email would go out.")).toBeInTheDocument();
  });

  it("in send mode: turning it on emails a code to the account address, and the code typed by keyboard confirms it", async () => {
    mode = "send";
    const { accountId } = await grownUp();
    const user = userEvent.setup();
    render(<SettingsPage />);
    const sw = await screen.findByRole("switch", { name: /Send me the weekly email/ });
    await waitFor(() => expect(sw).toBeEnabled());
    await user.click(sw);
    await screen.findByText("Code sent to maria@example.com. Enter it below, or open the link in that email in this browser.");
    expect(posts).toEqual([{ action: "confirm", to: "maria@example.com", locale: "en" }]);
    expect(screen.getByRole("button", { name: "Send a new code" })).toBeInTheDocument();

    // A wrong code: the field says so and keeps focus.
    const field = screen.getByLabelText("Code from the email");
    await user.click(field);
    await user.keyboard("ZZZZ-ZZZZ{Enter}");
    await screen.findByText(/That code didn't work/);
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("aria-invalid", "true");
    // Then the right one, typed the way it reads in the email.
    await user.clear(field);
    await user.keyboard("4k7q-mz2d{Enter}");
    await screen.findByText("Confirmed. The weekly email is on.");
    expect(weeklyOf(read(), accountId)).toMatchObject({ on: true, confirmed: { token: TOKEN } });
    expect(posts.at(-1)).toEqual({ action: "verify", to: "maria@example.com", code: CODE });
    // Until the app shell sends too, it says Settings is where the email goes out from.
    expect(await screen.findByText(/when a grown-up opens Settings here after Sunday/)).toBeInTheDocument();
  });

  it("confirms the address from the emailed link and tidies the URL", async () => {
    mode = "send";
    const { accountId } = await grownUp();
    history.replaceState(null, "", `/settings#weekly=${CODE}`);
    render(<SettingsPage />);
    await screen.findByText("Confirmed. The weekly email is on.");
    expect(weeklyOf(read(), accountId)).toMatchObject({ on: true, confirmed: { token: TOKEN } });
    expect(nav.replace).toHaveBeenCalledWith("/settings#weekly");
    expect(await screen.findByText("On, going to maria@example.com.")).toBeInTheDocument();
  });

  it("says when a confirmation link doesn't check out", async () => {
    mode = "send";
    await grownUp();
    history.replaceState(null, "", "/settings#weekly=ZZZZZZZZ");
    render(<SettingsPage />);
    await screen.findByText(/That confirmation link didn't work/);
  });

  it("with the app shell sending too, says the Parent view sends; a failed send is said, not hidden", async () => {
    mode = "send";
    const { accountId } = await grownUp();
    const lastWeek = Date.now() - 8 * 24 * 3600_000;
    update((s) => {
      const a = s.accounts.find((x) => x.id === accountId) as (typeof s.accounts)[number] & { weeklyEmail?: unknown };
      a.weeklyEmail = { on: true, confirmed: { token: TOKEN, at: lastWeek - 7 * 24 * 3600_000 } };
      s.attempts.push({ id: "lw", profileId: s.profiles[0].id, at: lastWeek, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/ai/status") return Response.json({ mode: "demo" });
        if (!init?.method) return Response.json({ mode: "send" });
        posts.push(JSON.parse(String(init.body)));
        return Response.json({ error: "send_failed" }, { status: 502 });
      }),
    );
    function Shell() {
      useWeeklyEmail();
      return <SettingsPage />;
    }
    render(<Shell />);
    expect(await screen.findByText(/the first time a grown-up opens the Parent view here after Sunday/)).toBeInTheDocument();
    expect(await screen.findByText("Last week's email couldn't be sent. It's tried again the next time a grown-up opens this page.")).toBeInTheDocument();
    expect(posts.filter((p) => p.action === "send")).toHaveLength(1);
  });
});

describe("Settings for a learner", () => {
  it("shows only their language and the way back to a grown-up, at K–2 sizes for a young learner", async () => {
    const { bo } = await grownUp();
    act(() => update((s) => void (s.session.profileId = bo.id)));
    history.replaceState(null, "", `/settings#weekly=${CODE}`);
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Language for Bo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download our data" })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("link", { name: "Open question review" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Privacy" })).toBeNull();
    expect(screen.queryByText("privacy@kaizenedu.net")).toBeNull();
    expect(screen.getByText(/open the Parent view/)).toBeInTheDocument();
    for (const name of ["English", "Español"]) expect(screen.getByRole("button", { name })).toHaveClass("min-h-14");
    expect(screen.getByRole("link", { name: /Switch/ })).toHaveClass("min-h-14");
    expect(posts).toEqual([]);
  });

  it("an older learner gets the standard sizes", async () => {
    const { ada } = await grownUp();
    act(() => update((s) => void (s.session.profileId = ada.id)));
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: "English" })).toHaveClass("min-h-11");
  });
});
