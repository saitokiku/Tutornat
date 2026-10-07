import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { setDbForTests, type Db } from "./client";
import * as schema from "./schema";

// For tests only: a fresh in-process Postgres with every migration applied, installed as the app's
// database. Each test file gets its own (call in beforeAll; `close` in afterAll).

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
