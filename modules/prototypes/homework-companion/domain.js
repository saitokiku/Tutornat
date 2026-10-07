/* domain.js — pure validation and state transitions for the connected frontend demo.
 * No DOM, no timers, no network, no storage. Every function returns a NEW store; inputs are never mutated.
 * Classic-script friendly (window.Domain) and CommonJS (module.exports) for Node built-in tests.
 * Provenance: strict whole-number parsing, task-isolated sessions, append-only assistance history and
 * idempotent scripted replay are re-implemented from the retained ../design/model.js invariants with fresh tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Domain = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LIMITS = Object.freeze({ title: 80, instructions: 280, step: 280, observation: 400, reason: 200, note: 1200, answer: 12 });
  const SUBJECTS = Object.freeze(['math', 'reading', 'writing', 'science', 'social', 'other']);
  const HELP_TYPES = Object.freeze(['hint', 'scaffold', 'voice_demo']);
  const CONTENT_FIELDS = Object.freeze(['title', 'subject', 'instructions']);

  // Fixed fictional demo learners. Switching between them is a demo control, not authentication.
  const LEARNERS = Object.freeze([
    Object.freeze({ id: 'lrn-k2-ari', name: 'Ari', band: 'k2', grade: 1 }),
    Object.freeze({ id: 'lrn-35-bea', name: 'Bea', band: '35', grade: 4 }),
    Object.freeze({ id: 'lrn-68-cal', name: 'Cal', band: '68', grade: 7 }),
  ]);

  class DomainError extends Error {
    constructor(code, message, errors) { super(message || code); this.name = 'DomainError'; this.code = code; this.errors = errors || {}; }
  }
  const fail = (code, message, errors) => { throw new DomainError(code, message, errors); };

  // ---------- helpers ----------
  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const trim = (v) => str(v).trim();
  const isoDate = (v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str(v))) return false;
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  };
  const nextId = (store, prefix) => ({ store: { ...store, seq: store.seq + 1 }, id: `${prefix}-${store.seq + 1}` });
  const at = (opts) => (opts && opts.at) || new Date().toISOString();
  const requireTask = (store, taskId) => store.tasks[taskId] || fail('not_found', `Unknown task ${taskId}`);
  const requireLearner = (store, learnerId) => store.learners[learnerId] || fail('not_found', `Unknown learner ${learnerId}`);
  const freezeDeep = (arr) => Object.freeze(arr.map((x) => Object.freeze(x)));

  function appendEvent(store, ev) {
    const n = nextId(store, 'ev');
    return { ...n.store, events: [...store.events, Object.freeze({ id: n.id, ...ev })] };
  }

  // ---------- store ----------
  function createStore() {
    const learners = {};
    LEARNERS.forEach((l) => { learners[l.id] = l; });
    return { seq: 0, learners, tasks: {}, sessions: {}, observations: {}, proposals: {}, plans: {}, events: [] };
  }

  // ---------- validation ----------
  function validateTaskInput(input, partial) {
    const errors = {};
    const out = {};
    const has = (k) => !partial || Object.prototype.hasOwnProperty.call(input || {}, k);
    if (has('title')) {
      const title = trim(input.title);
      if (!title) errors.title = 'required'; else if (title.length > LIMITS.title) errors.title = 'too_long'; else out.title = title;
    }
    if (has('subject')) {
      const subject = trim(input.subject);
      if (!SUBJECTS.includes(subject)) errors.subject = 'invalid_subject'; else out.subject = subject;
    }
    if (has('due')) {
      const due = trim(input.due);
      if (!due) errors.due = 'required'; else if (!isoDate(due)) errors.due = 'invalid_date'; else out.due = due;
    }
    if (has('instructions')) {
      const instructions = trim(input.instructions);
      if (instructions.length > LIMITS.instructions) errors.instructions = 'too_long'; else out.instructions = instructions;
    }
    return { ok: Object.keys(errors).length === 0, errors, values: out };
  }
  const validateText = (value, field, limit) => {
    const text = trim(value);
    if (!text) fail('validation', `${field} is required`, { [field]: 'required' });
    if (text.length > limit) fail('validation', `${field} is too long`, { [field]: 'too_long' });
    return text;
  };

  // ---------- tasks ----------
  function createTask(store, learnerId, input, opts) {
    requireLearner(store, learnerId);
    const v = validateTaskInput(input, false);
    if (!v.ok) fail('validation', 'Task input is invalid', v.errors);
    const n = nextId(store, 'task');
    const when = at(opts);
    const task = Object.freeze({
      id: n.id, learnerId, ...v.values, status: 'open', origin: (opts && opts.origin) || 'parent', sample: (opts && opts.sample) || null,
      // Per-field display provenance: which text fields still hold GENERATED sample text (key/version). Family-authored text never
      // gets provenance, even when it equals a canonical sample string. Separate from `sample` (instructional capability).
      ...(opts && opts.generated ? { generated: Object.freeze(opts.generated) } : {}),
      createdAt: when, updatedAt: when, version: 1,
    });
    let s = { ...n.store, tasks: { ...n.store.tasks, [task.id]: task } };
    s = appendEvent(s, { at: when, learnerId, taskId: task.id, source: 'task_change', type: 'created', detail: { title: task.title, due: task.due, origin: task.origin } });
    return { store: s, task };
  }

  function editTask(store, taskId, changes, opts) {
    const task = requireTask(store, taskId);
    if (task.status === 'archived') fail('conflict', 'Archived tasks cannot be edited');
    const v = validateTaskInput(changes || {}, true);
    if (!v.ok) fail('validation', 'Task input is invalid', v.errors);
    const when = at(opts);
    // A submitted field that still carries GENERATED provenance is an authored edit even when the typed bytes equal the canonical
    // string (the family deliberately wrote it; the UI submits only fields the family changed from what the form showed).
    const authored = Object.keys(v.values).filter((k) => !!(task.generated && task.generated[k]));
    const changed = Object.keys(v.values).filter((k) => v.values[k] !== task[k] || authored.includes(k));
    // Editing reviewed instructional content (title/subject/instructions) detaches the obsolete scripted answer key and help.
    // A due-date-only edit keeps the still-valid sample capability. Prior assistance/check records are never rewritten.
    const detach = !!task.sample && changed.some((k) => CONTENT_FIELDS.includes(k));
    const detached = detach ? { sample: null, sampleDetached: Object.freeze({ key: task.sample, version: (SAMPLES[task.sample] || {}).version || 1, at: when, changed: Object.freeze(changed.filter((k) => CONTENT_FIELDS.includes(k))) }) } : {};
    // A family-edited field loses its generated provenance; untouched generated fields keep it even after the capability detaches.
    const kept = task.generated ? Object.entries(task.generated).filter(([k]) => !changed.includes(k)) : null;
    const provenance = task.generated ? { generated: kept.length ? Object.freeze(Object.fromEntries(kept.map(([k, v]) => [k, v]))) : null } : {};
    const updated = Object.freeze({ ...task, ...v.values, ...detached, ...provenance, updatedAt: when, version: task.version + 1 });
    let s = { ...store, tasks: { ...store.tasks, [taskId]: updated } };
    s = appendEvent(s, { at: when, learnerId: task.learnerId, taskId, source: 'task_change', type: 'edited', detail: { changed, from: Object.fromEntries(changed.map((k) => [k, task[k]])), to: Object.fromEntries(changed.map((k) => [k, updated[k]])), ...(detach ? { sampleDetached: task.sample } : {}), ...(authored.length ? { authored: Object.freeze(authored) } : {}) } });
    return { store: s, task: updated };
  }

  function setStatus(store, taskId, status, type, opts) {
    const task = requireTask(store, taskId);
    const when = at(opts);
    const updated = Object.freeze({ ...task, status, updatedAt: when, version: task.version + 1 });
    let s = { ...store, tasks: { ...store.tasks, [taskId]: updated } };
    s = appendEvent(s, { at: when, learnerId: task.learnerId, taskId, source: 'task_change', type, detail: { from: task.status, to: status } });
    return { store: s, task: updated };
  }
  function archiveTask(store, taskId, opts) {
    const task = requireTask(store, taskId);
    if (task.status === 'archived') fail('conflict', 'Task is already archived');
    return setStatus(store, taskId, 'archived', 'archived', opts);
  }
  function restoreTask(store, taskId, opts) {
    const task = requireTask(store, taskId);
    if (task.status !== 'archived') fail('conflict', 'Task is not archived');
    const session = getSession(store, taskId);
    return setStatus(store, taskId, session.state === 'complete_self_reported' ? 'done' : 'open', 'restored', opts);
  }

  function listTasks(store, learnerId, filter) {
    const f = filter || {};
    const status = f.status || 'active'; // active = open + done
    return Object.values(store.tasks)
      .filter((t) => t.learnerId === learnerId)
      .filter((t) => status === 'all' ? true : status === 'active' ? t.status !== 'archived' : t.status === status)
      .filter((t) => (f.subject ? t.subject === f.subject : true))
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id < b.id ? -1 : 1));
  }

  // ---------- reviewed synthetic samples (scripted, not AI) ----------
  const SAMPLES = Object.freeze({
    'math-arrays': Object.freeze({
      version: 1, story: null, subject: 'math', title: 'Sticker arrays: 15 rows of 15', instructions: 'Draw or describe 15 rows with 15 stickers in each row. How many stickers in all?',
      answer: 225, answerKind: 'whole_number',
      hints: Object.freeze(['Scripted hint 1: Try splitting 15 rows into 10 rows and 5 rows.', 'Scripted hint 2: 10 rows of 15 is 150. How many are in the other 5 rows?', 'Scripted hint 3: Add the two parts together.']),
      scaffold: Object.freeze(['Scripted scaffold: Step 1 — write what you know (rows, stickers per row).', 'Scripted scaffold: Step 2 — break one number into friendly parts.', 'Scripted scaffold: Step 3 — add the parts and write the total with a label.']),
      voice: 'Scripted voice demo (text only): “Let’s look at the first row together. How many stickers do you see?”',
    }),
    'reading-retell': Object.freeze({
      version: 1, subject: 'reading',
      // The actual short fictional story the prompts refer to (synthetic demo text, not a validated curriculum).
      story: Object.freeze([
        'Mina had a red kite with a long yellow tail. On Saturday she took it to the hill behind her school, and it flew higher than the tallest tree.',
        'Then the wind changed. The string slipped out of Mina’s hands, and the kite sailed away over the roofs. She ran after it, but it was gone.',
        'Mina was sad, but she did not give up. She asked her neighbor Mr. Ortiz, who had seen a flash of red land in his garden. Together they found the kite caught in a tomato plant, tail and all. Mina tied a new knot, and on the next windy day the kite flew again.',
      ]), title: 'Retell: “The Lost Kite” (sample story)', instructions: 'Read the short sample story and retell the beginning, middle and end in your own words.',
      answer: null, answerKind: 'self_check',
      hints: Object.freeze(['Scripted hint 1: Who is the story about? Start with a name.', 'Scripted hint 2: What problem happens in the middle?', 'Scripted hint 3: How is the problem solved at the end?']),
      scaffold: Object.freeze(['Scripted scaffold: First… (beginning)', 'Scripted scaffold: Then… (middle)', 'Scripted scaffold: Finally… (end)']),
      voice: 'Scripted voice demo (text only): “Read the first sentence out loud, then tell me who the story is about.”',
    }),
  });

  function loadSample(store, learnerId, opts) {
    requireLearner(store, learnerId);
    const today = (opts && opts.today) || at(opts).slice(0, 10);
    const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    let s = store; const tasks = [];
    [['math-arrays', 1], ['reading-retell', 3]].forEach(([key, offset]) => {
      const already = Object.values(s.tasks).find((t) => t.learnerId === learnerId && t.sample === key && t.status !== 'archived');
      if (already) return;
      const sm = SAMPLES[key];
      const prov = Object.freeze({ key, version: sm.version });
      const r = createTask(s, learnerId, { title: sm.title, subject: sm.subject, due: addDays(today, offset), instructions: sm.instructions }, { at: at(opts), origin: 'sample', sample: key, generated: { title: prov, instructions: prov } });
      s = r.store; tasks.push(r.task);
    });
    return { store: s, tasks };
  }

  // ---------- sessions (one per task, isolated) ----------
  const EMPTY_SESSION = (taskId, learnerId) => Object.freeze({ taskId, learnerId, state: 'not_started', steps: Object.freeze([]), assistance: Object.freeze([]), checks: Object.freeze([]), mastery: 'not_assessed', startedAt: null, completedAt: null });
  function getSession(store, taskId) {
    const task = store.tasks[taskId];
    return store.sessions[taskId] || EMPTY_SESSION(taskId, task ? task.learnerId : null);
  }
  function putSession(store, session) { return { ...store, sessions: { ...store.sessions, [session.taskId]: Object.freeze(session) } }; }

  function startTask(store, taskId, opts) {
    const task = requireTask(store, taskId);
    if (task.status === 'archived') fail('conflict', 'Archived tasks cannot be started');
    const session = getSession(store, taskId);
    if (session.state !== 'not_started') fail('conflict', 'Task already started');
    const when = at(opts);
    let s = putSession(store, { ...session, learnerId: task.learnerId, state: 'in_progress', startedAt: when });
    s = appendEvent(s, { at: when, learnerId: task.learnerId, taskId, source: 'student_activity', type: 'started', detail: {} });
    return { store: s, session: s.sessions[taskId] };
  }
  const requireActive = (store, taskId) => {
    const task = requireTask(store, taskId);
    if (task.status === 'archived') fail('conflict', 'Archived tasks are read-only until restored');
    const session = getSession(store, taskId);
    if (session.state === 'not_started') fail('conflict', 'Start the task first');
    return session;
  };

  function addStep(store, taskId, text, opts) {
    const session = requireActive(store, taskId);
    const clean = validateText(text, 'text', LIMITS.step);
    const when = at(opts);
    const step = Object.freeze({ index: session.steps.length, at: when, author: 'student', text: clean });
    let s = putSession(store, { ...session, state: session.state === 'stuck' ? 'in_progress' : session.state, steps: Object.freeze([...session.steps, step]) });
    s = appendEvent(s, { at: when, learnerId: session.learnerId, taskId, source: 'student_work', type: 'step', detail: { index: step.index, text: clean } });
    return { store: s, step };
  }

  function scriptedIndex(sample, type, count) {
    if (type === 'voice_demo') return null;
    const list = type === 'scaffold' ? sample.scaffold : sample.hints;
    return Math.min(count, list.length - 1);
  }
  function scriptedTextFor(sample, type, count) {
    if (type === 'voice_demo') return sample.voice;
    const list = type === 'scaffold' ? sample.scaffold : sample.hints;
    return list[scriptedIndex(sample, type, count)];
  }

  function requestHelp(store, taskId, type, opts) {
    const session = requireActive(store, taskId);
    if (!HELP_TYPES.includes(type)) fail('validation', 'Unknown help type', { type: 'invalid' });
    const task = store.tasks[taskId];
    const sample = task.sample ? SAMPLES[task.sample] : null;
    const when = at(opts);
    const n = nextId(store, 'help');
    const requested = Object.freeze({ id: n.id, at: when, kind: 'requested', type, available: !!sample, source: null, text: null });
    let assistance = [...session.assistance, requested];
    let s = putSession(n.store, { ...session, assistance: freezeDeep(assistance) });
    s = appendEvent(s, { at: when, learnerId: session.learnerId, taskId, source: 'help_requested', type, detail: { available: !!sample, requestId: requested.id } });
    if (sample) s = replayScripted(s, taskId, { at: when }).store;
    return { store: s, assistance: getSession(s, taskId).assistance };
  }

  // Deterministic, idempotent: every available request gets exactly one scripted reply, keyed by request id.
  function replayScripted(store, taskId, opts) {
    const task = requireTask(store, taskId);
    const session = getSession(store, taskId);
    const sample = task.sample ? SAMPLES[task.sample] : null;
    if (!sample) return { store, added: 0 };
    let s = store; let assistance = [...session.assistance]; let added = 0;
    const counts = { hint: 0, scaffold: 0, voice_demo: 0 };
    for (const entry of session.assistance) {
      if (entry.kind !== 'requested' || !entry.available) continue;
      const existing = assistance.find((x) => x.kind === 'scripted' && x.forRequest === entry.id);
      if (existing) { counts[entry.type]++; continue; }
      const text = scriptedTextFor(sample, entry.type, counts[entry.type]);
      const index = scriptedIndex(sample, entry.type, counts[entry.type]);
      counts[entry.type]++;
      const n = nextId(s, 'help'); s = n.store;
      assistance.push({ id: n.id, at: at(opts), kind: 'scripted', type: entry.type, available: true, source: 'scripted_sample', text, forRequest: entry.id, sampleKey: task.sample, sampleVersion: sample.version, index });
      s = appendEvent(s, { at: at(opts), learnerId: session.learnerId, taskId, source: 'help_scripted', type: entry.type, detail: { text, forRequest: entry.id, sampleKey: task.sample, sampleVersion: sample.version, index } });
      added++;
    }
    if (!added) return { store, added: 0 };
    s = putSession(s, { ...getSession(s, taskId), assistance: freezeDeep(assistance) });
    return { store: s, added };
  }

  // Strict: only an optional-whitespace-wrapped run of digits is a whole number. "1225" !== 225, "225 stickers" is not a number.
  function parseWholeNumber(raw) {
    const text = trim(raw);
    if (!/^\d{1,9}$/.test(text)) return null;
    return Number(text);
  }

  function checkAnswer(store, taskId, raw, opts) {
    const session = requireActive(store, taskId);
    const task = store.tasks[taskId];
    const sample = task.sample ? SAMPLES[task.sample] : null;
    if (!sample || sample.answerKind !== 'whole_number') return { store, check: Object.freeze({ verdict: 'unsupported', source: null, raw: trim(raw) }) };
    const parsed = parseWholeNumber(raw);
    const verdict = parsed === null ? 'not_a_number' : parsed === sample.answer ? 'match' : 'no_match';
    const when = at(opts);
    const check = Object.freeze({ at: when, raw: trim(raw).slice(0, LIMITS.answer), parsed, verdict, source: 'scripted_sample', sampleKey: task.sample, sampleVersion: sample.version });
    let s = putSession(store, { ...session, checks: Object.freeze([...session.checks, check]) });
    s = appendEvent(s, { at: when, learnerId: session.learnerId, taskId, source: 'check_scripted', type: verdict, detail: { raw: check.raw } });
    return { store: s, check };
  }

  function flagStuck(store, taskId, opts) {
    const session = requireActive(store, taskId);
    if (session.state === 'complete_self_reported') fail('conflict', 'Task is already complete');
    const when = at(opts);
    let s = putSession(store, { ...session, state: 'stuck' });
    s = appendEvent(s, { at: when, learnerId: session.learnerId, taskId, source: 'student_activity', type: 'stuck', detail: {} });
    return { store: s, session: s.sessions[taskId] };
  }

  function markComplete(store, taskId, opts) {
    const session = requireActive(store, taskId);
    if (session.state === 'complete_self_reported') fail('conflict', 'Task is already complete');
    const when = at(opts);
    let s = putSession(store, { ...session, state: 'complete_self_reported', completedAt: when });
    s = appendEvent(s, { at: when, learnerId: session.learnerId, taskId, source: 'student_activity', type: 'complete_self_reported', detail: {} });
    s = setStatus(s, taskId, 'done', 'done', opts).store;
    return { store: s, session: s.sessions[taskId] };
  }

  const countRequestedHelp = (session) => session.assistance.filter((x) => x.kind === 'requested').length;
  const countScriptedHelp = (session) => session.assistance.filter((x) => x.kind === 'scripted').length;

  // ---------- observations ----------
  function addObservation(store, taskId, text, opts) {
    const task = requireTask(store, taskId);
    const clean = validateText(text, 'text', LIMITS.observation);
    const n = nextId(store, 'obs');
    const when = at(opts);
    const observation = Object.freeze({ id: n.id, taskId, learnerId: task.learnerId, author: 'parent', text: clean, at: when });
    let s = { ...n.store, observations: { ...n.store.observations, [observation.id]: observation } };
    s = appendEvent(s, { at: when, learnerId: task.learnerId, taskId, source: 'parent_observation', type: 'observation', detail: { observationId: observation.id, text: clean } });
    return { store: s, observation };
  }
  const listObservations = (store, taskId) => Object.values(store.observations).filter((o) => o.taskId === taskId).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1));

  // ---------- record ----------
  const recordForTask = (store, taskId) => store.events.filter((e) => e.taskId === taskId);
  const recordForLearner = (store, learnerId) => store.events.filter((e) => e.learnerId === learnerId);

  // ---------- schedule & plans ----------
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const todayOf = (opts) => (opts && opts.today) || at(opts).slice(0, 10);

  function schedule(store, learnerId, opts) {
    const groups = new Map();
    listTasks(store, learnerId, { status: 'open' }).forEach((t) => { if (!groups.has(t.due)) groups.set(t.due, []); groups.get(t.due).push(t); });
    return [...groups.entries()].map(([date, tasks]) => ({ date, overdue: date < todayOf(opts), tasks }));
  }

  // Plans live per learner: { current, draft, history }. The draft is a MOCK (deterministic rule, not AI).
  const plansOf = (store, learnerId) => store.plans[learnerId] || { current: null, draft: null, history: [] };
  const putPlans = (store, learnerId, plans) => ({ ...store, plans: { ...store.plans, [learnerId]: plans } });

  function draftPlan(store, learnerId, opts) {
    requireLearner(store, learnerId);
    const today = todayOf(opts);
    const open = listTasks(store, learnerId, { status: 'open' });
    if (!open.length) fail('no_tasks', 'No open tasks to plan');
    // Rule: one work day per task, the day before it is due, never before today; two tasks never share a day when avoidable.
    const used = new Set(); const items = [];
    open.forEach((t) => {
      let day = t.due > today ? addDays(t.due, -1) : today;
      while (used.has(day) && day > today) day = addDays(day, -1);
      used.add(day);
      items.push(Object.freeze({ taskId: t.id, title: t.title, due: t.due, day, taskVersionDue: t.due }));
    });
    const n = nextId(store, 'plan');
    const plan = Object.freeze({ id: n.id, learnerId, status: 'draft', provenance: 'mock_draft', items: Object.freeze(items), createdAt: at(opts), decidedAt: null });
    const prev = plansOf(n.store, learnerId);
    let s = putPlans(n.store, learnerId, { ...prev, draft: plan });
    s = appendEvent(s, { at: at(opts), learnerId, taskId: null, source: 'plan', type: 'drafted', detail: { planId: plan.id, items: items.length } });
    return { store: s, plan };
  }

  // Every dependency is checked, not just the last edited one. A conflict is a moved date or an archived task.
  function planConflicts(store, plan) {
    if (!plan) return [];
    const out = [];
    plan.items.forEach((item) => {
      const t = store.tasks[item.taskId];
      if (!t || t.status === 'archived') out.push({ taskId: item.taskId, title: item.title, reason: 'archived', from: item.due, to: null });
      else if (t.due !== item.due) out.push({ taskId: item.taskId, title: t.title, reason: 'due_changed', from: item.due, to: t.due });
    });
    return out;
  }

  function acceptDraft(store, learnerId, opts) {
    const plans = plansOf(store, learnerId);
    if (!plans.draft) fail('not_found', 'No draft plan');
    if (opts && opts.expectedPlanId && plans.draft.id !== opts.expectedPlanId) fail('replaced', 'The reviewed draft was replaced by a newer draft; review the current draft before deciding', { reviewed: opts.expectedPlanId, current: plans.draft.id });
    if (plans.draft.status === 'declined') fail('declined', 'A declined draft cannot be accepted; ask for a new draft');
    if (plans.draft.status !== 'draft') fail('conflict', 'Draft already decided');
    const conflicts = planConflicts(store, plans.draft);
    if (conflicts.length) fail('stale', 'Draft is stale: task dates changed since it was drafted', { conflicts });
    const when = at(opts);
    const accepted = Object.freeze({ ...plans.draft, status: 'accepted', decidedAt: when, decidedBy: 'parent' });
    const history = [...plans.history];
    if (plans.current) history.push(Object.freeze({ ...plans.current, status: 'superseded', supersededAt: when }));
    history.push(accepted);
    let s = putPlans(store, learnerId, { current: accepted, draft: null, history });
    s = appendEvent(s, { at: when, learnerId, taskId: null, source: 'plan', type: 'accepted', detail: { planId: accepted.id } });
    return { store: s, plan: accepted };
  }

  function declineDraft(store, learnerId, opts) {
    const plans = plansOf(store, learnerId);
    if (!plans.draft || plans.draft.status !== 'draft') fail('not_found', 'No pending draft to decline');
    if (opts && opts.expectedPlanId && plans.draft.id !== opts.expectedPlanId) fail('replaced', 'The reviewed draft was replaced by a newer draft; review the current draft before deciding', { reviewed: opts.expectedPlanId, current: plans.draft.id });
    const when = at(opts);
    const declined = Object.freeze({ ...plans.draft, status: 'declined', decidedAt: when, decidedBy: 'parent' });
    let s = putPlans(store, learnerId, { ...plans, draft: declined, history: [...plans.history, declined] });
    s = appendEvent(s, { at: when, learnerId, taskId: null, source: 'plan', type: 'declined', detail: { planId: declined.id } });
    return { store: s, plan: declined };
  }

  const getPlans = (store, learnerId) => plansOf(store, learnerId);

  // ---------- student proposals (grades 6–8) ----------
  function proposeChange(store, learnerId, input, opts) {
    const learner = requireLearner(store, learnerId);
    if (learner.band !== '68') fail('not_allowed', 'Only grade 6–8 learners propose date changes');
    const task = requireTask(store, input.taskId);
    if (task.learnerId !== learnerId) fail('not_found', 'Task belongs to another learner');
    if (task.status === 'archived') fail('conflict', 'Archived tasks cannot be rescheduled');
    const errors = {};
    const due = trim(input.due);
    if (!due) errors.due = 'required'; else if (!isoDate(due)) errors.due = 'invalid_date'; else if (due === task.due) errors.due = 'same_date';
    const reason = trim(input.reason);
    if (!reason) errors.reason = 'required'; else if (reason.length > LIMITS.reason) errors.reason = 'too_long';
    if (Object.keys(errors).length) fail('validation', 'Proposal is invalid', errors);
    const n = nextId(store, 'prop');
    const when = at(opts);
    const proposal = Object.freeze({ id: n.id, learnerId, taskId: task.id, author: 'student', fromDue: task.due, toDue: due, reason, status: 'pending', createdAt: when, decidedAt: null });
    let s = { ...n.store, proposals: { ...n.store.proposals, [proposal.id]: proposal } };
    s = appendEvent(s, { at: when, learnerId, taskId: task.id, source: 'proposal', type: 'proposed', detail: { proposalId: proposal.id, fromDue: task.due, toDue: due, reason } });
    return { store: s, proposal };
  }

  function decideProposal(store, proposalId, decision, opts) {
    const p = store.proposals[proposalId] || fail('not_found', 'Unknown proposal');
    if (p.status !== 'pending') fail('already_decided', 'Proposal already decided');
    if (decision !== 'accept' && decision !== 'decline') fail('validation', 'Unknown decision', { decision: 'invalid' });
    const task = requireTask(store, p.taskId);
    if (decision === 'accept' && task.status === 'archived') fail('conflict', 'Task was archived; proposal cannot be applied');
    if (decision === 'accept' && task.due !== p.fromDue) fail('stale', 'The due date changed after this proposal was made; ask for a fresh proposal', { fromDue: p.fromDue, currentDue: task.due, toDue: p.toDue });
    const when = at(opts);
    let s = store;
    if (decision === 'accept') s = editTask(s, p.taskId, { due: p.toDue }, { at: when }).store;
    const decided = Object.freeze({ ...p, status: decision === 'accept' ? 'accepted' : 'declined', decidedAt: when, decidedBy: 'parent' });
    s = { ...s, proposals: { ...s.proposals, [proposalId]: decided } };
    s = appendEvent(s, { at: when, learnerId: p.learnerId, taskId: p.taskId, source: 'proposal', type: decided.status, detail: { proposalId } });
    return { store: s, proposal: decided };
  }
  // Review state of a proposal against the CURRENT task: pending | stale (due moved since fromDue) | unavailable (archived) | decided status.
  function proposalState(store, proposalId) {
    const p = store.proposals[proposalId]; if (!p) return null;
    const task = store.tasks[p.taskId];
    if (p.status !== 'pending') return { status: p.status, stale: false, unavailable: false, currentDue: task ? task.due : null };
    if (!task || task.status === 'archived') return { status: 'unavailable', stale: false, unavailable: true, currentDue: task ? task.due : null };
    if (task.due !== p.fromDue) return { status: 'stale', stale: true, unavailable: false, currentDue: task.due };
    return { status: 'pending', stale: false, unavailable: false, currentDue: task.due };
  }
  const listProposals = (store, learnerId) => Object.values(store.proposals).filter((p) => p.learnerId === learnerId).sort((a, b) => (a.id < b.id ? -1 : 1));

  // ---------- Today derivations ----------
  function todayForParent(store, learnerId, opts) {
    const tasks = listTasks(store, learnerId, { status: 'open' });
    const helpFlags = [];
    tasks.forEach((t) => {
      const sess = getSession(store, t.id);
      if (sess.state === 'stuck') helpFlags.push({ taskId: t.id, title: t.title, kind: 'stuck' });
      if (sess.assistance.some((a) => a.kind === 'requested' && !a.available)) helpFlags.push({ taskId: t.id, title: t.title, kind: 'help_unavailable' });
    });
    const plans = plansOf(store, learnerId);
    const pendingDecisions = [];
    if (plans.draft && plans.draft.status === 'draft') pendingDecisions.push({ kind: 'draft_plan', id: plans.draft.id });
    listProposals(store, learnerId).filter((p) => p.status === 'pending').forEach((p) => pendingDecisions.push({ kind: 'proposal', id: p.id, taskId: p.taskId }));
    const today = todayOf(opts);
    const nextActions = tasks.map((t) => ({ taskId: t.id, title: t.title, due: t.due, overdue: t.due < today, state: getSession(store, t.id).state }));
    return { helpFlags, pendingDecisions, nextActions, planConflicts: planConflicts(store, plans.current), draftConflicts: planConflicts(store, plans.draft && plans.draft.status === 'draft' ? plans.draft : null) };
  }

  function todayForStudent(store, learnerId, opts) {
    const open = listTasks(store, learnerId, { status: 'open' });
    const plans = plansOf(store, learnerId);
    const today = todayOf(opts);
    const planned = plans.current ? plans.current.items.filter((i) => i.day <= today && open.some((t) => t.id === i.taskId)) : [];
    const inProgress = open.find((t) => ['in_progress', 'stuck'].includes(getSession(store, t.id).state));
    const nextTask = inProgress || (planned.length ? open.find((t) => t.id === planned[0].taskId) : null) || open[0] || null;
    return { nextTask, plan: plans.current, remaining: open.length, proposals: listProposals(store, learnerId) };
  }

  // ---------- destructive reset (confirmed in UI) ----------
  function resetLearner(store, learnerId, opts) {
    requireLearner(store, learnerId);
    const keep = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v.learnerId !== learnerId));
    const s = { ...store, tasks: keep(store.tasks), sessions: keep(store.sessions), observations: keep(store.observations), proposals: keep(store.proposals), plans: { ...store.plans, [learnerId]: undefined }, events: store.events.filter((e) => e.learnerId !== learnerId) };
    delete s.plans[learnerId];
    return { store: s };
  }

  return {
    LIMITS, SUBJECTS, HELP_TYPES, LEARNERS, SAMPLES, DomainError,
    createStore, validateTaskInput, createTask, editTask, archiveTask, restoreTask, listTasks, loadSample,
    getSession, startTask, addStep, requestHelp, replayScripted, parseWholeNumber, checkAnswer, flagStuck, markComplete,
    countRequestedHelp, countScriptedHelp, addObservation, listObservations, recordForTask, recordForLearner, isoDate,
    schedule, draftPlan, planConflicts, acceptDraft, declineDraft, getPlans, proposeChange, decideProposal, listProposals, proposalState, CONTENT_FIELDS,
    todayForParent, todayForStudent, resetLearner, addDays,
  };
});
