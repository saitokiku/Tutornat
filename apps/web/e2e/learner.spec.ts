import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asParent, collectErrors, family, noOverflow } from "./helpers";

// The learner model on the child's page: "How we teach {name}" with the evidence behind each fact
// and a grown-up's edits, and "Is it working?" from a scripted history. Desktop and phone sizes.

async function openChild(page: Page, name: string) {
  await asParent(page);
  await page.getByRole("link", { name: `Open ${name}'s page` }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/**
 * Yesterday, one set on "Add within 20" with three hints: after two of them the next problem was
 * right on their own, after one it was missed. Written straight into this browser's record.
 */
async function seedHints(page: Page, name: string) {
  await page.evaluate((nickname) => {
    const KEY = "kaizenedu.v1";
    const s = JSON.parse(localStorage.getItem(KEY)!);
    const kid = s.profiles.find((p: { nickname: string }) => p.nickname === nickname);
    const S = "m.add.20";
    const min = 60_000;
    const at = Date.now() - 864e5;
    const seeds = [10, 11, 12, 13, 14, 15, 16];
    s.sets.push({ id: "seed-set", profileId: kid.id, createdAt: at, kind: "pick", subject: "math", skillId: S, slots: seeds.map((seed) => ({ skillId: S, seed, role: "main" })), finishedAt: at + 20 * min });
    const answer = (seed: number, m: number, correct: boolean, assisted: boolean) => ({ id: `seed-${seed}`, profileId: kid.id, at: at + m * min, skillId: S, level: 1, seed, setId: "seed-set", mode: "practice", correct, assisted, seconds: 20 });
    s.attempts.push(answer(10, 1, true, false), answer(11, 3, true, true), answer(12, 4, true, false), answer(13, 6, true, true), answer(14, 7, false, false), answer(15, 9, true, true), answer(16, 10, true, false));
    for (const [slot, m] of [
      [1, 2],
      [3, 5],
      [5, 8],
    ])
      s.acts.push({ id: `seed-act-${slot}`, profileId: kid.id, at: at + m * min, kind: "hint", intent: "next-try-right", skillId: S, setId: "seed-set", ref: String(slot), detail: "1" });
    localStorage.setItem(KEY, JSON.stringify(s));
  }, name);
}

test("editing “prefer pictures” persists across a reload and shows it was set by a grown-up", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "teach", [["Ada", "4"]]);
  await openChild(page, "Ada");
  const section = page.getByRole("region", { name: "How we teach Ada" });
  await expect(section.getByText("Not enough yet").first()).toBeVisible();
  await expect(section.getByText("Set by a grown-up")).toHaveCount(0);

  const pictures = section.getByRole("group", { name: "Pictures that help" });
  await pictures.getByText("Pictures", { exact: true }).click();
  await expect(pictures.getByRole("radio", { name: "Pictures" })).toBeChecked();
  await expect(section.getByText("Set by a grown-up")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "How we teach Ada" }).getByRole("group", { name: "Pictures that help" }).getByRole("radio", { name: "Pictures" })).toBeChecked();
  await expect(page.getByRole("region", { name: "How we teach Ada" }).getByText("Set by a grown-up")).toBeVisible();
  await noOverflow(page);

  // Clearing the edits sits behind a confirm, and the record decides again.
  await page.getByRole("button", { name: "Clear my edits" }).click();
  await page.getByRole("button", { name: "Yes, clear" }).click();
  await expect(page.getByRole("region", { name: "How we teach Ada" }).getByText("Set by a grown-up")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Pictures that help" }).getByRole("radio", { name: "Follow the record" })).toBeChecked();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a choice and a note by keyboard alone", async ({ page }) => {
  await family(page, "keys", [["Ada", "4"]]);
  await openChild(page, "Ada");
  const lead = page.getByRole("group", { name: "When stuck, start with" });
  await lead.getByRole("radio", { name: "Follow the record" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(lead.getByRole("radio", { name: "A worked example" })).toBeChecked();
  await page.getByLabel("Note for the tutor").fill("Likes drawing. Ada does better without a rush.");
  await page.getByRole("button", { name: "Save" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Note for the tutor")).toHaveValue("Likes drawing. Ada does better without a rush.");
  await expect(page.getByRole("group", { name: "When stuck, start with" }).getByRole("radio", { name: "A worked example" })).toBeChecked();
});

test("a seeded history shows an “Is it working?” sentence on the child page", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "working", [["Ada", "4"]]);
  await seedHints(page, "Ada");
  await openChild(page, "Ada");
  const working = page.getByRole("region", { name: "Is it working?" });
  await expect(working.getByText("After a hint, the next problem was right on their own 2 of 3 times.")).toBeVisible();
  await expect(working.getByText("None of it is written by AI", { exact: false })).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test.describe("accessibility", () => {
  test.use({ reducedMotion: "reduce" });

  test("the child page has no serious accessibility problems and fits 320 px", async ({ page }) => {
    await family(page, "a11y-child", [["Ada", "4"]]);
    await seedHints(page, "Ada");
    await openChild(page, "Ada");
    await page.getByRole("group", { name: "Pictures that help" }).getByText("Number line", { exact: true }).click();
    await expect(page.getByText("Set by a grown-up")).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    await noOverflow(page);
  });
});
