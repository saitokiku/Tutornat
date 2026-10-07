// Guardian consent for a minor's (13–17) live-video tutoring.
// GET  ?t=<token>  — the link from the guardian's email; records consent and
//                    serves a friendly confirmation page (no session needed).
// POST             — authed minor asks us to (re)send the guardian email, or
//                    sets/corrects the guardian email. Re-pointing it is capped
//                    and audit-logged, and frozen entirely once a guardian has
//                    approved (see the POST handler).
//
// "Minor" here means anyone the age posture does not read as an adult, so it
// includes the accounts with no birth year at all (0007 backfilled NULL). Those
// have no guardian address on file and never had one, which is why the empty
// case answers with an instruction and a `code`, not a dead end — the UI turns
// it into a form. An account whose owner is actually an adult has the other
// door: state a birth year once at POST /api/account/birth-year.

import { getCaller, serviceClient, auditLog, sendGuardianConsentEmail, agePosture, guardianEmailIsSelf } from '@/lib/server/context';
import { esc } from '@/lib/server/email';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// How many times an account may re-point its guardian email in this window
// before a human has to be involved. See the POST handler for what this does
// and does not prove.
const GUARDIAN_EMAIL_CHANGE_LIMIT = 3;
const GUARDIAN_EMAIL_CHANGE_WINDOW_MS = 30 * 24 * 3600_000;

