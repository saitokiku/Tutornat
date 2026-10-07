import { newId } from "./store";

// Photos and PDFs that come with a school item, kept in this browser (IndexedDB) next to the store.
// Backend-shaped: when accounts move to a server these become uploads, and screens stay as they are.
// Where IndexedDB can't be opened (some private windows, tests) files live in memory for this page
// only, and blobPersistence() says so, so the screen can tell the family honestly.

/** The most a kept file may weigh. Photos are shrunk before this is checked. */
export const BLOB_MAX_BYTES = 10 * 1024 * 1024;
/** Largest photo we try to shrink; anything bigger is turned away before decoding. */
export const IMAGE_INPUT_MAX_BYTES = 40 * 1024 * 1024;
/** Longest side of a kept photo, in pixels. */
export const IMAGE_MAX_SIDE = 1600;
export const INTAKE_ACCEPT = "image/*,application/pdf";

export type StoredFile = { id: string; name: string; type: string; size: number; at: number; blob: Blob };
type Row = { id: string; name: string; type: string; size: number; at: number; data: ArrayBuffer };

const DB_NAME = "kaizenedu.files";
const STORE = "files";
const memory = new Map<string, StoredFile>();
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

/** Runs one request in its own transaction; null when the database refuses. */
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<{ ok: true; value: T } | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve({ ok: true, value: req.result });
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** "device" when files survive closing the page; "memory" when they last only while it is open. */
export async function blobPersistence(): Promise<"device" | "memory"> {
  return (await open()) ? "device" : "memory";
}

/** Keeps a file and returns its id, or null when it is empty or over the cap. */
export async function putBlob(blob: Blob, name: string): Promise<string | null> {
  if (blob.size > BLOB_MAX_BYTES || blob.size === 0) return null;
  const file: StoredFile = { id: newId(), name: name.slice(0, 120), type: blob.type || "application/octet-stream", size: blob.size, at: Date.now(), blob };
  // Stored as an ArrayBuffer: that works everywhere IndexedDB does (older Safari can't store Blobs).
  const db = await open();
  const data = db ? await blob.arrayBuffer().catch(() => null) : null;
  const saved = data && (await run("readwrite", (s) => s.put({ id: file.id, name: file.name, type: file.type, size: file.size, at: file.at, data } satisfies Row)));
  if (!saved) memory.set(file.id, file);
  return file.id;
}

export async function getBlob(id: string): Promise<StoredFile | null> {
  if (memory.has(id)) return memory.get(id)!;
  const got = await run<Row | undefined>("readonly", (s) => s.get(id));
  const r = got?.value;
  return r ? { id: r.id, name: r.name, type: r.type, size: r.size, at: r.at, blob: new Blob([r.data], { type: r.type }) } : null;
}

export async function deleteBlob(id: string) {
  memory.delete(id);
  await run("readwrite", (s) => s.delete(id));
}

/** Deletes every kept file (used with "delete everything on this device"). */
export async function clearBlobs() {
  memory.clear();
  await run("readwrite", (s) => s.clear());
}

/**
 * Deletes files no school item points to any more (an item deleted elsewhere, a learner removed, the
 * store cleared). Files younger than `graceMs` are left alone so a save in another tab isn't undone.
 */
export async function pruneBlobs(keep: Iterable<string>, now = Date.now(), graceMs = 3600_000): Promise<number> {
  const live = new Set(keep);
  const old = (at: number) => now - at > graceMs;
  const gone = [...memory.values()].filter((f) => !live.has(f.id) && old(f.at)).map((f) => f.id);
  const all = await run<Row[]>("readonly", (s) => s.getAll());
  for (const r of all?.value ?? []) if (!live.has(r.id) && old(r.at)) gone.push(r.id);
  for (const id of gone) await deleteBlob(id);
  return gone.length;
}

/** Width and height that fit inside `max` on the longest side, keeping the shape. Never enlarges. */
export function fitWithin(width: number, height: number, max = IMAGE_MAX_SIDE): { width: number; height: number } {
  const side = Math.max(width, height);
  if (side <= max) return { width, height };
  const k = max / side;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export type FileProblem = "type" | "size" | "read";

/** What's wrong with a file before reading it, if anything. */
export function checkFile(f: { type: string; size: number }): FileProblem | null {
  const image = f.type.startsWith("image/");
  if (!image && f.type !== "application/pdf") return "type";
  if (f.size === 0) return "read";
  if (f.size > (image ? IMAGE_INPUT_MAX_BYTES : BLOB_MAX_BYTES)) return "size";
  return null;
}

const jpegName = (name: string) => `${name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;

/**
 * A file ready to keep: photos are redrawn as a JPEG at most 1600 px on the long side (which also
 * drops the camera's location and other metadata); PDFs are kept as they are.
 */
export async function prepareFile(file: File): Promise<{ blob: Blob; name: string } | { error: FileProblem }> {
  const problem = checkFile(file);
  if (problem) return { error: problem };
  if (file.type === "application/pdf") return { blob: file, name: file.name };
  try {
    const blob = await shrink(file);
    if (!blob || blob.size > BLOB_MAX_BYTES) return { error: blob ? "size" : "read" };
    return { blob, name: jpegName(file.name) };
  } catch {
    return { error: "read" };
  }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
  } catch {
    // Older browsers lack createImageBitmap (or its options); an <img> decodes the same photo, upright.
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode().catch((e) => {
    URL.revokeObjectURL(url);
    throw e;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}

async function shrink(file: Blob): Promise<Blob | null> {
  const img = await decode(file);
  try {
    const size = fitWithin(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // A transparent PNG would turn black as a JPEG; paper-white keeps a worksheet readable.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(img.source, 0, 0, size.width, size.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } finally {
    img.done();
  }
}

/** The file as a data: URL, for sending to the AI reader. */
export function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
