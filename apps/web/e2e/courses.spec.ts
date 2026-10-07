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

/** Demo mode (no AI provider) and a knowledge API that answers from the fixtures above. Returns every query it was asked. */
async function mockKnowledge(page: Page, { offline = false } = {}) {
  const asked: string[] = [];
  await page.route("**/api/ai/status", (r) => r.fulfill({ json: { mode: "demo" } }));
  await page.route("**/api/know/**", async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    asked.push(`${url.pathname.split("/").pop()}:${q}`);
    if (offline) return route.abort("internetdisconnected");
    switch (url.pathname.split("/").pop()) {
      case "wiki":
        return route.fulfill({ json: { summary: /volcan/.test(q) ? VOLCANO : null } });
      case "related":
        return route.fulfill({ json: { related: ["volcanic", "eruption", "lava", "magma", "crater"] } });
      case "define":
        return route.fulfill({ json: { definitions: DICTIONARY[q] ?? [] } });
      case "books":
        return route.fulfill({ json: { books: /volcan/.test(q) ? BOOKS : [] } });
      default:
        return route.fulfill({ status: 404, json: { error: "kind" } });
    }
  });
  return asked;
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
/** One line of the builder's log (the log repeats its last line in a hidden status for screen readers). */
const logLine = (page: Page, text: string | RegExp) => page.getByRole("region", { name: "Building your course", exact: true }).getByRole("listitem").filter({ hasText: text });

/** Adds a ready-made course from the full catalogue (every grade shown), as a learner would. */
async function addReadyMade(page: Page, title: string) {
  const catalogue = page.getByRole("region", { name: "Ready-made courses", exact: true });
  await catalogue.getByRole("button", { name: "All grades" }).click();
  await catalogue.getByRole("listitem").filter({ hasText: title }).getByRole("button", { name: "Add" }).click();
}

