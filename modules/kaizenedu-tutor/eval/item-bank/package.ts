/**
 * Packaging: choose which surviving candidates ship, assign ids, sort, and
 * write `lib/tutor/content/item-bank.json` in the item-schema shape.
 *
 * Selection is coverage-first, not quality-ranked: per skill, candidates are
 * taken round-robin across the five representations (each representation's
 * queue already alternates bands and types because of the cell order) until
 * `maxPerSkill` is reached. Nothing is edited by hand; the reserve that does
 * not fit stays in the pipeline state.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

import { REPO_ROOT, skillNumber } from './graph';
import {
  REPRESENTATIONS,
  REPRESENTATION_ABBREVIATION,
  type BankItem,
  type Candidate,
  type SkillId,
} from './types';

export interface Packaged {
  items: BankItem[];
  /** Candidate keys per shipped id. */
  keyById: Record<string, string>;
  reserve: Candidate[];
}

export function buildSource(generator: string, solver: string, date: string): string {
  const provider = (modelString: string) => modelString.replace(':', '/');
  return `generated:${provider(generator)};solved:${provider(solver)};run:${date}`;
}

export function selectAndPackage(
  survivors: Candidate[],
  maxPerSkill: number,
  source: string,
): Packaged {
  const bySkill = new Map<SkillId, Candidate[]>();
  for (const candidate of survivors) {
    const list = bySkill.get(candidate.cell.skill) ?? [];
    list.push(candidate);
    bySkill.set(candidate.cell.skill, list);
  }

  const items: BankItem[] = [];
  const keyById: Record<string, string> = {};
  const reserve: Candidate[] = [];

  for (const skill of [...bySkill.keys()].sort((a, b) => skillNumber(a) - skillNumber(b))) {
    const candidates = bySkill.get(skill) ?? [];
    const queues = REPRESENTATIONS.map((representation) =>
      candidates.filter((candidate) => candidate.cell.representation === representation),
    );
    const chosen: Candidate[] = [];
    let progress = true;
    while (chosen.length < maxPerSkill && progress) {
      progress = false;
      for (const queue of queues) {
        if (chosen.length >= maxPerSkill) break;
        const next = queue.shift();
        if (next) {
          chosen.push(next);
          progress = true;
        }
      }
    }
    for (const queue of queues) reserve.push(...queue);

    const counters = new Map<string, number>();
    for (const candidate of chosen) {
      const abbreviation = REPRESENTATION_ABBREVIATION[candidate.cell.representation];
      const count = (counters.get(abbreviation) ?? 0) + 1;
      counters.set(abbreviation, count);
      const id = `${skill}-${abbreviation}-${String(count).padStart(4, '0')}`;
      keyById[id] = candidate.key;
      const { item } = candidate;
      const bankItem: BankItem = {
        id,
        skill: item.skill,
        type: item.type,
        stem: item.stem,
        representation: item.representation,
        band: item.band,
        ...(item.options ? { options: item.options } : {}),
        ...(item.answer ? { answer: item.answer } : {}),
        ...(item.rationale ? { rationale: item.rationale } : {}),
        source,
      };
      items.push(bankItem);
    }
  }

  items.sort((a, b) => skillNumber(a.skill) - skillNumber(b.skill) || a.id.localeCompare(b.id));
  return { items, keyById, reserve };
}

/** Writes the bank and formats it with the repo's prettier so the checked-in file is stable. */
export function writeBank(path: string, items: BankItem[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(items, null, 2)}\n`);
  const prettier = join(REPO_ROOT, 'node_modules', '.bin', 'prettier');
  if (existsSync(prettier)) {
    const result = spawnSync(prettier, ['--write', path], { encoding: 'utf8', cwd: REPO_ROOT });
    if (result.status !== 0) {
      console.warn(`  prettier did not format ${path}: ${result.stderr.trim()}`);
    }
  }
}
