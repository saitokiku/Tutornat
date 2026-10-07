'use strict';
// Isolate one synthetic suite on the existing PM server. Never start a server,
// alter another worker's schema, or drop a database we did not create here.
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { owner } = require('./harness.cjs');
(async () => {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error('usage: isolated-run.cjs command [args...]');
  const control = await owner();
  const database = 'q18_fixture_' + randomUUID().replaceAll('-', '');
  let created = false;
  try {
    console.log(new Date().toISOString());
    await control.query(`CREATE DATABASE ${database}`); created = true;
    const env = { ...process.env, PGDATABASE: database };
    if (env.KAIZENEDU_PG_URL) { const url = new URL(env.KAIZENEDU_PG_URL); url.pathname = '/' + database; env.KAIZENEDU_PG_URL = url.toString(); }
    const result = spawnSync(command, args, { env, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (created) await control.query(`DROP DATABASE ${database}`);
    await control.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
