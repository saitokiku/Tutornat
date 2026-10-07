// Spec-repair regressions for the pure model. Each test was run red before the fix
// (evidence/parent-spec/32-model-repair-red.log) and green after (33-model-repair-green.log).
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../model.js');

const K2 = { answer: 12, expr: '7 + 5' };
const G35 = { answer: 225, expr: '403 − 178' };
const G68 = { answer: 6, variable: 'x' };

test('final-answer checker rejects numeric suffix matches', () => {
  assert.equal(typeof model.checkFinalAnswer, 'function', 'BEHAVIOR MISSING: checkFinalAnswer');
  assert.equal(model.checkFinalAnswer('112', K2).result, 'mismatch');
  assert.equal(model.checkFinalAnswer('1225', G35).result, 'mismatch');
  assert.equal(model.checkFinalAnswer('16', G68).result, 'mismatch');
});

test('final-answer checker accepts bare numbers and the allowed equation/assignment forms', () => {
  assert.equal(model.checkFinalAnswer('12', K2).result, 'match');
  assert.equal(model.checkFinalAnswer('7 + 5 = 12', K2).result, 'match');
  assert.equal(model.checkFinalAnswer(' 225 ', G35).result, 'match');
  assert.equal(model.checkFinalAnswer('403 - 178 = 225', G35).result, 'match', 'ASCII minus');
  assert.equal(model.checkFinalAnswer('403 − 178 = 225', G35).result, 'match', 'typographic minus');
  assert.equal(model.checkFinalAnswer('6', G68).result, 'match');
  assert.equal(model.checkFinalAnswer('x=6', G68).result, 'match');
  assert.equal(model.checkFinalAnswer('X = 6', G68).result, 'match');
  assert.equal(model.checkFinalAnswer('6 = x', G68).result, 'match');
});

test('final-answer checker rejects negative, negated, ambiguous and wrong forms', () => {
  assert.equal(model.checkFinalAnswer('-225', G35).result, 'mismatch');
  assert.equal(model.checkFinalAnswer('not 225', G35).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('no es 225', G35).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('225 or 235', G35).result, 'ambiguous');
  assert.equal(model.checkFinalAnswer('225 o 235', G35).result, 'ambiguous');
  assert.equal(model.checkFinalAnswer('6, 7', G68).result, 'ambiguous');
  assert.equal(model.checkFinalAnswer('x = 7', G68).result, 'mismatch');
  assert.equal(model.checkFinalAnswer('y = 6', G68).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('403 − 178 = 235', G35).result, 'mismatch');
  assert.equal(model.checkFinalAnswer('400 − 178 = 225', G35).result, 'unparsed', 'a different left side is not the final-answer form');
  assert.equal(model.checkFinalAnswer('', G35).result, 'unparsed');
});

test('an intermediate step is reported as unparsed, never as wrong', () => {
  assert.equal(model.checkFinalAnswer('13 − 8 = 5', G35).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('3x = 18', G68).result, 'unparsed');
});

test('checker never evaluates arbitrary input', () => {
  assert.equal(model.checkFinalAnswer('200 + 25', G35).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('(() => 225)()', G35).result, 'unparsed');
});

test('a confirmed or corrected extracted deadline reaches the shared task with parent provenance', () => {
  const state = model.loadExample({ locale: 'en', band: '35' });
  const fixed = model.correctExtractedTask(state, { due: '2026-10-09' });
  const task = fixed.tasks.find((t) => t.id === fixed.extracted.taskId);
  assert.equal(task.due, '2026-10-09');
  assert.equal(task.dueSource, 'parent_corrected');
  assert.deepEqual(fixed.extracted.corrections, [{ field: 'due', from: '2026-10-02', to: '2026-10-09', by: 'parent' }]);
  assert.equal(fixed.tasks.find((t) => t.id === '35-math-regroup').due, '2026-10-01', 'other tasks untouched');
  const confirmed = model.correctExtractedTask(state, {});
  const same = confirmed.tasks.find((t) => t.id === confirmed.extracted.taskId);
  assert.equal(same.due, '2026-10-02');
  assert.equal(same.dueSource, 'parent_confirmed');
  assert.deepEqual(confirmed.extracted.corrections, []);
});

test('extracted-task corrections are validated narrowly', () => {
  const state = model.loadExample({ locale: 'en', band: '35' });
  assert.throws(() => model.correctExtractedTask(state, { due: 'next friday' }), /Invalid due/);
  assert.throws(() => model.correctExtractedTask(state, { taskId: '35-math-regroup' }), /Unsupported correction/);
});

test('a draft plan is derived from the confirmed task and date, and acceptance stays explicit', () => {
  assert.equal(typeof model.derivePlanItems, 'function', 'BEHAVIOR MISSING: derivePlanItems');
  let state = model.loadExample({ locale: 'en', band: '35' });
  assert.throws(() => model.derivePlanItems(state), /not confirmed/);
  state = model.correctExtractedTask(state, { due: '2026-10-09' });
  const items = model.derivePlanItems(state);
  assert.deepEqual(items.map((i) => i.key), ['tonight', 'midway', 'due']);
  assert.ok(items.every((i) => i.taskId === '35-read-summary' && i.due === '2026-10-09'));
  assert.equal(items[1].date, '2026-10-08', 'main work is scheduled the day before the confirmed deadline');
  const drafted = model.createDraftPlan(state, items);
  assert.equal(drafted.currentPlan, null);
  const declined = model.declineDraftPlan(drafted, 'Not this week');
  assert.equal(declined.currentPlan, null);
  const accepted = model.acceptDraftPlan(drafted);
  assert.deepEqual(accepted.currentPlan.items, items);
  assert.equal(accepted.currentPlan.acceptedBy, 'parent');
  const monthEdge = model.derivePlanItems(model.correctExtractedTask(model.loadExample({ locale: 'es', band: 'K2' }), { due: '2026-11-01' }));
  assert.equal(monthEdge[1].date, '2026-10-31');
  assert.equal(monthEdge[0].taskId, 'k2-read-sounds');
});
