// /api/admin/earnings — payout support tooling (audit SHIP-006).
// Payouts are manual until Stripe Connect ships; this makes them auditable:
// GET            → per-tutor accrued/paid totals + unpaid line items, PLUS the
//                  rooms that ran and were never paid (see POST)
// GET ?csv=1     → the per-tutor ledger as CSV (bookkeeping / 1099 prep)
// PATCH {tutorId} → mark that tutor's accrued earnings paid (audited).
// POST {groupSessionId, action} → settle ONE group room by hand: 'accrue' pays
//                  it, 'no_pay' records that nothing is owed. Both audited.
// Reminder enforced in UI copy: collect a W-9 BEFORE the first payout.
//
// Why POST exists: the hourly sweep will not pay a group room that ended with
// no attendance and no exit summary on any seat, because the room flipping to
// in_progress only proves a STUDENT joined (maintenance.completeGroupSessions).
// It holds such a room for a week and then closes it unpaid. A tutor who really
// taught the hour and never touched the roster would then have been payable
// only by hand-written SQL — there was no admin path at all, which is the
// defect this closes. The amount is never taken from the request body: it is
// recomputed from the room by the same function the sweep uses.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { unpaidGroupRooms, accrueGroupRoom, settleGroupRoomUnowed } from '@/lib/server/maintenance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadLedger(svc) {
  const { data: rows } = await svc.from('tutor_earnings')
    .select('id,tutor_id,tutoring_session_id,group_session_id,amount_cents,status,created_at')
    .order('created_at', { ascending: true }).limit(2000);
  const tutorIds = [...new Set((rows || []).map((r) => r.tutor_id))];
  const { data: tutors } = tutorIds.length
    ? await svc.from('tutors').select('id,display_name,user_id').in('id', tutorIds)
    : { data: [] };
  const userIds = (tutors || []).map((t) => t.user_id);
  const { data: profs } = userIds.length
    ? await svc.from('profiles').select('id,email').in('id', userIds)
    : { data: [] };
  const emailOf = Object.fromEntries((profs || []).map((p) => [p.id, p.email]));
  const nameOf = Object.fromEntries((tutors || []).map((t) => [t.id, { name: t.display_name, email: emailOf[t.user_id] || '' }]));

  const byTutor = {};
  for (const r of rows || []) {
    const b = (byTutor[r.tutor_id] ||= {
      tutorId: r.tutor_id,
      name: nameOf[r.tutor_id]?.name || 'Tutor',
      email: nameOf[r.tutor_id]?.email || '',
      accruedCents: 0, paidCents: 0, unpaidItems: [],
    });
    if (r.status === 'paid') b.paidCents += r.amount_cents;
    else {
      b.accruedCents += r.amount_cents;
      b.unpaidItems.push({
        id: r.id,
        sessionId: r.tutoring_session_id,
        // A room row carries group_session_id instead — without it a hand
        // accrual showed up in the ledger as a line item pointing at nothing.
        groupSessionId: r.group_session_id || null,
        amountCents: r.amount_cents,
        at: r.created_at,
      });
    }
  }
  return Object.values(byTutor).sort((a, b) => b.accruedCents - a.accruedCents);
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ tutors: [] });

  const ledger = await loadLedger(svc);

  if (new URL(req.url).searchParams.get('csv')) {
    const lines = ['tutor_name,tutor_email,accrued_usd,paid_usd,unpaid_sessions'];
    // Quote + double quotes, and neutralize spreadsheet formula injection — a
    // display name starting with = + - @ would otherwise execute when the
    // bookkeeper opens this in Excel/Sheets.
    const escCsv = (v) => {
      let s = String(v).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s}"`;
    };
    for (const t of ledger) {
      lines.push([escCsv(t.name), escCsv(t.email), (t.accruedCents / 100).toFixed(2), (t.paidCents / 100).toFixed(2), t.unpaidItems.length].join(','));
    }
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kaizen-earnings-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  // Rooms that ran, owe money, and have no ledger row — held, not yet swept,
  // or already closed unpaid. Best-effort: a payout screen that 500s because
  // this query failed would be worse than one without the queue.
  const rooms = await unpaidGroupRooms(svc).catch((e) => {
    console.error('[admin/earnings] unpaid rooms lookup failed', e?.message);
    return null;
  });
  return Response.json({ tutors: ledger, rooms: rooms || [], roomsUnavailable: rooms === null });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const tutorId = String(body?.tutorId || '');
  if (!tutorId) return Response.json({ error: 'tutorId required.' }, { status: 400 });

  const { data: updated, error } = await svc.from('tutor_earnings')
    .update({ status: 'paid' })
    .eq('tutor_id', tutorId).eq('status', 'accrued')
    .select('id,amount_cents');
  if (error) {
    console.error('[admin/earnings] mark-paid failed', tutorId, error.message);
    return Response.json({ error: 'Could not mark those earnings paid — try again.' }, { status: 500 });
  }

  const total = (updated || []).reduce((s, r) => s + r.amount_cents, 0);
  await auditLog(caller.user.id, 'earnings.marked_paid', tutorId, { items: (updated || []).length, total_cents: total });
  return Response.json({ ok: true, items: (updated || []).length, totalCents: total });
}

// Settle ONE group room by hand. The two honest outcomes of a room the sweep
// could not verify: the tutor taught it (accrue), or the tutor never showed
// (nothing owed). Either way the room leaves the queue, so the list can be
// worked to empty and an admin keeps trusting it.
export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const groupSessionId = String(body?.groupSessionId || '');
  const action = String(body?.action || 'accrue');
  if (!groupSessionId) return Response.json({ error: 'groupSessionId required.' }, { status: 400 });
  if (!['accrue', 'no_pay'].includes(action)) {
    return Response.json({ error: 'action must be accrue or no_pay.' }, { status: 400 });
  }

  // No amount is read from the request — accrueGroupRoom recomputes it from the
  // room's own snapshotted pay, so an admin cannot type a number into a payout.
  const result = action === 'accrue'
    ? await accrueGroupRoom(svc, groupSessionId)
    : await settleGroupRoomUnowed(svc, groupSessionId);

  if (!result.ok) {
    const messages = {
      not_found: 'No such room.',
      cancelled: 'That room was cancelled — nothing ran.',
      nothing_owed: 'That room owes nothing: no settled seats, so there is no hourly pay to accrue.',
      already_accrued: `Already on the ledger${result.amountCents ? ` at $${(result.amountCents / 100).toFixed(2)}` : ''} — a room is paid once.`,
      roster_closed: 'The roster on that room shows the tutor was there, so it is owed its hourly pay — the next hourly tick accrues it. Nothing to write off.',
    };
    const status = result.code === 'not_found' ? 404 : result.code === 'error' ? 500 : 409;
    return Response.json({ error: messages[result.code] || result.error || 'Could not settle that room.', code: result.code }, { status });
  }

  await auditLog(caller.user.id, action === 'accrue' ? 'earnings.room_accrued' : 'earnings.room_unowed', groupSessionId, {
    amount_cents: result.amountCents || 0,
    tutor_id: result.tutorId,
    // Recorded because it is the whole reason this path exists: an accrual with
    // rosterClosed:false is an admin vouching for an hour the system could not
    // verify, and that is exactly what a payout audit needs to see.
    roster_closed: Boolean(result.rosterClosed),
  });
  return Response.json({ ok: true, ...result });
}
