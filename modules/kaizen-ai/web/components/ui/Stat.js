// A number the product asserts. Mono, because these are record values: times,
// prices, counts, percentages. Label sits under the figure so a row of stats
// scans as figures first.
export default function Stat({ value, label, tone = 'day', className = '', ...rest }) {
  const sub = tone === 'night' ? 'text-nightmuted' : 'text-muted';
  return (
    <div className={className} {...rest}>
      <p className="font-opmono text-t1 tabular-nums">{value}</p>
      <p className={`text-xs mt-1 ${sub}`}>{label}</p>
    </div>
  );
}
