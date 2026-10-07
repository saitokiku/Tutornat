// A surface. Cards are for real elevation only: if the content just needs
// grouping, use a hairline or space instead and pass variant="plain".
//
// variant: 'raised' (white, hairline, soft shadow) | 'inset' (quiet fill)
//        | 'plain' (no chrome; grouping by spacing alone)
const VARIANTS = {
  raised: {
    day: 'bg-panel border border-border shadow-soft',
    night: 'bg-coal2 border border-nightline',
  },
  inset: {
    day: 'bg-panel2 border border-border',
    night: 'bg-coal2/60 border border-nightline',
  },
  plain: { day: '', night: '' },
};

const PAD = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export default function Card({
  variant = 'raised',
  tone = 'day',
  pad = 'md',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const look = (VARIANTS[variant] || VARIANTS.raised)[tone === 'night' ? 'night' : 'day'];
  const shape = variant === 'plain' ? '' : 'rounded-md';
  return (
    <Tag className={[shape, look, PAD[pad] ?? PAD.md, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
