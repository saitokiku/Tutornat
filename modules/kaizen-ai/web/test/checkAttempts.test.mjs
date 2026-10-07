// The one-live-attempt invariant, from both sides.
//
// H18 (2026-08-18 audit) was a regression the two halves of that invariant
// caused between them: migration 0030 put a partial unique index on
// check_attempt(user_id, kc_id) WHERE submitted_at IS NULL — a partial index
// cannot call now(), so the index has no expiry clause — while issueCheck only
// RESUMED attempts with expires_at > now. Close the tab mid-check, come back an
// hour later, and the resume query found nothing, the insert hit the unique
// violation, and the route 500'd. Nothing anywhere cleared stale rows, so it
// 500'd forever: one abandoned check locked that learner out of that concept
// permanently, which is the core loop of the product.
//
// So these are behaviour tests, not source assertions: the bug lived in the
// disagreement between a SQL predicate and a JS filter, and only running the
// path proves they now agree. The fake below enforces 0030's index and
// implements 0031's expire_stale_check_attempts with the same predicate the
// migration uses.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { issueCheck } from '@/lib/engine/check.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');
const sql0031 = fs.readFileSync(path.join(webRoot, '..', 'supabase/migrations/0031_audit_hardening.sql'), 'utf8');
const sql0030 = fs.readFileSync(path.join(webRoot, '..', 'supabase/migrations/0030_mastery_law_hardening.sql'), 'utf8');

const NOW = Date.parse('2026-08-20T12:00:00Z');
const HOUR = 3600000;
const USER = 'user-1';
const KC = 'kc-1';

// Four verified items, one surface context each — enough for the 3-item check
// and deterministic (selectItem uses a per-id hash, never a clock or RNG).
const BANK = ['a', 'b', 'c', 'd'].map((tag, i) => ({
  id: `item-${tag}`, kc_id: KC, status: 'verified',
  kind: 'mcq', tier: 1, body: `q${i}`, choices: ['1', '2'],
  answer_spec: { type: 'choice', value: 0 },
  distractor_misconceptions: null, context_tag: tag,
  difficulty_elo: 1200, exposures: 0,
}));

const attempt = (over = {}) => ({
  id: 'att-old', user_id: USER, kc_id: KC, item_ids: ['item-a', 'item-b', 'item-c'],
  issued_at: new Date(NOW - HOUR).toISOString(),
  expires_at: new Date(NOW + HOUR).toISOString(),
  submitted_at: null, score: null, reason: 'scheduled', ...over,
});

/**
 * A PostgREST-shaped stub over an in-memory table set, with two rules that make
 * it worth testing against:
 *   - insert into check_attempt enforces 0030's partial unique index (one row
 *     per user/kc with submitted_at IS NULL) and reports 23505, exactly as the
 *     database does;
 *   - rpc('expire_stale_check_attempts') applies 0031's predicate verbatim —
 *     submitted_at := expires_at where it is null and expires_at <= now.
 */
function fakeDb({ attempts = [], items = BANK, estimate = null, now = NOW } = {}) {
  const db = {
    attempts: attempts.map((a) => ({ ...a })),
    items,
    estimate,
    rpcCalls: [],
    // The database's own now(), which the RPC's predicate reads. Movable, so a
    // test can let time pass between two issues the way an afternoon does.
    now,
    // Fires once, after a check_attempt read has taken its snapshot — the way
    // to stage "a row appeared between our read and our write".
    onAttemptRead: null,
  };

  const rowsFor = (table, f) => {
    if (table === 'kc_estimate') return db.estimate ? [db.estimate] : [];
    if (table === 'evidence') return [];
    if (table === 'kc_item') {
      return f.in.id
        ? db.items.filter((i) => f.in.id.includes(i.id))
        : db.items.filter((i) => i.kc_id === f.eq.kc_id && i.status === f.eq.status);
    }
    if (table === 'check_attempt') {
      return db.attempts.filter((a) => a.user_id === f.eq.user_id
        && a.kc_id === f.eq.kc_id
        && (f.is.submitted_at !== null || a.submitted_at == null));
    }
    return [];
  };

  const from = (table) => {
    const f = { eq: {}, in: {}, is: {} };
    const resolve = async () => {
      const data = rowsFor(table, f);
      if (table === 'check_attempt' && db.onAttemptRead) {
        const hook = db.onAttemptRead;
        db.onAttemptRead = null;
        hook();
      }
      return { data, error: null };
    };
    const chain = {
      select: () => chain,
      eq: (k, v) => { f.eq[k] = v; return chain; },
      is: (k, v) => { f.is[k] = v; return chain; },
      in: (k, v) => { f.in[k] = v; return chain; },
      not: () => chain,
      gt: () => chain,
      lt: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: (await resolve()).data[0] ?? null, error: null }),
      then: (ok, no) => resolve().then(ok, no),
      insert: (row) => ({
        select: () => ({
          maybeSingle: async () => {
            const clash = db.attempts.find((a) => a.user_id === row.user_id
              && a.kc_id === row.kc_id && a.submitted_at == null);
            if (clash) {
              return { data: null, error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "check_attempt_one_live_idx"',
              } };
            }
            const created = { id: `att-${db.attempts.length + 1}`, score: null, submitted_at: null, ...row };
            db.attempts.push(created);
            return { data: { id: created.id }, error: null };
          },
        }),
      }),
    };
    return chain;
  };

  const svc = {
    from,
    async rpc(name, params) {
      db.rpcCalls.push({ name, params });
      if (name !== 'expire_stale_check_attempts') return { data: null, error: null };
      let n = 0;
      for (const a of db.attempts) {
        if (a.user_id === params.p_user && a.kc_id === params.p_kc
          && a.submitted_at == null && new Date(a.expires_at).getTime() <= db.now) {
          a.submitted_at = a.expires_at;
          n += 1;
        }
      }
      return { data: n, error: null };
    },
  };
  return { svc, db };
}

