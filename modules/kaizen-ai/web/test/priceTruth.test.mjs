// Price-truth guard — Hard Rule 2 extended to where drift actually happened
// (gap report, 2026-08-13). clubPricing.js is the single source of truth for
// every price; app surfaces already import it, but the legally binding Terms
// page and the LIVING docs used to carry hand-typed dollars, and they drifted
// (README carried a price set that never existed in code; REVIEW_QUEUE item 12
// asked counsel to clear the wrong overage numbers). This test turns that
// class of rot into a CI failure:
//
//   1. web/app/terms/page.js may contain NO dollar literal at all — every
//      number must be interpolated from clubPricing/sessionStates.
//   2. Living docs (the ones that state CURRENT truth) may only quote dollar
//      figures that exist in clubPricing right now, plus explicitly listed
//      non-price figures (insurance coverage, derived math) — adding one is a
//      deliberate act with a paper trail, not silent drift.
//   3. Same rule for the SOURCE: every .js under web/components and web/app.
//      The 2026-08-18 audit found three surfaces quoting prices that had never
//      existed in clubPricing — the 1:1 booking sheet (H6), the dashboard's
//      drop-in card (H7), and the launch runbooks the operator types into
//      Stripe (H8 — three copies of that instruction, not the two the audit
//      named). Rule 1 protected only /terms, so the rot moved. A dollar
//      literal anywhere in app code must now be a figure clubPricing can
//      currently produce, or an EXPLICITLY listed non-price number below.
//      (Best practice is still to interpolate — this guard catches the ones
//      that get typed anyway before a customer does.)
//
// HISTORICAL docs (audit reports, dated specs/plans, ERRATA) are exempt on
// purpose: they describe what WAS true, and rewriting history is its own lie.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLUB_PLANS, RETAIL, AI_PLANS, TUTOR_PAY, SEAT_PLAN, DIAGNOSTIC } from '@/lib/server/clubPricing.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// Every dollar amount clubPricing can currently produce, rendered the way
// prose renders it ("45", "11.99", "23.50").
function centsToProse(cents) {
  const n = Number(cents) || 0;
  return n % 100 === 0 ? String(n / 100) : (n / 100).toFixed(2);
}
const CURRENT = new Set();
for (const p of Object.values(CLUB_PLANS)) {
  for (const c of [p.priceCents, p.memberHallCents, p.memberClinicCents, p.private60Cents, p.private30Cents]) {
    CURRENT.add(centsToProse(c));
  }
}
for (const p of Object.values(SEAT_PLAN)) {
  for (const c of [p.priceCents, p.memberHallCents, p.memberClinicCents, p.private60Cents, p.private30Cents]) {
    CURRENT.add(centsToProse(c));
  }
}
for (const c of Object.values(RETAIL)) CURRENT.add(centsToProse(c));
for (const p of Object.values(AI_PLANS)) CURRENT.add(centsToProse(p.priceCents));
for (const c of [TUTOR_PAY.minCents, TUTOR_PAY.maxCents, TUTOR_PAY.defaultCents, TUTOR_PAY.certifiedDefaultCents]) CURRENT.add(centsToProse(c));
// The one-time SKU is a price like any other (clubPricing.DIAGNOSTIC).
CURRENT.add(centsToProse(DIAGNOSTIC.priceCents));

// $-figures in a text, normalized ("$1,199.00" → "1199.00" is NOT normalized
// to "1199" on purpose — prose should quote prices the way the product does).
function dollarFigures(text) {
  return [...text.matchAll(/\$(\d[\d,]*(?:\.\d{1,2})?)/g)].map((m) => m[1].replaceAll(',', ''));
}

