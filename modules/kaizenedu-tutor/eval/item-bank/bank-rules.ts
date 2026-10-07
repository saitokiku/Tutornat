/**
 * The two pure rule sets of the pipeline, kept apart from the runner so they
 * can be unit-tested without starting it: how a skill's generator cells are
 * laid out, and what the packaged bank must satisfy (spec §5.8, R12 plus the
 * launch-slice brief: ≥ 25 % numeric, ≥ 60 % of choice items with a
 * conceptual distractor tag, both bands and all five representations).
 */
import { skillNumber } from './graph';
import { bankStats } from './report';
import {
  REPRESENTATIONS,
  type BankItem,
  type Cell,
  type ItemType,
  type RequestedBand,
  type SkillGraph,
  type SkillId,
} from './types';

/**
 * Twenty type slots per skill (7 numeric, 7 single, 3 multiple, 3 short) laid
 * over the ten cells in order; rotated by skill so the same representation
 * does not always carry the same type across the bank.
 */
export const TYPE_PLAN: readonly ItemType[] = [
  'numeric',
  'single',
  'single',
  'multiple',
  'numeric',
  'short',
  'single',
  'numeric',
  'numeric',
  'single',
  'multiple',
  'numeric',
  'single',
  'short',
  'numeric',
  'single',
  'multiple',
  'numeric',
  'single',
  'short',
];

export function buildCells(skill: SkillId, itemsPerCell: number, maxCells?: number): Cell[] {
  const offset = (2 * (skillNumber(skill) - 1)) % TYPE_PLAN.length;
  const plan = [...TYPE_PLAN.slice(offset), ...TYPE_PLAN.slice(0, offset)];
  const bands: RequestedBand[] = ['9-12', '13-17'];
  const cells: Cell[] = [];
  let index = 0;
  for (const representation of REPRESENTATIONS) {
    for (const band of bands) {
      const types = Array.from(
        { length: itemsPerCell },
        (_, j) => plan[(index * itemsPerCell + j) % plan.length],
      );
      cells.push({ skill, band, representation, types, index });
      index++;
    }
  }
  return maxCells ? cells.slice(0, maxCells) : cells;
}

export const MIN_NUMERIC_SHARE = 0.25;
export const MIN_TAGGED_DISTRACTOR_SHARE = 0.6;

/** Every way the packaged bank can fall short of the launch-slice rules; empty means it ships. */
export function checkBank(items: BankItem[], graph: SkillGraph): string[] {
  const problems: string[] = [];
  const stats = bankStats(items);
  if (stats.total < graph.item_bank.min_total) {
    problems.push(`total ${stats.total} < ${graph.item_bank.min_total}`);
  }
  for (const skill of graph.skills) {
    const n = stats.perSkill[skill.id] ?? 0;
    if (n < graph.item_bank.min_items_per_skill) {
      problems.push(`${skill.id} has ${n} items, needs ${graph.item_bank.min_items_per_skill}`);
    }
    const bands = stats.bandsPerSkill[skill.id] ?? [];
    for (const band of ['9-12', '13-17']) {
      if (!bands.includes(band)) problems.push(`${skill.id} has no item for band ${band}`);
    }
  }
  for (const representation of REPRESENTATIONS) {
    if (!stats.perRepresentation[representation]) problems.push(`no ${representation} items`);
  }
  if (stats.numericShare < MIN_NUMERIC_SHARE) {
    problems.push(`numeric share ${(stats.numericShare * 100).toFixed(1)} % < 25 %`);
  }
  if (stats.taggedDistractorShare < MIN_TAGGED_DISTRACTOR_SHARE) {
    problems.push(
      `tagged-distractor share ${(stats.taggedDistractorShare * 100).toFixed(1)} % < 60 %`,
    );
  }
  return problems;
}
