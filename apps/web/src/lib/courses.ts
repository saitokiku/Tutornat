import { catalogueEntry } from "@/catalogue";
import { newId, update, type StoreState } from "./store";
import type { Course, GenerationRequest } from "./types";

export const coursesOf = (s: StoreState, profileId: string) =>
  s.courses.filter((c) => c.profileId === profileId).sort((a, b) => b.updatedAt - a.updatedAt);

/** Null when the course is missing or belongs to another learner. */
export const getCourse = (s: StoreState, id: string, profileId: string) =>
  s.courses.find((c) => c.id === id && c.profileId === profileId) ?? null;

export function saveCourse(course: Course) {
  update((s) => {
    const next = { ...course, updatedAt: Date.now() };
    const i = s.courses.findIndex((c) => c.id === course.id);
    if (i >= 0) s.courses[i] = next;
    else s.courses.push(next);
  });
}

export function removeCourse(id: string) {
  update((s) => {
    s.courses = s.courses.filter((c) => c.id !== id);
    s.activity = s.activity.filter((e) => e.courseId !== id);
  });
}

export function titleFromGoal(goal: string) {
  const t = goal
    .trim()
    .split("\n")[0]
    .replace(/^(i (want|would like) to (learn|know)( about)?|teach me( about)?|how (do|to)|what is|quiero aprender( sobre)?|enséñame( sobre)?)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .slice(0, 70)
    .trim();
  return t ? t[0].toUpperCase() + t.slice(1) : goal.slice(0, 70);
}

export function createDraft(req: GenerationRequest, profileId: string): Course {
  const now = Date.now();
  const draft: Course = {
    id: newId(),
    profileId,
    title: titleFromGoal(req.goal) || req.sources[0]?.name || "New course",
    goal: req.goal,
    subject: req.subject,
    grade: req.grade,
    locale: req.locale,
    origin: "generated",
    status: "outlining",
    length: req.length,
    sources: req.sources,
    lessons: [],
    template: true,
    createdAt: now,
    updatedAt: now,
  };
  saveCourse(draft);
  return draft;
}

/** Adds a ready-made course for a learner, or returns the one they already have. */
export function addFromCatalogue(catalogueId: string, profileId: string): string | null {
  const entry = catalogueEntry(catalogueId);
  if (!entry) return null;
  let id: string | null = null;
  update((s) => {
    const existing = s.courses.find((c) => c.profileId === profileId && c.catalogueId === catalogueId);
    if (existing) {
      id = existing.id;
      return;
    }
    const now = Date.now();
    id = newId();
    s.courses.push({
      id,
      profileId,
      title: entry.title,
      goal: entry.summary,
      subject: entry.subject,
      grade: entry.grade,
      locale: entry.locale,
      origin: "catalogue",
      catalogueId,
      status: "ready",
      length: entry.lessons.length > 1 ? "short" : "lesson",
      sources: [],
      lessons: structuredClone(entry.lessons),
      template: false,
      createdAt: now,
      updatedAt: now,
    });
    s.activity.push({ id: newId(), profileId, at: now, type: "course_added", courseId: id });
  });
  return id;
}
