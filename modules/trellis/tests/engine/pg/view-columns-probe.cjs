// Owner-only probe: the live column list of every e2 view, to compare with the migration files.
'use strict';
const { owner } = require('./harness.cjs');
(async () => {
  const c = await owner();
  try {
    const r = await c.query("SELECT table_name, string_agg(column_name, ',' ORDER BY ordinal_position) AS cols FROM information_schema.columns WHERE table_schema='e2' AND table_name IN (SELECT table_name FROM information_schema.views WHERE table_schema='e2') GROUP BY table_name ORDER BY 1");
    for (const row of r.rows) console.log(row.table_name + ': ' + row.cols);
  } finally { await c.end(); }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
