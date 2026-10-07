// POST /api/handoff — a student's message to the people who run the club.
// Admins work the queue in /admin. It assigns nobody: private 1:1 is a cut
// product and the directory is gated shut, so neither this route nor the copy
// that calls it may name a tutor being dispatched (CLAIMS_MATRIX, wave 2).
import { getCaller, checkEntitlement, recordUsage, serviceClient } from '@/lib/server/context';
import { sendEmail, esc } from '@/lib/server/email';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  // This route writes a row and sends admin mail; it had no limiter at all.
  const limited = await rateLimitResponse(caller, req, { limit: 10, windowMs: 3600_000 });
  if (limited) return limited;

  const ent = await checkEntitlement(caller, 'handoff');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const { courseTitle = '', concept = '', urgency = 'normal', note = '', transcriptSummary = '' } = body || {};

  const record = {
    course_title: String(courseTitle).slice(0, 200),
    concept: String(concept).slice(0, 200),
    urgency: ['low', 'normal', 'high'].includes(urgency) ? urgency : 'normal',
    note: String(note).slice(0, 2000),
    transcript_summary: String(transcriptSummary).slice(0, 4000),
  };

  if (!caller.demo) {
    const svc = serviceClient();
    if (svc) {
      const { error } = await svc.from('human_handoff_requests').insert({ ...record, user_id: caller.user.id });
      if (error) return Response.json({ error: 'Could not save request.' }, { status: 500 });
    }
    recordUsage(caller, 'handoff', 1, 0, { concept: record.concept }).catch(() => {});
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (admins.length) {
      sendEmail({
        to: admins[0],
        subject: `Kaizen: a student asked for help — ${record.concept || record.course_title || 'general'}`,
        // esc() every interpolated value: course_title/concept/note are
        // student-controlled and were only length-clamped, so a `note`
        // containing markup rendered as live HTML in a mail sent from our own
        // authenticated sender to the admin inbox. Same defect as audit
        // SEC-003, which was fixed in tutoringEmails.js and context.js but
        // missed here.
        html: `<p><strong>${esc(caller.user.email)}</strong> asked Kaizen for help.</p>`
            + `<p>Course: ${esc(record.course_title)}<br/>Concept: ${esc(record.concept)}<br/>Urgency: ${esc(record.urgency)}</p>`
            + `<p style="white-space:pre-wrap">${esc(record.note)}</p>`,
      }).catch(() => {});
    }
  }

  // Native booking (/tutors) replaced the legacy Cal.com link (audit
  // MAINT-003); the response used to carry a schedulingLink that was always
  // null, and ProgressView rendered a button nobody could ever see.
  //
  // `delivered` is the honest half of the answer. A demo caller takes the
  // branch above and NOTHING happens: no row, no usage, no admin mail. The
  // card still said "Sent to Kaizen — someone on the team will read it", which
  // is the one thing this route did not do. The client renders a different
  // sentence when delivered is false; it is a separate field rather than
  // `ok: false` because the request did not fail — there is simply nobody to
  // route a demo message to.
  return Response.json({ ok: true, delivered: !caller.demo });
}
