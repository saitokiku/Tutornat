/**
 * Types for the item-bank pipeline (spec §5.8, R12, content-15).
 *
 * `BankItem` mirrors `.claude/skills/pedagogy-fractions/references/item-schema.json`
 * field for field; it is the only shape that ships (`lib/tutor/content/item-bank.json`).
 * Everything else is pipeline state that lives under `eval/item-bank/.cache/`.
 */

export const SKILL_IDS = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const ITEM_TYPES = ['single', 'multiple', 'numeric', 'short'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const REPRESENTATIONS = ['bar', 'number_line', 'set', 'symbolic', 'word'] as const;
export type Representation = (typeof REPRESENTATIONS)[number];

/** Short form used inside item ids: `F3-nl-0012`. */
export const REPRESENTATION_ABBREVIATION: Record<Representation, string> = {
  bar: 'bar',
  number_line: 'nl',
  set: 'set',
  symbolic: 'sym',
  word: 'word',
};

export const BANDS = ['9-12', '13-17', 'both'] as const;
export type Band = (typeof BANDS)[number];
export type RequestedBand = Exclude<Band, 'both'>;

export interface ItemOption {
  text: string;
  correct: boolean;
  /** Required on every distractor: a tag from the graph's `misconception_tags`. */
  misconception?: string;
}

export interface ItemAnswer {
  /** A number for `numeric` items, a string for `short` items. */
  value: number | string;
  tolerance?: number;
  units?: string;
  /** Equivalent forms a learner may say or type ("3/4", "0.75", "six eighths"). */
  accept?: string[];
}

export interface BankItem {
  id: string;
  skill: SkillId;
  type: ItemType;
  stem: string;
  representation: Representation;
  band: Band;
  options?: ItemOption[];
  answer?: ItemAnswer;
  rationale?: string;
  source: string;
  /** Set by a human reviewer only; absent until then (schema types both as strings). */
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface SkillGraph {
  slice: string;
  grades: string;
  prerequisite_checkins: string[];
  misconception_tags: string[];
  skills: { id: SkillId; name: string; prereqs: SkillId[]; tags: string[] }[];
  item_bank: { min_items_per_skill: number; min_total: number };
}

/** One generator request: a skill × band × representation with the item types to write. */
export interface Cell {
  skill: SkillId;
  band: RequestedBand;
  representation: Representation;
  types: ItemType[];
  /** Position within the skill's cell sequence (0-based); fixes the order of generation. */
  index: number;
}

/** A parsed, structurally valid generated item that has not been solved yet. */
export interface Candidate {
  /** Stable pipeline key, e.g. `F3-number_line-9-12-2`; the shipped id is assigned at packaging. */
  key: string;
  cell: { skill: SkillId; band: RequestedBand; representation: Representation; index: number };
  requestedType: ItemType;
  item: Omit<BankItem, 'id' | 'source' | 'reviewed_by' | 'reviewed_at'>;
  generatedBy: string;
}

export interface GenerationRecord {
  cell: Cell;
  attempts: number;
  ok: boolean;
  error?: string;
  /** Raw items returned by the model, before normalization. */
  returned: number;
  /** Items that survived normalization. */
  kept: number;
  /** Items dropped at parse time, by reason. */
  dropped: Record<string, number>;
}

export interface SolverPass {
  pass: number;
  answer: string;
  agrees: boolean;
  /** How the agreement was decided (parsed number, picked letters, judge verdict). */
  detail: string;
}

export interface SolveResult {
  key: string;
  passes: SolverPass[];
  kept: boolean;
  reason?: string;
}

export interface ValidationResult {
  key: string;
  problems: string[];
}

export interface UsageRecord {
  stage: string;
  key: string;
  attempt: number;
  /** Hash of the prompt, so a replayed cache hit can be told from a fresh call on a changed prompt. */
  promptSha: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  ms: number;
  cached: boolean;
  at: string;
}

export interface RunMeta {
  date: string;
  generatorRequested: string;
  generatorUsed: string;
  generatorFallbackReason?: string;
  solverRequested: string;
  solverUsed: string;
  solverFallbackReason?: string;
  itemsPerCell: number;
  maxPerSkill: number;
}
