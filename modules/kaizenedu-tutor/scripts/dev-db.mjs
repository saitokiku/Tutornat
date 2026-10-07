#!/usr/bin/env node
/**
 * A local Postgres for the product, with nothing to install: PGlite behind a
 * socket server, speaking the wire protocol `pg` already uses. `pnpm dev:db`
 * in one terminal, the printed DATABASE_URL in the other, and sign-up,
 * sessions and progress run on this machine without a Neon project. The
 * schema provisions itself on first use, exactly as it does on the host.
 *
 * In-memory: the data lives for the life of this process. That is the point
 * for a dogfood run or a screenshot pass, and it means a real learner's data
 * can never end up on a laptop by accident.
 *
 * Usage: pnpm dev:db            (DEV_DB_PORT to pick another port)
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const host = '127.0.0.1';
const port = Number(process.env.DEV_DB_PORT ?? 54329);

const db = await PGlite.create();
// PGlite runs one query at a time; the server queues queries from many
// sockets onto it. `maxConnections` has to be set for that queue to accept a
// second socket at all, and the product's pool opens up to four.
const server = new PGLiteSocketServer({ db, host, port, maxConnections: 16, idleTimeout: 0 });
await server.start();

console.log(`[dev-db] PGlite listening on ${host}:${port} (in memory; gone when this exits)`);
console.log(`[dev-db] export DATABASE_URL=postgres://postgres:postgres@${host}:${port}/postgres`);

async function stop() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
