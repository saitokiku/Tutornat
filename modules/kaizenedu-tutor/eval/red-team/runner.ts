/**
 * Red-team eval (spec R10; tutor-loop skill): the pattern screen answers every
 * prompt the way the case says, before any model runs; the prompts it lets
 * through are judged on the model's reply when EVAL_MODEL is set.
 *
 *   pnpm eval:red-team                     # the screen half, always
 *   EVAL_MODEL=google:gemini-3-flash-preview pnpm eval:red-team
 *
 * A case the screen gets wrong is reported as a failure, not softened; a
 * known over-fire is a case with a note, and changing a pattern is a safety
 * change to ask about first (CLAUDE.md).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgeBand } from '@/kaizen.config';
import { screenLearnerText } from '@/lib/tutor/safety';

import { modelHalf, printSummary, runJudges, writeReport, type CaseResult } from '../shared/tutor';

interface RedTeamCase {
  id: string;
  text: string;
  screen: string;
  model?: string[];
  note?: string;
}

interface CaseFile {
  band: AgeBand;
  cases: RedTeamCase[];
}

function verdictLabel(text: string, band: AgeBand): string {
  const verdict = screenLearnerText(text, band);
  if (verdict.kind === 'ok') return 'ok';
  return `${verdict.kind}:${verdict.category}`;
}

async function main(): Promise<void> {
  const files = ['cases-13-17.json', 'cases-9-12.json'];
  const half = await modelHalf();
  let allOk = true;
  for (const file of files) {
    const { band, cases } = JSON.parse(
      readFileSync(join('eval', 'red-team', file), 'utf8'),
    ) as CaseFile;
    const deterministic: CaseResult[] = cases.map((c) => {
      const got = verdictLabel(c.text, band);
      const pass = got === c.screen;
      return {
        id: c.id,
        pass,
        detail: pass
          ? `${got}${c.note ? ` (${c.note})` : ''}`
          : `expected ${c.screen}, screen said ${got}${c.note ? ` (${c.note})` : ''}`,
      };
    });
    const model: CaseResult[] = [];
    if (half.turn) {
      for (const c of cases) {
        if (!c.model || c.screen !== 'ok') continue;
        const reply = await half.turn({ band, learnerText: c.text });
        const reasons = runJudges(reply, c.model);
        model.push({ id: c.id, pass: reasons.length === 0, detail: reasons.join('; ') || 'ok' });
      }
    }
    const report = {
      suite: `red-team-${band}`,
      title: `Red team, ${band}`,
      deterministic: { what: 'The pattern screen', results: deterministic },
      model: {
        what: 'The model on prompts the screen lets through',
        model: half.model,
        reason: half.reason,
        results: model,
      },
    };
    const { file: written, ok } = writeReport(report);
    printSummary(report, written);
    allOk &&= ok;
  }
  process.exitCode = allOk ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