test("“volcanoes” becomes a course with a cited overview, key words, a related lesson, practice and sources", async ({ page }) => {
  const errors = collectErrors(page);
  const asked = await mockKnowledge(page);
  await asLearner(page, "src");

  // The magic box on Learn.
  await page.goto("/courses");
  await expect(page.getByRole("heading", { level: 1, name: "Learn" })).toBeVisible();
  await page.getByLabel("What do you want to learn?").fill("Ada wants to learn about volcanoes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page).toHaveURL(/\/courses\/new\/.+/);

  // The build log says what each source gave.
  await expect(logLine(page, "Found Wikipedia's article “Volcano”")).toBeVisible({ timeout: 15_000 });
  await expect(logLine(page, "Found 4 key words with definitions")).toBeVisible();
  await expect(logLine(page, "Added the ready-made lesson “Melting and freezing”")).toBeVisible();
  await expect(logLine(page, "Added questions from the skill map: Rocks, fossils and erosion")).toBeVisible();
  await expect(logLine(page, "Found 2 children's books to borrow")).toBeVisible();
  await expect(page.getByText("Built from Wikipedia and real sources")).toBeVisible();
  await expect(page.getByText(/^Built without AI from Wikipedia, Wiktionary \(through Datamuse\), a ready-made KaizenEDU lesson, the KaizenEDU skill map,? (and )?Open Library\b.* The links are on the course page\.$/)).toBeVisible();
  // Only the topic left the device: never the learner's name, and children's books only.
  expect(asked.join(" ")).not.toMatch(/ada/);
  expect(asked).toContain("books:volcano subject_key:juvenile_literature");
  await noOverflow(page);
  await page.getByRole("button", { name: /Create course/ }).click();

  // The course page: labelled, every lesson part there, every source linked.
  await expect(page.getByRole("heading", { level: 1, name: "Ada wants to learn about volcanoes" })).toBeVisible();
  // In the course's own header (Learn stays mounted, hidden, behind it, and its path shows the label too).
  const header = page.locator("header", { has: page.getByRole("heading", { level: 1, name: "Ada wants to learn about volcanoes" }) });
  await expect(header.getByText("Built from Wikipedia and real sources")).toBeVisible();
  const lessons = page.getByRole("region", { name: "Lessons", exact: true });
  await expect(lessons.getByText("Start here: Volcano", { exact: true })).toBeVisible();
  await expect(lessons.getByText("Words to know", { exact: true })).toBeVisible();
  await expect(lessons.getByText("Melting and freezing", { exact: true })).toBeVisible();
  await expect(lessons.getByText(/From the ready-made course “Solid, liquid, gas”, written by people\./)).toBeVisible();
  await expect(lessons.getByText("Practice: Rocks, fossils and erosion", { exact: true })).toBeVisible();
  await expect(lessons.getByText("Find out more", { exact: true })).toBeVisible();
  const sources = page.getByRole("region", { name: "Where this course comes from", exact: true });
  await expect(sources.getByRole("link", { name: /^Volcano\b/ })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Volcano");
  await expect(sources.getByRole("link", { name: /^License: CC BY-SA 4\.0/ })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await expect(sources.getByRole("link", { name: /^magma\b/ })).toHaveAttribute("href", "https://en.wiktionary.org/wiki/magma");
  await expect(sources.getByRole("link", { name: /^Volcanoes, Seymour Simon/ })).toHaveAttribute("href", "https://openlibrary.org/works/OL1W");
  const practice = page.getByRole("region", { name: "Practice it on the skill map", exact: true });
  await expect(practice.getByRole("button", { name: "Practice Rocks, fossils and erosion" })).toBeVisible();
  // A skill far above grade 4 is offered here, labelled with its grade, but its questions aren't in the lessons.
  await expect(practice.getByText("Usually taught in Grade 7")).toBeVisible();
  await noOverflow(page);
  await audit(page, "source-built course");

  // The overview quotes the article as written and credits it on the slide.
  await page.getByRole("link", { name: "Start", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByRole("heading", { name: "What Wikipedia says" })).toBeVisible();
  await expect(page.getByText(/^A volcano is an opening in the crust of a planet/)).toBeVisible();
  await expect(page.getByText("From Wikipedia's article “Volcano” (en.wikipedia.org/wiki/Volcano), shared under CC BY-SA 4.0. The link is on the course page.")).toBeVisible();

  // On Learn it sits on the science path with its origin.
  await page.goto("/courses");
  await expect(pathTitles(page, "Science")).toHaveText(["Ada wants to learn about volcanoes"]);
  await expect(page.getByRole("list", { name: "Science path" }).getByText("Built from Wikipedia and real sources")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("offline, a source-built course says what it couldn't reach and keeps what is on the device", async ({ page }) => {
  await mockKnowledge(page, { offline: true });
  await asLearner(page, "offline");
  await page.goto("/courses/new?goal=volcanoes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(logLine(page, "Couldn't reach Wikipedia: this device seems to be offline")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/This device seems to be offline, so there's no Wikipedia overview/)).toBeVisible();
  await expect(logLine(page, "Added the ready-made lesson “Melting and freezing”")).toBeVisible();
  await expect(logLine(page, "Added questions from the skill map: Rocks, fossils and erosion")).toBeVisible();
  // Nothing from Wikipedia, so the label and the sources line don't claim it.
  await expect(page.getByText("Built from real sources", { exact: true })).toBeVisible();
  await expect(page.getByText("Built from Wikipedia and real sources")).toHaveCount(0);
  await expect(page.getByText(/^Built without AI from a ready-made KaizenEDU lesson,? (and )?the KaizenEDU skill map\b/)).toBeVisible();
  await expect(page.getByText(/^Built without AI from .*(Wikipedia|Wiktionary|Open Library)/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Create course/ })).toBeVisible();
});

test("offline with nothing on the device says offline, and the template is still a way on", async ({ page }) => {
  await mockKnowledge(page, { offline: true });
  await asLearner(page, "offline-none");
  await page.goto("/courses/new?goal=knitting");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page.getByText(/This device seems to be offline, and nothing saved on it matches this request/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/There wasn't enough from real sources/)).toHaveCount(0);
  await page.getByRole("button", { name: "Use a template instead" }).click();
  await expect(page.getByRole("button", { name: /Create course/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Template outline")).toBeVisible();
});

test("“Change my request” comes back to the box with the request in it, and the box builds again", async ({ page }) => {
  const errors = collectErrors(page);
  await mockKnowledge(page);
  await asLearner(page, "change");
  // Opened with a goal, as Today's box opens it for something to learn.
  await page.goto("/courses/new?goal=volcanoes");
  const goal = page.getByLabel("What do you want to learn?");
  await expect(goal).toHaveValue("volcanoes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page.getByRole("button", { name: /Create course/ })).toBeVisible({ timeout: 15_000 });
  const first = page.url();

  await page.getByRole("button", { name: "Change my request" }).click();
  await expect(page).toHaveURL(/\/courses\/new\?goal=volcanoes$/);
  await expect(goal).toHaveValue("volcanoes");
  await goal.fill("volcanoes and earthquakes");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page).toHaveURL(/\/courses\/new\/[^/?]+\?fresh=1$/);
  expect(page.url()).not.toBe(first);
  const request = page.locator("header", { has: page.getByRole("heading", { level: 1, name: "Building your course" }) });
  await expect(request.getByText("volcanoes and earthquakes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create course/ })).toBeVisible({ timeout: 15_000 });

  // Today's box hands the builder a new goal even though the builder's box is kept from before.
  await page.getByRole("main").getByRole("link", { name: "Today", exact: true }).click();
  await page.getByLabel("What's going on?").fill("Why is the sky blue?");
  await expect(page.getByRole("radio", { name: "Learn" })).toBeChecked();
  await page.getByRole("button", { name: /Build a course/ }).click();
  await expect(page).toHaveURL(/\/courses\/new\?goal=/);
  await expect(goal).toHaveValue("Why is the sky blue?");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a request the safety screen stops is never looked up", async ({ page }) => {
  const asked = await mockKnowledge(page);
  await asLearner(page, "safety");
  await page.goto("/courses/new?goal=drugs");
  await page.getByRole("button", { name: /Build my course/ }).click();
  await expect(page.getByText("That's not something I can help with. Want to get back to what you're learning?")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Ask for something else" })).toBeVisible();
  expect(asked).toEqual([]);
  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "Still being built" })).toHaveCount(0);
});

test("the path: suggested next, the skill line, and reordering that holds after a reload", async ({ page }) => {
  const errors = collectErrors(page);
  await asLearner(page, "order");
  await page.goto("/courses");
  const math = page.getByRole("region", { name: "Math", exact: true });
  await expect(math.getByText("No Math courses on your path yet.")).toBeVisible();
  await expect(math.getByText(/^0 proved · 0 practicing · \d+ skills on the map$/)).toBeVisible();
  await expect(math.getByText(/Suggested next for Grade 4/)).toBeVisible();
  await expect(math.getByRole("button", { name: /^Add to my path: / })).toBeVisible();

  await addReadyMade(page, "Fractions: parts of a whole");
  await addReadyMade(page, "Negative numbers and the number line");
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
  await addReadyMade(page, "Fractions: parts of a whole");
  await expect(pathTitles(page, "Math")).toHaveText(["Fractions: parts of a whole"]);

  await asParent(page);
  // Assigning sits with the notes, in the card's "Notes and courses" fold.
  await page.getByRole("article", { name: "Ada" }).locator("summary", { hasText: "Notes and courses" }).click();
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
