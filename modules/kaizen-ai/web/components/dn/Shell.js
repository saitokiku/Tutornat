// Marketing chrome: the sticky header and the closing footer, used by every
// public page (/, /tutoring, /ai, /pricing, /schedule, /tutors, /about,
// /contact, and the legal shell).
//
// One theme, locked (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md).
// The product is light, so the footer is paper like everything above it. The
// single dark surface in the product is /ai, and it is dark top to bottom:
//
//   tone='day'   -> paper header, paper page, paper footer
//   tone='night' -> coal header, coal page, coal footer (only /ai)
//
// There is no mid-page inversion and no gradient bridge between the two. The
// previous footer was coal on every page, which meant every light page ended by
// flipping the theme; that is the leak this version closes.
import Link from 'next/link';
import { KaizenMark } from '@/components/Brand';
import { IconChevronRight } from '@/components/Icons';
import Button from '@/components/ui/Button';

const NAV = [
  { href: '/tutoring', label: 'Tutoring', key: 'tutoring' },
  { href: '/ai', label: 'AI companion', key: 'ai' },
  { href: '/pricing', label: 'Pricing', key: 'pricing' },
];

// The long-tail column carries what the header can't. '/family' is in it
// because the payer's own home had exactly two links anywhere on the site
// (LoginPage body copy and a card on /tutoring), so a parent who arrived any
// other way had no path to it. The footer is where they look.
//
// 'Find a tutor' and 'Become a tutor' are gone from it. They pointed at the
// tutor marketplace, which is a Wave 2 product gated behind
// `marketplace_enabled` and cut from what Kaizen sells today — and because this
// footer renders on every marketing page, those two lines were the site's most
// repeated offer for the one thing it cannot deliver. The product column now
// lists only what a family can actually get this month.
//
// 'Teach at Kaizen' lives in the SECOND column, with the company links. It is
// the one entry point to /tutors/apply now that the directory is gated shut,
// and it was briefly none: the recruiting page sat in the sitemap with nothing
// linking to it from any page a visitor could reach. It belongs here rather
// than beside Tutoring and Pricing because hiring is not a product a family
// buys — the same reason the pay band was taken off /tutoring.
const FOOTER_COLS = [
  [
    ['/tutoring', 'Tutoring'],
    ['/ai', 'AI companion'],
    ['/pricing', 'Pricing'],
    ['/schedule', 'Schedule'],
    ['/family', 'For parents'],
  ],
  [
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/tutors/apply', 'Teach at Kaizen'],
    ['/terms', 'Terms'],
    ['/privacy', 'Privacy'],
    ['/safety', 'Safety'],
    ['/academic-integrity', 'Academic integrity'],
    ['/licenses', 'Licenses'],
  ],
];

const FOOTER_NAV_LABELS = ['Product', 'Company and legal'];
// Written out rather than computed: Tailwind only ships classes it can find as
// whole strings in the source.
const FOOTER_COL_START = ['md:col-start-7', 'md:col-start-10'];

