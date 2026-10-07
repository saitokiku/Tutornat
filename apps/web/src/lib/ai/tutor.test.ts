// @vitest-environment node
import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { TutorContext } from "./context";
import { KNOWLEDGE_TOOLS, systemPrompt } from "./prompts";
import { checkPhotos, PHOTO, PHOTO_RULES, tutorTurn } from "./tutor";

// A photo of the problem: checked, screened, and seen by the model only when the learner's words pass
// the safety screen. Never a link, never stored.

const ctx: TutorContext = { locale: "en", grade: "4", surface: "talk" };
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const photo = (text: string, url = JPEG, mediaType = "image/jpeg", id = "u1"): UIMessage => ({
  id,
  role: "user",
  parts: [
    { type: "text", text },
    { type: "file", mediaType, url, filename: "problem.jpg" },
  ],
});

function recordingModel() {
  const seen: { prompt: unknown }[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (opts) => {
      seen.push({ prompt: opts.prompt });
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "What have you tried on the first one?" },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
          ],
        }),
      };
    },
  });
  return { model, seen };
}

const filesIn = (prompt: unknown) => (JSON.stringify(prompt).match(/"type":"file"/g) ?? []).length;

describe("photo of the problem", () => {
  it("goes to the model with the photo rules when the words pass the screen", async () => {
    const { model, seen } = recordingModel();
    const res = await tutorTurn({ messages: [photo("Here is a photo of my problem.")], context: ctx }, model);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("What have you tried");
    expect(filesIn(seen[0].prompt)).toBe(1);
    expect(JSON.stringify(seen[0].prompt)).toContain("photo of their schoolwork");
    expect(JSON.stringify(seen[0].prompt)).toContain("image/jpeg");
  });

  it("the safety screen still runs on the words: a crisis gets the fixed referral and the photo never reaches a model", async () => {
    const { model, seen } = recordingModel();
    const res = await tutorTurn({ messages: [photo("i want to die")], context: ctx }, model);
    expect(await res.text()).toContain("988");
    expect(seen).toEqual([]);
    const abuse = await tutorTurn({ messages: [photo("my dad hits me", "not-a-photo")], context: { ...ctx, locale: "es" } }, model);
    expect(await abuse.text()).toContain("1-800-422-4453"); // even when the photo itself is bad
    expect(seen).toEqual([]);
  });

  it("refuses links, other file types, mismatched types, several photos at once and photos from the tutor's side", async () => {
    const { model, seen } = recordingModel();
    const bad: UIMessage[] = [
      photo("look", "https://example.com/worksheet.jpg"),
      photo("look", "data:application/pdf;base64,JVBERi0=", "application/pdf"),
      photo("look", JPEG, "image/png"),
      { ...photo("look"), parts: [...photo("look").parts, { type: "file", mediaType: "image/jpeg", url: JPEG }] },
    ];
    for (const m of bad) {
      const res = await tutorTurn({ messages: [m], context: ctx }, model);
      expect(res.status).toBe(400);
      await res.text();
    }
    const fromTutor: UIMessage = { id: "a1", role: "assistant", parts: [{ type: "file", mediaType: "image/jpeg", url: JPEG }] };
    expect((await tutorTurn({ messages: [fromTutor, { id: "u", role: "user", parts: [{ type: "text", text: "hi" }] }], context: ctx }, model)).status).toBe(400);
    expect(seen).toEqual([]);
  });

  it("refuses a photo over the size cap", async () => {
    const { model, seen } = recordingModel();
    const huge = `data:image/jpeg;base64,${"A".repeat(PHOTO.maxChars)}`;
    const res = await tutorTurn({ messages: [photo("look", huge)], context: ctx }, model);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "photo_too_big" });
    expect(seen).toEqual([]);
  });

  it("keeps only the newest photo for the model", () => {
    const older = photo("first one", JPEG, "image/jpeg", "u1");
    const reply: UIMessage = { id: "a1", role: "assistant", parts: [{ type: "text", text: "What did you try?" }] };
    const newer = photo("second one", JPEG.replace("/9j", "/9k"), "image/jpeg", "u2");
    const out = checkPhotos([older, reply, newer]);
    expect(out.error).toBeUndefined();
    expect(out.hasPhoto).toBe(true);
    expect(out.messages[0].parts.map((p) => p.type)).toEqual(["text"]);
    expect(out.messages[2].parts.map((p) => p.type)).toEqual(["text", "file"]);
    expect(checkPhotos([reply]).hasPhoto).toBe(false);
  });

  it("text-only turns don't get the photo rules", async () => {
    const { model, seen } = recordingModel();
    await (await tutorTurn({ messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "what is a fraction" }] }], context: ctx }, model)).text();
    expect(JSON.stringify(seen[0].prompt)).not.toContain("photo of their schoolwork");
    expect(PHOTO_RULES).toMatch(/don't solve it/);
  });
});

describe("tool guidance", () => {
  it("tells the model about each knowledge tool and never to invent sources", () => {
    const p = systemPrompt(ctx);
    for (const name of ["look_up", "define_word", "find_book", "read_poem", "standard_text"]) expect(p).toContain(name);
    expect(KNOWLEDGE_TOOLS).toMatch(/Never invent a fact, a quote, a book, a poem or a link/);
    expect(p).not.toMatch(/the answer is/i);
  });
});
