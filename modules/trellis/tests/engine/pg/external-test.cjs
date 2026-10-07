'use strict';
// Native lifecycle controls. Never starts/stops a server, including on failure.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { main } = require('./cluster.cjs');
const { safePaths, externalCluster } = require('./paths.cjs');
const { owner, serverIdentity } = require('./harness.cjs');

async function run() {
  if (!externalCluster()) throw new Error('external-test requires PGHOST or KAIZENEDU_PG_URL');
  const paths = safePaths();
  if (fs.existsSync(paths.state)) throw new Error('finish the current run with down before lifecycle controls');
  const admin = await owner();
  const created = [];
  let receipt;
  const originalBin = process.env.E2_PG_BIN;
  process.env.E2_PG_BIN = '/nonexistent/no-server-tools-allowed';
  try {
    const server = await serverIdentity(admin);
    const started = (await admin.query('SELECT pg_postmaster_start_time() AS value')).rows[0].value;
    if (!(await admin.query("SELECT 1 FROM pg_namespace WHERE nspname='e2'")).rowCount) {
      await admin.query('CREATE SCHEMA e2'); created.push('schema');
    }
    if (!(await admin.query("SELECT 1 FROM pg_roles WHERE rolname='learner'")).rowCount) {
      await admin.query('CREATE ROLE learner NOLOGIN'); created.push('role');
    }
    const before = (await admin.query("SELECT 'e2'::regnamespace::oid AS schema, (SELECT oid FROM pg_roles WHERE rolname='learner') AS role")).rows[0];
    await main('up');
    receipt = fs.readFileSync(paths.state, 'utf8');
    const owned = JSON.parse(receipt);
    assert(!owned.created.some(o => o.name === 'e2' || o.name === 'learner'));
    await main('up');
    assert.equal(fs.readFileSync(paths.state, 'utf8'), receipt);
    const bad = structuredClone(owned); bad.identity.database += '_wrong_target';
    fs.writeFileSync(paths.state, JSON.stringify(bad));
    await assert.rejects(main('down'), /different server\/database\/owner/);
    fs.writeFileSync(paths.state, receipt);
    await main('down');
    assert(!fs.existsSync(paths.state));
    await main('down');
    const after = (await admin.query("SELECT 'e2'::regnamespace::oid AS schema, (SELECT oid FROM pg_roles WHERE rolname='learner') AS role")).rows[0];
    assert.deepEqual(after, before);
    for (const object of owned.created) {
      const result = await admin.query(object.kind === 'schema'
        ? 'SELECT oid FROM pg_namespace WHERE nspname=$1' : 'SELECT oid FROM pg_roles WHERE rolname=$1', [object.name]);
      assert.equal(result.rowCount, 0, object.name);
    }
    assert.deepEqual((await admin.query('SELECT pg_postmaster_start_time() AS value')).rows[0].value, started);
    console.log(JSON.stringify({ test: 'external_lifecycle', pass: true, server,
      existingObjectsBefore: before, existingObjectsAfter: after, createdObjectsRemoved: owned.created,
      repeatUp: 'same receipt', repeatDown: 'no-op', wrongTarget: 'refused',
      unavailableServerTools: process.env.E2_PG_BIN, postmasterStartUnchanged: started }));
  } finally {
    if (receipt && fs.existsSync(paths.state)) {
      fs.writeFileSync(paths.state, receipt);
      await main('down');
    }
    // These two objects belong to this test, outside the up/down receipt.
    try {
      if (created.includes('schema')) await admin.query('DROP SCHEMA e2');
      if (created.includes('role')) await admin.query('DROP ROLE learner');
    } finally {
      await admin.end();
      if (originalBin === undefined) delete process.env.E2_PG_BIN;
      else process.env.E2_PG_BIN = originalBin;
    }
  }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
