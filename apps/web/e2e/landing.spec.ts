import { expect, test } from "@playwright/test";
import { collectErrors, noOverflow } from "./helpers";

// The front page: its live practice problem works from the keyboard alone, each of the three doors
// leads where it says, and nothing scrolls sideways on a 320px phone.

test("the hero problem can be answered by keyboard", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  const sheet = page.getByRole("region", { name: "Try a real problem" });
  await expect(sheet.getByText("What fraction is at the dot?")).toBeVisible();

  // A miss first: "not yet", never "wrong", and the record says so.
  await sheet.getByRole("textbox", { name: "Top number" }).focus();
  await page.keyboard.type("2");
  await page.keyboard.press("/");
  await expect(sheet.getByRole("textbox", { name: "Bottom number" })).toBeFocused();
  await page.keyboard.type("4");
  await page.keyboard.press("Enter");
  await expect(sheet.getByText("Not yet. Try again, or take a hint.")).toBeVisible();
  await expect(sheet.getByText("not yet, after 1 try")).toBeVisible();

  // A hint from the ladder, reached with Tab and Enter.
  const hint = sheet.getByRole("button", { name: "Hint", exact: true });
  for (let i = 0; i < 12 && !(await hint.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(hint).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(sheet.getByRole("list", { name: "Hints" }).getByRole("listitem")).toHaveCount(1);

  // The right answer, checked by code: helped, and the parent view below says exactly that.
  await sheet.getByRole("textbox", { name: "Top number" }).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("3");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("4");
  await page.keyboard.press("Enter");
  await expect(sheet.getByText("Right, with help.")).toBeVisible();
  await expect(sheet.getByText("right, with help", { exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Another problem/ })).toBeFocused();
  await expect(page.locator("dl").filter({ hasText: "With help" }).getByText("1", { exact: true })).toBeVisible();

  // The next problem comes from the same engine, ready to answer.
  await page.keyboard.press("Enter");
  await expect(sheet.getByRole("textbox", { name: "Top number" })).toHaveValue("");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("each door leads to the right place", async ({ page }) => {
  const doors: [string, RegExp][] = [
    ["Stuck on homework right now?", /\/sign-up\?goal=help$/],
    ["A test coming?", /\/sign-up\?goal=organized$/],
    ["Keep up every day?", /\/sign-up\?goal=daily$/],
  ];
  for (const [name, url] of doors) {
    await page.goto("/");
    await page.getByRole("link", { name, exact: true }).first().click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/sign-up$/);
});

test("Check pressed too early points at the empty place instead of marking it", async ({ page }) => {
  await page.goto("/");
  const sheet = page.getByRole("region", { name: "Try a real problem" });
  await sheet.getByRole("button", { name: "Check" }).click();
  await expect(sheet.getByText("Type both numbers first.")).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Top number" })).toBeFocused();
  await expect(sheet.getByText("nothing yet")).toBeVisible();
});

test("the privacy notice and the terms are real pages, from the parents' section and the footer", async ({ page }) => {
  const errors = collectErrors(page);
  const links: [string, RegExp, string][] = [
    ["Privacy notice", /\/privacy$/, "Privacy"],
    ["Terms of use", /\/terms$/, "Terms of use"],
    ["Privacy", /\/privacy$/, "Privacy"],
    ["Terms", /\/terms$/, "Terms of use"],
  ];
  for (const [name, url, title] of links) {
    await page.goto("/");
    const link = name.length > 7 ? page.getByRole("link", { name, exact: true }) : page.getByRole("contentinfo").getByRole("link", { name, exact: true });
    await link.click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${title} · KaizenEDU`);
    await noOverflow(page);
  }
  // The 404 says what it is in the tab too.
  await page.goto("/this-page-does-not-exist");
  await expect(page).toHaveTitle("Page not found · KaizenEDU");
  expect(errors.filter((e) => !/404/.test(e)), errors.join("\n")).toEqual([]);
});

test("no horizontal overflow at 320px, in every grade band and in Spanish", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await noOverflow(page);
  for (const band of ["K–2", "6–9", "3–5"]) {
    await page.getByRole("radio", { name: band }).click();
    await expect(page.getByRole("radio", { name: band })).toHaveAttribute("aria-checked", "true");
    await noOverflow(page);
  }
  await page.getByRole("button", { name: "Español" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuda esta noche. Progreso cada día.");
  await noOverflow(page);
});
