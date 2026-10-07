'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * A preference remembered per browser in localStorage and read through
 * `useSyncExternalStore`, so the server render is always the fallback and
 * hydration stays honest. Voice-or-text and the guest's grade level are
 * preferences rather than records, so they never leave the browser. Storage
 * can be unavailable (private browsing); the fallback then stands and not
 * being able to remember a choice is not worth an error.
 */
export function createRemembered<T extends string>(
  key: string,
  parse: (raw: string | null) => T,
  fallback: T,
): () => [T, (next: T) => void] {
  let stored: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (stored !== null) return stored;
    try {
      stored = parse(window.localStorage.getItem(key));
    } catch {
      stored = fallback;
    }
    return stored;
  }

  function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }

  return function useRemembered(): [T, (next: T) => void] {
    const value = useSyncExternalStore(subscribe, read, () => fallback);
    const choose = useCallback((next: T) => {
      stored = next;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Remembering is a convenience; the choice still applies this time.
      }
      for (const listener of listeners) listener();
    }, []);
    return [value, choose];
  };
}
