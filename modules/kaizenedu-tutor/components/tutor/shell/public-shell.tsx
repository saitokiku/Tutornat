import type { ReactNode } from 'react';
import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { cn } from '@/lib/utils';

import { Logo } from '@/components/tutor/brand/logo';
import { NtButton } from '@/components/tutor/ui/button';

import { Footer } from './footer';
import { ThemeToggle } from './theme-toggle';

const SECTION_LINKS = [
  { href: `${PRODUCT_ROUTES.landing}#how-it-works`, label: 'How it works' },
  { href: `${PRODUCT_ROUTES.landing}#subjects`, label: 'Subjects' },
  { href: `${PRODUCT_ROUTES.landing}#privacy`, label: 'Privacy' },
  { href: `${PRODUCT_ROUTES.landing}#faq`, label: 'Questions' },
] as const;

export interface SignedInLink {
  href: string;
  label: string;
}

/**
 * The public shell for the landing, auth, and legal pages. One line at every
 * width: section links from 768 px up and the one call to action, which is
 * the start form on the landing page (D35: no sign-in, no sign-up, no trial
 * on the public surface). A visitor who already has a cookie, guest or
 * account, sees a link to their dashboard instead.
 */
export function PublicShell({
  children,
  signedIn = null,
  showCta = true,
  wide = false,
}: {
  children: ReactNode;
  signedIn?: SignedInLink | null;
  showCta?: boolean;
  wide?: boolean;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo href={PRODUCT_ROUTES.landing} />
            <nav aria-label="Sections" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {SECTION_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex h-9 items-center rounded-(--radius) px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <NtButton asChild tone="secondary" size="sm">
                <Link href={signedIn.href}>{signedIn.label}</Link>
              </NtButton>
            ) : showCta ? (
              <NtButton asChild size="sm">
                <Link href={`${PRODUCT_ROUTES.landing}#start`}>Start</Link>
              </NtButton>
            ) : null}
          </div>
        </div>
      </header>
      <main
        id="main"
        className={cn(
          'mx-auto flex w-full flex-1 flex-col px-4 sm:px-6',
          wide ? 'max-w-6xl' : 'max-w-3xl py-10',
        )}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
