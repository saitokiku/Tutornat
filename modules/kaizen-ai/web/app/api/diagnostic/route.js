// GET  /api/diagnostic  → is the diagnostic buyable, WHO may it be bought for,
//                         and what has this family bought (report included)?
// POST /api/diagnostic  → open a one-time Stripe Checkout session and record
//                         the order that belongs to it.
//
// The diagnostic is the first thing the Program Director sells (spec W3): a
// family pays once, the student sits the adaptive placement
// (/api/engine/placement), and a person writes the report. The money is
// one-time — no plan, no entitlement, no metering — so there is deliberately no
// checkEntitlement call here and no plan_entitlements feature key to consume.
// clubPricing.DIAGNOSTIC is the price; diagnostic_order (0036) is the record.
//
// The ORDER STATE MACHINE is lib/server/diagnosticOrders.js, imported by this
// route AND by the Stripe webhook. One table of transitions, one place a refund
// becomes terminal — two copies is how a refunded order eventually gets marked
// delivered.
//
// THREE THINGS THIS ROUTE GOT WRONG, and what it does now
// (docs/superpowers/specs/2026-09-02-wave2-audit.md):
//
//   1. WHOSE CHILD. The page posted an empty body, so resolveBookingStudent
//      fell to its `self` branch and stamped student_id = the payer. A parent
//      then bought a placement recorded against her own account. A caller who
//      has children must now name one (`student_required`), and the picker is
//      served from `buyableStudents` so it can never offer a name the POST
//      would refuse.
//   2. THE REPORT NEVER CAME BACK. The offer sells "a written report from a
//      person", the Director writes it into report_md, and publicOrder strips
//      it. `familyOrder` releases it — to the payer or the student, once the
//      order is delivered, and never before.
//   3. ABANDONED CHECKOUTS READ AS SALES. A row was inserted at 'pending' on
//      every press of the button, before Stripe was ever opened. Now the row is
//      written only once a real Checkout session exists, and a family who
//      presses twice is handed the session they already have. A family who
//      comes back two days later — after Stripe expired that session at 24h —
//      gets a fresh session written INTO THE SAME ROW rather than a second row
//      beside it, because `pending` is what the funnel counts as an abandoned
//      checkout and three visits by one family are one checkout, not two
//      abandonments and a sale. See `pendingOrderFor`, `checkoutPlan` and
//      `recordCheckout`.

import { randomUUID } from 'node:crypto';
import { getCaller, serviceClient, getSettings, auditLog } from '@/lib/server/context';
import { resolveBookingStudent } from '@/lib/server/family';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { getStripe, appUrl, ONE_TIME_PRICES } from '@/lib/server/stripe';
import { DIAGNOSTIC } from '@/lib/server/clubPricing';
import { isMissingSchema } from '@/lib/engine/ledger';
import { publicOrder } from '@/lib/server/diagnosticOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Not-configured, said once. Hard Rule 6: a missing key produces an explicit
// state, never a crash and never a fake order. Two distinct reasons, because
// "no Stripe account" and "the Price was never created" are different jobs for
// whoever is standing up the deployment.
//
// The distinction lives HERE and on the envelope, not in the page's copy. Which
// key is missing is an operator's problem; the family gets one sentence that
// tells the truth about what they can do next.
//
// WHERE AN OPERATOR ACTUALLY READS IT, precisely, because the honest answer is
// narrower than "the console": `reason` is on the RAW ENVELOPE of GET
// /api/diagnostic and nowhere else. No admin page reads it, /api/health does
// not report the diagnostic's Stripe Price, and the 501 body carrying
// STRIPE_PRICE_DIAGNOSTIC is unreachable from the UI, because the page does not
// render a Buy button while it is held. So standing this deployment up means
// GET /api/diagnostic (signed in or not — availability is public) and reading
// `reason`; /diagnostic also stamps it on the held block as `data-reason`, for
// an operator who has the page open. Surfacing it in the admin console is a
// follow-up, and until that ships this comment must not pretend otherwise.
function unconfigured() {
  if (!getStripe()) {
    return { code: 'stripe_unconfigured', error: 'Online payments aren’t set up on this deployment yet, so the diagnostic can’t be bought here.' };
  }
  if (!ONE_TIME_PRICES.diagnostic) {
    return { code: 'price_unconfigured', error: 'The diagnostic isn’t priced in Stripe on this deployment yet (STRIPE_PRICE_DIAGNOSTIC).' };
  }
  return null;
}

