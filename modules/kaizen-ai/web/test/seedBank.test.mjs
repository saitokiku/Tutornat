// The seeded item bank must survive its own verifier.
//
// An item whose stated correct answer fails the checker is worse than a missing
// item: the learner does everything right, is told they're wrong, and the ledger
// records unassisted failure on a concept they actually know. Because these
// items produce CONFIRMED mastery — the figure that reaches parents — the bank
// gets validated in CI rather than trusted.
//
// Reads supabase/seed_kc.sql directly so the SQL is the single source of truth
// and no JS copy can drift from it.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, parseNumber, expressionsEquivalent } from '@/lib/engine/verify/symbolic.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const seedPath = path.join(repoRoot, 'supabase', 'seed_kc.sql');
const sql = fs.readFileSync(seedPath, 'utf8');

// Pull every ('...json...') answer_spec literal alongside the row it belongs to.
// The seed uses VALUES tuples, so a line-oriented scan is enough and avoids
// pulling in a SQL parser.
function extractItems() {
  const items = [];
  // numeric / symbolic rows: (slug, [kind,] body, answer_spec, context, elo)
  const re = /\(\s*'([a-z0-9-]+)',\s*(?:'(numeric|symbolic)',\s*)?'((?:[^']|'')+)',\s*'(\{[^']*\})'/g;
  for (const m of sql.matchAll(re)) {
    const [, slug, kind, body, specRaw] = m;
    let spec;
    try { spec = JSON.parse(specRaw); } catch { continue; }
    if (!spec || typeof spec !== 'object') continue;
    // Infer kind when the tuple didn't carry one.
    const inferred = kind || (spec.expr ? 'symbolic' : spec.index != null ? 'mc' : 'numeric');
    items.push({ slug, kind: inferred, body: body.replace(/''/g, "'"), spec });
  }
  return items;
}

// MC rows carry a choices array before the answer_spec.
function extractMc() {
  const out = [];
  const re = /\(\s*'([a-z0-9-]+)',\s*'((?:[^']|'')+)',\s*'(\[[^']*\])',\s*'(\{[^']*\})'/g;
  for (const m of sql.matchAll(re)) {
    const [, slug, body, choicesRaw, specRaw] = m;
    try {
      out.push({
        slug,
        body: body.replace(/''/g, "'"),
        choices: JSON.parse(choicesRaw),
        spec: JSON.parse(specRaw),
      });
    } catch { /* not an MC tuple */ }
  }
  return out;
}

test('the seed file exists and defines a usable bank', () => {
  assert.ok(sql.length > 500, 'seed_kc.sql should not be empty');
  const items = extractItems();
  assert.ok(items.length >= 15, `expected a real bank, parsed ${items.length} items`);
});

test('every seeded numeric item accepts its own stated answer', () => {
  const failures = [];
  for (const it of extractItems()) {
    if (it.kind !== 'numeric') continue;
    const parsed = parseNumber(it.spec.value);
    if (parsed == null) { failures.push(`${it.body} -> unparseable value ${it.spec.value}`); continue; }
    const r = check({ kind: 'numeric', answer_spec: it.spec }, { text: String(it.spec.value) });
    if (!r.correct) failures.push(`${it.body} -> own answer "${it.spec.value}" rejected`);
  }
  assert.deepEqual(failures, [], `seeded numeric items rejecting their own answers:\n  ${failures.join('\n  ')}`);
});

test('every seeded numeric alternative form is genuinely the same number', () => {
  // "6/15" and "2/5" must actually be equal, or the alternative is a lie that
  // marks a correct student wrong.
  const failures = [];
  for (const it of extractItems()) {
    if (it.kind !== 'numeric') continue;
    for (const alt of it.spec.acceptedForms || []) {
      const r = check({ kind: 'numeric', answer_spec: it.spec }, { text: String(alt) });
      if (!r.correct) failures.push(`${it.body}: accepted form "${alt}" is rejected`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('every seeded symbolic item accepts its own expression and its alternatives', () => {
  const failures = [];
  for (const it of extractItems()) {
    if (it.kind !== 'symbolic') continue;
    const r = check({ kind: 'symbolic', answer_spec: it.spec }, { text: String(it.spec.expr) });
    if (!r.correct) failures.push(`${it.body} -> own expr "${it.spec.expr}" rejected`);
    for (const alt of it.spec.acceptedForms || []) {
      if (!expressionsEquivalent(alt, it.spec.expr)) {
        failures.push(`${it.body}: "${alt}" is NOT equivalent to "${it.spec.expr}"`);
      }
    }
  }
  assert.deepEqual(failures, [], `seeded symbolic problems:\n  ${failures.join('\n  ')}`);
});

test('every seeded multiple-choice answer index is in range and passes', () => {
  const mc = extractMc();
  assert.ok(mc.length >= 3, `expected MC items, parsed ${mc.length}`);
  const failures = [];
  for (const it of mc) {
    const idx = it.spec.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= it.choices.length) {
      failures.push(`${it.body}: index ${idx} out of range for ${it.choices.length} choices`);
      continue;
    }
    const r = check({ kind: 'mc', answer_spec: it.spec, distractor_misconceptions: [] }, { choice: idx });
    if (!r.correct) failures.push(`${it.body}: own index rejected`);
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('the bank spans >=2 surface contexts per concept it can confirm', () => {
  // The mastery gate needs passes across >= 2 contexts. A concept whose whole
  // bank shares one context can never reach confirmed, no matter how well the
  // learner does — a silent dead end worth catching here.
  const byKc = {};
  const re = /\(\s*'([a-z0-9-]+)',\s*(?:'(?:numeric|symbolic)',\s*)?'(?:[^']|'')+',\s*'\{[^']*\}',\s*'([a-z-]+)'/g;
  for (const m of sql.matchAll(re)) {
    const [, slug, ctx] = m;
    (byKc[slug] ||= new Set()).add(ctx);
  }
  const single = Object.entries(byKc).filter(([, ctxs]) => ctxs.size < 2).map(([slug]) => slug);
  assert.deepEqual(
    single, [],
    `these concepts have items in only ONE context, so they can never confirm: ${single.join(', ')}`
  );
});
