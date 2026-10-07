// Copy truth guard — banned phrases must not reappear in user-facing surfaces.
//
// Several false or legally-stale claims were removed from the product by hand
// (README + terms + safety + consent copy). A hand fix that nothing enforces
// comes back the next time someone writes marketing copy. This test fails CI if
// a banned phrase returns.
//
// SCOPE IS DELIBERATE. It scans the files that render text a user actually reads
// — page components and email templates — NOT route/lib code, because an honest
// internal comment ("this is a review, NOT a background check") is true and must
// be allowed. The bans below are the AFFIRMATIVE false forms; the honest
// negative disclosure ("we do not run background checks") uses different wording
// and is intentionally not matched.
//
// This is a starting set covering claims verified false-and-absent today. It is
// meant to grow as docs/CLAIMS_MATRIX.md assigns REMOVE/FIX dispositions.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');

// Every page.js under app/ (the rendered marketing/legal/product surfaces),
// every .js under components/ (shared UI that renders user-visible text),
// plus the email template modules — the text that leaves the product.
function userFacingFiles() {
  const out = [];
  const walk = (dir, match) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p, match);
      else if (match(name)) out.push(p);
    }
  };
  walk(join(web, 'app'), (name) => name === 'page.js');
  walk(join(web, 'components'), (name) => name.endsWith('.js'));
  for (const f of ['email.js', 'tutoringEmails.js', 'billingEmails.js', 'parentSummary.js']) {
    const p = join(web, 'lib', 'server', f);
    try { statSync(p); out.push(p); } catch { /* optional */ }
  }
  return out;
}

// { pattern, why }. Patterns are the FALSE affirmative forms only.
const BANNED = [
  // Safety: tutors are interviewed, NOT third-party background-checked. The
  // hyphenated adjective only appears when claiming they ARE checked; the honest
  // disclosure says "we do not run ... background checks" and is not matched.
  [/background-?checked/i, 'claims tutors are background-checked — they are not; say "interviewed and approved by our team"'],

  // Legal: cite ROSCA / FTC Act §5 / state auto-renewal law, never the
  // click-to-cancel Negative Option rule (vacated by the 8th Circuit, 2025).
  [/click-to-cancel rule|negative option rule/i, 'cites the vacated FTC click-to-cancel rule; ground cancellation in ROSCA + state law'],

  // Compliance tiers must not be claimed before their facts exist.
  [/FERPA-(ready|compliant|certified)/i, 'claims a FERPA posture that the school-foundation phase has not established'],
  [/HIPAA-(ready|compliant)/i, 'claims a HIPAA posture that does not apply and is not established'],

  // Absolute promises the product does not make.
  [/\bguaranteed (results|grades|improvement|to (raise|improve))/i, 'promises a guaranteed outcome the product does not guarantee'],

  // The registered entity is Kaizen Academy LLC. Naming a different entity in a
  // legal clause (liability, governing law, copyright) is a real defect. \s+
  // rather than a literal space because the first fix missed an occurrence that
  // was line-wrapped in JSX as "Kaizen Tutors\n  LLC" — the rendered page still
  // said it while a plain-string grep of the source came back clean.
  [/Kaizen\s+Tutors\s+LLC/i, 'names the wrong legal entity — the registered entity is Kaizen Academy LLC'],
];

const files = userFacingFiles();

test('user-facing surfaces exist to scan', () => {
  assert.ok(files.length >= 30, `expected the page/component/email surfaces, found ${files.length}`);
});

for (const [pattern, why] of BANNED) {
  test(`banned copy absent: ${why.slice(0, 60)}`, () => {
    const offenders = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      // Strip line comments so an honest "// NOT a background check" note in a
      // page file (rare, but possible) does not trip the affirmative ban.
      const rendered = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (pattern.test(rendered)) offenders.push(f.replace(web + '/', ''));
    }
    assert.deepEqual(offenders, [], `"${why}"\n  found in: ${offenders.join(', ')}`);
  });
}
