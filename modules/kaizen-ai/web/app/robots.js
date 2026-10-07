// Crawl rules. Companion to sitemap.js — see the note there about why both
// arrived only on 2026-08-28.
//
// The disallow list is the authenticated surface plus /api. Two of these are
// load-bearing rather than cosmetic:
//   - /api/* must never be crawled: several routes are rate-limited per caller
//     (lib/server/ratelimit.js) and a crawler burning that budget degrades the
//     storefront for real parents.
//   - /reset-password and /forgot-password carry single-use tokens in the URL
//     on the reset path; indexing them is a credential leak, not just noise.
//
// THE TRAP, since robots.txt matches by PREFIX and not by path segment: a bare
// `/tutor` rule also blocks `/tutors`, `/tutors/apply` and every `/tutors/[slug]`
// — i.e. it would deindex the public tutor directory, which is one of the three
// pages this file exists to get crawled. The tutor WORKSPACE is therefore
// written as `/tutor$` (exact, Google/Bing wildcard syntax) plus `/tutor/` for
// any future subpath. Never shorten these to `/tutor`.
//
// Everything else is deliberately open. The storefront is the channel.

export const dynamic = 'force-static';

function base() {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  return 'https://kaizenedu.net';
}

export default function robots() {
  const root = base();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/billing',
          '/settings',
          '/family',
          '/tutor$',
          '/tutor/',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${root}/sitemap.xml`,
    host: root,
  };
}
