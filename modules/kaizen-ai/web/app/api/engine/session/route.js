// The practice session. Spec §4.1 F-2.
//
// GET  /api/engine/session                    → start (or resume) + first activity
// GET  /api/engine/session?sessionId=&next=1  → next activity
// POST /api/engine/session {action:'answer'}  → submit, graded server-side
// POST /api/engine/session {action:'hint'}    → next rung of the ladder
// POST /api/engine/session {action:'explain'} → menu self-explanation
// POST /api/engine/session {action:'end'}     → close the session
// POST /api/engine/session {action:'report'}  → "this looks wrong"
// POST /api/engine/session {action:'focus'}   → point a learner at one concept
//
// Every answer key stays server-side; the client receives rendered content and
// affordances only. Sessions END — §11.4, no infinite session.
//
// FOCUS IS AN ASSIGNMENT, NEVER AN ASSESSMENT (STRATEGY §4.6, hard rule 5).
// A learner may choose their own next concept, and a parent may choose one for
// a child they manage — the homeschool parent's "today's lesson". Setting a
// focus writes no evidence, recomputes no estimate and confirms nothing: it
// only says which of the reachable concepts comes next. A parent sees
// everything and assigns anything; only the learner, unassisted and later, can
// make a concept count. That is why 'focus' is the ONE action on this route
// that accepts a studentId, and why every other action stays strictly
// first-person.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { resolveBookingStudent } from '@/lib/server/family';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import {
  startSession, endSession, nextActivity, submitAnswer, requestHint, submitSelfExplain,
} from '@/lib/engine/session';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_PROVISIONED = { notProvisioned: true, action: 'unavailable' };

// Where a learner's chosen concept lives: its own table (0037), NOT
// profiles.app_meta.
//
// app_meta was the first home and it was the wrong one. lib/cloud.js pushApp()
// rewrites app_meta as a whole literal object with a fixed key set on every
// debounced client sync, so a focus a parent set was deleted within seconds of
// the child opening the app — silently, and exactly when it mattered. A
// dedicated table the client cannot write is the only shape in which "work on
// this one today" survives the product being used.
//
// Reads and writes both go through here and through /api/engine/state, which
// reads the same table.

/** The stored focus, normalised, or null. Mirrors readFocus() in engine/state. */
export function shapeFocus(row) {
  if (!row || !row.kc_id) return null;
  return {
    kcId: String(row.kc_id),
    title: row.title || null,
    setBy: row.set_by === 'parent' ? 'parent' : 'learner',
    setAt: row.set_at || null,
  };
}

async function readFocus(svc, studentId) {
  const { data, error } = await svc.from('learner_focus')
    .select('kc_id,set_by,set_at').eq('user_id', studentId).maybeSingle();
  if (error) throw new Error(`focus read failed: ${error.message}`);
  if (!data) return null;
  // The title comes from the learner's own vocabulary for the concept, so it
  // is read where the link is, not stored twice.
  const owned = await ownedKc(svc, studentId, data.kc_id);
  return shapeFocus({ ...data, title: owned?.title || null });
}

/**
 * Upsert or clear the focus. One row per learner by primary key, so this
 * touches the focus and nothing else — there is no read-modify-write to lose a
 * race on, and no blob whose other keys a failed read could wipe.
 */
