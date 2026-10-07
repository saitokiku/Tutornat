/**
 * The weekly metrics board (release checklist "Evidence and numbers"; the
 * shape ported from Kaizen-AI's funnel board `buildBoard`): the same columns
 * every week, every rate with its denominator in words, a zero designed rather
 * than tolerated, and a table that is not there yet reported as not
 * provisioned rather than as a zero. Every number is computed here from the
 * tables the loop writes; the script that prints the board does no arithmetic.
 *
 * The reported week is the Monday-to-Monday UTC week that ended most recently,
 * the same week the parent's report covers, compared with the week before it.
 */
import { PLAN } from '@/kaizen.config';
import type { Queryable } from '@/lib/tutor/db';
import { weekStartUtc } from '@/lib/tutor/report/parent-report';

export const WEEK_MS = 7 * 24 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
/** Days in an average month, for the one place a monthly figure meets a weekly one. */
const DAYS_PER_MONTH = 30.44;

export interface Window {
  from: Date;
  to: Date;
  /** `2026-W36`: the ISO week of the Monday the window begins on. */
  isoWeek: string;
}

/** ISO week label of a Monday: the year is the ISO year of that week's Thursday. */
export function isoWeekLabel(monday: Date): string {
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const week1Monday = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY_MS;
  const week = Math.floor((monday.getTime() - week1Monday) / WEEK_MS) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function reportedWeeks(now: Date): { current: Window; previous: Window } {
  const to = weekStartUtc(now);
  const from = new Date(to.getTime() - WEEK_MS);
  const previousFrom = new Date(from.getTime() - WEEK_MS);
  return {
    current: { from, to, isoWeek: isoWeekLabel(from) },
    previous: { from: previousFrom, to: from, isoWeek: isoWeekLabel(previousFrom) },
  };
}

// ── Pure arithmetic ──────────────────────────────────────────────────────────

export interface Rate {
  numerator: number;
  denominator: number;
  pct: number | null;
  /** `3 of 12 accounts created this week`, or `no accounts created this week yet`. */
  basis: string;
  /** `25%`, or a dash when the denominator is empty; never `0%` for nobody. */
  display: string;
}

/** One stage-to-stage rate with its denominator spelled out; an empty denominator is a dash that says so. */
export function rate(numerator: number, denominator: number, unit: string): Rate {
  const num = Math.max(0, Math.round(numerator));
  const den = Math.max(0, Math.round(denominator));
  const pct = den ? Math.round((num / den) * 100) : null;
  return {
    numerator: num,
    denominator: den,
    pct,
    basis: den ? `${num} of ${den} ${unit}` : `no ${unit} yet`,
    display: pct === null ? '—' : `${pct}%`,
  };
}

export interface Trend {
  current: number;
  previous: number | null;
  delta: number | null;
  /** Null when the previous figure was zero: growth from nothing has no percentage. */
  changePct: number | null;
  label: string;
}

export function trend(current: number, previous: number | null): Trend {
  const cur = Math.round(current * 100) / 100;
  if (previous === null) {
    return {
      current: cur,
      previous: null,
      delta: null,
      changePct: null,
      label: 'no comparable prior week',
    };
  }
  const prev = Math.round(previous * 100) / 100;
  const delta = Math.round((cur - prev) * 100) / 100;
  const changePct = prev === 0 ? null : Math.round((delta / prev) * 100);
  let label: string;
  if (delta === 0) label = `level with ${prev} the week before`;
  else {
    const pct = changePct === null ? '' : ` (${changePct > 0 ? '+' : ''}${changePct}%)`;
    label = `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}${pct} from ${prev} the week before`;
  }
  return { current: cur, previous: prev, delta, changePct, label };
}

export function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// ── What the tables say ──────────────────────────────────────────────────────

export type ReadStatus = 'ok' | 'not_provisioned' | 'error';

/** One read, guarded: a table that is not there is a build state, any other failure is a failure, neither is a zero. */
export type Read<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_provisioned' | 'error'; note: string };

export function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);
  return code === '42P01' || /relation "[^"]*" does not exist/i.test(message);
}

