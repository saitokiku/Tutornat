import { PGlite } from '@electric-sql/pglite';

import { setTutorDbForTests, wrapPool, type TutorDb } from '@/lib/tutor/db';

/** A fresh, provisioned product database on PGlite for one test file. */
export async function testDb(): Promise<TutorDb> {
  const pg = new PGlite();
  await pg.waitReady;
  const db = wrapPool({
    query: (text, params) => pg.query(text, params),
    async connect() {
      return { query: (text, params) => pg.query(text, params), release() {} };
    },
    end: () => pg.close(),
  });
  await setTutorDbForTests(db, true);
  return db;
}
