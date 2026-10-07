/**
 * Per-session cost ceiling and per-learner daily cap (spec R9, §8.6).
 *
 * Pure and synchronous: no I/O, no clock of its own. The orchestrator asks
 * `canSpend` before a priced hop starts and calls `record` after the provider
 * has charged for it. Persistence of the running totals is the usage ledger's
 * job (`lib/server/usage-storage.ts`); this module is the decision.
 */
import { COST } from '@/kaizen.config';

export type BudgetKind = 'llm' | 'tts' | 'asr' | 'vision';

export interface BudgetLine {
  kind: BudgetKind;
  cents: number;
  /** Epoch milliseconds. */
  at: number;
  /** Free-form attribution, e.g. the `source` passed to callLLM. */
  label?: string;
}

export class SessionCostCeilingExceeded extends Error {
  readonly code = 'SESSION_COST_CEILING' as const;

  constructor(
    readonly spentCents: number,
    readonly ceilingCents: number,
  ) {
    super(
      `Session cost ${spentCents}¢ exceeds the ceiling of ${ceilingCents}¢; the session must stop.`,
    );
    this.name = 'SessionCostCeilingExceeded';
  }
}

export class DailyCapExceeded extends Error {
  readonly code = 'DAILY_CAP' as const;

  constructor(
    readonly learnerId: string,
    readonly spentCents: number,
    readonly capCents: number,
  ) {
    super(`Learner ${learnerId} has spent ${spentCents}¢ today against a cap of ${capCents}¢.`);
    this.name = 'DailyCapExceeded';
  }
}

function assertCents(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${what} must be a finite, non-negative number of cents; got ${value}`);
  }
}

export class SessionBudget {
  readonly ceilingCents: number;
  private readonly lines: BudgetLine[] = [];

  constructor(options: { ceilingCents?: number } = {}) {
    const ceiling = options.ceilingCents ?? COST.hardCeilingCentsPerSession;
    assertCents(ceiling, 'ceilingCents');
    if (ceiling === 0) throw new RangeError('ceilingCents must be greater than zero');
    this.ceilingCents = ceiling;
  }

  get spentCents(): number {
    return this.lines.reduce((sum, line) => sum + line.cents, 0);
  }

  get remainingCents(): number {
    return Math.max(0, this.ceilingCents - this.spentCents);
  }

  /** True when a hop expected to cost `cents` can start without crossing the ceiling. */
  canSpend(cents: number): boolean {
    assertCents(cents, 'cents');
    return this.spentCents + cents <= this.ceilingCents;
  }

  /**
   * Record a charge that already happened. The line is kept even when it
   * crosses the ceiling, because the provider has already billed it; the
   * thrown error is the signal to end the session.
   */
  record(line: Omit<BudgetLine, 'at'> & { at?: number }): void {
    assertCents(line.cents, 'cents');
    this.lines.push({ ...line, at: line.at ?? Date.now() });
    if (this.spentCents > this.ceilingCents) {
      throw new SessionCostCeilingExceeded(this.spentCents, this.ceilingCents);
    }
  }

  breakdown(): Record<BudgetKind, number> {
    const totals: Record<BudgetKind, number> = { llm: 0, tts: 0, asr: 0, vision: 0 };
    for (const line of this.lines) totals[line.kind] += line.cents;
    return totals;
  }

  snapshot(): readonly BudgetLine[] {
    return [...this.lines];
  }
}

function utcDayKey(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Per-learner daily cap, in memory. Days roll over at 00:00 UTC. Callers
 * restore state from the usage ledger with `seed` at process start.
 */
export class DailyCap {
  readonly capCents: number;
  private readonly now: () => number;
  private readonly spent = new Map<string, { day: string; cents: number }>();

  constructor(options: { capCents: number; now?: () => number }) {
    assertCents(options.capCents, 'capCents');
    if (options.capCents === 0) throw new RangeError('capCents must be greater than zero');
    this.capCents = options.capCents;
    this.now = options.now ?? Date.now;
  }

  spentToday(learnerId: string): number {
    const entry = this.spent.get(learnerId);
    if (!entry || entry.day !== utcDayKey(this.now())) return 0;
    return entry.cents;
  }

  canSpend(learnerId: string, cents: number): boolean {
    assertCents(cents, 'cents');
    return this.spentToday(learnerId) + cents <= this.capCents;
  }

  seed(learnerId: string, cents: number): void {
    assertCents(cents, 'cents');
    this.spent.set(learnerId, { day: utcDayKey(this.now()), cents });
  }

  record(learnerId: string, cents: number): void {
    assertCents(cents, 'cents');
    const today = utcDayKey(this.now());
    const entry = this.spent.get(learnerId);
    const total = (entry && entry.day === today ? entry.cents : 0) + cents;
    this.spent.set(learnerId, { day: today, cents: total });
    if (total > this.capCents) {
      throw new DailyCapExceeded(learnerId, total, this.capCents);
    }
  }
}
