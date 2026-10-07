// /api/tutoring/sessions
// GET                                   → my sessions (student + tutor views)
// POST {tutorId, slotId, subject, ...}  → book an open slot (student). When
//                                         Stripe is configured, returns a
//                                         Checkout {url} and holds the slot as
//                                         pending_payment; otherwise books
//                                         immediately (plan-metered).
// PATCH {id, status}                    → transition a session. Cancelling
//                                         applies the refund policy and frees
//                                         the slot; completing accrues earnings.

import { roomDateTime, CLUB_TIMEZONE } from '@/lib/roomTime';
import { getCaller, serviceClient, checkEntitlement, recordUsage, auditLog, getSettings } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { getStripe, appUrl } from '@/lib/server/stripe';
import { canTransition, refundEligible, earningsSplit } from '@/lib/server/sessionStates';
import { privateQuote, tutorPayCents } from '@/lib/server/clubPricing';
import { clubAllowances, consumeAllowance, restoreAllowance } from '@/lib/server/clubBilling';
import { resolveBookingStudent, guardianGateSatisfied } from '@/lib/server/family';
import { sendBookingEmails, sendCancellationEmails } from '@/lib/server/tutoringEmails';
import { introAvailable, recordIntroRedemption } from '@/lib/server/trial';

export const runtime = 'nodejs';

const STUDENT_STATUS = new Set(['cancelled']);
const TUTOR_STATUS = new Set(['in_progress', 'completed', 'no_show', 'cancelled']);

// The product's definition of "the session has begun": the video room opens at
// T-15 (/api/tutoring/room), and a tutor and student sitting in it are in the
// session whatever the wall clock says. The completion floor below uses the
// same instant so the two gates can't disagree — a floor at T+0 refused
// `in_progress` for a room the same product had already let them both into.
const ROOM_OPEN_LEAD_MS = 15 * 60000;

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ asStudent: [], asTutor: [] });

  // Release/complete/reminders are owned by the cron sweep
  // (/api/cron/maintenance). We no longer run releaseAbandoned on this hot read
  // path — it now makes per-row Stripe calls, which don't belong on every
  // "list my sessions" request (audit: keep scheduled work on the schedule).

  const tutor = (await svc.from('tutors').select('id').eq('user_id', caller.user.id).maybeSingle()).data;
  const [studentQ, tutorQ] = await Promise.all([
    svc.from('tutoring_sessions').select('*').eq('student_id', caller.user.id).order('scheduled_start', { ascending: true }),
    tutor ? svc.from('tutoring_sessions').select('*').eq('tutor_id', tutor.id).order('scheduled_start', { ascending: true })
          : Promise.resolve({ data: [] }),
  ]);

  // enrich with counterpart names
  const rows = [...(studentQ.data || []), ...(tutorQ.data || [])];
  const tutorIds = [...new Set(rows.map((r) => r.tutor_id))];
  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const [tutorsQ, profQ] = await Promise.all([
    tutorIds.length ? svc.from('tutors').select('id,display_name').in('id', tutorIds) : Promise.resolve({ data: [] }),
    studentIds.length ? svc.from('profiles').select('id,name,email').in('id', studentIds) : Promise.resolve({ data: [] }),
  ]);
  const tutorName = Object.fromEntries((tutorsQ.data || []).map((t) => [t.id, t.display_name]));
  const studentName = Object.fromEntries((profQ.data || []).map((p) => [p.id, p.name || p.email]));

  // Which of the student's completed sessions already have a review? Drives the
  // "Rate this session" prompt (one review per session).
  const doneIds = (studentQ.data || []).filter((r) => r.status === 'completed').map((r) => r.id);
  const reviewed = new Set();
  if (doneIds.length) {
    const { data: revs } = await svc.from('tutor_reviews').select('tutoring_session_id').in('tutoring_session_id', doneIds);
    (revs || []).forEach((r) => reviewed.add(r.tutoring_session_id));
  }
  const shape = (r) => ({ ...r, tutorName: tutorName[r.tutor_id] || 'Tutor', studentName: studentName[r.student_id] || 'Student' });

  // Neither side sees the transient pending_payment holds (unpaid, awaiting
  // Stripe or about to be released) — they're implementation detail.
  const notPending = (r) => r.status !== 'pending_payment';
  return Response.json({
    asStudent: (studentQ.data || []).filter(notPending).map((r) => ({ ...shape(r), reviewed: reviewed.has(r.id) })),
    asTutor: (tutorQ.data || []).filter(notPending).map(shape),
  });
}

