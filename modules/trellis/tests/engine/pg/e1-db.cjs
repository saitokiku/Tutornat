// The asynchronous Queryable surface stays the same as lib/tutor/db/index.ts.
// E1's raw fixture setup/read helpers are synchronous, so a worker owns the pg
// connection while this thread waits for those helpers. No SQLite is loaded.
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const crypto = require('node:crypto');

const T0 = new Date('2026-01-01T12:00:00.000Z');
const HOUR = 3_600_000;
const at = (hours) => new Date(+T0 + hours * HOUR);
const JSON_COLUMNS = new Set(['state', 'summary', 'options', 'answer', 'payload', 'session_ids', 'prereqs', 'tags']);
const fixtures = new Set();
let sequence = 0;

function namedParams(sql, binds = {}) {
  const names = [];
  const text = sql.replace(/\$([a-zA-Z_][a-zA-Z_0-9]*|[0-9]+)/g, (name) => {
    if (!Object.hasOwn(binds, name)) throw new Error('Missing fixture binding: ' + name);
    if (!names.includes(name)) names.push(name);
    return '$' + (names.indexOf(name) + 1);
  });
  return { sql: text, params: names.map((name) => binds[name]) };
}

class FixtureDb {
  constructor() {
    this.time = T0.toISOString();
    this.log = [];
    this.before = null;
    this.after = null;
    this.closed = false;
    this.buffer = new SharedArrayBuffer(8 * 1024 * 1024);
    this.state = new Int32Array(this.buffer, 0, 2);
    this.bytes = new Uint8Array(this.buffer, 8);
    // Do not inherit --require e1-preload.cjs: it would recursively initialize
    // fixtures inside the worker before the worker's RPC listener exists.
    this.worker = new Worker(path.join(__dirname, 'e1-worker.cjs'), { execArgv: [] });
    // Main's synchronous closeAll hook drops fixture schemas before normal exit.
    this.worker.unref();
    this.worker.on('error', (error) => { this.workerError = error; });
    try {
      this.metadata = this.rpc({ kind: 'init', schema: 'e1_fixture_' + process.pid + '_' + (++sequence) + '_' + crypto.randomBytes(8).toString('hex') });
    } catch (error) {
      this.worker.terminate();
      throw error;
    }
    fixtures.add(this);
    this.raw = {
      exec: (sql) => this.execute(sql, []),
      prepare: (sql) => ({
        run: (binds = {}) => { const q = namedParams(sql, binds); return this.execute(q.sql, q.params); },
        all: (binds = {}) => { const q = namedParams(sql, binds); return this.execute(q.sql, q.params).rows; },
      }),
    };
  }

  rpc(message) {
    if (this.closed) throw new Error('E1 PostgreSQL fixture is closed');
    if (this.workerError) throw this.workerError;
    Atomics.store(this.state, 0, 0);
    this.worker.postMessage({ ...message, buffer: this.buffer, time: this.time });
    const result = Atomics.wait(this.state, 0, 0, 30_000);
    if (result === 'timed-out') {
      this.closed = true;
      this.worker.terminate();
      throw new Error('E1 PostgreSQL worker timed out after 30000ms');
    }
    const response = JSON.parse(new TextDecoder().decode(this.bytes.subarray(0, Atomics.load(this.state, 1))));
    if (response.error) {
      const error = new Error(response.error.message);
      Object.assign(error, response.error);
      throw error;
    }
    return response.value;
  }

  execute(sql, params) {
    return this.rpc({ kind: 'query', sql, params });
  }

  seedSkills(skills) {
    const stmt = this.raw.prepare('INSERT INTO skills(id, name, prereqs, tags, slice, ordinal) VALUES ($1, $2, $3, $4, $5, $6)');
    for (const s of skills) stmt.run({ $1: s.id, $2: s.name, $3: JSON.stringify(s.prereqs), $4: JSON.stringify(s.tags), $5: s.slice, $6: s.ordinal });
  }

  async query(sql, params = []) {
    this.log.push({ sql, params });
    if (this.before) await this.before(sql, params);
    const result = this.execute(sql, params);
    const rows = result.rows.map((raw) => {
      const row = { ...raw };
      for (const key of JSON_COLUMNS) if (typeof row[key] === 'string') row[key] = JSON.parse(row[key]);
      return row;
    });
    if (this.after) await this.after(sql, params, rows);
    return { rows };
  }

  transaction(fn) {
    const run = async () => {
      await this.query('BEGIN');
      try {
        const value = await fn(this);
        await this.query('COMMIT');
        return value;
      } catch (error) {
        try { await this.query('ROLLBACK'); }
        catch (rollbackError) { error.rollbackError = rollbackError; }
        throw error;
      }
    };
    const next = (this.txQueue ??= Promise.resolve()).then(run, run);
    this.txQueue = next.catch(() => {});
    return next;
  }

  rows(sql, binds = {}) { return this.raw.prepare(sql).all(binds); }
  evidence() {
    return this.rows('SELECT * FROM evidence_events ORDER BY fixture_order').map(({ fixture_order, ...row }) => ({
      ...row, assisted: Boolean(row.assisted), payload: JSON.parse(row.payload),
    }));
  }
  results() { return this.evidence().filter((row) => row.type === 'check_result'); }
  mastery() { return this.rows('SELECT * FROM skill_mastery ORDER BY skill_id'); }
  close() {
    if (this.closed) return;
    try { this.rpc({ kind: 'close' }); }
    finally { this.closed = true; fixtures.delete(this); this.worker.terminate(); }
  }
}

function closeAll() { for (const fixture of fixtures) fixture.close(); }
process.once('beforeExit', closeAll);

module.exports = { FixtureDb, T0, HOUR, at, closeAll, namedParams };