// Is the diagnostic on sale? Its OWN switch, and the club's as a shortcut.
//
// The diagnostic is the first thing the release plan sells (stage 1: ten paid
// diagnostics) and the last thing that should wait on the club's master
// switch, because it gates none of what that switch exists to gate — no room,
// no minor in a building, no recurring charge, no allowance to meter. It is
// one adult buying one assessment. So it has `diagnostic_enabled`, which fails
// closed exactly like everything else; an open club implies it, because a
// company selling seats is self-evidently selling the assessment that leads to
// one.
function diagnosticOpen(settings) {
  return settings?.diagnostic_enabled === true || settings?.club_enabled === true;
}

/**
 * Everyone this caller may buy a diagnostic FOR, in the order a parent thinks
 * of them: the children whose accounts they created, then any student who
 * accepted their invite.
 *
 * It is deliberately the SAME two relationships bookingRelationship trusts
 * (lib/server/family.js), so the picker can never offer a name the POST will
 * refuse — and the caller themself is never in it. A payer who created a
 * teen's account is the guardian, not the learner, and offering "myself" beside
 * their child's name is how the purchase ends up on the wrong ledger again.
 * (A caller with no children at all is buying for themself and gets no picker;
 * an explicit self-purchase is still legal at the route, it is just not a thing
 * this list proposes.)
 *
 * EVERY READ IS ERROR-CHECKED, and that is why this does not simply call
 * `managedChildren`. That helper answers `[]` when its read fails, which is
 * right for rendering a list and wrong for a gate: an empty list is exactly
 * what tells the POST below "this caller has no children, so the purchase is
 * for themself". A database hiccup would silently reinstate the bug this
 * picker exists to close. Here a failed read throws, the checkout is refused,
 * and nothing is charged.
 */
export async function buyableStudents(svc, callerId) {
  const { data: managed, error: managedErr } = await svc.from('profiles')
    .select('id,name,email')
    .eq('managed_by', callerId)
    .order('created_at', { ascending: true });
  if (managedErr) throw new Error(managedErr.message);

  const out = (managed || [])
    .filter((c) => c.id && c.id !== callerId)
    .map((c) => ({ id: c.id, name: c.name || c.email || 'Your child', relationship: 'managed' }));

  const { data: links, error: linkErr } = await svc.from('parent_student_relationships')
    .select('student_id').eq('parent_id', callerId).eq('status', 'active');
  if (linkErr) throw new Error(linkErr.message);

  const seen = new Set(out.map((s) => s.id));
  const extra = [...new Set((links || []).map((l) => l.student_id))]
    .filter((id) => id && id !== callerId && !seen.has(id));
  if (extra.length) {
    const { data: people, error: peopleErr } = await svc.from('profiles')
      .select('id,name,email').in('id', extra);
    if (peopleErr) throw new Error(peopleErr.message);
    for (const p of people || []) {
      out.push({ id: p.id, name: p.name || p.email || 'Your student', relationship: 'invite' });
    }
  }
  return out;
}

/**
 * One order, as the family is allowed to see it. PURE, so the release rule for
 * the report is unit-tested rather than hoped for (test/diagnostic.test.mjs).
 *
 * publicOrder is the shared shape and deliberately withholds report_md — it is
 * also what the admin console renders, and the payer's copy is a different
 * decision from the Director's copy. That decision is made HERE, once, and both
 * halves of it have to hold: the order is DELIVERED (the Director has written
 * and sent it; the admin route refuses to deliver without one), and the reader
 * is the payer or the student it was written about. Anything else gets null,
 * not an empty string, so a surface cannot render a blank report as a report.
 *
 * `forViewer` says whether the reader is the student. It is what stops a parent
 * sitting her child's placement: the run is written to whoever is signed in
 * (/api/engine/placement keys every attempt on caller.user.id), so an
 * assessment sat by the payer would put the child's baseline on the payer's
 * record.
 */
export function familyOrder(row, viewerId, nameOf = {}) {
  const base = publicOrder(row);
  if (!base) return null;
  const isPayer = row.payer_id === viewerId;
  const isStudent = row.student_id === viewerId;
  const delivered = row.status === 'delivered';
  return {
    ...base,
    forViewer: isStudent,
    studentName: isStudent ? null : (nameOf[row.student_id] || null),
    report: delivered && (isPayer || isStudent) ? (row.report_md || null) : null,
  };
}

