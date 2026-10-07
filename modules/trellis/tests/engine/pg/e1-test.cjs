// Adapter-specific controls, executed on the same local PostgreSQL fixture as
// e1-run.sh. The unchanged sixteen E1 cases are a separate invocation.
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { FixtureDb, T0 } = require('./e1-db.cjs');

async function main() {
  const db = new FixtureDb();
  const observations = { metadata: db.metadata };
  try {
    assert.match(db.metadata.database, /PostgreSQL 17\./);
    assert.equal(db.metadata.role, 'e1_fixture');
    db.raw.prepare('INSERT INTO accounts VALUES($account)').run({ $account: 'fixture-account' });
    const order = [];
    const first = db.transaction(async tx => {
      order.push('first');
      await tx.query("INSERT INTO accounts VALUES('tx-rolled-back')");
      await tx.query('SELECT 1/0');
    });
    const second = db.transaction(async tx => {
      order.push('second');
      await tx.query("INSERT INTO accounts VALUES('tx-committed')");
      return 'committed';
    });
    await assert.rejects(first, error => error.code === '22012');
    assert.equal(await second, 'committed');
    assert.deepEqual(order, ['first', 'second']);
    observations.transactions = (await db.query("SELECT id FROM accounts WHERE id LIKE 'tx-%' ORDER BY id")).rows;
    assert.deepEqual(observations.transactions, [{id:'tx-committed'}]);
    observations.namedBindings = db.raw.prepare('SELECT id FROM accounts WHERE id=$same OR id=$same').all({ $same: 'fixture-account' });
    assert.deepEqual(observations.namedBindings, [{ id: 'fixture-account' }]);
    assert.throws(() => db.raw.prepare('SELECT $missing').all({}), /Missing fixture binding/);
    observations.missingBinding = 'refused';

    const sql = 'INSERT INTO evidence_events(id, account_id, learner_id, session_id, type, assisted, payload) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)';
    await db.query(sql, ['e-first', 'fixture-account', 'fixture-learner', null, 'check_result', false, '{"skillId":"F1"}']);
    observations.nativeJson = (await db.query("SELECT payload->>'skillId' AS skill, bool_or(assisted) AS assisted, count(*)::int AS n FROM evidence_events GROUP BY payload->>'skillId'")).rows;
    assert.deepEqual(observations.nativeJson, [{ skill: 'F1', assisted: false, n: 1 }]);
    observations.clock = db.evidence()[0].ts;
    assert.equal(observations.clock, T0.toISOString());
    observations.denied = [];
    for (const query of ["UPDATE evidence_events SET type='forged'", 'DELETE FROM evidence_events']) {
      await assert.rejects(db.query(query), (error) => {
        observations.denied.push({ sql: query, code: error.code, message: error.message });
        return error.code === '55000';
      });
      assert.equal(db.evidence()[0].payload.skillId, 'F1');
      assert.equal(db.evidence()[0].type, 'check_result');
    }
    // Positive recovery after both failed writes, with the same timestamp.
    await db.query(sql, ['e-second', 'fixture-account', 'fixture-learner', null, 'hint', true, '{"skillId":"F2"}']);
    observations.sameTimestampOrder = db.evidence().map((row) => [row.id, row.ts]);
    assert.deepEqual(observations.sameTimestampOrder, [['e-first', T0.toISOString()], ['e-second', T0.toISOString()]]);
    // A forced namespace collision cannot make failed startup drop another fixture.
    const {Worker}=require('node:worker_threads');
    const collisionWorker=new Worker(path.join(__dirname,'e1-worker.cjs'),{execArgv:[]});
    const collisionBuffer=new SharedArrayBuffer(65536);const collisionState=new Int32Array(collisionBuffer,0,2);
    try {
      collisionWorker.postMessage({kind:'init',schema:db.metadata.schema,time:T0.toISOString(),buffer:collisionBuffer});
      assert.notEqual(Atomics.wait(collisionState,0,0,15000),'timed-out');
      const collision=JSON.parse(new TextDecoder().decode(new Uint8Array(collisionBuffer,8,Atomics.load(collisionState,1))));
      assert.equal(collision.error.code,'42P06');observations.schemaCollision=collision.error;
      assert.equal(db.evidence().length,2);assert.equal(db.evidence()[0].payload.skillId,'F1');
      observations.retainedAfterCollision=db.evidence().map(e=>({id:e.id,payload:e.payload}));
    } finally {await collisionWorker.terminate();}
    observations.observedEmpty=(await db.query('SELECT id FROM evidence_events WHERE false')).rows;
    assert.deepEqual(observations.observedEmpty,[]);
    observations.beforeClose = (await db.query('SELECT 1::int AS n')).rows;
    observations.schemaBeforeClose = (await db.query('SELECT to_regnamespace($1)::text AS schema', [db.metadata.schema])).rows[0].schema;
    assert.equal(observations.schemaBeforeClose, db.metadata.schema);
    db.close();
    await assert.rejects(db.query('SELECT 1::int AS n'), /fixture is closed/);
    observations.afterClose = 'refused';
    const admin = await require('./harness.cjs').owner();
    try {
      observations.schemaAfterClose = (await admin.query('SELECT to_regnamespace($1)::text AS schema', [db.metadata.schema])).rows[0].schema;
      assert.equal(observations.schemaAfterClose, null);
      // This child intentionally omits close(); beforeExit must clean it up.
      const adapterPath = path.join(__dirname, 'e1-db.cjs');
      const child = spawnSync(process.execPath, ['-e', `const {FixtureDb}=require(${JSON.stringify(adapterPath)}); const db=new FixtureDb(); console.log(db.metadata.schema);`], { encoding: 'utf8', timeout: 35_000 });
      assert.equal(child.status, 0, child.stderr);
      const childSchema = child.stdout.trim();
      assert.match(childSchema, /^e1_fixture_[0-9]+_[0-9]+_[0-9a-f]{16}$/);
      observations.schemaAfterNormalExit = (await admin.query('SELECT to_regnamespace($1)::text AS schema', [childSchema])).rows[0].schema;
      assert.equal(observations.schemaAfterNormalExit, null);
    } finally { await admin.end(); }
    console.log(JSON.stringify({ case: 'e1_adapter_native_controls', pass: true, observations }));
  } finally { db.close(); }
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
