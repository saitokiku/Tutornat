/**
 * The weekly metrics board (release checklist "Evidence and numbers"): the
 * same columns every week, every rate with its denominator in words, an empty
 * denominator a dash that says so, a missing table "not provisioned" rather
 * than a zero, and no number typed anywhere.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PLAN } from '@/kaizen.config';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import {
  buildBoard,
  isoWeekLabel,
  rate,
  readBoardInput,
  renderBoard,
  reportedWeeks,
  trend,
  type BoardInput,
} from '@/lib/tutor/metrics/board';

import { testDb } from './_db';

/** A Monday: the reported week is 31 August to 7 September. */
const NOW = new Date('2026-09-07T09:00:00Z');

let db: TutorDb;

beforeAll(async () => {
  db = await testDb();
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
});

describe('the arithmetic', () => {
  it('names the week and its predecessor', () => {
    const weeks = reportedWeeks(NOW);
    expect(weeks.current.from.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(weeks.current.to.toISOString()).toBe('2026-09-07T00:00:00.000Z');
    expect(weeks.current.isoWeek).toBe('2026-W36');
    expect(weeks.previous.isoWeek).toBe('2026-W35');
    expect(isoWeekLabel(new Date('2026-12-28T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeekLabel(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01');
  });

  it('spells the denominator out and never prints 0% for nobody', () => {
    expect(rate(3, 12, 'accounts created this week')).toMatchObject({
      pct: 25,
      display: '25%',
      basis: '3 of 12 accounts created this week',
    });
    expect(rate(0, 0, 'accounts created this week')).toMatchObject({
      pct: null,
      display: '—',
      basis: 'no accounts created this week yet',
    });
  });

  it('has no percentage for growth from nothing', () => {
    expect(trend(3, 0)).toMatchObject({
      delta: 3,
      changePct: null,
      label: 'up 3 from 0 the week before',
    });
    expect(trend(4, 8).label).toBe('down 4 (-50%) from 8 the week before');
    expect(trend(5, 5).label).toBe('level with 5 the week before');
    expect(trend(2, null).label).toBe('no comparable prior week');
  });
});

describe('the board on the tables', () => {
  it('renders designed zero states on an empty database, with every table read', async () => {
    const input = await readBoardInput(db, NOW);
    expect(Object.values(input.perTable).every((read) => read.status === 'ok')).toBe(true);
    const rows = buildBoard(input);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.signups).toMatchObject({ display: '0', trend: 'level with 0 the week before' });
    expect(byKey.activation).toMatchObject({ display: '—' });
    expect(byKey.activation!.basis).toMatch(/^no accounts created this week/);
    expect(byKey.thumbs).toMatchObject({ display: '—', basis: 'no sessions rated this week yet' });
    expect(byKey.cost_per_session).toMatchObject({
      display: '—',
      basis: 'no sessions this week yet',
    });
    expect(byKey.mrr).toMatchObject({
      display: '$0',
      basis: `0 paying accounts at $${PLAN.priceCentsMonthly / 100} a month`,
    });
    expect(byKey.gross_margin).toMatchObject({ display: '—', basis: 'no revenue yet' });
    expect(byKey.d7!.display).toBe('—');
    expect(byKey.recoveries).toMatchObject({
      display: '0',
      basis: 'none; the camera is off until Gate 2',
    });
    const markdown = renderBoard(input, rows, { generatedAt: NOW, source: 'test' });
    expect(markdown).toContain('# Metrics 2026-W36');
    expect(markdown).toContain('All 7 tables read.');
    expect(markdown).not.toMatch(/\b0%/);
  });

  it('counts a seeded week and compares it with the one before', async () => {
    const accounts = [
      ['acc_m1', 'm1@example.com', '2026-09-01T10:00:00Z'],
      ['acc_m2', 'm2@example.com', '2026-09-02T10:00:00Z'],
      ['acc_m3', 'm3@example.com', '2026-08-25T10:00:00Z'],
    ] as const;
    for (const [id, email, created] of accounts) {
      await db.query(
        `INSERT INTO accounts (id, email, display_name, password_hash, created_at) VALUES ($1, $2, 'M', 'x', $3)`,
        [id, email, created],
      );
      await db.query(
        `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, kind, created_at) VALUES ($1, $2, 'L', 2012, '13-17', 'teen', $3)`,
        [`lrn_${id}`, id, created],
      );
    }
    const sessions = [
      ['ses_m1a', 'acc_m1', '2026-09-01T18:00:00Z', 25, 'up'],
      ['ses_m1b', 'acc_m1', '2026-09-03T18:00:00Z', 20, null],
      ['ses_m3a', 'acc_m3', '2026-08-26T18:00:00Z', 25, 'down'],
      ['ses_m3b', 'acc_m3', '2026-09-04T18:00:00Z', 30, 'up'],
    ] as const;
    for (const [id, account, started, minutes, thumbs] of sessions) {
      await db.query(
        `INSERT INTO sessions (id, account_id, learner_id, started_at, ended_at, minutes, mode, phase, thumbs) VALUES ($1, $2, $3, $4, $4, $5, 'text', 'ended', $6)`,
        [id, account, `lrn_${account}`, started, minutes, thumbs],
      );
    }
    await db.query(
      `INSERT INTO usage_ledger (id, account_id, learner_id, session_id, kind, cents, ts) VALUES
       ('usg_1', 'acc_m1', 'lrn_acc_m1', 'ses_m1a', 'llm', 40, '2026-09-01T18:05:00Z'),
       ('usg_2', 'acc_m1', 'lrn_acc_m1', 'ses_m1b', 'llm', 20, '2026-09-03T18:05:00Z'),
       ('usg_3', 'acc_m3', 'lrn_acc_m3', 'ses_m3b', 'tts', 30, '2026-09-04T18:05:00Z')`,
    );
    await db.query(
      `INSERT INTO subscriptions (account_id, status) VALUES ('acc_m3', 'active'), ('acc_m1', 'trial')`,
    );
    await db.query(
      `INSERT INTO evidence_events (id, account_id, learner_id, session_id, type, assisted, payload, ts) VALUES
       ('evd_m1', 'acc_m1', 'lrn_acc_m1', 'ses_m1b', 'mastery_change', false, '{"skillId":"F7","from":"mastered","to":"confirmed"}', '2026-09-03T18:20:00Z'),
       ('evd_m2', 'acc_m3', 'lrn_acc_m3', 'ses_m3b', 'mastery_change', false, '{"skillId":"F1","from":"in_progress","to":"mastered"}', '2026-09-04T18:20:00Z')`,
    );

    const input = await readBoardInput(db, NOW);
    const rows = buildBoard(input);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.signups).toMatchObject({
      display: '2',
      trend: 'up 1 (+100%) from 1 the week before',
    });
    expect(byKey.activation).toMatchObject({
      display: '50%',
      basis: '1 of 2 accounts created this week have started a session so far',
    });
    expect(byKey.active_learners!.display).toBe('2');
    expect(byKey.sessions).toMatchObject({
      display: '3',
      trend: 'up 2 (+200%) from 1 the week before',
    });
    expect(byKey.minutes!.display).toBe('75');
    expect(byKey.thumbs).toMatchObject({
      display: '100%',
      basis: '2 of 2 sessions rated this week',
    });
    expect(byKey.cost_per_session).toMatchObject({
      display: '$0.30',
      basis: '$0.90 of provider spend over 3 sessions',
    });
    expect(byKey.mastery).toMatchObject({
      display: '1',
      basis: 'skills confirmed by an unassisted check, across 1 learner',
    });
    expect(byKey.paying!.display).toBe('1');
    expect(byKey.mrr!.display).toBe(`$${PLAN.priceCentsMonthly / 100}`);
    expect(byKey.trial_to_paid).toMatchObject({
      display: '50%',
      basis: '1 of 2 accounts that have ever started a session',
    });
    expect(byKey.gross_margin!.display).toMatch(/^\d+%$/);
    // m3's first session was 26 August: 12 days before the week ended, so inside the D7 cohort window and retained by its 4 September session.
    expect(byKey.d7).toMatchObject({
      display: '100%',
      basis: '1 of 1 learners whose first session was 7 to 14 days before the week ended',
    });
    expect(byKey.d14!.display).toBe('—');
    expect(byKey.growth!.display).toBe('200%');
  });

  it('reports a table that is not there as not provisioned, never as zero', () => {
    const input: BoardInput = {
      windows: reportedWeeks(NOW),
      current: { status: 'not_provisioned', note: 'table not provisioned' },
      previous: { status: 'not_provisioned', note: 'table not provisioned' },
      payingAccounts: { status: 'ok', value: 0 },
      activatedEver: { status: 'ok', value: 0 },
      d7: { status: 'error', note: 'read failed: Error' },
      d14: { status: 'ok', value: { cohort: 0, retained: 0 } },
      perTable: { sessions: { status: 'not_provisioned', note: 'table not provisioned' } },
    };
    const rows = buildBoard(input);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.sessions).toMatchObject({ status: 'not_provisioned', display: '—' });
    expect(byKey.d7).toMatchObject({ status: 'error' });
    const markdown = renderBoard(input, rows, { generatedAt: NOW, source: 'test' });
    expect(markdown).toContain('| Sessions | — (not provisioned) |');
    expect(markdown).toContain('Tables not readable: sessions (table not provisioned).');
  });
});
