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
  /** A grown-up's corrections to the derived teaching profile ("How we teach {name}"). */
  teaching?: TeachingPrefs;
};

/** What a grown-up knows about how this learner learns. Overrides what the evidence suggests. */
export type TeachingPrefs = {
  /** The kind of picture that helps most. */
  representation?: "pictures" | "number-line" | "blocks" | "words";
  /** Lead with a hint or with a worked example when they're stuck. */
  leadWith?: "hint" | "example";
  /** Free-text note for the tutor ("loves drawing; gets anxious with timers"). Never sent with the name. */
  note?: string;
};

export type SourceItem = { id: string; name: string; kind: "pdf" | "image" | "doc" | "text"; size: number };

export type Block =
  | { type: "text"; text: string }
  | { type: "points"; items: string[] }
  | { type: "visual"; visual: Visual; alt: string };

/** Static teaching pictures drawn in SVG (not text rendered into an image). Shared by lessons, practice and the tutor. */
export type Visual =
  /** `sizes`: relative part widths, for a whole cut into parts that are not equal (default: equal parts). */
  | { kind: "fraction"; parts: number; shaded: number; sizes?: number[] }
  /** `span`: a thing laid along the line from one value to another (a ribbon on a ruler). */
  | { kind: "number-line"; min: number; max: number; marks: number[]; denominator?: number; marker?: number; span?: [number, number] }
  | { kind: "particles"; state: "solid" | "liquid" | "gas" }
  | { kind: "moon"; phase: number } // 0 = new, 0.5 = full, 0..1
  | { kind: "line-graph"; points: [number, number][]; xLabel: string; yLabel: string }
  /**
   * Groups of counters in tidy rows of five; `crossed` counters in the last group are taken away.
   * `labels`: a name or picture under each group, so a question names a group, never "left" or "right".
   */
  | { kind: "dots"; groups: number[]; crossed?: number; labels?: string[] }
  | { kind: "ten-frame"; filled: number; frames?: 1 | 2 }
  | { kind: "base-ten"; hundreds?: number; tens: number; ones: number }
  | { kind: "clock"; h: number; m: number }
  | { kind: "array"; rows: number; cols: number }
  /** Kumon-style vertical arithmetic with the answer row left empty. */
  | { kind: "column"; op: "+" | "−" | "×"; top: number; bottom: number }
  /** `splits` cuts it into parts (an area model): each list adds up to its side, and each part shows its area. */
  | { kind: "rect"; w: number; h: number; unit: string; splits?: { w: number[]; h: number[] } }
  | { kind: "triangle"; base: number; height: number; unit: string }
  | { kind: "circle"; r: number; show: "r" | "d"; unit: string }
  | { kind: "right-triangle"; a: number | null; b: number | null; c: number | null; unit: string }
  | { kind: "prism"; l: number; w: number; h: number; unit: string }
  /** `line` draws the line through the first two points; `firstQuadrant` draws only x ≥ 0, y ≥ 0 (scatter plots). */
  | { kind: "coord"; points: [number, number][]; line?: boolean; firstQuadrant?: boolean }
  /** Bars against scale lines every `scale` (from 0); a bar may end between two lines. `unit` labels the scale. */
  | { kind: "bar-graph"; labels: string[]; values: number[]; scale: number; unit: string }
  /** A line plot: a number line in 1/`denominator` steps with one X stacked above it per value. `unit` labels the line. */
  | { kind: "line-plot"; min: number; max: number; denominator: number; values: number[]; unit: string };

export type Widget =
  | { kind: "fraction-bar"; parts: number; shaded: number; target?: { parts: number; shaded: number } }
  /** denominator: label positions as fractions (e.g. 4 → 0, 1/4, 2/4…) instead of decimals. */
  | { kind: "number-line"; min: number; max: number; step: number; start: number; target?: number; denominator?: number }
  | { kind: "states-of-matter"; startC: number; target?: "solid" | "liquid" | "gas" }
  | { kind: "moon-phases"; target?: number } // target = day 0..29
  | { kind: "sorter"; categories: string[]; items: { id: string; text: string; answer: number }[] }
  /** Multiplication as area: drag/tap the sides to rows × cols; target = the product or the exact shape. */
  | { kind: "area-model"; rows: number; cols: number; target?: { rows: number; cols: number } }
  /** Build a number from hundreds, tens and ones blocks. */
  | { kind: "place-value"; target: number; max?: number }
  /** Set the hands to a time. */
  | { kind: "clock"; h: number; m: number; target?: { h: number; m: number } }
  /** A balance for ax + b = c: take the same from both sides until x stands alone. */
  | { kind: "balance"; xCount: number; leftUnits: number; rightUnits: number }
  /** Plot points on a grid. */
  | { kind: "coordinate"; min: number; max: number; targets: [number, number][] }
  /** Put steps in order (life cycles, story events, how-to steps). `items` are given in the right order. */
  | { kind: "sequence"; items: { id: string; text: string }[] }
  /** Tap words to build a sentence; any of `answers` (word orders) is right. */
  | { kind: "sentence-builder"; words: string[]; answers: string[][] };

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

/** `practice`: skill-map skills that practice what the lesson teaches, chosen by its author; the course page offers them. */
export type Lesson = { id: string; title: string; summary: string; minutes: number; scenes: Scene[]; practice?: string[] };

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
  /** Written by a model (and passed the quality gates). Shown as "Written by AI" everywhere. */
  ai?: boolean;
  /** Built from real sources (Wikipedia, dictionary, catalogue lessons) without AI; shown with citations. */
  citations?: { title: string; url: string; source: string }[];
  /** Position in the learner's path for its subject (lower first). Unset = by date added. */
  order?: number;
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
  /** A lesson answer: the question it answers (learning/evidence.ts attemptIdentity), and what was picked. */
  attemptId?: string;
  response?: string;
  /** The choice picked on a multiple-choice question, so a reload shows it picked. */
  choice?: number;
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
  interests?: string[];
  working?: string[];
};

export type GenerationEvent =
  | { type: "step"; step: "reading" | "planning" | "writing" }
  | { type: "mode"; ai: boolean }
  | { type: "lesson"; lesson: Lesson }
  | { type: "skipped"; title: string }
  /** error "safety": the server's screen stopped the request; `flag` and `message` are its kind and fixed reply. */
  | { type: "error"; error: string; flag?: "crisis" | "abuse" | "offLimits"; message?: string }
  | { type: "done" };
