#!/usr/bin/env node
/**
 * Validates a reviewed item bank against the skill graph and the rules in
 * spec §5.8: skill ids in the graph, ≥ 8 items per skill and ≥ 96 total when
 * --require-coverage is given, exactly one correct option on choice items,
 * a known misconception tag on every distractor, tolerance on numeric
 * answers, a review stamp on every item, no duplicate ids, and an acyclic
 * prerequisite graph. Usage:
 *   node validate-item-bank.mjs <items.json> [--require-coverage]
 * Exit 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(join(here, '..', 'references', 'skill-graph.json'), 'utf8'));
const [, , itemsPath, ...flags] = process.argv;
if (!itemsPath) {
  console.error('usage: validate-item-bank.mjs <items.json> [--require-coverage]');
  process.exit(2);
}
const requireCoverage = flags.includes('--require-coverage');
const items = JSON.parse(readFileSync(itemsPath, 'utf8'));
const problems = [];
const skillIds = new Set(graph.skills.map((skill) => skill.id));
const tags = new Set(graph.misconception_tags);

// Prerequisite graph must be acyclic.
const visiting = new Set();
const done = new Set();
const prereqs = Object.fromEntries(graph.skills.map((skill) => [skill.id, skill.prereqs]));
function visit(id, path) {
  if (done.has(id)) return;
  if (visiting.has(id)) problems.push(`prerequisite cycle: ${[...path, id].join(' -> ')}`);
  visiting.add(id);
  for (const prereq of prereqs[id] ?? []) {
    if (!skillIds.has(prereq)) problems.push(`${id} lists unknown prerequisite ${prereq}`);
    else visit(prereq, [...path, id]);
  }
  visiting.delete(id);
  done.add(id);
}
for (const id of skillIds) visit(id, []);

if (!Array.isArray(items)) problems.push('items file must be a JSON array');
const perSkill = new Map();
const ids = new Set();
for (const item of Array.isArray(items) ? items : []) {
  const where = `item ${item?.id ?? '(no id)'}`;
  if (!item?.id) problems.push(`${where}: missing id`);
  else if (ids.has(item.id)) problems.push(`${where}: duplicate id`);
  else ids.add(item.id);
  if (!skillIds.has(item?.skill)) problems.push(`${where}: unknown skill ${item?.skill}`);
  else perSkill.set(item.skill, (perSkill.get(item.skill) ?? 0) + 1);
  if (!['single', 'multiple', 'numeric', 'short', 'symbolic'].includes(item?.type))
    problems.push(`${where}: bad type`);
  if (typeof item?.stem !== 'string' || item.stem.length < 8)
    problems.push(`${where}: stem too short`);
  if (!item?.reviewed_at || !item?.reviewed_by)
    problems.push(`${where}: not reviewed (reviewed_by/reviewed_at)`);
  if (item?.type === 'single' || item?.type === 'multiple') {
    const options = Array.isArray(item.options) ? item.options : [];
    if (options.length < 3) problems.push(`${where}: fewer than 3 options`);
    const correct = options.filter((option) => option.correct).length;
    if (item.type === 'single' && correct !== 1)
      problems.push(`${where}: single-choice needs exactly one correct option`);
    if (item.type === 'multiple' && correct < 1)
      problems.push(`${where}: multiple-choice needs a correct option`);
    for (const option of options) {
      if (!option.correct && !tags.has(option.misconception)) {
        problems.push(
          `${where}: distractor "${String(option.text).slice(0, 30)}" lacks a known misconception tag`,
        );
      }
    }
  }
  if (item?.type === 'numeric') {
    // A number, or a fraction string the grader reads ("5/6", "1 1/2"); the
    // full parser lives in lib/tutor/graph/items.ts, which CI also runs.
    const value = item.answer?.value;
    if (
      typeof value !== 'number' &&
      !(typeof value === 'string' && /^-?\d+(\.\d+)?(\s+\d+)?(\/\d+)?%?$/.test(value.trim()))
    )
      problems.push(`${where}: numeric answer.value must be a number or a fraction`);
    if (typeof item.answer?.tolerance !== 'number')
      problems.push(`${where}: numeric answer needs a tolerance`);
  }
  if (item?.type === 'symbolic' && typeof item.answer?.value !== 'string')
    problems.push(`${where}: symbolic answer.value must be an expression`);
  for (const wrong of Array.isArray(item?.answer?.wrong) ? item.answer.wrong : []) {
    if (!tags.has(wrong?.misconception))
      problems.push(
        `${where}: named wrong value "${String(wrong?.value)}" lacks a known misconception tag`,
      );
  }
}

if (requireCoverage) {
  for (const id of skillIds) {
    const count = perSkill.get(id) ?? 0;
    if (count < graph.item_bank.min_items_per_skill)
      problems.push(`${id}: ${count} items, need ${graph.item_bank.min_items_per_skill}`);
  }
  if (ids.size < graph.item_bank.min_total)
    problems.push(`total ${ids.size} items, need ${graph.item_bank.min_total}`);
}

console.log(
  `validate-item-bank: ${ids.size} items across ${perSkill.size} skills; graph acyclic check done`,
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
