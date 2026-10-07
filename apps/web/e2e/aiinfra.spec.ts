import { expect, test } from "@playwright/test";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import en from "../src/i18n/en";
import { collectErrors, family, noOverflow } from "./helpers";

// AI infrastructure journeys: what the browser tells the AI routes (opaque ids, never a name), what
// a learner over the daily spend cap sees, and that nothing without a provider ever reaches a model.
// The caps themselves are enforced on the server and tested in src/lib/server/budget.test.ts; here
// the tutor's capped reply is served exactly as lib/server/budget.ts streams it.

/** The tutor's reply over a cap, in the same stream format and with the same metadata as the server's. */
async function cappedReply(text: string) {
  const res = createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start", messageMetadata: { budget: "day" } });
        writer.write({ type: "text-start", id: "budget" });
        writer.write({ type: "text-delta", id: "budget", delta: text });
        writer.write({ type: "text-end", id: "budget" });
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
  await page.getByRole("link", { name: "Get help now" }).click();
  await expect(page).toHaveURL(/\/talk$/);
  await expect(page.getByText("I'm a computer tutor, not a person.", { exact: false })).toBeVisible();
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

test("over the daily cap the tutor says so kindly, in its own voice, and practice still works", async ({ page }) => {
  const errors = collectErrors(page);
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: { mode: "anthropic", budget: null } }));
  const reply = await cappedReply(en["ai.budget.tutor.day"]);
  await page.route("**/api/tutor", (route) => route.fulfill(reply));
  await family(page, "aicap", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.getByRole("link", { name: "Get help now" }).click();
  await expect(page).toHaveURL(/\/talk$/);
  await page.getByRole("textbox").fill("how do I add fractions?");
  await page.keyboard.press("Enter");
  const capped = page.getByText(en["ai.budget.tutor.day"]);
  await expect(capped).toBeVisible();
  // It is a tutor message, not an error and not a safety referral.
  await expect(page.getByText(en["tutor.error"])).toHaveCount(0);
  await expect(page.getByText("988", { exact: false })).toHaveCount(0);
  await noOverflow(page);

  await page.goto("/practice");
  await page.getByRole("button", { name: /^Start/ }).first().click();
  await expect(page).toHaveURL(/\/practice\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
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
