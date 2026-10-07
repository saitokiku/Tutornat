(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AcademicCompanionModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validateLocale(locale) {
    if (locale === 'en' || locale === 'es') return locale;
    throw new RangeError(`Unsupported locale: ${locale}`);
  }

  function validateBand(band) {
    if (band === 'K2' || band === '35' || band === '68') return band;
    throw new RangeError(`Unsupported band: ${band}`);
  }

  function createSettings({ locale = 'en', band = '35' } = {}) {
    return Object.freeze({ locale: validateLocale(locale), band: validateBand(band) });
  }

  const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function validateIsoDate(value, label) {
    const m = ISO_DATE.exec(String(value));
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return value;
    }
    throw new RangeError(`Invalid ${label}: ${value}`);
  }
  // Calendar arithmetic in UTC so month edges and DST never shift a date.
  function shiftDate(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  }

  // Final-answer checker. A tiny explicit parser, never eval. Accepted forms:
  //   bare number            "225"   "-3"   "12.0"
  //   expr = number          "403 − 178 = 225"  (only the task's own left side)
  //   variable = number      "x = 6" / "6 = x" (only the task's own variable)
  // Anything else is `unparsed` (an intermediate step, prose, a negation) — not wrong,
  // just not checkable. Two or more candidate numbers are `ambiguous`.
  const NUMBER = /^[+-]?\d+(?:\.\d+)?$/;
  const LIST_OF_NUMBERS = /^[+-]?\d+(?:\.\d+)?(?:(?:,|\/|;|or|and|o|u|y)[+-]?\d+(?:\.\d+)?)+$/;
  const NEGATION = /\b(not|isn'?t|nope|wrong|no|tampoco)\b/i;
  function normalizeMath(text) {
    return String(text).replace(/[−–—]/g, '-').replace(/\s+/g, '').toLowerCase();
  }
  function checkFinalAnswer(text, spec) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return { result: 'unparsed', reason: 'empty' };
    if (NEGATION.test(raw)) return { result: 'unparsed', reason: 'negated' };
    // "1 2" is two numbers (or a typo), never twelve: whitespace inside a number is not joined.
    if (/\d\s+\d/.test(raw)) return { result: 'unparsed', reason: 'split_number' };
    const expected = Number(spec.answer);
    const compact = normalizeMath(raw).replace(/[.!?]+$/, '');
    const forms = [];
    if (spec.expr) forms.push(normalizeMath(spec.expr));
    if (spec.variable) forms.push(String(spec.variable).toLowerCase());
    let candidate = null;
    if (NUMBER.test(compact)) candidate = compact;
    else {
      const sides = compact.split('=');
      if (sides.length === 2) {
        const [l, r] = sides;
        if (forms.includes(l) && NUMBER.test(r)) candidate = r;
        else if (forms.includes(r) && NUMBER.test(l)) candidate = l;
      }
    }
    if (candidate !== null) {
      const value = Number(candidate);
      return { result: value === expected ? 'match' : 'mismatch', value };
    }
    if (LIST_OF_NUMBERS.test(compact)) return { result: 'ambiguous' };
    return { result: 'unparsed' };
  }

  function createInitialState(settings = createSettings()) {
    return {
      settings: createSettings(settings),
      work: { status: 'not_started' },
      ledger: {
        math: { status: 'not_checked', evidence: 'none', hintsUsed: 0, plannedChecks: [] },
        literacy: { status: 'not_checked', evidence: 'none', hintsUsed: 0, plannedChecks: [] }
      },
      observations: [],
      draftPlan: null,
      currentPlan: null
    };
  }

  // Synthetic example per band. Ids are stable keys for localized copy in the UI;
  // numbers were checked by calculation (evidence/math-check.log), not guessed.
  const EXAMPLES = {
    K2: {
      tasks: [
        { id: 'k2-math-add', subject: 'math', due: '2026-10-01', status: 'not_started' },
        { id: 'k2-read-sounds', subject: 'literacy', due: '2026-10-02', status: 'not_started' }
      ],
      focusTaskId: 'k2-math-add',
      extracted: { taskId: 'k2-read-sounds', due: '2026-10-02' }
    },
    35: {
      tasks: [
        { id: '35-math-regroup', subject: 'math', due: '2026-10-01', status: 'not_started' },
        { id: '35-read-summary', subject: 'literacy', due: '2026-10-02', status: 'not_started' },
        { id: '35-science-habitat', subject: 'science', due: '2026-10-06', status: 'not_started' }
      ],
      focusTaskId: '35-math-regroup',
      extracted: { taskId: '35-read-summary', due: '2026-10-02' }
    },
    68: {
      tasks: [
        { id: '68-math-equation', subject: 'math', due: '2026-10-01', status: 'not_started' },
        { id: '68-essay-claim', subject: 'literacy', due: '2026-10-02', status: 'not_started' },
        { id: '68-history-timeline', subject: 'history', due: '2026-10-08', status: 'not_started' }
      ],
      focusTaskId: '68-math-equation',
      extracted: { taskId: '68-essay-claim', due: '2026-10-02' }
    }
  };

  function loadExample(settings = createSettings()) {
    const s = createSettings(settings);
    const ex = EXAMPLES[s.band];
    return {
      ...createInitialState(s),
      tasks: ex.tasks.map((t) => ({ ...t })),
      focusTaskId: ex.focusTaskId,
      // `due` is always the current shared deadline; `sampleDue` keeps the date the sample note said.
      extracted: { ...ex.extracted, sampleDue: ex.extracted.due, source: 'parent_entered_sample', status: 'needs_parent_review', corrections: [] },
      proposals: []
    };
  }

  function proposePlanChange(state, { taskId, due, note = '' }) {
    const task = (state.tasks || []).find((t) => t.id === taskId);
    if (!task) throw new RangeError(`Unknown task: ${taskId}`);
    if (task.status === 'complete') throw new RangeError(`Task is complete and cannot be moved: ${taskId}`);
    validateIsoDate(due, 'proposed date');
    const proposal = { taskId, from: task.due, due, note: String(note), source: 'student', status: 'pending_parent', visibleTo: 'parent' };
    return { ...state, proposals: [...(state.proposals || []), proposal] };
  }

  // The one shared date transition. The task's date, provenance and history, the
  // extract's current date and any plan derived from the old date move together. A plan
  // is never rewritten silently: it is marked stale with the old and new dates so a parent
  // can ask for another draft and accept it explicitly.
  const DUE_SOURCES = ['parent_confirmed', 'parent_corrected', 'student_proposal_approved'];
  function applyDueChange(state, taskId, due, source) {
    const task = (state.tasks || []).find((t) => t.id === taskId);
    if (!task) throw new RangeError(`Unknown task: ${taskId}`);
    if (!DUE_SOURCES.includes(source)) throw new RangeError(`Unsupported due source: ${source}`);
    validateIsoDate(due, 'due');
    const from = task.due;
    if (from === due) {
      // No movement. Only an explicit parent confirmation of a still-unsourced date adds provenance;
      // confirming "as shown" never overwrites who moved the date earlier.
      const tasks = state.tasks.map((t) => (t.id === taskId && !t.dueSource && source === 'parent_confirmed' ? { ...t, dueSource: source } : t));
      return { ...state, tasks };
    }
    const entry = { from, to: due, source };
    const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, due, dueSource: source, dueHistory: [...(t.dueHistory || []), entry] } : t));
    const extracted = state.extracted && state.extracted.taskId === taskId ? { ...state.extracted, due, dueSource: source } : state.extracted;
    // A plan's validity is recomputed against ALL of its dependencies (every task an item
    // names), not only the task that just moved: a change to one task can never clear the
    // staleness another task caused. staleFrom is the plan's own date for the still-mismatched
    // dependency (so it survives successive moves); staleTo is that task's current deadline.
    const restale = (plan) => {
      if (!plan || plan.status === 'declined_by_parent') return plan;
      const mismatched = (plan.items || []).filter((i) => {
        if (!i || typeof i !== 'object' || !i.taskId) return false;
        const dep = tasks.find((t) => t.id === i.taskId);
        return dep ? dep.due !== i.due : false;
      });
      if (mismatched.length) {
        const item = mismatched.find((i) => i.taskId === taskId) || mismatched[0];
        const dep = tasks.find((t) => t.id === item.taskId);
        return { ...plan, stale: true, staleReason: 'due_changed', staleFrom: item.due !== undefined ? item.due : from, staleTo: dep.due };
      }
      if (!plan.stale) return plan;
      const { stale, staleReason, staleFrom, staleTo, ...rest } = plan; // every dependency is back on the date the plan says
      return rest;
    };
    return { ...state, tasks, extracted, currentPlan: restale(state.currentPlan), draftPlan: restale(state.draftPlan) };
  }

  function decideProposal(state, index, decision) {
    const proposal = (state.proposals || [])[index];
    if (!proposal) throw new RangeError(`Unknown proposal: ${index}`);
    if (decision !== 'approved' && decision !== 'declined') throw new RangeError(`Unsupported decision: ${decision}`);
    if (proposal.status !== 'pending_parent') throw new Error(`Proposal ${index} already decided: ${proposal.status}`);
    const status = decision === 'approved' ? 'approved_by_parent' : 'declined_by_parent';
    const proposals = state.proposals.map((p, i) => (i === index ? { ...p, status } : p));
    const next = { ...state, proposals };
    return decision === 'approved' ? applyDueChange(next, proposal.taskId, proposal.due, 'student_proposal_approved') : next;
  }

  function resetExample(state) {
    return loadExample(state.settings);
  }

  // Parent confirmation/correction of the extracted task. Only the deadline is
  // correctable here; the change reaches the actual shared task with provenance so
  // student and parent read the same date. Corrections are measured against the
  // current shared deadline (which an approved proposal may already have moved), so
  // "confirm as shown" can never silently roll an approval back.
  const CORRECTABLE = ['due'];
  function correctExtractedTask(state, changes = {}) {
    Object.keys(changes).forEach((field) => {
      if (!CORRECTABLE.includes(field)) throw new RangeError(`Unsupported correction: ${field}`);
    });
    if (changes.due !== undefined) validateIsoDate(changes.due, 'due');
    const ex = state.extracted;
    const task = (state.tasks || []).find((t) => t.id === ex.taskId);
    const current = { ...ex, due: task ? task.due : ex.due };
    const corrections = Object.keys(changes)
      .filter((field) => current[field] !== changes[field])
      .map((field) => ({ field, from: current[field], to: changes[field], by: 'parent' }));
    const extracted = { ...current, status: 'confirmed_by_parent', corrections: [...ex.corrections, ...corrections] };
    const due = changes.due !== undefined ? changes.due : current.due;
    return applyDueChange({ ...state, extracted }, ex.taskId, due, corrections.length ? 'parent_corrected' : 'parent_confirmed');
  }

  // Draft plan items derived from the confirmed task and its (possibly corrected)
  // deadline. Items are stable keys + parameters; the UI renders them in the current
  // locale. Nothing here is accepted until a parent explicitly accepts the draft.
  function derivePlanItems(state) {
    const ex = state.extracted;
    if (!ex || ex.status !== 'confirmed_by_parent') throw new Error('Extracted task not confirmed by a parent');
    const task = (state.tasks || []).find((t) => t.id === ex.taskId);
    const due = task ? task.due : ex.due;
    const base = { taskId: ex.taskId, due, source: 'ai_draft' };
    return [
      { ...base, key: 'tonight', date: null },
      { ...base, key: 'midway', date: shiftDate(due, -1) },
      { ...base, key: 'due', date: due }
    ];
  }

  function focusSubject(state) {
    const task = (state.tasks || []).find((t) => t.id === state.focusTaskId);
    return task ? task.subject : 'math';
  }

  function selectTask(state, taskId) {
    const task = (state.tasks || []).find((t) => t.id === taskId);
    if (!task) throw new RangeError(`Unknown task: ${taskId}`);
    const work = task.status === 'complete'
      ? { status: 'complete', assistance: task.assistance || [] }
      : { status: task.status, assistance: task.assistance || [] };
    return { ...state, focusTaskId: taskId, work };
  }

  function nextTask(state) {
    return (state.tasks || []).find((t) => t.status !== 'complete' && t.id !== state.focusTaskId) || null;
  }

  function syncFocusTask(state, work) {
    const tasks = (state.tasks || []).map((t) => (t.id === state.focusTaskId ? { ...t, status: work.status, assistance: work.assistance } : t));
    return { ...state, work, tasks };
  }

  function startWork(state) {
    const work = { ...state.work, status: 'in_progress', assistance: state.work.assistance || [] };
    return syncFocusTask(state, work);
  }

  function requestHint(state, text) {
    const hint = { kind: 'hint', text, source: 'companion', provenance: 'ai_hint' };
    return syncFocusTask(state, { ...state.work, assistance: [...(state.work.assistance || []), hint] });
  }

  // A scripted demo turn that shows a hint is presentation, not a request: it is kept
  // as its own event kind (never counted as a hint the child asked for) and recorded
  // once per script step, so replaying the demo cannot inflate anything.
  function recordScriptedHint(state, { text, scriptIndex }) {
    const assistance = state.work.assistance || [];
    if (assistance.some((a) => a.kind === 'scripted_hint' && a.scriptIndex === scriptIndex)) return state;
    const event = { kind: 'scripted_hint', text, source: 'companion', provenance: 'scripted_demo', scriptIndex };
    return syncFocusTask(state, { ...state.work, assistance: [...assistance, event] });
  }
  // Hints the child actually asked for (explicit control or a supported typed request).
  function hintsRequested(state) {
    return ((state.work || {}).assistance || []).filter((a) => a.kind === 'hint').length;
  }

  // Completion is a self-report made inside an assisted session. It schedules
  // independent checks; it never records mastery. Organized-only subjects (no
  // instruction or assessment in this example) keep status/deadline only: no evidence,
  // no check schedule, no ledger row.
  const INSTRUCTED_SUBJECTS = ['math', 'literacy'];
  function completeWork(state) {
    const subject = focusSubject(state);
    const synced = syncFocusTask(state, { ...state.work, status: 'complete' });
    if (!INSTRUCTED_SUBJECTS.includes(subject)) return synced;
    const hintsUsed = hintsRequested(state);
    return {
      ...synced,
      ledger: {
        ...state.ledger,
        [subject]: {
          ...(state.ledger[subject] || {}),
          status: 'needs_independent_check',
          evidence: 'assisted_work',
          hintsUsed,
          plannedChecks: [
            { window: '48-72h', status: 'planned' },
            { window: 'day7', status: 'planned' }
          ]
        }
      }
    };
  }

  function addParentObservation(state, text) {
    const observation = { text, source: 'parent', verification: 'observation_unverified' };
    return { ...state, observations: [...state.observations, observation] };
  }

  function createDraftPlan(state, items) {
    const draftPlan = { items: [...items], status: 'pending_parent_review', source: 'ai_draft' };
    return { ...state, draftPlan, currentPlan: state.currentPlan };
  }

  function declineDraftPlan(state, parentNote = '') {
    if (!state.draftPlan) throw new Error('No draft plan to decline');
    return { ...state, draftPlan: { ...state.draftPlan, status: 'declined_by_parent', parentNote } };
  }

  // Acceptance is a model boundary, not only a hidden button: a draft that is marked stale, or
  // whose items name a task whose current deadline differs from the item's date, is refused
  // before anything is installed. Legacy item shapes (plain strings, items without taskId)
  // name no dependency and are accepted as before.
  function draftConflicts(state, draft) {
    return (draft.items || []).some((i) => {
      if (!i || typeof i !== 'object' || !i.taskId) return false;
      const dep = (state.tasks || []).find((t) => t.id === i.taskId);
      return Boolean(dep) && dep.due !== i.due;
    });
  }
  function acceptDraftPlan(state) {
    if (!state.draftPlan) throw new Error('No draft plan to accept');
    if (state.draftPlan.stale || draftConflicts(state, state.draftPlan)) throw new Error('Draft plan is stale: its dates no longer match the shared deadline; ask for a new draft or decline it');
    return {
      ...state,
      draftPlan: { ...state.draftPlan, status: 'accepted_by_parent' },
      currentPlan: { items: [...state.draftPlan.items], acceptedBy: 'parent' }
    };
  }

  return Object.freeze({
    validateLocale,
    validateBand,
    createSettings,
    createInitialState,
    loadExample,
    resetExample,
    proposePlanChange,
    decideProposal,
    correctExtractedTask,
    applyDueChange,
    derivePlanItems,
    checkFinalAnswer,
    selectTask,
    nextTask,
    startWork,
    requestHint,
    recordScriptedHint,
    hintsRequested,
    completeWork,
    addParentObservation,
    createDraftPlan,
    acceptDraftPlan,
    declineDraftPlan
  });
});
