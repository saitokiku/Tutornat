/**
 * Prompts for the item-bank pipeline. The generator prompt encodes the check
 * item rules from the `pedagogy-fractions` skill (spec §5.8): one skill per
 * item, a misconception tag on every distractor, stems that read aloud, small
 * numbers, tolerance and accepted forms on numeric answers. The solver prompts
 * see only what a learner would see: the stem and the options, never the key
 * or the rationale.
 */
import type { BankItem, Cell, ItemType, Representation, SkillGraph, SkillId } from './types';

/** What each skill covers and where it stops, so items fit exactly one skill. */
export const SKILL_FOCUS: Record<SkillId, string> = {
  F1: 'naming the fraction of a whole that is shaded, eaten, or used; a unit fraction 1/n as one of n EQUAL parts; the numerator counts parts and the denominator names the size of the parts; parts must be equal; which of two unit fractions is the bigger piece. Not on a number line (F2), no equivalent fractions (F3), no operations.',
  F2: 'locating and reading fractions on a number line from 0 to 1 and beyond 1; what the tick marks between whole numbers mean; a fraction as one number and a distance from 0; which fraction a point shows. Not equivalence (F3) and no operations.',
  F3: 'recognizing and generating equivalent fractions by multiplying or dividing numerator and denominator by the same number; why 2/4 and 1/2 are the same amount (same length of bar, same point on the line); finding the missing number in 3/4 = ?/12. Not ordering unrelated fractions (F4) and not simplifying to lowest terms as the goal (F5).',
  F4: 'comparing and ordering fractions using a common denominator, a common numerator, or the benchmarks 1/2 and 1; deciding which of two fractions is larger and why; ordering three fractions. No adding or subtracting.',
  F5: 'writing a fraction in lowest terms by dividing numerator and denominator by their greatest common factor; recognizing whether a fraction is already in lowest terms; finding the GCF. Not comparing (F4).',
  F6: 'converting a mixed number to an improper fraction and back; reading a mixed number as a whole plus a fraction; how many wholes are in an improper fraction. No adding or subtracting of two fractions.',
  F7: 'adding and subtracting fractions with the SAME denominator, including results above 1 and word contexts; keeping the denominator; the answer may be left unsimplified or simplified. Never unlike denominators (F8).',
  F8: 'adding and subtracting fractions with DIFFERENT denominators using a common denominator (the LCD); estimating first (more or less than a half or a whole); word contexts. Not multiplication or division.',
  F9: 'multiplying a fraction by a whole number and a fraction by a fraction; a fraction of a set (3/4 of 12 marbles); the area model; why the product of two proper fractions is smaller than either. No division.',
  F10: 'dividing with fractions: a whole number divided by a fraction, a fraction divided by a fraction; the measurement meaning (how many halves fit in 3); why multiplying by the reciprocal works; word contexts about equal shares or how many servings. No multiplication-only items.',
  F11: 'converting between fractions, decimals, and percents (halves, quarters, fifths, tenths, hundredths); comparing decimals by place value (0.3 versus 0.25); money and percents of small amounts. Not ratios (F12).',
  F12: 'ratios and rates: writing a ratio from a situation, equivalent ratios, a unit rate (price per item, miles per hour), scaling a recipe, completing a ratio table, a simple proportion with one unknown. Bridge to pre-algebra; no cross-multiplication tricks without meaning.',
};

const MISCONCEPTION_GUIDE: Record<string, string> = {
  denominator_magnitude:
    'believes a bigger denominator means a bigger fraction (thinks 1/8 is bigger than 1/3, or 3/10 is bigger than 3/5).',
  add_across:
    'adds or subtracts numerators and denominators separately (1/2 + 1/3 = 2/5; 3/4 - 1/4 = 2/0 or 2/8).',
  whole_number_bias:
    'treats the numerator and denominator as two separate whole numbers: reads 3/4 as "3 and 4", puts 3/4 at 3 or at 4 on a number line, thinks 7/8 is bigger than 2/3 only because 7 and 8 are bigger, or counts tick marks instead of intervals.',
  equivalence_as_change:
    'believes multiplying or dividing the top and bottom by the same number changes the amount (thinks 2/4 is more than 1/2 because the numbers are bigger; scales only the numerator or only the denominator).',
  division_makes_smaller:
    'believes dividing always gives a smaller result (expects 3 divided by 1/2 to be less than 3; divides by the fraction the wrong way round; multiplies instead of dividing).',
  decimal_length:
    'judges a decimal by its number of digits (thinks 0.25 is bigger than 0.3 because it is longer, or that 0.7 equals 0.07).',
  computation:
    'a pure arithmetic slip with no conceptual cause (a wrong times table, an off-by-one count). Use only when no other tag fits.',
};