// ── Club gate (fail closed) ──────────────────────────────────────────────────
// Under house pricing Kaizen sells the session directly and pays the tutor a
// flat hourly rate — Kaizen is the merchant, not a broker of tutor-owned
// funds, which is a materially different money-transmission posture from the
// old tutor-set-rate marketplace (counsel confirms before live keys;
// docs/legal/REVIEW_QUEUE.md).
//
// Deliberately fails CLOSED: the switch must be explicitly true. An empty
// app_settings table means disabled, so selling cannot be switched on by
// forgetting to configure something. Flip `club_enabled` in Admin → Settings.
async function clubOpen() {
  const settings = await getSettings();
  return settings.club_enabled === true;
}

export async function POST(req) {
  // Booking is the money step; GET stays open so an existing booking is still
  // visible and cancellable if the switch is turned off mid-flight.
  if (!await clubOpen()) {
    return Response.json({ error: 'Tutor booking isn\u2019t open yet.' }, { status: 503 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Booking needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const ent = await checkEntitlement(caller, 'handoff');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const tutorId = String(body?.tutorId || '');
  const slotId = String(body?.slotId || '');
  // Checkout lands back wherever booking started (dashboard card, public
  // tutor profile, /family) — but only ever on a local path we render, never
  // an attacker-supplied URL.
  const requestedReturn = String(body?.returnPath || '');
  const returnPath = ['/dashboard', '/family', '/schedule'].includes(requestedReturn)
    || /^\/tutors\/[a-z0-9-]{1,80}$/i.test(requestedReturn)
    ? requestedReturn : '/dashboard';
  if (!tutorId || !slotId) return Response.json({ error: 'Pick a tutor and a time.' }, { status: 400 });
  if (!body?.guardianConsent) return Response.json({ error: 'Guardian consent is required to book a live session.' }, { status: 400 });

  // Who is this session FOR? A parent may book on behalf of a linked/managed
  // child — verified server-side, never from the client's word alone.
  const resolved = await resolveBookingStudent(svc, caller, body?.childId);
  if (resolved.error) return resolved.error;
  const { studentId, onBehalf, relationship } = resolved;
  const studentProfile = onBehalf
    ? (await svc.from('profiles').select('id,email,birth_year,is_minor,guardian_consent_at').eq('id', studentId).maybeSingle()).data
    : caller.profile;
  if (onBehalf && !studentProfile) return Response.json({ error: 'No such student.' }, { status: 404 });

  // Minors: account-level guardian approval is required before any live video
  // session — the checkbox alone isn't enough. A parent who CREATED this
  // managed account IS that approval; a self-booking teen, an unverified age,
  // and an invite-linked "parent" all need the emailed consent link
  // (/api/family/guardian-consent can resend it). One shared rule with the
  // group route, in lib/server/family.js — this path used to inline its own
  // copy, which is how it drifted into accepting any on-behalf booking.
  if (!guardianGateSatisfied({ studentProfile, relationship })) {
    return Response.json({
      error: 'Live video needs a parent or guardian’s approval first. We emailed them a link — ask them to click "Approve live tutoring", then book again.',
      code: 'guardian_consent_required',
    }, { status: 403 });
  }

  // Hard safety gate: only active AND approved tutors can ever be booked,
  // regardless of what the UI showed. NOTE: 'vetting_status' records an ADMIN
  // REVIEW, not a third-party criminal background check — no vendor is
  // integrated. Do not describe it as one in user-facing copy.
  const tutor = (await svc.from('tutors')
    .select('id,display_name,hourly_rate_cents,pay_rate_cents,status,vetting_status')
    .eq('id', tutorId).maybeSingle()).data;
  if (!tutor || tutor.status !== 'active' || tutor.vetting_status !== 'cleared') {
    return Response.json({ error: 'That tutor isn’t bookable right now.' }, { status: 403 });
  }

  // Claim the slot atomically: flip open→booked; if 0 rows updated it was taken.
  const { data: claimed, error: claimErr } = await svc.from('tutor_availability')
    .update({ status: 'booked' })
    .eq('id', slotId).eq('tutor_id', tutorId).eq('status', 'open')
    .select().maybeSingle();
  if (claimErr) {
    console.error('[sessions] slot claim failed', slotId, claimErr.message);
    return Response.json({ error: 'Could not claim that time — try again.' }, { status: 500 });
  }
  if (!claimed) return Response.json({ error: 'That time was just booked — pick another.' }, { status: 409 });

  // House pricing (clubPricing.js): the learner pays the retail/member rate for
  // the 30- or 60-minute product — never the tutor's pay rate × hours. What the
  // tutor is PAID is snapshotted separately below (pay_model = flat_hourly), so
  // the payout is reconstructible from the row forever.
  const durationMin = Math.round((new Date(claimed.end_at).getTime() - new Date(claimed.start_at).getTime()) / 60000);
  const allowances = await clubAllowances(svc, { userId: caller.user.id, plan: caller.profile?.plan });
  const quote = privateQuote({
    plan: caller.profile?.plan,
    minutes: durationMin,
    creditRemaining: allowances.creditRemaining,
  });
  const grossAmount = quote.amountCents;
  const payCents = tutorPayCents(tutor?.pay_rate_cents, durationMin);

  // Launch offer: a student's FIRST live session is free. Any prior session
  // that got past checkout (i.e., not cancelled) uses up the offer; the DB
  // partial unique index (0009) is the race-proof backstop. Additionally gate
  // on a hashed-email redemption (0010) so deleting the account and re-signing
  // up can't farm another free live session (audit 1.6).
  // Intro-free is per STUDENT (the learner receiving the session), so a parent
  // booking for two teens gets one free intro each — keyed to each teen's
  // hashed email, not the parent's.
  const studentEmail = onBehalf ? (studentProfile?.email || '') : (caller.user.email || '');
  let introFree = false;
  const { count: priorCount } = await svc.from('tutoring_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId).neq('status', 'cancelled');
  if ((priorCount || 0) === 0 && await introAvailable(svc, studentEmail)) introFree = true;

  // Complete's included monthly 30-minute session settles like the intro:
  // booked immediately, no Stripe object, allowance decremented synchronously.
  const usesCredit = !introFree && quote.mode === 'included' && quote.feature === 'club_private_credit';
  let amount = (introFree || quote.mode === 'included') ? 0 : grossAmount;

  const stripe = getStripe();

  // Fail CLOSED: a PAID session with no way to collect money must never be
  // booked. The old free/immediate fallback booked it as 'scheduled' anyway and
  // still accrued the tutor's cut on completion — manufacturing a payout
  // liability against $0 collected. Only free-settling bookings (intro,
  // membership credit) may book without Stripe.
  if (!introFree && quote.mode !== 'included' && !stripe) {
    await svc.from('tutor_availability').update({ status: 'open' }).eq('id', slotId); // release the claim
    return Response.json({
      error: "Paid tutoring isn't available on this deployment yet (online payments aren't set up). Please check back soon.",
    }, { status: 503 });
  }

  const insertSession = (isIntro, amt, chargeableNow) => svc.from('tutoring_sessions').insert({
    student_id: studentId, tutor_id: tutorId, availability_id: slotId,
    subject: String(body?.subject || '').slice(0, 120) || null,
    concept: String(body?.concept || '').slice(0, 120) || null,
    note: String(body?.note || '').slice(0, 1000) || null,
    guardian_consent: true,
    scheduled_start: claimed.start_at, scheduled_end: claimed.end_at,
    amount_cents: amt,
    intro_free: isIntro,
    // Payout basis, snapshotted at booking (0023): flat hourly pay, decoupled
    // from what the learner paid. earningsSplit is for pre-club rows only.
    pay_model: 'flat_hourly',
    tutor_pay_cents: payCents,
    booked_via: isIntro ? 'intro' : (usesCredit ? 'included' : 'checkout'),
    booked_by: caller.user.id,
    status: chargeableNow ? 'pending_payment' : 'scheduled',
  }).select().maybeSingle();

  let chargeable = !introFree && !usesCredit && stripe && amount >= 50;   // Stripe rejects charges under $0.50
  let { data: sessionRow, error: insErr } = await insertSession(introFree, amount, chargeable);
  if (insErr && introFree && /tutoring_sessions_one_intro_idx|duplicate|unique/i.test(insErr.message)) {
    // Intro-free race (audit REL-003): a concurrent booking claimed the free
    // session first — the partial unique index rejected this one. Fall back to
    // a normal paid booking.
    introFree = false;
    amount = usesCredit ? 0 : grossAmount;
    chargeable = !usesCredit && stripe && amount >= 50;
    ({ data: sessionRow, error: insErr } = await insertSession(false, amount, chargeable));
  }
  if (insErr) {
    await svc.from('tutor_availability').update({ status: 'open' }).eq('id', slotId); // release on failure
    console.error('[sessions] booking insert failed', slotId, insErr.message);
    return Response.json({ error: 'Could not book the session — the slot was released, try again.' }, { status: 500 });
  }

  // The membership credit is spent the moment the session books — same atomic
  // moment as fulfillment, so an abandoned flow can never burn it. A failed
  // ledger write rolls the booking back rather than gifting untracked time.
  if (usesCredit) {
    try {
      await consumeAllowance(svc, {
        userId: caller.user.id,
        feature: 'club_private_credit',
        metadata: { kind: 'tutoring_session', sessionId: sessionRow.id, tutorId },
      });
    } catch (e) {
      await svc.from('tutoring_sessions').update({ status: 'cancelled' }).eq('id', sessionRow.id);
      await svc.from('tutor_availability').update({ status: 'open' }).eq('id', slotId);
      return Response.json({ error: 'Could not apply your included session — try again.' }, { status: 500 });
    }
  }

  recordUsage(caller, 'handoff', 1, 0, { kind: 'tutoring_booking', tutorId }).catch(() => {});

  if (chargeable) {
    // Pay-per-session: send the student to Stripe Checkout. The webhook flips
    // the held session to scheduled + paid once the charge succeeds.
    const base = appUrl(req);
    try {
      const checkout = await stripe.checkout.sessions.create({
        mode: 'payment',
        // Same posture as the group checkout (group/route.js): Stripe Managed
        // Payments rejects live-instruction merchants, so opt out explicitly
        // and pin the live-tutoring tax code. This route previously lacked
        // both — the one gap between the two checkout paths.
        managed_payments: { enabled: false },
        payment_method_types: ['card'],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            tax_code: 'txcd_20060059', // live online educational services
            product_data: {
              name: `Tutoring with ${tutor?.display_name || 'a Kaizen tutor'}`,
              // In the club's zone rather than the server's: a 1:1 row on a
              // Stripe receipt has the same wrong-evening failure mode as a
              // room on the storefront.
              description: `${body?.subject ? `${String(body.subject).slice(0, 80)} · ` : ''}${roomDateTime(claimed.start_at, CLUB_TIMEZONE)}`,
            },
          },
        }],
        customer_email: caller.user.email || undefined,
        metadata: { tutoring_session_id: sessionRow.id, kaizen_user_id: caller.user.id },
        payment_intent_data: { metadata: { tutoring_session_id: sessionRow.id, kaizen_user_id: caller.user.id } },
        success_url: `${base}${returnPath}?booking=paid`,
        cancel_url: `${base}${returnPath}?booking=cancelled`,
      });
      await svc.from('tutoring_sessions').update({ stripe_checkout_session_id: checkout.id }).eq('id', sessionRow.id);
      await auditLog(caller.user.id, 'tutoring.checkout_started', sessionRow.id, { tutorId, amount_cents: amount });
      return Response.json({ ok: true, url: checkout.url, session: sessionRow });
    } catch (e) {
      // Payment setup failed — don't strand the slot or the hold.
      await svc.from('tutor_availability').update({ status: 'open' }).eq('id', slotId);
      await svc.from('tutoring_sessions').update({ status: 'cancelled' }).eq('id', sessionRow.id);
      console.error('[sessions] checkout create failed', sessionRow.id, e?.message);
      return Response.json({ error: 'Could not start the payment — the slot was released, try again.' }, { status: 502 });
    }
  }

  // Free/immediate path (intro session or membership credit): confirm now.
  // Record the intro redemption (hashed email) so it can't be farmed across
  // accounts (0010).
  if (introFree) recordIntroRedemption(svc, studentEmail).catch(() => {});
  sendBookingEmails(svc, sessionRow, { paid: false }).catch(() => {});
  await auditLog(caller.user.id, 'tutoring.booked', sessionRow.id, {
    tutorId, amount_cents: amount, intro_free: introFree, booked_via: sessionRow.booked_via,
  });
  return Response.json({ ok: true, session: sessionRow, introFree, usedCredit: usesCredit });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  const status = String(body?.status || '');
  if (!id) return Response.json({ error: 'Session id required.' }, { status: 400 });

  const { data: session } = await svc.from('tutoring_sessions').select('*').eq('id', id).maybeSingle();
  if (!session) return Response.json({ error: 'No such session.' }, { status: 404 });

  const tutor = (await svc.from('tutors').select('id').eq('user_id', caller.user.id).maybeSingle()).data;
  const isTutor = tutor && tutor.id === session.tutor_id;
  const isStudent = session.student_id === caller.user.id;
  if (!isTutor && !isStudent) return Response.json({ error: 'Not your session.' }, { status: 403 });

  const allowed = isTutor ? TUTOR_STATUS : STUDENT_STATUS;
  if (!allowed.has(status)) return Response.json({ error: 'Not allowed to set that status.' }, { status: 403 });

  // State machine (audit REL-002): completed/cancelled/no_show are terminal —
  // a completed session can never be flipped to cancelled for a refund.
  if (!canTransition(session.status, status)) {
    return Response.json({ error: `A ${session.status.replace(/_/g, ' ')} session can’t change to ${status.replace(/_/g, ' ')}.` }, { status: 409 });
  }

  // A session that has not begun cannot have happened. `completed` is the
  // transition that accrues the tutor's flat-hourly pay a few lines down, and
  // `in_progress` is what hands that same accrual to the unattended cron sweep
  // (completeEndedSessions), so both are floored at the moment the room opens —
  // T-15, the same instant the join gate uses. Flooring at T+0 instead made the
  // product contradict itself: it let both of them into the room a quarter of
  // an hour early, called that the session starting, and then refused the
  // matching status with an error naming a time still in the future.
  // Without a floor at all a tutor could open a booking a week out, click
  // "Complete", and bank an hour of flat-hourly pay against a session nobody
  // has attended — the state machine allowed it because scheduled → completed
  // is a legal edge, and nothing else looked at the clock (audit 2026-08-18,
  // "a tutor can self-complete a 1:1 that never ran").
  //
  // `cancelled` and `no_show` stay available before the start on purpose: they
  // are the honest things to say about a session that is not going to happen,
  // and neither pays anyone.
  const startsAt = new Date(session.scheduled_start || 0).getTime();
  const opensAt = startsAt - ROOM_OPEN_LEAD_MS;
  if (['completed', 'in_progress'].includes(status) && startsAt > 0 && Date.now() < opensAt) {
    return Response.json({
      error: `That session hasn’t started yet — it can’t be marked ${status.replace(/_/g, ' ')} before the room opens at ${roomDateTime(opensAt, CLUB_TIMEZONE)}.`,
      code: 'notStartedYet',
    }, { status: 409 });
  }

  // Claim the transition before acting on it. canTransition above read a
  // status that a second request — a double-clicked "Complete", the cron
  // sweep, a Stripe webhook — may already have moved on from, and every side
  // effect below (refund, credit restore, earnings accrual) must happen once.
  // Conditioning the update on the status we read makes exactly one caller the
  // winner; the loser gets a 409 instead of a second payout.
  const { data: moved, error: upErr } = await svc.from('tutoring_sessions')
    .update({ status })
    .eq('id', id).eq('status', session.status)
    .select('id').maybeSingle();
  if (upErr) {
    console.error('[sessions] status update failed', id, upErr.message);
    return Response.json({ error: 'Could not update the session — try again.' }, { status: 500 });
  }
  if (!moved) {
    return Response.json({ error: 'That session just changed — reload and try again.' }, { status: 409 });
  }

  // Cancellation refunds, frees the slot for someone else + notifies both
  // parties. All of it after the claim above, so it happens once.
  let refunded = false;
  if (status === 'cancelled') {
    // Refund policy lives in lib/server/sessionStates.js: tutor cancels →
    // always refund; student cancels → only ≥24h before start; sessions that
    // already happened are never refundable here.
    const eligible = refundEligible({ status: session.status, scheduledStart: session.scheduled_start, byTutor: !!isTutor });
    if (eligible && session.paid && session.stripe_payment_intent_id && session.refund_status === 'none') {
      const stripe = getStripe();
      if (stripe) {
        try {
          await stripe.refunds.create({ payment_intent: session.stripe_payment_intent_id });
          await svc.from('tutoring_sessions').update({ refund_status: 'refunded' }).eq('id', id);
          refunded = true;
        } catch (e) {
          console.error('[tutoring] refund failed', e?.message);
        }
      }
    }
    if (session.availability_id) {
      await svc.from('tutor_availability').update({ status: 'open' }).eq('id', session.availability_id);
    }
    // A membership-credit session cancelled inside the refund window gives the
    // credit back (negative ledger row) — to the BOOKER, whose allowance was
    // decremented (a parent booking for a teen spends the parent's credit).
    // Tutor-cancel always restores.
    if (session.booked_via === 'included'
      && refundEligible({ status: session.status, scheduledStart: session.scheduled_start, byTutor: !!isTutor })) {
      restoreAllowance(svc, {
        userId: session.booked_by || session.student_id,
        feature: 'club_private_credit',
        metadata: { kind: 'tutoring_session_cancelled', sessionId: id },
      }).catch((e) => console.error('[tutoring] credit restore failed', id, e?.message));
    }
    sendCancellationEmails(svc, session, { refunded, byTutor: !!isTutor }).catch(() => {});
  }
  // Completing a session accrues the tutor's earnings (paid out manually for
  // now). Club-era rows (pay_model = flat_hourly) accrue the flat hourly pay
  // snapshotted at booking — including intro and membership-credit sessions:
  // the tutor did the work, membership revenue covers it. Pre-club rows keep
  // the historical 89/11 revenue split so old payouts stay reconstructible.
  if (status === 'completed' && isTutor) {
    const existing = await svc.from('tutor_earnings').select('id').eq('tutoring_session_id', id).maybeSingle();
    if (!existing.data) {
      let tutorCut; let fee;
      if (session.pay_model === 'flat_hourly') {
        tutorCut = session.tutor_pay_cents
          ?? tutorPayCents(null, (new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime()) / 60000);
        fee = (session.amount_cents || 0) - tutorCut; // honest margin — negative on comped sessions
      } else {
        ({ tutorCut, fee } = earningsSplit(session.amount_cents, session.intro_free));
      }
      if (tutorCut > 0) {
        const { error: earnErr } = await svc.from('tutor_earnings').insert({
          tutor_id: session.tutor_id, tutoring_session_id: id, amount_cents: tutorCut,
        });
        // 0031 added a unique index on tutor_earnings(tutoring_session_id).
        // Losing that race means the row this select missed already exists —
        // the tutor is paid, which is the outcome we wanted. Treat it as a
        // no-op, not a 500; anything else is a real accrual failure worth a log
        // (the status transition above already succeeded and stands).
        if (!earnErr) {
          await svc.from('tutoring_sessions').update({ platform_fee_cents: fee }).eq('id', id);
        } else if (earnErr.code !== '23505') {
          console.error('[tutoring] earnings accrual failed', id, earnErr.message);
        }
      }
    }
  }
  await auditLog(caller.user.id, 'tutoring.status', id, { status, refunded });
  return Response.json({ ok: true, status, refunded });
}
