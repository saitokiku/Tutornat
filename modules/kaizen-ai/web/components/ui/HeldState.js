// One held-state message for the whole product.
//
// The interior was shipping four of these, one per page, in four voices, and all
// four were written for the builder rather than the buyer: "Add your Supabase
// keys to enable sign-up", "Family accounts need a configured backend", "this
// deployment runs in demo mode". A parent who clicks "Open Kaizen" from the
// marketing header should never be handed an engineering task, or read the name
// of a vendor they have no relationship with.
//
// The product still degrades honestly (CLAUDE.md rule 6): this says plainly that
// the thing is not available yet. It just says it in the product's voice, and it
// never dresses an unavailable action up as a working one.
import Notice from '@/components/ui/Notice';

const COPY = {
  accounts: 'Accounts open when the club opens. Nothing is lost in the meantime.',
  family: 'Family accounts open when the club opens.',
  billing: 'Nothing is billed while the club is closed.',
  demo: 'This is a preview. Your work stays in this browser.',
};

export default function HeldState({ kind = 'accounts', children, className = '' }) {
  return (
    <Notice kind="info" className={className}>
      {children || COPY[kind] || COPY.accounts}
    </Notice>
  );
}
