// Inline status. Two rules this encodes, both learned the hard way in this
// codebase: a refusal never renders in the success channel (a refusal painted
// green reads as a confirmation), and status messages are inline where the
// action was, never a toast, because the surrounding form is the context.
//
// role is derived from the kind so screen readers interrupt for failures and
// stay quiet for confirmations.
const KINDS = {
  ok: 'bg-good/10 border-good/30 text-ink',
  bad: 'bg-bad/10 border-bad/30 text-ink',
  warn: 'bg-warn/10 border-warn/30 text-ink',
  info: 'bg-panel2 border-border text-ink',
};

export default function Notice({ kind = 'info', className = '', children, ...rest }) {
  if (!children) return null;
  return (
    <div
      role={kind === 'bad' ? 'alert' : 'status'}
      className={`rounded-sm border px-4 py-3 text-sm ${KINDS[kind] || KINDS.info} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
