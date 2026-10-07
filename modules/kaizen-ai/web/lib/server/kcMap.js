// Topic string → canonical knowledge component. SERVER ONLY.
//
// This is the bridge out of the current design, where a raw LLM-generated topic
// name IS the primary key — simultaneously the localStorage key, the
// student_concept_mastery upsert key, the chatMemory key, the tutor_sessions
// unique key and the course-membership join. Renaming forks all of them, and the
// case-insensitive dedupe at intake versus the case-sensitive join at display
// already orphans concepts today ("Mitosis" arriving when "mitosis" exists).
//
// Resolution order, cheapest first:
//   1. exact normalized alias hit          — free, and the common case
//   2. LLM adjudication against candidates — one call per NOVEL topic, ever
//   3. create a local KC                   — nothing matched; still gets an id
//
// Step 2's result is cached in kc_alias forever, so the Nth student taking AP
// Biology costs nothing to map. That is what makes item banks shareable, and
// shareable banks are what make the marginal cost of the Nth learner approach
// zero.

import Anthropic from '@anthropic-ai/sdk';
import { pickModel, estimateCost } from '@/lib/server/models';
import { normalizeTopic, slugify } from '@/lib/engine/types';

const anthropic = new Anthropic({ timeout: 55_000, maxRetries: 1 });

const MAP_SYSTEM = `You match a student's syllabus topic to a canonical knowledge component.

You are given a subject, the student's topic label, and a numbered list of candidate canonical components. Decide whether the student's topic means the SAME THING as one of the candidates.

Respond with ONLY a JSON object, no prose and no code fences:
{"match": <candidate number> or null, "confidence": <0-1>, "reason": "<short>"}

Rules:
- Match only on genuine equivalence of the underlying skill or idea, not on shared words. "Cell division" and "Cell theory" share a word and are different components.
- A candidate that is BROADER or NARROWER than the student's topic is not a match. "Photosynthesis" does not match "Light-dependent reactions".
- When unsure, return null. A wrong match sends the student the wrong practice questions, which is worse than authoring a new component.
- confidence below 0.75 will be treated as no match.`;

const MIN_CONFIDENCE = 0.75;

/**
 * Resolve one topic to a KC id, creating a local KC when nothing matches.
 * Returns { kcId, matched, confidence, created }.
 */
export async function resolveTopic(svc, { topic, subject, userId, courseId = null, allowLlm = true }) {
  const raw = String(topic || '').trim();
  if (!raw) return null;
  const norm = normalizeTopic(raw);
  const subj = String(subject || 'general').trim().toLowerCase();

  // 1. Alias cache. Subject-scoped, so "derivatives" in Calculus and in Finance
  //    never collide.
  const { data: hit } = await svc.from('kc_alias')
    .select('kc_id,confidence').eq('alias_norm', norm).eq('subject', subj).maybeSingle();
  if (hit?.kc_id) {
    await linkLearner(svc, { userId, kcId: hit.kc_id, courseId, localTitle: raw, source: 'mapped' });
    return { kcId: hit.kc_id, matched: true, confidence: Number(hit.confidence) || 1, created: false, cached: true };
  }

  // 2. Candidates from the same subject. Cheap prefilter on shared content words
  //    so the model sees a short, plausible list rather than the whole library.
  const { data: candidates } = await svc.from('kc')
    .select('id,title,slug').eq('subject', subj).eq('status', 'verified').limit(200);

  const shortlist = shortlistByOverlap(raw, candidates || [], 12);

  if (allowLlm && shortlist.length && process.env.ANTHROPIC_API_KEY) {
    try {
      const decision = await adjudicate(raw, subj, shortlist);
      if (decision?.match != null && decision.confidence >= MIN_CONFIDENCE) {
        const chosen = shortlist[decision.match - 1];
        if (chosen) {
          // Cache the decision so this topic string is never adjudicated again.
          await svc.from('kc_alias').upsert({
            kc_id: chosen.id, alias_norm: norm, alias_text: raw,
            subject: subj, confidence: decision.confidence, source: 'llm',
          }, { onConflict: 'alias_norm,subject' }).then(() => {}, () => {});
          await linkLearner(svc, { userId, kcId: chosen.id, courseId, localTitle: raw, source: 'mapped' });
          return { kcId: chosen.id, matched: true, confidence: decision.confidence, created: false };
        }
      }
    } catch (err) {
      // Mapping failure must never block intake — fall through and author local.
      console.error('[kcMap] adjudication failed', err?.message);
    }
  }

  // 3. Nothing matched. Author a local KC so the learner still gets a stable id.
  //    It can be promoted to canonical later once it recurs across students.
  const created = await createLocalKc(svc, { title: raw, subject: subj });
  if (!created) return null;
  await svc.from('kc_alias').upsert({
    kc_id: created.id, alias_norm: norm, alias_text: raw,
    subject: subj, confidence: 1, source: 'seed',
  }, { onConflict: 'alias_norm,subject' }).then(() => {}, () => {});
  await linkLearner(svc, { userId, kcId: created.id, courseId, localTitle: raw, source: 'local' });
  return { kcId: created.id, matched: false, confidence: 1, created: true };
}

