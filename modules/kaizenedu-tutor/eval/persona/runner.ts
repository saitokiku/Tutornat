/**
 * Persona eval (tutor-loop skill): twenty prompts judged deterministically on
 * the reply — turn length, the short opening sentence, asks before it tells,
 * no sycophancy, no exclamation points, no markdown in speech, the AI
 * disclosure when asked. It needs a model to produce replies; without
 * EVAL_MODEL it writes a report that says so and exits 0, because a suite
 * that did not run is not a suite that passed.
 *
 *   EVAL_MODEL=google:gemini-3-flash-preview pnpm eval:persona
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgeBand } from '@/kaizen.config';

import { modelHalf, printSummary, runJudges, writeReport, type CaseResult } from '../shared/tutor';

interface PersonaCase {
  id: string;
  band: AgeBand;
  text: string;
  judges: string[];
}

async function main(): Promise<void> {
  const { cases } = JSON.parse(readFileSync(join('eval', 'persona', 'cases.json'), 'utf8')) as {
    cases: PersonaCase[];
  };
  const half = await modelHalf();
  const deterministic: CaseResult[] = cases.map((c) => ({
    id: c.id,
    pass: c.judges.length > 0,
    detail: `judges: ${c.judges.join(', ')}`,
  }));
  const model: CaseResult[] = [];
  if (half.turn) {
    for (const c of cases) {
      const reply = await half.turn({ band: c.band, learnerText: c.text });
      const reasons = runJudges(reply, c.judges);
      model.push({ id: c.id, pass: reasons.length === 0, detail: reasons.join('; ') || 'ok' });
    }
  }
  const report = {
    suite: 'persona',
    title: 'Persona',
    deterministic: { what: 'The prompt set and its judges', results: deterministic },
    model: { what: 'The reply, judged', model: half.model, reason: half.reason, results: model },
  };
  const { file, ok } = writeReport(report);
  printSummary(report, file);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
