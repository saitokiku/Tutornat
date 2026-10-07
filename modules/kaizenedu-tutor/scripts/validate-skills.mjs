#!/usr/bin/env node
/**
 * Validates the skills this repo authors, under .claude/skills, against the rules in
 * docs/BUILD-PROMPT.md Phase 0 step 5: YAML frontmatter with `name` and a
 * `description` that states what the skill does and when to load it,
 * imperative body, under 300 lines, long material in references/, checks in
 * scripts/. Runs in CI (no Claude CLI there); locally also run
 * `claude plugin validate .claude/skills`.
 *
 * Vendored third-party skills (installed by a vendor CLI, e.g. `npx neon
 * skills`) are listed but not judged: their length and description style are
 * their authors' to set, not ours.
 *
 * Exit codes: 0 valid · 1 a skill violates a rule.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
  'openmaic-internals',
  'tutor-loop',
  'voice-pipeline',
  'presence-layer',
  'minors-privacy',
  'design-system',
  'pedagogy-fractions',
  'release-checklist',
  // Created before step 1 of docs/MVP-REFERENCE.md §7; §8 names what each carries.
  'kaizen-ai-port',
  'parent-comms',
  'claims-discipline',
];
/** Installed by a vendor's CLI; we do not own their authoring style. */
const VENDORED = ['neon', 'neon-postgres'];
const MAX_LINES = 300;
const root = join(process.cwd(), '.claude', 'skills');
const problems = [];

if (!existsSync(root)) {
  console.error('validate-skills: .claude/skills does not exist');
  process.exit(1);
}

const present = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
for (const name of REQUIRED) {
  if (!present.includes(name)) problems.push(`missing required skill: ${name}`);
}

const ours = present.filter((name) => !VENDORED.includes(name));
const vendored = present.filter((name) => VENDORED.includes(name));

for (const name of ours) {
  const skillPath = join(root, name, 'SKILL.md');
  if (!existsSync(skillPath)) {
    problems.push(`${name}: SKILL.md missing`);
    continue;
  }
  const text = readFileSync(skillPath, 'utf8');
  const lines = text.split('\n');
  if (lines.length > MAX_LINES) problems.push(`${name}: ${lines.length} lines (max ${MAX_LINES})`);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    problems.push(`${name}: no YAML frontmatter`);
    continue;
  }
  const frontmatter = match[1];
  const nameField = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = frontmatter
    .match(/^description:\s*([\s\S]*?)(?=^\w+:|\s*$)/m)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim();
  if (nameField !== name)
    problems.push(`${name}: frontmatter name is "${nameField}", expected "${name}"`);
  if (!description || description.length < 80) {
    problems.push(
      `${name}: description missing or too short to say what it does and when to load it`,
    );
  } else if (!/\b(load|use)\b/i.test(description) || !/\bwhen\b/i.test(description)) {
    problems.push(
      `${name}: description must say when to load it (contains "when" and "load"/"use")`,
    );
  }
  for (const ref of text.matchAll(/\]\((references\/[^)]+|scripts\/[^)]+)\)/g)) {
    if (!existsSync(join(root, name, ref[1]))) problems.push(`${name}: broken link ${ref[1]}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`validate-skills: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(
  `validate-skills: ${ours.length} authored skills valid (${REQUIRED.length} required present)` +
    (vendored.length
      ? `; ${vendored.length} vendored skill(s) not judged: ${vendored.join(', ')}`
      : ''),
);
