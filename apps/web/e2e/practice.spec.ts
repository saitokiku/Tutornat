import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// Practice by touch and by keyboard: a kindergartner counts with tap-to-mark, a first grader sets a
// clock with the keyboard alone, and a finished set is a clean stop that never opens another.
// Every journey runs at desktop and phone sizes; touch screens are audited with axe.

test.use({ reducedMotion: "reduce" });

const STORE = "kaizenedu.v1";

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

/** A set placed straight into this browser's store, so the journey meets a known problem. */
async function seedSet(page: Page, set: { id: string; skillId: string; seed: number; level: number }) {
  await page.evaluate(
    ([key, s]) => {
      const doc = JSON.parse(localStorage.getItem(key)!);
      const profileId = doc.session.profileId;
      doc.sets.push({ id: s.id, profileId, createdAt: Date.now(), kind: "pick", subject: "math", skillId: s.skillId, slots: [{ skillId: s.skillId, seed: s.seed, role: "main", level: s.level }] });
      localStorage.setItem(key, JSON.stringify(doc));
    },
    [STORE, set] as const,
  );
}

const setCount = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sets.length as number, STORE);

test("a kindergartner counts by tapping the dots, then taps the number", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "pr-mark", [["Leo", "K"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/practice");
  await page.getByRole("button", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+/);

  const problem = page.locator('section[aria-labelledby="problem"]');
  const dots = problem.getByRole("button", { name: /^Dot \d+$/ });
  await expect(dots.first()).toBeVisible();
  const n = await dots.count();
  await expect(problem.locator("svg[role=img] circle")).toHaveCount(n);
  await noOverflow(page);
  await audit(page, "tap-to-mark");

  for (let k = 1; k <= n; k++) await problem.getByRole("button", { name: `Dot ${k}`, exact: true }).click();
  await expect(page.getByText(`${n} marked`, { exact: true })).toBeVisible();
  await expect(problem.getByRole("button", { name: "Dot 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: new RegExp(`^${n}$`) }).click();
  // Marking is a counting aid, not help.
  await expect(page.getByText("Right.", { exact: true })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a clock set with the keyboard alone", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "pr-clock", [["Ana", "1"]]);
  await page.getByRole("button", { name: /Ana/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  // m.time.clock level 3, seed 8 is a set-the-clock problem (pinned in touch-skills.test.ts).
  await seedSet(page, { id: "e2e-clock", skillId: "m.time.clock", seed: 8, level: 3 });
  await page.goto("/practice/e2e-clock");

  const prompt = await page.getByRole("heading", { level: 1 }).innerText();
  const [h, m] = /(\d{1,2}):(\d{2})/.exec(prompt)!.slice(1).map(Number);
  await expect(page.getByRole("img", { name: /Clock face showing 12:00/ })).toBeVisible();
  await noOverflow(page);
  await audit(page, "clock");

  // Tab to the hour, arrow it round; Tab on to the minutes, arrow them; Enter checks.
  const hour = page.getByRole("spinbutton", { name: "Hour" });
  const minutes = page.getByRole("spinbutton", { name: "Minutes" });
  for (let i = 0; i < 12 && !(await hour.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(hour).toBeFocused();
  for (let k = 0; k < 12 + (h % 12); k++) await page.keyboard.press("ArrowUp");
  await expect(hour).toHaveAttribute("aria-valuenow", String(h));
  for (let i = 0; i < 6 && !(await minutes.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(minutes).toBeFocused();
  for (let k = 0; k < m / 5; k++) await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("img", { name: new RegExp(`Clock face showing ${h}:${String(m).padStart(2, "0")}`) })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Right.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Next/ })).toBeFocused();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("finishing a set is a clean stop: nothing opens on its own, and done for today goes to Today", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "pr-finish", [["Leo", "K"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/practice");
  await page.getByRole("button", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+/);
  const url = page.url();
  const before = await setCount(page);

  const problem = page.locator('section[aria-labelledby="problem"]');
  for (let i = 0; i < 6; i++) {
    const dots = problem.getByRole("button", { name: /^Dot \d+$/ });
    await expect(dots.first()).toBeVisible();
    const n = await dots.count();
    await page.getByRole("button", { name: new RegExp(`^${n}$`) }).click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Set done" })).toBeVisible();
  // Six right on your own, none with help, none not yet.
  await expect(page.locator("dd")).toHaveText(["6", "0", "0"]);
  await noOverflow(page);
  await audit(page, "finish");

  // Give anything that might auto-start time to do it; nothing should.
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(url);
  await expect(page.getByRole("heading", { name: "Set done" })).toBeVisible();
  expect(await setCount(page)).toBe(before);

  await page.getByRole("link", { name: "I'm done for today" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await setCount(page)).toBe(before);
  expect(errors, errors.join("\n")).toEqual([]);
});
