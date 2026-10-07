import type { Role } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

export type ShellVariant = 'learner' | 'parent';

export interface NavItem {
  href: string;
  label: string;
  /** Exact-match links (the section roots) so `/parent` is not current on `/parent/billing`. */
  exact?: boolean;
}

export const PARENT_ROUTES = {
  overview: PRODUCT_ROUTES.parent,
  learners: `${PRODUCT_ROUTES.parent}/learners`,
  reports: `${PRODUCT_ROUTES.parent}/reports`,
  report: (learnerId: string) => `${PRODUCT_ROUTES.parent}/reports/${learnerId}`,
  transcripts: `${PRODUCT_ROUTES.parent}/transcripts`,
  billing: `${PRODUCT_ROUTES.parent}/billing`,
  consent: `${PRODUCT_ROUTES.parent}/consent`,
  settings: `${PRODUCT_ROUTES.parent}/settings`,
  data: `${PRODUCT_ROUTES.parent}/data`,
} as const;

/**
 * Role-aware navigation (infra-04). The learner app is one page, so its links
 * are that page's sections. A guest (D35) has no parent app and no account
 * page, so those items never appear for one. The parent app dropped its
 * reports index — it listed the same learners as the account page — so
 * Account is where every report is reached from.
 */
export function navFor(variant: ShellVariant, role: Role, guest = false): NavItem[] {
  if (variant === 'learner') {
    const items: NavItem[] = [
      { href: PRODUCT_ROUTES.learn, label: 'Learn', exact: true },
      { href: `${PRODUCT_ROUTES.learn}#planner`, label: 'Planner' },
      { href: `${PRODUCT_ROUTES.learn}#coursework`, label: 'Homework' },
      { href: `${PRODUCT_ROUTES.learn}#progress`, label: 'Progress' },
    ];
    if (guest) return items;
    if (role === 'parent') items.push({ href: PARENT_ROUTES.overview, label: 'Parent' });
    if (role === 'adult') items.push({ href: PARENT_ROUTES.settings, label: 'Account' });
    return items;
  }
  const items: NavItem[] = [
    { href: PARENT_ROUTES.overview, label: 'Account', exact: true },
    { href: PARENT_ROUTES.transcripts, label: 'Transcripts' },
    { href: PARENT_ROUTES.billing, label: 'Billing' },
    { href: PARENT_ROUTES.settings, label: 'Settings' },
  ];
  items.push({ href: PRODUCT_ROUTES.learn, label: 'Learn' });
  return items;
}

/** Whether a nav item is the current page for `pathname`. Hash links are never current. */
export function isCurrent(item: NavItem, pathname: string): boolean {
  if (item.href.includes('#')) return false;
  // The account page absorbed the learners and reports indexes, so it stays
  // the current item while a single learner's report is open.
  if (item.exact) {
    return (
      pathname === item.href ||
      pathname === `${item.href}/learners` ||
      pathname.startsWith(`${item.href}/reports`)
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
