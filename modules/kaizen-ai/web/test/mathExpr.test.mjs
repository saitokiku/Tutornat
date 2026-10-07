import test from 'node:test';
import assert from 'node:assert/strict';
import { compileExpr } from '@/lib/mathExpr.js';

const evalAt = (src, x) => compileExpr(src)(x);
const close = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !≈ ${expected}`);

test('arithmetic, precedence, and associativity', () => {
  close(evalAt('1+2*3', 0), 7);
  close(evalAt('(1+2)*3', 0), 9);
  close(evalAt('2^3^2', 0), 512);       // ^ is right-associative
  close(evalAt('10-4-3', 0), 3);        // - is left-associative
  close(evalAt('7/2', 0), 3.5);
});

test('the variable x and functions/constants', () => {
  close(evalAt('x^2 + 1', 3), 10);
  close(evalAt('sin(pi/2)', 0), 1);
  close(evalAt('sqrt(x)', 16), 4);
  close(evalAt('log(100)', 0), 2);      // log = log10
  close(evalAt('ln(e)', 0), 1);
  close(evalAt('tau', 0), Math.PI * 2);
});

test('unary minus binds looser than ^ (so -x^2 is -(x^2))', () => {
  close(evalAt('-x^2', 3), -9);
  close(evalAt('-3+5', 0), 2);
  close(evalAt('2*-3', 0), -6);
  close(evalAt('+5', 0), 5);            // unary plus is a no-op
});

test('invalid input returns null instead of throwing', () => {
  assert.equal(compileExpr('(x'), null);            // unbalanced paren
  assert.equal(compileExpr('x)'), null);            // unbalanced paren
  assert.equal(compileExpr('x**2'), null);          // ** rejected (only ^)
  assert.equal(compileExpr('foo(x)'), null);        // unknown identifier
  assert.equal(compileExpr('x; process.exit()'), null); // illegal characters
  assert.equal(compileExpr(''), null);
  assert.equal(compileExpr('   '), null);
  assert.equal(compileExpr(42), null);              // non-string
  assert.equal(compileExpr('x'.repeat(241)), null); // over length cap
});

test('no code execution paths: constructor/property access is rejected', () => {
  assert.equal(compileExpr('constructor'), null);
  assert.equal(compileExpr('x.constructor'), null);
  assert.equal(compileExpr('__proto__'), null);
});

test('runtime domain errors yield NaN, not exceptions', () => {
  assert.ok(Number.isNaN(evalAt('sqrt(-1)', 0)));
  assert.ok(Number.isNaN(evalAt('ln(0-5)', 0)));
  assert.ok(Number.isNaN(evalAt('x + ', 0)));       // dangling operator compiles but evaluates to NaN
});

test('division by zero follows IEEE semantics (graph skips non-finite)', () => {
  assert.equal(evalAt('1/x', 0), Infinity);
  assert.ok(Number.isNaN(evalAt('x/x', 0)));        // 0/0
});