async function writeFocus(svc, studentId, focus) {
  if (!focus) {
    const { error } = await svc.from('learner_focus').delete().eq('user_id', studentId);
    if (error) throw new Error(`focus clear failed: ${error.message}`);
    return;
  }
  const { error } = await svc.from('learner_focus').upsert({
    user_id: studentId,
    kc_id: focus.kcId,
    set_by: focus.setBy === 'parent' ? 'parent' : 'learner',
    set_at: focus.setAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(`focus write failed: ${error.message}`);
}

/**
 * A learner can only be pointed at a concept that is already on their trellis.
 *
 * Same `learner_kc` ownership check the tutor observation paths make before
 * they will record anything against a KC: without it a parent could aim a child
 * at any node in the shared lattice, and the session loop would look for items
 * on a concept the learner has no estimate, no history and no reason for.
 * Returns { kcId, title } or null.
 */
async function ownedKc(svc, studentId, kcId) {
  const { data: owns } = await svc.from('learner_kc')
    .select('kc_id,local_title').eq('user_id', studentId).eq('kc_id', kcId).maybeSingle();
  if (!owns) return null;
  const { data: meta } = await svc.from('kc').select('title').eq('id', kcId).maybeSingle();
  // The learner's own vocabulary wins over the canonical title, as everywhere.
  return { kcId: owns.kc_id, title: owns.local_title || meta?.title || 'Concept' };
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ demo: true, action: 'unavailable' });
  const svc = serviceClient();
  if (!svc) return Response.json(NOT_PROVISIONED);

  const limited = await rateLimitResponse(caller, req, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  let sessionId = url.searchParams.get('sessionId');
  const requestedFocus = String(url.searchParams.get('focusKcId') || '').trim();

  try {
    // A focus arriving on the way in is the learner choosing their own next
    // concept. It is STORED rather than applied to this one request, so the
    // choice survives a reload and lands in the same place a parent's
    // assignment does — one focus per learner, whoever set it.
    let focus = await readFocus(svc, caller.user.id);
    if (requestedFocus && requestedFocus !== focus?.kcId) {
      const owned = await ownedKc(svc, caller.user.id, requestedFocus);
      if (!owned) {
        return Response.json(
          { error: 'That concept is not on your trellis yet.', reason: 'focus_not_owned' },
          { status: 400 },
        );
      }
      focus = { ...owned, setBy: 'learner', setAt: new Date().toISOString() };
      await writeFocus(svc, caller.user.id, focus);
    }

    if (!sessionId) {
      const started = await startSession(svc, caller.user.id);
      sessionId = started.sessionId;
    }
    const activity = await nextActivity(svc, caller.user.id, sessionId, { focusKcId: focus?.kcId || null });
    return Response.json({ sessionId, focus, ...activity });
  } catch (err) {
    if (isMissingSchema(err)) return Response.json(NOT_PROVISIONED);
    console.error('[engine/session GET]', err?.message);
    return Response.json({ error: 'Could not start your session.' }, { status: 500 });
  }
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json(NOT_PROVISIONED);

  const limited = await rateLimitResponse(caller, req, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const action = String(body?.action || '');
  const uid = caller.user.id;

  try {
    switch (action) {
      case 'answer': {
        const r = await submitAnswer(svc, uid, {
          attemptId: String(body?.attemptId || ''),
          response: body?.response || {},
          sessionId: body?.sessionId || null,
        });
        if (r.error) return Response.json({ error: r.error }, { status: r.status || 400 });
        return Response.json(r);
      }
      case 'hint': {
        const r = await requestHint(svc, uid, { attemptId: String(body?.attemptId || '') });
        if (r.error) {
          // "Try it first" is a teaching move, not an error condition.
          const msg = r.error === 'attempt_required'
            ? 'Give it a go first — even a wrong attempt makes the hint land better.'
            : 'No more hints on this one.';
          return Response.json({ error: msg, reason: r.reason }, { status: r.status || 409 });
        }
        return Response.json(r);
      }
      case 'explain': {
        const r = await submitSelfExplain(svc, uid, {
          contentId: String(body?.contentId || ''),
          choice: body?.choice,
        });
        if (r.error) return Response.json({ error: r.error }, { status: r.status || 400 });
        return Response.json(r);
      }
      case 'end': {
        const r = await endSession(svc, uid, String(body?.sessionId || ''), String(body?.reason || 'learner'));
        return Response.json({ ok: true, summary: r });
      }
      case 'report': {
        // Content trust is a top-five risk; a one-tap report needs somewhere to land.
        await svc.from('content_report').insert({
          user_id: uid,
          content_id: body?.contentId || null,
          item_id: body?.itemId || null,
          note: String(body?.note || '').slice(0, 500) || null,
        });
        if (body?.contentId) {
          await svc.rpc('increment_content_error', { p_content: body.contentId }).then(() => {}, () => {});
        }
        return Response.json({ ok: true, message: 'Thanks — we’ll check that.' });
      }
      case 'focus': {
        // The only action that may be taken FOR someone else, and the reason is
        // the whole homeschool case: a parent assigns, the learner demonstrates.
        // resolveBookingStudent is the same relationship resolver the booking
        // routes use, so "who is this student" has one definition — but this
        // action takes the NARROWER of the two relationships it can return.
        //
        // 'managed' is a child the parent created and is the guardian of.
        // 'invite' is a link created by whoever knew a student's email and
        // accepted by whoever controls that account — lib/server/family.js
        // explains at length why that is not proof of guardianship. Assigning
        // someone else's lesson is not something an invite should buy, and the
        // homeschool case this exists for is a managing parent.
        const target = await resolveBookingStudent(svc, caller, body?.studentId);
        if (target.error) return target.error;
        if (target.onBehalf && target.relationship !== 'managed') {
          return Response.json({
            error: 'Only a parent who manages this account can set what they work on.',
            reason: 'focus_requires_managed',
          }, { status: 403 });
        }

        const kcId = String(body?.kcId || '').trim();
        if (!kcId) {
          // An empty kcId clears the assignment and hands the choice back to
          // the engine's own shallowest-first pick.
          await writeFocus(svc, target.studentId, null);
          await auditLog(uid, 'engine.focus_cleared', target.studentId, { onBehalf: target.onBehalf });
          return Response.json({ ok: true, focus: null, certifies: false });
        }

        const owned = await ownedKc(svc, target.studentId, kcId);
        if (!owned) {
          return Response.json(
            { error: 'That concept is not on this learner’s trellis yet.', reason: 'focus_not_owned' },
            { status: 400 },
          );
        }

        const focus = {
          ...owned,
          setBy: target.onBehalf ? 'parent' : 'learner',
          setAt: new Date().toISOString(),
        };
        await writeFocus(svc, target.studentId, focus);
        await auditLog(uid, 'engine.focus_set', target.studentId, {
          kcId: owned.kcId, relationship: target.relationship,
        });

        // No appendEvidence, no recomputeEstimates, deliberately. `certifies`
        // is returned so a client cannot render this as progress by accident:
        // an assignment moves nothing on the mastery record.
        return Response.json({ ok: true, focus, certifies: false });
      }
      default:
        return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (err) {
    if (isMissingSchema(err)) return Response.json(NOT_PROVISIONED);
    console.error('[engine/session POST]', action, err?.message);
    return Response.json({ error: 'That didn’t save — try again.' }, { status: 500 });
  }
}
