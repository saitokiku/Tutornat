import Link from 'next/link';

import { publicConfig } from '@/kaizen.config';
import { cn } from '@/lib/utils';

const NAME = publicConfig.product.workingName;
const INITIALS = NAME.split(/\s+/)
  .map((word) => word.charAt(0))
  .join('')
  .slice(0, 2)
  .toUpperCase();

interface LogoProps {
  /** Where the wordmark links; omit for a static mark. */
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Typographic logo: the product name set in the UI face beside a small
 * two-letter mark on the brand color. No illustration, no mascot (spec D13,
 * design-system "no robot iconography").
 */
export function Logo({ href, size = 'md', className }: LogoProps) {
  const markSize =
    size === 'lg' ? 'size-9 text-sm' : size === 'sm' ? 'size-6 text-[10px]' : 'size-7 text-[11px]';
  const nameSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base';
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[30%] bg-primary font-semibold tracking-tight text-primary-foreground',
          markSize,
        )}
      >
        {INITIALS}
      </span>
      <span className={cn('font-semibold tracking-tight', nameSize)}>{NAME}</span>
    </>
  );
  const classes = cn('inline-flex items-center gap-2 rounded-md', className);
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${NAME} home`}>
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