// ── The invariant that must NOT change ──────────────────────────────────────

test('a live attempt is resumed, never duplicated', async () => {
  const { svc, db } = fakeDb({ attempts: [attempt()] });
  const r = await issueCheck(svc, USER, KC, { now: NOW });

  assert.equal(r.resumed, true);
  assert.equal(r.attemptId, 'att-old', 'the learner gets their own check back');
  assert.deepEqual(r.items.map((i) => i.id), ['item-a', 'item-b', 'item-c'], 'and the same items');
  assert.equal(db.attempts.length, 1, 'stockpiling attempts must stay impossible');
  assert.equal(db.rpcCalls.length, 0, 'a live attempt is not something to expire');
  assert.ok(r.items.every((i) => !('answer_spec' in i)), 'answer keys never leave the server');
});

// ── H18: the lockout ────────────────────────────────────────────────────────

test('an abandoned attempt past its TTL is retired, and a fresh check is issued', async () => {
  // Issued 90 minutes ago, TTL is 60: the learner closed the tab. Before the
  // fix this threw for the rest of time.
  const stale = attempt({ expires_at: new Date(NOW - 30 * 60000).toISOString() });
  const { svc, db } = fakeDb({ attempts: [stale] });

  const r = await issueCheck(svc, USER, KC, { now: NOW });

  assert.ok(r.attemptId, 'the learner gets a check');
  assert.notEqual(r.attemptId, 'att-old', 'a NEW one — the lapsed attempt is not resumable');
  assert.ok(!r.resumed);
  assert.equal(r.items.length, 3);

  const retired = db.attempts.find((a) => a.id === 'att-old');
  assert.equal(retired.submitted_at, stale.expires_at,
    'the abandoned row is stamped at its expiry, not at now — history stays honest');
  assert.equal(retired.score, null,
    'a null score is what distinguishes an abandoned attempt from a graded one');
  assert.equal(db.attempts.filter((a) => a.submitted_at == null).length, 1,
    '0030s index still holds: exactly one live attempt');
  assert.deepEqual(db.rpcCalls.map((c) => c.name), ['expire_stale_check_attempts']);
  assert.deepEqual(db.rpcCalls[0].params, { p_user: USER, p_kc: KC },
    'the expiry predicate lives in the database, next to the index it must agree with');
});

test('and it keeps working — the second abandoned check does not lock them out either', async () => {
  const { svc, db } = fakeDb({ attempts: [attempt({ expires_at: new Date(NOW - 30 * 60000).toISOString() })] });
  await issueCheck(svc, USER, KC, { now: NOW });
  // Abandon the replacement too, then come back two hours later.
  const later = NOW + 2 * HOUR;
  db.now = later;
  const r = await issueCheck(svc, USER, KC, { now: later });
  assert.ok(r.attemptId && !r.resumed);
  assert.equal(db.attempts.length, 3, 'three issues, three rows, no error');
});

test('the ordinary path costs no extra round trip', async () => {
  const { svc, db } = fakeDb();
  const r = await issueCheck(svc, USER, KC, { now: NOW });
  assert.ok(r.attemptId);
  assert.equal(db.rpcCalls.length, 0, 'nothing outstanding means nothing to sweep');
});

test('a collision from a concurrent issue resumes the winner instead of throwing', async () => {
  // The hostile interleaving the index exists for: two requests for the same KC
  // read "nothing outstanding", and one of them writes first.
  const { svc, db } = fakeDb();
  db.onAttemptRead = () => { db.attempts.push(attempt({ id: 'att-theirs' })); };

  const r = await issueCheck(svc, USER, KC, { now: NOW });

  assert.equal(r.resumed, true);
  assert.equal(r.attemptId, 'att-theirs', 'one live attempt per KC — serve the one that exists');
  assert.equal(db.attempts.filter((a) => a.submitted_at == null).length, 1);
});

test('a lapsed attempt whose items were retired lapses rather than serving an empty check', async () => {
  const { svc } = fakeDb({ attempts: [attempt({ item_ids: ['gone-1', 'gone-2'] })] });
  const r = await issueCheck(svc, USER, KC, { now: NOW });
  assert.equal(r.notYet, true);
  assert.equal(r.availableAt, attempt().expires_at);
});

// ── The two halves, pinned where they have to agree ─────────────────────────

test('the resume read does NOT filter on expiry — that filter WAS the bug', () => {
  const fn = src('lib/engine/check.js');
  const read = fn.slice(fn.indexOf('async function outstandingAttempt'), fn.indexOf('async function resumeAttempt'));
  assert.ok(/\.is\('submitted_at', null\)/.test(read),
    'it must read exactly what the unique index is predicated on');
  assert.ok(!/\.(gt|lt)\('expires_at'/.test(read),
    'an expired row still occupies the index; filtering it out in SQL is how the learner got locked out');
});

test('0030 keeps its expiry-free index and 0031 supplies the expiry half', () => {
  assert.ok(/create unique index if not exists check_attempt_one_live_idx[\s\S]*?where submitted_at is null/i.test(sql0030));
  assert.ok(/create or replace function expire_stale_check_attempts\(p_user uuid, p_kc uuid\)/i.test(sql0031));
  assert.ok(/set submitted_at = expires_at[\s\S]*?and expires_at <= now\(\)/i.test(sql0031),
    'stamping at the expiry (not at now) is what keeps the abandoned row honest');
  assert.ok(/grant execute on function expire_stale_check_attempts\(uuid, uuid\) to service_role/i.test(sql0031),
    'the engine calls it with the service role and nothing else may');
});
