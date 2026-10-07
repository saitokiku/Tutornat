import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// The lesson stage: narrated slides (play / pause / resume / stop, word marks, reduced motion, no
// voice), a balance solved by keyboard, the new manipulatives under axe, and a finish that never
// opens the next lesson. Lessons are seeded into the browser store so the journeys don't depend on
// which ready-made course a screen happens to show first.

type Scene = Record<string, unknown>;
const COURSE = "e2e-stage";

const slide: Scene = {
  id: "look",
  kind: "slide",
  title: "Moonlight",
  blocks: [
    { type: "text", text: "Sunlight lights half the Moon at all times." },
    { type: "visual", visual: { kind: "moon", phase: 0.25 }, alt: "A first quarter moon: the right half is lit." },
  ],
};
const balance: Scene = {
  id: "solve",
  kind: "interactive",
  title: "When is the plant 19 cm tall?",
  prompt: "Solve 3x + 4 = 19 on the balance.",
  widget: { kind: "balance", xCount: 3, leftUnits: 4, rightUnits: 19 },
};
const quiz: Scene = {
  id: "check",
  kind: "quiz",
  title: "Check what you know",
  questions: [{ id: "q1", prompt: "What lights the Moon?", choices: ["The Sun", "Earth"], answer: 0, hint: "Think of daytime.", explain: "Sunlight reflects off the Moon." }],
};
const widgets: Scene[] = [
  { id: "w1", kind: "interactive", title: "Area", prompt: "Make 2 rows of 4.", widget: { kind: "area-model", rows: 1, cols: 1, target: { rows: 2, cols: 4 } } },
  { id: "w2", kind: "interactive", title: "Blocks", prompt: "Build 15.", widget: { kind: "place-value", target: 15 } },
  { id: "w3", kind: "interactive", title: "Clock", prompt: "Set 7:50.", widget: { kind: "clock", h: 7, m: 0, target: { h: 7, m: 50 } } },
  balance,
  { id: "w5", kind: "interactive", title: "Plot", prompt: "Plot (−3, 2).", widget: { kind: "coordinate", min: -5, max: 5, targets: [[-3, 2]] } },
  { id: "w6", kind: "interactive", title: "Order", prompt: "Put them in order.", widget: { kind: "sequence", items: [{ id: "a", text: "Seed" }, { id: "b", text: "Sprout" }, { id: "c", text: "Flower" }] } },
  { id: "w7", kind: "interactive", title: "Words", prompt: "Build the sentence.", widget: { kind: "sentence-builder", words: ["Nia", "flies", "her", "kite."], answers: [["Nia", "flies", "her", "kite."]] } },
];

