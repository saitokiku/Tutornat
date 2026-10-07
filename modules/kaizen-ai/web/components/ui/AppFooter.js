import Link from 'next/link';
import { KaizenMark } from '@/components/Brand';

// The interior close: the marketing footer, reduced.
//
// Every marketing page ends on Shell's footer; the interior simply stopped, so
// a settings page could end with 570px of bare background and no entity line,
// no legal links, and no way out except two small header links. The first fix
// gave it a 40px bar with the copyright left and four links right, which closed
// the page but read as a different product: same site, two unrelated endings.
//
// So this is the same footer with things taken away, not another one. Same
// hairline, same max-w-wide column and left edge, same 24px mark and text-t3
// wordmark, same text-sm links and text-xs entity line. What goes is the
// tagline, the column headings, ten of the fourteen links, and half the
// vertical room. A visitor crossing /pricing to /settings should read it as the
// short version of a footer they have already seen.
const LINKS = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/safety', 'Safety'],
  ['/contact', 'Contact'],
];

export default function AppFooter({ className = '' }) {
  return (
    <footer className={`mt-auto border-t border-border text-muted ${className}`}>
      <div className="max-w-wide mx-auto px-5 py-10 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-12">
          <div>
            <span className="flex items-center gap-2.5">
              <KaizenMark size={24} />
              <span className="font-brand font-semibold text-t3 text-ink">Kaizen</span>
            </span>
            {/* Legal fine print at the same 13px the marketing footer sets it
                in, in the same secondary token (AA on paper), never dimmed. */}
            <p className="text-xs mt-4">
              © {new Date().getFullYear()} Kaizen Academy LLC. Kaizen serves students ages 13 and up.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-8 gap-y-2.5 sm:justify-end" aria-label="Company and legal">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="text-sm transition-colors hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