const REPRESENTATION_GUIDE: Record<Representation, string> = {
  bar: 'a bar, strip, or shape divided into EQUAL parts (a chocolate bar, a strip of paper, a pizza, a garden). Describe it in words: "A chocolate bar is broken into 8 equal pieces. Maya eats 3 of them." Never ask the learner to look at a picture.',
  number_line:
    'a number line described in words. Always give the endpoints and how the space between whole numbers is divided: "On a number line from 0 to 1, the space is cut into 4 equal parts. A dot sits on the third mark after 0." Counting language must be unambiguous (marks after 0, not "the third line").',
  set: 'a group of separate objects (marbles, stickers, students, apples): "A bag holds 12 marbles, and 4 of them are red."',
  symbolic:
    'fractions, decimals, or numbers only, with no story: "Which fraction equals 6/8?" or "What is 2/5 + 1/5?"',
  word: 'a short real-life word problem (recipes, money, distance, time, sharing food, sports) in at most three sentences, where the learner has to decide what to do with the numbers.',
};

const TYPE_GUIDE: Record<ItemType, string> = {
  single:
    'exactly 4 options, exactly one correct. Every wrong option carries the tag of the misconception that leads to it, and it must be the answer that misconception actually produces when worked out precisely. Options are short: a number, a fraction, or a few words.',
  multiple:
    '4 or 5 options with at least two correct. The stem must say "Choose every answer that is correct." Every wrong option carries a misconception tag.',
  numeric:
    'the learner says or types one number. answer.value is a NUMBER written as a decimal (3/4 becomes 0.75); answer.tolerance is 0 for whole numbers, 0.001 for fractions with a terminating decimal, and 0.01 for repeating decimals; answer.units is the unit word when there is one ("cups", "dollars", "%") or null; answer.accept lists every correct form a learner might say ("3/4", "0.75", "6/8", "three fourths"). No options.',
  short:
    'a short answer in words or symbols where a choice item would give the answer away (a fraction that equals another, a comparison sign, a ratio, the name of a fraction). answer.value is the canonical answer as a string of at most five words; answer.accept lists equivalent phrasings and forms. No options.',
};

export function buildGeneratorSystemPrompt(graph: SkillGraph): string {
  const skills = graph.skills
    .map(
      (skill) =>
        `${skill.id} ${skill.name} (prerequisites: ${skill.prereqs.length ? skill.prereqs.join(', ') : 'none'})`,
    )
    .join('\n');
  const tags = graph.misconception_tags
    .map((tag) => `${tag}: ${MISCONCEPTION_GUIDE[tag] ?? 'a misconception from the skill graph.'}`)
    .join('\n');
  const representations = (Object.keys(REPRESENTATION_GUIDE) as Representation[])
    .map((key) => `${key}: ${REPRESENTATION_GUIDE[key]}`)
    .join('\n');
  const types = (Object.keys(TYPE_GUIDE) as ItemType[])
    .map((key) => `${key}: ${TYPE_GUIDE[key]}`)
    .join('\n');

  return `You write check items for a voice-first one-to-one math tutor for learners aged 9 to 17. The tutor SPEAKS every stem aloud, may write it on a whiteboard, and grades the answer automatically. Items feed a diagnostic that places a learner in at most four items, so every wrong answer must tell the tutor WHY the learner got it wrong.

## The skill graph (fractions to pre-algebra, grades 4 to 8)
${skills}

An item tests exactly ONE skill: the target skill named in the request. It may lean on that skill's prerequisites, never on a later skill.

## Misconception tags
${tags}

## Representations
${representations}

## Rules for every item
1. Spoken text. Plain text only: no LaTeX or backslash commands, no markdown, no bullet lists, no tables, no emoji. Write fractions as 3/4 and mixed numbers as 2 1/2. Money may be written as $2.50.
2. Nothing to look at. Never write "see", "shown", "figure", "diagram", "picture", "image", or "below"; describe everything a learner needs in words.
3. Small numbers: denominators up to 12 (up to 100 only for percents and hundredths), amounts a learner can work out in their head or with a quick pencil sketch. No number above 1000.
4. One question per item with one answer a careful teacher would accept without argument. Check the arithmetic twice before you write the key.
5. No trick wording, no negative phrasing ("which is NOT"), no "all of the above", no two options that mean the same thing.
6. Band register. 9-12: short sentences, familiar objects, nothing beyond grade 6. 13-17: percents, rates, unit conversions, and a more direct register are fine. Mark band "both" only when the exact wording suits a 9-year-old and a 15-year-old alike.
7. Every item ends with a rationale of one or two sentences that a tutor could say to explain the key.
8. Every option, answer, and stem must be different from the others in the same request and from the items listed as already written.

## Item types
${types}

## Output
Return ONLY a JSON object with this exact shape, no prose and no code fences:
{"items":[
 {"type":"single","band":"9-12","stem":"...","options":[{"text":"...","correct":true},{"text":"...","correct":false,"misconception":"add_across"},{"text":"...","correct":false,"misconception":"whole_number_bias"},{"text":"...","correct":false,"misconception":"computation"}],"answer":null,"rationale":"..."},
 {"type":"numeric","band":"13-17","stem":"...","options":null,"answer":{"value":0.75,"tolerance":0.001,"units":null,"accept":["3/4","0.75","six eighths"]},"rationale":"..."}
]}`;
}

