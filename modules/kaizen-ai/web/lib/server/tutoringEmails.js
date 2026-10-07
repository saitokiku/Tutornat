// Transactional emails for the tutoring marketplace. Shared by the booking
// route (immediate path), the Stripe webhook (paid path), and cancellation.
// Every send is best-effort — callers .catch() and never block on delivery.
//
// Escaping rule (audit SEC-003): names/subjects/notes are user-controlled.
// They are HTML-escaped wherever they land in an HTML body, and left raw in
// plain-text subject lines (which never render HTML).

import { sendEmail, esc } from '@/lib/server/email';
import { REFUND_WINDOW_HOURS, GROUP_REFUND_WINDOW_HOURS } from '@/lib/server/sessionStates';
import { sessionIcs } from '@/lib/server/ics';
import { roomDateTime, CLUB_TIMEZONE, zoneAbbrev } from '@/lib/roomTime';
import { kindLabel } from '@/lib/roomKinds';

function money(cents) { return `$${((cents || 0) / 100).toFixed(2)}`; }

// IN THE ROOM'S ZONE, AND SAYING WHICH ZONE.
//
// This was `new Date(iso).toLocaleString('en-US', …)` with no timeZone, which
// means the SERVER's zone — UTC on Vercel. Every confirmation, reminder and
// release email told a family that a 6:00 PM Austin room met at 11:00 PM, on
// the documents they act on and file. The storefront was fixed for this in
// wave 2 (lib/roomTime.js); the mail was not, and mail is worse, because it
// keeps being wrong in an inbox long after a page has been corrected.
//
// The zone label is printed because an email is read anywhere: a parent
// travelling reads "6:00 PM CDT" and knows what to do with it.
function when(iso, timezone = null) {
  const tz = timezone || CLUB_TIMEZONE;
  const t = roomDateTime(iso, tz);
  if (!t) return '';
  const z = zoneAbbrev(iso, tz);
  return z ? `${t} ${z}` : t;
}
function appUrl() { return (process.env.APP_URL || '').replace(/\/$/, ''); }

// WHERE the room is. Club rooms are in person — that is the whole product — so
// "the video room opens 15 minutes before" was a leftover from the 1:1
// marketplace telling a family to open a browser instead of leaving the house.
// The venue is printed when the row carries one, and nothing is invented when
// it does not: no doors-open time, no arrival policy, no address we do not have.
function placeLine(room) {
  const venue = room?.venue ? esc(room.venue) : null;
  return venue
    ? `<p><b>Where:</b> ${venue} — in person.</p>`
    : `<p>In person. The address is on the <a href="${appUrl()}/schedule">schedule</a>.</p>`;
}

// Resolve student + tutor contact details from a session row (raw values).
async function partiesOf(svc, session) {
  const [studentQ, tutorQ] = await Promise.all([
    svc.from('profiles').select('name,email').eq('id', session.student_id).maybeSingle(),
    svc.from('tutors').select('display_name,user_id').eq('id', session.tutor_id).maybeSingle(),
  ]);
  const student = studentQ.data;
  const tutor = tutorQ.data;
  let tutorEmail = null;
  if (tutor?.user_id) {
    const { data: tp } = await svc.from('profiles').select('email').eq('id', tutor.user_id).maybeSingle();
    tutorEmail = tp?.email || null;
  }
  return {
    studentEmail: student?.email || null,
    studentName: student?.name || 'there',
    tutorEmail,
    tutorName: tutor?.display_name || 'your tutor',
  };
}

