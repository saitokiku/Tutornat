// The reading shell for /terms, /privacy, /safety, /academic-integrity and
// /licenses. Shell provides the header and the paper footer; this component
// owns exactly one thing, which is what a long document feels like to read.
//
// Three decisions, all made here so five pages cannot re-make them:
//
//   Measure. The COLUMN is the system's prose measure (46rem), the same one
//   /contact and /about use, so every document page shares one left edge with
//   the rest of the site. The 65-75 character cap that running text needs is
//   applied to the running text itself (p, li, dd land at 34rem, about 69
//   characters at body size), not to the column, because the column also has
//   to hold things that are not sentences: a two-column will/won't comparison,
//   a six-column tier table, a definition list. Capping the container instead
//   narrowed those to a third of their content width and made 1440 read worse
//   than 390. Structure gets the full column; sentences cap themselves. The
//   pages pass raw <p>/<h2>/<ul>, so the styling is descendant selectors on one
//   wrapper rather than a class on every element in five files.
//
//   Hierarchy. Legal copy is a flat run of h2 sections with no numbering, so
//   each one opens on a hairline above generous space. That is the divider a
//   reader can scan; a card around each section would be false elevation.
//
//   Metadata. "Last updated" used to wear the eyebrow recipe, which made a
//   date look like a section label. Eyebrows announce a section; this is the
//   document's own record, so the date is set in mono like every other time
//   value in the product, under the title and above the rule.
//
// Legal prose keeps its em-dashes: the no-dash rule covers marketing and app
// chrome, and re-punctuating a reviewed policy is not a visual change.
import Shell from '@/components/dn/Shell';
import Section from '@/components/ui/Section';

// Sized off the one type scale (body 16/1.6 for the run, t2 for section
// heads), so a paragraph here and a paragraph on /tutoring are the same voice.
const PROSE = [
  'text-body text-ink/85 marker:text-muted',
  // The reading measure, on the reading elements only. Headings, rules, cards,
  // grids and tables keep the full 46rem column.
  '[&_p]:max-w-narrow [&_li]:max-w-narrow [&_dd]:max-w-narrow',
  // Default block rhythm; h2 overrides it below on specificity, not order.
  '[&>*+*]:mt-5',
  '[&_h2]:font-brand [&_h2]:font-semibold [&_h2]:text-t2 [&_h2]:text-ink',
  '[&>h2]:mt-14 [&>h2]:pt-8 [&>h2]:border-t [&>h2]:border-border',
  // A document that opens on a heading would otherwise double the title rule.
  '[&>h2:first-child]:mt-0 [&>h2:first-child]:pt-0 [&>h2:first-child]:border-t-0',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2.5',
  '[&_li]:pl-1',
  '[&_strong]:font-semibold [&_strong]:text-ink',
  // Links are rose and underlined: in a policy, an underline is the only thing
  // that reliably reads as "this is a link" without color vision.
  '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-accent/40',
  '[&_a:hover]:decoration-accent',
  // px-1: a wider chip pushes a following comma visibly off the word it
  // belongs to ("THIRD_PARTY_NOTICES.md , generated").
  '[&_code]:font-opmono [&_code]:text-sm [&_code]:bg-panel2 [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5',
].join(' ');

// The document map, written once for the three pages long enough to need one.
//
// It is an ORDERED list, so a reader scanning a single column has to get
// consecutive sections. A two-column grid fills across, which put sections
// 1, 3, 5 down the left column and 2, 4, 6 down the right: reading order that
// matched neither the document nor the same list rendered in one column on a
// phone. CSS columns fill down instead, so the left column runs 1..n and the
// right one continues it, at every viewport.
export function Contents({ items }) {
  return (
    <nav aria-label="On this page" className="rounded-md border border-border bg-panel2 px-5 py-5 sm:px-6">
      <p className="font-opmono text-micro font-medium uppercase text-muted">On this page</p>
      <ol className="mt-2 text-sm sm:columns-2 sm:gap-8">
        {items.map(([href, label]) => (
          <li key={href} className="break-inside-avoid py-1">
            <a href={href}>{label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function LegalShell({ title, updated, children }) {
  return (
    <Shell tone="day">
      <Section as="article" width="prose" lead>
        <header className="pb-8 border-b border-border">
          <h1 className="font-brand font-semibold text-d3 sm:text-d2 text-ink">{title}</h1>
          {updated ? (
            <p className="mt-5 text-sm text-muted">
              Last updated <span className="font-opmono text-ink">{updated}</span>
            </p>
          ) : null}
        </header>

        <div className={`mt-10 ${PROSE}`}>{children}</div>
      </Section>
    </Shell>
  );
}
