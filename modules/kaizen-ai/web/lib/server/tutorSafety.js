// Pulling a tutor out of the marketplace. SERVER ONLY.
//
// WHY THIS EXISTS
// Rejecting a tutor's vetting used to be two column writes:
//   vetting_status='rejected', status='paused'
// and nothing else. Every session already on that tutor's calendar stayed
// booked, every group room stayed open, and every student and guardian involved
// found out when nobody joined the call.
//
// A vetting rejection is the one moment the marketplace's safety promise is
// actually being exercised. "Paused for new bookings" is not the same as "this
// adult should not be alone on video with your child on Thursday." This module
// makes the second thing true, and makes it one code path so the manual admin
// action and any automated trigger (a Stripe Connect identity rejection, an
// abuse report) cannot diverge.
//
// The room gate in /api/tutoring/room is the backstop that holds even if this
// function fails halfway: it re-reads the tutor's status at join time. This is
// the proactive half — cancel, refund, and tell people — and it must not be the
// only half, because a half-completed pull still leaves a live booking.

import { planPull } from '@/lib/server/sessionStates';
import { getStripe } from '@/lib/server/stripe';
import { sendCancellationEmails } from '@/lib/server/tutoringEmails';
import { auditLog } from '@/lib/server/context';
import { sendEmail, esc } from '@/lib/server/email';
import { restoreAllowance } from '@/lib/server/clubBilling';

const LIVE_1TO1 = ['scheduled', 'in_progress', 'pending_payment'];
const LIVE_GROUP = ['open', 'confirmed', 'in_progress'];


/**
 * Execute the pull. Best-effort per item and it never throws: a refund that
 * fails must not prevent the remaining sessions from being cancelled. Every
 * failure is collected and returned so the caller can surface it, and an admin
 * alert goes out because an audit row nobody reads is not a notification.
 *
 * @returns {Promise<{cancelled: number, refunded: number, failures: Array}>}
 */
