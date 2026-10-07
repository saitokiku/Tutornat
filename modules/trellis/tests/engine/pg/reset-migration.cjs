// Owner-only fixture helper: forget one migration's applied record on the SYNTHETIC cluster so an
// unreleased, edited migration file can be applied again by db/migrate.cjs. Never a production tool.
//   sh tests/engine/harness/with-pg17.sh node tests/engine/pg/reset-migration.cjs 0007_dual_key_approval.sql
'use strict';
const { owner } = require('./harness.cjs');
const name = process.argv[2];
if (!/^\d+_[a-z_]+\.sql$/.test(name || '')) { console.error('usage: reset-migration.cjs <NNNN_name.sql>'); process.exit(2); }
(async () => {
  const c = await owner();
  try {
    const r = await c.query('DELETE FROM e2_migrations.applied WHERE name=$1 RETURNING name,sha256', [name]);
    console.log(JSON.stringify({ reset: r.rows }));
  } finally { await c.end(); }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
