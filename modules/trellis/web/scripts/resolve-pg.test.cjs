'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PINNED_PG, resolvePg } = require('../../tests/engine/pg/resolve-pg.cjs');

test('web build resolves pg from E2_PG_MODULES relative to its working directory', () => {
  const previous = process.env.E2_PG_MODULES;
  try {
    process.env.E2_PG_MODULES = './node_modules';
    const resolved = resolvePg();
    assert.equal(resolved.version, PINNED_PG);
    assert.equal(resolved.path, fs.realpathSync(path.join(process.cwd(), 'node_modules/pg')));
  } finally {
    if (previous === undefined) delete process.env.E2_PG_MODULES;
    else process.env.E2_PG_MODULES = previous;
  }
});