async function read<T>(body: () => Promise<T>): Promise<Read<T>> {
  try {
    return { status: 'ok', value: await body() };
  } catch (error) {
    if (isMissingTable(error)) return { status: 'not_provisioned', note: 'table not provisioned' };
    return {
      status: 'error',
      note: `read failed: ${error instanceof Error ? error.name : 'error'}`,
    };
  }
}

export interface WeekCounts {
  signups: number;
  activated: number;
  activeLearners: number;
  sessions: number;
  minutes: number;
  thumbsUp: number;
  thumbsAny: number;
  costCents: number;
  confirmedChanges: number;
  confirmedLearners: number;
  recoveries: number;
}

export interface Retention {
  cohort: number;
  retained: number;
}

export interface BoardInput {
  windows: { current: Window; previous: Window };
  current: Read<WeekCounts>;
  previous: Read<WeekCounts>;
  payingAccounts: Read<number>;
  activatedEver: Read<number>;
  d7: Read<Retention>;
  d14: Read<Retention>;
  /** Rows read per table so a missing one is reported by name. */
  perTable: Record<string, Read<number>>;
}

interface CountRow extends Record<string, unknown> {
  n: number | string;
}

const n = (rows: CountRow[]): number => Number(rows[0]?.n ?? 0);

async function weekCounts(db: Queryable, window: Window): Promise<WeekCounts> {
  // One query at a time: a Monday script has no first-audio budget, and a
  // pooled database (or the single-connection PGlite behind `pnpm dev:db`)
  // is happier with a queue than with sixteen concurrent reads.
  const params = [window.from, window.to];
  const signups = await db.query<CountRow>(
    `SELECT count(*)::int AS n FROM accounts WHERE created_at >= $1 AND created_at < $2`,
    params,
  );
  const activated = await db.query<CountRow>(
    `SELECT count(DISTINCT a.id)::int AS n FROM accounts a
     JOIN sessions s ON s.account_id = a.id
     WHERE a.created_at >= $1 AND a.created_at < $2`,
    params,
  );
  const active = await db.query<CountRow>(
    `SELECT count(DISTINCT learner_id)::int AS n FROM sessions WHERE started_at >= $1 AND started_at < $2`,
    params,
  );
  const sessions = await db.query<{ n: number | string; minutes: number | string }>(
    `SELECT count(*)::int AS n, COALESCE(sum(minutes), 0)::int AS minutes
     FROM sessions WHERE started_at >= $1 AND started_at < $2`,
    params,
  );
  const thumbs = await db.query<{ up: number | string; any: number | string }>(
    `SELECT count(*) FILTER (WHERE thumbs = 'up')::int AS up,
            count(*) FILTER (WHERE thumbs IS NOT NULL)::int AS any
     FROM sessions WHERE started_at >= $1 AND started_at < $2`,
    params,
  );
  const cost = await db.query<CountRow>(
    `SELECT COALESCE(sum(u.cents), 0)::int AS n FROM usage_ledger u
     JOIN sessions s ON s.id = u.session_id
     WHERE s.started_at >= $1 AND s.started_at < $2`,
    params,
  );
  const confirmed = await db.query<{ n: number | string; learners: number | string }>(
    `SELECT count(*)::int AS n, count(DISTINCT learner_id)::int AS learners
     FROM evidence_events
     WHERE type = 'mastery_change' AND payload->>'to' = 'confirmed' AND ts >= $1 AND ts < $2`,
    params,
  );
  const recoveries = await db.query<CountRow>(
    `SELECT COALESCE(sum(a.recoveries), 0)::int AS n FROM attention_stats a
     JOIN sessions s ON s.id = a.session_id
     WHERE s.started_at >= $1 AND s.started_at < $2`,
    params,
  );
  return {
    signups: n(signups.rows),
    activated: n(activated.rows),
    activeLearners: n(active.rows),
    sessions: Number(sessions.rows[0]?.n ?? 0),
    minutes: Number(sessions.rows[0]?.minutes ?? 0),
    thumbsUp: Number(thumbs.rows[0]?.up ?? 0),
    thumbsAny: Number(thumbs.rows[0]?.any ?? 0),
    costCents: n(cost.rows),
    confirmedChanges: Number(confirmed.rows[0]?.n ?? 0),
    confirmedLearners: Number(confirmed.rows[0]?.learners ?? 0),
    recoveries: n(recoveries.rows),
  };
}

