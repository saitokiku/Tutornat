/**
 * Invariant (d): every session has a cost ceiling and every learner a daily
 * cap (CLAUDE.md; spec R9, §8.6). The decision module is unit-tested here;
 * guard-25 wires it into the orchestrator and adds the runtime test that
 * drives a session past the ceiling.
 */
import { describe, expect, it } from 'vitest';

import { COST, LATENCY, PLAN } from '@/kaizen.config';
import {
  DailyCap,
  DailyCapExceeded,
  SessionBudget,
  SessionCostCeilingExceeded,
} from '@/lib/tutor/cost/ceiling';
import { isTutorLlmSource, TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';

import { grepFiles, listFiles } from './_helpers';

describe('invariant (d): spec budgets are configured', () => {
  it('the per-session hard ceiling is $3.00 and above the $1.20 target', () => {
    expect(COST.hardCeilingCentsPerSession).toBe(300);
    expect(COST.targetCentsPerSession).toBe(120);
    expect(COST.llmCentsPerSession + COST.ttsCentsPerSession + COST.asrCentsPerSession).toBe(
      COST.targetCentsPerSession,
    );
  });

  it('the latency budget matches spec §5.3', () => {
    expect(LATENCY.firstAudioP50Ms).toBe(1500);
    expect(LATENCY.firstAudioP90Ms).toBe(3000);
    expect(LATENCY.bargeInStopMs).toBe(300);
  });

  it('the plan defines pooled minutes and a warning threshold', () => {
    expect(PLAN.pooledMinutesMonthly).toBe(480);
    expect(PLAN.warnAtPercent).toBe(80);
  });
});

describe('invariant (d): SessionBudget', () => {
  it('defaults to the spec ceiling and starts empty', () => {
    const budget = new SessionBudget();
    expect(budget.ceilingCents).toBe(COST.hardCeilingCentsPerSession);
    expect(budget.spentCents).toBe(0);
    expect(budget.remainingCents).toBe(300);
  });

  it('accepts hops that fit and refuses ones that do not', () => {
    const budget = new SessionBudget({ ceilingCents: 100 });
    budget.record({ kind: 'llm', cents: 60, label: TUTOR_LLM_SOURCES.liveTurn });
    expect(budget.canSpend(40)).toBe(true);
    expect(budget.canSpend(41)).toBe(false);
    expect(budget.breakdown()).toEqual({ llm: 60, tts: 0, asr: 0, vision: 0 });
  });

  it('records the crossing charge and throws a typed error', () => {
    const budget = new SessionBudget({ ceilingCents: 100 });
    budget.record({ kind: 'tts', cents: 90 });
    expect(() => budget.record({ kind: 'asr', cents: 20 })).toThrow(SessionCostCeilingExceeded);
    expect(budget.spentCents).toBe(110);
  });

  it('rejects nonsense amounts', () => {
    const budget = new SessionBudget();
    expect(() => budget.record({ kind: 'llm', cents: -1 })).toThrow(RangeError);
    expect(() => budget.canSpend(Number.NaN)).toThrow(RangeError);
    expect(() => new SessionBudget({ ceilingCents: 0 })).toThrow(RangeError);
  });
});

describe('invariant (d): DailyCap', () => {
  const day1 = Date.UTC(2026, 8, 4, 12);
  const day2 = Date.UTC(2026, 8, 5, 0, 5);

  it('caps a learner per UTC day and rolls over at midnight', () => {
    let now = day1;
    const cap = new DailyCap({ capCents: 500, now: () => now });
    cap.record('learner-1', 300);
    expect(cap.spentToday('learner-1')).toBe(300);
    expect(cap.canSpend('learner-1', 200)).toBe(true);
    expect(cap.canSpend('learner-1', 201)).toBe(false);
    expect(() => cap.record('learner-1', 250)).toThrow(DailyCapExceeded);
    now = day2;
    expect(cap.spentToday('learner-1')).toBe(0);
    expect(cap.canSpend('learner-1', 500)).toBe(true);
  });

  it('keeps learners separate and restores from a seed', () => {
    const cap = new DailyCap({ capCents: 100, now: () => day1 });
    cap.seed('learner-1', 90);
    cap.record('learner-2', 90);
    expect(cap.canSpend('learner-1', 10)).toBe(true);
    expect(cap.canSpend('learner-1', 11)).toBe(false);
    expect(cap.spentToday('learner-2')).toBe(90);
  });
});

describe('invariant (d): tutor model calls are attributable', () => {
  it('source labels are the fixed tutor set', () => {
    expect(isTutorLlmSource('tutor-live-turn')).toBe(true);
    expect(isTutorLlmSource('chat-adapter')).toBe(false);
  });

  it('every lib/tutor module that calls the model imports the source labels', () => {
    const tutorFiles = listFiles('lib/tutor').filter((file) => !file.endsWith('.test.ts'));
    const callers = [
      ...new Set(grepFiles(tutorFiles, /\b(callLLM|streamLLM)\s*\(/).map((hit) => hit.file)),
    ];
    const unattributed = callers.filter(
      (file) => grepFiles([file], /@\/lib\/tutor\/cost\/sources/).length === 0,
    );
    expect(
      unattributed,
      `lib/tutor files calling the model without importing TUTOR_LLM_SOURCES (${callers.length} callers among ${tutorFiles.length} files)`,
    ).toEqual([]);
  });
});
