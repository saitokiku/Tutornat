import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { vi } from "vitest";
import { setDbForTests, type Db } from "./client";
import * as schema from "./schema";

// For tests only: a fresh in-process Postgres with every migration applied, installed as the app's
// database. Each test file gets its own (call in beforeAll; `close` in afterAll).

// Files that import this run real scrypt hashes against a real (WASM) Postgres: on a busy machine
// they need more than a unit test's five seconds. Applies to the importing file only.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

export async function testDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = await PGlite.create();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  setDbForTests(db as unknown as Db);
  return {
    db: db as unknown as Db,
    close: async () => {
      setDbForTests(null);
      await client.close();
    },
  };
}
