import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// Trust: a family can read the policies, take its data with it, delete it, preview the weekly email,
// and a grown-up can review question banks. Every journey runs at desktop and phone sizes.

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
  await noOverflow(page);
  await audit(page, "retention");

  await page.getByRole("navigation", { name: "Policies" }).getByRole("link", { name: "Terms of use" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.getByRole("button", { name: "es" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Términos de uso" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Borrador, pendiente de revisión legal");
  await noOverflow(page);
  await audit(page, "terms-es");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("export: the family's data downloads as one JSON file, without the password", async ({ page }) => {
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
  expect(text).not.toMatch(/passwordHash|"salt"/);
  await expect(page.getByText(/^Saved kaizenedu-family-/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("review: approving a skill in /review persists and it reads as reviewed", async ({ page }) => {
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
  await page.getByRole("link", { name: /Rhyming words/ }).click();
  await expect(page).toHaveURL(/\/review\?skill=e\.rhyme$/);
  await expect(page.getByRole("heading", { level: 1, name: "Rhyming words" })).toBeVisible();
  await expect(page.getByText(/questions: every one this level asks/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Spanish" }).first()).toBeVisible();
  await noOverflow(page);
  await audit(page, "review-skill");

  await page.getByLabel("Note", { exact: true }).fill("Checked every question in both languages.");
  await page.getByRole("button", { name: "Approve both languages" }).click();
  await expect(page.getByText(/no longer shows for this skill on this device/)).toBeVisible();

  // It persists: after a reload the skill reads as approved, and its line is ready for the code.
  await page.reload();
  await expect(page.getByText(/^Approved .* by Maria$/)).toBeVisible();
  await expect(page.getByText("Approved here").first()).toBeVisible();
  await page.getByRole("link", { name: "All skills" }).click();
  await page.getByLabel("Show").selectOption("approved");
  await expect(page.getByRole("link", { name: /Rhyming words/ })).toContainText("Approved here");
  await expect(page.locator('pre[aria-label="Approved on this device"]')).toContainText('"e.rhyme",');
  expect(errors, errors.join("\n")).toEqual([]);
});

test("review is for grown-ups: a learner who opens it lands on their own Home", async ({ page }) => {
  await family(page, "review-kid", [["Leo", "1"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/review");
  await expect(page).toHaveURL(/\/home$/);
});

/** Stands in for /api/email/weekly, so no journey depends on (or sends through) a real email service. */
async function emailServer(page: Page, mode: "send" | "preview") {
  const posts: Record<string, unknown>[] = [];
  await page.route("**/api/email/weekly", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode } });
    posts.push(route.request().postDataJSON());
    return mode === "preview" ? route.fulfill({ status: 503, json: { error: "preview" } }) : route.fulfill({ json: { ok: true } });
  });
  return posts;
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

test("weekly email: with email connected, turning it on emails a confirmation link to the grown-up's address only", async ({ page }) => {
  const errors = collectErrors(page);
  const posts = await emailServer(page, "send");
  await family(page, "weekly-send", [["Ada", "3"]]);
  await asParent(page);
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: /Send me the weekly email/ });
  await expect(toggle).toBeEnabled();
  await toggle.press("Space");
  await expect(page.getByText(/^Link sent to weekly-send-.*@example\.test\. Open it in this browser\.$/)).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ action: "confirm", locale: "en" });
  expect(String(posts[0].to)).toMatch(/^weekly-send-.*@example\.test$/);
  expect(JSON.stringify(posts)).not.toContain("Ada");
  await audit(page, "settings-weekly-send");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("delete: one learner after a confirm step, then the whole family", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "delete", [["Ada", "4"], ["Bo", "2"]]);
  await asParent(page);
  await page.goto("/settings");

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
  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("kaizenedu.v1"));
  expect(stored === null || !stored.includes("Ada")).toBe(true);
  expect(errors, errors.join("\n")).toEqual([]);
});
