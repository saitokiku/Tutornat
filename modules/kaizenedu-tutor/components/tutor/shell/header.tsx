'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { SessionStateResponse } from '@/lib/tutor/wire';
import { cn } from '@/lib/utils';

import { Logo } from '@/components/tutor/brand/logo';

import { ForgetButton } from './forget-button';
import { LearnerSwitcher } from './learner-switcher';
import { isCurrent, navFor, type ShellVariant } from './nav';
import { SignOutButton } from './sign-out-button';
import { ThemeToggle } from './theme-toggle';

/**
 * Signed-in header: product name, role-aware navigation, the learner
 * switcher for accounts with several profiles, sign-out. A guest (D35) has
 * no account to sign out of; the same slot holds "Start over", which deletes
 * everything behind the cookie. One line on desktop (height 64 px), a
 * disclosure menu under 768 px.
 */
export function Header({
  variant,
  session,
}: {
  variant: ShellVariant;
  session: SessionStateResponse;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const guest = session.account.guest;
  const items = navFor(variant, session.principal.role, guest);
  const showSwitcher = session.principal.role === 'parent' && session.learners.length > 0;
  const home = variant === 'parent' ? PRODUCT_ROUTES.parent : PRODUCT_ROUTES.learn;
  const menuId = 'nt-header-menu';

  const links = (onNavigate?: () => void) =>
    items.map((item) => {
      const current = isCurrent(item, pathname);
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'nt-target inline-flex items-center rounded-(--radius) px-3 text-[length:var(--nt-text-body)] font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-9',
              current && 'bg-accent text-accent-foreground hover:bg-accent',
            )}
          >
            {item.label}
          </Link>
        </li>
      );
    });

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo href={home} />
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">{links()}</ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {showSwitcher ? (
            <LearnerSwitcher
              learners={session.learners}
              selectedId={session.principal.learnerId}
              className="hidden md:flex"
            />
          ) : null}
          <ThemeToggle />
          {guest ? (
            <ForgetButton className="hidden md:flex" />
          ) : (
            <SignOutButton className="hidden md:inline-flex" />
          )}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-(--radius) hover:bg-muted md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div id={menuId} hidden={!open} className="border-t border-border md:hidden">
        <nav aria-label="Primary, mobile" className="mx-auto w-full max-w-6xl px-4 py-3">
          <ul className="flex flex-col gap-1">{links(() => setOpen(false))}</ul>
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            {showSwitcher ? (
              <LearnerSwitcher
                learners={session.learners}
                selectedId={session.principal.learnerId}
                size="lg"
              />
            ) : null}
            {guest ? (
              <>
                <p className="nt-small">
                  No account. This browser holds your work. Start over deletes it.
                </p>
                <ForgetButton className="self-start" />
              </>
            ) : (
              <>
                <p className="nt-small">
                  Signed in as {session.account.displayName} ({session.account.email})
                </p>
                <SignOutButton className="self-start" />
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
