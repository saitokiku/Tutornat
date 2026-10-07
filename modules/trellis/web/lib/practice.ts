// The practice route to the seam. A correct answer → e2.append_practice (corrections-practice,
// qualifying=false regardless of payload). A wrong answer with help → e2.record_exposure
// (assisted-help; restarts this skill's 48 h clock). Operation ids are stable per
// (session, item, attempt) so a retried request returns the stored row instead of doubling.
import { tutorPool, seamCall, dbConfigured } from "./db";
import { LEARNER, RULE_VERSION, SKILL } from "./lesson";
import { tutorTurn, type TurnInput, type TurnResult } from "./tutor";

export type PracticeOutcome = TurnResult & { recorded: "practice" | "exposure" | "none"; operationId: string };

const PROVENANCE = { source: "web/learn", tutor: "trellis", app: "kaizenedu-web" };

export async function practiceTurn(sessionId: string, attempt: number, input: TurnInput): Promise<PracticeOutcome> {
  const turn = await tutorTurn(input);
  const operationId = `${sessionId}:${input.itemIndex}:${attempt}`;
  if (!dbConfigured()) return { ...turn, recorded: "none", operationId };
  const pool = tutorPool();
  if (turn.correct) {
    await seamCall(pool, "SELECT e2.append_practice($1,$2,$3,$4,$5,$6,$7,$8) AS value",
      [LEARNER.id, SKILL.id, SKILL.version, operationId, sessionId,
        { correct: true, assisted: false, item: input.itemIndex, answer: input.answer }, PROVENANCE, RULE_VERSION]);
    return { ...turn, recorded: "practice", operationId };
  }
  await seamCall(pool, "SELECT e2.record_exposure($1,$2,$3,$4,$5,$6,$7,$8) AS value",
    [LEARNER.id, [SKILL.id], SKILL.version, operationId, sessionId,
      { kind: "hint", item: input.itemIndex, answer: input.answer, engine: turn.engine }, PROVENANCE, RULE_VERSION]);
  return { ...turn, recorded: "exposure", operationId };
}
