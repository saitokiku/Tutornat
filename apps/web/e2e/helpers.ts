import { expect, type Page } from "@playwright/test";

export async function noOverflow(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

/** A new family with the given learners; ends on the profiles page, grown-up unlocked. */
export async function family(page: Page, tag: string, learners: [string, string][]) {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Maria");
  await page.getByLabel("Email").fill(`${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`);
  await page.getByLabel("Password").fill("demo-pass-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profiles$/);
  for (const [i, [name, grade]] of learners.entries()) {
    if (i) await page.getByRole("button", { name: /Add a learner/ }).click();
    await page.getByLabel("Name or nickname").fill(name);
    await page.getByLabel("Grade").selectOption(grade);
    await page.getByRole("button", { name: "Add learner" }).click();
  }
}

/** Passes the grown-up gate (a times-table question). */
export async function asParent(page: Page) {
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Padres|Parent/ }).click();
  // A grown-up who just signed in is already trusted; otherwise the gate asks a times-table question.
  const gate = page.getByText(/× \d+\?$/);
  await Promise.race([page.waitForURL(/\/family$/), gate.waitFor()]);
  if (/\/family$/.test(page.url())) return;
  const question = await gate.innerText();
  const [a, b] = question.match(/\d+/g)!.map(Number);
  await page.getByRole("textbox").fill(String(a * b));
  await page.getByRole("button", { name: /Continuar|Continue/ }).click();
  await expect(page).toHaveURL(/\/family$/);
}
