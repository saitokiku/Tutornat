// POST /api/tutoring/recap { sessionId, notes }
// Tutor-only. Expands the tutor's rough notes into a warm recap (fast model),
// stores it on the session (recap_md), and emails the student + any linked
// parents. Degrades gracefully when email isn't configured.

import { meteredCall } from '@/lib/server/aiCall';
import { getCaller, getSettings, serviceClient, checkEntitlement, auditLog } from '@/lib/server/context';
import { pickModel } from '@/lib/server/models';
import { RECAP_SYSTEM } from '@/lib/prompts';
import { sendEmail, esc } from '@/lib/server/email';

export const runtime = 'nodejs';
export const maxDuration = 60;


// Minimal, safe markdown → HTML for the email body (headings, bold, lists).
function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = String(md).split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h3>${esc(line.replace(/^##\s+/, ''))}</h3>`; }
    else if (/^[-*]\s+/.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${esc(line.replace(/^[-*]\s+/, '')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</li>`; }
    else if (line.trim() === '') { if (inList) { html += '</ul>'; inList = false; } }
    else { if (inList) { html += '</ul>'; inList = false; } html += `<p>${esc(line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`; }
  }
  if (inList) html += '</ul>';
  return html;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  const notes = String(body?.notes || '').trim().slice(0, 2000);
  if (!sessionId || notes.length < 4) return Response.json({ error: 'Add a couple of notes to expand.' }, { status: 400 });

  const { data: session } = await svc.from('tutoring_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!session) return Response.json({ error: 'No such session.' }, { status: 404 });
  const { data: tutor } = await svc.from('tutors').select('id,display_name').eq('user_id', caller.user.id).maybeSingle();
  if (!tutor || tutor.id !== session.tutor_id) return Response.json({ error: 'Not your session.' }, { status: 403 });

  const ent = await checkEntitlement(caller, 'report');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  const settings = await getSettings();
  const model = pickModel('fast', settings, caller.profile?.plan);
  let recap;
  try {
    const metered = await meteredCall({
      caller, model, system: RECAP_SYSTEM, messages: [{ role: 'user', content: `Subject: ${session.subject || 'tutoring'}\nTutor's notes:\n${notes}` }],
      maxTokens: 700, feature: 'report', tier: 'fast',
    });
    if (!metered) return Response.json({ error: 'AI budget reached for this month.' }, { status: 429 });
    recap = metered.text;
  } catch (e) {
    console.error('[recap] generation failed', e?.message);
    return Response.json({ error: 'Could not write the recap — try again.' }, { status: 500 });
  }

  await svc.from('tutoring_sessions').update({ recap_md: recap }).eq('id', sessionId);

  // Email the student + any linked parents.
  const [studentQ, parentsQ] = await Promise.all([
    svc.from('profiles').select('name,email').eq('id', session.student_id).maybeSingle(),
    svc.from('parent_student_relationships').select('parent_id').eq('student_id', session.student_id),
  ]);
  const parentIds = (parentsQ.data || []).map((r) => r.parent_id);
  const parentEmails = parentIds.length
    ? ((await svc.from('profiles').select('email').in('id', parentIds)).data || []).map((p) => p.email).filter(Boolean)
    : [];
  const recipients = [...new Set([studentQ.data?.email, ...parentEmails].filter(Boolean))];
  const html = `<p>Hi ${esc(studentQ.data?.name || 'there')},</p>
    <p>Here's a recap of your session with ${esc(tutor.display_name)} on ${esc(session.subject || 'your work')}:</p>
    ${mdToHtml(recap)}
    <p>— The Kaizen team</p>`;
  for (const to of recipients) {
    sendEmail({ to, subject: `Your tutoring recap: ${session.subject || 'session'}`, html }).catch(() => {});
  }

  auditLog(caller.user.id, 'tutoring.recap', sessionId, { recipients: recipients.length }).catch(() => {});
  return Response.json({ ok: true, recap, emailed: recipients.length });
}