/** A learner of `grade`, signed in, with a two-lesson course whose first lesson is `scenes`. */
async function learnerWithLesson(page: Page, tag: string, grade: string, scenes: Scene[]) {
  await family(page, tag, [["Ada", grade]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.evaluate(
    ({ id, scenes }) => {
      const key = "kaizenedu.v1";
      const doc = JSON.parse(localStorage.getItem(key)!);
      const now = Date.now();
      doc.courses.push({
        id,
        profileId: doc.session.profileId,
        title: "The Moon",
        goal: "Why the Moon changes shape",
        subject: "science",
        grade: "5",
        locale: "en",
        origin: "catalogue",
        status: "ready",
        length: "short",
        sources: [],
        template: false,
        createdAt: now,
        updatedAt: now,
        lessons: [
          { id: "l1", title: "Half is lit", summary: "Why the Moon has phases.", minutes: 8, scenes },
          { id: "l2", title: "Eight phases", summary: "The phases in order.", minutes: 12, scenes: [{ id: "s1", kind: "slide", title: "Eight", blocks: [{ type: "text", text: "Eight phases." }] }] },
        ],
      });
      localStorage.setItem(key, JSON.stringify(doc));
    },
    { id: COURSE, scenes },
  );
  await page.goto(`/learn/${COURSE}/l1`);
  await expect(page.getByRole("heading", { level: 1, name: "Half is lit" })).toBeVisible();
}

test("lesson help survives reload and a completed question resumes without duplicate activity", async ({ page }) => {
  const errors = collectErrors(page);
  await learnerWithLesson(page, "stg-evidence", "5", [quiz]);
  await page.getByRole("button", { name: "Show a hint" }).click();
  await expect(page.getByText("Think of daytime.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Think of daytime.")).toBeVisible();
  await page.getByRole("radio", { name: "The Sun", exact: true }).check();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("That's right, with help.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("That's right, with help.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "The Sun", exact: true })).toBeDisabled();
  const ledger = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("kaizenedu.v1")!);
    return { answers: s.activity.filter((e: { type: string }) => e.type === "quiz_answered"), first: s.responseEvents, help: s.helpExposures };
  });
  expect(ledger.answers).toEqual([expect.objectContaining({ correct: true, assisted: true, response: "The Sun" })]);
  expect(ledger.first).toHaveLength(1);
  expect(ledger.help).toHaveLength(1);
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

/** A browser voice that reads one word every 300 ms and reports each word, like Chrome does. */
function fakeVoice(page: Page) {
  return page.addInitScript(() => {
    type U = { text: string; onboundary?: (e: unknown) => void; onend?: () => void; onerror?: (e: unknown) => void };
    const spoken: string[] = [];
    let current: U | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    class Utterance {
      lang = "";
      voice = null;
      rate = 1;
      constructor(public text: string) {}
    }
    const synth = {
      getVoices: () => [],
      speak(u: U) {
        current = u;
        spoken.push(u.text);
        const words = [...u.text.matchAll(/\S+/g)];
        let i = 0;
        const step = () => {
          if (current !== u) return;
          if (i < words.length) {
            u.onboundary?.({ name: "word", charIndex: words[i].index, charLength: words[i][0].length });
            i++;
            timer = setTimeout(step, 300);
          } else {
            current = null;
            u.onend?.();
          }
        };
        timer = setTimeout(step, 30);
      },
      cancel() {
        clearTimeout(timer);
        const u = current;
        current = null;
        u?.onerror?.({ error: "interrupted" });
      },
      pause() {},
      resume() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
  });
}

test("a narrated slide plays, marks the word, pauses, resumes and stops", async ({ page }) => {
  const errors = collectErrors(page);
  await fakeVoice(page);
  await learnerWithLesson(page, "narrate", "5", [slide, quiz]);
  await noOverflow(page);

  const toggle = page.getByRole("button", { name: "Read aloud" });
  await toggle.click();
  const word = page.locator("[data-spoken=word]");
  await expect(word).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  // Pause: the voice stops and the mark stays where it was.
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  const held = await word.textContent();
  await page.waitForTimeout(900);
  await expect(word).toHaveText(held ?? "");

  // Resume from the keyboard: it starts again at that word.
  await page.getByRole("button", { name: "Resume" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(spoken.at(-1)?.startsWith(held ?? "")).toBe(true);

  // The picture is described aloud with its words shown while it is read.
  await expect(page.locator("figcaption")).toHaveText("A first quarter moon: the right half is lit.", { timeout: 15_000 });

  await page.getByRole("button", { name: "Stop reading" }).click();
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeFocused();
  await expect(page.locator("[data-spoken]")).toHaveCount(0);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("K–2: say it with me tells the child when it is their turn", async ({ page }) => {
  const errors = collectErrors(page);
  await fakeVoice(page);
  await learnerWithLesson(page, "chant", "K", [slide, quiz]);
  await noOverflow(page);
  await page.getByRole("button", { name: "Say it with me" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your turn. Say it out loud." })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-spoken=turn]")).toBeVisible();
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(spoken).toContain("Your turn.");
  await page.getByRole("button", { name: "Stop reading" }).click();
  await expect(page.locator("[data-spoken]")).toHaveCount(0);
  expect(errors, errors.join("\n")).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the word being read is a still underline", async ({ page }) => {
    await fakeVoice(page);
    await learnerWithLesson(page, "narrate-rm", "5", [slide, quiz]);
    await page.getByRole("button", { name: "Read aloud" }).click();
    const word = page.locator("[data-spoken=word]");
    await expect(word).toBeVisible();
    const style = await word.evaluate((el) => {
      const s = getComputedStyle(el);
      return { line: s.textDecorationLine, bg: s.backgroundColor, transition: s.transitionDuration };
    });
    expect(style.line).toContain("underline");
    expect(style.bg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(parseFloat(style.transition)).toBeLessThan(0.01);
  });

  // Reduced motion so contrast is measured on settled UI, as in a11y.spec.ts.
  test("the new manipulatives have no serious accessibility problems and fit the screen", async ({ page }) => {
    await learnerWithLesson(page, "widgets-a11y", "4", widgets);
    for (let i = 0; i < widgets.length; i++) {
      await expect(page.getByRole("heading", { level: 2, name: widgets[i].title as string })).toBeVisible();
      await noOverflow(page);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${widgets[i].title}: ${v.id} — ${v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary}`).join(" | ")}`)).toEqual([]);
      if (i < widgets.length - 1) await page.getByRole("button", { name: /^Next/ }).click();
    }
  });
});

test("without a browser voice the control hides and the text stays", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (Window.prototype as unknown as Record<string, unknown>).speechSynthesis;
  });
  await learnerWithLesson(page, "no-voice", "5", [slide, quiz]);
  await expect(page.getByText("Sunlight lights half the Moon at all times.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Read aloud" })).toHaveCount(0);
});

