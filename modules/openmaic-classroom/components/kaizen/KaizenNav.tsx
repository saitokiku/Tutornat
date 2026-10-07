'use client';

/**
 * Kaizen chrome: the rail (desktop) and the bottom bar (mobile).
 *
 * Geometry and selection language are from `delivery/kaizen-interior-extract.md`
 * §2 — 240px rail, one accent rule per active item, the same language rotated
 * to the top edge on mobile. Colour comes from the upstream token set
 * (`app/globals.css`) so this surface stays in the host app's light/dark theme
 * instead of hard-coding the Kaizen palette into a second theme.
 *
 * Every item here routes somewhere real. There are no disabled placeholder
 * destinations: the extract's rail had five, this has the three that exist.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LibraryBig, Sparkles, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { KaizenLang } from '@/lib/kaizen/client/profile';
import { strings } from '@/lib/kaizen/client/strings';

const NAV: ReadonlyArray<{ href: string; icon: LucideIcon; key: 'courses' | 'newCourse' | 'learner' }> =
  [
    { href: '/kaizen', icon: LibraryBig, key: 'courses' },
    { href: '/kaizen/new', icon: Sparkles, key: 'newCourse' },
    { href: '/kaizen/me', icon: GraduationCap, key: 'learner' },
  ];

function useActive() {
  const pathname = usePathname();
  // Exact match only: /kaizen/new must not also light up /kaizen.
  return (href: string) => pathname === href;
}

export function KaizenRail({ lang }: { readonly lang: KaizenLang }) {
  const t = strings(lang);
  const isActive = useActive();

  return (
    <nav
      aria-label={t.courses}
      className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-card px-3 py-5 lg:flex"
    >
      <div className="mb-5 flex items-center gap-2 px-3">
        <GraduationCap aria-hidden className="size-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">Kaizen</span>
      </div>
      {NAV.map(({ href, icon: Icon, key }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              // Large hit area: the extract's 10/12/10/16 padding, kept at the
              // 44px minimum touch target.
              'group relative flex min-h-11 items-center gap-3 rounded-[10px] py-2.5 pr-3 pl-4 text-sm font-medium transition-colors',
              active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
            )}
          >
            {/* The one accent rule that marks selection (extract §2). */}
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-1.5 left-0 w-0.5 rounded-full',
                active ? 'bg-primary' : 'bg-transparent',
              )}
            />
            <Icon aria-hidden className={cn('size-[18px]', active && 'text-primary')} />
            <span className="truncate">{t[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function KaizenMobileNav({ lang }: { readonly lang: KaizenLang }) {
  const t = strings(lang);
  const isActive = useActive();

  return (
    <nav
      aria-label={t.courses}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur lg:hidden"
    >
      {NAV.map(({ href, icon: Icon, key }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 px-2 pt-3 pb-2"
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-6 top-0 h-0.5 rounded-full',
                active ? 'bg-primary' : 'bg-transparent',
              )}
            />
            <Icon
              aria-hidden
              className={cn('size-6', active ? 'text-primary' : 'text-muted-foreground/60')}
            />
            <span
              className={cn(
                'text-[11px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {t[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
