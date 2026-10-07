import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// Learn = the path, and courses built from real sources without AI. The knowledge API is mocked with
// fixtures written for this test (not copied from Wikipedia), so the journey is the same on every run.

test.use({ reducedMotion: "reduce" });

const VOLCANO = {
  title: "Volcano",
  extract:
    "A volcano is an opening in the crust of a planet, such as Earth, where hot melted rock, ash and gases escape from below the surface. Melted rock below the ground is called magma. When magma reaches the surface it is called lava. As lava cools it freezes into solid rock. Volcanoes can build mountains over many eruptions.",
  url: "https://en.wikipedia.org/wiki/Volcano",
  lang: "en",
  license: "CC BY-SA 4.0",
};
const DICTIONARY: Record<string, { word: string; partOfSpeech: string; text: string }[]> = {
  volcano: [{ word: "volcano", partOfSpeech: "noun", text: "A vent in the surface of a planet through which magma and gases come out." }],
  lava: [{ word: "lava", partOfSpeech: "noun", text: "Molten rock that has come out onto the surface." }],
  magma: [{ word: "magma", partOfSpeech: "noun", text: "Molten rock found below the surface of the Earth." }],
  eruption: [{ word: "eruption", partOfSpeech: "noun", text: "The act of throwing out lava, ash and gases." }],
};
const BOOKS = [
  { title: "Volcanoes", author: "Seymour Simon", year: 1988, url: "https://openlibrary.org/works/OL1W", source: "Open Library", kind: "borrow" },
  { title: "Hill of Fire", author: "Thomas P. Lewis", url: "https://openlibrary.org/works/OL2W", source: "Open Library", kind: "borrow" },
];

/** Demo mode (no AI provider) and a knowledge API that answers from the fixtures above. */
async function mockKnowledge(page: Page, { offline = false } = {}) {
  await page.route("**/api/ai/status", (r) => r.fulfill({ json: { mode: "demo" } }));
  await page.route("**/api/know/**", async (route) => {
    if (offline) return route.abort("internetdisconnected");
    const url = new URL(route.request().url());
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    switch (url.pathname.split("/").pop()) {
      case "wiki":
        return route.fulfill({ json: { summary: /volcan/.test(q) ? VOLCANO : null } });
      case "related":
        return route.fulfill({ json: { related: ["volcanic", "eruption", "lava", "magma", "crater"] } });
      case "define":
        return route.fulfill({ json: { definitions: DICTIONARY[q] ?? [] } });
      case "books":
        return route.fulfill({ json: { books: BOOKS } });
      default:
        return route.fulfill({ status: 404, json: { error: "kind" } });
    }
  });
}

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

