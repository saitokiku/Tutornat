/**
 * Cross-item checks and the skill's own validator. Structural rules run at
 * parse time (`parse.ts`); this module catches near-duplicate stems across
 * the bank and runs `validate-item-bank.mjs`, whose "not reviewed" findings
 * are expected until a human stamps the items and are reported separately.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { VALIDATOR_PATH } from './graph';
import { stemSimilarity } from './parse';
import type { BankItem, Candidate, ValidationResult } from './types';

const NEAR_DUPLICATE = 0.8;

/** Later candidates that repeat an earlier stem (exactly or nearly) are flagged. */
export function findDuplicateStems(candidates: Candidate[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const kept: Candidate[] = [];
  for (const candidate of candidates) {
    const problems: string[] = [];
    for (const earlier of kept) {
      const similarity = stemSimilarity(earlier.item.stem, candidate.item.stem);
      if (similarity >= 1) {
        problems.push(`duplicate_stem:${earlier.key}`);
        break;
      }
      if (similarity >= NEAR_DUPLICATE) {
        problems.push(`near_duplicate_stem:${earlier.key}`);
        break;
      }
    }
    if (problems.length === 0) kept.push(candidate);
    results.push({ key: candidate.key, problems });
  }
  return results;
}

export interface ValidatorRun {
  exitCode: number;
  summary: string;
  /** Problems other than the review stamp, keyed by item id. */
  problems: { id: string; problem: string }[];
  /** Items the script reports as not reviewed (expected before human review). */
  pendingReview: number;
  /** Coverage findings (`--require-coverage`), which name skills rather than items. */
  coverage: string[];
}

/** Writes `items` to `path` and runs the skill's validator on it. */
export function runValidatorScript(
  items: BankItem[],
  path: string,
  requireCoverage: boolean,
): ValidatorRun {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(items, null, 2)}\n`);
  const args = [VALIDATOR_PATH, path, ...(requireCoverage ? ['--require-coverage'] : [])];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  const run: ValidatorRun = {
    exitCode: result.status ?? 1,
    summary: result.stdout.trim(),
    problems: [],
    pendingReview: 0,
    coverage: [],
  };
  for (const rawLine of result.stderr.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('not reviewed (reviewed_by/reviewed_at)')) {
      run.pendingReview++;
      continue;
    }
    const match = line.match(/^item (\S+): (.*)$/);
    if (match) run.problems.push({ id: match[1], problem: match[2] });
    else run.coverage.push(line);
  }
  return run;
}
