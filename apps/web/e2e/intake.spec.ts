import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// The magic box as the universal intake: typed homework and tests land on their own item pages, and
// the guess shows (and can be changed) before anything is made. Runs at desktop and phone sizes.

test.use({ reducedMotion: "reduce" });

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${label}: ${v.id} — ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(" | ")}`,
    ),
  ).toEqual([]);
}

/** The coming Friday (1 to 7 days ahead), the way the box reads "Friday". */
function comingFriday() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== 5);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(d);
}

async function asAda(page: Page, tag: string) {
  await family(page, tag, [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("typed homework: 'fractions worksheet due Friday' lands on an item page dated Friday with fractions linked", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-hw");
  await page.getByLabel("What's going on?").fill("fractions worksheet due Friday");
  // The guess shows before anything is made.
  await expect(page.getByRole("radio", { name: "Homework" })).toBeChecked();
  await expect(page.getByText("Our guess: Homework, because it says “worksheet”.")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Fractions worksheet");
  await noOverflow(page);
  await audit(page, "home-with-guess");
  await page.getByRole("button", { name: /Add homework/ }).click();

  await expect(page).toHaveURL(/\/calendar\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fractions worksheet" })).toBeVisible();
  await expect(page.getByText(`Due ${comingFriday()}`)).toBeVisible();
  const skills = page.getByRole("region", { name: "What it covers" });
  await expect(skills.getByText("Name the fraction")).toBeVisible();
  await expect(page.getByRole("link", { name: /Get help/ })).toHaveAttribute("href", /\/talk\?event=/);
  await noOverflow(page);
  await audit(page, "school-item");

  // It is on the calendar too, and marking it done sticks.
  await page.getByRole("button", { name: /Mark done/ }).click();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Mark not done/ })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a typed test lands on an item page showing its skills' statuses and a prep button", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-test");
  await page.getByLabel("What's going on?").fill("multiplication test next Tuesday");
  await expect(page.getByRole("radio", { name: "Test" })).toBeChecked();
  await page.getByRole("button", { name: /Add test/ }).click();

  await expect(page).toHaveURL(/\/calendar\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Multiplication test" })).toBeVisible();
  const skills = page.getByRole("region", { name: "What it covers" });
  await expect(skills.getByText("Multiplication facts to 10 × 10")).toBeVisible();
  // The skill's own row says where it stands (the count above it says "not started" too).
  await expect(skills.getByRole("listitem").filter({ hasText: "Multiplication facts to 10 × 10" }).getByText("Not started", { exact: true })).toBeVisible();
  await expect(page.getByText("0 proved · 0 practicing · 1 not started")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /Prep for this test/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("the guess can be changed by keyboard before anything is made, and Enter confirms", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-keys");
  await page.getByLabel("What's going on?").fill("spelling words for Friday");
  const homework = page.getByRole("radio", { name: "Homework" });
  await expect(homework).toBeChecked();
  await homework.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Test" })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/calendar\/[\w-]+$/);
  // The item's own line names its kind. (Today stays mounted, hidden, behind it, and its box and
  // coming-up list say "Test" too.)
  const item = page.locator("header", { has: page.getByRole("heading", { level: 1, name: "Spelling words" }) });
  await expect(item.getByText("Test", { exact: true })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("practice and learn go where they should without making a school item", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-doors");
  await page.getByLabel("What's going on?").fill("practice multiplication facts");
  await expect(page.getByRole("radio", { name: "Practice" })).toBeChecked();
  await page.getByRole("button", { name: /Start practice/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+/);

  await page.goto("/home");
  await page.getByLabel("What's going on?").fill("Why is the sky blue?");
  await expect(page.getByRole("radio", { name: "Learn" })).toBeChecked();
  await page.getByRole("button", { name: /Build a course/ }).click();
  await expect(page).toHaveURL(/\/courses\/new\?goal=/);
  await expect(page.getByLabel("What do you want to learn?")).toHaveValue("Why is the sky blue?");
  expect(errors, errors.join("\n")).toEqual([]);
});

/** A real 1×1 PNG: the box redraws it as a JPEG on the device before keeping it. */
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** YYYY-MM-DD, `n` days from today, local. */
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("a PDF and a photo stay with their items on this device after a reload", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-files");
  const fileInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');

  // A PDF with words: the words name it, the file stays with it.
  await page.getByLabel("What's going on?").fill("reading worksheet due Friday");
  await fileInput.setInputFiles({ name: "worksheet.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF") });
  await expect(page.getByText("worksheet.pdf")).toBeVisible();
  await expect(page.getByText(/Reading photos and PDFs needs the AI tutor/)).toBeVisible();
  await page.getByRole("button", { name: /Add homework/ }).click();
  await expect(page).toHaveURL(/\/calendar\/[\w-]+$/);
  await expect(page.getByRole("link", { name: /Open the PDF/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Open the PDF/ })).toBeVisible();
  await expect(page.getByText("The file isn't saved on this device.")).toHaveCount(0);

  // A photo alone: the family names and dates it.
  await page.goto("/home");
  await fileInput.setInputFiles({ name: "IMG_2041.png", mimeType: "image/png", buffer: PIXEL });
  await expect(page.getByText("IMG_2041.jpg")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Homework" })).toBeChecked();
  await page.getByLabel("Name", { exact: true }).fill("Spelling sheet");
  await page.getByLabel("Due", { exact: true }).fill(inDays(3));
  await page.getByRole("button", { name: /Add homework/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Spelling sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Photo added to “Spelling sheet”" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Photo added to “Spelling sheet”" })).toBeVisible();
  await noOverflow(page);
  await audit(page, "school-item-photo");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a wrong item id shows a way back, not an error", async ({ page }) => {
  const errors = collectErrors(page);
  await asAda(page, "intake-missing");
  await page.goto("/calendar/not-a-real-item");
  await expect(page.getByText("We couldn't find that")).toBeVisible();
  await page.getByRole("link", { name: "Back to the calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  expect(errors, errors.join("\n")).toEqual([]);
});
