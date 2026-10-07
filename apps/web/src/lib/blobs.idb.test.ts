import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The device path of lib/blobs.ts against a small IndexedDB stand-in (jsdom has none). It behaves like
// the real thing where the store depends on it: requests run in order, a transaction commits after its
// last request (or aborts and keeps nothing), a closed connection refuses new transactions, and a
// version upgrade runs before the open succeeds.

type Row = Record<string, unknown> & { id: string };
type Store = { rows: Map<string, Row>; indexes: Map<string, string> };
type Db = { version: number; stores: Map<string, Store> };

class Req<T = unknown> {
  result!: T;
  error: unknown = null;
  transaction: unknown = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  onblocked: (() => void) | null = null;
}

function fakeIndexedDB() {
  const dbs = new Map<string, Db>();
  const stats = { valueReads: 0, abortNextWrite: false };
  const open: { close: () => void }[] = [];

  function connection(db: Db) {
    let closed = false;
    const conn = {
      onclose: null as (() => void) | null,
      onversionchange: null as (() => void) | null,
      objectStoreNames: { contains: (n: string) => db.stores.has(n) },
      createObjectStore(name: string) {
        const store: Store = { rows: new Map(), indexes: new Map() };
        db.stores.set(name, store);
        return storeApi(store, null);
      },
      close: () => void (closed = true),
      /** What iOS Safari does to a backgrounded page. */
      drop() {
        closed = true;
        conn.onclose?.();
      },
      transaction(name: string, mode: IDBTransactionMode) {
        if (closed) throw new DOMException("The database connection is closing.", "InvalidStateError");
        return transaction(db.stores.get(name)!, mode);
      },
    };
    open.push(conn);
    return conn;
  }

  function transaction(store: Store, mode: IDBTransactionMode) {
    const queue: (() => void)[] = [];
    const staged: (() => void)[] = [];
    let aborted = false;
    const tx = { oncomplete: null as (() => void) | null, onabort: null as (() => void) | null, onerror: null as (() => void) | null, objectStore: () => api };
    const pump = () =>
      setTimeout(() => {
        const task = queue.shift();
        if (task) return (task(), pump());
        if (aborted) tx.onabort?.();
        else {
          staged.forEach((f) => f());
          tx.oncomplete?.();
        }
      }, 0);
    const api = storeApi(store, { queue, staged, mode, abort: () => (aborted = true) });
    pump();
    return tx;
  }

  type TxCtx = { queue: (() => void)[]; staged: (() => void)[]; mode: IDBTransactionMode; abort: () => void };
  function storeApi(store: Store, ctx: TxCtx | null) {
    const op = <T,>(run: () => T) => {
      const req = new Req<T>();
      ctx!.queue.push(() => {
        req.result = run();
        req.onsuccess?.();
      });
      return req;
    };
    const write = (change: () => void) => {
      if (ctx!.mode !== "readwrite") throw new DOMException("read-only", "ReadOnlyError");
      return op(() => {
        ctx!.staged.push(change);
        // Storage full: the request "succeeds", then the transaction aborts.
        if (stats.abortNextWrite) {
          stats.abortNextWrite = false;
          ctx!.abort();
        }
        return undefined;
      });
    };
    return {
      indexNames: { contains: (n: string) => store.indexes.has(n) },
      createIndex: (name: string, keyPath: string) => void store.indexes.set(name, keyPath),
      put: (row: Row) => write(() => store.rows.set(row.id, structuredClone(row))),
      delete: (id: string) => write(() => store.rows.delete(id)),
      clear: () => write(() => store.rows.clear()),
      get: (id: string) =>
        op(() => {
          stats.valueReads++;
          return store.rows.get(id);
        }),
      index(name: string) {
        const keyPath = store.indexes.get(name);
        if (!keyPath) throw new DOMException("no index", "NotFoundError");
        return {
          openKeyCursor() {
            const keys = [...store.rows.values()].map((r) => ({ key: r[keyPath], primaryKey: r.id })).sort((a, b) => Number(a.key) - Number(b.key));
            const req = new Req<unknown>();
            let i = 0;
            const step = () => {
              const k = keys[i++];
              req.result = k ? { ...k, continue: () => ctx!.queue.push(step) } : null;
              req.onsuccess?.();
            };
            ctx!.queue.push(step);
            return req;
          },
        };
      },
    };
  }

  const indexedDB = {
    open(name: string, version: number) {
      const req = new Req<ReturnType<typeof connection>>();
      setTimeout(() => {
        const db = dbs.get(name) ?? { version: 0, stores: new Map() };
        dbs.set(name, db);
        req.result = connection(db);
        if (version > db.version) {
          req.transaction = { objectStore: (n: string) => storeApi(db.stores.get(n)!, null) };
          db.version = version;
          req.onupgradeneeded?.();
        }
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };
  return { indexedDB, dbs, stats, open };
}

let fake: ReturnType<typeof fakeIndexedDB>;
const load = async () => {
  vi.resetModules();
  return import("./blobs");
};
const pdf = (text = "%PDF-1.4 worksheet") => new Blob([text], { type: "application/pdf" });

beforeEach(() => {
  fake = fakeIndexedDB();
  vi.stubGlobal("indexedDB", fake.indexedDB);
});
afterEach(() => vi.unstubAllGlobals());

describe("file store on the device (IndexedDB)", () => {
  it("keeps a file across page loads and says it's on the device", async () => {
    const first = await load();
    expect(await first.blobPersistence()).toBe("device");
    const id = (await first.putBlob(pdf(), "sheet.pdf"))!;
    const again = await load(); // a reload: nothing in memory, a new connection
    const got = await again.getBlob(id);
    expect(got).toMatchObject({ id, name: "sheet.pdf", type: "application/pdf", size: 18, where: "device" });
    expect(await got!.blob.text()).toBe("%PDF-1.4 worksheet");
  });

  it("a write the browser aborts after it 'succeeded' (storage full) is kept in memory and says so", async () => {
    const b = await load();
    fake.stats.abortNextWrite = true;
    const id = (await b.putBlob(pdf(), "big.pdf"))!;
    expect(fake.dbs.get(b.DB_NAME)!.stores.get("files")!.rows.size).toBe(0);
    expect(await b.getBlob(id)).toMatchObject({ name: "big.pdf", where: "memory" });
  });

  it("opens a fresh connection when the old one was dropped (iOS Safari in the background)", async () => {
    const b = await load();
    await b.putBlob(pdf(), "a.pdf");
    (fake.open.at(-1) as unknown as { drop: () => void }).drop();
    const id = (await b.putBlob(pdf(), "b.pdf"))!;
    expect((await b.getBlob(id))?.where).toBe("device");
    expect(fake.open).toHaveLength(2);
  });

  it("prunes by id and age without reading any file, and leaves new and kept ones", async () => {
    const b = await load();
    const kept = (await b.putBlob(pdf(), "kept.pdf"))!;
    const orphan = (await b.putBlob(pdf(), "orphan.pdf"))!;
    fake.stats.valueReads = 0;
    expect(await b.pruneBlobs([kept])).toBe(0); // younger than the grace period
    expect(await b.pruneBlobs([kept], Date.now() + 2 * 3600_000)).toBe(1);
    expect(fake.stats.valueReads).toBe(0);
    expect(await b.getBlob(orphan)).toBeNull();
    expect(await b.getBlob(kept)).not.toBeNull();
  });

  it("upgrades a version-1 database in place, keeping its files", async () => {
    fake.dbs.set("kaizenedu.files", {
      version: 1,
      stores: new Map([["files", { rows: new Map([["old", { id: "old", name: "old.pdf", type: "application/pdf", size: 4, at: 1, data: new ArrayBuffer(4) }]]), indexes: new Map() }]]),
    });
    const b = await load();
    expect((await b.getBlob("old"))?.name).toBe("old.pdf");
    expect(fake.dbs.get("kaizenedu.files")!.stores.get("files")!.indexes.has("at")).toBe(true);
    expect(await b.pruneBlobs([])).toBe(1);
  });

  it("files follow the store: a removed item's file goes, and 'delete everything' takes every file", async () => {
    const b = await load();
    const store = await import("./store");
    const a = (await b.putBlob(pdf(), "a.pdf"))!;
    const c = (await b.putBlob(pdf(), "c.pdf"))!;
    const stray = (await b.putBlob(pdf(), "stray.pdf"))!; // a save that never finished
    store.update((s) => {
      s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 });
      s.events.push(
        { id: "e1", profileId: "p1", title: "A", kind: "homework", date: "2026-10-09", skillIds: [], source: "typed", createdAt: 0, attachment: { blobId: a } },
        { id: "e2", profileId: "p2", title: "C", kind: "homework", date: "2026-10-09", skillIds: [], source: "typed", createdAt: 0, attachment: { blobId: c } },
      );
    });
    // Removing a learner (here: their items) outside lib/school.ts.
    store.update((s) => void (s.events = s.events.filter((e) => e.profileId !== "p1")));
    await vi.waitFor(async () => expect(await b.getBlob(a)).toBeNull());
    expect(await b.getBlob(c)).not.toBeNull();
    store.clearAll();
    await vi.waitFor(async () => expect(await b.getBlob(c)).toBeNull());
    expect(await b.getBlob(stray)).toBeNull();
  });
});