function page(ok, name) {
  const body = ok
    ? `<h1>Thank you 🌸</h1>
       <p>You've approved live 1:1 video tutoring for <b>${esc(name || 'your student')}</b>.
       Every Kaizen tutor is interviewed and approved by our team before they can be booked,
       sessions are private rooms, and anyone can report a concern from inside a session.
       We do not yet run third-party criminal background checks — please supervise sessions
       accordingly.</p>
       <p>You can withdraw approval or request your student's data any time — reply to the email
       that brought you here, or see our <a href="/safety">child-safety practices</a>.</p>`
    : `<h1>That link didn't work</h1>
       <p>The approval link looks expired or invalid. Ask your student to re-send it from their
       Kaizen settings, or contact us via the <a href="/contact">contact page</a>.</p>`;
  // Standalone page, no Tailwind: inline hexes are the live tokens from
  // app/globals.css :root (--c-paper: 250 250 249 = #FAFAF9;
  // --c-ink: 26 25 23 = #1A1917). These are hardcoded because mail clients
  // do not load a stylesheet, and they were WRONG: the comment claimed they
  // came from the config while shipping #FCFBF9/#211D1A, a palette from
  // before the 2026-08-22 rebuild. If the tokens move, move these too.
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Kaizen — guardian approval</title>
     <body style="font-family:-apple-system,Segoe UI,sans-serif;background:#FAFAF9;color:#1A1917;
       display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0">
       <div style="max-width:440px;padding:32px;text-align:center;line-height:1.6;font-size:15px">${body}</div>
     </body>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get('t');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return page(false);
  const svc = serviceClient();
  if (!svc) return page(false);

  // The token identifies the account; the posture decides whether there is
  // anything to approve. `is_minor = true` used to be the filter, which locked
  // out the accounts that need this link MOST: one with no usable birth year is
  // gated out of live video as a minor (lib/server/context.js agePosture) but
  // may still carry the old is_minor = false default.
  const { data: found } = await svc.from('profiles')
    .select('id,name,birth_year,is_minor').eq('guardian_consent_token', token).maybeSingle();
  if (!found || agePosture(found) === 'adult') return page(false);

  const { data: profile } = await svc.from('profiles')
    .update({ guardian_consent_at: new Date().toISOString() })
    .eq('id', found.id).select('id,name').maybeSingle();
  if (!profile) return page(false);

  await auditLog(profile.id, 'guardian.consented', profile.id, { via: 'email_link' });
  return page(true, profile.name);
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 5, windowMs: 3600_000 }); // 5 sends/hour
  if (limited) return limited;

  let body = {};
  try { body = await req.json(); } catch { /* empty body = plain resend */ }

  let profile = caller.profile;
  if (!profile) return Response.json({ error: 'Not configured.' }, { status: 501 });
  // Anyone who is not a VERIFIED adult can use this route — minors, and also
  // accounts with no usable birth year, which lib/server/context.js agePosture
  // treats as minors. Those accounts are gated out of live video by the same
  // rule, so this is the door they walk through to get un-gated.
  if (agePosture(profile) === 'adult') {
    return Response.json({ error: 'Guardian approval only applies to accounts under 18.' }, { status: 400 });
  }

  // Setting/correcting the guardian email (e.g. a typo at signup).
  //
  // BE HONEST ABOUT WHAT THIS IS. Email-only consent proves that someone with
  // access to that inbox clicked a link. It does not prove they are an adult,
  // a parent, or a different person from the student — a teen with a second
  // address can satisfy it, and no amount of code here changes that; real
  // verifiable parental consent is a vendor and a REVIEW_QUEUE item.
  // What the two rules below buy is a paper trail and a ceiling:
  //   1. once a consent has actually been recorded, the address is FROZEN.
  //      Moving approval to a new inbox after the fact is the shape of an
  //      account takeover or a teen re-pointing their guardian, so it costs a
  //      support conversation instead of an API call.
  //   2. re-pointing is capped per account per month, counted from the audit
  //      log, so "try addresses until one sticks" leaves a visible trail and
  //      then stops.
  // Every change is audit-logged either way — a moved target is the signal a
  // human safety review is looking for.
  const newEmail = String(body?.guardianEmail || '').trim().toLowerCase();
  const currentEmail = (profile.guardian_email || '').toLowerCase();
  if (newEmail && newEmail !== currentEmail) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      return Response.json({ error: 'That guardian email doesn’t look right.' }, { status: 400 });
    }
    // The SAME rule the signup write uses (context.js), not a bare string
    // compare: this route is exactly where the signup refusal sends an account
    // that named its own address, so comparing literally would have made A4's
    // fix a one-keystroke walk-around on its own remediation path — refused for
    // sam@x.com, accepted for sam+mom@x.com, then frozen in that state.
    if (guardianEmailIsSelf(caller.user.email, newEmail)) {
      return Response.json({
        error: 'The guardian email must reach a different person — a plus-tag or alias of your own address doesn’t count. Use a parent or guardian’s own inbox.',
      }, { status: 400 });
    }
    if (profile.guardian_consent_at) {
      return Response.json({
        error: 'A parent or guardian has already approved this account, so the guardian email can only be changed by our team. Contact support and we’ll help.',
        code: 'guardian_consent_locked',
      }, { status: 409 });
    }
    const since = new Date(Date.now() - GUARDIAN_EMAIL_CHANGE_WINDOW_MS).toISOString();
    const { count } = await svc.from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', caller.user.id).eq('action', 'guardian.email_changed')
      .gte('created_at', since);
    if ((count || 0) >= GUARDIAN_EMAIL_CHANGE_LIMIT) {
      return Response.json({
        error: 'That guardian email has been changed too many times. Contact support and we’ll finish setting up approval.',
        code: 'guardian_email_change_limit',
      }, { status: 429 });
    }

    const { data: updated } = await svc.from('profiles')
      .update({ guardian_email: newEmail, guardian_consent_at: null })
      .eq('id', caller.user.id).select().maybeSingle();
    if (updated) profile = updated;
    await auditLog(caller.user.id, 'guardian.email_changed', newEmail, {
      from: currentEmail || null, to: newEmail, prior_changes: count || 0,
    });
  }

  // No guardian on file is the ordinary state of an account that never stated
  // an age — 0007's NULL birth_year makes it 'unknown', which the gate refuses,
  // and nobody ever asked these accounts for a guardian. So this is not an
  // error to shrug at, it is the instruction: send us the address, or (if the
  // account is actually an adult's) state a birth year at /settings. The code
  // is what BookModal and /settings branch on to render the right form.
  if (!profile.guardian_email) {
    return Response.json({
      error: 'We don’t have a parent or guardian email for this account yet — send us one and we’ll email them the approval link.',
      code: 'guardian_email_missing',
    }, { status: 400 });
  }
  if (profile.guardian_consent_at) return Response.json({ ok: true, alreadyConsented: true });

  // Report what actually happened. This response is the sole basis for the UI
  // saying "approval email sent", and an unconfigured mailer (rule 6) or a row
  // with no consent token both make the send a silent no-op.
  const send = await sendGuardianConsentEmail(profile);
  if (!send?.sent) {
    return Response.json({
      error: send?.dev
        ? 'Email isn’t configured on this deployment, so nothing was sent. Contact support and we’ll approve the account by hand.'
        : 'We couldn’t send the approval email just now. Try again in a minute, or contact support and we’ll finish setting it up.',
      code: 'guardian_email_not_sent',
    }, { status: send?.dev ? 501 : 502 });
  }
  await auditLog(caller.user.id, 'guardian.consent_requested', profile.guardian_email, {});
  return Response.json({ ok: true, sentTo: profile.guardian_email });
}
