import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// Trust: a family can read the policies, take its data with it, delete it, preview the weekly email,
// and a teacher can review question banks. Every journey runs at desktop and phone sizes.

test.use({ reducedMotion: "reduce" });

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

test("policies: privacy, terms and retention are public, marked draft, and readable in Spanish", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Draft, pending legal review");
  await expect(page.getByRole("heading", { name: "What goes to Anthropic (the AI tutor)" })).toBeVisible();
  await noOverflow(page);
  await audit(page, "privacy");

  await page.getByRole("navigation", { name: "Policies" }).getByRole("link", { name: "Data retention" }).click();
  await expect(page).toHaveURL(/\/retention$/);
  await expect(page.getByRole("rowheader", { name: "Password reset links" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /^Requests to our server/ })).toBeVisible();
  await noOverflow(page);
  await audit(page, "retention");

  await page.getByRole("navigation", { name: "Policies" }).getByRole("link", { name: "Terms of use" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "Español" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Términos de uso" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Borrador, pendiente de revisión legal");
  await noOverflow(page);
  await audit(page, "terms-es");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("export: the family's data downloads as one JSON file, without the password or the weekly email key", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "export", [["Ada", "4"], ["Bo", "K"]]);
  await asParent(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Your family's data" })).toBeVisible();
  await noOverflow(page);
  await audit(page, "settings");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download our data" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kaizenedu-family-\d{4}-\d{2}-\d{2}\.json$/);
  const text = await readFile((await file.path())!, "utf8");
  const data = JSON.parse(text);
  expect(data.format).toBe("kaizenedu.family-export");
  expect(data.account.displayName).toBe("Maria");
  expect(data.learners.map((l: { nickname: string }) => l.nickname)).toEqual(["Ada", "Bo"]);
  expect(Object.keys(data.data)).toEqual(expect.arrayContaining(["attempts", "courses", "threads", "events", "acts", "reviews"]));
  expect(text).not.toMatch(/passwordHash|"salt"|"token"/);
  await expect(page.getByText(/^Saved kaizenedu-family-/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("review: a teacher's approval in /review persists, and the skill reads as reviewed in /review and in Practice", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "review", [["Ada", "K"]]);
  await asParent(page);
  await page.goto("/settings");
  await page.getByRole("link", { name: "Open question review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole("heading", { level: 1, name: "Review questions" })).toBeVisible();
  await noOverflow(page);
  await audit(page, "review-list");

  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/review\?subject=english$/);
  await page.getByRole("link", { name: /Rhyming words/ }).click();
  await expect(page).toHaveURL(/\/review\?skill=e\.rhyme&subject=english$/);
  await expect(page.getByRole("heading", { level: 1, name: "Rhyming words" })).toBeVisible();
  await expect(page.getByText(/questions: every one this level asks/).first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Spanish" }).first()).toBeVisible();
  await noOverflow(page);
  await audit(page, "review-skill");

  await page.getByLabel("Note", { exact: true }).fill("Checked every question in both languages.");
  // Approving without saying they're a teacher is refused.
  await page.getByRole("button", { name: "Approve both languages" }).click();
  await expect(page.getByText(/Only a teacher can approve/)).toBeVisible();
  await page.getByRole("checkbox", { name: /I'm a teacher/ }).check();
  await page.getByRole("button", { name: "Approve both languages" }).click();
  await expect(page.getByText(/no longer shows for this skill for this family's learners on this device/)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Next skill: / }).first()).toBeVisible();

  // It persists: after a reload the skill reads as approved, and its line is ready for the code.
  await page.reload();
  await expect(page.getByText(/^Approved .* by Maria$/)).toBeVisible();
  await expect(page.getByText("Approved here").first()).toBeVisible();
  await page.getByRole("link", { name: "All skills" }).click();
  await expect(page).toHaveURL(/\/review\?subject=english$/);
  await page.getByLabel("Show").selectOption("approved");
  await expect(page.getByRole("link", { name: /Rhyming words/ })).toContainText("Approved here");
  await expect(page.locator('pre[aria-label="Approved on this device"]')).toContainText('"e.rhyme",');

  // And where it matters: Ada's Practice no longer labels it "Draft questions"; an unreviewed bank still is.
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/practice");
  const search = page.getByLabel("Find a skill to practice");
  await search.fill("Rhyming");
  await expect(page.getByRole("listitem").filter({ hasText: "Rhyming words" }).first()).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Rhyming words" }).first()).not.toContainText("Draft questions");
  await search.fill("Clap the syllables");
  await expect(page.getByRole("listitem").filter({ hasText: "Clap the syllables" }).first()).toContainText("Draft questions");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("review is for grown-ups: a learner who opens it lands on their own Home", async ({ page }) => {
  await family(page, "review-kid", [["Leo", "1"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/review");
  await expect(page).toHaveURL(/\/home$/);
});

const CODE = "4K7QMZ2D";

/** Stands in for /api/email/weekly, so no journey depends on (or sends through) a real email service. */
async function emailServer(page: Page, mode: "send" | "preview") {
  const posts: Record<string, unknown>[] = [];
  await page.route("**/api/email/weekly", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode } });
    const body = route.request().postDataJSON();
    posts.push(body);
    if (mode === "preview") return route.fulfill({ status: 503, json: { error: "preview" } });
    if (body.action === "verify") return route.fulfill({ json: body.code === CODE ? { ok: true, token: `w2.abc123.${"t".repeat(43)}` } : { ok: false } });
    return route.fulfill({ json: { ok: true } });
  });
  return posts;
}

/** Last week had activity, and the weekly email was confirmed two weeks ago: last week's email is due. */
async function lastWeekDue(page: Page) {
  await page.evaluate(() => {
    const KEY = "kaizenedu.v1";
    const s = JSON.parse(localStorage.getItem(KEY)!);
    const account = s.accounts.find((a: { id: string }) => a.id === s.session.accountId);
    const now = Date.now();
    account.weeklyEmail = { on: true, confirmed: { token: `w2.abc123.${"t".repeat(43)}`, at: now - 14 * 864e5 } };
    const learner = s.profiles.find((p: { accountId: string }) => p.accountId === account.id);
    s.attempts.push({ id: "e2e-last-week", profileId: learner.id, at: now - 7 * 864e5, skillId: "m.add.10", level: 1, seed: 1, mode: "practice", correct: true, assisted: false, seconds: 30 });
    localStorage.setItem(KEY, JSON.stringify(s));
  });
}

test("weekly email: off by default; turning it on shows exactly what would be sent", async ({ page }) => {
  const errors = collectErrors(page);
  const posts = await emailServer(page, "preview");
  await family(page, "weekly", [["Ada", "3"]]);
  await asParent(page);
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: /Send me the weekly email/ });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  // The test server has no email service: it says so instead of pretending to send.
  await expect(page.getByText(/Email isn't connected on this site yet/)).toBeVisible();
  await page.getByText("Preview this week's email").click();
  await expect(page.getByText("Nothing has happened this week yet, so no email would go out.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: /Send me the weekly email/ })).toHaveAttribute("aria-checked", "true");
  await noOverflow(page);
  expect(posts).toEqual([]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("weekly email: with email connected, a code goes to the grown-up's address only, and typing it confirms", async ({ page }) => {
  const errors = collectErrors(page);
  const posts = await emailServer(page, "send");
  await family(page, "weekly-send", [["Ada", "3"]]);
  await asParent(page);
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: /Send me the weekly email/ });
  await expect(toggle).toBeEnabled();
  await toggle.press("Space");
  await expect(page.getByText(/^Code sent to weekly-send-.*@example\.test\. Enter it below/)).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ action: "confirm", locale: "en" });
  expect(String(posts[0].to)).toMatch(/^weekly-send-.*@example\.test$/);
  expect(JSON.stringify(posts)).not.toContain("Ada");
  await audit(page, "settings-weekly-send");

  // Typed the way it reads in the email, on whatever device.
  await page.getByLabel("Code from the email").fill("4k7q-mz2d");
  await page.getByLabel("Code from the email").press("Enter");
  await expect(page.getByText("Confirmed. The weekly email is on.")).toBeVisible();
  expect(posts.at(-1)).toMatchObject({ action: "verify", code: CODE });
  await expect(page.getByText(/^On, going to weekly-send-/)).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("weekly email: opening Settings after Sunday sends last week's email, once", async ({ page }) => {
  const posts = await emailServer(page, "send");
  await family(page, "weekly-due", [["Ada", "3"]]);
  await asParent(page);
  await lastWeekDue(page);
  await page.goto("/settings");
  await expect.poll(() => posts.filter((p) => p.action === "send").length).toBe(1);
  const sent = posts.find((p) => p.action === "send") as { week: { learners: { own: number }[] } };
  expect(sent.week.learners[0].own).toBe(1);
  expect(JSON.stringify(sent)).not.toContain("Ada");
  await page.reload();
  await expect(page.getByText(/^Last sent /)).toBeVisible();
  expect(posts.filter((p) => p.action === "send")).toHaveLength(1);
});

// Needs the app shell to call useWeeklyEmail() (requested from the shell's owner). Until it does, only
// Settings sends, Settings says so, and this journey fails on purpose: the email isn't weekly for a
// parent who never opens Settings.
test("weekly email: opening the Family page after Sunday sends last week's email", async ({ page }) => {
  const posts = await emailServer(page, "send");
  await family(page, "weekly-family", [["Ada", "3"]]);
  await asParent(page);
  await lastWeekDue(page);
  await page.goto("/family");
  await expect.poll(() => posts.filter((p) => p.action === "send").length).toBe(1);
});

test("delete: one learner after a confirm step, then the whole family with the password", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "delete", [["Ada", "4"], ["Bo", "2"]]);
  await asParent(page);
  await page.goto("/settings");

  // Cancel returns focus to the learner's Delete button.
  await page.getByRole("button", { name: "Delete Bo and their records" }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Delete Bo and their records" })).toBeFocused();

  await page.getByRole("button", { name: "Delete Bo and their records" }).click();
  const confirm = page.getByRole("group", { name: "Delete Bo?" });
  await expect(confirm).toBeVisible();
  await audit(page, "settings-confirm");
  await confirm.getByRole("button", { name: "Yes, delete Bo" }).click();
  await expect(page.getByText("Deleted Bo and their records.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Bo and their records" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete Ada and their records" })).toBeVisible();

  const all = page.getByRole("button", { name: "Delete our account and data" });
  await expect(all).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await expect(all).toBeDisabled();
  await page.getByLabel("Your password").fill("not-the-password");
  await all.click();
  await expect(page.getByText("That password isn't right.")).toBeVisible();
  await page.getByLabel("Your password").fill("demo-pass-2026");
  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("kaizenedu.v1"));
  expect(stored === null || !stored.includes("Ada")).toBe(true);
  expect(errors, errors.join("\n")).toEqual([]);
});
