import type { UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fitWithin, keepNewestPhoto, PHOTO_EDGE, PHOTO_MAX_CHARS, PhotoError, shrinkPhoto } from "./photo";

// A phone photo is made small in the browser before it goes anywhere, and only the newest one travels.

describe("fitWithin", () => {
  it("fits the long edge, keeps the shape, never upscales", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: PHOTO_EDGE, height: 1176 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1176, height: PHOTO_EDGE });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 600)).toEqual({ width: 0, height: 0 });
  });
});

describe("shrinkPhoto", () => {
  const drawn: { width: number; height: number }[] = [];
  function fakeCanvas(dataUrl: (quality: number) => string) {
    const create = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "canvas") return create(tag);
      const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: () => {}, drawImage: () => drawn.push({ width: canvas.width, height: canvas.height }), fillStyle: "" }), toDataURL: (_: string, q: number) => dataUrl(q) };
      return canvas as unknown as HTMLCanvasElement;
    });
  }
  const close = vi.fn();
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    drawn.length = 0;
    close.mockReset();
  });

  it("draws a phone photo at the reading size as a JPEG and lets the bitmap go", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4032, height: 3024, close })));
    fakeCanvas(() => "data:image/jpeg;base64,AAAA");
    const photo = await shrinkPhoto(new File(["x"], "worksheet.heic", { type: "image/heic" }));
    expect(photo).toEqual({ url: "data:image/jpeg;base64,AAAA", mediaType: "image/jpeg" });
    expect(drawn).toEqual([{ width: PHOTO_EDGE, height: 1176 }]);
    expect(close).toHaveBeenCalled();
  });

  it("tries smaller sizes before giving up as too big", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4032, height: 3024, close })));
    fakeCanvas((q) => (q > 0.7 ? `data:image/jpeg;base64,${"A".repeat(PHOTO_MAX_CHARS)}` : "data:image/jpeg;base64,BBBB"));
    expect((await shrinkPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }))).url).toBe("data:image/jpeg;base64,BBBB");
    expect(drawn.map((d) => d.width)).toEqual([PHOTO_EDGE, 1280, 1024]);

    fakeCanvas(() => `data:image/jpeg;base64,${"A".repeat(PHOTO_MAX_CHARS)}`);
    await expect(shrinkPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }))).rejects.toEqual(new PhotoError("tooBig"));
  });

  it("refuses what isn't a picture, or can't be opened as one", async () => {
    await expect(shrinkPhoto(new File(["x"], "notes.pdf", { type: "application/pdf" }))).rejects.toMatchObject({ code: "unreadable" });
    vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("decode"))));
    await expect(shrinkPhoto(new File(["x"], "broken.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({ code: "unreadable" });
  });
});

describe("keepNewestPhoto", () => {
  const file = { type: "file" as const, mediaType: "image/jpeg", url: "data:image/jpeg;base64,AAAA" };
  it("sends only the newest photo again; older ones keep their words", () => {
    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "first" }, file] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "What did you try?" }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "second" }, file] },
      { id: "4", role: "user", parts: [{ type: "text", text: "and now?" }] },
    ];
    const out = keepNewestPhoto(messages);
    expect(out.map((m) => m.parts.map((p) => p.type))).toEqual([["text"], ["text"], ["text", "file"], ["text"]]);
    expect(messages[0].parts).toHaveLength(2); // the conversation on screen is untouched
  });
});
