/**
 * The pure parts of the item-bank pipeline (eval/item-bank): JSON extraction,
 * candidate normalization, the answer comparisons the double-solve relies on,
 * cell layout, and the packaged-bank rules. No model is called.
 */
import { describe, expect, it } from 'vitest';

import { buildCells, checkBank } from '@/eval/item-bank/bank-rules';
import {
  choiceAgrees,
  extractJson,
  normalizeCandidateItem,
  numericAgrees,
  parseChoiceLetters,
  parseNumbers,
  stemSimilarity,
} from '@/eval/item-bank/parse';
import { buildSource, selectAndPackage } from '@/eval/item-bank/package';
import type { BankItem, Candidate, Cell, SkillGraph } from '@/eval/item-bank/types';
import graphJson from '@/.claude/skills/pedagogy-fractions/references/skill-graph.json';

const graph = graphJson as SkillGraph;

const cell: Cell = {
  skill: 'F3',
  band: '9-12',
  representation: 'number_line',
  types: ['numeric', 'single'],
  index: 2,
};

describe('extractJson', () => {
  it('reads an object out of a fenced, chatty reply and repairs trailing commas', () => {
    const text = 'Here you go:\n```json\n{"items": [{"a": 1,},],}\n```\nDone.';
    expect(extractJson(text)).toEqual({ items: [{ a: 1 }] });
  });

  it('returns undefined when there is no JSON at all', () => {
    expect(extractJson('no json here')).toBeUndefined();
  });
});

describe('normalizeCandidateItem', () => {
  const single = {
    type: 'single',
    band: '9-12',
    stem: 'Which fraction equals 1/2?',
    options: [
      { text: '2/4', correct: true },
      { text: '2/3', correct: false, misconception: 'equivalence_as_change' },
      { text: '1/4', correct: false, misconception: 'whole_number_bias' },
      { text: '3/4', correct: false, misconception: 'computation' },
    ],
    answer: null,
    rationale: 'Multiplying top and bottom by 2 keeps the value.',
  };

  it('keeps a well-formed choice item and drops tags from correct options', () => {
    const result = normalizeCandidateItem(single, cell, graph, 'single');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.options?.[0]).toEqual({ text: '2/4', correct: true });
      expect(result.item.band).toBe('9-12');
      expect(result.item.representation).toBe('number_line');
    }
  });

  it('rejects an untagged distractor, an unknown tag, and a wrong correct count', () => {
    const untagged = {
      ...single,
      options: single.options.map((o) => ({ text: o.text, correct: o.correct })),
    };
    expect(normalizeCandidateItem(untagged, cell, graph, 'single')).toMatchObject({
      ok: false,
      reason: 'distractor_untagged',
    });
    const badTag = {
      ...single,
      options: [
        single.options[0],
        { text: '2/3', correct: false, misconception: 'guessing' },
        single.options[2],
      ],
    };
    expect(normalizeCandidateItem(badTag, cell, graph, 'single')).toMatchObject({
      ok: false,
      reason: 'bad_tag',
    });
    const twoCorrect = {
      ...single,
      options: [...single.options.slice(0, 3), { text: '4/8', correct: true }],
    };
    expect(normalizeCandidateItem(twoCorrect, cell, graph, 'single')).toMatchObject({
      ok: false,
      reason: 'single_correct_count',
    });
  });

  it('rejects stems that point at a picture or carry markup', () => {
    expect(
      normalizeCandidateItem(
        { ...single, stem: 'Look at the diagram below. Which part is shaded?' },
        cell,
        graph,
        'single',
      ),
    ).toMatchObject({ ok: false, reason: 'stem_refers_to_visual' });
    expect(
      normalizeCandidateItem(
        { ...single, stem: 'Which fraction equals $\\frac{1}{2}$?' },
        cell,
        graph,
        'single',
      ),
    ).toMatchObject({
      ok: false,
      reason: 'stem_markup',
    });
  });

  it('turns a numeric answer given as a fraction string into a number with accepted forms', () => {
    const numeric = {
      type: 'numeric',
      band: 'both',
      stem: 'What is 3/4 of 12?',
      options: null,
      answer: { value: '9', tolerance: 0, units: null, accept: ['nine'] },
      rationale: '12 divided by 4 is 3, and 3 times 3 is 9.',
    };
    const result = normalizeCandidateItem(numeric, cell, graph, 'numeric');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.answer).toEqual({ value: 9, tolerance: 0, accept: ['9', 'nine'] });
      expect(result.item.band).toBe('both');
    }
    const fraction = { ...numeric, answer: { value: '3/4' } };
    const parsed = normalizeCandidateItem(fraction, cell, graph, 'numeric');
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(parsed.item.answer).toEqual({
        value: 0.75,
        tolerance: 0.001,
        accept: ['3/4', '0.75'],
      });
  });
});