test('terms page has zero hardcoded dollar literals', () => {
  const src = read('../app/terms/page.js');
  const literals = src.match(/\$\d[\d,.]*/g) || [];
  assert.deepEqual(
    literals, [],
    `Terms is legally binding and must interpolate every price from clubPricing.js — found literals: ${literals.join(', ')}`,
  );
  assert.match(src, /@\/lib\/server\/clubPricing/, 'Terms must import clubPricing');
  assert.match(src, /@\/lib\/server\/sessionStates/, 'Terms must import the refund windows it discloses');
});

// The docs that state CURRENT truth. Non-price dollar figures a living doc
// legitimately carries (coverage limits, derived per-visit math it explains)
// are listed here EXPLICITLY — extending this list is a reviewed change.
const LIVING_DOCS = [
  { rel: '../../README.md', extra: [] },
  { rel: '../../docs/archive/PRODUCT_SPEC.md', extra: [
      // 2026-09-02: the $59 diagnostic — a one-time service sold by Payment Link, deliberately outside clubPricing (STRATEGY §5, RELEASE_PLAN 1.1).
      '59',
    ] },
  { rel: '../../docs/archive/WHAT_WE_SELL.md', extra: [] },
  // $2,000 / $600: 1099-NEC reporting thresholds (item 5), not prices.
  { rel: '../../docs/legal/REVIEW_QUEUE.md', extra: ['2000', '600',
      // 2026-09-02: figures introduced by the STRATEGY v0.2 propagation — the proposed
      // standing-seat band / statutory thresholds / penalty amounts, none a price in clubPricing.
      '550', '1000', '735',
    ] },
  // The launch checklists an operator types into Stripe. LAUNCH_RUNBOOK §3
  // lists the membership + AI amounts to create; they must BE the current
  // ones (H8: it shipped listing the retired pre-repricing figures).
  { rel: '../../docs/archive/LAUNCH_RUNBOOK.md', extra: [] },
  { rel: '../../docs/archive/LAUNCH_ONESHOT.md', extra: [] },
  // GO_LIVE.md §5 is the THIRD copy of that Stripe instruction, and the H8 fix
  // missed it: the audit named only the two runbooks, so this file went on
  // telling operators to create Prices at the retired figures after H8 was
  // called closed. Same class, same blast radius — an operator follows it and
  // every member is charged below the price we disclosed — so it joins the
  // guard. That is the only thing that makes "fixed" mean fixed here.
  // $12: the TTS vendor-cost note ("~$12 / 1M characters spoken") — what WE
  // pay OpenAI, not a price. It happens to collide with a current member
  // clinic figure today; listing it means the doc does not silently depend on
  // that coincidence.
  { rel: '../../docs/GO_LIVE.md', extra: ['12'] },
  // PROVISIONING §4 and HANDOFF's "founder-confirmed facts" were the fourth and
  // fifth copies of the retired lineup (audit 2026-08-18, still-open list): the
  // first told an operator to create Stripe Prices for products we no longer
  // sell, the second stated the same pair as a fact under a heading that says
  // "do not re-litigate", in the file CLAUDE.md calls verified-against-live.
  // Both are corrected; both join the guard, because five copies is what
  // happens when the fix is the instance and not the class.
  // $600: the 1099-NEC filing threshold in PROVISIONING §7 — tax law, not a price.
  { rel: '../../docs/PROVISIONING.md', extra: ['600'] },
  { rel: '../../docs/archive/HANDOFF.md', extra: [] },
  // RELEASE_PLAN quotes the membership table an operator reads before touching
  // Stripe, so it is a living doc by the definition above and joins the guard.
  // Its extras are all NON-prices: the two one-time service SKUs that
  // deliberately live outside clubPricing (they are services, not metered
  // entitlements), the tutor pay band, and the modelled P&L figures the staging
  // gates are set against. None is a subscription price an operator could type
  // into Stripe by mistake, which is the failure this guard exists to prevent.
  {
    rel: '../../docs/RELEASE_PLAN.md',
    extra: [
      '699',                                        // the cut sprint, one-time (the diagnostic is now clubPricing.DIAGNOSTIC)
      '22', '30',                                   // the pay band as it was before 0035, quoted in history
      '590', '750', '4194', '3714',                 // stage revenue math
      '8000', '2500', '625', '3000', '15000',       // gate + P&L model
      '35', '87',                                   // contribution per tutor-hour,
      // 2026-09-02: figures introduced by the STRATEGY v0.2 propagation — the proposed
      // standing-seat band / statutory thresholds / penalty amounts, none a price in clubPricing.
      '15', '450',
      // 2026-09-02 v2: stage-4 arithmetic at 12 seats — revenue, borrowed-space fixed cost, owner profit (STRATEGY §5.1). Derived math, not prices.
      '6600', '2100', '3350',
    ],
  },
];