test("a balance is solved with the keyboard alone", async ({ page }) => {
  const errors = collectErrors(page);
  await learnerWithLesson(page, "balance", "7", [slide, balance, quiz]);
  await page.getByRole("button", { name: /^Next/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "When is the plant 19 cm tall?" })).toBeFocused();
  await noOverflow(page);

  const both = page.getByRole("button", { name: "Take 1 from both sides" });
  await both.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Enter");
  await expect(page.getByText("3x = 15. The balance is level.")).toBeVisible();
  await expect(both).toBeFocused(); // out of units: it says so, and keeps focus
  await expect(both).toHaveAttribute("aria-disabled", "true");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Split both sides into 3 equal groups" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("x = 5. The balance is level. x = 5")).toBeVisible();

  const check = page.getByRole("button", { name: "Check my answer" });
  for (let i = 0; i < 8 && !(await check.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(check).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "That's right." })).toBeVisible();
  // The learner who pressed Check keeps focus there while the result is announced.
  await expect(check).toBeFocused();
  await expect(check).toHaveAttribute("aria-disabled", "true");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a tipped balance never shows a false equation", async ({ page }) => {
  await learnerWithLesson(page, "balance-tip", "7", [balance, quiz]);
  await page.getByRole("button", { name: "Take 1 from the left" }).click();
  await expect(page.getByText("3x + 3 < 19. The right side is heavier.")).toBeVisible();
  await expect(page.getByText("3x + 3 = 19")).toHaveCount(0);
});

test("finishing a lesson never opens the next one", async ({ page }) => {
  const errors = collectErrors(page);
  await learnerWithLesson(page, "finish", "5", [slide, quiz]);
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByLabel("The Sun").check();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /Finish lesson/ }).click();

  await expect(page.getByRole("heading", { name: "Lesson finished" })).toBeVisible();
  await expect(page.getByText("Written by people")).toBeVisible();
  const row = (label: string) => page.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
  await expect(row("Right on your own")).toHaveText("1");
  await expect(row("Right with help")).toHaveText("0");
  await expect(row("Not yet")).toHaveText("0");
  await expect(page.getByText("Not tried")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Start the next lesson/ })).toHaveAttribute("href", `/learn/${COURSE}/l2`);
  await noOverflow(page);

  // Wait: nothing moves on by itself, and the next lesson was not started.
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(new RegExp(`/learn/${COURSE}/l1$`));
  await expect(page.getByRole("heading", { name: "Lesson finished" })).toBeVisible();
  const startedNext = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem("kaizenedu.v1")!).activity.some((e: { courseId: string; lessonId?: string }) => e.courseId === id && e.lessonId === "l2"),
    COURSE,
  );
  expect(startedNext).toBe(false);

  await page.getByRole("link", { name: /I'm done for today/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(errors, errors.join("\n")).toEqual([]);
});
