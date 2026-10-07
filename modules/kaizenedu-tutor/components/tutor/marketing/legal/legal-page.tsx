import type { ReactNode } from 'react';
import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { DRAFT_BANNER } from '@/lib/tutor/client/legal';

const OTHER = [
  { href: PRODUCT_ROUTES.legalTerms, label: 'Terms of service' },
  { href: PRODUCT_ROUTES.legalPrivacy, label: 'Privacy policy' },
  { href: PRODUCT_ROUTES.legalAi, label: 'AI disclosure' },
  { href: PRODUCT_ROUTES.legalCredits, label: 'Credits' },
] as const;

/**
 * Frame for the legal drafts. compliance/ is human-only and counsel sign-off
 * is not recorded there yet, so every page carries the draft banner.
 */
export function LegalPage({
  title,
  version,
  summary,
  current,
  children,
}: {
  title: string;
  version: string;
  summary: string;
  current: (typeof OTHER)[number]['href'];
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-8">
      <div
        role="status"
        className="rounded-(--radius) border border-(--nt-warning) bg-(--nt-warning-soft) px-4 py-3 text-sm font-medium"
      >
        {DRAFT_BANNER}. Version {version}. This text is not in force until counsel review is
        recorded.
      </div>
      <header className="flex flex-col gap-3">
        <h1 className="nt-h1">{title}</h1>
        <p className="nt-lead">{summary}</p>
      </header>
      <div className="nt-prose">{children}</div>
      <nav aria-label="Other legal pages" className="border-t border-border pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {OTHER.filter((page) => page.href !== current).map((page) => (
            <li key={page.href}>
              <Link href={page.href} className="underline underline-offset-4">
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
