// GET /api/engine/state — the learner's two-tier mastery map + what to do next.
//
// WORKING mastery moves on any evidence, including assisted chat.
// CONFIRMED mastery moves only on unassisted, verified, delayed evidence.
//
// Both are returned and the UI shows both, because the distinction is itself
// worth teaching: "I could do it with help" and "I can do it" are different
// claims, and the product spent its whole life so far conflating them.
//
// Anything that LEAVES the product — parent summaries, weekly reports, the tutor
// brief — must use `confirmed` only.

import { getCaller, serviceClient } from '@/lib/server/context';
import { readState, isMissingSchema } from '@/lib/engine/ledger';
import { nextAction, reachableSet, GROWTH_TIP_LIMIT } from '@/lib/engine/policy';
import { CONFIRM_THRESHOLD } from '@/lib/engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) {
    return Response.json({ demo: true, kcs: [], next: { action: 'all_confirmed' }, growthTip: [], summary: emptySummary() });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ kcs: [], next: { action: 'all_confirmed' }, growthTip: [], summary: emptySummary() });

  const courseId = new URL(req.url).searchParams.get('courseId');
  const now = Date.now();

  try {
    const [estimates, linkQ] = await Promise.all([
      readState(svc, caller.user.id),
      (courseId
        ? svc.from('learner_kc').select('kc_id,local_title,course_id,mapping_confirmed').eq('user_id', caller.user.id).eq('course_id', courseId)
        : svc.from('learner_kc').select('kc_id,local_title,course_id,mapping_confirmed').eq('user_id', caller.user.id)),
    ]);

    const links = linkQ.data || [];
    const kcIds = links.map((l) => l.kc_id);
    if (!kcIds.length) {
      return Response.json({ kcs: [], next: { action: 'all_confirmed', reason: 'no_kcs' }, growthTip: [], summary: emptySummary() });
    }

    const [{ data: kcs }, { data: edges }] = await Promise.all([
      svc.from('kc').select('id,title,type,verifiability').in('id', kcIds),
      svc.from('kc_edge').select('from_kc,to_kc,kind').in('to_kc', kcIds),
    ]);

    const estOf = Object.fromEntries(estimates.map((e) => [e.kc_id, e]));
    const metaOf = Object.fromEntries((kcs || []).map((k) => [k.id, k]));
    const prereqsOf = {};
    const confusablesOf = {};
    for (const e of edges || []) {
      if (e.kind === 'prerequisite') (prereqsOf[e.to_kc] ||= []).push(e.from_kc);
      else (confusablesOf[e.to_kc] ||= []).push(e.from_kc);
    }

    const shaped = links.map((l) => {
      const est = estOf[l.kc_id] || {};
      const meta = metaOf[l.kc_id] || {};
      return {
        kcId: l.kc_id,
        // The learner's own vocabulary wins over the canonical title.
        title: l.local_title || meta.title || 'Concept',
        canonicalTitle: meta.title || null,
        mappingConfirmed: Boolean(l.mapping_confirmed),
        courseId: l.course_id || null,
        type: meta.type || 'skill',
        // v3 KCs are assessed by model judgement and say so, rather than
        // presenting a soft number as if it were a hard one.
        assessedByJudgement: meta.verifiability === 'v3',
        working: Number(est.working) || 0,
        confirmed: Number(est.confirmed) || 0,
        confidence: Number(est.confidence) || 0,
        doseSlope: est.dose_slope ?? null,
        nextCheckAt: est.next_check_at || null,
        nextReviewAt: est.next_review_at || null,
        humanRecommended: Boolean(est.human_recommended),
        prereqs: prereqsOf[l.kc_id] || [],
        confusables: confusablesOf[l.kc_id] || [],
      };
    });

    // A focus is an assignment, not an assessment: the learner picked it, or a
    // parent picked it for them (POST /api/engine/session {action:'focus'}).
    // It steers WHICH reachable concept comes next and nothing else — it moves
    // no estimate and writes no evidence, so a parent still certifies nothing.
    const focus = await readFocus(svc, caller.user.id, Object.fromEntries(shaped.map((k) => [k.kcId, k.title])));
    const next = nextAction({ kcs: shaped, now, focusKcId: focus?.kcId || null });

    return Response.json({
      kcs: shaped,
      next,
      focus,
      growthTip: growthTipOf(shaped),
      summary: summarize(shaped, now),
    });
  } catch (err) {
    // Migrations 0012/0013 not applied yet: the engine simply isn't provisioned
    // on this deployment. Report that honestly rather than as a failure, so the
    // code can ship before the schema does.
    if (isMissingSchema(err)) {
      return Response.json({ notProvisioned: true, kcs: [], next: { action: 'all_confirmed', reason: 'engine_not_provisioned' }, growthTip: [], summary: emptySummary() });
    }
    console.error('[engine/state]', err?.message);
    return Response.json({ error: 'Could not load your progress.' }, { status: 500 });
  }
}

/**
 * The growth tip: the 3-5 shallowest concepts whose prerequisites are all
 * confirmed, with the titles a human reads rather than the UUIDs a database
 * stores. This is the "what can my child learn next" answer that a parent and
 * a Program Director both need, and nothing in the product exposed it before —
 * the reachable set existed only inside the policy loop's own decision.
 *
 * Confirmed mastery is the gate, as everywhere else: a prerequisite the learner
 * can only do with help has not been met.
 */
function growthTipOf(kcs) {
  return reachableSet(kcs, { limit: GROWTH_TIP_LIMIT }).map((k) => ({
    kcId: k.kcId,
    title: k.title,
    working: k.working,
    confirmed: k.confirmed,
    humanRecommended: k.humanRecommended,
  }));
}

/**
 * The learner's current focus, from learner_focus (0037).
 *
 * The WRITER is app/api/engine/session/route.js — change the shape there and
 * here together. It is deliberately NOT read off profiles.app_meta: the
 * client's own sync rewrites that blob wholesale, which used to delete a
 * parent's assignment the moment the child opened the app.
 *
 * A learner whose engine tables are not provisioned has no focus, not an
 * error — this is a read on the way to rendering a page.
 */
async function readFocus(svc, userId, titleOf) {
  const { data, error } = await svc.from('learner_focus')
    .select('kc_id,set_by,set_at').eq('user_id', userId).maybeSingle();
  if (error || !data?.kc_id) return null;
  return {
    kcId: String(data.kc_id),
    title: titleOf?.[data.kc_id] || null,
    setBy: data.set_by === 'parent' ? 'parent' : 'learner',
    setAt: data.set_at || null,
  };
}

function summarize(kcs, now) {
  const confirmed = kcs.filter((k) => k.confirmed >= CONFIRM_THRESHOLD).length;
  const working = kcs.filter((k) => k.confirmed < CONFIRM_THRESHOLD && k.working >= 0.3).length;
  const due = kcs.filter((k) => k.nextCheckAt && new Date(k.nextCheckAt).getTime() <= now).length;
  // Dependency alarm: KCs where help demand isn't falling.
  const dependent = kcs.filter((k) => k.doseSlope != null && k.doseSlope >= 0 && k.working > 0.3).length;
  return {
    total: kcs.length,
    confirmed,
    working,
    checksDue: due,
    dependencyAlarms: dependent,
    // The primary progress metric. Deliberately NOT streak, time-on-app or
    // messages sent — those are on the will-not-do list.
    headline: `${confirmed} of ${kcs.length} confirmed`,
  };
}

function emptySummary() {
  return { total: 0, confirmed: 0, working: 0, checksDue: 0, dependencyAlarms: 0, headline: '0 of 0 confirmed' };
}
