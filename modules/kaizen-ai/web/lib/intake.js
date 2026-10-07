// Universal AI intake — pure merge helper.
// Takes the normalized patch returned by /api/intake and folds it into the
// existing app state + concept store. No network, no side effects: callers
// persist the returned copies themselves (localStorage + cloud push).

import { newConcept } from '@/lib/mastery';

// Course palette — harmonized with the Kaizen brand (rose, sage, amber,
// plum, teal, terracotta, gold). Order matters: earliest courses get the
// most distinct hues.
export const COURSE_COLORS = ['#B4536F', '#5E8D6A', '#C08A3E', '#7D5878', '#5E96A8', '#C25E5E', '#B08D2E'];

export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

// Normalize AI-extracted grade categories → [{id,name,weight}] (weight = %).
function normalizeCats(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const c of raw) {
    const name = String(c?.name || '').trim();
    const weight = Number(c?.weight);
    if (!name || !(weight > 0)) continue;
    if (out.some((x) => norm(x.name) === norm(name))) continue;
    out.push({ id: uid(), name, weight });
  }
  return out;
}

function cleanScale(raw) {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((r) => ({ letter: String(r?.letter || '').trim(), min: Number(r?.min) }))
    .filter((r) => r.letter && !Number.isNaN(r.min));
  return out.length ? out : null;
}

// applyIntake({ app, concepts, patch }) → { app, concepts, summary }
// - New courses get real ids + colors; same-name (case-insensitive) courses
//   are extended instead of duplicated (tempId maps to the existing id).
// - Every topic on a new/updated course seeds a concept unless one with that
//   name already exists. Same for each assignment's concept.
// - Assignments resolve courseRef ("existing:<id>" | "temp:cN" | null), get a
//   due date (AI's date at 23:59 local, else relative fallback spacing), and
//   append to app.assignments.
export function applyIntake({ app, concepts, patch }) {
  const courses = [...(app.courses || [])];
  const nextConcepts = [...(concepts || [])];
  const tempMap = {}; // tempId → real course id
  const touched = new Set(); // course ids whose topics should seed concepts

  for (const pc of patch?.courses || []) {
    if (!pc || !pc.name) continue;
    const topics = (Array.isArray(pc.topics) ? pc.topics : []).map((t) => String(t).trim()).filter(Boolean);
    const idx = courses.findIndex((c) => norm(c.name) === norm(pc.name));
    const cats = normalizeCats(pc.gradeCategories);
    const scale = cleanScale(pc.gradeScale);
    const credits = Number(pc.credits) > 0 ? Number(pc.credits) : null;
    if (idx >= 0) {
      // same-name course exists — extend it rather than duplicate
      const existing = courses[idx];
      if (pc.tempId) tempMap[pc.tempId] = existing.id;
      const fresh = topics.filter((t) => !existing.topics.some((et) => norm(et) === norm(t)));
      courses[idx] = {
        ...existing,
        topics: fresh.length ? [...existing.topics, ...fresh] : existing.topics,
        // only fill grade metadata when the course doesn't already have it
        gradeCategories: existing.gradeCategories?.length ? existing.gradeCategories : cats,
        gradeScale: existing.gradeScale || scale,
        credits: existing.credits || credits || 1,
        targetGrade: existing.targetGrade || pc.targetGrade || null,
      };
      touched.add(existing.id);
    } else {
      const id = uid();
      if (pc.tempId) tempMap[pc.tempId] = id;
      courses.push({
        id,
        code: pc.code || '',
        name: String(pc.name).trim(),
        teacher: pc.teacher || '',
        color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
        topics,
        gradeCategories: cats,
        gradeScale: scale,
        credits: credits || 1,
        targetGrade: pc.targetGrade || null,
      });
      touched.add(id);
    }
  }

  // Seed concepts from every topic on new/updated courses
  for (const c of courses) {
    if (!touched.has(c.id)) continue;
    for (const t of c.topics) {
      if (!nextConcepts.some((x) => norm(x.name) === norm(t))) nextConcepts.push(newConcept(t));
    }
  }

  // Assignments
  const assignments = [...(app.assignments || [])];
  let fallbackDay = 3;
  for (const pa of patch?.assignments || []) {
    if (!pa || !pa.title) continue;

    let courseId = null;
    const ref = String(pa.courseRef || '');
    if (ref.startsWith('existing:')) {
      const id = ref.slice('existing:'.length);
      courseId = courses.some((c) => c.id === id) ? id : null;
    } else if (ref.startsWith('temp:')) {
      courseId = tempMap[ref.slice('temp:'.length)] || null;
    }

    let due = null;
    if (typeof pa.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pa.dueDate)) {
      const d = new Date(pa.dueDate + 'T23:59:00');
      if (!Number.isNaN(d.getTime())) due = d;
    }
    if (!due) {
      due = new Date();
      due.setDate(due.getDate() + fallbackDay);
      due.setHours(23, 59, 0, 0);
      fallbackDay += 2;
    }

    // Canonicalize to an existing concept's exact name when one matches
    // case-insensitively — exact-name lookups elsewhere (studyAssignment,
    // chat memory) must all hit the same SM-2 record, never a forked copy.
    let concept = pa.concept ? String(pa.concept).trim() : null;
    if (concept) {
      const existing = nextConcepts.find((x) => norm(x.name) === norm(concept));
      if (existing) concept = existing.name;
      else nextConcepts.push(newConcept(concept));
    }

    // Grade fields: a returned/marked artifact arrives already graded.
    const pointsPossible = Number(pa.pointsPossible) > 0 ? Number(pa.pointsPossible) : null;
    const earnedRaw = Number(pa.pointsEarned);
    const pointsEarned = pa.pointsEarned != null && !Number.isNaN(earnedRaw) ? earnedRaw : null;
    const graded = Boolean(pa.graded) && pointsPossible != null && pointsEarned != null;

    assignments.push({
      id: uid(),
      courseId,
      title: String(pa.title).trim(),
      type: pa.type || 'homework',
      concept,
      minutes: Number(pa.minutes) > 0 ? Math.round(Number(pa.minutes)) : 30,
      due: due.toISOString(),
      status: graded ? 'done' : 'todo',
      completedAt: graded ? new Date().toISOString() : null,
      category: pa.category ? String(pa.category).trim() : null,
      pointsPossible,
      pointsEarned,
      graded,
      gradedAt: graded ? new Date().toISOString() : null,
      manual: true,
    });
  }

  return {
    app: { ...app, courses, assignments },
    concepts: nextConcepts,
    summary: patch?.summary || '',
    touchedCourseIds: [...touched],   // courses created/extended by this patch
  };
}
