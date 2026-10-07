'use strict';

const { setTimeout: delay } = require('node:timers/promises');

// Put wait() at the boundary in the first operation; await entered before starting
// its competitor. release() is idempotent and later wait() calls pass immediately.
function gate() {
  let enter, release;
  const entered = new Promise((resolve) => { enter = resolve; });
  const released = new Promise((resolve) => { release = resolve; });
  return { entered, release, async wait() { enter(); await released; } };
}

async function waitBlocked(observer, waiterPid, blockerPid, { timeoutMs = 10000 } = {}) {
  if (!Number.isInteger(waiterPid) || !Number.isInteger(blockerPid)) throw new TypeError('backend pids must be integers');
  const deadline = Date.now() + timeoutMs;
  let observed = null;
  do {
    const result = await observer.query(
      'SELECT pid, wait_event_type, wait_event, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE pid = $1',
      [waiterPid],
    );
    observed = result.rows[0] || null;
    if (observed?.wait_event_type === 'Lock' && observed.blockers.includes(blockerPid)) return { waiterPid, blockerPid, ...observed };
    await delay(20);
  } while (Date.now() < deadline);
  const error = new Error(`backend ${waiterPid} did not block on ${blockerPid}; observed=${JSON.stringify(observed)}`);
  error.code = 'BARRIER_TIMEOUT';
  error.observed = observed;
  throw error;
}

// Share this exact key encoding/order between assistance writers and finalizers.
// Locks are transaction-scoped; callers must begin a transaction before calling.
async function lockSkills(client, householdId, learnerId, skills) {
  if (typeof householdId !== 'string' || !householdId || typeof learnerId !== 'string' || !learnerId ||
      !Array.isArray(skills) || skills.length === 0 || skills.some((skill) => typeof skill !== 'string' || !skill)) {
    throw new TypeError('household, learner and nonempty skill IDs are required');
  }
  // SQL uses COLLATE "C"; UTF-8 byte order also matches it for non-BMP IDs.
  const ordered = [...new Set(skills)].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  for (const skill of ordered) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify([householdId, learnerId, skill])]);
  }
}

module.exports = { gate, waitBlocked, lockSkills };