export const BAND_LABEL: Record<Cell['band'], string> = {
  '9-12': '9-12 (ages 9 to 12, grades 4 to 6)',
  '13-17': '13-17 (ages 13 to 17, grades 7 to 9, often catching up on fractions)',
};

export function buildGeneratorUserPrompt(
  graph: SkillGraph,
  cell: Cell,
  alreadyWritten: string[],
): string {
  const skill = graph.skills.find((entry) => entry.id === cell.skill);
  const prereqs = skill?.prereqs.length
    ? skill.prereqs
        .map((id) => `${id} ${graph.skills.find((entry) => entry.id === id)?.name ?? ''}`)
        .join('; ')
    : 'none';
  const order = cell.types.map((type, index) => `item ${index + 1} is type ${type}`).join('; ');
  const lines = [
    `Target skill: ${cell.skill} ${skill?.name ?? ''}.`,
    `Skill focus: ${SKILL_FOCUS[cell.skill]}`,
    `Prerequisites the item may lean on: ${prereqs}.`,
    `Misconception tags most relevant to this skill: ${skill?.tags.join(', ') ?? ''} (use another tag only when it genuinely produces the wrong option; use computation only for a pure slip).`,
    `Band: ${BAND_LABEL[cell.band]}.`,
    `Representation: ${cell.representation}.`,
    `Write exactly ${cell.types.length} items, in this order: ${order}.`,
  ];
  if (alreadyWritten.length > 0) {
    lines.push(
      'Already written for this skill (use different situations, objects, and numbers):',
      ...alreadyWritten.map((stem) => `- ${stem}`),
    );
  }
  return lines.join('\n');
}

export const SOLVER_SYSTEM_PROMPT =
  'You are a careful math teacher checking an answer key. Solve the problem yourself, exactly as a strong student would. Reply with the final answer only, in the requested format, and nothing else.';

const OPTION_LETTERS = 'ABCDEFGH';

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

/** The solver sees the stem and the options only; the key and rationale never leave the pipeline. */
export function buildSolverPrompt(item: Pick<BankItem, 'type' | 'stem' | 'options'>): string {
  switch (item.type) {
    case 'single': {
      const options = (item.options ?? [])
        .map((option, index) => `${optionLetter(index)}. ${option.text}`)
        .join('\n');
      return `${item.stem}\n\nOptions:\n${options}\n\nReply with the letter of the one correct option only.`;
    }
    case 'multiple': {
      const options = (item.options ?? [])
        .map((option, index) => `${optionLetter(index)}. ${option.text}`)
        .join('\n');
      return `${item.stem}\n\nOptions:\n${options}\n\nReply with the letters of ALL correct options, separated by commas (for example: A, C), and nothing else.`;
    }
    case 'numeric':
      return `${item.stem}\n\nReply with the number only. A fraction such as 3/4, a decimal, or a mixed number such as 1 1/2 is fine. No units and no words.`;
    case 'short':
      return `${item.stem}\n\nReply with the answer only, in at most eight words.`;
  }
}

export const JUDGE_SYSTEM_PROMPT =
  'You compare a candidate answer with the answer key of a math question. Reply with exactly one word: YES if the candidate gives the same answer as the key or any of its accepted forms (different but equivalent wording or notation counts as the same), NO otherwise.';

export function buildJudgePrompt(
  stem: string,
  keyValue: string,
  accepted: string[],
  candidateAnswer: string,
): string {
  return [
    `Question: ${stem}`,
    `Answer key: ${keyValue}`,
    `Accepted forms: ${accepted.length ? accepted.join(' | ') : '(none listed)'}`,
    `Candidate answer: ${candidateAnswer}`,
    'Same answer? Reply YES or NO.',
  ].join('\n');
}