describe('parseNumbers and numericAgrees', () => {
  it('reads fractions, mixed numbers, decimals, percents, and money', () => {
    expect(parseNumbers('3/4')).toEqual([0.75]);
    expect(parseNumbers('1 1/2')).toEqual([1.5]);
    expect(parseNumbers('-1 1/2')).toEqual([-1.5]);
    expect(parseNumbers('75%')).toEqual([75, 0.75]);
    expect(parseNumbers('$2.50')).toEqual([2.5]);
    expect(parseNumbers('0.75 cups')).toEqual([0.75]);
    expect(parseNumbers('1,200')).toEqual([1200]);
  });

  it('agrees within tolerance and on accepted string forms only', () => {
    expect(numericAgrees({ value: 0.75, tolerance: 0.001 }, '3/4').agrees).toBe(true);
    expect(numericAgrees({ value: 0.333, tolerance: 0.01 }, '0.3333').agrees).toBe(true);
    expect(numericAgrees({ value: 9, tolerance: 0, accept: ['nine'] }, 'Nine.').agrees).toBe(true);
    expect(numericAgrees({ value: 9, tolerance: 0 }, '3 out of 4').agrees).toBe(false);
    expect(numericAgrees({ value: 0.5, tolerance: 0 }, '1 1/2').agrees).toBe(false);
  });
});

describe('parseChoiceLetters and choiceAgrees', () => {
  const options = [
    { text: 'A pizza cut into 4 slices', correct: false, misconception: 'whole_number_bias' },
    { text: '3/4', correct: true },
    { text: '1/4', correct: false, misconception: 'computation' },
    { text: '4/3', correct: false, misconception: 'whole_number_bias' },
  ];

  it('reads a bare letter, a letter with the option text, and letter lists', () => {
    expect(parseChoiceLetters('B', 4)).toEqual([1]);
    expect(parseChoiceLetters('B. A pizza cut into 4 slices', 4)).toEqual([1]);
    expect(parseChoiceLetters('A, C', 4)).toEqual([0, 2]);
    expect(parseChoiceLetters('A and C.', 4)).toEqual([0, 2]);
    expect(parseChoiceLetters('Options A and D', 4)).toEqual([0, 3]);
    expect(parseChoiceLetters('The answer is 3/4', 4)).toEqual([]);
  });

  it('falls back to the option text or its number when no letter is given', () => {
    expect(choiceAgrees(options, 'single', 'B').agrees).toBe(true);
    expect(choiceAgrees(options, 'single', '3/4').agrees).toBe(true);
    expect(choiceAgrees(options, 'single', '0.75').agrees).toBe(true);
    expect(choiceAgrees(options, 'single', 'C').agrees).toBe(false);
    const multiple = [
      { text: '2/4', correct: true },
      { text: '3/6', correct: true },
      { text: '2/3', correct: false, misconception: 'equivalence_as_change' },
      { text: '1/3', correct: false, misconception: 'computation' },
    ];
    expect(choiceAgrees(multiple, 'multiple', 'A, B').agrees).toBe(true);
    expect(choiceAgrees(multiple, 'multiple', 'A').agrees).toBe(false);
    expect(choiceAgrees(multiple, 'multiple', 'A, B, C').agrees).toBe(false);
  });
});

describe('stemSimilarity', () => {
  it('is 1 for the same stem, high for a renumbered copy, low for different situations', () => {
    const a =
      'A chocolate bar is broken into 8 equal pieces. Maya eats 3 of them. What fraction did she eat?';
    expect(stemSimilarity(a, a)).toBe(1);
    expect(stemSimilarity(a, a.replace('8', '6').replace('3', '2'))).toBeGreaterThan(0.6);
    expect(
      stemSimilarity(a, 'On a number line from 0 to 1 cut into fourths, where is 3/4?'),
    ).toBeLessThan(0.2);
  });
});

