import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// The grown-up's side: nudges on the family overview (and never on a child's screens), and Growth
// replaying the record week by week. The record is seeded straight into the browser store, which is
// the app's only database today, so each journey starts from a known history.

test.use({ reducedMotion: "reduce" });

const STORE = "kaizenedu.v1";

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

/** The narrowest phone the product supports: no sideways scroll there either. */
async function at320(page: Page) {
  const before = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 720 });
  await noOverflow(page);
  await page.setViewportSize(before);
}

type Seed = { learner: string; testInDays?: number; testSkills?: string[]; addedDaysAgo?: number; provedHistory?: boolean; stuckOn?: string };

/** Writes a history for one learner into the saved store. Returns the learner's id and the test's id. */
async function seed(page: Page, opts: Seed) {
  return page.evaluate(
    ({ key, opts }) => {
      const DAY = 864e5;
      const doc = JSON.parse(localStorage.getItem(key)!);
      const learner = doc.profiles.find((p: { nickname: string }) => p.nickname === opts.learner);
      const now = Date.now();
      const day = (offset: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      let n = 0;
      const answer = (at: number, skillId: string, mode: string, setId: string, correct = true) => ({ id: `e2e-a${n++}`, profileId: learner.id, at, skillId, level: 1, seed: n, setId, mode, correct, assisted: false, seconds: 6 });
      let eventId: string | undefined;
      if (opts.addedDaysAgo !== undefined) learner.createdAt = now - opts.addedDaysAgo * DAY;
      if (opts.testInDays !== undefined) {
        eventId = `e2e-test-${now}`;
        doc.events.push({ id: eventId, profileId: learner.id, title: "Fractions test", kind: "test", date: day(opts.testInDays), skillIds: opts.testSkills ?? ["m.frac.equiv"], source: "typed", createdAt: now });
      }
      if (opts.provedHistory) {
        // Add within 5: ten right on their own three weeks ago, then two passed checks a week apart.
        for (let i = 0; i < 10; i++) doc.attempts.push(answer(now - 21 * DAY + i * 60_000, "m.add.5", "practice", "e2e-p1"));
        for (const [k, ago] of [14, 7].entries()) for (let i = 0; i < 5; i++) doc.attempts.push(answer(now - ago * DAY + i * 60_000, "m.add.5", "check", `e2e-c${k}`));
      }
      if (opts.stuckOn) {
        // Three prep sets on the skill over the last three days, one right of five each: stuck, and not on Today's map.
        for (const ago of [3, 2, 1]) for (let i = 0; i < 5; i++) doc.attempts.push(answer(now - ago * DAY + i * 60_000, opts.stuckOn, "prep", `e2e-s${ago}`, i === 0));
      }
      localStorage.setItem(key, JSON.stringify(doc));
      return { learnerId: learner.id as string, eventId };
    },
    { key: STORE, opts },
  );
}

/** Nudge acts recorded for a learner (other screens log their own kinds of act). */
const nudgeActs = (page: Page, learnerId: string) =>
  page.evaluate(
    ({ key, learnerId }) => JSON.parse(localStorage.getItem(key)!).acts.filter((a: { profileId: string; kind: string }) => a.profileId === learnerId && a.kind === "nudge"),
    { key: STORE, learnerId },
  );

test("a test in two days with no prep: the family card says so, and its link hands the device over to the prep", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-prep", [["Ada", "4"]]);
  const { learnerId, eventId } = await seed(page, { learner: "Ada", testInDays: 2 });
  await asParent(page);

  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText(/^Ada has a test (in 2 days|tomorrow), “Fractions test”, and no prep set is finished yet\.$/)).toBeVisible();
  // Today's next step is the prep set the plan put first.
  await expect(card.getByText(/next: Get ready for Fractions test/)).toBeVisible();
  await noOverflow(page);
  await at320(page);
  await audit(page, "family-with-nudge");

  // Shown to a grown-up = one nudge act for the child; its outcome comes later, from the evidence.
  expect(await nudgeActs(page, learnerId)).toEqual([expect.objectContaining({ kind: "nudge", intent: "parent-acts", ref: `prep:${eventId}`, detail: "prep" })]);
  // Seeing the page again the same day records nothing new.
  await page.reload();
  await expect(card.getByText(/no prep set is finished yet/)).toBeVisible();
  expect(await nudgeActs(page, learnerId)).toHaveLength(1);

  await card.getByRole("link", { name: "Hand over to Ada to prep: Fractions test" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeVisible();
  await expect(page.getByText("Get ready for Fractions test").first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a test with no skills linked: the nudge says there is nothing to prep, and opens the test to link some", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-unlinked", [["Ada", "4"]]);
  const { eventId } = await seed(page, { learner: "Ada", testInDays: 2, testSkills: [] });
  await asParent(page);
  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText(/no skills are linked to it yet, so there is no prep set for it\.$/)).toBeVisible();
  // The school item page (/calendar/[eventId]) works in a grown-up's session.
  await card.getByRole("link", { name: "Open the test: Fractions test" }).click();
  await expect(page).toHaveURL(new RegExp(`/calendar/${eventId}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Fractions test" })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a skill gone stuck in test prep: the nudge hands over to Practice with that skill first", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-stuck", [["Ada", "4"]]);
  await seed(page, { learner: "Ada", stuckOn: "m.frac.equiv" });
  await asParent(page);
  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText("“Equivalent fractions” has been hard for Ada three sets in a row. Try the next one together.")).toBeVisible();
  await card.getByRole("link", { name: "Hand over to Ada to practice: Equivalent fractions" }).click();
  await expect(page).toHaveURL(/\/practice\?subject=math&again=m\.frac\.equiv$/);
  const next = page.getByRole("region", { name: "Practice this again" });
  await expect(next.getByText("Equivalent fractions", { exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("nothing done for days: the nudge hands the device to the child's Today", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-idle", [["Ada", "4"]]);
  await seed(page, { learner: "Ada", addedDaysAgo: 6 });
  await asParent(page);
  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText("Ada hasn't done anything here for 6 days.")).toBeVisible();
  // The nudge's own link (the card's Today row has one with the same name and place).
  await card.getByRole("listitem").filter({ hasText: "hasn't done anything here" }).getByRole("link", { name: "Hand over to Ada" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("nudges never reach the child", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-child", [["Ada", "4"]]);
  const { learnerId } = await seed(page, { learner: "Ada", testInDays: 2, addedDaysAgo: 6, stuckOn: "m.frac.equiv" });
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  for (const path of ["/home", "/growth", "/calendar", "/practice"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("no prep set is finished yet", { exact: false })).toHaveCount(0);
    await expect(page.getByText("hasn't done anything here", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Try the next one together", { exact: false })).toHaveCount(0);
  }
  expect(await nudgeActs(page, learnerId)).toEqual([]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Growth replays the record week by week; the grown-up sees the detail and the same numbers as a table", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "growth", [["Ada", "4"]]);
  const { learnerId } = await seed(page, { learner: "Ada", provedHistory: true });
  await asParent(page);
  await page.getByRole("article", { name: "Ada" }).getByRole("link", { name: "See full record" }).click();
  await expect(page).toHaveURL(new RegExp(`/growth\\?learner=${learnerId}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Growth · Ada" })).toBeVisible();

  const math = page.getByRole("region", { name: "Math", exact: true });
  await expect(math.getByRole("img", { name: /^Math, the last 8 weeks: skills proved went from 0 to 1\./ })).toBeVisible();

  // The table opens from the keyboard and says the same thing.
  const summary = math.getByText("Week by week");
  await summary.focus();
  await page.keyboard.press("Enter");
  const table = math.getByRole("table", { name: "Math, week by week" });
  await expect(table).toBeVisible();
  await expect(table.getByRole("row", { name: /^This week 1 0 0/ })).toBeVisible();

  await math.getByText("Skills (1)").click();
  const skill = math.getByRole("listitem").filter({ hasText: "Add within 5" });
  await expect(skill).toBeVisible();
  await expect(skill).toContainText("Proved");
  await noOverflow(page);
  await at320(page);
  await audit(page, "growth-parent");

  // Day by day: the week the skill was proved.
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(page.getByText("Proved Add within 5")).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a first grader's own Growth reads aloud on request, with the skills proved by name and no table", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "growth-k2", [["Leo", "1"]]);
  await seed(page, { learner: "Leo", provedHistory: true });
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Leo/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/growth");
  await expect(page.getByRole("heading", { level: 1, name: "Growth" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Read aloud: What you did, week by week\./ })).toBeVisible();
  await expect(page.getByText("You proved: Add within 5")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  const step = await page.getByRole("button", { name: "Previous week" }).boundingBox();
  expect(step!.height).toBeGreaterThanOrEqual(56);
  await noOverflow(page);
  await at320(page);
  await audit(page, "growth-k2");
  expect(errors, errors.join("\n")).toEqual([]);
});
