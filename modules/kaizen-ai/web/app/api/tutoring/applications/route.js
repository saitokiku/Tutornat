// /api/tutoring/applications — the tutor hiring pipeline.
// POST   → submit (or re-submit) the caller's application; emails admins
// GET    → own application (anyone) or ?all=1 for the full pipeline (admin)
// PATCH  → admin decision {id, status, reviewerNotes?}; approve creates the
//          tutor + flips the role + welcome email; reject emails the decision.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { sendEmail, esc } from '@/lib/server/email';

export const runtime = 'nodejs';

const STATUSES = ['submitted', 'reviewing', 'interview', 'approved', 'rejected'];

function slugify(name) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${base || 'tutor'}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Applying needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const full_name = String(body?.full_name || '').trim();
  if (!full_name) return Response.json({ error: 'Your name is required.' }, { status: 400 });
  const subjects = Array.isArray(body?.subjects)
    ? body.subjects.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : [];
  if (subjects.length === 0) return Response.json({ error: 'List at least one subject you teach.' }, { status: 400 });

  // Tutors work unsupervised on video with minors, and nothing in the system
  // recorded that they are adults. Stripe's KYC would catch an underage account
  // during payout onboarding — months later, after they had already taught.
  // This is a minors-facing-role check, not a money check, so it is required at
  // application time and /api/admin/tutors refuses to clear vetting without it.
  if (body?.adultAttested !== true) {
    return Response.json({ error: 'You must confirm you are 18 or older to tutor on Kaizen.' }, { status: 400 });
  }

  // Resume path must live in the caller's own folder (client uploaded via RLS,
  // but never trust the string that comes back).
  let resume_path = String(body?.resume_path || '') || null;
  if (resume_path && !resume_path.startsWith(`${caller.user.id}/`)) resume_path = null;

  const row = {
    user_id: caller.user.id,
    full_name,
    email: caller.user.email || String(body?.email || '').trim(),
    phone: String(body?.phone || '').slice(0, 40) || null,
    subjects,
    education: String(body?.education || '').slice(0, 500) || null,
    experience_years: Number.isFinite(Number(body?.experience_years)) ? Math.max(0, Math.round(Number(body.experience_years))) : null,
    resume_path,
    cover_note: String(body?.cover_note || '').slice(0, 3000) || null,
    availability_note: String(body?.availability_note || '').slice(0, 500) || null,
    status: 'submitted',
    decided_at: null,
    adult_attested_at: new Date().toISOString(),
  };
  const { data, error } = await svc.from('tutor_applications')
    .upsert(row, { onConflict: 'user_id' }).select().maybeSingle();
  if (error) {
    console.error('[applications] submit failed', caller.user.id, error.message);
    return Response.json({ error: 'Could not submit your application — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'hiring.applied', data.id, { subjects });
  const admin = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim();
  if (admin) {
    sendEmail({
      to: admin,
      subject: `New tutor application: ${full_name}`,
      html: `<p><b>${esc(full_name)}</b> applied to tutor ${esc(subjects.join(', '))}.</p>
             <p>${esc(row.cover_note || '')}</p>
             <p>Review it in the <a href="${process.env.APP_URL || ''}/admin">admin console</a>.</p>`,
    }).catch(() => {});
  }
  return Response.json({ ok: true, application: data });
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ application: null });

  const all = new URL(req.url).searchParams.get('all');
  if (all && isAdminCaller(caller)) {
    const { data } = await svc.from('tutor_applications')
      .select('*').neq('status', 'rejected').order('created_at', { ascending: false }).limit(100);
    return Response.json({ applications: data || [] });
  }
  const { data } = await svc.from('tutor_applications')
    .select('*').eq('user_id', caller.user.id).maybeSingle();
  return Response.json({ application: data || null });
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
  const status = String(body?.status || '');
  if (!id || !STATUSES.includes(status)) {
    return Response.json({ error: `Need id and a status (${STATUSES.join(', ')}).` }, { status: 400 });
  }

  const { data: app } = await svc.from('tutor_applications').select('*').eq('id', id).maybeSingle();
  if (!app) return Response.json({ error: 'No such application.' }, { status: 404 });

  const patch = { status, reviewer_notes: String(body?.reviewerNotes || app.reviewer_notes || '') || null };
  if (status === 'approved' || status === 'rejected') patch.decided_at = new Date().toISOString();
  const { error: upErr } = await svc.from('tutor_applications').update(patch).eq('id', id);
  if (upErr) {
    console.error('[applications] review update failed', id, upErr.message);
    return Response.json({ error: 'Could not update the application — try again.' }, { status: 500 });
  }

  if (status === 'approved') {
    // Application → tutor profile + role flip, but NOT bookable yet: the tutor
    // stays pending until an admin records identity verification + a completed
    // admin review (vetting) and activates them. Child-safety hard gate.
    // This is a human review, NOT a third-party background check.
    await svc.from('tutors').upsert({
      user_id: app.user_id,
      display_name: app.full_name,
      bio: app.cover_note,
      subjects: app.subjects || [],
      status: 'pending',
      // Carried across so the vetting gate can check it on the tutors row
      // without re-reading the application.
      adult_attested_at: app.adult_attested_at || null,
      slug: slugify(app.full_name),
      headline: app.subjects?.length ? `${app.subjects.slice(0, 3).join(' · ')} tutor` : null,
    }, { onConflict: 'user_id' });
    await svc.from('profiles').update({ role: 'tutor' }).eq('id', app.user_id).neq('role', 'admin');
    sendEmail({
      to: app.email,
      subject: 'Welcome to Kaizen 🌸 — one last step',
      html: `<p>Hi ${esc(app.full_name)},</p>
             <p>You're approved! One required step before students can book you: <b>an identity
             review, interview, and approval by our team</b>. We'll email you the next steps separately —
             it usually takes 1–3 business days.</p>
             <p>Meanwhile, set up your profile and availability in your
             <a href="${process.env.APP_URL || ''}/tutor">tutor workspace</a> so you're bookable the
             moment our team clears you.</p>`,
    }).catch(() => {});
  }
  if (status === 'rejected') {
    sendEmail({
      to: app.email,
      subject: 'Your Kaizen tutor application',
      html: `<p>Hi ${esc(app.full_name)},</p><p>Thank you for applying to tutor with Kaizen. After review we
             won't be moving forward right now. We keep applications on file and would love to hear
             from you again as we grow.</p>`,
    }).catch(() => {});
  }

  await auditLog(caller.user.id, 'hiring.decision', id, { status });
  return Response.json({ ok: true, status });
}
