// /api/admin/tutors — the tutor roster + the vetting/activation workflow.
// GET             → all tutors with vetting + status (admin)
// PATCH {id, action, notes?}:
//   'vet'         → record that an ADMIN REVIEW has been completed and the
//                   COMPLETE and CLEAR (provider/date go in notes) — required
//                   before activation. This is the child-safety control point.
//   'reject_vetting' → record a failed/adverse check; tutor is paused.
//   'activate'    → make the tutor bookable. HARD-BLOCKED unless vetted.
//   'pause'       → pull the tutor from the marketplace immediately.
//   'set_pay_rate' {payRateCents} → record the flat hourly rate this tutor is
//                   paid under house pricing ($22–50/hr, 0023 widened by 0033 and 0035; certified default $40). Cost, not a
//                   public price.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { pullTutorFromMarket } from '@/lib/server/tutorSafety';
import { TUTOR_PAY } from '@/lib/server/clubPricing';
import { sendEmail, esc } from '@/lib/server/email';

export const runtime = 'nodejs';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ tutors: [] });

  const { data: tutors } = await svc.from('tutors').select('*').order('created_at', { ascending: false }).limit(200);
  const ids = [...new Set((tutors || []).map((t) => t.user_id))];
  const { data: profs } = ids.length
    ? await svc.from('profiles').select('id,email').in('id', ids)
    : { data: [] };
  const emailOf = Object.fromEntries((profs || []).map((p) => [p.id, p.email]));
  return Response.json({
    tutors: (tutors || []).map((t) => ({ ...t, email: emailOf[t.user_id] || null })),
  });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  const action = String(body?.action || '');
  const notes = String(body?.notes || '').slice(0, 500) || null;
  if (!id || !['vet', 'reject_vetting', 'activate', 'pause', 'set_pay_rate'].includes(action)) {
    return Response.json({ error: 'Need id and an action (vet, reject_vetting, activate, pause, set_pay_rate).' }, { status: 400 });
  }

  const { data: tutor } = await svc.from('tutors').select('*').eq('id', id).maybeSingle();
  if (!tutor) return Response.json({ error: 'No such tutor.' }, { status: 404 });

  // ── Rejecting vetting must also empty the calendar ──────────────────────────
  // This used to be two column writes. Every session already booked with the
  // tutor stayed booked, every group room stayed open, and the students and
  // guardians involved found out when nobody joined the call.
  //
  // A vetting rejection is the exact moment the safety promise is being
  // exercised: "paused for new bookings" is not "this adult should not be alone
  // on video with your child on Thursday". pullTutorFromMarket cancels and
  // refunds the live work and notifies everyone, and is the same function any
  // automated trigger calls, so the manual and automatic paths cannot diverge.
  if (action === 'reject_vetting') {
    const result = await pullTutorFromMarket(svc, id, {
      reason: notes || 'vetting rejected by admin',
      source: 'admin',
      actorId: caller.user.id,
    });
    const { data: after } = await svc.from('tutors').select().eq('id', id).maybeSingle();
    // 207 when some cancellation or refund could not be completed — the tutor IS
    // pulled either way, but a human has to settle the remainder, and the admin
    // screen must not report a clean success it did not achieve.
    return Response.json(
      { tutor: after, pulled: result },
      { status: result.failures.length ? 207 : 200 },
    );
  }

  let patch = {};
  if (action === 'set_pay_rate') {
    const rate = Math.round(Number(body?.payRateCents));
    if (!Number.isFinite(rate) || rate < TUTOR_PAY.minCents || rate > TUTOR_PAY.maxCents) {
      return Response.json({
        error: `Pay rate must be between $${TUTOR_PAY.minCents / 100} and $${TUTOR_PAY.maxCents / 100} per hour.`,
      }, { status: 400 });
    }
    patch = { pay_rate_cents: rate };
  } else if (action === 'vet') {
    // Tutors work unsupervised with minors, so an 18+ attestation is recorded
    // before anyone is cleared. Stripe's KYC would surface an underage account
    // eventually — months later, after they had already been teaching.
    if (!tutor.adult_attested_at) {
      return Response.json({
        error: 'This applicant has not attested that they are 18 or older. '
             + 'They must re-submit the application before they can be cleared.',
      }, { status: 409 });
    }
    patch = { vetting_status: 'cleared', vetting_notes: notes, vetted_at: new Date().toISOString(), vetted_by: caller.user.id };
  } else if (action === 'activate') {
    // The gate: no activation without a recorded, cleared vetting.
    if (tutor.vetting_status !== 'cleared') {
      return Response.json({ error: 'Record your review + approval ("vet") before activating this tutor.' }, { status: 409 });
    }
    patch = { status: 'active' };
  } else if (action === 'pause') {
    patch = { status: 'paused' };
  }

  const { data: updated, error } = await svc.from('tutors').update(patch).eq('id', id).select().maybeSingle();
  if (error) {
    console.error('[admin/tutors] update failed', id, error.message);
    return Response.json({ error: 'Could not update the tutor — try again.' }, { status: 500 });
  }
  await auditLog(caller.user.id, `tutor.${action}`, id, { notes });

  // Tell the tutor they're live (best-effort).
  if (action === 'activate') {
    const { data: prof } = await svc.from('profiles').select('email').eq('id', tutor.user_id).maybeSingle();
    if (prof?.email) {
      sendEmail({
        to: prof.email,
        subject: 'You’re live on Kaizen 🌸',
        html: `<p>Hi ${esc(tutor.display_name)},</p><p>Your application was approved and your profile is now
               live — students can find and book you. Keep your
               <a href="${process.env.APP_URL || ''}/tutor">availability</a> up to date!</p>`,
      }).catch(() => {});
    }
  }
  return Response.json({ ok: true, tutor: updated });
}