export async function GET(req) {
  const caller = await getCaller(req);
  const svc = serviceClient();
  const blocked = unconfigured();
  const settings = await getSettings();
  // Fails CLOSED, same law as every other selling surface: the switch must be
  // explicitly true. The diagnostic ends in a person writing a report, so it
  // sells only once the club does (REVIEW_QUEUE items 10-15).
  const notYetOpen = !diagnosticOpen(settings);

  // Availability is public information — /api/club/schedule already answers
  // notYetOpen to anyone — so a signed-out visitor gets an honest storefront
  // instead of a 401 and a blank page. No order ever leaves without a caller.
  const envelope = {
    configured: !blocked,
    reason: blocked?.code || null,
    notYetOpen,
    signedIn: Boolean(caller && !caller.demo),
    students: [],
    orders: [],
  };
  if (!caller || caller.demo || !svc) return Response.json(envelope);

  try {
    // Their own orders, as payer or as the student sitting it. Mirrors the RLS
    // policy in 0036; the service role bypasses RLS, so the scope is re-stated
    // here rather than assumed. payer_id and report_md join the select because
    // familyOrder needs both to decide whether the report is this reader's.
    const { data, error } = await svc.from('diagnostic_order')
      .select('id,status,amount_cents,payer_id,student_id,placement_session_id,delivered_at,report_md,created_at')
      .or(`payer_id.eq.${caller.user.id},student_id.eq.${caller.user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const rows = data || [];
    // A parent's page has to say WHOSE placement each row is, or a family with
    // two children reads two identical cards.
    const ids = [...new Set(rows.map((r) => r.student_id).filter((id) => id && id !== caller.user.id))];
    let nameOf = {};
    if (ids.length) {
      const { data: people } = await svc.from('profiles').select('id,name').in('id', ids);
      nameOf = Object.fromEntries((people || []).map((p) => [p.id, p.name || null]));
    }

    // Who a purchase may be FOR is a GATE, not a decoration: with no list the
    // POST below cannot tell a childless caller from a parent whose read
    // failed, and it must not guess. So a failure here reports the page held
    // rather than dropping the picker and leaving the button live — while the
    // orders still render, because a family should not lose the report they
    // paid for over a profile read that blinked.
    let students = [];
    let familyRead = true;
    try {
      students = await buyableStudents(svc, caller.user.id);
    } catch (err) {
      console.error('[diagnostic GET] family read failed', err?.message);
      familyRead = false;
    }

    return Response.json({
      ...envelope,
      ...(familyRead ? {} : { configured: false, reason: 'unreachable' }),
      students,
      orders: rows.map((r) => familyOrder(r, caller.user.id, nameOf)),
    });
  } catch (err) {
    // Migration 0036 not applied on this deployment: say so, the same way the
    // engine routes answer an unapplied 0012/0013.
    if (isMissingSchema(err)) {
      return Response.json({ ...envelope, configured: false, reason: 'not_provisioned' });
    }
    console.error('[diagnostic GET]', err?.message);
    return Response.json({ error: 'Could not load your diagnostics.' }, { status: 500 });
  }
}

/**
 * The order this family already has in flight for this child, if any.
 *
 * ONE PENDING ROW PER (payer, student) is the invariant this read and
 * `recordCheckout` keep between them, and it is not tidiness: `pending` is what
 * the funnel board counts as an abandoned checkout
 * (app/api/admin/funnel/route.js), and a family who presses on Monday, comes
 * back on Wednesday and pays on Friday is ONE checkout that took three visits —
 * not two abandonments and a sale. Rows with no session id are included so a
 * legacy row is reused rather than orphaned beside a new one.
 *
 * WHAT THIS STILL DOES NOT CLOSE, said plainly: two tabs pressing at the same
 * instant both read no pending row and both insert one, because there is no
 * uniqueness guard on (payer_id, student_id, 'pending'). Closing that needs a
 * partial unique index — a migration and a GO_LIVE bundle edit — and is tracked
 * as follow-up. Every SEQUENTIAL press, which is the case that was actually
 * inflating the board, now lands on the row that already exists.
 */
export async function pendingOrderFor(svc, payerId, studentId) {
  const { data, error } = await svc.from('diagnostic_order')
    .select('id,stripe_session_id')
    .eq('payer_id', payerId).eq('student_id', studentId).eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data || [])[0] || null;
}

/**
 * What to do about that row, given what Stripe says about its session. PURE, so
 * the rule is unit-tested rather than read off the source
 * (test/diagnostic.test.mjs). Stripe is the authority here; the row only
 * records what Stripe was asked to do.
 *
 *   resume   the session is still open — hand back its URL. No second session,
 *            no second row, no second charge.
 *   settled  Stripe has taken the money and the webhook has not landed yet.
 *            Opening a fresh session against a paid order is how a family pays
 *            twice, so this opens nothing and says so.
 *   reuse    the session is dead — Stripe expires a Checkout session after 24h,
 *            and a session it has lost is dead too. A fresh session goes INTO
 *            THE SAME ROW. Inserting a second one is what made a family who
 *            came back on Wednesday count as an abandoned checkout for ever,
 *            even after they paid.
 *   create   nothing in flight — a new row, written after its session exists.
 *   unknown  the row names a session and Stripe would not tell us its state.
 *            That is NOT the same as a dead session: an open, payable URL may
 *            be sitting in the family's other tab, and minting a second one
 *            beside it is how one order becomes two charges. The webhook is
 *            idempotent per ORDER, so it would fulfil once and bill twice —
 *            the worst shape of that bug, because the second charge has no
 *            second thing attached to it that anyone would notice. So: open
 *            nothing, and say we could not check. Money is fail-closed here for
 *            the same reason selling is.
 */
export function checkoutPlan(pending, session, { sessionKnown = true } = {}) {
  if (!pending?.id) return { action: 'create', orderId: null };
  if (session?.status === 'open' && session.url) return { action: 'resume', orderId: pending.id, url: session.url };
  if (session?.status === 'complete') return { action: 'settled', orderId: pending.id };
  if (!sessionKnown && pending.stripe_session_id) return { action: 'unknown', orderId: pending.id };
  return { action: 'reuse', orderId: pending.id };
}

/**
 * Write the order this Checkout session belongs to — in place when the family
 * already had one in flight, freshly when they did not.
 *
 * No row may exist before its session: an order with no session id is an
 * intention, and the funnel used to count intentions as abandoned checkouts.
 * That is a guard here rather than a convention, because it is a one-word
 * mistake to make at a call site.
 *
 * The reuse UPDATE is a compare-and-set on `pending`: if the webhook landed
 * while Stripe was minting this session, the family has already paid and this
 * URL must never be handed out.
 */
export async function recordCheckout(svc, plan, { orderId, payerId, studentId, sessionId, amountCents }) {
  if (!sessionId) throw new Error('a diagnostic_order may not be written before its Checkout session');

  if (plan?.action === 'reuse') {
    const { data, error } = await svc.from('diagnostic_order')
      .update({ stripe_session_id: sessionId, amount_cents: amountCents })
      .eq('id', orderId).eq('status', 'pending')
      .select('id');
    if (error) throw new Error(error.message);
    return (data || []).length ? { ok: true, reused: true } : { ok: false, code: 'already_paid' };
  }

  const { error } = await svc.from('diagnostic_order').insert({
    id: orderId,
    payer_id: payerId,
    student_id: studentId,
    status: 'pending',
    stripe_session_id: sessionId,
    amount_cents: amountCents,
  });
  if (error) throw new Error(error.message);
  return { ok: true, reused: false };
}

// Stripe is the authority on what the card will be charged. A Price created
// from a stale figure would otherwise be recorded at the figure this deployment
// wishes it were. The webhook re-stamps it from the completed session, which is
// the number a refund settles against.
function chargedCents(checkout) {
  const n = Number(checkout?.amount_total);
  return Number.isFinite(n) ? n : DIAGNOSTIC.priceCents;
}

// One sentence for "you have already paid for this", used by both paths that
// can discover it: the session Stripe reports complete, and the row that moved
// under us mid-request.
const ALREADY_PAID = {
  ok: false,
  code: 'already_paid',
  error: 'That one is already paid for — it can take a moment to reach us. Reload in a few seconds and the assessment will be waiting.',
};

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) {
    return Response.json({ error: 'Buying a diagnostic needs a real account.', code: 'stripe_unconfigured' }, { status: 501 });
  }

  const limited = await rateLimitResponse(caller, req, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const blocked = unconfigured();
  if (blocked) return Response.json(blocked, { status: 501 });

  const settings = await getSettings();
  if (!diagnosticOpen(settings)) {
    return Response.json(
      { error: 'The diagnostic isn’t on sale yet. Leave us your details and we’ll tell you the day it opens.', code: 'notYetOpen' },
      { status: 503 },
    );
  }

  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { body = {}; }

  // Who is it FOR. A parent buys for a linked child; the client's word is never
  // enough (lib/server/family.js verifies managed_by or an active link).
  //
  // A caller who has children must SAY which one. The old route accepted an
  // empty body and quietly booked the payer, so the placement — and the
  // baseline evidence it writes — landed on the parent's own record. Silence is
  // not a choice here; it is the bug.
  let students;
  try {
    students = await buyableStudents(svc, caller.user.id);
  } catch (err) {
    console.error('[diagnostic POST] family read failed', err?.message);
    return Response.json({ error: 'Could not start checkout — nothing was charged. Try again.' }, { status: 500 });
  }
  const asked = String(body?.studentId || '').trim();
  if (!asked && students.length) {
    return Response.json({
      error: 'Choose who the diagnostic is for. It stays attached to the student who sits it.',
      code: 'student_required',
      students,
    }, { status: 400 });
  }

  const resolved = await resolveBookingStudent(svc, caller, asked);
  if (resolved.error) return resolved.error;
  const studentId = resolved.studentId;

  try {
    const stripe = getStripe();

    // Already mid-purchase? Pressing Buy three times used to leave three
    // 'pending' rows behind; coming back two days later used to leave two.
    // There is one row per family per child, and Stripe says what to do with
    // it (checkoutPlan).
    const pending = await pendingOrderFor(svc, caller.user.id, studentId);
    let session = null;
    let sessionKnown = true;
    if (pending?.stripe_session_id) {
      try {
        session = await stripe.checkout.sessions.retrieve(pending.stripe_session_id);
      } catch {
        // Stripe cannot tell us about it, so it is not a URL we may hand out —
        // and, just as important, not a session we may assume is dead. See
        // checkoutPlan's `unknown`.
        session = null;
        sessionKnown = false;
      }
    }
    const plan = checkoutPlan(pending, session, { sessionKnown });
    if (plan.action === 'resume') {
      return Response.json({ ok: true, orderId: plan.orderId, url: plan.url, resumed: true });
    }
    if (plan.action === 'settled') {
      return Response.json({ ...ALREADY_PAID, orderId: plan.orderId }, { status: 409 });
    }
    if (plan.action === 'unknown') {
      return Response.json({
        error: 'We could not reach the payment page just now. Nothing has been charged — try again in a moment.',
        code: 'checkout_unreachable',
        orderId: plan.orderId,
      }, { status: 503 });
    }

    // The order id is minted HERE so the Checkout session's metadata can carry
    // it — or reused, when this family already has a row for this child. The
    // ROW is written only once that session exists. The reverse order (row
    // first) put a 'pending' order on the funnel board for every press of a
    // button, including presses that never reached Stripe at all. Nothing is
    // charged before the family sees Stripe's own page, so an order that never
    // gets its row also never gets its URL: the session is created, never
    // handed out, and expires unused.
    const orderId = plan.orderId || randomUUID();
    const base = appUrl(req);
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Managed Payments is on by default on this Stripe account and rejects
      // any product whose tax code is ineligible — see the long note in
      // app/api/tutoring/group/route.js. The diagnostic ends in a person
      // writing a report, so the honest tax code is the ineligible one and this
      // path opts out per request rather than misfiling the sale.
      managed_payments: { enabled: false },
      payment_method_types: ['card'],
      // The Price object, not price_data: the amount lives in Stripe (created
      // from clubPricing.DIAGNOSTIC per docs/archive/LAUNCH_RUNBOOK.md) and is echoed
      // back into amount_cents below, so the record says what was actually
      // charged rather than what this deployment believes the price to be.
      line_items: [{ price: ONE_TIME_PRICES.diagnostic, quantity: 1 }],
      customer_email: caller.user.email || undefined,
      metadata: { diagnostic_order_id: orderId, kaizen_user_id: caller.user.id, student_id: studentId },
      payment_intent_data: { metadata: { diagnostic_order_id: orderId } },
      success_url: `${base}/diagnostic?order=paid`,
      cancel_url: `${base}/diagnostic?order=cancelled`,
    });
    if (!checkout?.url) throw new Error('checkout session has no url');

    const written = await recordCheckout(svc, plan, {
      orderId,
      payerId: caller.user.id,
      studentId,
      sessionId: checkout.id,
      amountCents: chargedCents(checkout),
    });
    // The row moved on while Stripe was minting this session: the webhook
    // landed and the family has paid. Handing this URL over would charge them a
    // second time, so it is not handed over.
    if (!written.ok) return Response.json({ ...ALREADY_PAID, orderId }, { status: 409 });

    await auditLog(caller.user.id, written.reused ? 'diagnostic.order_reopened' : 'diagnostic.order_created', orderId, {
      studentId, onBehalf: resolved.onBehalf, relationship: resolved.relationship,
      amount_cents: chargedCents(checkout), stripe_session_id: checkout.id,
    });
    return Response.json({ ok: true, orderId, url: checkout.url });
  } catch (err) {
    if (isMissingSchema(err)) {
      return Response.json({
        error: 'The diagnostic isn’t switched on yet on this deployment.',
        code: 'not_provisioned',
      }, { status: 503 });
    }
    console.error('[diagnostic POST]', err?.message);
    return Response.json({ error: 'Could not start checkout — nothing was charged. Try again.' }, { status: 500 });
  }
}
