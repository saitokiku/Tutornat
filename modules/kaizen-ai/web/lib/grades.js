// Pure gradebook engine — no state, no network. Callers pass a course plus its
// assignments and get back current grade, category breakdown, GPA, and what-if
// projections.
//
// Data shapes (see lib/intake.js):
//   course.gradeCategories: [{ id, name, weight }]   weight = percentage (need
//     not sum to 100 — we normalize). Empty → simple points-based grade.
//   course.credits: number (GPA weighting)   course.gradeScale: [{letter,min}]|null
//   assignment: { category (name), pointsEarned, pointsPossible, graded }

export const DEFAULT_SCALE = [
  { letter: 'A', min: 90 }, { letter: 'B', min: 80 },
  { letter: 'C', min: 70 }, { letter: 'D', min: 60 }, { letter: 'F', min: 0 },
];

// Unweighted 4.0-scale GPA points by letter.
export const DEFAULT_GPA_POINTS = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7, F: 0.0,
};

function norm(s) { return String(s || '').trim().toLowerCase(); }

export function letterFor(pct, scale) {
  if (pct == null || Number.isNaN(pct)) return null;
  const s = [...(Array.isArray(scale) && scale.length ? scale : DEFAULT_SCALE)].sort((a, b) => b.min - a.min);
  for (const row of s) if (pct >= Number(row.min)) return row.letter;
  return s[s.length - 1]?.letter ?? 'F';
}

function gradedItems(assignments) {
  return (assignments || []).filter(
    (a) => a && a.graded && Number(a.pointsPossible) > 0 && a.pointsEarned != null && !Number.isNaN(Number(a.pointsEarned))
  );
}

function tally(items) {
  let earned = 0, possible = 0;
  for (const a of items) { earned += Number(a.pointsEarned) || 0; possible += Number(a.pointsPossible) || 0; }
  return { earned, possible, pct: possible > 0 ? (earned / possible) * 100 : null };
}

// Per-category stats. With no categories defined, returns one "Overall" bucket
// (pure points average) so ungraded/simple courses still work.
export function categoryBreakdown(course, assignments) {
  const cats = Array.isArray(course?.gradeCategories) ? course.gradeCategories : [];
  const graded = gradedItems(assignments);
  if (cats.length === 0) {
    const t = tally(graded);
    return [{ id: 'all', name: 'Overall', weight: 100, count: graded.length, ...t }];
  }
  return cats.map((cat) => {
    const items = graded.filter((a) => norm(a.category) === norm(cat.name));
    return { id: cat.id, name: cat.name, weight: Number(cat.weight) || 0, count: items.length, ...tally(items) };
  });
}

// Current course grade — weighted average over categories that have graded
// work, renormalized so unentered categories don't drag the grade down (the
// standard "current standing" behavior).
export function courseGrade(course, assignments) {
  const rows = categoryBreakdown(course, assignments);
  const withData = rows.filter((r) => r.pct != null && r.weight > 0);
  let percent = null;
  if (withData.length) {
    const wsum = withData.reduce((s, r) => s + r.weight, 0);
    percent = withData.reduce((s, r) => s + r.weight * r.pct, 0) / wsum;
  } else {
    const any = rows.find((r) => r.pct != null);
    percent = any ? any.pct : null;
  }
  const rounded = percent == null ? null : Math.round(percent * 10) / 10;
  return { percent: rounded, letter: letterFor(rounded, course?.gradeScale), byCategory: rows };
}

// Projected grade if given categories hit hypothetical pcts.
// overrides: { [categoryId]: pctNumber }. Uses full category weights; ignores
// categories with neither data nor an override (renormalizes to what's known).
export function projectGrade(course, assignments, overrides = {}) {
  const rows = categoryBreakdown(course, assignments);
  const totalW = rows.reduce((s, r) => s + (r.weight || 0), 0) || 1;
  let acc = 0, counted = 0;
  for (const r of rows) {
    const w = (r.weight || 0) / totalW;
    const pct = overrides[r.id] != null ? Number(overrides[r.id]) : r.pct;
    if (pct == null || Number.isNaN(pct)) continue;
    acc += w * pct; counted += w;
  }
  if (counted === 0) return { percent: null, letter: null };
  const percent = Math.round((acc / counted) * 10) / 10;
  return { percent, letter: letterFor(percent, course?.gradeScale) };
}

// Score needed in `categoryId` to reach targetPct overall — holds graded
// categories at their current pct and assumes other ungraded categories also
// land at targetPct (a neutral assumption we surface in the UI). Returns a
// number (may be <0 = already locked in, or >100 = out of reach), or null.
export function neededInCategory(course, assignments, targetPct, categoryId) {
  const rows = categoryBreakdown(course, assignments);
  const totalW = rows.reduce((s, r) => s + (r.weight || 0), 0) || 1;
  const target = rows.find((r) => r.id === categoryId);
  if (!target || !target.weight) return null;
  const wk = target.weight / totalW;
  let known = 0;
  for (const r of rows) {
    if (r.id === categoryId) continue;
    const w = (r.weight || 0) / totalW;
    known += w * (r.pct != null ? r.pct : targetPct);
  }
  return Math.round(((targetPct - known) / wk) * 10) / 10;
}

// Target letter → the minimum percentage that earns it (from the scale).
export function targetPercentForLetter(letter, scale) {
  const s = Array.isArray(scale) && scale.length ? scale : DEFAULT_SCALE;
  const row = s.find((r) => norm(r.letter) === norm(letter));
  return row ? Number(row.min) : null;
}

// Credit-weighted GPA across courses. `assignmentsFor(courseId)` → assignments.
export function gpa(courses, assignmentsFor, points = DEFAULT_GPA_POINTS) {
  let quality = 0, credits = 0;
  for (const c of courses || []) {
    const g = courseGrade(c, assignmentsFor(c.id));
    if (g.percent == null) continue;
    const p = points[g.letter];
    if (p == null) continue;
    const credit = Number(c.credits) > 0 ? Number(c.credits) : 1;
    quality += p * credit; credits += credit;
  }
  return credits > 0 ? Math.round((quality / credits) * 100) / 100 : null;
}