/** A new family with one fourth grader, signed in as that learner. */
async function asLearner(page: Page, tag: string) {
  await family(page, tag, [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
}

const pathTitles = (page: Page, subject: string) => page.getByRole("list", { name: `${subject} path` }).locator("a[id^='course-']");

test("“volcanoes” becomes a course with a cited overview, key words, a related lesson, practice and sources", async ({ page }) => {
  const errors = collectErrors(page);
  await mockKnowledge(page);
  await asLearner(page, "src");

  // The magic box on Learn.
  await page.goto("/courses");
  await expect(page.getByRole("heading", { level: 1, name: "Learn" })).toBeVisible();
  await page.getByLabel("What do you want to learn?").fill("volcanoes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page).toHaveURL(/\/courses\/new\/.+/);

  // The build log says what each source gave.
  await expect(page.getByText("Found Wikipedia's article “Volcano”")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Found 4 key words with definitions")).toBeVisible();
  await expect(page.getByText(/^Added the ready-made lesson “/)).toBeVisible();
  await expect(page.getByText("Added questions from the skill map: Plate boundaries")).toBeVisible();
  await expect(page.getByText("Found 2 books to borrow")).toBeVisible();
  await expect(page.getByText("Built from Wikipedia and real sources")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /Create course/ }).click();

  // The course page: labelled, every lesson part there, every source linked.
  await expect(page.getByRole("heading", { level: 1, name: "Volcanoes" })).toBeVisible();
  await expect(page.getByText("Built from Wikipedia and real sources")).toBeVisible();
  const lessons = page.getByRole("region", { name: "Lessons" });
  await expect(lessons.getByText("Start here: Volcano")).toBeVisible();
  await expect(lessons.getByText("Words to know")).toBeVisible();
  await expect(lessons.getByText(/From the ready-made course “Solid, liquid, gas”, written by people\./)).toBeVisible();
  await expect(lessons.getByText("Practice: Plate boundaries")).toBeVisible();
  await expect(lessons.getByText("Find out more", { exact: true })).toBeVisible();
  const sources = page.getByRole("region", { name: "Where this course comes from" });
  await expect(sources.getByRole("link", { name: /^Volcano\b/ })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Volcano");
  await expect(sources.getByText(/shared under CC BY-SA 4.0/)).toBeVisible();
  await expect(sources.getByRole("link", { name: /^magma\b/ })).toHaveAttribute("href", "https://en.wiktionary.org/wiki/magma");
  await expect(sources.getByRole("link", { name: /^Volcanoes, Seymour Simon/ })).toHaveAttribute("href", "https://openlibrary.org/works/OL1W");
  await expect(page.getByRole("button", { name: "Practice Plate boundaries" })).toBeVisible();
  await noOverflow(page);
  await audit(page, "source-built course");

  // The overview quotes the article as written and credits it on the slide.
  await page.getByRole("link", { name: "Start", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByRole("heading", { name: "What Wikipedia says" })).toBeVisible();
  await expect(page.getByText(/^A volcano is an opening in the crust of a planet/)).toBeVisible();
  await expect(page.getByText("From Wikipedia's article “Volcano”, shared under CC BY-SA 4.0. The link is on the course page.")).toBeVisible();

  // On Learn it sits on the science path with its origin.
  await page.goto("/courses");
  await expect(pathTitles(page, "Science")).toHaveText(["Volcanoes"]);
  await expect(page.getByRole("list", { name: "Science path" }).getByText("Built from Wikipedia and real sources")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("offline, a source-built course says what it couldn't reach and keeps what is on the device", async ({ page }) => {
  await mockKnowledge(page, { offline: true });
  await asLearner(page, "offline");
  await page.goto("/courses/new?goal=volcanoes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page.getByText("Couldn't reach Wikipedia: this device seems to be offline")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/This device seems to be offline, so there's no Wikipedia overview/)).toBeVisible();
  await expect(page.getByText("Added questions from the skill map: Plate boundaries")).toBeVisible();
  // Nothing from Wikipedia, so the label doesn't claim it.
  await expect(page.getByText("Built from real sources", { exact: true })).toBeVisible();
  await expect(page.getByText("Built from Wikipedia and real sources")).toHaveCount(0);
});

test("reordering the path holds after a reload", async ({ page }) => {
  const errors = collectErrors(page);
  await asLearner(page, "order");
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add to my path: Fractions: parts of a whole" }).click();
  await page.getByRole("button", { name: "Add to my path: Negative numbers and the number line" }).click();
  await expect(pathTitles(page, "Math")).toHaveText(["Fractions: parts of a whole", "Negative numbers and the number line"]);
  await noOverflow(page);
  await audit(page, "learn path");

  // Keyboard only: focus the button and press Enter.
  await page.getByRole("button", { name: "Move “Negative numbers and the number line” up" }).focus();
  await page.keyboard.press("Enter");
  await expect(pathTitles(page, "Math")).toHaveText(["Negative numbers and the number line", "Fractions: parts of a whole"]);
  await expect(page.getByRole("button", { name: "Move “Negative numbers and the number line” down" })).toBeFocused();

  await page.reload();
  await expect(pathTitles(page, "Math")).toHaveText(["Negative numbers and the number line", "Fractions: parts of a whole"]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a course from a grown-up comes first on the learner's path", async ({ page }) => {
  await asLearner(page, "assign");
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add to my path: Fractions: parts of a whole" }).click();
  await expect(pathTitles(page, "Math")).toHaveText(["Fractions: parts of a whole"]);

  await asParent(page);
  await page.getByLabel("Assign a course").selectOption("math-negative");
  await page.getByRole("button", { name: "Assign to Ada" }).click();
  await expect(page.getByText("Assigned to Ada")).toBeVisible();

  await page.goto("/profiles");
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/courses");
  await expect(pathTitles(page, "Math")).toHaveText(["Negative numbers and the number line", "Fractions: parts of a whole"]);
  await expect(page.getByRole("list", { name: "Math path" }).getByRole("listitem").first()).toContainText("From a grown-up");
  await noOverflow(page);
});
