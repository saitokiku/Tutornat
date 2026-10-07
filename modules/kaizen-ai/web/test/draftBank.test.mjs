// Draft-bank invariants — the Algebra I chain (supabase/seed_kc_algebra1.sql).
//
// WHY THIS IS A SEPARATE FILE FROM bankInvariants.test.mjs
// That file asserts the LIVE bank (seed_kc.sql) can function. This one guards a
// bank that is deliberately NOT live: every item is status 'draft', invisible to
// check.js (which selects status = 'verified'), pending human sign-off. Two
// different jobs, and mixing them would have been a real trap — bankInvariants
// parses positionally and never reads `status`, so draft rows appended to
// seed_kc.sql would have counted toward the 2-item and 2-context floors while
// being unservable: a concept that looks shipped and returns noBank forever.
//
// So this file asserts two things the live-bank file cannot:
//   1. NOTHING IN THE DRAFT BANK IS SERVABLE. If a promotion ever lands by
//      accident — a stray 'verified', an UPDATE that flips status — this fails.
//      Promotion is a human act performed against the database after review
//      (docs/reviews/ALGEBRA1_ITEM_BANK.md), not a commit.
//   2. THE BANK IS READY TO PROMOTE. Every quality invariant the live bank must
//      satisfy is checked here NOW, so sign-off is a judgement about item
//      quality and never a debugging session about shape.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sql = readFileSync(join(root, 'supabase', 'seed_kc_algebra1.sql'), 'utf8');

// Tuple/field splitting, deliberately identical to bankInvariants.test.mjs: the
// draft file imitates seed_kc.sql's insert shape precisely so one parser reads
// both, and the day these two disagree is the day a shape has drifted.
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
const byKc = {};
for (const i of items) (byKc[i.slug] ||= []).push(i);
const KC_COUNT = 15;
const ITEMS_PER_KC = 6;

// ── 1. Nothing here is servable ──────────────────────────────────────────────

test('every draft item is status draft — nothing in this bank can reach a student', () => {
  // The select clauses carry status/verified_by (they are constant per insert,
  // not per tuple), so assert over the file's insert statements themselves.
  const selects = [...sql.matchAll(/insert\s+into\s+kc_item\b([\s\S]*?)from\s+kc\s+join/gi)]
    .map((m) => m[0]);
  assert.ok(selects.length >= 10, `expected the kc_item inserts to parse, found ${selects.length}`);
  for (const s of selects) {
    assert.ok(/'draft'/.test(s),
      `a kc_item insert does not set status 'draft':\n${s.slice(0, 240)}`);
    assert.ok(!/'verified'\s*,\s*(now\(\)|current_timestamp)/i.test(s),
      'a kc_item insert marks items verified — promotion is a reviewed human act, not a commit');
    assert.ok(/verified_at/.test(s) ? /null/.test(s) : true,
      'a draft item carries a verified_at timestamp');
  }
});

test('no UPDATE in this file promotes items to verified', () => {
  // A promotion statement living in the seed would flip the whole bank live the
  // next time anyone runs the file — exactly the accident the draft gate exists
  // to prevent. Promotion SQL belongs in the review doc, run deliberately.
  const promotions = [...sql.matchAll(/update\s+kc_item\s+set[\s\S]{0,200}?status\s*=\s*'verified'/gi)];
  assert.deepEqual(promotions.map((m) => m[0].slice(0, 80)), [],
    'this file promotes items to verified — move that into the reviewed promotion step');
});

// ── 2. The bank is ready to promote ──────────────────────────────────────────

test('the parser sees the whole bank: 15 concepts, 6 items each', () => {
  assert.equal(items.length, KC_COUNT * ITEMS_PER_KC,
    `parsed ${items.length} items — expected ${KC_COUNT * ITEMS_PER_KC} (the parser may be missing an insert shape)`);
  assert.equal(Object.keys(byKc).length, KC_COUNT,
    `parsed ${Object.keys(byKc).length} concepts — expected ${KC_COUNT}`);
});

test('every concept clears the ship floor: 6 items, >=2 context tags, >=3 per tag', () => {
  const failures = [];
  for (const [slug, rows] of Object.entries(byKc)) {
    if (rows.length !== ITEMS_PER_KC) failures.push(`${slug}: ${rows.length} items (want ${ITEMS_PER_KC})`);
    const perTag = {};
    for (const r of rows) perTag[r.context_tag] = (perTag[r.context_tag] || 0) + 1;
    const tags = Object.keys(perTag);
    if (tags.length < 2) failures.push(`${slug}: ${tags.length} context tag(s) — cannot ever reach confirmed`);
    const thin = tags.filter((t) => perTag[t] < 3);
    if (thin.length) failures.push(`${slug}: tag(s) with <3 items: ${thin.join(', ')}`);
  }
  assert.deepEqual(failures, [], `ship-floor violations:\n  ${failures.join('\n  ')}`);
});

test('every item carries a non-null context_tag', () => {
  // pfa.js keys the >=2-contexts gate on `context_tag || item_id`, so a null tag
  // makes N items look like N distinct contexts — fake diversity, fake mastery.
  const untagged = items
    .filter((i) => !i.context_tag || i.context_tag === 'null')
    .map((i) => `${i.slug}: ${String(i.body).slice(0, 45)}`);
  assert.deepEqual(untagged, [], `null context_tag manufactures fake context diversity:\n  ${untagged.join('\n  ')}`);
});

test('multiple-choice answers are not all in the same position', () => {
  const mc = items.filter((i) => i.choices?.startsWith('['));
  assert.ok(mc.length >= 3, `expected multiple-choice rows to be parsed, found ${mc.length}`);
  const idx = mc.map((i) => { try { return JSON.parse(i.answer_spec).index; } catch { return null; } })
    .filter((n) => n !== null);
  assert.ok(idx.length >= 3, `expected to read >=3 MC answer indices, got ${idx.length}`);
  assert.ok(new Set(idx).size > 1,
    `every MC answer sits at index ${idx[0]} — a learner passes by always picking the same slot`);
});

test('the draft bank extends the live chain rather than redefining it', () => {
  // Every prerequisite this file names must already exist in seed_kc.sql, or the
  // edge insert silently no-ops (its select joins on kc.slug) and the new
  // concepts float free of the graph policy.js walks.
  const live = readFileSync(join(root, 'supabase', 'seed_kc.sql'), 'utf8');
  const liveSlugs = new Set([...live.matchAll(/\('(math-[a-z0-9-]+)',\s*'math',/g)].map((m) => m[1]));
  const draftSlugs = new Set(Object.keys(byKc));
  const edgeBlocks = [...sql.matchAll(/insert\s+into\s+kc_edge[\s\S]*?on\s+conflict/gi)].map((m) => m[0]);
  assert.ok(edgeBlocks.length > 0, 'the draft bank defines no prerequisite edges');
  const dangling = [];
  for (const block of edgeBlocks) {
    for (const m of block.matchAll(/\('(math-[a-z0-9-]+)',\s*'(math-[a-z0-9-]+)'\)/g)) {
      for (const slug of [m[1], m[2]]) {
        if (!liveSlugs.has(slug) && !draftSlugs.has(slug)) dangling.push(slug);
      }
    }
  }
  assert.deepEqual([...new Set(dangling)], [],
    `edges reference concepts that exist in neither bank — the edge insert would no-op: ${[...new Set(dangling)].join(', ')}`);
});