export async function sendBookingEmails(svc, session, { paid = false } = {}) {
  const p = await partiesOf(svc, session);
  const t = when(session.scheduled_start);
  const paidNote = paid ? ` (${money(session.amount_cents)} paid)` : '';
  const sName = esc(p.studentName), tName = esc(p.tutorName);
  const subjHtml = esc(session.subject || ''), noteHtml = esc(session.note || '');
  const ics = sessionIcs({
    uid: `session-${session.id}@kaizenedu.net`,
    title: `${session.subject || 'Tutoring'} with ${p.tutorName} — Kaizen`,
    start: session.scheduled_start,
    end: session.scheduled_end,
    url: `${appUrl()}/dashboard`,
  });
  if (p.studentEmail) {
    sendEmail({
      to: p.studentEmail,
      subject: `Booked: ${session.subject || 'tutoring'} with ${p.tutorName}`,
      html: `<p>Hi ${sName},</p>
        <p>Your session is confirmed for <b>${t}</b> with <b>${tName}</b>${paidNote}.</p>
        <p>The video link appears in your <a href="${appUrl()}/dashboard">Kaizen dashboard</a> 15 minutes before it starts.</p>
        <p>Plans change? You can cancel for a full refund up to ${REFUND_WINDOW_HOURS} hours before the session.</p>`,
      attachments: ics ? [ics] : [],
    }).catch(() => {});
  }
  if (p.tutorEmail) {
    sendEmail({
      to: p.tutorEmail,
      subject: `New booking: ${session.subject || 'a session'} on ${t}`,
      html: `<p>Hi ${tName},</p>
        <p><b>${sName}</b> booked you for <b>${t}</b>${subjHtml ? ` — <b>${subjHtml}</b>` : ''}.</p>
        ${noteHtml ? `<p>Their note: “${noteHtml}”</p>` : ''}
        <p>Open your <a href="${appUrl()}/tutor">tutor workspace</a> to prep and join.</p>`,
    }).catch(() => {});
  }
}

export async function sendCancellationEmails(svc, session, { refunded = false, byTutor = false } = {}) {
  const p = await partiesOf(svc, session);
  const t = when(session.scheduled_start);
  const sName = esc(p.studentName), tName = esc(p.tutorName);
  const refundLine = refunded
    ? `<p>A full refund of ${money(session.amount_cents)} is on its way — it may take a few business days to appear on your statement.</p>`
    : '';
  if (p.studentEmail) {
    sendEmail({
      to: p.studentEmail,
      subject: `Cancelled: ${session.subject || 'tutoring'} on ${t}`,
      html: `<p>Hi ${sName},</p>
        <p>Your session with ${tName} on <b>${t}</b> has been cancelled${byTutor ? ' by the tutor' : ''}.</p>
        ${refundLine}
        <p>You can book again any time from your <a href="${appUrl()}/dashboard">dashboard</a>.</p>`,
    }).catch(() => {});
  }
  if (p.tutorEmail) {
    sendEmail({
      to: p.tutorEmail,
      subject: `Cancelled: session on ${t}`,
      html: `<p>Hi ${tName},</p>
        <p>The session with ${sName} on <b>${t}</b> was cancelled${byTutor ? '' : ' by the student'}. The slot is open again.</p>`,
    }).catch(() => {});
  }
}

export async function sendReminderEmail(svc, session) {
  const p = await partiesOf(svc, session);
  const t = when(session.scheduled_start);
  const sName = esc(p.studentName), tName = esc(p.tutorName);
  const ics = sessionIcs({
    uid: `session-${session.id}@kaizenedu.net`,
    title: `${session.subject || 'Tutoring'} with ${p.tutorName} — Kaizen`,
    start: session.scheduled_start,
    end: session.scheduled_end,
    url: `${appUrl()}/dashboard`,
  });
  if (p.studentEmail) {
    sendEmail({
      to: p.studentEmail,
      subject: `Reminder: ${session.subject || 'tutoring'} with ${p.tutorName} soon`,
      html: `<p>Hi ${sName},</p>
        <p>This is a reminder that your session with <b>${tName}</b> is coming up on <b>${t}</b>.</p>
        <p>Join from your <a href="${appUrl()}/dashboard">Kaizen dashboard</a> — the link opens 15 minutes before.</p>`,
      attachments: ics ? [ics] : [],
    }).catch(() => {});
  }
}

