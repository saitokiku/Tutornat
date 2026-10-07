import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Database, WifiOff } from 'lucide-react';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { ClientFailure } from '@/lib/tutor/client';
import { cn } from '@/lib/utils';

import { NtButton } from '@/components/tutor/ui/button';

/**
 * The screen states every product surface ships with (CLAUDE.md): loading,
 * empty, error, offline, and the "not configured" states from spec D19.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('nt-skeleton h-4 w-full', className)} />;
}

export function LoadingState({ label = 'Loading', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-2">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={index % 2 === 0 ? 'w-full' : 'w-5/6'} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="nt-panel flex flex-col items-start gap-3 p-6">
      <h3 className="nt-h3">{title}</h3>
      {body ? <p className="nt-body text-muted-foreground">{body}</p> : null}
      {action}
    </div>
  );
}

type NoticeTone = 'neutral' | 'warning' | 'stop' | 'success';

const TONE_CLASSES: Record<NoticeTone, string> = {
  neutral: 'border-border bg-card',
  warning: 'border-(--nt-warning) bg-(--nt-warning-soft)',
  stop: 'border-destructive bg-(--nt-danger-soft)',
  success: 'border-(--nt-success) bg-(--nt-success-soft)',
};

export function InlineNotice({
  tone = 'neutral',
  title,
  children,
  action,
  role = 'status',
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: 'status' | 'alert';
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col gap-2 rounded-(--radius) border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="nt-small text-foreground/80">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function NotConfiguredState({ area }: { area: 'database' | 'billing' }) {
  const copy =
    area === 'database'
      ? {
          title: 'The product database is not configured',
          body: 'This deployment has no DATABASE_URL. Accounts, sessions, and progress cannot be stored until the operator sets it (a Neon Postgres connection string) and restarts the server.',
        }
      : {
          title: 'Billing is not configured',
          body: 'This deployment has no Stripe keys. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_MONTHLY on the server to turn on checkout and the customer portal.',
        };
  return (
    <div className="nt-panel flex items-start gap-4 p-6" role="status">
      <Database className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="nt-h3">{copy.title}</h2>
        <p className="nt-body text-muted-foreground">{copy.body}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  failure,
  onRetry,
  title,
}: {
  failure: ClientFailure;
  onRetry?: () => void;
  title?: string;
}) {
  if (failure.kind === 'not_configured') return <NotConfiguredState area="database" />;
  const offline = failure.kind === 'offline';
  const heading =
    title ??
    (offline
      ? 'You’re offline'
      : failure.kind === 'forbidden'
        ? 'Not available for this account'
        : failure.kind === 'no_learner'
          ? 'Choose a learner first'
          : failure.kind === 'rate_limited'
            ? 'Too many attempts'
            : 'Something went wrong');
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className="nt-panel flex items-start gap-4 p-6" role="alert">
      <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="nt-h3">{heading}</h2>
        <p className="nt-body text-muted-foreground">{failure.message}</p>
        {onRetry ? (
          <div>
            <NtButton tone="secondary" size="sm" onClick={onRetry}>
              Try again
            </NtButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A learner-role (teen) session opened a parent page. */
export function AskParentState() {
  return (
    <div className="nt-panel flex flex-col gap-3 p-6">
      <h1 className="nt-h2">This part is for the account holder</h1>
      <p className="nt-body text-muted-foreground">
        Learner profiles, billing, and settings are managed by the parent who owns the account. Ask
        them to sign in with their own email to change anything here.
      </p>
      <div>
        <NtButton asChild tone="primary">
          <Link href={PRODUCT_ROUTES.learn}>Back to learning</Link>
        </NtButton>
      </div>
    </div>
  );
}