for (const { rel, extra } of LIVING_DOCS) {
  test(`living doc quotes only current prices: ${rel.replace(/^(\.\.\/)+/, '')}`, () => {
    const allowed = new Set([...CURRENT, ...extra.map(String)]);
    const stale = dollarFigures(read(rel)).filter((f) => !allowed.has(f));
    assert.deepEqual(
      [...new Set(stale)], [],
      `Dollar figures not in clubPricing's current truth (fix the doc, or if genuinely not a price, add to this file's extra list): ${[...new Set(stale)].join(', ')}`,
    );
  });
}


// ── Rule 3: the source tree ─────────────────────────────────────────────────
// Every .js under components/ and app/ (pages, components, API routes).
const SOURCE_ROOTS = ['../components', '../app'];

function jsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) jsFiles(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

// `$1` inside a string is a regex-replacement backreference, not a dollar —
// e.g. .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') in the recap mailer. Drop
// those before scanning; they are the only $-digit form here that is syntax.
function stripBackrefs(text) {
  return text.replaceAll(/\$\d(?=<\/|['"`)])/g, '');
}

// Like dollarFigures, but keeps full precision on sub-cent figures so a cost
// note reads as "0.006" in the allowlist rather than a rounded "0.00".
function sourceFigures(text) {
  return [...stripBackrefs(text).matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)].map((m) => m[1].replaceAll(',', ''));
}

// Dollar figures in app code that are NOT prices. Each one is listed with the
// reason it exists; extending this list is a reviewed change, exactly like the
// living-doc `extra` lists above. If a NEW figure here is actually a product
// price, the fix is to render it from clubPricing, not to add it here.
const SOURCE_ALLOW = new Map([
  // 1099-NEC reporting threshold in the admin payout note — tax law, not a price.
  ['600', 'admin payouts: 1099-NEC filing threshold'],
  // Stripe rejects charges under 50 cents; the booking route says so in prose.
  ['0.50', 'tutoring/sessions: Stripe minimum charge'],
  // Model cost estimates in voice/AI route comments (what WE pay a vendor).
  ['0.006', 'voice/transcribe: whisper-1 per-minute vendor cost'],
  // AiLadder's header comment describes the decoy gap between the two AI
  // tiers in round numbers; the rendered figure is computed from AI_PLANS.
  ['13', 'AiLadder comment: approximate Solo → +Hall gap'],
]);

test('app code quotes only current prices (components/ + app/)', () => {
  const offenders = [];
  for (const root of SOURCE_ROOTS) {
    for (const file of jsFiles(join(here, root))) {
      for (const figure of sourceFigures(readFileSync(file, 'utf8'))) {
        if (CURRENT.has(figure) || SOURCE_ALLOW.has(figure)) continue;
        offenders.push(`${relative(join(here, '..'), file)}: $${figure}`);
      }
    }
  }
  assert.deepEqual(
    [...new Set(offenders)], [],
    'Dollar literals that clubPricing cannot currently produce. Render the figure '
    + "from lib/server/clubPricing.js (Hard Rule 2); if it genuinely isn't a price, "
    + `add it to SOURCE_ALLOW in this file with the reason: ${[...new Set(offenders)].join(', ')}`,
  );
});
