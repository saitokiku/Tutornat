'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { safePaths } = require('./paths.cjs');
const { gate } = require('./barriers.cjs');
const { connectionConfig } = require('./harness.cjs');
const { resolvePg } = require('./resolve-pg.cjs');

// Removing ancestor checks lets a fixture write through a symlink into its sibling.
test('path checks accept local directories and reject a symlink before writes', () => {
  const scratch = path.resolve(__dirname, '../../../.tmp');
  fs.mkdirSync(scratch, { recursive: true });
  const root = fs.mkdtempSync(path.join(scratch, 'pg-paths-'));
  try {
    fs.mkdirSync(path.join(root, 'tests/engine/pg'), { recursive: true });
    const target = path.join(root, 'owned-target');
    fs.mkdirSync(target);
    assert.equal(safePaths(root).data, path.join(root, 'tests/engine/pg/data'));
    fs.symlinkSync(target, path.join(root, 'tests/engine/pg/data'), 'dir');
    assert.throws(() => safePaths(root), /symlink/);
    assert.deepEqual(fs.readdirSync(target), []);
    fs.unlinkSync(path.join(root, 'tests/engine/pg/data'));
    fs.rmdirSync(path.join(root, 'tests/engine/pg'));
    fs.symlinkSync(target, path.join(root, 'tests/engine/pg'), 'dir');
    assert.throws(() => safePaths(root), /symlink/);
    assert.deepEqual(fs.readdirSync(target), []);
    console.log('paths: positive local path accepted; data/pg symlink rejected; owned target empty');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Dropping the release wait would let the first operation pass the held boundary.
test('gate records arrival while operation stays held, then permits recovery', async () => {
  const boundary = gate();
  let outcome = 'waiting';
  const operation = (async () => { await boundary.wait(); outcome = 'finished'; })();
  await boundary.entered;
  assert.equal(outcome, 'waiting');
  boundary.release();
  await operation;
  assert.equal(outcome, 'finished');
  await boundary.wait();
  console.log('gate: arrival observed; operation held; release and later recovery finished');
});

// Exercise environment selection without connecting or mutating a server.
test('connection target honors PG environment and URL while preserving capability logins', () => {
  const keys = Object.keys(process.env).filter(k => k.startsWith('PG') || k === 'KAIZENEDU_PG_URL');
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    for (const key of keys) delete process.env[key];
    const local = connectionConfig();
    assert.ok(path.isAbsolute(local.host));
    assert.equal(local.database, 'e2_contract');
    assert.equal(local.user, 'e2_owner');
    assert.equal(local.ssl, false);
    assert.throws(() => local.password(), /password authentication/);
    process.env.PGHOST = '127.0.0.1';
    process.env.PGPORT = '5433';
    process.env.PGDATABASE = 'synthetic_env';
    process.env.PGUSER = 'env_owner';
    const external = connectionConfig();
    assert.equal(external.host, '127.0.0.1');
    assert.equal(external.port, 5433);
    assert.equal(external.database, 'synthetic_env');
    assert.equal(external.user, 'env_owner');
    assert.equal(connectionConfig({ user: 'e2_h1_learner' }).user, 'e2_h1_learner');
    process.env.KAIZENEDU_PG_URL = 'postgresql://uri_owner@localhost:5434/synthetic_uri';
    const uri = connectionConfig({ user: 'e2_h1_tutor' });
    assert.equal(uri.host, 'localhost');
    assert.equal(uri.port, 5434);
    assert.equal(uri.database, 'synthetic_uri');
    assert.equal(uri.user, 'e2_h1_tutor');
    assert.equal(connectionConfig().user, 'uri_owner');
    delete process.env.KAIZENEDU_PG_URL;
    delete process.env.PGHOST;
    assert.throws(() => connectionConfig(), /inherited PG/);
  } finally {
    for (const key of Object.keys(process.env)) if (key.startsWith('PG') || key === 'KAIZENEDU_PG_URL') delete process.env[key];
    Object.assign(process.env, saved);
  }
});

// Moving the version check after require would execute mismatched cached code.
test('resolver accepts pinned cache and rejects a wrong version before module execution', () => {
  assert.equal(resolvePg().version, '8.23.0');
  const scratch = path.resolve(__dirname, '../../../.tmp');
  fs.mkdirSync(scratch, { recursive: true });
  const root = fs.mkdtempSync(path.join(scratch, 'pg-resolver-'));
  const original = process.env.E2_PG_MODULES;
  try {
    fs.mkdirSync(path.join(root, 'pg'));
    fs.writeFileSync(path.join(root, 'pg/package.json'), JSON.stringify({ name: 'pg', version: '0.0.0', main: 'index.cjs' }));
    fs.writeFileSync(path.join(root, 'pg/index.cjs'), "throw new Error('FORBIDDEN_MODULE_EXECUTED');\n");
    process.env.E2_PG_MODULES = root;
    assert.throws(() => resolvePg(), /does not match pinned/);
  } finally {
    if (original === undefined) delete process.env.E2_PG_MODULES;
    else process.env.E2_PG_MODULES = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
  assert.equal(resolvePg().version, '8.23.0');
  console.log('resolver: pinned cache loaded; wrong version rejected before module execution; recovery loaded');
});