/**
 * Learners whose first session fell in a window that ended `days` before the
 * reported week's end, so every one of them has had `days` days to come back;
 * retained means a session at least `days` days after the first.
 */
async function retention(db: Queryable, to: Date, days: number): Promise<Retention> {
  const cohortTo = new Date(to.getTime() - days * DAY_MS);
  const cohortFrom = new Date(cohortTo.getTime() - WEEK_MS);
  const { rows } = await db.query<{ cohort: number | string; retained: number | string }>(
    `WITH first AS (
       SELECT learner_id, min(started_at) AS first_at FROM sessions GROUP BY learner_id
     )
     SELECT count(*)::int AS cohort,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM sessions s
              WHERE s.learner_id = f.learner_id AND s.started_at >= f.first_at + ($3::int * interval '1 day')
            ))::int AS retained
     FROM first f WHERE f.first_at >= $1 AND f.first_at < $2`,
    [cohortFrom, cohortTo, days],
  );
  return { cohort: Number(rows[0]?.cohort ?? 0), retained: Number(rows[0]?.retained ?? 0) };
}

const TABLES = [
  'accounts',
  'learners',
  'sessions',
  'subscriptions',
  'usage_ledger',
  'evidence_events',
  'attention_stats',
] as const;

export async function readBoardInput(db: Queryable, now: Date): Promise<BoardInput> {
  const windows = reportedWeeks(now);
  const perTable: Record<string, Read<number>> = {};
  for (const table of TABLES) {
    perTable[table] = await read(async () => {
      const { rows } = await db.query<CountRow>(`SELECT count(*)::int AS n FROM ${table}`);
      return n(rows);
    });
  }
  const current = await read(() => weekCounts(db, windows.current));
  const previous = await read(() => weekCounts(db, windows.previous));
  const payingAccounts = await read(async () => {
    const { rows } = await db.query<CountRow>(
      `SELECT count(*)::int AS n FROM subscriptions WHERE status = 'active'`,
    );
    return n(rows);
  });
  const activatedEver = await read(async () => {
    const { rows } = await db.query<CountRow>(
      `SELECT count(DISTINCT account_id)::int AS n FROM sessions`,
    );
    return n(rows);
  });
  const d7 = await read(() => retention(db, windows.current.to, 7));
  const d14 = await read(() => retention(db, windows.current.to, 14));
  return { windows, current, previous, payingAccounts, activatedEver, d7, d14, perTable };
}

// ── The board ────────────────────────────────────────────────────────────────

export interface BoardRow {
  key: string;
  label: string;
  status: ReadStatus;
  display: string;
  /** The population or the definition, in words; the number is never alone. */
  basis: string;
  trend: string | null;
}

function faulted(
  key: string,
  label: string,
  read: { status: 'not_provisioned' | 'error'; note: string },
): BoardRow {
  return { key, label, status: read.status, display: '—', basis: read.note, trend: null };
}

function counted(
  key: string,
  label: string,
  current: number,
  previous: number | null,
  unit: string,
): BoardRow {
  const t = trend(current, previous);
  return {
    key,
    label,
    status: 'ok',
    display: String(t.current),
    basis: `${unit} in the week`,
    trend: t.label,
  };
}

function rated(key: string, label: string, r: Rate, trendLabel: string | null = null): BoardRow {
  return { key, label, status: 'ok', display: r.display, basis: r.basis, trend: trendLabel };
}

