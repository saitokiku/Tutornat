'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Called before creating directories, truncating logs, or invoking cluster tools.
function safePaths(root = path.resolve(__dirname, '../../..')) {
  root = path.resolve(root);
  if (fs.realpathSync(root) !== root) throw new Error('refusing symlink in repository root');
  function checked(relative) {
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      try {
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`refusing symlink: ${current}`);
        if (fs.realpathSync(current) !== current) throw new Error(`path resolves outside owned tree: ${current}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    return current;
  }
  return {
    root,
    directory: checked('tests/engine/pg'),
    data: checked('tests/engine/pg/data'),
    socket: checked('tests/engine/pg/socket'),
    log: checked('tests/engine/pg/server.log'),
    state: checked('tests/engine/pg/external-state.json'),
  };
}

function externalCluster(env = process.env) {
  return Boolean(env.KAIZENEDU_PG_URL || env.PGHOST);
}

module.exports = { safePaths, externalCluster };
