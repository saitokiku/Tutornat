#!/usr/bin/env node
/**
 * Lints tutor prompt files (lib/tutor/prompts/**\/*.md) against spec §5.1 and
 * the build prompt's copy rules: no sycophancy phrases, no exclamation
 * points in spoken text, no markdown headings/bold/lists inside sections
 * marked "spoken". Also checks that every prompt identifies the tutor as an
 * AI. Exit 1 on a violation; prints the count scanned.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'lib', 'tutor', 'prompts');
const BANNED = [
  /great question/i,
  /\bawesome\b/i,
  /\bunlock\b/i,
  /\bseamless\b/i,
  /\bsupercharge\b/i,
  /\bempower\b/i,
  /\bjourney\b/i,
  /\bdelightful\b/i,
  /\beffortless\b/i,
  /\brevolutioni[sz]e\b/i,
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const problems = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(process.cwd().length + 1);
  for (const pattern of BANNED) {
    if (pattern.test(text)) problems.push(`${rel}: banned phrase ${pattern}`);
  }
  if (!/\bAI tutor\b/.test(text)) problems.push(`${rel}: must state the tutor is an AI tutor`);
  const spoken = text.split(/^##\s+spoken\b.*$/im)[1];
  if (spoken) {
    const body = spoken.split(/^##\s/m)[0];
    if (/!/.test(body)) problems.push(`${rel}: exclamation point in spoken section`);
    if (/^\s*(#|\*\*|- |\d+\. |>)/m.test(body)) problems.push(`${rel}: markdown in spoken section`);
  }
}

console.log(`check-prompts: scanned ${files.length} prompt file(s) under lib/tutor/prompts`);
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
