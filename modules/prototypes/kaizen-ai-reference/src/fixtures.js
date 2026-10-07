// FICTIONAL fixtures for the reference reconstruction.
// Due times are 15:00 local: the snapshot's isToday() compares UTC day strings
// (lib/appState.js:91, dayStr), so late-evening local due times would be
// bucketed as tomorrow in US timezones. Not real students,
// courses, or progress. Shapes follow what components/TodayView.js reads:
// app.profile.name, app.streak.count, app.courses[{id,name,color}],
// app.assignments[{id,title,courseId,due,minutes,status,completedAt}], concepts[].
function at(dayOffset, hour = 15, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

export const FIXTURE_COURSES = [
  { id: 'c-math',    name: 'Math 5 (fixture)',      color: '#6b7fb3' },
  { id: 'c-read',    name: 'Reading (fixture)',     color: '#4f7a5b' },
  { id: 'c-sci',     name: 'Science (fixture)',     color: '#c08a3e' },
];

export const FIXTURE_APP = {
  profile: { name: 'Maya' },           // fictional student
  streak: { count: 5 },                // fictional "studied" history pill
  courses: FIXTURE_COURSES,
  assignments: [
    { id: 'a1', title: 'Fraction practice set 4',          courseId: 'c-math', due: at(0),  minutes: 25, status: 'todo' },
    { id: 'a2', title: 'Read chapter 6 and answer 1–5',     courseId: 'c-read', due: at(0),  minutes: 20, status: 'todo' },
    { id: 'a3', title: 'Weather log: three observations',   courseId: 'c-sci',  due: at(2),  minutes: 15, status: 'todo' },
    { id: 'a4', title: 'Spelling list 12',                  courseId: 'c-read', due: at(4),  minutes: 10, status: 'todo' },
    { id: 'a5', title: 'Decimal place-value quiz review',   courseId: 'c-math', due: at(5),  minutes: 30, status: 'todo' },
    { id: 'a6', title: 'Multiplication warm-up',            courseId: 'c-math', due: at(0, 8, 0), minutes: 10, status: 'done', completedAt: new Date().toISOString() },
  ],
};

// No concept history in the fixture: the original's rings/mastery read 0 here.
export const FIXTURE_CONCEPTS = [];

// Sidebar "Confirmed" card in the original shell reads an engine summary.
export const FIXTURE_ENGINE_SUMMARY = { confirmed: 4, total: 9 };
