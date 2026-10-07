import { afterEach, describe, expect, it, vi } from "vitest";
import { BLOB_MAX_BYTES, IMAGE_INPUT_MAX_BYTES, blobPersistence, checkFile, clearBlobs, dataUrl, deleteBlob, fitWithin, getBlob, prepareFile, pruneBlobs, putBlob } from "./blobs";

// jsdom has no IndexedDB, so this is the fallback path: files kept in memory for the page, and the
// store says so (blobPersistence "memory") so the screen can tell the family.

afterEach(() => clearBlobs());
const pdf = (text = "%PDF-1.4 worksheet") => new Blob([text], { type: "application/pdf" });

describe("file store (in-memory fallback)", () => {
  it("says files last only while the page is open", async () => {
    expect(await blobPersistence()).toBe("memory");
  });

  it("keeps a file and gives it back by id", async () => {
    const id = await putBlob(pdf(), "sheet.pdf");
    expect(id).toBeTruthy();
    const got = await getBlob(id!);
    expect(got).toMatchObject({ id, name: "sheet.pdf", type: "application/pdf", size: 18, where: "memory" });
    expect(await got!.blob.text()).toBe("%PDF-1.4 worksheet");
  });

  it("turns away empty files and files over 10 MB", async () => {
    expect(await putBlob(new Blob([]), "empty.pdf")).toBeNull();
    expect(await putBlob(new Blob([new Uint8Array(BLOB_MAX_BYTES + 1)], { type: "application/pdf" }), "big.pdf")).toBeNull();
    expect(await putBlob(new Blob([new Uint8Array(BLOB_MAX_BYTES)], { type: "application/pdf" }), "fits.pdf")).toBeTruthy();
  });

  it("deletes one file, or all of them", async () => {
    const a = (await putBlob(pdf(), "a.pdf"))!;
    const b = (await putBlob(pdf(), "b.pdf"))!;
    await deleteBlob(a);
    expect(await getBlob(a)).toBeNull();
    expect(await getBlob(b)).not.toBeNull();
    await clearBlobs();
    expect(await getBlob(b)).toBeNull();
    expect(await getBlob("never-was")).toBeNull();
  });

  it("prunes files no item points to, but leaves new ones for a save in progress", async () => {
    const kept = (await putBlob(pdf(), "kept.pdf"))!;
    const orphan = (await putBlob(pdf(), "orphan.pdf"))!;
    expect(await pruneBlobs([kept])).toBe(0); // both are younger than the grace period
    expect(await pruneBlobs([kept], Date.now() + 2 * 3600_000)).toBe(1);
    expect(await getBlob(orphan)).toBeNull();
    expect(await getBlob(kept)).not.toBeNull();
  });
});

describe("files before they're kept", () => {
  it("fits a photo inside 1600 px on its long side, keeping its shape, never enlarging", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(20000, 10)).toEqual({ width: 1600, height: 1 });
  });

  it("takes photos and PDFs only, within their caps", () => {
    expect(checkFile({ type: "image/jpeg", size: 5_000_000 })).toBeNull();
    expect(checkFile({ type: "image/heic", size: 20_000_000 })).toBeNull(); // shrunk before the 10 MB cap applies
    expect(checkFile({ type: "image/png", size: IMAGE_INPUT_MAX_BYTES + 1 })).toBe("size");
    expect(checkFile({ type: "application/pdf", size: BLOB_MAX_BYTES + 1 })).toBe("size");
    expect(checkFile({ type: "text/html", size: 10 })).toBe("type");
    expect(checkFile({ type: "", size: 10 })).toBe("type");
    expect(checkFile({ type: "application/pdf", size: 0 })).toBe("read");
  });

  it("keeps a PDF as it is and explains what it turns away", async () => {
    const file = new File(["%PDF-1.4"], "notes.pdf", { type: "application/pdf" });
    expect(await prepareFile(file)).toEqual({ blob: file, name: "notes.pdf" });
    expect(await prepareFile(new File(["<p>"], "page.html", { type: "text/html" }))).toEqual({ error: "type" });
    expect(await prepareFile(new File([new Uint8Array(BLOB_MAX_BYTES + 1)], "big.pdf", { type: "application/pdf" }))).toEqual({ error: "size" });
  });

  it("redraws a photo as a JPEG at most 1600 px on its long side, upright and on white", async () => {
    const bitmap = { width: 4032, height: 3024, close: vi.fn() };
    const decode = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", decode);
    const drawn: unknown[][] = [];
    const ctx = { fillStyle: "", fillRect: vi.fn(), drawImage: (...args: unknown[]) => drawn.push(args) };
    const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: vi.fn((done: (b: Blob) => void, type: string) => done(new Blob(["jpeg bytes"], { type }))) };
    const make = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => (tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : make(tag)));
    try {
      const photo = new File([new Uint8Array(5_000_000)], "IMG_2041.HEIC", { type: "image/heic" });
      const out = await prepareFile(photo);
      expect(out).toMatchObject({ name: "IMG_2041.jpg" });
      expect((out as { blob: Blob }).blob.type).toBe("image/jpeg");
      expect(decode).toHaveBeenCalledWith(photo, { imageOrientation: "from-image" });
      expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
      expect(ctx.fillStyle).toBe("#ffffff");
      expect(drawn[0]).toEqual([bitmap, 0, 0, 1600, 1200]);
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.85);
      expect(bitmap.close).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("explains a photo this browser can't open instead of keeping it", async () => {
    expect(await prepareFile(new File([new Uint8Array([1, 2, 3])], "photo.heic", { type: "image/heic" }))).toEqual({ error: "read" });
  });

  it("turns a file into a data URL for the AI reader", async () => {
    expect(await dataUrl(pdf("%PDF"))).toBe("data:application/pdf;base64,JVBERg==");
  });
});
