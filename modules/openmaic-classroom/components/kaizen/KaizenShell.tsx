'use client';

/**
 * Kaizen shell: rail + main column + mobile bar, and the language toggle.
 *
 * A client layout because the rail's active state and the language choice both
 * come from the local profile. It mounts inside the upstream root layout, so
 * `ThemeProvider`, `I18nProvider`, the toaster and the access-code guard are
 * all already in place above it — this adds no providers of its own.
 */

import type { ReactNode } from 'react';
import { Languages } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { KaizenLang } from '@/lib/kaizen/client/profile';

import { KaizenMobileNav, KaizenRail } from './KaizenNav';
import { ReadAloudNote } from './ReadAloudNote';
import { useKaizenProfile } from './use-kaizen-profile';

const LANGS: ReadonlyArray<{ code: KaizenLang; label: string }> = [
  { code: 'en-US', label: 'English' },
  { code: 'es-MX', label: 'Español' },
];

export function KaizenShell({
  title,
  /** One plain sentence saying what this screen is for. Rendered as a note
   *  region so assistive tech announces it; not spoken (voice is out of scope
   *  for now). */
  note,
  children,
}: {
  readonly title: string;
  readonly note?: string;
  readonly children: ReactNode;
}) {
  const { profile, update } = useKaizenProfile();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <KaizenRail lang={profile.lang} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pb-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <div className="flex items-center gap-2">
            {/* Two languages, both always visible — no dropdown to read. */}
            <div
              role="group"
              aria-label="Language"
              className="flex items-center gap-1 rounded-full border border-border bg-card p-1"
            >
              <Languages aria-hidden className="ml-2 size-4 text-muted-foreground" />
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => update({ lang: code })}
                  aria-pressed={profile.lang === code}
                  className={cn(
                    'min-h-9 rounded-full px-3 text-sm font-semibold transition-colors',
                    profile.lang === code
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>
        {note ? <ReadAloudNote text={note} className="mb-5 max-w-prose" /> : null}
        {children}
      </main>
      <KaizenMobileNav lang={profile.lang} />
    </div>
  );
}
