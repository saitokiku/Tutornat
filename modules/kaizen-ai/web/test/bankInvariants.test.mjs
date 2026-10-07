// Bank invariants — the properties that decide whether the engine can function
// at all on a concept, asserted over EVERY item kind.
//
// WHY THIS EXISTS
// seed_kc.sql shipped math-equivalent-fractions with exactly one item. The engine
// refuses to issue a check on a bank of fewer than two (check.js:48), so the
// concept could never be checked, therefore never confirmed — and because it is a
// prerequisite for three of the other seven, policy.js:62-66 left a learner
// permanently 'blocked_on_prereqs' across half the curriculum. Found by querying
// the production database, not by reading the file.
//
// The existing seedBank.test.mjs could not catch it. Its context-coverage test
// (seedBank.test.mjs:128) matches with a regex that requires answer_spec
// immediately before context_tag; MC rows interpose a choices array, so the sole
// equivalent-fractions item — an MC row — was invisible to it. Nothing asserted a
// minimum item COUNT at all.
//
// So this file does not use a shape-specific regex. It reads the column names
// from each insert's `) as i(...)` alias and parses tuples positionally, which
// works for every insert shape in the file and for shapes not yet written.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sql = readFileSync(join(root, 'supabase', 'seed_kc.sql'), 'utf8');

// Split a `values` body into top-level (...) tuples, respecting nesting and
// quotes — a JSON answer_spec contains commas and braces, and a choices array
// contains brackets, so naive splitting corrupts both.
function tuples(body) {
  const out = [];
  let depth = 0, cur = '', inStr = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      cur += ch;
      if (ch === "'") {
        if (body[i + 1] === "'") { cur += body[++i]; } else { inStr = false; }
      }
      continue;
    }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === '(') { depth++; if (depth === 1) { cur = ''; continue; } }
    if (ch === ')') { depth--; if (depth === 0) { out.push(cur); continue; } }
    if (depth >= 1) cur += ch;
  }
  return out;
}

function fields(tuple) {
  const out = [];
  let cur = '', depth = 0, inStr = false;
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i];
    if (inStr) {
      if (ch === "'") {
        if (tuple[i + 1] === "'") { cur += "'"; i++; } else { inStr = false; }
      } else cur += ch;
      continue;
    }
    if (ch === "'") { inStr = true; continue; }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Every `insert into kc_item ... from kc join (values <body>) as i(<cols>)` block.
function parseItems() {
  const items = [];
  const re = /insert\s+into\s+kc_item\b[\s\S]*?join\s*\(\s*values([\s\S]*?)\)\s*as\s+i\(([^)]*)\)/gi;
  for (const m of sql.matchAll(re)) {
    const cols = m[2].split(',').map((s) => s.trim());
    for (const t of tuples(m[1])) {
      const vals = fields(t);
      if (vals.length !== cols.length) continue;
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      if (row.slug) items.push(row);
    }
  }
  return items;
}

const items = parseItems();

// Applied to already-seeded rows by UPDATE statements further down the file.
function mcIndexOverrides() {
  const out = new Map();
  const re = /update\s+kc_item\s+set[\s\S]*?jsonb_set\(answer_spec,\s*'\{index\}',\s*'(\d+)'::jsonb\)[\s\S]*?body\s*=\s*'((?:[^']|'')+)'/gi;
  for (const m of sql.matchAll(re)) out.set(m[2].replace(/''/g, "'"), Number(m[1]));
  return out;
}

test('the parser sees every item kind, including multiple-choice', () => {
  assert.ok(items.length >= 30, `parsed only ${items.length} items — the parser is missing rows`);

  // Only the numeric inserts carry `kind` per-tuple; the symbolic and MC inserts
  // hardcode it in their select clause, so classify by shape instead. This is
  // exactly the assumption that let the old regex miss every MC row.
  const mc = items.filter((i) => i.choices?.startsWith('['));
  const symbolic = items.filter((i) => !i.choices && /"expr"/.test(i.answer_spec || ''));
  const numeric = items.filter((i) => !i.choices && /"value"/.test(i.answer_spec || ''));

  assert.ok(mc.length >= 3, `expected multiple-choice rows to be parsed, found ${mc.length}`);
  assert.ok(symbolic.length >= 3, `expected symbolic rows to be parsed, found ${symbolic.length}`);
  assert.ok(numeric.length >= 10, `expected numeric rows to be parsed, found ${numeric.length}`);
});

test('every concept clears the 2-item floor (below it, check.js returns noBank forever)', () => {
  const byKc = {};
  for (const i of items) (byKc[i.slug] ||= []).push(i);
  const thin = Object.entries(byKc)
    .filter(([, rows]) => rows.length < 2)
    .map(([slug, rows]) => `${slug} (${rows.length})`);
  assert.deepEqual(thin, [],
    `these concepts cannot ever be checked — check.js:48 needs >=2 verified items:\n  ${thin.join('\n  ')}`);
});

test('every concept spans >=2 surface contexts (CONFIRM_MIN_CONTEXTS)', () => {
  const byKc = {};
  for (const i of items) (byKc[i.slug] ||= new Set()).add(i.context_tag);
  const single = Object.entries(byKc)
    .filter(([, ctxs]) => ctxs.size < 2)
    .map(([slug, ctxs]) => `${slug} (${[...ctxs].join(', ')})`);
  assert.deepEqual(single, [],
    `these concepts can never reach confirmed — the gate needs passes in >=2 contexts:\n  ${single.join('\n  ')}`);
});

test('every item carries a non-null context_tag', () => {
  // pfa.js:114 keys contexts on `context_tag || item_id || 'default'`. A null tag
  // silently falls back to the item id, so N items with no tag look like N
  // distinct contexts and the gate opens on what is really one surface repeated.
  const untagged = items
    .filter((i) => !i.context_tag || i.context_tag === 'null')
    .map((i) => `${i.slug}: ${String(i.body).slice(0, 45)}`);
  assert.deepEqual(untagged, [],
    `null context_tag manufactures fake context diversity via the item_id fallback:\n  ${untagged.join('\n  ')}`);
});

test('multiple-choice answers are not all in the same position', () => {
  // Every seeded MC item once had {"index":0} — always tapping the first option
  // scored 100%. MC is a confirming tier-v2 kind, so that fabricates confirmed
  // mastery from nothing.
  const overrides = mcIndexOverrides();
  const mc = items.filter((i) => i.choices?.startsWith('['));
  const idx = mc.map((i) => {
    const body = String(i.body);
    if (overrides.has(body)) return overrides.get(body);
    try { return JSON.parse(i.answer_spec).index; } catch { return null; }
  }).filter((n) => n !== null);

  assert.ok(idx.length >= 3, `expected to read >=3 MC answer indices, got ${idx.length}`);
  assert.ok(new Set(idx).size > 1,
    `every MC answer sits at index ${idx[0]} — a learner passes by always picking the same slot`);
});
