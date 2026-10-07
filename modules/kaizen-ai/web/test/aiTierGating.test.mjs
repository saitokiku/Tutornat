// Each AI tier must gate on its OWN Stripe Price.
//
// Until 2026-08-28 both storefront pages computed a single `aiBuyable` that
// required STRIPE_PRICE_AI_SOLO *and* STRIPE_PRICE_AI_HALL. Wiring one tier and
// not the other therefore held the wired tier in "Get first pick" capture state
// — the storefront refusing to sell something it has a live price for, silently,
// with no error anywhere. It is the same defect class as the sixteen days when
// /pricing rendered five plans and the live Stripe catalogue held none of them.
//
// It matters now because the AI product is free with ONE paid upgrade
// (ai_solo); ai_hall is not being wired at launch. Under the old boolean that
// choice would have made the paid upgrade unbuyable.
//
// These are source guards rather than render tests: AiLadder is a React server
// component and the suite has no renderer, but the failure lives in a boolean
// expression that source can be read for directly. Same precedent as
// priceTruth.test.mjs, which reads sources for dollar literals.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const STOREFRONTS = [
  { rel: '../app/pricing/page.js', name: 'app/pricing/page.js' },
  { rel: '../app/ai/page.js', name: 'app/ai/page.js' },
];

// Collapse whitespace so a reformat cannot smuggle the pattern past the guard.
const flat = (s) => s.replace(/\s+/g, ' ');

for (const { rel, name } of STOREFRONTS) {
  test(`${name} never gates one AI tier on the other's price`, () => {
    const src = flat(read(rel));
    assert.ok(
      !/STRIPE_PRICE_AI_SOLO\s*&&\s*process\.env\.STRIPE_PRICE_AI_HALL/.test(src),
      `${name} requires both AI price envs in one boolean — wiring either tier alone would hold the other in capture state`,
    );
    assert.ok(
      !/STRIPE_PRICE_AI_HALL\s*&&\s*process\.env\.STRIPE_PRICE_AI_SOLO/.test(src),
      `${name} requires both AI price envs in one boolean (reversed order)`,
    );
  });

  test(`${name} reads both AI price envs, each on its own`, () => {
    const src = read(rel);
    for (const env of ['STRIPE_PRICE_AI_SOLO', 'STRIPE_PRICE_AI_HALL']) {
      assert.ok(src.includes(env), `${name} no longer reads ${env}`);
    }
  });
}

test('AiLadder does not gate the Hall tier on the Solo tier being buyable', () => {
  const src = flat(read('../components/AiLadder.js'));
  assert.ok(
    !/const hallBuyable = buyable &&/.test(src),
    'AiLadder recombined the tiers: hallBuyable must not depend on `buyable`',
  );
  assert.ok(
    /hallSellable/.test(src),
    'AiLadder should take hallSellable — the prop name that means priced AND deliverable',
  );
});

test('the storefronts pass hallSellable, not the retired hallDeliverable prop', () => {
  for (const { rel, name } of STOREFRONTS) {
    const src = read(rel);
    assert.ok(
      !/hallDeliverable=/.test(src),
      `${name} still passes hallDeliverable; AiLadder takes hallSellable and would default it to false, silently holding the tier`,
    );
    assert.ok(/hallSellable=/.test(src), `${name} does not pass hallSellable to AiLadder`);
  }
});
