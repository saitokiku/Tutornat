// GET /api/account/export — the caller's complete server-side data, as one
// JSON download (CCPA/GDPR-style access + portability). Everything keyed to
// the user across every table; secrets/tokens are stripped from the profile.
//
// The file carries TWO formats, and the second is the point of the product.
// `kaizen-account-export/v1` is the raw dump: every row we hold, so nothing is
// locked in. `kaizen-mastery-record/v1` is the transcript — per concept, what
// the learner demonstrated, when, verified by what, and which published
// standard it aligns to — shaped so a co-op, a next teacher or an admissions
// officer can read it without knowing this schema exists. Both are emitted;
// the raw dump is never trimmed to make room for the transcript, because a
// portability export that drops fields is a regression.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { isMissingSchema } from '@/lib/engine/ledger';
import {
  isConfirming, CONFIRM_THRESHOLD, CONFIRMING_KINDS, CONFIRMING_VERIFIERS, MIN_DELAY_MS, PASS_OUTCOME,
} from '@/lib/engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const MASTERY_RECORD_FORMAT = 'kaizen-mastery-record/v1';

// What a demonstration WAS, in words a reader who has never seen this schema
// can act on. Only the confirming kinds can appear, so only they are listed.
const DEMONSTRATION_LABEL = {
  check: 'unassisted delayed check',
  tutor_observation: 'watched working unaided by a tutor',
};

// How correctness was established. Same rule: only confirming verifiers.
const VERIFICATION_LABEL = {
  symbolic: 'answer checked symbolically',
  structural: 'answer checked against the item’s structure',
  human_tutor: 'a trained human watched them work',
};

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Demo mode stores nothing on a server.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 3, windowMs: 3600_000 });
  if (limited) return limited;

  const uid = caller.user.id;
  const grab = async (table, col = 'user_id') =>
    (await svc.from(table).select('*').eq(col, uid)).data || [];

  const [
    profileQ, courses, homework, mastery, masteryEvents, chats, voice,
    documents, practice, weeklyReports, handoffs, subs, usage,
    application, tutorQ, sessionsStudent, reviews, parentsOf, childrenOf,
  ] = await Promise.all([
    svc.from('profiles').select('*').eq('id', uid).maybeSingle(),
    grab('courses'), grab('homework_items'), grab('student_concept_mastery'),
    grab('mastery_events'), grab('tutor_sessions'), grab('voice_sessions'),
    grab('documents'), grab('practice_sets'), grab('weekly_reports'),
    grab('human_handoff_requests'), grab('subscriptions'), grab('usage_ledger'),
    grab('tutor_applications'), svc.from('tutors').select('*').eq('user_id', uid).maybeSingle(),
    grab('tutoring_sessions', 'student_id'), grab('tutor_reviews', 'student_id'),
    grab('parent_student_relationships', 'student_id'), grab('parent_student_relationships', 'parent_id'),
  ]);

  // Tutor-side sessions + earnings, if the caller is a tutor.
  let tutorSessions = [], earnings = [];
  if (tutorQ.data?.id) {
    tutorSessions = (await svc.from('tutoring_sessions').select('*').eq('tutor_id', tutorQ.data.id)).data || [];
    earnings = (await svc.from('tutor_earnings').select('*').eq('tutor_id', tutorQ.data.id)).data || [];
  }

  // Never export security tokens.
  const profile = profileQ.data ? { ...profileQ.data } : null;
  if (profile) { delete profile.unsubscribe_token; delete profile.guardian_consent_token; }

  const payload = {
    exportedAt: new Date().toISOString(),
    format: 'kaizen-account-export/v1',
    masteryRecord: await masteryRecord(svc, uid),
    profile,
    courses, assignments: homework, conceptMastery: mastery, masteryEvents,
    tutorChats: chats, voiceSessions: voice, documents, practiceSets: practice,
    weeklyReports, humanTutorRequests: handoffs, subscription: subs,
    usageLedger: usage, tutorApplication: application,
    tutorProfile: tutorQ.data || null, tutoringSessionsAsStudent: sessionsStudent,
    tutoringSessionsAsTutor: tutorSessions, earnings, reviewsWritten: reviews,
    familyLinks: { asStudent: parentsOf, asParent: childrenOf },
  };

  await auditLog(uid, 'account.exported', uid, {});
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kaizen-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}


/**
 * Fetch the ledger side of the account and shape it as a transcript.
 *
 * The engine's tables arrive in migrations 0012/0013/0034. On a deployment
 * where they are not applied the export must still succeed and say so plainly,
 * the same discipline every other integration follows — a portability request
 * is a legal duty and cannot 500 because a migration is pending.
 */
