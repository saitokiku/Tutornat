import { expect, test, type Page } from "@playwright/test";

// One family, start to finish: a parent signs up, adds a kindergartner and a Spanish-speaking
// sixth grader, the kindergartner does a lesson, a course is built from the magic box, and the
// parent reads the record behind the grown-up gate. Runs at desktop and phone sizes.

async function noOverflow(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

test("a family's first evening", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lessons your child can touch.");
  await noOverflow(page);
  await page.getByRole("link", { name: "Get started" }).first().click();

  // Sign up, with validation first.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await page.getByLabel("Your name").fill("Maria Lopez");
  await page.getByLabel("Email").fill(`maria-${info.project.name}-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("demo-pass-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profiles$/);

  // Two learners.
  await page.getByLabel("Name or nickname").fill("Leo");
  await page.getByLabel("Grade").selectOption("K");
  await page.getByRole("button", { name: "Add learner" }).click();
  await page.getByRole("button", { name: /Add a learner/ }).click();
  await page.getByLabel("Name or nickname").fill("Sofía");
  await page.getByLabel("Grade").selectOption("6");
  await page.getByText("Español").click();
  await page.getByRole("button", { name: "Add learner" }).click();
  await noOverflow(page);

  // Leo can't read yet: picture tiles, and every title can be heard.
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page.getByRole("heading", { name: "Pick something to learn" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Read aloud: First, next, last/ })).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /First, next, last/ }).first().click();
  await expect(page).toHaveURL(/\/learn\//);

  // Through the lesson: sort Ana's story, answer a check, finish.
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByRole("heading", { name: "Put Ana's story in order" })).toBeVisible();
  await page.getByRole("button", { name: "Put “Ana puts a seed in the dirt.” in First" }).click();
  await page.getByRole("button", { name: "Put “Ana waters the seed.” in Next" }).click();
  await page.getByRole("button", { name: "Put “A little plant pops up.” in Last" }).click();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "That's right." })).toBeVisible();
  await noOverflow(page);
  for (let i = 0; i < 10 && (await page.getByRole("button", { name: /^Next/ }).count()); i++) await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: /Finish lesson/ }).click();
  await expect(page.getByRole("heading", { name: "Lesson finished" })).toBeVisible();
  await expect(page.getByText("1 right on your own · 0 with a hint · 0 not yet")).toBeVisible();

  // A course from the magic box; outline-only courses point to something ready now.
  await page.goto("/courses/new");
  await page.getByRole("textbox").first().fill("dinosaurs");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page.getByRole("button", { name: /Create course/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Create course/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dinosaurs" })).toBeVisible();
  await expect(page.getByText("Ready to learn right now")).toBeVisible();
  await noOverflow(page);

  // Growth tells the truth.
  await page.goto("/growth");
  await expect(page.getByText("Got a check right in", { exact: false }).first()).toBeVisible();

  // Sofía sees Spanish.
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Sofía/ }).click();
  await expect(page.getByRole("heading", { name: "Hola, Sofía" })).toBeVisible();

  // Parent view needs a grown-up now that a child was last in charge.
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Padres|Parent/ }).click();
  const question = await page.getByText(/× \d+\?$/).innerText();
  const [a, b] = question.match(/\d+/g)!.map(Number);
  await page.getByRole("textbox").fill(String(a * b));
  await page.getByRole("button", { name: /Continuar|Continue/ }).click();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole("heading", { name: "Leo" })).toBeVisible();
  await noOverflow(page);

  // Sign out lands on the landing page.
  await page.goto("/settings");
  await page.getByRole("button", { name: /Sign out|Cerrar sesión/ }).first().click();
  await expect(page).toHaveURL(/\/$/);

  expect(errors, errors.join("\n")).toEqual([]);
});
