// Small course/assignment helpers shared across views. Real data only —
// courses and assignments come from the AI intake pipeline (lib/intake.js)
// and live in app state (lib/appState.js). No sample/mock data.

export function courseById(courses, id) {
  return (courses || []).find((c) => c.id === id) || null;
}

export const TYPE_LABEL = {
  homework: 'Homework',
  quiz: 'Quiz',
  test: 'Test',
  exam: 'Exam',
  essay: 'Essay',
  reading: 'Reading',
  lab: 'Lab',
  project: 'Project',
};
