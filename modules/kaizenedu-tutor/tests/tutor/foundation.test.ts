import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/lib/tutor/auth/password';
import { resolvePrincipal } from '@/lib/tutor/auth/principal';
import { createAuthSession, hashToken, setSessionLearner } from '@/lib/tutor/auth/session';
import { setTutorDbForTests, TUTOR_TABLES, type TutorDb } from '@/lib/tutor/db';

import { testDb } from './_db';

let db: TutorDb;

beforeAll(async () => {
  db = await testDb();
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
});

describe('product schema', () => {
  it('provisions every product table idempotently', async () => {
    const { rows } = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = new Set(rows.map((row) => row.table_name));
    for (const table of TUTOR_TABLES) expect(names.has(table), table).toBe(true);
    const { ensureTutorSchema } = await import('@/lib/tutor/db');
    await expect(ensureTutorSchema(db)).resolves.toBeUndefined();
  });

  it('no product table has an audio, frame, landmark, embedding, or template column (invariants b, c)', async () => {
    const { rows } = await db.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
    );
    // Durations and counts (audio_ms, attending_pct) are fine; bytes, urls, and paths are not.
    const offenders = rows.filter(
      (row) =>
        (TUTOR_TABLES as readonly string[]).includes(row.table_name) &&
        !/_(ms|pct|count|seconds)$/.test(row.column_name) &&
        /audio|frame|landmark|embedding|template|face|image|photo|blob|snapshot/i.test(
          row.column_name,
        ),
    );
    expect(offenders).toEqual([]);
  });

  it('seeds fail-closed settings shut', async () => {
    const { rows } = await db.query<{ key: string; value: boolean }>(
      `SELECT key, value FROM app_settings ORDER BY key`,
    );
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    expect(map.under13_gate).toBe(false);
    expect(map.camera_sensing_enabled).toBe(false);
    expect(map.ai_kill_switch).toBe(false);
  });

  it('evidence_events refuses UPDATE and DELETE (strategy law 1: corrections are new rows)', async () => {
    await db.query(
      `INSERT INTO accounts (id, email, display_name, password_hash) VALUES ('acc_1', 'a@example.com', 'A', 'x')`,
    );
    await db.query(
      `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, kind) VALUES ('lrn_1', 'acc_1', 'Maya', 2016, '9-12', 'child')`,
    );
    await db.query(
      `INSERT INTO evidence_events (id, account_id, learner_id, type, assisted, payload) VALUES ('ev_1', 'acc_1', 'lrn_1', 'check_result', false, '{"correct": true}')`,
    );
    await expect(
      db.query(`UPDATE evidence_events SET assisted = true WHERE id = 'ev_1'`),
    ).rejects.toThrow(/append-only/);
    await expect(db.query(`DELETE FROM evidence_events WHERE id = 'ev_1'`)).rejects.toThrow(
      /append-only/,
    );
    const { rows } = await db.query<{ n: string | number }>(
      `SELECT count(*)::int AS n FROM evidence_events`,
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });
});

describe('passwords and sessions', () => {
  it('hashes with scrypt and verifies in constant time', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('wrong horse battery', stored)).toBe(false);
    await expect(hashPassword('short')).rejects.toThrow(RangeError);
  });

  it('resolves a principal from the cookie and re-checks learner ownership', async () => {
    const { token, sessionId } = await createAuthSession(db, {
      accountId: 'acc_1',
      learnerId: null,
      role: 'parent',
    });
    const headers = new Headers({ cookie: `nt_session=${token}` });
    const parent = await resolvePrincipal(headers, db);
    expect(parent).toMatchObject({ accountId: 'acc_1', learnerId: null, role: 'parent' });

    await setSessionLearner(db, sessionId, 'lrn_1', 'learner');
    const learner = await resolvePrincipal(headers, db);
    expect(learner).toMatchObject({ accountId: 'acc_1', learnerId: 'lrn_1', band: '9-12' });

    // A learner id from another account never resolves, even if written into the session row.
    await db.query(
      `INSERT INTO accounts (id, email, display_name, password_hash) VALUES ('acc_2', 'b@example.com', 'B', 'x')`,
    );
    await db.query(
      `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, kind) VALUES ('lrn_2', 'acc_2', 'Sam', 2011, '13-17', 'teen')`,
    );
    await setSessionLearner(db, sessionId, 'lrn_2', 'learner');
    const crossed = await resolvePrincipal(headers, db);
    expect(crossed?.learnerId).toBeNull();

    expect(
      await resolvePrincipal(new Headers({ cookie: `nt_session=${hashToken('nope')}` }), db),
    ).toBeNull();
  });
});
