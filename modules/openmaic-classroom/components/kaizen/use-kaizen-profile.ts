'use client';

/**
 * The local profile, shared by every Kaizen page.
 *
 * `localStorage` is external state, so it is read through `useSyncExternalStore`
 * rather than mirrored into component state in an effect — which is both the
 * pattern upstream already uses (`lib/hooks/use-asr-available.ts`) and what
 * keeps two Kaizen pages mounted at once from disagreeing.
 *
 * Deliberately not a zustand store: three fields, one key, and the nickname
 * must stay out of the upstream `user-profile` KV store, which is documented as
 * cross-device server-backed data.
 *
 * `getSnapshot` must return a stable reference or React re-renders forever, so
 * the parsed profile is cached at module scope and only replaced when something
 * actually writes (this tab, or a `storage` event from another tab).
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  DEFAULT_PROFILE,
  STORAGE_KEY,
  loadProfile,
  saveProfile,
  type KaizenProfile,
} from '@/lib/kaizen/client/profile';
import { useI18n } from '@/lib/hooks/use-i18n';

let cached: KaizenProfile | null = null;
const listeners = new Set<() => void>();

function snapshot(): KaizenProfile {
  cached ??= loadProfile();
  return cached;
}

/** Server render: the default, so the first client paint has nothing to mismatch. */
function serverSnapshot(): KaizenProfile {
  return DEFAULT_PROFILE;
}

function invalidate() {
  cached = null;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // One `storage` handler for the whole page, attached with the first consumer.
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) invalidate();
}

export function useKaizenProfile() {
  const profile = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const { locale, setLocale } = useI18n();

  // The one bridge between the two locale systems. Kaizen's own `strings.ts`
  // covers its chrome, but everything it hands off to — the stage, the shared
  // `/generation-preview`, the chat chrome — renders through upstream i18n,
  // whose default is `zh-CN`. `profile.lang` is already a supported upstream
  // locale code, so this is wiring, not translation. Lives in the hook rather
  // than in `KaizenShell` because `/kaizen/course/[id]` has no shell.
  // `setLocale` also persists to `localStorage.locale`, which is what
  // `I18nProvider` reads on a hard reload.
  useEffect(() => {
    if (locale !== profile.lang) setLocale(profile.lang);
  }, [locale, profile.lang, setLocale]);

  const update = useCallback((patch: Partial<KaizenProfile>) => {
    saveProfile({ ...snapshot(), ...patch });
    invalidate();
  }, []);

  return { profile, update };
}
