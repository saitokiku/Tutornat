'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { safePaths } = require('../tests/engine/pg/paths.cjs');
const { owner } = require('../tests/engine/pg/harness.cjs');

function migrationFiles() {
  const root = safePaths().root;
  const dir = path.join(root, 'db/migrations');
  for (const file of [path.join(root,'db'), dir]) {
    if (fs.realpathSync(file) !== file) throw new Error('migration path is not an owned physical directory: '+file);
  }
  return fs.readdirSync(dir).filter((f)=>/^\d+_[a-z_]+\.sql$/.test(f)).sort().map((name)=> {
    const file = path.join(dir,name);
    if (fs.realpathSync(file)!==file) throw new Error('symlink migration rejected: '+file);
    const sql = fs.readFileSync(file,'utf8');
    return {name,sql,sha256:crypto.createHash('sha256').update(sql).digest('hex')};
  });
}
async function migrate(client, { reapply = false, files = migrationFiles() } = {}) {
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('e2:migrations',0))");
    await client.query('CREATE SCHEMA IF NOT EXISTS e2_migrations');
    await client.query('REVOKE ALL ON SCHEMA e2_migrations FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS e2_migrations.applied(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp())');
    await client.query('REVOKE ALL ON e2_migrations.applied FROM PUBLIC');
    await client.query('ALTER TABLE e2_migrations.applied ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE e2_migrations.applied FORCE ROW LEVEL SECURITY');
    const outcomes=[];
    for (const file of files) {
      const prior = await client.query('SELECT sha256 FROM e2_migrations.applied WHERE name=$1',[file.name]);
      if (prior.rows.length && prior.rows[0].sha256!==file.sha256) throw new Error('migration checksum mismatch: '+file.name);
      if (!prior.rows.length || reapply) {
        await client.query(file.sql);
        await client.query('INSERT INTO e2_migrations.applied(name,sha256) VALUES($1,$2) ON CONFLICT DO NOTHING',[file.name,file.sha256]);
      }
      outcomes.push({migration:file.name,sha256:file.sha256,status:prior.rows.length ? (reapply?'reapplied':'unchanged'):'applied',reversible:false});
    }
    await client.query('COMMIT');
    return outcomes;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
if(require.main===module) {
  (async()=> {
    if(process.argv.includes('--down')) throw new Error('forward-only migrations: automatic history destruction is not provided');
    const c=await owner();
    try { console.log(JSON.stringify({server:await require('../tests/engine/pg/harness.cjs').serverIdentity(c),migrations:await migrate(c,{reapply:process.argv.includes('--reapply')})})); }
    finally { await c.end(); }
  })().catch(e=>{console.error(JSON.stringify({error:e.message,code:e.code??null}));process.exitCode=1;});
}
module.exports={migrate,migrationFiles};
