// Cloud sync layer — mirrors local app state to Supabase (RLS-isolated per user).
// Local state stays the fast working copy; the cloud is the durable record.
// All calls no-op silently in demo mode (supabase === null).

import { supabase } from '@/lib/supabaseClient';
import { loadAllChats, replaceAllChats } from '@/lib/chatMemory';

// ── Pull: cloud → local shapes ────────────────────────────────────────────────
// Returns { app, concepts, files } or null when the cloud has no setup yet.
// Explicit column list, not select('*'): migration 0011 revokes SELECT on
// profiles.guardian_consent_token / unsubscribe_token (bearer credentials that
// must never reach a browser), and `*` would fail with "permission denied for
// column" against a hardened database.
// Only what pullState actually consumes — `name` and `app_meta`.
const PROFILE_COLUMNS = 'id,name,app_meta';

export async function pullState(userId) {
  if (!supabase) return null;
  const [profileQ, coursesQ, hwQ, masteryQ, chatsQ, docsQ] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    supabase.from('courses').select('*').eq('user_id', userId),
    supabase.from('homework_items').select('*').eq('user_id', userId),
    supabase.from('student_concept_mastery').select('*').eq('user_id', userId),
    supabase.from('tutor_sessions').select('*').eq('user_id', userId),
    supabase.from('documents').select('*').eq('user_id', userId),
  ]);

  // A failed read must NEVER be mistaken for "this account has no data" — that
  // path replaces local state with an empty one and re-runs onboarding over a
  // populated account. Throw so the caller can keep the local working copy.
  const readErr = [profileQ, coursesQ, hwQ, masteryQ, chatsQ, docsQ].find((q) => q.error);
  if (readErr) throw new Error(`cloud read failed: ${readErr.error.message}`);

  const profile = profileQ.data;
  const courses = coursesQ.data || [];
  const meta = profile?.app_meta || {};
  if (!meta.setupDone && courses.length === 0) return null;

  const app = {
    setupDone: Boolean(meta.setupDone),
    profile: { name: profile?.name || '', goal: meta.goal || '', learningStyle: meta.learningStyle || 'mix' },
    school: meta.school || null,
    courses: courses.map((c) => ({
      id: c.id, code: c.code || '', name: c.title, teacher: c.teacher || '',
      color: c.color || '#B4536F', topics: c.topics || [],
      gradeCategories: c.grade_categories || [], gradeScale: c.grade_scale || null,
      credits: c.credits == null ? 1 : Number(c.credits), targetGrade: c.target_grade || null,
    })),
    assignments: (hwQ.data || []).map((h) => ({
      id: h.id, courseId: h.course_id, title: h.title, type: h.type,
      concept: h.concept, minutes: h.minutes, due: h.due, status: h.status,
      completedAt: h.completed_at, manual: h.manual,
      category: h.category || null,
      pointsEarned: h.points_earned == null ? null : Number(h.points_earned),
      pointsPossible: h.points_possible == null ? null : Number(h.points_possible),
      graded: Boolean(h.graded), gradedAt: h.graded_at || null,
    })),
    streak: meta.streak || { count: 0, lastDate: null },
    activity: meta.activity || [],
    masteryHistory: meta.masteryHistory || [],
    gradeHistory: meta.gradeHistory || [],
  };

  const concepts = (masteryQ.data || []).map((m) => ({
    id: m.id, name: m.name, repetitions: m.repetitions,
    easeFactor: Number(m.ease_factor), interval: m.interval_days,
    dueDate: m.due_date, lastQuality: m.last_quality, history: m.history || [],
  }));

  const chats = {};
  for (const s of chatsQ.data || []) {
    if (s.concept) chats[s.concept] = { messages: s.messages || [], updatedAt: s.updated_at };
  }
  replaceAllChats(chats);

  const files = (docsQ.data || []).map((d) => ({
    id: d.id, name: d.name, size: d.size_bytes, type: d.mime,
    courseId: d.course_id, concept: d.concept, text: d.text_content, addedAt: d.created_at,
    storagePath: d.storage_path || null, sha256: d.sha256 || null, status: d.status || 'ready',
  }));

  return { app, concepts, files };
}

