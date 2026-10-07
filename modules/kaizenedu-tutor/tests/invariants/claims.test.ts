/**
 * The claims scanner (claims-discipline skill; ported from Kaizen-AI's
 * claims.test.mjs, priceTruth.test.mjs and legalMarkers.test.mjs). Scans the
 * surfaces a stranger reads — the marketing and product components, every
 * page, the email templates, and the two living documents — for the
 * affirmative false forms, a typed price where PLAN should be interpolated,
 * an entity name before there is one, and drafting markers. Comments and SQL
 * are stripped first; an honest negative ("we do not run background checks")
 * uses other words and is not matched. A pattern that fires on a true
 * sentence gets a row in docs/CLAIMS.md and an allowlist entry here that
 * cites it, never a wider regex.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { COST, PLAN, STAFF } from '@/kaizen.config';

import { listFiles, REPO_ROOT } from './_helpers';

const SURFACE_ROOTS = ['components/tutor', 'app/(learner)', 'app/(parent)', 'lib/tutor/email'];
const LIVING_DOCS = ['README.md', 'docs/DO-THIS-NEXT.md'];
const LEDGER = 'docs/CLAIMS.md';

/** Files that render text a person reads: components, pages and layouts, email templates. Route handlers do not. */
function surfaces(): string[] {
  return SURFACE_ROOTS.flatMap((root) =>
    listFiles(root, { extensions: ['.tsx', '.ts', '.md'] }).filter(
      (file) => !file.includes('/api/') && !file.endsWith('.test.ts'),
    ),
  );
}

/** Source with comments and SQL template literals removed: what could reach a person. */
function rendered(file: string): string {
  return readFileSync(`${REPO_ROOT}/${file}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*`/g, '``');
}

/** The affirmative false forms. Each entry names why the sentence would be untrue. */
const BANNED: ReadonlyArray<readonly [RegExp, string]> = [
  [/background-?checked/i, 'claims tutors are background-checked: there are no tutors to check'],
  [
    /\b(our|meet (your|the)|matched with|certified|vetted|qualified|experienced|expert) (human |real |live )?tutors?\b/i,
    'claims human tutors: the product has none; "AI tutor" is the label',
  ],
  [
    /\b(human|real|live) tutors? (are|is|will|who|available|on call|review|check)/i,
    'claims human tutors do something: there are none',
  ],
  [
    /click-to-cancel rule|negative option rule/i,
    'cites the vacated FTC click-to-cancel rule; ground cancellation in ROSCA and state law',
  ],
  [/FERPA-(ready|compliant|certified)/i, 'claims a FERPA posture that has not been established'],
  [/HIPAA-(ready|compliant)/i, 'claims a HIPAA posture that does not apply'],
  [
    /COPPA-(compliant|certified|safe harbor)/i,
    'a badge claim; the under-13 gate is closed until compliance/signoff.md exists',
  ],
  [
    /\bguaranteed (results|grades|improvement|to (raise|improve))/i,
    'promises an outcome the product does not guarantee',
  ],
  [/\bgrades? will (go up|improve)\b/i, 'promises an outcome the product does not guarantee'],
  [/\btrusted by\b/i, 'social proof that does not exist'],
  [/\bjoin \d[\d,]*\b/i, 'social proof that does not exist'],
  [
    /\b\d[\d,]* (families|parents|students|learners|kids) (use|trust|love|rely)/i,
    'social proof that does not exist',
  ],
  [
    /\b\d+% (of (students|learners|kids|parents)|improvement|faster|better|more)\b/i,
    'an outcome statistic without a measured file under docs/metrics/',
  ],
];

/** Drafting markers never render; drafts live under compliance/ and docs/. Checked on raw text, comments included. */
const MARKERS =
  /\[ATTORNEY REVIEW\]|\[FOUNDER INPUT REQUIRED\]|\[COUNSEL\]|\blorem ipsum\b|\bTODO\b|\bFIXME\b/i;

/** Any `Something LLC` / `Something Inc.` on a surface; there is no LEGAL_ENTITY yet, so any hit is wrong. */
const ENTITY = /\b(?:[A-Z][\w&'.-]*\s+){1,4}(?:LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Corp\.?)(?=[\s,.;:)]|$)/;

/** Dollar figures the configuration can produce, rendered the way prose renders them. */
function prose(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
const PRODUCIBLE = new Set(
  [
    PLAN.priceCentsMonthly,
    COST.hardCeilingCentsPerSession,
    COST.targetCentsPerSession,
    STAFF.sessionCeilingCents,
    STAFF.dailyCapCents,
    COST.hardCeilingCentsPerSession * 4, // the learner's daily cap default (lib/tutor/turn/engine.ts dailyCapCents); README quotes it
  ].map(prose),
);
/** Figures that are not product prices, allowed by name with the row that explains them. */
const NAMED_FIGURES: Readonly<Record<string, string>> = {
  '11': 'docs/DO-THIS-NEXT.md item 5: a registrar quote for a candidate domain, dated 2026-09-04 (docs/CLAIMS.md, "Numbers on a page")',
};

describe('the claims scanner', () => {
  const files = surfaces();

  it('has surfaces to scan and a ledger to cite', () => {
    expect(files.length).toBeGreaterThanOrEqual(40);
    const ledger = readFileSync(`${REPO_ROOT}/${LEDGER}`, 'utf8');
    expect(ledger).toMatch(/Recounted \d{4}-\d{2}-\d{2}/);
    const rows = ledger
      .split('\n')
      .filter((line) =>
        /^\| `?[^|]+`? \| .+ \| (TRUE|FALSE|PARTIAL|GATED|RETIRED|Do not claim)/.test(line),
      );
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(ledger).not.toMatch(/\| FALSE \|/);
  });

  for (const [pattern, why] of BANNED) {
    it(`no surface says: ${why}`, () => {
      const offenders = files.filter((file) => pattern.test(rendered(file)));
      expect(offenders, `${pattern}`).toEqual([]);
    });
  }

  it('no surface carries a drafting marker', () => {
    const offenders = files.filter((file) =>
      MARKERS.test(readFileSync(`${REPO_ROOT}/${file}`, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no surface names a legal entity until LEGAL_ENTITY exists', () => {
    const offenders = files.flatMap((file) => {
      const hit = ENTITY.exec(rendered(file));
      return hit ? [`${file}: ${hit[0]}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it('no surface types a price; PLAN is interpolated', () => {
    const offenders = files.flatMap((file) => {
      const hit = /\$\d[\d,]*(?:\.\d+)?/.exec(rendered(file));
      return hit ? [`${file}: ${hit[0]}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it('the living documents quote only figures the configuration can produce', () => {
    const offenders: string[] = [];
    for (const doc of LIVING_DOCS) {
      const text = readFileSync(`${REPO_ROOT}/${doc}`, 'utf8');
      for (const match of text.matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)) {
        const figure = match[1]!.replace(/,/g, '');
        if (PRODUCIBLE.has(figure) || figure in NAMED_FIGURES) continue;
        offenders.push(`${doc}: $${figure}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
