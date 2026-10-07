import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Serious and critical axe violations on every main screen, signed out and signed in.
// Reduced motion so contrast is measured on settled UI, not mid-animation.
test.use({ reducedMotion: "reduce" });
async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

test("main screens have no serious accessibility violations", async ({ page }, info) => {
  await page.goto("/");
  await audit(page, "landing");
  await page.goto("/sign-up");
  await audit(page, "sign-up");
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`a11y-${info.project.name}-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("demo-pass-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profiles$/);
  await audit(page, "profiles-empty");
  await page.getByLabel("Name or nickname").fill("Ada");
  await page.getByLabel("Grade").selectOption("4");
  await page.getByRole("button", { name: "Add learner" }).click();
  await audit(page, "profiles");
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await audit(page, "home");
  await page.goto("/courses");
  await audit(page, "courses");
  await page.getByRole("button", { name: /^Add$/ }).first().click();
  await page.getByRole("link", { name: /Open/ }).first().click();
  await audit(page, "course");
  await page.getByRole("link", { name: /Start|Continue/ }).first().click();
  await expect(page).toHaveURL(/\/learn\//);
  for (let i = 0; i < 6 && (await page.getByRole("button", { name: /^Next/ }).count()); i++) {
    await audit(page, `stage-${i + 1}`);
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await page.goto("/growth");
  await audit(page, "growth");
  await page.goto("/settings");
  await audit(page, "settings");
});