describe('buildCells', () => {
  it('lays out 10 cells per skill covering both bands and every representation with a balanced type mix', () => {
    const cells = buildCells('F3', 2);
    expect(cells).toHaveLength(10);
    expect(new Set(cells.map((c) => c.representation)).size).toBe(5);
    expect(new Set(cells.map((c) => c.band)).size).toBe(2);
    const types = cells.flatMap((c) => c.types);
    expect(types.filter((t) => t === 'numeric')).toHaveLength(7);
    expect(types.filter((t) => t === 'single')).toHaveLength(7);
    expect(types.filter((t) => t === 'multiple')).toHaveLength(3);
    expect(types.filter((t) => t === 'short')).toHaveLength(3);
    expect(buildCells('F1', 2, 3)).toHaveLength(3);
    expect(buildCells('F1', 2)[0].types).not.toEqual(buildCells('F2', 2)[0].types);
  });
});

function candidate(
  skill: Candidate['cell']['skill'],
  representation: Candidate['cell']['representation'],
  n: number,
  band: Candidate['cell']['band'] = '9-12',
): Candidate {
  return {
    key: `${skill}-${representation}-${band}-${n}`,
    cell: { skill, band, representation, index: 0 },
    requestedType: 'numeric',
    item: {
      skill,
      type: 'numeric',
      stem: `Stem ${skill} ${representation} ${n}`,
      representation,
      band,
      answer: { value: n, tolerance: 0 },
      rationale: 'because',
    },
    generatedBy: 'test',
  };
}

describe('selectAndPackage', () => {
  it('takes candidates round-robin across representations up to the cap, assigns ids, and sorts by skill then id', () => {
    const survivors = [
      candidate('F10', 'bar', 1),
      candidate('F10', 'bar', 2),
      candidate('F10', 'word', 1),
      candidate('F2', 'set', 1),
      candidate('F2', 'number_line', 1),
      candidate('F2', 'number_line', 2),
    ];
    const packaged = selectAndPackage(survivors, 2, buildSource('a:b', 'c:d', '2026-09-04'));
    expect(packaged.items.map((item) => item.id)).toEqual([
      'F2-nl-0001',
      'F2-set-0001',
      'F10-bar-0001',
      'F10-word-0001',
    ]);
    expect(packaged.reserve.map((c) => c.key)).toEqual(['F2-number_line-9-12-2', 'F10-bar-9-12-2']);
    expect(packaged.items[0].source).toBe('generated:a/b;solved:c/d;run:2026-09-04');
    expect(packaged.keyById['F2-nl-0001']).toBe('F2-number_line-9-12-1');
    expect(Object.keys(packaged.items[0])).toEqual([
      'id',
      'skill',
      'type',
      'stem',
      'representation',
      'band',
      'answer',
      'rationale',
      'source',
    ]);
  });
});

describe('checkBank', () => {
  it('names every missing rule for an empty bank and none for a bank that covers them', () => {
    const problems = checkBank([], graph);
    expect(problems).toContain('total 0 < 96');
    expect(problems).toContain('F1 has 0 items, needs 8');
    expect(problems).toContain('no bar items');
    const items: BankItem[] = [];
    for (const skill of graph.skills) {
      for (let n = 0; n < 8; n++) {
        const representation = (['bar', 'number_line', 'set', 'symbolic', 'word'] as const)[n % 5];
        const band = n % 2 === 0 ? '9-12' : '13-17';
        const base = {
          id: `${skill.id}-x-${n}`,
          skill: skill.id,
          stem: 'A long enough stem',
          representation,
          band,
          source: 's',
        } as const;
        items.push(
          n < 4
            ? { ...base, type: 'numeric', answer: { value: 1, tolerance: 0 } }
            : {
                ...base,
                type: 'single',
                options: [
                  { text: 'a', correct: true },
                  { text: 'b', correct: false, misconception: 'add_across' },
                  { text: 'c', correct: false, misconception: 'computation' },
                ],
              },
        );
      }
    }
    expect(checkBank(items, graph)).toEqual([]);
  });
});
