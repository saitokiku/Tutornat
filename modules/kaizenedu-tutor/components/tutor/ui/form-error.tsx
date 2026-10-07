'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The form-level error (a server answer such as "email already in use",
 * "wrong password", "rate limited"). It takes focus when it appears so a
 * keyboard or screen-reader user lands on the message, not on a silent form.
 */
export function FormError({ message, className }: { message: string | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-(--radius) border border-destructive bg-(--nt-danger-soft) px-4 py-3 text-[length:var(--nt-text-body)]',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
