import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

const TONE: Record<Tone, ComponentProps<typeof Button>['variant']> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
  link: 'link',
};

/**
 * Sizes scale with the surface: `md` and `lg` honor `--nt-target` so a
 * control on a kids' surface is at least 56 px tall without any page knowing
 * the band. `sm` is for dense parent tables and inline actions.
 */
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'nt-target px-4 text-[length:var(--nt-text-body)]',
  lg: 'nt-target px-6 text-[length:var(--nt-text-lead)] font-semibold',
};

export interface NtButtonProps extends Omit<ComponentProps<typeof Button>, 'variant' | 'size'> {
  tone?: Tone;
  size?: Size;
  /** Announces work in progress and blocks a second submit. */
  busy?: boolean;
}

export function NtButton({
  tone = 'primary',
  size = 'md',
  busy = false,
  className,
  disabled,
  children,
  ...props
}: NtButtonProps) {
  return (
    <Button
      variant={TONE[tone]}
      className={cn(
        'rounded-(--radius) transition-transform active:translate-y-px',
        tone === 'link' && 'h-auto px-0',
        tone !== 'link' && SIZE[size],
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {children}
    </Button>
  );
}
