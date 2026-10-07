/* demo-service.js — stateful, replaceable fake service boundary for the connected frontend demo.
 * It owns the single in-memory store, applies every command through domain.js, and simulates
 * service behaviour (latency, one-off failure, offline) WITHOUT any network, storage, or fabricated
 * API transcripts. Every command resolves to { ok:true, data, operationId } or
 * { ok:false, error:{ code, message, errors, retryable }, operationId }.
 * Race rules (tested in tests/service.test.cjs):
 *   - duplicate requestKey while pending → 'duplicate'
 *   - cancel(id) → 'cancelled', late timer applies nothing
 *   - learner reset, dependency edit/archive, or a newer edit of the same task → late result 'superseded'
 *   - scenario 'fail_once' → first command 'service_failed' (retryable) → retry(operationId) re-runs it
 *   - retry keeps ONE logical operation: the original dependency snapshot and decision identity are reused, invalidation is
 *     checked before a failure is reported and again before a retry runs ('superseded'), an applied/non-retryable operation
 *     is refused with 'not_retryable', and a second retry while one is in flight is 'duplicate' (repair cycle 2, F2-01)
 *   - scenario 'unavailable' → every command 'unavailable' (not retryable until scenario changes)
 *   - acceptDraft/declineDraft capture the draft id at dispatch; a replacement draft → 'replaced' (never accepts the unreviewed one)
 */
