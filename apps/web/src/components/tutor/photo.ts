import type { UIMessage } from "ai";

// A photo of the problem, made small in the browser before it goes anywhere: a phone photo is often
// 4000 px and several MB; the tutor needs a sharp worksheet, not the camera's full size. Nothing here
// stores the photo; it lives in the conversation in memory and in the one request that sends it.

/** Long edge in pixels: enough to read a worksheet, small enough to send quickly. */
export const PHOTO_EDGE = 1568;
/** Largest data URL we send (the server refuses bigger ones). */
export const PHOTO_MAX_CHARS = 2_600_000;

export type Photo = { url: string; mediaType: "image/jpeg" };

/** The size that fits inside `max` on the long edge, keeping the shape; never upscales. */
export function fitWithin(width: number, height: number, max = PHOTO_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export class PhotoError extends Error {
  constructor(public code: "unreadable" | "tooBig") {
    super(code);
  }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}

/** Shrinks a chosen image to a JPEG data URL under the caps; throws PhotoError when it can't. */
export async function shrinkPhoto(file: Blob): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new PhotoError("unreadable");
  let picture: Awaited<ReturnType<typeof decode>>;
  try {
    picture = await decode(file);
  } catch {
    throw new PhotoError("unreadable");
  }
  try {
    for (const [edge, quality] of [
      [PHOTO_EDGE, 0.85],
      [1280, 0.75],
      [1024, 0.65],
    ] as const) {
      const size = fitWithin(picture.width, picture.height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const g = canvas.getContext("2d");
      if (!g || !size.width) throw new PhotoError("unreadable");
      g.fillStyle = "#fff"; // transparent PNGs become white paper, not black
      g.fillRect(0, 0, size.width, size.height);
      g.drawImage(picture.source, 0, 0, size.width, size.height);
      const url = canvas.toDataURL("image/jpeg", quality);
      if (!url.startsWith("data:image/jpeg")) throw new PhotoError("unreadable");
      if (url.length <= PHOTO_MAX_CHARS) return { url, mediaType: "image/jpeg" };
    }
    throw new PhotoError("tooBig");
  } finally {
    picture.done();
  }
}

/** Only the newest photo travels with each request; older ones stay on screen but aren't re-sent. */
export function keepNewestPhoto<M extends UIMessage>(messages: M[]): M[] {
  const newest = messages.findLastIndex((m) => m.parts.some((p) => p.type === "file"));
  return messages.map((m, i) => (i === newest || !m.parts.some((p) => p.type === "file") ? m : { ...m, parts: m.parts.filter((p) => p.type !== "file") }));
}
