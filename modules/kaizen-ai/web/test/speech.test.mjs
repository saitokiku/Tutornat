import test from 'node:test';
import assert from 'node:assert/strict';
import { speakable } from '@/lib/speech.js';

test('code fences become a short spoken note', () => {
  const out = speakable('Here:\n```python\nprint(1)\n```\nDone.');
  assert.ok(out.includes('written some code on your screen'));
  assert.ok(!out.includes('print'));
});

test('graph/mermaid fences become a diagram note', () => {
  const out = speakable('```graph\n{"fn":"x^2"}\n```');
  assert.ok(out.includes('diagram on your screen'));
  assert.ok(!out.includes('x^2'));
});

test('an unterminated trailing fence (mid-stream) is dropped silently', () => {
  const out = speakable('Almost there ```py\nprint(');
  assert.equal(out, 'Almost there');
});

test('LaTeX becomes words', () => {
  assert.equal(speakable('$\\frac{a}{b}$'), 'a over b');
  assert.equal(speakable('$x^2$'), 'x squared');
  assert.equal(speakable('$x^3$'), 'x cubed');
  assert.ok(speakable('$$x \\times y$$').includes('x times y'));
  assert.ok(speakable('$a \\neq b$').includes('not equal to'));
  assert.ok(speakable('$\\pi$').includes('pi'));
});

test('markdown noise is stripped but text survives', () => {
  const out = speakable('# Heading\n\n- **Bold** point\n- [Kaizen](https://kaizen.example) link\n\n1. numbered');
  assert.ok(out.includes('Heading'));
  assert.ok(out.includes('Bold point'));
  assert.ok(out.includes('Kaizen link'));
  assert.ok(out.includes('numbered'));
  assert.ok(!/[#*[\]`]/.test(out));
  assert.ok(!out.includes('https://'));
});

test('images are removed entirely', () => {
  assert.equal(speakable('See ![alt text](https://img.example/x.png) here'), 'See here');
});

test('empty and non-string input degrade to empty string', () => {
  assert.equal(speakable(''), '');
  assert.equal(speakable(null), '');
  assert.equal(speakable(undefined), '');
});
