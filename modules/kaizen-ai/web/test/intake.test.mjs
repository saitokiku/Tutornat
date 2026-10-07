import test from 'node:test';
import assert from 'node:assert/strict';
import { applyIntake, COURSE_COLORS, uid } from '@/lib/intake.js';

const emptyApp = () => ({ courses: [], assignments: [] });

test('uid returns unique non-empty strings', () => {
  const a = uid(), b = uid();
  assert.ok(a && b && a !== b);
});

test('new courses get ids, colors, and seed concepts from topics', () => {
  const patch = {
    courses: [{ tempId: 'c1', name: 'Algebra II', topics: ['Linear equations', 'Quadratics'], credits: 3 }],
    assignments: [],
  };
  const out = applyIntake({ app: emptyApp(), concepts: [], patch });
  assert.equal(out.app.courses.length, 1);
  const c = out.app.courses[0];
  assert.ok(c.id);
  assert.equal(c.color, COURSE_COLORS[0]);
  assert.equal(c.credits, 3);
  assert.deepEqual(c.topics, ['Linear equations', 'Quadratics']);
  assert.deepEqual(out.concepts.map((x) => x.name).sort(), ['Linear equations', 'Quadratics']);
  assert.deepEqual(out.touchedCourseIds, [c.id]);
});

test('same-name course (case-insensitive) is extended, not duplicated', () => {
  const existing = {
    id: 'X', name: 'Algebra II', topics: ['Linear equations'],
    gradeCategories: [], gradeScale: null, credits: 1, targetGrade: null,
  };
  const patch = {
    courses: [{
      tempId: 'c1', name: 'algebra ii', topics: ['linear equations', 'Quadratics'],
      gradeCategories: [{ name: 'Homework', weight: 40 }], targetGrade: 'A',
    }],
    assignments: [],
  };
  const out = applyIntake({ app: { courses: [existing], assignments: [] }, concepts: [], patch });
  assert.equal(out.app.courses.length, 1);
  const c = out.app.courses[0];
  assert.equal(c.id, 'X');
  // only the genuinely new topic is appended (case-insensitive dedupe)
  assert.deepEqual(c.topics, ['Linear equations', 'Quadratics']);
  assert.equal(c.gradeCategories.length, 1);   // filled because it was empty
  assert.equal(c.targetGrade, 'A');
});

test('assignments resolve temp: and existing: courseRefs', () => {
  const patch = {
    courses: [{ tempId: 'c1', name: 'Chem', topics: [] }],
    assignments: [
      { title: 'Lab 1', courseRef: 'temp:c1' },
      { title: 'Orphan', courseRef: 'existing:not-a-real-id' },
    ],
  };
  const out = applyIntake({ app: emptyApp(), concepts: [], patch });
  const courseId = out.app.courses[0].id;
  const [lab, orphan] = out.app.assignments;
  assert.equal(lab.courseId, courseId);
  assert.equal(orphan.courseId, null);   // bad ref degrades to unattached, not a crash
});

test('explicit due dates land at 23:59 local; missing dates get spaced fallbacks', () => {
  const patch = {
    courses: [],
    assignments: [
      { title: 'Essay', dueDate: '2026-08-01' },
      { title: 'No date A' },
      { title: 'No date B' },
    ],
  };
  const out = applyIntake({ app: emptyApp(), concepts: [], patch });
  const essay = new Date(out.app.assignments[0].due);
  assert.equal(essay.getHours(), 23);
  assert.equal(essay.getMinutes(), 59);
  assert.equal(essay.getDate(), 1);
  const a1 = new Date(out.app.assignments[1].due);
  const a2 = new Date(out.app.assignments[2].due);
  assert.ok(a2.getTime() > a1.getTime());   // fallbacks spread out, not stacked on one day
});

test('graded artifacts arrive done with score fields; ungraded default to todo', () => {
  const patch = {
    courses: [],
    assignments: [
      { title: 'Quiz 1', graded: true, pointsEarned: 9, pointsPossible: 10, category: 'Quizzes' },
      { title: 'HW 5' },
      { title: 'Half-graded', graded: true, pointsEarned: 7 },   // no pointsPossible → not graded
    ],
  };
  const out = applyIntake({ app: emptyApp(), concepts: [], patch });
  const [quiz, hw, half] = out.app.assignments;
  assert.equal(quiz.status, 'done');
  assert.equal(quiz.graded, true);
  assert.equal(quiz.pointsEarned, 9);
  assert.equal(quiz.category, 'Quizzes');
  assert.equal(hw.status, 'todo');
  assert.equal(hw.graded, false);
  assert.equal(half.graded, false);
});

test('assignment concepts canonicalize onto existing concept names', () => {
  const existingConcept = { id: 'k1', name: 'Fractions' };
  const patch = { courses: [], assignments: [{ title: 'WS 3', concept: 'fractions' }] };
  const out = applyIntake({ app: emptyApp(), concepts: [existingConcept], patch });
  // exact existing casing wins, and no duplicate concept is created
  assert.equal(out.app.assignments[0].concept, 'Fractions');
  assert.equal(out.concepts.filter((c) => c.name.toLowerCase() === 'fractions').length, 1);
});

test('malformed patch rows are skipped and inputs are not mutated', () => {
  const app = emptyApp();
  const concepts = [];
  const patch = {
    courses: [null, { name: '' }, { name: 'Real', topics: [] }],
    assignments: [null, { noTitle: true }],
  };
  const out = applyIntake({ app, concepts, patch });
  assert.equal(out.app.courses.length, 1);
  assert.equal(out.app.assignments.length, 0);
  assert.equal(app.courses.length, 0);       // caller's objects untouched
  assert.equal(concepts.length, 0);
  assert.equal(out.summary, '');
});
