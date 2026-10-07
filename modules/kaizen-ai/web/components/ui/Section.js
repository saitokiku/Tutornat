// Page rhythm, decided once. Ten public pages previously used seven container
// widths and no two sections shared a vertical rhythm, so every page opened at
// a different distance from the header. Three measures, four rhythms, no
// per-page arithmetic.
//
// width: 'wide' (the grid) | 'prose' (a reading column) | 'narrow' (forms)
// space: 'tight' | 'default' | 'loose' | 'flush' (caller owns the padding)

const WIDTHS = {
  wide: 'max-w-wide',
  prose: 'max-w-prose',
  narrow: 'max-w-narrow',
};

const SPACE = {
  flush: '',
  tight: 'py-12 sm:py-16',
  default: 'py-16 sm:py-24',
  loose: 'py-24 sm:py-32',
};

// The first section on a page carries the header offset instead of inventing a
// bespoke pt-* every time.
const LEAD = 'pt-14 sm:pt-20 pb-16 sm:pb-24';

export default function Section({
  width = 'wide',
  space = 'default',
  lead = false,
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag className={[lead ? LEAD : SPACE[space] ?? SPACE.default, className].filter(Boolean).join(' ')} {...rest}>
      {/* w-full is load-bearing: when a caller makes the outer tag a flex
          column (to push a footer down, or to center a short gate in the
          viewport), this rail becomes a flex item, and `mx-auto` on a flex item
          cancels the default cross-axis stretch. Without w-full the rail
          shrink-wraps to its content and re-centers, which is how /settings
          ended up with its title 280px right of the header framing it. */}
      <div className={`${WIDTHS[width] || WIDTHS.wide} w-full mx-auto px-5`}>{children}</div>
    </Tag>
  );
}
