/**
 * Reports for the item-bank pipeline: the human review sheet
 * (`docs/ITEM-BANK-REVIEW.md`), the metrics file
 * (`docs/metrics/item-bank-<date>.json`), and the run report under
 * `eval/item-bank/results/`. Every number comes from pipeline state; nothing
 * is typed in by hand.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { renderHeader, renderSummaryTable } from '../shared/markdown-report';
import { skillName, skillNumber } from './graph';
import { optionLetter } from './prompts';
import {
  BANDS,
  ITEM_TYPES,
  REPRESENTATIONS,
  type BankItem,
  type Candidate,
  type GenerationRecord,
  type RunMeta,
  type SkillGraph,
  type SolveResult,
  type UsageRecord,
  type ValidationResult,
} from './types';
import type { ValidatorRun } from './validate';

/**
 * List prices in USD per million tokens, used only to estimate spend. Reasoning
 * tokens are billed as output. Sources: Claude prices from the claude-api
 * skill's model table (cached 2026-06-24); Gemini prices from third-party
 * pricing trackers on 2026-09-04 because ai.google.dev is unreachable from
 * the build sandbox (3.6 Flash is the introductory rate through 2026-12-31).
 */
export const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  'anthropic:claude-sonnet-5': { input: 2.0, output: 10.0 },
  'google:gemini-3.5-flash': { input: 1.5, output: 9.0 },
  'google:gemini-3.6-flash': { input: 0.75, output: 3.75 },
  'google:gemini-3-flash-preview': { input: 0.5, output: 3.0 },
};

export interface PipelineState {
  meta: RunMeta;
  generation: GenerationRecord[];
  candidates: Candidate[];
  solved: SolveResult[];
  duplicates: ValidationResult[];
  validator?: ValidatorRun;
  finalValidator?: ValidatorRun;
  bank: BankItem[];
  keyById: Record<string, string>;
  reserve: Candidate[];
  usage: UsageRecord[];
}

export interface TokenTotals {
  calls: number;
  cachedCalls: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: number | null;
}

function count<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

export function tokenTotals(usage: UsageRecord[]): {
  byModel: Record<string, TokenTotals>;
  total: TokenTotals;
} {
  const byModel: Record<string, TokenTotals> = {};
  const total: TokenTotals = {
    calls: 0,
    cachedCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    estimatedCostUsd: 0,
  };
  let priced = true;
  for (const record of usage) {
    const entry = (byModel[record.model] ??= {
      calls: 0,
      cachedCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      estimatedCostUsd: 0,
    });
    for (const bucket of [entry, total]) {
      bucket.calls++;
      if (record.cached) bucket.cachedCalls++;
      bucket.inputTokens += record.inputTokens;
      bucket.outputTokens += record.outputTokens;
      bucket.reasoningTokens += record.reasoningTokens;
    }
    const price = PRICE_PER_MILLION[record.model];
    if (price) {
      const cost = (record.inputTokens * price.input + record.outputTokens * price.output) / 1e6;
      entry.estimatedCostUsd = (entry.estimatedCostUsd ?? 0) + cost;
      total.estimatedCostUsd = (total.estimatedCostUsd ?? 0) + cost;
    } else {
      entry.estimatedCostUsd = null;
      priced = false;
    }
  }
  if (!priced) total.estimatedCostUsd = null;
  const round = (bucket: TokenTotals) => {
    if (bucket.estimatedCostUsd !== null) {
      bucket.estimatedCostUsd = Math.round(bucket.estimatedCostUsd * 10000) / 10000;
    }
  };
  Object.values(byModel).forEach(round);
  round(total);
  return { byModel, total };
}

/** Choice items whose distractors carry at least one conceptual tag (anything but `computation`). */
export function taggedDistractorShare(items: BankItem[]): {
  tagged: number;
  choice: number;
  share: number;
} {
  const choice = items.filter((item) => item.type === 'single' || item.type === 'multiple');
  const tagged = choice.filter((item) =>
    (item.options ?? []).some(
      (option) => !option.correct && option.misconception && option.misconception !== 'computation',
    ),
  );
  return {
    tagged: tagged.length,
    choice: choice.length,
    share: choice.length ? tagged.length / choice.length : 0,
  };
}

