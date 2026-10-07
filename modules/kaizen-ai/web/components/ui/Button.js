import Link from 'next/link';

// The one button. Twenty-five hand-typed pill recipes drifted into three
// paddings, three type sizes and three different transition properties (so the
// hover color animated on some and snapped on others); this exists so a page
// can never make that decision locally again. Need a new look? Add a variant
// here, not a utility string there.
//
// Ink acts, rose marks: `primary` is the ink pill on every surface, which is
// why crossing /pricing to /billing no longer changes the action color.
// `accent` is reserved for brand moments and the one destructive-adjacent
// confirm. Server component; pass onClick from a client parent as usual.

const VARIANTS = {
  primary: {
    day: 'bg-ink text-paper hover:bg-ink/90',
    night: 'bg-ember text-coal hover:bg-ember/90',
  },
  secondary: {
    day: 'bg-panel text-ink border border-border hover:border-ink/30',
    night: 'bg-transparent text-paper border border-nightline hover:border-ember/60',
  },
  accent: {
    day: 'bg-accent text-paper hover:bg-accent/90',
    night: 'bg-accent text-paper hover:bg-accent/90',
  },
  ghost: {
    day: 'bg-transparent text-ink hover:bg-panel2',
    night: 'bg-transparent text-paper hover:bg-coal2',
  },
};

const SIZES = {
  sm: 'text-sm px-4 py-2',
  md: 'text-sm px-6 py-3',
  lg: 'text-t3 px-7 py-3.5',
};

export default function Button({
  href,
  variant = 'primary',
  size = 'md',
  tone = 'day',
  block = false,
  className = '',
  children,
  ...rest
}) {
  const look = (VARIANTS[variant] || VARIANTS.primary)[tone === 'night' ? 'night' : 'day'];
  // Disabled is a real state, not a dimmed one. Fading the ink pill to 40%
  // opacity put its label at 2.54:1 against its own fill, under even the
  // large-text floor, so a disabled primary read as a broken control rather
  // than a waiting one. Instead it drops to the quiet surface with muted text
  // (4.9:1) and keeps its shape. A disabled button should still say what it is.
  const cls = [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold text-center',
    'transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:bg-panel2 disabled:text-muted',
    'disabled:border disabled:border-border disabled:shadow-none',
    SIZES[size] || SIZES.md,
    look,
    block ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  // Internal routes go through Link; anything with a scheme or a hash-only
  // target stays a plain anchor so in-page capture links keep working.
  if (href) {
    const external = /^(https?:|mailto:|tel:|#)/.test(href);
    if (external) return <a href={href} className={cls} {...rest}>{children}</a>;
    return <Link href={href} className={cls} {...rest}>{children}</Link>;
  }
  return <button className={cls} {...rest}>{children}</button>;
}
