import { catalogueEntry, catalogueFor, type CatalogueEntry } from "@/catalogue";
import type { Statuses } from "@/learning/engine";
import { skillsFor } from "@/practice/skills";
import { logAct } from "./acts";
import { newId, update, type StoreState } from "./store";
import type { Course, GenerationRequest, Grade, Lesson, Locale, Subject } from "./types";

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

/** The teaching act behind every course a learner gets: added or built, it is meant to be finished. */
const courseAct = (profileId: string, courseId: string) => logAct({ profileId, kind: "course", intent: "course-finished", ref: courseId }, { once: true });

/**
 * Turns a built outline into a course the learner can take. Does nothing to a course that is already
 * ready. `citations`: what a source-built course still cites after the family edited its outline.
 */
export function finishDraft(id: string, profileId: string, patch: { title: string; lessons: Lesson[]; citations?: Course["citations"] }) {
  let done = false;
  update((s) => {
    const c = s.courses.find((x) => x.id === id && x.profileId === profileId);
    if (!c || c.status === "ready") return;
    const { citations, ...rest } = patch;
    Object.assign(c, rest, citations ? { citations } : {}, { status: "ready", updatedAt: Date.now() });
    done = true;
  });
  if (done) courseAct(profileId, id);
  return done;
}

/** Where a course should go so it leads its subject's path: before every placed course. */
function topOrder(s: StoreState, profileId: string, subject: Subject, except?: string) {
  const placed = s.courses.filter((c) => c.profileId === profileId && c.subject === subject && c.id !== except && c.order !== undefined).map((c) => c.order!);
  return placed.length ? Math.min(...placed) - 1 : undefined;
}

/**
 * Adds a ready-made course for a learner, or returns the one they already have. A course a grown-up
 * assigns goes to the top of its subject's path (also when the learner had already added it).
 */
export function addFromCatalogue(catalogueId: string, profileId: string, opts: { assigned?: boolean } = {}): string | null {
  const entry = catalogueEntry(catalogueId);
  if (!entry) return null;
  let id: string | null = null;
  let added = false;
  update((s) => {
    const existing = s.courses.find((c) => c.profileId === profileId && c.catalogueId === catalogueId);
    if (existing) {
      id = existing.id;
      if (opts.assigned && !existing.assigned) {
        existing.assigned = true;
        existing.order = topOrder(s, profileId, entry.subject, existing.id);
      }
      return;
    }
    const now = Date.now();
    id = newId();
    added = true;
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
      assigned: opts.assigned,
      order: opts.assigned ? topOrder(s, profileId, entry.subject) : undefined,
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
  if (added && id) courseAct(profileId, id);
  return id;
}

// ── The path ───────────────────────────────────────────────────────────────────────────────────
// Learn shows each subject as an ordered path. A learner places courses with up/down buttons
// (Course.order); unplaced courses follow: a grown-up's first, then by the date they were added.

export const PATH_SUBJECTS: Subject[] = ["math", "science", "english", "other"];

/** Placed courses by their order, then courses from a grown-up, then the rest by date added. */
export function sortPath<T extends Pick<Course, "id" | "order" | "assigned" | "createdAt">>(courses: T[]): T[] {
  const place = (c: T) => c.order ?? Number.POSITIVE_INFINITY;
  return [...courses].sort(
    (a, b) => place(a) - place(b) || Number(Boolean(b.assigned)) - Number(Boolean(a.assigned)) || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

const inPath = (c: Course, profileId: string, subject: Subject) => c.profileId === profileId && c.subject === subject && c.status === "ready";

/** One subject's path for a learner (ready courses only; outlines still being built are not on it). */
export const pathOf = (s: StoreState, profileId: string, subject: Subject) => sortPath(s.courses.filter((c) => inPath(c, profileId, subject)));

/**
 * Moves a course one place up or down its subject's path and saves the whole path's order, so the
 * learner's choice holds when new courses arrive. Returns false at either end of the path.
 */
export function moveCourse(id: string, direction: "up" | "down"): boolean {
  let moved = false;
  update((s) => {
    const course = s.courses.find((c) => c.id === id);
    if (!course || course.status !== "ready") return;
    const path = sortPath(s.courses.filter((c) => inPath(c, course.profileId, course.subject)));
    const i = path.findIndex((c) => c.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= path.length) return;
    [path[i], path[j]] = [path[j], path[i]];
    path.forEach((c, k) => (c.order = k));
    moved = true;
  });
  return moved;
}

const gradeN = (g: Grade) => (g === "K" ? 0 : g === "adult" ? 10 : Number(g));
const topicOf = (id: string) => id.replace(/-es$/, "");

/**
 * The ready-made course to suggest next in a subject: not one the learner has (in either language),
 * within two grades, nearest first, a step up beating a step back.
 */
export function suggestNext(courses: Pick<Course, "catalogueId">[], subject: Subject, grade: Grade, locale: Locale): CatalogueEntry | null {
  const have = new Set(courses.flatMap((c) => (c.catalogueId ? [topicOf(c.catalogueId)] : [])));
  const g = gradeN(grade);
  const cost = (e: CatalogueEntry) => Math.abs(gradeN(e.grade) - g) * 2 + (gradeN(e.grade) < g ? 1 : 0) + (e.locale === locale ? 0 : 0.5);
  const pool = catalogueFor(grade, locale).filter((e) => e.subject === subject && !have.has(topicOf(e.id)) && Math.abs(gradeN(e.grade) - g) <= 2);
  return pool.sort((a, b) => cost(a) - cost(b))[0] ?? null;
}

/** Proved / practicing / total on a subject's skill map, straight from the statuses. Practice is never counted as proved. */
export function skillSummary(statuses: Statuses, subject: Subject) {
  const skills = skillsFor(subject);
  let proved = 0;
  let practicing = 0;
  for (const s of skills) {
    const state = statuses[s.id]?.state;
    if (state === "proved") proved++;
    else if (state && state !== "new") practicing++;
  }
  return { proved, practicing, total: skills.length };
}

// ── Origins ────────────────────────────────────────────────────────────────────────────────────

/**
 * Who made a course, as every surface labels it: written by people (the catalogue), built from real
 * sources (no AI), written by AI, or a template outline.
 */
export type Origin = "people" | "sources" | "ai" | "template";

export function courseOrigin(c: Pick<Course, "origin" | "ai" | "citations">): Origin {
  if (c.origin === "catalogue") return "people";
  if (c.ai) return "ai";
  return c.citations ? "sources" : "template";
}