/** Resolve many topics. Sequential by design — alias writes make later lookups hit. */
export async function resolveTopics(svc, { topics, subject, userId, courseId = null, allowLlm = true }) {
  const out = [];
  const seen = new Set();
  for (const t of Array.isArray(topics) ? topics.slice(0, 40) : []) {
    const norm = normalizeTopic(t);
    if (!norm || seen.has(norm)) continue;   // the dedupe that intake does by name, done by identity
    seen.add(norm);
    const r = await resolveTopic(svc, { topic: t, subject, userId, courseId, allowLlm });
    if (r) out.push({ ...r, topic: String(t).trim() });
  }
  return out;
}

// Content-word overlap. Deliberately crude: it only has to produce a plausible
// shortlist for the model, not decide anything.
function shortlistByOverlap(topic, candidates, n) {
  const words = new Set(normalizeTopic(topic).split(' ').filter((w) => w.length > 2));
  return candidates
    .map((c) => {
      const cw = new Set(normalizeTopic(c.title).split(' ').filter((w) => w.length > 2));
      let overlap = 0;
      for (const w of words) if (cw.has(w)) overlap++;
      return { c, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, n)
    .filter((x) => x.overlap > 0)
    .map((x) => x.c);
}

async function adjudicate(topic, subject, shortlist) {
  const settings = {};
  const model = pickModel('fast', settings, 'internal');
  const list = shortlist.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
  const msg = await anthropic.messages.create({
    model, max_tokens: 200, system: MAP_SYSTEM,
    messages: [{
      role: 'user',
      content: `Subject: ${subject}\nStudent's topic: "${topic}"\n\nCandidates:\n${list}`,
    }],
  });
  const out = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const match = out.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : out);
  return {
    match: Number.isInteger(parsed?.match) ? parsed.match : null,
    confidence: Number(parsed?.confidence) || 0,
    reason: String(parsed?.reason || '').slice(0, 200),
    cost: estimateCost(model, MAP_SYSTEM + list, out),
  };
}

async function createLocalKc(svc, { title, subject }) {
  const base = slugify(title);
  // Slugs are globally unique; suffix on collision rather than failing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? `${subject}-${base}` : `${subject}-${base}-${attempt}`;
    const { data, error } = await svc.from('kc').insert({
      slug: slug.slice(0, 120),
      subject,
      title: String(title).slice(0, 200),
      type: 'skill',
      verifiability: 'v2',
      status: 'draft',   // draft: usable for tracking, no verified items yet
    }).select('id,slug').maybeSingle();
    if (data) return data;
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error('[kcMap] kc insert failed', error.message);
      return null;
    }
    // Slug collision — another student just created the same local KC. Reuse it.
    const { data: existing } = await svc.from('kc').select('id,slug').eq('slug', slug.slice(0, 120)).maybeSingle();
    if (existing) return existing;
  }
  return null;
}

async function linkLearner(svc, { userId, kcId, courseId, localTitle, source }) {
  if (!userId || !kcId) return;
  await svc.from('learner_kc').upsert({
    user_id: userId, kc_id: kcId, course_id: courseId || null,
    local_title: localTitle || null, source,
  }, { onConflict: 'user_id,kc_id' }).then(() => {}, () => {});
}

/** The learner's KC id for a topic string, without creating anything. */
/** @param {any} svc @param {{userId: string, topic: string, subject?: string}} q */
export async function lookupKcId(svc, { userId, topic, subject }) {
  const norm = normalizeTopic(topic);
  if (!norm) return null;
  // A caller that does not know the subject (e.g. /api/practice, which only has
  // the concept name) must NOT be defaulted to subject='general' — that keys the
  // indexed lookup to a subject the alias was almost certainly not written under,
  // so it always misses and silently falls through to the scan below. Match on
  // the alias alone instead, and only narrow by subject when we actually have one.
  const subj = subject ? String(subject).trim().toLowerCase() : null;
  let q = svc.from('kc_alias').select('kc_id').eq('alias_norm', norm);
  if (subj) q = q.eq('subject', subj);
  const { data } = await q.limit(1).maybeSingle();
  if (data?.kc_id) return data.kc_id;

  // Fall back to the learner's own labels — covers topics mapped under a
  // different subject string than the caller is using. Bounded, but high enough
  // that a real learner cannot outgrow it: at 200 this silently stopped
  // recording evidence for anyone with a large course load.
  const { data: link } = await svc.from('learner_kc')
    .select('kc_id,local_title').eq('user_id', userId).limit(2000);
  const match = (link || []).find((l) => normalizeTopic(l.local_title) === norm);
  return match?.kc_id || null;
}
