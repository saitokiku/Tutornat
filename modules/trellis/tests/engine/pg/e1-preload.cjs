// Load with node --require ./tests/engine/pg/e1-preload.cjs tests/engine/run.cjs.
// The suite, its assertions, and its emitted SQL are unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const Module = require('node:module');

// Cross-head proofs load this adapter against an untouched scratch checkout.
const root = process.env.E1_PG_SUITE_ROOT
  ? fs.realpathSync(process.env.E1_PG_SUITE_ROOT)
  : path.resolve(__dirname, '../../..');
if (process.env.E1_PG_RESULT_PATH) {
  const writeFileSync = fs.writeFileSync;
  fs.writeFileSync = function(file, ...args) {
    if (typeof file === 'string' && path.dirname(file) === path.join(root, 'tests/engine/evidence') && /^results-.*\.json$/.test(path.basename(file))) {
      file = process.env.E1_PG_RESULT_PATH;
    }
    return writeFileSync.call(this, file, ...args);
  };
}

const fixturePath = require.resolve(path.join(root, 'tests/engine/harness/sqlite-db.cjs'));
const fixtureModule = new Module(fixturePath);
const adapter = require('./e1-db.cjs');
fixtureModule.exports = adapter;
fixtureModule.loaded = true;
require.cache[fixturePath] = fixtureModule;

// c0_package_inputs launches the unchanged suite in its unpacked archive. Give
// that child its own packed adapter, so this case also executes through pg.
const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = function (command, args, options) {
  if (command === process.execPath && Array.isArray(args) && args.includes('tests/engine/run.cjs')) {
    const nestedPreload = process.env.E1_PG_SUITE_ROOT ? __filename : path.join(options?.cwd ?? process.cwd(), 'tests/engine/pg/e1-preload.cjs');
    args = ['--require', nestedPreload, ...args];
    options = { ...options, env: {
      ...(options?.env ?? process.env),
      ...(process.env.E1_PG_SUITE_ROOT ? {
        E1_PG_SUITE_ROOT: options?.cwd ?? process.cwd(),
        E1_PG_RESULT_PATH: '', // The packed suite's own parent reads its result here.
      } : {}),
      ...(!require('./paths.cjs').externalCluster() ? {
        E1_PG_FIXTURE_SOCKET: process.env.E1_PG_FIXTURE_SOCKET ?? require('./harness.cjs').connectionConfig().host,
      } : {}),
    } };
  }
  return spawnSync.call(this, command, args, options);
};

// The E1 header has a literal SQLite label. Keep its source and output intact,
// and emit independent observed metadata from the actual database connection.
const probe = new adapter.FixtureDb();
console.log(JSON.stringify({
  e1PostgreSQLAdapter: probe.metadata,
  suiteSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'tests/engine/run.cjs'))).digest('hex'),
  legacyHeader: 'The unchanged E1 header says node:sqlite; the preloaded FixtureDb uses this observed PostgreSQL connection.',
}));
probe.close();
