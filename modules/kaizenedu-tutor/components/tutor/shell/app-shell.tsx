import type { ReactNode } from 'react';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { SessionStateResponse } from '@/lib/tutor/wire';

import { Logo } from '@/components/tutor/brand/logo';

import { Footer } from './footer';
import { Header } from './header';
import type { ShellVariant } from './nav';

const SKIP_LINK =
  'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow';

/** The signed-in shell: header, content column, footer. Rendered inside the group layout's `.nt-app`. */
export function AppShell({
  variant,
  session,
  children,
}: {
  variant: ShellVariant;
  session: SessionStateResponse;
  children: ReactNode;
}) {
  return (
    <>
      <a href="#main" className={SKIP_LINK}>
        Skip to content
      </a>
      <Header variant={variant} session={session} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}

/** A shell with only the wordmark, for states that exist before identity (database not configured). */
export function BareShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className={SKIP_LINK}>
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo href={PRODUCT_ROUTES.landing} />
        </div>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
