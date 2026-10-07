// Owner-only probe: reapply migrations one prefix at a time to name the file a reapply fails in.
'use strict';
const { owner } = require('./harness.cjs');
const { migrate, migrationFiles } = require('../../../db/migrate.cjs');
(async () => {
  const c = await owner(); const files = migrationFiles();
  try {
    for (let n = 1; n <= files.length; n++) {
      try { await migrate(c, { reapply: true, files: files.slice(0, n) }); console.log(JSON.stringify({ upTo: files[n - 1].name, reapply: 'ok' })); }
      catch (e) { console.log(JSON.stringify({ upTo: files[n - 1].name, reapply: 'failed', error: e.message, code: e.code ?? null })); }
    }
  } finally { await c.end(); }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
