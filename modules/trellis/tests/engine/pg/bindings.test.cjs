// Pure fixture-bind controls only; these do not execute PostgreSQL or prove SQL
// semantics. Native controls live in e1-test.cjs and the unchanged E1 suite.
const assert = require('node:assert/strict');
const test = require('node:test');
const { namedParams } = require('./e1-db.cjs');

test('repeated named fixture bindings reuse the same PostgreSQL position', () => {
  assert.deepEqual(namedParams('SELECT $a, $b, $a', { $a: 'a', $b: 'b' }), {
    sql: 'SELECT $1, $2, $1', params: ['a', 'b'],
  });
});

test('out-of-order numeric fixture bindings map by name, including repetition', () => {
  assert.deepEqual(namedParams('SELECT $4, $1, $4', { $1: 'a', $4: 'b' }), {
    sql: 'SELECT $1, $2, $1', params: ['b', 'a'],
  });
});

test('a raw statement without parameters stays unchanged', () => {
  assert.deepEqual(namedParams('SELECT 1'), { sql: 'SELECT 1', params: [] });
});

test('missing bindings fail while explicit null, false and zero remain values', () => {
  assert.throws(() => namedParams('SELECT $absent', {}), /Missing fixture binding: \$absent/);
  assert.deepEqual(namedParams('SELECT $absent, $false, $zero', { $absent: null, $false: false, $zero: 0 }), {
    sql: 'SELECT $1, $2, $3', params: [null, false, 0],
  });
});
