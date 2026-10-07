import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// Today, the dashboard: the K–2 variant, the sitting design (nothing starts by itself), the status strip,
// the plan in any order, and a grown-up looking at a child's day. Runs at desktop and phone sizes.

test.use({ reducedMotion: "reduce" });

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

type Saved = { sets: { planKey?: string; finishedAt?: number }[]; acts: { profileId: string; kind: string; ref?: string }[]; profiles: { id: string; nickname: string }[] };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("kaizenedu.v1") ?? "{}") as Saved);

test("a kindergartner's Today: the tutor first, read-aloud on every line, no clock, a 10-minute day", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "today-k", [["Leo", "K"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Today's plan" })).toBeVisible();

  // The tutor is offered first: in the greeting, above the plan.
  const tutor = main.locator("header").getByRole("link", { name: "Talk with the tutor" });
  await expect(tutor).toHaveAttribute("href", "/talk");
  expect((await tutor.boundingBox())!.y).toBeLessThan((await main.getByRole("heading", { name: "Today's plan" }).boundingBox())!.y);

  // Every line can be heard.
  await expect(main.getByRole("button", { name: /^Read aloud: Math: Count up to 10/ })).toBeVisible();
  await expect(main.getByRole("button", { name: /^Read aloud: English: Letter sounds/ })).toBeVisible();
  await expect(main.getByRole("button", { name: /^Read aloud: Pick something to learn/ })).toBeVisible();
  expect(await main.getByRole("button", { name: /^Read aloud:/ }).count()).toBeGreaterThanOrEqual(6);

  // The budget is 10 minutes, said to the grown-ups; the child's own lines carry no minute numbers.
  const grownUps = main.locator('section[aria-labelledby="grown-ups"]');
  await expect(grownUps.getByText("Leo's plan fits about 10 minutes a day.")).toBeVisible();
  expect(await main.locator('section[aria-labelledby="today"]').innerText()).not.toMatch(/\bmin\b/);
  expect(await main.getByRole("list", { name: "Today's status" }).count()).toBe(0);

  // Big targets for small hands.
  const start = main.getByRole("button", { name: /^Start, Math: Count up to 10/ });
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await noOverflow(page);
  await audit(page, "today-k");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("finishing a set started from Today comes back to Today with the line done and nothing started", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "today-sit", [["Leo", "K"]]);
  await page.getByRole("button", { name: /Leo/ }).click();
  await page.getByRole("button", { name: /^Start, Math: Count up to 10/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+from=today/);

  // Six counting problems: count the dots, tap that number.
  const problem = page.locator('section[aria-labelledby="problem"]');
  for (let i = 0; i < 6; i++) {
    await expect(problem.locator("svg[role=img] circle").first()).toBeVisible();
    const dots = await problem.locator("svg[role=img] circle").count();
    await page.getByRole("button", { name: new RegExp(`^${dots}$`) }).click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Set done" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(page).toHaveURL(/\/home$/);

  // The line is done, the next one is offered, and nothing was opened or made for it.
  await expect(page.getByText("1 of 2 done")).toBeVisible();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
  await expect(page.locator("#next").getByRole("button", { name: /^Start, English: Letter sounds/ })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/\/home$/);
  const after = await saved(page);
  expect(after.sets).toHaveLength(1);
  expect(after.sets[0]).toMatchObject({ planKey: expect.stringMatching(/:daily:math$/), finishedAt: expect.any(Number) });
  // Today recorded what it showed: one plan act per lead line.
  expect(after.acts.filter((a) => a.kind === "plan").map((a) => a.ref!.split(":").slice(1).join(":")).sort()).toEqual(["daily:english", "daily:math"]);
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("an older learner's Today: status that links to the work, and the plan in any order", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "today-any", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);

  // A spelling test two days out, written straight into this browser's record.
  const eventId = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("kaizenedu.v1")!);
    const d = new Date(Date.now() + 2 * 864e5);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const id = crypto.randomUUID();
    s.events.push({ id, profileId: s.session.profileId, title: "Spelling test", kind: "test", date, skillIds: [], source: "typed", createdAt: Date.now() });
    localStorage.setItem("kaizenedu.v1", JSON.stringify(s));
    return id;
  });
  await page.reload();
  const strip = page.getByRole("list", { name: "Today's status" });
  await expect(strip.getByRole("link", { name: "Test in 2 days: Spelling test" })).toHaveAttribute("href", `/calendar/${eventId}`);
  await expect(strip.getByRole("link", { name: "Left today: 15 of 15 min" })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="coming"]').getByRole("link", { name: /Spelling test/ })).toHaveAttribute("href", `/calendar/${eventId}`);
  await expect(page.getByRole("link", { name: "Get help now" })).toHaveAttribute("href", "/talk");
  await expect(page.getByRole("link", { name: "I have a test coming" })).toHaveAttribute("href", "/calendar?add=test");
  await noOverflow(page);
  await audit(page, "today-4");

  // Math is suggested first, but English can go first.
  await expect(page.locator("#next").getByRole("button", { name: /^Start, Math:/ })).toBeVisible();
  await page.getByRole("button", { name: /^Start, English:/ }).click();
  await expect(page).toHaveURL(/\/practice\/.+from=today/);
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /^Continue, English:/ })).toBeVisible();
  await expect(page.locator("#next").getByRole("button", { name: /^Start, Math:/ })).toBeVisible();
  const after = await saved(page);
  expect(after.sets.map((x) => x.planKey?.split(":").slice(1).join(":"))).toEqual(["daily:english"]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a grown-up sees a child's Today, read-only, with their page one tap away, and can hand over", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "today-parent", [["Ada", "4"], ["Leo", "K"]]);
  await asParent(page);
  const leo = (await saved(page)).profiles.find((p) => p.nickname === "Leo")!;
  await page.goto(`/home?learner=${leo.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Today for Leo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Leo's page" })).toHaveAttribute("href", `/family/${leo.id}`);
  await expect(page.getByText("Math: Count up to 10")).toBeVisible();
  await expect(page.getByText("0 of 2 done · 10 min a day")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Start|Continue)/ })).toHaveCount(0);
  await expect(page.getByText(/Only Leo can start these/)).toBeVisible();
  await noOverflow(page);
  await audit(page, "today-grown-up");
  // Looking is not teaching: no plan acts for the grown-up's view.
  expect((await saved(page)).acts.filter((a) => a.kind === "plan")).toHaveLength(0);

  await page.getByRole("button", { name: "Ada", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Today for Ada" })).toBeVisible();
  await page.getByRole("button", { name: "Hand over to Ada" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("button", { name: /^Start, Math:/ })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});
