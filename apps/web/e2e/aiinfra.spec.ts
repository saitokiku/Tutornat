import { expect, test } from "@playwright/test";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import en from "../src/i18n/en";
import { collectErrors, family, noOverflow } from "./helpers";

// AI infrastructure journeys: what the browser tells the AI routes (opaque ids, never a name), what
// a learner over the daily spend cap sees, and that nothing without a provider ever reaches a model.
// The caps themselves are enforced on the server and driven end to end, through the real tutor route,
// by the eval (`npm run evals`, cases c01 and c02) and src/lib/server/budget.test.ts. Here the
// tutor's capped reply is served exactly as lib/server/budget.ts streams it for a skill on screen.

/** The tutor's reply over a cap: the line in its own voice, metadata.budget, and the practice card. */
async function cappedReply(text: string, skillId: string) {
  const res = createUIMessageStreamResponse({
    headers: { "x-kaizen-budget": "day" },
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start", messageMetadata: { budget: "day" } });
        writer.write({ type: "text-start", id: "budget" });
        writer.write({ type: "text-delta", id: "budget", delta: text });
        writer.write({ type: "text-end", id: "budget" });
        writer.write({ type: "tool-input-available", toolCallId: "budget-1", toolName: "start_practice", input: { skillId, reason: "" } });
        writer.write({ type: "tool-output-available", toolCallId: "budget-1", output: { offered: true } });
        writer.write({ type: "finish" });
      },
    }),
  });
  return { status: 200, headers: Object.fromEntries(res.headers), body: await res.text() };
}

test("the browser asks about AI with opaque ids and the local date, never the learner's name", async ({ page }) => {
  const errors = collectErrors(page);
  const asked: Record<string, string>[] = [];
  await page.route("**/api/ai/status", async (route) => {
    asked.push(route.request().headers());
    await route.continue();
  });
  await family(page, "aistatus", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/talk");
  await expect(page.getByText(en["tutor.disclosure"], { exact: false })).toBeVisible();
  expect(asked.length).toBeGreaterThan(0);
  const h = asked.at(-1)!;
  expect(h["x-kaizen-learner"]).toMatch(/^[a-f0-9]{32}$/);
  expect(h["x-kaizen-account"]).toMatch(/^[a-f0-9]{32}$/);
  expect(h["x-kaizen-day"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(JSON.stringify(h)).not.toMatch(/Ada|Maria/);
  const status = await (await page.request.get("/api/ai/status", { headers: { "x-kaizen-learner": h["x-kaizen-learner"] } })).json();
  expect(["anthropic", "gateway", "demo"]).toContain(status.mode);
  if (status.mode === "demo") expect(status.budget).toBeNull();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("over the daily cap the tutor says so kindly, in its own voice, and practice is one tap away", async ({ page }) => {
  const errors = collectErrors(page);
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: { mode: "anthropic", budget: null } }));
  const reply = await cappedReply(en["ai.budget.tutor.day"], "m.add.10");
  await page.route("**/api/tutor", (route) => route.fulfill(reply));
  await family(page, "aicap", [["Ada", "1"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/talk");
  await page.getByRole("textbox").fill("how do I add?");
  await page.keyboard.press("Enter");
  const log = page.getByRole("log");
  await expect(log.getByText(en["ai.budget.tutor.day"])).toBeVisible();
  // A tutor message, not an error and not a safety referral.
  await expect(page.getByText(en["tutor.error"])).toHaveCount(0);
  await expect(page.getByText("988", { exact: false })).toHaveCount(0);
  await expect(log.getByText(en["tutor.practiceCard"])).toBeVisible();
  await noOverflow(page);
  // The practice card works by keyboard as well as by tap.
  const start = log.getByRole("button", { name: en["practice.start"] });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/practice\/.+/);
  expect(errors, errors.join("\n")).toEqual([]);
});

// The forced cap against the real server, opt-in because it spends one real model turn: start the
// server with a provider and KAIZEN_AI_ADDRESS_DAILY_TURNS=1, then run with E2E_AI_CAP=1. (The
// address ceiling is the cap every request meets today; the learner's own cap needs TutorChat to
// send through aiFetch.)
test("a forced cap on the real server: one reply from the model, then the tutor's cap line", async ({ page }) => {
  test.skip(!process.env.E2E_AI_CAP, "set E2E_AI_CAP=1 with the server started as described above");
  const { mode } = await (await page.request.get("/api/ai/status")).json();
  test.skip(mode === "demo", "this server has no AI provider");
  await family(page, "aiforced", [["Ada", "3"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/talk");
  const log = page.getByRole("log");
  const box = page.getByRole("textbox");
  const first = page.waitForResponse("**/api/tutor");
  await box.fill("what is a fraction?");
  await page.keyboard.press("Enter");
  await (await first).finished();
  await expect(log.getByText(en["ai.budget.tutor.day"])).toHaveCount(0);
  await box.fill("can you show me one?");
  await page.keyboard.press("Enter");
  await expect(log.getByText(en["ai.budget.tutor.day"])).toBeVisible({ timeout: 30_000 });
  await box.fill("i want to die");
  await page.keyboard.press("Enter");
  await expect(log.getByText("988", { exact: false })).toBeVisible();
});

test("without a provider no AI route goes near a model, whatever the caps", async ({ request }) => {
  const { mode } = await (await request.get("/api/ai/status")).json();
  test.skip(mode !== "demo", "this server has an AI provider configured");
  const headers = { "x-kaizen-learner": "a".repeat(32), "x-kaizen-account": "b".repeat(32) };
  const tutor = await request.post("/api/tutor", { headers, data: { messages: [], context: { locale: "en", grade: "4", surface: "talk" } } });
  expect(tutor.status()).toBe(503);
  const course = await request.post("/api/ai/course", { headers, data: { goal: "the water cycle", grade: "2", subject: "science", length: "lesson", locale: "en" } });
  expect(course.status()).toBe(503);
  expect(await course.json()).toEqual({ error: "demo" });
});