/** PURE: the arithmetic behind every row, so a test pins it without a database. */
export function buildBoard(input: BoardInput): BoardRow[] {
  const rows: BoardRow[] = [];
  const cur = input.current;
  const prev = input.previous.status === 'ok' ? input.previous.value : null;
  if (cur.status !== 'ok') {
    for (const [key, label] of [
      ['signups', 'Sign-ups'],
      ['activation', 'Activation'],
      ['active_learners', 'Weekly active learners'],
      ['sessions', 'Sessions'],
      ['minutes', 'Minutes'],
      ['thumbs', 'Thumbs up'],
      ['cost_per_session', 'Cost per session'],
      ['mastery', 'Skills confirmed'],
      ['recoveries', 'Attention recoveries'],
    ] as const) {
      rows.push(faulted(key, label, cur));
    }
  } else {
    const c = cur.value;
    rows.push(counted('signups', 'Sign-ups', c.signups, prev?.signups ?? null, 'accounts created'));
    const activation = rate(c.activated, c.signups, 'accounts created this week');
    rows.push({
      key: 'activation',
      label: 'Activation',
      status: 'ok',
      display: activation.display,
      basis: c.signups ? `${activation.basis} have started a session so far` : activation.basis,
      trend: null,
    });
    rows.push(
      counted(
        'active_learners',
        'Weekly active learners',
        c.activeLearners,
        prev?.activeLearners ?? null,
        'distinct learners with a session',
      ),
    );
    rows.push(
      counted('sessions', 'Sessions', c.sessions, prev?.sessions ?? null, 'sessions started'),
    );
    rows.push(
      counted('minutes', 'Minutes', c.minutes, prev?.minutes ?? null, 'tutoring minutes metered'),
    );
    rows.push(
      rated('thumbs', 'Thumbs up', rate(c.thumbsUp, c.thumbsAny, 'sessions rated this week')),
    );
    const costPerSession = c.sessions ? Math.round(c.costCents / c.sessions) : null;
    const prevCost = prev && prev.sessions ? Math.round(prev.costCents / prev.sessions) : null;
    rows.push({
      key: 'cost_per_session',
      label: 'Cost per session',
      status: 'ok',
      display: costPerSession === null ? '—' : dollars(costPerSession),
      basis: c.sessions
        ? `${dollars(c.costCents)} of provider spend over ${c.sessions} ${c.sessions === 1 ? 'session' : 'sessions'}`
        : 'no sessions this week yet',
      trend:
        costPerSession !== null && prevCost !== null ? trend(costPerSession, prevCost).label : null,
    });
    rows.push({
      key: 'mastery',
      label: 'Skills confirmed',
      status: 'ok',
      display: String(c.confirmedChanges),
      basis: c.confirmedChanges
        ? `skills confirmed by an unassisted check, across ${c.confirmedLearners} ${c.confirmedLearners === 1 ? 'learner' : 'learners'}`
        : 'no skill was confirmed this week',
      trend: trend(c.confirmedChanges, prev?.confirmedChanges ?? null).label,
    });
    rows.push({
      key: 'recoveries',
      label: 'Attention recoveries',
      status: 'ok',
      display: String(c.recoveries),
      basis: c.recoveries
        ? 'recoveries recorded by the attention ladder'
        : 'none; the camera is off until Gate 2',
      trend: null,
    });
  }

  // Money: stocks at report time, so they carry no week-over-week line.
  if (input.payingAccounts.status !== 'ok') {
    rows.push(faulted('paying', 'Paying accounts', input.payingAccounts));
    rows.push(faulted('mrr', 'MRR', input.payingAccounts));
    rows.push(faulted('trial_to_paid', 'Trial to paid', input.payingAccounts));
    rows.push(faulted('gross_margin', 'Gross margin', input.payingAccounts));
  } else {
    const paying = input.payingAccounts.value;
    const mrrCents = paying * PLAN.priceCentsMonthly;
    rows.push({
      key: 'paying',
      label: 'Paying accounts',
      status: 'ok',
      display: String(paying),
      basis: 'subscriptions active at report time',
      trend: null,
    });
    rows.push({
      key: 'mrr',
      label: 'MRR',
      status: 'ok',
      display: dollars(mrrCents),
      basis: `${paying} paying ${paying === 1 ? 'account' : 'accounts'} at ${dollars(PLAN.priceCentsMonthly)} a month`,
      trend: null,
    });
    if (input.activatedEver.status !== 'ok') {
      rows.push(faulted('trial_to_paid', 'Trial to paid', input.activatedEver));
    } else {
      rows.push(
        rated(
          'trial_to_paid',
          'Trial to paid',
          rate(paying, input.activatedEver.value, 'accounts that have ever started a session'),
        ),
      );
    }
    const weeklyRevenueCents = Math.round((mrrCents * 7) / DAYS_PER_MONTH);
    const weeklyCostCents = cur.status === 'ok' ? cur.value.costCents : null;
    if (weeklyRevenueCents === 0 || weeklyCostCents === null) {
      rows.push({
        key: 'gross_margin',
        label: 'Gross margin',
        status: 'ok',
        display: '—',
        basis: weeklyRevenueCents === 0 ? 'no revenue yet' : 'provider spend could not be read',
        trend: null,
      });
    } else {
      const marginPct = Math.round(
        ((weeklyRevenueCents - weeklyCostCents) / weeklyRevenueCents) * 100,
      );
      rows.push({
        key: 'gross_margin',
        label: 'Gross margin',
        status: 'ok',
        display: `${marginPct}%`,
        basis: `${dollars(weeklyRevenueCents)} of MRR falling in the week against ${dollars(weeklyCostCents)} of provider spend`,
        trend: null,
      });
    }
  }

  for (const [key, label, days, r] of [
    ['d7', 'D7 retention', 7, input.d7],
    ['d14', 'D14 retention', 14, input.d14],
  ] as const) {
    if (r.status !== 'ok') rows.push(faulted(key, label, r));
    else
      rows.push(
        rated(
          key,
          label,
          rate(
            r.value.retained,
            r.value.cohort,
            `learners whose first session was ${days} to ${days + 7} days before the week ended`,
          ),
        ),
      );
  }

  // Growth, from the two flows a funnel is judged by.
  if (cur.status === 'ok' && prev) {
    rows.push({
      key: 'growth',
      label: 'Week-over-week growth',
      status: 'ok',
      display:
        trend(cur.value.sessions, prev.sessions).changePct === null
          ? '—'
          : `${trend(cur.value.sessions, prev.sessions).changePct}%`,
      basis: `sessions: ${trend(cur.value.sessions, prev.sessions).label}; sign-ups: ${trend(cur.value.signups, prev.signups).label}`,
      trend: null,
    });
  }
  return rows;
}