// ── Group seats (Homework Hall / Clinics / Community Hall) ───────────────────
// Sent when a seat SETTLES — instantly for free/included seats, from the
// webhook/reconcile for paid ones. Goes to the student and every active
// linked parent, because for managed teens the parent is the account that
// booked and pays. Best-effort like everything else in this file.

// The kind map is lib/roomKinds.js. The copy that used to live here had NO
// `standing_seat` entry, so a seat family's confirmation fell through to
// "Session" — the one room whose name is the product they bought. It also wrote
// "Community Hall (free)" where every screen says "Community Hall".

export async function sendGroupSeatEmails(svc, { seat, room, mode = 'retail' }) {
  if (!seat || !room) return;
  const [{ data: student }, { data: links }, { data: tutor }] = await Promise.all([
    svc.from('profiles').select('name,email').eq('id', seat.student_id).maybeSingle(),
    svc.from('parent_student_relationships').select('parent_id').eq('student_id', seat.student_id).eq('status', 'active'),
    svc.from('tutors').select('display_name').eq('id', room.tutor_id).maybeSingle(),
  ]);
  const parentIds = [...new Set((links || []).map((l) => l.parent_id))];
  const { data: parents } = parentIds.length
    ? await svc.from('profiles').select('id,name,email').in('id', parentIds)
    : { data: [] };

  const t = when(room.scheduled_start, room.timezone);
  const roomKind = kindLabel(room.kind);
  const title = room.topic || room.subject || roomKind;
  // Calendar file on the CONFIRMATION too, not just the reminder — the
  // booking email is the one that gets filed.
  const ics = room.id ? sessionIcs({
    uid: `group-room-${room.id}-${seat.student_id}@kaizenedu.net`,
    title: `${title} — Kaizen`,
    start: room.scheduled_start,
    end: room.scheduled_end,
    url: `${appUrl()}/schedule`,
  }) : null;
  const priceLine = mode === 'included'
    ? 'This visit used one of your included membership visits.'
    : mode === 'free'
      ? 'This session is free.'
      : `${money(seat.amount_cents)} paid.`;
  const sName = esc(student?.name || 'there');
  const titleHtml = esc(title), tutorHtml = esc(tutor?.display_name || 'your tutor');
  const body = (greetName, forWhom) => `<p>Hi ${greetName},</p>
    <p>${forWhom} confirmed for <b>${titleHtml}</b> (${roomKind}) on <b>${t}</b> with ${tutorHtml}.</p>
    <p>${priceLine}</p>
    ${placeLine(room)}
    <p>Cancelling more than ${GROUP_REFUND_WINDOW_HOURS} hours out refunds the payment or returns the included visit.</p>`;

  if (student?.email) {
    sendEmail({
      to: student.email,
      subject: `Booked: ${title} — ${t}`,
      html: body(sName, 'Your seat is'),
      attachments: ics ? [ics] : [],
    }).catch(() => {});
  }
  for (const parent of parents || []) {
    if (!parent.email || parent.email === student?.email) continue;
    sendEmail({
      to: parent.email,
      subject: `Booked for ${student?.name || 'your student'}: ${title} — ${t}`,
      html: body(esc(parent.name || 'there'), `${sName}'s seat is`),
      attachments: ics ? [ics] : [],
    }).catch(() => {});
  }
}

// ── Occupancy loop (0029): group reminders w/ confirm, waitlist, release ─────

// Contacts for a group seat: the student and (if different) the account that
// booked it — for a managed teen that's the parent whose allowance was spent.
async function seatContacts(svc, seat) {
  const ids = [...new Set([seat.student_id, seat.booked_by].filter(Boolean))];
  const { data: profiles } = ids.length
    ? await svc.from('profiles').select('id,name,email').in('id', ids)
    : { data: [] };
  return (profiles || []).filter((p) => p.email);
}

/**
 * T-24h group reminder. Carries the calendar file, and — for an INCLUDED seat
 * that hasn't been confirmed — the confirm-or-release ask: confirm from the
 * dashboard/family page, or the seat is released ~4h before start (the visit
 * goes back on the allowance; the seat goes to the waitlist). Honest about
 * the consequence, because the consequence is the mechanism.
 */
