// Crawl surface — spec of record for robots.js, sitemap.js, and the two pages
// that are reachable but deliberately shut.
//
// The strategy this shipped for names "Google local + reviews" as the passive
// demand floor, and the site had no sitemap and no robots rules at all until
// 2026-08-28. The first half of this file pins the two mistakes that would
// silently undo that: a robots rule that blocks a public page by PREFIX, and a
// sitemap that advertises an authenticated route.
//
// The second half pins the marketplace gate. `/tutors` and `/tutors/[slug]`
// still answer 200 to anyone — they are part of the crawl surface — but they
// render a closed sign until `app_settings.marketplace_enabled` is true, and
// three separate things have to stay true for that to mean anything: the gate
// must be read as explicitly TRUE, the closed pages must ask not to be indexed,
// and the islands behind the gate must not have regrown the offers that were
// deleted from them. Flipping the switch one day must publish a bench of
// people, not resurrect a private-1:1 rate card.
//
// Those three are SOURCE assertions, in the house style of
// clubBooking.test.mjs ("the club gate fails closed…") and adminSeats.test.mjs
// ("the seat console fails closed…"), because `node --test` has no JSX
// transform: an app/ page component cannot be imported here, so the only way to
// hold a page-level invariant is to read the file. robots() and sitemap() are
// plain modules and ARE executed, so everything about them below is behavioural.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import robots from '@/app/robots.js';
import sitemap from '@/app/sitemap.js';

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(join(web, rel), 'utf8');

// Comments are a record, not an offer: TutorProfile.js's header legitimately
// says the page "used to lead on 'Book a session'", and a guard that could not
// tell that from a live button would force the file to forget its own history.
// Same technique, and the same reason, as claims.test.mjs.
const rendered = (text) => text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Everything a signed-out parent (or Googlebot) is meant to reach.
// '/tutors/apply' stays in this list on purpose even though its siblings left:
// it is the path that keeps the '/tutor' prefix trap below honest, and it is
// still a real public page (it recruits teachers for the club's rooms).
const PUBLIC_PATHS = [
  '/', '/pricing', '/tutoring', '/schedule', '/ai', '/diagnostic',
  '/tutors/apply',
  '/about', '/contact', '/safety', '/academic-integrity',
  '/terms', '/privacy', '/licenses',
];

// Public in the sense that they answer 200 to anyone, but gated in the sense
// that they render "this is not open" until `app_settings.marketplace_enabled`
// is true (the tutor marketplace is a Wave 2 product). A page whose entire
// content is a closed sign must not be advertised in the sitemap: it competes
// for crawl budget with the pages that sell, and it earns an impression for a
// query it cannot answer. The pages ask for the same thing themselves with
// `robots: { index: false }` while the gate is shut.
//
// This list holds only '/tutors'. It used to also name a made-up profile slug,
// which was a test that could not fail: ROUTES in sitemap.js is a static array
// with no branch that emits a profile, so no edit could ever have put that slug
// in the sitemap. The rule that CAN break is the prefix one, tested separately
// below: the day someone adds a dynamic branch for profiles, every slug it
// emits is a page that renders a closed sign.
const GATED_PATHS = ['/tutors'];

// The one path under /tutors that is genuinely public. Anything else on that
// prefix belongs to the gated marketplace.
const PUBLIC_UNDER_TUTORS = new Set(['/tutors/apply']);

// Everything behind getCaller, plus the token-bearing auth routes.
const PRIVATE_PATHS = [
  '/api/billing/checkout', '/admin', '/admin/tutors', '/dashboard',
  '/billing', '/settings', '/family', '/tutor',
  '/forgot-password', '/reset-password',
];

// robots.txt matching: a rule blocks a path when the path starts with the rule,
// with '$' anchoring the rule to the end of the path and '*' matching any run.
// This mirrors the Google/Bing matcher closely enough to catch prefix bugs.
function blocks(rule, path) {
  const anchored = rule.endsWith('$');
  const body = anchored ? rule.slice(0, -1) : rule;
  const pattern = body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(path);
}

function disallowRules() {
  const { rules } = robots();
  const all = Array.isArray(rules) ? rules : [rules];
  return all.flatMap((r) => (Array.isArray(r.disallow) ? r.disallow : [r.disallow]).filter(Boolean));
}

test('robots blocks no public page — the /tutor vs /tutors prefix trap', () => {
  const rules = disallowRules();
  for (const path of PUBLIC_PATHS) {
    const hit = rules.find((rule) => blocks(rule, path));
    assert.equal(hit, undefined,
      `robots rule ${JSON.stringify(hit)} would deindex the public page ${path}`);
  }
});

