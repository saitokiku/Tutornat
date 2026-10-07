#!/usr/bin/env node
/**
 * Copy linter for product UI (build prompt "Copy" rules). Scans string
 * literals and JSX text in app/(learner), app/(parent), components/tutor for
 * banned words, exclamation points, and emoji. Import specifiers, className
 * strings, and code comments are skipped. Exit 1 on a violation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['app/(learner)', 'app/(parent)', 'components/tutor', 'lib/tutor/email'];
const BANNED =
  /\b(unlock|seamless|supercharge|empower|journey|delightful|effortless|revolutioni[sz]e)\b|great question/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|mdx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((root) => walk(join(process.cwd(), root), []));
const problems = [];
for (const file of files) {
  const rel = file.slice(process.cwd().length + 1);
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const texts = [];
  for (const match of source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const text = match[2];
    if (/^[\w./@:-]+$/.test(text)) continue; // paths, identifiers, class names
    if (/^[\w\s-]*(flex|grid|px-|py-|text-|bg-|rounded|gap-)/.test(text)) continue; // tailwind
    // A quote inside a template literal or a regex can pair with the next one
    // across lines of code; copy never spans lines and carries statements.
    if (/\n/.test(text) && /[;{}=]/.test(text)) continue;
    texts.push(text);
  }
  // JSX text only: a `.tsx` file, and never a stretch of code between two
  // generics (`useState<T | null>(null)` … `<div>`), which is what a bare
  // `>text<` match used to swallow and then flag for the `!` in `rows[0]!`.
  if (file.endsWith('.tsx')) {
    for (const match of source.matchAll(/>([^<>{}]+)</g)) {
      if (/[;=()[\]`]/.test(match[1])) continue;
      texts.push(match[1]);
    }
  }
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (BANNED.test(trimmed)) problems.push(`${rel}: banned copy "${trimmed.slice(0, 60)}"`);
    if (/!/.test(trimmed) && !/^!/.test(trimmed))
      problems.push(`${rel}: exclamation point in "${trimmed.slice(0, 60)}"`);
    if (EMOJI.test(trimmed)) problems.push(`${rel}: emoji in "${trimmed.slice(0, 60)}"`);
  }
}

console.log(`check-copy: scanned ${files.length} product UI files`);
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