async function masteryRecord(svc, uid) {
  const [linksQ, estQ, evQ] = await Promise.all([
    svc.from('learner_kc').select('kc_id,local_title,course_id,source').eq('user_id', uid),
    // `working` is deliberately NOT selected. Working mastery is real and is
    // shown to the learner inside the product, but it is "I could do it with
    // help" — it is not a claim anyone outside should be handed, and the surest
    // way to stop it leaving is to never load it here.
    svc.from('kc_estimate')
      .select('kc_id,confirmed,confidence,contexts_seen,last_instruction_at,next_check_at,computed_at,scheduler_version')
      .eq('user_id', uid),
    readAllEvidence(svc, uid),
  ]);

  const failure = [linksQ, estQ, evQ].map((q) => q.error).find(Boolean);
  if (failure) {
    if (isMissingSchema(failure)) return buildMasteryRecord({ notProvisioned: true });
    console.error('[account/export mastery]', failure.message);
    return buildMasteryRecord({ unavailable: true });
  }

  const links = linksQ.data || [];
  const estimates = estQ.data || [];
  const evidence = evQ.data || [];
  const kcIds = [...new Set([...links.map((l) => l.kc_id), ...estimates.map((e) => e.kc_id)])];

  let kcs = [];
  let standards = [];
  if (kcIds.length) {
    const [kcQ, stdQ] = await Promise.all([
      svc.from('kc').select('id,title,subject,type,verifiability').in('id', kcIds),
      // The standards crosswalk (0034). Absent on a deployment that has the
      // engine but not the trellis migration; an empty list is the honest
      // answer there, never a fabricated alignment.
      svc.from('kc_standard').select('kc_id,framework,code,case_uri,alignment').in('kc_id', kcIds),
    ]);
    kcs = kcQ.data || [];
    standards = stdQ.data || [];
  }

  return buildMasteryRecord({ links, estimates, evidence, kcs, standards, truncated: evQ.truncated === true });
}

/**
 * PURE. Rows in, transcript out — so the shape is unit-testable without a
 * database, which matters because this is the one artifact the product asks
 * someone outside it to trust.
 *
 * THE MASTERY LAW DECIDES WHAT IS IN HERE (docs/ENGINE.md, hard rule 5):
 *   - `concepts` lists a concept only when its kc_estimate is CONFIRMED. A
 *     concept in progress is counted, never named as an achievement.
 *   - `demonstrations` under a concept are the CONFIRMING evidence rows the
 *     learner PASSED — unassisted, machine- or human-verified, at or above the
 *     pass bar. `isConfirming` classifies the KIND of evidence and says nothing
 *     about the outcome, so a failed check is a confirming row with outcome 0;
 *     printing it under a heading a college reads as an achievement would be a
 *     lie of layout. Assisted work and failed attempts both stay in
 *     `observations`, which is the raw ledger and says so.
 *   - `observations` is the raw ledger, labelled as such. It exists for
 *     portability, not for reading as a claim.
 */
// The ledger, all of it. A single .limit() would drop the NEWEST rows (the
// order is ascending, because the transcript reads forward), and this file
// promises portability — a data export that silently truncates is the failure
// mode the promise exists to prevent. Paged rather than capped, with a ceiling
// far above any real learner so a runaway can still not hang the request; if
// the ceiling is ever reached the caller says so in the file rather than
// letting the reader assume completeness.
export const EVIDENCE_PAGE = 1000;
export const EVIDENCE_MAX = 50000;

async function readAllEvidence(svc, uid) {
  const rows = [];
  for (let from = 0; from < EVIDENCE_MAX; from += EVIDENCE_PAGE) {
    const { data, error } = await svc.from('evidence').select('*').eq('user_id', uid)
      .order('at', { ascending: true }).order('id', { ascending: true })
      .range(from, from + EVIDENCE_PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < EVIDENCE_PAGE) return { data: rows, error: null, truncated: false };
  }
  return { data: rows, error: null, truncated: true };
}

