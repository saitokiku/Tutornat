/**
 * Coach-mode eval (spec §5.4; tutor-loop skill): the attempt counter and the
 * "just show me" unlock are kept in session state by lib/tutor/session/coach.ts,
 * so the first half asserts that arithmetic without a model; the second half,
 * with EVAL_MODEL set, asks the real system prompt for the reply to the last
 * message and checks that a withheld answer stays withheld.
 *
 *   pnpm eval:coach-mode
 *   EVAL_MODEL=google:gemini-3-flash-preview pnpm eval:coach-mode
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyLearnerMessage, resetCoach } from '@/lib/tutor/session/coach';
import type { CoachState } from '@/lib/tutor/session/state';

import {
  modelHalf,
  printSummary,
  runJudges,
  withholds,
  writeReport,
  type CaseResult,
} from '../shared/tutor';

interface CoachCase {
  id: string;
  messages: string[];
  expect: Pick<CoachState, 'attempts' | 'askedForAnswer' | 'showMeUnlocked'>;
  model?: string[];
}

interface CaseFile {
  problem: string;
  answer: string;
  cases: CoachCase[];
}

function describe(
  state: Pick<CoachState, 'attempts' | 'askedForAnswer' | 'showMeUnlocked'>,
): string {
  return `attempts=${state.attempts} asked=${state.askedForAnswer} showMe=${state.showMeUnlocked}`;
}

async function main(): Promise<void> {
  const { problem, answer, cases } = JSON.parse(
    readFileSync(join('eval', 'coach-mode', 'cases.json'), 'utf8'),
  ) as CaseFile;
  const half = await modelHalf();

  const states = new Map<string, CoachState>();
  const deterministic: CaseResult[] = cases.map((c) => {
    let state = resetCoach();
    for (const message of c.messages) state = applyLearnerMessage(state, message);
    states.set(c.id, state);
    const got = {
      attempts: state.attempts,
      askedForAnswer: state.askedForAnswer,
      showMeUnlocked: state.showMeUnlocked,
    };
    const pass =
      got.attempts === c.expect.attempts &&
      got.askedForAnswer === c.expect.askedForAnswer &&
      got.showMeUnlocked === c.expect.showMeUnlocked;
    return {
      id: c.id,
      pass,
      detail: pass ? describe(got) : `expected ${describe(c.expect)}, got ${describe(got)}`,
    };
  });

  const model: CaseResult[] = [];
  if (half.turn) {
    for (const c of cases) {
      if (!c.model) continue;
      const history = [`The problem is: ${problem}`, ...c.messages.slice(0, -1)];
      const reply = await half.turn({
        band: '13-17',
        learnerText: c.messages[c.messages.length - 1]!,
        history,
        coach: states.get(c.id),
      });
      const reasons = runJudges(reply, c.model, { withholds: withholds(answer) });
      model.push({ id: c.id, pass: reasons.length === 0, detail: reasons.join('; ') || 'ok' });
    }
  }

  const report = {
    suite: 'coach-mode',
    title: 'Coach mode',
    deterministic: { what: 'The attempt counter and the show-me unlock', results: deterministic },
    model: {
      what: `The reply on "${problem}" (answer ${answer})`,
      model: half.model,
      reason: half.reason,
      results: model,
    },
  };
  const { file, ok } = writeReport(report);
  printSummary(report, file);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
