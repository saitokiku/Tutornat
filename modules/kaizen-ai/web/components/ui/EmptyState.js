// The first-use experience, which for this product is the ONLY experience so
// far: Kaizen has no customers yet, so every empty state a surface renders is
// what a real first visitor actually sees.
//
// It was defined twice, locally, differently — `Empty` in the admin console
// (`px-5 py-8 text-center text-sm`) and again in the tutor workspace
// (`px-4 py-8 text-center text-xs`) — and everywhere else it was an ad-hoc grey
// sentence. Worse, several of those sentences were wrong in the way empty
// states usually are: /dashboard's Today tab greets a brand-new account with
// "All clear. You're ahead of your week," which is false — they are not ahead
// of anything, they have not started.
//
// So the primitive takes an ACTION, not just a line. An empty state that does
// not say what to do next is a dead end with better typography.
export default function EmptyState({ title, children, action = null, tone = 'day', className = '' }) {
  const muted = tone === 'night' ? 'text-nightmuted' : 'text-muted';
  return (
    <div className={`px-5 py-10 text-center ${className}`}>
      {title && <p className="text-sm font-medium text-ink">{title}</p>}
      {children && (
        <p className={`text-sm ${muted} ${title ? 'mt-1.5' : ''} max-w-prose mx-auto`}>{children}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
