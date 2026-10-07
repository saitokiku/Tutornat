const { parentPort } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');

let client;
let schema;
let createdSchema=false;
let connectionError;

async function handle(message) {
  if (message.kind === 'init') {
    const { connectionConfig } = require('./harness.cjs');
    const { pg, version: driverVersion } = require('./resolve-pg.cjs').resolvePg();
    // Raw helpers return the JSON text E1's fixture API expects. query() decodes
    // those same columns before returning them to the TypeScript services.
    const types = { getTypeParser(oid, format) {
      if (oid === 114 || oid === 3802) return (text) => text;
      if (oid === 1184) return (text) => ['infinity', '-infinity'].includes(text) ? text : new Date(text).toISOString();
      return pg.types.getTypeParser(oid, format);
    } };
    const config = connectionConfig();
    // Only the outer E1 preload sets this for its own unpacked child suite. The
    // database/user/port remain the harness's fixed synthetic fixture settings.
    if (process.env.E1_PG_FIXTURE_SOCKET && !require('./paths.cjs').externalCluster()) {
      const socket = process.env.E1_PG_FIXTURE_SOCKET;
      if (!path.isAbsolute(socket) || !socket.endsWith('/tests/engine/pg/socket')) throw new Error('E1 fixture requires an absolute local fixture socket path');
      const resolvedSocket = fs.realpathSync(socket);
      if (resolvedSocket !== socket || !fs.statSync(socket).isDirectory()) throw new Error('E1 fixture socket must be a real directory, not a symlink');
      config.host = resolvedSocket;
    }
    client = new pg.Client({ ...config, types });
    client.on('error', (error) => { connectionError = error; });
    await client.connect();
    const version = await client.query('SHOW server_version_num');
    if (Math.floor(Number(version.rows[0].server_version_num) / 10000) !== 17) throw new Error('E1 adapter requires PostgreSQL 17');
    try {
      await client.query('CREATE ROLE e1_fixture NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
    } catch (error) { if (error.code !== '42710') throw error; }
    schema = message.schema;
    if (!/^e1_fixture_[0-9]+_[0-9]+_[0-9a-f]{16}$/.test(schema)) throw new Error('Invalid E1 fixture schema');
    await client.query(`CREATE SCHEMA ${schema} AUTHORIZATION e1_fixture`);
    createdSchema=true;
    await client.query(`SET search_path TO ${schema}, pg_catalog`);
    await client.query('SET ROLE e1_fixture');
    await client.query("SELECT set_config('e1.fixture_time', $1, false)", [message.time]);
    await client.query(fs.readFileSync(path.join(__dirname, 'e1-schema.sql'), 'utf8'));
    const metadata = await client.query('SELECT version() AS database, current_user AS role, session_user AS connection_role, current_schema() AS schema');
    return { ...metadata.rows[0], adapter: 'pg', pgVersion: driverVersion };
  }
  if (message.kind === 'close') {
    if (client) {
      try { if (createdSchema) await client.query(`DROP SCHEMA ${schema} CASCADE`); }
      finally { await client.end(); }
    }
    return { closed: true };
  }
  if (message.kind !== 'query') throw new Error('Unknown E1 worker operation');
  if (connectionError) throw connectionError;
  // ROLLBACK must reach PostgreSQL even when the transaction is aborted.
  if (!/^\s*(?:ROLLBACK|COMMIT)\b/i.test(message.sql)) {
    await client.query("SELECT set_config('e1.fixture_time', $1, false)", [message.time]);
  }
  // Only the deterministic fixture clock differs; all native PostgreSQL SQL
  // casts, JSON operators and aggregates emitted by the closure are retained.
  const sql = message.sql.replace(/\bnow\(\)/gi, 'fixture_now()');
  const result = await client.query(sql, message.params);
  const parts = Array.isArray(result) ? result : [result];
  return { rows: parts.flatMap((part) => part.rows), rowCount: parts.reduce((total, part) => total + (part.rowCount ?? 0), 0) };
}

parentPort.on('message', async (message) => {
  let response;
  try { response = { value: await handle(message) }; }
  catch (error) {
    response = { error: { name: error.name, message: error.message, code: error.code, detail: error.detail } };
    if (message.kind === 'init' && client) {
      try { if (createdSchema) await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } catch {}
      try { await client.end(); } catch {}
    }
  }
  const state = new Int32Array(message.buffer, 0, 2);
  const bytes = new Uint8Array(message.buffer, 8);
  let encoded = new TextEncoder().encode(JSON.stringify(response));
  if (encoded.length > bytes.length) encoded = new TextEncoder().encode(JSON.stringify({ error: { name: 'RangeError', message: 'E1 fixture result exceeds 8 MiB bridge capacity' } }));
  bytes.set(encoded);
  Atomics.store(state, 1, encoded.length);
  Atomics.store(state, 0, 1);
  Atomics.notify(state, 0);
});
