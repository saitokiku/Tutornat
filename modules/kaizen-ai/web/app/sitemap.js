// Sitemap for the public storefront. Until 2026-08-28 the site shipped no
// sitemap and no robots rules at all, so the one channel the strategy calls
// "the passive floor" — Google local plus reviews — had nothing to crawl.
//
// Only UNAUTHENTICATED, indexable routes belong here. Everything behind
// getCaller (dashboard, billing, family, settings, tutor, admin) is excluded
// both here and in robots.js; a sitemap entry for a route that redirects to
// sign-in is a crawl budget leak, not a ranking.
//
// Deliberately static. /tutors and /tutors/[slug] are NOT here: the tutor
// directory is gated behind `app_settings.marketplace_enabled` and renders a
// "this is not open" page until Wave 2 opens it, and a sitemap entry for a page
// that says nothing is a crawl-budget leak in the same way an authenticated
// route is. Both pages also carry `robots: { index: false }` while the gate is
// shut, so the two answers agree. When the directory opens, add /tutors back
// and add a dynamic branch for the profiles — but only ever emitting slugs the
// gated route would actually serve.
//
// /tutors/apply stays: it recruits teachers for the club's own rooms, it makes
// no offer to a family, and it renders the same whatever the gates say.

export const dynamic = 'force-static';
export const revalidate = 86400;

// APP_URL wins (same precedence as lib/server/stripe.appUrl). Unlike payment
// redirects, an unset APP_URL must NOT throw here — a missing env degrades to
// the production domain rather than failing the build (hard rule 6).
function base() {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  return 'https://kaizenedu.net';
}

// changeFrequency/priority are hints Google largely ignores; lastModified is
// the one it reads. Kept honest: a single build stamp, not a fake per-page date.
const ROUTES = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/tutoring', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/schedule', priority: 0.9, changeFrequency: 'daily' },
  { path: '/ai', priority: 0.8, changeFrequency: 'weekly' },
  // The top of the funnel: a family's first purchase and the first thing the
  // Program Director sells. It renders (and says it is not on sale yet) with no
  // account and no Stripe key, so it is a public page like any other.
  { path: '/diagnostic', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tutors/apply', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/safety', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/academic-integrity', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/licenses', priority: 0.1, changeFrequency: 'yearly' },
];

export default function sitemap() {
  const root = base();
  const lastModified = new Date();
  return ROUTES.map((r) => ({
    url: `${root}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
