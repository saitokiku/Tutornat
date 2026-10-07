/**
 * Paths and the skill graph shared by every stage of the item-bank pipeline.
 * The graph and the validator are owned by the `pedagogy-fractions` skill and
 * are read from there, never copied.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SkillGraph, SkillId } from './types';

function currentDir(): string {
  return typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
}

export const ITEM_BANK_DIR = currentDir();
export const REPO_ROOT = resolve(ITEM_BANK_DIR, '..', '..');
export const SKILL_ROOT = join(REPO_ROOT, '.claude', 'skills', 'pedagogy-fractions');
export const GRAPH_PATH = join(SKILL_ROOT, 'references', 'skill-graph.json');
export const SCHEMA_PATH = join(SKILL_ROOT, 'references', 'item-schema.json');
export const VALIDATOR_PATH = join(SKILL_ROOT, 'scripts', 'validate-item-bank.mjs');

export const CACHE_DIR = join(ITEM_BANK_DIR, '.cache');
export const CALL_CACHE_DIR = join(CACHE_DIR, 'calls');
export const STATE_DIR = join(CACHE_DIR, 'state');
export const USAGE_LOG_PATH = join(CACHE_DIR, 'usage.jsonl');
export const RESULTS_DIR = join(ITEM_BANK_DIR, 'results');

export const BANK_PATH = join(REPO_ROOT, 'lib', 'tutor', 'content', 'item-bank.json');
export const REVIEW_SHEET_PATH = join(REPO_ROOT, 'docs', 'ITEM-BANK-REVIEW.md');
export const METRICS_DIR = join(REPO_ROOT, 'docs', 'metrics');

export function loadGraph(): SkillGraph {
  return JSON.parse(readFileSync(GRAPH_PATH, 'utf8')) as SkillGraph;
}

export function skillNumber(id: SkillId): number {
  return Number(id.slice(1));
}

export function skillName(graph: SkillGraph, id: SkillId): string {
  return graph.skills.find((skill) => skill.id === id)?.name ?? id;
}
