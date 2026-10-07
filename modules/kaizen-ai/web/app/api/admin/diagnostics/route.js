// /api/admin/diagnostics — the other half of the diagnostic. Admin only.
//
// GET                                    → every order, newest first, with the
//                                          payer and student named
// PATCH {orderId, event, reportMd?}      → move one order along its lifecycle
//
// WHY THIS EXISTS
// The family-facing route (/api/diagnostic) sells the diagnostic and the Stripe
// webhook marks it paid. Nothing wrote the other half: `scheduled`, `delivered`,
// `report_md`, `refunded` were columns with no writer, so the product charged
// $59 for "a written report from the person who will teach your child" and had
// nowhere for that person to write it. A promise with no code path behind it is
// the failure docs/CLAIMS_MATRIX.md exists to prevent, so either this route
// ships or the claim comes down.
//
// The report is a HUMAN artifact. This route stores what the director wrote; it
// does not generate, summarise, or grade anything. The measurement is the
// adaptive placement (/api/engine/placement), and its evidence is already in
// the ledger — the report is the sentence a parent reads about it.
//
// The lifecycle lives in lib/server/diagnosticOrders.js and is shared with the
// webhook. An illegal move (delivering an unpaid order, reviving a refunded
// one) is REFUSED here with a readable message rather than silently ignored:
// the director needs to know why the button did nothing.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { applyOrderEvent, publicOrder } from '@/lib/server/diagnosticOrders';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// What an admin may do to an order. `paid` is absent on purpose: money is
// Stripe's to report, and letting a person mark an order paid by hand is how a
// funnel board starts counting revenue that never arrived.
const ADMIN_EVENTS = ['scheduled', 'delivered', 'refunded'];

const REPORT_MAX = 20000;

async function requireAdmin(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!isAdminCaller(caller)) return { error: Response.json({ error: 'Admin only.' }, { status: 403 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

export async function GET(req) {
  const { error, svc } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data, error: readErr } = await svc.from('diagnostic_order')
      .select('*').order('created_at', { ascending: false }).limit(200);
    if (readErr) throw new Error(readErr.message);

    const rows = data || [];
    const ids = [...new Set(rows.flatMap((r) => [r.payer_id, r.student_id]).filter(Boolean))];
    let nameOf = {};
    if (ids.length) {
      const { data: people } = await svc.from('profiles').select('id,name,email').in('id', ids);
      nameOf = Object.fromEntries((people || []).map((p) => [p.id, { name: p.name || null, email: p.email || null }]));
    }

    return Response.json({
      orders: rows.map((r) => ({
        ...publicOrder(r),
        payer: nameOf[r.payer_id] || null,
        student: nameOf[r.student_id] || null,
        // The report itself IS shown to an admin — they wrote it, and they
        // need to see it to edit it. publicOrder deliberately withholds it
        // from the family-facing route.
        reportMd: r.report_md || null,
        stripeSessionId: r.stripe_session_id || null,
      })),
      events: ADMIN_EVENTS,
    });
  } catch (err) {
    // The table is migration 0036. A deployment that has not run it yet gets an
    // honest empty console rather than a 500.
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true, orders: [], events: ADMIN_EVENTS });
    console.error('[admin/diagnostics GET]', err?.message);
    return Response.json({ error: 'Could not load diagnostics.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const orderId = String(body?.orderId || '').trim();
  const event = String(body?.event || '').trim();
  if (!orderId) return Response.json({ error: 'orderId required.' }, { status: 400 });
  if (!ADMIN_EVENTS.includes(event)) {
    return Response.json({ error: `event must be one of ${ADMIN_EVENTS.join(', ')}.` }, { status: 400 });
  }

  const reportMd = body?.reportMd == null ? null : String(body.reportMd).slice(0, REPORT_MAX);
  // A delivery with no report is not a delivery. The whole product being sold
  // is the written thing; marking it delivered without one would put a lie on
  // the funnel board and leave the family with nothing.
  if (event === 'delivered' && !reportMd?.trim()) {
    return Response.json({
      error: 'A delivered diagnostic needs its written report — that is what the family paid for.',
      code: 'report_required',
    }, { status: 400 });
  }

  try {
    const { data: order, error: readErr } = await svc.from('diagnostic_order')
      .select('id,payer_id,student_id,status').eq('id', orderId).maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!order) return Response.json({ error: 'No such diagnostic order.' }, { status: 404 });

    const next = applyOrderEvent(order.status, event);
    if (next.refused) {
      return Response.json({
        error: `A ${order.status} diagnostic cannot be marked ${event}.`,
        code: 'illegal_transition',
        status: order.status,
      }, { status: 409 });
    }

    const patch = { status: next.status };
    if (reportMd != null) patch.report_md = reportMd;
    // delivered_at is stamped once, on the transition. Re-saving a report on an
    // already-delivered order edits the text without rewriting history.
    if (next.status === 'delivered' && order.status !== 'delivered') {
      patch.delivered_at = new Date().toISOString();
    }

    const { error: writeErr } = await svc.from('diagnostic_order').update(patch).eq('id', orderId);
    if (writeErr) throw new Error(writeErr.message);

    await auditLog(caller.user.id, `diagnostic.${event}`, orderId, {
      from: order.status, to: next.status, payerId: order.payer_id, studentId: order.student_id,
      reportChars: reportMd?.length || 0,
    });

    return Response.json({ ok: true, status: next.status, changed: next.changed });
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true }, { status: 503 });
    console.error('[admin/diagnostics PATCH]', err?.message);
    return Response.json({ error: 'Could not update that diagnostic.' }, { status: 500 });
  }
}
