import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Layout primitives shared by both dashboards. A section is a labelled region
 * with one heading and optional actions; a pill states a status in a word; an
 * estimate bar draws a 0-to-1 estimate and never claims more than that.
 */

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

export function Section({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // Every region carries an accessible name, so a screen reader's landmark
  // list reads as the page's outline rather than as a row of "section".
  const headingId = `${id ?? slug(title)}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('flex scroll-mt-20 flex-col gap-4', className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="nt-h2">
            {title}
          </h2>
          {description ? <p className="nt-small max-w-[68ch]">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'stop';

const PILL_TONES: Record<PillTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  brand: 'border-transparent bg-(--nt-brand-soft) text-accent-foreground',
  success: 'border-transparent bg-(--nt-success-soft) text-(--nt-success)',
  warning: 'border-transparent bg-(--nt-warning-soft) text-foreground',
  stop: 'border-transparent bg-(--nt-danger-soft) text-destructive',
};

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A 0-to-1 estimate. `status` colors it: a confirmed skill is the only one
 * drawn in the success color, and a not-started skill draws nothing.
 */
export function EstimateBar({
  value,
  status,
  label,
}: {
  value: number;
  status?: string;
  label: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="nt-bar" data-status={status} role="img" aria-label={`${label}: ${pct} percent`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Label-and-value rows for the dense parent surfaces. */
export function DataList({
  items,
  className,
}: {
  items: ReadonlyArray<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="nt-label">{item.label}</dt>
          <dd className="text-[length:var(--nt-text-body)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
