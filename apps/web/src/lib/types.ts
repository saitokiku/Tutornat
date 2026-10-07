// Domain model. Mirrors OpenMAIC so the later integration is a mapping, not a rewrite:
// a Course groups Lessons; a Lesson ≈ an OpenMAIC Stage; Scenes map to slide | quiz | interactive | pbl.

export type Locale = "en" | "es";
export type Grade = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "adult";
export type Subject = "math" | "science" | "english" | "other";
export type CourseLength = "lesson" | "short" | "full";

export const GRADES: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "adult"];
export const SUBJECTS: Subject[] = ["math", "science", "english", "other"];

export type Account = {
  id: string;
  email: string;
  displayName: string;
  salt: string;
  passwordHash: string;
  createdAt: number;
  goals?: Goal[];
};

/** What a family wants from KaizenEDU, asked once at setup. Changes emphasis, never access. */
export type Goal = "help" | "daily" | "homeschool" | "organized";
export const GOALS: Goal[] = ["help", "daily", "homeschool", "organized"];

export type LearnerSettings = {
  /** Daily practice budget the plan fills. */
  dailyMinutes: number;
  /** Subjects that get a daily set. */
  subjects: Subject[];
  /** Show time against pace at the end of a set. */
  timer: boolean;
  /** A grown-up allowed talking to the tutor with the microphone (browser speech recognition). */
  voiceInput: boolean;
};

export type Profile = {
  id: string;
  accountId: string;
  nickname: string;
  grade: Grade;
  locale: Locale;
  color: string;
  createdAt: number;
  settings?: Partial<LearnerSettings>;
  /** Where each subject's map starts (from placement, or a grown-up's choice). */
  start?: Partial<Record<Subject, string>>;
  /** Things the learner likes, used to theme generated lessons and word problems. Never sent with the name. */
  interests?: string[];
};

export type SourceItem = { id: string; name: string; kind: "pdf" | "image" | "doc" | "text"; size: number };

export type Block =
  | { type: "text"; text: string }
  | { type: "points"; items: string[] }
  | { type: "visual"; visual: Visual; alt: string };

/** Static teaching pictures drawn in SVG (not text rendered into an image). Shared by lessons, practice and the tutor. */
export type Visual =
  | { kind: "fraction"; parts: number; shaded: number }
  | { kind: "number-line"; min: number; max: number; marks: number[]; denominator?: number; marker?: number }
  | { kind: "particles"; state: "solid" | "liquid" | "gas" }
  | { kind: "moon"; phase: number } // 0 = new, 0.5 = full, 0..1
  | { kind: "line-graph"; points: [number, number][]; xLabel: string; yLabel: string }
  /** Groups of counters in tidy rows of five; `crossed` counters in the last group are taken away. */
  | { kind: "dots"; groups: number[]; crossed?: number }
  | { kind: "ten-frame"; filled: number; frames?: 1 | 2 }
  | { kind: "base-ten"; hundreds?: number; tens: number; ones: number }
  | { kind: "clock"; h: number; m: number }
  | { kind: "array"; rows: number; cols: number }
  /** Kumon-style vertical arithmetic with the answer row left empty. */
  | { kind: "column"; op: "+" | "−" | "×"; top: number; bottom: number }
  | { kind: "rect"; w: number; h: number; unit: string }
  | { kind: "triangle"; base: number; height: number; unit: string }
  | { kind: "circle"; r: number; show: "r" | "d"; unit: string }
  | { kind: "right-triangle"; a: number | null; b: number | null; c: number | null; unit: string }
  | { kind: "prism"; l: number; w: number; h: number; unit: string }
  | { kind: "coord"; points: [number, number][]; line?: boolean };

export type Widget =
  | { kind: "fraction-bar"; parts: number; shaded: number; target?: { parts: number; shaded: number } }
  /** denominator: label positions as fractions (e.g. 4 → 0, 1/4, 2/4…) instead of decimals. */
  | { kind: "number-line"; min: number; max: number; step: number; start: number; target?: number; denominator?: number }
  | { kind: "states-of-matter"; startC: number; target?: "solid" | "liquid" | "gas" }
  | { kind: "moon-phases"; target?: number } // target = day 0..29
  | { kind: "sorter"; categories: string[]; items: { id: string; text: string; answer: number }[] };

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  hint: string;
  explain: string;
};

export type SlideScene = { id: string; kind: "slide"; title: string; blocks: Block[] };
export type QuizScene = { id: string; kind: "quiz"; title: string; questions: QuizQuestion[] };
export type InteractiveScene = { id: string; kind: "interactive"; title: string; prompt: string; widget: Widget };
export type ProjectScene = { id: string; kind: "project"; title: string; brief: string; steps: string[] };
export type Scene = SlideScene | QuizScene | InteractiveScene | ProjectScene;

export type Lesson = { id: string; title: string; summary: string; minutes: number; scenes: Scene[] };

export type Course = {
  id: string;
  profileId: string;
  title: string;
  goal: string;
  subject: Subject;
  grade: Grade;
  locale: Locale;
  origin: "generated" | "catalogue";
  catalogueId?: string;
  status: "outlining" | "ready";
  length: CourseLength;
  sources: SourceItem[];
  lessons: Lesson[];
  /** Added for the learner by a grown-up from the Family view. */
  assigned?: boolean;
  /** True when the outline came from the demo template generator rather than a model. */
  template: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ActivityEvent = {
  id: string;
  profileId: string;
  at: number;
  type: "course_added" | "lesson_started" | "quiz_answered" | "lesson_completed";
  courseId: string;
  lessonId?: string;
  sceneId?: string;
  correct?: boolean;
  assisted?: boolean;
  seconds?: number;
};

/** A note for the learner's grown-ups: written by a grown-up, or left by the tutor (`from: "tutor"`). */
export type ParentNote = { id: string; profileId: string; at: number; text: string; from?: "tutor" | "safety" };

export type GenerationRequest = {
  goal: string;
  grade: Grade;
  subject: Subject;
  length: CourseLength;
  locale: Locale;
  sources: SourceItem[];
};

export type GenerationEvent =
  | { type: "step"; step: "reading" | "planning" | "writing" }
  | { type: "lesson"; lesson: Lesson }
  | { type: "done" };
