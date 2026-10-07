import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// The family database. DATABASE_URL turns server mode on:
//   postgres://… or postgresql://…   a real Postgres (Neon's pooled endpoint in production)
//   pglite:./.pglite                 Postgres in-process, kept in that folder (local development)
//   pglite:memory                    in-process and thrown away when the server stops
// Without it the app runs browser-only, exactly as before, and nothing here is touched.
//
// Pending migrations (apps/web/drizzle) are applied on first use, under an advisory lock so two
// cold-starting instances never apply the same one twice. A deploy can also run them ahead of time
// with `npx drizzle-kit migrate --config drizzle/drizzle.config.ts`.

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Rows of a raw `db.execute(sql…)`: both drivers answer `{ rows }`. */
export const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;

type State = { db?: Promise<Db>; test?: Db | null };
const KEY = Symbol.for("kaizenedu.db");
const state = ((globalThis as Record<symbol, unknown>)[KEY] ??= {}) as State;

export class NoDatabase extends Error {
  constructor() {
    super("DATABASE_URL is not set: KaizenEDU is running browser-only.");
  }
}

export const databaseUrl = () => process.env.DATABASE_URL?.trim() || null;

/** True when this deployment keeps families on the server. */
export const serverMode = () => Boolean(state.test) || Boolean(databaseUrl());

export function getDb(): Promise<Db> {
  if (state.test) return Promise.resolve(state.test);
  const url = databaseUrl();
  if (!url) return Promise.reject(new NoDatabase());
  state.db ??= open(url).catch((e) => {
    state.db = undefined;
    throw e;
  });
  return state.db;
}

/** Tests hand in a pglite-backed database (see testing.ts); null goes back to DATABASE_URL. */
export function setDbForTests(db: Db | null) {
  state.test = db;
}

const MIGRATIONS = path.join(process.cwd(), "drizzle");
const MIGRATION_LOCK = 7_262_001;

async function open(url: string): Promise<Db> {
  if (url.startsWith("pglite:")) {
    const where = url.slice("pglite:".length);
    // Loaded at runtime, not bundled: pglite is a development convenience and ships its own WASM.
    const { PGlite } = (await import(/* webpackIgnore: true */ "@electric-sql/pglite")) as typeof import("@electric-sql/pglite");
    const { drizzle } = (await import(/* webpackIgnore: true */ "drizzle-orm/pglite")) as typeof import("drizzle-orm/pglite");
    const { migrate } = (await import(/* webpackIgnore: true */ "drizzle-orm/pglite/migrator")) as typeof import("drizzle-orm/pglite/migrator");
    const client = await PGlite.create(where && where !== "memory" ? where : undefined);
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: url, max: Number(process.env.KAIZEN_DB_POOL ?? 5) });
  if (existsSync(path.join(MIGRATIONS, "meta", "_journal.json"))) {
    // One connection for the whole run, so the session-level lock covers every statement.
    const conn = await pool.connect();
    try {
      await conn.query("select pg_advisory_lock($1)", [MIGRATION_LOCK]);
      await migrate(drizzle(conn, { schema }), { migrationsFolder: MIGRATIONS });
    } finally {
      await conn.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => {});
      conn.release();
    }
  } else {
    console.warn("[db] migrations folder not deployed; expecting `drizzle-kit migrate` to have run");
  }
  return drizzle(pool, { schema }) as unknown as Db;
}
