'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine !== false;
}

/** Shown while `navigator.onLine` is false; the server render assumes online. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, readOnline, () => true);
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-(--nt-warning-soft) px-4 py-2 text-sm font-medium"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      You’re offline. Sessions and saving pause until the connection is back.
    </div>
  );
}
