import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSocraticPrompt, buildCuriousPrompt } from '@/lib/prompts.js';

test('socratic mode leads with questions', () => {
  const p = buildSocraticPrompt('Chain rule', {});
  assert.match(p, /Method \(Socratic\)/);
  assert.match(p, /Lead with questions/);
  assert.doesNotMatch(p, /Method \(teach mode\)/);
});

test('teach mode produces self-contained micro-lessons with an example and a checkpoint', () => {
  const p = buildSocraticPrompt('Chain rule', { teach: true });
  assert.match(p, /Method \(teach mode\)/);
  assert.match(p, /micro-lesson/);
  assert.match(p, /worked example/i);
  assert.match(p, /check-for-understanding/i);
  // it should NOT fall back to the pure question-first method
  assert.doesNotMatch(p, /Method \(Socratic\)/);
});

test('mastery is woven in only when provided, and is clamped/described', () => {
  const withM = buildSocraticPrompt('Photosynthesis', {
    teach: true,
    mastery: { pct: 42, status: 'warn', lastQuality: 3, seen: true },
  });
  assert.match(withM, /mastery ≈ 42%/);
  assert.match(withM, /shaky/);
  assert.match(withM, /scored 3 out of 5/);

  const good = buildSocraticPrompt('Photosynthesis', { mastery: { pct: 88, status: 'good', lastQuality: null, seen: true } });
  assert.match(good, /fairly solid/);

  const firstTime = buildSocraticPrompt('Photosynthesis', { mastery: { pct: 0, status: 'bad', lastQuality: null, seen: false } });
  assert.match(firstTime, /first time they are studying it/);

  const withoutM = buildSocraticPrompt('Photosynthesis', { teach: true });
  assert.doesNotMatch(withoutM, /spaced repetition/);
});

test('documents and student name thread through both modes', () => {
  const p = buildSocraticPrompt('Cells', {
    studentName: 'Ada',
    documents: [{ name: 'syllabus.pdf', text: 'Unit 3: mitosis' }],
  });
  assert.match(p, /Ada/);
  assert.match(p, /syllabus\.pdf/);
  assert.match(p, /mitosis/);
});

test('curious mode is a different prompt entirely', () => {
  const p = buildCuriousPrompt('black holes', { studentName: 'Ada' });
  assert.match(p, /curiosity mode/i);
  assert.doesNotMatch(p, /Method \(Socratic\)/);
});
