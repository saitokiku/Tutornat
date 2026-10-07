// The diagnostic order lifecycle — one table of transitions, in one module.
//
// It lives in lib/server rather than beside the route because TWO callers need
// it: /api/diagnostic (which creates orders and reads them back) and the Stripe
// webhook (which moves them on payment). A route importing another route pulls
// a whole handler's module graph in behind it, and two copies of a transition
// table is how a refunded order eventually gets marked delivered.
//
// PURE — no I/O, so the machine is testable without a database
// (test/diagnostic.test.mjs).

// Mirrors the CHECK constraint on diagnostic_order.status (0036).
export const ORDER_STATUSES = ['pending', 'paid', 'scheduled', 'delivered', 'refunded'];

// The lifecycle, as a table rather than as a pile of ifs.
//
// Read a row as "from this status, this event lands the order here". An event
// with no entry is REFUSED and the order does not move. Three properties are
// load-bearing:
//
//   1. `paid` is idempotent and never walks an order BACKWARDS. Stripe retries
//      checkout.session.completed, and a retry that arrives after the director
//      has already delivered the report must not reset the order to 'paid'.
//   2. 'refunded' is terminal. Money came back; the promise is off. A refunded
//      order that could still be delivered would put an unpaid report on the
//      funnel board as revenue-earning work.
//   3. Nothing may be scheduled or delivered from 'pending'. An unpaid
//      diagnostic has bought nobody's time.
const TRANSITIONS = {
  pending:   { paid: 'paid', refunded: 'refunded' },
  paid:      { paid: 'paid', scheduled: 'scheduled', delivered: 'delivered', refunded: 'refunded' },
  scheduled: { paid: 'scheduled', scheduled: 'scheduled', delivered: 'delivered', refunded: 'refunded' },
  delivered: { paid: 'delivered', scheduled: 'delivered', delivered: 'delivered', refunded: 'refunded' },
  refunded:  { refunded: 'refunded' },
};

/**
 * Fold one lifecycle event into an order status. PURE — no I/O, so the machine
 * is testable without a database (test/diagnostic.test.mjs).
 *
 * Returns { status, changed, refused }:
 *   changed=false, refused=false → the event was legal and a no-op (a retry)
 *   refused=true                 → the event was illegal; `status` is unmoved
 */
export function applyOrderEvent(current, event) {
  const from = ORDER_STATUSES.includes(current) ? current : 'pending';
  const to = TRANSITIONS[from]?.[String(event || '')];
  if (!to) return { status: from, changed: false, refused: true };
  return { status: to, changed: to !== from, refused: false };
}

/** What the client is allowed to see of an order. report_md is not in it. */
export function publicOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    amountCents: row.amount_cents,
    studentId: row.student_id,
    placementSessionId: row.placement_session_id || null,
    deliveredAt: row.delivered_at || null,
    createdAt: row.created_at,
  };
}
