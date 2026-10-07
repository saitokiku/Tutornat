import Link from 'next/link';
import { KaizenMark } from '@/components/Brand';

// The interior header, written once. Settings, billing, tutor, admin and family
// each carried their own near-identical copy of this, differing only in
// max-width, wordmark font and link count, which is how /family ended up in a
// different typeface from its four siblings.
//
// links: [{ href, label }] rendered before the standing "Back to app" link.
//
// The bar ALWAYS uses the wide rail, whatever measure the page body uses. The
// interior used to size the header to its own narrower column, so the wordmark
// physically slid 207px to the right the moment a parent crossed from a
// marketing page into the app. The body can be as narrow as it likes; the
// chrome has to hold still. `width` is therefore accepted and ignored, kept so
// existing call sites need no edit.
export default function AppHeader({ links = [], width, back = '/dashboard' }) {
  void width;
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-border">
      <div className="max-w-wide mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <KaizenMark size={24} />
          {/* text-t2 to match the marketing header exactly. At t3 the wordmark
              stepped down one size the moment a parent crossed into the app,
              inside a bar that is otherwise pixel-identical, which reads as a
              mistake rather than a decision. The smaller size stays in both
              footers, where they already agree. */}
          <span className="font-brand font-semibold text-t2">Kaizen</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-ink transition-colors">
              {l.label}
            </Link>
          ))}
          {back ? (
            <Link href={back} className="font-medium text-ink hover:text-accent transition-colors">
              Back to app
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
