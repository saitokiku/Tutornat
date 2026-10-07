// The small uppercase label above a headline. One recipe for the whole product
// (there were nine letterspacings across two half-followed conventions), and
// deliberately rationed: at most one per three sections, hero counting as one.
// Most sections do not need one at all. The section's position on the page
// already tells the reader what it is.
export default function Eyebrow({ tone = 'day', className = '', children, ...rest }) {
  const color = tone === 'night' ? 'text-ember' : 'text-accent';
  return (
    <p className={`font-opmono text-micro font-medium uppercase ${color} ${className}`} {...rest}>
      {children}
    </p>
  );
}
