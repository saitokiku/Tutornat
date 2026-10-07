'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { auth } from '@/lib/tutor/client';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';

export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const result = await auth.signOut();
    if (!result.ok && result.kind !== 'unauthenticated') {
      setBusy(false);
      toast.error(result.message);
      return;
    }
    // A full navigation drops every client cache that belonged to the old session.
    window.location.assign(PRODUCT_ROUTES.landing);
  }

  return (
    <NtButton
      tone="ghost"
      size="sm"
      busy={busy}
      onClick={() => void signOut()}
      className={className}
    >
      <LogOut aria-hidden="true" />
      Sign out
    </NtButton>
  );
}
