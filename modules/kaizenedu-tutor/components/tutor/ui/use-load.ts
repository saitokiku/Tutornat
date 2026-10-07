'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ClientResult } from '@/lib/tutor/client';

export interface Loaded<T> {
  /** True until the first answer and during a reload. */
  loading: boolean;
  /** The last answer, or null before the first one. */
  result: ClientResult<T> | null;
  reload: () => void;
  /** Replace the loaded value in place after a local mutation. */
  setData: (updater: (data: T) => T) => void;
}

/**
 * Runs a stable loader (wrap it in useCallback) and exposes loading, the typed
 * result, a reload, and a local updater. A reload keeps the old data out of
 * view so the screen never shows a stale success next to a new failure.
 */
export function useLoad<T>(loader: () => Promise<ClientResult<T>>): Loaded<T> {
  const [token, setToken] = useState(0);
  const [settled, setSettled] = useState<{ token: number; result: ClientResult<T> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loader().then((result) => {
      if (!cancelled) setSettled({ token, result });
    });
    return () => {
      cancelled = true;
    };
  }, [loader, token]);

  const reload = useCallback(() => setToken((value) => value + 1), []);
  const setData = useCallback((updater: (data: T) => T) => {
    setSettled((current) => {
      if (!current || !current.result.ok) return current;
      return { ...current, result: { ok: true, data: updater(current.result.data) } };
    });
  }, []);

  const loading = settled === null || settled.token !== token;
  return { loading, result: loading ? null : settled.result, reload, setData };
}