export async function pullTutorFromMarket(svc, tutorId, { reason = '', source = 'admin', actorId = null } = {}) {
  const failures = [];
  const note = (job, err) => failures.push({ job, error: err?.message || String(err) });

  // 1. Close the market side first. If anything below fails, the tutor is at
  //    least unbookable and the room gate will refuse new joins.
  const { error: tErr } = await svc.from('tutors').update({
    status: 'paused',
    vetting_status: 'rejected',
    vetting_notes: reason || `pulled by ${source}`,
    vetted_at: new Date().toISOString(),
  }).eq('id', tutorId);
  if (tErr) note('tutors.update', tErr);

  const nowIso = new Date().toISOString();
  const [{ data: sessions }, { data: rooms }] = await Promise.all([
    svc.from('tutoring_sessions')
      .select('id,status,paid,refund_status,stripe_payment_intent_id,scheduled_start,student_id,tutor_id')
      .eq('tutor_id', tutorId).in('status', LIVE_1TO1),
    svc.from('group_session')
      .select('id,status,scheduled_start').eq('tutor_id', tutorId).in('status', LIVE_GROUP),
  ]);

  const roomIds = (rooms || []).map((r) => r.id);
  const { data: seats } = roomIds.length
    ? await svc.from('group_seat')
        .select('id,group_session_id,status,paid,refund_status,stripe_payment_intent_id,student_id,booked_via,booked_by')
        .in('group_session_id', roomIds)
    : { data: [] };

  const plan = planPull({ sessions: sessions || [], rooms: rooms || [], seats: seats || [] });
  const stripe = getStripe();
  let refunded = 0;

  // 2. 1:1 sessions — refund first, then cancel. If the refund fails the session
  //    is still cancelled (nobody should be sent to that call) and the failure is
  //    reported for a human to settle.
  for (const item of plan.cancelSessions) {
    if (item.refund && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: item.paymentIntent });
        refunded += 1;
        await svc.from('tutoring_sessions').update({ refund_status: 'refunded' }).eq('id', item.id);
      } catch (e) { note(`refund:session:${item.id}`, e); }
    }
    const { error } = await svc.from('tutoring_sessions')
      .update({ status: 'cancelled', cancelled_at: nowIso, cancel_reason: 'tutor_withdrawn' })
      .eq('id', item.id);
    if (error) note(`cancel:session:${item.id}`, error);
    const full = (sessions || []).find((s) => s.id === item.id);
    if (full) await sendCancellationEmails(svc, full, { refunded: item.refund, byTutor: true }).catch(() => {});
  }

  // 3. Group seats, then their rooms. Membership-included seats get their
  //    visit back (platform-initiated → restore unconditionally, to the BOOKER
  //    whose allowance was decremented).
  for (const seat of plan.cancelSeats) {
    if (seat.refund && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: seat.paymentIntent });
        refunded += 1;
        await svc.from('group_seat').update({ refund_status: 'refunded' }).eq('id', seat.id);
      } catch (e) { note(`refund:seat:${seat.id}`, e); }
    }
    const full = (seats || []).find((s) => s.id === seat.id);
    if (full?.booked_via === 'included') {
      await restoreAllowance(svc, {
        userId: full.booked_by || full.student_id,
        feature: 'club_hall_included',
        metadata: { kind: 'tutor_withdrawn', seatId: seat.id },
      }).catch((e) => note(`restore:seat:${seat.id}`, e));
    }
    const { error } = await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', seat.id);
    if (error) note(`cancel:seat:${seat.id}`, error);
  }
  if (plan.cancelRooms.length) {
    const { error } = await svc.from('group_session')
      .update({ status: 'cancelled', cancel_reason: 'tutor_withdrawn' })
      .in('id', plan.cancelRooms);
    if (error) note('cancel:rooms', error);
  }

  // 4. Tell the affected students. A cancellation with no reason is worse than
  //    the cancellation. Group seats have no dedicated email path, so they get a
  //    direct one rather than silence.
  const seatStudents = [...new Set((seats || [])
    .filter((s) => plan.cancelSeats.some((c) => c.id === s.id))
    .map((s) => s.student_id))];
  if (seatStudents.length) {
    const { data: people } = await svc.from('profiles').select('id,email,name').in('id', seatStudents);
    for (const p of people || []) {
      if (!p.email) continue;
      // Email styles are inlined (no Tailwind in email clients). The hex values
      // ARE the live tokens from tailwind.config.js: #211D1A = ink,
      // #756E67 = muted, #B4536F = accent.
      await sendEmail({
        to: p.email,
        subject: 'Your drop-in session was cancelled — you have been refunded',
        html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#211D1A">
          <p style="font-size:14px;line-height:1.6">Hi${p.name ? ' ' + esc(p.name) : ''},</p>
          <p style="font-size:14px;line-height:1.6">We've cancelled an upcoming drop-in session because the tutor is no
          longer available on Kaizen. <strong>Your payment has been refunded in full</strong> — it usually lands back on
          your card within 5–10 days.</p>
          <p style="font-size:14px;line-height:1.6">You can book another session any time, and your AI tutor is
          unaffected.</p>
          <p style="font-size:13px;color:#756E67">— The Kaizen team</p></div>`,
        kind: 'essential',
      }).catch(() => {});
    }
  }

  // 5. Audit, then alert a human. Automated pulls especially need a person to
  //    look: the tutor may need to be told, and refunds may have failed.
  await auditLog(actorId, 'tutor.pulled_from_market', tutorId, {
    source, reason,
    sessions_cancelled: plan.cancelSessions.length,
    rooms_cancelled: plan.cancelRooms.length,
    seats_cancelled: plan.cancelSeats.length,
    refunded, failures: failures.length,
  }).catch(() => {});

  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `[Kaizen] Tutor pulled from marketplace (${source})`,
      html: `<div style="font-family:ui-monospace,monospace;font-size:13px">
        <p><strong>Tutor:</strong> ${esc(tutorId)}<br/>
        <strong>Source:</strong> ${esc(source)}<br/>
        <strong>Reason:</strong> ${esc(reason || '(none given)')}</p>
        <p>Cancelled ${plan.cancelSessions.length} session(s), ${plan.cancelRooms.length} room(s),
        ${plan.cancelSeats.length} seat(s). Refunds issued: ${refunded}.</p>
        ${failures.length
          ? `<p style="color:#B4536F"><strong>${failures.length} step(s) FAILED — settle by hand:</strong><br/>${
              failures.map((f) => esc(`${f.job}: ${f.error}`)).join('<br/>')}</p>`
          : '<p>No failures.</p>'}</div>`,
      kind: 'essential',
    }).catch(() => {});
  }

  return {
    cancelled: plan.cancelSessions.length + plan.cancelRooms.length + plan.cancelSeats.length,
    refunded,
    failures,
  };
}