export function buildMasteryRecord({
  links = [], estimates = [], evidence = [], kcs = [], standards = [],
  notProvisioned = false, unavailable = false, truncated = false, now = Date.now(),
} = {}) {
  const canonicalOf = Object.fromEntries(kcs.map((k) => [k.id, k]));
  const linkOf = Object.fromEntries(links.map((l) => [l.kc_id, l]));

  const standardsOf = {};
  for (const s of standards) {
    (standardsOf[s.kc_id] ||= []).push({
      framework: s.framework,
      code: s.code,
      // The CASE identifier for the standard itself, when the framework
      // publishes one — an external reader can resolve it without trusting our
      // label for it.
      caseUri: s.case_uri || null,
      alignment: s.alignment || 'exact',
    });
  }

  const confirmingOf = {};
  for (const e of evidence) {
    if (!isConfirming(e)) continue;
    // The pass bar. The k-of-n gate that moves kc_estimate already applies it;
    // the transcript has to apply it too, or it prints the failures alongside
    // the successes and calls the total "demonstrations".
    if (!(Number(e.outcome) >= PASS_OUTCOME)) continue;
    (confirmingOf[e.kc_id] ||= []).push(e);
  }

  const confirmed = estimates.filter((e) => Number(e.confirmed) >= CONFIRM_THRESHOLD);

  const concepts = confirmed.map((e) => {
    const canonical = canonicalOf[e.kc_id] || {};
    const link = linkOf[e.kc_id] || {};
    const demos = (confirmingOf[e.kc_id] || [])
      .slice()
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return {
      kcId: e.kc_id,
      // The learner's own vocabulary leads, the library's canonical name
      // follows — an outside reader needs the second to match it to anything.
      title: link.local_title || canonical.title || 'Concept',
      canonicalTitle: canonical.title || null,
      subject: canonical.subject || null,
      type: canonical.type || null,
      courseId: link.course_id || null,
      status: 'confirmed',
      confirmed: Number(e.confirmed),
      confidence: Number(e.confidence) || 0,
      contextsSeen: Array.isArray(e.contexts_seen) ? e.contexts_seen : [],
      firstDemonstratedAt: demos[0]?.at || null,
      lastDemonstratedAt: demos[demos.length - 1]?.at || null,
      standards: standardsOf[e.kc_id] || [],
      demonstrations: demos.map((d) => ({
        at: d.at,
        what: DEMONSTRATION_LABEL[d.kind] || d.kind,
        kind: d.kind,
        outcome: d.outcome == null ? null : Number(d.outcome),
        unassisted: d.assisted === false,
        verifiedBy: d.verified_by,
        verification: VERIFICATION_LABEL[d.verified_by] || d.verified_by,
        contextTag: d.context_tag || null,
        sourceRef: d.source_ref || null,
        evidenceId: d.id,
      })),
    };
  }).sort((a, b) => String(b.lastDemonstratedAt || '').localeCompare(String(a.lastDemonstratedAt || '')));

  const tracked = new Set([...links.map((l) => l.kc_id), ...estimates.map((e) => e.kc_id)]).size;

  return {
    format: MASTERY_RECORD_FORMAT,
    generatedAt: new Date(now).toISOString(),
    ...(notProvisioned ? { notProvisioned: true } : {}),
    ...(unavailable ? { unavailable: true } : {}),
    // Printed inside the file so the record carries its own standard of proof.
    // A transcript that does not say what it counted is a number, not a record.
    standardOfProof: {
      // Stated as narrowly as the code actually enforces. `isConfirming`
      // enforces the kind of evidence, that it was unassisted, and how it was
      // verified — it does not itself enforce a delay. The delay is enforced
      // upstream, where a check is SCHEDULED (check_floor_at, at least
      // minInstructionToCheckDelayMs after instruction), which is a different
      // guarantee and a weaker one for a row written during a session. Saying
      // more than this in the one artifact we ask an outsider to trust would
      // be the easiest possible thing to catch us on.
      rule: 'A concept is listed as confirmed only on unassisted evidence the learner passed, verified by symbolic or structural checking or by a trained person watching them work. Retention checks are scheduled at least the delay below after instruction. Work done with help is kept, but never counted as mastery.',
      confirmThreshold: CONFIRM_THRESHOLD,
      confirmingKinds: CONFIRMING_KINDS,
      confirmingVerifiers: CONFIRMING_VERIFIERS,
      minInstructionToCheckDelayMs: MIN_DELAY_MS,
    },
    summary: {
      conceptsTracked: tracked,
      conceptsConfirmed: concepts.length,
      conceptsInProgress: Math.max(0, tracked - concepts.length),
      demonstrations: concepts.reduce((n, c) => n + c.demonstrations.length, 0),
      passBar: PASS_OUTCOME,
    },
    concepts,
    observations: {
      note: truncated
        ? `The first ${EVIDENCE_MAX} observations on record, assisted work included — this learner has more, and the rest are not in this file. Ask us for the remainder. These are the raw rows the concepts above were derived from — evidence, not claims. Rows are append-only; a correction is a new row pointing at the one it adjusts.`
        : 'Every observation on record, assisted work included. These are the raw rows the concepts above were derived from — evidence, not claims. Rows are append-only; a correction is a new row pointing at the one it adjusts.',
      truncated,
      rows: evidence,
    },
  };
}
