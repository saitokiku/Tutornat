'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/lib/hooks/use-theme';

const ORDER = ['light', 'dark', 'system'] as const;

/** Cycles light, dark, system through the ThemeProvider that app/layout.tsx mounts. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
      className="inline-flex size-9 items-center justify-center rounded-(--radius) text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
