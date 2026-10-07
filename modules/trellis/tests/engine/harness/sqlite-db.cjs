// Thin local adapter: executes the closure's emitted SQL against node:sqlite.
// Dialect-only rewrites (PostgreSQL casts, now(), GREATEST); JSONB columns are
// decoded the way node-postgres would. This is NOT PostgreSQL: no row locks,
// roles, RLS or privilege behaviour is proven here (docs/first-build.md).
// Fixture tables mirror KaizenEdu lib/tutor/db/schema.ts for the tables the
// closure touches, including the append-only evidence triggers.
const { DatabaseSync } = require('node:sqlite');

const T0 = new Date('2026-01-01T12:00:00.000Z');
const HOUR = 3_600_000;
const at = (hours) => new Date(+T0 + hours * HOUR);

function sqliteSql(sql) {
  return sql
    .replace(/::(?:jsonb|timestamptz|text|int|bigint|numeric|double precision|float)/g, '')
    .replace(/\bpg_catalog\./g, '')
    .replace(/\bhas_(?:schema|table)_privilege\([^)]*\)/g, '1')
    .replace(/\bnow\(\)/gi, 'fixture_now()')
    .replace(/\bGREATEST\(/gi, 'max(')
    .replace(/\bbool_or\(/gi, 'max(')
    .replace(/SELECT pg_advisory_xact_lock\(.*\)/g, "SELECT 'fixture-no-lock' AS lock");
}

class FixtureDb {
  constructor() {
    this.raw = new DatabaseSync(':memory:');
    this.time = T0.toISOString();
    this.log = [];
    this.before = null;
    this.after = null;
    this.seq = 0;
    this.txQueue = Promise.resolve();
    this.raw.exec(`
      CREATE TABLE accounts(id TEXT PRIMARY KEY);
      CREATE TABLE learners(id TEXT PRIMARY KEY, account_id TEXT, age_band TEXT);
      CREATE TABLE sessions(id TEXT PRIMARY KEY, account_id TEXT, learner_id TEXT, started_at TEXT, ended_at TEXT,
        minutes INTEGER DEFAULT 0, mode TEXT DEFAULT 'text', cost_cents INTEGER DEFAULT 0, thumbs TEXT, phase TEXT,
        skill_id TEXT, coursework_id TEXT, summary TEXT, state TEXT);
      CREATE TABLE turns(id TEXT PRIMARY KEY, account_id TEXT, session_id TEXT, role TEXT, text TEXT, audio_ms INTEGER,
        latency_ms INTEGER, model TEXT, cost_cents INTEGER DEFAULT 0, client_turn_id TEXT, ts TEXT);
      CREATE TABLE skills(id TEXT PRIMARY KEY, name TEXT, prereqs TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', slice TEXT, ordinal INTEGER DEFAULT 0);
      CREATE TABLE check_items(id TEXT PRIMARY KEY, skill_id TEXT, type TEXT, stem TEXT, options TEXT, answer TEXT,
        representation TEXT, band TEXT, source TEXT, reviewed_by TEXT, reviewed_at TEXT);
      CREATE TABLE skill_mastery(account_id TEXT, learner_id TEXT, skill_id TEXT, estimate REAL, n_items INTEGER DEFAULT 0,
        n_sessions INTEGER DEFAULT 0, session_ids TEXT DEFAULT '[]', status TEXT, starting_estimate REAL, updated_at TEXT,
        last_seen_at TEXT, next_check_at TEXT, PRIMARY KEY(learner_id, skill_id));
      CREATE TABLE misconceptions(account_id TEXT, learner_id TEXT, tag TEXT, status TEXT, first_seen_at TEXT, resolved_at TEXT,
        clean_streak INTEGER, PRIMARY KEY(learner_id, tag));
      CREATE TABLE evidence_events(id TEXT PRIMARY KEY, account_id TEXT, learner_id TEXT, session_id TEXT, type TEXT,
        assisted INTEGER, payload TEXT, ts TEXT, seq INTEGER);
      CREATE TABLE attention_stats(session_id TEXT PRIMARY KEY, account_id TEXT, camera_enabled INTEGER DEFAULT 0,
        attending_pct REAL DEFAULT 0, drift_count INTEGER DEFAULT 0, away_count INTEGER DEFAULT 0, recoveries INTEGER DEFAULT 0);
      CREATE TRIGGER evidence_no_update BEFORE UPDATE ON evidence_events BEGIN SELECT RAISE(ABORT, 'evidence_events is append-only'); END;
      CREATE TRIGGER evidence_no_delete BEFORE DELETE ON evidence_events BEGIN SELECT RAISE(ABORT, 'evidence_events is append-only'); END;
    `);
    // E2 part B (issue #4), round 3: the ledger lives behind part C's e2.* SQL functions on
    // PostgreSQL. The fixture keeps only a read-only mirror of e2.skill_guards (empty: "no
    // exposure") so the practice route's eligibility read answers on E1's cases.
    this.raw.exec("ATTACH DATABASE ':memory:' AS e2");
    this.raw.exec(`
      CREATE TABLE e2.skill_guards(household_id TEXT NOT NULL, learner_id TEXT NOT NULL, skill_id TEXT NOT NULL,
        causal_seq INTEGER NOT NULL DEFAULT 0, exposure_seq INTEGER NOT NULL DEFAULT 0, last_exposure_at TEXT,
        PRIMARY KEY(household_id, learner_id, skill_id));
    `);
    // Round 4: the practice route first asks the catalog whether it may read that mirror
    // (lib/tutor/exposure/eligibility.ts seamVisible). Emulate just enough of pg_catalog for
    // that one probe: the two catalog rows and privilege functions that answer "yes".
    this.raw.exec(`
      CREATE TABLE pg_namespace(oid INTEGER PRIMARY KEY, nspname TEXT NOT NULL);
      CREATE TABLE pg_class(oid INTEGER PRIMARY KEY, relname TEXT NOT NULL, relnamespace INTEGER NOT NULL);
      INSERT INTO pg_namespace VALUES (1, 'e2');
      INSERT INTO pg_class VALUES (1, 'skill_guards', 1);
    `);
    // (The privilege functions are rewritten to `1` in sqliteSql: this runtime's node:sqlite has no
    // user-defined functions.)
  }

  seedSkills(skills) {
    const stmt = this.raw.prepare(
      'INSERT INTO skills(id, name, prereqs, tags, slice, ordinal) VALUES ($1, $2, $3, $4, $5, $6)',
    );
    for (const s of skills) {
      stmt.run({ $1: s.id, $2: s.name, $3: JSON.stringify(s.prereqs), $4: JSON.stringify(s.tags), $5: s.slice, $6: s.ordinal });
    }
  }

  async query(sql, params = []) {
    this.log.push({ sql, params });
    if (this.before) await this.before(sql, params);
    // E3 #13: the practice route registers and consumes its check on the seam
    // (`e2.queue_practice_check` / `e2.practice_check`, ADR-0066) instead of taking a lock.
    // Emulate the two functions' contract on the fixture: queue is idempotent per
    // (learner, session, check); practice_check consumes exactly once and then answers
    // NO_PENDING_CHECK. Consumption is immediate, not transactional: this single-connection
    // fixture serializes transactions, so no competing caller can observe an uncommitted consume.
    const seamCall = /^SELECT e2\.(queue_practice_check|practice_check)\(/.exec(sql.trim());
    if (seamCall) {
      this.practiceChecks ??= new Map();
      const [learner, skill, version, checkOrOp, session, payload] = params;
      const checkId = seamCall[1] === 'queue_practice_check' ? checkOrOp : JSON.parse(payload).checkId;
      const key = JSON.stringify([learner, session, checkId]);
      let value;
      if (seamCall[1] === 'queue_practice_check') {
        if (!this.practiceChecks.has(key)) this.practiceChecks.set(key, { id: 'fixture-check-' + this.practiceChecks.size, learner_id: learner, skill_id: skill, skill_version: version, check_id: checkId, session_id: session, consumed: false });
        value = this.practiceChecks.get(key);
      } else {
        const row = this.practiceChecks.get(key);
        if (!row || row.consumed) value = { ok: false, code: 'NO_PENDING_CHECK' };
        else { row.consumed = true; value = { ok: true, evidence: { practice_check_id: row.id, class: 'corrections-practice', qualifying: false, payload: JSON.parse(payload) } }; }
      }
      const rows = [{ value: JSON.stringify(value) }];
      if (this.after) await this.after(sql, params, rows);
      return { rows };
    }
    let translated = sqliteSql(sql).replace(/fixture_now\(\)/g, "'" + this.time + "'");
    if (/pg_advisory_xact_lock/.test(sql)) params = [];
    if (/INSERT INTO evidence_events/.test(sql)) {
      // Emulate the server defaults `ts TIMESTAMPTZ NOT NULL DEFAULT now()` and `seq bigserial`.
      this.seq += 1;
      translated = translated.replace('assisted, payload)', 'assisted, payload, ts, seq)').replace(/\$([57])\)/, (m, n) => `$${n}, $${Number(n) + 1}, $${Number(n) + 2})`);
      params = [...params, this.time, this.seq];
    }
    const stmt = this.raw.prepare(translated);
    const binds = Object.fromEntries(
      params.map((v, i) => ['$' + (i + 1), typeof v === 'boolean' ? Number(v) : v instanceof Date ? v.toISOString() : v]),
    );
    const rows = stmt.all(binds).map((r) => {
      const row = { ...r };
      for (const k of ['state', 'summary', 'options', 'answer', 'payload', 'session_ids', 'prereqs', 'tags']) {
        if (typeof row[k] === 'string') {
          try {
            row[k] = JSON.parse(row[k]);
          } catch {
            /* text column stays text */
          }
        }
      }
      return row;
    });
    if (this.after) await this.after(sql, params, rows);
    return { rows };
  }

  /**
   * E2: one connection, so transactions are serialized through a queue — the
   * fixture's stand-in for PostgreSQL's row and advisory locks. The callback's
   * `tx` is this same adapter (same hooks, same log). A throw rolls back.
   */
  transaction(fn) {
    const run = async () => {
      await this.query('BEGIN');
      try {
        const out = await fn(this);
        await this.query('COMMIT');
        return out;
      } catch (error) {
        await this.query('ROLLBACK');
        throw error;
      }
    };
    const next = this.txQueue.then(run, run);
    this.txQueue = next.catch(() => {});
    return next;
  }

  rows(sql, binds = {}) {
    return this.raw.prepare(sql).all(binds).map((r) => ({ ...r }));
  }
  evidence() {
    return this.rows('SELECT * FROM evidence_events ORDER BY rowid').map((r) => ({
      ...r,
      assisted: Boolean(r.assisted),
      payload: JSON.parse(r.payload),
    }));
  }
  results() {
    return this.evidence().filter((e) => e.type === 'check_result');
  }
  mastery() {
    return this.rows('SELECT * FROM skill_mastery ORDER BY skill_id');
  }
}

module.exports = { FixtureDb, T0, HOUR, at };
