import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCALE, letterFor, categoryBreakdown, courseGrade,
  projectGrade, neededInCategory, targetPercentForLetter, gpa,
} from '@/lib/grades.js';

const CATS = [
  { id: 'hw', name: 'Homework', weight: 40 },
  { id: 'ex', name: 'Exams', weight: 60 },
];
const course = { gradeCategories: CATS, gradeScale: null, credits: 3 };
const a = (category, earned, possible, graded = true) => ({
  category, pointsEarned: earned, pointsPossible: possible, graded,
});

test('letterFor maps percentages through the default scale', () => {
  assert.equal(letterFor(95), 'A');
  assert.equal(letterFor(90), 'A');   // boundary is inclusive
  assert.equal(letterFor(89.9), 'B');
  assert.equal(letterFor(59.9), 'F');
  assert.equal(letterFor(null), null);
  assert.equal(letterFor(NaN), null);
});

test('letterFor honors a custom scale regardless of row order', () => {
  const scale = [{ letter: 'P', min: 70 }, { letter: 'HP', min: 90 }, { letter: 'F', min: 0 }];
  assert.equal(letterFor(92, scale), 'HP');
  assert.equal(letterFor(75, scale), 'P');
  assert.equal(letterFor(10, scale), 'F');
});

test('categoryBreakdown without categories yields one Overall points bucket', () => {
  const rows = categoryBreakdown({}, [a(null, 8, 10), a(null, 9, 10)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Overall');
  assert.equal(rows[0].pct, 85);
  assert.equal(rows[0].count, 2);
});

test('categoryBreakdown ignores ungraded and zero-point items and matches names case-insensitively', () => {
  const rows = categoryBreakdown(course, [
    a('homework', 9, 10),          // lower-case name still matches
    a('Homework', 5, 10, false),   // ungraded — ignored
    a('Homework', 1, 0),           // zero points possible — ignored
    a('Exams', 80, 100),
  ]);
  const hw = rows.find((r) => r.id === 'hw');
  const ex = rows.find((r) => r.id === 'ex');
  assert.equal(hw.count, 1);
  assert.equal(hw.pct, 90);
  assert.equal(ex.pct, 80);
});

test('courseGrade renormalizes over categories that have data', () => {
  // Only homework graded → grade should equal the homework pct, not be dragged
  // down by the empty exam category.
  const g1 = courseGrade(course, [a('Homework', 9, 10)]);
  assert.equal(g1.percent, 90);
  assert.equal(g1.letter, 'A');

  // Both categories → true weighted average: (40*90 + 60*80)/100 = 84
  const g2 = courseGrade(course, [a('Homework', 9, 10), a('Exams', 80, 100)]);
  assert.equal(g2.percent, 84);
  assert.equal(g2.letter, 'B');
});

test('courseGrade with no graded work returns nulls', () => {
  const g = courseGrade(course, []);
  assert.equal(g.percent, null);
  assert.equal(g.letter, null);
});

test('projectGrade applies overrides using full category weights', () => {
  // Homework at 90, project exams at 100 → 40*90 + 60*100 = 96
  const p = projectGrade(course, [a('Homework', 9, 10)], { ex: 100 });
  assert.equal(p.percent, 96);
  assert.equal(p.letter, 'A');
});

test('neededInCategory solves for the score that reaches the target', () => {
  // Homework locked at 90 (40%). To average 90 overall the exams (60%) need:
  // (90 - 0.4*90) / 0.6 = 90.
  const need = neededInCategory(course, [a('Homework', 9, 10)], 90, 'ex');
  assert.equal(need, 90);
  // Unknown category → null
  assert.equal(neededInCategory(course, [], 90, 'nope'), null);
});

test('targetPercentForLetter reads the scale', () => {
  assert.equal(targetPercentForLetter('B'), 80);
  assert.equal(targetPercentForLetter('b'), 80);
  assert.equal(targetPercentForLetter('Z'), null);
  assert.equal(DEFAULT_SCALE.find((r) => r.letter === 'A').min, 90);
});

test('gpa is credit-weighted and skips courses without grades', () => {
  const c1 = { id: '1', credits: 4, gradeCategories: [], gradeScale: null }; // A → 4.0
  const c2 = { id: '2', credits: 2, gradeCategories: [], gradeScale: null }; // C → 2.0
  const c3 = { id: '3', credits: 3, gradeCategories: [], gradeScale: null }; // no data
  const byId = {
    1: [a(null, 95, 100)],
    2: [a(null, 75, 100)],
    3: [],
  };
  // (4*4 + 2*2) / 6 = 3.33
  assert.equal(gpa([c1, c2, c3], (id) => byId[id]), 3.33);
  assert.equal(gpa([c3], (id) => byId[id]), null);
});