export interface BoardMeta {
  generatedAt: Date;
  /** The database host only, never the connection string. */
  source: string;
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

/** The Markdown file under docs/metrics/: the same columns every week. */
export function renderBoard(input: BoardInput, rows: BoardRow[], meta: BoardMeta): string {
  const { current, previous } = input.windows;
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const lines: string[] = [
    `# Metrics ${current.isoWeek}`,
    '',
    `Week of ${day(current.from)} (Monday 00:00 UTC) to ${day(current.to)}, compared with ${previous.isoWeek}. Generated ${meta.generatedAt.toISOString()} from ${meta.source} by \`scripts/metrics-report.ts\`; every number computed from the tables, none typed. A dash is an empty denominator, said in words beside it; "not provisioned" is a table that does not exist yet, which is not the same as nobody.`,
    '',
    '| Metric | This week | Basis | Against last week |',
    '| --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const display = row.status === 'ok' ? row.display : `— (${row.status.replace('_', ' ')})`;
    lines.push(
      `| ${cell(row.label)} | ${cell(display)} | ${cell(row.basis)} | ${cell(row.trend ?? '—')} |`,
    );
  }
  const missing = Object.entries(input.perTable)
    .filter(([, r]) => r.status !== 'ok')
    .map(([table, r]) => `${table} (${r.status === 'ok' ? '' : r.note})`);
  lines.push('');
  lines.push(
    missing.length
      ? `Tables not readable: ${missing.join(', ')}.`
      : `All ${Object.keys(input.perTable).length} tables read.`,
  );
  lines.push('');
  lines.push(
    'Definitions: activation counts accounts created in the week that have started a session by report time; D7 and D14 take learners whose first session fell in the week ending 7 (14) days before this week ended, so each had the full interval to return; cost is the usage ledger for sessions started in the week; MRR is active subscriptions at report time times the one plan price; gross margin sets the MRR falling in seven days against that cost.',
  );
  return `${lines.join('\n')}\n`;
}
