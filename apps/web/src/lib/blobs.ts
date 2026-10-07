import { newId, read, subscribe, type StoreState } from "./store";

// Photos and PDFs that come with a school item, kept in this browser (IndexedDB) next to the store.
// Backend-shaped: when accounts move to a server these become uploads, and screens stay as they are.
// Where IndexedDB can't be opened (some private windows, tests) files live in memory for this page
// only, and the store says so (blobPersistence, StoredFile.where), so screens can tell the family.
// Files follow the store: when nothing points to a file any more (an item or a learner deleted,
// "delete everything on this device"), it is deleted too.

/** The most a kept file may weigh. Photos are shrunk before this is checked. */
export const BLOB_MAX_BYTES = 10 * 1024 * 1024;
/** Largest photo we try to shrink; anything bigger is turned away before decoding. */
export const IMAGE_INPUT_MAX_BYTES = 40 * 1024 * 1024;
/** Longest side of a kept photo, in pixels. */
export const IMAGE_MAX_SIDE = 1600;
export const INTAKE_ACCEPT = "image/*,application/pdf";

export type StoredFile = { id: string; name: string; type: string; size: number; at: number; blob: Blob; where: "device" | "memory" };
type Row = { id: string; name: string; type: string; size: number; at: number; data: ArrayBuffer };

export const DB_NAME = "kaizenedu.files";
const DB_VERSION = 2; // 2: an index on `at`, so pruning reads ids and ages, never the files themselves
const STORE = "files";
const BY_AGE = "at";
const memory = new Map<string, StoredFile>();
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const store = db.objectStoreNames.contains(STORE) ? req.transaction!.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: "id" });
        if (!store.indexNames.contains(BY_AGE)) store.createIndex(BY_AGE, "at");
      };
      req.onsuccess = () => {
        const db = req.result;
        // iOS Safari drops the connection when the app is backgrounded, and a newer page may upgrade the
        // database: forget this connection so the next call opens a fresh one.
        db.onclose = () => (opening = null);
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => {
        opening = null;
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
  return opening;
}

/**
 * Runs `fn` in one transaction and gives back what its getter returns once the transaction has
 * committed — a write that "succeeded" but was then aborted (storage full) counts as failed. null when
 * the database refuses. A connection closed under us is reopened once.
 */
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => () => T): Promise<{ value: T } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const db = await open();
    if (!db) return null;
    let tx: IDBTransaction;
    try {
      tx = db.transaction(STORE, mode);
    } catch {
      opening = null;
      continue;
    }
    return new Promise((resolve) => {
      try {
        const result = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve({ value: result() });
        tx.onabort = tx.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return null;
}

/** "device" when files survive closing the page; "memory" when they last only while it is open. */
export async function blobPersistence(): Promise<"device" | "memory"> {
  return (await open()) ? "device" : "memory";
}

/** Keeps a file and returns its id, or null when it is empty or over the cap. */
export async function putBlob(blob: Blob, name: string): Promise<string | null> {
  if (blob.size > BLOB_MAX_BYTES || blob.size === 0) return null;
  const file: StoredFile = { id: newId(), name: name.slice(0, 120), type: blob.type || "application/octet-stream", size: blob.size, at: Date.now(), blob, where: "memory" };
  // Stored as an ArrayBuffer: that works everywhere IndexedDB does (older Safari can't store Blobs).
  const data = (await open()) ? await blob.arrayBuffer().catch(() => null) : null;
  const row: Row | null = data && { id: file.id, name: file.name, type: file.type, size: file.size, at: file.at, data };
  const saved =
    row &&
    (await run("readwrite", (s) => {
      s.put(row);
      return () => true;
    }));
  // Not saved on the device: kept for this page, and getBlob says so ("memory").
  if (!saved) memory.set(file.id, file);
  return file.id;
}

export async function getBlob(id: string): Promise<StoredFile | null> {
  if (memory.has(id)) return memory.get(id)!;
  const got = await run("readonly", (s) => {
    const req = s.get(id) as IDBRequest<Row | undefined>;
    return () => req.result;
  });
  const r = got?.value;
  return r ? { id: r.id, name: r.name, type: r.type, size: r.size, at: r.at, blob: new Blob([r.data], { type: r.type }), where: "device" } : null;
}

export async function deleteBlob(id: string) {
  memory.delete(id);
  await run("readwrite", (s) => {
    s.delete(id);
    return () => true;
  });
}

const clearDevice = () =>
  run("readwrite", (s) => {
    s.clear();
    return () => true;
  });

/** Deletes every kept file (with "delete everything on this device"). */
export async function clearBlobs() {
  memory.clear();
  await clearDevice();
}

/**
 * Deletes files no school item points to any more (an item deleted in a tab that never loaded this
 * module, a save that never finished). Files younger than `graceMs` are left alone so a save in
 * another tab isn't undone. Reads only ids and ages, never the files.
 */
export async function pruneBlobs(keep: Iterable<string>, now = Date.now(), graceMs = 3600_000): Promise<number> {
  const live = new Set(keep);
  const old = (at: number) => now - at > graceMs;
  const gone = [...memory.values()].filter((f) => !live.has(f.id) && old(f.at)).map((f) => f.id);
  gone.forEach((id) => memory.delete(id));
  const deleted = await run("readwrite", (s) => {
    const ids: string[] = [];
    const req = s.index(BY_AGE).openKeyCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const id = String(c.primaryKey);
      if (!live.has(id) && old(Number(c.key))) {
        s.delete(id);
        ids.push(id);
      }
      c.continue();
    };
    return () => ids;
  });
  return gone.length + (deleted?.value.length ?? 0);
}

/** Every file a school item in the store points to. */
export const fileIds = (s: StoreState) => new Set(s.events.flatMap((e) => (e.attachment?.blobId ? [e.attachment.blobId] : [])));

let following = false;
/**
 * Files follow the store: a file the store stops pointing to is deleted, and when every account is
 * gone ("delete everything on this device") so is every file. Runs once per page, on import.
 */
export function followStore() {
  if (following || typeof window === "undefined") return;
  following = true;
  let before = fileIds(read());
  subscribe(() => {
    const s = read();
    const now = fileIds(s);
    if (!s.accounts.length && before.size) void clearBlobs();
    else for (const id of before) if (!now.has(id)) void deleteBlob(id);
    before = now;
  });
}

if (typeof window !== "undefined") {
  followStore();
  // Once per page load, off the critical path: files left behind by deletes made where this module wasn't
  // loaded. With no account left on this device ("delete everything" ran on a page without this module),
  // no file on it belongs to anyone, however new.
  setTimeout(() => {
    const s = read();
    void (s.accounts.length ? pruneBlobs(fileIds(s)) : clearDevice());
  }, 5000);
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
