'use strict';
// E3 integration (#24): the two-key content boundary (#17, migration 0007) means every fixture item that
// a suite issues must be keyed by two distinct author logins and approved through e2.approve_item.
// A (assessment.cjs) and C (prove.cjs) already do this natively; B (exposure-pg), the replay suite (#16)
// and E13 (qualification.cjs, #18) were written before #17 and seed items with `approval='approved'`
// only. This module is the same owner-connection fixture device C uses, shared so those suites author
// two keys without each growing its own copy. Synthetic engineering fixtures only (context pack §Constraints).
const assert = require('node:assert/strict');

const AUTHOR_LOGINS = { h1: ['e2_h1_author', 'e2_h1_author2'], h2: ['e2_h2_author', 'e2_h2_author2'] };
const numericKey = (value) => ({ type: 'numeric', options: null, answer: { value, tolerance: 0 } });

/** Owner-only: two synthetic author logins per household, exactly like C's `provisionPrincipals`. Idempotent. */
async function provisionAuthors(admin, households = Object.keys(AUTHOR_LOGINS)) {
  for (const household of households) for (const login of AUTHOR_LOGINS[household]) {
    const found = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [login]);
    if (found.rowCount === 0) {
      try { await admin.query(`CREATE ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`); }
      catch (e) { if (e.code !== '42710') throw e; } // a sibling suite created it between the probe and the CREATE
    }
    await admin.query(`GRANT author TO ${login}`);
    await admin.query('INSERT INTO e2.principals(login,household_id) VALUES($1,$2) ON CONFLICT(login) DO UPDATE SET household_id=EXCLUDED.household_id', [login, household]);
  }
}

/**
 * Two author logins each key the item through e2.author_key, then e2.approve_item records the decision, which
 * the fixture asserts was `approved`. Runs on the owner connection: SET LOCAL SESSION AUTHORIZATION is the
 * superuser-only fixture device that makes each author the session login, restored before return. When the
 * caller is already inside a transaction (E13's per-case BEGIN…ROLLBACK) pass `inTransaction: true`; otherwise
 * the helper opens and commits its own.
 */
async function approveItem(c, id, { household = 'h1', version = '1', value = '4', inTransaction, operation = `approve_${household}_${id}` } = {}) {
  const own = inTransaction === undefined
    ? !(await c.query('SELECT pg_current_xact_id_if_assigned() IS NOT NULL AS value')).rows[0].value
    : !inTransaction;
  if (own) await c.query('BEGIN');
  try {
    for (const login of AUTHOR_LOGINS[household]) {
      await c.query(`SET LOCAL SESSION AUTHORIZATION ${login}`);
      await c.query('SET LOCAL ROLE author');
      await c.query('SELECT e2.author_key($1,$2,$3,$4)', [id, version, numericKey(value), { source: 'synthetic-fixture' }]);
    }
    const event = (await c.query('SELECT e2.approve_item($1,$2,$3,$4) AS value', [id, version, operation, { source: 'synthetic-fixture' }])).rows[0].value;
    await c.query('SET LOCAL SESSION AUTHORIZATION DEFAULT');
    assert.equal(event.outcome, 'approved', `two-key approval of ${household}/${id} refused: ${JSON.stringify(event.reasons)}`);
    if (own) await c.query('COMMIT');
    return event;
  } catch (e) { if (own) await c.query('ROLLBACK').catch(() => {}); throw e; }
}

module.exports = { AUTHOR_LOGINS, numericKey, provisionAuthors, approveItem };