export function bankStats(items: BankItem[]) {
  const perSkill = count(items, (item) => item.skill);
  const perBand = count(items, (item) => item.band);
  const perRepresentation = count(items, (item) => item.representation);
  const perType = count(items, (item) => item.type);
  const numeric = items.filter((item) => item.type === 'numeric').length;
  const tagged = taggedDistractorShare(items);
  const bandsPerSkill: Record<string, string[]> = {};
  for (const item of items) {
    const covered = item.band === 'both' ? ['9-12', '13-17'] : [item.band];
    const list = (bandsPerSkill[item.skill] ??= []);
    for (const band of covered) if (!list.includes(band)) list.push(band);
  }
  return {
    total: items.length,
    perSkill,
    perBand,
    perRepresentation,
    perType,
    numericShare: items.length ? numeric / items.length : 0,
    taggedDistractorShare: tagged.share,
    taggedDistractorItems: tagged.tagged,
    choiceItems: tagged.choice,
    bandsPerSkill,
  };
}

function keyText(item: BankItem): string {
  if (item.options) {
    return item.options
      .map((option, index) => (option.correct ? `${optionLetter(index)}. ${option.text}` : null))
      .filter((text): text is string => text !== null)
      .join('; ');
  }
  if (!item.answer) return '';
  const units = item.answer.units ? ` ${item.answer.units}` : '';
  const accept = item.answer.accept?.length ? ` (accept: ${item.answer.accept.join(', ')})` : '';
  const tolerance =
    typeof item.answer.tolerance === 'number' && item.answer.tolerance > 0
      ? ` ±${item.answer.tolerance}`
      : '';
  return `${String(item.answer.value)}${units}${tolerance}${accept}`;
}

function tagText(item: BankItem): string {
  const tags = (item.options ?? [])
    .filter((option) => !option.correct && option.misconception)
    .map((option) => option.misconception as string);
  return [...new Set(tags)].join(', ');
}

function optionsText(item: BankItem): string {
  return (item.options ?? [])
    .map((option, index) => `${optionLetter(index)}. ${option.text}${option.correct ? ' ✓' : ''}`)
    .join(' · ');
}

