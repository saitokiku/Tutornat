'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PINNED_PG = '8.23.0';

function resolvePg() {
  const candidates = process.env.E2_PG_MODULES
    ? [path.resolve(process.cwd(), process.env.E2_PG_MODULES, 'pg')]
    : [path.resolve(__dirname, '../../../node_modules/pg'), '/Users/mann/pm/shared/eval/pc-cli/node_modules/pg'];
  for (const candidate of candidates) {
    const manifest = path.join(candidate, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
    if (version !== PINNED_PG) throw new Error(`pg version ${version} does not match pinned ${PINNED_PG}: ${manifest}`);
    return { pg: require(candidate), version, path: fs.realpathSync(candidate) };
  }
  throw new Error(`offline pg ${PINNED_PG} missing; set E2_PG_MODULES to its node_modules directory`);
}

module.exports = { resolvePg, PINNED_PG };
if (require.main === module) {
  const resolved = resolvePg();
  console.log(`pg=${resolved.version} path=${resolved.path}`);
}
