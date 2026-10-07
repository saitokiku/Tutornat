import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// Accounts, sync and consent (plan M5 5.1–5.5).
//
// The browser-only checks run against every deployment without DATABASE_URL (the default e2e run,
// which needs no database). The server journeys run when the app under test keeps families on a
// server — start it with DATABASE_URL=pglite:memory (or a Postgres URL) — and skip otherwise.
// Under `next start` (CI) the app runs in production mode, where the development-only consent
// method is not offered; the journeys check both cases.

test.use({ reducedMotion: "reduce" });

type Status = { mode: "server" | "local"; resetEmail: boolean; production: boolean };
async function status(request: APIRequestContext): Promise<Status> {
  return (await (await request.get("/api/auth/status")).json()) as Status;
}

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

const PASS = "family-pass-2026";
const ADULT = "I'm a parent or guardian, 18 or older";
const address = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

test.describe("browser-only (no DATABASE_URL)", () => {
  test.beforeEach(async ({ request }) => {
    test.skip((await status(request)).mode !== "local", "this deployment keeps families on a server");
  });

  test("works exactly as before: no age question, no consent desk, nothing sent to a server", async ({ page }) => {
    const errors = collectErrors(page);
    const calls: string[] = [];
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/api/") && path !== "/api/auth/status" && !path.startsWith("/api/ai/")) calls.push(path);
    });
    await page.goto("/sign-up");
    await expect(page.getByText("Demo accounts live only in this browser.", { exact: false })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await family(page, "local", [["Leo", "2"]]);
    await expect(page.getByRole("button", { name: /Leo/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI tutor and voice" })).toHaveCount(0);
    await expect(page.getByText("Saved to your account")).toHaveCount(0);
    await page.getByRole("button", { name: "Manage learners" }).click();
    await page.getByRole("button", { name: "Remove Leo" }).click();
    await expect(page.getByText("Remove Leo and their courses from this device?")).toBeVisible();
    expect(calls).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("the server routes answer that this deployment is browser-only", async ({ request }) => {
    expect((await request.post("/api/sync", { data: { v: 1, since: 0, now: Date.now(), push: {} } })).status()).toBe(404);
    expect((await request.post("/api/auth/sign-up", { data: { email: "a@b.co", password: PASS, displayName: "M", adult: true } })).status()).toBe(404);
    expect((await request.get("/api/consent")).status()).toBe(404);
  });
});

test.describe("accounts on a server", () => {
  let server: Status;
  test.beforeEach(async ({ request }) => {
    server = await status(request);
    test.skip(server.mode !== "server", "start the app with DATABASE_URL (e.g. pglite:memory) to run these");
  });

  /** A parent-first sign-up; ends on the learners page with the given learners added. */
  async function serverFamily(page: Page, tag: string, learners: [string, string][]) {
    const email = address(tag);
    await page.goto("/sign-up");
    await page.getByLabel("Your name").fill("Maria");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASS);
    await page.getByRole("checkbox", { name: ADULT }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profiles$/);
    for (const [i, [name, grade]] of learners.entries()) {
      if (i) await page.getByRole("button", { name: /Add a learner/ }).click();
      await page.getByLabel("Name or nickname").fill(name);
      await page.getByLabel("Grade").selectOption(grade);
      await page.getByRole("button", { name: "Add learner" }).click();
    }
    await expect(page.getByRole("status").filter({ hasText: "Saved to your account" })).toBeVisible({ timeout: 15_000 });
    return email;
  }

  async function signInOn(browser: Browser, email: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/profiles$/);
    return { context, page };
  }

  test("parent-first: the grown-up's statement, then learners, then consent with a receipt to read and revoke", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/sign-up");
    await expect(page.getByText("Your family's work is saved to your account", { exact: false })).toBeVisible();
    await page.getByLabel("Your name").fill("Maria");
    await page.getByLabel("Email").fill(address("consent"));
    await page.getByLabel("Password").fill(PASS);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Accounts are for parents and guardians 18 or older. Tick the box to continue.")).toBeVisible();
    await page.getByRole("checkbox", { name: ADULT }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profiles$/);
    await expect(page.getByText("Saved to your account so it shows on your devices. Never sent to the AI tutor.")).toBeVisible();

    await page.getByLabel("Name or nickname").fill("Leo");
    await page.getByLabel("Grade").selectOption("2");
    await page.getByRole("button", { name: "Add learner" }).click();
    await page.getByRole("button", { name: /Add a learner/ }).click();
    await page.getByLabel("Name or nickname").fill("Sam");
    await page.getByLabel("Grade").selectOption("8");
    await page.getByRole("button", { name: "Add learner" }).click();

    await expect(page.getByRole("heading", { name: "AI tutor and voice" })).toBeVisible();
    await page.getByRole("link", { name: "Review consent" }).click();
    await expect(page).toHaveURL(/\/consent$/);
    await expect(page.getByRole("link", { name: "How KaizenEDU handles children's information" }).first()).toHaveAttribute("href", "/privacy");
    const leo = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Leo" }) });
    const sam = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Sam" }) });
    await expect(leo.getByText("Off", { exact: true })).toHaveCount(2);

    // Leo is in second grade.
    await leo.getByRole("button", { name: "Give consent for Leo" }).click();
    if (server.production) {
      await expect(page.getByText("Verified parental consent isn't set up on this site yet", { exact: false })).toBeVisible();
      await expect(leo.getByText("There is no way to give consent for Leo on this site yet.")).toBeVisible();
      await leo.getByRole("button", { name: "Cancel" }).click();
    } else {
      await expect(leo.getByRole("radio", { name: /Development only: not verified/ })).toBeChecked();
      await leo.getByRole("checkbox", { name: "Voice" }).uncheck();
      await leo.getByRole("checkbox", { name: "I have read how KaizenEDU handles children's information" }).check();
      await leo.getByRole("button", { name: "Record consent" }).click();
      await expect(leo.getByText("Consent recorded. The receipt is below.")).toBeVisible();
      await expect(leo.getByText("Not verified")).toBeVisible();
      await expect(leo.getByText("On", { exact: true })).toHaveCount(1);
    }

    // Sam is 13: the account holder's own confirmation is enough, in production too.
    await sam.getByRole("button", { name: "Give consent for Sam" }).click();
    await sam.getByRole("radio", { name: "13 or older" }).check();
    await sam.getByRole("radio", { name: /I confirm as the account holder/ }).check();
    await sam.getByRole("checkbox", { name: "I have read how KaizenEDU handles children's information" }).check();
    await sam.getByRole("button", { name: "Record consent" }).click();
    await expect(sam.getByText("Consent recorded. The receipt is below.")).toBeVisible();
    await expect(sam.getByText("On", { exact: true })).toHaveCount(2);
    await expect(sam.getByText("I confirm as the account holder")).toBeVisible();
    await noOverflow(page);

    // The receipt survives a reload and can be revoked.
    await page.reload();
    await expect(sam.getByText("On", { exact: true })).toHaveCount(2);
    await sam.getByRole("button", { name: "Revoke", exact: true }).click();
    await sam.getByRole("button", { name: "Revoke consent" }).click();
    await expect(sam.getByText("Revoked", { exact: true })).toHaveCount(2);
    await expect(sam.getByText("Off", { exact: true })).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test("two devices see the same family", async ({ page, browser }) => {
    const email = await serverFamily(page, "two-devices", [["Leo", "3"]]);
    const phone = await signInOn(browser, email);
    await expect(phone.page.getByRole("button", { name: /Leo/ })).toBeVisible();

    // A rename on the phone reaches the laptop.
    await phone.page.getByRole("button", { name: "Manage learners" }).click();
    await phone.page.getByRole("button", { name: "Edit Leo" }).click();
    await phone.page.getByLabel("Name or nickname").fill("Leonardo");
    await phone.page.getByRole("button", { name: "Save changes" }).click();
    await expect(phone.page.getByRole("status").filter({ hasText: "Saved to your account" })).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByRole("button", { name: /Leonardo/ })).toBeVisible({ timeout: 15_000 });

    // Removing a learner on one device removes them on the other, after a confirm that says so.
    await page.getByRole("button", { name: "Manage learners" }).click();
    await page.getByRole("button", { name: "Remove Leonardo" }).click();
    await expect(page.getByText("Remove Leonardo and everything they did, on every device signed in to this account?")).toBeVisible();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved to your account" })).toBeVisible({ timeout: 15_000 });
    await phone.page.reload();
    await expect(phone.page.getByRole("button", { name: /Leonardo/ })).toHaveCount(0, { timeout: 15_000 });
    await phone.context.close();
  });

  test("changes made offline wait on the device and save on reconnect", async ({ page, context, browser }) => {
    const email = await serverFamily(page, "offline", [["Leo", "3"]]);
    await context.setOffline(true);
    await page.getByRole("button", { name: /Add a learner/ }).click();
    await page.getByLabel("Name or nickname").fill("Ana");
    await page.getByLabel("Grade").selectOption("K");
    await page.getByRole("button", { name: "Add learner" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Offline. 1 change waits on this device" })).toBeVisible({ timeout: 15_000 });
    await context.setOffline(false);
    await expect(page.getByRole("status").filter({ hasText: "Saved to your account" })).toBeVisible({ timeout: 30_000 });
    const tablet = await signInOn(browser, email);
    await expect(tablet.page.getByRole("button", { name: /Ana/ })).toBeVisible();
    await tablet.context.close();
  });

  test("password reset: development shows the link, production says when email isn't set up", async ({ page, browser }) => {
    const email = await serverFamily(page, "reset", []);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    if (server.resetEmail) {
      await expect(page.getByText(`If an account exists for ${email}, a reset link is on its way.`)).toBeVisible();
      return;
    }
    if (server.production) {
      await expect(page.getByText("Password reset by email isn't set up on this site yet.")).toBeVisible();
      return;
    }
    await expect(page.getByText("Development: email isn't set up here, so the link is shown instead.")).toBeVisible();
    await page.getByRole("link", { name: "Open reset link" }).click();
    await page.getByLabel("New password").fill("a-brand-new-pass");
    await page.getByRole("button", { name: "Change password" }).click();
    // The reset signs this browser in and ends every other session.
    await expect(page).toHaveURL(/\/profiles$/);
    const again = await browser.newContext();
    const p = await again.newPage();
    await p.goto("/sign-in");
    await p.getByLabel("Email").fill(email);
    await p.getByLabel("Password").fill(PASS);
    await p.getByRole("button", { name: "Sign in" }).click();
    await expect(p.getByText("That email and password don't match")).toBeVisible();
    await expect(p).toHaveURL(/\/sign-in/);
    await again.close();
  });

  test("account screens have no serious accessibility violations and fit a phone", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("checkbox", { name: ADULT })).toBeVisible();
    await audit(page, "sign-up (server)");
    await noOverflow(page);
    await serverFamily(page, "a11y-server", [["Leo", "2"]]);
    await audit(page, "profiles (server)");
    await noOverflow(page);
    await page.getByRole("link", { name: "Review consent" }).click();
    await page.getByRole("button", { name: "Give consent for Leo" }).click();
    await audit(page, "consent form");
    await noOverflow(page);
  });
});