export default function Shell({ active = '', tone = 'day', children }) {
  const night = tone === 'night';

  // Two token sets, one structure. Every pair below clears AA: on paper,
  // muted is 5.3:1 and ink is 16.8:1; on coal, nightmuted is 6.1:1 and paper
  // is above 15:1. Nothing here is a whisper.
  const t = night
    ? {
        page: 'bg-coal text-paper',
        bar: 'border-nightline bg-coal/85',
        rest: 'text-nightmuted',
        hover: 'hover:text-paper',
        on: 'text-paper',
        rule: 'bg-ember',
        hairline: 'border-nightline',
        surface: 'bg-coal',
        markInk: 'rgb(var(--c-paper))',
        markRose: 'rgb(var(--c-ember))',
        markSakura: 'rgb(var(--c-ember) / 0.45)',
      }
    : {
        page: 'bg-paper text-ink',
        bar: 'border-border bg-paper/85',
        rest: 'text-muted',
        hover: 'hover:text-ink',
        on: 'text-ink',
        rule: 'bg-accent',
        hairline: 'border-border',
        surface: 'bg-paper',
        markInk: 'rgb(var(--c-ink))',
        markRose: 'rgb(var(--c-accent))',
        markSakura: 'rgb(var(--c-accent) / 0.45)',
      };

  // Current-page state, shared by the inline nav and the mobile menu so the two
  // can never drift apart. Rose marks selection; ink acts.
  const navTone = (key) => (active === key ? t.on : `${t.rest} ${t.hover}`);

  return (
    <div className={`min-h-screen flex flex-col font-body ${t.page}`}>
      {/* 64px bar, under the 72px ceiling, and the nav holds one line from the
          sm breakpoint up. */}
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${t.bar}`}>
        <div className="max-w-wide mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <KaizenMark size={28} ink={t.markInk} rose={t.markRose} sakura={t.markSakura} />
            <span className="font-brand font-semibold text-t2">Kaizen</span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-7">
            {/* Wide: the three products, inline. The active one carries a rose
                rule rather than a weight change, so the row never reflows. */}
            <nav className="hidden sm:flex items-center gap-7 text-sm font-medium" aria-label="Primary">
              {NAV.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  aria-current={active === n.key ? 'page' : undefined}
                  className={`relative transition-colors ${navTone(n.key)}`}
                >
                  {n.label}
                  {active === n.key ? (
                    <span aria-hidden="true" className={`absolute left-0 right-0 -bottom-1.5 h-px ${t.rule}`} />
                  ) : null}
                </Link>
              ))}
            </nav>

            {/* Narrow: a real menu. CSS-only <details> so Shell stays a server
                component and the menu still works if the JS never arrives. The
                panel hangs off the header, which is the containing block, so
                the bar's height never moves when it opens. */}
            <details className="group sm:hidden">
              <summary
                className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${t.hairline} ${t.rest} ${t.hover}`}
              >
                Menu
                <IconChevronRight
                  size={14}
                  className="rotate-90 transition-transform duration-150 group-open:-rotate-90"
                />
              </summary>
              <nav
                className={`absolute left-0 right-0 top-full border-b shadow-soft ${t.hairline} ${t.surface}`}
                aria-label="Primary"
              >
                <div className="max-w-wide mx-auto px-5 flex flex-col">
                  {NAV.map((n) => (
                    <Link
                      key={n.key}
                      href={n.href}
                      aria-current={active === n.key ? 'page' : undefined}
                      className={`py-4 text-t3 font-medium border-b last:border-b-0 transition-colors ${t.hairline} ${navTone(n.key)}`}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </nav>
            </details>

            <Button href="/dashboard" size="sm" tone={night ? 'night' : 'day'}>
              Open Kaizen
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full flex-1">{children}</main>

      {/* One hairline, then room. A page ends here; it does not change theme
          here.

          Twelve columns, not `1fr auto`. The flush-right version parked both
          link columns against the gutter and left ~490px of nothing in the
          middle, so the footer read as a column that had failed to load. The
          brand block now owns half the row and holds three things (mark,
          tagline, entity line), and the two link columns sit on the 7th and
          10th column lines, which spreads the leftover space into three even
          gaps instead of one hole. Their headings are visible now as well, so
          each column reads as a labelled group rather than a loose list. */}
      <footer className={`border-t ${t.hairline} ${t.surface} ${t.rest}`}>
        <div className="max-w-wide mx-auto px-5 pt-16 pb-12 sm:pt-20 sm:pb-14">
          <div className="grid grid-cols-2 gap-x-12 gap-y-12 md:grid-cols-12 md:gap-x-8">
            {/* Every child below is placed explicitly from md up. CSS grid
                positions the definite items first and then auto-flows the rest
                around them, so one explicitly placed child (the entity line)
                would otherwise push the auto-placed ones off their columns. */}
            <div className="col-span-2 md:col-span-6 md:col-start-1 md:row-start-1 md:self-start">
              <span className="flex items-center gap-2.5">
                <KaizenMark size={24} ink={t.markInk} rose={t.markRose} sakura={t.markSakura} />
                <span className={`font-brand font-semibold text-t3 ${t.on}`}>Kaizen</span>
              </span>
              <p className="text-t3 mt-4 max-w-[34ch]">
                改善, kaizen: small, steady improvement outgrows any single leap.
              </p>
            </div>

            {FOOTER_COLS.map((col, i) => (
              <nav
                key={FOOTER_NAV_LABELS[i]}
                className={`flex flex-col gap-2.5 md:col-span-3 md:row-start-1 ${FOOTER_COL_START[i]}`}
                aria-label={FOOTER_NAV_LABELS[i]}
              >
                <p className={`text-micro uppercase font-semibold mb-1.5 ${t.on}`}>{FOOTER_NAV_LABELS[i]}</p>
                {col.map(([href, label]) => (
                  <Link key={href} href={href} className={`text-sm transition-colors ${t.hover}`}>
                    {label}
                  </Link>
                ))}
              </nav>
            ))}

            {/* Entity plus age gate. This is legal fine print, so it is set at
                13px in the same secondary token as the links (AA on both
                surfaces), never at a whisper opacity. It is last in the DOM, so
                a narrow screen still ends on it; from md up it is placed back
                into the brand column and pinned to the bottom of the row, which
                is what gives that column something to hold. */}
            <p
              className={`col-span-2 text-xs border-t pt-6 md:col-span-6 md:col-start-1 md:row-start-1 md:self-end md:border-0 md:pt-0 ${t.hairline}`}
            >
              © {new Date().getFullYear()} Kaizen Academy LLC. Kaizen serves students ages 13 and up.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