test('robots blocks every authenticated route', () => {
  const rules = disallowRules();
  for (const path of PRIVATE_PATHS) {
    assert.ok(rules.some((rule) => blocks(rule, path)),
      `no robots rule covers the authenticated route ${path}`);
  }
});

test('robots advertises the sitemap and a single absolute host', () => {
  const r = robots();
  assert.match(r.sitemap, /^https:\/\/[^/]+\/sitemap\.xml$/);
  assert.match(r.host, /^https:\/\/[^/]+$/);
  assert.ok(!r.host.endsWith('/'), 'host must not carry a trailing slash');
});

test('sitemap lists only public routes, absolute and deduplicated', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  assert.equal(new Set(urls).size, urls.length, 'sitemap contains a duplicate URL');

  const rules = disallowRules();
  for (const url of urls) {
    assert.match(url, /^https:\/\//, `sitemap URL must be absolute: ${url}`);
    const path = new URL(url).pathname;
    const hit = rules.find((rule) => blocks(rule, path));
    assert.equal(hit, undefined,
      `sitemap advertises ${path}, which robots rule ${JSON.stringify(hit)} blocks`);
  }
});

test('sitemap advertises no page that is gated shut', () => {
  const paths = sitemap().map((e) => new URL(e.url).pathname);
  for (const gated of GATED_PATHS) {
    assert.ok(!paths.includes(gated),
      `sitemap advertises ${gated}, which renders a not-open page until the marketplace opens`);
  }
});

test('sitemap advertises nothing under /tutors except the application page', () => {
  const paths = sitemap().map((e) => new URL(e.url).pathname);
  const strays = paths.filter((p) => p.startsWith('/tutors/') && !PUBLIC_UNDER_TUTORS.has(p));
  assert.deepEqual(strays, [],
    'every path under /tutors/ other than /tutors/apply is a gated tutor profile: '
    + 'a sitemap branch that emits slugs must wait for the gate to open');
});

test('sitemap covers the three pages the storefront actually sells from', () => {
  const paths = sitemap().map((e) => new URL(e.url).pathname);
  for (const required of ['/', '/pricing', '/schedule']) {
    assert.ok(paths.includes(required), `sitemap is missing ${required}`);
  }
});

test('sitemap entries carry a lastModified date and a sane priority', () => {
  for (const e of sitemap()) {
    assert.ok(e.lastModified instanceof Date && !Number.isNaN(e.lastModified.valueOf()),
      `${e.url} has no usable lastModified`);
    assert.ok(e.priority >= 0 && e.priority <= 1, `${e.url} priority out of range`);
  }
});

// ── The marketplace gate ─────────────────────────────────────────────────────

const GATED_PAGES = ['app/tutors/page.js', 'app/tutors/[slug]/page.js'];

// The islands that mount once the switch is on. They live under components/
// rather than beside their pages so claims.test.mjs (which walks components/
// plus app/**/page.js) reads them; if either moves back under app/, the read
// below throws and this file says why.
const MARKETPLACE_ISLANDS = ['components/TutorDirectory.js', 'components/TutorProfile.js'];

test('both marketplace pages read the gate as explicitly true', () => {
  for (const rel of GATED_PAGES) {
    const text = src(rel);
    assert.match(text, /settings\.marketplace_enabled === true/,
      `${rel} must gate on marketplace_enabled === true — an unseeded key reads as closed`);
    assert.ok(!/marketplace_enabled\s*!==\s*false/.test(text),
      `${rel} must not gate on "!== false": that opens the directory on a missing key`);
    assert.match(text, /export const dynamic = 'force-dynamic'/,
      `${rel} must not be prerendered — a static page bakes in whichever answer the gate gave at build time`);
  }
});