(function (root, factory) {
  const api = factory(typeof require === 'function' ? require('./domain.js') : root.Domain);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DemoService = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  const SCENARIOS = Object.freeze(['normal', 'delayed', 'fail_once', 'unavailable']);
  const DELAYS = Object.freeze({ normal: 120, delayed: 1800, fail_once: 300, unavailable: 200 });

  // Which store mutation each command performs. Each returns { store, data }.
  const COMMANDS = {
    createTask: (s, c, o) => { const r = D.createTask(s, c.learnerId, c.input, o); return { store: r.store, data: { task: r.task } }; },
    editTask: (s, c, o) => { const r = D.editTask(s, c.taskId, c.changes, o); return { store: r.store, data: { task: r.task } }; },
    archiveTask: (s, c, o) => { const r = D.archiveTask(s, c.taskId, o); return { store: r.store, data: { task: r.task } }; },
    restoreTask: (s, c, o) => { const r = D.restoreTask(s, c.taskId, o); return { store: r.store, data: { task: r.task } }; },
    loadSample: (s, c, o) => { const r = D.loadSample(s, c.learnerId, o); return { store: r.store, data: { tasks: r.tasks } }; },
    startTask: (s, c, o) => { const r = D.startTask(s, c.taskId, o); return { store: r.store, data: { session: r.session } }; },
    addStep: (s, c, o) => { const r = D.addStep(s, c.taskId, c.text, o); return { store: r.store, data: { step: r.step } }; },
    requestHelp: (s, c, o) => { const r = D.requestHelp(s, c.taskId, c.helpType, o); return { store: r.store, data: { assistance: r.assistance } }; },
    checkAnswer: (s, c, o) => { const r = D.checkAnswer(s, c.taskId, c.answer, o); return { store: r.store, data: { check: r.check } }; },
    flagStuck: (s, c, o) => { const r = D.flagStuck(s, c.taskId, o); return { store: r.store, data: { session: r.session } }; },
    markComplete: (s, c, o) => { const r = D.markComplete(s, c.taskId, o); return { store: r.store, data: { session: r.session } }; },
    addObservation: (s, c, o) => { const r = D.addObservation(s, c.taskId, c.text, o); return { store: r.store, data: { observation: r.observation } }; },
    draftPlan: (s, c, o) => { const r = D.draftPlan(s, c.learnerId, o); return { store: r.store, data: { plan: r.plan } }; },
    acceptDraft: (s, c, o) => { const r = D.acceptDraft(s, c.learnerId, { ...o, expectedPlanId: c.planId || null }); return { store: r.store, data: { plan: r.plan } }; },
    declineDraft: (s, c, o) => { const r = D.declineDraft(s, c.learnerId, { ...o, expectedPlanId: c.planId || null }); return { store: r.store, data: { plan: r.plan } }; },
    proposeChange: (s, c, o) => { const r = D.proposeChange(s, c.learnerId, c.input, o); return { store: r.store, data: { proposal: r.proposal } }; },
    decideProposal: (s, c, o) => { const r = D.decideProposal(s, c.proposalId, c.decision, o); return { store: r.store, data: { proposal: r.proposal } }; },
  };
  // Commands whose result depends on every open task of the learner (any task change supersedes them).
  const LEARNER_WIDE = new Set(['draftPlan', 'acceptDraft', 'loadSample']);

  function createDemoService(options) {
    const opts = options || {};
    const clock = opts.clock || (() => new Date().toISOString());
    const todayFn = typeof opts.today === 'function' ? opts.today : () => opts.today || clock().slice(0, 10);
    const schedule = opts.schedule || ((fn, ms) => setTimeout(fn, ms));

    let store = D.createStore();
    let scenario = 'normal';
    let failArmed = false; // fail_once: the next command fails once
    let seq = 0;
    const pending = new Map(); // operationId → op
    const subscribers = new Set();
    const generation = { learners: {}, tasks: {} }; // bumps invalidate in-flight work

    const emit = (ev) => subscribers.forEach((fn) => { try { fn(ev); } catch (e) { /* subscriber errors never break the service */ } });
    const learnerGen = (id) => generation.learners[id] || 0;
    const taskGen = (id) => generation.tasks[id] || 0;
    const bumpLearner = (id) => { generation.learners[id] = learnerGen(id) + 1; };
    const bumpTask = (id) => { generation.tasks[id] = taskGen(id) + 1; };

    const errorResult = (op, code, message, errors, retryable) => ({ ok: false, operationId: op.id, command: op.command, error: { code, message: message || code, errors: errors || {}, retryable: !!retryable } });

    function snapshotDeps(command) {
      const learnerId = command.learnerId || (command.taskId && store.tasks[command.taskId] ? store.tasks[command.taskId].learnerId : null)
        || (command.proposalId && store.proposals[command.proposalId] ? store.proposals[command.proposalId].learnerId : null);
      const taskIds = [];
      if (command.taskId) taskIds.push(command.taskId);
      if (command.proposalId && store.proposals[command.proposalId]) taskIds.push(store.proposals[command.proposalId].taskId);
      if (LEARNER_WIDE.has(command.type) && learnerId) D.listTasks(store, learnerId, { status: 'all' }).forEach((t) => taskIds.push(t.id));
      return { learnerId, learnerGen: learnerId ? learnerGen(learnerId) : 0, tasks: taskIds.map((id) => ({ id, gen: taskGen(id) })) };
    }

    // Why a dependency snapshot is no longer valid (null while it still is).
    function invalidation(d) {
      if (!d) return null;
      if (d.learnerId && learnerGen(d.learnerId) !== d.learnerGen) return 'Learner data was reset while this was pending';
      if (d.tasks.some((t) => taskGen(t.id) !== t.gen)) return 'A task this depended on changed while it was pending';
      return null;
    }

    function finish(op, result) {
      if (op.settled) return;
      op.settled = true;
      pending.delete(op.id);
      const lg = logical.get(op.rootId);
      if (lg) { lg.status = result.ok ? 'applied' : 'failed'; lg.retryable = !result.ok && (result.error.code === 'cancelled' || !!result.error.retryable); }
      history.push({ id: op.id, rootId: op.rootId, command: op.command, ok: result.ok, code: result.ok ? null : result.error.code });
      op.resolve(result);
      emit({ type: result.ok ? 'applied' : 'failed', operationId: op.id, rootId: op.rootId, command: op.command, result });
    }

    function run(op) {
      const command = op.command;
      if (!COMMANDS[command.type]) return finish(op, errorResult(op, 'unknown_command', `Unknown command ${command.type}`));
      if (scenario === 'unavailable') return finish(op, errorResult(op, 'unavailable', 'Demo service is offline (scenario)', {}, false));
      // A retry reuses the ORIGINAL snapshot taken by its first attempt; only a first attempt snapshots.
      const lg = logical.get(op.rootId);
      op.deps = lg ? lg.deps : snapshotDeps(command);
      if (lg) { lg.status = 'pending'; } else logical.set(op.rootId, { deps: op.deps, status: 'pending', retryable: false });
      const willFail = scenario === 'fail_once' && failArmed;
      if (willFail) failArmed = false;
      emit({ type: 'pending', operationId: op.id, command });
      schedule(() => {
        if (op.settled) return; // cancelled
        // Invalidation is checked BEFORE a failure is reported, so a reset/edit/archive never leaves a live retry behind.
        const inv = invalidation(op.deps);
        if (inv) return finish(op, errorResult(op, 'superseded', inv));
        if (willFail) return finish(op, errorResult(op, 'service_failed', 'Demo service failed once (scenario); retry is safe', {}, true));
        try {
          const r = COMMANDS[command.type](store, command, { at: clock(), today: todayFn(), origin: command.origin });
          store = r.store;
          // Applied changes invalidate other in-flight work that depended on the touched records.
          const touched = new Set();
          if (command.taskId) touched.add(command.taskId);
          if (r.data && r.data.task) touched.add(r.data.task.id);
          if (r.data && r.data.tasks) r.data.tasks.forEach((t) => touched.add(t.id));
          if (r.data && r.data.proposal) touched.add(r.data.proposal.taskId);
          touched.forEach(bumpTask);
          finish(op, { ok: true, operationId: op.id, command, data: r.data });
        } catch (e) {
          if (e && e.name === 'DomainError') return finish(op, errorResult(op, e.code, e.message, e.errors, false));
          finish(op, errorResult(op, 'internal', String(e && e.message || e)));
        }
      }, DELAYS[scenario] || DELAYS.normal);
    }

    function dispatch(input) {
      // Decisions bind the exact draft that exists when the decision is DISPATCHED (what the parent reviewed), even for
      // legacy callers that omit planId. A replacement draft arriving before the delayed decision lands → 'replaced'.
      let command = input;
      if ((command.type === 'acceptDraft' || command.type === 'declineDraft') && !command.planId) { const dr = D.getPlans(store, command.learnerId).draft; command = { ...command, planId: dr ? dr.id : null }; }
      if (command.requestKey && [...pending.values()].some((p) => p.command.requestKey === command.requestKey)) {
        const op = { id: `op-${++seq}`, command };
        return Promise.resolve(errorResult(op, 'duplicate', 'This request is already being processed'));
      }
      return new Promise((resolve) => {
        const id = `op-${++seq}`;
        const op = { id, rootId: id, command, resolve, settled: false, startedAt: clock() };
        pending.set(op.id, op);
        run(op);
      });
    }

    // retry(operationId): re-run ONE logical operation (the original attempt or any retry of it). Eligible only while it is
    // failed-retryable or cancelled, not in flight, and its original dependencies are still valid. Nothing else mutates.
    function retry(operationId) {
      const prev = history.find((h) => h.id === operationId);
      if (!prev) return Promise.resolve({ ok: false, operationId, error: { code: 'not_found', message: 'Nothing to retry', errors: {}, retryable: false } });
      const lg = logical.get(prev.rootId); const ref = { id: operationId, command: prev.command };
      if (!lg || lg.status === 'applied') return Promise.resolve(errorResult(ref, 'not_retryable', 'Already applied — retrying would duplicate it', {}, false));
      if (lg.status === 'pending') return Promise.resolve(errorResult(ref, 'duplicate', 'A retry of this request is already being processed', {}, false));
      if (!lg.retryable) return Promise.resolve(errorResult(ref, 'not_retryable', 'This request cannot be retried', {}, false));
      const inv = invalidation(lg.deps);
      if (inv) { lg.retryable = false; return Promise.resolve(errorResult(ref, 'superseded', inv, {}, false)); }
      return new Promise((resolve) => {
        const op = { id: `op-${++seq}`, rootId: prev.rootId, retryOf: operationId, command: prev.command, resolve, settled: false, startedAt: clock() };
        pending.set(op.id, op);
        run(op);
      });
    }
    const history = []; // settled attempts: { id, rootId, command, ok, code }
    const logical = new Map(); // rootId → { deps (original snapshot), status: 'pending'|'applied'|'failed', retryable }

    function cancel(operationId) {
      const op = pending.get(operationId);
      if (!op) return false;
      finish(op, errorResult(op, 'cancelled', 'Cancelled before the demo service answered'));
      return true;
    }

    function resetLearner(learnerId) {
      bumpLearner(learnerId);
      D.listTasks(store, learnerId, { status: 'all' }).forEach((t) => bumpTask(t.id));
      store = D.resetLearner(store, learnerId, { at: clock() }).store;
      emit({ type: 'applied', operationId: `reset-${++seq}`, command: { type: 'resetLearner', learnerId }, result: { ok: true } });
      return Promise.resolve({ ok: true, data: {} });
    }

    function setScenario(name) {
      if (!SCENARIOS.includes(name)) throw new Error(`Unknown scenario ${name}`);
      scenario = name; failArmed = name === 'fail_once';
      emit({ type: 'scenario', scenario });
    }

    const query = {
      store: () => store,
      learners: () => D.LEARNERS,
      listTasks: (learnerId, filter) => D.listTasks(store, learnerId, filter),
      task: (taskId) => store.tasks[taskId] || null,
      session: (taskId) => D.getSession(store, taskId),
      observations: (taskId) => D.listObservations(store, taskId),
      record: (taskId) => D.recordForTask(store, taskId),
      learnerRecord: (learnerId) => D.recordForLearner(store, learnerId),
      plans: (learnerId) => D.getPlans(store, learnerId),
      planConflicts: (plan) => D.planConflicts(store, plan),
      proposals: (learnerId) => D.listProposals(store, learnerId),
      proposalState: (proposalId) => D.proposalState(store, proposalId),
      schedule: (learnerId) => D.schedule(store, learnerId, { today: todayFn() }),
      todayForParent: (learnerId) => D.todayForParent(store, learnerId, { today: todayFn() }),
      todayForStudent: (learnerId) => D.todayForStudent(store, learnerId, { today: todayFn() }),
      today: () => todayFn(),
    };

    return {
      dispatch, retry, cancel, resetLearner, setScenario,
      scenario: () => scenario,
      pending: () => [...pending.values()].map((p) => ({ id: p.id, command: p.command, startedAt: p.startedAt })),
      subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); },
      query, SCENARIOS,
    };
  }

  return { createDemoService, SCENARIOS, DELAYS };
});