export async function sendGroupReminderEmail(svc, { seat, room }) {
  const contacts = await seatContacts(svc, seat);
  if (!contacts.length) return;
  const t = when(room.scheduled_start, room.timezone);
  const title = room.topic || room.subject || kindLabel(room.kind);
  const titleHtml = esc(title);
  // A STANDING SEAT IS NEVER RELEASED, SO IT IS NEVER THREATENED WITH RELEASE.
  // Seat weeks are booked `booked_via='included'`, so the old test caught every
  // one of them and mailed a $550-a-month family a weekly warning that their
  // reserved place would be given to a waitlist — something `shouldReleaseSeat`
  // and `notifySeatOpened` both now refuse to do. The reminder still goes out
  // (telling us helps the tutor plan the room); only the threat is gone.
  const needsConfirm = room.kind !== 'standing_seat'
    && seat.booked_via === 'included'
    && !seat.confirmed_at;
  const ics = sessionIcs({
    uid: `group-seat-${seat.id}@kaizenedu.net`,
    title: `${title} — Kaizen`,
    start: room.scheduled_start,
    end: room.scheduled_end,
    url: `${appUrl()}/schedule`,
  });
  const confirmBlock = needsConfirm
    ? `<p><b>One tap to keep the seat:</b> <a href="${appUrl()}/family?confirmSeat=${seat.id}">confirm you're coming</a>.
       Unconfirmed included visits are released about 4 hours before start — the visit goes back on your
       membership and the spot goes to the waitlist, so an empty chair never costs you a visit.</p>`
    : '';
  for (const c of contacts) {
    sendEmail({
      to: c.email,
      subject: `${needsConfirm ? 'Confirm: ' : 'Reminder: '}${title} — ${t}`,
      html: `<p>Hi ${esc(c.name || 'there')},</p>
        <p><b>${titleHtml}</b> is coming up on <b>${t}</b>.</p>
        ${confirmBlock}
        ${placeLine(room)}`,
      attachments: ics ? [ics] : [],
    }).catch(() => {});
  }
}

/** A seat opened in a room this account is waitlisted for. First come, first served. */
export async function sendWaitlistSeatOpenEmail(svc, { userId, room }) {
  const { data: profile } = await svc.from('profiles')
    .select('name,email').eq('id', userId).maybeSingle();
  if (!profile?.email) return;
  const t = when(room.scheduled_start, room.timezone);
  const title = room.topic || room.subject || kindLabel(room.kind);
  sendEmail({
    to: profile.email,
    subject: `A seat opened: ${title} — ${t}`,
    html: `<p>Hi ${esc(profile.name || 'there')},</p>
      <p>A seat just opened in <b>${esc(title)}</b> on <b>${t}</b> — you asked us to tell you.</p>
      <p><a href="${appUrl()}/schedule">Grab it from the schedule</a> — first come, first served.</p>`,
  }).catch(() => {});
}

/** The T-4h sweep released an unconfirmed included seat: say so, kindly and
 * exactly — the visit is back, and here's where to rebook. */
export async function sendSeatReleasedEmail(svc, { seat, room }) {
  const contacts = await seatContacts(svc, seat);
  if (!contacts.length) return;
  const t = when(room.scheduled_start, room.timezone);
  const title = room.topic || room.subject || kindLabel(room.kind);
  for (const c of contacts) {
    sendEmail({
      to: c.email,
      subject: `Seat released: ${title} — ${t}`,
      html: `<p>Hi ${esc(c.name || 'there')},</p>
        <p>The seat in <b>${esc(title)}</b> on <b>${t}</b> wasn't confirmed, so we released it and put the
        included visit back on your membership.</p>
        <p><a href="${appUrl()}/schedule">Pick another time on the schedule</a>, or just confirm next time and the seat stays yours.</p>`,
    }).catch(() => {});
  }
}
