import { expect, test } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// The learning fabric end to end: daily practice, help right now, school dates driving the plan,
// and the parent's view. Every journey runs at desktop and phone sizes.

test("daily practice: a kindergartner's set, a hint, a skip fixed at the end, an honest finish", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "daily", [["Leo", "K"]]);
  await page.getByRole("button", { name: "Daily practice" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page.getByRole("heading", { name: "Today's plan" })).toBeVisible();
  await page.getByRole("button", { name: /^Start/ }).first().click();
  await expect(page).toHaveURL(/\/practice\/.+from=today/);
  await noOverflow(page);

  // Problem 1: count the dots and tap that number.
  const problem = page.locator('section[aria-labelledby="problem"]');
  const count = async () => {
    await expect(problem.locator("svg[role=img] circle").first()).toBeVisible();
    return problem.locator("svg[role=img] circle").count();
  };
  const dots = await count();
  await page.getByRole("button", { name: new RegExp(`^${dots}$`) }).click();
  await expect(page.getByText("Right.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Next/ }).click();

  // Problem 2: take a hint first, then answer — it counts as help.
  await page.getByRole("button", { name: /^Hint/ }).click();
  await expect(page.getByRole("list", { name: "Hints" })).toBeVisible();
  const dots2 = await count();
  await page.getByRole("button", { name: new RegExp(`^${dots2}$`) }).click();
  await expect(page.getByText("Right, with help.")).toBeVisible();
  await page.getByRole("button", { name: /^Next/ }).click();

  // Skip the rest, then fix them at the end.
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByText("Fix the ones you skipped", { exact: false })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    const n = await count();
    await page.getByRole("button", { name: new RegExp(`^${n}$`) }).click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Set done" })).toBeVisible();
  await expect(page.getByText("Practice builds the skill.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(page.getByText(/1 of \d+ done/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("help right now: homework to the demo tutor, then practice that fits", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "help", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.getByRole("link", { name: "Get help now" }).click();
  await expect(page).toHaveURL(/\/talk$/);
  await expect(page.getByText("I'm a computer tutor, not a person.", { exact: false })).toBeVisible();
  await page.getByRole("textbox").fill("telling time");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Tell time")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page).toHaveURL(/\/practice\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The tutor beside a problem: opening it is honest help.
  await page.getByRole("button", { name: /Ask the tutor/ }).click();
  await expect(page.getByRole("dialog", { name: "Tutor" })).toBeVisible();
  await page.getByRole("button", { name: "Show a similar one" }).click();
  await expect(page.getByText("Now try yours the same way.")).toBeVisible();

  // Safety: a crisis gets a fixed referral, not a tutor reply.
  await page.getByRole("textbox", { name: /Ask about this problem/ }).fill("i want to die");
  await page.keyboard.press("Enter");
  await expect(page.getByText("988", { exact: false }).first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("school dates drive the plan: paste, review, save, prep shows on Today", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "school", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Import from school" }).click();
  const soon = new Date(Date.now() + 2 * 864e5);
  const md = `${soon.getMonth() + 1}/${soon.getDate()}`;
  await page.getByLabel("School text to read").fill(`Multiplication test - ${md}\nBring a permission slip`);
  await page.getByRole("button", { name: "Find the dates" }).click();
  await expect(page.getByText("Found 1. Check the name, date and type, then save.")).toBeVisible();
  await page.getByRole("button", { name: "Save 1" }).click();
  await expect(page.getByText("Saved: 1 new, 0 updated.")).toBeVisible();
  await expect(page.getByText("Multiplication test").first()).toBeVisible();
  await noOverflow(page);
  await page.goto("/home");
  await expect(page.getByText("Get ready for Multiplication test")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("the parent's view: one child's page, settings, reading log, records", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "parent", [["Ada", "4"]]);
  await page.getByRole("button", { name: "Homeschool" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await asParent(page);
  await page.getByRole("link", { name: "Open Ada's page" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ada" })).toBeVisible();
  await expect(page.getByText("30 min a day", { exact: false })).toBeVisible();
  await page.getByLabel("Book").fill("Charlotte's Web");
  await page.getByLabel("Minutes").fill("25");
  await page.getByRole("button", { name: "Log reading" }).click();
  await expect(page.getByText("Charlotte's Web")).toBeVisible();
  await page.getByRole("switch", { name: /talk to the tutor with the microphone/ }).click();
  await expect(page.getByRole("switch", { name: /talk to the tutor with the microphone/ })).toHaveAttribute("aria-checked", "true");
  await noOverflow(page);
  await page.getByRole("link", { name: "Records" }).click();
  await expect(page.getByRole("heading", { name: "Learning record: Ada" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Charlotte's Web" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^kaizenedu-ada-.*\.csv$/);
  expect(errors, errors.join("\n")).toEqual([]);
});
