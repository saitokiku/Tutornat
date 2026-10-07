#!/usr/bin/env node
/**
 * Turn the item bank into a sheet a person can actually sit down and review.
 *
 * The tutor never shows an item to a learner until `reviewed_by` and
 * `reviewed_at` are set on it, and nothing in this repository can set them for
 * you — not this script, not the generation pipeline, not an agent. That is
 * the point: the gate exists so that a person has looked at every question a
 * child will be asked, and a gate a machine can open is not a gate.
 *
 * So this prints the questions with their answers and the reasoning, grouped by
 * skill, with a box to tick. Working through it is the job; stamping the JSON
 * afterwards is the record that it was done.
 *
 * Usage: node scripts/item-bank-review-sheet.mjs
 * Writes: docs/ITEM-BANK-REVIEW.md
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BANK = join(ROOT, 'lib', 'tutor', 'content', 'item-bank.json');
const GRAPH = join(
  ROOT,
  '.claude',
  'skills',
  'pedagogy-fractions',
  'references',
  'skill-graph.json',
);
const OUT = join(ROOT, 'docs', 'ITEM-BANK-REVIEW.md');

if (!existsSync(BANK)) {
  console.error(`No item bank at ${BANK}.`);
  process.exit(1);
}

const items = JSON.parse(readFileSync(BANK, 'utf8'));
const graph = JSON.parse(readFileSync(GRAPH, 'utf8'));
const skillName = new Map(graph.skills.map((s) => [s.id, s.name]));

const letter = (index) => String.fromCharCode(65 + index);
const reviewed = (item) => Boolean(item.reviewed_by && item.reviewed_at);

function answerOf(item) {
  if (item.options) {
    return item.options
      .map((option, index) => (option.correct ? `${letter(index)}. ${option.text}` : null))
      .filter(Boolean)
      .join(' / ');
  }
  if (item.answer) {
    const units = item.answer.units ? ` ${item.answer.units}` : '';
    const accept = item.answer.accept?.length
      ? ` (also accepts: ${item.answer.accept.join(', ')})`
      : '';
    return `${item.answer.value}${units}${accept}`;
  }
  return '—';
}

const bySkill = new Map();
for (const item of items) {
  if (!bySkill.has(item.skill)) bySkill.set(item.skill, []);
  bySkill.get(item.skill).push(item);
}
const skills = [...bySkill.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

const done = items.filter(reviewed).length;

const lines = [];
lines.push('# Item bank review');
lines.push('');
lines.push(
  `${done} of ${items.length} items reviewed. **The tutor shows a learner nothing from this file until \`reviewed_by\` and \`reviewed_at\` are set on that item** in \`lib/tutor/content/item-bank.json\`. Ticking a box here changes nothing on its own; the JSON is the record.`,
);
lines.push('');
lines.push('## How to review one');
lines.push('');
lines.push('For each item, four questions:');
lines.push('');
lines.push('1. **Is the answer right?** Work it yourself before looking.');
lines.push(
  '2. **Is exactly one option right?** A second defensible answer makes the item unusable, however good the reasoning.',
);
lines.push(
  '3. **Does each wrong option come from a real mistake?** The tag beside it names the misconception it is meant to catch. A distractor nobody would ever pick teaches us nothing about the learner.',
);
lines.push(
  '4. **Would the child you have in mind understand the question?** Read the stem out loud. If it needs re-reading, rewrite it.',
);
lines.push('');
lines.push(
  'Then set `reviewed_by` (your name or initials) and `reviewed_at` (`YYYY-MM-DD`) on that item in the JSON. Change anything you like while you are there — the wording is a draft, not a proposal.',
);
lines.push('');

for (const skill of skills) {
  const group = bySkill.get(skill);
  const groupDone = group.filter(reviewed).length;
  lines.push(`## ${skill} — ${skillName.get(skill) ?? 'unknown skill'}`);
  lines.push('');
  lines.push(`${groupDone} of ${group.length} reviewed.`);
  lines.push('');
  for (const item of group) {
    lines.push(`### ${reviewed(item) ? '[x]' : '[ ]'} \`${item.id}\``);
    lines.push('');
    lines.push(`*${item.type} · ${item.representation} · ages ${item.band}*`);
    lines.push('');
    lines.push(`> ${item.stem}`);
    lines.push('');
    if (item.options) {
      for (const [index, option] of item.options.entries()) {
        const mark = option.correct ? '**correct**' : `wrong — \`${option.misconception}\``;
        lines.push(`- ${letter(index)}. ${option.text} — ${mark}`);
      }
    } else {
      lines.push(`- Answer: ${answerOf(item)}`);
    }
    lines.push('');
    if (item.rationale) {
      lines.push(`Why: ${item.rationale}`);
      lines.push('');
    }
  }
}

writeFileSync(OUT, `${lines.join('\n')}\n`);
console.log(`[review-sheet] ${items.length} items (${done} reviewed) -> ${OUT}`);
