import { expect, test } from "@playwright/test";
import { collectErrors, family } from "./helpers";

// The shell: places reachable by keyboard, the K–2 band on <html>, and switching learners.

test("tabs move by keyboard and land focus on the page title", async ({ page }, info) => {
  const errors = collectErrors(page);
  await family(page, "shell-keys", [["Sofía", "4"]]);
  await page.getByRole("button", { name: /Sofía/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Sofía" })).toBeVisible();

  // The skip link is the first stop and takes focus past the rail.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#k-main")).toBeFocused();

  // Every place is a link in the main navigation; Enter on one opens it and focus moves to its title.
  const nav = page.getByRole("navigation", { name: "Main" });
  const practice = nav.getByRole("link", { name: "Practice" });
  await practice.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/practice$/);
  await expect(practice).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1, name: "Practice" })).toBeFocused();

  if (info.project.name === "desktop") {
    // Number keys jump between places (1 = Today), but never while typing.
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\/home$/);
    await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    const box = page.getByRole("textbox").first();
    await box.click();
    await page.keyboard.type("2");
    await expect(page).toHaveURL(/\/home$/);
    await expect(box).toHaveValue(/2/);
    // And they can be turned off.
    await page.getByRole("button", { name: "Turn off" }).click();
    await page.locator("body").click({ position: { x: 600, y: 10 } });
    await page.keyboard.press("2");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText("Number keys are off")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("a K–2 learner puts the K–2 band on <html>; others and the grown-up view don't", async ({ page }) => {
  await family(page, "shell-band", [["Leo", "K"], ["Max", "7"]]);
  const html = page.locator("html");
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(html).toHaveAttribute("data-band", "k2");
  // K–2 has the speaker that names the tabs and 56px places.
  await expect(page.getByRole("button", { name: "Read the buttons aloud" })).toBeVisible();
  const today = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Today" });
  expect((await today.boundingBox())!.height).toBeGreaterThanOrEqual(56);

  await page.goto("/profiles");
  await expect(html).not.toHaveAttribute("data-band");
  await page.getByRole("button", { name: /Max/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(html).toHaveAttribute("data-band", "68");
  await expect(page.getByRole("button", { name: "Read the buttons aloud" })).toHaveCount(0);
});

test("the switcher hands the device to a sibling in one tap and asks a grown-up first for the grown-up view", async ({ page }) => {
  await family(page, "shell-switch", [["Sofía", "4"], ["Leo", "1"]]);
  await page.getByRole("button", { name: /Sofía/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Sofía" })).toBeVisible();

  const open = () => page.getByRole("button", { name: /switch learner/ }).click();
  const switcher = page.locator("#k-switcher");

  // Open it, see who's current, pick a sibling.
  await open();
  await expect(page.getByRole("dialog", { name: "Who's learning?" })).toBeVisible();
  await expect(switcher.getByRole("button", { name: /Sofía/ })).toHaveAttribute("aria-current", "true");
  await expect(switcher.getByRole("button", { name: /Sofía/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(switcher.getByRole("button", { name: /Leo/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(switcher).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Leo" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-band", "k2");

  // Escape closes it and gives focus back to the button that opened it.
  await open();
  await expect(switcher).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(switcher).toBeHidden();
  await expect(page.getByRole("button", { name: /switch learner/ })).toBeFocused();

  // The grown-up view asks the grown-up question in place (a child chose last).
  await open();
  await switcher.getByRole("button", { name: /Parent/ }).click();
  const question = switcher.getByText(/^What is \d+ × \d+\?$/);
  await expect(question).toBeVisible();
  const [a, b] = (await question.innerText()).match(/\d+/g)!.map(Number);
  await switcher.getByRole("textbox").fill(String(a * b + 1));
  await switcher.getByRole("button", { name: "Continue" }).click();
  await expect(switcher.getByText("Not quite. Try this one.").first()).toBeVisible();
  const [c, d] = (await switcher.getByText(/^What is \d+ × \d+\?$/).innerText()).match(/\d+/g)!.map(Number);
  await switcher.getByRole("textbox").fill(String(c * d));
  await switcher.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-band");

  // From the grown-up view, a child is one tap away again.
  await open();
  await switcher.getByRole("button", { name: /Sofía/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Sofía" })).toBeVisible();
});
