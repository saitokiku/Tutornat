/**
 * Item bank pipeline (spec §5.8, R12, content-15; Track C).
 *
 * generate → solve → validate → package → report; all five run by default.
 *   generate  one generator call per skill × band × representation cell, asking for
 *             `--items-per-cell` items of assigned types; parsed defensively into candidates
 *   solve     a different model answers each candidate blind (stem and options only); an item
 *             survives when pass 1 agrees with the key, or when passes 2 and 3 both agree
 *   validate  near-duplicate stems, then the pedagogy skill's validate-item-bank.mjs
 *   package   coverage-first selection, ids, lib/tutor/content/item-bank.json
 *   report    docs/ITEM-BANK-REVIEW.md, docs/metrics/item-bank-<date>.json, results/<...>/report.md
 *
 * Required env (server-side, loaded from .env.local; never printed):
 *   ANTHROPIC_API_KEY   for the default generator anthropic:claude-sonnet-5
 *   GOOGLE_API_KEY      for the default solver google:gemini-3.5-flash and the generator fallback
 *
 * Usage:
 *   node --env-file=.env.local --import tsx eval/item-bank/runner.ts [options]
 *     --stage generate|solve|validate|package|report|all   default all
 *     --skill F3                       limit generate/solve to one skill (state for other skills is kept)
 *     --gen-model provider:model       default anthropic:claude-sonnet-5
 *     --gen-fallback-model p:m         default google:gemini-3.6-flash; used when the generator fails
 *                                      its health check three times (--no-fallback disables)
 *     --solve-model provider:model     default google:gemini-3.5-flash
 *     --solve-fallback-model p:m       default google:gemini-3-flash-preview
 *     --items-per-cell N               default 2 (12 skills × 2 bands × 5 representations × N)
 *     --max-per-skill N                default 12
 *     --max-cells N                    cap cells per skill (smoke tests)
 *     --concurrency N                  default 4
 *     --dry-run                        print the cells and one prompt; call nothing
 *
 * Output:
 *   lib/tutor/content/item-bank.json, docs/ITEM-BANK-REVIEW.md, docs/metrics/item-bank-<date>.json,
 *   eval/item-bank/results/<generator>/<timestamp>/report.md, and under eval/item-bank/.cache/
 *   (gitignored) every raw model output, usage.jsonl with tokens per call, and the stage state a
 *   rerun resumes from.
 *
 * Exit code: 0 when the requested stages complete and, for package/all, the bank meets the
 * coverage rules (≥ 96 items, ≥ 8 per skill, both bands per skill, all five representations,
 * ≥ 25 % numeric, ≥ 60 % of choice items with a conceptual distractor tag); 1 otherwise.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createRunDir } from '../shared/run-dir';
import { buildCells, checkBank } from './bank-rules';
import {
  BANK_PATH,
  CALL_CACHE_DIR,
  METRICS_DIR,
  RESULTS_DIR,
  REVIEW_SHEET_PATH,
  STATE_DIR,
  USAGE_LOG_PATH,
  loadGraph,
} from './graph';
import {
  GEN_SOURCE,
  LlmClient,
  QUOTA_RETRY_ATTEMPTS,
  SOLVE_SOURCE,
  errorMessage,
  healthCheck,
  resolveLlm,
  runPool,
  withRetry,
} from './llm';
import { buildSource, selectAndPackage, writeBank } from './package';
import {
  choiceAgrees,
  extractJson,
  normalizeAnswerText,
  normalizeCandidateItem,
  numericAgrees,
} from './parse';
import {
  JUDGE_SYSTEM_PROMPT,
  SOLVER_SYSTEM_PROMPT,
  buildGeneratorSystemPrompt,
  buildGeneratorUserPrompt,
  buildJudgePrompt,
  buildSolverPrompt,
} from './prompts';
import {
  bankStats,
  buildMetrics,
  tokenTotals,
  writeMetrics,
  writeReviewSheet,
  writeRunReport,
  type PipelineState,
} from './report';
import {
  SKILL_IDS,
  type BankItem,
  type Candidate,
  type Cell,
  type GenerationRecord,
  type RunMeta,
  type SkillGraph,
  type SkillId,
  type SolveResult,
  type SolverPass,
  type UsageRecord,
  type ValidationResult,
} from './types';
import { findDuplicateStems, runValidatorScript, type ValidatorRun } from './validate';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const STAGES = ['generate', 'solve', 'validate', 'package', 'report'] as const;
type Stage = (typeof STAGES)[number];

interface Options {
  stage: Stage | 'all';
  skill?: SkillId;
  genModel: string;
  genFallbackModel?: string;
  solveModel: string;
  solveFallbackModel?: string;
  itemsPerCell: number;
  maxPerSkill: number;
  maxCells?: number;
  concurrency: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    stage: 'all',
    genModel: 'anthropic:claude-sonnet-5',
    genFallbackModel: 'google:gemini-3.6-flash',
    solveModel: 'google:gemini-3.5-flash',
    solveFallbackModel: 'google:gemini-3-flash-preview',
    itemsPerCell: 2,
    maxPerSkill: 12,
    concurrency: 4,
    dryRun: false,
  };
  const next = (index: number, flag: string): string => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    return value;
  };
  const integer = (index: number, flag: string): number => {
    const value = Number(next(index, flag));
    if (!Number.isInteger(value) || value < 1) throw new Error(`${flag} needs a positive integer`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case '--stage': {
        const value = next(i++, flag);
        if (value !== 'all' && !STAGES.includes(value as Stage)) {
          throw new Error(`unknown stage ${value}; use ${STAGES.join('|')}|all`);
        }
        options.stage = value as Stage | 'all';
        break;
      }
      case '--skill': {
        const value = next(i++, flag) as SkillId;
        if (!SKILL_IDS.includes(value)) throw new Error(`unknown skill ${value}`);
        options.skill = value;
        break;
      }
      case '--gen-model':
        options.genModel = next(i++, flag);
        break;
      case '--gen-fallback-model':
        options.genFallbackModel = next(i++, flag);
        break;
      case '--solve-model':
        options.solveModel = next(i++, flag);
        break;
      case '--solve-fallback-model':
        options.solveFallbackModel = next(i++, flag);
        break;
      case '--no-fallback':
        options.genFallbackModel = undefined;
        options.solveFallbackModel = undefined;
        break;
      case '--items-per-cell':
        options.itemsPerCell = integer(i++, flag);
        break;
      case '--max-per-skill':
        options.maxPerSkill = integer(i++, flag);
        break;
      case '--max-cells':
        options.maxCells = integer(i++, flag);
        break;
      case '--concurrency':
        options.concurrency = integer(i++, flag);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new Error(`unknown option ${flag}`);
    }
  }
  return options;
}

// ---------------------------------------------------------------------------
// State on disk (eval/item-bank/.cache/state/*.json)
// ---------------------------------------------------------------------------

interface GenerationState {
  generator: string;
  records: GenerationRecord[];
  candidates: Candidate[];
}
interface SolvedState {
  solver: string;
  results: SolveResult[];
}
interface ValidatedState {
  duplicates: ValidationResult[];
  validator: ValidatorRun;
  survivors: string[];
}
interface PackagedState {
  items: BankItem[];
  keyById: Record<string, string>;
  reserve: Candidate[];
  finalValidator: ValidatorRun;
  problems: string[];
}

function statePath(name: string): string {
  return join(STATE_DIR, `${name}.json`);
}

function readState<T>(name: string): T | undefined {
  const path = statePath(name);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : undefined;
}

function requireState<T>(name: string, stage: Stage): T {
  const state = readState<T>(name);
  if (!state)
    throw new Error(`stage ${stage} needs ${statePath(name)}; run the earlier stages first`);
  return state;
}

function writeState(name: string, value: unknown): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(statePath(name), `${JSON.stringify(value, null, 2)}\n`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadMeta(options: Options): RunMeta {
  return (
    readState<RunMeta>('meta') ?? {
      date: today(),
      generatorRequested: options.genModel,
      generatorUsed: options.genModel,
      solverRequested: options.solveModel,
      solverUsed: options.solveModel,
      itemsPerCell: options.itemsPerCell,
      maxPerSkill: options.maxPerSkill,
    }
  );
}

function cellKey(cell: Cell): string {
  return `${cell.skill}-${cell.representation}-${cell.band}`;
}

// ---------------------------------------------------------------------------
// Model resolution with health check and fallback
// ---------------------------------------------------------------------------

async function resolveWithFallback(
  role: 'generator' | 'solver',
  primary: string,
  fallback: string | undefined,
  source: string,
): Promise<{ client: LlmClient; fallbackReason?: string }> {
  const attempt = async (modelString: string) => {
    const client = new LlmClient(resolveLlm(modelString), source, CALL_CACHE_DIR, USAGE_LOG_PATH);
    const health = await healthCheck(client);
    return { client, health };
  };
  console.log(`${role}: checking ${primary}`);
  let primaryError: string;
  try {
    const { client, health } = await attempt(primary);
    if (health.ok) return { client };
    primaryError = health.error ?? 'health check failed';
  } catch (error) {
    primaryError = errorMessage(error);
  }
  console.warn(`${role}: ${primary} is unusable (${primaryError.slice(0, 160)})`);
  if (!fallback) throw new Error(`${role} ${primary} failed and no fallback is configured`);
  console.log(`${role}: falling back to ${fallback}`);
  const { client, health } = await attempt(fallback);
  if (!health.ok) {
    throw new Error(`${role} fallback ${fallback} is unusable too: ${health.error ?? 'unknown'}`);
  }
  return { client, fallbackReason: `${primary}: ${primaryError.slice(0, 200)}` };
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

interface CellOutcome {
  record: GenerationRecord;
  candidates: Candidate[];
}

async function generateCell(
  cell: Cell,
  client: LlmClient,
  graph: SkillGraph,
  system: string,
  alreadyWritten: string[],
): Promise<CellOutcome> {
  const record: GenerationRecord = {
    cell,
    attempts: 0,
    ok: false,
    returned: 0,
    kept: 0,
    dropped: {},
  };
  const prompt = buildGeneratorUserPrompt(graph, cell, alreadyWritten);
  const candidates: Candidate[] = [];
  try {
    await withRetry(cellKey(cell), QUOTA_RETRY_ATTEMPTS, async (attempt) => {
      record.attempts = attempt;
      const response = await client.call({
        stage: 'generate',
        key: cellKey(cell),
        attempt,
        system,
        prompt,
        maxOutputTokens: 8192,
        thinking: 'high',
      });
      const parsed = extractJson(response.text);
      const rawItems = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as { items?: unknown }).items)
          ? ((parsed as { items: unknown[] }).items as unknown[])
          : undefined;
      if (!rawItems) throw new Error('response is not JSON with an items array');
      record.returned = rawItems.length;
      record.dropped = {};
      candidates.length = 0;
      rawItems.forEach((raw, position) => {
        const requestedType = cell.types[Math.min(position, cell.types.length - 1)];
        const normalized = normalizeCandidateItem(raw, cell, graph, requestedType);
        if (!normalized.ok) {
          record.dropped[normalized.reason] = (record.dropped[normalized.reason] ?? 0) + 1;
          return;
        }
        candidates.push({
          key: `${cellKey(cell)}-${candidates.length + 1}`,
          cell: {
            skill: cell.skill,
            band: cell.band,
            representation: cell.representation,
            index: cell.index,
          },
          requestedType,
          item: normalized.item,
          generatedBy: client.llm.modelString,
        });
      });
      if (candidates.length === 0) {
        throw new Error(`no usable items (${JSON.stringify(record.dropped)})`);
      }
    });
    record.ok = true;
    record.kept = candidates.length;
  } catch (error) {
    record.error = errorMessage(error).slice(0, 300);
  }
  return { record, candidates };
}

async function stageGenerate(options: Options, graph: SkillGraph, meta: RunMeta): Promise<RunMeta> {
  const skills = options.skill ? [options.skill] : [...SKILL_IDS];
  const cellsBySkill = skills.map((skill) =>
    buildCells(skill, options.itemsPerCell, options.maxCells),
  );
  const system = buildGeneratorSystemPrompt(graph);
  const totalCells = cellsBySkill.reduce((sum, cells) => sum + cells.length, 0);
  console.log(`generate: ${totalCells} cells across ${skills.length} skill(s)`);

  if (options.dryRun) {
    for (const cells of cellsBySkill) {
      for (const cell of cells) console.log(`  ${cellKey(cell)}: ${cell.types.join(', ')}`);
    }
    console.log('\n--- system prompt ---\n');
    console.log(system);
    console.log('\n--- first user prompt ---\n');
    console.log(buildGeneratorUserPrompt(graph, cellsBySkill[0][0], []));
    return meta;
  }

  const { client, fallbackReason } = await resolveWithFallback(
    'generator',
    options.genModel,
    options.genFallbackModel,
    GEN_SOURCE,
  );
  const updated: RunMeta = {
    ...meta,
    generatorRequested: options.genModel,
    generatorUsed: client.llm.modelString,
    generatorFallbackReason: fallbackReason,
    itemsPerCell: options.itemsPerCell,
    maxPerSkill: options.maxPerSkill,
  };
  writeState('meta', updated);

  let done = 0;
  const outcomes = await runPool(cellsBySkill, options.concurrency, async (cells) => {
    const alreadyWritten: string[] = [];
    const results: CellOutcome[] = [];
    for (const cell of cells) {
      const outcome = await generateCell(cell, client, graph, system, alreadyWritten);
      alreadyWritten.push(...outcome.candidates.map((candidate) => candidate.item.stem));
      results.push(outcome);
      done++;
      const dropped = Object.entries(outcome.record.dropped)
        .map(([reason, n]) => `${reason}×${n}`)
        .join(' ');
      console.log(
        `  [${done}/${totalCells}] ${cellKey(cell)}: ${outcome.record.ok ? `${outcome.candidates.length} kept` : `FAILED ${outcome.record.error}`}${dropped ? ` (dropped ${dropped})` : ''}`,
      );
    }
    return results;
  });

  const previous = readState<GenerationState>('generation');
  const keep = (skill: SkillId) => !skills.includes(skill);
  const state: GenerationState = {
    generator: client.llm.modelString,
    records: [
      ...(previous?.records.filter((record) => keep(record.cell.skill)) ?? []),
      ...outcomes.flat().map((outcome) => outcome.record),
    ],
    candidates: [
      ...(previous?.candidates.filter((candidate) => keep(candidate.cell.skill)) ?? []),
      ...outcomes.flat().flatMap((outcome) => outcome.candidates),
    ],
  };
  writeState('generation', state);
  const totals = tokenTotals(client.ledger).total;
  console.log(
    `generate: ${state.candidates.length} candidates from ${state.records.length} cells; this stage used ${totals.calls} calls (${totals.cachedCalls} cached), ${totals.inputTokens} in / ${totals.outputTokens} out tokens`,
  );
  return updated;
}

// ---------------------------------------------------------------------------
// solve
// ---------------------------------------------------------------------------

async function judgeShortAnswer(
  candidate: Candidate,
  answer: string,
  pass: number,
  client: LlmClient,
): Promise<{ agrees: boolean; detail: string }> {
  const key = candidate.item.answer;
  if (!key) return { agrees: false, detail: 'no answer key' };
  const forms = [String(key.value), ...(key.accept ?? [])].map(normalizeAnswerText);
  if (forms.includes(normalizeAnswerText(answer))) {
    return { agrees: true, detail: 'matched an accepted form locally' };
  }
  const response = await withRetry(
    `${candidate.key} judge ${pass}`,
    QUOTA_RETRY_ATTEMPTS,
    (attempt) =>
      client.call({
        stage: 'judge',
        key: `${candidate.key}#${pass}`,
        attempt,
        system: JUDGE_SYSTEM_PROMPT,
        prompt: buildJudgePrompt(candidate.item.stem, String(key.value), key.accept ?? [], answer),
        maxOutputTokens: 512,
        thinking: 'low',
      }),
  );
  const verdict = response.text.trim().toUpperCase();
  const agrees = /^YES\b/.test(verdict);
  return { agrees, detail: `judge said ${verdict.slice(0, 20) || '(nothing)'}` };
}

async function solvePass(
  candidate: Candidate,
  pass: number,
  client: LlmClient,
): Promise<SolverPass> {
  const response = await withRetry(
    `${candidate.key} pass ${pass}`,
    QUOTA_RETRY_ATTEMPTS,
    async (attempt) => {
      const result = await client.call({
        stage: 'solve',
        key: `${candidate.key}#${pass}`,
        attempt,
        system: SOLVER_SYSTEM_PROMPT,
        prompt: buildSolverPrompt(candidate.item),
        maxOutputTokens: 2048,
        thinking: 'medium',
      });
      if (!result.text.trim()) throw new Error('empty solver reply');
      return result;
    },
  );
  const answer = response.text.trim().replace(/\s+/g, ' ').slice(0, 200);
  const { item } = candidate;
  let verdict: { agrees: boolean; detail: string };
  if ((item.type === 'single' || item.type === 'multiple') && item.options) {
    verdict = choiceAgrees(item.options, item.type, answer);
  } else if (item.type === 'numeric' && item.answer) {
    verdict = numericAgrees(item.answer, answer);
  } else {
    verdict = await judgeShortAnswer(candidate, answer, pass, client);
  }
  return { pass, answer, agrees: verdict.agrees, detail: verdict.detail };
}

async function solveCandidate(candidate: Candidate, client: LlmClient): Promise<SolveResult> {
  const passes: SolverPass[] = [];
  try {
    passes.push(await solvePass(candidate, 1, client));
    if (passes[0].agrees) return { key: candidate.key, passes, kept: true };
    passes.push(await solvePass(candidate, 2, client));
    if (!passes[1].agrees) {
      return { key: candidate.key, passes, kept: false, reason: 'solver_disagreement' };
    }
    passes.push(await solvePass(candidate, 3, client));
    const kept = passes[2].agrees;
    return { key: candidate.key, passes, kept, reason: kept ? undefined : 'solver_disagreement' };
  } catch (error) {
    return {
      key: candidate.key,
      passes,
      kept: false,
      reason: `solver_error: ${errorMessage(error).slice(0, 120)}`,
    };
  }
}

async function stageSolve(options: Options, meta: RunMeta): Promise<RunMeta> {
  const generation = requireState<GenerationState>('generation', 'solve');
  const candidates = options.skill
    ? generation.candidates.filter((candidate) => candidate.cell.skill === options.skill)
    : generation.candidates;
  console.log(`solve: ${candidates.length} candidates`);
  if (options.dryRun) {
    if (candidates[0]) console.log(buildSolverPrompt(candidates[0].item));
    return meta;
  }
  const { client, fallbackReason } = await resolveWithFallback(
    'solver',
    options.solveModel,
    options.solveFallbackModel,
    SOLVE_SOURCE,
  );
  if (client.llm.modelString === generation.generator) {
    throw new Error(
      `the solver (${client.llm.modelString}) must differ from the generator (${generation.generator}); pass --solve-model`,
    );
  }
  const updated: RunMeta = {
    ...meta,
    solverRequested: options.solveModel,
    solverUsed: client.llm.modelString,
    solverFallbackReason: fallbackReason,
  };
  writeState('meta', updated);

  let done = 0;
  const results = await runPool(candidates, options.concurrency + 2, async (candidate) => {
    const result = await solveCandidate(candidate, client);
    done++;
    if (done % 25 === 0 || done === candidates.length) {
      console.log(`  [${done}/${candidates.length}] solved`);
    }
    return result;
  });
  const previous = readState<SolvedState>('solved');
  const solvedKeys = new Set(candidates.map((candidate) => candidate.key));
  const state: SolvedState = {
    solver: client.llm.modelString,
    results: [
      ...(previous?.results.filter((result) => !solvedKeys.has(result.key)) ?? []),
      ...results,
    ],
  };
  writeState('solved', state);
  const kept = results.filter((result) => result.kept).length;
  const firstPass = results.filter((result) => result.passes[0]?.agrees).length;
  const totals = tokenTotals(client.ledger).total;
  console.log(
    `solve: ${kept}/${results.length} kept (${firstPass} agreed on pass 1); this stage used ${totals.calls} calls (${totals.cachedCalls} cached), ${totals.inputTokens} in / ${totals.outputTokens} out tokens`,
  );
  return updated;
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

function stageValidate(): ValidatedState {
  const generation = requireState<GenerationState>('generation', 'validate');
  const solved = requireState<SolvedState>('solved', 'validate');
  const keptKeys = new Set(
    solved.results.filter((result) => result.kept).map((result) => result.key),
  );
  const kept = generation.candidates.filter((candidate) => keptKeys.has(candidate.key));
  const duplicates = findDuplicateStems(kept);
  const duplicateKeys = new Set(
    duplicates.filter((result) => result.problems.length > 0).map((result) => result.key),
  );
  const afterDuplicates = kept.filter((candidate) => !duplicateKeys.has(candidate.key));
  const validator = runValidatorScript(
    afterDuplicates.map((candidate) => ({
      id: candidate.key,
      ...candidate.item,
      source: 'candidate',
    })),
    join(STATE_DIR, 'validator-input.json'),
    false,
  );
  const problemKeys = new Set(validator.problems.map((problem) => problem.id));
  const survivors = afterDuplicates
    .filter((candidate) => !problemKeys.has(candidate.key))
    .map((candidate) => candidate.key);
  const state: ValidatedState = { duplicates, validator, survivors };
  writeState('validated', state);

  const perSkill: Record<string, number> = {};
  for (const candidate of afterDuplicates) {
    if (problemKeys.has(candidate.key)) continue;
    perSkill[candidate.cell.skill] = (perSkill[candidate.cell.skill] ?? 0) + 1;
  }
  console.log(
    `validate: ${kept.length} solver-approved → ${duplicateKeys.size} duplicate stems removed → validator: ${validator.problems.length} problems, ${validator.pendingReview} pending human review (expected) → ${survivors.length} survivors`,
  );
  for (const problem of validator.problems) console.log(`  ${problem.id}: ${problem.problem}`);
  console.log(
    `  survivors per skill: ${SKILL_IDS.map((skill) => `${skill}=${perSkill[skill] ?? 0}`).join(' ')}`,
  );
  return state;
}

// ---------------------------------------------------------------------------
// package
// ---------------------------------------------------------------------------

function stagePackage(options: Options, graph: SkillGraph, meta: RunMeta): PackagedState {
  const generation = requireState<GenerationState>('generation', 'package');
  const validated = requireState<ValidatedState>('validated', 'package');
  const survivorKeys = new Set(validated.survivors);
  const survivors = generation.candidates.filter((candidate) => survivorKeys.has(candidate.key));
  const source = buildSource(meta.generatorUsed, meta.solverUsed, meta.date);
  const packaged = selectAndPackage(survivors, options.maxPerSkill, source);
  writeBank(BANK_PATH, packaged.items);
  const finalValidator = runValidatorScript(
    packaged.items,
    join(STATE_DIR, 'final-validator-input.json'),
    true,
  );
  const problems = [
    ...checkBank(packaged.items, graph),
    ...finalValidator.problems.map((problem) => `validator: ${problem.id}: ${problem.problem}`),
    ...finalValidator.coverage.map((line) => `validator coverage: ${line}`),
  ];
  const state: PackagedState = { ...packaged, finalValidator, problems };
  writeState('packaged', state);
  const stats = bankStats(packaged.items);
  console.log(
    `package: ${packaged.items.length} items written to ${BANK_PATH} (${packaged.reserve.length} in reserve); ${finalValidator.summary}; ${finalValidator.pendingReview} pending human review`,
  );
  console.log(
    `  per skill: ${SKILL_IDS.map((skill) => `${skill}=${stats.perSkill[skill] ?? 0}`).join(' ')}`,
  );
  console.log(
    `  bands: ${JSON.stringify(stats.perBand)}; representations: ${JSON.stringify(stats.perRepresentation)}; types: ${JSON.stringify(stats.perType)}`,
  );
  console.log(
    `  numeric ${(stats.numericShare * 100).toFixed(1)} %; choice items with a conceptual distractor tag ${(stats.taggedDistractorShare * 100).toFixed(1)} %`,
  );
  if (problems.length) {
    console.error('package: the bank does not meet the coverage rules:');
    for (const problem of problems) console.error(`  ${problem}`);
  }
  return state;
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

/** Every fresh call ever made by the pipeline, once (cache replays carry the same key, attempt, and prompt). */
function readSpendLedger(): UsageRecord[] {
  if (!existsSync(USAGE_LOG_PATH)) return [];
  const seen = new Set<string>();
  const records: UsageRecord[] = [];
  for (const line of readFileSync(USAGE_LOG_PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as UsageRecord;
    if (record.cached) continue;
    const id =
      record.stage === 'health'
        ? `${record.model}|health|${record.at}`
        : `${record.model}|${record.stage}|${record.key}|${record.attempt}|${record.promptSha}`;
    if (seen.has(id)) continue;
    seen.add(id);
    records.push(record);
  }
  return records;
}

function stageReport(graph: SkillGraph, meta: RunMeta, sessionLedger: UsageRecord[]): void {
  const generation = requireState<GenerationState>('generation', 'report');
  const solved = requireState<SolvedState>('solved', 'report');
  const validated = requireState<ValidatedState>('validated', 'report');
  const packaged = requireState<PackagedState>('packaged', 'report');
  const state: PipelineState = {
    meta,
    generation: generation.records,
    candidates: generation.candidates,
    solved: solved.results,
    duplicates: validated.duplicates,
    validator: validated.validator,
    finalValidator: packaged.finalValidator,
    bank: packaged.items,
    keyById: packaged.keyById,
    reserve: packaged.reserve,
    usage: readSpendLedger(),
  };
  writeReviewSheet(REVIEW_SHEET_PATH, state, graph);
  const metrics = buildMetrics(state);
  const thisRun = tokenTotals(sessionLedger);
  const metricsWithSession = {
    ...metrics,
    tokens: {
      ...metrics.tokens,
      thisProcess: {
        note: 'Calls consulted while this process ran (fresh and cache hits); empty when only --stage report ran.',
        ...thisRun,
      },
    },
    bankProblems: packaged.problems,
  };
  const metricsPath = join(METRICS_DIR, `item-bank-${meta.date}.json`);
  writeMetrics(metricsPath, metricsWithSession);
  const runDir = createRunDir(RESULTS_DIR, meta.generatorUsed);
  const reportPath = writeRunReport(runDir, state, metrics);
  console.log(`report: ${REVIEW_SHEET_PATH}`);
  console.log(`report: ${metricsPath}`);
  console.log(`report: ${reportPath}`);
  const totals = metrics.tokens.total;
  console.log(
    `report: all runs so far: ${totals.calls} fresh calls, ${totals.inputTokens} in / ${totals.outputTokens} out tokens (${totals.reasoningTokens} reasoning), est. $${totals.estimatedCostUsd === null ? 'unpriced' : totals.estimatedCostUsd.toFixed(2)}`,
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const graph = loadGraph();
  mkdirSync(CALL_CACHE_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });
  let meta = loadMeta(options);
  const stages: Stage[] = options.stage === 'all' ? [...STAGES] : [options.stage];
  const sessionLedger: UsageRecord[] = [];
  let ok = true;
  const started = Date.now();
  for (const stage of stages) {
    console.log(`\n=== ${stage} ===`);
    switch (stage) {
      case 'generate':
        meta = await stageGenerate(options, graph, meta);
        break;
      case 'solve':
        meta = await stageSolve(options, meta);
        break;
      case 'validate':
        if (!options.dryRun) stageValidate();
        break;
      case 'package':
        if (!options.dryRun) ok = stagePackage(options, graph, meta).problems.length === 0 && ok;
        break;
      case 'report':
        if (!options.dryRun) stageReport(graph, meta, sessionLedger);
        break;
    }
  }
  console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(0)} s; exit ${ok ? 0 : 1}`);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error('item-bank runner failed:', errorMessage(error));
  process.exit(1);
});