export function solverText(result: SolveResult | undefined): string {
  if (!result) return 'not solved';
  const agreed = result.passes.filter((pass) => pass.agrees).length;
  if (result.passes.length === 1 && agreed === 1) return 'agreed on pass 1';
  if (result.kept) return `pass 1 missed; passes 2 and 3 agreed`;
  return `disagreed (${agreed}/${result.passes.length} passes agreed)`;
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function writeReviewSheet(path: string, state: PipelineState, graph: SkillGraph): void {
  const solvedByKey = new Map(state.solved.map((result) => [result.key, result]));
  const lines: string[] = [
    '# Item bank review sheet',
    '',
    `Generated by \`eval/item-bank/runner.ts\` on ${state.meta.date} from \`lib/tutor/content/item-bank.json\` (${state.bank.length} items). Generator: \`${state.meta.generatorUsed}\`; solver: \`${state.meta.solverUsed}\`. Every item below was solved blind by the solver model and agreed with the key (spec §5.8: "solved by the strong model with self-check and reviewed by a human before it ships").`,
    '',
    '## How to review (for a teacher)',
    '',
    '1. Read the stem aloud. It should sound natural when spoken, name every quantity, and need no picture. The tutor speaks it word for word.',
    '2. Work the item yourself and check the key. For choice items, check that exactly the ticked options are correct and that each wrong option is the answer a learner with the tagged misconception would actually give. For numeric items, check the value, the tolerance, and the accepted forms.',
    '3. Check that the item tests only the listed skill (its prerequisites are fine; later skills are not) and that the band fits the wording.',
    '4. Tick the box here, then set `reviewed_by` (your name or initials) and `reviewed_at` (YYYY-MM-DD) on that item in `lib/tutor/content/item-bank.json`. **An item counts as reviewed only when both `reviewed_by` and `reviewed_at` are set in the JSON.** A tick in this sheet alone changes nothing, and the tutor never shows an unstamped item to a learner.',
    '5. To fix an item, edit the JSON directly (stem, options, tags, answer, rationale), then stamp it. To drop an item, delete it from the JSON. Do not rerun the generator after review starts; ids would shift.',
    '6. When you are done, run `node .claude/skills/pedagogy-fractions/scripts/validate-item-bank.mjs lib/tutor/content/item-bank.json --require-coverage`. It passes only when every item is stamped and every skill still has at least 8 items (96 in total).',
    '',
    'Columns: **Key** is the correct option(s) or the numeric/short answer with its accepted forms; **Tags** are the misconceptions the wrong options elicit; **Solver** says how the blind solver did against the key; **Rationale** is what the tutor may say to explain the key.',
    '',
  ];

  const skills = [...new Set(state.bank.map((item) => item.skill))].sort(
    (a, b) => skillNumber(a) - skillNumber(b),
  );
  for (const skill of skills) {
    const items = state.bank.filter((item) => item.skill === skill);
    lines.push(`## ${skill} — ${skillName(graph, skill)} (${items.length} items)`, '');
    lines.push(
      ...renderSummaryTable(
        [
          'Reviewed',
          'Id',
          'Type',
          'Band',
          'Rep',
          'Stem',
          'Options',
          'Key',
          'Tags',
          'Solver',
          'Rationale',
        ],
        items.map((item) => [
          '[ ]',
          item.id,
          item.type,
          item.band,
          item.representation,
          cell(item.stem),
          cell(optionsText(item)),
          cell(keyText(item)),
          cell(tagText(item)),
          cell(solverText(solvedByKey.get(state.keyById[item.id]))),
          cell(item.rationale ?? ''),
        ]),
      ),
    );
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
}

export function buildMetrics(state: PipelineState) {
  const generation = {
    cells: state.generation.length,
    cellsFailed: state.generation.filter((record) => !record.ok).length,
    generatorCalls: state.generation.reduce((sum, record) => sum + record.attempts, 0),
    itemsReturned: state.generation.reduce((sum, record) => sum + record.returned, 0),
    candidates: state.candidates.length,
    droppedAtParse: state.generation.reduce<Record<string, number>>((acc, record) => {
      for (const [reason, n] of Object.entries(record.dropped))
        acc[reason] = (acc[reason] ?? 0) + n;
      return acc;
    }, {}),
  };
  const firstPass = state.solved.filter((result) => result.passes[0]?.agrees).length;
  const afterRetry = state.solved.filter(
    (result) => result.kept && !result.passes[0]?.agrees,
  ).length;
  const solve = {
    solved: state.solved.length,
    agreedFirstPass: firstPass,
    agreedAfterRetry: afterRetry,
    kept: state.solved.filter((result) => result.kept).length,
    rejected: state.solved.filter((result) => !result.kept).length,
    firstPassAgreementRate: state.solved.length ? firstPass / state.solved.length : 0,
    keptRate: state.solved.length
      ? state.solved.filter((result) => result.kept).length / state.solved.length
      : 0,
    solverPasses: state.solved.reduce((sum, result) => sum + result.passes.length, 0),
  };
  const duplicateRejections = state.duplicates.filter((result) => result.problems.length > 0);
  const validation = {
    duplicateStems: duplicateRejections.length,
    duplicateReasons: count(duplicateRejections, (result) => result.problems[0].split(':')[0]),
    validatorProblems: state.validator?.problems.length ?? 0,
    validatorProblemsByReason: count(state.validator?.problems ?? [], (problem) => problem.problem),
    validatorPendingReview: state.validator?.pendingReview ?? 0,
    finalValidator: state.finalValidator
      ? {
          summary: state.finalValidator.summary,
          problems: state.finalValidator.problems.length,
          pendingReview: state.finalValidator.pendingReview,
          coverage: state.finalValidator.coverage,
        }
      : null,
  };
  const rejections: Record<string, number> = { ...generation.droppedAtParse };
  for (const result of duplicateRejections) {
    const reason = result.problems[0].split(':')[0];
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  }
  for (const result of state.solved) {
    if (!result.kept)
      rejections[result.reason ?? 'solver_disagreement'] =
        (rejections[result.reason ?? 'solver_disagreement'] ?? 0) + 1;
  }
  for (const problem of state.validator?.problems ?? []) {
    const reason = `validator:${problem.problem.split(' ').slice(0, 3).join('_')}`;
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  }
  const tokens = tokenTotals(state.usage);
  return {
    run: state.meta,
    generation,
    solve,
    validation,
    rejectionsByReason: rejections,
    survivors: state.bank.length + state.reserve.length,
    reserve: state.reserve.length,
    bank: bankStats(state.bank),
    tokens: {
      ...tokens,
      priceAssumptionsUsdPerMillion: PRICE_PER_MILLION,
      note: 'Totals cover every call whose output was used, including cache hits from earlier runs of the same pipeline; reasoning tokens are included in outputTokens and priced as output.',
    },
  };
}

export type Metrics = ReturnType<typeof buildMetrics>;

export function writeMetrics(path: string, metrics: Metrics): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(metrics, null, 2)}\n`);
}

export function writeRunReport(runDir: string, state: PipelineState, metrics: Metrics): string {
  const lines: string[] = [];
  lines.push(
    ...renderHeader({
      title: 'Item bank pipeline report',
      timestamp: new Date().toISOString(),
      model: state.meta.generatorUsed,
      judgeModel: state.meta.solverUsed,
      extra: {
        'Generator requested': state.meta.generatorRequested,
        'Generator fallback': state.meta.generatorFallbackReason ?? 'not needed',
        'Solver requested': state.meta.solverRequested,
        'Items per cell': state.meta.itemsPerCell,
        'Max per skill': state.meta.maxPerSkill,
      },
    }),
  );
  lines.push('## Funnel', '');
  lines.push(
    ...renderSummaryTable(
      ['Stage', 'Count'],
      [
        ['Cells', String(metrics.generation.cells)],
        ['Items returned by the generator', String(metrics.generation.itemsReturned)],
        ['Candidates after parse-time checks', String(metrics.generation.candidates)],
        ['Solved', String(metrics.solve.solved)],
        ['Agreed on pass 1', String(metrics.solve.agreedFirstPass)],
        ['Agreed on passes 2 and 3 after a miss', String(metrics.solve.agreedAfterRetry)],
        ['Rejected by the solver', String(metrics.solve.rejected)],
        ['Rejected as duplicate stems', String(metrics.validation.duplicateStems)],
        ['Rejected by the validator', String(metrics.validation.validatorProblems)],
        ['Survivors', String(metrics.survivors)],
        ['Packaged', String(metrics.bank.total)],
        ['Reserve (not packaged)', String(metrics.reserve)],
      ],
    ),
  );
  lines.push('## Rejections by reason', '');
  lines.push(
    ...renderSummaryTable(
      ['Reason', 'Count'],
      Object.entries(metrics.rejectionsByReason)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, n]) => [reason, String(n)]),
    ),
  );
  const dimension = (title: string, record: Record<string, number>, order?: readonly string[]) => {
    lines.push(`## ${title}`, '');
    const keys = order ? [...order] : Object.keys(record);
    lines.push(
      ...renderSummaryTable(
        ['Key', 'Items'],
        keys.map((key) => [key, String(record[key] ?? 0)]),
      ),
    );
  };
  dimension(
    'Per skill',
    metrics.bank.perSkill,
    Object.keys(metrics.bank.perSkill).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))),
  );
  dimension('Per band', metrics.bank.perBand, BANDS);
  dimension('Per representation', metrics.bank.perRepresentation, REPRESENTATIONS);
  dimension('Per type', metrics.bank.perType, ITEM_TYPES);
  lines.push('## Tokens', '');
  lines.push(
    ...renderSummaryTable(
      ['Model', 'Calls', 'Cached', 'Input', 'Output', 'Reasoning', 'Est. USD'],
      [...Object.entries(metrics.tokens.byModel), ['total', metrics.tokens.total] as const].map(
        ([model, totals]) => [
          model,
          String(totals.calls),
          String(totals.cachedCalls),
          String(totals.inputTokens),
          String(totals.outputTokens),
          String(totals.reasoningTokens),
          totals.estimatedCostUsd === null ? 'unpriced' : totals.estimatedCostUsd.toFixed(4),
        ],
      ),
    ),
  );
  lines.push('## Solver disagreements', '');
  const disagreements = state.solved.filter((result) => !result.kept);
  const byKey = new Map(state.candidates.map((candidate) => [candidate.key, candidate]));
  lines.push(
    ...renderSummaryTable(
      ['Key', 'Type', 'Stem', 'Solver answers'],
      disagreements.map((result) => [
        result.key,
        byKey.get(result.key)?.item.type ?? '',
        cell(byKey.get(result.key)?.item.stem ?? ''),
        cell(
          result.passes.map((pass) => `${pass.pass}: ${pass.answer} (${pass.detail})`).join(' / '),
        ),
      ]),
    ),
  );
  const path = join(runDir, 'report.md');
  writeFileSync(path, `${lines.join('\n')}\n`);
  return path;
}
