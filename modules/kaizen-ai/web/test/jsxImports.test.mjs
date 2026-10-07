// Static guard: every capitalised JSX element must actually resolve.
//
// This repo has no ESLint config and no dependency to add one — `next lint` is
// in package.json but isn't runnable. `next build` does NOT catch an undefined
// JSX identifier, so `<TutorObserve />` without its import compiles clean and
// then throws "TutorObserve is not defined" in the browser. That happened while
// building this engine, which is why the check exists.
//
// Deliberately conservative: it only flags a capitalised tag when the name
// appears nowhere else in the file as an import, declaration, or assignment.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['app', 'components'];

// Tags that are lowercase-or-namespaced HTML/SVG, plus React built-ins.
const BUILTIN = new Set(['Fragment', 'Suspense', 'StrictMode', 'Profiler']);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, acc);
    } else if (/\.jsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// Names introduced by this module: imports, function/class/const declarations,
// destructuring, and parameter destructuring in component props.
function definedNames(src) {
  const names = new Set();
  const add = (s) => { if (s) for (const n of String(s).split(/[\s,{}]+/)) if (n) names.add(n.trim()); };

  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]/g)) add(m[1].replace(/\*\s+as/, ''));
  for (const m of src.matchAll(/\b(?:function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/g)) names.add(m[1]);
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) add(m[1]);
  // Destructured parameters: `({ Icon, title }) => …` and `function F({ Icon })`.
  // Components are routinely pulled out of a mapped array this way, e.g.
  // FEATURES.map(({ Icon }) => <Icon />) in app/page.js.
  for (const m of src.matchAll(/\(\s*\{([^}]*)\}\s*\)\s*(?::[^=>]*)?=>/g)) add(m[1]);
  for (const m of src.matchAll(/function\s*[A-Za-z0-9_]*\s*\(\s*\{([^}]*)\}/g)) add(m[1]);
  // `const X = dynamic(() => import(...))` is covered by the const rule above.
  return names;
}

function usedComponents(src) {
  const used = new Set();
  // Opening JSX tags with a capital first letter, ignoring member expressions
  // (<Foo.Bar/> resolves through Foo, which the base-name capture handles).
  for (const m of src.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) used.add(m[1]);
  return used;
}

test('every capitalised JSX component resolves to an import or a local definition', () => {
  const offenders = [];

  for (const root of ROOTS) {
    const dir = path.join(webRoot, root);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('<')) continue;
      const defined = definedNames(src);
      for (const name of usedComponents(src)) {
        if (BUILTIN.has(name) || defined.has(name)) continue;
        offenders.push(`${path.relative(webRoot, file)}: <${name}>`);
      }
    }
  }

  assert.deepEqual(
    offenders, [],
    `JSX components used without an import or local definition — these compile ` +
    `clean and crash at runtime:\n  ${offenders.join('\n  ')}`
  );
});
