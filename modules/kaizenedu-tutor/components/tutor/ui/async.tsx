'use client';

import type { ReactNode } from 'react';

import type { Loaded } from './use-load';

import { ErrorState, LoadingState } from '@/components/tutor/shell/states';

/**
 * The loading, error, and offline states for a section that reads the API.
 * `ErrorState` already renders the offline and "database not configured"
 * cases, so a screen only writes the success branch.
 */
export function Async<T>({
  loaded,
  label,
  lines,
  children,
  errorTitle,
}: {
  loaded: Loaded<T>;
  label: string;
  lines?: number;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}) {
  if (loaded.loading || !loaded.result) return <LoadingState label={label} lines={lines} />;
  if (!loaded.result.ok) {
    return <ErrorState failure={loaded.result} onRetry={loaded.reload} title={errorTitle} />;
  }
  return <>{children(loaded.result.data)}</>;
}
