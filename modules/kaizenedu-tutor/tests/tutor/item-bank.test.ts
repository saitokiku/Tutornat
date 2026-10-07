/**
 * The seed item bank: 96 authored check items across the twelve fractions
 * skills.
 *
 * Two different things are being protected here.
 *
 * The first is coverage. The diagnostic picks an item per skill and the
 * re-teach loop needs a different one next time, so a skill with three items
 * repeats itself within a session and stops measuring anything. Eight per
 * skill, every representation, and a real share of typed answers rather than
 * multiple choice — because a child who can pick 3/4 from a list has not
 * necessarily produced it.
 *
 * The second is the review gate, and it matters more. An item reaches a
 * learner only once a person has set `reviewed_by` and `reviewed_at` on it.
 * Nothing in this repository may set those — not the generation pipeline, not
 * this suite, not an agent writing items. A gate a machine can open is not a
 * gate, and the thing on the other side of it is questions asked of somebody's
 * nine-year-old.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadItemBank, validateItems, type RawItem } from '@/lib/tutor/graph/items';

const BANK_PATH = join(process.cwd(), 'lib', 'tutor', 'content', 'item-bank.json');
const raw = JSON.parse(readFileSync(BANK_PATH, 'utf8')) as RawItem[];

const SKILLS = Array.from({ length: 12 }, (_, index) => `F${index + 1}`);
const REPRESENTATIONS = ['bar', 'number_line', 'set', 'symbolic', 'word'] as const;

/** What the bank would look like if a human had signed every item off. */
function asReviewed(items: RawItem[]): RawItem[] {
  return items.map((item) => ({ ...item, reviewed_by: 'test', reviewed_at: '2026-01-01' }));
}

describe('the seed item bank', () => {
  it('is well formed apart from the review stamp', () => {
    // Stamping happens only in memory, and only here, so that a genuine defect
    // in an item is not hidden behind "not reviewed" on every line.
    const { valid, problems } = validateItems(asReviewed(raw));
    expect(problems).toEqual([]);
    expect(valid).toHaveLength(raw.length);
  });

  it('covers every skill deeply enough not to repeat itself', () => {
    for (const skill of SKILLS) {
      const items = raw.filter((item) => item.skill === skill);
      expect(items.length, `${skill} has ${items.length} items`).toBeGreaterThanOrEqual(8);
    }
    expect(raw.length).toBeGreaterThanOrEqual(96);
  });

  it('reaches every learner in both bands, for every skill', () => {
    for (const skill of SKILLS) {
      const bands = new Set(
        raw
          .filter((item) => item.skill === skill)
          .flatMap((item) => (item.band === 'both' ? ['9-12', '13-17'] : [item.band])),
      );
      expect([...bands].sort(), `${skill} bands`).toEqual(['13-17', '9-12']);
    }
  });

  it('uses every representation', () => {
    // A learner who has only ever seen fractions as symbols has learned the
    // notation, not the idea.
    for (const representation of REPRESENTATIONS) {
      const count = raw.filter((item) => item.representation === representation).length;
      expect(count, `${representation} items`).toBeGreaterThan(0);
    }
  });

  it('asks for a typed answer at least a quarter of the time', () => {
    const typed = raw.filter((item) => item.type === 'numeric' || item.type === 'short').length;
    expect(typed / raw.length).toBeGreaterThanOrEqual(0.25);
  });

  it('gives every wrong option a misconception to catch', () => {
    // A distractor nobody would pick teaches us nothing about the learner, and
    // an untagged one teaches the student model nothing either.
    for (const item of raw) {
      for (const option of item.options ?? []) {
        if (option.correct) continue;
        expect(option.misconception, `${item.id}: "${option.text}"`).toBeTruthy();
      }
    }
  });

  it('explains itself to whoever is reviewing it', () => {
    for (const item of raw) {
      expect(item.rationale, `${item.id} has no rationale`).toBeTruthy();
      expect(item.source, `${item.id} has no source`).toBeTruthy();
    }
  });

  it('is not signed off by anything in this repository', () => {
    // The load-bearing test. If this ever fails, something automated has
    // stamped its own work as human-reviewed, and every item it touched is
    // reaching children unread. Deleting this test is not the fix.
    for (const item of raw) {
      expect(item.reviewed_by, `${item.id} was stamped by something`).toBeUndefined();
      expect(item.reviewed_at, `${item.id} was stamped by something`).toBeUndefined();
    }
  });

  it('serves a learner nothing until a person has read it', () => {
    // The gate, observed from the outside: the loader the tutor actually calls
    // returns no usable item from an unstamped bank.
    const { valid } = loadItemBank(BANK_PATH);
    expect(valid).toEqual([]);
  });
});
