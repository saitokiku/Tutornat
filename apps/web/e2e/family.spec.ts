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

type Seed = { learner: string; testInDays?: number; addedDaysAgo?: number; provedHistory?: boolean };

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
      let eventId: string | undefined;
      if (opts.addedDaysAgo !== undefined) learner.createdAt = now - opts.addedDaysAgo * DAY;
      if (opts.testInDays !== undefined) {
        eventId = `e2e-test-${now}`;
        doc.events.push({ id: eventId, profileId: learner.id, title: "Fractions test", kind: "test", date: day(opts.testInDays), skillIds: ["m.frac.equiv"], source: "typed", createdAt: now });
      }
      if (opts.provedHistory) {
        // Add within 5: ten right on their own three weeks ago, then two passed checks a week apart.
        let n = 0;
        const answer = (at: number, mode: string, setId: string) => ({ id: `e2e-a${n++}`, profileId: learner.id, at, skillId: "m.add.5", level: 1, seed: n, setId, mode, correct: true, assisted: false, seconds: 6 });
        for (let i = 0; i < 10; i++) doc.attempts.push(answer(now - 21 * DAY + i * 60_000, "practice", "e2e-p1"));
        for (const [k, ago] of [14, 7].entries()) for (let i = 0; i < 5; i++) doc.attempts.push(answer(now - ago * DAY + i * 60_000, "check", `e2e-c${k}`));
      }
      localStorage.setItem(key, JSON.stringify(doc));
      return { learnerId: learner.id as string, eventId };
    },
    { key: STORE, opts },
  );
}

const actsFor = (page: Page, learnerId: string) =>
  page.evaluate(({ key, learnerId }) => JSON.parse(localStorage.getItem(key)!).acts.filter((a: { profileId: string }) => a.profileId === learnerId), { key: STORE, learnerId });

test("a test in two days with no prep: the family card says so, and its link opens the test", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-prep", [["Ada", "4"]]);
  const { learnerId, eventId } = await seed(page, { learner: "Ada", testInDays: 2 });
  await asParent(page);

  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText(/^Ada has a test (in 2 days|tomorrow), “Fractions test”, and no prep set is finished yet\.$/)).toBeVisible();
  // Today's next step is the prep set the plan put first.
  await expect(card.getByText(/next: Get ready for Fractions test/)).toBeVisible();
  await noOverflow(page);
  await audit(page, "family-with-nudge");

  // Shown to a grown-up = one nudge act for the child, waiting for its outcome.
  const acts = await actsFor(page, learnerId);
  expect(acts).toEqual([expect.objectContaining({ kind: "nudge", intent: "parent-acts", ref: `prep:${eventId}`, detail: "prep" })]);
  expect(acts[0].outcome).toBeUndefined();

  await card.getByRole("link", { name: "Open the test" }).click();
  await expect(page).toHaveURL(new RegExp(`/calendar/${eventId}$`));
  await expect(page.getByText("Fractions test").first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("nothing done for days: the nudge hands the device to the child's Today", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-idle", [["Ada", "4"]]);
  await seed(page, { learner: "Ada", addedDaysAgo: 6 });
  await asParent(page);
  const card = page.getByRole("article", { name: "Ada" });
  await expect(card.getByText("Ada hasn't done anything here for 6 days.")).toBeVisible();
  await card.getByRole("link", { name: "Open Ada's Today" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Ada" })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("nudges never reach the child", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "nudge-child", [["Ada", "4"]]);
  const { learnerId } = await seed(page, { learner: "Ada", testInDays: 2, addedDaysAgo: 6 });
  await page.goto("/profiles");
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  for (const path of ["/home", "/growth", "/calendar"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("no prep set is finished yet", { exact: false })).toHaveCount(0);
    await expect(page.getByText("hasn't done anything here", { exact: false })).toHaveCount(0);
  }
  expect(await actsFor(page, learnerId)).toEqual([]);
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

  await math.getByText(/^Skills \(1\)$/).click();
  await expect(math.getByText("Add within 5")).toBeVisible();
  await expect(math.getByText(/^Proved/)).toBeVisible();
  await noOverflow(page);
  await audit(page, "growth-parent");

  // Day by day: the week the skill was proved.
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(page.getByText("Proved Add within 5")).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});
