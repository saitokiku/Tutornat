'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { guestApi } from '@/lib/tutor/client';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { cn } from '@/lib/utils';

import { NtButton } from '@/components/tutor/ui/button';

/**
 * "Start over" for a guest (D35): deletes every row behind the cookie right
 * now and lands on the landing page. It is the one delete in the product
 * that takes a second press, because it is everything, and the confirmation
 * is a small row in place rather than a dialog: the sentence, Yes, Keep.
 * Escape is Keep. No "are you sure" loop beyond that.
 */
export function ForgetButton({ className }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const group = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Focus follows the control: onto the confirm row when it opens, back to
  // the button when it closes. Never on first render.
  useEffect(() => {
    if (confirming) group.current?.focus();
    else if (wasConfirming.current) opener.current?.focus({ preventScroll: true });
    wasConfirming.current = confirming;
  }, [confirming]);

  async function forget() {
    if (busy) return;
    setBusy(true);
    const result = await guestApi.forgetGuest();
    // An expired cookie means there is nothing left to delete; either way the
    // browser goes back to the start. A full navigation drops every client
    // cache that belonged to the old guest.
    if (!result.ok && result.kind !== 'unauthenticated') {
      setBusy(false);
      toast.error(result.message);
      return;
    }
    window.location.assign(PRODUCT_ROUTES.landing);
  }

  if (!confirming) {
    return (
      <div className={className}>
        <NtButton
          ref={opener}
          tone="ghost"
          size="sm"
          aria-expanded={false}
          onClick={() => setConfirming(true)}
        >
          <RotateCcw aria-hidden="true" />
          Start over
        </NtButton>
      </div>
    );
  }

  return (
    <div
      ref={group}
      tabIndex={-1}
      role="group"
      aria-label="Start over"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) setConfirming(false);
      }}
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-(--radius) border border-destructive bg-(--nt-danger-soft) px-3 py-2',
        className,
      )}
    >
      <p className="text-sm font-medium">This deletes everything here. Start over?</p>
      <NtButton tone="danger" size="sm" busy={busy} onClick={() => void forget()}>
        Yes, start over
      </NtButton>
      <NtButton tone="secondary" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
        Keep
      </NtButton>
    </div>
  );
}