test('a failed directory read is not rendered as an empty bench', () => {
  // Reported by the Vercel review bot on PR #30, and it was right. The fetch
  // ended `.catch(() => setTutors([]))`, so a 500, a rate limit, an offline
  // phone, or a 200 carrying an error body all landed where a genuinely empty
  // directory lands — under the heading "Our first tutors are being onboarded"
  // with a first-pick email capture beneath it. An outage would have made a
  // false statement about the business and harvested a lead on the strength of
  // it. Same defect the server learned three times in wave 2: publicSchedule
  // answers `failed`, publicCohorts publishes no count it could not read, and
  // mySeat says "we could not look" rather than "you have no seat".
  const text = src('components/TutorDirectory.js');
  assert.doesNotMatch(text, /catch\(\(\)\s*=>\s*setTutors\(\[\]\)\)/,
    'a caught fetch error must not become an empty directory');
  assert.match(text, /if \(!r\.ok\) throw/,
    'a non-2xx must not be parsed as a directory');
  assert.match(text, /Array\.isArray\(d\?\.tutors\)/,
    'a 200 with no array is not an empty bench either');
  // The held state and the broken state must be different branches, and the
  // heading that speaks for the business must be reachable only from the first.
  assert.match(text, /const bench = failed \? 'failed'/,
    'failed must be its own state, ahead of loading/live/empty');
  assert.match(text, /const noBench = bench === 'empty'/,
    "noBench must key on the ANSWER being empty, never on tutors.length — that is what let a failed read speak for the club");
  // And no capture on the failure path: the field belongs to a real held
  // storefront, not to an outage.
  // Anchored on the JSX branch, not on `bench`'s own definition — line 99 also
  // contains "tutors === null ?" and slicing to it would give an empty string.
  const failedBranch = text.slice(
    text.indexOf("{bench === 'failed' ? ("),
    text.indexOf(') : tutors === null ? ('),
  );
  assert.ok(failedBranch.length > 0, 'the failed branch renders before the loading branch');
  assert.doesNotMatch(failedBranch, /InterestForm/,
    'a failed read must not ask for an email — that is a lead collected on an unverified sentence');
});

test('the gate returns closed when the settings read throws', () => {
  for (const rel of GATED_PAGES) {
    const text = src(rel);
    const start = text.indexOf('async function marketplaceOpen');
    const end = text.indexOf('export async function generateMetadata');
    assert.ok(start > -1 && end > start, `${rel} must define marketplaceOpen() above its metadata`);
    const gate = text.slice(start, end);
    assert.match(gate, /catch[\s\S]*?return false/,
      `${rel}'s gate must answer false when getSettings throws — a database outage shows the closed sign, it does not fall open`);
  }
});

test('the closed pages ask not to be indexed, and stop asking when they open', () => {
  for (const rel of GATED_PAGES) {
    const text = src(rel);
    const meta = text.slice(text.indexOf('export async function generateMetadata'));
    assert.match(meta, /robots:\s*open\s*\?\s*undefined\s*:\s*\{\s*index:\s*false/,
      `${rel} must emit robots: { index: false } while the gate is shut, and nothing once it opens`);
  }
});

test('the gated islands carry no offer for a product Kaizen cut', () => {
  // Deleting the lines was the whole fix; nothing but this stops them coming
  // back the next time someone edits a "directory" page. The dollar rule is
  // stricter than priceTruth.test.mjs on purpose: private60Cents IS a figure
  // clubPricing can currently produce, so a hand-typed 1:1 rate would sail
  // through that guard. On these two files, any dollar figure is a defect.
  const OFFERS = [
    [/Book\s+a\s+session/i, 'a booking action for private 1:1, a cut product'],
    [/first\s+session\s+is\s+(free|on\s+us)/i, 'a free-trial claim — TRIAL_PLANS is empty'],
    [/private\s*(30|60)\s*Cents/i, 'a private 1:1 rate interpolated from clubPricing'],
    [/\$\s*\d/, 'a typed dollar figure — a rate is an offer even in 12px grey'],
  ];
  for (const rel of MARKETPLACE_ISLANDS) {
    const text = rendered(src(rel));
    for (const [pattern, why] of OFFERS) {
      assert.ok(!pattern.test(text), `${rel} contains ${why}`);
    }
  }
});

test('the 404 sends a lost visitor to a page that answers', () => {
  // The 404 is served for every stale or mistyped URL on the domain, so it is
  // the last page allowed to be a dead end. Its second action used to read
  // "Find a tutor" and point at /tutors — which now renders "There is no tutor
  // directory here." A rescue page must not hand a visitor a second closed sign.
  const text = rendered(src('app/not-found.js'));
  const hrefs = [...text.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, 'the 404 must offer a way out');
  for (const href of hrefs) {
    const gated = GATED_PATHS.includes(href)
      || (href.startsWith('/tutors/') && !PUBLIC_UNDER_TUTORS.has(href));
    assert.ok(!gated, `the 404 offers ${href}, which renders a closed sign until the marketplace opens`);
    // And every destination is a route that exists — a typo here is invisible
    // in review and lands the visitor on this same page again.
    assert.doesNotThrow(() => readFileSync(join(web, 'app', href.replace(/^\//, ''), 'page.js')),
      `the 404 offers ${href}, which has no page.js`);
  }
});