// ── Push: local shapes → cloud (idempotent upserts, never prune) ─────────────
// Every write goes through ok(): a rejected write (RLS denial, constraint
// violation, offline, 0 rows matched) throws instead of vanishing. Callers
// surface it — the UI used to render a hardcoded "synced" through all of this.
function ok({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

export async function pushApp(userId, app) {
  if (!supabase || !app?.setupDone) return;
  // .select('id') so a 0-row match is detectable: getCaller creates the
  // profiles row lazily on the first authenticated API call, and a user who
  // skips setup never makes one — their app_meta would silently go nowhere.
  const updated = ok(await supabase.from('profiles').update({
    name: app.profile?.name || '',
    app_meta: {
      setupDone: app.setupDone, goal: app.profile?.goal || '',
      learningStyle: app.profile?.learningStyle || 'mix',
      school: app.school, streak: app.streak, activity: app.activity,
      masteryHistory: app.masteryHistory, gradeHistory: app.gradeHistory || [],
    },
  }).eq('id', userId).select('id'), 'save profile');
  if (!updated || updated.length === 0) {
    // No profiles row exists for this user yet. getCaller() creates it on the
    // first authenticated API call, but a student who skips setup and adds
    // tasks by hand never makes one — so setupDone/streak/history would go
    // nowhere forever, and a second device would re-run onboarding over live
    // data. Surface it rather than pretending the write landed.
    throw new Error('save profile: no profile row for this account yet');
  }

  const courseRows = (app.courses || []).map((c) => ({
    id: c.id, user_id: userId, title: c.name, code: c.code || null,
    teacher: c.teacher || null, color: c.color, topics: c.topics || [],
    grade_categories: c.gradeCategories || [], grade_scale: c.gradeScale || null,
    credits: Number(c.credits) > 0 ? Number(c.credits) : 1, target_grade: c.targetGrade || null,
  }));
  if (courseRows.length) ok(await supabase.from('courses').upsert(courseRows), 'save courses');

  const hwRows = (app.assignments || []).map((h) => ({
    id: h.id, user_id: userId, course_id: h.courseId || null, title: h.title,
    type: h.type, concept: h.concept || null, minutes: h.minutes || 30,
    due: h.due, status: h.status, completed_at: h.completedAt || null,
    manual: Boolean(h.manual),
    category: h.category || null,
    points_earned: h.pointsEarned == null ? null : Number(h.pointsEarned),
    points_possible: h.pointsPossible == null ? null : Number(h.pointsPossible),
    graded: Boolean(h.graded), graded_at: h.gradedAt || null,
  }));
  // Upsert only — NEVER prune here (audit REL-004). A stale device's debounced
  // push must not delete assignments created on another device. Deletions go
  // through deleteHomeworkItem() at the moment the user deletes.
  if (hwRows.length) ok(await supabase.from('homework_items').upsert(hwRows), 'save assignments');
}

// Explicit single-assignment delete (multi-device safe).
export async function deleteHomeworkItem(userId, id) {
  if (!supabase || !id) return;
  ok(await supabase.from('homework_items').delete().eq('user_id', userId).eq('id', id), 'delete assignment');
}

export async function pushConcepts(userId, concepts) {
  if (!supabase) return;
  const rows = (concepts || []).map((c) => ({
    user_id: userId, name: c.name, repetitions: c.repetitions,
    ease_factor: c.easeFactor, interval_days: c.interval, due_date: c.dueDate,
    last_quality: c.lastQuality,
    confidence: c.lastQuality == null ? 0 : Math.min(1, c.lastQuality / 5),
    history: c.history || [], updated_at: new Date().toISOString(),
  }));
  if (rows.length) ok(await supabase.from('student_concept_mastery').upsert(rows, { onConflict: 'user_id,name' }), 'save mastery');
}

export async function pushChats(userId) {
  if (!supabase) return;
  const all = loadAllChats();
  const rows = Object.entries(all).map(([concept, v]) => ({
    user_id: userId, concept, mode: 'socratic',
    messages: (v.messages || []).slice(-40), updated_at: v.updatedAt || new Date().toISOString(),
  }));
  if (rows.length) ok(await supabase.from('tutor_sessions').upsert(rows, { onConflict: 'user_id,concept,mode' }), 'save conversations');
}

export async function pushFiles(userId, files) {
  if (!supabase) return;
  const rows = (files || []).map((f) => ({
    id: f.id, user_id: userId, course_id: f.courseId || null, concept: f.concept || null,
    name: f.name, size_bytes: f.size || 0, mime: f.type || null,
    text_content: f.text ? String(f.text).slice(0, 15000) : null,
    storage_path: f.storagePath || null, sha256: f.sha256 || null, status: f.status || 'ready',
  }));
  // Upsert only — NEVER prune here. The ingest API inserts documents rows
  // server-side (magic box at scale); a prune keyed to the client's in-memory
  // list would race-delete rows that haven't reached local state yet.
  // Deletions go through deleteDocument() explicitly instead.
  if (rows.length) ok(await supabase.from('documents').upsert(rows), 'save files');
}

// Explicit single-document delete (used when the user removes a file). Also
// clears the Storage object so large uploads don't linger.
export async function deleteDocument(userId, id, storagePath = null) {
  if (!supabase || !id) return;
  ok(await supabase.from('documents').delete().eq('user_id', userId).eq('id', id), 'delete file');
  if (storagePath) supabase.storage.from('documents').remove([storagePath]).catch(() => {});
}

// Debounce helper so effects don't hammer the network
export function debounced(fn, ms = 1500) {
  let t = null, lastArgs = null;
  const wrapped = (...args) => {
    lastArgs = args;
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
  // Fire the pending call NOW (used before navigation/unload so an edit made in
  // the debounce window isn't lost — audit: lost edits on refresh/nav).
  wrapped.flush = () => {
    if (t) { clearTimeout(t); t = null; }
    if (lastArgs) { const a = lastArgs; lastArgs = null; return fn(...a); }
    return undefined;
  };
  wrapped.cancel = () => { if (t) { clearTimeout(t); t = null; } lastArgs = null; };
  return wrapped;
}
