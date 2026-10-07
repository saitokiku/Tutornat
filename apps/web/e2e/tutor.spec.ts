import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// The tutor that knows things, in demo mode (no AI): a topic question gets a cited extract and the
// practice that fits on the board; a photo stays on the device; a school date goes on the calendar in one
// tap; a kindergartner taps instead of typing. Knowledge routes are stubbed so the journey never depends
// on Wikipedia being reachable. Every journey runs at desktop and phone sizes.

const FALLACY = {
  title: "Fallacy",
  extract: "A fallacy is the use of invalid or otherwise faulty reasoning in the construction of an argument.",
  url: "https://en.wikipedia.org/wiki/Fallacy",
  lang: "en",
  license: "CC BY-SA 4.0",
};

async function demoWithKnowledge(page: Page) {
  await page.route("**/api/ai/status", (r) => r.fulfill({ json: { mode: "demo" } }));
  await page.route("**/api/know/wiki**", (r) => r.fulfill({ json: { summary: /fallac/i.test(decodeURIComponent(r.request().url())) ? FALLACY : null } }));
  await page.route("**/api/know/define**", (r) => r.fulfill({ json: { definitions: [] } }));
}

async function talkAs(page: Page, tag: string, name: string, grade: string) {
  await demoWithKnowledge(page);
  await family(page, tag, [[name, grade]]);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.goto("/talk");
  await expect(page.getByText("I'm a computer tutor, not a person.", { exact: false })).toBeVisible();
}

test("“what is a logical fallacy” in demo mode: a cited extract and the fallacies practice", async ({ page }) => {
  const errors = collectErrors(page);
  await talkAs(page, "tutor-topic", "Ada", "8");
  await expect(page.getByText(/I'm the demo tutor: I answer from real sources/)).toHaveCount(1);

  await page.getByRole("textbox", { name: "Ask anything about what you're learning" }).fill("what is a logical fallacy");
  await page.keyboard.press("Enter");

  const board = page.getByRole("region", { name: "Board" });
  const fact = board.getByRole("article", { name: "Fallacy" });
  await expect(fact).toBeVisible();
  await expect(fact.getByText(FALLACY.extract)).toBeVisible();
  await expect(fact.getByRole("link", { name: /Read the article/ })).toHaveAttribute("href", FALLACY.url);
  await expect(fact.getByText("Text from Wikipedia, CC BY-SA 4.0")).toBeVisible();
  const practice = board.getByRole("article", { name: "Practice: Spot the fallacy" });
  await expect(practice).toBeVisible();
  await expect(board.getByRole("article", { name: "When appeals mislead" })).toBeVisible();
  // Said once, in the opening; not repeated in the answer.
  await expect(page.getByText(/I'm the demo tutor/)).toHaveCount(1);
  await noOverflow(page);

  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await practice.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/practice\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a photo in demo mode stays on the device and the tutor asks for the problem typed", async ({ page }) => {
  const errors = collectErrors(page);
  await talkAs(page, "tutor-photo", "Ada", "5");
  const sent: string[] = [];
  page.on("request", (r) => r.method() === "POST" && sent.push(r.url()));
  await page.getByTestId("tutor-photo").setInputFiles({ name: "worksheet.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await expect(page.getByRole("img", { name: "Your photo of the problem" })).toBeVisible();
  await expect(page.getByText("Reading a photo needs the AI tutor, which isn't connected here. Type the problem instead and I'll help with it.")).toBeVisible();
  expect(sent).toEqual([]);

  // Typed instead: one like it, worked out, and the practice that fits.
  await page.getByRole("textbox").fill("3/4 + 1/6");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/That looks like Add and subtract fractions with unlike denominators/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Board" }).getByRole("article", { name: "Worked example" })).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a test the learner mentions goes on the calendar in one tap", async ({ page }) => {
  const errors = collectErrors(page);
  await talkAs(page, "tutor-date", "Ada", "4");
  await page.getByRole("textbox").fill("I have a fractions test on Friday");
  await page.keyboard.press("Enter");
  const card = page.getByRole("region", { name: "Board" }).getByRole("article", { name: "Fractions test" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Add to calendar" }).click();
  await expect(card.getByText("Added")).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByText("Fractions test").first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a kindergartner hears the tutor first and taps instead of typing", async ({ page }) => {
  const errors = collectErrors(page);
  await talkAs(page, "tutor-k", "Leo", "K");
  await expect(page.getByText("What do you want to learn about? Tap one.", { exact: false })).toBeVisible();
  const poem = page.getByRole("button", { name: "Read me a poem" });
  await expect(poem).toBeVisible();
  expect((await poem.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  const chips = page.locator("button.min-h-14").filter({ hasNotText: "Read me a poem" });
  await chips.first().click();
  await expect(page.getByRole("region", { name: "Board" }).getByRole("button", { name: "Start" }).first()).toBeVisible();
  const start = page.getByRole("region", { name: "Board" }).getByRole("button", { name: "Start" }).first();
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("the tutor beside a problem offers a photo, hints and a similar one", async ({ page }) => {
  const errors = collectErrors(page);
  await demoWithKnowledge(page);
  await family(page, "tutor-drawer", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/practice");
  await page.getByRole("button", { name: /^Start/ }).first().click();
  await expect(page).toHaveURL(/\/practice\/.+/);
  await page.getByRole("button", { name: /Ask the tutor/ }).click();
  const drawer = page.getByRole("dialog", { name: "Tutor" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Photo of the problem" })).toBeVisible();
  await drawer.getByRole("button", { name: "Explain it a different way" }).click();
  await expect(drawer.getByRole("article").first()).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});
