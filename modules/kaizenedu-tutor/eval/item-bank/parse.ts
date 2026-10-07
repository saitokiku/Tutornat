/**
 * Pure parsing and comparison helpers for the item-bank pipeline: defensive
 * JSON extraction, normalization of a generated item into the bank shape, and
 * the answer comparisons the double-solve stage relies on. No I/O, no model.
 */
import {
  BANDS,
  ITEM_TYPES,
  REPRESENTATIONS,
  type Band,
  type Candidate,
  type Cell,
  type ItemAnswer,
  type ItemOption,
  type ItemType,
  type Representation,
  type SkillGraph,
} from './types';

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

/** Pulls the first JSON object or array out of free text (code fences, prose, trailing commas). */
export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, '').trim();
  const starts = [stripped.indexOf('{'), stripped.indexOf('[')].filter((index) => index >= 0);
  if (starts.length === 0) return undefined;
  const start = Math.min(...starts);
  const closer = stripped[start] === '{' ? '}' : ']';
  let end = stripped.lastIndexOf(closer);
  while (end > start) {
    const slice = stripped.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      try {
        return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        end = stripped.lastIndexOf(closer, end - 1);
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Candidate normalization
// ---------------------------------------------------------------------------

const VISUAL_REFERENCE =
  /\b(see|shown|figure|diagram|picture|image|below|above|drawn|illustrat\w*)\b/i;
const MARKUP = /\\[a-zA-Z]+|\$\$|\*\*|`|<[a-z]+>|\|/;
const MAX_STEM_LENGTH = 700;
const MAX_NUMBER = 1000;

export type Normalized =
  | { ok: true; item: Candidate['item'] }
  | { ok: false; reason: string; detail?: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Numbers written as "3/4", "1 1/2", "0.75", or "75%" become numbers; anything else is undefined. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const parsed = parseNumbers(value);
  return parsed.length === 1 ? parsed[0] : undefined;
}

export function normalizeCandidateItem(
  raw: unknown,
  cell: Cell,
  graph: SkillGraph,
  _requestedType: ItemType,
): Normalized {
  const record = asRecord(raw);
  if (!record) return { ok: false, reason: 'not_an_object' };

  const type = asString(record.type) as ItemType | undefined;
  if (!type || !ITEM_TYPES.includes(type)) return { ok: false, reason: 'type_invalid' };

  const stem = asString(record.stem)?.replace(/\s+/g, ' ');
  if (!stem || stem.length < 8) return { ok: false, reason: 'stem_too_short' };
  if (stem.length > MAX_STEM_LENGTH) return { ok: false, reason: 'stem_too_long' };
  if (VISUAL_REFERENCE.test(stem)) {
    return {
      ok: false,
      reason: 'stem_refers_to_visual',
      detail: stem.match(VISUAL_REFERENCE)?.[0],
    };
  }
  if (MARKUP.test(stem)) return { ok: false, reason: 'stem_markup' };
  const big = stem
    .match(/\d[\d,]*/g)
    ?.some((token) => Number(token.replace(/,/g, '')) > MAX_NUMBER);
  if (big) return { ok: false, reason: 'numbers_too_big' };

  const bandRaw = asString(record.band) as Band | undefined;
  const band: Band = bandRaw && BANDS.includes(bandRaw) ? bandRaw : cell.band;
  const resolvedBand: Band = band === 'both' || band === cell.band ? band : cell.band;

  const representation: Representation = REPRESENTATIONS.includes(cell.representation)
    ? cell.representation
    : 'word';

  const rationale = asString(record.rationale);
  if (!rationale) return { ok: false, reason: 'rationale_missing' };

  const base = {
    skill: cell.skill,
    type,
    stem,
    representation,
    band: resolvedBand,
    rationale,
  };

  if (type === 'single' || type === 'multiple') {
    const optionsRaw = Array.isArray(record.options) ? record.options : undefined;
    if (!optionsRaw) return { ok: false, reason: 'options_missing' };
    const options: ItemOption[] = [];
    const tags = new Set(graph.misconception_tags);
    const seen = new Set<string>();
    for (const optionRaw of optionsRaw) {
      const option = asRecord(optionRaw);
      const text = asString(option?.text)?.replace(/\s+/g, ' ');
      if (!option || !text) return { ok: false, reason: 'option_text_empty' };
      if (typeof option.correct !== 'boolean')
        return { ok: false, reason: 'option_correct_not_boolean' };
      const normalizedText = normalizeAnswerText(text);
      if (seen.has(normalizedText)) return { ok: false, reason: 'duplicate_option_text' };
      seen.add(normalizedText);
      if (option.correct) {
        options.push({ text, correct: true });
      } else {
        const tag = asString(option.misconception);
        if (!tag) return { ok: false, reason: 'distractor_untagged' };
        if (!tags.has(tag)) return { ok: false, reason: 'bad_tag', detail: tag };
        options.push({ text, correct: false, misconception: tag });
      }
    }
    if (options.length < 3 || options.length > 6) return { ok: false, reason: 'options_count' };
    const correct = options.filter((option) => option.correct).length;
    if (type === 'single' && correct !== 1) return { ok: false, reason: 'single_correct_count' };
    if (type === 'multiple' && correct < 2) return { ok: false, reason: 'multiple_correct_count' };
    if (type === 'multiple' && correct === options.length) {
      return { ok: false, reason: 'multiple_no_distractor' };
    }
    return { ok: true, item: { ...base, options } };
  }

  const answerRaw = asRecord(record.answer);
  if (!answerRaw) return { ok: false, reason: 'answer_missing' };
  const acceptRaw = Array.isArray(answerRaw.accept) ? answerRaw.accept : [];
  const accept = [...new Set(acceptRaw.map(asString).filter((form): form is string => !!form))];
  const units = asString(answerRaw.units);

  if (type === 'numeric') {
    const value = toNumber(answerRaw.value);
    if (value === undefined) return { ok: false, reason: 'numeric_value_not_number' };
    const toleranceRaw = answerRaw.tolerance;
    const tolerance =
      typeof toleranceRaw === 'number' && Number.isFinite(toleranceRaw) && toleranceRaw >= 0
        ? toleranceRaw
        : Number.isInteger(value)
          ? 0
          : 0.001;
    const answer: ItemAnswer = { value, tolerance };
    if (units && !/^(none|null|n\/a)$/i.test(units)) answer.units = units;
    const originalForm =
      typeof answerRaw.value === 'string' ? answerRaw.value.trim() : String(value);
    answer.accept = [...new Set([originalForm, String(value), ...accept])];
    return { ok: true, item: { ...base, answer } };
  }

  const value =
    asString(answerRaw.value) ??
    (typeof answerRaw.value === 'number' ? String(answerRaw.value) : undefined);
  if (!value) return { ok: false, reason: 'short_value_missing' };
  if (value.split(/\s+/).length > 6) return { ok: false, reason: 'short_value_too_long' };
  const answer: ItemAnswer = { value };
  if (units && !/^(none|null|n\/a)$/i.test(units)) answer.units = units;
  if (accept.length > 0) answer.accept = accept.filter((form) => form !== value);
  return { ok: true, item: { ...base, answer } };
}

// ---------------------------------------------------------------------------
// Answer comparison
// ---------------------------------------------------------------------------

export function normalizeAnswerText(text: string): string {
  return text
    .toLowerCase()
    .replace(/−/g, '-')
    .replace(/[“”"']/g, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MIXED_NUMBER = /(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)/;
const FRACTION = /(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/;
const PERCENT = /(-?\d+(?:\.\d+)?)\s*%/;
const PLAIN = /-?\d+(?:\.\d+)?/g;

/**
 * Every number a short answer could mean: "1 1/2" -> 1.5, "3/4" -> 0.75,
 * "75%" -> 75 and 0.75, "$2.50" -> 2.5, "0.75 cups" -> 0.75. A mixed number
 * or a fraction is consumed whole so "1 1/2" never also yields 0.5.
 */
export function parseNumbers(text: string): number[] {
  let rest = text
    .replace(/[$€£,]/g, '')
    .replace(/−/g, '-')
    .replace(/½/g, ' 1/2 ');
  const out: number[] = [];
  const push = (value: number) => {
    if (Number.isFinite(value) && !out.includes(value)) out.push(value);
  };
  let match: RegExpMatchArray | null;
  while ((match = rest.match(MIXED_NUMBER))) {
    const sign = match[1] === '-' ? -1 : 1;
    const den = Number(match[4]);
    if (den !== 0) push(sign * (Number(match[2]) + Number(match[3]) / den));
    rest = rest.replace(match[0], ' ');
  }
  while ((match = rest.match(FRACTION))) {
    const den = Number(match[2]);
    if (den !== 0) push(Number(match[1]) / den);
    rest = rest.replace(match[0], ' ');
  }
  while ((match = rest.match(PERCENT))) {
    const value = Number(match[1]);
    push(value);
    push(value / 100);
    rest = rest.replace(match[0], ' ');
  }
  for (const token of rest.match(PLAIN) ?? []) push(Number(token));
  return out;
}

export function numericAgrees(
  answer: ItemAnswer,
  solverText: string,
): { agrees: boolean; detail: string } {
  const value = typeof answer.value === 'number' ? answer.value : toNumber(answer.value);
  const tolerance = answer.tolerance ?? 0;
  const parsed = parseNumbers(solverText);
  if (value !== undefined) {
    const hit = parsed.find((candidate) => Math.abs(candidate - value) <= tolerance + 1e-9);
    if (hit !== undefined)
      return { agrees: true, detail: `parsed ${hit} within ${tolerance} of ${value}` };
  }
  const normalized = normalizeAnswerText(solverText);
  const forms = (answer.accept ?? []).map(normalizeAnswerText);
  if (forms.includes(normalized))
    return { agrees: true, detail: `matched accepted form "${normalized}"` };
  return {
    agrees: false,
    detail: `parsed [${parsed.join(', ')}] vs ${String(answer.value)}±${tolerance}`,
  };
}

const LETTERS = 'ABCDEFGH';

/**
 * Option indices named in a solver reply: "B", "B. 3/4", "A, C", "A and C",
 * "Options A and C". Letters are read from the start of the first line; a
 * period or bracket right after a letter ends the list so "B. A pizza" is B.
 */
export function parseChoiceLetters(text: string, optionCount: number): number[] {
  const first = text.trim().split('\n')[0]?.trim() ?? '';
  const allowed = LETTERS.slice(0, optionCount);
  const picked: number[] = [];
  let i = 0;
  const skipSpaces = () => {
    while (i < first.length && first[i] === ' ') i++;
  };
  skipSpaces();
  while (i < first.length) {
    const char = first[i];
    const next = first[i + 1] ?? '';
    if (allowed.includes(char) && !/[A-Za-z0-9]/.test(next)) {
      const index = allowed.indexOf(char);
      if (!picked.includes(index)) picked.push(index);
      i++;
      skipSpaces();
      if (first[i] === ',' || first[i] === '&' || first[i] === '/') {
        i++;
        skipSpaces();
        continue;
      }
      if (first.slice(i, i + 4).toLowerCase() === 'and ') {
        i += 4;
        skipSpaces();
        continue;
      }
      break;
    }
    break;
  }
  if (picked.length > 0) return picked.sort((a, b) => a - b);
  for (const match of first.matchAll(/(?:^|[\s,;(&])([A-H])(?=$|[\s,;.)&:])/g)) {
    const index = allowed.indexOf(match[1]);
    if (index >= 0 && !picked.includes(index)) picked.push(index);
  }
  return picked.sort((a, b) => a - b);
}

export function choiceAgrees(
  options: ItemOption[],
  type: 'single' | 'multiple',
  solverText: string,
): { agrees: boolean; detail: string } {
  const correct = options
    .map((option, index) => (option.correct ? index : -1))
    .filter((index) => index >= 0);
  let picked = parseChoiceLetters(solverText, options.length);
  if (picked.length === 0) {
    // The solver echoed an option's text instead of its letter.
    const normalized = normalizeAnswerText(solverText);
    const byText = options
      .map((option, index) => (normalizeAnswerText(option.text) === normalized ? index : -1))
      .filter((index) => index >= 0);
    if (byText.length === 1) picked = byText;
    else if (type === 'single') {
      const numbers = parseNumbers(solverText);
      if (numbers.length === 1) {
        const byNumber = options
          .map((option, index) => {
            const optionNumbers = parseNumbers(option.text);
            return optionNumbers.length === 1 && Math.abs(optionNumbers[0] - numbers[0]) < 1e-9
              ? index
              : -1;
          })
          .filter((index) => index >= 0);
        if (byNumber.length === 1) picked = byNumber;
      }
    }
  }
  const pickedLetters = picked.map((index) => LETTERS[index]).join(',') || '(none)';
  const correctLetters = correct.map((index) => LETTERS[index]).join(',');
  const agrees =
    picked.length === correct.length &&
    picked.every((index, position) => index === correct[position]);
  return { agrees, detail: `picked ${pickedLetters}, key ${correctLetters}` };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function bigrams(text: string): Set<string> {
  const words = normalizeAnswerText(text)
    .replace(/[^a-z0-9/ ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 1 < words.length; i++) set.add(`${words[i]} ${words[i + 1]}`);
  return set;
}

/** Dice coefficient over word bigrams: 1 for identical stems, 0 for nothing shared. */
export function stemSimilarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0)
    return normalizeAnswerText(a) === normalizeAnswerText(b) ? 1 : 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared++;
  return (2 * shared) / (left.size + right.size);
}
